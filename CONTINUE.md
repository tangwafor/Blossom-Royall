# Blossom Royall Continuation Checkpoint

Recorded September 2, 2026.

## Current checkpoint

The latest local application checkpoint is commit `f5c03b5`, titled `test: define complete role course contracts`.

The latest production aligned remote checkpoint is commit `15f2c75`, titled `docs: record production operating settings activation`.

Production approval for migration `supabase/migrations/20260902123000_catalog_inventory_governance.sql` was received on September 2, 2026. The migration was applied to the linked Blossom Royall production project after a dry run listed only that file. The older migration `20260830093000_vendor_order_summary_boundary.sql` remains unapplied and was not included.

The pre migration production schema baseline is `SCHEMA_DUMP_2026-09-03T00-32-39Z.sql`, with 2,785 lines. Live structural verification confirmed all twenty expected product and variant columns, the inventory movement table, row level security, twelve policies, and both protected catalog functions. The transaction rolled back catalog role test passed vendor self publication denial, owner approval, stock reconciliation, audit creation, customer visibility, and cross tenant isolation without leaving test data.

The Next.js route component was separated from the reusable operating system component after Next.js 16 rejected the named export in `app/page.tsx`. Type checking and the Sites production build pass with that correction.

The complete local Playwright suite passed on September 3, 2026: 114 tests passed across desktop and mobile, with two intentional skips. The application workflows are healthy. The remaining release blocker is the narrated role course executor, which currently verifies chapter access but does not yet perform and reconcile every required workflow action.

## Verified catalog scope

1. Owner governed product and variant creation, reading, updating, and removal.

2. Vendor draft submission with owner approval, rejection, suspension, and publication.

3. Onsite, online, and preorder channel controls.

4. Apparel, footwear, ring, bracelet, necklace, and custom measurement metadata.

5. Reserved stock, reorder thresholds, atomic stock adjustments, inventory movements, audit history, and tenant isolation.

6. Development compatibility with the existing 173 staged products and variants.

## Active blockers

1. The standalone inventory workbook is paused because the current Codex session did not receive the approved Spreadsheets workspace dependency loader. The Spreadsheets skill is installed, but `@oai/artifact-tool` must be supplied by a fresh Codex session. Do not install or substitute a spreadsheet library in this repository.

2. The release guard remains blocked because the role course recorder has not implemented and verified every required workflow action and matching backend result.

3. Detailed role training videos must be recorded again after complete production workflow action coverage passes. Publication still requires human review.

4. Card processing, production layaway, automatic photo sizing, complete seller size chart ingestion, and paid AI enhancements require external decisions, credentials, or approved contracts. Keep them visibly marked as in development.

## Safe next work

1. Complete the required role course actions and matching backend assertions for owner, manager, staff, vendor, and customer.

2. Run the release guard and complete Playwright role suite.

3. Deploy the catalog interface only after the full release gate passes, then exercise real owner and vendor interface workflows against production.

4. Return to the inventory workbook from a fresh Codex session with the approved Spreadsheets runtime.

## Protected local files

The untracked `artifacts` directory, `public-mall-site` directory, and `public-mall-site-deploy.tar.gz` archive are user artifacts. Do not modify, remove, or commit them unless the user explicitly requests it.
