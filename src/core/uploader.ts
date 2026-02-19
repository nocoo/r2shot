import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import type { R2Config } from "./r2-config";

export function generateObjectKey(date: Date = new Date()): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const folder = `${yyyy}-${mm}-${dd}`;
  const guid = crypto.randomUUID();
  return `${folder}/${guid}.jpg`;
}

export function buildPublicUrl(domain: string, objectKey: string): string {
  const cleaned = domain.replace(/\/+$/, "");
  return `https://${cleaned}/${objectKey}`;
}

export async function uploadToR2(
  config: R2Config,
  blob: Blob,
): Promise<string> {
  const client = new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  const objectKey = generateObjectKey();
  const arrayBuffer = await blob.arrayBuffer();

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: objectKey,
    Body: new Uint8Array(arrayBuffer),
    ContentType: "image/jpeg",
  });

  await client.send(command);

  return buildPublicUrl(config.customDomain, objectKey);
}
