# Auth And Environment

## Hosted (`api.firecrawl.dev`)

```dotenv
FIRECRAWL_API_KEY=fc-...
```

## Self-hosted (this fork / any self-host)

```dotenv
FIRECRAWL_API_URL=http://localhost:3002
# or Tailscale / LAN, e.g. http://cornelius:3002
```

Guidelines:

- Never hardcode secrets in source files.
- Prefer `.env` or the deployment platform's secret manager.
- Only set `FIRECRAWL_API_URL` when not using `https://api.firecrawl.dev`.
- With this fork’s default `USE_DB_AUTHENTICATION=false`, an API key is **optional** for self-host. Cloud still needs `FIRECRAWL_API_KEY`.
- CLI: `firecrawl --api-url http://localhost:3002 scrape https://example.com` (auth skipped for non-cloud URLs).
- If the user needs interactive cloud authorization, follow `firecrawl-build-onboarding`.
- Operating / deploying this monorepo: see `firecrawl-selfhost`, `firecrawl-selfhost-llm`, `firecrawl-selfhost-deploy`.
