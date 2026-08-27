begin;

create or replace function private.vendor_store(requested_vendor_id uuid)
returns uuid language sql stable security definer set search_path = public
as $$ select store_id from vendors where id = requested_vendor_id $$;

create or replace function private.product_store(requested_product_id uuid)
returns uuid language sql stable security definer set search_path = public
as $$ select store_id from products where id = requested_product_id $$;

create or replace function private.order_store(requested_order_id uuid)
returns uuid language sql stable security definer set search_path = public
as $$ select store_id from orders where id = requested_order_id $$;

create or replace function private.employee_store(requested_employee_id uuid)
returns uuid language sql stable security definer set search_path = public
as $$ select store_id from employees where id = requested_employee_id $$;

create or replace function private.lease_store(requested_lease_id uuid)
returns uuid language sql stable security definer set search_path = public
as $$ select v.store_id from leases l join vendors v on v.id = l.vendor_id where l.id = requested_lease_id $$;

create or replace function private.owns_vendor(requested_vendor_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from vendors where id = requested_vendor_id and owner_user_id = (select auth.uid())) $$;

revoke all on function private.vendor_store(uuid), private.product_store(uuid), private.order_store(uuid), private.employee_store(uuid), private.lease_store(uuid), private.owns_vendor(uuid) from public, anon;
grant execute on function private.vendor_store(uuid), private.product_store(uuid), private.order_store(uuid), private.employee_store(uuid), private.lease_store(uuid), private.owns_vendor(uuid) to authenticated;

drop policy vendors_manage_store on vendors;
drop policy profiles_read_self on profiles;
drop policy profiles_update_self on profiles;
drop policy memberships_read_store on store_memberships;
drop policy brand_assets_read on vendor_brand_assets;
drop policy brand_assets_submit on vendor_brand_assets;

create policy profiles_read_self on profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_update_self on profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy memberships_read_store on store_memberships for select to authenticated using (user_id = (select auth.uid()) or private.current_store_role(store_id) in ('owner', 'manager'));

create policy vendors_insert_store on vendors for insert to authenticated with check (private.current_store_role(store_id) in ('owner', 'manager'));
create policy vendors_update_store on vendors for update to authenticated using (private.current_store_role(store_id) in ('owner', 'manager')) with check (private.current_store_role(store_id) in ('owner', 'manager'));
create policy vendors_delete_store on vendors for delete to authenticated using (private.current_store_role(store_id) in ('owner', 'manager'));

create policy brand_assets_read on vendor_brand_assets for select to authenticated
using (private.current_store_role(store_id) in ('owner', 'manager') or uploaded_by = (select auth.uid()) or private.owns_vendor(vendor_id));
create policy brand_assets_submit on vendor_brand_assets for insert to authenticated
with check (uploaded_by = (select auth.uid()) and status = 'submitted' and not is_current and (private.current_store_role(store_id) in ('owner', 'manager') or private.owns_vendor(vendor_id)));

create policy products_access on products for select to authenticated
using (private.current_store_role(store_id) is not null);
create policy products_insert on products for insert to authenticated
with check (private.current_store_role(store_id) in ('owner', 'manager') or private.owns_vendor(vendor_id));
create policy products_update on products for update to authenticated
using (private.current_store_role(store_id) in ('owner', 'manager') or private.owns_vendor(vendor_id))
with check (private.current_store_role(store_id) in ('owner', 'manager') or private.owns_vendor(vendor_id));
create policy products_delete on products for delete to authenticated
using (private.current_store_role(store_id) in ('owner', 'manager') or private.owns_vendor(vendor_id));

create policy variants_access on product_variants for select to authenticated
using (private.current_store_role(private.product_store(product_id)) is not null);
create policy variants_insert on product_variants for insert to authenticated
with check (private.current_store_role(private.product_store(product_id)) in ('owner', 'manager') or exists(select 1 from products p where p.id = product_id and private.owns_vendor(p.vendor_id)));
create policy variants_update on product_variants for update to authenticated
using (private.current_store_role(private.product_store(product_id)) in ('owner', 'manager') or exists(select 1 from products p where p.id = product_id and private.owns_vendor(p.vendor_id)))
with check (private.current_store_role(private.product_store(product_id)) in ('owner', 'manager') or exists(select 1 from products p where p.id = product_id and private.owns_vendor(p.vendor_id)));
create policy variants_delete on product_variants for delete to authenticated
using (private.current_store_role(private.product_store(product_id)) in ('owner', 'manager') or exists(select 1 from products p where p.id = product_id and private.owns_vendor(p.vendor_id)));

create policy employees_access on employees for select to authenticated
using (private.current_store_role(store_id) in ('owner', 'manager') or user_id = (select auth.uid()));
create policy employees_insert on employees for insert to authenticated with check (private.current_store_role(store_id) in ('owner', 'manager'));
create policy employees_update on employees for update to authenticated using (private.current_store_role(store_id) in ('owner', 'manager')) with check (private.current_store_role(store_id) in ('owner', 'manager'));
create policy employees_delete on employees for delete to authenticated using (private.current_store_role(store_id) in ('owner', 'manager'));

