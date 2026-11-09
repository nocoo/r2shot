#!/usr/bin/env bash
# Isolated pre-commit gate probes for 6DQ L1 hardening evidence.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

require_cmd() {
	if ! command -v "$1" >/dev/null 2>&1; then
		echo "l1-gate-selftest: required executable missing: $1" >&2
		exit 1
	fi
}

for bin in git gitleaks bun; do
	require_cmd "$bin"
done

if [ ! -d "$REPO_ROOT/node_modules" ]; then
	echo "l1-gate-selftest: install dependencies first (bun install --frozen-lockfile)" >&2
	exit 1
fi

OWNED_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/r2shot-l1-selftest-XXXXXX")"
WORKTREE="$OWNED_ROOT/worktree"
FAILURES=0
PASSED=0
HEALTHY_MS=""
COVERAGE_LINE=""

cleanup() {
	local status=$?
	trap - EXIT INT TERM HUP
	if [ -n "${WORKTREE:-}" ]; then
		git -C "$REPO_ROOT" worktree remove -f "$WORKTREE" >/dev/null 2>&1 || rm -rf "$WORKTREE"
	fi
	rm -rf "$OWNED_ROOT"
	exit "$status"
}
trap cleanup EXIT INT TERM HUP

git -C "$REPO_ROOT" worktree add --detach "$WORKTREE" HEAD >/dev/null
ln -sfn "$REPO_ROOT/node_modules" "$WORKTREE/node_modules"

WT() {
	(cd "$WORKTREE" && "$@")
}

overlay_repo_files() {
	local rel
	for rel in .husky/pre-commit scripts/l1-coverage-guard.cjs vitest.config.ts package.json; do
		cp "$REPO_ROOT/$rel" "$WORKTREE/$rel"
	done
	WT git add .husky/pre-commit scripts/l1-coverage-guard.cjs vitest.config.ts package.json
}

overlay_repo_files

HOOK="$WORKTREE/.husky/pre-commit"

reset_fixture() {
	WT git reset --hard HEAD >/dev/null
	WT git clean -fd --exclude=node_modules >/dev/null
	overlay_repo_files
}

run_hook() {
	WT bash -lc "cd '$WORKTREE' && bash '$HOOK'"
}

run_hook_without_bun() {
	WT env -i HOME="${HOME:-/tmp}" PATH="/usr/bin:/bin" bash --noprofile --norc -lc "cd '$WORKTREE' && bash '$HOOK'"
}

run_hook_without_gitleaks() {
	local bun_dir
	bun_dir="$(dirname "$(command -v bun)")"
	WT env PATH="$bun_dir:/usr/bin:/bin" bash -lc "cd '$WORKTREE' && bash '$HOOK'"
}

expect_reject() {
	local name="$1"
	shift
	local before_head
	before_head="$(WT git rev-parse HEAD)"
	set +e
	"$@"
	local exit_code=$?
	set -e
	if [ "$exit_code" -eq 0 ]; then
		echo "FAIL [$name]: expected non-zero exit, got 0" >&2
		FAILURES=$((FAILURES + 1))
		return
	fi
	if [ "$(WT git rev-parse HEAD)" != "$before_head" ]; then
		echo "FAIL [$name]: HEAD moved during probe" >&2
		FAILURES=$((FAILURES + 1))
		return
	fi
	echo "OK   [$name]: rejected (exit $exit_code)"
	PASSED=$((PASSED + 1))
}

expect_accept() {
	local name="$1"
	shift
	local before_head
	before_head="$(WT git rev-parse HEAD)"
	set +e
	"$@"
	local exit_code=$?
	set -e
	if [ "$exit_code" -ne 0 ]; then
		echo "FAIL [$name]: expected success, got exit $exit_code" >&2
		FAILURES=$((FAILURES + 1))
		return
	fi
	if [ "$(WT git rev-parse HEAD)" != "$before_head" ]; then
		echo "FAIL [$name]: HEAD moved during healthy probe" >&2
		FAILURES=$((FAILURES + 1))
		return
	fi
	echo "OK   [$name]: accepted (exit 0)"
	PASSED=$((PASSED + 1))
}

write_probe_test() {
	local body="$1"
	WT mkdir -p src
	printf '%s\n' "$body" >"$WORKTREE/src/l1-gate-probe.test.ts"
	WT git add src/l1-gate-probe.test.ts
}

write_probe_source() {
	local body="$1"
	WT mkdir -p src
	printf '%s\n' "$body" >"$WORKTREE/src/l1-gate-probe.ts"
	WT git add src/l1-gate-probe.ts
}

