# Established Mall Retail Research

Updated August 26, 2026

## Scope and identity note

The grand opening video shows nine established businesses on The Mall at Prince George's exterior directory. They are useful operating benchmarks, but the video does not establish them as Blossom Royall vendors. The confirmed Blossom Royall roster remains documented separately in `SIGNED_VENDOR_RESEARCH.md`.

## Executive findings

The most transferable lesson is a rules engine, not a single generous return window. Established retailers vary eligibility by sales channel, seller, merchandise category, condition, proof of purchase, payment method, loyalty tier, fulfillment method, and elapsed time. Blossom Royall should model those dimensions as tenant editable data and preserve the vendor responsible for every item.

The second lesson is that stores create repeat visits through convenience. Pickup, curbside handoff, easy in store returns, stored receipts, rewards, wish lists, new arrival alerts, appointment services, and fast issue resolution all bring customers back.

The third lesson is that a mall marketplace needs explicit boundaries. Target Plus, Ulta Beauty Marketplace, and Old Navy partner products use seller specific return paths. Blossom Royall must show who sold and fulfilled each item, calculate vendor settlements after refunds, and prevent one vendor from viewing another vendor's customers or financial records.

## 1. Primark

### Operating model

Primark is a value fashion, beauty, and home retailer built around frequent in store discovery. In the United States its website supports browsing and local stock checking, but not online ordering or Click and Collect. The site is refreshed with new collections and directs demand to physical stores.

### What Blossom Royall should learn

1. Treat the store visit as an experience, not merely a transaction.
2. Offer a reliable local availability indicator even before full ecommerce fulfillment is enabled.
3. Publish frequent new arrival edits and outfit stories that create urgency without misleading stock claims.
4. Let each tenant choose whether an item is browse only, reserveable, pickup eligible, shippable, or available for layaway.

Source: https://www.primark.com/en-us/a/inspiration/the-lowdown/ordering-online

## 2. Marshalls

### Operating model

Marshalls uses an off price treasure hunt model in which local assortments vary. Its ecommerce experience supports order history, saved addresses and payments, new arrival alerts, shipping, paperless return barcodes, and free returns to a Marshalls store. Current policy distinguishes online orders from store purchases, with a 40 day online window and a 30 day store window. Late, gift receipt, no receipt, gift card, and some PayPal returns can become merchandise credit. It does not generally offer store pickup.

### What Blossom Royall should learn

1. Support unique store inventory rather than pretending every location carries the same products.
2. Generate a scannable return credential that can be saved for weak connectivity.
3. Configure refund destination by receipt status, tender, gift status, and return timing.
4. Encourage consolidated returns and preserve packaging identifiers for faster receiving.
5. Make comparison pricing auditable and require a basis for every reference price.

Sources: https://www.marshalls.com/us/store/jump/topic/Returns/6500009p and https://www.marshalls.com/us/store/jump/topic/Find-Help/Our-Product/2400009

## 3. Ross Dress for Less

### Operating model

Ross concentrates on physical off price retail. Its published policy provides original tender refunds for unused, unworn, unaltered merchandise with an original receipt within 30 days. Older and non receipted returns may receive store credit. Non receipted activity is identity verified and subject to fraud controls. Category exceptions include ticket requirements for swimwear and lingerie, final sale mattresses, and restricted software returns.

### What Blossom Royall should learn

1. Make condition and alteration state first class return inspection fields.
2. Configure category exceptions and required tags from the admin interface.
3. Add privacy conscious fraud controls with reason codes, access limits, retention periods, and an appeal path.
4. Require the original tender where policy demands it, while handling split tender refunds correctly.

Sources: https://www.rossstores.com/contact-us/ and https://investors.rossstores.com/static-files/2906e801-2264-4084-92c2-2677510d62f4

## 4. TJ Maxx

### Operating model

