\set ON_ERROR_STOP on
begin;

insert into auth.users(id, email) values
  ('81000000-0000-4000-8000-000000000001', 'settings.owner@test.invalid'),
  ('81000000-0000-4000-8000-000000000002', 'settings.manager@test.invalid'),
  ('81000000-0000-4000-8000-000000000003', 'settings.staff@test.invalid'),
  ('81000000-0000-4000-8000-000000000004', 'settings.vendor@test.invalid'),
  ('81000000-0000-4000-8000-000000000005', 'settings.other.owner@test.invalid');

insert into public.profiles(id, full_name, role) values
  ('81000000-0000-4000-8000-000000000001', 'Settings Owner', 'owner'),
  ('81000000-0000-4000-8000-000000000002', 'Settings Manager', 'manager'),
  ('81000000-0000-4000-8000-000000000003', 'Settings Staff', 'staff'),
  ('81000000-0000-4000-8000-000000000004', 'Settings Vendor', 'vendor'),
  ('81000000-0000-4000-8000-000000000005', 'Other Owner', 'owner');

insert into public.stores(id, name) values
  ('82000000-0000-4000-8000-000000000001', 'Settings Tenant'),
  ('82000000-0000-4000-8000-000000000002', 'Other Tenant');

insert into public.store_memberships(store_id, user_id, role) values
  ('82000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001', 'owner'),
  ('82000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000002', 'manager'),
  ('82000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000003', 'staff'),
  ('82000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000004', 'vendor'),
  ('82000000-0000-4000-8000-000000000002', '81000000-0000-4000-8000-000000000005', 'owner');

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"aal":"aal2"}', true);

insert into public.store_operating_settings(store_id, public_name, retail_policy, commerce_controls, delivery_controls, created_by, updated_by)
values ('82000000-0000-4000-8000-000000000001', 'Blossom QA', '{"returnWindowDays":30}', '{"payoutCadence":"biweekly"}', '{"pickupEnabled":true}', auth.uid(), auth.uid());

do $$
declare visible_count integer;
begin
  select count(*) into visible_count from public.store_operating_settings;
  if visible_count <> 1 then raise exception 'owner settings read scope failed, saw %', visible_count; end if;
  select count(*) into visible_count from public.audit_log where entity_type = 'store_operating_settings' and entity_id = '82000000-0000-4000-8000-000000000001';
  if visible_count <> 1 then raise exception 'owner settings insert audit failed, saw %', visible_count; end if;
end $$;

select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"aal":"aal1"}', true);
update public.store_operating_settings set public_name = 'Manager Approved', updated_by = auth.uid(), updated_at = now()
where store_id = '82000000-0000-4000-8000-000000000001';

select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000003', true);
do $$
declare visible_count integer; affected_count integer;
begin
  select count(*) into visible_count from public.store_operating_settings;
  if visible_count <> 1 then raise exception 'staff settings read failed, saw %', visible_count; end if;
  update public.store_operating_settings set public_name = 'Forbidden Staff Write', updated_by = auth.uid();
  get diagnostics affected_count = row_count;
  if affected_count <> 0 then raise exception 'staff settings update was not blocked'; end if;
end $$;

select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000004', true);
do $$
declare visible_count integer;
begin
  select count(*) into visible_count from public.store_operating_settings;
  if visible_count <> 1 then raise exception 'vendor settings read failed, saw %', visible_count; end if;
end $$;

select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claims', '{"aal":"aal2"}', true);
do $$
declare visible_count integer;
begin
  select count(*) into visible_count from public.store_operating_settings;
  if visible_count <> 0 then raise exception 'cross tenant settings leaked, saw %', visible_count; end if;
end $$;

rollback;
