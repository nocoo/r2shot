import { describe, it, expect, vi, afterEach } from "vitest";
import { getVersion } from "./version";

describe("getVersion", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return version from chrome.runtime.getManifest()", () => {
    vi.stubGlobal("chrome", {
      runtime: {
        getManifest: () => ({ version: "1.2.3" }),
      },
    });

    expect(getVersion()).toBe("1.2.3");
  });

  it("should return 0.0.0 when chrome is not available", () => {
    vi.stubGlobal("chrome", undefined);
    expect(getVersion()).toBe("0.0.0");
  });

  it("should return 0.0.0 when getManifest throws", () => {
    vi.stubGlobal("chrome", {
      runtime: {
        getManifest: () => {
          throw new Error("not available");
        },
      },
    });

    expect(getVersion()).toBe("0.0.0");
  });
});
