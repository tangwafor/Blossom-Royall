import { createClient } from "./client";

export type TenantRole = "owner" | "manager" | "staff" | "vendor" | "customer";

export type TenantContext = {
  mode: "production" | "preview";
  storeId: string | null;
  userId: string | null;
  role: TenantRole | null;
  reason: string;
};

const previewContext = (reason: string): TenantContext => ({
  mode: "preview",
  storeId: null,
  userId: null,
  role: null,
  reason,
});

export async function resolveTenantContext(): Promise<TenantContext> {
  try {
    const client = createClient();
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) return previewContext("Sign in with an authorized Blossom Royall account to use production records.");
    const { data: membership, error: membershipError } = await client
      .from("store_memberships")
      .select("store_id, role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (membershipError) return previewContext("Blossom Royall could not verify this account's store access.");
    if (!membership?.store_id) {
      const storefrontSlug = process.env.NEXT_PUBLIC_STOREFRONT_SLUG || "blossom-royall";
      const { data: storefront, error: storefrontError } = await client.rpc("resolve_customer_store", {
        p_slug: storefrontSlug,
      });
      const publicStore = Array.isArray(storefront) ? storefront[0] : storefront;
      if (storefrontError || !publicStore?.store_id) {
        return previewContext("This customer account cannot access the published Blossom Royall storefront yet.");
      }
      return {
        mode: "production",
        storeId: publicStore.store_id,
        userId: user.id,
        role: "customer",
        reason: "Published customer storefront records are active.",
      };
    }
    return {
      mode: "production",
      storeId: membership.store_id,
      userId: user.id,
      role: membership.role as TenantRole,
      reason: "Authenticated tenant records are active.",
    };
  } catch {
    return previewContext("Production configuration is unavailable. Changes remain in this device preview.");
  }
}

export function canManageTenant(role: TenantRole | null) {
  return role === "owner" || role === "manager";
}

export async function loadTenantVendors(context: TenantContext) {
  if (context.mode !== "production" || !context.storeId) return [];
  const { data, error } = await createClient()
    .from("vendors")
    .select("id, name, status, created_at")
    .eq("store_id", context.storeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export type TenantOrderSummary = {
  rawId: string;
  id: string;
  customer: string;
  total: string;
  status: string;
  time: string;
  fulfillmentMethod: string;
  fulfillmentStatus: string;
  paymentStatus: string;
};

export type CustomerOrderRecord = {
  id: string;
  receiptNo: string;
  status: string;
  fulfillmentMethod: string;
  total: number;
  paymentStatus: string;
  paymentMethod: string;
  verificationStatus: string;
  policySnapshot: Record<string, unknown>;
  placedAt: string;
  fulfillmentEvents: Array<{ id: string; eventType: string; note: string; createdAt: string }>;
  items: Array<{
    orderItemId?: string;
    variantId?: string;
    name: string;
    vendor: string;
    price: number;
    fulfillment: string;
    quantity: number;
  }>;
};

export async function loadTenantOrders(context: TenantContext): Promise<TenantOrderSummary[]> {
  if (context.mode !== "production" || !context.storeId) return [];
  let query = createClient()
    .from("orders")
    .select("id, total, status, fulfillment_method, fulfillment_status, payment_status, created_at")
    .eq("store_id", context.storeId);
  if (context.role === "customer") {
    if (!context.userId) return [];
    query = query.eq("customer_id", context.userId);
  }
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data || []).map((order) => ({
    rawId: order.id,
    id: `#${String(order.id).slice(0, 8).toUpperCase()}`,
    customer: "Customer",
    total: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(order.total || 0)),
    status: String(order.status || "Open"),
    time: new Date(order.created_at).toLocaleString(),
    fulfillmentMethod: order.fulfillment_method || "pickup",
    fulfillmentStatus: order.fulfillment_status || "pending",
    paymentStatus: order.payment_status || "pending",
  }));
}

