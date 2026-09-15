import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,js}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts", "src/**/*.js"],
      exclude: [
        // Test files themselves.
        "src/**/*.test.ts",
        "src/**/*.test.js",
        // Type-only declaration files.
        "src/**/*.d.ts",
        // Listener wiring is checked by Chrome E2E, outside this V8 coverage report.
        "src/background/index.ts",
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
