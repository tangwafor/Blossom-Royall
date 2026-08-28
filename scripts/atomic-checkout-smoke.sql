\set ON_ERROR_STOP on

set request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
set request.jwt.claims = '{"sub":"10000000-0000-0000-0000-000000000001","aal":"aal2"}';

insert into auth.users (id, email) values
  ('10000000-0000-0000-0000-000000000001', 'owner@example.test');
insert into public.profiles (id, full_name, role) values
  ('10000000-0000-0000-0000-000000000001', 'Pilot Owner', 'owner');
insert into public.stores (id, name) values
  ('20000000-0000-0000-0000-000000000001', 'Blossom Royall');
insert into public.store_memberships (store_id, user_id, role) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'owner');
insert into public.store_commerce_settings (store_id, currency, tax_rate_percent, pickup_enabled, local_delivery_enabled, local_delivery_fee, free_local_minimum, shipping_enabled, shipping_fee, created_by, updated_by) values
  ('20000000-0000-0000-0000-000000000001', 'USD', 6, true, true, 10.00, 200.00, true, 15.00, '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001');
insert into public.vendors (id, store_id, owner_user_id, name, status) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Blossom Collections', 'active');
insert into public.products (id, store_id, vendor_id, name, category, status) values
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Pilot Dress', 'Women''s fashion', 'active');
insert into public.product_variants (id, product_id, sku, size, color, price, qty_on_hand) values
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'BC-PILOT-M', 'M', 'Wine', 125.00, 2),
  ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'BC-LAST-ITEM', 'One size', 'Gold', 80.00, 1);

select * from public.place_tenant_order(
  '20000000-0000-0000-0000-000000000001', 'onsite', 'pickup', 'cash',
  '[{"variant_id":"50000000-0000-0000-0000-000000000001","quantity":1}]'::jsonb,
  140.00, null, null, null, null, null, '{}'::jsonb
);

do $$
declare
  remaining integer;
  movement_count integer;
  ledger_count integer;
  audit_count integer;
  payment_amount numeric(12, 2);
  cash_change numeric(12, 2);
begin
  select qty_on_hand into remaining from public.product_variants where id = '50000000-0000-0000-0000-000000000001';
  select count(*) into movement_count from public.inventory_movements;
  select count(*) into ledger_count from public.vendor_ledger_entries;
  select count(*) into audit_count from public.audit_log where entity_type = 'order';
  select amount, change_given into payment_amount, cash_change from public.payments limit 1;
  if remaining <> 1 then raise exception 'Expected one item remaining, found %', remaining; end if;
  if movement_count <> 1 then raise exception 'Expected one inventory movement'; end if;
  if ledger_count <> 1 then raise exception 'Expected one vendor ledger entry'; end if;
  if audit_count <> 1 then raise exception 'Expected one order audit event'; end if;
  if payment_amount <> 132.50 then raise exception 'Expected tax inclusive payment total 132.50, found %', payment_amount; end if;
  if cash_change <> 7.50 then raise exception 'Expected cash change 7.50, found %', cash_change; end if;
end;
$$;

do $$
begin
  perform public.place_tenant_order(
    '20000000-0000-0000-0000-000000000001', 'onsite', 'pickup', 'cash',
    '[{"variant_id":"50000000-0000-0000-0000-000000000001","quantity":2}]'::jsonb,
    250.00, null, null, null, null, null, '{}'::jsonb
  );
  raise exception 'Oversell was not rejected';
exception when others then
  if sqlerrm <> 'insufficient_inventory' then raise; end if;
end;
$$;

select 'atomic checkout smoke passed' as result;
