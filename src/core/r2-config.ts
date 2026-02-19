export interface R2Config {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  cdnUrl: string;
  jpgQuality: number;
}

export interface R2ConfigValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof R2Config, string>>;
}

export const DEFAULT_R2_CONFIG: R2Config = {
  endpoint: "",
  accessKeyId: "",
  secretAccessKey: "",
  bucketName: "",
  cdnUrl: "",
  jpgQuality: 90,
};

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

  if (!config.cdnUrl.trim()) {
    errors.cdnUrl = "CDN URL is required";
  } else {
    try {
      const url = new URL(config.cdnUrl.trim());
      if (url.protocol !== "https:") {
        errors.cdnUrl = "CDN URL must start with https://";
      }
    } catch {
      errors.cdnUrl = "CDN URL must be a valid URL";
    }
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
