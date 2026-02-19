import { useCaptureAndUpload } from "./use-capture";
import "../shared/index.css";

export function Popup() {
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
    <div className="w-80 p-4 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-900">R2Shot</h1>
        <button
          onClick={handleSettings}
          className="text-sm text-gray-500 hover:text-gray-700"
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
          <p className="text-gray-600">Capturing...</p>
        </div>
      )}

      {/* Success state */}
      {status === "success" && url && (
        <div className="space-y-2">
          <p
            className="text-sm text-green-700 bg-green-50 p-2 rounded break-all"
          >
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
              className="py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              New
            </button>
          </div>
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div className="space-y-2">
          <p className="text-sm text-red-700 bg-red-50 p-2 rounded">
            {error}
          </p>
          <button
            onClick={reset}
            className="w-full py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
