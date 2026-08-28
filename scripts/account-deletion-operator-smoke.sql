\set ON_ERROR_STOP on

set request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
set request.jwt.claims = '{"sub":"10000000-0000-0000-0000-000000000001","aal":"aal2"}';

select (public.request_account_deletion()).id as request_id \gset
select set_config('test.request_id', :'request_id', false);
update public.account_deletion_requests set scheduled_for = now() - interval '1 minute'
where id = :'request_id';

insert into public.measurement_profiles (customer_id, label, measurements)
values ('10000000-0000-0000-0000-000000000001', 'Deletion operator test', '{"waist":30}'::jsonb);

update public.payments
set proof_object_path = '20000000-0000-0000-0000-000000000001/pending/10000000-0000-0000-0000-000000000001/evidence.pdf',
    proof_file_name = 'evidence.pdf', proof_mime_type = 'application/pdf', proof_size_bytes = 128
where id = (select id from public.payments order by created_at limit 1);

select * from public.claim_due_account_deletion('90000000-0000-0000-0000-000000000001') \gset claim_
select set_config('test.claim_request_id', :'claim_request_id', false);
select set_config('test.claim_subject_user_id', :'claim_subject_user_id', false);

do $$
begin
  if current_setting('test.claim_request_id')::uuid <> current_setting('test.request_id')::uuid then raise exception 'Wrong deletion request claimed'; end if;
  if current_setting('test.claim_subject_user_id')::uuid <> '10000000-0000-0000-0000-000000000001'::uuid then raise exception 'Wrong deletion subject claimed'; end if;
end;
$$;

select public.prepare_account_deletion(
  :'request_id'::uuid,
  '90000000-0000-0000-0000-000000000001'::uuid
) as preparation \gset
select set_config('test.preparation', :'preparation', false);

do $$
declare
  fit_count integer;
  membership_count integer;
  evidence_path text;
  actor_count integer;
begin
  select count(*) into fit_count from public.measurement_profiles
  where customer_id = '10000000-0000-0000-0000-000000000001';
  select count(*) into membership_count from public.store_memberships
  where user_id = '10000000-0000-0000-0000-000000000001';
  select current_setting('test.preparation')::jsonb #>> '{payment_evidence_paths,0}' into evidence_path;
  select count(*) into actor_count from public.audit_log
  where actor_user_id = '10000000-0000-0000-0000-000000000001';
  if fit_count <> 0 then raise exception 'Measurement profiles were not removed'; end if;
  if membership_count <> 0 then raise exception 'Membership was not removed'; end if;
  if evidence_path not like '%/pending/10000000-0000-0000-0000-000000000001/%' then raise exception 'Private evidence path was not returned'; end if;
  if actor_count <> 0 then raise exception 'Audit actor identity was not anonymized'; end if;
end;
$$;

select public.finalize_account_deletion(
  :'request_id'::uuid,
  '90000000-0000-0000-0000-000000000001'::uuid,
  '{"auth_identity_deleted":true,"payment_evidence_deleted":1}'::jsonb
);

do $$
declare
  completed_count integer;
  dangling_profile_refs integer;
begin
  select count(*) into completed_count from public.account_deletion_requests
  where id = current_setting('test.request_id')::uuid and status = 'completed' and completed_at is not null
    and user_id is null and length(subject_hash) = 64
    and completion_summary @> '{"auth_identity_deleted":true}'::jsonb;
  select count(*) into dangling_profile_refs from public.profiles
  where id = '10000000-0000-0000-0000-000000000001';
  if completed_count <> 1 then raise exception 'Deletion completion evidence is incomplete'; end if;
  if dangling_profile_refs <> 0 then raise exception 'Profile identity was not deleted'; end if;
end;
$$;

insert into auth.users (id, email) values ('10000000-0000-0000-0000-000000000003', 'third-owner@example.test');
insert into public.profiles (id, full_name, role) values ('10000000-0000-0000-0000-000000000003', 'Third Pilot Owner', 'owner');
insert into public.store_memberships (store_id, user_id, role)
values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'owner');

set request.jwt.claim.sub = '10000000-0000-0000-0000-000000000002';
set request.jwt.claims = '{"sub":"10000000-0000-0000-0000-000000000002","aal":"aal2"}';
select (public.request_account_deletion()).id as retry_request_id \gset
update public.account_deletion_requests set scheduled_for = now() - interval '1 minute'
where id = :'retry_request_id';
select * from public.claim_due_account_deletion('90000000-0000-0000-0000-000000000002') \gset retry_claim_
select public.prepare_account_deletion(
  :'retry_request_id'::uuid,
  '90000000-0000-0000-0000-000000000002'::uuid
) as first_retry_payload \gset
select public.fail_account_deletion(
  :'retry_request_id'::uuid,
  '90000000-0000-0000-0000-000000000002'::uuid,
  'simulated_storage_failure'
);

do $$
begin
  perform public.cancel_account_deletion();
  raise exception 'Prepared deletion retry was cancelable';
exception when others then
  if sqlerrm <> 'pending_deletion_request_not_found' then raise; end if;
end;
$$;

do $$
begin
  perform public.request_account_deletion();
  raise exception 'Prepared deletion retry could be restarted';
exception when others then
  if sqlerrm <> 'deletion_already_processing' then raise; end if;
end;
$$;

update public.account_deletion_requests set scheduled_for = now() - interval '1 minute'
where id = :'retry_request_id';
select * from public.claim_due_account_deletion('90000000-0000-0000-0000-000000000003') \gset retry2_claim_
select public.prepare_account_deletion(
  :'retry_request_id'::uuid,
  '90000000-0000-0000-0000-000000000003'::uuid
) as second_retry_payload \gset

select set_config('test.first_retry_payload', :'first_retry_payload', false);
select set_config('test.second_retry_payload', :'second_retry_payload', false);
do $$
begin
  if current_setting('test.first_retry_payload')::jsonb <> current_setting('test.second_retry_payload')::jsonb then
    raise exception 'Deletion retry did not preserve the processing payload';
  end if;
end;
$$;

select public.finalize_account_deletion(
  :'retry_request_id'::uuid,
  '90000000-0000-0000-0000-000000000003'::uuid,
  '{"auth_identity_deleted":true,"retry_verified":true}'::jsonb
);

do $$
begin
  if has_function_privilege('authenticated', 'public.claim_due_account_deletion(uuid)', 'execute') then
    raise exception 'Authenticated role can claim deletion work';
  end if;
  if has_function_privilege('anon', 'public.prepare_account_deletion(uuid,uuid)', 'execute') then
    raise exception 'Anonymous role can prepare account deletion';
  end if;
end;
$$;

select 'account deletion operator lifecycle passed' as result;
