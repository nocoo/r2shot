import { useCaptureAndUpload } from "./use-capture";
import { useTheme } from "../shared/use-theme";
import "../shared/index.css";

export function Popup() {
  useTheme(); // apply saved theme
  const { status, url, error, capture, reset } = useCaptureAndUpload();

  const handleCopy = () => {
    if (url) {
      navigator.clipboard.writeText(url);
    }
  };

  const handleSettings = () => {
    chrome.runtime.openOptionsPage();
  };

  return (
    <div className="w-80 p-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold">R2Shot</h1>
        <button
          onClick={handleSettings}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          aria-label="Settings"
        >
          Settings
        </button>
      </div>

      {/* Idle state */}
      {status === "idle" && (
        <button
          onClick={capture}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Capture
        </button>
      )}

      {/* Capturing state */}
      {status === "capturing" && (
        <div className="text-center py-2">
          <p className="text-gray-600 dark:text-gray-400">Capturing...</p>
        </div>
      )}

      {/* Success state */}
      {status === "success" && url && (
        <div className="space-y-2">
          <p className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 p-2 rounded break-all">
            {url}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Copy URL
            </button>
            <button
              onClick={reset}
              className="py-2 px-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              New
            </button>
          </div>
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div className="space-y-2">
          <p className="text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-2 rounded">
            {error}
          </p>
          <button
            onClick={reset}
            className="w-full py-2 px-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
