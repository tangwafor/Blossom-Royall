begin;

create table public.return_requests (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  customer_id uuid references public.profiles(id) on delete set null,
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  reason text not null check (reason in ('fit', 'color', 'damaged', 'not_as_described', 'changed_mind', 'other')),
  requested_resolution text not null check (requested_resolution in ('refund', 'exchange', 'store_credit')),
  status text not null default 'requested' check (status in ('requested', 'reviewing', 'approved', 'rejected', 'received', 'completed', 'canceled')),
  policy_snapshot jsonb not null default '{}'::jsonb,
  customer_note text check (customer_note is null or length(customer_note) <= 1000),
  staff_note text check (staff_note is null or length(staff_note) <= 2000),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (private.order_store(order_id) = store_id),
  check (private.vendor_store(vendor_id) = store_id)
);

create unique index return_requests_one_open_per_item
on public.return_requests (order_item_id)
where status not in ('rejected', 'completed', 'canceled');

create index return_requests_store_status_created_idx
on public.return_requests (store_id, status, created_at desc);

create index return_requests_customer_created_idx
on public.return_requests (customer_id, created_at desc);

alter table public.return_requests enable row level security;

create policy return_requests_read on public.return_requests for select to authenticated
using (
  customer_id = (select auth.uid())
  or private.current_store_role(store_id) in ('owner', 'manager', 'staff')
  or private.owns_vendor(vendor_id)
);

grant select on public.return_requests to authenticated;

create or replace function private.audit_return_request_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.audit_log (actor_user_id, store_id, action, entity_type, entity_id, before_data, after_data)
  values (
    auth.uid(), coalesce(new.store_id, old.store_id), lower(tg_op), 'return_request', coalesce(new.id, old.id)::text,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

revoke all on function private.audit_return_request_write() from public, anon, authenticated;

create trigger return_requests_audit
after insert or update or delete on public.return_requests
for each row execute function private.audit_return_request_write();

create or replace function public.request_order_item_return(
  p_order_item_id uuid,
  p_reason text,
  p_requested_resolution text,
  p_customer_note text default null
)
returns public.return_requests
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  item_record record;
  result public.return_requests;
begin
  if caller_id is null then raise exception 'authentication_required'; end if;
  if p_reason not in ('fit', 'color', 'damaged', 'not_as_described', 'changed_mind', 'other') then raise exception 'invalid_return_reason'; end if;
  if p_requested_resolution not in ('refund', 'exchange', 'store_credit') then raise exception 'invalid_return_resolution'; end if;
  if length(coalesce(p_customer_note, '')) > 1000 then raise exception 'return_note_too_long'; end if;

  select item.id, item.order_id, item.vendor_id, order_record.store_id, order_record.customer_id,
    order_record.status as order_status, order_record.policy_snapshot
  into item_record
  from public.order_items item
  join public.orders order_record on order_record.id = item.order_id
  where item.id = p_order_item_id
    and order_record.customer_id = caller_id;

  if not found then raise exception 'order_item_not_owned'; end if;
  if item_record.order_status not in ('confirmed', 'fulfilled', 'completed') then raise exception 'order_not_returnable'; end if;

  insert into public.return_requests (
    store_id, order_id, order_item_id, customer_id, vendor_id, reason,
    requested_resolution, policy_snapshot, customer_note
  ) values (
    item_record.store_id, item_record.order_id, item_record.id, caller_id, item_record.vendor_id, p_reason,
    p_requested_resolution, item_record.policy_snapshot, nullif(trim(p_customer_note), '')
  ) returning * into result;

  return result;
exception
  when unique_violation then raise exception 'return_request_already_open';
end;
$$;

create or replace function public.cancel_return_request(p_return_request_id uuid)
returns public.return_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare result public.return_requests;
begin
  update public.return_requests
  set status = 'canceled', updated_at = now()
  where id = p_return_request_id
    and customer_id = auth.uid()
    and status in ('requested', 'reviewing')
  returning * into result;
  if result.id is null then raise exception 'return_cancel_denied'; end if;
  return result;
end;
$$;

create or replace function public.remove_canceled_return_request(p_return_request_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare removed_count integer;
begin
  delete from public.return_requests
  where id = p_return_request_id and customer_id = auth.uid() and status = 'canceled';
  get diagnostics removed_count = row_count;
  if removed_count <> 1 then raise exception 'return_remove_denied'; end if;
  return true;
end;
$$;

create or replace function public.review_return_request(
  p_return_request_id uuid,
  p_status text,
  p_staff_note text default null
)
returns public.return_requests
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  current_record public.return_requests;
  result public.return_requests;
  caller_role public.app_role;
begin
  select * into current_record from public.return_requests where id = p_return_request_id for update;
  if current_record.id is null then raise exception 'return_request_not_found'; end if;
  caller_role := private.current_store_role(current_record.store_id);
  if caller_role not in ('owner', 'manager', 'staff') then raise exception 'return_review_denied'; end if;
  if length(coalesce(p_staff_note, '')) > 2000 then raise exception 'staff_note_too_long'; end if;
  if not (
    (current_record.status = 'requested' and p_status in ('reviewing', 'approved', 'rejected'))
    or (current_record.status = 'reviewing' and p_status in ('approved', 'rejected'))
    or (current_record.status = 'approved' and p_status = 'received')
    or (current_record.status = 'received' and p_status = 'completed')
  ) then raise exception 'invalid_return_transition'; end if;

  update public.return_requests
  set status = p_status,
      staff_note = nullif(trim(p_staff_note), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  where id = p_return_request_id
  returning * into result;
  return result;
end;
$$;

revoke all on function public.request_order_item_return(uuid, text, text, text) from public, anon;
revoke all on function public.cancel_return_request(uuid) from public, anon;
revoke all on function public.remove_canceled_return_request(uuid) from public, anon;
revoke all on function public.review_return_request(uuid, text, text) from public, anon;
grant execute on function public.request_order_item_return(uuid, text, text, text) to authenticated;
grant execute on function public.cancel_return_request(uuid) to authenticated;
grant execute on function public.remove_canceled_return_request(uuid) to authenticated;
grant execute on function public.review_return_request(uuid, text, text) to authenticated;

commit;
