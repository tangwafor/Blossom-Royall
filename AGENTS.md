# Blossom Royall Engineering Constitution

## Communication rules

1. Never use dashes in writeups. Use clear paragraphs, headings, numbering, commas, colons, tables, or spacing instead.

## Product release contract

1. Support light and dark themes with a persisted user toggle.
2. Build mobile first and ship an installable offline PWA. Cache core flows, queue offline writes, and sync after reconnect.
3. Treat localization as part of done. Every user facing string must use the localization system.
4. Deliver polished branded UX, back navigation on every subpage, no dead ends, and an in app guided tour.
5. Provide a renameable tenant AI assistant named for the owner, aware of tenant policy, role scoped, with Anthropic fallback.
6. Require behavior tests before release. Next.js uses Playwright against real routes with role based locators, persistence assertions, and every button coverage. Wire the suite into the pre push gate. Type checks and builds alone are insufficient.
7. Maintain a captioned multilingual voice walkthrough for the live app in detailed and reel editions. The picture settles before narration. Stamp each recording with date and commit. Block stale uploads. Publish only after human review.
8. Maintain in app help and a documentation site with every patch.
9. Keep the platform console separate and restricted to platform admins. No self promotion. Impersonation requires an audit record and permanent visible banner. Never use the word god in user facing copy.
10. Include error tracking, synthetic monitors, metrics, and alerts.
11. Maintain canonical page and API inventories plus a brief tab.
12. Apply tenant branding to the application, PWA icon, and printables. Display Powered by TA Tech. Printed documents use the tenant logo in the header and the TaTech logo and motto in the footer. The exact motto is: Is not where you have been but where you are going. Never use em dashes.
13. Use database snapshots, development first, RLS enforcement, and a fresh dump before new SQL.
14. Enforce least privilege and privacy in the database. Every entity requires full create, read, update, and remove workflows.
15. Do not hardcode tenant configurable lists. Ship editable defaults.
16. Enforce white label tenant isolation. Only Powered by TA Tech sits above the tenant brand.
17. Use an editable AI onboarding questionnaire to seed tenant knowledge.
18. Provide channels, threads, reactions, mentions, search, slash commands, WhatsApp and SMS bridges, AI persona, and automatic translation.
19. Use smart forms with controlled lists, currency prefixes, country pickers, and address autocomplete.
20. Require build, development click through, current docs, fresh SQL dump, trigger smoke tests, information schema checks, security invoker view grants, and production account hygiene before release.
21. Support metric and imperial units with tenant default and edge conversion.
22. Block release on any RLS, tenant isolation, endpoint authorization, bundle secret, Supabase advisor, or concurrency stress finding.
23. Maintain public sales material and internal technical documentation.
24. Automate business workflows through tested database triggers and a secret gated automation runner using Gemini first.
25. Use branded product domains with docs and watch subdomains. Do not expose raw hosting provider domains.
26. Handle Supabase auth through returned errors, localized auth messages, password visibility controls, branded reset email, explicit redirect, protected reset routes, production site URL, and branded SMTP.
27. Use canonical share buttons and branded watch pages with social player metadata. Never publish a raw video URL.
28. TaTech authentication styling is mandatory. Tenant branding remains primary. Login must include Powered by TA Tech, the exact approved motto, premium visual treatment, localization, accessible controls, password visibility, branded recovery, and safe returned error handling.
29. Cost discipline is mandatory. The core product must remain useful on free or very low cost infrastructure. No paid AI call may be required for a core customer, staff, vendor, or owner workflow. Paid services require a measured usage threshold, a budget cap, and an explicit business case.

## Mission

Build a premium, mobile-first mall operating system that replaces disconnected POS, inventory, vendor, rent, workforce, messaging, document and ecommerce tools.

## Non-negotiable UX rules

1. Never ask for information the system can infer, scan, calculate or generate.
2. Every workflow must work end-to-end; no dead demo buttons in completed features.
3. Mobile-first, touch-friendly, fast and calm. Luxury retail, not enterprise back-office software.
4. One shared source of truth for customer, product, vendor, sale, payment, staff, lease and document data.
5. AI is embedded contextually, not hidden in a generic chatbot.
6. Every write creates an audit record.
7. Database RLS is mandatory; UI hiding is never considered security.

## Primary roles

owner, manager, staff, vendor, customer

## Critical vertical slices

- Customer browse -> My Fit -> cart -> checkout/layaway -> receipt -> fulfillment -> inventory/vendor attribution.
- Vendor invite -> onboarding -> lease -> e-sign -> rent/deposit -> receipt -> inventory -> storefront.
- Staff hire -> permissions -> schedule -> clock in/out -> hours -> payroll estimate.
- Sale -> vendor ledger -> stock -> customer history -> analytics -> AI recommendation.

## Production safety

Agents may autonomously edit code, run tests and create preview deployments. Require explicit approval for production DB migrations, destructive operations, DNS changes, secrets, payment webhook changes and production promotion.
