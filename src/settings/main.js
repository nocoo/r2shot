import {
  normalizePublicDomain,
  parseR2Endpoint,
  validateR2Config,
} from "../core/r2-config";
import { loadConfig, saveConfig } from "../core/storage";
import { initUI, setTheme, t } from "../shared/ui";

const keys = [
  "endpoint",
  "bucketName",
  "accessKeyId",
  "secretAccessKey",
  "customDomain",
  "jpgQuality",
  "maxScreens",
];
const fields = Object.fromEntries(
  keys.map((key) => [key, document.getElementById(key)]),
);
const form = document.getElementById("settings-form");
const saveButton = document.getElementById("save");
const saveStatus = document.getElementById("save-status");
const testButton = document.getElementById("test-connection");
const connectionStatus = document.getElementById("connection-status");
const qualityRange = document.getElementById("quality-range");
let testRevision = 0;

function status(element, message, error = false) {
  element.textContent = message;
  element.classList.toggle("error", error);
}

function changed() {
  testRevision++;
  status(saveStatus, t("unsavedChanges"));
  status(connectionStatus, "");
  document.getElementById("output-url").textContent =
    `${fields.customDomain.value || "images.example.com"}/YYYY-MM-DD/uuid.jpg`;
}

function normalizeEndpoint() {
  const parsed = parseR2Endpoint(fields.endpoint.value);
  fields.endpoint.value = parsed.endpoint;
  if (parsed.bucketName) fields.bucketName.value = parsed.bucketName;
}

function readConfig() {
  normalizeEndpoint();
  fields.customDomain.value = normalizePublicDomain(fields.customDomain.value);
  return Object.fromEntries(
    keys.map((key) => [
      key,
      key === "jpgQuality" || key === "maxScreens"
        ? Number(fields[key].value)
        : fields[key].value.trim(),
    ]),
  );
}

function validate(config) {
  const result = validateR2Config(config);
  for (const key of keys) {
    document.getElementById(`${key}-error`).textContent =
      result.errors[key] || "";
    fields[key].setAttribute(
      "aria-invalid",
      String(Boolean(result.errors[key])),
    );
    fields[key].setAttribute("aria-describedby", `${key}-error`);
  }
  if (!result.valid) fields[Object.keys(result.errors)[0]].focus();
  return result.valid;
}

async function save(event) {
  event.preventDefault();
  if (saveButton.disabled) return;
  const config = readConfig();
  if (!validate(config)) {
    status(saveStatus, t("checkFields"), true);
    return;
  }
  saveButton.disabled = true;
  try {
    await saveConfig(config);
    status(saveStatus, t("settingsSaved"));
  } catch (error) {
    status(saveStatus, error.message || t("saveFailed"), true);
  } finally {
    saveButton.disabled = false;
  }
}

async function testConnection() {
  const config = readConfig();
  if (!validate(config)) {
    status(connectionStatus, t("checkFields"), true);
    return;
  }
  const revision = ++testRevision;
  testButton.disabled = true;
  testButton.textContent = t("testing");
  status(connectionStatus, "");
  try {
    const response = await chrome.runtime.sendMessage({
      type: "VERIFY_CONNECTION",
      config,
    });
    if (revision !== testRevision) return;
    if (!response?.success)
      throw new Error(response?.error || t("connectionError"));
    status(connectionStatus, t("connectionSuccess"));
  } catch (error) {
    if (revision === testRevision)
      status(connectionStatus, error.message || t("connectionError"), true);
  } finally {
    testButton.disabled = false;
    testButton.textContent = t("testConnection");
  }
}

async function init() {
  form.addEventListener("submit", save);
  form.addEventListener("input", (event) => {
    if (event.target.id === "theme") return;
    changed();
    if (keys.includes(event.target.id)) {
      document.getElementById(`${event.target.id}-error`).textContent = "";
      event.target.removeAttribute("aria-invalid");
    }
  });
  fields.endpoint.addEventListener("change", normalizeEndpoint);
  qualityRange.addEventListener("input", () => {
    fields.jpgQuality.value = qualityRange.value;
  });
  fields.jpgQuality.addEventListener("input", () => {
    if (fields.jpgQuality.checkValidity())
      qualityRange.value = fields.jpgQuality.value;
  });
  testButton.addEventListener("click", testConnection);
  document
    .getElementById("toggle-secret")
    .addEventListener("click", (event) => {
      const show = fields.secretAccessKey.type === "password";
      fields.secretAccessKey.type = show ? "text" : "password";
      event.currentTarget.textContent = t(show ? "hide" : "show");
      event.currentTarget.setAttribute("aria-pressed", String(show));
    });
  document.getElementById("theme").addEventListener("change", async (event) => {
    try {
      await setTheme(event.target.value);
    } catch (error) {
      status(saveStatus, error.message || t("saveFailed"), true);
    }
  });
  for (const link of document.querySelectorAll("nav a")) {
    link.addEventListener("click", () => {
      for (const item of document.querySelectorAll("nav a"))
        item.classList.toggle("active", item === link);
    });
  }
  try {
    await initUI();
    const config = await loadConfig();
    for (const key of keys) fields[key].value = config[key];
    qualityRange.value = config.jpgQuality;
    document.getElementById("output-url").textContent =
      `${config.customDomain || "images.example.com"}/YYYY-MM-DD/uuid.jpg`;
    document.getElementById("settings-fields").disabled = false;
    saveButton.disabled = false;
  } catch (error) {
    status(saveStatus, error.message || t("loadFailed"), true);
  }
}

export const ready = init();
