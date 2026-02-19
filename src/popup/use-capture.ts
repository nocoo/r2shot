import { useState, useCallback } from "react";
import type { CaptureResponse } from "../types/messages";

export type CaptureStatus = "idle" | "capturing" | "success" | "error";

interface CaptureState {
  status: CaptureStatus;
  url: string | null;
  error: string | null;
  capture: () => Promise<void>;
  reset: () => void;
}

export function useCaptureAndUpload(): CaptureState {
  const [status, setStatus] = useState<CaptureStatus>("idle");
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const capture = useCallback(async () => {
    setStatus("capturing");
    setUrl(null);
    setError(null);

    try {
      const response: CaptureResponse = await chrome.runtime.sendMessage({
        type: "CAPTURE_AND_UPLOAD",
      });

      if (response.success) {
        setStatus("success");
        setUrl(response.url);
      } else {
        setStatus("error");
        setError(response.error);
      }
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setUrl(null);
    setError(null);
  }, []);

  return { status, url, error, capture, reset };
}
