import { createClient } from "./client";

export type TenantRole = "owner" | "manager" | "staff" | "vendor" | "customer";

export type TenantContext = {
  mode: "production" | "preview";
  storeId: string | null;
  userId: string | null;
  role: TenantRole | null;
  displayName?: string;
  reason: string;
};

const previewContext = (reason: string): TenantContext => ({
  mode: "preview",
  storeId: null,
  userId: null,
  role: null,
  displayName: "Guest",
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
      const customerName = String(user.user_metadata?.full_name || user.email?.split("@")[0] || "Customer");
      return {
        mode: "production",
        storeId: publicStore.store_id,
        userId: user.id,
        role: "customer",
        displayName: customerName,
        reason: "Published customer storefront records are active.",
      };
    }
    const { data: profile } = await client.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
    return {
      mode: "production",
      storeId: membership.store_id,
      userId: user.id,
      role: membership.role as TenantRole,
      displayName: String(profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Store member"),
      reason: "Authenticated tenant records are active.",
    };
  } catch {
    return previewContext("Production configuration is unavailable. Changes remain in this device preview.");
  }
}

export function canManageTenant(role: TenantRole | null) {
  return role === "owner" || role === "manager";
}

export async function signOutTenant() {
  const { error } = await createClient().auth.signOut();
  if (error) throw error;
}

export type VendorRentRecord = {
  paymentId: string | null;
  leaseId: string;
  vendorName: string;
  monthlyRent: number;
  dueDay: number;
  dueOn: string;
  status: "due" | "late" | "pending" | "paid" | "rejected" | "failed";
  amount: number;
  method: string;
  providerReference: string;
  receiptNumber: string;
  submittedAt: string | null;
  paidAt: string | null;
};

export async function loadVendorRentWorkspace(context: TenantContext): Promise<VendorRentRecord[]> {
  if (context.mode !== "production" || !context.storeId || !["owner", "manager", "vendor"].includes(context.role || "")) return [];
  const { data, error } = await createClient().from("leases")
    .select("id, monthly_rent, rent_due_day, start_date, end_date, status, vendors!inner(name, store_id), rent_payments(id, amount, method, paid_at, due_on, status, provider_reference, receipt_no, submitted_at)")
    .eq("vendors.store_id", context.storeId)
    .eq("status", "signed");
  if (error) throw error;
  const today = new Date();
  return (data || []).map((lease) => {
    const dueDay = Number(lease.rent_due_day || 1);
    const due = new Date(today.getFullYear(), today.getMonth(), dueDay);
    const dueOn = due.toISOString().slice(0, 10);
    const payments = (lease.rent_payments || []) as Array<Record<string, string | number | null>>;
    const payment = payments.filter((item) => item.due_on === dueOn).sort((a, b) => String(b.submitted_at || "").localeCompare(String(a.submitted_at || "")))[0];
    const baseStatus = today.getTime() > due.getTime() ? "late" : "due";
    return {
      paymentId: payment?.id ? String(payment.id) : null,
      leaseId: lease.id,
      vendorName: (lease.vendors as unknown as { name?: string })?.name || "Vendor",
      monthlyRent: Number(lease.monthly_rent),
      dueDay,
      dueOn,
      status: (payment?.status || baseStatus) as VendorRentRecord["status"],
      amount: Number(payment?.amount || lease.monthly_rent),
      method: String(payment?.method || ""),
      providerReference: String(payment?.provider_reference || ""),
      receiptNumber: String(payment?.receipt_no || ""),
      submittedAt: payment?.submitted_at ? String(payment.submitted_at) : null,
      paidAt: payment?.paid_at ? String(payment.paid_at) : null,
    };
  });
}

export async function submitVendorRentPayment(context: TenantContext, input: { leaseId: string; dueOn: string; amount: number; method: string; providerReference: string }) {
  if (context.mode !== "production" || context.role !== "vendor") throw new Error("Signed in vendor access is required.");
  const { error } = await createClient().rpc("submit_vendor_rent_payment", {
    p_lease_id: input.leaseId, p_due_on: input.dueOn, p_amount: input.amount,
    p_method: input.method, p_provider_reference: input.providerReference,
  });
  if (error) throw error;
}

