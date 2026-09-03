import { readFile } from "node:fs/promises";

const [migration, fixMigration, runtime, app] = await Promise.all([
  readFile("supabase/migrations/20260828183500_order_fulfillment.sql", "utf8"),
  readFile("supabase/migrations/20260829095500_fix_fulfillment_random_bytes.sql", "utf8"),
  readFile("lib/supabase/tenant-runtime.ts", "utf8"),
  readFile("app/operating-system.tsx", "utf8"),
]);

const failures = [];
const requireText = (source, expected, label) => {
  if (!source.includes(expected)) failures.push(`${label} is missing: ${expected}`);
};

requireText(migration, "create table public.order_fulfillment_events", "Fulfillment event entity");
requireText(migration, "create table public.order_pickup_credentials", "Pickup credential entity");
requireText(migration, "alter table public.order_fulfillment_events enable row level security", "Fulfillment event RLS");
requireText(migration, "function public.advance_order_fulfillment", "Protected fulfillment transition function");
requireText(fixMigration, "extensions.gen_random_bytes(4)", "Supabase pickup credential entropy source");
requireText(migration, "invalid_fulfillment_transition", "Transition enforcement");
requireText(migration, "payment_not_cleared", "Payment clearance boundary");
requireText(migration, "function public.get_customer_pickup_code", "Customer owned pickup credential function");
requireText(migration, "order_record.customer_id = (select auth.uid())", "Pickup credential ownership");
requireText(migration, "order_fulfillment_events_audit", "Fulfillment event audit");
requireText(migration, "orders_fulfillment_audit", "Order status audit");
requireText(migration, "to_jsonb(new) - 'code'", "Pickup credential audit redaction");
requireText(runtime, "advanceTenantOrderFulfillment", "Staff fulfillment runtime");
requireText(runtime, "loadCustomerPickupCode", "Customer pickup runtime");
requireText(runtime, "order_fulfillment_events", "Customer fulfillment history query");
requireText(app, "RECORDED FULFILLMENT HISTORY", "Customer event history");
requireText(app, "Start preparation", "Staff preparation action");
requireText(app, "Confirm pickup", "Staff pickup action");
requireText(app, "Confirm delivery", "Staff delivery action");

if (failures.length) {
  console.error("Fulfillment workflow verification failed:");
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log("Fulfillment workflow verified: protected pickup and delivery transitions, customer event history, private pickup credentials, payment clearance, and audit redaction are present.");
