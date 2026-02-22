import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getPageMetrics,
  scrollTo,
  restoreScroll,
  captureFullPage,
} from "./full-page-screenshot";

// ── Chrome API mocks ───────────────────────────────────────────────────
const mockExecuteScript = vi.fn();
const mockCaptureVisibleTab = vi.fn();

vi.stubGlobal("chrome", {
  scripting: { executeScript: mockExecuteScript },
  tabs: { captureVisibleTab: mockCaptureVisibleTab },
});

// ── ImageBitmap / OffscreenCanvas mocks ────────────────────────────────
const closeFn = vi.fn();
function makeBitmap(width: number, height: number) {
  return { width, height, close: closeFn };
}

const mockCreateImageBitmap = vi.fn();
vi.stubGlobal("createImageBitmap", mockCreateImageBitmap);

const mockDrawImage = vi.fn();
const mockConvertToBlob = vi.fn();
const MockOffscreenCanvas = vi.fn().mockImplementation(() => ({
  getContext: () => ({ drawImage: mockDrawImage }),
  convertToBlob: mockConvertToBlob,
}));
vi.stubGlobal("OffscreenCanvas", MockOffscreenCanvas);

// ── fetch mock (for data URL → blob conversion inside captureFullPage) ─
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ── Timers ──────────────────────────────────────────────────────────────
vi.useFakeTimers();