export async function reviewVendorRentPayment(context: TenantContext, paymentId: string, decision: "paid" | "rejected", note: string) {
  if (context.mode !== "production" || !["owner", "manager"].includes(context.role || "")) throw new Error("Owner or manager access is required.");
  const { error } = await createClient().rpc("review_vendor_rent_payment", { p_payment_id: paymentId, p_decision: decision, p_review_note: note.trim() || null });
  if (error) throw error;
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
  if (context.role === "vendor") {
    const { data, error } = await createClient().rpc("get_vendor_order_summaries", { p_store_id: context.storeId });
    if (!error) return (data || []).map((order: { id: string; attributed_total: number | string; status: string; fulfillment_method: string; fulfillment_status: string; payment_status: string; created_at: string }) => ({
      rawId: order.id,
      id: `#${String(order.id).slice(0, 8).toUpperCase()}`,
      customer: "Private customer",
      total: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(order.attributed_total || 0)),
      status: String(order.status || "Open"),
      time: new Date(order.created_at).toLocaleString(),
      fulfillmentMethod: order.fulfillment_method || "pickup",
      fulfillmentStatus: order.fulfillment_status || "pending",
      paymentStatus: order.payment_status || "pending",
    }));
  }
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

export type VendorLedgerEntry = {
  id: string;
  orderId: string | null;
  type: "sale_credit" | "refund_debit" | "fee_debit" | "adjustment_credit" | "adjustment_debit" | "payout_debit";
  amount: number;
  currency: string;
  memo: string;
  createdAt: string;
};

export async function loadVendorLedger(context: TenantContext): Promise<VendorLedgerEntry[]> {
  if (context.mode !== "production" || context.role !== "vendor" || !context.storeId) return [];
  const { data, error } = await createClient()
    .from("vendor_ledger_entries")
    .select("id, order_id, entry_type, amount, currency, memo, created_at")
    .eq("store_id", context.storeId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data || []).map((entry) => ({ id: entry.id, orderId: entry.order_id, type: entry.entry_type, amount: Number(entry.amount), currency: entry.currency, memo: entry.memo || "", createdAt: entry.created_at }));
}

export type VendorOperatingSnapshot = {
  vendorId: string;
  vendorName: string;
  productCount: number;
  stockUnits: number;
  lowStockVariants: number;
  credits: number;
  deductions: number;
  paid: number;
  recordedBalance: number;
  rentStatus: string;
  rentDueOn: string | null;
  refreshedAt: string;
};

