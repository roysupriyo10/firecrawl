---
name: firecrawl-selfhost-deploy
description: >
  Multi-machine self-host deploy with YOUR GHCR registry, Buildx layer cache,
  and scripts/deploy-selfhost.sh. Use when building/pushing images, pull-up on
  other hosts, docker group/socket issues, or docker-compose.registry.yaml.
license: ISC
metadata:
  author: roysupriyo10
  version: "0.1.0"
---

# Self-host deploy: registry + cache + up

## Use this when

- Building once and running on cornelius / statice / other Tailscale hosts
- Setting up GHCR under the operator’s account
- Fixing docker.sock permission or missing buildx

## Your registry only

Images:

| Service | Image |
| --- | --- |
| api / workers | `$FIRECRAWL_REGISTRY/firecrawl:$TAG` |
| playwright-service | `$FIRECRAWL_REGISTRY/firecrawl-playwright:$TAG` |
| nuq-postgres | `$FIRECRAWL_REGISTRY/firecrawl-nuq-postgres:$TAG` |

Redis / RabbitMQ / FoundationDB stay on Docker Hub — do not rebuild them into your registry.

**Never** push to `ghcr.io/firecrawl`. Script refuses that org.

## Files

- `scripts/deploy-selfhost.sh` — login → build (+ registry cache if buildx) → push → pull → up
- `docker-compose.registry.yaml` — override `build:` with registry `image:`
- `.env.deploy` / `.env.deploy.example` — `FIRECRAWL_REGISTRY`, user, optional token
- Root `.env` — Firecrawl runtime (PORT, LLM keys, etc.)

## Commands

```bash
cp .env.deploy.example .env.deploy   # FIRECRAWL_REGISTRY=ghcr.io/<you>

# GHCR auth: leave FIRECRAWL_REGISTRY_TOKEN empty and use gh:
gh auth refresh -h github.com -s read:packages,write:packages

# docker group (once): sudo usermod -aG docker "$USER"
# current shell without logout: newgrp docker   OR   sg docker -c './scripts/deploy-selfhost.sh'

./scripts/deploy-selfhost.sh              # build+push+pull+up
./scripts/deploy-selfhost.sh pull-up      # other machines
./scripts/deploy-selfhost.sh build-push   # builder only
./scripts/deploy-selfhost.sh status
```

## Buildx vs BuildKit

BuildKit = engine; Buildx = Docker CLI plugin that drives it. Prefer Buildx for `--cache-from` / `--cache-to` registry cache. Without buildx, script falls back to classic `docker build`/`push` (no remote layer cache).

## Token

`FIRECRAWL_REGISTRY_TOKEN` = GitHub credential with `read:packages` + `write:packages` for GHCR. Prefer `gh auth token` (script does this when token env is empty).

## Compose

Deploy path always uses:

```bash
docker compose -f docker-compose.yaml -f docker-compose.registry.yaml ...
```

with `--no-build` on up so hosts pull your images.