TJ Maxx combines off price discovery with ecommerce. One account spans TJ Maxx, Marshalls, and HomeGoods, and eligible rewards can be shared across that family. It offers local store returns for online purchases, order history, new arrival communication, and a limited ship to store test in selected markets. High value and oversized shipments can require signatures.

### What Blossom Royall should learn

1. Use one customer identity and cart across all participating vendors while keeping vendor ledgers separate.
2. Provide a tenant wide rewards wallet with transparent vendor funding and redemption allocation.
3. Pilot fulfillment features by location and vendor instead of enabling them globally.
4. Configure signature, insurance, or manual review thresholds for high value orders.

Sources: https://tjmaxx.tjx.com/store/account/login.jsp and https://tjmaxx.tjx.com/store/jump/topic/free-ship-to-store/18400010p

## 5. Ulta Beauty

### Operating model

Ulta connects retail products, beauty services, rewards, store pickup, curbside pickup, same day partners, and a third party marketplace. Pickup orders placed by the local cutoff can be ready within two hours. Its current return rules distinguish original tender refunds within 30 days, merchandise credit during days 31 through 60, marketplace seller returns, delivery marketplace returns, and Ulta Beauty at Target purchases. Rewards earned on returned products are reversed and redeemed points are restored proportionally.

### What Blossom Royall should learn

1. Combine products with bookable styling, fitting, tailoring, and consultation services.
2. Maintain an item level seller of record and fulfillment owner.
3. Reverse earned rewards and restore redeemed rewards proportionally on partial returns.
4. Support pickup delegates with explicit authorization and identity verification.
5. Separate return policies for owned inventory, vendor fulfilled inventory, and external channel purchases.

Sources: https://www.ulta.com/guestservices/ways-to-shop/pickup and https://www.ulta.com/guestservices/all

## 6. Target

### Operating model

Target uses stores as fulfillment hubs for free order pickup, Drive Up, Drive Up returns, shipping, and paid same day delivery. Pickup is commonly ready within two hours. Its return engine varies rules by owned brand, marketplace partner, merchandise category, payment product, and loyalty membership. Target Circle provides free loyalty, a payment card layer, and a paid convenience membership.

### What Blossom Royall should learn

1. Maintain one inventory reservation state machine for picking, ready, collected, expired, substituted, canceled, and returned.
2. Offer arrival check in and delegated pickup without requiring a native app for the core flow.
3. Separate free loyalty from optional paid convenience benefits.
4. Allow vendor specific substitutions only with customer consent.
5. Start return requests from order history and expose the exact deadline before submission.

Sources: https://www.target.com/help/articles/delivery-options/drive-up-order-pickup, https://www.target.com/help/articles/returns-exchanges/returns, and https://corporate.target.com/about/products-services/pickup-delivery

## 7. Old Navy

### Operating model

Old Navy combines broad family fashion, promotional events, rewards, fit guidance, pickup, shipping, and a shared Gap family account and cart. Its standard published return window is 30 days. Partner seller products follow a separate mail return route. Pickup orders are held for five days, with customer or authorized delegate identity checks.

### What Blossom Royall should learn

1. Enable cross vendor baskets with a clear split by seller, fulfillment, policy, and settlement.
2. Add family profiles, saved fits, size guidance, and gift oriented shopping.
3. Make promotions composable with funding source, stacking, exclusions, usage limit, start, and expiry controls.
4. Configure pickup hold duration and automatic release of reserved stock.
5. Keep partner seller returns separate while presenting one calm customer interface.

Sources: https://oldnavy.gap.com/customerService/info.do?cid=82724, https://oldnavy.gap.com/customerService/info.do?cid=82725, and https://oldnavy.gap.com/customerService/info.do?cid=3019

## 8. Macy's

### Operating model

Macy's blends department store assortment, services, loyalty tiers, store pickup, curbside pickup, same day delivery, ship to store, and UPS Access Point delivery. Local inventory powers same day fulfillment. Most returns are accepted within 30 days, with exceptions by category and condition. Star Rewards membership influences shipping and return shipping benefits.

