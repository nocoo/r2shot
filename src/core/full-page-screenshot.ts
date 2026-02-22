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
      window.scrollTo(0, 0);
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
      window.scrollTo(0, scrollY);
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
      window.scrollTo(sx, sy);
    } /* v8 ignore stop */,
    args: [x, y],
  });
}

/** Settle time after each scroll (ms). */
const SCROLL_SETTLE_MS = 150;

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
): Promise<Blob> {
  const metrics = await getPageMetrics(tabId);
  // Allow the scroll-to-top to settle
  await delay(SCROLL_SETTLE_MS);

  const { scrollHeight, viewportHeight, devicePixelRatio } = metrics;

  // Physical pixel dimensions for the final canvas
  const canvasWidth = Math.round(metrics.viewportWidth * devicePixelRatio);
  const canvasHeight = Math.round(scrollHeight * devicePixelRatio);

  // Calculate how many captures we need
  const totalCaptures = Math.ceil(scrollHeight / viewportHeight);

  // Collect bitmaps
  const bitmaps: { bitmap: ImageBitmap; yOffset: number }[] = [];

  try {
    for (let i = 0; i < totalCaptures; i++) {
      const scrollY = i * viewportHeight;
      // The last capture may only cover a partial viewport
      const isLast = i === totalCaptures - 1;
      const remainingHeight = scrollHeight - scrollY;

      if (i > 0) {
        await scrollTo(tabId, scrollY);
        await delay(SCROLL_SETTLE_MS);
      }

      const dataUrl = await captureVisibleTab(quality);

      // Decode to ImageBitmap immediately and release the data URL string
      // Use dataUrlToBlob instead of fetch(dataUrl) to avoid CSP connect-src restrictions on data: URIs
      const blobChunk = dataUrlToBlob(dataUrl);
      const bitmap = await createImageBitmap(blobChunk);

      if (isLast && remainingHeight < viewportHeight) {
        // For the last partial capture, we only need the bottom portion
        const cropHeight = Math.round(remainingHeight * devicePixelRatio);
        const cropY = bitmap.height - cropHeight;
        const croppedBitmap = await createImageBitmap(
          bitmap,
          0,
          cropY,
          bitmap.width,
          cropHeight,
        );
        bitmap.close();
        bitmaps.push({
          bitmap: croppedBitmap,
          yOffset: Math.round(scrollY * devicePixelRatio),
        });
      } else {
        bitmaps.push({
          bitmap,
          yOffset: Math.round(scrollY * devicePixelRatio),
        });
      }
    }

    // Stitch all bitmaps onto an OffscreenCanvas
    const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to create 2D context for stitching");
    }

    for (const { bitmap, yOffset } of bitmaps) {
      ctx.drawImage(bitmap, 0, yOffset);
      bitmap.close(); // Release memory immediately after drawing
    }
    bitmaps.length = 0; // Clear the array

    // Export to blob – avoid intermediate base64
    const finalBlob = await canvas.convertToBlob({
      type: "image/jpeg",
      quality: quality / 100,
    });

    return finalBlob;
  } catch (err) {
    // Clean up bitmaps on error
    for (const { bitmap } of bitmaps) {
      bitmap.close();
    }
    throw err;
  } finally {
    // Always restore original scroll position
    await restoreScroll(
      tabId,
      metrics.originalScrollX,
      metrics.originalScrollY,
    ).catch(() => {
      // Best-effort restore; don't mask the original error
    });
  }
}
