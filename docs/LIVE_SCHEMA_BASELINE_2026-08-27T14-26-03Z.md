# Live schema baseline

Captured at 2026 08 27 14:26:03 UTC from Supabase project `ggncqdgpadglvvfxbcng` through read only control plane inspection.

Direct `pg_dump` was unavailable because this repository has no `DATABASE_URL`. The dump skill fallback was used.

## Verified live state

1. Applied migrations: `core_schema`, `vendor_brand_onboarding`, `complete_rls_and_indexes`, `product_media`, `readiness_submissions`.

2. Public tables: profiles, stores, store_memberships, vendors, products, product_variants, employees, time_entries, leases, rent_payments, orders, order_items, payments, measurement_profiles, audit_log, vendor_brand_assets, product_media, readiness_submissions.

3. Every public table has row level security enabled.

4. Every public table currently contains zero rows.

5. The security advisor reports zero findings.

6. The performance advisor reports one actionable informational finding: `readiness_submissions.store_id` has no covering index. Unused index notices are expected while every operational table remains empty.

7. The application now resolves the authenticated user and tenant membership before enabling production vendor persistence. Without a valid membership it remains visibly in private preview mode.

8. A direct schema only dump is still required before authoring new SQL. The read only control plane inventory does not replace that release gate.
