begin;

create extension if not exists pgcrypto;

alter table public.account_deletion_requests
  add column subject_hash text,
  add column claimed_at timestamptz,
  add column claim_expires_at timestamptz,
  add column worker_id uuid,
  add column attempt_count integer not null default 0,
  add column last_error text,
  add column processing_payload jsonb,
  add column completion_summary jsonb;

update public.account_deletion_requests
set subject_hash = encode(digest(user_id::text, 'sha256'), 'hex')
where subject_hash is null;

alter table public.account_deletion_requests
  alter column subject_hash set not null,
  alter column user_id drop not null,
  drop constraint account_deletion_requests_status_check,
  add constraint account_deletion_requests_status_check
    check (status in ('pending', 'processing', 'retry_pending', 'canceled', 'completed', 'blocked_legal_retention', 'blocked_operator_review')),
  drop constraint account_deletion_requests_user_id_fkey,
  add constraint account_deletion_requests_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete set null,
  add constraint account_deletion_requests_claim_valid check (
    (status = 'processing') = (claimed_at is not null and claim_expires_at is not null and worker_id is not null)
  );

create or replace function private.set_account_deletion_subject_hash()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.subject_hash is null and new.user_id is not null then
    new.subject_hash := encode(digest(new.user_id::text, 'sha256'), 'hex');
  end if;
  return new;
end;
$$;

create trigger account_deletion_subject_hash
before insert or update of user_id on public.account_deletion_requests
for each row execute function private.set_account_deletion_subject_hash();

create or replace function public.request_account_deletion()
returns public.account_deletion_requests
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  sole_owner_store uuid;
  result public.account_deletion_requests;
begin
  if caller_id is null then raise exception 'authentication_required'; end if;
  if exists (
    select 1 from public.account_deletion_requests
    where user_id = caller_id and status in ('processing', 'retry_pending', 'blocked_operator_review', 'blocked_legal_retention')
  ) then raise exception 'deletion_already_processing'; end if;
  select membership.store_id into sole_owner_store
  from public.store_memberships membership
  where membership.user_id = caller_id and membership.role = 'owner'
    and not exists (
      select 1 from public.store_memberships another
      where another.store_id = membership.store_id and another.role = 'owner' and another.user_id <> caller_id
    )
  limit 1;
  if sole_owner_store is not null then raise exception 'transfer_store_ownership_required'; end if;

  insert into public.account_deletion_requests (user_id, status, requested_at, scheduled_for, canceled_at, completed_at)
  values (caller_id, 'pending', now(), now() + interval '7 days', null, null)
  on conflict (user_id) do update set status = 'pending', requested_at = now(),
    scheduled_for = now() + interval '7 days', canceled_at = null, completed_at = null,
    claimed_at = null, claim_expires_at = null, worker_id = null, last_error = null,
    processing_payload = null, completion_summary = null
  returning * into result;

  insert into public.audit_log (actor_user_id, store_id, action, entity_type, entity_id, after_data)
  values (caller_id, (select store_id from public.store_memberships where user_id = caller_id limit 1), 'request', 'account_deletion_request', result.id::text, to_jsonb(result));
  return result;
end;
$$;

alter table public.vendor_brand_assets alter column uploaded_by drop not null;
alter table public.product_media alter column uploaded_by drop not null;
alter table public.vendor_storefronts alter column created_by drop not null, alter column updated_by drop not null;
alter table public.store_commerce_settings alter column created_by drop not null, alter column updated_by drop not null;
alter table public.inventory_movements alter column actor_user_id drop not null;
alter table public.vendor_ledger_entries alter column actor_user_id drop not null;

alter table public.employees drop constraint employees_user_id_fkey,
  add constraint employees_user_id_fkey foreign key (user_id) references public.profiles(id) on delete set null;
alter table public.orders drop constraint orders_customer_id_fkey,
  add constraint orders_customer_id_fkey foreign key (customer_id) references public.profiles(id) on delete set null;
alter table public.product_media drop constraint product_media_uploaded_by_fkey,
  add constraint product_media_uploaded_by_fkey foreign key (uploaded_by) references public.profiles(id) on delete set null;
alter table public.time_entries drop constraint time_entries_approved_by_fkey,
  add constraint time_entries_approved_by_fkey foreign key (approved_by) references public.profiles(id) on delete set null;
alter table public.vendor_brand_assets drop constraint vendor_brand_assets_reviewed_by_fkey,
  add constraint vendor_brand_assets_reviewed_by_fkey foreign key (reviewed_by) references public.profiles(id) on delete set null;
