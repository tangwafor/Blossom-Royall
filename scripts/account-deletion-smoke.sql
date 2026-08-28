\set ON_ERROR_STOP on

delete from public.account_deletion_requests where user_id in (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002'
);
delete from public.audit_log
where entity_type = 'account_deletion_request'
  and actor_user_id in (
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002'
  );
delete from public.store_memberships where user_id = '10000000-0000-0000-0000-000000000002';
delete from public.profiles where id = '10000000-0000-0000-0000-000000000002';
delete from auth.users where id = '10000000-0000-0000-0000-000000000002';

set request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
set request.jwt.claims = '{"sub":"10000000-0000-0000-0000-000000000001","aal":"aal2"}';

do $$
begin
  perform public.request_account_deletion();
  raise exception 'Sole owner deletion request was allowed';
exception when others then
  if sqlerrm <> 'transfer_store_ownership_required' then raise; end if;
end;
$$;

insert into auth.users (id, email) values ('10000000-0000-0000-0000-000000000002', 'second-owner@example.test');
insert into public.profiles (id, full_name, role) values ('10000000-0000-0000-0000-000000000002', 'Second Pilot Owner', 'owner');
insert into public.store_memberships (store_id, user_id, role) values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'owner');

select (public.request_account_deletion()).status;

do $$
declare
  request_count integer;
  audit_count integer;
  scheduled timestamptz;
begin
  select count(*), max(scheduled_for) into request_count, scheduled from public.account_deletion_requests where user_id = auth.uid() and status = 'pending';
  select count(*) into audit_count from public.audit_log where actor_user_id = auth.uid() and entity_type = 'account_deletion_request' and action = 'request';
  if request_count <> 1 then raise exception 'Expected one pending deletion request'; end if;
  if scheduled < now() + interval '6 days 23 hours' then raise exception 'Deletion schedule is too early'; end if;
  if audit_count <> 1 then raise exception 'Expected one deletion request audit event'; end if;
end;
$$;

select (public.cancel_account_deletion()).status;

do $$
declare canceled_count integer;
begin
  select count(*) into canceled_count from public.account_deletion_requests where user_id = auth.uid() and status = 'canceled' and canceled_at is not null;
  if canceled_count <> 1 then raise exception 'Expected one canceled deletion request'; end if;
end;
$$;

do $$
declare
  anon_request boolean;
  rls_enabled boolean;
  policy_count integer;
begin
  select has_function_privilege('anon', 'public.request_account_deletion()', 'execute') into anon_request;
  if anon_request then raise exception 'Anonymous deletion request execution is allowed'; end if;
  select relrowsecurity into rls_enabled
  from pg_class
  where oid = 'public.account_deletion_requests'::regclass;
  select count(*) into policy_count
  from pg_policies
  where schemaname = 'public' and tablename = 'account_deletion_requests';
  if not rls_enabled then raise exception 'Account deletion request RLS is disabled'; end if;
  if policy_count <> 4 then raise exception 'Expected four account deletion RLS policies, found %', policy_count; end if;
end;
$$;

select 'account deletion lifecycle passed' as result;
