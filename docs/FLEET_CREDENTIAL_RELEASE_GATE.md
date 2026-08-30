# TaTech Fleet Credential Release Gate

Never send, print, email, message, or otherwise share production credentials until the exact account and assigned role pass the credential release gate against the current production candidate.

The gate requires all of the following:

1. Capture a fresh production schema snapshot before new SQL.

2. Run real database tests for row level security, tenant isolation, table grants, storage policies, privileged functions, and forbidden cross role access. Static SQL text checks are supplemental and never count as backend proof.

3. Run frontend browser tests using the exact role. Verify allowed navigation and actions, forbidden navigation and direct routes, persisted identity, data scope, error handling, and logout.

4. Run a live branded domain smoke test using the exact production account after deployment. Confirm the visible name, tenant, role, permitted records, forbidden records, password change or recovery path, and absence of preview data.

5. Require build, type checks, behavior tests, deployment health, and production account hygiene to pass without release blocking findings.

6. Record a credential release evidence report containing date, commit, environment, account identifier without password, role, tenant, test results, known limitations, reviewer, and approval.

7. Clearly identify every incomplete feature before sharing access. Never imply that a preview, staged migration, disconnected payment provider, mock data path, or untested workflow is production ready.

8. Share temporary passwords only through an approved private channel. Never place passwords in source code, commits, screenshots, videos, logs, test reports, chat transcripts, or email bodies. Require a password change at first sign in and rotate credentials if exposure is suspected.

Any missing evidence, failed authorization check, stale deployment, unapproved production migration, or unresolved security finding blocks credential release.
