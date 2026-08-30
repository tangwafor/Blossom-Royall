--
-- PostgreSQL database dump
--

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'owner',
    'manager',
    'staff',
    'vendor',
    'customer'
);


--
-- Name: product_media_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.product_media_status AS ENUM (
    'draft',
    'published',
    'archived'
);


--
-- Name: vendor_brand_asset_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.vendor_brand_asset_status AS ENUM (
    'submitted',
    'approved',
    'rejected',
    'superseded'
);


--
-- Name: advance_order_fulfillment(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.advance_order_fulfillment(p_order_id uuid, p_event_type text, p_note text DEFAULT NULL::text) RETURNS TABLE(order_id uuid, order_status text, fulfillment_status text, pickup_code text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'private', 'pg_temp'
    AS $$
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


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account_deletion_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_deletion_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    scheduled_for timestamp with time zone DEFAULT (now() + '7 days'::interval) NOT NULL,
    canceled_at timestamp with time zone,
    completed_at timestamp with time zone,
    retention_summary jsonb DEFAULT '{"transaction_records": "Anonymized records may be retained where required for tax, fraud, dispute, or legal obligations."}'::jsonb NOT NULL,
    subject_hash text NOT NULL,
    claimed_at timestamp with time zone,
    claim_expires_at timestamp with time zone,
    worker_id uuid,
    attempt_count integer DEFAULT 0 NOT NULL,
    last_error text,
    processing_payload jsonb,
    completion_summary jsonb,
    CONSTRAINT account_deletion_requests_check CHECK (((status = 'canceled'::text) = (canceled_at IS NOT NULL))),
    CONSTRAINT account_deletion_requests_check1 CHECK (((status = 'completed'::text) = (completed_at IS NOT NULL))),
    CONSTRAINT account_deletion_requests_claim_valid CHECK (((status = 'processing'::text) = ((claimed_at IS NOT NULL) AND (claim_expires_at IS NOT NULL) AND (worker_id IS NOT NULL)))),
    CONSTRAINT account_deletion_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'retry_pending'::text, 'canceled'::text, 'completed'::text, 'blocked_legal_retention'::text, 'blocked_operator_review'::text])))
);


--
-- Name: cancel_account_deletion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cancel_account_deletion() RETURNS public.account_deletion_requests
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  caller_id uuid := auth.uid();
  result public.account_deletion_requests;
begin
  if caller_id is null then raise exception 'authentication_required'; end if;
  update public.account_deletion_requests set status = 'canceled', canceled_at = now(), completed_at = null
  where user_id = caller_id and status = 'pending' returning * into result;
  if result.id is null then raise exception 'pending_deletion_request_not_found'; end if;
  insert into public.audit_log (actor_user_id, store_id, action, entity_type, entity_id, after_data)
  values (caller_id, (select store_id from public.store_memberships where user_id = caller_id limit 1), 'cancel', 'account_deletion_request', result.id::text, to_jsonb(result));
  return result;
end;
$$;


--
-- Name: return_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.return_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    order_id uuid NOT NULL,
    order_item_id uuid NOT NULL,
    customer_id uuid,
    vendor_id uuid NOT NULL,
    reason text NOT NULL,
    requested_resolution text NOT NULL,
    status text DEFAULT 'requested'::text NOT NULL,
    policy_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    customer_note text,
    staff_note text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT return_requests_check CHECK ((private.order_store(order_id) = store_id)),
    CONSTRAINT return_requests_check1 CHECK ((private.vendor_store(vendor_id) = store_id)),
    CONSTRAINT return_requests_customer_note_check CHECK (((customer_note IS NULL) OR (length(customer_note) <= 1000))),
    CONSTRAINT return_requests_reason_check CHECK ((reason = ANY (ARRAY['fit'::text, 'color'::text, 'damaged'::text, 'not_as_described'::text, 'changed_mind'::text, 'other'::text]))),
    CONSTRAINT return_requests_requested_resolution_check CHECK ((requested_resolution = ANY (ARRAY['refund'::text, 'exchange'::text, 'store_credit'::text]))),
    CONSTRAINT return_requests_staff_note_check CHECK (((staff_note IS NULL) OR (length(staff_note) <= 2000))),
    CONSTRAINT return_requests_status_check CHECK ((status = ANY (ARRAY['requested'::text, 'reviewing'::text, 'approved'::text, 'rejected'::text, 'received'::text, 'completed'::text, 'canceled'::text])))
);


