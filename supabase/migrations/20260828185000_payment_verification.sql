begin;

drop policy if exists payments_access on public.payments;
create policy payments_access on public.payments for select to authenticated
using (
  private.current_store_role(private.order_store(order_id)) in ('owner', 'manager', 'staff')
  or exists (select 1 from public.orders order_record where order_record.id = order_id and order_record.customer_id = (select auth.uid()))
);

create or replace function private.audit_payment_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  payment_store_id uuid;
  redacted_before jsonb;
  redacted_after jsonb;
begin
  select orders.store_id into payment_store_id
  from public.orders
  where orders.id = coalesce(new.order_id, old.order_id);

  redacted_before := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) - 'proof_object_path' - 'proof_file_name' end;
  redacted_after := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) - 'proof_object_path' - 'proof_file_name' end;
  insert into public.audit_log (actor_user_id, store_id, action, entity_type, entity_id, before_data, after_data)
  values (auth.uid(), payment_store_id, lower(tg_op), 'payment', coalesce(new.id, old.id)::text, redacted_before, redacted_after);
  return coalesce(new, old);
end;
$$;

create or replace function private.audit_order_payment_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.payment_status is distinct from new.payment_status then
    insert into public.audit_log (actor_user_id, store_id, action, entity_type, entity_id, before_data, after_data)
    values (auth.uid(), new.store_id, 'update', 'order_payment', new.id::text,
      jsonb_build_object('status', old.status, 'payment_status', old.payment_status),
      jsonb_build_object('status', new.status, 'payment_status', new.payment_status));
  end if;
  return new;
end;
$$;

create or replace function private.audit_order_fulfillment_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.fulfillment_status is distinct from new.fulfillment_status
    or old.ready_at is distinct from new.ready_at
    or old.fulfilled_at is distinct from new.fulfilled_at then
    insert into public.audit_log (actor_user_id, store_id, action, entity_type, entity_id, before_data, after_data)
    values (auth.uid(), new.store_id, 'update', 'order_fulfillment', new.id::text,
      jsonb_build_object('status', old.status, 'fulfillment_status', old.fulfillment_status, 'ready_at', old.ready_at, 'fulfilled_at', old.fulfilled_at),
      jsonb_build_object('status', new.status, 'fulfillment_status', new.fulfillment_status, 'ready_at', new.ready_at, 'fulfilled_at', new.fulfilled_at));
  end if;
  return new;
end;
$$;

revoke all on function private.audit_payment_write() from public, anon, authenticated;
revoke all on function private.audit_order_payment_update() from public, anon, authenticated;
revoke all on function private.audit_order_fulfillment_update() from public, anon, authenticated;

create trigger orders_payment_audit
after update of payment_status on public.orders
for each row execute function private.audit_order_payment_update();

create or replace function private.audit_inventory_movement_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.audit_log (actor_user_id, store_id, action, entity_type, entity_id, before_data, after_data)
  values (auth.uid(), coalesce(new.store_id, old.store_id), lower(tg_op), 'inventory_movement', coalesce(new.id, old.id)::text,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end);
  return coalesce(new, old);
end;
$$;

create or replace function private.audit_vendor_ledger_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.audit_log (actor_user_id, store_id, action, entity_type, entity_id, before_data, after_data)
  values (auth.uid(), coalesce(new.store_id, old.store_id), lower(tg_op), 'vendor_ledger_entry', coalesce(new.id, old.id)::text,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end);
  return coalesce(new, old);
end;
$$;

create or replace function private.audit_product_variant_write()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare variant_store_id uuid;
begin
  variant_store_id := private.product_store(coalesce(new.product_id, old.product_id));
  insert into public.audit_log (actor_user_id, store_id, action, entity_type, entity_id, before_data, after_data)
  values (auth.uid(), variant_store_id, lower(tg_op), 'product_variant', coalesce(new.id, old.id)::text,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end);
  return coalesce(new, old);
end;
$$;

revoke all on function private.audit_inventory_movement_write() from public, anon, authenticated;
revoke all on function private.audit_vendor_ledger_write() from public, anon, authenticated;
revoke all on function private.audit_product_variant_write() from public, anon, authenticated;

create trigger inventory_movements_audit
after insert or update or delete on public.inventory_movements
for each row execute function private.audit_inventory_movement_write();

create trigger vendor_ledger_entries_audit
after insert or update or delete on public.vendor_ledger_entries
for each row execute function private.audit_vendor_ledger_write();

create trigger product_variants_audit
after insert or update or delete on public.product_variants
for each row execute function private.audit_product_variant_write();

create or replace function public.review_pending_payment(
  p_payment_id uuid,
  p_decision text,
  p_verification_note text default null
)
returns table (payment_id uuid, order_id uuid, payment_status text, order_status text)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  payment_record public.payments;
  order_record public.orders;
  caller_role public.app_role;
  item record;
begin
  if p_decision not in ('verified', 'rejected') then raise exception 'invalid_payment_decision'; end if;
  if length(coalesce(p_verification_note, '')) > 2000 then raise exception 'verification_note_too_long'; end if;
  if p_decision = 'rejected' and nullif(trim(p_verification_note), '') is null then raise exception 'rejection_note_required'; end if;

  select * into payment_record from public.payments where id = p_payment_id for update;
  if payment_record.id is null then raise exception 'payment_not_found'; end if;
  select * into order_record from public.orders where id = payment_record.order_id for update;
  caller_role := private.current_store_role(order_record.store_id);
  if caller_role not in ('owner', 'manager', 'staff') then raise exception 'payment_review_denied'; end if;
  if payment_record.verification_status <> 'pending'
    or payment_record.status <> 'pending_verification'
    or order_record.payment_status <> 'pending_verification' then raise exception 'payment_already_reviewed'; end if;
  if nullif(trim(payment_record.provider_ref), '') is null and nullif(trim(payment_record.proof_object_path), '') is null then raise exception 'payment_evidence_missing'; end if;

  update public.payments
  set verification_status = p_decision,
      status = case when p_decision = 'verified' then 'succeeded' else 'rejected' end,
      verified_by = auth.uid(),
      verified_at = now(),
      verification_note = nullif(trim(p_verification_note), '')
  where id = p_payment_id;

  if p_decision = 'verified' then
    update public.orders set payment_status = 'succeeded', status = 'confirmed' where id = order_record.id;
  else
    update public.orders set payment_status = 'rejected', status = 'payment_rejected' where id = order_record.id;
    for item in
      select order_item.variant_id, order_item.vendor_id, order_item.qty, order_item.unit_price
      from public.order_items order_item where order_item.order_id = order_record.id
    loop
      update public.product_variants set qty_on_hand = qty_on_hand + item.qty where id = item.variant_id;
      insert into public.inventory_movements (store_id, variant_id, order_id, quantity_delta, reason, actor_user_id)
      values (order_record.store_id, item.variant_id, order_record.id, item.qty, 'reservation_release', auth.uid());
      insert into public.vendor_ledger_entries (store_id, vendor_id, order_id, entry_type, amount, memo, actor_user_id)
      values (order_record.store_id, item.vendor_id, order_record.id, 'adjustment_debit', item.unit_price * item.qty, 'Payment evidence rejected', auth.uid());
    end loop;
  end if;

  return query
  select payment_record.id, order_record.id,
    case when p_decision = 'verified' then 'succeeded' else 'rejected' end,
    case when p_decision = 'verified' then 'confirmed' else 'payment_rejected' end;
end;
$$;

revoke all on function public.review_pending_payment(uuid, text, text) from public, anon;
grant execute on function public.review_pending_payment(uuid, text, text) to authenticated;

commit;
