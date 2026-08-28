# Tenant configuration

## Purpose

Blossom Royall business decisions must be managed by authorized people through the application. Engineers should not edit tenant identity, customer promises, delivery charges, settlement timing, or order numbering in source code.

## Current configuration sections

1. Business Setup controls store identity, legal identity, owner display name, address, receipt contacts, currency, locale, timezone, tax treatment, tax rate, and order prefix.

2. Policy Center controls returns, exchanges, refund destinations, fees, final sale tags, layaway deposits, duration, payment rhythm, grace, cancellation, and inventory holds.

3. Delivery controls enabled channels, service radius, local fee, free delivery threshold, carrier fee, handling, consolidation, routing, signature threshold, vendor fulfillment, and backorders.

4. Shared Commerce controls payout cadence, payout day, return reserve, minimum payout, stock coverage, rebalance proposals, and scan matching.

## Propagation contract

Checkout reads the saved delivery, tax, currency, and policy configuration. Receipt rendering uses the saved store identity and the exact policy active when the order was placed. Customer aftercare reads the order policy snapshot so a later owner edit cannot rewrite a prior customer promise.

## Persistence boundary

The public prototype uses tenant keyed device persistence and synchronizes changes between active screens. Production persistence must use authenticated tenant records, row level security, role checks, and audit events. That database activation begins only after the required fresh production schema dump and Delly identity details are available.

## Engineering boundary

Infrastructure secrets, schema migrations, row level security, payment webhooks, and security controls remain engineering managed. Business configuration belongs in the authorized owner or vendor interface.
