import { describe, it, expect, vi, beforeEach } from "vitest";
import { getS3Client, resetS3Client } from "./s3-client";
import type { R2Config } from "./r2-config";

vi.mock("@aws-sdk/client-s3", () => {
  const MockS3Client = vi.fn().mockImplementation(() => ({
    send: vi.fn(),
  }));
  return { S3Client: MockS3Client };
});

import { S3Client } from "@aws-sdk/client-s3";

describe("s3-client", () => {
  const config: R2Config = {
    endpoint: "https://test.r2.cloudflarestorage.com",
    accessKeyId: "key-1",
    secretAccessKey: "secret-1",
    bucketName: "bucket-1",
    customDomain: "cdn.test.com",
    jpgQuality: 90,
    maxScreens: 5,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetS3Client();
  });

  it("should create a new S3Client on first call", () => {
    const client = getS3Client(config);

    expect(S3Client).toHaveBeenCalledTimes(1);
    expect(S3Client).toHaveBeenCalledWith(
      expect.objectContaining({
        region: "auto",
        endpoint: config.endpoint,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      }),
    );
    expect(client).toBeDefined();
  });

  it("should return the same client for the same config", () => {
    const client1 = getS3Client(config);
    const client2 = getS3Client(config);

    expect(S3Client).toHaveBeenCalledTimes(1);
    expect(client1).toBe(client2);
  });

  it("should return the same client when only non-credential fields change", () => {
    const client1 = getS3Client(config);
    const client2 = getS3Client({
      ...config,
      bucketName: "different-bucket",
      customDomain: "other.cdn.com",
      jpgQuality: 50,
    });

    expect(S3Client).toHaveBeenCalledTimes(1);
    expect(client1).toBe(client2);
  });

  it("should create a new client when endpoint changes", () => {
    const client1 = getS3Client(config);
    const client2 = getS3Client({
      ...config,
      endpoint: "https://other.r2.cloudflarestorage.com",
    });

    expect(S3Client).toHaveBeenCalledTimes(2);
    expect(client1).not.toBe(client2);
  });

  it("should create a new client when accessKeyId changes", () => {
    const client1 = getS3Client(config);
    const client2 = getS3Client({
      ...config,
      accessKeyId: "key-2",
    });

    expect(S3Client).toHaveBeenCalledTimes(2);
    expect(client1).not.toBe(client2);
  });

  it("should create a new client when secretAccessKey changes", () => {
    const client1 = getS3Client(config);
    const client2 = getS3Client({
      ...config,
      secretAccessKey: "secret-2",
    });

    expect(S3Client).toHaveBeenCalledTimes(2);
    expect(client1).not.toBe(client2);
  });

  it("should create a new client after resetS3Client is called", () => {
    const client1 = getS3Client(config);
    resetS3Client();
    const client2 = getS3Client(config);

    expect(S3Client).toHaveBeenCalledTimes(2);
    expect(client1).not.toBe(client2);
  });
});
