import { z } from "zod";
import { config } from "../../../../config";
import { EngineScrapeResult } from "..";
import { Meta } from "../..";
import { robustFetch } from "../../lib/fetch";
import { getInnerJson } from "@mendable/firecrawl-rs";
import { hasFormatOfType } from "../../../../lib/format-utils";
import { getBrandingScript } from "../fire-engine/brandingScript";
import {
  BrandingFailedError,
  ScreenshotFailedError,
} from "../../error";

const BRANDING_DEFAULT_WAIT_MS = 2000;

export async function scrapeURLWithPlaywright(
  meta: Meta,
): Promise<EngineScrapeResult> {
  const screenshotFormat = hasFormatOfType(meta.options.formats, "screenshot");
  const hasScreenshot = !!screenshotFormat;
  const hasBranding = !!hasFormatOfType(meta.options.formats, "branding");

  const defaultWait = hasBranding ? BRANDING_DEFAULT_WAIT_MS : 0;
  const waitAfterLoad =
    meta.options.waitFor != null && meta.options.waitFor !== 0
      ? meta.options.waitFor
      : defaultWait;

  const response = await robustFetch({
    url: config.PLAYWRIGHT_MICROSERVICE_URL!,
    headers: {
      "Content-Type": "application/json",
    },
    body: {
      url: meta.rewrittenUrl ?? meta.url,
      wait_after_load: waitAfterLoad,
      timeout: meta.abort.scrapeTimeout(),
      headers: meta.options.headers,
      skip_tls_verification: meta.options.skipTlsVerification,
      ...(hasScreenshot
        ? {
            screenshot: true,
            full_page_screenshot: screenshotFormat?.fullPage === true,
            ...(screenshotFormat?.viewport
              ? { viewport: screenshotFormat.viewport }
              : {}),
            ...(screenshotFormat?.quality != null
              ? { screenshot_quality: screenshotFormat.quality }
              : {}),
          }
        : {}),
      ...(hasBranding
        ? {
            execute_javascript: getBrandingScript(),
          }
        : {}),
    },
    method: "POST",
    logger: meta.logger.child("scrapeURLWithPlaywright/robustFetch"),
    schema: z.object({
      content: z.string(),
      pageStatusCode: z.number(),
      pageError: z.string().optional(),
      contentType: z.string().optional(),
      screenshot: z.string().optional(),
      javascript_return: z
        .object({
          type: z.string(),
          value: z.unknown(),
        })
        .optional(),
      error: z.string().optional(),
    }),
    mock: meta.mock,
    abort: meta.abort.asSignal(),
  });

  if (response.error) {
    throw new Error(response.error);
  }

  if (response.contentType?.includes("application/json")) {
    response.content = await getInnerJson(response.content);
  }

  if (hasScreenshot) {
    if (!response.screenshot || response.screenshot.length === 0) {
      throw new ScreenshotFailedError(
        "Screenshot was requested but Playwright did not return a screenshot.",
      );
    }
  }

  if (hasBranding) {
    const jsReturn = response.javascript_return;
    const value = jsReturn?.value as { branding?: unknown } | undefined;
    if (
      !jsReturn ||
      jsReturn.type !== "object" ||
      value == null ||
      typeof value !== "object" ||
      !("branding" in value)
    ) {
      throw new BrandingFailedError(
        "Branding was requested but Playwright did not return branding extraction data.",
      );
    }
  }

  return {
    url: meta.rewrittenUrl ?? meta.url, // TODO: impove redirect following
    html: response.content,
    statusCode: response.pageStatusCode,
    error: response.pageError,
    contentType: response.contentType,
    screenshot: response.screenshot,
    ...(response.javascript_return
      ? {
          actions: {
            screenshots: [],
            scrapes: [],
            javascriptReturns: [response.javascript_return],
            pdfs: [],
          },
        }
      : {}),

    proxyUsed: "basic",
  };
}

export function playwrightMaxReasonableTime(meta: Meta): number {
  const hasBranding = !!hasFormatOfType(meta.options.formats, "branding");
  const wait =
    meta.options.waitFor != null && meta.options.waitFor !== 0
      ? meta.options.waitFor
      : hasBranding
        ? BRANDING_DEFAULT_WAIT_MS
        : 0;
  return wait + 30000;
}
