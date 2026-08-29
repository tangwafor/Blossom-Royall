# Blossom Royall Controlled Production Pilot Approval

Prepared August 29, 2026.

## Current boundary

The production application remains at commit `980ecf5`. The approved production database migrations were applied on August 29, 2026 through `20260829095500`. The current local application candidate is based on `7374fd0` plus the fulfillment lint fix and refreshed evidence. No newer application commit has been pushed yet.

The user approved both production actions on August 29, 2026:

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

10. `20260828182000_return_requests.sql`

11. `20260828183500_order_fulfillment.sql`

12. `20260828185000_payment_verification.sql`

13. `20260829062000_accountable_cash_checkout.sql`

14. `20260829095500_fix_fulfillment_random_bytes.sql`

The final pre migration baseline is `SCHEMA_DUMP_2026-08-29T09-30-21Z.sql`. It had no table difference from the prior baseline. The verified post migration schema is `SCHEMA_DUMP_2026-08-29T09-38-47Z.sql` with 2,305 lines.

## Proven local checks

1. Every migration applies in order to a clean PostgreSQL 17 database.

2. Atomic checkout calculates authoritative totals, writes one receipt, records inventory and vendor ledger effects, and blocks overselling during a simultaneous final item purchase.

3. Owner access is blocked at authentication assurance level one and allowed at level two.

4. Anonymous checkout and deletion request execution are denied.

5. Account deletion request, cancellation, audit evidence, sole owner protection, row level security, and four policy presence checks pass.

6. The complete prepush gate passed on August 29, 2026 for the current cash pilot candidate: type checks, production build, static site build, synthetic monitor fixture, account deletion processor verifier, customer commerce verifier, return verifier, fulfillment verifier, payment verifier, cash checkout verifier, native structure verifier, and Playwright behavior tests. The Playwright result is 100 passed and 2 intentionally skipped across desktop and mobile projects.

7. Customer storefront discovery requires a customer profile and a published Blossom Royall store. Internal roles do not resolve through the public customer function.

8. Customer catalog reads return only published products. A direct checkout attempt against a draft variant fails in the database function.

9. Customer checkout creates an order owned by the authenticated customer, decrements inventory atomically, and remains invisible to a second customer.

10. My Orders reloads the latest production order from the customer account instead of depending only on browser storage. The interface displays the real secure receipt reference and does not fabricate a pickup credential.

11. Return requests preserve customer, order item, vendor, resolution, reason, and the purchase policy snapshot. A second customer cannot read or request a return for another customer's order item.

12. Duplicate open returns are blocked. Customers can cancel and remove canceled requests. Owner review requires multifactor assurance level two and enforces requested, reviewing, approved, received, and completed transitions.

13. Two return creations, one cancellation, one removal, and four staff transitions produce exactly eight return audit records. An invalid transition produces no write.

14. Pickup and delivery orders enforce payment clearance and valid preparation, readiness, transit, and handoff transitions. Invalid shortcuts and uncleared payment advancement are denied.

15. Pickup credentials are random six character codes, visible only through the owning customer function while ready, unexpired, and unredeemed. A second customer sees neither the credential nor the fulfillment events.

16. Pickup and delivery completion produce exactly fourteen fulfillment audit writes in the controlled lifecycle. Pickup codes are removed from audit payloads, and redeemed credentials stop resolving for the customer.

17. The staff Orders view retains real order identifiers and records fulfillment transitions through the protected function. My Orders displays recorded fulfillment history and a real pickup credential only when one exists.

18. Pending electronic payments can be reviewed exactly once by authorized staff. Rejection requires a reason. Approval confirms the order and unlocks fulfillment. Rejection marks the order rejected and keeps fulfillment blocked.

19. Rejected payment evidence restores reserved stock exactly once, records a reservation release movement, and adds a balancing seller ledger debit. Verified payments preserve the original seller credit.

20. Payment proof paths and filenames are removed from audit payloads. Payment decisions, order payment state, product variant quantity changes, inventory movements, and seller ledger entries each produce independent audit records.

21. The production Orders view lists pending payment references or proof filenames, uses two minute signed proof links, requires a rejection reason, and removes completed reviews from the pending queue.

22. Public privacy, account deletion, and localized support routes are present. The synthetic monitor verifies `/support` in addition to the existing production routes.

23. Apple and Google listing metadata, privacy declaration maps, policy declaration maps, reviewer access requirements, and screenshot dimensions are staged and structurally verified. Final screenshots refuse preview data and remain blocked on authenticated production capture plus human review.

24. Cash checkout is restricted to onsite owner, manager, or staff sessions. Customer accounts cannot self confirm online cash as received.

