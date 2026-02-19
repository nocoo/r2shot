import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadConfig, saveConfig } from "./storage";
import { DEFAULT_R2_CONFIG, type R2Config } from "./r2-config";

// Mock chrome.storage.local
const mockStorage: Record<string, unknown> = {};

const chromeStorageMock = {
  local: {
    get: vi.fn((keys: string[]) => {
      const result: Record<string, unknown> = {};
      for (const key of keys) {
        if (key in mockStorage) {
          result[key] = mockStorage[key];
        }
      }
      return Promise.resolve(result);
    }),
    set: vi.fn((items: Record<string, unknown>) => {
      Object.assign(mockStorage, items);
      return Promise.resolve();
    }),
  },
};

vi.stubGlobal("chrome", { storage: chromeStorageMock });

describe("storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(mockStorage)) {
      delete mockStorage[key];
    }
  });

  describe("loadConfig", () => {
    it("should return default config when nothing is stored", async () => {
      const config = await loadConfig();
      expect(config).toEqual(DEFAULT_R2_CONFIG);
    });

    it("should return stored config when available", async () => {
      const stored: R2Config = {
        endpoint: "https://my-account.r2.cloudflarestorage.com",
        accessKeyId: "my-key",
        secretAccessKey: "my-secret",
        bucketName: "my-bucket",
        customDomain: "cdn.example.com",
        jpgQuality: 85,
      };
      mockStorage["r2config"] = stored;

      const config = await loadConfig();
      expect(config).toEqual(stored);
    });

    it("should merge partial stored config with defaults", async () => {
      mockStorage["r2config"] = { endpoint: "https://partial.r2.cloudflarestorage.com" };

      const config = await loadConfig();
      expect(config.endpoint).toBe("https://partial.r2.cloudflarestorage.com");
      expect(config.jpgQuality).toBe(90);
      expect(config.customDomain).toBe("");
    });
  });

  describe("saveConfig", () => {
    it("should persist config to chrome.storage.local", async () => {
      const config: R2Config = {
        endpoint: "https://test-id.r2.cloudflarestorage.com",
        accessKeyId: "test-key",
        secretAccessKey: "test-secret",
        bucketName: "test-bucket",
        customDomain: "cdn.test.com",
        jpgQuality: 75,
      };

      await saveConfig(config);

      expect(chromeStorageMock.local.set).toHaveBeenCalledWith({
        r2config: config,
      });
    });

    it("should strip trailing slash from customDomain before saving", async () => {
      const config: R2Config = {
        endpoint: "https://test-id.r2.cloudflarestorage.com",
        accessKeyId: "test-key",
        secretAccessKey: "test-secret",
        bucketName: "test-bucket",
        customDomain: "cdn.test.com/",
        jpgQuality: 75,
      };

      await saveConfig(config);

      expect(chromeStorageMock.local.set).toHaveBeenCalledWith({
        r2config: { ...config, customDomain: "cdn.test.com" },
      });
    });
  });
});
