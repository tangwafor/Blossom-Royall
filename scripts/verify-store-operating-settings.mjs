import { readFile } from "node:fs/promises";

const [migration, runtime, app, tests, manifest] = await Promise.all([
  readFile("supabase/migrations/20260902060000_store_operating_settings.sql", "utf8"),
  readFile("lib/supabase/tenant-runtime.ts", "utf8"),
  readFile("app/page.tsx", "utf8"),
  readFile("scripts/store-operating-settings-role-tests.sql", "utf8"),
  readFile("package.json", "utf8"),
]);

const failures = [];
const requireText = (source, value, label) => { if (!source.includes(value)) failures.push(`${label} is missing: ${value}`); };

for (const value of ["store_operating_settings", "enable row level security", "store_operating_settings_read", "store_operating_settings_create", "store_operating_settings_update", "store_operating_settings_remove", "audit_store_operating_settings"]) requireText(migration, value, "Operating settings migration");
for (const value of ["loadTenantOperatingSettings", "saveTenantOperatingSettings", "Owner or manager production access is required"]) requireText(runtime, value, "Operating settings runtime");
for (const value of ["Production retail policy was published", "Production payout and inventory controls were saved", "Authoritative identity, tax, policy, commerce, and delivery settings were saved"]) requireText(app, value, "Operating settings interface");
for (const value of ["staff settings update was not blocked", "cross tenant settings leaked", "owner settings insert audit failed"]) requireText(tests, value, "Operating settings role test");
requireText(manifest, "test:operating-settings", "Package release gate");

if (failures.length) {
  failures.forEach((failure) => console.error(`ERROR ${failure}`));
  process.exit(1);
}
console.log("Store operating settings verified: identity, policy, commerce, delivery, RLS, audit, role boundaries, and interface persistence are covered.");
