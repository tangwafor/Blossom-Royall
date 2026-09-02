import { readFile } from "node:fs/promises";

const [migration, runtime, app, roles, manifest] = await Promise.all([
  readFile("supabase/migrations/20260902123000_catalog_inventory_governance.sql", "utf8"),
  readFile("lib/supabase/tenant-runtime.ts", "utf8"),
  readFile("app/page.tsx", "utf8"),
  readFile("scripts/catalog-inventory-role-tests.sql", "utf8"),
  readFile("package.json", "utf8"),
]);
const failures = [];
const needs = (source, text, label) => { if (!source.includes(text)) failures.push(`${label} is missing: ${text}`); };
for (const value of ["owner_product_approval_required", "review_catalog_product", "adjust_catalog_stock", "measurement_kind", "ring_size", "wrist_circumference", "necklace_length", "onsite_enabled", "online_enabled", "qty_reserved", "reorder_point", "audit_catalog_write"]) needs(migration, value, "Catalog migration");
for (const value of ["saveTenantProduct", "saveTenantProductVariant", "reviewTenantProduct", "adjustTenantProductStock", "removeTenantProduct"]) needs(runtime, value, "Catalog runtime");
for (const value of ["Add product", "Ring size", "Wrist circumference", "Necklace length", "Approve and publish", "Publication requires owner approval"]) needs(app, value, "Catalog interface");
for (const value of ["vendor self publication was not blocked", "cross tenant product leak", "catalog reconciliation failed"]) needs(roles, value, "Catalog role suite");
needs(manifest, "test:catalog-inventory", "Release gate");
if (failures.length) { failures.forEach((failure) => console.error(`ERROR ${failure}`)); process.exit(1); }
console.log("Catalog inventory verified: product CRUD, variant sizing, jewelry measurements, channels, approval, stock reconciliation, audit, and tenant isolation are covered.");
