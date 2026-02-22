import { describe, it, expect, vi, beforeEach } from "vitest";
import { verifyR2Connection } from "./connection";
import type { R2Config } from "./r2-config";

const mockSend = vi.fn();

// Mock s3-client factory to return a controllable client
vi.mock("./s3-client", () => ({
  getS3Client: vi.fn().mockImplementation(() => ({
    send: mockSend,
  })),
}));

// Mock only HeadBucketCommand from AWS SDK
vi.mock("@aws-sdk/client-s3", () => {
  const MockHeadBucketCommand = vi.fn().mockImplementation((input) => input);
  return {
    HeadBucketCommand: MockHeadBucketCommand,
  };
});

import { getS3Client } from "./s3-client";

describe("verifyR2Connection", () => {
  const config: R2Config = {
    endpoint: "https://test-account.r2.cloudflarestorage.com",
    accessKeyId: "test-key",
    secretAccessKey: "test-secret",
    bucketName: "test-bucket",
    customDomain: "cdn.test.com",
    jpgQuality: 90,
    fullPage: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return success when HeadBucket succeeds", async () => {
    mockSend.mockResolvedValueOnce({});

    const result = await verifyR2Connection(config);

    expect(result).toEqual({ ok: true });
  });

  it("should return failure with error message on rejection", async () => {
    mockSend.mockRejectedValueOnce(new Error("Access Denied"));

    const result = await verifyR2Connection(config);

    expect(result).toEqual({ ok: false, error: "Access Denied" });
  });

  it("should handle non-Error rejections", async () => {
    mockSend.mockRejectedValueOnce("something weird");

    const result = await verifyR2Connection(config);

    expect(result).toEqual({ ok: false, error: "Connection failed" });
  });

  it("should use getS3Client with config", async () => {
    mockSend.mockResolvedValueOnce({});

    await verifyR2Connection(config);

    expect(getS3Client).toHaveBeenCalledWith(config);
  });
});
