alter table public.payments
  add column if not exists cash_received numeric(12, 2),
  add column if not exists change_given numeric(12, 2),
  add column if not exists proof_object_path text,
  add column if not exists proof_file_name text,
  add column if not exists proof_mime_type text,
  add column if not exists proof_size_bytes bigint,
  add column if not exists verification_status text not null default 'not_required',
  add column if not exists verified_by uuid references public.profiles(id),
  add column if not exists verified_at timestamptz,
  add column if not exists verification_note text;

alter table public.payments
  drop constraint if exists payments_cash_amounts_valid,
  add constraint payments_cash_amounts_valid check (
    (cash_received is null and change_given is null)
    or (cash_received >= amount and change_given = cash_received - amount)
  ),
  drop constraint if exists payments_verification_status_valid,
  add constraint payments_verification_status_valid check (
    verification_status in ('not_required', 'pending', 'verified', 'rejected')
  ),
  drop constraint if exists payments_proof_size_valid,
  add constraint payments_proof_size_valid check (
    proof_size_bytes is null or proof_size_bytes between 1 and 5242880
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-evidence',
  'payment-evidence',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy payment_evidence_read on storage.objects
for select to authenticated
using (
  bucket_id = 'payment-evidence'
  and private.current_store_role(((storage.foldername(name))[1])::uuid) in ('owner', 'manager', 'staff')
);

create policy payment_evidence_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'payment-evidence'
  and private.current_store_role(((storage.foldername(name))[1])::uuid) in ('owner', 'manager', 'staff')
);

create policy payment_evidence_update on storage.objects
for update to authenticated
using (
  bucket_id = 'payment-evidence'
  and private.current_store_role(((storage.foldername(name))[1])::uuid) in ('owner', 'manager', 'staff')
)
with check (
  bucket_id = 'payment-evidence'
  and private.current_store_role(((storage.foldername(name))[1])::uuid) in ('owner', 'manager', 'staff')
);

create policy payment_evidence_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'payment-evidence'
  and private.current_store_role(((storage.foldername(name))[1])::uuid) in ('owner', 'manager')
);

create or replace function private.audit_payment_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  payment_store_id uuid;
begin
  select orders.store_id into payment_store_id
  from public.orders
  where orders.id = coalesce(new.order_id, old.order_id);

  insert into public.audit_log (
    actor_user_id, store_id, action, entity_type, entity_id, before_data, after_data
  ) values (
    auth.uid(), payment_store_id, lower(tg_op), 'payment', coalesce(new.id, old.id)::text,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

revoke all on function private.audit_payment_write() from public, anon, authenticated;

drop trigger if exists payments_audit on public.payments;
create trigger payments_audit
after insert or update or delete on public.payments
for each row execute function private.audit_payment_write();

comment on column public.payments.proof_object_path is
  'Private storage path under payment-evidence using store and order folders.';
