import { createOpenAI } from "@ai-sdk/openai";
import { LanguageModelMiddleware, wrapLanguageModel } from "ai";
import { config } from "../config";
import { createOllama } from "ollama-ai-provider-v2";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGroq } from "@ai-sdk/groq";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createFireworks } from "@ai-sdk/fireworks";
import { createDeepInfra } from "@ai-sdk/deepinfra";
import { createVertex } from "@ai-sdk/google-vertex";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

type Provider =
  | "openai"
  | "ollama"
  | "anthropic"
  | "groq"
  | "google"
  | "openrouter"
  | "fireworks"
  | "deepinfra"
  | "vertex"
  | "mimo";

const PROVIDERS = new Set<Provider>([
  "openai",
  "ollama",
  "anthropic",
  "groq",
  "google",
  "openrouter",
  "fireworks",
  "deepinfra",
  "vertex",
  "mimo",
]);

/** Providers that serve no embeddings route, so must not be used for one. */
const PROVIDERS_WITHOUT_EMBEDDINGS = new Set<Provider>([
  "anthropic",
  "groq",
  "openrouter",
  "mimo",
]);

/**
 * In JSON mode the schema never reaches the model: the AI SDK drops it (it
 * only travels inside a `json_schema` response format) and does not fall back
 * to describing it in the prompt. MiMo would then return syntactically valid
 * but arbitrarily shaped JSON, which fails schema validation downstream. Its
 * docs are explicit that the expected structure has to be spelled out in the
 * messages, so do that here -- at the provider, where every call site gets it.
 */
const describeSchemaInPrompt: LanguageModelMiddleware = {
  specificationVersion: "v3",
  transformParams: async ({ params }) => {
    if (
      params.responseFormat?.type !== "json" ||
      !params.responseFormat.schema
    ) {
      return params;
    }
    const { schema, ...responseFormat } = params.responseFormat;
    return {
      ...params,
      // Keep JSON mode, drop the schema the endpoint cannot accept.
      responseFormat,
      prompt: [
        {
          role: "system" as const,
          content: [
            "Respond with JSON only -- no explanations, no markdown code fences.",
            "The JSON must match this JSON Schema exactly, including field names, types and nesting:",
            JSON.stringify(schema),
            "Use null for any field whose value is unknown.",
          ].join("\n"),
        },
        ...params.prompt,
      ],
    };
  },
};

/**
 * MiMo's chain-of-thought switch is a top-level `thinking` body field rather
 * than an OpenAI parameter, so the AI SDK has no way to emit it. Inject it on
 * the way out when `MIMO_THINKING` is set; leaving it unset defers to MiMo's
 * own default.
 */
const mimoFetch: typeof fetch = async (input, init) => {
  if (!config.MIMO_THINKING || typeof init?.body !== "string") {
    return fetch(input, init);
  }
  const body = JSON.parse(init.body);
  body.thinking = { type: config.MIMO_THINKING };
  return fetch(input, { ...init, body: JSON.stringify(body) });
};

function parseModelProvider(raw: string | undefined): Provider | undefined {
  if (!raw) return undefined;
  const normalized = raw.trim().toLowerCase() as Provider;
  return PROVIDERS.has(normalized) ? normalized : undefined;
}

/** Env override for self-host (e.g. MODEL_PROVIDER=google). */
const configuredProvider = parseModelProvider(config.MODEL_PROVIDER);

/**
 * Default provider when call sites omit an explicit provider and MODEL_PROVIDER
 * is unset. Ollama wins when OLLAMA_BASE_URL is set (legacy self-host).
 */
const inferredDefaultProvider: Provider = config.OLLAMA_BASE_URL
  ? "ollama"
  : "openai";

const defaultProvider: Provider = configuredProvider ?? inferredDefaultProvider;

