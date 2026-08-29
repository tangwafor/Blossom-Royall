begin;

create schema if not exists extensions;

do $$
begin
  if exists (
    select 1
    from pg_extension extension_record
    join pg_namespace namespace_record on namespace_record.oid = extension_record.extnamespace
    where extension_record.extname = 'pgcrypto'
      and namespace_record.nspname <> 'extensions'
  ) then
    alter extension pgcrypto set schema extensions;
  end if;
end;
$$;

create or replace function public.advance_order_fulfillment(
  p_order_id uuid,
  p_event_type text,
  p_note text default null
)
returns table (order_id uuid, order_status text, fulfillment_status text, pickup_code text)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  order_record public.orders;
  caller_role public.app_role;
  generated_code text;
begin
  select * into order_record from public.orders where id = p_order_id for update;
  if order_record.id is null then raise exception 'order_not_found'; end if;
  caller_role := private.current_store_role(order_record.store_id);
  if caller_role not in ('owner', 'manager', 'staff') then raise exception 'fulfillment_access_denied'; end if;
  if length(coalesce(p_note, '')) > 1000 then raise exception 'fulfillment_note_too_long'; end if;
  if order_record.payment_status <> 'succeeded' then raise exception 'payment_not_cleared'; end if;

  if not (
    (order_record.fulfillment_status = 'pending' and p_event_type = 'preparing' and order_record.status = 'confirmed')
    or (order_record.fulfillment_status = 'preparing' and p_event_type = 'ready_for_pickup' and order_record.fulfillment_method = 'pickup')
    or (order_record.fulfillment_status = 'preparing' and p_event_type = 'out_for_delivery' and order_record.fulfillment_method in ('delivery', 'shipping'))
    or (order_record.fulfillment_status = 'ready_for_pickup' and p_event_type = 'picked_up' and order_record.fulfillment_method = 'pickup')
    or (order_record.fulfillment_status = 'out_for_delivery' and p_event_type = 'delivered' and order_record.fulfillment_method in ('delivery', 'shipping'))
  ) then raise exception 'invalid_fulfillment_transition'; end if;

  if p_event_type = 'preparing' then
    update public.orders set fulfillment_status = 'preparing', status = 'preparing' where id = p_order_id;
  elsif p_event_type = 'ready_for_pickup' then
    generated_code := upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 6));
    insert into public.order_pickup_credentials (order_id, store_id, code, expires_at, created_by)
    values (p_order_id, order_record.store_id, generated_code, now() + interval '7 days', auth.uid())
    on conflict on constraint order_pickup_credentials_pkey do update set code = excluded.code, expires_at = excluded.expires_at,
      redeemed_at = null, created_by = excluded.created_by, created_at = now();
    update public.orders set fulfillment_status = 'ready_for_pickup', status = 'ready', ready_at = now() where id = p_order_id;
  elsif p_event_type = 'out_for_delivery' then
    update public.orders set fulfillment_status = 'out_for_delivery', status = 'ready', ready_at = now() where id = p_order_id;
  elsif p_event_type in ('picked_up', 'delivered') then
    update public.orders set fulfillment_status = 'fulfilled', status = 'fulfilled', fulfilled_at = now() where id = p_order_id;
    if p_event_type = 'picked_up' then
      update public.order_pickup_credentials credential set redeemed_at = now() where credential.order_id = p_order_id;
    end if;
  end if;

  insert into public.order_fulfillment_events (store_id, order_id, event_type, note, actor_user_id)
  values (order_record.store_id, p_order_id, p_event_type, nullif(trim(p_note), ''), auth.uid());

  if generated_code is null then
    select credential.code into generated_code from public.order_pickup_credentials credential where credential.order_id = p_order_id;
  end if;
  return query select updated.id, updated.status, updated.fulfillment_status, generated_code
    from public.orders updated where updated.id = p_order_id;
end;
$$;

revoke all on function public.advance_order_fulfillment(uuid, text, text) from public, anon;
grant execute on function public.advance_order_fulfillment(uuid, text, text) to authenticated;

commit;
