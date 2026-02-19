import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";
import type { R2Config } from "./r2-config";

export interface ConnectionResult {
  ok: boolean;
  error?: string;
}

export async function verifyR2Connection(
  config: R2Config,
): Promise<ConnectionResult> {
  const client = new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  try {
    await client.send(new HeadBucketCommand({ Bucket: config.bucketName }));
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Connection failed";
    return { ok: false, error: message };
  }
}
