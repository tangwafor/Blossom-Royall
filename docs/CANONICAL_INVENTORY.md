# Blossom Royall Canonical Inventory

## Tenant defaults

| Setting | Value |
| --- | --- |
| Currency | USD |

## Current product surfaces

| Surface | Primary role | Status | Behavior coverage |
| --- | --- | --- | --- |
| Command Center | Owner, manager | Working preview | Metrics, priorities, recent orders, intelligence, brand performance |
| Owner notification center | Owner, manager | Working preview | Visible attention count, low stock, vendor rent and staff leave alerts, direct routing into the responsible operating workflow, and reviewed state |
| In app help | Owner, manager, staff, vendor, customer | Working preview | Searchable role aware task guidance, expandable operating steps, direct workflow routing, guided tour restart, and explicit production safety boundaries |
| Tenant assistant | Owner, manager, staff, vendor, customer | Working preview | Renameable tenant identity, contextual operating guidance, policy aware answers, protected action boundaries, zero cost deterministic core, and persisted tenant naming |
| Customer Shop | Customer | Working preview | Mission based occasion shopping, budget and timing aware complete looks, cross vendor edits, transparent match reasons, seller verification, fulfillment confidence, African designer storytelling, textile provenance, preference controls, and familiar brand discovery |
| My Fit | Customer | Development persistence ready | Guided private self measurement, English, French, and Spanish guidance, metric and imperial conversion, consented device and account persistence, offline write queue, reconnect synchronization, vendor sharing choice, dated profile snapshots, portable export, confirmed deletion, starting size recommendation, and Customer Shop matching |
| Intelligence | Owner, manager | Working preview | Explainable demand signals, merchandising brief, reorder decision, trust controls |
| Welcome | Visitor | Working preview | September 1 grand opening, Prince George’s Plaza location, store hours, African designers, local brands, and luxury experience narrative |
| Brand partnerships | Prospective vendor | Working preview | Premium recruitment story, operating benefits, onboarding path, trust commitments, and persisted partnership inquiry |
| Internal marketplace concept | Owner, product, engineering | Local only internal preview | Animated three dimensional marketplace model, stakeholder outcomes, transaction invariants, inventory movement model, fulfillment custody, vendor ledger behavior, tenant boundaries, failure recovery, and release gates. The route is removed from public static deployment artifacts. Remote access remains blocked until server side membership authorization exists. |
| Checkout | Owner, manager, staff | Working preview | Express sale entry and checkout handoff |
| Customer bag and checkout | Customer | Working preview | Cross vendor seller attributed bag, pickup and delivery choices, delivery fee calculation, cash tender with change calculation, card, bank transfer, Zelle, Venmo, PayPal, Cash App, mobile money and check capture, payment references, photo or PDF proof of payment, staff verification state, layaway deposit, order persistence, and coordinated confirmation |
| My Orders | Customer | Working preview | Coordinated order progress, pickup credential, seller attributed items, layaway balance and payment, return eligibility, and persisted return request |
| Orders | Owner, manager, staff | Working preview | Search and fulfillment status |
| Products | Owner, manager, vendor | Working preview | Inventory overview and stock state |
| Vendors | Owner, manager, vendor | Working preview | Tenant vendor directory with create, view, edit, suspend, restore, confirmed removal, contact links, generated readiness invitations with prefilled vendor details, persisted browser state, accountable change history, configurable lease drafts, rent and deposit recording, branded payment receipts, payment history, sales summary, plus vendor supplied logo review without developer intervention |
| Blossom Collections storefront | Delly, owner, manager, staff, customer | Development persistence ready | Delly confirmed Blossom Collections as her independent store inside Blossom Royall on August 28, 2026. The editable storefront studio now manages isolated identity, owner presentation, story, categories, social links, contacts, colors, fulfillment choices, media rights, publication status, local recovery, audited database writes, tenant row level security, and complete removal. Exact public spelling, catalog, and media usage await verification from the official Facebook page. |
| Shared Commerce | Owner, manager | Working preview | Single cashier attribution, configurable payout cadence and reserves, settlement preview, scan safeguards, and inventory rebalance recommendations |
| Delivery | Owner, manager | Working preview | Pickup, local delivery, carrier shipping, tenant routing rules, multi vendor consolidation, custody workflow, and active fulfillment board |
| Staff | Owner, manager, staff | Working preview | Tenant staff directory, invitation and employment lifecycle, editable schedules and breaks, clock activity, weekly pay estimates, leave requests and decisions, local persistence, and accountable change history |
| Policy Center | Owner, manager | Working preview | Tenant keyed returns, exchanges, final sale, fees, eligibility preview, layaway terms, and local persistence |
| Business Setup | Owner, manager | Working preview | Public and legal identity, owner display name, address, receipt contacts, currency, locale, timezone, tax treatment, tax rate, and generated order prefix |
| Tenant data boundary | All operating roles | Production connected | Public preview records are visibly labeled. Authenticated workspaces load tenant scoped orders, products, and vendors, with honest empty states instead of sample activity |
| Aftercare | Owner, manager, staff | Working preview | Return approval, exchange reservation, exception review, layaway reminders, grace periods, and accountable history |
| Signed vendor research | Owner, manager | Four video confirmed labels documented with verification status, public evidence, positioning, and onboarding gaps |
| Established mall retail research | Owner, manager | Nine neighboring retail benchmarks covering policy rules, loyalty, fulfillment, marketplace boundaries, services, and a Blossom Royall capability blueprint |

