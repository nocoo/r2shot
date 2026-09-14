import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_R2_CONFIG } from "./core/r2-config";

const messages = JSON.parse(
  readFileSync("public/_locales/en/messages.json", "utf8"),
);
const config = {
  ...DEFAULT_R2_CONFIG,
  endpoint: "https://test.r2.cloudflarestorage.com",
  bucketName: "my-screenshots",
  accessKeyId: "example-key",
  secretAccessKey: "example-secret",
  customDomain: "images.example.com",
};
const get = (id) => document.getElementById(id);
const input = (id, value) => {
  get(id).value = value;
  get(id).dispatchEvent(new Event("input", { bubbles: true }));
};
const click = (id) => get(id).click();
const submit = () =>
  get("settings-form").dispatchEvent(
    new Event("submit", { bubbles: true, cancelable: true }),
  );
let stored;
let listeners;
let clipboard;

async function setup(
  kind,
  overrides = {},
  loadError,
  tabs = [
    { id: 1, url: "https://example.com/article", title: "A useful article" },
  ],
) {
  stored = structuredClone({
    r2config: config,
    r2shot_theme: "light",
    ...overrides,
  });
  listeners = [];
  document.body.innerHTML = readFileSync(
    kind === "popup" ? "popup.html" : "settings.html",
    "utf8",
  )
    .split(/<body[^>]*>/)[1]
    .split("</body>")[0]
    .split("<script")[0];
  const storage = {
    get: vi.fn(async () => {
      if (loadError) throw loadError;
      return structuredClone(stored);
    }),
    set: vi.fn(async (values) => {
      const changes = Object.fromEntries(
        Object.entries(values).map(([key, value]) => [
          key,
          { oldValue: stored[key], newValue: value },
        ]),
      );
      Object.assign(stored, structuredClone(values));
      for (const listener of listeners) listener(changes, "local");
    }),
  };
  vi.stubGlobal("chrome", {
    i18n: {
      getMessage: vi.fn((key) => messages[key]?.message || key),
      getUILanguage: () => "en-US",
    },
    runtime: {
      getManifest: () => ({ version: "2.0.0" }),
      openOptionsPage: vi.fn(),
      sendMessage: vi.fn().mockResolvedValue({
        success: true,
        url: "https://images.example.com/2026-09-14/shot.jpg",
      }),
    },
    storage: {
      local: storage,
      onChanged: { addListener: (listener) => listeners.push(listener) },
    },
    tabs: { query: vi.fn().mockResolvedValue(tabs) },
  });
  clipboard = vi.fn().mockResolvedValue();
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: clipboard },
  });
  const module =
    kind === "popup"
      ? await import("./popup/main.js")
      : await import("./settings/main.js");
  await module.ready;
}

