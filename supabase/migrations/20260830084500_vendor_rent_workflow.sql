begin;

alter table public.leases
  add column if not exists rent_due_day integer not null default 1
    check (rent_due_day between 1 and 28);

alter table public.rent_payments
  alter column paid_at drop not null,
  add column if not exists due_on date,
  add column if not exists status text not null default 'paid'
    check (status in ('pending', 'paid', 'rejected', 'failed')),
  add column if not exists submitted_by uuid references public.profiles(id) on delete set null,
  add column if not exists submitted_at timestamptz,
  add column if not exists provider_reference text,
  add column if not exists review_note text,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

create index if not exists rent_payments_due_status_idx
on public.rent_payments(lease_id, due_on, status);

create or replace function public.submit_vendor_rent_payment(
  p_lease_id uuid,
  p_due_on date,
  p_amount numeric,
  p_method text,
  p_provider_reference text
)
returns public.rent_payments
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  lease_record public.leases;
  result public.rent_payments;
begin
  if caller_id is null then raise exception 'authentication_required'; end if;
  select * into lease_record from public.leases where id = p_lease_id for update;
  if not found or not private.owns_vendor(lease_record.vendor_id) then raise exception 'vendor_rent_access_denied'; end if;
  if lease_record.status <> 'signed' then raise exception 'signed_lease_required'; end if;
  if p_due_on is null or extract(day from p_due_on) <> least(extract(day from p_due_on), 28) then raise exception 'invalid_due_date'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'invalid_rent_amount'; end if;
  if length(trim(coalesce(p_method, ''))) not between 2 and 60 then raise exception 'payment_method_required'; end if;
  if length(trim(coalesce(p_provider_reference, ''))) not between 3 and 160 then raise exception 'payment_reference_required'; end if;
  if exists (select 1 from public.rent_payments where lease_id = p_lease_id and due_on = p_due_on and status in ('pending', 'paid')) then
    raise exception 'rent_payment_already_submitted';
  end if;

  insert into public.rent_payments(lease_id, amount, method, paid_at, due_on, status, submitted_by, submitted_at, provider_reference)
  values (p_lease_id, p_amount, trim(p_method), null, p_due_on, 'pending', caller_id, now(), trim(p_provider_reference))
  returning * into result;

  insert into public.audit_log(actor_user_id, store_id, action, entity_type, entity_id, after_data)
  values (caller_id, private.lease_store(p_lease_id), 'submit', 'rent_payment', result.id::text, to_jsonb(result));
  return result;
end;
$$;

create or replace function public.review_vendor_rent_payment(
  p_payment_id uuid,
  p_decision text,
  p_review_note text default null
)
returns public.rent_payments
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  current_record public.rent_payments;
  result public.rent_payments;
  target_store uuid;
begin
  select * into current_record from public.rent_payments where id = p_payment_id for update;
  if not found then raise exception 'rent_payment_not_found'; end if;
  target_store := private.lease_store(current_record.lease_id);
  if private.current_store_role(target_store) not in ('owner', 'manager') then raise exception 'rent_review_access_denied'; end if;
  if current_record.status <> 'pending' then raise exception 'rent_payment_not_pending'; end if;
  if p_decision not in ('paid', 'rejected') then raise exception 'invalid_rent_decision'; end if;
  if length(coalesce(p_review_note, '')) > 1000 then raise exception 'rent_review_note_too_long'; end if;

  update public.rent_payments
  set status = p_decision,
      paid_at = case when p_decision = 'paid' then now() else null end,
      receipt_no = case when p_decision = 'paid' then 'BRR-' || upper(substr(replace(id::text, '-', ''), 1, 10)) else null end,
      review_note = nullif(trim(coalesce(p_review_note, '')), ''),
      reviewed_by = caller_id,
      reviewed_at = now()
  where id = p_payment_id
  returning * into result;

  insert into public.audit_log(actor_user_id, store_id, action, entity_type, entity_id, before_data, after_data)
  values (caller_id, target_store, 'review', 'rent_payment', result.id::text, to_jsonb(current_record), to_jsonb(result));
  return result;
end;
$$;

revoke all on function public.submit_vendor_rent_payment(uuid, date, numeric, text, text) from public, anon;
revoke all on function public.review_vendor_rent_payment(uuid, text, text) from public, anon;
grant execute on function public.submit_vendor_rent_payment(uuid, date, numeric, text, text) to authenticated;
grant execute on function public.review_vendor_rent_payment(uuid, text, text) to authenticated;

commit;