25. Every new cash payment records the authenticated cashier, server receipt time, amount accepted, exact change, confirmed order state, inventory movement, seller ledger credit, payment audit, and branded receipt in one transaction.

26. Direct authenticated writes to the payment table are revoked. Cash must pass through the protected checkout function.

27. Historical cash records without receiver evidence remain visibly marked as legacy unverified. Cashier account deletion anonymizes the receiver while preserving the server timestamp and required receipt history.

28. The complete migration chain, cash smoke test, cash role isolation, direct write denial, and cashier privacy deletion test pass against a fresh isolated PostgreSQL 17 database.

29. Supabase database lint initially found the pickup credential entropy function outside the extension search path. Migration `20260829095500` qualifies `extensions.gen_random_bytes`, the actual ready for pickup transition generates a valid six character credential in a fresh PostgreSQL database, and the repeated production lint reports no schema errors.

30. Production is migrated through `20260829095500`. Every public table has row level security, no public security definer function has a mutable search path, anonymous checkout execution is denied, direct authenticated payment inserts are denied, and payment evidence storage is private.

31. Production currently has zero stores, profiles, memberships, vendors, and products. The application may be deployed, but cash acceptance remains inactive until the approved owner account, canonical store, and onsite catalog are created and verified.

## Pilot activation sequence

1. Confirm Delly's production authentication identity and multifactor enrollment.

2. Confirm the canonical Blossom Royall store record and Delly's owner membership.

3. Capture a fresh schema snapshot and compare it with the committed baseline.

4. Apply the migrations in one reviewed maintenance window.

5. Run information schema, grants, row level security, function execution, storage policy, and Supabase advisor checks.

6. Confirm the canonical store slug is `blossom-royall`, confirm commerce status is published, and confirm only intended products have published status.

7. Create only the approved Blossom Collections vendor and storefront records. Keep publication status in review until Delly confirms spelling, content, media rights, and catalog.

8. Execute one low value onsite cash pilot sale while signed in as the approved cashier. Count the tender, use the exact amount control or enter the received amount, confirm change, print the receipt, and verify cashier identity, server time, stock, seller ledger, audit history, and confirmed paid status. Separately confirm that a customer account cannot self confirm cash online.

9. Submit one controlled customer return, verify it appears in the staff queue, advance it through inspection and completion, and confirm the seller attribution and eight expected audit events for the complete test lifecycle.

10. Advance one paid pickup order and one paid delivery order through their complete fulfillment paths. Confirm cross customer privacy, pickup credential expiry and redemption, recorded customer history, and fourteen expected fulfillment audit writes.

11. Verify one referenced electronic payment and reject one proof based payment. Confirm the approved order enters fulfillment, the rejected order remains blocked, stock is restored once, the seller ledger is balanced, and proof metadata is absent from audits.

12. Push the verified branch and inspect the Netlify deploy preview before production promotion.

13. Verify `https://app.blossomroyall.com/workspace`, `/privacy`, `/support`, `/account/delete`, `/manifest.webmanifest`, and `/sw.js` after promotion.

14. Trigger the production monitor manually and confirm it is green before inviting pilot users.

15. Deploy `process-account-deletions`, configure `AUTOMATION_RUNNER_SECRET`, manually verify one controlled deletion lifecycle, then enable `ACCOUNT_DELETION_PROCESSOR_ENABLED`. Keep the scheduled workflow disabled until this review is complete.

## Stop conditions

Stop promotion if any row level security, tenant isolation, endpoint authorization, bundle secret, Supabase advisor, migration, storage privacy, MFA, checkout concurrency, or branded domain check fails.

Cash acceptance is ready for a controlled onsite pilot after the database migration and deployment receive explicit approval. Card acceptance and production layaway remain unavailable until their separate authorization and balance contracts are complete. Electronic methods currently record a reference or private proof for staff verification. They do not claim provider authorization.

## Recovery posture

Do not drop newly created tables or columns during the pilot. If a defect appears, disable the affected user interface path, preserve audit evidence, and ship a reviewed forward fix. Database restoration is reserved for a verified data integrity event and requires a current production backup plus explicit destructive action approval.

## Known work after pilot activation

1. Deploy and activate the reviewed account deletion processor and overdue operator queue after the controlled lifecycle test.

2. Activate and monitor `privacy@blossomroyall.com` and `support@blossomroyall.com`.

3. Complete production error capture, metrics, and alert routing beyond the zero cost synthetic monitor.

4. Complete authorization backed card payments, production layaway, outbound fulfillment notifications, refund execution, and inventory disposition contracts.

5. Complete native packaging, signing, privacy manifest, store declarations, screenshots, reviewer account, and human reviewed multilingual walkthroughs.
