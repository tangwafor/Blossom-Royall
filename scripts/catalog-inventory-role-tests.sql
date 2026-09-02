\set ON_ERROR_STOP on
begin;

insert into auth.users(id,email) values
('91000000-0000-4000-8000-000000000001','catalog.owner@test.invalid'),
('91000000-0000-4000-8000-000000000002','catalog.vendor@test.invalid'),
('91000000-0000-4000-8000-000000000003','catalog.customer@test.invalid'),
('91000000-0000-4000-8000-000000000004','catalog.other@test.invalid');
insert into public.profiles(id,full_name,role) values
('91000000-0000-4000-8000-000000000001','Catalog Owner','owner'),
('91000000-0000-4000-8000-000000000002','Catalog Vendor','vendor'),
('91000000-0000-4000-8000-000000000003','Catalog Customer','customer'),
('91000000-0000-4000-8000-000000000004','Other Owner','owner');
insert into public.stores(id,name,commerce_status) values
('92000000-0000-4000-8000-000000000001','Catalog Tenant','published'),
('92000000-0000-4000-8000-000000000002','Other Tenant','published');
insert into public.store_memberships(store_id,user_id,role) values
('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','owner'),
('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000002','vendor'),
('92000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000004','owner');
insert into public.vendors(id,store_id,owner_user_id,name) values
('93000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000002','Catalog Vendor');

set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"aal":"aal1"}',true);
insert into public.products(id,store_id,vendor_id,name,status,onsite_enabled,online_enabled,measurement_kind)
values('94000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001','Gold Ring','review',true,true,'ring');
insert into public.product_variants(id,product_id,sku,size,price,ring_size,measurement_unit,reorder_point)
values('95000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000001','RING-QA-7','7',125,7,'mm',2);
select public.adjust_catalog_stock('95000000-0000-4000-8000-000000000001',5,'Opening count');
do $$
declare blocked boolean:=false;
begin
  begin update public.products set status='published',approved_at=now(),approved_by=auth.uid() where id='94000000-0000-4000-8000-000000000001';
  exception when others then if sqlerrm like '%owner_product_approval_required%' then blocked:=true; else raise; end if; end;
  if not blocked then raise exception 'vendor self publication was not blocked'; end if;
end $$;

select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"aal":"aal2"}',true);
select public.review_catalog_product('94000000-0000-4000-8000-000000000001','published','');
do $$
declare stock integer; movements integer; audits integer;
begin
  select qty_on_hand into stock from public.product_variants where id='95000000-0000-4000-8000-000000000001';
  select count(*) into movements from public.inventory_movements where variant_id='95000000-0000-4000-8000-000000000001';
  select count(*) into audits from public.audit_log where entity_id in ('94000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000001');
  if stock<>5 or movements<>1 or audits<4 then raise exception 'catalog reconciliation failed: stock %, movements %, audits %',stock,movements,audits; end if;
end $$;

select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
do $$ declare visible_count integer; begin
  select count(*) into visible_count from public.products where id='94000000-0000-4000-8000-000000000001';
  if visible_count<>1 then raise exception 'customer cannot read published catalog item'; end if;
end $$;

select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000004',true);
select set_config('request.jwt.claims','{"aal":"aal2"}',true);
do $$ declare visible_count integer; begin
  select count(*) into visible_count from public.products;
  if visible_count<>0 then raise exception 'cross tenant product leak'; end if;
end $$;

rollback;
