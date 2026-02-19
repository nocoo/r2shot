import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateObjectKey, buildPublicUrl, uploadToR2 } from "./uploader";
import type { R2Config } from "./r2-config";

const mockSend = vi.fn().mockResolvedValue({});

// Mock s3-client factory to return a controllable client
vi.mock("./s3-client", () => ({
  getS3Client: vi.fn().mockImplementation(() => ({
    send: mockSend,
  })),
}));

// Mock only PutObjectCommand from AWS SDK
vi.mock("@aws-sdk/client-s3", () => {
  const MockPutObjectCommand = vi.fn().mockImplementation((input) => input);
  return {
    PutObjectCommand: MockPutObjectCommand,
  };
});

import { getS3Client } from "./s3-client";

describe("uploader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateObjectKey", () => {
    it("should generate key with date folder and .jpg extension", () => {
      const key = generateObjectKey(new Date("2026-02-19T10:30:00Z"));
      expect(key).toMatch(/^2026-02-19\/[a-f0-9-]+\.jpg$/);
    });

    it("should generate unique keys for same date", () => {
      const date = new Date("2026-02-19T10:30:00Z");
      const key1 = generateObjectKey(date);
      const key2 = generateObjectKey(date);
      expect(key1).not.toBe(key2);
    });

    it("should use correct date folder format YYYY-MM-DD", () => {
      const key = generateObjectKey(new Date("2026-01-05T00:00:00Z"));
      expect(key.startsWith("2026-01-05/")).toBe(true);
    });

    it("should use UTC date for folder name", () => {
      // 11pm EST = next day UTC
      const key = generateObjectKey(new Date("2026-02-19T23:30:00-05:00"));
      expect(key.startsWith("2026-02-20/")).toBe(true);
    });
  });

  describe("buildPublicUrl", () => {
    it("should combine domain and object key with https", () => {
      const url = buildPublicUrl(
        "cdn.example.com",
        "2026-02-19/abc-123.jpg",
      );
      expect(url).toBe("https://cdn.example.com/2026-02-19/abc-123.jpg");
    });

    it("should not double-slash if domain has trailing slash", () => {
      const url = buildPublicUrl(
        "cdn.example.com/",
        "2026-02-19/abc.jpg",
      );
      expect(url).toBe("https://cdn.example.com/2026-02-19/abc.jpg");
    });

    it("should handle domain with path prefix", () => {
      const url = buildPublicUrl(
        "cdn.example.com/screenshots",
        "2026-02-19/abc.jpg",
      );
      expect(url).toBe(
        "https://cdn.example.com/screenshots/2026-02-19/abc.jpg",
      );
    });
  });

  describe("uploadToR2", () => {
    const config: R2Config = {
      endpoint: "https://test-account.r2.cloudflarestorage.com",
      accessKeyId: "test-key-id",
      secretAccessKey: "test-secret",
      bucketName: "test-bucket",
      customDomain: "cdn.test.com",
      jpgQuality: 90,
    };

    it("should create S3 client via getS3Client with config", async () => {
      const blob = new Blob(["fake-image"], { type: "image/jpeg" });

      await uploadToR2(config, blob);

      expect(getS3Client).toHaveBeenCalledWith(config);
    });

    it("should send PutObjectCommand with correct params", async () => {
      const { PutObjectCommand } = (await import(
        "@aws-sdk/client-s3"
      )) as unknown as {
        PutObjectCommand: ReturnType<typeof vi.fn>;
      };

      const blob = new Blob(["fake-image"], { type: "image/jpeg" });
      await uploadToR2(config, blob);

      expect(PutObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: "test-bucket",
          ContentType: "image/jpeg",
        }),
      );
      // Key should match date folder pattern
      const putArgs = PutObjectCommand.mock.calls[0][0];
      expect(putArgs.Key).toMatch(/^\d{4}-\d{2}-\d{2}\/[a-f0-9-]+\.jpg$/);

      expect(mockSend).toHaveBeenCalled();
    });

    it("should return the public URL of the uploaded file", async () => {
      const blob = new Blob(["fake-image"], { type: "image/jpeg" });
      const publicUrl = await uploadToR2(config, blob);

      expect(publicUrl).toMatch(
        /^https:\/\/cdn\.test\.com\/\d{4}-\d{2}-\d{2}\/[a-f0-9-]+\.jpg$/,
      );
    });

    it("should propagate S3 upload errors", async () => {
      mockSend.mockRejectedValueOnce(new Error("Access denied"));

      const blob = new Blob(["fake-image"], { type: "image/jpeg" });
      await expect(uploadToR2(config, blob)).rejects.toThrow("Access denied");
    });
  });
});
