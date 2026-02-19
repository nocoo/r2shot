import { DEFAULT_R2_CONFIG, type R2Config } from "./r2-config";

const STORAGE_KEY = "r2config";

export async function loadConfig(): Promise<R2Config> {
  const result = await chrome.storage.local.get([STORAGE_KEY]);
  const stored = result[STORAGE_KEY] as Partial<R2Config> | undefined;
  return { ...DEFAULT_R2_CONFIG, ...stored };
}

export async function saveConfig(config: R2Config): Promise<void> {
  const normalized: R2Config = {
    ...config,
    cdnUrl: config.cdnUrl.replace(/\/+$/, ""),
  };
  await chrome.storage.local.set({ [STORAGE_KEY]: normalized });
}
