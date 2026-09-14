import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

function devManifestIcons(): Plugin {
  let isDev = false;
  let outDir = "dist";

  return {
    name: "dev-manifest-icons",
    configResolved(config) {
      isDev = config.mode === "development";
      outDir = config.build.outDir;
    },
    closeBundle() {
      if (!isDev) return;

      const manifestPath = resolve(outDir, "manifest.json");
      try {
        const raw = readFileSync(manifestPath, "utf-8");
        const patched = raw.replace(/icons\//g, "icons/dev/");
        writeFileSync(manifestPath, patched, "utf-8");
        console.log(
          "\n  [dev-manifest-icons] Rewrote icon paths to icons/dev/",
        );
      } catch {
        // manifest.json may not exist yet during dev server start
      }
    },
  };
}

export default defineConfig({
  plugins: [devManifestIcons()],
  build: {
    target: "chrome123",
    modulePreload: false,
    rollupOptions: {
      input: {
        popup: resolve(import.meta.dirname, "popup.html"),
        settings: resolve(import.meta.dirname, "settings.html"),
        background: resolve(import.meta.dirname, "src/background/index.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name].[hash].js",
        assetFileNames: "assets/[name].[ext]",
      },
    },
    outDir: "dist",
    emptyOutDir: true,
  },
});
