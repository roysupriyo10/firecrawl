const mockSave = jest.fn();
const mockDownload = jest.fn();
const mockFile = jest.fn(() => ({
  save: mockSave,
  download: mockDownload,
}));
const mockBucket = jest.fn(() => ({
  file: mockFile,
}));
const mockConfig: { GCS_BUCKET_NAME?: string } = {};

jest.mock("../config", () => ({
  config: mockConfig,
}));

jest.mock("./gcs-jobs", () => ({
  storage: {
    bucket: mockBucket,
  },
}));

import { monitorDiffGcsKey, saveMonitorDiffArtifact } from "./gcs-monitoring";

const artifact = {
  kind: "markdown" as const,
  url: "https://example.com",
  previousScrapeId: "previous",
  currentScrapeId: "current",
  generatedAt: "2026-05-24T00:00:00.000Z",
  text: "diff text",
  json: { changed: true },
};

beforeEach(() => {
  mockConfig.GCS_BUCKET_NAME = undefined;
  mockSave.mockReset();
  mockDownload.mockReset();
  mockFile.mockClear();
  mockBucket.mockClear();
  jest.spyOn(Math, "random").mockReturnValue(0);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("monitorDiffGcsKey", () => {
  const params = {
    teamId: "team-123",
    monitorId: "monitor-456",
    checkId: "check-789",
    pageId: "page-abc",
  };

  it("places a stable hash shard before tenant-specific identifiers", () => {
    const key = monitorDiffGcsKey(params);

    expect(key).toMatch(
      /^monitors\/diffs\/v2\/[0-9a-f]{4}\/team-123\/monitor-456\/check-789\/page-abc\.diff\.json$/,
    );
    expect(key).toBe(monitorDiffGcsKey(params));
    expect(key).not.toBe(
      "monitors/team-123/monitor-456/check-789/page-abc.diff.json",
    );
  });

  it("changes shards when the page id changes", () => {
    const first = monitorDiffGcsKey(params).split("/")[3];
    const second = monitorDiffGcsKey({
      ...params,
      pageId: "page-def",
    }).split("/")[3];

    expect(second).not.toBe(first);
  });
});

describe("saveMonitorDiffArtifact", () => {
  it("returns artifact sizes without writing when GCS is not configured", async () => {
    const result = await saveMonitorDiffArtifact("key", artifact);

    expect(result).toEqual({
      textBytes: Buffer.byteLength(artifact.text),
      jsonBytes: Buffer.byteLength(JSON.stringify(artifact.json)),
    });
    expect(mockBucket).not.toHaveBeenCalled();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("retries retryable GCS write failures with jitter", async () => {
    mockConfig.GCS_BUCKET_NAME = "monitor-bucket";
    mockSave
      .mockRejectedValueOnce({ code: 429 })
      .mockRejectedValueOnce({ statusCode: 503 })
      .mockResolvedValueOnce(undefined);

    await expect(saveMonitorDiffArtifact("key", artifact)).resolves.toEqual({
      textBytes: Buffer.byteLength(artifact.text),
      jsonBytes: Buffer.byteLength(JSON.stringify(artifact.json)),
    });

    expect(mockBucket).toHaveBeenCalledWith("monitor-bucket");
    expect(mockFile).toHaveBeenCalledWith("key");
    expect(mockSave).toHaveBeenCalledTimes(3);
    expect(Math.random).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-retryable GCS write failures", async () => {
    mockConfig.GCS_BUCKET_NAME = "monitor-bucket";
    const error = { code: 400 };
    mockSave.mockRejectedValueOnce(error);

    await expect(saveMonitorDiffArtifact("key", artifact)).rejects.toBe(error);

    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(Math.random).not.toHaveBeenCalled();
  });
});
