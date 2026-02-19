import { describe, it, expect, vi, beforeEach } from "vitest";
import { captureVisibleTab, dataUrlToBlob } from "./screenshot";

const mockCaptureVisibleTab = vi.fn();
vi.stubGlobal("chrome", {
  tabs: {
    captureVisibleTab: mockCaptureVisibleTab,
  },
});

describe("screenshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("captureVisibleTab", () => {
    it("should call chrome.tabs.captureVisibleTab with jpeg format", async () => {
      const fakeDataUrl =
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD";
      mockCaptureVisibleTab.mockResolvedValue(fakeDataUrl);

      const result = await captureVisibleTab(90);

      expect(mockCaptureVisibleTab).toHaveBeenCalledWith(undefined, {
        format: "jpeg",
        quality: 90,
      });
      expect(result).toBe(fakeDataUrl);
    });

    it("should pass custom quality to capture options", async () => {
      const fakeDataUrl = "data:image/jpeg;base64,abc";
      mockCaptureVisibleTab.mockResolvedValue(fakeDataUrl);

      await captureVisibleTab(75);

      expect(mockCaptureVisibleTab).toHaveBeenCalledWith(undefined, {
        format: "jpeg",
        quality: 75,
      });
    });

    it("should propagate errors from chrome API", async () => {
      mockCaptureVisibleTab.mockRejectedValue(
        new Error("Cannot capture tab"),
      );

      await expect(captureVisibleTab(90)).rejects.toThrow(
        "Cannot capture tab",
      );
    });
  });

  describe("dataUrlToBlob", () => {
    it("should convert a valid data URL to a Blob", () => {
      // base64 for a tiny 1-byte payload
      const dataUrl = "data:image/jpeg;base64,/w==";
      const blob = dataUrlToBlob(dataUrl);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe("image/jpeg");
      expect(blob.size).toBeGreaterThan(0);
    });

    it("should throw on invalid data URL", () => {
      expect(() => dataUrlToBlob("not-a-data-url")).toThrow(
        "Invalid data URL",
      );
    });

    it("should handle data URL with no base64 content", () => {
      expect(() => dataUrlToBlob("data:image/jpeg;base64,")).toThrow(
        "Invalid data URL",
      );
    });
  });
});
