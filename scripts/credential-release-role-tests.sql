\set ON_ERROR_STOP on
begin;

insert into auth.users(id, email) values
  ('10000000-0000-4000-8000-000000000001', 'owner@credential.test'),
  ('10000000-0000-4000-8000-000000000002', 'staff@credential.test'),
  ('10000000-0000-4000-8000-000000000003', 'vendor.one@credential.test'),
  ('10000000-0000-4000-8000-000000000004', 'vendor.two@credential.test'),
  ('10000000-0000-4000-8000-000000000005', 'customer.one@credential.test'),
  ('10000000-0000-4000-8000-000000000006', 'customer.two@credential.test');

insert into public.profiles(id, full_name, role) values
  ('10000000-0000-4000-8000-000000000001', 'Owner QA', 'owner'),
  ('10000000-0000-4000-8000-000000000002', 'Staff QA', 'staff'),
  ('10000000-0000-4000-8000-000000000003', 'Vendor One QA', 'vendor'),
  ('10000000-0000-4000-8000-000000000004', 'Vendor Two QA', 'vendor'),
  ('10000000-0000-4000-8000-000000000005', 'Customer One QA', 'customer'),
  ('10000000-0000-4000-8000-000000000006', 'Customer Two QA', 'customer');

insert into public.stores(id, name) values
  ('20000000-0000-4000-8000-000000000001', 'Tenant One'),
  ('20000000-0000-4000-8000-000000000002', 'Tenant Two');

insert into public.store_memberships(store_id, user_id, role) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'owner'),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'staff'),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 'vendor'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000004', 'vendor');

insert into public.vendors(id, store_id, owner_user_id, name) values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 'Vendor One'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000004', 'Vendor Two');

insert into public.products(id, store_id, vendor_id, name, status) values
  ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Vendor One Product', 'published'),
  ('40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'Vendor Two Product', 'published');

insert into public.product_variants(id, product_id, sku, price, qty_on_hand) values
  ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'QA-ONE', 100, 2),
  ('50000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', 'QA-TWO', 200, 2);

insert into public.orders(id, store_id, customer_id, channel, total) values
  ('60000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000005', 'online', 100),
  ('60000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000006', 'online', 200);

insert into public.order_items(order_id, variant_id, vendor_id, qty, unit_price) values
  ('60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 1, 100),
  ('60000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 1, 200);

insert into public.leases(id, vendor_id, monthly_rent, rent_due_day, start_date, status, signed_at) values
  ('70000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 800, 1, current_date, 'signed', now()),
  ('70000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 900, 1, current_date, 'signed', now());

set local role authenticated;
select set_config('request.jwt.claim.sub', :'test_user', true);
select set_config('test.role_case', :'test_case', true);
select set_config('request.jwt.claims', case when :'test_case' = 'owner' then '{"aal":"aal2"}' else '{"aal":"aal1"}' end, true);

do $$
declare
  visible_count integer;
  attributed_amount numeric;
  role_case text := current_setting('test.role_case');
begin
  if role_case = 'vendor' then
    select count(*) into visible_count from public.orders;
    if visible_count <> 0 then raise exception 'vendor can read protected mall order rows, saw %', visible_count; end if;
    select attributed_total into attributed_amount from public.get_vendor_order_summaries('20000000-0000-4000-8000-000000000001');
    if attributed_amount <> 100 then raise exception 'vendor attributed sales summary failed, received %', attributed_amount; end if;
    select count(*) into visible_count from public.products;
    if visible_count <> 1 then raise exception 'vendor product isolation failed, saw %', visible_count; end if;
    select count(*) into visible_count from public.leases;
    if visible_count <> 1 then raise exception 'vendor lease isolation failed, saw %', visible_count; end if;
  elsif role_case = 'staff' then
    select count(*) into visible_count from public.orders;
    if visible_count <> 1 then raise exception 'staff tenant isolation failed, saw % orders', visible_count; end if;
    select count(*) into visible_count from public.leases;
    if visible_count <> 0 then raise exception 'staff lease restriction failed, saw %', visible_count; end if;
  elsif role_case = 'owner' then
    select count(*) into visible_count from public.orders;
    if visible_count <> 1 then raise exception 'owner tenant isolation failed, saw % orders', visible_count; end if;
    select count(*) into visible_count from public.leases;
    if visible_count <> 1 then raise exception 'owner lease scope failed, saw %', visible_count; end if;
  elsif role_case = 'customer' then
    select count(*) into visible_count from public.orders;
    if visible_count <> 1 then raise exception 'customer self isolation failed, saw % orders', visible_count; end if;
  else
    raise exception 'unsupported credential role case: %', role_case;
  end if;
end $$;

rollback;
