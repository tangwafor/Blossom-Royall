begin;

alter table public.stores
  add column if not exists slug text,
  add column if not exists commerce_status text not null default 'draft'
    check (commerce_status in ('draft', 'published', 'suspended'));

update public.stores
set slug = 'blossom-royall', commerce_status = 'published'
where lower(name) = 'blossom royall' and slug is null;

create unique index if not exists stores_slug_unique
on public.stores (slug)
where slug is not null;

create or replace function private.is_published_customer(requested_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.stores store
    join public.profiles profile on profile.id = (select auth.uid())
    where store.id = requested_store_id
      and store.commerce_status = 'published'
      and profile.role = 'customer'
  )
$$;

revoke all on function private.is_published_customer(uuid) from public, anon;
grant execute on function private.is_published_customer(uuid) to authenticated;

create or replace function public.resolve_customer_store(p_slug text)
returns table (store_id uuid, store_name text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select store.id, store.name
  from public.stores store
  join public.profiles profile on profile.id = (select auth.uid())
  where store.slug = p_slug
    and store.commerce_status = 'published'
    and profile.role = 'customer'
  limit 1
$$;

revoke all on function public.resolve_customer_store(text) from public, anon;
grant execute on function public.resolve_customer_store(text) to authenticated;

drop policy if exists stores_read_member on public.stores;
create policy stores_read_member on public.stores for select to authenticated
using (private.current_store_role(id) is not null or private.is_published_customer(id));

drop policy if exists vendors_read_store on public.vendors;
create policy vendors_read_store on public.vendors for select to authenticated
using (
  private.current_store_role(store_id) is not null
  or (status = 'active' and private.is_published_customer(store_id))
);

drop policy if exists products_access on public.products;
create policy products_access on public.products for select to authenticated
using (
  private.current_store_role(store_id) is not null
  or (status = 'published' and private.is_published_customer(store_id))
);

drop policy if exists variants_access on public.product_variants;
create policy variants_access on public.product_variants for select to authenticated
using (
  private.current_store_role(private.product_store(product_id)) is not null
  or exists (
    select 1
    from public.products product
    where product.id = product_id
      and product.status = 'published'
      and private.is_published_customer(product.store_id)
  )
);

drop policy if exists store_commerce_settings_read on public.store_commerce_settings;
create policy store_commerce_settings_read on public.store_commerce_settings for select to authenticated
using (private.current_store_role(store_id) is not null or private.is_published_customer(store_id));

drop policy if exists vendor_storefronts_read on public.vendor_storefronts;
create policy vendor_storefronts_read on public.vendor_storefronts for select to authenticated
using (
  private.current_store_role(store_id) is not null
  or private.owns_vendor(vendor_id)
  or (status = 'published' and private.is_published_customer(store_id))
);

create or replace function public.place_tenant_order(
  p_store_id uuid,
  p_channel text,
  p_fulfillment_method text,
  p_tender_method text,
  p_items jsonb,
  p_cash_received numeric default null,
  p_provider_ref text default null,
  p_proof_object_path text default null,
  p_proof_file_name text default null,
  p_proof_mime_type text default null,
  p_proof_size_bytes bigint default null,
  p_policy_snapshot jsonb default '{}'::jsonb
)
returns table (order_id uuid, receipt_no text, subtotal numeric, delivery_fee numeric, tax numeric, total numeric, payment_status text)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  caller_role public.app_role;
  created_order_id uuid := gen_random_uuid();
  created_receipt text;
  subtotal_amount numeric(12, 2) := 0;
  delivery_amount numeric(12, 2) := 0;
  tax_amount numeric(12, 2) := 0;
  total_amount numeric(12, 2) := 0;
  payment_state text;
  item record;
  variant_record record;
  commerce record;
begin
  if caller_id is null then raise exception 'authentication_required'; end if;
  caller_role := private.current_store_role(p_store_id);
  if caller_role is null and private.is_published_customer(p_store_id) then caller_role := 'customer'; end if;
  if caller_role is null then raise exception 'store_access_denied'; end if;
  if caller_role = 'customer' and p_channel <> 'online' then raise exception 'invalid_customer_channel'; end if;
  if p_channel not in ('onsite', 'online') then raise exception 'invalid_channel'; end if;
  if p_fulfillment_method not in ('pickup', 'delivery', 'shipping') then raise exception 'invalid_fulfillment_method'; end if;
  if p_tender_method not in ('cash', 'card', 'bank_transfer', 'zelle', 'venmo', 'paypal', 'cash_app', 'mobile_money', 'check') then raise exception 'invalid_tender_method'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'items_required'; end if;

  select * into commerce from public.store_commerce_settings where store_id = p_store_id;
  if not found then raise exception 'commerce_settings_missing'; end if;
  if p_fulfillment_method = 'pickup' and not commerce.pickup_enabled then raise exception 'pickup_disabled'; end if;
  if p_fulfillment_method = 'delivery' and not commerce.local_delivery_enabled then raise exception 'local_delivery_disabled'; end if;
  if p_fulfillment_method = 'shipping' and not commerce.shipping_enabled then raise exception 'shipping_disabled'; end if;

  for item in select * from jsonb_to_recordset(p_items) as requested(variant_id uuid, quantity integer)
  loop
    if item.quantity is null or item.quantity <= 0 then raise exception 'invalid_quantity'; end if;
    select variants.id, variants.price, variants.qty_on_hand, products.vendor_id
      into variant_record
      from public.product_variants variants
      join public.products products on products.id = variants.product_id
      where variants.id = item.variant_id
        and products.store_id = p_store_id
        and (caller_role <> 'customer' or products.status = 'published')
      for update of variants;
    if not found then raise exception 'variant_not_found'; end if;
    if variant_record.qty_on_hand < item.quantity then raise exception 'insufficient_inventory'; end if;
    subtotal_amount := subtotal_amount + (variant_record.price * item.quantity);
  end loop;

  delivery_amount := case
    when p_fulfillment_method = 'delivery' and subtotal_amount < commerce.free_local_minimum then commerce.local_delivery_fee
    when p_fulfillment_method = 'shipping' then commerce.shipping_fee
    else 0
  end;
  tax_amount := case when commerce.tax_inclusive then 0 else round((subtotal_amount + case when commerce.delivery_taxable then delivery_amount else 0 end) * commerce.tax_rate_percent / 100, 2) end;
  total_amount := subtotal_amount + delivery_amount + tax_amount;

  if p_tender_method = 'cash' then
    if p_cash_received is null or p_cash_received < total_amount then raise exception 'insufficient_cash_received'; end if;
    payment_state := 'succeeded';
  elsif p_tender_method = 'card' then
    payment_state := 'pending_authorization';
  else
    if nullif(trim(p_provider_ref), '') is null and nullif(trim(p_proof_object_path), '') is null then raise exception 'payment_reference_or_proof_required'; end if;
    if nullif(trim(p_proof_object_path), '') is not null and (
      p_proof_object_path not like p_store_id::text || '/pending/' || caller_id::text || '/%'
      or nullif(trim(p_proof_file_name), '') is null
      or p_proof_mime_type not in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')
      or p_proof_size_bytes not between 1 and 5242880
    ) then raise exception 'invalid_payment_proof'; end if;
    payment_state := 'pending_verification';
  end if;

  created_receipt := 'BR-' || lpad(nextval('public.order_receipt_number_seq')::text, 8, '0');
  insert into public.orders (id, store_id, customer_id, channel, status, subtotal, tax, total, receipt_no, fulfillment_method, delivery_fee, currency, policy_snapshot, payment_status)
  values (created_order_id, p_store_id, case when caller_role = 'customer' then caller_id end, p_channel, case when payment_state = 'succeeded' then 'confirmed' else 'pending_payment' end, subtotal_amount, tax_amount, total_amount, created_receipt, p_fulfillment_method, delivery_amount, commerce.currency, p_policy_snapshot, payment_state);

  for item in select * from jsonb_to_recordset(p_items) as requested(variant_id uuid, quantity integer)
  loop
    select variants.price, products.vendor_id into variant_record
      from public.product_variants variants join public.products products on products.id = variants.product_id
      where variants.id = item.variant_id;
    insert into public.order_items (order_id, variant_id, vendor_id, qty, unit_price)
      values (created_order_id, item.variant_id, variant_record.vendor_id, item.quantity, variant_record.price);
    update public.product_variants set qty_on_hand = qty_on_hand - item.quantity where id = item.variant_id;
    insert into public.inventory_movements (store_id, variant_id, order_id, quantity_delta, reason, actor_user_id)
      values (p_store_id, item.variant_id, created_order_id, -item.quantity, 'sale', caller_id);
    insert into public.vendor_ledger_entries (store_id, vendor_id, order_id, entry_type, amount, actor_user_id)
      values (p_store_id, variant_record.vendor_id, created_order_id, 'sale_credit', variant_record.price * item.quantity, caller_id);
  end loop;

  insert into public.payments (order_id, method, amount, status, provider_ref, cash_received, change_given, verification_status, proof_object_path, proof_file_name, proof_mime_type, proof_size_bytes)
  values (created_order_id, p_tender_method, total_amount, payment_state, nullif(trim(p_provider_ref), ''), p_cash_received,
    case when p_tender_method = 'cash' then p_cash_received - total_amount end,
    case when payment_state = 'pending_verification' then 'pending' else 'not_required' end,
    nullif(trim(p_proof_object_path), ''), nullif(trim(p_proof_file_name), ''), nullif(trim(p_proof_mime_type), ''), p_proof_size_bytes);
  insert into public.audit_log (actor_user_id, store_id, action, entity_type, entity_id, after_data)
  values (caller_id, p_store_id, 'create', 'order', created_order_id::text, jsonb_build_object('receipt_no', created_receipt, 'total', total_amount, 'payment_status', payment_state));
  return query select created_order_id, created_receipt, subtotal_amount, delivery_amount, tax_amount, total_amount, payment_state;
end;
$$;

revoke all on function public.place_tenant_order(uuid, text, text, text, jsonb, numeric, text, text, text, text, bigint, jsonb) from public, anon;
grant execute on function public.place_tenant_order(uuid, text, text, text, jsonb, numeric, text, text, text, text, bigint, jsonb) to authenticated;

commit;
