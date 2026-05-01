import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outputPath = path.join(root, "output", "zh-hk-locale-quality.json");

const NON_VISIBLE_KEYS = new Set([
  "id",
  "slug",
  "metric",
  "param",
  "setup",
  "presetId",
  "graphId",
  "overlayId",
  "variableId",
  "equationId",
  "correctChoiceId",
  "kind",
  "type",
  "unit",
  "valueKey",
  "displayUnit",
  "contentFile",
  "subjectId",
  "topicId",
  "href",
  "path",
  "url",
  "email",
  "phone",
  "model",
  "provider",
  "status",
  "sourceHash",
  "outputHash",
  "generatedAt",
  "updatedAt",
  "timestamp",
]);

const IGNORED_SEGMENTS = new Set([
  "relatedControls",
  "relatedGraphTabs",
  "relatedOverlays",
  "relatedEquationVariables",
  "highlightedControls",
  "highlightedGraphs",
  "highlightedOverlays",
  "highlightedControlIds",
  "highlightedGraphIds",
  "highlightedOverlayIds",
  "conditions",
  "values",
  "defaults",
  "series",
  "tags",
  "prerequisites",
  "related",
  "requirements",
  "targets",
  "equationIds",
  "graphIds",
  "overlayIds",
  "manifest",
  "translationMemory",
  "entries",
]);

const AUDITED_ENGLISH_KEYS = new Set([
  "title",
  "subtitle",
  "shortTitle",
  "summary",
  "introduction",
  "sequenceRationale",
  "educatorNote",
  "description",
  "body",
  "label",
  "intro",
  "prompt",
  "purpose",
  "text",
  "placeholder",
  "eyebrow",
  "action",
  "actionLabel",
  "primaryAction",
  "secondaryAction",
  "ariaLabel",
  "mobileLabel",
  "compactLabel",
  "name",
  "note",
  "hint",
  "successMessage",
  "reasonLabel",
  "caption",
  "message",
  "tooltip",
  "titlePrefix",
  "feedbackTitle",
  "collectionName",
  "itemsName",
]);

const DISALLOWED_PATTERNS = [
  { kind: "QUESTION_MARK_GARBAGE", pattern: /\?{2,}|ï¿½/u },
  {
    kind: "SIMPLIFIED_CHAR",
    pattern: /[为这设读图点线术层触样压观际动让页发总时数条颗级测并运应觉气温关闭]/u,
  },
  { kind: "MAINLAND_TERM", pattern: /工作台|绑定/u },
];

const INLINE_MATH_TOKEN_PATTERN =
  /\{\{[^}]+\}\}|\$[^$]+\$|\b[a-zA-Z]+(?:_[a-zA-Z0-9]+)+\b|\b[a-zA-Z]+(?:\/[a-zA-Z0-9]+)+\b/gu;
const EMAIL_PATTERN = /\b\S+@\S+\b/gu;
const URL_PATTERN = /\bhttps?:\/\/\S+\b/gu;
const ALLOWED_ENGLISH_PATTERN =
  /\b(?:Open Model Lab|OPEN MODEL LAB|Buy Me a Coffee|Google AdSense|Supabase|Stripe|Premium|English)\b/giu;
const ENGLISH_PHRASE_PATTERN = /\b[A-Za-z][A-Za-z0-9'/-]{2,}(?:\s+[A-Za-z][A-Za-z0-9'/-]{1,})+\b/u;
const ENGLISH_SINGLE_WORD_PATTERN = /^[A-Za-z][A-Za-z0-9'/-]{3,}$/u;
const ALLOWED_ENGLISH_SINGLE_WORDS = new Set(["premium", "stripe", "supabase", "english"]);

function listJsonFiles(dirPath, collector = []) {
  if (!fs.existsSync(dirPath)) {
    return collector;
  }

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      listJsonFiles(fullPath, collector);
      continue;
    }

    if (!entry.name.endsWith(".json")) {
      continue;
    }

    if (entry.name === "manifest.json" || entry.name === ".translation-memory.json") {
      continue;
    }

    collector.push(fullPath);
  }

  return collector;
}

function walkVisibleStrings(value, keyPath = [], collector = []) {
  if (typeof value === "string") {
    const lastKey = keyPath[keyPath.length - 1] ?? "";

    if (!NON_VISIBLE_KEYS.has(lastKey) && !keyPath.some((segment) => IGNORED_SEGMENTS.has(segment))) {
      collector.push({ path: keyPath.join("."), value });
    }

    return collector;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      walkVisibleStrings(item, [...keyPath, String(index)], collector);
    });
    return collector;
  }

  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      walkVisibleStrings(item, [...keyPath, key], collector);
    }
  }

  return collector;
}

function sanitizeForEnglishAudit(value) {
  return value
    .replace(INLINE_MATH_TOKEN_PATTERN, " ")
    .replace(EMAIL_PATTERN, " ")
    .replace(URL_PATTERN, " ")
    .replace(ALLOWED_ENGLISH_PATTERN, " ")
    .replace(/\\[A-Za-z]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function shouldAuditEnglishLeak(pathKey, value) {
  const segments = pathKey.split(".");
  const lastKey = segments[segments.length - 1] ?? "";

  if (!AUDITED_ENGLISH_KEYS.has(lastKey)) {
    return false;
  }

  const sanitized = sanitizeForEnglishAudit(value);

  if (!sanitized) {
    return false;
  }

  if (ENGLISH_PHRASE_PATTERN.test(sanitized)) {
    return true;
  }

  return (
    ENGLISH_SINGLE_WORD_PATTERN.test(sanitized) &&
    !ALLOWED_ENGLISH_SINGLE_WORDS.has(sanitized.toLowerCase())
  );
}

const filesToCheck = [
  path.join(root, "messages", "zh-HK.json"),
  path.join(root, "content", "i18n", "generated", "zh-HK.json"),
  ...listJsonFiles(path.join(root, "content", "i18n", "zh-HK")),
];

const issues = [];

for (const filePath of filesToCheck) {
  if (!fs.existsSync(filePath)) {
    issues.push({
      file: path.relative(root, filePath),
      kind: "MISSING_FILE",
      path: "",
      value: "",
    });
    continue;
  }

  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const visibleStrings = walkVisibleStrings(parsed);

  for (const entry of visibleStrings) {
    const disallowed = DISALLOWED_PATTERNS.find(
      ({ kind, pattern }) => kind !== "MAINLAND_TERM" && pattern.test(entry.value),
    );

    if (disallowed) {
      issues.push({
        file: path.relative(root, filePath),
        kind: disallowed.kind,
        path: entry.path,
        value: entry.value,
      });
      continue;
    }

    if (shouldAuditEnglishLeak(entry.path, entry.value)) {
      issues.push({
        file: path.relative(root, filePath),
        kind: "ENGLISH_LEAK",
        path: entry.path,
        value: entry.value,
      });
    }
  }
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  JSON.stringify(
    {
      checkedFileCount: filesToCheck.length,
      issueCount: issues.length,
      issues,
    },
    null,
    2,
  ),
  "utf8",
);

console.log(
  JSON.stringify(
    {
      checkedFileCount: filesToCheck.length,
      issueCount: issues.length,
      outputPath: path.relative(root, outputPath),
    },
    null,
    2,
  ),
);

if (issues.length > 0) {
  process.exitCode = 1;
}
