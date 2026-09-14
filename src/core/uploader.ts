import type { R2Config } from "./r2-config";
import { normalizePublicDomain } from "./r2-config";
import { requestR2 } from "./s3-client";

export function generateObjectKey(date: Date = new Date()): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const folder = `${yyyy}-${mm}-${dd}`;
  const guid = crypto.randomUUID();
  return `${folder}/${guid}.jpg`;
}

export function buildPublicUrl(domain: string, objectKey: string): string {
  const cleaned = normalizePublicDomain(domain);
  return `https://${cleaned}/${objectKey}`;
}

export async function uploadToR2(
  config: R2Config,
  blob: Blob,
): Promise<string> {
  const objectKey = generateObjectKey();
  const body = new Uint8Array(await blob.arrayBuffer());
  await requestR2(config, "PUT", objectKey, body);

  return buildPublicUrl(config.customDomain, objectKey);
}
