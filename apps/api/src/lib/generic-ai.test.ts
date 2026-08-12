import { generateObject } from "ai";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

// These assert the request that actually leaves the process. Asserting a
// provider-options helper instead would pass even when the AI SDK ignores the
// option, which is precisely the bug this guards against: MiMo implements
// `response_format: {"type":"json_object"}` and rejects `json_schema`.
const CHAT_COMPLETION = {
  id: "test",
  object: "chat.completion",
  created: 0,
  model: "mimo-v2.5-pro",
  choices: [
    {
      index: 0,
      message: { role: "assistant", content: '{"title":"hello"}' },
      finish_reason: "stop",
    },
  ],
  usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
};

// generic-ai reads config once at module load, so each case re-imports it.
async function loadWithConfig(overrides: Record<string, unknown>) {
  vi.resetModules();
  vi.doMock("../config", () => ({
    config: {
      MIMO_API_KEY: "test-key",
      MIMO_BASE_URL: "https://token-plan-sgp.xiaomimimo.com/v1",
      ...overrides,
    },
  }));
  return await import("./generic-ai.js");
}

function stubFetch() {
  const fetchMock = vi.fn(
    async () =>
      new Response(JSON.stringify(CHAT_COMPLETION), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function requestBodyFor(overrides: Record<string, unknown> = {}) {
  const { getModel } = await loadWithConfig(overrides);
  const fetchMock = stubFetch();

  await generateObject({
    model: getModel("mimo-v2.5-pro", "mimo"),
    schema: z.object({ title: z.string() }),
    prompt: "extract the title",
  });

  const [url, init] = fetchMock.mock.calls[0] as unknown as [
    string,
    RequestInit,
  ];
  return { url: String(url), body: JSON.parse(init.body as string) };
}

describe("the mimo provider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("asks for JSON mode rather than a json_schema response format", async () => {
    const { body, url } = await requestBodyFor();
    expect(url).toBe(
      "https://token-plan-sgp.xiaomimimo.com/v1/chat/completions",
    );
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.model).toBe("mimo-v2.5-pro");
  });

  it("describes the schema in the prompt, since JSON mode drops it", async () => {
    const { body } = await requestBodyFor();
    const system = body.messages.find((m: any) => m.role === "system");
    expect(system).toBeDefined();
    // The shape has to survive into the messages or MiMo returns valid JSON of
    // an arbitrary shape and downstream schema validation rejects every scrape.
    expect(system.content).toContain('"title"');
    expect(JSON.parse(/\{.*\}/s.exec(system.content)![0])).toMatchObject({
      type: "object",
      properties: { title: { type: "string" } },
    });
    expect(body.messages.at(-1)).toEqual({
      role: "user",
      content: "extract the title",
    });
  });

  it("leaves the thinking field off so MiMo's own default applies", async () => {
    const { body } = await requestBodyFor();
    expect(body).not.toHaveProperty("thinking");
  });

  it("forwards MIMO_THINKING, which is not an OpenAI parameter", async () => {
    const { body } = await requestBodyFor({ MIMO_THINKING: "disabled" });
    expect(body.thinking).toEqual({ type: "disabled" });
  });

  it("is remapped onto by MODEL_PROVIDER, as extract call sites rely on", async () => {
    const { getModel } = await loadWithConfig({
      MODEL_PROVIDER: "mimo",
      MODEL_NAME: "mimo-v2.5-pro",
    });
    const fetchMock = stubFetch();

    // Every llmExtract call site passes "openai" explicitly.
    await generateObject({
      model: getModel("gpt-4o-mini", "openai"),
      schema: z.object({ title: z.string() }),
      prompt: "extract the title",
    });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(String(url)).toContain("xiaomimimo.com");
    expect(JSON.parse(init.body as string).model).toBe("mimo-v2.5-pro");
  });
});
