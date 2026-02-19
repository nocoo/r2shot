import { S3Client } from "@aws-sdk/client-s3";
import type { R2Config } from "./r2-config";

interface CachedClient {
  client: S3Client;
  fingerprint: string;
}

let cached: CachedClient | null = null;

function buildFingerprint(config: R2Config): string {
  return `${config.endpoint}\0${config.accessKeyId}\0${config.secretAccessKey}`;
}

export function getS3Client(config: R2Config): S3Client {
  const fingerprint = buildFingerprint(config);

  if (cached && cached.fingerprint === fingerprint) {
    return cached.client;
  }

  const client = new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  cached = { client, fingerprint };
  return client;
}

/** Reset the cached client. Exported for testing only. */
export function resetS3Client(): void {
  cached = null;
}
