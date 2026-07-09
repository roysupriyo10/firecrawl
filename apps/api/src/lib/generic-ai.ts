import { createOpenAI } from "@ai-sdk/openai";
import { config } from "../config";
import { createOllama } from "ollama-ai-provider-v2";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGroq } from "@ai-sdk/groq";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createFireworks } from "@ai-sdk/fireworks";
import { createDeepInfra } from "@ai-sdk/deepinfra";
import { createVertex } from "@ai-sdk/google-vertex";

export type Provider =
  | "openai"
  | "ollama"
  | "anthropic"
  | "groq"
  | "google"
  | "openrouter"
  | "fireworks"
  | "deepinfra"
  | "vertex";

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
]);

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
  const resolvedProvider = configuredProvider ?? provider;
  return instantiateModel(resolveModelName(name), resolvedProvider);
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
  const resolvedProvider = configuredProvider ?? provider;
  return config.MODEL_EMBEDDING_NAME
    ? providerList[resolvedProvider].embedding(config.MODEL_EMBEDDING_NAME)
    : providerList[resolvedProvider].embedding(name);
}
