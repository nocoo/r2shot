import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  test: {
    globals: true,
    environment: "happy-dom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      // experimentalAstAwareRemapping reduces variance and slightly improves
      // wall-clock by avoiding the legacy source-map-based remap path.
      experimentalAstAwareRemapping: true,
      reporter: ["text", "html"],
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: [
        // Test files themselves.
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
        // Type-only declaration files.
        "src/**/*.d.ts",
        /*
         * Extension entry points: background service worker and UI bootstrap
         * files. These are thin wiring shims that mount React roots or
         * register Chrome runtime listeners; they are exercised end-to-end
         * via manual / E2E checks rather than unit tests.
         */
        "src/background/index.ts",
        "src/popup/main.tsx",
        "src/settings/main.tsx",
        // Pure type definitions, no runtime code to cover.
        "src/types/**",
      ],
      thresholds: {
        branches: 95,
        functions: 95,
        lines: 95,
        statements: 95,
      },
    },
  },
});
