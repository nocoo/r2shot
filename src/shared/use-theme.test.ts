import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useTheme } from "./use-theme";

const mockStorage: Record<string, unknown> = {};

let mediaQueryMatches = false;
let mediaChangeHandler: ((e: MediaQueryListEvent) => void) | null = null;

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
});

vi.stubGlobal("matchMedia", (query: string) => ({
  matches: query === "(prefers-color-scheme: dark)" ? mediaQueryMatches : false,
  media: query,
  addEventListener: vi.fn((_event: string, handler: (e: MediaQueryListEvent) => void) => {
    mediaChangeHandler = handler;
  }),
  removeEventListener: vi.fn(() => {
    mediaChangeHandler = null;
  }),
}));

describe("useTheme", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(mockStorage)) delete mockStorage[key];
    mediaQueryMatches = false;
    mediaChangeHandler = null;
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    document.documentElement.classList.remove("dark");
  });

  it("should default to system theme", async () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("system");
  });

  it("should load saved theme from storage", async () => {
    mockStorage["r2shot_theme"] = "dark";
    const { result, unmount } = renderHook(() => useTheme());

    await waitFor(() => {
      expect(result.current.theme).toBe("dark");
    });

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    unmount();
  });

  it("should apply light theme (no dark class)", async () => {
    mockStorage["r2shot_theme"] = "light";
    const { result, unmount } = renderHook(() => useTheme());

    await waitFor(() => {
      expect(result.current.theme).toBe("light");
    });

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    unmount();
  });

  it("should change theme and persist to storage", () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.changeTheme("dark");
    });

    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      r2shot_theme: "dark",
    });
  });

  it("should apply system preference when theme is system (light)", () => {
    mediaQueryMatches = false;
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.changeTheme("system");
    });

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("should apply system preference when theme is system (dark)", () => {
    mediaQueryMatches = true;
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.changeTheme("system");
    });

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("should listen for system preference changes in system mode", () => {
    const { result } = renderHook(() => useTheme());

    // Default is "system", so listener should be registered
    expect(mediaChangeHandler).not.toBeNull();

    // Simulate system switching to dark
    act(() => {
      mediaChangeHandler?.({ matches: true } as MediaQueryListEvent);
    });

    expect(document.documentElement.classList.contains("dark")).toBe(true);

    // Simulate system switching back to light
    act(() => {
      mediaChangeHandler?.({ matches: false } as MediaQueryListEvent);
    });

    expect(document.documentElement.classList.contains("dark")).toBe(false);

    // Switch to explicit dark — should stop listening
    act(() => {
      result.current.changeTheme("dark");
    });
  });

  it("should ignore invalid saved theme values", async () => {
    mockStorage["r2shot_theme"] = "invalid-value";
    const { result, unmount } = renderHook(() => useTheme());

    // Should stay at default "system"
    await waitFor(() => {
      expect(result.current.theme).toBe("system");
    });
    unmount();
  });
});
