import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    allowOnly: false,
    passWithNoTests: false,
    reporters: ["default", "./tests/selected-run.ts"],
    environment: "node",
    include: ["src/**/*.test.{ts,js}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["src/**/*.ts", "src/**/*.js"],
      exclude: [
        // Test files themselves.
        "src/**/*.test.ts",
        "src/**/*.test.js",
        // Type-only declaration files.
        "src/**/*.d.ts",
        // Listener wiring is checked by Chrome E2E, outside this V8 coverage report.
        "src/background/index.ts",
        "**/index.ts",
        "**/types.ts",
        "src/types/**",
      ],
      thresholds: {
        statements: 90,
        lines: 90,
        functions: 90,
        branches: 85,
      },
    },
  },
});
