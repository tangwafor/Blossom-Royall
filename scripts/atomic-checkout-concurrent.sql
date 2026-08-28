\set ON_ERROR_STOP on
set request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
set request.jwt.claims = '{"sub":"10000000-0000-0000-0000-000000000001","aal":"aal2"}';
select * from public.place_tenant_order(
  '20000000-0000-0000-0000-000000000001', 'onsite', 'pickup', 'cash',
  '[{"variant_id":"50000000-0000-0000-0000-000000000002","quantity":1}]'::jsonb,
  100.00, null, null, null, null, null, '{}'::jsonb
);
