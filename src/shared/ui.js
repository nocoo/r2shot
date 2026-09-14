import { getVersion } from "./version";

export function t(key, substitutions) {
  return chrome.i18n.getMessage(key, substitutions) || key;
}

export function applyTheme(theme) {
  if (theme === "light" || theme === "dark")
    document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
}

export async function setTheme(theme) {
  await chrome.storage.local.set({ r2shot_theme: theme });
  applyTheme(theme);
}

export async function initUI() {
  for (const [data, attribute] of [
    ["i18n", ""],
    ["i18n-placeholder", "placeholder"],
    ["i18n-title", "title"],
    ["i18n-aria-label", "aria-label"],
  ]) {
    for (const element of document.querySelectorAll(`[data-${data}]`)) {
      const message = t(element.getAttribute(`data-${data}`));
      if (attribute) element.setAttribute(attribute, message);
      else element.textContent = message;
    }
  }
  document.documentElement.lang = chrome.i18n.getUILanguage().replace("_", "-");
  for (const element of document.querySelectorAll("[data-version]"))
    element.textContent = `v${getVersion()}`;
  const stored = await chrome.storage.local.get(["r2shot_theme"]);
  applyTheme(stored.r2shot_theme);
  const select = document.getElementById("theme");
  if (select)
    select.value = ["light", "dark"].includes(stored.r2shot_theme)
      ? stored.r2shot_theme
      : "system";
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.r2shot_theme) {
      applyTheme(changes.r2shot_theme.newValue);
      if (select) select.value = changes.r2shot_theme.newValue || "system";
    }
  });
}
