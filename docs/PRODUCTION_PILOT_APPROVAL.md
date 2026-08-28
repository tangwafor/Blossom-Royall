# Blossom Royall Controlled Production Pilot Approval

Prepared August 28, 2026.

## Current boundary

Production remains on commit `980ecf5`. The verified local branch contains the controlled pilot work. No migration in this packet has been applied to production and no newer commit has been pushed.

Two explicit approvals are required:

1. Approval to apply the listed production database migrations.

2. Approval to push the verified `master` branch and promote the resulting Netlify deployment.

DNS, secrets, payment webhooks, destructive cleanup, and native store submission remain separate approval events.

## Database migration order

Apply these migrations in filename order after capturing and reviewing a new production schema snapshot:

1. `20260828143000_measurement_profile_audit.sql`

2. `20260828144500_measurement_profile_least_privilege.sql`

3. `20260828152500_owner_aal2.sql`

4. `20260828161000_payment_evidence.sql`

5. `20260828162000_vendor_storefronts.sql`

6. `20260828163500_atomic_checkout.sql`

7. `20260828170000_account_deletion_requests.sql`

8. `20260828173500_account_deletion_operations.sql`

9. `20260828175500_customer_storefront_access.sql`

The latest captured schema baseline is `SCHEMA_DUMP_2026-08-28T17-53-05Z.sql`. It differs from the previous baseline only by a trailing blank line, so no production schema drift was found. A second fresh snapshot must be captured immediately before production execution if the production schema changes after that file was created.

## Proven local checks

1. Every migration applies in order to a clean PostgreSQL 17 database.

2. Atomic checkout calculates authoritative totals, writes one receipt, records inventory and vendor ledger effects, and blocks overselling during a simultaneous final item purchase.

3. Owner access is blocked at authentication assurance level one and allowed at level two.

4. Anonymous checkout and deletion request execution are denied.

5. Account deletion request, cancellation, audit evidence, sole owner protection, row level security, and four policy presence checks pass.

6. The production build, static export, synthetic monitor fixture, type checks, and Playwright suite pass. The latest result is 96 passed and 2 intentionally skipped.

7. Customer storefront discovery requires a customer profile and a published Blossom Royall store. Internal roles do not resolve through the public customer function.

8. Customer catalog reads return only published products. A direct checkout attempt against a draft variant fails in the database function.

9. Customer checkout creates an order owned by the authenticated customer, decrements inventory atomically, and remains invisible to a second customer.

10. My Orders reloads the latest production order from the customer account instead of depending only on browser storage. The interface displays the real secure receipt reference and does not fabricate a pickup credential.

## Pilot activation sequence

1. Confirm Delly's production authentication identity and multifactor enrollment.

2. Confirm the canonical Blossom Royall store record and Delly's owner membership.

3. Capture a fresh schema snapshot and compare it with the committed baseline.

4. Apply the migrations in one reviewed maintenance window.

5. Run information schema, grants, row level security, function execution, storage policy, and Supabase advisor checks.

6. Confirm the canonical store slug is `blossom-royall`, confirm commerce status is published, and confirm only intended products have published status.

7. Create only the approved Blossom Collections vendor and storefront records. Keep publication status in review until Delly confirms spelling, content, media rights, and catalog.

8. Execute one low value cash pilot sale and one referenced electronic payment pilot. Confirm receipt, stock, ledger, audit, payment verification, evidence privacy, customer order reload, and cross customer isolation.

9. Push the verified branch and inspect the Netlify deploy preview before production promotion.

10. Verify `https://app.blossomroyall.com/workspace`, `/privacy`, `/account/delete`, `/manifest.webmanifest`, and `/sw.js` after promotion.

11. Trigger the production monitor manually and confirm it is green before inviting pilot users.

12. Deploy `process-account-deletions`, configure `AUTOMATION_RUNNER_SECRET`, manually verify one controlled deletion lifecycle, then enable `ACCOUNT_DELETION_PROCESSOR_ENABLED`. Keep the scheduled workflow disabled until this review is complete.

## Stop conditions

Stop promotion if any row level security, tenant isolation, endpoint authorization, bundle secret, Supabase advisor, migration, storage privacy, MFA, checkout concurrency, or branded domain check fails.

Card acceptance and production layaway remain unavailable until their separate authorization and balance contracts are complete. Electronic methods currently record a reference or private proof for staff verification. They do not claim provider authorization.

## Recovery posture

Do not drop newly created tables or columns during the pilot. If a defect appears, disable the affected user interface path, preserve audit evidence, and ship a reviewed forward fix. Database restoration is reserved for a verified data integrity event and requires a current production backup plus explicit destructive action approval.

## Known work after pilot activation

1. Deploy and activate the reviewed account deletion processor and overdue operator queue after the controlled lifecycle test.

2. Activate and monitor `privacy@blossomroyall.com`.

3. Complete production error capture, metrics, and alert routing beyond the zero cost synthetic monitor.

4. Complete authorization backed card payments, production layaway, fulfillment notifications, customer return persistence, and refund contracts.

5. Complete native packaging, signing, privacy manifest, store declarations, screenshots, reviewer account, and human reviewed multilingual walkthroughs.
