# Blossom Royall App Store Readiness

Verified August 28, 2026.

## Current release posture

Blossom Royall is preparing for a controlled web pilot before native store submission. The web application remains the authoritative product. Native packaging, signing, store metadata, reviewer access, and human reviewed media are not complete.

## Implemented locally

1. A public privacy policy route is available at `/privacy`.

2. A public account deletion entry route is available at `/account/delete`.

3. Authenticated users can initiate and cancel an audited deletion request.

4. Requests are scheduled for completion within seven days.

5. A sole store owner cannot request deletion until ownership is transferred.

6. Account deletion records use row level security. Anonymous function execution is denied.

7. English, French, and Spanish copy is available for privacy and deletion flows.

8. Desktop and mobile behavior tests cover the public routes and secure identity boundary.

9. A scheduled zero cost synthetic monitor checks the branded workspace, privacy and deletion routes, PWA assets, certificate path, expected content, and security headers every six hours. Failures create or update a GitHub incident.

## Required before public submission

1. Activate and monitor `privacy@blossomroyall.com`.

2. Implement the reviewed deletion processor that removes or anonymizes eligible personal data while preserving only legally required transaction records.

3. Add an operator queue, completion evidence, and overdue deletion request monitoring. The public route synthetic alert is staged locally.

4. Complete native packaging and signing for Apple and Google.

5. Add the Apple privacy manifest when the native shell and its final software development kits are selected.

6. Complete Apple privacy nutrition labels and Google Data safety declarations from the final production data inventory.

7. Confirm the Android target application programming interface required on the actual submission date. New applications must target Android 16, application programming interface level 36, beginning August 31, 2026.

8. Prepare store descriptions, screenshots, support URL, privacy URL, deletion URL, age rating, content declarations, and reviewer credentials.

9. Verify production account hygiene, row level security, endpoint authorization, bundle secret scanning, Supabase advisors, and concurrency stress tests.

10. Record and human review the current captioned multilingual walkthrough before publishing it through branded watch pages.

## Production boundary

The account deletion migration is staged locally. It has not been applied to production. Production database promotion still requires explicit approval.

The controlled activation sequence and approval boundary are maintained in `docs/PRODUCTION_PILOT_APPROVAL.md`.

No application store submission should begin until the controlled pilot is green and the deletion processor, privacy contact, production monitoring, and native signing are complete.
