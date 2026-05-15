# Firecrawl v3.0.0

## Improvements

- **`/parse` endpoint** — Upload local files (PDF, DOCX, DOC, ODT, RTF, XLSX, XLS, HTML) up to 50 MB and get back clean, LLM-ready Markdown, JSON, or a summary. Tables and reading order are preserved, with full Zero Data Retention support for enterprise plans. Available in JS, Python, Go, Rust, Java, .NET, PHP, Ruby, and Elixir SDKs.
- **Lockdown Mode** — Set `lockdown: true` on `/scrape` to serve results exclusively from Firecrawl's index with zero outbound requests and zero data retention by default. Gated outbound paths include HTTP fetches, robots.txt, audio downloads, and media. Available in every SDK, the CLI (`--lockdown`), and MCP.
- **`question` format** — Pass a natural-language prompt to `/scrape` and get a grounded, hallucination-free answer back in `data.question`. Runs on a managed model chain with automatic fallback, prompt-injection isolation via XML tagging and zero-width-space escaping, and up to 100x fewer tokens per call.
- **`highlights` format** — Returns the exact sentences, code blocks, and table rows on a page that match your query. Consecutive sentences re-join into paragraphs, code lines wrap in fenced blocks with their original language, and table rows rebuild into Markdown tables with headers — all from the source page, in the page's own words.
- **`video` format** — Added `video` to scrape formats. Returns a signed downloadable video URL for supported sites (e.g. YouTube), with engine routing through `fire-engine;chrome-cdp`, cookie forwarding for authenticated downloads, and explicit Lockdown gating.
- **Monitor API** — New `/v2/monitor` endpoints for creating, scheduling, and running page-change checks. Includes diff persistence, webhook and email notifications, paginated check-history results, and manual run support.
- **`/search` domain filters** — Added `includeDomains` and `excludeDomains` parameters to `/search` for scoping results to a specific set of sites.
- **`/search` feedback endpoint** — Submit a rating on a search result with `POST /v2/search/:jobId/feedback`. Each accepted submission refunds 1 credit, capped per UTC day, with idempotent retries.
- **Custom robots.txt user agent** — Added `robotsUserAgent` to crawl requests to evaluate robots.txt rules and crawl delays against a custom agent string, and a separate `customRobotsAgent` org flag independent from `ignoreRobots`. Available in JS, Python, and Java SDKs.
- **Deprecation warnings on legacy endpoints** — Retired and deprecated endpoints (`/v0/*`, `/v1/extract`, `/v2/extract`, `/v1/deep-research`, `/v1/llmstxt`) now return RFC-compliant `Deprecation`, `Warning`, `Link`, and `Sunset` headers plus a structured `warnings[]` and `replacement` field in the response body. JS and Python SDKs surface the warnings to clients.
- **Official Go SDK** — Added a first-party Go SDK for the v2 API, replacing the community module. Includes context-aware retry backoff, proper `MapData.Links` typing, and a published release workflow.
- **Ruby SDK** — Added the official Firecrawl Ruby SDK v2 with full endpoint coverage and v2-native typing.
- **PHP SDK** — Added the official PHP SDK with Laravel support, scrape/search/crawl/map/parse coverage, and a published `firecrawl/firecrawl-sdk` Composer package.
- **.NET SDK** — Added the official .NET SDK with v2 API support, parse, and an `firecrawl-sdk` NuGet package.
- **Rust SDK v2** — The Rust SDK has been promoted to the official v2 SDK with parity across scrape, search, crawl, map, agent, and parse.
- **`/interact` LangSmith tracing** — Browser sessions are now grouped in LangSmith by `session_id` for end-to-end visibility across multi-step interact runs.
- **`/interact` suggestion** — Calls to `/scrape` that pass an `actions` array now return a warning suggesting `/interact` for stateful browser automation.
- **Fire-PDF async client** — Added an opt-in async client path to Fire-PDF that fails loudly instead of silently falling back to the sync engine, with explicit `{timeout, created_at}` deadline contracts to fire-pdf.
- **Fire-PDF size cap** — Raised the Fire-PDF maximum upload size from 10 MB to 30 MB, with raw-byte comparison for accurate sizing.
- **MinerU routing control** — Added a `MINERU_PERCENT` configuration option for routing a percentage of PDF traffic directly through MinerU.
- **PDF page-processed billing** — Billing for PDFs now reflects the exact `pages_processed` returned by fire-pdf instead of the raw page count.
- **Audio engine routing** — Audio scrapes now route through a dedicated audio feature flag and use the tlsclient engine for reliability.
- **Native parser update** — Upgraded `calamine` to 0.34 to fix legacy `.xls` and `.xlsx` parsing edge cases.
- **Docker harness** — Exposed `HARNESS_STARTUP_TIMEOUT_MS` through `docker-compose` for self-hosted users who need longer startup windows.
- **Elixir SDK** — Added `parse_file/3` for the `/parse` endpoint with error-tuple return semantics and regenerated bindings from the OpenAPI spec.
- **JS SDK request timeout** — Added an explicit `axios` timeout option to the JS SDK to prevent hanging requests.
- **JS SDK deprecation surface** — JS and Python SDKs now expose deprecation warnings and replacement endpoints to clients via a `warnings[]` and `replacement` field on responses.
- **OAuth introspection** — OAuth access tokens are now resolved via RFC 7662 introspection instead of local decode, ensuring revocations take effect immediately.
- **Knip cleanup** — Cleared longstanding knip findings blocking pre-commit hooks across the API.

