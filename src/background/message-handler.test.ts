import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleMessage } from "./message-handler";
import type { CaptureAndUploadRequest } from "../types/messages";
import type { R2Config } from "../core/r2-config";

// Mock all core modules
vi.mock("../core/storage", () => ({
  loadConfig: vi.fn(),
}));

vi.mock("../core/screenshot", () => ({
  captureVisibleTab: vi.fn(),
  dataUrlToBlob: vi.fn(),
}));

vi.mock("../core/uploader", () => ({
  uploadToR2: vi.fn(),
}));

vi.mock("../core/connection", () => ({
  verifyR2Connection: vi.fn(),
}));

vi.mock("../core/r2-config", () => ({
  validateR2Config: vi.fn(),
}));

vi.mock("../core/full-page-screenshot", () => ({
  captureFullPage: vi.fn(),
}));

import { loadConfig } from "../core/storage";
import { captureVisibleTab, dataUrlToBlob } from "../core/screenshot";
import { captureFullPage } from "../core/full-page-screenshot";
import { uploadToR2 } from "../core/uploader";
import { verifyR2Connection } from "../core/connection";
import { validateR2Config } from "../core/r2-config";

const baseConfig: R2Config = {
  endpoint: "https://acc.r2.cloudflarestorage.com",
  accessKeyId: "key",
  secretAccessKey: "secret",
  bucketName: "bucket",
  customDomain: "cdn.example.com",
  jpgQuality: 90,
  fullPage: false,
};

// Mock chrome.tabs.query for full-page capture
vi.stubGlobal("chrome", {
  tabs: {
    query: vi.fn().mockResolvedValue([{ id: 42 }]),
  },
});

