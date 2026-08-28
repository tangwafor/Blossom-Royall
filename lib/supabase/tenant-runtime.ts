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
    if (membershipError || !membership?.store_id) return previewContext("This account does not yet have a Blossom Royall store membership.");
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
  id: string;
  customer: string;
  total: string;
  status: string;
  time: string;
};

export async function loadTenantOrders(context: TenantContext): Promise<TenantOrderSummary[]> {
  if (context.mode !== "production" || !context.storeId) return [];
  const { data, error } = await createClient()
    .from("orders")
    .select("id, total, status, created_at")
    .eq("store_id", context.storeId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data || []).map((order) => ({
    id: `#${String(order.id).slice(0, 8).toUpperCase()}`,
    customer: "Customer",
    total: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(order.total || 0)),
    status: String(order.status || "Open"),
    time: new Date(order.created_at).toLocaleString(),
  }));
}

export type TenantProductSummary = {
  id: string;
  name: string;
  category: string;
  status: string;
  variants: Array<{ sku: string; size: string | null; color: string | null; price: number; quantity: number }>;
};

export async function loadTenantProducts(context: TenantContext): Promise<TenantProductSummary[]> {
  if (context.mode !== "production" || !context.storeId) return [];
  const { data, error } = await createClient()
    .from("products")
    .select("id, name, category, status, product_variants(sku, size, color, price, qty_on_hand)")
    .eq("store_id", context.storeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category || "Uncategorized",
    status: product.status || "draft",
    variants: (product.product_variants || []).map((variant: { sku: string; size: string | null; color: string | null; price: number | string; qty_on_hand: number }) => ({
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
