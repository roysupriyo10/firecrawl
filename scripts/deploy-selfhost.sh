#!/usr/bin/env bash
# Idempotent self-host deploy: registry login → build (layer cache) → push → pull → up.
#
# Uses YOUR registry only (FIRECRAWL_REGISTRY). Never pushes to ghcr.io/firecrawl.
#
# Usage:
#   cp .env.deploy.example .env.deploy   # edit FIRECRAWL_REGISTRY=ghcr.io/<you>
#   ./scripts/deploy-selfhost.sh              # build+push+pull+up
#   ./scripts/deploy-selfhost.sh pull-up      # pull+up only (other machines)
#   ./scripts/deploy-selfhost.sh build-push   # build+push only (builder machine)
#   ./scripts/deploy-selfhost.sh up           # up only (images already local)
#   ./scripts/deploy-selfhost.sh status
#
# Env (from .env.deploy / .env / environment):
#   FIRECRAWL_REGISTRY          required, e.g. ghcr.io/roysupriyo10
#   FIRECRAWL_TAG               default: latest
#   FIRECRAWL_REGISTRY_USER     optional login user
#   FIRECRAWL_REGISTRY_TOKEN    optional login token (or GHCR_TOKEN / GITHUB_TOKEN)
#   FIRECRAWL_PLATFORM          optional, e.g. linux/amd64
#   FIRECRAWL_BUILDX_BUILDER    default: firecrawl-builder
#   FIRECRAWL_SKIP_CACHE        set to 1 to skip registry layer cache
#   FIRECRAWL_BUILD_PARALLEL    default: 1 — build api/playwright/nuq-postgres concurrently
#   FIRECRAWL_IMAGES            optional subset: api,playwright,nuq-postgres (comma-separated)
#                               Use to resume after a partial run without rebuilding everything.
#   FIRECRAWL_DETACH            default: 1 (compose up -d)
#
# Idempotency:
# - Safe to re-run. Buildx --cache-from the registry reuses layers already pushed
#   (including a build you interrupted after "exporting cache" / push).
# - Do NOT Ctrl-C a build that is still uploading; let it finish. Editing this
#   script does not affect an already-running deploy process.
# - After a successful push, other machines: ./scripts/deploy-selfhost.sh pull-up
# - To rebuild only remaining images: FIRECRAWL_IMAGES=playwright,nuq-postgres ./scripts/deploy-selfhost.sh build-push

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

COMPOSE_BASE=(docker compose -f docker-compose.yaml -f docker-compose.registry.yaml)
BUILDER_NAME="${FIRECRAWL_BUILDX_BUILDER:-firecrawl-builder}"
DETACH="${FIRECRAWL_DETACH:-1}"

log() { printf '==> %s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

load_env_file() {
  local f="$1"
  [[ -f "$f" ]] || return 0
  log "loading $f"
  set -a
  # shellcheck disable=SC1090
  source "$f"
  set +a
}

load_env_file "$ROOT/.env"
load_env_file "$ROOT/.env.deploy"

CMD="${1:-all}"
TAG="${FIRECRAWL_TAG:-latest}"
REGISTRY="${FIRECRAWL_REGISTRY:-}"

[[ -n "$REGISTRY" ]] || die "FIRECRAWL_REGISTRY is required (e.g. ghcr.io/roysupriyo10). See .env.deploy.example"
[[ "$REGISTRY" != *firecrawl/firecrawl* ]] || die "FIRECRAWL_REGISTRY must be YOUR registry, not ghcr.io/firecrawl"
case "$REGISTRY" in
  ghcr.io/firecrawl|ghcr.io/firecrawl/*)
    die "FIRECRAWL_REGISTRY points at Firecrawl's org registry. Set your own (e.g. ghcr.io/<your-user>)."
    ;;
esac

export FIRECRAWL_REGISTRY="$REGISTRY"
export FIRECRAWL_TAG="$TAG"

IMG_API="${REGISTRY}/firecrawl:${TAG}"
IMG_PW="${REGISTRY}/firecrawl-playwright:${TAG}"
IMG_PG="${REGISTRY}/firecrawl-nuq-postgres:${TAG}"
CACHE_API="${REGISTRY}/firecrawl:buildcache"
CACHE_PW="${REGISTRY}/firecrawl-playwright:buildcache"
CACHE_PG="${REGISTRY}/firecrawl-nuq-postgres:buildcache"

registry_host() {
  local r="$1"
  if [[ "$r" == */* ]]; then
    printf '%s\n' "${r%%/*}"
  else
    printf 'docker.io\n'
  fi
}

ensure_login() {
  local host user token
  host="$(registry_host "$REGISTRY")"
  user="${FIRECRAWL_REGISTRY_USER:-}"
  token="${FIRECRAWL_REGISTRY_TOKEN:-${GHCR_TOKEN:-${GITHUB_TOKEN:-}}}"

  if [[ -z "$user" && "$host" == "ghcr.io" ]]; then
    if command -v gh >/dev/null 2>&1; then
      user="$(gh api user -q .login 2>/dev/null || true)"
    fi
  fi
  if [[ -z "$user" ]]; then
    user="roysupriyo10"
  fi

  # Prefer explicit token; otherwise reuse `gh` session (no secret in .env.deploy).
  if [[ -z "$token" && "$host" == "ghcr.io" ]] && command -v gh >/dev/null 2>&1; then
    token="$(gh auth token 2>/dev/null || true)"
    if [[ -n "$token" ]]; then
      log "using token from gh auth token (user=$user)"
    fi
  fi

  if [[ -n "$user" && -n "$token" ]]; then
    log "docker login $host (user=$user)"
    printf '%s' "$token" | docker login "$host" -u "$user" --password-stdin
    return 0
  fi

  log "no registry credentials available; assuming already logged in to $host"
}

