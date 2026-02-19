import { describe, it, expect } from "vitest";
import {
  type R2Config,
  validateR2Config,
  type R2ConfigValidationResult,
  parseR2Endpoint,
} from "./r2-config";

describe("R2Config validation", () => {
  const validConfig: R2Config = {
    endpoint: "https://abc123.r2.cloudflarestorage.com",
    accessKeyId: "key-id-example",
    secretAccessKey: "secret-key-example",
    bucketName: "my-bucket",
    customDomain: "cdn.example.com",
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

    it("should reject empty customDomain", () => {
      const result = validateR2Config({ ...validConfig, customDomain: "" });
      expect(result.valid).toBe(false);
      expect(result.errors.customDomain).toBe("Custom domain is required");
    });

    it("should accept customDomain without protocol", () => {
      const result = validateR2Config({
        ...validConfig,
        customDomain: "cdn.example.com",
      });
      expect(result.valid).toBe(true);
    });

    it("should accept customDomain with subdomain", () => {
      const result = validateR2Config({
        ...validConfig,
        customDomain: "screenshots.mysite.com",
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
        customDomain: "",
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

  describe("parseR2Endpoint", () => {
    it("should return empty endpoint for empty input", () => {
      expect(parseR2Endpoint("")).toEqual({ endpoint: "" });
      expect(parseR2Endpoint("   ")).toEqual({ endpoint: "" });
    });

    it("should return input as-is when not a valid URL", () => {
      expect(parseR2Endpoint("not-a-url")).toEqual({ endpoint: "not-a-url" });
    });

    it("should extract endpoint without bucket from bare URL", () => {
      const result = parseR2Endpoint(
        "https://abc123.r2.cloudflarestorage.com",
      );
      expect(result).toEqual({
        endpoint: "https://abc123.r2.cloudflarestorage.com",
      });
    });

    it("should extract endpoint without bucket from URL with trailing slash", () => {
      const result = parseR2Endpoint(
        "https://abc123.r2.cloudflarestorage.com/",
      );
      expect(result).toEqual({
        endpoint: "https://abc123.r2.cloudflarestorage.com",
      });
    });

    it("should extract endpoint and bucket name from full S3 API URL", () => {
      const result = parseR2Endpoint(
        "https://d51a8fde361e4be31db17d8c56737c1f.r2.cloudflarestorage.com/r2shot",
      );
      expect(result).toEqual({
        endpoint:
          "https://d51a8fde361e4be31db17d8c56737c1f.r2.cloudflarestorage.com",
        bucketName: "r2shot",
      });
    });

    it("should extract only first path segment as bucket name", () => {
      const result = parseR2Endpoint(
        "https://abc.r2.cloudflarestorage.com/my-bucket/extra/path",
      );
      expect(result).toEqual({
        endpoint: "https://abc.r2.cloudflarestorage.com",
        bucketName: "my-bucket",
      });
    });

    it("should handle URL with trailing slash after bucket name", () => {
      const result = parseR2Endpoint(
        "https://abc.r2.cloudflarestorage.com/my-bucket/",
      );
      expect(result).toEqual({
        endpoint: "https://abc.r2.cloudflarestorage.com",
        bucketName: "my-bucket",
      });
    });

    it("should trim whitespace from input", () => {
      const result = parseR2Endpoint(
        "  https://abc.r2.cloudflarestorage.com/bucket  ",
      );
      expect(result).toEqual({
        endpoint: "https://abc.r2.cloudflarestorage.com",
        bucketName: "bucket",
      });
    });

    it("should work with non-R2 S3-compatible endpoints", () => {
      const result = parseR2Endpoint(
        "https://s3.us-east-1.amazonaws.com/my-bucket",
      );
      expect(result).toEqual({
        endpoint: "https://s3.us-east-1.amazonaws.com",
        bucketName: "my-bucket",
      });
    });
  });
});
