begin;

alter table public.orders
  add column if not exists fulfillment_status text not null default 'pending'
    check (fulfillment_status in ('pending', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'fulfilled')),
  add column if not exists ready_at timestamptz,
  add column if not exists fulfilled_at timestamptz;

create table public.order_fulfillment_events (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  event_type text not null check (event_type in ('preparing', 'ready_for_pickup', 'out_for_delivery', 'picked_up', 'delivered')),
  note text check (note is null or length(note) <= 1000),
  actor_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (private.order_store(order_id) = store_id)
);

create table public.order_pickup_credentials (
  order_id uuid primary key references public.orders(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete restrict,
  code text not null unique check (code ~ '^[A-F0-9]{6}$'),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (private.order_store(order_id) = store_id)
);

create index order_fulfillment_events_order_created_idx
on public.order_fulfillment_events (order_id, created_at);

create index order_fulfillment_events_store_created_idx
on public.order_fulfillment_events (store_id, created_at desc);

alter table public.order_fulfillment_events enable row level security;
alter table public.order_pickup_credentials enable row level security;

create policy fulfillment_events_read on public.order_fulfillment_events for select to authenticated
using (
  private.current_store_role(store_id) is not null
  or exists (select 1 from public.orders order_record where order_record.id = order_id and order_record.customer_id = (select auth.uid()))
  or exists (
    select 1 from public.order_items item
    where item.order_id = order_id and private.owns_vendor(item.vendor_id)
  )
);

grant select on public.order_fulfillment_events to authenticated;

create or replace function private.audit_fulfillment_event_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.audit_log (actor_user_id, store_id, action, entity_type, entity_id, before_data, after_data)
  values (auth.uid(), coalesce(new.store_id, old.store_id), lower(tg_op), 'order_fulfillment_event', coalesce(new.id, old.id)::text,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end);
  return coalesce(new, old);
end;
$$;

create or replace function private.audit_pickup_credential_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.audit_log (actor_user_id, store_id, action, entity_type, entity_id, before_data, after_data)
  values (auth.uid(), coalesce(new.store_id, old.store_id), lower(tg_op), 'order_pickup_credential', coalesce(new.order_id, old.order_id)::text,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) - 'code' end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) - 'code' end);
  return coalesce(new, old);
end;
$$;

create or replace function private.audit_order_fulfillment_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.fulfillment_status is distinct from new.fulfillment_status
    or old.ready_at is distinct from new.ready_at
    or old.fulfilled_at is distinct from new.fulfilled_at
    or old.status is distinct from new.status then
    insert into public.audit_log (actor_user_id, store_id, action, entity_type, entity_id, before_data, after_data)
    values (auth.uid(), new.store_id, 'update', 'order_fulfillment', new.id::text,
      jsonb_build_object('status', old.status, 'fulfillment_status', old.fulfillment_status, 'ready_at', old.ready_at, 'fulfilled_at', old.fulfilled_at),
      jsonb_build_object('status', new.status, 'fulfillment_status', new.fulfillment_status, 'ready_at', new.ready_at, 'fulfilled_at', new.fulfilled_at));
  end if;
  return new;
end;
$$;

revoke all on function private.audit_fulfillment_event_write() from public, anon, authenticated;
revoke all on function private.audit_pickup_credential_write() from public, anon, authenticated;
revoke all on function private.audit_order_fulfillment_update() from public, anon, authenticated;

create trigger order_fulfillment_events_audit
after insert or update or delete on public.order_fulfillment_events
for each row execute function private.audit_fulfillment_event_write();

create trigger order_pickup_credentials_audit
after insert or update or delete on public.order_pickup_credentials
for each row execute function private.audit_pickup_credential_write();

create trigger orders_fulfillment_audit
after update of status, fulfillment_status, ready_at, fulfilled_at on public.orders
for each row execute function private.audit_order_fulfillment_update();

create or replace function public.advance_order_fulfillment(
  p_order_id uuid,
  p_event_type text,
  p_note text default null
)
returns table (order_id uuid, order_status text, fulfillment_status text, pickup_code text)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  order_record public.orders;
  caller_role public.app_role;
  generated_code text;