const providerList: Record<Provider, any> = {
  openai: createOpenAI({
    apiKey: config.OPENAI_API_KEY,
    baseURL: config.OPENAI_BASE_URL,
  }),
  ollama: createOllama({
    baseURL: config.OLLAMA_BASE_URL,
  }),
  anthropic: createAnthropic({
    apiKey: config.ANTHROPIC_API_KEY,
  }),
  groq: createGroq({
    apiKey: config.GROQ_API_KEY,
  }),
  google: createGoogleGenerativeAI({
    apiKey: config.GOOGLE_GENERATIVE_AI_API_KEY,
  }),
  openrouter: createOpenRouter({
    apiKey: config.OPENROUTER_API_KEY,
  }),
  fireworks: createFireworks({
    apiKey: config.FIREWORKS_API_KEY,
  }),
  deepinfra: createDeepInfra({
    apiKey: config.DEEPINFRA_API_KEY,
  }),
  // MiMo speaks Chat Completions and accepts `response_format` values `text`
  // and `json_object` only -- no `json_schema`. The OpenAI-compatible provider
  // defaults `supportsStructuredOutputs` to false, which is exactly that
  // contract: generateObject falls back to JSON mode and the AI SDK describes
  // the schema in the prompt instead. Routing MiMo through the plain `openai`
  // provider would send a strict json_schema request that MiMo rejects.
  mimo: (modelName: string) =>
    wrapLanguageModel({
      model: createOpenAICompatible({
        name: "mimo",
        apiKey: config.MIMO_API_KEY,
        baseURL: config.MIMO_BASE_URL,
        fetch: mimoFetch,
      })(modelName),
      middleware: describeSchemaInPrompt,
    }),
  vertex: createVertex({
    project: "firecrawl",
    //https://github.com/vercel/ai/issues/6644 bug
    baseURL:
      "https://aiplatform.googleapis.com/v1/projects/firecrawl/locations/global/publishers/google",
    location: "global",
    googleAuthOptions: config.VERTEX_CREDENTIALS
      ? {
          credentials: JSON.parse(atob(config.VERTEX_CREDENTIALS)),
        }
      : {
          keyFile: "./gke-key.json",
        },
  }),
};

function resolveModelName(name: string): string {
  return config.MODEL_NAME || name;
}

function instantiateModel(modelName: string, provider: Provider) {
  // o3-mini returns empty text via the Responses API — force Chat Completions
  if (provider === "openai" && modelName.startsWith("o3-mini")) {
    return providerList.openai.chat(modelName);
  }
  return providerList[provider](modelName);
}

/** The provider a `getModel(name, provider)` call actually resolves to. */
function resolveProvider(provider: Provider): Provider {
  return configuredProvider ?? provider;
}

/**
 * Resolve a chat model. When `MODEL_PROVIDER` is set (self-host), it overrides
 * the call-site provider so extract/scrape paths can switch without editing
 * every `getModel(..., "openai")` hardcode. Specialty multi-provider call
 * sites should use {@link getModelExact} instead.
 */
export function getModel(name: string, provider: Provider = defaultProvider) {
  if (name === "gemini-2.5-pro") {
    name = "gemini-2.5-pro";
  }
  return instantiateModel(resolveModelName(name), resolveProvider(provider));
}

/**
 * Like {@link getModel} but never remapped by `MODEL_PROVIDER` or `MODEL_NAME`.
 * Use for intentional provider-specific paths (Vertex rerank, browser agent, etc.).
 */
export function getModelExact(name: string, provider: Provider) {
  return instantiateModel(name, provider);
}

export function getEmbeddingModel(
  name: string,
  provider: Provider = defaultProvider,
) {
  // A chat-only MODEL_PROVIDER (MiMo, Groq, ...) must not hijack embeddings:
  // those endpoints serve no embeddings route, so keep the call-site provider.
  const resolvedProvider =
    configuredProvider && !PROVIDERS_WITHOUT_EMBEDDINGS.has(configuredProvider)
      ? configuredProvider
      : provider;
  return config.MODEL_EMBEDDING_NAME
    ? providerList[resolvedProvider].embedding(config.MODEL_EMBEDDING_NAME)
    : providerList[resolvedProvider].embedding(name);
}