export async function loadCustomerOrderHistory(context: TenantContext): Promise<CustomerOrderRecord[]> {
  if (context.mode !== "production" || context.role !== "customer" || !context.storeId || !context.userId) return [];
  const { data, error } = await createClient()
    .from("orders")
    .select("id, receipt_no, status, fulfillment_method, total, payment_status, policy_snapshot, created_at, order_items(id, qty, unit_price, product_variants(id, products(name)), vendors(name)), payments(method, verification_status), order_fulfillment_events(id, event_type, note, created_at)")
    .eq("store_id", context.storeId)
    .eq("customer_id", context.userId)
    .order("created_at", { ascending: false })
    .limit(25);
  if (error) throw error;
  return (data || []).map((order) => {
    const payments = (order.payments || []) as Array<{ method?: string; verification_status?: string }>;
    const items = (order.order_items || []) as Array<{
      id: string;
      qty: number;
      unit_price: number | string;
      product_variants?: { id?: string; products?: { name?: string } | null } | null;
      vendors?: { name?: string } | null;
    }>;
    return {
      id: order.id,
      receiptNo: order.receipt_no || order.id,
      status: order.status || "open",
      fulfillmentMethod: order.fulfillment_method || "pickup",
      total: Number(order.total || 0),
      paymentStatus: order.payment_status || "pending",
      paymentMethod: payments[0]?.method || "unknown",
      verificationStatus: payments[0]?.verification_status || "not_required",
      policySnapshot: (order.policy_snapshot || {}) as Record<string, unknown>,
      placedAt: order.created_at,
      fulfillmentEvents: ((order.order_fulfillment_events || []) as Array<{ id: string; event_type: string; note?: string | null; created_at: string }>).map((event) => ({
        id: event.id,
        eventType: event.event_type,
        note: event.note || "",
        createdAt: event.created_at,
      })),
      items: items.map((item) => ({
        orderItemId: item.id,
        variantId: item.product_variants?.id,
        name: item.product_variants?.products?.name || "Purchased item",
        vendor: item.vendors?.name || "Blossom Royall seller",
        price: Number(item.unit_price || 0),
        fulfillment: order.fulfillment_method || "pickup",
        quantity: Number(item.qty || 1),
      })),
    };
  });
}

