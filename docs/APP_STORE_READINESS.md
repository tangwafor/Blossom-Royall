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

10. Capacitor 8.5.0 Android and iOS projects are staged with application identifier `com.blossomroyall.app`, branded launcher and splash assets, portrait orientation, secure transport settings, Android target level 36, iOS deployment target 15, and an Apple privacy manifest.

11. English, French, and Spanish store listing metadata and a submission review data inventory are staged under `store`.

12. Next 16.3.3 and the native dependency tree report zero known npm audit findings as of August 28, 2026.

13. A machine readable submission status, reviewer access plan, store asset manifest, and native submission runbook now make every outstanding Apple and Google requirement explicit. Native structure verification intentionally requires submission readiness to remain false until signed builds and external evidence exist.

## Required before public submission

1. Activate and monitor `privacy@blossomroyall.com`.

2. Implement the reviewed deletion processor that removes or anonymizes eligible personal data while preserving only legally required transaction records.

3. Deploy and activate the staged account deletion worker after production migration approval, secret configuration, and operator review. The worker is disabled by default. Its local database suite verifies due claims, durable retries, cancellation lockout after preparation, private evidence discovery, identity anonymization, atomic authentication deletion, and completion evidence.

4. Compile, test, and sign the staged native projects for Apple and Google. Android compilation still requires a working Java 21 and Android software development kit environment. iOS compilation and signing require macOS, Xcode, and the Apple team credentials.

5. Reconcile the staged Apple privacy manifest after the final native plugins and software development kits are selected.

6. Complete Apple privacy nutrition labels and Google Data safety declarations from the final production data inventory.

7. Confirm the Android target application programming interface required on the actual submission date. New applications must target Android 16, application programming interface level 36, beginning August 31, 2026.

8. Capture the screenshot scenes and exact device sizes declared in `store/asset-manifest.json`. Complete the support URL, privacy URL, deletion URL, age rating, content declarations, and reviewer accounts. Never commit reviewer passwords or multifactor codes.

9. Verify production account hygiene, row level security, endpoint authorization, bundle secret scanning, Supabase advisors, and concurrency stress tests.

10. Record and human review the current captioned multilingual walkthrough before publishing it through branded watch pages.

## Production boundary

The account deletion migrations and processor are staged locally. They have not been applied or deployed to production. Production database and function promotion still require explicit approval.

The controlled activation sequence and approval boundary are maintained in `docs/PRODUCTION_PILOT_APPROVAL.md`.

No application store submission should begin until the controlled pilot is green and the deletion processor, privacy contact, production monitoring, and native signing are complete.
