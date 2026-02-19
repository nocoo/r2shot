import { useState, useEffect, useCallback } from "react";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "r2shot_theme";

function getEffectiveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme;
}

function applyTheme(effective: "light" | "dark") {
  document.documentElement.classList.toggle("dark", effective === "dark");
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("system");

  // Load saved theme on mount
  useEffect(() => {
    chrome.storage.local.get([STORAGE_KEY]).then((result) => {
      const saved = result[STORAGE_KEY] as Theme | undefined;
      if (saved && ["light", "dark", "system"].includes(saved)) {
        setTheme(saved);
        applyTheme(getEffectiveTheme(saved));
      } else {
        applyTheme(getEffectiveTheme("system"));
      }
    });
  }, []);

  // Listen for system preference changes when theme is "system"
  useEffect(() => {
    if (theme !== "system") return;

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      applyTheme(e.matches ? "dark" : "light");
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [theme]);

  const changeTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    applyTheme(getEffectiveTheme(newTheme));
    chrome.storage.local.set({ [STORAGE_KEY]: newTheme });
  }, []);

  return { theme, changeTheme };
}
