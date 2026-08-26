# Cost guardrails

## Launch posture

Blossom Royall starts on low cost infrastructure. The customer experience, tenant operations, recommendations, tests, and deployment checks must be useful before any paid AI or large scale service is introduced.

## Rules

1. Use deterministic recommendation ranking, tenant data, and cached summaries for core personalization. AI may improve copy or analysis after a person asks for it, but it cannot be required to browse, buy, fulfill, manage stock, or operate the mall.
2. Prefer managed free tiers for development and early launch. Monitor usage before upgrading.
3. Add hard per tenant usage limits, request rate limits, and daily AI budget limits before introducing a billable model.
4. Cache generated explanations and briefs. Never repeat identical model work for each page view.
5. Degrade gracefully to explainable rule based insights when an AI provider is unavailable or a budget cap is reached.
6. Store no customer data in an AI request unless consent, tenant policy, and the role scope permit it.

## Initial cost plan

| Capability | Initial choice | Expected launch cost |
| --- | --- | --- |
| Source control and quality automation | GitHub Free private repository | $0 within included usage |
| Database, authentication, storage | Supabase Free during prototype and low traffic launch | $0 while within free allowance |
| Domain | blossomroyall.com, already owned | Existing annual registration only |
| CDN and edge delivery | Cloudflare Free or included site hosting | $0 for early traffic |
| Intelligence | Rule based ranking plus cached summaries | $0 for core workflows |
| Generative assistant | Optional, feature flagged, capped by tenant | $0 until a tenant enables a paid budget |

## Upgrade triggers

1. Upgrade Supabase only when the free project capacity, uptime needs, or backup requirements become a live business risk.
2. Add paid AI only when a tenant approves a spending cap and the workflow demonstrates measurable value.
3. Add paid monitoring only after free logs and alerts no longer meet the operational need.

Pricing changes over time. Recheck provider pricing before any purchase or plan upgrade.