### What Blossom Royall should learn

1. Build occasion led shopping journeys that combine products from several vendors into one styled look.
2. Support tiered loyalty without locking essential workflows behind payment.
3. Add high value delivery controls, pickup deadlines, alternate collectors, and courier handoff evidence.
4. Make shipping benefits and return fees tenant configurable, with a clear cost owner.
5. Offer registries, gift receipts, digital gift cards, appointments, and alteration status as connected records.

Sources: https://www.macys.com/customer-service/articles/what-are-my-delivery-shipping-options-at-macys, https://www.macys.com/customer-service/articles/store-pick-up-information, and https://customerservice-macys.com/articles/what-is-macys-return-policy

## 9. The UPS Store

### Operating model

The UPS Store is a neighborhood service hub for packing, shipping, printing, mailboxes, document services, and returns. UPS Happy Returns supports box free, label free returns with a QR code, item verification, consolidated reverse logistics, and immediate initiation of refunds for participating merchants.

### What Blossom Royall should learn

1. Generate QR based return authorization and scan every received item.
2. Consolidate vendor returns while maintaining item level custody and routing.
3. Record handoff events, carrier, tracking, photographs, condition, weight, and responsible staff member.
4. Offer optional paid packing, delivery, alteration shipment, and gift preparation services.
5. Keep the return portal integration independent so logistics providers can change by tenant or location.

Sources: https://www.ups.com/us/en/ups-happyreturns, https://www.ups.com/us/en/business-solutions/simplify-returns, and https://www.ups.com/us/en/the-ups-store/store-services

## Blossom Royall capability blueprint

### Policy engine

Each rule should be tenant editable and may inherit from tenant default to vendor, category, product, channel, or promotion override. Required fields include effective dates, return window, window starting event, condition, tags, receipt requirement, alteration state, final sale reason, refund destination, exchange eligibility, fee, restocking charge, shipping responsibility, approval threshold, and jurisdiction note. Rules applied at checkout must be snapshotted on each sale so later policy edits do not rewrite past promises.

### Unified commerce

Support one customer account, one cross vendor cart, item level seller attribution, split tender, vendor funded promotions, reservations, pickup, delegated pickup, shipping, local delivery, layaway, gift receipts, store credit, returns, exchanges, and fulfillment exceptions. Every state change needs an audit event and an idempotent inventory and ledger update.

### Customer retention

Add saved fits, family profiles, wish lists, back in stock alerts, new arrival alerts, occasion boards, appointments, service history, rewards, referrals, registries, and personalized recommendations. Core shopping must remain useful without a paid membership or paid AI call.

### Vendor and tenant controls

Every configurable list must be editable from the UI. Tenant identity must scope customers, vendors, policies, rewards, inventory, orders, payments, files, messages, and reports. Vendor roles may access only their inventory, orders, customers where permitted, returns, statements, and policies. Platform administration remains isolated.

### Recommended delivery order

1. Persist tenant, vendor, product, category, and channel policy rules in the database with RLS and policy snapshots on sales.
2. Complete cross vendor cart, seller attribution, split settlement, return reversal, and audit invariants.
3. Add digital receipts, scannable return authorization, inspection, disposition, and vendor routing.
4. Add inventory reservation and pickup with expiry, delegate, arrival, handoff, and offline scanning.
5. Add layaway schedules, deposits, grace rules, cancellation, reminders, partial refunds, and inventory holds.
6. Add rewards accounting, gift cards, store credit liabilities, promotions, and proportional return adjustments.
7. Add services, appointments, alterations, saved fits, registries, and occasion styling.
8. Add shipping and local delivery adapters only after costs, thresholds, and tenant budgets are measurable.

## Research limits

Policies and prices can change. Product implementation should store verified effective dates and jurisdiction notes rather than hardcoding the examples above. Public website behavior does not reveal private staffing, procurement, fraud scoring, or vendor contract terms. Those areas require direct operational interviews and legal review.
