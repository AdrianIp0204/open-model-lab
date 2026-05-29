import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const baselinePath = path.join(root, "scripts", "hardcoded-i18n-copy-baseline.json");
const outputPath = path.join(root, "output", "hardcoded-i18n-copy-audit.json");
const shouldWriteBaseline = process.argv.includes("--write-baseline");
const shouldRunSelfTest = process.argv.includes("--self-test");
const sourceRoots = ["app", "components", "lib"];
const sourceExtensions = new Set([".ts", ".tsx"]);
const ignoredPathSegments = new Set([
  ".next",
  "node_modules",
  "generated",
  "__snapshots__",
]);

const detectorPatterns = [
  {
    kind: "COPY_TEXT_HELPER",
    pattern: /\bcopyText\s*\(/gu,
    message:
      "Use a message namespace, content overlay, or reviewed shared localization helper instead of ad hoc copyText calls.",
  },
  {
    kind: "ZH_HK_BRANCH",
    pattern: /\b(?:locale|copy\.locale|input\.locale)\s*={0,2}={1,2}\s*["']zh-HK["']/gu,
    message:
      "Move user-facing zh-HK/English branches into messages or content overlays unless the branch is non-copy locale mechanics.",
  },
  {
    kind: "IS_ZH_HK_BRANCH",
    pattern: /\bisZhHk\b/gu,
    message:
      "Avoid local isZhHk UI copy conditionals; use a typed translator/message namespace or reviewed exception.",
  },
];

const visibleEnglishStringPattern =
  /(?<prefix>\b(?:title|description|label|aria-label|ariaLabel|placeholder|alt|summary|eyebrow|action|buttonText|emptyTitle|emptyDescription|feedbackTitle)\s*[:=]\s*)["'`](?<value>[A-Z][A-Za-z0-9][^"'`{}<>]{8,})["'`]/gu;

const codeLikePattern =
  /(?:^[./@~]?[\w-]+(?:\/[\w.-]+)+$|^[A-Z][A-Za-z0-9]*(?:\.[A-Z]?[A-Za-z0-9]+)+$|^[a-z][A-Za-z0-9]*(?:\.[a-zA-Z0-9]+)+$|^[A-Za-z_$][\w$]*\([^)]*\)$|^[.#]?[A-Za-z_$][\w$-]*$|^[A-Za-z]+(?:-[A-Za-z0-9]+)+$)/u;
const measurementPattern = /^\d+(?:\.\d+)?\s*(?:px|rem|em|ms|s|kg|g|m|cm|mm|km|Hz|kHz|MHz|GHz|MB|GB|KB|%|deg|rad|x)$/u;
const allowedProductNamePattern =
  /\b(?:Open Model Lab|Stripe|Supabase|AdSense|JSON|API|URL|CSS|HTML|JSX|TSX|React|Next\.js|KaTeX)\b/gu;
const jsxCopyParentTagsToSkip = new Set(["code", "pre", "kbd", "samp", "math", "style", "script"]);

function listSourceFiles(dirPath, collector = []) {
  if (!fs.existsSync(dirPath)) {
    return collector;
  }

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (ignoredPathSegments.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      listSourceFiles(fullPath, collector);
      continue;
    }

    if (sourceExtensions.has(path.extname(entry.name))) {
      collector.push(fullPath);
    }
  }

  return collector;
}

function lineAndColumnForIndex(source, index) {
  const before = source.slice(0, index);
  const lines = before.split("\n");

  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

function normalizeSnippet(value) {
  return value.replace(/\s+/gu, " ").trim().slice(0, 220);
}

function normalizeJsxText(value) {
  return value
    .replace(/\{\/\*[\s\S]*?\*\/\}/gu, " ")
    .replace(/&nbsp;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">")
    .replace(/&quot;/giu, '"')
    .replace(/&#39;/giu, "'");
}

function isVisibleEnglishCandidate(value) {
  const normalized = normalizeSnippet(normalizeJsxText(value));

  if (!normalized || normalized.length < 9) {
    return false;
  }

  if (measurementPattern.test(normalized) || codeLikePattern.test(normalized)) {
    return false;
  }

  const stripped = normalized
    .replace(allowedProductNamePattern, " ")
    .replace(/\b[A-Z]{2,}\b/gu, " ")
    .replace(/\b[a-z]+(?:-[a-z0-9]+)+\b/giu, " ")
    .replace(/\b\d+(?:\.\d+)?\s*(?:px|rem|em|ms|s|kg|g|m|cm|mm|km|Hz|kHz|MHz|GHz|MB|GB|KB|%|deg|rad|x)\b/gu, " ")
    .replace(/\b[A-Za-z_$][\w$]*\([^)]*\)\b/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();

  return /\b[A-Za-z][A-Za-z0-9']{2,}(?:\s+[A-Za-z][A-Za-z0-9']{1,})+\b/u.test(stripped);
}

function getJsxTagName(node) {
  if (!node || !ts.isIdentifier(node.tagName)) {
    return null;
  }

  return node.tagName.text;
}

function isInSkippedJsxCopyParent(node) {
  let current = node.parent;

  while (current) {
    if (
      ts.isJsxElement(current) &&
      jsxCopyParentTagsToSkip.has(getJsxTagName(current.openingElement))
    ) {
      return true;
    }

    current = current.parent;
  }

  return false;
}

function addVisibleEnglishJsxIssue(issues, source, relativePath, index, value, kind) {
  if (!isVisibleEnglishCandidate(value)) {
    return;
  }

  const location = lineAndColumnForIndex(source, index);

  issues.push({
    kind,
    file: relativePath,
    line: location.line,
    column: location.column,
    snippet: normalizeSnippet(normalizeJsxText(value)),
    message:
      "Visible English JSX copy in app/components/lib should come from messages, content overlays, or a reviewed exception.",
  });
}

function findVisibleEnglishJsxIssues(source, relativePath) {
  const issues = [];
  const scriptKind = path.extname(relativePath) === ".tsx" ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(
    relativePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );

  function visit(node) {
    if (!isInSkippedJsxCopyParent(node)) {
      if (ts.isJsxText(node)) {
        addVisibleEnglishJsxIssue(
          issues,
          source,
          relativePath,
          node.getStart(sourceFile),
          node.getText(sourceFile),
          "VISIBLE_ENGLISH_JSX_TEXT",
        );
      }

      if (
        ts.isJsxExpression(node) &&
        node.expression &&
        ts.isStringLiteralLike(node.expression)
      ) {
        addVisibleEnglishJsxIssue(
          issues,
          source,
          relativePath,
          node.expression.getStart(sourceFile),
          node.expression.text,
          "VISIBLE_ENGLISH_JSX_STRING_CHILD",
        );
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return issues;
}

function findIssuesInSource(source, relativePath) {
  const issues = [];

  for (const detector of detectorPatterns) {
    detector.pattern.lastIndex = 0;

    for (const match of source.matchAll(detector.pattern)) {
      const location = lineAndColumnForIndex(source, match.index ?? 0);
      const lineText = source.split("\n")[location.line - 1] ?? "";

      issues.push({
        kind: detector.kind,
        file: relativePath,
        line: location.line,
        column: location.column,
        snippet: normalizeSnippet(lineText),
        message: detector.message,
      });
    }
  }

  visibleEnglishStringPattern.lastIndex = 0;

  for (const match of source.matchAll(visibleEnglishStringPattern)) {
    const value = match.groups?.value ?? "";

    if (!isVisibleEnglishCandidate(value)) {
      continue;
    }

    const location = lineAndColumnForIndex(source, match.index ?? 0);

    issues.push({
      kind: "VISIBLE_ENGLISH_LITERAL",
      file: relativePath,
      line: location.line,
      column: location.column,
      snippet: normalizeSnippet(value),
      message:
        "Visible English copy in app/components/lib should come from messages, content overlays, or a reviewed exception.",
    });
  }

  issues.push(...findVisibleEnglishJsxIssues(source, relativePath));

  return issues;
}

function findIssues(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const relativePath = path.relative(root, filePath);

  return findIssuesInSource(source, relativePath);
}

function issueSignature(issue) {
  return `${issue.kind}\t${issue.file}\t${issue.snippet}`;
}

function runSelfTest() {
  const source = `
    import { useTranslations } from "next-intl";

    export function Fixture() {
      const t = useTranslations("Fixture");
      const translated = { label: t("actions.save") };
      const visible = { label: "New visible English copy" };

      return (
        <section>
          <p>New visible English copy that should fail the hard-coded copy audit.</p>
          <button>{t("actions.save")}</button>
        </section>
      );
    }
  `;
  const issues = findIssuesInSource(source, "components/__audit_self_test__/Fixture.tsx");
  const visibleIssues = issues.filter((issue) => issue.kind === "VISIBLE_ENGLISH_LITERAL");
  const jsxTextIssues = issues.filter((issue) => issue.kind === "VISIBLE_ENGLISH_JSX_TEXT");
  const catchesTranslatedFileLiteral = visibleIssues.some(
    (issue) => issue.snippet === "New visible English copy",
  );
  const catchesJsxText = jsxTextIssues.some((issue) =>
    issue.snippet.startsWith("New visible English copy that should fail"),
  );
  const flagsMessageKey = visibleIssues.some((issue) => issue.snippet === "actions.save");
  const flagsMessageKeyInJsx = issues.some((issue) => issue.snippet === "actions.save");

  if (!catchesTranslatedFileLiteral || !catchesJsxText || flagsMessageKey || flagsMessageKeyInJsx) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          catchesTranslatedFileLiteral,
          catchesJsxText,
          flagsMessageKey,
          flagsMessageKeyInJsx,
          issues,
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: [
          "translator-bearing files still fail on visible English literal props",
          "JSX visible English text children fail",
          "message keys such as t(\"actions.save\") are not flagged as visible English",
        ],
      },
      null,
      2,
    ),
  );
}

if (shouldRunSelfTest) {
  runSelfTest();
  process.exit();
}

const sourceFiles = sourceRoots.flatMap((sourceRoot) =>
  listSourceFiles(path.join(root, sourceRoot)),
);
const issues = sourceFiles.flatMap(findIssues);

if (shouldWriteBaseline) {
  const uniqueAllowedIssues = [
    ...new Map(
      issues.map((issue) => [
        issueSignature(issue),
        {
          kind: issue.kind,
          file: issue.file,
          snippet: issue.snippet,
          message: issue.message,
        },
      ]),
    ).values(),
  ];

  fs.writeFileSync(
    baselinePath,
    JSON.stringify(
      {
        generatedBy: "scripts/audit-hardcoded-i18n-copy.mjs --write-baseline",
        note:
          "Reviewed existing hard-coded bilingual copy debt. The audit fails on new signatures so migrated files stay clean while remaining legacy files can be chipped away safely.",
        allowedIssues: uniqueAllowedIssues,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
}

const currentSignatures = new Set(issues.map(issueSignature));
const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
const allowedSignatures = new Set(baseline.allowedIssues.map(issueSignature));
const newIssues = issues.filter((issue) => !allowedSignatures.has(issueSignature(issue)));
const staleAllowedIssues = baseline.allowedIssues.filter(
  (issue) => !currentSignatures.has(issueSignature(issue)),
);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  JSON.stringify(
    {
      checkedFileCount: sourceFiles.length,
      issueCount: issues.length,
      allowedIssueCount: issues.length - newIssues.length,
      newIssueCount: newIssues.length,
      staleAllowedIssueCount: staleAllowedIssues.length,
      newIssues,
      staleAllowedIssues,
    },
    null,
    2,
  ),
  "utf8",
);

console.log(
  JSON.stringify(
    {
      checkedFileCount: sourceFiles.length,
      issueCount: issues.length,
      allowedIssueCount: issues.length - newIssues.length,
      newIssueCount: newIssues.length,
      staleAllowedIssueCount: staleAllowedIssues.length,
      outputPath: path.relative(root, outputPath),
    },
    null,
    2,
  ),
);

if (newIssues.length > 0) {
  process.exitCode = 1;
}
