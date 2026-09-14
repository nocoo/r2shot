import { captureVisibleTab, dataUrlToBlob } from "./screenshot";

/**
 * Page metrics returned by the injected content script.
 */
export interface PageMetrics {
  scrollWidth: number;
  scrollHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  originalScrollX: number;
  originalScrollY: number;
  devicePixelRatio: number;
}

/**
 * Delay helper – gives the page time to settle after scrolling.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Inject a content script that scrolls to the very top of the page
 * and returns the page dimensions.
 */
export async function getPageMetrics(tabId: number): Promise<PageMetrics> {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    // v8 ignore next: content script runs in page context, not testable in Node
    func: /* v8 ignore start */ () => {
      const metrics = {
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        originalScrollX: window.scrollX,
        originalScrollY: window.scrollY,
        devicePixelRatio: window.devicePixelRatio,
      };
      // Scroll to top before capturing
      window.scrollTo({ left: 0, top: 0, behavior: "instant" });
      return metrics;
    } /* v8 ignore stop */,
  });

  if (!results || results.length === 0 || !results[0].result) {
    throw new Error("Failed to get page metrics");
  }

  return results[0].result as PageMetrics;
}

/**
 * Scroll the page to a specific Y position via content script injection.
 */
export async function scrollTo(tabId: number, y: number): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    // v8 ignore next: content script runs in page context, not testable in Node
    func: /* v8 ignore start */ (scrollY: number) => {
      window.scrollTo({ left: 0, top: scrollY, behavior: "instant" });
    } /* v8 ignore stop */,
    args: [y],
  });
}

/**
 * Restore the original scroll position after capture is done.
 */
export async function restoreScroll(
  tabId: number,
  x: number,
  y: number,
): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    // v8 ignore next: content script runs in page context, not testable in Node
    func: /* v8 ignore start */ (sx: number, sy: number) => {
      window.scrollTo({ left: sx, top: sy, behavior: "instant" });
    } /* v8 ignore stop */,
    args: [x, y],
  });
}

/** Settle time after each scroll (ms). */
const SCROLL_SETTLE_MS = 300;

/**
 * Capture a full-page screenshot by scrolling and stitching.
 *
 * Memory strategy:
 * - Each viewport capture is decoded to an ImageBitmap and the data URL is
 *   released immediately.
 * - All bitmaps are drawn onto a single OffscreenCanvas, then closed.
 * - The final canvas is exported to a Blob directly (no intermediate
 *   base64 string for the full image).
 */
export async function captureFullPage(
  tabId: number,
  quality: number,
  maxScreens: number,
): Promise<Blob> {
  const metrics = await getPageMetrics(tabId);
  let canvas: OffscreenCanvas | undefined;
  try {
    await delay(SCROLL_SETTLE_MS);
    const { viewportHeight, devicePixelRatio } = metrics;
    const effectiveHeight = Math.min(
      metrics.scrollHeight,
      viewportHeight * maxScreens,
    );
    const width = Math.round(metrics.viewportWidth * devicePixelRatio);
    const height = Math.round(effectiveHeight * devicePixelRatio);
    if (
      width < 1 ||
      height < 1 ||
      width > 32767 ||
      height > 32767 ||
      width * height > 32_000_000
    ) {
      throw new Error(
        "Page exceeds the safe image size. Lower the full-page limit in settings.",
      );
    }
    canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to create 2D context for stitching");
    const totalCaptures = Math.ceil(effectiveHeight / viewportHeight);
    for (let i = 0; i < totalCaptures; i++) {
      const y = i * viewportHeight;
      if (i > 0) {
        await scrollTo(tabId, y);
        await delay(SCROLL_SETTLE_MS);
      }
      const tab = await chrome.tabs.get(tabId);
      if (!tab.active)
        throw new Error(
          "The active tab changed. Return to the page and capture again.",
        );
      const dataUrl = await captureVisibleTab(quality, tab.windowId);
      if (!(await chrome.tabs.get(tabId)).active)
        throw new Error(
          "The active tab changed. Return to the page and capture again.",
        );
      const bitmap = await createImageBitmap(dataUrlToBlob(dataUrl));
      try {
        const remaining = effectiveHeight - y;
        if (remaining < viewportHeight) {
          const cropHeight = Math.round(remaining * devicePixelRatio);
          const cropY = bitmap.height - cropHeight;
          const cropped = await createImageBitmap(
            bitmap,
            0,
            cropY,
            bitmap.width,
            cropHeight,
          );
          try {
            ctx.drawImage(cropped, 0, Math.round(y * devicePixelRatio));
          } finally {
            cropped.close();
          }
        } else {
          ctx.drawImage(bitmap, 0, Math.round(y * devicePixelRatio));
        }
      } finally {
        bitmap.close();
      }
    }
    return await canvas.convertToBlob({
      type: "image/jpeg",
      quality: quality / 100,
    });
  } finally {
    if (canvas) {
      canvas.width = 1;
      canvas.height = 1;
    }
    await restoreScroll(
      tabId,
      metrics.originalScrollX,
      metrics.originalScrollY,
    ).catch(() => {});
  }
}
