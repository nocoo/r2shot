import { spawnSync } from "node:child_process";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const root = fileURLToPath(new URL("..", import.meta.url));
const reporter = fileURLToPath(new URL("./selected-run.ts", import.meta.url));
const vitest = fileURLToPath(
  new URL("../node_modules/vitest/vitest.mjs", import.meta.url),
);

async function run(source: string): Promise<number> {
  const dir = await mkdtemp(join(tmpdir(), "r2shot-selected-"));
  const cacheDir = join(dir, "cache");
  try {
    await symlink(join(root, "node_modules"), join(dir, "node_modules"), "dir");
    await writeFile(join(dir, "example.test.ts"), source);
    await writeFile(
      join(dir, "vitest.config.ts"),
      `import { defineConfig } from "vitest/config";
export default defineConfig({
  cacheDir: ${JSON.stringify(cacheDir)},
  test: {
    allowOnly: false,
    passWithNoTests: false,
    reporters: ["default", ${JSON.stringify(reporter)}],
    include: ["example.test.ts"],
  },
});
`,
    );
    const result = spawnSync(
      process.execPath,
      [vitest, "run", "--config", join(dir, "vitest.config.ts")],
      { cwd: dir, encoding: "utf8", timeout: 20_000 },
    );
    return result.status ?? 1;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("selected runs reject skip, only, and empty suites", async () => {
  expect(
    await run(
      "import { expect, test } from 'vitest'; test('ok', () => expect(1).toBe(1));\n",
    ),
  ).toBe(0);
  expect(
    await run("import { test } from 'vitest'; test.skip('no', () => {});\n"),
  ).not.toBe(0);
  expect(
    await run(
      "import { expect, test } from 'vitest'; test.only('focused', () => expect(1).toBe(1));\n",
    ),
  ).not.toBe(0);
  expect(await run("export {};\n")).not.toBe(0);
}, 60_000);
