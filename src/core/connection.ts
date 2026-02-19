import { HeadBucketCommand } from "@aws-sdk/client-s3";
import type { R2Config } from "./r2-config";
import { getS3Client } from "./s3-client";

export interface ConnectionResult {
  ok: boolean;
  error?: string;
}

export async function verifyR2Connection(
  config: R2Config,
): Promise<ConnectionResult> {
  const client = getS3Client(config);

  try {
    await client.send(new HeadBucketCommand({ Bucket: config.bucketName }));
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Connection failed";
    return { ok: false, error: message };
  }
}