describe("full-page-screenshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    closeFn.mockReset();
  });

  // ── getPageMetrics ──────────────────────────────────────────────────
  describe("getPageMetrics", () => {
    it("should return page metrics from injected script", async () => {
      const metrics = {
        scrollWidth: 1024,
        scrollHeight: 3000,
        viewportWidth: 1024,
        viewportHeight: 768,
        originalScrollX: 0,
        originalScrollY: 200,
        devicePixelRatio: 2,
      };
      mockExecuteScript.mockResolvedValue([{ result: metrics }]);

      const result = await getPageMetrics(42);

      expect(result).toEqual(metrics);
      expect(mockExecuteScript).toHaveBeenCalledWith(
        expect.objectContaining({ target: { tabId: 42 } }),
      );
    });

    it("should throw if executeScript returns empty results", async () => {
      mockExecuteScript.mockResolvedValue([]);

      await expect(getPageMetrics(42)).rejects.toThrow(
        "Failed to get page metrics",
      );
    });

    it("should throw if executeScript returns null result", async () => {
      mockExecuteScript.mockResolvedValue([{ result: null }]);

      await expect(getPageMetrics(42)).rejects.toThrow(
        "Failed to get page metrics",
      );
    });

    it("should throw if executeScript returns undefined", async () => {
      mockExecuteScript.mockResolvedValue(undefined);

      await expect(getPageMetrics(42)).rejects.toThrow(
        "Failed to get page metrics",
      );
    });
  });

  // ── scrollTo ────────────────────────────────────────────────────────
  describe("scrollTo", () => {
    it("should inject scroll script with given Y position", async () => {
      mockExecuteScript.mockResolvedValue([]);

      await scrollTo(42, 500);

      expect(mockExecuteScript).toHaveBeenCalledWith(
        expect.objectContaining({
          target: { tabId: 42 },
          args: [500],
        }),
      );
    });
  });

  // ── restoreScroll ───────────────────────────────────────────────────
  describe("restoreScroll", () => {
    it("should inject restore scroll script with original positions", async () => {
      mockExecuteScript.mockResolvedValue([]);

      await restoreScroll(42, 10, 200);

      expect(mockExecuteScript).toHaveBeenCalledWith(
        expect.objectContaining({
          target: { tabId: 42 },
          args: [10, 200],
        }),
      );
    });
  });

  // ── captureFullPage ─────────────────────────────────────────────────
  describe("captureFullPage", () => {
    function setupSingleCapture() {
      // Page fits in one viewport — no scrolling needed
      const metrics = {
        scrollWidth: 1024,
        scrollHeight: 768,
        viewportWidth: 1024,
        viewportHeight: 768,
        originalScrollX: 0,
        originalScrollY: 0,
        devicePixelRatio: 1,
      };

      // First call: getPageMetrics, subsequent calls: restoreScroll
      mockExecuteScript.mockResolvedValue([{ result: metrics }]);
      mockCaptureVisibleTab.mockResolvedValue("data:image/jpeg;base64,abc");
      mockFetch.mockResolvedValue({
        blob: () => Promise.resolve(new Blob(["img"])),
      });
      mockCreateImageBitmap.mockResolvedValue(makeBitmap(1024, 768));
      const finalBlob = new Blob(["final"], { type: "image/jpeg" });
      mockConvertToBlob.mockResolvedValue(finalBlob);

      return { metrics, finalBlob };
    }

    function setupMultiCapture() {
      // Page is 2.5 viewports tall → 3 captures
      const metrics = {
        scrollWidth: 800,
        scrollHeight: 1920,
        viewportWidth: 800,
        viewportHeight: 768,
        originalScrollX: 5,
        originalScrollY: 100,
        devicePixelRatio: 2,
      };

      mockExecuteScript.mockResolvedValue([{ result: metrics }]);
      mockCaptureVisibleTab.mockResolvedValue("data:image/jpeg;base64,xyz");
      mockFetch.mockResolvedValue({
        blob: () => Promise.resolve(new Blob(["chunk"])),
      });
      // Full viewport bitmaps: 1600×1536 (800×2, 768×2)
      // The last capture will be cropped
      mockCreateImageBitmap.mockResolvedValue(makeBitmap(1600, 1536));
      const finalBlob = new Blob(["stitched"], { type: "image/jpeg" });
      mockConvertToBlob.mockResolvedValue(finalBlob);

      return { metrics, finalBlob };
    }

    it("should capture single viewport and return stitched blob", async () => {
      const { finalBlob } = setupSingleCapture();

      const resultPromise = captureFullPage(42, 90);
      // Advance past SCROLL_SETTLE_MS delay after getPageMetrics + capture throttle
      await vi.advanceTimersByTimeAsync(1000);

      const result = await resultPromise;

      expect(result).toBe(finalBlob);
      expect(mockCaptureVisibleTab).toHaveBeenCalledTimes(1);
      expect(MockOffscreenCanvas).toHaveBeenCalledWith(1024, 768);
      expect(mockConvertToBlob).toHaveBeenCalledWith({
        type: "image/jpeg",
        quality: 0.9,
      });
    });

    it("should capture multiple viewports with scrolling", async () => {
      const { finalBlob } = setupMultiCapture();

      const resultPromise = captureFullPage(42, 80);
      // Need enough time for: settle after metrics + 3 captures × (settle + throttle)
      await vi.advanceTimersByTimeAsync(3000);

      const result = await resultPromise;

      expect(result).toBe(finalBlob);
      // 3 captures for 1920 / 768 = 2.5 → ceil = 3
      expect(mockCaptureVisibleTab).toHaveBeenCalledTimes(3);
      // Canvas at 2× DPR: 1600 × 3840
      expect(MockOffscreenCanvas).toHaveBeenCalledWith(1600, 3840);
      expect(mockConvertToBlob).toHaveBeenCalledWith({
        type: "image/jpeg",
        quality: 0.8,
      });
    });

    it("should crop the last partial capture correctly", async () => {
      setupMultiCapture();

      const resultPromise = captureFullPage(42, 85);
      await vi.advanceTimersByTimeAsync(3000);
      await resultPromise;

      // The last capture: remaining = 1920 - 2*768 = 384 CSS px → 768 physical px
      // Crop: createImageBitmap(bitmap, 0, 1536-768, 1600, 768)
      expect(mockCreateImageBitmap).toHaveBeenLastCalledWith(
        expect.objectContaining({ width: 1600, height: 1536 }),
        0,
        768,
        1600,
        768,
      );
    });

    it("should close all bitmaps after drawing", async () => {
      setupSingleCapture();

      const resultPromise = captureFullPage(42, 90);
      await vi.advanceTimersByTimeAsync(1000);
      await resultPromise;

      // close() called at least once for each bitmap drawn
      expect(closeFn).toHaveBeenCalled();
    });

    it("should restore scroll position after capture", async () => {
      setupMultiCapture();

      const resultPromise = captureFullPage(42, 90);
      await vi.advanceTimersByTimeAsync(3000);
      await resultPromise;

      // restoreScroll calls executeScript with args [5, 100]
      const restoreCalls = mockExecuteScript.mock.calls.filter(
        (call: unknown[]) => {
          const arg = call[0] as { args?: number[] };
          return arg.args && arg.args.length === 2;
        },
      );
      expect(restoreCalls.length).toBeGreaterThan(0);
      const lastRestoreCall = restoreCalls[restoreCalls.length - 1];
      expect((lastRestoreCall[0] as { args: number[] }).args).toEqual([5, 100]);
    });

    it("should clean up bitmaps on capture error", async () => {
      const metrics = {
        scrollWidth: 1024,
        scrollHeight: 1536,
        viewportWidth: 1024,
        viewportHeight: 768,
        originalScrollX: 0,
        originalScrollY: 0,
        devicePixelRatio: 1,
      };

      mockExecuteScript.mockResolvedValue([{ result: metrics }]);
      // First capture succeeds
      mockCaptureVisibleTab
        .mockResolvedValueOnce("data:image/jpeg;base64,ok")
        .mockRejectedValueOnce(new Error("Capture failed"));
      mockFetch.mockResolvedValue({
        blob: () => Promise.resolve(new Blob(["img"])),
      });
      mockCreateImageBitmap.mockResolvedValue(makeBitmap(1024, 768));

      const resultPromise = captureFullPage(42, 90);
      // Prevent unhandled rejection warning
      resultPromise.catch(() => {});
      await vi.advanceTimersByTimeAsync(3000);

      await expect(resultPromise).rejects.toThrow("Capture failed");
      // Should have called close on the bitmap from the successful capture
      expect(closeFn).toHaveBeenCalled();
    });

    it("should throw if canvas 2D context is null", async () => {
      const metrics = {
        scrollWidth: 1024,
        scrollHeight: 768,
        viewportWidth: 1024,
        viewportHeight: 768,
        originalScrollX: 0,
        originalScrollY: 0,
        devicePixelRatio: 1,
      };

      mockExecuteScript.mockResolvedValue([{ result: metrics }]);
      mockCaptureVisibleTab.mockResolvedValue("data:image/jpeg;base64,abc");
      mockFetch.mockResolvedValue({
        blob: () => Promise.resolve(new Blob(["img"])),
      });
      mockCreateImageBitmap.mockResolvedValue(makeBitmap(1024, 768));

      // Override OffscreenCanvas to return null context
      MockOffscreenCanvas.mockImplementationOnce(() => ({
        getContext: () => null,
        convertToBlob: mockConvertToBlob,
      }));

      const resultPromise = captureFullPage(42, 90);
      // Prevent unhandled rejection warning
      resultPromise.catch(() => {});
      await vi.advanceTimersByTimeAsync(1000);

      await expect(resultPromise).rejects.toThrow(
        "Failed to create 2D context for stitching",
      );
    });

    it("should still restore scroll even if stitching fails", async () => {
      const metrics = {
        scrollWidth: 1024,
        scrollHeight: 768,
        viewportWidth: 1024,
        viewportHeight: 768,
        originalScrollX: 0,
        originalScrollY: 50,
        devicePixelRatio: 1,
      };

      mockExecuteScript.mockResolvedValue([{ result: metrics }]);
      mockCaptureVisibleTab.mockResolvedValue("data:image/jpeg;base64,abc");
      mockFetch.mockResolvedValue({
        blob: () => Promise.resolve(new Blob(["img"])),
      });
      mockCreateImageBitmap.mockResolvedValue(makeBitmap(1024, 768));
      mockConvertToBlob.mockRejectedValue(new Error("convertToBlob failed"));

      const resultPromise = captureFullPage(42, 90);
      // Prevent unhandled rejection warning
      resultPromise.catch(() => {});
      await vi.advanceTimersByTimeAsync(1000);

      await expect(resultPromise).rejects.toThrow("convertToBlob failed");

      // restoreScroll should still have been called (finally block)
      const restoreCalls = mockExecuteScript.mock.calls.filter(
        (call: unknown[]) => {
          const arg = call[0] as { args?: number[] };
          return arg.args && arg.args[0] === 0 && arg.args[1] === 50;
        },
      );
      expect(restoreCalls.length).toBeGreaterThan(0);
    });
  });
});
