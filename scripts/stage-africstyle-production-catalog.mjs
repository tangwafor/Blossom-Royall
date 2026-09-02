import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";
import { createClient } from "@supabase/supabase-js";

const approved = process.env.AFRICSTYLE_PRODUCTION_APPROVED === "true";
const readEnv = (file) => existsSync(file)
  ? Object.fromEntries(readFileSync(file, "utf8").split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#") && line.includes("=")).map((line) => [line.slice(0, line.indexOf("=")).trim(), line.slice(line.indexOf("=") + 1).trim()]))
  : {};
const local = readEnv(join(process.cwd(), ".env.local"));
const secrets = readEnv(join(os.homedir(), ".claude", "secrets.env"));
const url = local.NEXT_PUBLIC_SUPABASE_URL;
const accessToken = secrets.SUPABASE_ACCESS_TOKEN;
if (!url || !accessToken) throw new Error("Supabase URL and approved management token are required.");

const payload = JSON.parse(readFileSync(join(process.cwd(), "public", "vendor-imports", "africstyle-fashion.json"), "utf8"));
if (payload.provenance?.confirmation?.status !== "verbally_confirmed") throw new Error("Africstyle catalog staging has no recorded owner confirmation.");
if (!Array.isArray(payload.products) || !payload.products.length) throw new Error("Africstyle catalog staging contains no products.");

const projectRef = new URL(url).hostname.split(".")[0];
const keyResponse = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/api-keys?reveal=true`, { headers: { Authorization: `Bearer ${accessToken}` } });
if (!keyResponse.ok) throw new Error(`Unable to retrieve the production server key: ${keyResponse.status}`);
const keys = await keyResponse.json();
const serverKey = keys.find((key) => key.type === "secret" && key.api_key)?.api_key || keys.find((key) => key.name === "service_role" && key.api_key)?.api_key;
if (!serverKey) throw new Error("No active production server key is available.");
const admin = createClient(url, serverKey, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: stores, error: storeError } = await admin.from("stores").select("id, name").ilike("name", "%Blossom Royall%");
if (storeError) throw storeError;
if (!stores || stores.length !== 1) throw new Error(`Expected one Blossom Royall store, received ${stores?.length || 0}.`);
const store = stores[0];
const { data: vendorRows, error: vendorError } = await admin.from("vendors").select("id, name").eq("store_id", store.id).ilike("name", "%Africstyle%");
if (vendorError) throw vendorError;
if (!vendorRows || vendorRows.length !== 1) throw new Error(`Expected one Africstyle vendor, received ${vendorRows?.length || 0}.`);
const vendor = vendorRows[0];

const stableUuid = (value) => {
  const hex = createHash("sha256").update(value).digest("hex").slice(0, 32).split("");
  hex[12] = "5";
  hex[16] = ((Number.parseInt(hex[16], 16) & 3) | 8).toString(16);
  const joined = hex.join("");
  return `${joined.slice(0, 8)}-${joined.slice(8, 12)}-${joined.slice(12, 16)}-${joined.slice(16, 20)}-${joined.slice(20)}`;
};
const productRows = payload.products.map((product) => ({
  id: stableUuid(`blossom-royall:africstyle:product:${product.sourceId}`),
  store_id: store.id,
  vendor_id: vendor.id,
  name: product.name,
  description: product.description || `Staged from ${product.sourceUrl}. Inventory and fulfillment require Duplex confirmation.`,
  category: product.categories?.[0] || "Uncategorized",
  status: "draft",
}));
const variantRows = payload.products.map((product, index) => ({
  id: stableUuid(`blossom-royall:africstyle:variant:${product.sourceId}`),
  product_id: productRows[index].id,
  sku: String(product.sku || `AFR-${product.sourceId}`).slice(0, 120),
  size: "Awaiting confirmation",
  color: null,
  price: Number(product.price || 0),
  qty_on_hand: 0,
}));

const { data: existing, error: existingError } = await admin.from("products").select("id").eq("store_id", store.id).eq("vendor_id", vendor.id);
if (existingError) throw existingError;
const existingIds = new Set((existing || []).map((row) => row.id));
const newRows = productRows.filter((row) => !existingIds.has(row.id));

console.log(JSON.stringify({ mode: approved ? "production_write" : "dry_run", store: store.name, vendor: vendor.name, stagedProducts: productRows.length, newProducts: newRows.length, verifiedStockUnits: 0 }, null, 2));
if (!approved) process.exit(0);

const chunks = (rows, size = 50) => Array.from({ length: Math.ceil(rows.length / size) }, (_, index) => rows.slice(index * size, (index + 1) * size));
for (const chunk of chunks(productRows)) {
  const { error } = await admin.from("products").upsert(chunk, { onConflict: "id" });
  if (error) throw error;
}
for (const chunk of chunks(variantRows)) {
  const { error } = await admin.from("product_variants").upsert(chunk, { onConflict: "id" });
  if (error) throw error;
}
for (const chunk of chunks(newRows.map((product) => ({
  store_id: store.id,
  action: "catalog_product_staged",
  entity_type: "product",
  entity_id: product.id,
  after_data: { vendor_id: vendor.id, name: product.name, status: "draft", stock_status: "awaiting_vendor_confirmation", source: "africstyle_public_catalog" },
})))) {
  if (!chunk.length) continue;
  const { error } = await admin.from("audit_log").insert(chunk);
  if (error) throw error;
}

const [{ count: products }, { count: variants }, { count: positiveStock }] = await Promise.all([
  admin.from("products").select("id", { count: "exact", head: true }).eq("store_id", store.id).eq("vendor_id", vendor.id),
  admin.from("product_variants").select("id, products!inner(store_id, vendor_id)", { count: "exact", head: true }).eq("products.store_id", store.id).eq("products.vendor_id", vendor.id),
  admin.from("product_variants").select("id, products!inner(store_id, vendor_id)", { count: "exact", head: true }).eq("products.store_id", store.id).eq("products.vendor_id", vendor.id).gt("qty_on_hand", 0),
]);
console.log(JSON.stringify({ status: "staged", products: products || 0, variants: variants || 0, verifiedStockUnitsAboveZero: positiveStock || 0 }, null, 2));
