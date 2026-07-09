---
name: firecrawl-selfhost-scrape
description: >
  Self-host /scrape screenshot and branding via Playwright (no fire-engine).
  Use when adding or debugging formats screenshot / branding, playwright-service
  fields, or SCRAPE_SCREENSHOT_FAILED / SCRAPE_BRANDING_FAILED behavior.
license: ISC
metadata:
  author: roysupriyo10
  version: "0.1.0"
---

# Self-host scrape: screenshot + branding

## Use this when

- Implementing or fixing `formats: ["screenshot"]`, `{ type: "screenshot", fullPage: true }`, or `formats: ["branding"]` on a self-hosted instance
- Changing `apps/playwright-service-ts` or `engines/playwright`
- Asserting that missing screenshot/branding must fail the scrape

## Engine path (no fire-engine)

When `FIRE_ENGINE_BETA_URL` is unset and `PLAYWRIGHT_MICROSERVICE_URL` is set (compose default):

| Format | Path |
| --- | --- |
| `screenshot` / fullPage | Playwright `page.screenshot` → data URL on `document.screenshot` |
| `branding` | `page.evaluate(getBrandingScript())` → `javascript_return` → `deriveBrandingFromActions` → `lib/branding` |

Playwright feature flags in `engines/index.ts` enable `screenshot`, `screenshot@fullScreen`, and `branding`.

## Playwright microservice request fields

Posted by `scrapeURLWithPlaywright`:

- `screenshot`, `full_page_screenshot`, `viewport`, `screenshot_quality`
- `execute_javascript` (branding script)
- Media blocking is skipped when screenshot or `execute_javascript` is requested

Failures in capture/eval return HTTP 500 with `error` (no HTML-only success).

## Hard-fail contract

- Engine throws `ScreenshotFailedError` / `BrandingFailedError` if the field is missing after Playwright returns.
- Transformers also throw if formats were requested but fields are still missing.
- Error codes: `SCRAPE_SCREENSHOT_FAILED`, `SCRAPE_BRANDING_FAILED` (serde in `error-serde.ts`).

Never change this to warn-only success.

## Out of scope on Playwright self-host

- `actions` arrays (still fire-engine)
- Cloud GCS screenshot URLs (self-host returns data URLs)

## Tests

E2E snip: `apps/api/src/__tests__/snips/v2/scrape-playwright-screenshot-branding.test.ts`

Gate: `HAS_PLAYWRIGHT && !HAS_FIRE_ENGINE` (and website allowlist where needed).

Run with `pnpm harness` + vitest on that file (not manual `pnpm start`).

## Docs

- `apps/api/src/scraper/scrapeURL/README.md`
- `apps/playwright-service-ts/README.md`
- `SELF_HOST.md` (Playwright env notes)
