begin;

create or replace function private.vendor_has_order(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.order_items item
    where item.order_id = p_order_id
      and private.owns_vendor(item.vendor_id)
  );
$$;

revoke all on function private.vendor_has_order(uuid) from public, anon, authenticated;

create or replace function private.vendor_owns_product(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.products product
    where product.id = p_product_id
      and private.owns_vendor(product.vendor_id)
  );
$$;

create or replace function private.customer_can_read_product(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.products product
    where product.id = p_product_id
      and product.status = 'published'
      and private.is_published_customer(product.store_id)
  );
$$;

create or replace function private.vendor_owns_variant(p_variant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.product_variants variant
    join public.products product on product.id = variant.product_id
    where variant.id = p_variant_id
      and private.owns_vendor(product.vendor_id)
  );
$$;

revoke all on function private.vendor_owns_product(uuid) from public, anon, authenticated;
revoke all on function private.customer_can_read_product(uuid) from public, anon, authenticated;
revoke all on function private.vendor_owns_variant(uuid) from public, anon, authenticated;

drop policy if exists vendors_read_store on public.vendors;
create policy vendors_read_store on public.vendors for select to authenticated
using (
  private.current_store_role(store_id) in ('owner', 'manager', 'staff')
  or private.owns_vendor(id)
  or (status = 'active' and private.is_published_customer(store_id))
);

drop policy if exists products_access on public.products;
create policy products_access on public.products for select to authenticated
using (
  private.current_store_role(store_id) in ('owner', 'manager', 'staff')
  or private.owns_vendor(vendor_id)
  or (status = 'published' and private.is_published_customer(store_id))
);

drop policy if exists variants_access on public.product_variants;
create policy variants_access on public.product_variants for select to authenticated
using (
  private.current_store_role(private.product_store(product_id)) in ('owner', 'manager', 'staff')
  or private.vendor_owns_product(product_id)
  or private.customer_can_read_product(product_id)
);

drop policy if exists orders_access on public.orders;
create policy orders_access on public.orders for select to authenticated
using (
  private.current_store_role(store_id) in ('owner', 'manager', 'staff')
  or customer_id = (select auth.uid())
  or private.vendor_has_order(id)
);

drop policy if exists order_items_access on public.order_items;
create policy order_items_access on public.order_items for select to authenticated
using (
  private.current_store_role(private.order_store(order_id)) in ('owner', 'manager', 'staff')
  or private.owns_vendor(vendor_id)
  or exists (
    select 1
    from public.orders order_record
    where order_record.id = order_id
      and order_record.customer_id = (select auth.uid())
  )
);

drop policy if exists fulfillment_events_read on public.order_fulfillment_events;
create policy fulfillment_events_read on public.order_fulfillment_events for select to authenticated
using (
  private.current_store_role(store_id) in ('owner', 'manager', 'staff')
  or exists (
    select 1
    from public.orders order_record
    where order_record.id = order_id
      and order_record.customer_id = (select auth.uid())
  )
  or private.vendor_has_order(order_id)
);

drop policy if exists inventory_movements_read on public.inventory_movements;
create policy inventory_movements_read on public.inventory_movements for select to authenticated
using (
  private.current_store_role(store_id) in ('owner', 'manager', 'staff')
  or private.vendor_owns_variant(variant_id)
);

drop policy if exists product_media_read on public.product_media;
create policy product_media_read on public.product_media for select to authenticated
using (
  private.current_store_role(store_id) in ('owner', 'manager', 'staff')
  or private.vendor_owns_product(product_id)
  or (status = 'published' and private.customer_can_read_product(product_id))
);

drop policy if exists product_media_storage_read on storage.objects;
create policy product_media_storage_read on storage.objects for select to authenticated
using (
  bucket_id = 'product-media'
  and (
    private.current_store_role(((storage.foldername(name))[1])::uuid) in ('owner', 'manager', 'staff')
    or private.vendor_owns_product(((storage.foldername(name))[2])::uuid)
    or private.customer_can_read_product(((storage.foldername(name))[2])::uuid)
  )
);

drop policy if exists vendor_storefronts_read on public.vendor_storefronts;
create policy vendor_storefronts_read on public.vendor_storefronts for select to authenticated
using (
  private.current_store_role(store_id) in ('owner', 'manager')
  or private.owns_vendor(vendor_id)
  or (status = 'published' and private.is_published_customer(store_id))
);

commit;
