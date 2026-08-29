\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('10000000-0000-0000-0000-000000000002', 'customer@example.test')
on conflict (id) do nothing;
insert into public.profiles (id, full_name, role) values
  ('10000000-0000-0000-0000-000000000002', 'Pilot Customer', 'customer')
on conflict (id) do nothing;
insert into public.cash_registers (id, store_id, name, location, created_by, updated_by) values
  ('21000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Mobile counter', 'Main floor', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

set role authenticated;
set request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
set request.jwt.claims = '{"sub":"10000000-0000-0000-0000-000000000001","aal":"aal1"}';

do $$
begin
  perform public.place_tenant_order(
    '20000000-0000-0000-0000-000000000001', 'onsite', 'pickup', 'cash',
    '[{"variant_id":"50000000-0000-0000-0000-000000000001","quantity":1}]'::jsonb,
    125.00, null, null, null, null, null, '{}'::jsonb
  );
  raise exception 'Owner checkout was allowed at aal1';
exception when others then
  if sqlerrm <> 'store_access_denied' then raise; end if;
end;
$$;

do $$
declare visible_count integer;
begin
  select count(*) into visible_count from public.inventory_movements;
  if visible_count <> 0 then raise exception 'Owner inventory was visible at aal1'; end if;
end;
$$;

set request.jwt.claims = '{"sub":"10000000-0000-0000-0000-000000000001","aal":"aal2"}';

do $$
declare visible_count integer;
begin
  select count(*) into visible_count from public.inventory_movements;
  if visible_count < 1 then raise exception 'Owner inventory was not visible at aal2'; end if;
end;
$$;

set request.jwt.claim.sub = '10000000-0000-0000-0000-000000000002';
set request.jwt.claims = '{"sub":"10000000-0000-0000-0000-000000000002","aal":"aal1"}';

do $$
begin
  perform public.place_tenant_order(
    '20000000-0000-0000-0000-000000000001', 'online', 'pickup', 'cash',
    '[{"variant_id":"50000000-0000-0000-0000-000000000001","quantity":1}]'::jsonb,
    140.00, null, null, null, null, null, '{}'::jsonb
  );
  raise exception 'Customer self confirmed an online cash payment';
exception when others then
  if sqlerrm <> 'cash_collection_requires_onsite_staff' then raise; end if;
end;
$$;

reset role;

insert into auth.users (id, email) values
  ('10000000-0000-0000-0000-000000000003', 'cashier@example.test')
on conflict (id) do nothing;
insert into public.profiles (id, full_name, role) values
  ('10000000-0000-0000-0000-000000000003', 'Pilot Cashier', 'staff')
on conflict (id) do nothing;
insert into public.store_memberships (store_id, user_id, role) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'staff')
on conflict (store_id, user_id) do update set role = excluded.role;

set role authenticated;
set request.jwt.claim.sub = '10000000-0000-0000-0000-000000000003';
set request.jwt.claims = '{"sub":"10000000-0000-0000-0000-000000000003","aal":"aal1"}';

select public.open_cash_drawer('20000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000002', 50.00, 'Cashier opening count');

select * from public.place_tenant_order(
  '20000000-0000-0000-0000-000000000001', 'onsite', 'pickup', 'cash',
  '[{"variant_id":"50000000-0000-0000-0000-000000000002","quantity":1}]'::jsonb,
  85.00, null, null, null, null, null, '{}'::jsonb
);

reset role;
delete from public.profiles where id = '10000000-0000-0000-0000-000000000003';

do $$
declare anonymized_count integer;
begin
  select count(*) into anonymized_count
  from public.payments
  where method = 'cash'
    and cash_accountability = 'receiver_anonymized'
    and received_by is null
    and received_at is not null;
  if anonymized_count <> 1 then raise exception 'Cash receiver privacy deletion did not preserve anonymized receipt history'; end if;
end;
$$;

do $$
declare anon_execute boolean;
declare authenticated_execute boolean;
declare authenticated_insert boolean;
begin
  select has_function_privilege('anon', 'public.place_tenant_order(uuid,text,text,text,jsonb,numeric,text,text,text,text,bigint,jsonb)', 'execute') into anon_execute;
  select has_function_privilege('authenticated', 'public.place_tenant_order(uuid,text,text,text,jsonb,numeric,text,text,text,text,bigint,jsonb)', 'execute') into authenticated_execute;
  select has_table_privilege('authenticated', 'public.payments', 'insert') into authenticated_insert;
  if anon_execute then raise exception 'Anonymous checkout execution is allowed'; end if;
  if not authenticated_execute then raise exception 'Authenticated checkout execution is missing'; end if;
  if authenticated_insert then raise exception 'Authenticated users can bypass the cash checkout function'; end if;
end;
$$;

select 'atomic checkout security passed' as result;