begin
  select * into order_record from public.orders where id = p_order_id for update;
  if order_record.id is null then raise exception 'order_not_found'; end if;
  caller_role := private.current_store_role(order_record.store_id);
  if caller_role not in ('owner', 'manager', 'staff') then raise exception 'fulfillment_access_denied'; end if;
  if length(coalesce(p_note, '')) > 1000 then raise exception 'fulfillment_note_too_long'; end if;
  if order_record.payment_status <> 'succeeded' then raise exception 'payment_not_cleared'; end if;

  if not (
    (order_record.fulfillment_status = 'pending' and p_event_type = 'preparing' and order_record.status = 'confirmed')
    or (order_record.fulfillment_status = 'preparing' and p_event_type = 'ready_for_pickup' and order_record.fulfillment_method = 'pickup')
    or (order_record.fulfillment_status = 'preparing' and p_event_type = 'out_for_delivery' and order_record.fulfillment_method in ('delivery', 'shipping'))
    or (order_record.fulfillment_status = 'ready_for_pickup' and p_event_type = 'picked_up' and order_record.fulfillment_method = 'pickup')
    or (order_record.fulfillment_status = 'out_for_delivery' and p_event_type = 'delivered' and order_record.fulfillment_method in ('delivery', 'shipping'))
  ) then raise exception 'invalid_fulfillment_transition'; end if;

  if p_event_type = 'preparing' then
    update public.orders set fulfillment_status = 'preparing', status = 'preparing' where id = p_order_id;
  elsif p_event_type = 'ready_for_pickup' then
    generated_code := upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    insert into public.order_pickup_credentials (order_id, store_id, code, expires_at, created_by)
    values (p_order_id, order_record.store_id, generated_code, now() + interval '7 days', auth.uid())
    on conflict on constraint order_pickup_credentials_pkey do update set code = excluded.code, expires_at = excluded.expires_at,
      redeemed_at = null, created_by = excluded.created_by, created_at = now();
    update public.orders set fulfillment_status = 'ready_for_pickup', status = 'ready', ready_at = now() where id = p_order_id;
  elsif p_event_type = 'out_for_delivery' then
    update public.orders set fulfillment_status = 'out_for_delivery', status = 'ready', ready_at = now() where id = p_order_id;
  elsif p_event_type in ('picked_up', 'delivered') then
    update public.orders set fulfillment_status = 'fulfilled', status = 'fulfilled', fulfilled_at = now() where id = p_order_id;
    if p_event_type = 'picked_up' then
      update public.order_pickup_credentials credential set redeemed_at = now() where credential.order_id = p_order_id;
    end if;
  end if;

  insert into public.order_fulfillment_events (store_id, order_id, event_type, note, actor_user_id)
  values (order_record.store_id, p_order_id, p_event_type, nullif(trim(p_note), ''), auth.uid());

  if generated_code is null then
    select credential.code into generated_code from public.order_pickup_credentials credential where credential.order_id = p_order_id;
  end if;
  return query select updated.id, updated.status, updated.fulfillment_status, generated_code
    from public.orders updated where updated.id = p_order_id;
end;
$$;

create or replace function public.get_customer_pickup_code(p_order_id uuid)
returns table (pickup_code text, expires_at timestamptz)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select credential.code, credential.expires_at
  from public.order_pickup_credentials credential
  join public.orders order_record on order_record.id = credential.order_id
  where credential.order_id = p_order_id
    and order_record.customer_id = (select auth.uid())
    and order_record.fulfillment_status = 'ready_for_pickup'
    and credential.redeemed_at is null
    and credential.expires_at > now()
$$;

revoke all on function public.advance_order_fulfillment(uuid, text, text) from public, anon;
revoke all on function public.get_customer_pickup_code(uuid) from public, anon;
grant execute on function public.advance_order_fulfillment(uuid, text, text) to authenticated;
grant execute on function public.get_customer_pickup_code(uuid) to authenticated;

commit;
