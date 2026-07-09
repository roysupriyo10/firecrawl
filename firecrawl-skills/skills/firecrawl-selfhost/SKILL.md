---
name: firecrawl-selfhost
description: >
  Umbrella skill for self-hosting this Firecrawl monorepo fork (roysupriyo10/firecrawl).
  Use when operating or changing the self-hosted stack, Playwright microservice,
  MODEL_PROVIDER, or multi-machine GHCR deploy. Prefer sibling skills for scrape,
  LLM, or deploy details.
license: ISC
metadata:
  author: roysupriyo10
  version: "0.1.0"
  homepage: https://github.com/roysupriyo10/firecrawl/tree/main/firecrawl-skills
---

# Firecrawl Self-Host (monorepo)

Skills and code live in the **same** repo. Do not assume a separate skills package or submodule.

## Monorepo layout

- `apps/api` — API + workers (`scrapeURL`, transformers, `getModel` / `getModelExact`)
- `apps/playwright-service-ts` — self-host browser engine (screenshot + branding CDP)
- `apps/*-sdk` — SDKs
- `firecrawl-skills/` — these agent skills
- `scripts/deploy-selfhost.sh` — build/push/pull/up against **your** registry
- `SELF_HOST.md` — env template + deploy notes
- `AGENTS.md` / `CLAUDE.md` — agent invariants for this checkout

## Client vs cloud

| | Cloud (`api.firecrawl.dev`) | This self-host |
| --- | --- | --- |
| Base URL | default SDK / CLI | `FIRECRAWL_API_URL=http://localhost:3002` (or Tailscale host) |
| API key | required | optional when `USE_DB_AUTHENTICATION=false` |
| Screenshot / branding | fire-engine / chrome-cdp | Playwright microservice |
| LLM | Firecrawl-managed | `MODEL_PROVIDER` + provider API keys in `.env` |

## Invariants (do not regress)

1. Requested `screenshot` or `branding` → field present **or** hard error (`SCRAPE_SCREENSHOT_FAILED` / `SCRAPE_BRANDING_FAILED`). Never soft-success with warn-only missing fields.
2. LLM extract uses `getModel()`; `MODEL_PROVIDER` overrides call-site providers. Specialty multi-provider paths use `getModelExact()`.
3. Deploy images go to `$FIRECRAWL_REGISTRY` (e.g. `ghcr.io/roysupriyo10`), never `ghcr.io/firecrawl`.
4. Queue default is Postgres (`nuq-postgres`). FoundationDB is optional (`NUQ_BACKEND=fdb`) and not required for normal self-host.

## Route to sibling skills

- Screenshot / branding / Playwright → [firecrawl-selfhost-scrape](../firecrawl-selfhost-scrape/SKILL.md)
- Gemini / `MODEL_PROVIDER` → [firecrawl-selfhost-llm](../firecrawl-selfhost-llm/SKILL.md)
- GHCR / Buildx / compose → [firecrawl-selfhost-deploy](../firecrawl-selfhost-deploy/SKILL.md)

## Official Firecrawl skills

This directory **vendors** the official build skills and patches them for self-host.
One install covers both:

```bash
npx skills add ./firecrawl-skills
```

Do not require a second `npx skills add firecrawl/skills` for this fork.
