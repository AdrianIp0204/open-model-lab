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

const validAiVars = `{
  "AI_FEATURES_ENABLED": "true",
  "AI_LOGGING_ENABLED": "true",
  "GEMINI_MODEL": "gemini-2.5-flash-lite",
  "AI_RATE_LIMIT_MAX_REQUESTS": "20",
  "AI_RATE_LIMIT_WINDOW_SECONDS": "600",
  "AI_RATE_LIMIT_MAX_BUCKETS": "5000",
  "AI_MONTHLY_TOKEN_LIMIT": "10000000",
  "AI_TRUST_CLOUDFLARE_CONNECTING_IP": "true"
}`;

function cleanEnv(overrides: EnvOverrides = {}) {
  const baseEnv = { ...process.env };
  delete baseEnv.OPEN_MODEL_LAB_WRANGLER_JSONC_CONTENT;
  delete baseEnv.OPEN_MODEL_LAB_WRANGLER_JSONC_SOURCE;
  delete baseEnv.OPEN_MODEL_LAB_WRANGLER_JSONC_OUTPUT;
  delete baseEnv.NEXT_PUBLIC_OPEN_MODEL_LAB_COMMIT_SHA;
  delete baseEnv.OPEN_MODEL_LAB_COMMIT_SHA;
  delete baseEnv.NEXT_PUBLIC_OPEN_MODEL_LAB_BUILT_AT;
  delete baseEnv.OPEN_MODEL_LAB_BUILT_AT;

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

function runCheckWithContent(content: string) {
  return runScript(["--check"], {
    OPEN_MODEL_LAB_WRANGLER_JSONC_CONTENT: content,
  });
}

function buildWranglerJsoncWith({
  compatibilityFlags = `"nodejs_compat"`,
  includeKeepVars = true,
  keepVars = "true",
  vars = null,
}: {
  compatibilityFlags?: string;
  includeKeepVars?: boolean;
  keepVars?: string;
  vars?: string | null;
} = {}) {
  return `{
  "main": ".open-next/worker.js",
  "name": "private-worker-name",
  "compatibility_date": "2026-03-29",
  "compatibility_flags": [${compatibilityFlags}],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  }${includeKeepVars ? `,\n  "keep_vars": ${keepVars}` : ""}${vars ? `,\n  "vars": ${vars}` : ""}
}`;
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

  it("injects non-secret deployment markers into Wrangler runtime vars", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "oml-wrangler-marker-"));
    const outputPath = path.join(tempRoot, "wrangler.jsonc");

    const result = runScript(["--output", outputPath], {
      OPEN_MODEL_LAB_WRANGLER_JSONC_CONTENT: validWranglerJsonc,
      NEXT_PUBLIC_OPEN_MODEL_LAB_COMMIT_SHA: "ABCDEF1234567",
      NEXT_PUBLIC_OPEN_MODEL_LAB_BUILT_AT: "2026-05-30T12:22:59Z",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain("abcdef1234567");
    const written = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    expect(written.vars.NEXT_PUBLIC_OPEN_MODEL_LAB_COMMIT_SHA).toBe("abcdef1234567");
    expect(written.vars.NEXT_PUBLIC_OPEN_MODEL_LAB_BUILT_AT).toBe("2026-05-30T12:22:59.000Z");
  });

  it("derives deployment markers from git when marker env vars are absent", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "oml-wrangler-marker-git-"));
    const outputPath = path.join(tempRoot, "wrangler.jsonc");
    const currentCommit = spawnSync("git", ["rev-parse", "HEAD"], {
      cwd: process.cwd(),
      encoding: "utf8",
    }).stdout.trim();

    const result = runScript(["--output", outputPath], {
      OPEN_MODEL_LAB_WRANGLER_JSONC_CONTENT: validWranglerJsonc,
    });

    expect(result.status).toBe(0);
    const written = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    expect(written.vars.NEXT_PUBLIC_OPEN_MODEL_LAB_COMMIT_SHA).toBe(currentCommit);
    expect(Date.parse(written.vars.NEXT_PUBLIC_OPEN_MODEL_LAB_BUILT_AT)).not.toBeNaN();
  });

  it("rejects malformed deployment marker commit values", () => {
    const result = runScript(["--check"], {
      OPEN_MODEL_LAB_WRANGLER_JSONC_CONTENT: validWranglerJsonc,
      NEXT_PUBLIC_OPEN_MODEL_LAB_COMMIT_SHA: "not-a-sha",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Deployment marker commit must be");
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
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "oml-wrangler-missing-"));
    const missingOutputPath = path.join(tempRoot, "wrangler.jsonc");

    const result = runScript(["--allow-missing", "--output", missingOutputPath]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("skipping because --allow-missing is set");
  }, 15_000);

  it("accepts the committed Wrangler example config", () => {
    const result = runScript(["--check"], {
      OPEN_MODEL_LAB_WRANGLER_JSONC_SOURCE: path.resolve(process.cwd(), "wrangler.example.jsonc"),
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("passed validation");
  });

  it("rejects Wrangler config when keep_vars is missing or false", () => {
    const missingResult = runCheckWithContent(buildWranglerJsoncWith({ includeKeepVars: false }));
    const falseResult = runCheckWithContent(buildWranglerJsoncWith({ keepVars: "false" }));

    expect(missingResult.status).toBe(1);
    expect(missingResult.stderr).toContain("must set keep_vars to true");
    expect(falseResult.status).toBe(1);
    expect(falseResult.stderr).toContain("must set keep_vars to true");
  });

  it("rejects Wrangler config without nodejs_compat", () => {
    const result = runCheckWithContent(buildWranglerJsoncWith({
      compatibilityFlags: `"streams_enable_constructors"`,
    }));

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("must include the nodejs_compat compatibility flag");
  });

  it("rejects Gemini secrets in Wrangler vars", () => {
    const result = runCheckWithContent(buildWranglerJsoncWith({
      vars: `{
    "GEMINI_API_KEY": "do-not-commit"
  }`,
    }));

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("vars.GEMINI_API_KEY is not allowed");
  });

  it("rejects public Gemini vars in Wrangler vars", () => {
    const result = runCheckWithContent(buildWranglerJsoncWith({
      vars: `{
    "NEXT_PUBLIC_GEMINI_API_KEY": "do-not-ship"
  }`,
    }));

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("vars.NEXT_PUBLIC_GEMINI_API_KEY is not allowed");
  });

  it("rejects malformed AI boolean vars", () => {
    const result = runCheckWithContent(buildWranglerJsoncWith({
      vars: `{
    "AI_FEATURES_ENABLED": "yes"
  }`,
    }));

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('vars.AI_FEATURES_ENABLED must be "true" or "false"');
  });

  it("rejects malformed AI rate-limit vars", () => {
    const result = runCheckWithContent(buildWranglerJsoncWith({
      vars: `{
    "AI_RATE_LIMIT_MAX_REQUESTS": "0"
  }`,
    }));

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("vars.AI_RATE_LIMIT_MAX_REQUESTS must be a positive integer");
  });

  it("rejects malformed AI monthly quota vars", () => {
    const result = runCheckWithContent(buildWranglerJsoncWith({
      vars: `{
    "AI_MONTHLY_TOKEN_LIMIT": "0"
  }`,
    }));

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("vars.AI_MONTHLY_TOKEN_LIMIT must be a positive integer");
  });

  it("rejects malformed AI Cloudflare IP trust vars", () => {
    const result = runCheckWithContent(buildWranglerJsoncWith({
      vars: `{
    "AI_TRUST_CLOUDFLARE_CONNECTING_IP": "yes"
  }`,
    }));

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('vars.AI_TRUST_CLOUDFLARE_CONNECTING_IP must be "true" or "false"');
  });

  it("accepts valid non-secret AI vars", () => {
    const result = runCheckWithContent(buildWranglerJsoncWith({ vars: validAiVars }));

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("passed validation");
  });
});
