import fs from "node:fs";
import { spawnSync } from "node:child_process";

const requiredExistingPaths = [
  "LICENSE",
  "CONTENT_LICENSE.md",
  "BRAND.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "CODE_OF_CONDUCT.md",
  ".env.example",
  ".github/ISSUE_TEMPLATE/config.yml",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/labels.yml",
  "docs/github-triage.md",
  "docs/github-label-setup.md",
  "docs/public-release-final-gate.md",
  "docs/public-release-history-audit.md",
  "scripts/public-release-history-audit.mjs",
  "AGENTS.md",
  "wrangler.example.jsonc",
  "public/ads.example.txt",
];

const requiredTrackedPaths = [
  ".github/ISSUE_TEMPLATE/config.yml",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/labels.yml",
  "docs/github-triage.md",
  "docs/github-label-setup.md",
  "docs/public-release-final-gate.md",
  "docs/public-release-history-audit.md",
  "scripts/public-release-history-audit.mjs",
  "AGENTS.md",
  "wrangler.example.jsonc",
  "public/ads.example.txt",
];

const forbiddenTrackedPaths = [
  "wrangler.jsonc",
  "public/ads.txt",
  "Concept Page UX Review and Recommendations.pdf",
  "UI improvement proposal.pdf",
  "UI_UX Audit for OML.pdf",
  "UI_UX audit review 2nd round.pdf",
  "UI_UX audit round 3.pdf",
  "content/i18n/zh-HK/.translation-memory.json",
  "docs/automation-loop.md",
  "docs/backlog-authoring-guide.md",
  "docs/backlog-truth.md",
  "docs/v1-human-followup-inventory.md",
  "docs/v1-manual-tail-runbook.md",
];
const forbiddenTrackedPrefixes = ["automation/"];

function runGit(args) {
  const result = spawnSync("git", args, {
    encoding: "utf8",
    windowsHide: true,
  });

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${args.join(" ")} failed`);
  }

  return result.stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
}

function runNodeScript(scriptPath) {
  const result = spawnSync(process.execPath, [scriptPath], {
    encoding: "utf8",
    stdio: "pipe",
    windowsHide: true,
  });

  if (result.stdout.trim()) {
    console.log(result.stdout.trim());
  }

  if (result.stderr.trim()) {
    console.error(result.stderr.trim());
  }

  return result.status === 0;
}

function main() {
  const trackedFiles = new Set(runGit(["ls-files"]));
  const failures = [];

  for (const filePath of requiredExistingPaths) {
    if (!fs.existsSync(filePath)) {
      failures.push(`Missing required release-prep path: ${filePath}`);
    }
  }

  for (const filePath of requiredTrackedPaths) {
    if (!trackedFiles.has(filePath)) {
      failures.push(`Required path is not tracked: ${filePath}`);
    }
  }

  for (const filePath of forbiddenTrackedPaths) {
    if (trackedFiles.has(filePath)) {
      failures.push(`Forbidden private path is tracked: ${filePath}`);
    }
  }

  for (const filePath of trackedFiles) {
    for (const prefix of forbiddenTrackedPrefixes) {
      if (filePath.startsWith(prefix)) {
        failures.push(`Forbidden private path is tracked: ${filePath}`);
      }
    }
  }

  if (!runNodeScript("scripts/public-release-hygiene-check.mjs")) {
    failures.push("public-release hygiene check failed.");
  }

  if (failures.length > 0) {
    console.error("Final public-release readiness check failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("Final public-release readiness path checks passed.");
  console.log("Repository visibility remains a manual owner action.");
}

main();
