// @vitest-environment node
import { createHash } from "node:crypto";
import { S3Client } from "@aws-sdk/client-s3";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_R2_CONFIG } from "./r2-config";
import { requestR2, signR2Request } from "./s3-client";

const config = {
  ...DEFAULT_R2_CONFIG,
  endpoint: "https://example.r2.cloudflarestorage.com",
  bucketName: "test-bucket",
  accessKeyId: "TESTKEY",
  secretAccessKey: "test-secret-not-a-real-credential",
};
const date = new Date("2026-09-14T12:34:56Z");
const client = new S3Client({
  region: "auto",
  endpoint: config.endpoint,
  credentials: {
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
  },
});
afterEach(() => vi.unstubAllGlobals());

describe("native R2 Signature V4", () => {
  it.each([
    ["HEAD", "", ""],
    ["PUT", "2026-09-14/abc.jpg", "JPEG bytes"],
    ["PUT", "folder/a b+雪!'().jpg", "nonempty payload"],
  ] as const)(
    "matches the AWS SDK signing oracle for %s %s",
    async (method, key, payload) => {
      const body = new TextEncoder().encode(payload);
      const signed = await signR2Request(config, method, key, body, date);
      const url = new URL(signed.url);
      const headers = { ...signed.headers, host: url.host };
      delete (headers as Record<string, string>).authorization;
      const signer = await client.config.signer();
      const oracle = await signer.sign(
        {
          method,
          protocol: url.protocol,
          hostname: url.hostname,
          path: url.pathname,
          headers,
          body,
        },
        { signingDate: date },
      );
      expect(signed.headers.authorization).toBe(oracle.headers.authorization);
      expect(signed.headers["x-amz-content-sha256"]).toBe(
        createHash("sha256").update(body).digest("hex"),
      );
      expect(signed.headers["x-amz-date"]).toBe("20260914T123456Z");
      expect(signed.headers).not.toHaveProperty("host");
    },
  );

  it("keeps the bucket and object path encoded and signs the auto region", async () => {
    const signed = await signR2Request(
      config,
      "PUT",
      "dir/a b+.jpg",
      new Uint8Array(),
      date,
    );
    expect(signed.url).toBe(`${config.endpoint}/test-bucket/dir/a%20b%2B.jpg`);
    expect(signed.headers.authorization).toContain(
      "/20260914/auto/s3/aws4_request",
    );
    expect(signed.headers["content-type"]).toBe("image/jpeg");
  });

  it.each([
    "http://example.com",
    "https://user:secret@example.com",
    "https://example.com?token=1",
    "https://example.com#fragment",
  ])("rejects unsafe endpoint %s", async (endpoint) => {
    await expect(
      signR2Request({ ...config, endpoint }, "HEAD"),
    ).rejects.toThrow("Invalid R2 endpoint");
  });

  it("sends a signed PUT with no cookies and refuses redirects", async () => {
    const send = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", send);
    const body = new Uint8Array([255, 216, 255, 217]);
    await requestR2(config, "PUT", "date/shot.jpg", body);
    expect(send).toHaveBeenCalledWith(
      `${config.endpoint}/test-bucket/date/shot.jpg`,
      expect.objectContaining({
        method: "PUT",
        body,
        credentials: "omit",
        redirect: "error",
        signal: expect.any(AbortSignal),
      }),
    );
    expect(send.mock.calls[0][1].headers.authorization).toMatch(
      /^AWS4-HMAC-SHA256 /,
    );
  });

  it("sends HEAD with no request body", async () => {
    const send = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", send);
    await requestR2(config, "HEAD");
    expect(send.mock.calls[0][1]).not.toHaveProperty("body");
  });

  it.each([
    [403, "Forbidden"],
    [500, ""],
  ])("reports HTTP %s without exposing credentials", async (code, text) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: code as number,
          statusText: text as string,
        }),
      ),
    );
    await expect(requestR2(config, "HEAD")).rejects.toThrow(
      `R2 request failed (${code}${text ? ` ${text}` : ""})`,
    );
  });
  it("propagates network failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Network offline")),
    );
    await expect(requestR2(config, "HEAD")).rejects.toThrow("Network offline");
  });
});
