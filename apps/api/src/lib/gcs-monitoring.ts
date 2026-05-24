import { createHash } from "crypto";
import { config } from "../config";
import { storage } from "./gcs-jobs";

type MonitorDiffArtifactBase = {
  url: string;
  previousScrapeId: string | null;
  currentScrapeId: string | null;
  generatedAt: string;
};

export type MonitorDiffArtifact =
  | (MonitorDiffArtifactBase & {
      kind: "markdown";
      text: string;
      json: unknown;
    })
  | (MonitorDiffArtifactBase & {
      kind: "json";
      /** Per-field {previous, current} diff. */
      json: Record<string, { previous: unknown; current: unknown }>;
      /** Full current JSON extraction (the snapshot at this run). */
      snapshot: Record<string, unknown>;
      /**
       * Optional markdown diff sidecar. Populated only when the monitor's
       * formats requested both `"json"` and `"git-diff"` change-tracking
       * modes — in that case we run both diffs and report `changed` if
       * either path saw a change.
       */
      markdown?: {
        text: string;
        json: unknown;
      };
    });

const contentType = "application/json";
const monitorDiffGcsSaveMaxAttempts = 4;
const monitorDiffGcsRetryBaseMs = 250;
const monitorDiffGcsRetryMaxMs = 4_000;

export function monitorDiffGcsKey(params: {
  teamId: string;
  monitorId: string;
  checkId: string;
  pageId: string;
}): string {
  const shard = createHash("sha256")
    .update(
      `${params.teamId}:${params.monitorId}:${params.checkId}:${params.pageId}`,
    )
    .digest("hex")
    .slice(0, 4);

  // Keep the random shard before tenant/check identifiers so high-volume
  // monitor diff writes distribute across GCS object-name key ranges.
  return `monitors/diffs/v2/${shard}/${params.teamId}/${params.monitorId}/${params.checkId}/${params.pageId}.diff.json`;
}

function artifactBytes(artifact: MonitorDiffArtifact): {
  textBytes: number;
  jsonBytes: number;
} {
  const jsonBytes = Buffer.byteLength(JSON.stringify(artifact.json ?? null));
  let textBytes = 0;
  if (artifact.kind === "markdown") {
    textBytes = Buffer.byteLength(artifact.text);
  } else if (artifact.kind === "json" && artifact.markdown) {
    // Sidecar markdown diff (mixed-mode monitor) — count it so storage
    // accounting stays honest.
    textBytes = Buffer.byteLength(artifact.markdown.text);
  }
  return { textBytes, jsonBytes };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function monitorDiffGcsRetryDelayMs(attempt: number): number {
  const cap = Math.min(
    monitorDiffGcsRetryMaxMs,
    monitorDiffGcsRetryBaseMs * 2 ** attempt,
  );
  return Math.floor(Math.random() * cap);
}

function errorStatusCode(error: unknown): number | undefined {
  const value = error as {
    code?: unknown;
    statusCode?: unknown;
    response?: { status?: unknown };
    error?: { code?: unknown };
  };
  const status =
    value.statusCode ??
    value.code ??
    value.response?.status ??
    value.error?.code;
  if (typeof status === "number") return status;
  if (typeof status === "string") {
    const parsed = Number(status);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function isRetryableGcsWriteError(error: unknown): boolean {
  const status = errorStatusCode(error);
  if (status === 408 || status === 429) return true;
  if (status !== undefined && status >= 500 && status < 600) return true;

  const value = error as {
    message?: unknown;
    errors?: Array<{ reason?: unknown }>;
    error?: { errors?: Array<{ reason?: unknown }> };
  };
  const message =
    typeof value.message === "string" ? value.message.toLowerCase() : "";
  if (
    message.includes("retry limit exceeded") ||
    message.includes("ratelimitexceeded")
  ) {
    return true;
  }

  const nestedErrors = value.errors ?? value.error?.errors ?? [];
  return nestedErrors.some(entry => {
    const reason =
      typeof entry.reason === "string" ? entry.reason.toLowerCase() : "";
    return (
      reason === "ratelimitexceeded" ||
      reason === "backenderror" ||
      reason === "internalerror"
    );
  });
}

export async function saveMonitorDiffArtifact(
  key: string,
  artifact: MonitorDiffArtifact,
): Promise<{ textBytes: number; jsonBytes: number }> {
  const payload = JSON.stringify(artifact);
  if (!config.GCS_BUCKET_NAME) {
    return artifactBytes(artifact);
  }

  const bucket = storage.bucket(config.GCS_BUCKET_NAME);
  const file = bucket.file(key);

  for (let attempt = 0; attempt < monitorDiffGcsSaveMaxAttempts; attempt++) {
    try {
      await file.save(payload, {
        contentType,
        resumable: false,
      });
      break;
    } catch (error) {
      if (
        attempt === monitorDiffGcsSaveMaxAttempts - 1 ||
        !isRetryableGcsWriteError(error)
      ) {
        throw error;
      }
      await sleep(monitorDiffGcsRetryDelayMs(attempt));
    }
  }

  return artifactBytes(artifact);
}

export async function getMonitorDiffArtifact(
  key: string | null | undefined,
): Promise<MonitorDiffArtifact | null> {
  if (!key || !config.GCS_BUCKET_NAME) return null;

  const bucket = storage.bucket(config.GCS_BUCKET_NAME);
  try {
    const [contents] = await bucket.file(key).download();
    let parsed: unknown;
    try {
      parsed = JSON.parse(contents.toString());
    } catch {
      // Corrupt or truncated artifact — surface as "no diff" instead of
      // letting JSON.parse throw and break the entire check response.
      return null;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      // An unexpected payload shape (e.g. number, array, null) was written
      // here; treat as missing rather than risk reading kind off a non-object.
      return null;
    }
    const asPartial = parsed as Partial<MonitorDiffArtifact>;
    // Backwards compat: historical artifacts predate the `kind` field and
    // are always markdown.
    if (!asPartial.kind) {
      return { ...(asPartial as any), kind: "markdown" } as MonitorDiffArtifact;
    }
    return asPartial as MonitorDiffArtifact;
  } catch (error) {
    const maybeGcsError = error as { code?: number; statusCode?: number };
    if (maybeGcsError.code === 404 || maybeGcsError.statusCode === 404) {
      return null;
    }
    throw error;
  }
}