--
-- Name: cancel_return_request(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cancel_return_request(p_return_request_id uuid) RETURNS public.return_requests
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare result public.return_requests;
begin
  update public.return_requests
  set status = 'canceled', updated_at = now()
  where id = p_return_request_id
    and customer_id = auth.uid()
    and status in ('requested', 'reviewing')
  returning * into result;
  if result.id is null then raise exception 'return_cancel_denied'; end if;
  return result;
end;
$$;


--
-- Name: claim_due_account_deletion(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_due_account_deletion(p_worker_id uuid) RETURNS TABLE(request_id uuid, subject_user_id uuid, subject_hash text, attempt_count integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare selected_id uuid;
begin
  if p_worker_id is null then raise exception 'worker_id_required'; end if;
  select request.id into selected_id
  from public.account_deletion_requests request
  where request.user_id is not null
    and request.scheduled_for <= now()
    and (
      request.status in ('pending', 'retry_pending')
      or (request.status = 'processing' and request.claim_expires_at < now())
    )
  order by request.scheduled_for
  for update skip locked
  limit 1;
  if selected_id is null then return; end if;

  update public.account_deletion_requests request
  set status = 'processing', claimed_at = now(), claim_expires_at = now() + interval '15 minutes',
      worker_id = p_worker_id, attempt_count = request.attempt_count + 1, last_error = null
  where request.id = selected_id
  returning request.id, request.user_id, request.subject_hash, request.attempt_count
  into request_id, subject_user_id, subject_hash, attempt_count;
  return next;
end;
$$;


--
-- Name: fail_account_deletion(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fail_account_deletion(p_request_id uuid, p_worker_id uuid, p_error text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare current_attempts integer;
begin
  select attempt_count into current_attempts from public.account_deletion_requests
  where id = p_request_id and status = 'processing' and worker_id = p_worker_id for update;
  if current_attempts is null then raise exception 'deletion_claim_invalid'; end if;
  update public.account_deletion_requests
  set status = case when current_attempts >= 5 then 'blocked_operator_review' else 'retry_pending' end,
      scheduled_for = case when current_attempts >= 5 then scheduled_for else now() + interval '15 minutes' end,
      claimed_at = null, claim_expires_at = null, worker_id = null,
      last_error = left(coalesce(p_error, 'unknown_processing_error'), 500)
  where id = p_request_id;
end;
$$;


--
-- Name: finalize_account_deletion(uuid, uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.finalize_account_deletion(p_request_id uuid, p_worker_id uuid, p_completion_summary jsonb DEFAULT '{}'::jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'auth', 'pg_temp'
    AS $$
declare
  subject_user_id uuid;
begin
  select user_id into subject_user_id from public.account_deletion_requests
  where id = p_request_id and status = 'processing' and worker_id = p_worker_id
    and claim_expires_at >= now() for update;
  if subject_user_id is null then raise exception 'deletion_claim_invalid'; end if;
  delete from auth.users where id = subject_user_id;
  if not found then raise exception 'auth_identity_not_found'; end if;
  update public.account_deletion_requests
  set status = 'completed', completed_at = now(), user_id = null, claimed_at = null,
      claim_expires_at = null, worker_id = null, last_error = null,
      processing_payload = null, completion_summary = coalesce(p_completion_summary, '{}'::jsonb)
  where id = p_request_id;
end;
$$;


--
-- Name: get_customer_pickup_code(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_customer_pickup_code(p_order_id uuid) RETURNS TABLE(pickup_code text, expires_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select credential.code, credential.expires_at
  from public.order_pickup_credentials credential
  join public.orders order_record on order_record.id = credential.order_id
  where credential.order_id = p_order_id
    and order_record.customer_id = (select auth.uid())
    and order_record.fulfillment_status = 'ready_for_pickup'
    and credential.redeemed_at is null
    and credential.expires_at > now()
$$;


--
-- Name: place_tenant_order(uuid, text, text, text, jsonb, numeric, text, text, text, text, bigint, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.place_tenant_order(p_store_id uuid, p_channel text, p_fulfillment_method text, p_tender_method text, p_items jsonb, p_cash_received numeric DEFAULT NULL::numeric, p_provider_ref text DEFAULT NULL::text, p_proof_object_path text DEFAULT NULL::text, p_proof_file_name text DEFAULT NULL::text, p_proof_mime_type text DEFAULT NULL::text, p_proof_size_bytes bigint DEFAULT NULL::bigint, p_policy_snapshot jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(order_id uuid, receipt_no text, subtotal numeric, delivery_fee numeric, tax numeric, total numeric, payment_status text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'private', 'pg_temp'
    AS $$
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
  if p_tender_method = 'cash' and (p_channel <> 'onsite' or caller_role not in ('owner', 'manager', 'staff')) then
    raise exception 'cash_collection_requires_onsite_staff';
  end if;
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

  insert into public.payments (
    order_id, method, amount, status, provider_ref, cash_received, change_given,
    verification_status, proof_object_path, proof_file_name, proof_mime_type,
    proof_size_bytes, received_by, received_at, cash_accountability
  ) values (
    created_order_id, p_tender_method, total_amount, payment_state, nullif(trim(p_provider_ref), ''),
    case when p_tender_method = 'cash' then p_cash_received end,
    case when p_tender_method = 'cash' then p_cash_received - total_amount end,
    case when payment_state = 'pending_verification' then 'pending' else 'not_required' end,
    nullif(trim(p_proof_object_path), ''), nullif(trim(p_proof_file_name), ''),
    nullif(trim(p_proof_mime_type), ''), p_proof_size_bytes,
    case when p_tender_method = 'cash' then caller_id end,
    case when p_tender_method = 'cash' then now() end,
    case when p_tender_method = 'cash' then 'received' else 'not_applicable' end
  );
  insert into public.audit_log (actor_user_id, store_id, action, entity_type, entity_id, after_data)
  values (caller_id, p_store_id, 'create', 'order', created_order_id::text, jsonb_build_object('receipt_no', created_receipt, 'total', total_amount, 'payment_status', payment_state, 'channel', p_channel));
  return query select created_order_id, created_receipt, subtotal_amount, delivery_amount, tax_amount, total_amount, payment_state;
end;
$$;


--
-- Name: prepare_account_deletion(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prepare_account_deletion(p_request_id uuid, p_worker_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'auth', 'pg_temp'
    AS $$
declare
  request_record public.account_deletion_requests;
  subject_email text;
  evidence_paths jsonb := '[]'::jsonb;
  sole_owner_store uuid;
  payload jsonb;
begin
  select * into request_record from public.account_deletion_requests
  where id = p_request_id for update;
  if request_record.id is null then raise exception 'deletion_request_not_found'; end if;
  if request_record.status <> 'processing' or request_record.worker_id <> p_worker_id or request_record.claim_expires_at < now()
    then raise exception 'deletion_claim_invalid'; end if;

  if request_record.processing_payload is not null then
    return request_record.processing_payload;
  end if;

  select membership.store_id into sole_owner_store
  from public.store_memberships membership
  where membership.user_id = request_record.user_id and membership.role = 'owner'
    and not exists (
      select 1 from public.store_memberships another
      where another.store_id = membership.store_id and another.role = 'owner' and another.user_id <> request_record.user_id
    )
  limit 1;
  if sole_owner_store is not null then raise exception 'transfer_store_ownership_required'; end if;

  select email into subject_email from auth.users where id = request_record.user_id;
  select coalesce(jsonb_agg(payment.proof_object_path), '[]'::jsonb) into evidence_paths
  from public.payments payment
  where payment.proof_object_path is not null
    and payment.proof_object_path like ('%/pending/' || request_record.user_id::text || '/%');

  delete from public.measurement_profiles where customer_id = request_record.user_id;
  if subject_email is not null then
    delete from public.readiness_submissions where lower(contact_email) = lower(subject_email);
  end if;
  update public.orders set customer_id = null where customer_id = request_record.user_id;
  update public.vendors set owner_user_id = null where owner_user_id = request_record.user_id;
  update public.employees set user_id = null where user_id = request_record.user_id;
  update public.time_entries set approved_by = null where approved_by = request_record.user_id;
  update public.payments set verified_by = null, proof_object_path = null, proof_file_name = null,
    proof_mime_type = null, proof_size_bytes = null where verified_by = request_record.user_id
    or proof_object_path like ('%/pending/' || request_record.user_id::text || '/%');
  update public.product_media set uploaded_by = null where uploaded_by = request_record.user_id;
  update public.vendor_brand_assets set uploaded_by = null where uploaded_by = request_record.user_id;
  update public.vendor_brand_assets set reviewed_by = null where reviewed_by = request_record.user_id;
  update public.vendor_storefronts set created_by = null where created_by = request_record.user_id;
  update public.vendor_storefronts set updated_by = null where updated_by = request_record.user_id;
  update public.store_commerce_settings set created_by = null where created_by = request_record.user_id;
  update public.store_commerce_settings set updated_by = null where updated_by = request_record.user_id;
  update public.inventory_movements set actor_user_id = null where actor_user_id = request_record.user_id;
  update public.vendor_ledger_entries set actor_user_id = null where actor_user_id = request_record.user_id;
  update public.audit_log set actor_user_id = null,
    before_data = coalesce(before_data, '{}'::jsonb) - 'user_id' - 'customer_id' - 'email' - 'full_name',
    after_data = coalesce(after_data, '{}'::jsonb) - 'user_id' - 'customer_id' - 'email' - 'full_name'
  where actor_user_id = request_record.user_id;
  delete from public.store_memberships where user_id = request_record.user_id;

  payload := jsonb_build_object(
    'request_id', request_record.id,
    'user_id', request_record.user_id,
    'subject_hash', request_record.subject_hash,
    'payment_evidence_paths', evidence_paths
  );
  update public.account_deletion_requests set processing_payload = payload where id = request_record.id;
  return payload;
end;
$$;


--
-- Name: remove_canceled_return_request(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.remove_canceled_return_request(p_return_request_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare removed_count integer;
begin
  delete from public.return_requests
  where id = p_return_request_id and customer_id = auth.uid() and status = 'canceled';
  get diagnostics removed_count = row_count;
  if removed_count <> 1 then raise exception 'return_remove_denied'; end if;
  return true;
end;
$$;


--
-- Name: request_account_deletion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.request_account_deletion() RETURNS public.account_deletion_requests
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'private', 'pg_temp'
    AS $$
declare
  caller_id uuid := auth.uid();
  sole_owner_store uuid;
  result public.account_deletion_requests;
begin
  if caller_id is null then raise exception 'authentication_required'; end if;
  if exists (
    select 1 from public.account_deletion_requests
    where user_id = caller_id and status in ('processing', 'retry_pending', 'blocked_operator_review', 'blocked_legal_retention')
  ) then raise exception 'deletion_already_processing'; end if;
  select membership.store_id into sole_owner_store
  from public.store_memberships membership
  where membership.user_id = caller_id and membership.role = 'owner'
    and not exists (
      select 1 from public.store_memberships another
      where another.store_id = membership.store_id and another.role = 'owner' and another.user_id <> caller_id
    )
  limit 1;
  if sole_owner_store is not null then raise exception 'transfer_store_ownership_required'; end if;

  insert into public.account_deletion_requests (user_id, status, requested_at, scheduled_for, canceled_at, completed_at)
  values (caller_id, 'pending', now(), now() + interval '7 days', null, null)
  on conflict (user_id) do update set status = 'pending', requested_at = now(),
    scheduled_for = now() + interval '7 days', canceled_at = null, completed_at = null,
    claimed_at = null, claim_expires_at = null, worker_id = null, last_error = null,
    processing_payload = null, completion_summary = null
  returning * into result;

  insert into public.audit_log (actor_user_id, store_id, action, entity_type, entity_id, after_data)
  values (caller_id, (select store_id from public.store_memberships where user_id = caller_id limit 1), 'request', 'account_deletion_request', result.id::text, to_jsonb(result));
  return result;
end;
$$;


--
-- Name: request_order_item_return(uuid, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.request_order_item_return(p_order_item_id uuid, p_reason text, p_requested_resolution text, p_customer_note text DEFAULT NULL::text) RETURNS public.return_requests
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'private', 'pg_temp'
    AS $$
declare
  caller_id uuid := auth.uid();
  item_record record;
  result public.return_requests;
begin
  if caller_id is null then raise exception 'authentication_required'; end if;
  if p_reason not in ('fit', 'color', 'damaged', 'not_as_described', 'changed_mind', 'other') then raise exception 'invalid_return_reason'; end if;
  if p_requested_resolution not in ('refund', 'exchange', 'store_credit') then raise exception 'invalid_return_resolution'; end if;
  if length(coalesce(p_customer_note, '')) > 1000 then raise exception 'return_note_too_long'; end if;

  select item.id, item.order_id, item.vendor_id, order_record.store_id, order_record.customer_id,
    order_record.status as order_status, order_record.policy_snapshot
  into item_record
  from public.order_items item
  join public.orders order_record on order_record.id = item.order_id
  where item.id = p_order_item_id
    and order_record.customer_id = caller_id;

  if not found then raise exception 'order_item_not_owned'; end if;
  if item_record.order_status not in ('confirmed', 'fulfilled', 'completed') then raise exception 'order_not_returnable'; end if;

  insert into public.return_requests (
    store_id, order_id, order_item_id, customer_id, vendor_id, reason,
    requested_resolution, policy_snapshot, customer_note
  ) values (
    item_record.store_id, item_record.order_id, item_record.id, caller_id, item_record.vendor_id, p_reason,
    p_requested_resolution, item_record.policy_snapshot, nullif(trim(p_customer_note), '')
  ) returning * into result;

  return result;
exception
  when unique_violation then raise exception 'return_request_already_open';
end;
$$;


--
-- Name: resolve_customer_store(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.resolve_customer_store(p_slug text) RETURNS TABLE(store_id uuid, store_name text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select store.id, store.name
  from public.stores store
  join public.profiles profile on profile.id = (select auth.uid())
  where store.slug = p_slug
    and store.commerce_status = 'published'
    and profile.role = 'customer'
  limit 1
$$;


--
-- Name: review_pending_payment(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.review_pending_payment(p_payment_id uuid, p_decision text, p_verification_note text DEFAULT NULL::text) RETURNS TABLE(payment_id uuid, order_id uuid, payment_status text, order_status text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'private', 'pg_temp'
    AS $$
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


--
-- Name: review_return_request(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.review_return_request(p_return_request_id uuid, p_status text, p_staff_note text DEFAULT NULL::text) RETURNS public.return_requests
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'private', 'pg_temp'
    AS $$
declare
  current_record public.return_requests;
  result public.return_requests;
  caller_role public.app_role;
begin
  select * into current_record from public.return_requests where id = p_return_request_id for update;
  if current_record.id is null then raise exception 'return_request_not_found'; end if;
  caller_role := private.current_store_role(current_record.store_id);
  if caller_role not in ('owner', 'manager', 'staff') then raise exception 'return_review_denied'; end if;
  if length(coalesce(p_staff_note, '')) > 2000 then raise exception 'staff_note_too_long'; end if;
  if not (
    (current_record.status = 'requested' and p_status in ('reviewing', 'approved', 'rejected'))
    or (current_record.status = 'reviewing' and p_status in ('approved', 'rejected'))
    or (current_record.status = 'approved' and p_status = 'received')
    or (current_record.status = 'received' and p_status = 'completed')
  ) then raise exception 'invalid_return_transition'; end if;

  update public.return_requests
  set status = p_status,
      staff_note = nullif(trim(p_staff_note), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  where id = p_return_request_id
  returning * into result;
  return result;
end;
$$;


--
-- Name: rent_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rent_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lease_id uuid,
    amount numeric(12,2) NOT NULL,
    method text,
    paid_at timestamp with time zone DEFAULT now(),
    receipt_no text,
    due_on date,
    status text DEFAULT 'paid'::text NOT NULL,
    submitted_by uuid,
    submitted_at timestamp with time zone,
    provider_reference text,
    review_note text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    CONSTRAINT rent_payments_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'rejected'::text, 'failed'::text])))
);


--
-- Name: review_vendor_rent_payment(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.review_vendor_rent_payment(p_payment_id uuid, p_decision text, p_review_note text DEFAULT NULL::text) RETURNS public.rent_payments
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'private', 'pg_temp'
    AS $$
declare
  caller_id uuid := auth.uid();
  current_record public.rent_payments;
  result public.rent_payments;
  target_store uuid;
begin
  select * into current_record from public.rent_payments where id = p_payment_id for update;
  if not found then raise exception 'rent_payment_not_found'; end if;
  target_store := private.lease_store(current_record.lease_id);
  if private.current_store_role(target_store) not in ('owner', 'manager') then raise exception 'rent_review_access_denied'; end if;
  if current_record.status <> 'pending' then raise exception 'rent_payment_not_pending'; end if;
  if p_decision not in ('paid', 'rejected') then raise exception 'invalid_rent_decision'; end if;
  if length(coalesce(p_review_note, '')) > 1000 then raise exception 'rent_review_note_too_long'; end if;

  update public.rent_payments
  set status = p_decision,
      paid_at = case when p_decision = 'paid' then now() else null end,
      receipt_no = case when p_decision = 'paid' then 'BRR-' || upper(substr(replace(id::text, '-', ''), 1, 10)) else null end,
      review_note = nullif(trim(coalesce(p_review_note, '')), ''),
      reviewed_by = caller_id,
      reviewed_at = now()
  where id = p_payment_id
  returning * into result;

  insert into public.audit_log(actor_user_id, store_id, action, entity_type, entity_id, before_data, after_data)
  values (caller_id, target_store, 'review', 'rent_payment', result.id::text, to_jsonb(current_record), to_jsonb(result));
  return result;
end;
$$;


--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


--
-- Name: submit_vendor_rent_payment(uuid, date, numeric, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.submit_vendor_rent_payment(p_lease_id uuid, p_due_on date, p_amount numeric, p_method text, p_provider_reference text) RETURNS public.rent_payments
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'private', 'pg_temp'
    AS $$
declare
  caller_id uuid := auth.uid();
  lease_record public.leases;
  result public.rent_payments;
begin
  if caller_id is null then raise exception 'authentication_required'; end if;
  select * into lease_record from public.leases where id = p_lease_id for update;
  if not found or not private.owns_vendor(lease_record.vendor_id) then raise exception 'vendor_rent_access_denied'; end if;
  if lease_record.status <> 'signed' then raise exception 'signed_lease_required'; end if;
  if p_due_on is null or extract(day from p_due_on) <> least(extract(day from p_due_on), 28) then raise exception 'invalid_due_date'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'invalid_rent_amount'; end if;
  if length(trim(coalesce(p_method, ''))) not between 2 and 60 then raise exception 'payment_method_required'; end if;
  if length(trim(coalesce(p_provider_reference, ''))) not between 3 and 160 then raise exception 'payment_reference_required'; end if;
  if exists (select 1 from public.rent_payments where lease_id = p_lease_id and due_on = p_due_on and status in ('pending', 'paid')) then
    raise exception 'rent_payment_already_submitted';
  end if;

  insert into public.rent_payments(lease_id, amount, method, paid_at, due_on, status, submitted_by, submitted_at, provider_reference)
  values (p_lease_id, p_amount, trim(p_method), null, p_due_on, 'pending', caller_id, now(), trim(p_provider_reference))
  returning * into result;

  insert into public.audit_log(actor_user_id, store_id, action, entity_type, entity_id, after_data)
  values (caller_id, private.lease_store(p_lease_id), 'submit', 'rent_payment', result.id::text, to_jsonb(result));
  return result;
end;
$$;


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id bigint NOT NULL,
    actor_user_id uuid,
    store_id uuid,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id text,
    before_data jsonb,
    after_data jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.audit_log ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid,
    user_id uuid,
    hourly_rate numeric(10,2),
    status text DEFAULT 'active'::text
);


--
-- Name: inventory_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    variant_id uuid NOT NULL,
    order_id uuid,
    quantity_delta integer NOT NULL,
    reason text NOT NULL,
    actor_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT inventory_movements_quantity_delta_check CHECK ((quantity_delta <> 0)),
    CONSTRAINT inventory_movements_reason_check CHECK ((reason = ANY (ARRAY['sale'::text, 'return'::text, 'adjustment'::text, 'transfer'::text, 'reservation_release'::text])))
);


--
-- Name: leases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vendor_id uuid,
    space_code text,
    monthly_rent numeric(12,2) NOT NULL,
    deposit numeric(12,2) DEFAULT 0,
    start_date date NOT NULL,
    end_date date,
    status text DEFAULT 'draft'::text,
    signed_at timestamp with time zone,
    rent_due_day integer DEFAULT 1 NOT NULL,
    CONSTRAINT leases_rent_due_day_check CHECK (((rent_due_day >= 1) AND (rent_due_day <= 28)))
);


--
-- Name: measurement_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.measurement_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    label text NOT NULL,
    units text DEFAULT 'in'::text,
    measurements jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: order_fulfillment_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_fulfillment_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    order_id uuid NOT NULL,
    event_type text NOT NULL,
    note text,
    actor_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT order_fulfillment_events_check CHECK ((private.order_store(order_id) = store_id)),
    CONSTRAINT order_fulfillment_events_event_type_check CHECK ((event_type = ANY (ARRAY['preparing'::text, 'ready_for_pickup'::text, 'out_for_delivery'::text, 'picked_up'::text, 'delivered'::text]))),
    CONSTRAINT order_fulfillment_events_note_check CHECK (((note IS NULL) OR (length(note) <= 1000)))
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid,
    variant_id uuid,
    vendor_id uuid,
    qty integer NOT NULL,
    unit_price numeric(12,2) NOT NULL
);


--
-- Name: order_pickup_credentials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_pickup_credentials (
    order_id uuid NOT NULL,
    store_id uuid NOT NULL,
    code text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    redeemed_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT order_pickup_credentials_check CHECK ((private.order_store(order_id) = store_id)),
    CONSTRAINT order_pickup_credentials_code_check CHECK ((code ~ '^[A-F0-9]{6}$'::text))
);


--
-- Name: order_receipt_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_receipt_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid,
    customer_id uuid,
    channel text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    subtotal numeric(12,2) DEFAULT 0,
    tax numeric(12,2) DEFAULT 0,
    total numeric(12,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    receipt_no text,
    fulfillment_method text,
    delivery_fee numeric(12,2) DEFAULT 0 NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    policy_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    payment_status text DEFAULT 'pending'::text NOT NULL,
    fulfillment_status text DEFAULT 'pending'::text NOT NULL,
    ready_at timestamp with time zone,
    fulfilled_at timestamp with time zone,
    CONSTRAINT orders_fulfillment_status_check CHECK ((fulfillment_status = ANY (ARRAY['pending'::text, 'preparing'::text, 'ready_for_pickup'::text, 'out_for_delivery'::text, 'fulfilled'::text])))
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid,
    method text NOT NULL,
    amount numeric(12,2) NOT NULL,
    status text DEFAULT 'succeeded'::text,
    provider_ref text,
    created_at timestamp with time zone DEFAULT now(),
    cash_received numeric(12,2),
    change_given numeric(12,2),
    proof_object_path text,
    proof_file_name text,
    proof_mime_type text,
    proof_size_bytes bigint,
    verification_status text DEFAULT 'not_required'::text NOT NULL,
    verified_by uuid,
    verified_at timestamp with time zone,
    verification_note text,
    received_by uuid,
    received_at timestamp with time zone,
    cash_accountability text NOT NULL,
    CONSTRAINT payments_cash_accountability_valid CHECK ((cash_accountability = ANY (ARRAY['received'::text, 'receiver_anonymized'::text, 'legacy_unverified'::text, 'not_applicable'::text]))),
    CONSTRAINT payments_cash_amounts_valid CHECK ((((method = 'cash'::text) AND (cash_received >= amount) AND (change_given = (cash_received - amount)) AND (received_by IS NOT NULL) AND (received_at IS NOT NULL) AND (cash_accountability = 'received'::text) AND (status = 'succeeded'::text) AND (verification_status = 'not_required'::text)) OR ((method = 'cash'::text) AND (cash_accountability = 'legacy_unverified'::text) AND (received_by IS NULL) AND (received_at IS NULL)) OR ((method = 'cash'::text) AND (cash_accountability = 'receiver_anonymized'::text) AND (received_by IS NULL) AND (received_at IS NOT NULL) AND (status = 'succeeded'::text) AND (verification_status = 'not_required'::text)) OR ((method <> 'cash'::text) AND (cash_received IS NULL) AND (change_given IS NULL) AND (received_by IS NULL) AND (received_at IS NULL) AND (cash_accountability = 'not_applicable'::text)))),
    CONSTRAINT payments_proof_size_valid CHECK (((proof_size_bytes IS NULL) OR ((proof_size_bytes >= 1) AND (proof_size_bytes <= 5242880)))),
    CONSTRAINT payments_verification_status_valid CHECK ((verification_status = ANY (ARRAY['not_required'::text, 'pending'::text, 'verified'::text, 'rejected'::text])))
);


--
-- Name: product_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    product_id uuid NOT NULL,
    uploaded_by uuid,
    original_file_name text NOT NULL,
    storage_path text NOT NULL,
    mime_type text NOT NULL,
    byte_size integer NOT NULL,
    sha256 text NOT NULL,
    width_px integer NOT NULL,
    height_px integer NOT NULL,
    alt_text text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    status public.product_media_status DEFAULT 'draft'::public.product_media_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT product_media_alt_text_check CHECK (((length(alt_text) >= 1) AND (length(alt_text) <= 500))),
    CONSTRAINT product_media_byte_size_check CHECK (((byte_size >= 1) AND (byte_size <= 10000000))),
    CONSTRAINT product_media_check CHECK ((storage_path = (((((((store_id)::text || '/'::text) || (product_id)::text) || '/'::text) || (id)::text) || '/'::text) || original_file_name))),
    CONSTRAINT product_media_height_px_check CHECK ((height_px > 0)),
    CONSTRAINT product_media_mime_type_check CHECK ((mime_type = ANY (ARRAY['image/jpeg'::text, 'image/png'::text, 'image/webp'::text]))),
    CONSTRAINT product_media_original_file_name_check CHECK (((length(original_file_name) >= 1) AND (length(original_file_name) <= 255))),
    CONSTRAINT product_media_sha256_check CHECK ((sha256 ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT product_media_sort_order_check CHECK ((sort_order >= 0)),
    CONSTRAINT product_media_width_px_check CHECK ((width_px > 0))
);


--
-- Name: product_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    sku text NOT NULL,
    size text,
    color text,
    price numeric(12,2) NOT NULL,
    qty_on_hand integer DEFAULT 0 NOT NULL
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid,
    vendor_id uuid,
    name text NOT NULL,
    description text,
    category text,
    status text DEFAULT 'draft'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text,
    role public.app_role DEFAULT 'customer'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: readiness_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.readiness_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_slug text DEFAULT 'blossom-royall'::text NOT NULL,
    store_id uuid,
    respondent_role text NOT NULL,
    contact_email text,
    answers jsonb NOT NULL,
    consent_confirmed boolean NOT NULL,
    status text DEFAULT 'new'::text NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT readiness_submissions_answers_check CHECK (((jsonb_typeof(answers) = 'object'::text) AND (pg_column_size(answers) <= 100000))),
    CONSTRAINT readiness_submissions_consent_confirmed_check CHECK (consent_confirmed),
    CONSTRAINT readiness_submissions_contact_email_check CHECK (((contact_email IS NULL) OR ((contact_email = lower(contact_email)) AND ((length(contact_email) >= 3) AND (length(contact_email) <= 320))))),
    CONSTRAINT readiness_submissions_respondent_role_check CHECK ((respondent_role = ANY (ARRAY['owner'::text, 'vendor'::text, 'prospect'::text]))),
    CONSTRAINT readiness_submissions_status_check CHECK ((status = ANY (ARRAY['new'::text, 'reviewing'::text, 'complete'::text, 'archived'::text]))),
    CONSTRAINT readiness_submissions_tenant_slug_check CHECK ((tenant_slug ~ '^[a-z0-9-]{2,80}$'::text))
);


--
-- Name: store_commerce_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_commerce_settings (
    store_id uuid NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    tax_rate_percent numeric(7,4) DEFAULT 0 NOT NULL,
    tax_inclusive boolean DEFAULT false NOT NULL,
    delivery_taxable boolean DEFAULT false NOT NULL,
    pickup_enabled boolean DEFAULT true NOT NULL,
    local_delivery_enabled boolean DEFAULT false NOT NULL,
    local_delivery_fee numeric(12,2) DEFAULT 0 NOT NULL,
    free_local_minimum numeric(12,2) DEFAULT 0 NOT NULL,
    shipping_enabled boolean DEFAULT false NOT NULL,
    shipping_fee numeric(12,2) DEFAULT 0 NOT NULL,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT store_commerce_settings_currency_check CHECK ((currency ~ '^[A-Z]{3}$'::text)),
    CONSTRAINT store_commerce_settings_free_local_minimum_check CHECK ((free_local_minimum >= (0)::numeric)),
    CONSTRAINT store_commerce_settings_local_delivery_fee_check CHECK ((local_delivery_fee >= (0)::numeric)),
    CONSTRAINT store_commerce_settings_shipping_fee_check CHECK ((shipping_fee >= (0)::numeric)),
    CONSTRAINT store_commerce_settings_tax_rate_percent_check CHECK (((tax_rate_percent >= (0)::numeric) AND (tax_rate_percent <= (100)::numeric)))
);


--
-- Name: store_memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid,
    user_id uuid,
    role public.app_role NOT NULL
);


--
-- Name: stores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    address jsonb,
    timezone text DEFAULT 'America/New_York'::text,
    created_at timestamp with time zone DEFAULT now(),
    slug text,
    commerce_status text DEFAULT 'draft'::text NOT NULL,
    CONSTRAINT stores_commerce_status_check CHECK ((commerce_status = ANY (ARRAY['draft'::text, 'published'::text, 'suspended'::text])))
);


--
-- Name: time_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.time_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid,
    clock_in timestamp with time zone NOT NULL,
    clock_out timestamp with time zone,
    break_minutes integer DEFAULT 0,
    approved_by uuid
);


--
-- Name: vendor_brand_assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_brand_assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    vendor_id uuid NOT NULL,
    uploaded_by uuid,
    contact_email text NOT NULL,
    original_file_name text NOT NULL,
    storage_path text NOT NULL,
    mime_type text NOT NULL,
    byte_size integer NOT NULL,
    sha256 text NOT NULL,
    width_px integer,
    height_px integer,
    rights_confirmed boolean DEFAULT false NOT NULL,
    rights_confirmed_at timestamp with time zone DEFAULT now() NOT NULL,
    status public.vendor_brand_asset_status DEFAULT 'submitted'::public.vendor_brand_asset_status NOT NULL,
    version integer NOT NULL,
    is_current boolean DEFAULT false NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    review_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vendor_brand_assets_byte_size_check CHECK (((byte_size >= 1) AND (byte_size <= 5000000))),
    CONSTRAINT vendor_brand_assets_check CHECK ((storage_path = (((((((store_id)::text || '/'::text) || (vendor_id)::text) || '/'::text) || (id)::text) || '/'::text) || original_file_name))),
    CONSTRAINT vendor_brand_assets_check1 CHECK ((((status = 'submitted'::public.vendor_brand_asset_status) AND (reviewed_by IS NULL) AND (reviewed_at IS NULL)) OR ((status <> 'submitted'::public.vendor_brand_asset_status) AND (reviewed_by IS NOT NULL) AND (reviewed_at IS NOT NULL)))),
    CONSTRAINT vendor_brand_assets_check2 CHECK (((NOT is_current) OR (status = 'approved'::public.vendor_brand_asset_status))),
    CONSTRAINT vendor_brand_assets_contact_email_check CHECK (((contact_email = lower(contact_email)) AND ((length(contact_email) >= 3) AND (length(contact_email) <= 320)))),
    CONSTRAINT vendor_brand_assets_height_px_check CHECK (((height_px IS NULL) OR (height_px > 0))),
    CONSTRAINT vendor_brand_assets_mime_type_check CHECK ((mime_type = ANY (ARRAY['image/png'::text, 'image/jpeg'::text, 'image/webp'::text, 'image/svg+xml'::text]))),
    CONSTRAINT vendor_brand_assets_original_file_name_check CHECK (((length(original_file_name) >= 1) AND (length(original_file_name) <= 255))),
    CONSTRAINT vendor_brand_assets_review_note_check CHECK (((review_note IS NULL) OR (length(review_note) <= 2000))),
    CONSTRAINT vendor_brand_assets_rights_confirmed_check CHECK (rights_confirmed),
    CONSTRAINT vendor_brand_assets_sha256_check CHECK ((sha256 ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT vendor_brand_assets_version_check CHECK ((version > 0)),
    CONSTRAINT vendor_brand_assets_width_px_check CHECK (((width_px IS NULL) OR (width_px > 0)))
);


--
-- Name: vendor_ledger_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_ledger_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    vendor_id uuid NOT NULL,
    order_id uuid,
    entry_type text NOT NULL,
    amount numeric(12,2) NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    memo text,
    actor_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vendor_ledger_entries_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT vendor_ledger_entries_check CHECK ((private.vendor_store(vendor_id) = store_id)),
    CONSTRAINT vendor_ledger_entries_entry_type_check CHECK ((entry_type = ANY (ARRAY['sale_credit'::text, 'refund_debit'::text, 'fee_debit'::text, 'adjustment_credit'::text, 'adjustment_debit'::text, 'payout_debit'::text])))
);


--
-- Name: vendor_storefronts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_storefronts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    vendor_id uuid NOT NULL,
    slug text NOT NULL,
    public_name text NOT NULL,
    owner_display_name text,
    tagline text,
    story text,
    categories text[] DEFAULT '{}'::text[] NOT NULL,
    facebook_url text,
    website_url text,
    contact_email text,
    contact_phone text,
    primary_color text DEFAULT '#5a1830'::text NOT NULL,
    secondary_color text DEFAULT '#f1d49d'::text NOT NULL,
    fulfillment_methods text[] DEFAULT '{}'::text[] NOT NULL,
    media_rights_status text DEFAULT 'pending'::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    published_at timestamp with time zone,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vendor_storefronts_check CHECK ((private.vendor_store(vendor_id) = store_id)),
    CONSTRAINT vendor_storefronts_check1 CHECK ((((status = 'published'::text) AND (published_at IS NOT NULL)) OR ((status <> 'published'::text) AND (published_at IS NULL)))),
    CONSTRAINT vendor_storefronts_contact_email_check CHECK (((contact_email IS NULL) OR (contact_email = lower(contact_email)))),
    CONSTRAINT vendor_storefronts_facebook_url_check CHECK (((facebook_url IS NULL) OR (facebook_url ~ '^https://'::text))),
    CONSTRAINT vendor_storefronts_media_rights_status_check CHECK ((media_rights_status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'restricted'::text]))),
    CONSTRAINT vendor_storefronts_owner_display_name_check CHECK (((owner_display_name IS NULL) OR (length(owner_display_name) <= 120))),
    CONSTRAINT vendor_storefronts_primary_color_check CHECK ((primary_color ~ '^#[0-9A-Fa-f]{6}$'::text)),
    CONSTRAINT vendor_storefronts_public_name_check CHECK (((length(public_name) >= 1) AND (length(public_name) <= 120))),
    CONSTRAINT vendor_storefronts_secondary_color_check CHECK ((secondary_color ~ '^#[0-9A-Fa-f]{6}$'::text)),
    CONSTRAINT vendor_storefronts_slug_check CHECK ((slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text)),
    CONSTRAINT vendor_storefronts_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'review'::text, 'published'::text, 'suspended'::text]))),
    CONSTRAINT vendor_storefronts_story_check CHECK (((story IS NULL) OR (length(story) <= 4000))),
    CONSTRAINT vendor_storefronts_tagline_check CHECK (((tagline IS NULL) OR (length(tagline) <= 180))),
    CONSTRAINT vendor_storefronts_website_url_check CHECK (((website_url IS NULL) OR (website_url ~ '^https://'::text)))
);


--
-- Name: vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid,
    owner_user_id uuid,
    name text NOT NULL,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: account_deletion_requests account_deletion_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_deletion_requests
    ADD CONSTRAINT account_deletion_requests_pkey PRIMARY KEY (id);


--
-- Name: account_deletion_requests account_deletion_requests_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_deletion_requests
    ADD CONSTRAINT account_deletion_requests_user_id_key UNIQUE (user_id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: inventory_movements inventory_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_pkey PRIMARY KEY (id);


--
-- Name: leases leases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leases
    ADD CONSTRAINT leases_pkey PRIMARY KEY (id);


--
-- Name: measurement_profiles measurement_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.measurement_profiles
    ADD CONSTRAINT measurement_profiles_pkey PRIMARY KEY (id);


--
-- Name: order_fulfillment_events order_fulfillment_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_fulfillment_events
    ADD CONSTRAINT order_fulfillment_events_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: order_pickup_credentials order_pickup_credentials_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_pickup_credentials
    ADD CONSTRAINT order_pickup_credentials_code_key UNIQUE (code);


--
-- Name: order_pickup_credentials order_pickup_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_pickup_credentials
    ADD CONSTRAINT order_pickup_credentials_pkey PRIMARY KEY (order_id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: orders orders_receipt_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_receipt_no_key UNIQUE (receipt_no);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: product_media product_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_media
    ADD CONSTRAINT product_media_pkey PRIMARY KEY (id);


--
-- Name: product_media product_media_product_id_sort_order_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_media
    ADD CONSTRAINT product_media_product_id_sort_order_key UNIQUE (product_id, sort_order);


--
-- Name: product_media product_media_storage_path_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_media
    ADD CONSTRAINT product_media_storage_path_key UNIQUE (storage_path);


--
-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);


--
-- Name: product_variants product_variants_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_sku_key UNIQUE (sku);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: readiness_submissions readiness_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.readiness_submissions
    ADD CONSTRAINT readiness_submissions_pkey PRIMARY KEY (id);


--
-- Name: rent_payments rent_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rent_payments
    ADD CONSTRAINT rent_payments_pkey PRIMARY KEY (id);


--
-- Name: rent_payments rent_payments_receipt_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rent_payments
    ADD CONSTRAINT rent_payments_receipt_no_key UNIQUE (receipt_no);


--
-- Name: return_requests return_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.return_requests
    ADD CONSTRAINT return_requests_pkey PRIMARY KEY (id);


--
-- Name: store_commerce_settings store_commerce_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_commerce_settings
    ADD CONSTRAINT store_commerce_settings_pkey PRIMARY KEY (store_id);


--
-- Name: store_memberships store_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_memberships
    ADD CONSTRAINT store_memberships_pkey PRIMARY KEY (id);


--
-- Name: store_memberships store_memberships_store_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_memberships
    ADD CONSTRAINT store_memberships_store_id_user_id_key UNIQUE (store_id, user_id);


--
-- Name: stores stores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_pkey PRIMARY KEY (id);


--
-- Name: time_entries time_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_pkey PRIMARY KEY (id);


--
-- Name: vendor_brand_assets vendor_brand_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_brand_assets
    ADD CONSTRAINT vendor_brand_assets_pkey PRIMARY KEY (id);


--
-- Name: vendor_brand_assets vendor_brand_assets_storage_path_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_brand_assets
    ADD CONSTRAINT vendor_brand_assets_storage_path_key UNIQUE (storage_path);


--
-- Name: vendor_brand_assets vendor_brand_assets_vendor_id_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_brand_assets
    ADD CONSTRAINT vendor_brand_assets_vendor_id_version_key UNIQUE (vendor_id, version);


--
-- Name: vendor_ledger_entries vendor_ledger_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_ledger_entries
    ADD CONSTRAINT vendor_ledger_entries_pkey PRIMARY KEY (id);


--
-- Name: vendor_storefronts vendor_storefronts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_storefronts
    ADD CONSTRAINT vendor_storefronts_pkey PRIMARY KEY (id);


--
-- Name: vendor_storefronts vendor_storefronts_store_id_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_storefronts
    ADD CONSTRAINT vendor_storefronts_store_id_slug_key UNIQUE (store_id, slug);


--
-- Name: vendor_storefronts vendor_storefronts_vendor_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_storefronts
    ADD CONSTRAINT vendor_storefronts_vendor_id_key UNIQUE (vendor_id);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: account_deletion_requests_due_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX account_deletion_requests_due_idx ON public.account_deletion_requests USING btree (scheduled_for, claim_expires_at) WHERE (status = ANY (ARRAY['pending'::text, 'processing'::text, 'retry_pending'::text]));


--
-- Name: employees_store_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX employees_store_id_idx ON public.employees USING btree (store_id);


--
-- Name: employees_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX employees_user_id_idx ON public.employees USING btree (user_id);


--
-- Name: inventory_movements_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inventory_movements_order_idx ON public.inventory_movements USING btree (order_id);


--
-- Name: inventory_movements_store_variant_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inventory_movements_store_variant_idx ON public.inventory_movements USING btree (store_id, variant_id, created_at DESC);


--
-- Name: leases_vendor_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX leases_vendor_id_idx ON public.leases USING btree (vendor_id);


--
-- Name: measurement_profiles_customer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX measurement_profiles_customer_id_idx ON public.measurement_profiles USING btree (customer_id);


--
-- Name: order_fulfillment_events_order_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX order_fulfillment_events_order_created_idx ON public.order_fulfillment_events USING btree (order_id, created_at);


--
-- Name: order_fulfillment_events_store_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX order_fulfillment_events_store_created_idx ON public.order_fulfillment_events USING btree (store_id, created_at DESC);


--
-- Name: order_items_order_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX order_items_order_id_idx ON public.order_items USING btree (order_id);


--
-- Name: order_items_variant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX order_items_variant_id_idx ON public.order_items USING btree (variant_id);


--
-- Name: order_items_vendor_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX order_items_vendor_id_idx ON public.order_items USING btree (vendor_id);


--
-- Name: orders_customer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_customer_id_idx ON public.orders USING btree (customer_id);


--
-- Name: orders_store_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_store_id_idx ON public.orders USING btree (store_id);


--
-- Name: payments_cashier_received_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payments_cashier_received_idx ON public.payments USING btree (received_by, received_at DESC) WHERE (method = 'cash'::text);


--
-- Name: payments_order_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payments_order_id_idx ON public.payments USING btree (order_id);


--
-- Name: product_media_product_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_media_product_id_idx ON public.product_media USING btree (product_id);


--
-- Name: product_media_store_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_media_store_id_idx ON public.product_media USING btree (store_id);


--
-- Name: product_media_store_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_media_store_status_idx ON public.product_media USING btree (store_id, status, created_at DESC);


--
-- Name: product_media_uploaded_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_media_uploaded_by_idx ON public.product_media USING btree (uploaded_by);


--
-- Name: product_variants_product_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_variants_product_id_idx ON public.product_variants USING btree (product_id);


--
-- Name: products_store_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_store_id_idx ON public.products USING btree (store_id);


--
-- Name: products_vendor_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_vendor_id_idx ON public.products USING btree (vendor_id);


--
-- Name: readiness_submissions_tenant_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX readiness_submissions_tenant_status_idx ON public.readiness_submissions USING btree (tenant_slug, status, submitted_at DESC);


--
-- Name: rent_payments_due_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rent_payments_due_status_idx ON public.rent_payments USING btree (lease_id, due_on, status);


--
-- Name: rent_payments_lease_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rent_payments_lease_id_idx ON public.rent_payments USING btree (lease_id);


--
-- Name: return_requests_customer_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX return_requests_customer_created_idx ON public.return_requests USING btree (customer_id, created_at DESC);


--
-- Name: return_requests_one_open_per_item; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX return_requests_one_open_per_item ON public.return_requests USING btree (order_item_id) WHERE (status <> ALL (ARRAY['rejected'::text, 'completed'::text, 'canceled'::text]));


--
-- Name: return_requests_store_status_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX return_requests_store_status_created_idx ON public.return_requests USING btree (store_id, status, created_at DESC);


--
-- Name: store_memberships_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX store_memberships_user_id_idx ON public.store_memberships USING btree (user_id);


--
-- Name: stores_slug_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX stores_slug_unique ON public.stores USING btree (slug) WHERE (slug IS NOT NULL);


--
-- Name: time_entries_approved_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX time_entries_approved_by_idx ON public.time_entries USING btree (approved_by);


--
-- Name: time_entries_employee_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX time_entries_employee_id_idx ON public.time_entries USING btree (employee_id);


--
-- Name: vendor_brand_assets_one_current_per_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX vendor_brand_assets_one_current_per_vendor ON public.vendor_brand_assets USING btree (vendor_id) WHERE is_current;


--
-- Name: vendor_brand_assets_review_queue; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vendor_brand_assets_review_queue ON public.vendor_brand_assets USING btree (store_id, status, created_at DESC);


--
-- Name: vendor_brand_assets_reviewed_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vendor_brand_assets_reviewed_by_idx ON public.vendor_brand_assets USING btree (reviewed_by);


--
-- Name: vendor_brand_assets_uploaded_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vendor_brand_assets_uploaded_by_idx ON public.vendor_brand_assets USING btree (uploaded_by);


--
-- Name: vendor_ledger_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vendor_ledger_order_idx ON public.vendor_ledger_entries USING btree (order_id);


--
-- Name: vendor_ledger_store_vendor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vendor_ledger_store_vendor_idx ON public.vendor_ledger_entries USING btree (store_id, vendor_id, created_at DESC);


--
-- Name: vendor_storefronts_store_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vendor_storefronts_store_status_idx ON public.vendor_storefronts USING btree (store_id, status, updated_at DESC);


--
-- Name: vendors_owner_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vendors_owner_user_id_idx ON public.vendors USING btree (owner_user_id);


--
-- Name: vendors_store_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vendors_store_id_idx ON public.vendors USING btree (store_id);


--
-- Name: account_deletion_requests account_deletion_subject_hash; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER account_deletion_subject_hash BEFORE INSERT OR UPDATE OF user_id ON public.account_deletion_requests FOR EACH ROW EXECUTE FUNCTION private.set_account_deletion_subject_hash();


--
-- Name: inventory_movements inventory_movements_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER inventory_movements_audit AFTER INSERT OR DELETE OR UPDATE ON public.inventory_movements FOR EACH ROW EXECUTE FUNCTION private.audit_inventory_movement_write();


--
-- Name: measurement_profiles measurement_profiles_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER measurement_profiles_audit AFTER INSERT OR DELETE OR UPDATE ON public.measurement_profiles FOR EACH ROW EXECUTE FUNCTION private.audit_measurement_profile();


--
-- Name: order_fulfillment_events order_fulfillment_events_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER order_fulfillment_events_audit AFTER INSERT OR DELETE OR UPDATE ON public.order_fulfillment_events FOR EACH ROW EXECUTE FUNCTION private.audit_fulfillment_event_write();


--
-- Name: order_pickup_credentials order_pickup_credentials_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER order_pickup_credentials_audit AFTER INSERT OR DELETE OR UPDATE ON public.order_pickup_credentials FOR EACH ROW EXECUTE FUNCTION private.audit_pickup_credential_write();


--
-- Name: orders orders_fulfillment_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER orders_fulfillment_audit AFTER UPDATE OF status, fulfillment_status, ready_at, fulfilled_at ON public.orders FOR EACH ROW EXECUTE FUNCTION private.audit_order_fulfillment_update();


--
-- Name: orders orders_payment_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER orders_payment_audit AFTER UPDATE OF payment_status ON public.orders FOR EACH ROW EXECUTE FUNCTION private.audit_order_payment_update();


--
-- Name: payments payments_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER payments_audit AFTER INSERT OR DELETE OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION private.audit_payment_write();


--
-- Name: product_media product_media_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER product_media_audit AFTER INSERT OR DELETE OR UPDATE ON public.product_media FOR EACH ROW EXECUTE FUNCTION private.audit_product_media();


--
-- Name: product_variants product_variants_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER product_variants_audit AFTER INSERT OR DELETE OR UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION private.audit_product_variant_write();


--
-- Name: profiles profiles_prepare_cash_receiver_deletion; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER profiles_prepare_cash_receiver_deletion BEFORE DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION private.prepare_cash_receiver_deletion();


--
-- Name: readiness_submissions readiness_submissions_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER readiness_submissions_audit AFTER INSERT OR DELETE OR UPDATE ON public.readiness_submissions FOR EACH ROW EXECUTE FUNCTION private.audit_readiness_submission();


--
-- Name: return_requests return_requests_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER return_requests_audit AFTER INSERT OR DELETE OR UPDATE ON public.return_requests FOR EACH ROW EXECUTE FUNCTION private.audit_return_request_write();


--
-- Name: store_commerce_settings store_commerce_settings_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER store_commerce_settings_audit AFTER INSERT OR DELETE OR UPDATE ON public.store_commerce_settings FOR EACH ROW EXECUTE FUNCTION private.audit_store_commerce_settings_write();


--
-- Name: vendor_brand_assets vendor_brand_asset_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER vendor_brand_asset_audit AFTER INSERT OR DELETE OR UPDATE ON public.vendor_brand_assets FOR EACH ROW EXECUTE FUNCTION private.audit_vendor_brand_asset();


--
-- Name: vendor_ledger_entries vendor_ledger_entries_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER vendor_ledger_entries_audit AFTER INSERT OR DELETE OR UPDATE ON public.vendor_ledger_entries FOR EACH ROW EXECUTE FUNCTION private.audit_vendor_ledger_write();


--
-- Name: vendor_storefronts vendor_storefronts_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER vendor_storefronts_audit AFTER INSERT OR DELETE OR UPDATE ON public.vendor_storefronts FOR EACH ROW EXECUTE FUNCTION private.audit_vendor_storefront_write();


--
-- Name: account_deletion_requests account_deletion_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_deletion_requests
    ADD CONSTRAINT account_deletion_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: employees employees_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: employees employees_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: inventory_movements inventory_movements_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: inventory_movements inventory_movements_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE RESTRICT;


--
-- Name: inventory_movements inventory_movements_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: inventory_movements inventory_movements_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id);


--
-- Name: leases leases_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leases
    ADD CONSTRAINT leases_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: measurement_profiles measurement_profiles_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.measurement_profiles
    ADD CONSTRAINT measurement_profiles_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: order_fulfillment_events order_fulfillment_events_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_fulfillment_events
    ADD CONSTRAINT order_fulfillment_events_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: order_fulfillment_events order_fulfillment_events_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_fulfillment_events
    ADD CONSTRAINT order_fulfillment_events_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE RESTRICT;


--
-- Name: order_fulfillment_events order_fulfillment_events_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_fulfillment_events
    ADD CONSTRAINT order_fulfillment_events_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE RESTRICT;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id);


--
-- Name: order_items order_items_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: order_pickup_credentials order_pickup_credentials_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_pickup_credentials
    ADD CONSTRAINT order_pickup_credentials_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: order_pickup_credentials order_pickup_credentials_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_pickup_credentials
    ADD CONSTRAINT order_pickup_credentials_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_pickup_credentials order_pickup_credentials_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_pickup_credentials
    ADD CONSTRAINT order_pickup_credentials_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE RESTRICT;


--
-- Name: orders orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: orders orders_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: payments payments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: payments payments_received_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: payments payments_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: product_media product_media_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_media
    ADD CONSTRAINT product_media_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_media product_media_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_media
    ADD CONSTRAINT product_media_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: product_media product_media_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_media
    ADD CONSTRAINT product_media_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: product_variants product_variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: products products_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: products products_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: readiness_submissions readiness_submissions_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.readiness_submissions
    ADD CONSTRAINT readiness_submissions_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: rent_payments rent_payments_lease_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rent_payments
    ADD CONSTRAINT rent_payments_lease_id_fkey FOREIGN KEY (lease_id) REFERENCES public.leases(id) ON DELETE CASCADE;


--
-- Name: rent_payments rent_payments_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rent_payments
    ADD CONSTRAINT rent_payments_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: rent_payments rent_payments_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rent_payments
    ADD CONSTRAINT rent_payments_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: return_requests return_requests_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.return_requests
    ADD CONSTRAINT return_requests_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: return_requests return_requests_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.return_requests
    ADD CONSTRAINT return_requests_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE RESTRICT;


--
-- Name: return_requests return_requests_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.return_requests
    ADD CONSTRAINT return_requests_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE RESTRICT;


--
-- Name: return_requests return_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.return_requests
    ADD CONSTRAINT return_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: return_requests return_requests_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.return_requests
    ADD CONSTRAINT return_requests_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE RESTRICT;


--
-- Name: return_requests return_requests_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.return_requests
    ADD CONSTRAINT return_requests_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE RESTRICT;


--
-- Name: store_commerce_settings store_commerce_settings_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_commerce_settings
    ADD CONSTRAINT store_commerce_settings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: store_commerce_settings store_commerce_settings_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_commerce_settings
    ADD CONSTRAINT store_commerce_settings_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: store_commerce_settings store_commerce_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_commerce_settings
    ADD CONSTRAINT store_commerce_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: store_memberships store_memberships_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_memberships
    ADD CONSTRAINT store_memberships_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: store_memberships store_memberships_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_memberships
    ADD CONSTRAINT store_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: time_entries time_entries_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: time_entries time_entries_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: vendor_brand_assets vendor_brand_assets_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_brand_assets
    ADD CONSTRAINT vendor_brand_assets_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: vendor_brand_assets vendor_brand_assets_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_brand_assets
    ADD CONSTRAINT vendor_brand_assets_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: vendor_brand_assets vendor_brand_assets_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_brand_assets
    ADD CONSTRAINT vendor_brand_assets_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: vendor_brand_assets vendor_brand_assets_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_brand_assets
    ADD CONSTRAINT vendor_brand_assets_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: vendor_ledger_entries vendor_ledger_entries_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_ledger_entries
    ADD CONSTRAINT vendor_ledger_entries_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: vendor_ledger_entries vendor_ledger_entries_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_ledger_entries
    ADD CONSTRAINT vendor_ledger_entries_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE RESTRICT;


--
-- Name: vendor_ledger_entries vendor_ledger_entries_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_ledger_entries
    ADD CONSTRAINT vendor_ledger_entries_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: vendor_ledger_entries vendor_ledger_entries_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_ledger_entries
    ADD CONSTRAINT vendor_ledger_entries_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE RESTRICT;


--
-- Name: vendor_storefronts vendor_storefronts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_storefronts
    ADD CONSTRAINT vendor_storefronts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: vendor_storefronts vendor_storefronts_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_storefronts
    ADD CONSTRAINT vendor_storefronts_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: vendor_storefronts vendor_storefronts_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_storefronts
    ADD CONSTRAINT vendor_storefronts_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: vendor_storefronts vendor_storefronts_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_storefronts
    ADD CONSTRAINT vendor_storefronts_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: vendors vendors_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: vendors vendors_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: account_deletion_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: account_deletion_requests account_deletion_requests_delete_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY account_deletion_requests_delete_self ON public.account_deletion_requests FOR DELETE TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) AND (status = 'canceled'::text)));


--
-- Name: account_deletion_requests account_deletion_requests_insert_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY account_deletion_requests_insert_self ON public.account_deletion_requests FOR INSERT TO authenticated WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (status = 'pending'::text)));


