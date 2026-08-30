import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migrationPath = resolve("supabase/migrations/20260830083000_vendor_read_isolation.sql");
const sql = readFileSync(migrationPath, "utf8");
const boundarySql = readFileSync(resolve("supabase/migrations/20260830093000_vendor_order_summary_boundary.sql"), "utf8");

const requiredFragments = [
  "create policy vendors_read_store",
  "create policy products_access",
  "create policy variants_access",
  "create policy orders_access",
  "create policy order_items_access",
  "create policy fulfillment_events_read",
  "create policy inventory_movements_read",
  "create policy product_media_read",
  "create policy product_media_storage_read",
  "create policy vendor_storefronts_read",
  "private.vendor_has_order(order_id)",
  "private.vendor_owns_variant(variant_id)",
  "revoke all on function private.vendor_has_order(uuid) from public, anon, authenticated",
];

for (const fragment of requiredFragments) {
  if (!sql.toLowerCase().includes(fragment.toLowerCase())) {
    throw new Error(`Role isolation migration is missing: ${fragment}`);
  }
}

for (const fragment of [
  "create or replace function public.get_vendor_order_summaries",
  "private.owns_vendor(item.vendor_id)",
  "sum(item.qty * item.unit_price)",
  "revoke all on function public.get_vendor_order_summaries(uuid) from public, anon",
]) {
  if (!boundarySql.toLowerCase().includes(fragment.toLowerCase())) throw new Error(`Vendor order boundary is missing: ${fragment}`);
}

if (/or\s+private\.vendor_has_order\(id\)/i.test(boundarySql)) throw new Error("Vendors must not read mall wide order totals directly.");

const forbiddenFragments = [
  "item.order_id = item.order_id",
  "current_store_role(store_id) is not null",
  "current_store_role(private.order_store(order_id)) is not null",
];

for (const fragment of forbiddenFragments) {
  if (sql.toLowerCase().includes(fragment.toLowerCase())) {
    throw new Error(`Unsafe role isolation expression remains: ${fragment}`);
  }
}

console.log("Role isolation migration checks passed.");
