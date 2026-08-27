# Shared Commerce Architecture

Updated August 27, 2026

## Reference model

The likely Woodbridge reference is The Square at Potomac Mills, a vendor marketplace that offers flexible retail space to small businesses and presents many brands inside one marketplace. Public sources confirm the marketplace and vendor directory, but do not disclose its private checkout or settlement implementation.

Sources: https://sites.google.com/view/thesquareatpotomacmills/home and https://www.simon.com/brand/the-square

## Required invariant

A customer may pay once for products from several vendors, but every sale line must resolve to exactly one tenant, vendor, product variant, physical inventory unit or quantity, tax treatment, commercial agreement, fulfillment owner, and policy snapshot before payment is accepted.

## Checkout transaction

1. Scan GTIN, UPC, EAN, or a tenant issued internal barcode.
2. Resolve the code inside the current tenant. Duplicate or ambiguous codes block checkout.
3. Snapshot price, tax, discount funding, commission, vendor ownership, return rule, and payout rule on the sale line.
4. Authorize one customer payment.
5. In one database transaction, create the sale, sale lines, tender, tax allocations, inventory movements, vendor ledger entries, platform revenue entries, and audit events.
6. Use one idempotency key for payment and posting so retries cannot double sell or double credit a vendor.
7. Print and send one receipt with every item visibly attributed to its seller.

GS1 identifies the GTIN and barcode as the standard foundation for unique retail product identity. Source: https://www.gs1.org/industries/retail

## Vendor ledger

The vendor ledger is append only. Entries include sale credit, vendor funded discount, commission, rent offset where contractually permitted, tax responsibility, payment processing allocation, return debit, dispute reserve, adjustment, payout, and payout reversal. Corrections create compensating entries instead of rewriting history.

Available balance equals settled sale credits, less fees, refunds, disputes, reserves, prior payouts, and approved adjustments. A payout batch must balance to the sum of its vendor ledger entries before release.

## Payments and payouts

For a basket containing multiple vendors, Stripe documents separate charges and transfers as the Connect pattern that can transfer portions of one platform charge to multiple connected accounts. Stripe also supports payout schedules and minimum balances. The final funds flow, merchant of record, tax responsibility, reserves, refunds, disputes, and fees require legal and accounting confirmation before production activation.

Sources: https://docs.stripe.com/connect/charges and https://docs.stripe.com/connect/marketplace/tasks/payout

Production controls must include connected account onboarding, identity and bank verification, payout schedule, minimum payout, negative balance policy, rolling return reserve, reconciliation approval, webhook idempotency, dispute evidence, failed payout handling, account closure, and immutable statements.

## Inventory autonomy

Stock is never merely overwritten. Every change is an inventory movement with reason, quantity, origin, destination, actor, source event, and timestamp. States include expected, received, available, reserved, sold, return expected, quarantined, damaged, transfer proposed, in transit, and returned to vendor.

Sales reduce available inventory at the selling location. Returns remain quarantined until inspected. Rebalance automation calculates cover days from recent demand, lead time, safety stock, event demand, shelf capacity, size gaps, and vendor constraints. It creates proposals. Human approval is required until accuracy and contract authority justify bounded automation.

Shopify and Square both document location based inventory and explicit transfer workflows. Sources: https://help.shopify.com/en/manual/sell-in-person/shopify-pos/inventory-management/transfers-between-locations/create-transfer-between-locations and https://squareup.com/help/us/en/article/8254-transfer-stock-between-locations-with-square-for-retail

## Unstaffed vendor operation

Vendors do not need to remain onsite when the shared team can sell, receive, count, display, fulfill, and return items under documented permissions. The system must give vendors remote visibility into stock, sales, returns, settlements, tasks, policy exceptions, messages, and audit history. Physical controls still require trained shared staff, cameras consistent with law and posted policy, secure high value storage, cycle counts, opening and closing checks, exception queues, and documented custody transfers.

## Release gates

Do not activate real payouts until database RLS, tenant isolation, webhook authorization, ledger balancing, concurrent last item sales, duplicate scans, split tender refunds, partial returns, chargebacks, negative vendor balances, payout retries, reconciliation, and production account hygiene all pass. Production payment changes require explicit approval.
