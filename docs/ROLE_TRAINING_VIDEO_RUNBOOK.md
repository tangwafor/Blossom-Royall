# Role Training Video Runbook

## Purpose

This runbook creates training videos from real interface clicks while performing role permission QA. A recording is evidence only when its manifest says `passed_pending_human_review`. Human review is required before publishing.

The reviewed video must be delivered with the matching role package defined in `docs/ROLE_CREDENTIAL_WALKTHROUGH_HANDOFF.md`. A walkthrough is never a substitute for production credential and permission testing.

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

6. The default narration uses the same voice as Ndamba live interface training: Ezinne, warm Nigerian English, at six percent below natural speed. The recorder generates it locally through Edge neural speech. Set `TRAINING_NARRATION_MODE=ndamba`, or omit the setting because Ndamba mode is the default.

For a reviewed human recording, set `TRAINING_NARRATION_MODE=human`. Store each file as `cue-01.wav`, `cue-02.wav`, and so on under the role and edition folders inside a private narration directory. Set `TRAINING_HUMAN_NARRATION_DIR` to that directory.

Set `TRAINING_CAPTURE_ONLY=true` for the first live interface pass when narration has not been generated or recorded. This creates the raw recording, timed captions, and a numbered narration script with status `capture_pending_narration`. Capture only artifacts must never be published.

7. Run `npm run training:record`.

8. Review the voice for natural delivery, pronunciation, pacing, background noise, captions, visible account data, permission assertions, and manifest in `artifacts/training`.

9. Record the reviewer name and approval outside the generated manifest before publishing. Failed recordings must never be published.

10. The recorder combines the approved Ndamba voice or reviewed human English narration with a compact right side caption card and an English WebVTT track positioned to the side. Browser speech synthesis and Windows system narration are prohibited because they sound robotic. Reviewed French and Spanish voice and caption tracks remain in development. Publication remains blocked until voice, picture, privacy, translation, and role behavior receive human review.

## Production safeguard

Production recording is blocked unless `TRAINING_BASE_URL` is the branded production domain and `TRAINING_PRODUCTION_APPROVED=true`. This flag confirms recording approval only. The walkthrough intentionally performs read only navigation and does not authorize database migrations, payments, refunds, inventory changes, or account changes.

## Release requirements

1. Produce detailed and reel editions for every role.

2. Captions must be reviewed for timing and accuracy.

3. The picture must settle before each explanation.

4. Every artifact name and visible caption includes the date and commit.

5. Recreate recordings after relevant interface, policy, or workflow changes.

6. Keep features still in development explicitly identified. Current examples include automatic AI photo sizing, full intelligent size matching, vendor catalog editing, and production alert automation.

7. Reject robotic browser or Windows narration, unclear delivery, rushed delivery, or any unreviewed narration.
