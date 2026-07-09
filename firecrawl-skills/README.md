# Firecrawl skills (monorepo)

Single skills tree for **this** fork (`roysupriyo10/firecrawl`):

1. **Vendored official build skills** from [`firecrawl/skills`](https://github.com/firecrawl/skills) (SHA in `UPSTREAM_SKILLS_SHA`), with self-host patches on onboarding / scrape / auth.
2. **Self-host overlay skills** authored here for Playwright screenshot/branding, `MODEL_PROVIDER`, and GHCR deploy.

## Install (one step)

```bash
npx skills add ./firecrawl-skills
# after push:
npx skills add https://github.com/roysupriyo10/firecrawl/tree/main/firecrawl-skills
```

List:

```bash
npx skills add ./firecrawl-skills --list
```

You do **not** need a second `npx skills add firecrawl/skills` for day-to-day work on this fork. Re-sync upstream when you want newer official docs (see below).

## Skills

### Official (vendored + patched)

| Skill | Notes |
| --- | --- |
| `firecrawl-build` | Umbrella; links self-host siblings |
| `firecrawl-build-onboarding` | Patched: self-host URL; API key optional without DB auth |
| `firecrawl-build-scrape` | Patched: Playwright screenshot/branding; hard-fail; data URLs |
| `firecrawl-build-search` | Upstream as-is |
| `firecrawl-build-interact` | Upstream as-is (actions still fire-engine-oriented) |
| `firecrawl-research-index` | Upstream as-is |

### Self-host overlay

| Skill | Use when |
| --- | --- |
| `firecrawl-selfhost` | Operating this monorepo |
| `firecrawl-selfhost-scrape` | Engine / Playwright screenshot+branding |
| `firecrawl-selfhost-llm` | `MODEL_PROVIDER` / Gemini |
| `firecrawl-selfhost-deploy` | `scripts/deploy-selfhost.sh` / GHCR |

## Refresh upstream (rebase docs)

```bash
git clone --depth 1 https://github.com/firecrawl/skills.git /tmp/firecrawl-skills-upstream
# copy skills/firecrawl-build* and firecrawl-research-index into firecrawl-skills/skills/
# re-apply patches in onboarding, scrape, build, auth-and-env (git diff helps)
git -C /tmp/firecrawl-skills-upstream rev-parse HEAD > firecrawl-skills/UPSTREAM_SKILLS_SHA
```

Drift is intentional and easy to spot in git.

## Related

- Server docs: `SELF_HOST.md`, `AGENTS.md`
- Deploy: `scripts/deploy-selfhost.sh`
- CLI live-web skills (optional): `npx -y firecrawl-cli@latest init --all --browser`
