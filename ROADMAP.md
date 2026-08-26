# Blossom Royall OS Build Roadmap

## P0 — foundation
Auth, tenant/store model, role model, RLS, audit log, design system, CI, preview deploys.

## P1 — working commerce spine
Catalog/variants/barcodes, vendor attribution, inventory, POS, cash/card/split tender, receipts, online orders.

## P2 — mall operations
Vendor onboarding, leases/e-sign, rent ledger/receipts, staff/timeclock/pay estimates, Blossom Connect.

### Human resources

1. Candidate pipeline, offers, hiring, onboarding checklists, identity and document collection, contracts, signatures, and probation tracking.
2. Configurable jobs, departments, locations, reporting lines, roles, permissions, compensation, benefits, emergency contacts, and employment status.
3. Availability, schedules, shift swaps, clock activity, breaks, overtime, leave requests, holidays, payroll estimates, approvals, and export.
4. Training, certifications, policy acknowledgements, goals, reviews, coaching notes, recognition, incidents, disciplinary actions, and offboarding.
5. Employee self service for profiles, documents, schedules, timecards, leave, pay summaries, tasks, and private HR communication.
6. Country aware policy configuration, retention rules, role scoped privacy, audit records, and database enforced tenant isolation.

## P3 — customer experience
Storefront, loyalty/wallet, wishlist, My Fit/self-measurements, holds, pickup/delivery, layaway.

## P4 — intelligence
AI product naming/descriptions, smart forms, trend engine, size demand, vendor coaching, anomaly alerts, natural-language business search.

### Customer intelligence

1. Capture consented views, searches, saves, cart additions, fitting activity, purchases, returns, size preferences, colors, brands, and recommendation impressions.
2. Serve explainable rails for recommended products, related alternatives, complete the look, buy again, new from favorite brands, trending in the customer's size, and session based discovery for anonymous visitors.
3. Filter unavailable products, tenant boundaries, unsuitable sizes, prior returns, blocked categories, and products the customer already owns when repetition is not useful.
4. Blend relevance with controlled exploration so new vendors and new products can earn discovery without overwhelming personal fit.
5. Track impression, click, save, add to cart, purchase, revenue, return, hide, and dislike outcomes for every recommendation.
6. Give customers controls to explain, hide, tune, reset, or opt out of personalization.

### Owner intelligence

1. Show sales, units, gross margin, return rate, sell through, stock cover, repeat buyer rate, average order value, and recommendation assisted revenue by brand and vendor.
2. Drill into category, product, variant, size, color, channel, campaign, customer segment, location, and time period.
3. Attribute every sale and recommendation event to the tenant, brand, vendor, product, and customer where consent permits.
4. Alert owners to rising brands, declining conversion, stockouts, unusual returns, missed cross sell opportunities, and underexposed vendors.
5. Compare periods and export role scoped reports without exposing customer data across tenants.

### Research basis

Amazon Personalize documents real time personalization from recent interactions, recommendation reasons, filtering, exploration, and controlled promotions: https://docs.aws.amazon.com/personalize/latest/dg/recommendations.html

Shopify documents distinct related and complementary recommendation intents plus conversion tracking: https://shopify.dev/docs/storefronts/themes/product-merchandising/recommendations

## P5 — polish
Weather/address context, campaigns, branded PDFs, accessibility, observability, backup/restore, security review, launch runbook.