export async function advanceTenantOrderFulfillment(context: TenantContext, orderId: string, eventType: "preparing" | "ready_for_pickup" | "out_for_delivery" | "picked_up" | "delivered", note?: string) {
  if (context.mode !== "production" || !["owner", "manager", "staff"].includes(context.role || "")) throw new Error("Authorized staff access is required.");
  const { data, error } = await createClient().rpc("advance_order_fulfillment", {
    p_order_id: orderId,
    p_event_type: eventType,
    p_note: note?.trim() || null,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("The fulfillment update did not return an order.");
  return {
    orderId: row.order_id as string,
    orderStatus: row.order_status as string,
    fulfillmentStatus: row.fulfillment_status as string,
    pickupCode: (row.pickup_code as string | null) || null,
  };
}

export async function loadCustomerPickupCode(context: TenantContext, orderId: string) {
  if (context.mode !== "production" || context.role !== "customer") return null;
  const { data, error } = await createClient().rpc("get_customer_pickup_code", { p_order_id: orderId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.pickup_code) return null;
  return { code: row.pickup_code as string, expiresAt: row.expires_at as string };
}

export type ReturnRequestRecord = {
  id: string;
  orderItemId: string;
  reason: string;
  requestedResolution: string;
  status: string;
  customerNote: string;
  staffNote: string;
  createdAt: string;
};

const mapReturnRequest = (row: {
  id: string; order_item_id: string; reason: string; requested_resolution: string; status: string;
  customer_note?: string | null; staff_note?: string | null; created_at: string;
}): ReturnRequestRecord => ({
  id: row.id,
  orderItemId: row.order_item_id,
  reason: row.reason,
  requestedResolution: row.requested_resolution,
  status: row.status,
  customerNote: row.customer_note || "",
  staffNote: row.staff_note || "",
  createdAt: row.created_at,
});

export async function requestOrderItemReturn(context: TenantContext, input: {
  orderItemId: string;
  reason: "fit" | "color" | "damaged" | "not_as_described" | "changed_mind" | "other";
  requestedResolution: "refund" | "exchange" | "store_credit";
  customerNote?: string;
}): Promise<ReturnRequestRecord> {
  if (context.mode !== "production" || context.role !== "customer" || !context.userId) throw new Error("A signed in customer account is required.");
  const { data, error } = await createClient().rpc("request_order_item_return", {
    p_order_item_id: input.orderItemId,
    p_reason: input.reason,
    p_requested_resolution: input.requestedResolution,
    p_customer_note: input.customerNote?.trim() || null,
  });
  if (error) throw error;
  return mapReturnRequest(data as Parameters<typeof mapReturnRequest>[0]);
}

export async function loadCustomerReturnRequests(context: TenantContext): Promise<ReturnRequestRecord[]> {
  if (context.mode !== "production" || context.role !== "customer" || !context.userId) return [];
  const { data, error } = await createClient().from("return_requests")
    .select("id, order_item_id, reason, requested_resolution, status, customer_note, staff_note, created_at")
    .eq("customer_id", context.userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => mapReturnRequest(row));
}

export async function cancelCustomerReturnRequest(context: TenantContext, requestId: string) {
  if (context.mode !== "production" || context.role !== "customer") throw new Error("A signed in customer account is required.");
  const { data, error } = await createClient().rpc("cancel_return_request", { p_return_request_id: requestId });
  if (error) throw error;
  return mapReturnRequest(data as Parameters<typeof mapReturnRequest>[0]);
}

export async function removeCustomerReturnRequest(context: TenantContext, requestId: string) {
  if (context.mode !== "production" || context.role !== "customer") throw new Error("A signed in customer account is required.");
  const { error } = await createClient().rpc("remove_canceled_return_request", { p_return_request_id: requestId });
  if (error) throw error;
  return true;
}

export async function loadTenantReturnRequests(context: TenantContext): Promise<ReturnRequestRecord[]> {
  if (context.mode !== "production" || !context.storeId || !["owner", "manager", "staff"].includes(context.role || "")) return [];
  const { data, error } = await createClient().from("return_requests")
    .select("id, order_item_id, reason, requested_resolution, status, customer_note, staff_note, created_at")
    .eq("store_id", context.storeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => mapReturnRequest(row));
}

export async function reviewTenantReturnRequest(context: TenantContext, requestId: string, status: "reviewing" | "approved" | "rejected" | "received" | "completed", staffNote?: string) {
  if (context.mode !== "production" || !["owner", "manager", "staff"].includes(context.role || "")) throw new Error("Authorized staff access is required.");
  const { data, error } = await createClient().rpc("review_return_request", {
    p_return_request_id: requestId,
    p_status: status,
    p_staff_note: staffNote?.trim() || null,
  });
  if (error) throw error;
  return mapReturnRequest(data as Parameters<typeof mapReturnRequest>[0]);
}

export type TenantProductSummary = {
  id: string;
  name: string;
  vendorName: string;
  category: string;
  status: string;
  variants: Array<{ id: string; sku: string; size: string | null; color: string | null; price: number; quantity: number }>;
};

export async function loadTenantProducts(context: TenantContext): Promise<TenantProductSummary[]> {
  if (context.mode !== "production" || !context.storeId) return [];
  let query = createClient()
    .from("products")
    .select("id, name, category, status, vendors(name), product_variants(id, sku, size, color, price, qty_on_hand)")
    .eq("store_id", context.storeId);
  if (context.role === "customer") query = query.eq("status", "published");
  const { data, error } = await query
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((product) => ({
    id: product.id,
    name: product.name,
    vendorName: (product.vendors as { name?: string } | null)?.name || "Tenant vendor",
    category: product.category || "Uncategorized",
    status: product.status || "draft",
    variants: (product.product_variants || []).map((variant: { id: string; sku: string; size: string | null; color: string | null; price: number | string; qty_on_hand: number }) => ({
      id: variant.id,
      sku: variant.sku,
      size: variant.size,
      color: variant.color,
      price: Number(variant.price),
      quantity: Number(variant.qty_on_hand),
    })),
  }));
}

export async function saveTenantVendor(context: TenantContext, vendor: { id: string; name: string; status: string }) {
  if (context.mode !== "production" || !context.storeId || !canManageTenant(context.role)) throw new Error("Owner or manager production access is required.");
  const { error } = await createClient().from("vendors").upsert({ id: vendor.id, store_id: context.storeId, name: vendor.name, status: vendor.status }, { onConflict: "id" });
  if (error) throw error;
}

export async function removeTenantVendor(context: TenantContext, vendorId: string) {
  if (context.mode !== "production" || !context.storeId || !canManageTenant(context.role)) throw new Error("Owner or manager production access is required.");
  const { error } = await createClient().from("vendors").delete().eq("id", vendorId).eq("store_id", context.storeId);
  if (error) throw error;
}

export type TenantVendorStorefront = {
  id: string;
  vendorId: string;
  slug: string;
  publicName: string;
  ownerDisplayName: string;
  tagline: string;
  story: string;
  categories: string[];
  facebookUrl: string;
  websiteUrl: string;
  contactEmail: string;
  contactPhone: string;
  primaryColor: string;
  secondaryColor: string;
  fulfillmentMethods: string[];
  mediaRightsStatus: "pending" | "confirmed" | "restricted";
  status: "draft" | "review" | "published" | "suspended";
};

type StorefrontRow = {
  id: string; vendor_id: string; slug: string; public_name: string; owner_display_name: string | null;
  tagline: string | null; story: string | null; categories: string[] | null; facebook_url: string | null;
  website_url: string | null; contact_email: string | null; contact_phone: string | null; primary_color: string;
  secondary_color: string; fulfillment_methods: string[] | null; media_rights_status: TenantVendorStorefront["mediaRightsStatus"];
  status: TenantVendorStorefront["status"];
};

const mapStorefront = (row: StorefrontRow): TenantVendorStorefront => ({
  id: row.id, vendorId: row.vendor_id, slug: row.slug, publicName: row.public_name,
  ownerDisplayName: row.owner_display_name || "", tagline: row.tagline || "", story: row.story || "",
  categories: row.categories || [], facebookUrl: row.facebook_url || "", websiteUrl: row.website_url || "",
  contactEmail: row.contact_email || "", contactPhone: row.contact_phone || "", primaryColor: row.primary_color,
  secondaryColor: row.secondary_color, fulfillmentMethods: row.fulfillment_methods || [],
  mediaRightsStatus: row.media_rights_status, status: row.status,
});

export async function loadTenantVendorStorefronts(context: TenantContext): Promise<TenantVendorStorefront[]> {
  if (context.mode !== "production" || !context.storeId) return [];
  const { data, error } = await createClient().from("vendor_storefronts").select("id, vendor_id, slug, public_name, owner_display_name, tagline, story, categories, facebook_url, website_url, contact_email, contact_phone, primary_color, secondary_color, fulfillment_methods, media_rights_status, status").eq("store_id", context.storeId).order("updated_at", { ascending: false });
  if (error) throw error;
  return ((data || []) as StorefrontRow[]).map(mapStorefront);
}

export async function saveTenantVendorStorefront(context: TenantContext, profile: TenantVendorStorefront) {
  if (context.mode !== "production" || !context.storeId || !context.userId) throw new Error("Authenticated tenant access is required.");
  const publishedAt = profile.status === "published" ? new Date().toISOString() : null;
  const { error } = await createClient().from("vendor_storefronts").upsert({
    id: profile.id, store_id: context.storeId, vendor_id: profile.vendorId, slug: profile.slug,
    public_name: profile.publicName, owner_display_name: profile.ownerDisplayName || null, tagline: profile.tagline || null,
    story: profile.story || null, categories: profile.categories, facebook_url: profile.facebookUrl || null,
    website_url: profile.websiteUrl || null, contact_email: profile.contactEmail || null, contact_phone: profile.contactPhone || null,
    primary_color: profile.primaryColor, secondary_color: profile.secondaryColor,
    fulfillment_methods: profile.fulfillmentMethods, media_rights_status: profile.mediaRightsStatus,
    status: profile.status, published_at: publishedAt, created_by: context.userId, updated_by: context.userId,
    updated_at: new Date().toISOString(),
  }, { onConflict: "vendor_id" });
  if (error) throw error;
}

export async function removeTenantVendorStorefront(context: TenantContext, storefrontId: string) {
  if (context.mode !== "production" || !context.storeId) throw new Error("Authenticated tenant access is required.");
  const { error } = await createClient().from("vendor_storefronts").delete().eq("id", storefrontId).eq("store_id", context.storeId);
  if (error) throw error;
}

export type TenantCommerceSettingsInput = {
  currency: string;
  taxRatePercent: number;
  taxInclusive: boolean;
  deliveryTaxable: boolean;
  pickupEnabled: boolean;
  localDeliveryEnabled: boolean;
  localFee: number;
  freeLocalMinimum: number;
  shippingEnabled: boolean;
  shippingFee: number;
};

export async function saveTenantCommerceSettings(context: TenantContext, settings: TenantCommerceSettingsInput) {
  if (context.mode !== "production" || !context.storeId || !context.userId || !canManageTenant(context.role)) throw new Error("Owner or manager production access is required.");
  const { error } = await createClient().from("store_commerce_settings").upsert({
    store_id: context.storeId, currency: settings.currency, tax_rate_percent: settings.taxRatePercent,
    tax_inclusive: settings.taxInclusive, delivery_taxable: settings.deliveryTaxable,
    pickup_enabled: settings.pickupEnabled, local_delivery_enabled: settings.localDeliveryEnabled,
    local_delivery_fee: settings.localFee, free_local_minimum: settings.freeLocalMinimum,
    shipping_enabled: settings.shippingEnabled, shipping_fee: settings.shippingFee,
    created_by: context.userId, updated_by: context.userId, updated_at: new Date().toISOString(),
  }, { onConflict: "store_id" });
  if (error) throw error;
}

export type TenantCheckoutRequest = {
  channel: "onsite" | "online";
  fulfillmentMethod: "pickup" | "delivery" | "shipping";
  tenderMethod: "cash" | "card" | "bank_transfer" | "zelle" | "venmo" | "paypal" | "cash_app" | "mobile_money" | "check";
  items: Array<{ variantId: string; quantity: number }>;
  cashReceived?: number;
  providerReference?: string;
  proof?: File;
  policySnapshot?: Record<string, unknown>;
};

export type TenantCheckoutResult = { orderId: string; receiptNo: string; subtotal: number; deliveryFee: number; tax: number; total: number; paymentStatus: string };

export async function placeTenantOrder(context: TenantContext, request: TenantCheckoutRequest): Promise<TenantCheckoutResult> {
  if (context.mode !== "production" || !context.storeId || !context.userId) throw new Error("Authenticated tenant access is required.");
  const client = createClient();
  let proofPath: string | null = null;
  if (request.proof) {
    const safeName = request.proof.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
    proofPath = `${context.storeId}/pending/${context.userId}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await client.storage.from("payment-evidence").upload(proofPath, request.proof, { contentType: request.proof.type, upsert: false });
    if (uploadError) throw uploadError;
  }
  const { data, error } = await client.rpc("place_tenant_order", {
    p_store_id: context.storeId,
    p_channel: request.channel,
    p_fulfillment_method: request.fulfillmentMethod,
    p_tender_method: request.tenderMethod,
    p_items: request.items.map((item) => ({ variant_id: item.variantId, quantity: item.quantity })),
    p_cash_received: request.cashReceived ?? null,
    p_provider_ref: request.providerReference?.trim() || null,
    p_proof_object_path: proofPath,
    p_proof_file_name: request.proof?.name || null,
    p_proof_mime_type: request.proof?.type || null,
    p_proof_size_bytes: request.proof?.size || null,
    p_policy_snapshot: request.policySnapshot || {},
  });
  if (error) {
    if (proofPath) await client.storage.from("payment-evidence").remove([proofPath]);
    throw error;
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("The order did not return a receipt.");
  return { orderId: row.order_id, receiptNo: row.receipt_no, subtotal: Number(row.subtotal), deliveryFee: Number(row.delivery_fee), tax: Number(row.tax), total: Number(row.total), paymentStatus: row.payment_status };
}

export type AccountFitProfile = {
  unit: "imperial" | "metric";
  measurements: Record<"bust" | "waist" | "hips" | "inseam" | "shoulder", number>;
  recommendedSize: string;
  consent: boolean;
  shareWithVendors: boolean;
  updatedAt: string;
};

type MeasurementProfileRow = {
  units: string | null;
  measurements: AccountFitProfile["measurements"] & {
    recommendedSize?: string;
    consent?: boolean;
    shareWithVendors?: boolean;
    updatedAt?: string;
  };
  created_at: string;
};

export async function loadAccountFitProfile(context: TenantContext): Promise<AccountFitProfile | null> {
  if (context.mode !== "production" || !context.userId) return null;
  const { data, error } = await createClient()
    .from("measurement_profiles")
    .select("units, measurements, created_at")
    .eq("customer_id", context.userId)
    .eq("label", "My Fit")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as MeasurementProfileRow;
  return {
    unit: row.units === "cm" ? "metric" : "imperial",
    measurements: row.measurements,
    recommendedSize: row.measurements.recommendedSize || "Custom fit review",
    consent: row.measurements.consent === true,
    shareWithVendors: row.measurements.shareWithVendors === true,
    updatedAt: row.measurements.updatedAt || row.created_at,
  };
}

export async function saveAccountFitProfile(context: TenantContext, profile: AccountFitProfile) {
  if (context.mode !== "production" || !context.userId) return false;
  const { error } = await createClient().from("measurement_profiles").insert({
    customer_id: context.userId,
    label: "My Fit",
    units: profile.unit === "metric" ? "cm" : "in",
    measurements: {
      ...profile.measurements,
      recommendedSize: profile.recommendedSize,
      consent: profile.consent,
      shareWithVendors: profile.shareWithVendors,
      updatedAt: profile.updatedAt,
    },
  });
  if (error) throw error;
  return true;
}

export async function removeAccountFitProfiles(context: TenantContext) {
  if (context.mode !== "production" || !context.userId) return false;
  const { error } = await createClient()
    .from("measurement_profiles")
    .delete()
    .eq("customer_id", context.userId)
    .eq("label", "My Fit");
  if (error) throw error;
  return true;
}
