import type { R2Config } from "./r2-config";

const encoder = new TextEncoder();
const hex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
const digest = async (value: string | Uint8Array<ArrayBuffer>) =>
  hex(
    await crypto.subtle.digest(
      "SHA-256",
      typeof value === "string" ? encoder.encode(value) : value,
    ),
  );

async function hmac(
  key: Uint8Array<ArrayBuffer>,
  value: string,
): Promise<Uint8Array<ArrayBuffer>> {
  const imported = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(
    await crypto.subtle.sign("HMAC", imported, encoder.encode(value)),
  );
}

const encodeSegment = (value: string) =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );

export async function signR2Request(
  config: R2Config,
  method: "HEAD" | "PUT",
  objectKey = "",
  body = new Uint8Array(0),
  date = new Date(),
) {
  const endpoint = new URL(config.endpoint);
  if (
    endpoint.protocol !== "https:" ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash
  )
    throw new Error("Invalid R2 endpoint");
  const path = [config.bucketName, ...objectKey.split("/").filter(Boolean)]
    .map(encodeSegment)
    .join("/");
  const url = new URL(`/${path}`, endpoint);
  const timestamp = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const day = timestamp.slice(0, 8);
  const scope = `${day}/auto/s3/aws4_request`;
  const payloadHash = await digest(body);
  const headers: Record<string, string> = {
    host: url.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": timestamp,
    ...(method === "PUT" ? { "content-type": "image/jpeg" } : {}),
  };
  const names = Object.keys(headers).sort();
  const signedHeaders = names.join(";");
  const canonicalHeaders = names
    .map((name) => `${name}:${headers[name]}\n`)
    .join("");
  const canonical = [
    method,
    url.pathname,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    timestamp,
    scope,
    await digest(canonical),
  ].join("\n");
  let key = encoder.encode(`AWS4${config.secretAccessKey}`);
  for (const part of [day, "auto", "s3", "aws4_request"])
    key = await hmac(key, part);
  const signature = hex((await hmac(key, stringToSign)).buffer);
  delete headers.host;
  headers.authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return { url: url.href, headers };
}

export async function requestR2(
  config: R2Config,
  method: "HEAD" | "PUT",
  objectKey = "",
  body = new Uint8Array(0),
): Promise<void> {
  const { url, headers } = await signR2Request(config, method, objectKey, body);
  const response = await fetch(url, {
    method,
    headers,
    ...(method === "PUT" ? { body } : {}),
    credentials: "omit",
    redirect: "error",
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok)
    throw new Error(
      `R2 request failed (${response.status}${response.statusText ? ` ${response.statusText}` : ""})`,
    );
}