alter table public.vendor_brand_assets drop constraint vendor_brand_assets_uploaded_by_fkey,
  add constraint vendor_brand_assets_uploaded_by_fkey foreign key (uploaded_by) references public.profiles(id) on delete set null;
alter table public.vendors drop constraint vendors_owner_user_id_fkey,
  add constraint vendors_owner_user_id_fkey foreign key (owner_user_id) references public.profiles(id) on delete set null;
alter table public.payments drop constraint payments_verified_by_fkey,
  add constraint payments_verified_by_fkey foreign key (verified_by) references public.profiles(id) on delete set null;
alter table public.vendor_storefronts drop constraint vendor_storefronts_created_by_fkey,
  add constraint vendor_storefronts_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;
alter table public.vendor_storefronts drop constraint vendor_storefronts_updated_by_fkey,
  add constraint vendor_storefronts_updated_by_fkey foreign key (updated_by) references public.profiles(id) on delete set null;
alter table public.store_commerce_settings drop constraint store_commerce_settings_created_by_fkey,
  add constraint store_commerce_settings_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;
alter table public.store_commerce_settings drop constraint store_commerce_settings_updated_by_fkey,
  add constraint store_commerce_settings_updated_by_fkey foreign key (updated_by) references public.profiles(id) on delete set null;
alter table public.inventory_movements drop constraint inventory_movements_actor_user_id_fkey,
  add constraint inventory_movements_actor_user_id_fkey foreign key (actor_user_id) references public.profiles(id) on delete set null;
alter table public.vendor_ledger_entries drop constraint vendor_ledger_entries_actor_user_id_fkey,
  add constraint vendor_ledger_entries_actor_user_id_fkey foreign key (actor_user_id) references public.profiles(id) on delete set null;

create index account_deletion_requests_due_idx
on public.account_deletion_requests (scheduled_for, claim_expires_at)
where status in ('pending', 'processing', 'retry_pending');

