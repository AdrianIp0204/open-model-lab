import { spawnSync } from "node:child_process";

function runGitLsFiles() {
  const result = spawnSync("git", ["ls-files"], {
    encoding: "utf8",
    windowsHide: true,
  });

  if (result.status !== 0) {
    const message = result.stderr.trim() || "git ls-files failed";
    throw new Error(message);
  }

  return result.stdout
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const forbiddenTrackedArtifactRules = [
  {
    label: "local Codex runtime output",
    test: (path) => path.startsWith(".codex-tmp/") || /^\.codex.*\.(?:err|log|out)$/i.test(path),
  },
  {
    label: "Playwright CLI snapshot/log output",
    test: (path) => path.startsWith(".playwright-cli/"),
  },
  {
    label: "local output directory artifact",
    test: (path) => path.startsWith("output/"),
  },
  {
    label: "local review artifact directory",
    test: (path) => path.startsWith("review-artifacts/"),
  },
  {
    label: "temporary root directory artifact",
    test: (path) => path.startsWith("tmp/") || path.startsWith("tmp-chrome-profile/"),
  },
  {
    label: "local test report directory",
    test: (path) => path.startsWith("test-results/") || path.startsWith("playwright-report/"),
  },
  {
    label: "coverage output directory",
    test: (path) => path.startsWith("coverage/"),
  },
  {
    label: "process, bytecode, trace, dump, or media run artifact",
    test: (path) =>
      /\.(?:dmp|har|pid|pyc|trace\.zip|webm)$/i.test(path) ||
      /(^|\/)\.tmp[^/]*$/i.test(path),
  },
  {
    label: "tracked local env file",
    test: (path) =>
      (path.startsWith(".env") && path !== ".env.example") ||
      (path.startsWith(".dev.vars") && path !== ".dev.vars.example"),
  },
  {
    label: "tracked private deployment config",
    test: (path) => path === "wrangler.jsonc",
  },
  {
    label: "tracked real ads.txt seller metadata",
    test: (path) => path === "public/ads.txt",
  },
  {
    label: "tracked private automation/control-plane surface",
    test: (path) =>
      path.startsWith("automation/") ||
      [
        "docs/automation-loop.md",
        "docs/backlog-authoring-guide.md",
        "docs/backlog-truth.md",
        "docs/v1-human-followup-inventory.md",
        "docs/v1-manual-tail-runbook.md",
      ].includes(path),
  },
  {
    label: "tracked private review PDF artifact",
    test: (path) =>
      [
        "Concept Page UX Review and Recommendations.pdf",
        "UI improvement proposal.pdf",
        "UI_UX Audit for OML.pdf",
        "UI_UX audit review 2nd round.pdf",
        "UI_UX audit round 3.pdf",
      ].includes(path),
  },
  {
    label: "tracked translation memory cache",
    test: (path) => path === "content/i18n/zh-HK/.translation-memory.json",
  },
];

const ownerReviewNameRules = [
  {
    label: "secret-looking filename",
    test: (path) =>
      /(^|\/)(secret|secrets|private|credential|credentials|service-role|dashboard-export|customer|customers|users)(\.|\/|-|_)/i.test(
        path,
      ),
  },
  {
    label: "database dump-looking filename",
    test: (path) => /\.(?:dump|sql|sqlite|db)$/i.test(path) && !path.startsWith("supabase/migrations/"),
  },
];

function groupFindings(paths, rules) {
  const grouped = new Map();

  for (const path of paths) {
    for (const rule of rules) {
      if (!rule.test(path)) {
        continue;
      }

      const entries = grouped.get(rule.label) ?? [];
      entries.push(path);
      grouped.set(rule.label, entries);
    }
  }

  return grouped;
}

function printGrouped(title, grouped) {
  if (grouped.size === 0) {
    return;
  }

  console.log(title);
  for (const [label, paths] of grouped) {
    console.log(`- ${label}: ${paths.length}`);
    for (const path of paths.slice(0, 12)) {
      console.log(`  - ${path}`);
    }
    if (paths.length > 12) {
      console.log(`  - ... ${paths.length - 12} more`);
    }
  }
}

const trackedFiles = runGitLsFiles();
const forbiddenFindings = groupFindings(trackedFiles, forbiddenTrackedArtifactRules);
const ownerReviewFindings = groupFindings(trackedFiles, ownerReviewNameRules);

printGrouped("Forbidden tracked local/public-release hygiene artifacts:", forbiddenFindings);
printGrouped("Owner-review filename findings:", ownerReviewFindings);

if (forbiddenFindings.size > 0) {
  process.exitCode = 1;
} else {
  console.log("No forbidden tracked public-release hygiene artifacts found.");
}
