#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  assertConceptQualityGate,
  assertRepresentativeInteractionCoverage,
  buildConceptQualityReport,
  renderConceptQualityMatrixMarkdown,
} from "./concept-quality-matrix-core.mjs";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: options.env ?? process.env,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  return result.status ?? 1;
}

function parseArgs(argv) {
  const playwrightArgs = [];
  const env = { ...process.env };
  let selfTest = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--self-test") {
      selfTest = true;
      continue;
    }

    if (arg === "--fail-on-unpassed") {
      env.OML_QA_046_FAIL_ON_UNPASSED = "1";
      continue;
    }

    if (arg === "--slug") {
      env.OML_QA_046_SLUGS = argv[index + 1] ?? "";
      index += 1;
      continue;
    }

    if (arg.startsWith("--slug=")) {
      env.OML_QA_046_SLUGS = arg.slice("--slug=".length);
      continue;
    }

    if (arg === "--max-slugs") {
      env.OML_QA_046_MAX_SLUGS = argv[index + 1] ?? "";
      index += 1;
      continue;
    }

    if (arg.startsWith("--max-slugs=")) {
      env.OML_QA_046_MAX_SLUGS = arg.slice("--max-slugs=".length);
      continue;
    }

    if (arg === "--") {
      playwrightArgs.push(...argv.slice(index + 1));
      break;
    }

    playwrightArgs.push(arg);
  }

  return {
    env,
    playwrightArgs,
    selfTest,
  };
}

function runSelfTest() {
  const report = buildConceptQualityReport({
    generatedAt: "fixture",
    command: "concepts:qa-matrix --self-test",
    catalogCount: 1,
    viewports: [{ name: "phone-390x844", width: 390, height: 844 }],
    rows: [
      {
        slug: "seeded-regression",
        title: "Seeded Regression",
        viewportAudits: [
          {
            viewport: { name: "phone-390x844", width: 390, height: 844 },
            route: { attempted: true, ok: true, status: 200 },
            h1: { visible: true, text: "Seeded Regression" },
            positions: {
              scene: { visible: false },
              cue: { visible: true },
              controls: { visible: true },
              graphs: { visible: true },
              lessonRail: { visible: true },
            },
            metrics: {
              horizontalOverflowPx: 64,
              visibleClippingCount: 1,
              tinyTouchTargetCount: 1,
              localizedLeakCount: 0,
            },
            interaction: { status: "failed" },
            issues: [
              { code: "missing_scene", severity: "error", detail: "Seeded visual regression." },
              { code: "page_horizontal_overflow", severity: "error", detail: "Seeded overflow." },
            ],
          },
        ],
      },
    ],
  });

  let failedAsExpected = false;

  try {
    assertConceptQualityGate(report);
  } catch {
    failedAsExpected = true;
  }

  assertRepresentativeInteractionCoverage(report);

  if (!failedAsExpected) {
    console.error("Seeded concept quality regression unexpectedly passed.");
    return 1;
  }

  console.log(renderConceptQualityMatrixMarkdown(report));
  console.log("Seeded concept quality regression failed as expected.");
  return 0;
}

const options = parseArgs(process.argv.slice(2));

if (options.selfTest) {
  process.exitCode = runSelfTest();
} else {
  const registryStatus = run("node", ["scripts/generate-content-registry.mjs"], {
    env: options.env,
  });

  if (registryStatus !== 0) {
    process.exitCode = registryStatus;
  } else {
    process.exitCode = run(
      "pnpm",
      [
        "exec",
        "playwright",
        "test",
        "tests/e2e/concept-quality-matrix.spec.ts",
        ...options.playwrightArgs,
      ],
      { env: options.env },
    );
  }
}
