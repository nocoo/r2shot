import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "happy-dom",
    include: ["src/**/*.test.ts", "src/**/*.test.js"],
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
        // Chrome listener registration is exercised by extension browser tests.
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
