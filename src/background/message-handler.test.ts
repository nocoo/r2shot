import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleMessage } from "./message-handler";
import type {
  CaptureAndUploadRequest,
  VerifyConnectionRequest,
} from "../types/messages";

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

import { loadConfig } from "../core/storage";
import { captureVisibleTab, dataUrlToBlob } from "../core/screenshot";
import { uploadToR2 } from "../core/uploader";
import { verifyR2Connection } from "../core/connection";
import { validateR2Config } from "../core/r2-config";

describe("handleMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("CAPTURE_AND_UPLOAD", () => {
    const request: CaptureAndUploadRequest = { type: "CAPTURE_AND_UPLOAD" };

    it("should capture, upload, and return CDN URL on success", async () => {
      const fakeConfig = {
        endpoint: "https://acc.r2.cloudflarestorage.com",
        accessKeyId: "key",
        secretAccessKey: "secret",
        bucketName: "bucket",
        customDomain: "cdn.example.com",
        jpgQuality: 90,
      };
      const fakeDataUrl = "data:image/jpeg;base64,/9j/";
      const fakeBlob = new Blob(["img"], { type: "image/jpeg" });
      const fakeCdnUrl = "https://cdn.example.com/2026-02-19/abc.jpg";

      vi.mocked(loadConfig).mockResolvedValue(fakeConfig);
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
      expect(uploadToR2).toHaveBeenCalledWith(fakeConfig, fakeBlob);
    });

    it("should return error if config is invalid", async () => {
      vi.mocked(loadConfig).mockResolvedValue({
        endpoint: "",
        accessKeyId: "",
        secretAccessKey: "",
        bucketName: "",
        customDomain: "",
        jpgQuality: 90,
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
      vi.mocked(loadConfig).mockResolvedValue({
        endpoint: "https://acc.r2.cloudflarestorage.com",
        accessKeyId: "key",
        secretAccessKey: "secret",
        bucketName: "bucket",
        customDomain: "cdn.example.com",
        jpgQuality: 90,
      });
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
      vi.mocked(loadConfig).mockResolvedValue({
        endpoint: "https://acc.r2.cloudflarestorage.com",
        accessKeyId: "key",
        secretAccessKey: "secret",
        bucketName: "bucket",
        customDomain: "cdn.example.com",
        jpgQuality: 90,
      });
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
  });

  describe("VERIFY_CONNECTION", () => {
    const request: VerifyConnectionRequest = { type: "VERIFY_CONNECTION" };

    it("should return success when connection is valid", async () => {
      vi.mocked(loadConfig).mockResolvedValue({
        endpoint: "https://acc.r2.cloudflarestorage.com",
        accessKeyId: "key",
        secretAccessKey: "secret",
        bucketName: "bucket",
        customDomain: "cdn.example.com",
        jpgQuality: 90,
      });
      vi.mocked(verifyR2Connection).mockResolvedValue({ ok: true });

      const result = await handleMessage(request);

      expect(result).toEqual({ success: true });
    });

    it("should return error when connection fails", async () => {
      vi.mocked(loadConfig).mockResolvedValue({
        endpoint: "https://acc.r2.cloudflarestorage.com",
        accessKeyId: "key",
        secretAccessKey: "secret",
        bucketName: "bucket",
        customDomain: "cdn.example.com",
        jpgQuality: 90,
      });
      vi.mocked(verifyR2Connection).mockResolvedValue({
        ok: false,
        error: "Access Denied",
      });

      const result = await handleMessage(request);

      expect(result).toEqual({ success: false, error: "Access Denied" });
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
