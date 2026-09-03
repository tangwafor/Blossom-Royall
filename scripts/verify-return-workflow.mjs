import { readFile } from "node:fs/promises";

const [migration, runtime, app] = await Promise.all([
  readFile("supabase/migrations/20260828182000_return_requests.sql", "utf8"),
  readFile("lib/supabase/tenant-runtime.ts", "utf8"),
  readFile("app/operating-system.tsx", "utf8"),
]);

const failures = [];
const requireText = (source, expected, label) => {
  if (!source.includes(expected)) failures.push(`${label} is missing: ${expected}`);
};

requireText(migration, "create table public.return_requests", "Return request entity");
requireText(migration, "alter table public.return_requests enable row level security", "Return request RLS");
requireText(migration, "customer_id = (select auth.uid())", "Customer self isolation");
requireText(migration, "function public.request_order_item_return", "Protected customer request function");
requireText(migration, "order_record.customer_id = caller_id", "Owned order validation");
requireText(migration, "function public.cancel_return_request", "Customer cancellation workflow");
requireText(migration, "function public.remove_canceled_return_request", "Customer removal workflow");
requireText(migration, "function public.review_return_request", "Staff review workflow");
requireText(migration, "invalid_return_transition", "Status transition enforcement");
requireText(migration, "return_requests_audit", "Return audit trigger");
requireText(runtime, "requestOrderItemReturn", "Customer return runtime");
requireText(runtime, "loadTenantReturnRequests", "Staff return queue runtime");
requireText(runtime, "reviewTenantReturnRequest", "Staff return action runtime");
requireText(app, "PRODUCTION RETURN QUEUE", "Staff production return queue");
requireText(app, "await requestOrderItemReturn", "Customer production request action");

if (failures.length) {
  console.error("Return workflow verification failed:");
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log("Return workflow verified: customer ownership, audited creation, cancellation, removal, staff queue, and protected status transitions are present.");
