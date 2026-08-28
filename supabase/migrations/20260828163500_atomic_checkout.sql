begin;

create sequence if not exists public.order_receipt_number_seq;

alter table public.orders
  add column if not exists receipt_no text unique,
  add column if not exists fulfillment_method text,
  add column if not exists delivery_fee numeric(12, 2) not null default 0,
  add column if not exists currency text not null default 'USD',
  add column if not exists policy_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists payment_status text not null default 'pending';

create table public.store_commerce_settings (
  store_id uuid primary key references public.stores(id) on delete cascade,
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  tax_rate_percent numeric(7, 4) not null default 0 check (tax_rate_percent between 0 and 100),
  tax_inclusive boolean not null default false,
  delivery_taxable boolean not null default false,
  pickup_enabled boolean not null default true,
  local_delivery_enabled boolean not null default false,
  local_delivery_fee numeric(12, 2) not null default 0 check (local_delivery_fee >= 0),
  free_local_minimum numeric(12, 2) not null default 0 check (free_local_minimum >= 0),
  shipping_enabled boolean not null default false,
  shipping_fee numeric(12, 2) not null default 0 check (shipping_fee >= 0),
  created_by uuid not null references public.profiles(id),
  updated_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id),
  order_id uuid references public.orders(id) on delete restrict,
  quantity_delta integer not null check (quantity_delta <> 0),
  reason text not null check (reason in ('sale', 'return', 'adjustment', 'transfer', 'reservation_release')),
  actor_user_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.vendor_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  order_id uuid references public.orders(id) on delete restrict,
  entry_type text not null check (entry_type in ('sale_credit', 'refund_debit', 'fee_debit', 'adjustment_credit', 'adjustment_debit', 'payout_debit')),
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'USD',
  memo text,
  actor_user_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  check (private.vendor_store(vendor_id) = store_id)
);

create index inventory_movements_store_variant_idx on public.inventory_movements (store_id, variant_id, created_at desc);
create index inventory_movements_order_idx on public.inventory_movements (order_id);
create index vendor_ledger_store_vendor_idx on public.vendor_ledger_entries (store_id, vendor_id, created_at desc);
create index vendor_ledger_order_idx on public.vendor_ledger_entries (order_id);

alter table public.inventory_movements enable row level security;
alter table public.vendor_ledger_entries enable row level security;
alter table public.store_commerce_settings enable row level security;

create policy store_commerce_settings_read on public.store_commerce_settings for select to authenticated
using (private.current_store_role(store_id) is not null);
create policy store_commerce_settings_insert on public.store_commerce_settings for insert to authenticated
with check (created_by = (select auth.uid()) and updated_by = (select auth.uid()) and private.current_store_role(store_id) in ('owner', 'manager'));
create policy store_commerce_settings_update on public.store_commerce_settings for update to authenticated
using (private.current_store_role(store_id) in ('owner', 'manager'))
with check (updated_by = (select auth.uid()) and private.current_store_role(store_id) in ('owner', 'manager'));
create policy store_commerce_settings_delete on public.store_commerce_settings for delete to authenticated
using (private.current_store_role(store_id) in ('owner', 'manager'));

create policy inventory_movements_read on public.inventory_movements for select to authenticated
using (private.current_store_role(store_id) is not null);
create policy inventory_movements_insert on public.inventory_movements for insert to authenticated
with check (actor_user_id = (select auth.uid()) and private.current_store_role(store_id) in ('owner', 'manager', 'staff'));
create policy inventory_movements_update on public.inventory_movements for update to authenticated
using (private.current_store_role(store_id) in ('owner', 'manager'))
with check (private.current_store_role(store_id) in ('owner', 'manager'));
create policy inventory_movements_delete on public.inventory_movements for delete to authenticated
using (private.current_store_role(store_id) in ('owner', 'manager'));

create policy vendor_ledger_read on public.vendor_ledger_entries for select to authenticated
using (private.current_store_role(store_id) in ('owner', 'manager') or private.owns_vendor(vendor_id));
create policy vendor_ledger_insert on public.vendor_ledger_entries for insert to authenticated
with check (actor_user_id = (select auth.uid()) and private.current_store_role(store_id) in ('owner', 'manager'));
create policy vendor_ledger_update on public.vendor_ledger_entries for update to authenticated
using (private.current_store_role(store_id) in ('owner', 'manager'))
with check (private.current_store_role(store_id) in ('owner', 'manager'));
create policy vendor_ledger_delete on public.vendor_ledger_entries for delete to authenticated
using (private.current_store_role(store_id) in ('owner', 'manager'));

grant select, insert, update, delete on public.inventory_movements to authenticated;
grant select, insert, update, delete on public.vendor_ledger_entries to authenticated;
grant select, insert, update, delete on public.store_commerce_settings to authenticated;

create or replace function private.audit_store_commerce_settings_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.audit_log (actor_user_id, store_id, action, entity_type, entity_id, before_data, after_data)
  values (auth.uid(), coalesce(new.store_id, old.store_id), lower(tg_op), 'store_commerce_settings', coalesce(new.store_id, old.store_id)::text,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end);
  return coalesce(new, old);
end;
$$;

revoke all on function private.audit_store_commerce_settings_write() from public, anon, authenticated;
create trigger store_commerce_settings_audit
after insert or update or delete on public.store_commerce_settings
for each row execute function private.audit_store_commerce_settings_write();

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
  if caller_role is null then raise exception 'store_access_denied'; end if;
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
      where variants.id = item.variant_id and products.store_id = p_store_id
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