--
-- Name: account_deletion_requests account_deletion_requests_read_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY account_deletion_requests_read_self ON public.account_deletion_requests FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: account_deletion_requests account_deletion_requests_update_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY account_deletion_requests_update_self ON public.account_deletion_requests FOR UPDATE TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) AND (status = ANY (ARRAY['pending'::text, 'canceled'::text])))) WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (status = ANY (ARRAY['pending'::text, 'canceled'::text]))));


--
-- Name: audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log audit_read_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_read_owner ON public.audit_log FOR SELECT TO authenticated USING ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: vendor_brand_assets brand_assets_owner_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY brand_assets_owner_update ON public.vendor_brand_assets FOR UPDATE TO authenticated USING ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role]))) WITH CHECK ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: vendor_brand_assets brand_assets_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY brand_assets_read ON public.vendor_brand_assets FOR SELECT TO authenticated USING (((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR (uploaded_by = ( SELECT auth.uid() AS uid)) OR private.owns_vendor(vendor_id)));


--
-- Name: vendor_brand_assets brand_assets_submit; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY brand_assets_submit ON public.vendor_brand_assets FOR INSERT TO authenticated WITH CHECK (((uploaded_by = ( SELECT auth.uid() AS uid)) AND (status = 'submitted'::public.vendor_brand_asset_status) AND (NOT is_current) AND ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR private.owns_vendor(vendor_id))));


