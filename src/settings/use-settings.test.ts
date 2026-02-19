import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useSettings } from "./use-settings";
import type { R2Config } from "../core/r2-config";

const mockStorage: Record<string, unknown> = {};

vi.stubGlobal("chrome", {
  storage: {
    local: {
      get: vi.fn((keys: string[]) => {
        const result: Record<string, unknown> = {};
        for (const key of keys) {
          if (key in mockStorage) result[key] = mockStorage[key];
        }
        return Promise.resolve(result);
      }),
      set: vi.fn((items: Record<string, unknown>) => {
        Object.assign(mockStorage, items);
        return Promise.resolve();
      }),
    },
  },
  runtime: {
    sendMessage: vi.fn(),
  },
});

describe("useSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(mockStorage)) delete mockStorage[key];
  });

  it("should load default config on mount", async () => {
    const { result } = renderHook(() => useSettings());

    // Initially loading
    expect(result.current.loading).toBe(true);

    // Wait for load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.config.jpgQuality).toBe(90);
    expect(result.current.config.endpoint).toBe("");
  });

  it("should load stored config on mount", async () => {
    const stored: R2Config = {
      endpoint: "https://my-account.r2.cloudflarestorage.com",
      accessKeyId: "my-key",
      secretAccessKey: "my-secret",
      bucketName: "my-bucket",
      customDomain: "cdn.example.com",
      jpgQuality: 85,
    };
    mockStorage["r2config"] = stored;

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.config).toEqual(stored);
  });

  it("should update a config field", async () => {
    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.updateField(
        "endpoint",
        "https://new.r2.cloudflarestorage.com",
      );
    });

    expect(result.current.config.endpoint).toBe(
      "https://new.r2.cloudflarestorage.com",
    );
  });

  it("should save config and show success", async () => {
    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.updateField(
        "endpoint",
        "https://test.r2.cloudflarestorage.com",
      );
      result.current.updateField("accessKeyId", "test-key");
      result.current.updateField("secretAccessKey", "test-secret");
      result.current.updateField("bucketName", "test-bucket");
      result.current.updateField("customDomain", "cdn.test.com");
    });

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.saveStatus).toBe("saved");
  });

  it("should show validation errors on save with invalid config", async () => {
    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Config is empty by default, so validation should fail
    await act(async () => {
      await result.current.save();
    });

    expect(result.current.saveStatus).toBe("error");
    expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);
  });

  it("should test connection with current UI config via chrome.runtime.sendMessage", async () => {
    const mockSendMessage = vi.mocked(chrome.runtime.sendMessage);
    mockSendMessage.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Update a field so we can verify the current config is sent
    act(() => {
      result.current.updateField(
        "endpoint",
        "https://ui-state.r2.cloudflarestorage.com",
      );
    });

    await act(async () => {
      await result.current.testConnection();
    });

    expect(result.current.connectionStatus).toBe("success");
    expect(mockSendMessage).toHaveBeenCalledWith({
      type: "VERIFY_CONNECTION",
      config: expect.objectContaining({
        endpoint: "https://ui-state.r2.cloudflarestorage.com",
      }),
    });
  });

  it("should handle failed connection test", async () => {
    const mockSendMessage = vi.mocked(chrome.runtime.sendMessage);
    mockSendMessage.mockResolvedValue({
      success: false,
      error: "Access Denied",
    });

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.testConnection();
    });

    expect(result.current.connectionStatus).toBe("error");
    expect(result.current.connectionError).toBe("Access Denied");
    expect(mockSendMessage).toHaveBeenCalledWith({
      type: "VERIFY_CONNECTION",
      config: result.current.config,
    });
  });

  it("should stop loading and use defaults when loadConfig rejects", async () => {
    const mockGet = vi.mocked(chrome.storage.local.get);
    mockGet.mockRejectedValueOnce(new Error("Storage unavailable"));

    const { result } = renderHook(() => useSettings());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Falls back to defaults
    expect(result.current.config.endpoint).toBe("");
    expect(result.current.config.jpgQuality).toBe(90);
  });

  it("should set saveStatus to error when saveConfig rejects", async () => {
    const mockSet = vi.mocked(chrome.storage.local.set);
    mockSet.mockRejectedValueOnce(new Error("Quota exceeded"));

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Fill in valid config
    act(() => {
      result.current.updateField(
        "endpoint",
        "https://test.r2.cloudflarestorage.com",
      );
      result.current.updateField("accessKeyId", "test-key");
      result.current.updateField("secretAccessKey", "test-secret");
      result.current.updateField("bucketName", "test-bucket");
      result.current.updateField("customDomain", "cdn.test.com");
    });

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.saveStatus).toBe("error");
  });
});
