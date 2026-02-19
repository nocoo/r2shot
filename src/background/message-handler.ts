import { loadConfig } from "../core/storage";
import { captureVisibleTab, dataUrlToBlob } from "../core/screenshot";
import { uploadToR2 } from "../core/uploader";
import { verifyR2Connection } from "../core/connection";
import { validateR2Config } from "../core/r2-config";
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
      return handleCaptureAndUpload();
    case "VERIFY_CONNECTION":
      return handleVerifyConnection();
    default:
      return { success: false, error: "Unknown message type" };
  }
}

async function handleCaptureAndUpload(): Promise<CaptureResponse> {
  try {
    const config = await loadConfig();
    const validation = validateR2Config(config);
    if (!validation.valid) {
      return {
        success: false,
        error: "Invalid configuration. Please check settings.",
      };
    }

    const dataUrl = await captureVisibleTab(config.jpgQuality);
    const blob = dataUrlToBlob(dataUrl);
    const publicUrl = await uploadToR2(config, blob);

    return { success: true, url: publicUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

async function handleVerifyConnection(): Promise<ConnectionResponse> {
  try {
    const config = await loadConfig();
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
