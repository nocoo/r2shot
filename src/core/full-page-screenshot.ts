import { captureVisibleTab, dataUrlToBlob } from "./screenshot";

declare global {
  interface Window {
    // Kept in the extension's isolated world, only for the current capture.
    __r2shotScrollTarget?: Element;
  }
}

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
  scrollArea?: { top: number; height: number };
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
      delete window.__r2shotScrollTarget;
      const root = document.scrollingElement ?? document.documentElement;
      let target: Element | undefined;
      if (root.scrollHeight <= window.innerHeight + 1) {
        let largestArea = 0;
        // ponytail: use the largest visible scroller; independent panes would need target selection.
        for (const element of document.querySelectorAll("body, body *")) {
          if (
            element.scrollHeight <= element.clientHeight + 1 ||
            element.clientHeight < window.innerHeight / 2 ||
            element.clientWidth < 1
          )
            continue;
          const rect = element.getBoundingClientRect();
          const top = rect.top + element.clientTop;
          const visibleWidth =
            Math.min(window.innerWidth, rect.right) - Math.max(0, rect.left);
          const style = getComputedStyle(element);
          if (
            top < 0 ||
            top + element.clientHeight > window.innerHeight + 1 ||
            visibleWidth <= 0 ||
            style.visibility !== "visible" ||
            !/^(auto|scroll|overlay)$/.test(style.overflowY)
          )
            continue;
          const area = visibleWidth * element.clientHeight;
          if (area > largestArea) {
            target = element;
            largestArea = area;
          }
        }
      }
      const metrics = {
        scrollWidth: root.scrollWidth,
        scrollHeight: target
          ? target.scrollHeight + window.innerHeight - target.clientHeight
          : root.scrollHeight,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        originalScrollX: target?.scrollLeft ?? window.scrollX,
        originalScrollY: target?.scrollTop ?? window.scrollY,
        devicePixelRatio: window.devicePixelRatio,
        scrollArea: target
          ? {
              top: target.getBoundingClientRect().top + target.clientTop,
              height: target.clientHeight,
            }
          : undefined,
      };
      window.__r2shotScrollTarget = target;
      // Scroll to top before capturing
      (target ?? window).scrollTo({ left: 0, top: 0, behavior: "instant" });
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
      (window.__r2shotScrollTarget ?? window).scrollTo({
        left: 0,
        top: scrollY,
        behavior: "instant",
      });
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
      const target = window.__r2shotScrollTarget ?? window;
      delete window.__r2shotScrollTarget;
      target.scrollTo({ left: sx, top: sy, behavior: "instant" });
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
    const { viewportWidth, viewportHeight, devicePixelRatio } = metrics;
    const effectiveHeight = Math.min(
      metrics.scrollHeight,
      viewportHeight * maxScreens,
    );
    if (
      ![viewportWidth, viewportHeight, effectiveHeight, devicePixelRatio].every(
        (value) => Number.isFinite(value) && value > 0,
      )
    ) {
      throw new Error("Invalid page dimensions for full-page capture.");
    }
    // Keep the requested page coverage within the canvas memory and size limits.
    const scale = Math.min(
      devicePixelRatio,
      32767 / viewportWidth,
      32767 / effectiveHeight,
      Math.sqrt(32_000_000 / viewportWidth / effectiveHeight),
    );
    const width = Math.max(1, Math.floor(viewportWidth * scale));
    const height = Math.max(1, Math.floor(effectiveHeight * scale));
    const outputScale = height / effectiveHeight;
    canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to create 2D context for stitching");
    ctx.imageSmoothingQuality = "high";
    const top = metrics.scrollArea?.top ?? 0;
    const step = metrics.scrollArea?.height ?? viewportHeight;
    const bottom = viewportHeight - top - step;
    const contentHeight = effectiveHeight - top - bottom;
    const totalCaptures = Math.ceil(contentHeight / step);
    for (let i = 0; i < totalCaptures; i++) {
      const y = i * step;
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
        // The browser clamps the final scroll to the end of the scroll area.
        const scrollY = Math.min(
          y,
          Math.max(0, metrics.scrollHeight - viewportHeight),
        );
        const sourceScale = bitmap.height / viewportHeight;
        const end = Math.min(y + step, contentHeight);
        const sourceY = Math.round((top + y - scrollY) * sourceScale);
        const destinationY = Math.round((top + y) * outputScale);
        const sliceHeight =
          Math.round((top + end) * outputScale) - destinationY;
        ctx.drawImage(
          bitmap,
          0,
          sourceY,
          bitmap.width,
          Math.round((top + end - scrollY) * sourceScale) - sourceY,
          0,
          destinationY,
          width,
          sliceHeight,
        );
        // Keep the content above/below an inner scroller only once.
        if (i === 0 && top > 0) {
          const headerHeight = Math.round(top * outputScale);
          ctx.drawImage(
            bitmap,
            0,
            0,
            bitmap.width,
            Math.round(top * sourceScale),
            0,
            0,
            width,
            headerHeight,
          );
        }
        if (i === totalCaptures - 1 && bottom > 0) {
          const footerY = Math.round((effectiveHeight - bottom) * outputScale);
          const footerHeight = height - footerY;
          const sourceHeight = Math.round(bottom * sourceScale);
          ctx.drawImage(
            bitmap,
            0,
            bitmap.height - sourceHeight,
            bitmap.width,
            sourceHeight,
            0,
            footerY,
            width,
            footerHeight,
          );
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
