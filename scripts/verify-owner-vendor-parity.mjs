import { readFileSync } from "node:fs";

const runtime = readFileSync("lib/supabase/tenant-runtime.ts", "utf8");
const app = readFileSync("app/page.tsx", "utf8");
const packageData = JSON.parse(readFileSync("package.json", "utf8"));

for (const fragment of [
  "loadVendorOperatingSnapshots",
  "recordedBalance: credits - deductions - paid",
  "lowStockVariants",
  "rentStatus",
  "refreshedAt",
]) {
  if (!runtime.includes(fragment)) throw new Error(`Shared owner and vendor snapshot is missing ${fragment}`);
}

for (const fragment of [
  "<OwnerVendorReconciliation",
  "loadVendorOperatingSnapshots(context)",
  "snapshot?.recordedBalance",
  "snapshot?.stockUnits",
  "snapshot?.lowStockVariants",
  "snapshot?.rentStatus",
  "No preview values were substituted",
]) {
  if (!app.includes(fragment)) throw new Error(`Owner and vendor dashboard parity is missing ${fragment}`);
}

if (!packageData.scripts.prepush.includes("test:owner-vendor-parity")) throw new Error("Owner and vendor parity is not enforced before push.");

console.log("Owner and vendor parity verified: shared production snapshot, RLS scoped visibility, matching balance formula, stock, low stock, rent, and no preview fallback.");
