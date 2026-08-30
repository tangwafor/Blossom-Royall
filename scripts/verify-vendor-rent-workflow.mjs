import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(resolve("supabase/migrations/20260830084500_vendor_rent_workflow.sql"), "utf8").toLowerCase();
const runtime = readFileSync(resolve("lib/supabase/tenant-runtime.ts"), "utf8");
const page = readFileSync(resolve("app/page.tsx"), "utf8");
for (const fragment of ["submit_vendor_rent_payment", "review_vendor_rent_payment", "private.owns_vendor", "pending", "paid", "audit_log", "revoke all", "grant execute"]) {
  if (!migration.includes(fragment)) throw new Error(`Rent migration is missing ${fragment}`);
}
for (const fragment of ["loadVendorRentWorkspace", "submitVendorRentPayment", "reviewVendorRentPayment"]) {
  if (!runtime.includes(fragment)) throw new Error(`Rent runtime is missing ${fragment}`);
}
for (const fragment of ["VendorRentWorkspace", "Submit payment", "Confirm paid", "still in development"]) {
  if (!page.includes(fragment)) throw new Error(`Rent interface is missing ${fragment}`);
}
console.log("Vendor rent workflow checks passed.");
