# Owner and Vendor Operating Model

## Owner board

The owner board is the administrative home for the complete mall operating system. It routes to checkout, cash control, orders, products, vendors, rent, shared commerce, delivery, staff, policies, business setup, and intelligence.

The owner may manage tenant identity, vendor activation, permissions, leases, rent confirmation, public brand approval, policies, refunds, payouts, staff permissions, registers, and operating exceptions. Every production write must remain tenant scoped and audited.

## Vendor board

The vendor board is the administrative home for one authorized vendor. It consolidates attributed sales, the vendor catalog, variant stock, relevant orders, rent, and approval status. It refreshes production data every fifteen seconds and allows a manual refresh without substituting preview records after an error.

Vendor visibility is determined by database RLS and vendor ownership. The interface is not the security boundary.

## Vendor controlled work

1. Maintain product and variant drafts.
2. Propose stock changes.
3. Maintain storefront and brand drafts.
4. View seller attributed order value and relevant fulfillment state.
5. Submit rent payment evidence.
6. Respond to owner requests and correct rejected submissions.

## Owner consent required

1. Activate or suspend a vendor.
2. Approve public storefront branding.
3. Publish products when tenant policy requires review.
4. Change mall wide policies or fees.
5. Approve lease terms and rent payment status.
6. Approve refunds, payouts, and settlement exceptions.
7. Grant permissions or access customer private information.

## Current production boundary

Vendor read isolation and rent submission are active in production. The owner and vendor board interface is implemented locally. Vendor order attribution is staged in migration `20260830093000_vendor_order_summary_boundary.sql` and must not be represented as active until explicit production approval, migration verification, and real credential tests pass.

Production product editing, storefront draft submission, stock proposal approval, vendor fulfillment updates, refunds, payouts, and settlements remain in development. Each must receive a protected database workflow and real role test before its control is enabled.
