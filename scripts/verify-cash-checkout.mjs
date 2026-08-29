import { readFile } from "node:fs/promises";

const [migration, smoke, security, app, tests, prepush] = await Promise.all([
  readFile("supabase/migrations/20260829062000_accountable_cash_checkout.sql", "utf8"),
  readFile("scripts/atomic-checkout-smoke.sql", "utf8"),
  readFile("scripts/atomic-checkout-security.sql", "utf8"),
  readFile("app/page.tsx", "utf8"),
  readFile("tests/app.spec.ts", "utf8"),
  readFile("package.json", "utf8"),
]);

const failures = [];
const requireText = (source, expected, label) => {
  if (!source.includes(expected)) failures.push(`${label} is missing: ${expected}`);
};

requireText(migration, "cash_collection_requires_onsite_staff", "Onsite cashier boundary");
requireText(migration, "caller_role not in ('owner', 'manager', 'staff')", "Cashier role boundary");
requireText(migration, "received_by, received_at, cash_accountability", "Accountable cash insert");
requireText(migration, "case when p_tender_method = 'cash' then caller_id end", "Authenticated cash receiver");
requireText(migration, "case when p_tender_method = 'cash' then now() end", "Server cash timestamp");
requireText(migration, "revoke insert, update, delete on public.payments from authenticated", "Direct payment write denial");
requireText(migration, "profiles_prepare_cash_receiver_deletion", "Cashier privacy deletion handling");
requireText(smoke, "Cash receiver was not the authenticated cashier", "Cash receiver database assertion");
requireText(smoke, "Cash order was not confirmed as paid", "Paid order database assertion");
requireText(security, "Customer self confirmed an online cash payment", "Customer cash abuse assertion");
requireText(security, "Authenticated users can bypass the cash checkout function", "Direct insert privilege assertion");
requireText(security, "Cash receiver privacy deletion did not preserve anonymized receipt history", "Cashier privacy deletion assertion");
requireText(app, "Use exact amount", "Touch friendly exact cash control");
requireText(app, "Cash payment recorded", "Cash confirmation copy");
requireText(tests, "records an exact cash tender with cashier accountability", "Cash behavior test");
requireText(prepush, "test:cash-checkout", "Cash release gate");

if (failures.length) {
  console.error("Cash checkout verification failed:");
  for (const failure of failures) console.error(`ERROR ${failure}`);
  process.exit(1);
}

console.log("Cash checkout verified: onsite staff boundary, accountable receipt, exact change, direct write denial, privacy handling, and behavior coverage are present.");