export async function loadVendorOperatingSnapshots(context: TenantContext): Promise<VendorOperatingSnapshot[]> {
  if (context.mode !== "production" || !context.storeId || !["owner", "manager", "vendor"].includes(context.role || "")) return [];
  const client = createClient();
  const [vendorResult, productResult, ledgerResult, leaseResult] = await Promise.all([
    client.from("vendors").select("id, name").eq("store_id", context.storeId),
    client.from("products").select("id, vendor_id, product_variants(id, qty_on_hand)").eq("store_id", context.storeId),
    client.from("vendor_ledger_entries").select("vendor_id, entry_type, amount").eq("store_id", context.storeId),
    client.from("leases").select("vendor_id, rent_due_day, rent_payments(due_on, status, submitted_at)").order("start_date", { ascending: false }),
  ]);
  const firstError = [vendorResult.error, productResult.error, ledgerResult.error, leaseResult.error].find(Boolean);
  if (firstError) throw firstError;
  const refreshedAt = new Date().toISOString();
  return (vendorResult.data || []).map((vendor) => {
    const vendorProducts = (productResult.data || []).filter((product) => product.vendor_id === vendor.id);
    const variants = vendorProducts.flatMap((product) => product.product_variants || []);
    const entries = (ledgerResult.data || []).filter((entry) => entry.vendor_id === vendor.id);
    const credits = entries.filter((entry) => ["sale_credit", "adjustment_credit"].includes(entry.entry_type)).reduce((sum, entry) => sum + Number(entry.amount), 0);
    const deductions = entries.filter((entry) => ["refund_debit", "fee_debit", "adjustment_debit"].includes(entry.entry_type)).reduce((sum, entry) => sum + Number(entry.amount), 0);
    const paid = entries.filter((entry) => entry.entry_type === "payout_debit").reduce((sum, entry) => sum + Number(entry.amount), 0);
    const lease = (leaseResult.data || []).find((item) => item.vendor_id === vendor.id);
    const latestRent = [...(lease?.rent_payments || [])].sort((a, b) => String(b.submitted_at || b.due_on || "").localeCompare(String(a.submitted_at || a.due_on || "")))[0];
    return {
      vendorId: vendor.id,
      vendorName: vendor.name,
      productCount: vendorProducts.length,
      stockUnits: variants.reduce((sum, variant) => sum + Number(variant.qty_on_hand || 0), 0),
      lowStockVariants: variants.filter((variant) => Number(variant.qty_on_hand || 0) <= 3).length,
      credits,
      deductions,
      paid,
      recordedBalance: credits - deductions - paid,
      rentStatus: latestRent?.status || "due",
      rentDueOn: latestRent?.due_on || null,
      refreshedAt,
    };
  });
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

export type PendingPaymentReview = {
  id: string;
  orderId: string;
  receiptNo: string;
  method: string;
  amount: number;
  providerReference: string;
  proofFileName: string;
  proofObjectPath: string;
  createdAt: string;
};

export async function loadTenantPendingPayments(context: TenantContext): Promise<PendingPaymentReview[]> {
  if (context.mode !== "production" || !context.storeId || !["owner", "manager", "staff"].includes(context.role || "")) return [];
  const { data, error } = await createClient().from("payments")
    .select("id, order_id, method, amount, provider_ref, proof_file_name, proof_object_path, created_at, orders!inner(store_id, receipt_no)")
    .eq("verification_status", "pending")
    .eq("orders.store_id", context.storeId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map((payment) => ({
    id: payment.id,
    orderId: payment.order_id,
    receiptNo: (payment.orders as { receipt_no?: string } | null)?.receipt_no || payment.order_id,
    method: payment.method,
    amount: Number(payment.amount || 0),
    providerReference: payment.provider_ref || "",
    proofFileName: payment.proof_file_name || "",
    proofObjectPath: payment.proof_object_path || "",
    createdAt: payment.created_at,
  }));
}

export async function createPaymentEvidenceUrl(context: TenantContext, objectPath: string) {
  if (context.mode !== "production" || !context.storeId || !["owner", "manager", "staff"].includes(context.role || "")) throw new Error("Authorized staff access is required.");
  if (!objectPath.startsWith(`${context.storeId}/pending/`)) throw new Error("The evidence path is outside this tenant.");
  const { data, error } = await createClient().storage.from("payment-evidence").createSignedUrl(objectPath, 120);
  if (error) throw error;
  return data.signedUrl;
}

export async function reviewTenantPendingPayment(context: TenantContext, paymentId: string, decision: "verified" | "rejected", note?: string) {
  if (context.mode !== "production" || !["owner", "manager", "staff"].includes(context.role || "")) throw new Error("Authorized staff access is required.");
  const { data, error } = await createClient().rpc("review_pending_payment", {
    p_payment_id: paymentId,
    p_decision: decision,
    p_verification_note: note?.trim() || null,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("The payment review did not return a result.");
  return {
    paymentId: row.payment_id as string,
    orderId: row.order_id as string,
    paymentStatus: row.payment_status as string,
    orderStatus: row.order_status as string,
  };
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

export type CashRegisterRecord = { id: string; name: string; location: string; active: boolean };
export type CashDrawerSessionRecord = {
  id: string;
  registerId: string;
  registerName: string;
  status: "open" | "closed";
  openingFloat: number;
  expectedCash: number | null;
  countedCash: number | null;
  variance: number | null;
  openedAt: string;
  closedAt: string | null;
};

function requireCashTeamContext(context: TenantContext) {
  if (context.mode !== "production" || !context.storeId || !context.userId || !["owner", "manager", "staff"].includes(context.role || "")) {
    throw new Error("Signed in cash team access is required.");
  }
}

export async function loadCashDrawerWorkspace(context: TenantContext): Promise<{ registers: CashRegisterRecord[]; sessions: CashDrawerSessionRecord[] }> {
  requireCashTeamContext(context);
  const client = createClient();
  const [registerResult, sessionResult] = await Promise.all([
    client.from("cash_registers").select("id, name, location, active").eq("store_id", context.storeId!).order("name"),
    client.from("cash_drawer_sessions").select("id, register_id, status, opening_float, expected_cash, counted_cash, variance, opened_at, closed_at, cash_registers(name)").eq("store_id", context.storeId!).order("opened_at", { ascending: false }).limit(30),
  ]);
  if (registerResult.error) throw registerResult.error;
  if (sessionResult.error) throw sessionResult.error;
  return {
    registers: (registerResult.data || []).map((row) => ({ id: row.id, name: row.name, location: row.location, active: row.active })),
    sessions: (sessionResult.data || []).map((row) => ({
      id: row.id, registerId: row.register_id,
      registerName: (row.cash_registers as unknown as { name?: string } | null)?.name || "Register",
      status: row.status as "open" | "closed", openingFloat: Number(row.opening_float),
      expectedCash: row.expected_cash == null ? null : Number(row.expected_cash),
      countedCash: row.counted_cash == null ? null : Number(row.counted_cash),
      variance: row.variance == null ? null : Number(row.variance), openedAt: row.opened_at, closedAt: row.closed_at,
    })),
  };
}

export async function saveCashRegister(context: TenantContext, input: { id?: string; name: string; location: string; active?: boolean }) {
  requireCashTeamContext(context);
  if (!["owner", "manager"].includes(context.role || "")) throw new Error("Owner or manager access is required to manage registers.");
  const row = { store_id: context.storeId, name: input.name.trim(), location: input.location.trim(), active: input.active ?? true, updated_by: context.userId };
  const query = input.id
    ? createClient().from("cash_registers").update(row).eq("id", input.id).eq("store_id", context.storeId!)
    : createClient().from("cash_registers").insert({ ...row, created_by: context.userId });
  const { error } = await query;
  if (error) throw error;
}

export async function removeCashRegister(context: TenantContext, registerId: string) {
  requireCashTeamContext(context);
  if (context.role !== "owner") throw new Error("Owner access is required to remove a register.");
  const { error } = await createClient().from("cash_registers").delete().eq("id", registerId).eq("store_id", context.storeId!);
  if (error) throw error;
}

export async function openCashDrawer(context: TenantContext, registerId: string, openingFloat: number, note: string) {
  requireCashTeamContext(context);
  const { error } = await createClient().rpc("open_cash_drawer", { p_store_id: context.storeId, p_register_id: registerId, p_opening_float: openingFloat, p_note: note });
  if (error) throw error;
}

export async function recordCashDrawerAdjustment(context: TenantContext, sessionId: string, adjustmentType: "paid_in" | "paid_out", amount: number, reason: string) {
  requireCashTeamContext(context);
  const { error } = await createClient().rpc("record_cash_drawer_adjustment", { p_session_id: sessionId, p_adjustment_type: adjustmentType, p_amount: amount, p_reason: reason });
  if (error) throw error;
}

export async function closeCashDrawer(context: TenantContext, sessionId: string, countedCash: number, note: string) {
  requireCashTeamContext(context);
  const { error } = await createClient().rpc("close_cash_drawer", { p_session_id: sessionId, p_counted_cash: countedCash, p_note: note });
  if (error) throw error;
}

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
  measurements: Record<"bust" | "waist" | "hips" | "inseam" | "shoulder" | "finger" | "wrist" | "neck", number>;
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
