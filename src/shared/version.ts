/**
 * Get the extension version from the manifest.
 * Falls back to "0.0.0" in non-extension environments (e.g. tests).
 */
export function getVersion(): string {
  try {
    return chrome.runtime.getManifest().version;
  } catch {
    return "0.0.0";
  }
}
