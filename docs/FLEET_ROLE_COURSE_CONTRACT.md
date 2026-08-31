# Fleet Role Workflow Course Contract

## Purpose

Every TaTech role walkthrough is a product course, release test, and proof of working software. A menu tour is not training evidence. A recording that only proves a tab opens must fail review.

## Required coverage

1. Maintain one detailed course for every authorized role.

2. Open every authorized surface and exercise every meaningful control, form, signature, approval, rejection, handoff, and recovery path assigned to that role.

3. Explain what the person is doing, why it matters, what information belongs in the control, and what visible result confirms success.

4. Assert the matching backend state after every create, update, removal, payment, signature, inventory, permission, and status action.

5. Assert cross role reconciliation. The value or state shown to one role must match the value or state shown to every authorized counterpart.

6. Exercise real authentication, MFA, RLS, tenant isolation, and endpoint authorization without exposing credentials, setup keys, QR codes, tokens, or private records.

7. Clearly label each feature as production ready, awaiting tenant setup, preview, blocked, or in development. Never narrate an incomplete feature as working.

8. Keep narration continuous enough to teach the task. The picture settles before speech, remains on the relevant action until speech finishes, and changes only when the next spoken instruction begins.

9. Write a failed manifest and return a nonzero exit for missing controls, dead buttons, incorrect routes, incorrect headings, permission leaks, backend mismatches, narration drift, privacy failures, or cleanup failures.

10. Fix the application or verified expectation, then rerun the complete affected course. Never edit failed footage into an apparent pass.

## Release evidence

1. Detailed courses are the canonical evidence.

2. Reel editions may be derived only from a passing detailed course and must not imply broader coverage.

3. Every artifact records the branded production domain, date, commit, role, edition, locale, voice, UI assertions, backend assertions, cleanup result, and human reviewer status.

4. Stale, silent, superficial, synthetic looking, uncaptioned, unreviewed, or raw hosting links block publication.

5. Publish only through the branded watch surface after human approval.

## Required repository wiring

1. Provide a role course recorder under `scripts`.

2. Provide a static verifier for the course contract.

3. Wire the verifier into the pre push gate.

4. Keep this contract or an application specific runbook that includes every requirement above.

5. Represent backend assertions explicitly in the recorder so the fleet release guard can verify that UI only navigation is not being presented as end to end evidence.
