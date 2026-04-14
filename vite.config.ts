import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";
import { readFileSync, writeFileSync } from "fs";

/**
 * Vite plugin that rewrites manifest.json icon paths to use dev (red) icons
 * when building in development mode, so unpacked dev builds are visually
 * distinct from production Chrome Web Store builds.
 */
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
        console.log("\n  [dev-manifest-icons] Rewrote icon paths to icons/dev/");
      } catch {
        // manifest.json may not exist yet during dev server start
      }
    },
  };
}

/**
 * Vite plugin that redirects @aws-sdk/xml-builder's browser XML parser
 * to the non-browser variant using fast-xml-parser instead of DOMParser,
 * which is unavailable in MV3 service workers.
 *
 * Vite's built-in browser field resolution remaps "./xml-parser" →
 * "./xml-parser.browser" before plugins see it, so we intercept the
 * resolved absolute path and swap it back to the non-browser file.
 */
function fixXmlParserForServiceWorker(): Plugin {
  const browserFile = resolve(
    __dirname,
    "node_modules/@aws-sdk/xml-builder/dist-es/xml-parser.browser.js",
  );
  const nodeFile = resolve(
    __dirname,
    "node_modules/@aws-sdk/xml-builder/dist-es/xml-parser.js",
  );

  return {
    name: "fix-xml-parser-for-service-worker",
    enforce: "pre",
    load(id) {
      if (id === browserFile) {
        // Redirect to the non-browser variant that uses fast-xml-parser
        return readFileSync(nodeFile, "utf-8");
      }
    },
  };
}

export default defineConfig({
  plugins: [
    fixXmlParserForServiceWorker(),
    react(),
    tailwindcss(),
    devManifestIcons(),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "popup.html"),
        settings: resolve(__dirname, "settings.html"),
        background: resolve(__dirname, "src/background/index.ts"),
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
