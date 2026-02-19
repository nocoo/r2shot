import { describe, it, expect, vi, beforeEach } from "vitest";
import { verifyR2Connection } from "./connection";
import type { R2Config } from "./r2-config";

vi.mock("@aws-sdk/client-s3", () => {
  const mockSend = vi.fn();
  const MockS3Client = vi.fn().mockImplementation(() => ({
    send: mockSend,
  }));
  const MockHeadBucketCommand = vi.fn().mockImplementation((input) => input);
  return {
    S3Client: MockS3Client,
    HeadBucketCommand: MockHeadBucketCommand,
    _mockSend: mockSend,
  };
});

describe("verifyR2Connection", () => {
  const config: R2Config = {
    endpoint: "https://test-account.r2.cloudflarestorage.com",
    accessKeyId: "test-key",
    secretAccessKey: "test-secret",
    bucketName: "test-bucket",
    customDomain: "cdn.test.com",
    jpgQuality: 90,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return success when HeadBucket succeeds", async () => {
    const { _mockSend } = (await import("@aws-sdk/client-s3")) as unknown as {
      _mockSend: ReturnType<typeof vi.fn>;
    };
    _mockSend.mockResolvedValueOnce({});

    const result = await verifyR2Connection(config);

    expect(result).toEqual({ ok: true });
  });

  it("should return failure with error message on rejection", async () => {
    const { _mockSend } = (await import("@aws-sdk/client-s3")) as unknown as {
      _mockSend: ReturnType<typeof vi.fn>;
    };
    _mockSend.mockRejectedValueOnce(new Error("Access Denied"));

    const result = await verifyR2Connection(config);

    expect(result).toEqual({ ok: false, error: "Access Denied" });
  });

  it("should handle non-Error rejections", async () => {
    const { _mockSend } = (await import("@aws-sdk/client-s3")) as unknown as {
      _mockSend: ReturnType<typeof vi.fn>;
    };
    _mockSend.mockRejectedValueOnce("something weird");

    const result = await verifyR2Connection(config);

    expect(result).toEqual({ ok: false, error: "Connection failed" });
  });

  it("should use correct R2 endpoint", async () => {
    const { S3Client, _mockSend } = (await import(
      "@aws-sdk/client-s3"
    )) as unknown as {
      S3Client: ReturnType<typeof vi.fn>;
      _mockSend: ReturnType<typeof vi.fn>;
    };
    _mockSend.mockResolvedValueOnce({});

    await verifyR2Connection(config);

    expect(S3Client).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: "https://test-account.r2.cloudflarestorage.com",
      }),
    );
  });
});
