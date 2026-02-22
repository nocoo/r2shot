import { loadConfig } from "../core/storage";
import { captureVisibleTab, dataUrlToBlob } from "../core/screenshot";
import { captureFullPage } from "../core/full-page-screenshot";
import { uploadToR2 } from "../core/uploader";
import { verifyR2Connection } from "../core/connection";
import { validateR2Config, type R2Config } from "../core/r2-config";
import type {
  ExtensionRequest,
  CaptureResponse,
  ConnectionResponse,
} from "../types/messages";

export async function handleMessage(
  request: ExtensionRequest,
): Promise<CaptureResponse | ConnectionResponse> {
  switch (request.type) {
    case "CAPTURE_AND_UPLOAD":
      return handleCaptureAndUpload(request.fullPage);
    case "VERIFY_CONNECTION":
      return handleVerifyConnection(request.config);
    default:
      return { success: false, error: "Unknown message type" };
  }
}

async function handleCaptureAndUpload(
  fullPage: boolean,
): Promise<CaptureResponse> {
  try {
    const config = await loadConfig();
    const validation = validateR2Config(config);
    if (!validation.valid) {
      return {
        success: false,
        error: "Invalid configuration. Please check settings.",
      };
    }

    let blob: Blob;

    if (fullPage) {
      // Get the active tab for content script injection
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) {
        return { success: false, error: "No active tab found" };
      }
      const url = tab.url ?? "";
      if (
        url.startsWith("chrome://") ||
        url.startsWith("chrome-extension://") ||
        url.startsWith("edge://") ||
        url.startsWith("about:") ||
        url.startsWith("devtools://")
      ) {
        return {
          success: false,
          error:
            "Full-page capture is not available on browser internal pages. Please try on a regular web page.",
        };
      }
      blob = await captureFullPage(tab.id, config.jpgQuality, config.maxScreens);
    } else {
      const dataUrl = await captureVisibleTab(config.jpgQuality);
      blob = dataUrlToBlob(dataUrl);
    }

    const publicUrl = await uploadToR2(config, blob);

    return { success: true, url: publicUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

async function handleVerifyConnection(
  configOverride?: R2Config,
): Promise<ConnectionResponse> {
  try {
    const config = configOverride ?? (await loadConfig());
    const validation = validateR2Config(config);
    if (!validation.valid) {
      return {
        success: false,
        error: "Invalid configuration. Please check settings.",
      };
    }

    const result = await verifyR2Connection(config);
    if (result.ok) {
      return { success: true };
    }
    return { success: false, error: result.error ?? "Connection failed" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}