create or replace function public.claim_due_account_deletion(p_worker_id uuid)
returns table(request_id uuid, subject_user_id uuid, subject_hash text, attempt_count integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare selected_id uuid;
begin
  if p_worker_id is null then raise exception 'worker_id_required'; end if;
  select request.id into selected_id
  from public.account_deletion_requests request
  where request.user_id is not null
    and request.scheduled_for <= now()
    and (
      request.status in ('pending', 'retry_pending')
      or (request.status = 'processing' and request.claim_expires_at < now())
    )
  order by request.scheduled_for
  for update skip locked
  limit 1;
  if selected_id is null then return; end if;

  update public.account_deletion_requests request
  set status = 'processing', claimed_at = now(), claim_expires_at = now() + interval '15 minutes',
      worker_id = p_worker_id, attempt_count = request.attempt_count + 1, last_error = null
  where request.id = selected_id
  returning request.id, request.user_id, request.subject_hash, request.attempt_count
  into request_id, subject_user_id, subject_hash, attempt_count;
  return next;
end;
$$;

create or replace function public.prepare_account_deletion(p_request_id uuid, p_worker_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  request_record public.account_deletion_requests;
  subject_email text;
  evidence_paths jsonb := '[]'::jsonb;
  sole_owner_store uuid;
  payload jsonb;
begin
  select * into request_record from public.account_deletion_requests
  where id = p_request_id for update;
  if request_record.id is null then raise exception 'deletion_request_not_found'; end if;
  if request_record.status <> 'processing' or request_record.worker_id <> p_worker_id or request_record.claim_expires_at < now()
    then raise exception 'deletion_claim_invalid'; end if;

  if request_record.processing_payload is not null then
    return request_record.processing_payload;
  end if;

  select membership.store_id into sole_owner_store
  from public.store_memberships membership
  where membership.user_id = request_record.user_id and membership.role = 'owner'
    and not exists (
      select 1 from public.store_memberships another
      where another.store_id = membership.store_id and another.role = 'owner' and another.user_id <> request_record.user_id
    )
  limit 1;
  if sole_owner_store is not null then raise exception 'transfer_store_ownership_required'; end if;

  select email into subject_email from auth.users where id = request_record.user_id;
  select coalesce(jsonb_agg(payment.proof_object_path), '[]'::jsonb) into evidence_paths
  from public.payments payment
  where payment.proof_object_path is not null
    and payment.proof_object_path like ('%/pending/' || request_record.user_id::text || '/%');

  delete from public.measurement_profiles where customer_id = request_record.user_id;
  if subject_email is not null then
    delete from public.readiness_submissions where lower(contact_email) = lower(subject_email);
  end if;
  update public.orders set customer_id = null where customer_id = request_record.user_id;
  update public.vendors set owner_user_id = null where owner_user_id = request_record.user_id;
  update public.employees set user_id = null where user_id = request_record.user_id;
  update public.time_entries set approved_by = null where approved_by = request_record.user_id;
  update public.payments set verified_by = null, proof_object_path = null, proof_file_name = null,
    proof_mime_type = null, proof_size_bytes = null where verified_by = request_record.user_id
    or proof_object_path like ('%/pending/' || request_record.user_id::text || '/%');
  update public.product_media set uploaded_by = null where uploaded_by = request_record.user_id;
  update public.vendor_brand_assets set uploaded_by = null where uploaded_by = request_record.user_id;
  update public.vendor_brand_assets set reviewed_by = null where reviewed_by = request_record.user_id;
  update public.vendor_storefronts set created_by = null where created_by = request_record.user_id;
  update public.vendor_storefronts set updated_by = null where updated_by = request_record.user_id;
  update public.store_commerce_settings set created_by = null where created_by = request_record.user_id;
  update public.store_commerce_settings set updated_by = null where updated_by = request_record.user_id;
  update public.inventory_movements set actor_user_id = null where actor_user_id = request_record.user_id;
  update public.vendor_ledger_entries set actor_user_id = null where actor_user_id = request_record.user_id;
  update public.audit_log set actor_user_id = null,
    before_data = coalesce(before_data, '{}'::jsonb) - 'user_id' - 'customer_id' - 'email' - 'full_name',
    after_data = coalesce(after_data, '{}'::jsonb) - 'user_id' - 'customer_id' - 'email' - 'full_name'
  where actor_user_id = request_record.user_id;
  delete from public.store_memberships where user_id = request_record.user_id;

  payload := jsonb_build_object(
    'request_id', request_record.id,
    'user_id', request_record.user_id,
    'subject_hash', request_record.subject_hash,
    'payment_evidence_paths', evidence_paths
  );
  update public.account_deletion_requests set processing_payload = payload where id = request_record.id;
  return payload;
end;
$$;

create or replace function public.finalize_account_deletion(p_request_id uuid, p_worker_id uuid, p_completion_summary jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  subject_user_id uuid;
begin
  select user_id into subject_user_id from public.account_deletion_requests
  where id = p_request_id and status = 'processing' and worker_id = p_worker_id
    and claim_expires_at >= now() for update;
  if subject_user_id is null then raise exception 'deletion_claim_invalid'; end if;
  delete from auth.users where id = subject_user_id;
  if not found then raise exception 'auth_identity_not_found'; end if;
  update public.account_deletion_requests
  set status = 'completed', completed_at = now(), user_id = null, claimed_at = null,
      claim_expires_at = null, worker_id = null, last_error = null,
      processing_payload = null, completion_summary = coalesce(p_completion_summary, '{}'::jsonb)
  where id = p_request_id;
end;
$$;

create or replace function public.fail_account_deletion(p_request_id uuid, p_worker_id uuid, p_error text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare current_attempts integer;
begin
  select attempt_count into current_attempts from public.account_deletion_requests
  where id = p_request_id and status = 'processing' and worker_id = p_worker_id for update;
  if current_attempts is null then raise exception 'deletion_claim_invalid'; end if;
  update public.account_deletion_requests
  set status = case when current_attempts >= 5 then 'blocked_operator_review' else 'retry_pending' end,
      scheduled_for = case when current_attempts >= 5 then scheduled_for else now() + interval '15 minutes' end,
      claimed_at = null, claim_expires_at = null, worker_id = null,
      last_error = left(coalesce(p_error, 'unknown_processing_error'), 500)
  where id = p_request_id;
end;
$$;

revoke all on function public.claim_due_account_deletion(uuid) from public, anon, authenticated;
revoke all on function public.prepare_account_deletion(uuid, uuid) from public, anon, authenticated;
revoke all on function public.finalize_account_deletion(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.fail_account_deletion(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.claim_due_account_deletion(uuid) to service_role;
grant execute on function public.prepare_account_deletion(uuid, uuid) to service_role;
grant execute on function public.finalize_account_deletion(uuid, uuid, jsonb) to service_role;
grant execute on function public.fail_account_deletion(uuid, uuid, text) to service_role;

commit;
