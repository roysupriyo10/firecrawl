---
name: firecrawl-build-scrape
description: Integrate Firecrawl `/scrape` into product code for single-page extraction. Use when an app already has a URL and needs markdown, HTML, links, screenshots, metadata, or structured page output. Prefer this skill over broader crawl patterns when the feature is page-level.
license: ISC
metadata:
  author: firecrawl
  version: "0.1.0"
  homepage: https://www.firecrawl.dev
  source: https://github.com/firecrawl/skills
inputs:
  - name: FIRECRAWL_API_KEY
    description: Firecrawl API key for hosted Firecrawl requests. Optional for self-host without DB auth.
    required: false
  - name: FIRECRAWL_API_URL
    description: Base URL for self-hosted Firecrawl deployments.
    required: false
---

# Firecrawl Build Scrape

Use this when the application already has the URL and needs content from one page.

> **Fork note (roysupriyo10/firecrawl):** Vendored + patched for self-host Playwright screenshot/branding. Details: [firecrawl-selfhost-scrape](../firecrawl-selfhost-scrape/SKILL.md).

## Use This When

- the feature starts from a known URL
- you need page content for retrieval, summarization, enrichment, or monitoring
- you want the default extraction primitive before considering `/interact`
- you need screenshots or branding profiles from a self-hosted instance

## Default Recommendations

- Return `markdown` unless the feature truly needs another format.
- Use `onlyMainContent` for article-like pages where nav and chrome add noise.
- Add waits or other rendering options only when the page needs them.

## Screenshot + branding (self-host vs cloud)

| | Cloud / fire-engine | This self-host fork |
| --- | --- | --- |
| Engine | fire-engine / chrome-cdp | Playwright microservice |
| `formats: ["screenshot"]` / `{ type: "screenshot", fullPage: true }` | supported | supported (data URL, not GCS) |
| `formats: ["branding"]` | CDP branding script | same script via Playwright `execute_javascript` |
| Missing field after request | treat as failure | hard fail: `SCRAPE_SCREENSHOT_FAILED` / `SCRAPE_BRANDING_FAILED` (no warn-only success) |
| `actions` arrays | supported | **not** on Playwright path (fire-engine only) |

Client example (self-host):

```bash
curl -X POST "$FIRECRAWL_API_URL/v2/scrape" \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com","formats":["screenshot","branding"]}'
```

Expect `data.screenshot` as `data:image/...;base64,...` and `data.branding` present, or a failed scrape — never success with those fields silently omitted.

## Common Product Patterns

- knowledge ingestion from known URLs
- enrichment from a company, product, or docs page
- pricing, changelog, and documentation extraction
- page-level quality checks or monitoring
- visual / brand capture for design systems (self-host branding format)

## Escalation Rules

- If you do not have the URL yet, start with [firecrawl-build-search](../firecrawl-build-search/SKILL.md).
- If content requires clicks, typing, or multi-step navigation, escalate to [firecrawl-build-interact](../firecrawl-build-interact/SKILL.md) (cloud/fire-engine; limited on Playwright-only self-host).
- If changing the self-host engine itself, use [firecrawl-selfhost-scrape](../firecrawl-selfhost-scrape/SKILL.md).

## Implementation Notes

- Keep the integration narrow: one feature, one URL, one extraction contract.
- Treat `/scrape` as the default primitive for downstream LLM or indexing pipelines.
- Request richer formats only when the consumer needs them, such as links, screenshots, or branding data.
- Point SDKs at `FIRECRAWL_API_URL` for self-host; do not assume `api.firecrawl.dev`.

## Docs (Source of Truth)

Read the source-of-truth page for your project language before writing integration code:

- **Node / TypeScript**: [docs.firecrawl.dev/agent-source-of-truth/node](https://docs.firecrawl.dev/agent-source-of-truth/node)
- **Python**: [docs.firecrawl.dev/agent-source-of-truth/python](https://docs.firecrawl.dev/agent-source-of-truth/python)
- **Rust**: [docs.firecrawl.dev/agent-source-of-truth/rust](https://docs.firecrawl.dev/agent-source-of-truth/rust)
- **Java**: [docs.firecrawl.dev/agent-source-of-truth/java](https://docs.firecrawl.dev/agent-source-of-truth/java)
- **Elixir**: [docs.firecrawl.dev/agent-source-of-truth/elixir](https://docs.firecrawl.dev/agent-source-of-truth/elixir)
- **cURL / REST**: [docs.firecrawl.dev/agent-source-of-truth/curl](https://docs.firecrawl.dev/agent-source-of-truth/curl)

## See Also

- [firecrawl-build](../firecrawl-build/SKILL.md)
- [firecrawl-build-search](../firecrawl-build-search/SKILL.md)
- [firecrawl-build-interact](../firecrawl-build-interact/SKILL.md)
