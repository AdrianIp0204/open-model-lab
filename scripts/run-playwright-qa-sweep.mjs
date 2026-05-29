import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const defaultSpecs = [
  "tests/e2e/chemistry-reaction-mind-map.spec.ts",
  "tests/e2e/circuit-builder.spec.ts",
  "tests/e2e/header-footer-shell.spec.ts",
  "tests/e2e/locale-routing.spec.ts",
  "tests/e2e/mobile-cta-contrast.spec.ts",
  "tests/e2e/public-discovery-layout.spec.ts",
  "tests/e2e/site-smoke.spec.ts",
];
const instabilityPatterns = [
  /Server is approaching the used memory threshold, restarting/i,
  /ERR_EMPTY_RESPONSE/i,
  /ERR_INCOMPLETE_CHUNKED_ENCODING/i,
  /ERR_CONNECTION_REFUSED/i,
];

function parsePositiveInteger(value, fallback, label) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive integer; received ${value}.`);
  }

  return parsed || fallback;
}

function sanitizeLabel(value) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 80);
}

function parseArgs(argv) {
  const specs = [];
  const playwrightArgs = [];
  let chunkSize = 1;
  let basePort = 3100;
  let allowTestFailures = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--") {
      continue;
    }

    if (arg === "--allow-test-failures") {
      allowTestFailures = true;
      continue;
    }

    if (arg === "--chunk-size") {
      chunkSize = parsePositiveInteger(argv[index + 1], chunkSize, "--chunk-size");
      index += 1;
      continue;
    }

    if (arg.startsWith("--chunk-size=")) {
      chunkSize = parsePositiveInteger(arg.slice("--chunk-size=".length), chunkSize, "--chunk-size");
      continue;
    }

    if (arg === "--port") {
      basePort = parsePositiveInteger(argv[index + 1], basePort, "--port");
      index += 1;
      continue;
    }

    if (arg.startsWith("--port=")) {
      basePort = parsePositiveInteger(arg.slice("--port=".length), basePort, "--port");
      continue;
    }

    if (arg.startsWith("-")) {
      playwrightArgs.push(arg);
      continue;
    }

    specs.push(arg);
  }

  return {
    allowTestFailures,
    basePort,
    chunkSize,
    playwrightArgs,
    specs: specs.length > 0 ? specs : defaultSpecs,
  };
}

function chunkSpecs(specs, chunkSize) {
  const chunks = [];

  for (let index = 0; index < specs.length; index += chunkSize) {
    chunks.push(specs.slice(index, index + chunkSize));
  }

  return chunks;
}

function runCommand(command, args, options) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: root,
      env: options.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
    });
    child.on("close", (code, signal) => {
      resolve({ code: code ?? 1, signal, output });
    });
  });
}

const options = parseArgs(process.argv.slice(2));
const chunks = chunkSpecs(options.specs, options.chunkSize);
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = path.join(root, "output", "playwright", "qa-sweep", runId);
fs.mkdirSync(runDir, { recursive: true });

const results = [];
let hasInstability = false;
let hasTestFailures = false;

for (const [index, specs] of chunks.entries()) {
  const shardNumber = index + 1;
  const port = options.basePort + index;
  const shardLabel = sanitizeLabel(`qa-sweep-${shardNumber}-${specs.map((spec) => path.basename(spec, ".ts")).join("-")}`);
  const args = [
    "exec",
    "playwright",
    "test",
    "--config=playwright.config.ts",
    ...options.playwrightArgs,
    ...specs,
  ];

  console.log(`\n[qa-sweep] shard ${shardNumber}/${chunks.length} on port ${port}: ${specs.join(" ")}`);
  const result = await runCommand("pnpm", args, {
    env: {
      ...process.env,
      OPEN_MODEL_LAB_PLAYWRIGHT_ARTIFACT_SUFFIX: `-${shardLabel}`,
      PLAYWRIGHT_PORT: `${port}`,
    },
  });
  const instabilityMatches = instabilityPatterns
    .filter((pattern) => pattern.test(result.output))
    .map((pattern) => pattern.source);
  const logPath = path.join(runDir, `shard-${String(shardNumber).padStart(2, "0")}.log`);

  fs.writeFileSync(logPath, result.output, "utf8");
  results.push({
    shard: shardNumber,
    specs,
    port,
    exitCode: result.code,
    signal: result.signal,
    logPath: path.relative(root, logPath),
    instabilityMatches,
  });

  if (instabilityMatches.length > 0) {
    hasInstability = true;
  }

  if (result.code !== 0) {
    hasTestFailures = true;
  }
}

const summary = {
  ok: !hasInstability && (!hasTestFailures || options.allowTestFailures),
  allowTestFailures: options.allowTestFailures,
  chunkSize: options.chunkSize,
  hasInstability,
  hasTestFailures,
  results,
};
const summaryPath = path.join(runDir, "summary.json");
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf8");

console.log(`\n[qa-sweep] summary: ${path.relative(root, summaryPath)}`);
console.log(JSON.stringify(summary, null, 2));

if (hasInstability || (hasTestFailures && !options.allowTestFailures)) {
  process.exitCode = 1;
}
