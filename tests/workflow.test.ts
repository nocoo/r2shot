import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleMessage } from "../src/background/message-handler";
import { DEFAULT_R2_CONFIG } from "../src/core/r2-config";
import { saveConfig } from "../src/core/storage";

const config = {
  ...DEFAULT_R2_CONFIG,
  endpoint: "https://e2e.r2.cloudflarestorage.com",
  accessKeyId: "e2e-key",
  secretAccessKey: "e2e-fake-secret",
  bucketName: "e2e-bucket",
  customDomain: "cdn.example.com",
};
const stored: Record<string, unknown> = {};
const fetchMock = vi.fn();
const screenshot = vi.fn();
beforeEach(() => {
  for (const key of Object.keys(stored)) delete stored[key];
  fetchMock.mockReset().mockResolvedValue(new Response(null, { status: 200 }));
  screenshot.mockReset().mockResolvedValue("data:image/jpeg;base64,/9j/2Q==");
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: vi.fn(async () => stored),
        set: vi.fn(async (values) => Object.assign(stored, values)),
      },
    },
    tabs: { captureVisibleTab: screenshot },
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("capture and upload through real validation, encoding and signing", () => {
  it("saves configuration, captures JPEG, signs and uploads bytes, and returns the public URL", async () => {
    await saveConfig(config);
    const response = await handleMessage({
      type: "CAPTURE_AND_UPLOAD",
      fullPage: false,
    });
    expect(response).toEqual({
      success: true,
      url: expect.stringMatching(
        /^https:\/\/cdn.example.com\/\d{4}-\d{2}-\d{2}\/[a-f0-9-]+\.jpg$/,
      ),
    });
    expect(screenshot).toHaveBeenCalledWith(undefined, {
      format: "jpeg",
      quality: 90,
    });
    expect(fetchMock.mock.calls[0][0]).toMatch(
      /^https:\/\/e2e.r2.cloudflarestorage.com\/e2e-bucket\//,
    );
    const request = fetchMock.mock.calls[0][1];
    expect(request.body).toEqual(new Uint8Array([255, 216, 255, 217]));
    expect(request.headers.authorization).toContain(
      "AWS4-HMAC-SHA256 Credential=e2e-key/",
    );
    expect(request.headers["content-type"]).toBe("image/jpeg");
    expect(request.credentials).toBe("omit");
  });
  it("uses saved quality and normalizes a pasted HTTPS public domain", async () => {
    await saveConfig({
      ...config,
      jpgQuality: 72,
      customDomain: "https://cdn.example.com/",
    });
    const response = await handleMessage({
      type: "CAPTURE_AND_UPLOAD",
      fullPage: false,
    });
    expect(response.success).toBe(true);
    expect(screenshot).toHaveBeenCalledWith(undefined, {
      format: "jpeg",
      quality: 72,
    });
  });
  it("does not capture or upload without valid configuration", async () => {
    const response = await handleMessage({
      type: "CAPTURE_AND_UPLOAD",
      fullPage: false,
    });
    expect(response.success).toBe(false);
    expect(screenshot).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("does not upload if screenshot capture fails", async () => {
    await saveConfig(config);
    screenshot.mockRejectedValueOnce(new Error("No active tab"));
    expect(
      await handleMessage({ type: "CAPTURE_AND_UPLOAD", fullPage: false }),
    ).toEqual({ success: false, error: "No active tab" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("returns a failed upload without fabricating a public URL", async () => {
    await saveConfig(config);
    fetchMock.mockResolvedValueOnce(
      new Response(null, { status: 403, statusText: "Forbidden" }),
    );
    expect(
      await handleMessage({ type: "CAPTURE_AND_UPLOAD", fullPage: false }),
    ).toEqual({ success: false, error: "R2 request failed (403 Forbidden)" });
  });
  it("tests unsaved credentials with a signed HEAD request", async () => {
    expect(await handleMessage({ type: "VERIFY_CONNECTION", config })).toEqual({
      success: true,
    });
    expect(fetchMock.mock.calls[0][1].method).toBe("HEAD");
    expect(stored).toEqual({});
  });
  it("uses the saved configuration when no override is supplied", async () => {
    await saveConfig(config);
    expect(await handleMessage({ type: "VERIFY_CONNECTION" })).toEqual({
      success: true,
    });
  });
  it("surfaces connection failures", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Offline"));
    expect(await handleMessage({ type: "VERIFY_CONNECTION", config })).toEqual({
      success: false,
      error: "Offline",
    });
  });
});
