import { readFile } from "node:fs/promises";

const [migration, runtime, app] = await Promise.all([
  readFile("supabase/migrations/20260828175500_customer_storefront_access.sql", "utf8"),
  readFile("lib/supabase/tenant-runtime.ts", "utf8"),
  readFile("app/page.tsx", "utf8"),
]);

const failures = [];
const requireText = (source, expected, label) => {
  if (!source.includes(expected)) failures.push(`${label} is missing: ${expected}`);
};

requireText(migration, "function public.resolve_customer_store", "Customer storefront resolver");
requireText(migration, "profile.role = 'customer'", "Customer role boundary");
requireText(migration, "store.commerce_status = 'published'", "Published store boundary");
requireText(migration, "product.status = 'published'", "Published catalog boundary");
requireText(migration, "caller_role := 'customer'", "Customer checkout role");
requireText(migration, "caller_role = 'customer' and p_channel <> 'online'", "Customer channel boundary");
requireText(migration, "case when caller_role = 'customer' then caller_id end", "Customer order ownership");
requireText(migration, "revoke all on function public.resolve_customer_store(text) from public, anon", "Anonymous resolver denial");
requireText(runtime, '.rpc("resolve_customer_store"', "Runtime storefront discovery");
requireText(runtime, '.eq("customer_id", context.userId)', "Explicit customer order isolation");
requireText(runtime, 'query = query.eq("status", "published")', "Runtime catalog publication filter");
requireText(runtime, "loadCustomerOrderHistory", "Persistent customer order loader");
requireText(runtime, "loadCustomerPickupCode", "Protected customer pickup credential loader");
requireText(app, "await loadCustomerOrderHistory(context)", "Customer order history screen");
requireText(app, "SECURE RECEIPT", "Non fabricated production receipt");

if (app.includes("482 915")) {
  failures.push("The customer order screen still contains a fabricated pickup credential");
}

if (failures.length) {
  console.error("Customer commerce verification failed:");
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log("Customer commerce verified: published storefront discovery, published catalog filtering, customer owned checkout, persistent order history, and explicit self isolation are present.");
