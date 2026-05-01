import { spawnSync } from "node:child_process";

const artifactPathPattern =
  /(^|\/)(output|\.playwright-cli|test-results|playwright-report|coverage|tmp|\.codex-tmp|review-artifacts|tmp-chrome-profile)(\/|$)|screenshot|trace|profile|crash|\.log$|\.err\.log$|\.har$|\.webm$|\.zip$|\.dmp$/iu;
const configPathPattern =
  /(^|\/)(\.env($|[./-])|\.dev\.vars($|[./-])|wrangler\.jsonc$|public\/ads\.txt$|\.data\/)|^supabase\//iu;
const controlPlanePattern = /(^|\/)(automation\/|\.codex)/iu;
const publicAgentGuidePattern = /(^|\/)AGENTS\.md$/iu;
const binaryReviewPattern = /\.pdf$|screenshot/iu;
const lowQualityCommitPattern =
  /^(v\d+\.\d+(\.\d+)?($|\s))|codex|agent|automation|untracked files|index on|audit pdf|\.pdf|output|playwright|screenshot|\.log|wrangler|ads\.txt/iu;

function runGit(args) {
  const result = spawnSync("git", args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  });

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${args.join(" ")} failed`);
  }

  return result.stdout.split(/\r?\n/u).filter(Boolean);
}

function first(items, limit = 20) {
  return items.slice(0, limit);
}

function unique(items) {
  return [...new Set(items)].sort((a, b) => a.localeCompare(b));
}

function countByPrefix(paths) {
  const counts = new Map();
  for (const filePath of paths) {
    const prefix = filePath.includes("/") ? filePath.split("/", 1)[0] : filePath;
    counts.set(prefix, (counts.get(prefix) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([prefix, count]) => `${prefix}: ${count}`);
}

function getTrackedFiles() {
  return runGit(["ls-files"]);
}

function getHistoryPaths() {
  return unique(
    runGit(["rev-list", "--objects", "--all"])
      .map((line) => line.split(" ").slice(1).join(" ").trim())
      .filter(Boolean),
  );
}

function getCommitSubjects() {
  return runGit(["log", "--all", "--pretty=format:%h %s"]);
}

function getLargestObjects(limit = 20) {
  const revList = spawnSync("git", ["rev-list", "--objects", "--all"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  });

  if (revList.status !== 0) {
    throw new Error(revList.stderr.trim() || "git rev-list --objects --all failed");
  }

  const catFile = spawnSync(
    "git",
    ["cat-file", "--batch-check=%(objecttype) %(objectname) %(objectsize) %(rest)"],
    {
      input: revList.stdout,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      windowsHide: true,
    },
  );

  if (catFile.status !== 0) {
    throw new Error(catFile.stderr.trim() || "git cat-file --batch-check failed");
  }

  return catFile.stdout
    .split(/\r?\n/u)
    .filter((line) => line.startsWith("blob "))
    .map((line) => {
      const parts = line.split(" ");
      return {
        size: Number.parseInt(parts[2] ?? "0", 10),
        path: parts.slice(3).join(" "),
      };
    })
    .filter((entry) => entry.path)
    .sort((a, b) => b.size - a.size)
    .slice(0, limit)
    .map((entry) => `${entry.size} bytes ${entry.path}`);
}

function printSection(title, items, limit = 20) {
  console.log(`\n${title}`);
  if (items.length === 0) {
    console.log("- none");
    return;
  }

  for (const item of first(items, limit)) {
    console.log(`- ${item}`);
  }

  if (items.length > limit) {
    console.log(`- ... ${items.length - limit} more`);
  }
}

const trackedFiles = getTrackedFiles();
const historyPaths = getHistoryPaths();
const commitSubjects = getCommitSubjects();
const refs = runGit(["for-each-ref", "--format=%(refname:short)", "refs/heads", "refs/remotes"]);

console.log("Public release history audit summary");
console.log(`Tracked files: ${trackedFiles.length}`);
console.log(`Unique historical paths: ${historyPaths.length}`);
console.log(`Commits across all refs: ${runGit(["rev-list", "--count", "--all"])[0]}`);

printSection("Refs included in --all history scan", refs, 30);
printSection(
  "Tracked artifact-like paths",
  trackedFiles.filter((filePath) => artifactPathPattern.test(filePath)),
);
printSection(
  "Tracked private/config-like paths",
  trackedFiles.filter((filePath) => configPathPattern.test(filePath)),
);
printSection(
  "Tracked control-plane or agent paths",
  trackedFiles.filter((filePath) => controlPlanePattern.test(filePath)),
);
printSection(
  "Tracked public agent guidance",
  trackedFiles.filter((filePath) => publicAgentGuidePattern.test(filePath)),
);
printSection(
  "Tracked review artifact paths",
  trackedFiles.filter((filePath) => binaryReviewPattern.test(filePath)),
);
printSection(
  "Historical artifact-like paths by top-level prefix",
  countByPrefix(historyPaths.filter((filePath) => artifactPathPattern.test(filePath))),
  30,
);
printSection(
  "Historical private/config-like paths",
  historyPaths.filter((filePath) => configPathPattern.test(filePath)),
  30,
);
printSection(
  "Historical large objects",
  getLargestObjects(20),
  20,
);
printSection(
  "Suspicious or low-signal commit subjects",
  commitSubjects.filter((subject) => lowQualityCommitPattern.test(subject)),
  40,
);