beforeEach(() => {
  vi.resetModules();
  document.documentElement.removeAttribute("data-theme");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("native popup", () => {
  it("loads existing configuration, page context and theme", async () => {
    await setup("popup");
    expect(get("bucket").textContent).toBe(config.bucketName);
    expect(get("page-title").textContent).toBe("A useful article");
    expect(get("capture").disabled).toBe(false);
    expect(document.documentElement.dataset.theme).toBe("light");
    click("settings");
    expect(chrome.runtime.openOptionsPage).toHaveBeenCalled();
  });
  it("opens setup without capturing when there are no credentials", async () => {
    await setup("popup", { r2config: undefined });
    expect(get("capture").disabled).toBe(true);
    expect(get("bucket").textContent).toBe(messages.setupRequired.message);
    click("capture");
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
  });
  it.each([false, true])(
    "captures the chosen area, full page=%s, and offers a public link",
    async (fullPage) => {
      await setup("popup");
      if (fullPage) document.querySelector('[value="full"]').checked = true;
      click("capture");
      await vi.waitFor(() => expect(get("result").hidden).toBe(false));
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: "CAPTURE_AND_UPLOAD",
        fullPage,
      });
      expect(get("result-url").value).toBe(
        "https://images.example.com/2026-09-14/shot.jpg",
      );
      click("new");
      expect(get("result").hidden).toBe(true);
      expect(get("capture").hidden).toBe(false);
      expect(get("result-url").value).toBe("");
    },
  );
  it("prevents duplicate capture while a request is pending", async () => {
    await setup("popup");
    let finish;
    chrome.runtime.sendMessage.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    click("capture");
    get("capture").dispatchEvent(new MouseEvent("click"));
    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
    expect(get("capture-scope").disabled).toBe(true);
    finish({ success: true, url: "https://images.example.com/a.jpg" });
    await vi.waitFor(() => expect(get("capture-scope").disabled).toBe(false));
  });
  it.each([{ success: false, error: "Upload denied" }, undefined])(
    "shows failed responses without a success URL",
    async (response) => {
      await setup("popup");
      chrome.runtime.sendMessage.mockResolvedValueOnce(response);
      click("capture");
      await vi.waitFor(() =>
        expect(get("capture-status").dataset.state).toBe("error"),
      );
      expect(get("result").hidden).toBe(true);
      expect(get("capture").disabled).toBe(false);
    },
  );
  it("surfaces a rejected message and allows retry", async () => {
    await setup("popup");
    chrome.runtime.sendMessage.mockRejectedValueOnce(new Error("Disconnected"));
    click("capture");
    await vi.waitFor(() =>
      expect(get("capture-status").textContent).toBe("Disconnected"),
    );
    click("capture");
    await vi.waitFor(() => expect(get("result").hidden).toBe(false));
  });
  it("only reports copied after clipboard success, then clears feedback", async () => {
    await setup("popup");
    click("capture");
    await vi.waitFor(() => expect(get("result").hidden).toBe(false));
    vi.useFakeTimers();
    click("copy");
    await vi.waitFor(() =>
      expect(get("copy").textContent).toBe(messages.copied.message),
    );
    expect(clipboard).toHaveBeenCalledWith(get("result-url").value);
    await vi.advanceTimersByTimeAsync(2100);
    expect(get("copy").textContent).toBe(messages.copyUrl.message);
  });
  it("selects the URL for manual copying when clipboard access is denied", async () => {
    await setup("popup");
    click("capture");
    await vi.waitFor(() => expect(get("result").hidden).toBe(false));
    clipboard.mockRejectedValueOnce(new Error("Denied"));
    click("copy");
    await vi.waitFor(() =>
      expect(get("capture-status").textContent).toBe(
        messages.copyFailed.message,
      ),
    );
    expect(document.activeElement).toBe(get("result-url"));
    expect(get("copy").textContent).toBe(messages.copyUrl.message);
  });
  it("updates its destination and theme when settings change", async () => {
    await setup("popup");
    await chrome.storage.local.set({
      r2config: { ...config, bucketName: "new-bucket" },
      r2shot_theme: "dark",
    });
    await vi.waitFor(() =>
      expect(get("bucket").textContent).toBe("new-bucket"),
    );
    expect(document.documentElement.dataset.theme).toBe("dark");
    await chrome.storage.local.set({ r2shot_theme: "system" });
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });
  it("reports configuration loading failures", async () => {
    await setup("popup", {}, new Error("Storage unavailable"));
    expect(get("capture-status").textContent).toBe("Storage unavailable");
    expect(get("capture").disabled).toBe(true);
  });
});

