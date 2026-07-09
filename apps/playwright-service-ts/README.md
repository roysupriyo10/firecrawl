# Playwright Scrape API

This is a simple web scraping service built with Express and Playwright. Firecrawl's API uses it as the self-host browser engine when `PLAYWRIGHT_MICROSERVICE_URL` is set.

## Features

- Scrapes HTML content from specified URLs.
- Blocks requests to known ad-serving domains.
- Optionally blocks media files to reduce bandwidth usage (`BLOCK_MEDIA=true`).
- Uses random user-agent strings to avoid detection.
- Strategy to ensure the page is fully rendered.
- Optional viewport / full-page screenshots (returned as `data:image/...;base64,...`).
- Optional `execute_javascript` for in-page evaluation (used by Firecrawl branding CDP extraction).

When `screenshot` or `execute_javascript` is requested, media blocking is disabled for that request so logos/images load correctly.

## Install
```bash
npm install
npx playwright install
```

## RUN
```bash
npm run build
npm start
```
OR
```bash
npm run dev
```

## USE

```bash
curl -X POST http://localhost:3000/scrape \
-H "Content-Type: application/json" \
-d '{
  "url": "https://example.com",
  "wait_after_load": 1000,
  "timeout": 15000,
  "headers": {
    "Custom-Header": "value"
  },
  "check_selector": "#content",
  "screenshot": true,
  "full_page_screenshot": false,
  "viewport": { "width": 1280, "height": 800 }
}'
```

### Screenshot / branding fields

| Field | Type | Notes |
| --- | --- | --- |
| `screenshot` | boolean | Capture after load |
| `full_page_screenshot` | boolean | Full page vs viewport |
| `viewport` | `{ width, height }` | Optional context viewport |
| `screenshot_quality` | number 1–100 | JPEG quality; omit for PNG |
| `execute_javascript` | string | IIFE / expression evaluated in page; result returned as `javascript_return` |

Failures in screenshot capture or `execute_javascript` return HTTP 500 with an `error` string (no silent HTML-only success).

## USING WITH FIRECRAWL

Add `PLAYWRIGHT_MICROSERVICE_URL=http://localhost:3003/scrape` to `/apps/api/.env` (or rely on docker-compose defaults) so the API uses this microservice.

Self-host scrape formats that require a browser CDP path:

- `formats: ["screenshot"]` or `{ type: "screenshot", fullPage: true }`
- `formats: ["branding"]`

See `SELF_HOST.md` for env template notes.
