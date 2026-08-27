# Online Delivery Architecture

Updated August 27, 2026

## Customer promise

Blossom Royall should offer store pickup, local delivery, and carrier shipping from one checkout. Eligibility and price are calculated from the actual basket, destination, inventory location, package restrictions, fulfillment capacity, and tenant settings. The system must not promise a method or arrival date it cannot fulfill.

## Multi vendor consolidation

One customer order can contain several vendors while still leaving Blossom Royall as one package. Each line is reserved against its physical shelf location after payment authorization. Shared staff pick each vendor item into a consolidation tote, scan it at the packing station, inspect it, and close the parcel only when the packing record matches the order.

If an item is delayed, the rules engine chooses among holding the order within the configured consolidation window, splitting the shipment with an explicit cost owner, offering a revised promise, substituting only with customer consent, or canceling the affected line. Vendor attribution and settlement do not change when items share a parcel.

Shopify documents routing rules that minimize split fulfillments, keep fulfillment in the destination market, or ship from the closest location. Source: https://help.shopify.com/en/manual/fulfillment/setup/order-routing/understanding-order-routing

## Inventory reservation

Checkout creates time limited reservations before capture. Competing attempts to buy the last item must serialize at the database. Successful capture turns the reservation into committed fulfillment. Failed or expired payment releases stock. Picking, packing, cancellation, substitution, return, and loss create inventory movements rather than editing quantities silently.

Inventory is separated into physical stock by location, channel availability, and fulfillment source. An item with zero onsite quantity may remain online sellable when an approved vendor location or warehouse has available stock. A preorder is sellable only against a dated production allocation. Backorders are disabled by default and cannot reuse available quantities already promised to another channel.

Available to sell is calculated independently for onsite checkout, store pickup, local delivery, and carrier shipping. The calculation subtracts reservations, safety stock, damaged and quarantined units, pending transfers, and channel allocations. Online inventory is never represented as physically present in the store unless it has been received and scanned into that location.

## Store pickup

The customer chooses an eligible location and sees a realistic ready time. Staff scan each item into a sealed order, mark it ready, and send a pickup credential. Handoff requires the credential and any tenant configured identity check. A delegate may collect only when the customer records authorization. Expired holds release inventory through an audited workflow.

## Local delivery

Eligibility can use validated postal codes or a driving distance zone. Tenant settings control radius, fee, free delivery threshold, time slots, capacity, blackout dates, restricted items, tips, and signature or photo requirements. Statuses include unfulfilled, picking, packed, ready for courier, courier assigned, picked up, arriving, delivered, attempted, failed, and returned.

Shopify documents local delivery zones, conditional prices, delivery instructions, preparation, and delivery confirmation. Sources: https://help.shopify.com/en/manual/fulfillment/setup/delivery-methods/local-delivery and https://help.shopify.com/en/manual/fulfillment/fulfilling-orders/local-delivery-fulfillment

Uber Direct can quote, dispatch, track, and confirm white label deliveries placed through a merchant application. DoorDash Drive On Demand similarly supports delivery from the merchant's own site. Provider access, pricing, volume thresholds, restricted items, privacy, and service area must be evaluated before activation. Core operations must still support manual dispatch without a paid integration.

Sources: https://developer.uber.com/docs/deliveries/direct/guides/overview and https://merchants.doordash.com/en-us/products/drive-on-demand

## Carrier shipping

The rate request uses validated origin, destination, package size, weight, value, service level, and restrictions. Purchased labels, tracking identifiers, manifests, pickup scans, delivery events, signatures, exceptions, claims, and voids attach to a shipment record. Customer messages link to a branded order page rather than exposing a raw tracking URL as the primary experience.

Every product needs shipping attributes including weight, dimensions, fragility, hazardous classification, temperature needs, value, allowed destinations, package compatibility, and vendor packing responsibility. High value and jewelry thresholds can require signature and insurance.

## Costs and vendor settlement

Delivery revenue and expense remain separate ledger entries. The applicable commercial agreement determines whether Blossom Royall, the customer, a vendor, or a promotion funds packing, label, courier, insurance, signature, redelivery, and return costs. Split shipments require explicit approval when they would exceed the budget or reduce a vendor payout.

## Data model

Core records include fulfillment order, fulfillment line, inventory reservation, route decision, package, package item, shipment, delivery quote, label, tracking event, pickup authorization, custody event, delivery attempt, claim, and delivery cost allocation. All records are tenant scoped and all writes create audit events.

## Release gates

Before live launch, test last item concurrency, reservation expiry, payment success with posting failure, address correction, mixed pickup and shipping, multi vendor consolidation, split shipment fees, restricted products, lost parcels, delivery attempts, partial cancellation, return to sender, duplicate webhooks, stale tracking events, label voids, refunds, and vendor settlement adjustments. Production courier credentials, carrier accounts, payment changes, and webhook secrets require explicit approval.
