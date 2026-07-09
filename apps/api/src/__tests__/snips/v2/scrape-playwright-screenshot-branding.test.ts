import {
  concurrentIf,
  HAS_PLAYWRIGHT,
  HAS_FIRE_ENGINE,
  ALLOW_TEST_SUITE_WEBSITE,
  TEST_SUITE_WEBSITE,
} from "../lib";
import { scrape, scrapeWithFailure, scrapeTimeout, idmux, Identity } from "./lib";

let identity: Identity;

beforeAll(async () => {
  identity = await idmux({
    name: "scrape-playwright-screenshot-branding",
    concurrency: 100,
    credits: 1000000,
  });
}, 10000 + scrapeTimeout);

const canRunPlaywrightSelfHost =
  HAS_PLAYWRIGHT && !HAS_FIRE_ENGINE && ALLOW_TEST_SUITE_WEBSITE;

describe("Self-host Playwright screenshot + branding", () => {
  concurrentIf(canRunPlaywrightSelfHost)(
    "screenshot format returns a data URL",
    async () => {
      const response = await scrape(
        {
          url: TEST_SUITE_WEBSITE,
          formats: ["screenshot"],
        },
        identity,
      );

      expect(typeof response.screenshot).toBe("string");
      expect(response.screenshot!.startsWith("data:image/")).toBe(true);
    },
    scrapeTimeout,
  );

  concurrentIf(canRunPlaywrightSelfHost)(
    "fullPage screenshot format returns a data URL",
    async () => {
      const response = await scrape(
        {
          url: TEST_SUITE_WEBSITE,
          formats: [{ type: "screenshot", fullPage: true }],
        },
        identity,
      );

      expect(typeof response.screenshot).toBe("string");
      expect(response.screenshot!.startsWith("data:image/")).toBe(true);
    },
    scrapeTimeout,
  );

  concurrentIf(canRunPlaywrightSelfHost)(
    "branding format returns branding profile fields",
    async () => {
      const response = await scrape(
        {
          url: TEST_SUITE_WEBSITE,
          formats: ["branding"],
        },
        identity,
      );

      expect(response.branding).toBeDefined();
      expect(response.branding?.colors).toBeDefined();
      expect(response.branding?.typography).toBeDefined();
    },
    scrapeTimeout,
  );

  concurrentIf(canRunPlaywrightSelfHost)(
    "does not succeed without screenshot when screenshot was requested",
    async () => {
      // Engine claims screenshot support; coerceFieldsToFormats must hard-fail
      // if the field is somehow missing rather than returning a soft success.
      const response = await scrape(
        {
          url: TEST_SUITE_WEBSITE,
          formats: ["screenshot"],
        },
        identity,
      );
      expect(response.screenshot).toBeTruthy();
    },
    scrapeTimeout,
  );

  concurrentIf(HAS_PLAYWRIGHT && !HAS_FIRE_ENGINE)(
    "branding on a PDF URL fails loudly",
    async () => {
      const failure = await scrapeWithFailure(
        {
          url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
          formats: ["branding"],
          parsers: ["pdf"],
        },
        identity,
      );

      expect(failure.success).toBe(false);
      expect(typeof failure.error).toBe("string");
      expect(failure.error.toLowerCase()).toMatch(/branding|pdf|supported/);
    },
    scrapeTimeout,
  );
});
