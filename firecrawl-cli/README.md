# Firecrawl CLI

[Firecrawl CLI repository](https://github.com/firecrawl/cli)

Command-line tools for using Firecrawl from the terminal, including search,
scrape, crawl, map, interact, and agent jobs.

## Self-host (this fork)

Point the CLI at your instance (Tailscale hostname or localhost):

```bash
firecrawl config -k test --api-url http://statice:3002
# or per-command:
firecrawl --api-url http://statice:3002 scrape https://example.com
# or env:
export FIRECRAWL_API_URL=http://statice:3002
```

Stored config lives in `~/.config/firecrawl-cli/credentials.json`.

## CLI vs MCP

Keep both. They share the same `FIRECRAWL_API_URL`:

| Surface | Use for |
|---|---|
| **CLI** (`firecrawl …`) | Terminal, scripts, one-off scrape/search |
| **MCP** (`firecrawl-mcp` in Cursor/Claude) | Agent tool calls in the IDE |

Cursor MCP for this machine should set `FIRECRAWL_API_URL` the same way (e.g.
`http://statice:3002`). See `firecrawl-skills/mcp.json`.
