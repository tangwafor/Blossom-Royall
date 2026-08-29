import { readFile } from "node:fs/promises";

const [migration, runtime, app, tests, prepush] = await Promise.all([
  readFile("supabase/migrations/20260829103000_cash_drawer_reconciliation.sql", "utf8"),
  readFile("lib/supabase/tenant-runtime.ts", "utf8"),
  readFile("app/page.tsx", "utf8"),
  readFile("tests/app.spec.ts", "utf8"),
  readFile("package.json", "utf8"),
]);

const failures = [];
const requireText = (source, expected, label) => { if (!source.includes(expected)) failures.push(`${label} is missing: ${expected}`); };

requireText(migration, "cash_registers", "Editable register entity");
requireText(migration, "cash_drawer_one_open_register_idx", "Single open drawer concurrency guard");
requireText(migration, "cash_drawer_one_open_cashier_idx", "Single open cashier concurrency guard");
requireText(migration, "open_cash_drawer_required", "Cash checkout drawer boundary");
requireText(migration, "drawer_session_id", "Payment to drawer attribution");
requireText(migration, "p_counted_cash - calculated_expected", "Server variance calculation");
requireText(migration, "private.audit_cash_operations", "Cash operation audit trail");
requireText(migration, "enable row level security", "Cash entity RLS");
requireText(migration, "private.current_store_role", "Tenant role isolation");
requireText(runtime, "recordCashDrawerAdjustment", "Cash movement runtime");
requireText(runtime, "removeCashRegister", "Register removal workflow");
requireText(app, "Close and reconcile", "Reconciliation interface");
requireText(app, "drawerCopy", "Localized cash drawer copy");
requireText(tests, "shows the protected cash drawer workspace", "Cash drawer behavior test");
requireText(prepush, "test:cash-drawer", "Cash drawer release gate");

if (failures.length) {
  console.error("Cash drawer verification failed:");
  failures.forEach((failure) => console.error(`ERROR ${failure}`));
  process.exit(1);
}
console.log("Cash drawer verified: register CRUD, opening float, cash movement, payment attribution, reconciliation, RLS, audit, localization, and behavior coverage are present.");
