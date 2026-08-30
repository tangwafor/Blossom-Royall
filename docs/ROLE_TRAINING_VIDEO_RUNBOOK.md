# Role Training Video Runbook

## Purpose

This runbook creates training videos from real interface clicks while performing role permission QA. A recording is evidence only when its manifest says `passed_pending_human_review`. Human review is required before publishing.

## Roles

1. Owner verifies the command center, products, vendors, orders, staff, and business setup.

2. Staff verifies checkout, cash drawer, orders, delivery, returns, and help. Staff must not see business setup, vendor administration, or staff administration.

3. Manager verifies daily operations, vendors, rent, orders, staff, and policies without owner only business setup.

4. Vendor verifies Vendor Board, My Products, Orders, Rent, and Help. Vendor must not see owner, cashier, payroll, or business setup screens.

5. Customer verifies Customer Shop, My Fit, Checkout, My Orders, Aftercare, and Help. Customer must not see operating or administrative screens.

## Safe recording process

1. Use dedicated QA accounts. Never place passwords in source files, documentation, terminal output, captions, or recordings.

2. Start the application locally with `npm run dev -- --hostname 127.0.0.1 --port 3002`.

3. Set `TRAINING_ROLE` to `owner`, `manager`, `staff`, `vendor`, `customer`, or `all`.

4. Set the matching email and password variables. For example, owner uses `TRAINING_OWNER_EMAIL` and `TRAINING_OWNER_PASSWORD`.

5. Set `TRAINING_EDITION` to `detailed` or `reel`.

6. Run `npm run training:record`.

7. Review the video, captions, visible account data, permission assertions, and manifest in `artifacts/training`.

8. Record the reviewer name and approval outside the generated manifest before publishing. Failed recordings must never be published.

9. The recorder produces English voice narration, a compact right side caption card, and an English WebVTT track positioned to the side. Reviewed French and Spanish voice and caption tracks remain in development. Publication remains blocked until translation and human review are complete.

## Production safeguard

Production recording is blocked unless `TRAINING_BASE_URL` is the branded production domain and `TRAINING_PRODUCTION_APPROVED=true`. This flag confirms recording approval only. The walkthrough intentionally performs read only navigation and does not authorize database migrations, payments, refunds, inventory changes, or account changes.

## Release requirements

1. Produce detailed and reel editions for every role.

2. Captions must be reviewed for timing and accuracy.

3. The picture must settle before each explanation.

4. Every artifact name and visible caption includes the date and commit.

5. Recreate recordings after relevant interface, policy, or workflow changes.

6. Keep features still in development explicitly identified. Current examples include automatic AI photo sizing, full intelligent size matching, vendor catalog editing, and production alert automation.
