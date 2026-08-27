# Live schema baseline

Captured at 2026 08 27 14:26:03 UTC from Supabase project `ggncqdgpadglvvfxbcng` through read only control plane inspection.

Direct `pg_dump` was unavailable because this repository has no `DATABASE_URL`. The dump skill fallback was used.

## Verified live state

1. Applied migrations: `core_schema`, `vendor_brand_onboarding`, `complete_rls_and_indexes`.

2. Public tables: profiles, stores, store_memberships, vendors, products, product_variants, employees, time_entries, leases, rent_payments, orders, order_items, payments, measurement_profiles, audit_log, vendor_brand_assets.

3. Every public table has row level security enabled.

4. Every public table currently contains zero rows.

5. Private storage buckets: `vendor-brand-assets` only.

6. The products table has no media relationship. A product media table and private bucket are therefore required before production collection uploads can replace browser preview storage.

