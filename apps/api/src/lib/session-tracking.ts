import type { Request } from "express";

const HEADERS = [
  "x-firecrawl-session-id",
  "x-firecrawl-mcp-session-id",
  "mcp-session-id",
];

export function getSessionId(req: Request): string | null {
  for (const name of HEADERS) {
    const raw = req.headers[name];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (typeof value === "string" && value.trim()) {
      return value.trim().slice(0, 128);
    }
  }
  return null;
}
