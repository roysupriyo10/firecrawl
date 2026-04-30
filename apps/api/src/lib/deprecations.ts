import { NextFunction, Request, Response } from "express";

interface Deprecation {
  message: string;
  replacement?: string;
  sunset?: string;
  docs?: string;
}

const DEPRECATIONS = {
  v1_extract: {
    message:
      "POST /v1/extract is deprecated. Use POST /v2/scrape with formats including a 'json' format object.",
    replacement: "/v2/scrape",
  },
  v1_extract_status: {
    message:
      "GET /v1/extract/:jobId is deprecated. Use POST /v2/scrape with formats including a 'json' format object.",
    replacement: "/v2/scrape",
  },
  v2_extract: {
    message:
      "POST /v2/extract is deprecated. Use POST /v2/scrape with formats including a 'json' format object.",
    replacement: "/v2/scrape",
  },
  v2_extract_status: {
    message:
      "GET /v2/extract/:jobId is deprecated. Use POST /v2/scrape with formats including a 'json' format object.",
    replacement: "/v2/scrape",
  },
  v1_deep_research: {
    message:
      "POST /v1/deep-research is deprecated. Use POST /v2/search instead.",
    replacement: "/v2/search",
  },
  v1_deep_research_status: {
    message:
      "GET /v1/deep-research/:jobId is deprecated. Use POST /v2/search instead.",
    replacement: "/v2/search",
  },
  v1_llmstxt: {
    message: "POST /v1/llmstxt is deprecated and will not be replaced.",
  },
  v1_llmstxt_status: {
    message: "GET /v1/llmstxt/:jobId is deprecated and will not be replaced.",
  },
} as const satisfies Record<string, Deprecation>;

type DeprecationKey = keyof typeof DEPRECATIONS;

export function deprecationMiddleware(key: DeprecationKey) {
  const dep: Deprecation = DEPRECATIONS[key];
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Deprecation", "true");
    if (dep.sunset) res.setHeader("Sunset", dep.sunset);
    if (dep.docs) res.setHeader("Link", `<${dep.docs}>; rel="deprecation"`);

    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (body && typeof body === "object" && !Array.isArray(body)) {
        body.warning = body.warning
          ? `${dep.message} (${body.warning})`
          : dep.message;
        if (dep.replacement && body.replacement === undefined) {
          body.replacement = dep.replacement;
        }
      }
      return originalJson(body);
    };
    next();
  };
}
