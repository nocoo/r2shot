import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * E2E test: simulates the complete capture-and-upload workflow
 * from the user's perspective, as if running in a real Chrome extension.
 *
 * We mock only the external boundaries:
 * - chrome.tabs.captureVisibleTab (browser API)
 * - chrome.storage.local (browser API)
 * - S3Client.send (network I/O)
 *
 * Everything else (validation, blob conversion, key generation, URL building)
 * runs through real code paths.
 */

// Mock S3
const mockS3Send = vi.fn().mockResolvedValue({});
vi.mock("@aws-sdk/client-s3", () => {
  const MockS3Client = vi.fn().mockImplementation(() => ({
    send: mockS3Send,
  }));
  const MockPutObjectCommand = vi.fn().mockImplementation((input) => input);
  const MockHeadBucketCommand = vi.fn().mockImplementation((input) => input);
  return {
    S3Client: MockS3Client,
    PutObjectCommand: MockPutObjectCommand,
    HeadBucketCommand: MockHeadBucketCommand,
  };
});

// Mock chrome APIs
const configStore: Record<string, unknown> = {};

vi.stubGlobal("chrome", {
  storage: {
    local: {
      get: vi.fn((keys: string[]) => {
        const result: Record<string, unknown> = {};
        for (const key of keys) {
          if (key in configStore) result[key] = configStore[key];
        }
        return Promise.resolve(result);
      }),
      set: vi.fn((items: Record<string, unknown>) => {
        Object.assign(configStore, items);
        return Promise.resolve();
      }),
    },
  },
  tabs: {
    captureVisibleTab: vi.fn(),
  },
});

import { handleMessage } from "../src/background/message-handler";
import { saveConfig } from "../src/core/storage";
import type { R2Config } from "../src/core/r2-config";

describe("E2E: complete capture-and-upload workflow", () => {
  const validConfig: R2Config = {
    accountId: "e2e-account",
    accessKeyId: "e2e-key-id",
    secretAccessKey: "e2e-secret-key",
    bucketName: "e2e-bucket",
    cdnUrl: "https://cdn.e2e-test.com",
    jpgQuality: 90,
  };

  // A minimal valid JPEG as base64 (1x1 pixel white)
  const TINY_JPEG_B64 =
    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRof" +
    "Hh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwh" +
    "MjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAAR" +
    "CAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgED" +
    "AwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcY" +
    "GRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJ" +
    "ipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo" +
    "6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgEC" +
    "BAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl" +
    "8RcYI4Q/RFhHRUYnJCk3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SF" +
    "hoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk" +
    "5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+gD/2Q==";

  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(configStore)) delete configStore[key];
  });

  it("should fail when no config is saved", async () => {
    const result = await handleMessage({ type: "CAPTURE_AND_UPLOAD" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Invalid configuration");
    }
  });

  it("should capture screenshot, upload to R2, and return CDN URL", async () => {
    // Step 1: Save config (simulates user configuring settings)
    await saveConfig(validConfig);

    // Step 2: Mock the screenshot capture
    const fakeDataUrl = `data:image/jpeg;base64,${TINY_JPEG_B64}`;
    vi.mocked(chrome.tabs.captureVisibleTab).mockResolvedValue(fakeDataUrl);

    // Step 3: Execute the capture-and-upload workflow
    const result = await handleMessage({ type: "CAPTURE_AND_UPLOAD" });

    // Step 4: Assertions
    expect(result.success).toBe(true);
    if (result.success && "url" in result) {
      // URL should be a valid CDN URL with date folder and GUID filename
      expect(result.url).toMatch(
        /^https:\/\/cdn\.e2e-test\.com\/\d{4}-\d{2}-\d{2}\/[a-f0-9-]+\.jpg$/,
      );
    }

    // Verify the S3 upload was called
    expect(mockS3Send).toHaveBeenCalledTimes(1);

    // Verify the screenshot was captured with correct quality
    expect(chrome.tabs.captureVisibleTab).toHaveBeenCalledWith(undefined, {
      format: "jpeg",
      quality: 90,
    });
  });

  it("should use custom jpg quality from config", async () => {
    await saveConfig({ ...validConfig, jpgQuality: 75 });

    vi.mocked(chrome.tabs.captureVisibleTab).mockResolvedValue(
      `data:image/jpeg;base64,${TINY_JPEG_B64}`,
    );

    await handleMessage({ type: "CAPTURE_AND_UPLOAD" });

    expect(chrome.tabs.captureVisibleTab).toHaveBeenCalledWith(undefined, {
      format: "jpeg",
      quality: 75,
    });
  });

  it("should handle screenshot capture failure gracefully", async () => {
    await saveConfig(validConfig);

    vi.mocked(chrome.tabs.captureVisibleTab).mockRejectedValue(
      new Error("No active tab"),
    );

    const result = await handleMessage({ type: "CAPTURE_AND_UPLOAD" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No active tab");
    }
  });

  it("should handle S3 upload failure gracefully", async () => {
    await saveConfig(validConfig);

    vi.mocked(chrome.tabs.captureVisibleTab).mockResolvedValue(
      `data:image/jpeg;base64,${TINY_JPEG_B64}`,
    );
    mockS3Send.mockRejectedValueOnce(new Error("Forbidden"));

    const result = await handleMessage({ type: "CAPTURE_AND_UPLOAD" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Forbidden");
    }
  });
});

describe("E2E: connection verification workflow", () => {
  const validConfig: R2Config = {
    accountId: "e2e-account",
    accessKeyId: "e2e-key-id",
    secretAccessKey: "e2e-secret-key",
    bucketName: "e2e-bucket",
    cdnUrl: "https://cdn.e2e-test.com",
    jpgQuality: 90,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(configStore)) delete configStore[key];
  });

  it("should verify connection successfully", async () => {
    await saveConfig(validConfig);
    mockS3Send.mockResolvedValueOnce({}); // HeadBucket success

    const result = await handleMessage({ type: "VERIFY_CONNECTION" });

    expect(result.success).toBe(true);
  });

  it("should report connection failure", async () => {
    await saveConfig(validConfig);
    mockS3Send.mockRejectedValueOnce(new Error("Access Denied"));

    const result = await handleMessage({ type: "VERIFY_CONNECTION" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Access Denied");
    }
  });
});
