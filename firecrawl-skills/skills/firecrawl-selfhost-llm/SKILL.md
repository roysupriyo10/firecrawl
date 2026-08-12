---
name: firecrawl-selfhost-llm
description: >
  Configure self-host LLM extract with MODEL_PROVIDER and MODEL_NAME (OpenAI,
  Google AI Studio / Gemini, Ollama, etc.). Use when switching providers without
  editing getModel(..., "openai") call sites, or wiring GOOGLE_GENERATIVE_AI_API_KEY.
license: ISC
metadata:
  author: roysupriyo10
  version: "0.1.0"
---

# Self-host LLM: MODEL_PROVIDER

## Use this when

- Pointing extract/JSON scrape at Gemini, Ollama, or another provider
- Debugging why call sites still hit OpenAI
- Choosing `getModel` vs `getModelExact`

## Env (root `.env`, passed through compose)

```bash
# Native Google AI Studio (recommended for Gemini)
GOOGLE_GENERATIVE_AI_API_KEY=...
MODEL_PROVIDER=google
MODEL_NAME=gemini-3.1-flash-lite

# Or OpenAI-compatible base URL
# OPENAI_API_KEY=...
# OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
# MODEL_PROVIDER=openai
# MODEL_NAME=gemini-3.5-flash
```

`MODEL_PROVIDER` values: `openai` | `ollama` | `google` | `anthropic` | `groq` | `openrouter` | `fireworks` | `deepinfra` | `vertex` | `mimo`

```bash
# Xiaomi MiMo (1M context, 128K output)
MIMO_API_KEY=...
MODEL_PROVIDER=mimo
MODEL_NAME=mimo-v2.5-pro
# MIMO_BASE_URL defaults to the Token Plan endpoint; api.xiaomimimo.com/v1 is PAYG
# MIMO_THINKING=disabled   # unset = MiMo's default (enabled)
```

Use `MODEL_PROVIDER=mimo`, **not** `OPENAI_BASE_URL`. MiMo implements only
`response_format: {"type":"json_object"}` and Chat Completions; the `mimo`
provider carries those traits (see `PROVIDER_TRAITS` in `generic-ai.ts`) so
`generateObject` uses JSON mode instead of a strict `json_schema` request.

Compose forwards `MODEL_PROVIDER`, `MODEL_NAME`, `GOOGLE_GENERATIVE_AI_API_KEY`, `OPENAI_*`, `OLLAMA_BASE_URL`, `MIMO_*`.

After changing `.env`, recreate API containers so they pick up env (`docker compose up -d --force-recreate` or deploy script `up`).

## Code rules

- **`getModel(name, provider)`** — remapped by `MODEL_PROVIDER` / `MODEL_NAME` for self-host. Used by extract / scrape LLM paths.
- **`getModelExact(name, provider)`** — never remapped. Use for intentional multi-provider specialty paths (Vertex rerank, browser agent, fireworks query finetune, etc.).

Implementation: `apps/api/src/lib/generic-ai.ts`, config key in `apps/api/src/config.ts`.

Google SDK reads **`GOOGLE_GENERATIVE_AI_API_KEY`** (exact name).

## Not covered

- FoundationDB npm native build is optional; default queue is Postgres.
