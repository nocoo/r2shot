import type { R2Config } from "./r2-config";
import { requestR2 } from "./s3-client";

export interface ConnectionResult {
  ok: boolean;
  error?: string;
}

export async function verifyR2Connection(
  config: R2Config,
): Promise<ConnectionResult> {
  try {
    await requestR2(config, "HEAD");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Connection failed",
    };
  }
}
