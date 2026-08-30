# Fleet Release Guard

## Purpose

The fleet release guard detects credential exposure risks, role override seams, missing row level security, missing real account tests, missing sign out, and unproven customer claims before release.

## Commands

Run an audit in the current repository:

```powershell
npm run release:guard
```

Apply deterministic low risk fixes:

```powershell
npm run release:guard:fix
```

Scan a directory containing multiple repositories:

```powershell
node scripts/fleet-release-guard.mjs C:\path\to\projects
```

Add `--json` for machine readable evidence.

## Safety model

Fix mode may qualify known absolute customer claims and wire the guard into prepush. It never invents RLS policies, changes authorization, deletes secrets, creates production accounts, or declares a feature production ready. Those findings remain release blockers until a human reviewed implementation and real tests provide evidence.

## Release rule

A blocker stops credential release and production promotion. Warnings require review. The report identifies the repository, file, rule, and available safe remediation.