patch_vitest_thresholds() {
	local branches="${1:-95}"
	local statements="${2:-95}"
	local functions="${3:-95}"
	local lines="${4:-95}"
	python3 - "$WORKTREE/vitest.config.ts" "$branches" "$statements" "$functions" "$lines" <<'PY'
from pathlib import Path
import re
import sys

path = Path(sys.argv[1])
branches, statements, functions, lines = sys.argv[2:6]
text = path.read_text()
text = re.sub(r"branches: \d+", f"branches: {branches}", text)
text = re.sub(r"statements: \d+", f"statements: {statements}", text)
text = re.sub(r"functions: \d+", f"functions: {functions}", text)
text = re.sub(r"lines: \d+", f"lines: {lines}", text)
path.write_text(text)
PY
	WT git add vitest.config.ts
}

strip_coverage_from_test_script() {
	python3 - "$WORKTREE/package.json" <<'PY'
from pathlib import Path
import json
import sys

path = Path(sys.argv[1])
payload = json.loads(path.read_text())
scripts = payload.get("scripts", {})
command = scripts.get("test:coverage", "")
if command == "vitest run --coverage":
    scripts["test:coverage"] = "vitest run"
    payload["scripts"] = scripts
    path.write_text(json.dumps(payload, indent=2) + "\n")
else:
    raise SystemExit("unexpected test:coverage command")
PY
	WT git add package.json
}

install_biome_warning_fixture() {
	WT mkdir -p tests/l1-gate
	cat >"$WORKTREE/tests/l1-gate/warning-probe.ts" <<'EOF'
export function l1BiomeWarningProbe(): void {
  if (true) console.log("l1 gate biome warning probe");
}
EOF
	python3 - "$WORKTREE/biome.jsonc" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text()
needle = "  ]\n}"
if needle not in text:
    raise SystemExit("biome.jsonc layout changed")
insert = """    ,
    {
      "includes": ["tests/l1-gate/warning-probe.ts"],
      "linter": {
        "rules": {
          "style": {
            "useBlockStatements": "warn"
          }
        }
      }
    }
  ]
}"""
path.write_text(text.replace(needle, insert))
PY
	WT git add biome.jsonc tests/l1-gate/warning-probe.ts
}

# --- scenarios ---
reset_fixture
START_MS="$(date +%s%3N)"
expect_accept healthy run_hook
END_MS="$(date +%s%3N)"
HEALTHY_MS="$((END_MS - START_MS))"
COVERAGE_LINE="$(WT bun run test:coverage 2>&1 | awk '/Statements|Branches|Functions|Lines/ {print}' | head -4 | paste -sd' ' -)"

reset_fixture
write_probe_test 'import { describe, expect, it } from "vitest";

describe("l1 gate ut probe", () => {
  it("fails", () => {
    expect(1).toBe(2);
  });
});'
expect_reject ut-failure run_hook

reset_fixture
patch_vitest_thresholds 100 100 100 100
expect_reject coverage-all-metrics run_hook

reset_fixture
patch_vitest_thresholds 100 95 95 95
expect_reject coverage-branches-only run_hook

reset_fixture
write_probe_source 'const value: number = "not-a-number";'
expect_reject type-error run_hook

reset_fixture
write_probe_source 'const leaky: any = 1; void leaky;'
expect_reject lint-error run_hook

reset_fixture
install_biome_warning_fixture
expect_reject biome-warning-only run_hook

reset_fixture
write_probe_test 'import { describe, it } from "vitest";

describe("l1 gate only probe", () => {
  it.only("focused", () => {});
});'
expect_reject vitest-only run_hook

reset_fixture
write_probe_test 'import { describe, it } from "vitest";

describe("l1 gate skip probe", () => {
  it.skip("skipped", () => {});
});'
expect_reject vitest-skip run_hook

reset_fixture
printf '%s\n' 'const broken: number = "bad";' >"$WORKTREE/src/l1-gate-probe.ts"
WT git add src/l1-gate-probe.ts
printf '%s\n' 'export const fixed = 1;' >"$WORKTREE/src/l1-gate-probe.ts"
expect_reject staged-bad-worktree-good run_hook

reset_fixture
write_probe_test 'import { describe, it } from "vitest";

describe("l1 gate slow probe", () => {
  it("sleeps", async () => {
    await new Promise((resolve) => setTimeout(resolve, 120_000));
  });
});'
expect_reject timeout-interrupt WT bash -lc "cd '$WORKTREE' && timeout --signal=INT 12s bash '$HOOK'"

reset_fixture
expect_reject missing-bun run_hook_without_bun

reset_fixture
expect_reject missing-gitleaks run_hook_without_gitleaks

reset_fixture
strip_coverage_from_test_script
expect_reject missing-coverage-report run_hook

echo ""
echo "l1-gate-selftest summary: $PASSED passed, $FAILURES failed"
echo "healthy pre-commit wall time: ${HEALTHY_MS}ms"
echo "latest coverage: $COVERAGE_LINE"

if [ "$FAILURES" -ne 0 ]; then
	exit 1
fi

if [ "$HEALTHY_MS" -ge 30000 ]; then
	echo "l1-gate-selftest: healthy path exceeded 30s (${HEALTHY_MS}ms)" >&2
	exit 1
fi
