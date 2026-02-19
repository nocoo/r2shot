export interface R2Config {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  customDomain: string;
  jpgQuality: number;
}

export interface R2ConfigValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof R2Config, string>>;
}

export interface ParsedEndpoint {
  endpoint: string;
  bucketName?: string;
}

export const DEFAULT_R2_CONFIG: R2Config = {
  endpoint: "",
  accessKeyId: "",
  secretAccessKey: "",
  bucketName: "",
  customDomain: "",
  jpgQuality: 90,
};

/**
 * Parse a pasted S3 API URL and extract the endpoint and optional bucket name.
 *
 * Cloudflare R2 S3 API URLs look like:
 *   https://<account-id>.r2.cloudflarestorage.com/<bucket-name>
 *
 * This function strips the path to produce a clean endpoint and extracts the
 * first path segment as the bucket name when present.
 */
export function parseR2Endpoint(input: string): ParsedEndpoint {
  const trimmed = input.trim();
  if (!trimmed) return { endpoint: "" };

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { endpoint: trimmed };
  }

  const endpoint = `${url.protocol}//${url.host}`;

  // Extract first non-empty path segment as bucket name
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length > 0) {
    return { endpoint, bucketName: segments[0] };
  }

  return { endpoint };
}

export function validateR2Config(config: R2Config): R2ConfigValidationResult {
  const errors: Partial<Record<keyof R2Config, string>> = {};

  if (!config.endpoint.trim()) {
    errors.endpoint = "Endpoint URL is required";
  } else {
    try {
      const url = new URL(config.endpoint.trim());
      if (url.protocol !== "https:") {
        errors.endpoint = "Endpoint URL must start with https://";
      }
    } catch {
      errors.endpoint = "Endpoint URL must be a valid URL";
    }
  }

  if (!config.accessKeyId.trim()) {
    errors.accessKeyId = "Access Key ID is required";
  }

  if (!config.secretAccessKey.trim()) {
    errors.secretAccessKey = "Secret Access Key is required";
  }

  if (!config.bucketName.trim()) {
    errors.bucketName = "Bucket name is required";
  }

  if (!config.customDomain.trim()) {
    errors.customDomain = "Custom domain is required";
  }

  if (!Number.isInteger(config.jpgQuality)) {
    errors.jpgQuality = "JPG quality must be an integer";
  } else if (config.jpgQuality < 1 || config.jpgQuality > 100) {
    errors.jpgQuality = "JPG quality must be between 1 and 100";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