## Fixes

- Resolved multiple CVEs across the API and SDKs including `axios`, `postcss` (GHSA-qx2v-qp2m-jg93), `fast-xml-parser` (GHSA-gh4j-gqv2-49f6), `protobufjs`, `follow-redirects`, `langsmith` (GHSA-rr7j-v2q5-chgv), `lodash`, `fast-uri`, `fast-xml-builder`, and others surfaced by `pnpm audit`.
- Patched `astro` 5 → 6 in `test-site` to resolve a `define:vars` XSS advisory.
- Allowlisted CVEs that do not affect Firecrawl: `GHSA-v2v4-37r5-5v8g` (`ip-address` XSS) and `GHSA-w5hq-g745-h8pq` (`uuid`).
- Fixed branding `colors.secondary` being incorrectly populated by a JS heuristic when the LLM omitted a value — `secondary` is now optional and is no longer applied as a default.
- Fixed the Playwright service ignoring the caller's `User-Agent` request header.
- Fixed `screenshot` signed URLs returning stale results from cache by forcing a cache miss when the signed URL has expired.
- Fixed Lockdown requests being billed twice for ZDR by treating Lockdown as zero data retention by default.
- Fixed proxy billing for cached scrapes incorrectly charging proxy credits when no proxy egress occurred.
- Fixed YouTube transcript scripts running on audio-only scrapes and audio downloads not receiving CDP cookies.
- Fixed `html-to-md` conversion service ignoring zero data retention.
- Fixed a stack overflow in `marked.parse` when handling certain PDF outputs.
- Fixed `robotsUserAgent` not being honored by the native link filter and not being included in JS SDK crawl payloads.
- Fixed `/v1` status endpoints returning 500 on non-UUID job IDs — now returns a proper 400.
- Fixed empty `actions: []` arrays being treated as actions in feature flags.
- Fixed `time_taken` not being recorded on some scrape jobs.
- Fixed JS SDK watcher emitting duplicate events, leaking timeouts, and hanging `start()` on watcher timeouts.
- Fixed Ruby SDK unwrapping of `credit_usage` data fields and defaulted `skipTlsVerification` to `false`.
- Fixed missing negative-limit validation in Python, Java, and Go SDKs.
- Fixed Java SDK accepting empty API keys and missing async lifecycle methods.
- Fixed Autumn billing-period timestamps, subscription lookups, and `planCredits` reporting.
- Fixed crawl-backlog timeouts being unbounded — now capped at 48h.
- Fixed `nuq-postgres` reliability with batched group cleanup, predicate-matching indexes, spread reindexes, and `statement_timeout`-bounded maintenance.
- Fixed transient browser-session insert failures with retries on Supabase errors.
- Fixed retry-with-stealth signals from fire-engine not propagating `stealthProxy` to the sync response.
- Fixed `robustFetch` error causes polluting logs with base64 bodies — error logs now use `logParams` instead.
- Fixed flaky `directQuote` test by gating it to production only.