create policy time_entries_access on time_entries for select to authenticated
using (private.current_store_role(private.employee_store(employee_id)) in ('owner', 'manager') or exists(select 1 from employees e where e.id = employee_id and e.user_id = (select auth.uid())));
create policy time_entries_insert on time_entries for insert to authenticated
with check (private.current_store_role(private.employee_store(employee_id)) in ('owner', 'manager') or exists(select 1 from employees e where e.id = employee_id and e.user_id = (select auth.uid())));
create policy time_entries_update on time_entries for update to authenticated
using (private.current_store_role(private.employee_store(employee_id)) in ('owner', 'manager') or exists(select 1 from employees e where e.id = employee_id and e.user_id = (select auth.uid())))
with check (private.current_store_role(private.employee_store(employee_id)) in ('owner', 'manager') or exists(select 1 from employees e where e.id = employee_id and e.user_id = (select auth.uid())));
create policy time_entries_delete on time_entries for delete to authenticated
using (private.current_store_role(private.employee_store(employee_id)) in ('owner', 'manager'));

create policy leases_access on leases for select to authenticated
using (private.current_store_role(private.vendor_store(vendor_id)) in ('owner', 'manager') or private.owns_vendor(vendor_id));
create policy leases_insert on leases for insert to authenticated with check (private.current_store_role(private.vendor_store(vendor_id)) in ('owner', 'manager'));
create policy leases_update on leases for update to authenticated using (private.current_store_role(private.vendor_store(vendor_id)) in ('owner', 'manager')) with check (private.current_store_role(private.vendor_store(vendor_id)) in ('owner', 'manager'));
create policy leases_delete on leases for delete to authenticated using (private.current_store_role(private.vendor_store(vendor_id)) in ('owner', 'manager'));

create policy rent_access on rent_payments for select to authenticated
using (private.current_store_role(private.lease_store(lease_id)) in ('owner', 'manager') or exists(select 1 from leases l where l.id = lease_id and private.owns_vendor(l.vendor_id)));
create policy rent_insert on rent_payments for insert to authenticated with check (private.current_store_role(private.lease_store(lease_id)) in ('owner', 'manager'));
create policy rent_update on rent_payments for update to authenticated using (private.current_store_role(private.lease_store(lease_id)) in ('owner', 'manager')) with check (private.current_store_role(private.lease_store(lease_id)) in ('owner', 'manager'));
create policy rent_delete on rent_payments for delete to authenticated using (private.current_store_role(private.lease_store(lease_id)) in ('owner', 'manager'));

create policy orders_access on orders for select to authenticated
using (private.current_store_role(store_id) is not null or customer_id = (select auth.uid()));
create policy orders_insert on orders for insert to authenticated
with check (private.current_store_role(store_id) in ('owner', 'manager', 'staff') or customer_id = (select auth.uid()));
create policy orders_update on orders for update to authenticated
using (private.current_store_role(store_id) in ('owner', 'manager', 'staff')) with check (private.current_store_role(store_id) in ('owner', 'manager', 'staff'));
create policy orders_delete on orders for delete to authenticated
using (private.current_store_role(store_id) in ('owner', 'manager'));

create policy order_items_access on order_items for select to authenticated
using (private.current_store_role(private.order_store(order_id)) is not null or private.owns_vendor(vendor_id) or exists(select 1 from orders o where o.id = order_id and o.customer_id = (select auth.uid())));
create policy order_items_insert on order_items for insert to authenticated with check (private.current_store_role(private.order_store(order_id)) in ('owner', 'manager', 'staff'));
create policy order_items_update on order_items for update to authenticated using (private.current_store_role(private.order_store(order_id)) in ('owner', 'manager', 'staff')) with check (private.current_store_role(private.order_store(order_id)) in ('owner', 'manager', 'staff'));
create policy order_items_delete on order_items for delete to authenticated using (private.current_store_role(private.order_store(order_id)) in ('owner', 'manager'));

create policy payments_access on payments for select to authenticated
using (private.current_store_role(private.order_store(order_id)) in ('owner', 'manager') or exists(select 1 from orders o where o.id = order_id and o.customer_id = (select auth.uid())));
create policy payments_insert on payments for insert to authenticated with check (private.current_store_role(private.order_store(order_id)) in ('owner', 'manager'));
create policy payments_update on payments for update to authenticated using (private.current_store_role(private.order_store(order_id)) in ('owner', 'manager')) with check (private.current_store_role(private.order_store(order_id)) in ('owner', 'manager'));
create policy payments_delete on payments for delete to authenticated using (private.current_store_role(private.order_store(order_id)) in ('owner', 'manager'));

create policy measurements_self on measurement_profiles for all to authenticated
using (customer_id = (select auth.uid())) with check (customer_id = (select auth.uid()));

create index employees_store_id_idx on employees(store_id);
create index employees_user_id_idx on employees(user_id);
create index leases_vendor_id_idx on leases(vendor_id);
create index measurement_profiles_customer_id_idx on measurement_profiles(customer_id);
create index order_items_order_id_idx on order_items(order_id);
create index order_items_variant_id_idx on order_items(variant_id);
create index order_items_vendor_id_idx on order_items(vendor_id);
create index orders_customer_id_idx on orders(customer_id);
create index orders_store_id_idx on orders(store_id);
create index payments_order_id_idx on payments(order_id);
create index product_variants_product_id_idx on product_variants(product_id);
create index products_store_id_idx on products(store_id);
create index products_vendor_id_idx on products(vendor_id);
create index rent_payments_lease_id_idx on rent_payments(lease_id);
create index store_memberships_user_id_idx on store_memberships(user_id);
create index time_entries_approved_by_idx on time_entries(approved_by);
create index time_entries_employee_id_idx on time_entries(employee_id);
create index vendor_brand_assets_reviewed_by_idx on vendor_brand_assets(reviewed_by);
create index vendor_brand_assets_uploaded_by_idx on vendor_brand_assets(uploaded_by);
create index vendors_owner_user_id_idx on vendors(owner_user_id);
create index vendors_store_id_idx on vendors(store_id);

commit;
