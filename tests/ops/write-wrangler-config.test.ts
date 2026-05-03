// @vitest-environment node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const scriptPath = path.resolve(process.cwd(), "scripts/write-wrangler-config.mjs");
type EnvOverrides = Record<string, string | undefined>;

const validWranglerJsonc = `{
  // Private deployment config supplied by the operator.
  "main": ".open-next/worker.js",
  "name": "private-worker-name",
  "compatibility_date": "2026-03-29",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS",
  },
  "keep_vars": true,
}`;

function cleanEnv(overrides: EnvOverrides = {}) {
  const baseEnv = { ...process.env };
  delete baseEnv.OPEN_MODEL_LAB_WRANGLER_JSONC_CONTENT;
  delete baseEnv.OPEN_MODEL_LAB_WRANGLER_JSONC_SOURCE;
  delete baseEnv.OPEN_MODEL_LAB_WRANGLER_JSONC_OUTPUT;

  return {
    ...baseEnv,
    ...overrides,
  };
}

function runScript(args: string[], env: EnvOverrides = {}) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: cleanEnv(env),
    windowsHide: true,
  });
}

describe("write-wrangler-config", () => {
  it("writes private Wrangler config from env content without printing the content", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "oml-wrangler-write-"));
    const outputPath = path.join(tempRoot, "wrangler.jsonc");

    const result = runScript(["--output", outputPath], {
      OPEN_MODEL_LAB_WRANGLER_JSONC_CONTENT: validWranglerJsonc,
    });

    expect(result.status).toBe(0);
    expect(fs.readFileSync(outputPath, "utf8")).toContain("private-worker-name");
    expect(result.stdout).toContain("Wrote private Wrangler config");
    expect(result.stdout).not.toContain("private-worker-name");
    expect(result.stdout).not.toContain(".open-next/worker.js");
  });

  it("checks private Wrangler config from a source file without writing output", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "oml-wrangler-check-"));
    const sourcePath = path.join(tempRoot, "private-wrangler.jsonc");
    const outputPath = path.join(tempRoot, "wrangler.jsonc");
    fs.writeFileSync(sourcePath, validWranglerJsonc, "utf8");

    const result = runScript(["--check", "--output", outputPath], {
      OPEN_MODEL_LAB_WRANGLER_JSONC_SOURCE: sourcePath,
    });

    expect(result.status).toBe(0);
    expect(fs.existsSync(outputPath)).toBe(false);
    expect(result.stdout).toContain("passed validation");
    expect(result.stdout).not.toContain("private-worker-name");
  });

  it("rejects ambiguous content and source inputs", () => {
    const result = runScript(["--check"], {
      OPEN_MODEL_LAB_WRANGLER_JSONC_CONTENT: validWranglerJsonc,
      OPEN_MODEL_LAB_WRANGLER_JSONC_SOURCE: "private-wrangler.jsonc",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Set only one of OPEN_MODEL_LAB_WRANGLER_JSONC_CONTENT or OPEN_MODEL_LAB_WRANGLER_JSONC_SOURCE");
  });

  it("can intentionally skip missing config in allow-missing mode", () => {
    const result = runScript(["--allow-missing"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("skipping because --allow-missing is set");
  }, 15_000);
});
