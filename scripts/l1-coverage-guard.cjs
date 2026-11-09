"use strict";

const fs = require("node:fs");
const path = require("node:path");

const summaryPath = path.join(process.cwd(), "coverage", "coverage-summary.json");
const floors = {
  statements: 95,
  branches: 95,
  functions: 95,
  lines: 95,
};

if (!fs.existsSync(summaryPath)) {
  console.error(
    "l1-coverage-guard: missing coverage/coverage-summary.json after test:coverage",
  );
  process.exit(1);
}

let summary;
try {
  summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
} catch (error) {
  console.error("l1-coverage-guard: unreadable coverage summary:", error);
  process.exit(1);
}

const total = summary?.total;
if (!total || typeof total !== "object") {
  console.error("l1-coverage-guard: coverage summary has no total section");
  process.exit(1);
}

for (const [metric, floor] of Object.entries(floors)) {
  const pct = total[metric]?.pct;
  if (typeof pct !== "number" || Number.isNaN(pct)) {
    console.error(`l1-coverage-guard: missing numeric ${metric} pct in summary`);
    process.exit(1);
  }
  if (pct + 1e-9 < floor) {
    console.error(
      `l1-coverage-guard: ${metric} ${pct}% is below the required ${floor}% floor`,
    );
    process.exit(1);
  }
}
