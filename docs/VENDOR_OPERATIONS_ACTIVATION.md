# Vendor Operations Activation

## What works locally

1. Owners can create, inspect, edit, suspend, restore, and remove tenant vendor records.
2. Every local vendor mutation creates a timestamped change history entry.
3. New vendors receive a shareable readiness address with their brand, contact, and email already filled.
4. Owners can configure monthly rent, security deposit, commission, due day, agreement dates, and review status.
5. Staff can record rent, deposit, and adjustment payments with sequential branded receipts.
6. Vendor records, agreements, payments, and audit history persist in the browser for realistic workflow testing.
7. The storefront studio includes published preview profiles for Delly's Blossom Collections and Duplex's Africstyle Fashion, with direct customer storefront links.
8. Both storefronts support search, collection filtering, product details, multilingual presentation, theme persistence, a shared seller attributed bag, and checkout handoff.

## Verified production foundation

The live Supabase project was inspected on August 27, 2026. The `vendors`, `leases`, and `rent_payments` tables already exist with row level security enabled. All public tables reported row level security enabled. The Supabase security advisor reported no findings.

The readiness submission workflow is already persisted in production. Vendor operations now include an authenticated tenant adapter. It resolves the signed in user, requires a store membership, loads only vendors for that store, and permits production mutations only for owners and managers. When identity, membership, or production access is unavailable, the interface explicitly remains in private preview mode and preserves work on the device.

## Required external activation data

1. Delly's production owner email address.
2. Blossom Royall's legal name, operating address, timezone, tax jurisdiction, receipt phone, and receipt email.
3. Approval to create the first production store and owner membership records.
4. The approved lease template or attorney reviewed commercial terms.
5. Electronic signature provider selection and credentials if electronic signatures will launch immediately.
6. Each confirmed vendor's legal name, public brand name, authorized contact, email, phone, address, tax details, approved logo, category, rent, deposit, commission, start date, end date, and signing status.
7. A production database connection string stored locally as `DATABASE_URL` so a fresh schema only dump can be captured before any new SQL is authored.

## Activation sequence

1. Pull and commit a fresh production schema dump.
2. Create the production store, Delly's profile, and owner membership with explicit approval.
3. Import or invite confirmed vendors through an audited idempotent workflow.
4. Verify the existing role scoped vendor adapter using Delly's authenticated production owner membership.
5. Connect agreements and rent receipts to the existing lease and payment tables.
6. Verify database audit triggers, tenant isolation, concurrency handling, and revocation behavior.
7. Run security advisors, information schema checks, behavior tests, production build, and production account hygiene.
8. Promote only after owner review of real records and printed receipts.

## Explicit boundary

The interface does not claim that a vendor was legally invited, electronically signed, charged, paid, suspended, or removed in production while the workflow is using browser persistence. Production authorization and external provider actions must be real, observable, and auditable before those labels control live business operations.
