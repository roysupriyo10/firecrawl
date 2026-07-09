# Firecrawl CLI skills pointer

Live-web CLI skills still come from the official CLI package:

```bash
npx -y firecrawl-cli@latest init --all --browser
# or: firecrawl setup skills
```

**Build + self-host skills** for this monorepo are merged under [`../firecrawl-skills`](../firecrawl-skills) (official vendored + fork overlay). Install once:

```bash
npx skills add ./firecrawl-skills
```