--
-- Name: employees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

--
-- Name: employees employees_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY employees_access ON public.employees FOR SELECT TO authenticated USING (((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR (user_id = ( SELECT auth.uid() AS uid))));


--
-- Name: employees employees_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY employees_delete ON public.employees FOR DELETE TO authenticated USING ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: employees employees_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY employees_insert ON public.employees FOR INSERT TO authenticated WITH CHECK ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: employees employees_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY employees_update ON public.employees FOR UPDATE TO authenticated USING ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role]))) WITH CHECK ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: order_fulfillment_events fulfillment_events_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fulfillment_events_read ON public.order_fulfillment_events FOR SELECT TO authenticated USING (((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'staff'::public.app_role])) OR (EXISTS ( SELECT 1
   FROM public.orders order_record
  WHERE ((order_record.id = order_fulfillment_events.order_id) AND (order_record.customer_id = ( SELECT auth.uid() AS uid))))) OR private.vendor_has_order(order_id)));


--
-- Name: inventory_movements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_movements inventory_movements_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inventory_movements_delete ON public.inventory_movements FOR DELETE TO authenticated USING ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: inventory_movements inventory_movements_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inventory_movements_insert ON public.inventory_movements FOR INSERT TO authenticated WITH CHECK (((actor_user_id = ( SELECT auth.uid() AS uid)) AND (private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'staff'::public.app_role]))));