describe("native settings", () => {
  it("loads the existing schema and shows the manifest version", async () => {
    await setup("settings");
    expect(get("endpoint").value).toBe(config.endpoint);
    expect(get("secretAccessKey").value).toBe(config.secretAccessKey);
    expect(get("maxScreens").value).toBe("5");
    expect(document.querySelector("[data-version]").textContent).toBe("v2.0.0");
  });
  it("parses a pasted endpoint and saves normalized settings under the existing key", async () => {
    await setup("settings");
    input("endpoint", " https://new.r2.cloudflarestorage.com/new-bucket/ ");
    get("endpoint").dispatchEvent(new Event("change"));
    expect(get("endpoint").value).toBe("https://new.r2.cloudflarestorage.com");
    expect(get("bucketName").value).toBe("new-bucket");
    input("customDomain", "https://shots.example.com/");
    submit();
    await vi.waitFor(() =>
      expect(stored.r2config.customDomain).toBe("shots.example.com"),
    );
    expect(stored.r2config.secretAccessKey).toBe(config.secretAccessKey);
    await vi.waitFor(() =>
      expect(get("save-status").textContent).toBe(
        messages.settingsSaved.message,
      ),
    );
  });
  it.each([
    ["jpgQuality", "0"],
    ["jpgQuality", "101"],
    ["jpgQuality", "1.5"],
    ["maxScreens", ""],
    ["maxScreens", "101"],
    ["endpoint", "not-a-url"],
    ["customDomain", "http://insecure.example.com"],
    ["bucketName", ""],
  ])(
    "rejects invalid %s=%s without overwriting saved settings",
    async (key, value) => {
      await setup("settings");
      input(key, value);
      submit();
      await vi.waitFor(() =>
        expect(get(`${key}-error`).textContent.length).toBeGreaterThan(0),
      );
      expect(stored.r2config).toEqual(config);
      expect(get(key).getAttribute("aria-invalid")).toBe("true");
    },
  );
  it("synchronizes both quality controls and preserves valid bounds", async () => {
    await setup("settings");
    input("quality-range", "72");
    expect(get("jpgQuality").value).toBe("72");
    input("jpgQuality", "100");
    expect(get("quality-range").value).toBe("100");
    input("maxScreens", "1");
    submit();
    await vi.waitFor(() => expect(stored.r2config.maxScreens).toBe(1));
    expect(stored.r2config.jpgQuality).toBe(100);
  });
  it("reveals and hides the secret only on request", async () => {
    await setup("settings");
    expect(get("secretAccessKey").type).toBe("password");
    click("toggle-secret");
    expect(get("secretAccessKey").type).toBe("text");
    expect(get("toggle-secret").getAttribute("aria-pressed")).toBe("true");
    click("toggle-secret");
    expect(get("secretAccessKey").type).toBe("password");
  });
  it("tests unsaved connection fields without persisting them", async () => {
    await setup("settings");
    input("bucketName", "unsaved-bucket");
    click("test-connection");
    await vi.waitFor(() =>
      expect(get("connection-status").textContent).toBe(
        messages.connectionSuccess.message,
      ),
    );
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: "VERIFY_CONNECTION",
      config: { ...config, bucketName: "unsaved-bucket" },
    });
    expect(stored.r2config.bucketName).toBe(config.bucketName);
  });
  it("invalidates a pending connection test when credentials are edited", async () => {
    await setup("settings");
    let finish;
    chrome.runtime.sendMessage.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    click("test-connection");
    input("secretAccessKey", "a-different-secret");
    finish({ success: true });
    await vi.waitFor(() => expect(get("test-connection").disabled).toBe(false));
    expect(get("connection-status").textContent).toBe("");
  });
  it("shows failed connection results", async () => {
    await setup("settings");
    chrome.runtime.sendMessage.mockResolvedValueOnce({
      success: false,
      error: "Forbidden",
    });
    click("test-connection");
    await vi.waitFor(() =>
      expect(get("connection-status").textContent).toBe("Forbidden"),
    );
    expect(get("test-connection").disabled).toBe(false);
  });
  it("does not test invalid configuration", async () => {
    await setup("settings");
    input("accessKeyId", "");
    click("test-connection");
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
    expect(get("connection-status").textContent).toBe(
      messages.checkFields.message,
    );
  });
  it("surfaces failed storage writes without claiming settings were saved", async () => {
    await setup("settings");
    chrome.storage.local.set.mockRejectedValueOnce(new Error("Storage full"));
    submit();
    await vi.waitFor(() =>
      expect(get("save-status").textContent).toBe("Storage full"),
    );
    expect(get("save").disabled).toBe(false);
  });
  it("saves the independent theme and responds to changes in another window", async () => {
    await setup("settings");
    input("theme", "dark");
    get("theme").dispatchEvent(new Event("change"));
    await vi.waitFor(() => expect(stored.r2shot_theme).toBe("dark"));
    expect(get("save-status").textContent).not.toBe(
      messages.unsavedChanges.message,
    );
    expect(document.documentElement.dataset.theme).toBe("dark");
    await chrome.storage.local.set({ r2shot_theme: "system" });
    expect(get("theme").value).toBe("system");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    document.querySelector('a[href="#appearance"]').click();
    expect(
      document
        .querySelector('a[href="#appearance"]')
        .classList.contains("active"),
    ).toBe(true);
  });
  it("keeps the form disabled after a storage load failure", async () => {
    await setup("settings", {}, new Error("Storage unavailable"));
    expect(get("settings-fields").disabled).toBe(true);
    expect(get("save").disabled).toBe(true);
    expect(get("save-status").textContent).toBe("Storage unavailable");
  });
});