describe("handleMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("CAPTURE_AND_UPLOAD", () => {
    const request: CaptureAndUploadRequest = { type: "CAPTURE_AND_UPLOAD" };

    it("should capture visible tab, upload, and return CDN URL on success", async () => {
      const fakeDataUrl = "data:image/jpeg;base64,/9j/";
      const fakeBlob = new Blob(["img"], { type: "image/jpeg" });
      const fakeCdnUrl = "https://cdn.example.com/2026-02-19/abc.jpg";

      vi.mocked(loadConfig).mockResolvedValue(baseConfig);
      vi.mocked(validateR2Config).mockReturnValue({
        valid: true,
        errors: {},
      });
      vi.mocked(captureVisibleTab).mockResolvedValue(fakeDataUrl);
      vi.mocked(dataUrlToBlob).mockReturnValue(fakeBlob);
      vi.mocked(uploadToR2).mockResolvedValue(fakeCdnUrl);

      const result = await handleMessage(request);

      expect(result).toEqual({ success: true, url: fakeCdnUrl });
      expect(loadConfig).toHaveBeenCalled();
      expect(captureVisibleTab).toHaveBeenCalledWith(90);
      expect(dataUrlToBlob).toHaveBeenCalledWith(fakeDataUrl);
      expect(uploadToR2).toHaveBeenCalledWith(baseConfig, fakeBlob);
      expect(captureFullPage).not.toHaveBeenCalled();
    });

    it("should use full-page capture when fullPage is enabled", async () => {
      const fullPageConfig = { ...baseConfig, fullPage: true };
      const fakeBlob = new Blob(["full-img"], { type: "image/jpeg" });
      const fakeCdnUrl = "https://cdn.example.com/2026-02-19/full.jpg";

      vi.mocked(loadConfig).mockResolvedValue(fullPageConfig);
      vi.mocked(validateR2Config).mockReturnValue({
        valid: true,
        errors: {},
      });
      vi.mocked(captureFullPage).mockResolvedValue(fakeBlob);
      vi.mocked(uploadToR2).mockResolvedValue(fakeCdnUrl);

      const result = await handleMessage(request);

      expect(result).toEqual({ success: true, url: fakeCdnUrl });
      expect(captureFullPage).toHaveBeenCalledWith(42, 90);
      expect(captureVisibleTab).not.toHaveBeenCalled();
      expect(uploadToR2).toHaveBeenCalledWith(fullPageConfig, fakeBlob);
    });

    it("should return error if config is invalid", async () => {
      vi.mocked(loadConfig).mockResolvedValue({
        ...baseConfig,
        endpoint: "",
      });
      vi.mocked(validateR2Config).mockReturnValue({
        valid: false,
        errors: { endpoint: "required" },
      });

      const result = await handleMessage(request);

      expect(result).toEqual({
        success: false,
        error: "Invalid configuration. Please check settings.",
      });
    });

    it("should return error if capture fails", async () => {
      vi.mocked(loadConfig).mockResolvedValue(baseConfig);
      vi.mocked(validateR2Config).mockReturnValue({
        valid: true,
        errors: {},
      });
      vi.mocked(captureVisibleTab).mockRejectedValue(
        new Error("Tab not found"),
      );

      const result = await handleMessage(request);

      expect(result).toEqual({ success: false, error: "Tab not found" });
    });

    it("should return error if upload fails", async () => {
      vi.mocked(loadConfig).mockResolvedValue(baseConfig);
      vi.mocked(validateR2Config).mockReturnValue({
        valid: true,
        errors: {},
      });
      vi.mocked(captureVisibleTab).mockResolvedValue("data:image/jpeg;base64,x");
      vi.mocked(dataUrlToBlob).mockReturnValue(
        new Blob(["x"], { type: "image/jpeg" }),
      );
      vi.mocked(uploadToR2).mockRejectedValue(new Error("Network error"));

      const result = await handleMessage(request);

      expect(result).toEqual({ success: false, error: "Network error" });
    });

    it("should return error when no active tab found for full-page capture", async () => {
      const fullPageConfig = { ...baseConfig, fullPage: true };

      vi.mocked(loadConfig).mockResolvedValue(fullPageConfig);
      vi.mocked(validateR2Config).mockReturnValue({
        valid: true,
        errors: {},
      });
      vi.mocked(chrome.tabs.query).mockResolvedValue([]);

      const result = await handleMessage(request);

      expect(result).toEqual({
        success: false,
        error: "No active tab found",
      });
    });
  });

  describe("VERIFY_CONNECTION", () => {
    it("should return success when connection is valid", async () => {
      vi.mocked(loadConfig).mockResolvedValue(baseConfig);
      vi.mocked(validateR2Config).mockReturnValue({
        valid: true,
        errors: {},
      });
      vi.mocked(verifyR2Connection).mockResolvedValue({ ok: true });

      const result = await handleMessage({ type: "VERIFY_CONNECTION" });

      expect(result).toEqual({ success: true });
    });

    it("should return error when connection fails", async () => {
      vi.mocked(loadConfig).mockResolvedValue(baseConfig);
      vi.mocked(validateR2Config).mockReturnValue({
        valid: true,
        errors: {},
      });
      vi.mocked(verifyR2Connection).mockResolvedValue({
        ok: false,
        error: "Access Denied",
      });

      const result = await handleMessage({ type: "VERIFY_CONNECTION" });

      expect(result).toEqual({ success: false, error: "Access Denied" });
    });

    it("should use config override instead of stored config when provided", async () => {
      const overrideConfig: R2Config = {
        endpoint: "https://override.r2.cloudflarestorage.com",
        accessKeyId: "override-key",
        secretAccessKey: "override-secret",
        bucketName: "override-bucket",
        customDomain: "cdn.override.com",
        jpgQuality: 80,
        fullPage: false,
      };

      vi.mocked(validateR2Config).mockReturnValue({
        valid: true,
        errors: {},
      });
      vi.mocked(verifyR2Connection).mockResolvedValue({ ok: true });

      const result = await handleMessage({
        type: "VERIFY_CONNECTION",
        config: overrideConfig,
      });

      expect(result).toEqual({ success: true });
      expect(loadConfig).not.toHaveBeenCalled();
      expect(verifyR2Connection).toHaveBeenCalledWith(overrideConfig);
    });

    it("should return error when config override is invalid", async () => {
      const invalidConfig: R2Config = {
        endpoint: "",
        accessKeyId: "",
        secretAccessKey: "",
        bucketName: "",
        customDomain: "",
        jpgQuality: 90,
        fullPage: false,
      };

      vi.mocked(validateR2Config).mockReturnValue({
        valid: false,
        errors: { endpoint: "required" },
      });

      const result = await handleMessage({
        type: "VERIFY_CONNECTION",
        config: invalidConfig,
      });

      expect(result).toEqual({
        success: false,
        error: "Invalid configuration. Please check settings.",
      });
      expect(loadConfig).not.toHaveBeenCalled();
    });
  });

  describe("unknown message type", () => {
    it("should return error for unknown message type", async () => {
      const result = await handleMessage({
        type: "UNKNOWN" as "CAPTURE_AND_UPLOAD",
      });
      expect(result).toEqual({
        success: false,
        error: "Unknown message type",
      });
    });
  });
});