--
-- Name: inventory_movements inventory_movements_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inventory_movements_read ON public.inventory_movements FOR SELECT TO authenticated USING (((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'staff'::public.app_role])) OR private.vendor_owns_variant(variant_id)));


--
-- Name: inventory_movements inventory_movements_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inventory_movements_update ON public.inventory_movements FOR UPDATE TO authenticated USING ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role]))) WITH CHECK ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: leases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;

--
-- Name: leases leases_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leases_access ON public.leases FOR SELECT TO authenticated USING (((private.current_store_role(private.vendor_store(vendor_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR private.owns_vendor(vendor_id)));


--
-- Name: leases leases_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leases_delete ON public.leases FOR DELETE TO authenticated USING ((private.current_store_role(private.vendor_store(vendor_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: leases leases_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leases_insert ON public.leases FOR INSERT TO authenticated WITH CHECK ((private.current_store_role(private.vendor_store(vendor_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: leases leases_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leases_update ON public.leases FOR UPDATE TO authenticated USING ((private.current_store_role(private.vendor_store(vendor_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role]))) WITH CHECK ((private.current_store_role(private.vendor_store(vendor_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: measurement_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.measurement_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: measurement_profiles measurements_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY measurements_self ON public.measurement_profiles TO authenticated USING ((customer_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((customer_id = ( SELECT auth.uid() AS uid)));


--
-- Name: store_memberships memberships_read_store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY memberships_read_store ON public.store_memberships FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR (private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role]))));


--
-- Name: order_fulfillment_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_fulfillment_events ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items order_items_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY order_items_access ON public.order_items FOR SELECT TO authenticated USING (((private.current_store_role(private.order_store(order_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'staff'::public.app_role])) OR private.owns_vendor(vendor_id) OR (EXISTS ( SELECT 1
   FROM public.orders order_record
  WHERE ((order_record.id = order_items.order_id) AND (order_record.customer_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: order_items order_items_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY order_items_delete ON public.order_items FOR DELETE TO authenticated USING ((private.current_store_role(private.order_store(order_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: order_items order_items_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY order_items_insert ON public.order_items FOR INSERT TO authenticated WITH CHECK ((private.current_store_role(private.order_store(order_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'staff'::public.app_role])));


--
-- Name: order_items order_items_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY order_items_update ON public.order_items FOR UPDATE TO authenticated USING ((private.current_store_role(private.order_store(order_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'staff'::public.app_role]))) WITH CHECK ((private.current_store_role(private.order_store(order_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'staff'::public.app_role])));


--
-- Name: order_pickup_credentials; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_pickup_credentials ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: orders orders_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orders_access ON public.orders FOR SELECT TO authenticated USING (((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'staff'::public.app_role])) OR (customer_id = ( SELECT auth.uid() AS uid)) OR private.vendor_has_order(id)));


--
-- Name: orders orders_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orders_delete ON public.orders FOR DELETE TO authenticated USING ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: orders orders_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orders_insert ON public.orders FOR INSERT TO authenticated WITH CHECK (((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'staff'::public.app_role])) OR (customer_id = ( SELECT auth.uid() AS uid))));


--
-- Name: orders orders_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orders_update ON public.orders FOR UPDATE TO authenticated USING ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'staff'::public.app_role]))) WITH CHECK ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'staff'::public.app_role])));


--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: payments payments_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payments_access ON public.payments FOR SELECT TO authenticated USING (((private.current_store_role(private.order_store(order_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'staff'::public.app_role])) OR (EXISTS ( SELECT 1
   FROM public.orders order_record
  WHERE ((order_record.id = payments.order_id) AND (order_record.customer_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: payments payments_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payments_delete ON public.payments FOR DELETE TO authenticated USING ((private.current_store_role(private.order_store(order_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: payments payments_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payments_insert ON public.payments FOR INSERT TO authenticated WITH CHECK ((private.current_store_role(private.order_store(order_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: payments payments_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payments_update ON public.payments FOR UPDATE TO authenticated USING ((private.current_store_role(private.order_store(order_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role]))) WITH CHECK ((private.current_store_role(private.order_store(order_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: product_media; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;

--
-- Name: product_media product_media_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY product_media_delete ON public.product_media FOR DELETE TO authenticated USING (((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR (EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_media.product_id) AND private.owns_vendor(p.vendor_id))))));


--
-- Name: product_media product_media_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY product_media_insert ON public.product_media FOR INSERT TO authenticated WITH CHECK (((uploaded_by = ( SELECT auth.uid() AS uid)) AND (store_id = private.product_store(product_id)) AND ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR (EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_media.product_id) AND private.owns_vendor(p.vendor_id)))))));


--
-- Name: product_media product_media_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY product_media_read ON public.product_media FOR SELECT TO authenticated USING (((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'staff'::public.app_role])) OR private.vendor_owns_product(product_id) OR ((status = 'published'::public.product_media_status) AND private.customer_can_read_product(product_id))));


--
-- Name: product_media product_media_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY product_media_update ON public.product_media FOR UPDATE TO authenticated USING (((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR (EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_media.product_id) AND private.owns_vendor(p.vendor_id)))))) WITH CHECK (((store_id = private.product_store(product_id)) AND ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR (EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_media.product_id) AND private.owns_vendor(p.vendor_id)))))));


--
-- Name: product_variants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: products products_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY products_access ON public.products FOR SELECT TO authenticated USING (((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'staff'::public.app_role])) OR private.owns_vendor(vendor_id) OR ((status = 'published'::text) AND private.is_published_customer(store_id))));


--
-- Name: products products_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY products_delete ON public.products FOR DELETE TO authenticated USING (((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR private.owns_vendor(vendor_id)));


--
-- Name: products products_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY products_insert ON public.products FOR INSERT TO authenticated WITH CHECK (((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR private.owns_vendor(vendor_id)));


--
-- Name: products products_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY products_update ON public.products FOR UPDATE TO authenticated USING (((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR private.owns_vendor(vendor_id))) WITH CHECK (((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR private.owns_vendor(vendor_id)));


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_read_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_read_self ON public.profiles FOR SELECT TO authenticated USING ((id = ( SELECT auth.uid() AS uid)));


--
-- Name: profiles profiles_update_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated USING ((id = ( SELECT auth.uid() AS uid))) WITH CHECK ((id = ( SELECT auth.uid() AS uid)));


--
-- Name: readiness_submissions readiness_public_submit; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY readiness_public_submit ON public.readiness_submissions FOR INSERT TO authenticated, anon WITH CHECK (((tenant_slug = 'blossom-royall'::text) AND (store_id IS NULL) AND consent_confirmed AND (status = 'new'::text)));


--
-- Name: readiness_submissions readiness_store_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY readiness_store_delete ON public.readiness_submissions FOR DELETE TO authenticated USING (((store_id IS NOT NULL) AND (private.current_store_role(store_id) = 'owner'::public.app_role)));


--
-- Name: readiness_submissions readiness_store_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY readiness_store_read ON public.readiness_submissions FOR SELECT TO authenticated USING (((store_id IS NOT NULL) AND (private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role]))));


--
-- Name: readiness_submissions readiness_store_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY readiness_store_update ON public.readiness_submissions FOR UPDATE TO authenticated USING (((store_id IS NOT NULL) AND (private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])))) WITH CHECK (((store_id IS NOT NULL) AND (private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role]))));


--
-- Name: readiness_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.readiness_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: rent_payments rent_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rent_access ON public.rent_payments FOR SELECT TO authenticated USING (((private.current_store_role(private.lease_store(lease_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR (EXISTS ( SELECT 1
   FROM public.leases l
  WHERE ((l.id = rent_payments.lease_id) AND private.owns_vendor(l.vendor_id))))));


--
-- Name: rent_payments rent_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rent_delete ON public.rent_payments FOR DELETE TO authenticated USING ((private.current_store_role(private.lease_store(lease_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: rent_payments rent_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rent_insert ON public.rent_payments FOR INSERT TO authenticated WITH CHECK ((private.current_store_role(private.lease_store(lease_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: rent_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rent_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: rent_payments rent_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rent_update ON public.rent_payments FOR UPDATE TO authenticated USING ((private.current_store_role(private.lease_store(lease_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role]))) WITH CHECK ((private.current_store_role(private.lease_store(lease_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: return_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: return_requests return_requests_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY return_requests_read ON public.return_requests FOR SELECT TO authenticated USING (((customer_id = ( SELECT auth.uid() AS uid)) OR (private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'staff'::public.app_role])) OR private.owns_vendor(vendor_id)));


--
-- Name: store_commerce_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.store_commerce_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: store_commerce_settings store_commerce_settings_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY store_commerce_settings_delete ON public.store_commerce_settings FOR DELETE TO authenticated USING ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: store_commerce_settings store_commerce_settings_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY store_commerce_settings_insert ON public.store_commerce_settings FOR INSERT TO authenticated WITH CHECK (((created_by = ( SELECT auth.uid() AS uid)) AND (updated_by = ( SELECT auth.uid() AS uid)) AND (private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role]))));


--
-- Name: store_commerce_settings store_commerce_settings_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY store_commerce_settings_read ON public.store_commerce_settings FOR SELECT TO authenticated USING (((private.current_store_role(store_id) IS NOT NULL) OR private.is_published_customer(store_id)));


--
-- Name: store_commerce_settings store_commerce_settings_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY store_commerce_settings_update ON public.store_commerce_settings FOR UPDATE TO authenticated USING ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role]))) WITH CHECK (((updated_by = ( SELECT auth.uid() AS uid)) AND (private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role]))));


--
-- Name: store_memberships; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.store_memberships ENABLE ROW LEVEL SECURITY;

--
-- Name: stores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

--
-- Name: stores stores_read_member; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stores_read_member ON public.stores FOR SELECT TO authenticated USING (((private.current_store_role(id) IS NOT NULL) OR private.is_published_customer(id)));


--
-- Name: time_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: time_entries time_entries_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY time_entries_access ON public.time_entries FOR SELECT TO authenticated USING (((private.current_store_role(private.employee_store(employee_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR (EXISTS ( SELECT 1
   FROM public.employees e
  WHERE ((e.id = time_entries.employee_id) AND (e.user_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: time_entries time_entries_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY time_entries_delete ON public.time_entries FOR DELETE TO authenticated USING ((private.current_store_role(private.employee_store(employee_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: time_entries time_entries_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY time_entries_insert ON public.time_entries FOR INSERT TO authenticated WITH CHECK (((private.current_store_role(private.employee_store(employee_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR (EXISTS ( SELECT 1
   FROM public.employees e
  WHERE ((e.id = time_entries.employee_id) AND (e.user_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: time_entries time_entries_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY time_entries_update ON public.time_entries FOR UPDATE TO authenticated USING (((private.current_store_role(private.employee_store(employee_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR (EXISTS ( SELECT 1
   FROM public.employees e
  WHERE ((e.id = time_entries.employee_id) AND (e.user_id = ( SELECT auth.uid() AS uid))))))) WITH CHECK (((private.current_store_role(private.employee_store(employee_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR (EXISTS ( SELECT 1
   FROM public.employees e
  WHERE ((e.id = time_entries.employee_id) AND (e.user_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: product_variants variants_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY variants_access ON public.product_variants FOR SELECT TO authenticated USING (((private.current_store_role(private.product_store(product_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'staff'::public.app_role])) OR private.vendor_owns_product(product_id) OR private.customer_can_read_product(product_id)));


--
-- Name: product_variants variants_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY variants_delete ON public.product_variants FOR DELETE TO authenticated USING (((private.current_store_role(private.product_store(product_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR (EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_variants.product_id) AND private.owns_vendor(p.vendor_id))))));


--
-- Name: product_variants variants_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY variants_insert ON public.product_variants FOR INSERT TO authenticated WITH CHECK (((private.current_store_role(private.product_store(product_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR (EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_variants.product_id) AND private.owns_vendor(p.vendor_id))))));


--
-- Name: product_variants variants_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY variants_update ON public.product_variants FOR UPDATE TO authenticated USING (((private.current_store_role(private.product_store(product_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR (EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_variants.product_id) AND private.owns_vendor(p.vendor_id)))))) WITH CHECK (((private.current_store_role(private.product_store(product_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR (EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_variants.product_id) AND private.owns_vendor(p.vendor_id))))));


--
-- Name: vendor_brand_assets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vendor_brand_assets ENABLE ROW LEVEL SECURITY;

--
-- Name: vendor_ledger_entries vendor_ledger_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vendor_ledger_delete ON public.vendor_ledger_entries FOR DELETE TO authenticated USING ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: vendor_ledger_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vendor_ledger_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: vendor_ledger_entries vendor_ledger_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vendor_ledger_insert ON public.vendor_ledger_entries FOR INSERT TO authenticated WITH CHECK (((actor_user_id = ( SELECT auth.uid() AS uid)) AND (private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role]))));


--
-- Name: vendor_ledger_entries vendor_ledger_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vendor_ledger_read ON public.vendor_ledger_entries FOR SELECT TO authenticated USING (((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR private.owns_vendor(vendor_id)));


--
-- Name: vendor_ledger_entries vendor_ledger_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vendor_ledger_update ON public.vendor_ledger_entries FOR UPDATE TO authenticated USING ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role]))) WITH CHECK ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: vendor_storefronts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vendor_storefronts ENABLE ROW LEVEL SECURITY;

--
-- Name: vendor_storefronts vendor_storefronts_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vendor_storefronts_delete ON public.vendor_storefronts FOR DELETE TO authenticated USING (((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR private.owns_vendor(vendor_id)));


--
-- Name: vendor_storefronts vendor_storefronts_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vendor_storefronts_insert ON public.vendor_storefronts FOR INSERT TO authenticated WITH CHECK (((created_by = ( SELECT auth.uid() AS uid)) AND (updated_by = ( SELECT auth.uid() AS uid)) AND ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR private.owns_vendor(vendor_id))));


--
-- Name: vendor_storefronts vendor_storefronts_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vendor_storefronts_read ON public.vendor_storefronts FOR SELECT TO authenticated USING (((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR private.owns_vendor(vendor_id) OR ((status = 'published'::text) AND private.is_published_customer(store_id))));


--
-- Name: vendor_storefronts vendor_storefronts_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vendor_storefronts_update ON public.vendor_storefronts FOR UPDATE TO authenticated USING (((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR private.owns_vendor(vendor_id))) WITH CHECK (((updated_by = ( SELECT auth.uid() AS uid)) AND ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR private.owns_vendor(vendor_id))));


--
-- Name: vendors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

--
-- Name: vendors vendors_delete_store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vendors_delete_store ON public.vendors FOR DELETE TO authenticated USING ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: vendors vendors_insert_store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vendors_insert_store ON public.vendors FOR INSERT TO authenticated WITH CHECK ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: vendors vendors_read_store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vendors_read_store ON public.vendors FOR SELECT TO authenticated USING (((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'staff'::public.app_role])) OR private.owns_vendor(id) OR ((status = 'active'::text) AND private.is_published_customer(store_id))));


--
-- Name: vendors vendors_update_store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vendors_update_store ON public.vendors FOR UPDATE TO authenticated USING ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role]))) WITH CHECK ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- PostgreSQL database dump complete
--

