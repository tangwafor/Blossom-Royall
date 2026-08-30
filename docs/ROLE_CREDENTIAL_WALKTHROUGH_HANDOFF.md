# Role Credential and Walkthrough Handoff

## Release rule

Credentials and walkthroughs travel as one reviewed release package. No recipient receives access until the real backend role checks, real interface click test, credential hygiene check, and human walkthrough review all pass for that exact account.

Passwords must not appear in email, documentation, captions, recordings, or source control. Send the temporary password through an approved separate private channel. Require a password change at first sign in. Owner access also requires multifactor enrollment.

Every walkthrough must use the branded watch page. Do not send a raw recording address. The published recording must show the date, commit, role, detailed or reel edition, caption language, and human reviewer approval.

## Status language

Use only these labels in recipient communication.

1. Ready now means the production account, database permissions, live route, and real interface click test passed.

2. Awaiting business setup means the interface exists but accurate live operation requires an authorized owner decision or real business record.

3. In development means the complete production contract has not passed. Do not describe it as available.

## Delly owner package

### Email subject

Blossom Royall owner access, walkthrough, and decisions needed

### Email body

Hello Delly,

Your Blossom Royall owner access package is being prepared with a private temporary password and a role matched walkthrough. We will send access only after the owner database permissions and live interface click test pass and the walkthrough receives human review.

The walkthrough will show what is ready now, what is awaiting business setup, and what remains in development. Some production configuration cannot be completed accurately until we receive the business answers requested yesterday. These are owner decisions rather than software defects.

Please provide or approve the following:

1. Blossom Royall legal business name, final operating address, timezone, tax jurisdiction, receipt phone, and receipt email.

2. Approved lease language and the rent, deposit, commission, due date, agreement dates, and signing terms for each vendor.

3. Each vendor legal name, public brand name, authorized contact, email, phone, address, tax details, approved logo, category, and signing status.

4. Return, exchange, final sale, refund, layaway, cancellation, alteration, and deposit policies.

5. Pickup, local delivery, shipping, backorder, vendor fulfillment, and customer notification rules.

6. Vendor settlement timing, reserve, minimum payout, fee responsibility, inventory ownership, and approval rules.

7. Staff roster, roles, permissions, wage and overtime rules, breaks, time clock, leave policy, and payroll provider.

8. Final Blossom Collections spelling, catalog, prices, sizes, media rights, storefront content, and publication approval.

9. Approval of the first production store, owner membership, and confirmed vendor records.

Engineering remains responsible for row level security, tenant isolation, database migrations, deployment, payment authorization, monitoring, and release QA. Features that have not passed those controls will remain explicitly marked in development.

When you receive the package, please change the temporary password immediately, enroll multifactor authentication, watch the owner walkthrough, and confirm that the business information shown is correct.

Thank you,

Blossom Royall Platform Team

## Duplex vendor package

### Email subject

Africstyle Fashion vendor access and walkthrough

### Email body

Hello Duplex,

Your Africstyle Fashion vendor access package is being prepared with a private temporary password and a vendor walkthrough. We will send access only after the vendor database isolation test, live interface click test, and human walkthrough review pass.

The walkthrough is limited to the information and actions for your store. It covers your dashboard, stock, products, orders, sales, expected money, rent status, storefront, and help. Owner administration, staff administration, cashier controls, other vendors, and platform controls must not be visible.

The walkthrough will label every area as ready now, awaiting business setup, or in development. It will not present sample figures as live business records.

When you receive the package, please change the temporary password immediately, watch the vendor walkthrough, and confirm your brand name, contact information, catalog, stock, rent terms, and settlement details.

Thank you,

Blossom Royall Platform Team

## Sender checklist

1. Confirm the account email directly with the recipient.

2. Run backend role, tenant isolation, and row level security checks against the production account.

3. Run the credential release test with Playwright against the branded production domain.

4. Confirm that each allowed page is visible and each forbidden page is denied, including a direct address attempt.

5. Record the matching detailed and reel walkthroughs with real interface clicks.

6. Review the picture, narration, side captions, private data, role boundaries, date, and commit.

7. Publish only through the branded watch page after human approval.

8. Send the email and walkthrough address without the password.

9. Send the temporary password through a separate approved private channel.

10. Require password replacement at first sign in and multifactor enrollment for the owner.

11. Record delivery, password replacement, walkthrough review, and recipient acceptance in the release evidence.

## Current delivery boundary

The templates are ready. Delivery is not yet authorized. Current recordings have not been produced because the approved local training account secrets are not configured. The newer application commit is not yet deployed, and production credential release evidence has not yet passed for these exact accounts. No email or password should be sent until those gates are complete.
