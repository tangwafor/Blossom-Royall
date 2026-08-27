# Internal Concept Access

Updated August 27, 2026

## Current contract

The marketplace concept at `/concept` is an internal engineering and product document. It is available in local development so authorized Blossom Royall builders can understand the operating model.

The public static deployment must not contain the route, its HTML, or its route specific assets. `npm run build:sites` removes the concept output before assembling `dist`.

Search engine metadata is a secondary privacy measure. It is not access control.

## Remote access contract

Do not publish this document remotely until the application has a server backed authorization boundary.

Remote access requires all of the following:

1. A verified Supabase session.
2. An active store membership for the requested tenant.
3. An allowed internal role, initially owner or manager. A dedicated engineer role should be added before external engineering collaboration.
4. Server side authorization before the document body is rendered or returned.
5. An audit event containing the user, tenant, route, time, decision, and request correlation identifier.
6. Session expiry, revocation, sign out, and membership removal tests.
7. A response that does not cache private content in a shared cache.

Client side hiding, unlisted URLs, query string passwords, search blocking, and confidentiality labels do not satisfy this contract.

## Public vendor presentation

The vendor presentation must be a separate route and separate content source. It may describe approved outcomes, but it must not reuse internal architecture, algorithms, financial formulas, security controls, unapproved vendor data, or roadmap commitments.