## Current technical surfaces

| Surface | Status |
| --- | --- |
| Next.js production build | Green |
| Playwright desktop behavior tests | Active |
| Playwright mobile behavior tests | Active |
| Light and dark themes | Persisted |
| PWA manifest | Active |
| Offline application shell cache | Active |
| Persistent in app guided tour | Active |
| Tenant brand icon and social card | Active |
| Couture BR monogram system | Active across app navigation, welcome, authentication, receipts, and PWA |
| Branded social sharing card | Active with approved monogram and editorial campaign |
| Printable branding contract | Tenant logo header and TaTech attribution footer active on receipt preview |
| Authentication methods | Password, secure email code, Google OAuth, email only remembering, and authentication app verification for owners |
| Authentication callback | Static deployment compatible secure session exchange active |
| Protected operating workspace | `/workspace` verifies Supabase identity and store membership before rendering the console. Owner sessions require authentication app assurance level two. Unauthenticated visitors return to branded access, and authenticated accounts without membership receive a safe assignment boundary. |
| Protected password reset | Recovery session validation active |
| Supabase production persistence | Readiness submissions live with hardened insert policy and audit trigger, core operating workflows remain preview adapters |
| Full RLS role matrix | Readiness submission roles verified, full operating workflow matrix remains pending |
| Customer recommendation signals | Working interface, pending persisted consented event model |
| Customer measurement profiles | Fresh development schema verified August 28, 2026. Customer owned RLS, accountable write auditing, least privilege grants, account synchronization, portable export, confirmed deletion, and offline recovery are active in development. Production promotion remains blocked pending explicit approval and security verification. |
| Payment evidence | Cash capture and change calculation are active in the checkout preview. Transfer, mobile money and check references accept private photo or PDF evidence with pending staff verification. The private storage schema, validation constraints and payment audit trigger are staged locally pending explicit production approval. |
| Vendor storefront persistence | Fresh production schema verified August 28, 2026 with no drift. Tenant isolated storefront records, owner and manager controls, vendor self management, full create, read, update and removal grants, publication safeguards, and accountable audit triggers are staged locally pending explicit production approval. |
| Atomic checkout persistence | Fresh production schema verified August 28, 2026 with no drift. All migrations apply cleanly in an isolated PostgreSQL 17 environment. The transaction locks requested variants, rejects insufficient stock, calculates prices from database records, creates seller attributed order lines, records cash or pending electronic tender, writes inventory movements and vendor ledger credits, issues a sequential receipt, and records an audit event. Two simultaneous final item purchases produced exactly one sale, one stock movement, and one rejected oversell. Owner access was verified blocked at assurance level one and available at assurance level two. Runtime proof upload cleans up orphaned evidence when checkout fails. Production activation remains pending explicit migration approval and real payment authorization. |
| Owner intelligence actions | Working interface, pending role scoped database persistence |
| Tenant AI enhancement | Zero cost deterministic guidance is active. Gemini first automation and Anthropic fallback remain optional pending credentials, role enforcement, measured usage threshold, and budget approval. |
| Tenant retail policy persistence | Working local tenant adapter, pending production snapshot and database connection |
| Native store signing | Pending Apple and Google credentials |

## Vendor lifecycle boundary

The working preview now exercises the full vendor lifecycle without developer intervention and records each mutation in a tenant keyed browser audit history. This is deliberately not represented as production persistence. Before vendor records control real selling access, the same workflows require authenticated owner and manager authorization, tenant scoped Supabase tables, row level security, database audit triggers, invitation delivery, and revocation tests.

The live schema was checked on August 27, 2026. It already contains RLS enabled `vendors`, `leases`, and `rent_payments` tables, and the Supabase security advisor reported no findings. Production activation still requires Delly's authenticated owner identity, the first Blossom Royall store record, owner membership, approved lease language, signature provider selection, and real vendor data. The missing local `DATABASE_URL` prevents the constitutionally required fresh `pg_dump`, so no new SQL migration was authored.

## Staff operations boundary

The staff workspace now exercises employee roster changes, configurable schedules, breaks, clock activity, leave review, pay planning, persistence, and audit history without developer intervention. Names and rates in the preview are editable sample defaults and do not represent real employees. Pay figures are explicitly estimates and never initiate payroll.

Production activation requires Delly's real employee roster, approved roles and permissions, wage and overtime rules, tax location, payroll provider, time clock policy, leave policy, authenticated manager approvals, tenant scoped row level security, database audit triggers, and employment counsel review. No production employee record, identity invitation, tax calculation, or wage payment is created by this preview.
