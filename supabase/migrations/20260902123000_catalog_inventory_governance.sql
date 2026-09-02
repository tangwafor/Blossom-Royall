begin;

grant execute on function private.vendor_has_order(uuid) to authenticated;
grant execute on function private.vendor_owns_product(uuid) to authenticated;
grant execute on function private.customer_can_read_product(uuid) to authenticated;
grant execute on function private.vendor_owns_variant(uuid) to authenticated;

alter table public.products
  add column updated_at timestamptz not null default now(),
  add column submitted_at timestamptz,
  add column approved_at timestamptz,
  add column approved_by uuid references public.profiles(id) on delete set null,
  add column rejection_note text not null default '',
  add column onsite_enabled boolean not null default true,
  add column online_enabled boolean not null default false,
  add column preorder_enabled boolean not null default false,
  add column measurement_kind text not null default 'standard',
  add column measurement_guide jsonb not null default '{}'::jsonb,
  add constraint products_status_valid check (status in ('draft', 'review', 'published', 'rejected', 'suspended')),
  add constraint products_rejection_note_length check (length(rejection_note) <= 1000),
  add constraint products_measurement_kind_valid check (measurement_kind in ('standard', 'apparel', 'shoe', 'ring', 'bracelet', 'necklace', 'custom')),
  add constraint products_measurement_guide_object check (jsonb_typeof(measurement_guide) = 'object'),
  add constraint products_publication_valid check (
    status <> 'published' or (approved_at is not null and approved_by is not null and (onsite_enabled or online_enabled))
  );

alter table public.product_variants
  add column barcode text,
  add column size_system text not null default '',
  add column ring_size numeric(5, 2),
  add column wrist_circumference numeric(7, 2),
  add column necklace_length numeric(7, 2),
  add column measurement_unit text not null default 'in',
  add column qty_reserved integer not null default 0,
  add column reorder_point integer not null default 0,
  add column active boolean not null default true,
  add column updated_at timestamptz not null default now(),
  add constraint product_variants_barcode_unique unique (barcode),
  add constraint product_variants_stock_valid check (qty_on_hand >= 0 and qty_reserved >= 0 and qty_reserved <= qty_on_hand and reorder_point >= 0),
  add constraint product_variants_measurement_unit_valid check (measurement_unit in ('in', 'cm', 'mm')),
  add constraint product_variants_ring_size_valid check (ring_size is null or ring_size > 0),
  add constraint product_variants_wrist_valid check (wrist_circumference is null or wrist_circumference > 0),
  add constraint product_variants_necklace_valid check (necklace_length is null or necklace_length > 0);

create index products_store_status_channels_idx on public.products(store_id, status, onsite_enabled, online_enabled);
create index product_variants_reorder_idx on public.product_variants(product_id, qty_on_hand, reorder_point) where active;

create or replace function private.enforce_product_governance()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare actor_role public.app_role;
begin
  actor_role := private.current_store_role(new.store_id);
  if actor_role = 'vendor' or (actor_role is null and private.owns_vendor(new.vendor_id)) then
    if new.status not in ('draft', 'review', 'rejected') then raise exception 'owner_product_approval_required'; end if;
    if tg_op = 'UPDATE' and (new.store_id <> old.store_id or new.vendor_id <> old.vendor_id) then raise exception 'product_ownership_change_denied'; end if;
    new.approved_at := null;
    new.approved_by := null;
    if new.status = 'review' and (tg_op = 'INSERT' or old.status <> 'review') then new.submitted_at := now(); end if;
  elsif actor_role not in ('owner', 'manager') then
    raise exception 'product_management_denied';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.enforce_product_governance() from public, anon, authenticated;
create trigger products_governance before insert or update on public.products
for each row execute function private.enforce_product_governance();

create or replace function private.audit_catalog_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare target_store uuid;
begin
  if tg_table_name = 'products' then
    target_store := coalesce(new.store_id, old.store_id);
  else
    target_store := private.product_store(coalesce(new.product_id, old.product_id));
  end if;
  insert into public.audit_log(actor_user_id, store_id, action, entity_type, entity_id, before_data, after_data)
  values (auth.uid(), target_store, lower(tg_op), tg_table_name, coalesce(new.id, old.id)::text,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end);
  return coalesce(new, old);
end;
$$;

revoke all on function private.audit_catalog_write() from public, anon, authenticated;
create trigger products_catalog_audit after insert or update or delete on public.products for each row execute function private.audit_catalog_write();
create trigger product_variants_catalog_audit after insert or update or delete on public.product_variants for each row execute function private.audit_catalog_write();

create or replace function public.review_catalog_product(p_product_id uuid, p_decision text, p_note text default '')
returns public.products
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare product_record public.products; result public.products;
begin
  select * into product_record from public.products where id = p_product_id for update;
  if not found or private.current_store_role(product_record.store_id) not in ('owner', 'manager') then raise exception 'product_review_denied'; end if;
  if p_decision not in ('published', 'rejected', 'suspended') then raise exception 'invalid_product_decision'; end if;
  if p_decision = 'rejected' and length(trim(coalesce(p_note, ''))) < 3 then raise exception 'rejection_note_required'; end if;
  update public.products set
    status = p_decision,
    approved_at = case when p_decision = 'published' then now() else null end,
    approved_by = case when p_decision = 'published' then auth.uid() else null end,
    rejection_note = case when p_decision = 'rejected' then trim(p_note) else '' end
  where id = p_product_id returning * into result;
  return result;
end;
$$;

create or replace function public.adjust_catalog_stock(p_variant_id uuid, p_quantity_delta integer, p_reason text)
returns public.product_variants
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare variant_record public.product_variants; product_record public.products; result public.product_variants;
begin
  if p_quantity_delta is null or p_quantity_delta = 0 then raise exception 'stock_delta_required'; end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'stock_reason_required'; end if;
  select * into variant_record from public.product_variants where id = p_variant_id for update;
  select * into product_record from public.products where id = variant_record.product_id;
  if not found or not (private.current_store_role(product_record.store_id) in ('owner', 'manager', 'staff') or private.owns_vendor(product_record.vendor_id)) then raise exception 'stock_adjustment_denied'; end if;
  if variant_record.qty_on_hand + p_quantity_delta < variant_record.qty_reserved then raise exception 'insufficient_unreserved_stock'; end if;
  update public.product_variants set qty_on_hand = qty_on_hand + p_quantity_delta, updated_at = now() where id = p_variant_id returning * into result;
  insert into public.inventory_movements(store_id, variant_id, quantity_delta, reason, actor_user_id)
  values (product_record.store_id, p_variant_id, p_quantity_delta, 'adjustment', auth.uid());
  insert into public.audit_log(actor_user_id, store_id, action, entity_type, entity_id, after_data)
  values (auth.uid(), product_record.store_id, 'adjust_stock', 'product_variants', p_variant_id::text, jsonb_build_object('quantity_delta', p_quantity_delta, 'reason', trim(p_reason), 'qty_on_hand', result.qty_on_hand));
  return result;
end;
$$;

revoke all on function public.review_catalog_product(uuid, text, text) from public, anon;
revoke all on function public.adjust_catalog_stock(uuid, integer, text) from public, anon;
grant execute on function public.review_catalog_product(uuid, text, text) to authenticated;
grant execute on function public.adjust_catalog_stock(uuid, integer, text) to authenticated;

commit;
