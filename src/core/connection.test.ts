import { beforeEach, describe, expect, it, vi } from "vitest";
import { verifyR2Connection } from "./connection";
import { DEFAULT_R2_CONFIG } from "./r2-config";
import { requestR2 } from "./s3-client";

vi.mock("./s3-client", () => ({ requestR2: vi.fn() }));
beforeEach(() => vi.clearAllMocks());
describe("connection verification", () => {
  it("tests the supplied bucket with HEAD", async () => {
    vi.mocked(requestR2).mockResolvedValueOnce();
    expect(await verifyR2Connection(DEFAULT_R2_CONFIG)).toEqual({ ok: true });
    expect(requestR2).toHaveBeenCalledWith(DEFAULT_R2_CONFIG, "HEAD");
  });
  it("shows a request failure", async () => {
    vi.mocked(requestR2).mockRejectedValueOnce(new Error("Access Denied"));
    expect(await verifyR2Connection(DEFAULT_R2_CONFIG)).toEqual({
      ok: false,
      error: "Access Denied",
    });
  });
  it("handles a non-Error rejection", async () => {
    vi.mocked(requestR2).mockRejectedValueOnce(null);
    expect(await verifyR2Connection(DEFAULT_R2_CONFIG)).toEqual({
      ok: false,
      error: "Connection failed",
    });
  });
});