## API

- Added `POST /v2/parse` for multipart file uploads up to 50 MB. Returns a standard Document. Disallowed scrape options on parse: `changeTracking`, `screenshot`, `branding`, `actions`, `waitFor`, `location`, `mobile`; `proxy` is restricted to `auto` or `basic`. Errors with `PARSE_UNSUPPORTED_OPTIONS` on disallowed input.
- Added `lockdown: boolean` to `/scrape`. Cache misses return `404` with `SCRAPE_LOCKDOWN_CACHE_MISS`. Billing: +4 credits when `lockdown` is enabled, 1 credit on cache miss. Available across all SDKs.
- Added `question` and `highlights` to `/scrape` formats, returning `data.question` and `data.highlights` respectively.
- Added `video` to `/scrape` formats. Returns `document.video` as a signed URL. +4 credits per request. Unsupported URLs raise `SCRAPE_VIDEO_UNSUPPORTED_URL`; `parse` rejects the `video` format client- and server-side.
- Added `includeDomains` and `excludeDomains` arrays on `/v2/search` for scoping results to specific domains.
- Added `POST /v2/search/:jobId/feedback` for rating search results. Each accepted submission refunds 1 credit, capped per UTC day via `SEARCH_FEEDBACK_DAILY_CAP_CREDITS`, with idempotent retries returning `alreadySubmitted: true`. Feedback submissions older than `SEARCH_FEEDBACK_MAX_AGE_SEC` (default 120s) are rejected. Search billing is now `ceil(results/10) * 2` credits, surfaced in responses.
- Added `robotsUserAgent` to `/v2/crawl` `crawlerOptions` for custom-agent robots.txt evaluation. Gated behind the `ignoreRobots` org flag.
- Added a separate `customRobotsAgent` org flag independent from `ignoreRobots`, so teams can ship custom user-agents without disabling robots.txt enforcement.
- Migrated the `ignoreRobots` org flag from a boolean to a `disabled` / `allowed` / `forced` pattern. The boolean backward-compat path has been removed.
- Added `/v2/monitor` endpoints for creating, listing, manually running, and reading page-change monitors with paginated diff history, webhook/email notifications, and Redis-locked reconciliation.
- Deprecated `/v0/scrape`, `/v0/crawl`, `/v0/crawl/status/:jobId`, `DELETE /v0/crawl/cancel/:jobId`, `/v0/search`, `/v1/extract`, `/v1/extract/:jobId`, `/v2/extract`, `/v2/extract/:jobId`, `/v1/deep-research`, `/v1/deep-research/:jobId`, `/v1/llmstxt`, and `/v1/llmstxt/:jobId`. Deprecated endpoints emit `Deprecation: true`, `Warning: 299 - "<message>"`, `Link; rel="successor-version"`, and (when configured) `Sunset` headers, plus `warnings[]` and `replacement` in the JSON body. JS and Python SDKs surface these to clients.
- Removed the legacy `ignoreRobots: boolean` request shape — clients must use the new flag values.
- Removed deprecated integration controllers in favor of the new integration proxy.
- Added internal integration proxy routes for rotating API keys and additional admin integration endpoints.

---

## New Contributors

* @JesterCharles made their first contribution in https://github.com/firecrawl/firecrawl/pull/3447
* @voidborne-d made their first contribution in https://github.com/firecrawl/firecrawl/pull/3387

## Contributors

* @nickscamara
* @mogery
* @abimaelmartell
* @ericciarla
* @rafaelsideguide
* @Chadha93
* @tomsideguide
* @developersdigest
* @micahstairs
* @firecrawl-spring
* @devin-ai-integration
* @claude
* @cursor
* @JesterCharles
* @voidborne-d

---

**Full Changelog**: https://github.com/firecrawl/firecrawl/compare/v2.9.0...v3.0.0
