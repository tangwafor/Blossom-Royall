# Native Submission Runbook

Updated August 28, 2026.

## Current result

The native source package is structurally ready, but neither store submission is ready. The authoritative machine readable status is in `store/submission-readiness.json`. A false value is a release blocker and must be supported by evidence before it changes to true.

The latest local native build result is recorded separately in `store/native-build-evidence.json`. A successful debug build proves compilation only. It does not satisfy production signing, physical device testing, closed testing, TestFlight, or store submission requirements.

## Local completion sequence

1. Promote and verify the controlled production pilot using the separately approved production process.

2. Create stable customer and owner reviewer accounts. Seed only fictional review data. Store credentials and multifactor instructions only in App Store Connect and Play Console.

3. Capture the real application on supported physical devices or official simulators. Use the scenes in `store/asset-manifest.json`. Remove personal information and obtain human review.

4. Build an Android App Bundle with Java 21 and the Android software development kit. Sign it with a protected upload key, test the release build on a physical device, and preserve the bundle checksum as release evidence.

5. Build an iOS archive on macOS with the current Xcode release. Configure the Apple team, distribution signing, and provisioning. Test the archive through TestFlight on iPhone and iPad, then preserve the archive and TestFlight build evidence.

6. Reconcile `store/privacy-data-inventory.json` against the exact release build, Supabase, Netlify, payment handling, diagnostics, and every selected native plugin. Complete Apple App Privacy and Google Data safety responses from that reviewed inventory.

7. Verify the public privacy URL, support path, and account deletion URL on the branded domain. Activate and monitor the privacy mailbox.

8. Complete age, content, advertising, target audience, financial feature, app access, encryption, export, and regional trader declarations in the store consoles.

9. Submit first to closed testing. Resolve device, accessibility, policy, crash, privacy, and reviewer access findings before requesting public review.

## Evidence required to change readiness values

Each completed value needs a dated evidence record containing platform, application identifier, version, build number, source commit, operator, device or simulator, result, and artifact checksum where applicable. Evidence must not contain passwords, authentication codes, private keys, or customer information.

## Approval boundary

Creating store records and preparing local assets is safe. Uploading signed builds, changing production services, activating secrets, or submitting for public review requires the applicable account access and the explicit production approval already required by the engineering constitution.
