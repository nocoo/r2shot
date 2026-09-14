import { validateR2Config } from "../core/r2-config";
import { loadConfig } from "../core/storage";
import { initUI, t } from "../shared/ui";

const captureButton = document.getElementById("capture");
const scope = document.getElementById("capture-scope");
const status = document.getElementById("capture-status");
const result = document.getElementById("result");
const urlInput = document.getElementById("result-url");
const copyButton = document.getElementById("copy");
let configured = false;
let busy = false;
let copyTimer;

function showStatus(message, state = "idle") {
  status.textContent = message;
  status.dataset.state = state;
}

async function capture() {
  if (busy || !configured) return;
  busy = true;
  scope.disabled = true;
  captureButton.disabled = true;
  captureButton.setAttribute("aria-busy", "true");
  result.hidden = true;
  clearTimeout(copyTimer);
  copyButton.textContent = t("copyUrl");
  showStatus(t("captureWorking"));
  try {
    const response = await chrome.runtime.sendMessage({
      type: "CAPTURE_AND_UPLOAD",
      fullPage:
        document.querySelector('[name="scope"]:checked').value === "full",
    });
    if (!response?.success)
      throw new Error(response?.error || t("captureFailed"));
    urlInput.value = response.url;
    result.hidden = false;
    captureButton.hidden = true;
    showStatus(t("uploadComplete"), "success");
  } catch (error) {
    showStatus(error.message || t("captureFailed"), "error");
  } finally {
    busy = false;
    scope.disabled = false;
    captureButton.disabled = !configured;
    captureButton.removeAttribute("aria-busy");
  }
}

async function copy() {
  try {
    await navigator.clipboard.writeText(urlInput.value);
    copyButton.textContent = t("copied");
    showStatus(t("copiedToClipboard"), "success");
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copyButton.textContent = t("copyUrl");
    }, 2000);
  } catch {
    urlInput.focus();
    urlInput.select();
    showStatus(t("copyFailed"), "error");
  }
}

async function readConfig() {
  const config = await loadConfig();
  configured = validateR2Config(config).valid;
  document.getElementById("bucket").textContent =
    config.bucketName || t("setupRequired");
  document.getElementById("capture-details").textContent = configured
    ? `JPG ${config.jpgQuality} · ${t("maxScreens")}: ${config.maxScreens}`
    : t("setupHint");
  captureButton.disabled = busy || !configured;
}

async function init() {
  document
    .getElementById("settings")
    .addEventListener("click", () => chrome.runtime.openOptionsPage());
  captureButton.addEventListener("click", capture);
  copyButton.addEventListener("click", copy);
  document.getElementById("new").addEventListener("click", () => {
    result.hidden = true;
    captureButton.hidden = false;
    urlInput.value = "";
    showStatus("");
  });
  try {
    await initUI();
    await readConfig();
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab) {
      document.getElementById("page-title").textContent =
        tab.title || t("currentPage");
      document.getElementById("page-host").textContent = tab.url || "";
    }
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.r2config)
        readConfig().catch((error) => showStatus(error.message, "error"));
    });
  } catch (error) {
    showStatus(error.message || t("loadFailed"), "error");
  }
}

export const ready = init();
