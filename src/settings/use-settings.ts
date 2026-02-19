import { useState, useEffect, useCallback } from "react";
import {
  type R2Config,
  DEFAULT_R2_CONFIG,
  validateR2Config,
} from "../core/r2-config";
import { loadConfig, saveConfig } from "../core/storage";
import type { ConnectionResponse } from "../types/messages";

export type SaveStatus = "idle" | "saving" | "saved" | "error";
export type ConnectionStatus = "idle" | "testing" | "success" | "error";

interface SettingsState {
  config: R2Config;
  loading: boolean;
  errors: Partial<Record<keyof R2Config, string>>;
  saveStatus: SaveStatus;
  connectionStatus: ConnectionStatus;
  connectionError: string | null;
  updateField: <K extends keyof R2Config>(key: K, value: R2Config[K]) => void;
  save: () => Promise<void>;
  testConnection: () => Promise<void>;
}

export function useSettings(): SettingsState {
  const [config, setConfig] = useState<R2Config>(DEFAULT_R2_CONFIG);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<keyof R2Config, string>>>(
    {},
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("idle");
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    loadConfig().then((loaded) => {
      setConfig(loaded);
      setLoading(false);
    });
  }, []);

  const updateField = useCallback(
    <K extends keyof R2Config>(key: K, value: R2Config[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setSaveStatus("idle");
    },
    [],
  );

  const save = useCallback(async () => {
    const validation = validateR2Config(config);
    if (!validation.valid) {
      setErrors(validation.errors);
      setSaveStatus("error");
      return;
    }

    setSaveStatus("saving");
    await saveConfig(config);
    setErrors({});
    setSaveStatus("saved");
  }, [config]);

  const testConnection = useCallback(async () => {
    setConnectionStatus("testing");
    setConnectionError(null);

    try {
      const response: ConnectionResponse = await chrome.runtime.sendMessage({
        type: "VERIFY_CONNECTION",
      });

      if (response.success) {
        setConnectionStatus("success");
      } else {
        setConnectionStatus("error");
        setConnectionError(response.error);
      }
    } catch (err) {
      setConnectionStatus("error");
      setConnectionError(
        err instanceof Error ? err.message : "Connection test failed",
      );
    }
  }, []);

  return {
    config,
    loading,
    errors,
    saveStatus,
    connectionStatus,
    connectionError,
    updateField,
    save,
    testConnection,
  };
}