describe("browser and storage edge cases", () => {
  it.each([[[]], [[{ id: 1, title: "", url: "" }]]])(
    "handles unavailable page context",
    async (tabs) => {
      await setup("popup", {}, undefined, tabs);
      expect(get("page-title").textContent).toBe(messages.currentPage.message);
    },
  );
  it("uses the system theme and defaults for a fresh install", async () => {
    await setup("settings", { r2shot_theme: undefined, r2config: undefined });
    expect(get("theme").value).toBe("system");
    expect(get("jpgQuality").value).toBe("90");
    expect(get("output-url").textContent).toContain("images.example.com");
    for (const listener of listeners)
      listener({ r2shot_theme: { newValue: undefined } }, "sync");
    for (const listener of listeners)
      listener({ r2shot_theme: { newValue: undefined } }, "local");
    const { t } = await import("./shared/ui");
    chrome.i18n.getMessage.mockReturnValueOnce("");
    expect(t("missingTranslation")).toBe("missingTranslation");
  });
  it("shows later storage failures when the popup refreshes configuration", async () => {
    await setup("popup");
    chrome.storage.local.get.mockRejectedValueOnce(
      new Error("Storage unavailable"),
    );
    await chrome.storage.local.set({
      r2config: { ...config, bucketName: "next" },
    });
    await vi.waitFor(() =>
      expect(get("capture-status").textContent).toBe("Storage unavailable"),
    );
  });
  it("handles a browser message failure with no error text", async () => {
    await setup("popup");
    chrome.runtime.sendMessage.mockRejectedValueOnce(new Error(""));
    click("capture");
    await vi.waitFor(() =>
      expect(get("capture-status").textContent).toBe(
        messages.captureFailed.message,
      ),
    );
  });
  it.each(["popup", "settings"])(
    "shows a useful default for an empty load error in %s",
    async (kind) => {
      await setup(kind, {}, new Error(""));
      expect(
        get(kind === "popup" ? "capture-status" : "save-status").textContent,
      ).toBe(messages.loadFailed.message);
      if (kind === "settings") {
        submit();
        expect(chrome.storage.local.set).not.toHaveBeenCalled();
      }
    },
  );
  it("handles an empty save error and a failed theme update", async () => {
    await setup("settings");
    chrome.storage.local.set.mockRejectedValueOnce(new Error(""));
    submit();
    await vi.waitFor(() =>
      expect(get("save-status").textContent).toBe(messages.saveFailed.message),
    );
    chrome.storage.local.set.mockRejectedValueOnce(
      new Error("Theme write failed"),
    );
    get("theme").value = "dark";
    get("theme").dispatchEvent(new Event("change"));
    await vi.waitFor(() =>
      expect(get("save-status").textContent).toBe("Theme write failed"),
    );
    chrome.storage.local.set.mockRejectedValueOnce(new Error(""));
    get("theme").dispatchEvent(new Event("change"));
    await vi.waitFor(() =>
      expect(get("save-status").textContent).toBe(messages.saveFailed.message),
    );
  });
  it.each([undefined, { success: false }])(
    "handles a connection response without details",
    async (response) => {
      await setup("settings");
      chrome.runtime.sendMessage.mockResolvedValueOnce(response);
      click("test-connection");
      await vi.waitFor(() =>
        expect(get("connection-status").textContent).toBe(
          messages.connectionError.message,
        ),
      );
    },
  );
  it("ignores a failed stale connection test", async () => {
    await setup("settings");
    let reject;
    chrome.runtime.sendMessage.mockImplementationOnce(
      () =>
        new Promise((_resolve, fail) => {
          reject = fail;
        }),
    );
    click("test-connection");
    input("bucketName", "changed-bucket");
    reject(new Error("Old credentials rejected"));
    await vi.waitFor(() => expect(get("test-connection").disabled).toBe(false));
    expect(get("connection-status").textContent).toBe("");
  });
  it("clears a validation error when the field is edited", async () => {
    await setup("settings");
    input("customDomain", "");
    submit();
    expect(get("customDomain-error").textContent).not.toBe("");
    input("customDomain", "cdn.example.com");
    expect(get("customDomain-error").textContent).toBe("");
    expect(get("customDomain").hasAttribute("aria-invalid")).toBe(false);
  });
});