has_buildx() {
  docker buildx version >/dev/null 2>&1
}

ensure_buildx() {
  if ! has_buildx; then
    log "docker buildx not available — using classic docker build/push (no remote layer cache)"
    log "install the buildx plugin for registry cache (BuildKit engine via Buildx CLI)"
    return 1
  fi

  if ! docker buildx inspect "$BUILDER_NAME" >/dev/null 2>&1; then
    log "creating buildx builder $BUILDER_NAME"
    docker buildx create --name "$BUILDER_NAME" --driver docker-container --use
  else
    docker buildx use "$BUILDER_NAME"
  fi
  docker buildx inspect --bootstrap >/dev/null
  return 0
}

build_one_buildx() {
  local context="$1" image="$2" cache_ref="$3"
  local -a args=(buildx build "$context" -t "$image" --push)

  if [[ -n "${FIRECRAWL_PLATFORM:-}" ]]; then
    args+=(--platform "$FIRECRAWL_PLATFORM")
  fi

  if [[ "${FIRECRAWL_SKIP_CACHE:-0}" != "1" ]]; then
    args+=(--cache-from "type=registry,ref=${cache_ref}")
    args+=(--cache-to "type=registry,ref=${cache_ref},mode=max")
  fi

  log "buildx build+push $image (cache=$cache_ref)"
  docker "${args[@]}"
}

build_one_classic() {
  local context="$1" image="$2"
  log "docker build $image (no remote cache)"
  local -a args=(build "$context" -t "$image")
  if [[ -n "${FIRECRAWL_PLATFORM:-}" ]]; then
    args+=(--platform "$FIRECRAWL_PLATFORM")
  fi
  docker "${args[@]}"
  log "docker push $image"
  docker push "$image"
}

build_and_push() {
  ensure_login
  local parallel="${FIRECRAWL_BUILD_PARALLEL:-1}"
  local -a pids=()
  local failed=0
  local use_buildx=0
  local want="${FIRECRAWL_IMAGES:-api,playwright,nuq-postgres}"

  want_image() {
    [[ ",${want}," == *",$1,"* ]]
  }

  if ensure_buildx; then
    use_buildx=1
  fi

  log "images to build: ${want} (parallel=${parallel}; registry cache reused on re-run)"

  start_buildx() {
    local context="$1" image="$2" cache_ref="$3" name="$4"
    want_image "$name" || return 0
    if [[ "$parallel" == "1" ]]; then
      build_one_buildx "$context" "$image" "$cache_ref" &
      pids+=($!)
    else
      build_one_buildx "$context" "$image" "$cache_ref"
    fi
  }

  start_classic() {
    local context="$1" image="$2" name="$3"
    want_image "$name" || return 0
    if [[ "$parallel" == "1" ]]; then
      build_one_classic "$context" "$image" &
      pids+=($!)
    else
      build_one_classic "$context" "$image"
    fi
  }

  if [[ "$use_buildx" -eq 1 ]]; then
    [[ "$parallel" == "1" ]] && log "building selected images in parallel with buildx"
    start_buildx apps/api "$IMG_API" "$CACHE_API" api
    start_buildx apps/playwright-service-ts "$IMG_PW" "$CACHE_PW" playwright
    start_buildx apps/nuq-postgres "$IMG_PG" "$CACHE_PG" nuq-postgres
  else
    [[ "$parallel" == "1" ]] && log "building selected images in parallel with classic docker"
    start_classic apps/api "$IMG_API" api
    start_classic apps/playwright-service-ts "$IMG_PW" playwright
    start_classic apps/nuq-postgres "$IMG_PG" nuq-postgres
  fi

  if [[ ${#pids[@]} -gt 0 ]]; then
    for pid in "${pids[@]}"; do
      if ! wait "$pid"; then
        failed=1
      fi
    done
    [[ "$failed" -eq 0 ]] || die "one or more parallel builds failed (re-run is safe; cache keeps finished layers)"
  fi
}

pull_images() {
  ensure_login
  log "compose pull (registry=$REGISTRY tag=$TAG)"
  "${COMPOSE_BASE[@]}" pull
}

compose_up() {
  local -a up_args=(up --no-build --remove-orphans)
  if [[ "$DETACH" == "1" ]]; then
    up_args+=(-d)
  fi
  log "compose up --no-build (registry images only)"
  "${COMPOSE_BASE[@]}" "${up_args[@]}"
}

show_status() {
  log "registry=$REGISTRY tag=$TAG"
  "${COMPOSE_BASE[@]}" ps
}

case "$CMD" in
  all|deploy)
    build_and_push
    pull_images
    compose_up
    show_status
    ;;
  build-push|push)
    build_and_push
    ;;
  pull-up)
    pull_images
    compose_up
    show_status
    ;;
  pull)
    pull_images
    ;;
  up)
    compose_up
    show_status
    ;;
  status|ps)
    show_status
    ;;
  login)
    ensure_login
    ;;
  -h|--help|help)
    sed -n '2,25p' "$0"
    ;;
  *)
    die "unknown command: $CMD (try: all | build-push | pull-up | up | status | login)"
    ;;
esac

log "done ($CMD)"
