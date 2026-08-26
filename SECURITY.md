# Security policy

## Reporting

Do not file public issues for suspected security vulnerabilities, access problems, customer data exposure, or payment concerns. Report the finding privately to the TaTech platform team with affected route, role, reproduction steps, and any relevant evidence.

## Release requirements

1. Database RLS must protect tenant data independently of the interface.
2. Every server route must validate authentication and tenant membership.
3. Secrets must never enter browser bundles, commits, screenshots, or support logs.
4. Role and cross tenant regression checks must pass before release.
5. New SQL requires a fresh production schema snapshot and a reversible review plan.

## Scope

This policy covers the web application, deployment configuration, Supabase database, tenant data, service integrations, and native mobile release artifacts.
