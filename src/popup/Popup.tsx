import { useState, useEffect, useCallback } from "react";
import { useCaptureAndUpload } from "./use-capture";
import { useTheme } from "../shared/use-theme";
import { Button } from "../shared/button";
import {
  Camera,
  Settings,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  AlertCircle,
} from "lucide-react";
import "../shared/index.css";

export function Popup() {
  useTheme(); // apply saved theme
  const { status, url, error, capture, reset } = useCaptureAndUpload();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (url) {
      navigator.clipboard.writeText(url);
      setCopied(true);
    }
  }, [url]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleSettings = () => {
    chrome.runtime.openOptionsPage();
  };

  return (
    <div className="w-80 p-4 bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <img
            src="/icons/logo32.png"
            alt="R2Shot logo"
            className="h-6 w-6"
          />
          <h1 className="text-lg font-bold">R2Shot</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSettings}
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Idle state */}
      {status === "idle" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground text-center">
            Take a screenshot of the current tab and upload to R2
          </p>
          <Button className="w-full" onClick={capture}>
            <Camera className="h-4 w-4" />
            Capture
          </Button>
        </div>
      )}

      {/* Capturing state */}
      {status === "capturing" && (
        <div className="flex items-center justify-center gap-2 py-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <p>Capturing...</p>
        </div>
      )}

      {/* Success state */}
      {status === "success" && url && (
        <div className="space-y-2">
          <p className="text-sm text-success bg-success/10 p-2 rounded-md break-all">
            {url}
          </p>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleCopy}>
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? "Copied!" : "Copy URL"}
            </Button>
            <Button variant="outline" onClick={reset}>
              <RefreshCw className="h-4 w-4" />
              New
            </Button>
          </div>
          {/* Toast notification */}
          {copied && (
            <div
              role="status"
              className="flex items-center gap-2 text-sm text-success bg-success/10 p-2 rounded-md"
            >
              <Check className="h-4 w-4" />
              Copied to clipboard!
            </div>
          )}
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded-md">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="break-all">{error}</p>
          </div>
          <Button variant="outline" className="w-full" onClick={reset}>
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
