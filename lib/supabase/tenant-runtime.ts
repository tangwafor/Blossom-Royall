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
