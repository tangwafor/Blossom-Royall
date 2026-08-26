# Blossom Royall

Blossom Royall is a premium mall operating system for elegant customer discovery, tenant commerce, vendor performance, mall operations, and explainable intelligence.

## Product direction

1. Customers receive helpful, explainable, consent aware recommendations and complete control over their preferences.
2. Owners see demand, brand performance, inventory risk, and accountable actions in one place.
3. Staff, vendors, and customers work through role scoped experiences backed by tenant isolation.
4. The visual standard is luxury retail: calm, fast, branded, accessible, and excellent on mobile.

## Local development

1. Copy `.env.example` to `.env.local` and set the public Supabase configuration.
2. Run `npm install`.
3. Run `npm run dev -- --hostname 127.0.0.1 --port 3002`.
4. Open `http://127.0.0.1:3002/welcome` for the public entrance or `http://127.0.0.1:3002` for the operating preview.

## Quality contract

Run these before a checkpoint or release:

1. `npm run typecheck`
2. `npm test`
3. `npm run build`

Playwright covers rendered desktop and mobile behavior. A build alone never qualifies a release.

## Application entry points

| Route | Purpose |
| --- | --- |
| `/welcome` | Branded public mall entrance |
| `/auth` | Branded account access and recovery |
| `/` | Owner and staff operating system preview |

## Data and security

1. Secrets remain only in ignored local environment files or an approved secret manager.
2. Tenant data must be isolated through PostgreSQL RLS before live data is connected.
3. A fresh production schema snapshot is required before any database SQL change.
4. Every new workflow needs role scoped behavior tests and documented release evidence.

See [AGENTS.md](AGENTS.md), [ROADMAP.md](ROADMAP.md), and [docs/CANONICAL_INVENTORY.md](docs/CANONICAL_INVENTORY.md).
