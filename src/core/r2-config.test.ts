import { describe, it, expect } from "vitest";
import {
  type R2Config,
  validateR2Config,
  type R2ConfigValidationResult,
} from "./r2-config";

describe("R2Config validation", () => {
  const validConfig: R2Config = {
    endpoint: "https://abc123.r2.cloudflarestorage.com",
    accessKeyId: "key-id-example",
    secretAccessKey: "secret-key-example",
    bucketName: "my-bucket",
    cdnUrl: "https://cdn.example.com",
    jpgQuality: 90,
  };

  describe("validateR2Config", () => {
    it("should return valid for a complete valid config", () => {
      const result = validateR2Config(validConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it("should reject empty endpoint", () => {
      const result = validateR2Config({ ...validConfig, endpoint: "" });
      expect(result.valid).toBe(false);
      expect(result.errors.endpoint).toBe("Endpoint URL is required");
    });

    it("should reject whitespace-only endpoint", () => {
      const result = validateR2Config({ ...validConfig, endpoint: "   " });
      expect(result.valid).toBe(false);
      expect(result.errors.endpoint).toBe("Endpoint URL is required");
    });

    it("should reject endpoint without https", () => {
      const result = validateR2Config({
        ...validConfig,
        endpoint: "http://abc.r2.cloudflarestorage.com",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.endpoint).toBe(
        "Endpoint URL must start with https://",
      );
    });

    it("should reject invalid endpoint format", () => {
      const result = validateR2Config({
        ...validConfig,
        endpoint: "not-a-url",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.endpoint).toBeDefined();
    });

    it("should reject empty accessKeyId", () => {
      const result = validateR2Config({ ...validConfig, accessKeyId: "" });
      expect(result.valid).toBe(false);
      expect(result.errors.accessKeyId).toBe("Access Key ID is required");
    });

    it("should reject empty secretAccessKey", () => {
      const result = validateR2Config({
        ...validConfig,
        secretAccessKey: "",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.secretAccessKey).toBe(
        "Secret Access Key is required",
      );
    });

    it("should reject empty bucketName", () => {
      const result = validateR2Config({ ...validConfig, bucketName: "" });
      expect(result.valid).toBe(false);
      expect(result.errors.bucketName).toBe("Bucket name is required");
    });

    it("should reject empty cdnUrl", () => {
      const result = validateR2Config({ ...validConfig, cdnUrl: "" });
      expect(result.valid).toBe(false);
      expect(result.errors.cdnUrl).toBe("CDN URL is required");
    });

    it("should reject cdnUrl without https protocol", () => {
      const result = validateR2Config({
        ...validConfig,
        cdnUrl: "http://cdn.example.com",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.cdnUrl).toBe("CDN URL must start with https://");
    });

    it("should reject invalid cdnUrl format", () => {
      const result = validateR2Config({
        ...validConfig,
        cdnUrl: "not-a-url",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.cdnUrl).toBeDefined();
    });

    it("should strip trailing slash from cdnUrl", () => {
      const result = validateR2Config({
        ...validConfig,
        cdnUrl: "https://cdn.example.com/",
      });
      expect(result.valid).toBe(true);
    });

    it("should reject jpgQuality below 1", () => {
      const result = validateR2Config({ ...validConfig, jpgQuality: 0 });
      expect(result.valid).toBe(false);
      expect(result.errors.jpgQuality).toBe(
        "JPG quality must be between 1 and 100",
      );
    });

    it("should reject jpgQuality above 100", () => {
      const result = validateR2Config({ ...validConfig, jpgQuality: 101 });
      expect(result.valid).toBe(false);
      expect(result.errors.jpgQuality).toBe(
        "JPG quality must be between 1 and 100",
      );
    });

    it("should accept jpgQuality of 1", () => {
      const result = validateR2Config({ ...validConfig, jpgQuality: 1 });
      expect(result.valid).toBe(true);
    });

    it("should accept jpgQuality of 100", () => {
      const result = validateR2Config({ ...validConfig, jpgQuality: 100 });
      expect(result.valid).toBe(true);
    });

    it("should reject non-integer jpgQuality", () => {
      const result = validateR2Config({ ...validConfig, jpgQuality: 90.5 });
      expect(result.valid).toBe(false);
      expect(result.errors.jpgQuality).toBe("JPG quality must be an integer");
    });

    it("should collect multiple errors at once", () => {
      const result = validateR2Config({
        endpoint: "",
        accessKeyId: "",
        secretAccessKey: "",
        bucketName: "",
        cdnUrl: "",
        jpgQuality: 0,
      });
      expect(result.valid).toBe(false);
      expect(Object.keys(result.errors).length).toBeGreaterThanOrEqual(5);
    });
  });

  describe("R2ConfigValidationResult type", () => {
    it("should have correct shape when valid", () => {
      const result: R2ConfigValidationResult = { valid: true, errors: {} };
      expect(result.valid).toBe(true);
    });

    it("should have correct shape when invalid", () => {
      const result: R2ConfigValidationResult = {
        valid: false,
        errors: { endpoint: "required" },
      };
      expect(result.valid).toBe(false);
    });
  });
});
