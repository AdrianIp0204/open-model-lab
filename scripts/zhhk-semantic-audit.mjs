const CJK_PATTERN = /[\u3400-\u9fff]/u;
const SIMPLIFIED_CHAR_PATTERN =
  /[为这设读图点线术层触样压观际动让页发总时数条颗级测并运应觉气温关闭]/u;
const MOJIBAKE_PATTERN = /(?:�|ï¿½|Ã[\u0080-\u00bf]|â[\u0080-\u00bf€]|å[\u0080-\u00bf]|ç[\u0080-\u00bf])/u;
const MESSAGE_KEY_PATTERN = /\b[A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z0-9_-]+){2,}\b/u;
const EMAIL_TOKEN_PATTERN = /[^\s<>"'()]+@[^\s<>"'()]+/gu;
const EMAIL_LIKE_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+(?:\.[A-Z0-9-]+)+/giu;
const URL_LIKE_PATTERN = /\b(?:https?:\/\/|www\.|mailto:)\S+/giu;
const DOMAIN_LIKE_PATTERN = /\b[A-Za-z](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9\u3400-\u9fff-]+)+\b/gu;
const INLINE_MATH_TOKEN_PATTERN =
  /\{\{[^}]+\}\}|\$[^$]+\$|\b[a-zA-Z]+(?:_[a-zA-Z0-9]+)+\b|\b[a-zA-Z]+(?:\/[a-zA-Z0-9]+)+\b|\\[A-Za-z]+\{[^{}]*\}|\\[A-Za-z]+/gu;
const LATEX_TEXT_BLOCK_PATTERN = /\\text\{[^{}]*\}/gu;
const LABELED_LATEX_ARIA_FRAGMENT_PATTERN = /[:：]\s*[^:：]*(?:\\[A-Za-z]+|\\\s)[^:：]*/gu;
const INLINE_FORMULA_PATTERN = /\b[A-Za-z]\s*=\s*[A-Za-z0-9+\-*/^().\s]+/gu;
const NUMBERED_UNIT_PATTERN =
  /\b\d+(?:\.\d+)?\s*(?:m\/s|m\/s\^2|kg|g|mg|s|ms|cm|mm|km|m|in|hz|khz|n|j|w|v|a|ohm|mol|l|ml|pa|kpa|deg|rad|%|°c|°f)\b/giu;
const ENGLISH_PHRASE_PATTERN = /\b[A-Za-z][A-Za-z0-9'/-]{1,}(?:\s*\/\s*|\s+)[A-Za-z][A-Za-z0-9'/-]{1,}\b/u;
const ENGLISH_TOKEN_PATTERN = /\b[A-Za-z][A-Za-z0-9'/-]*\b/gu;
const MATH_LABEL_PATTERN =
  /(?:=|\+|-|\*|\^|_|\||\\|\b(?:sub|sup|over|vec|Delta|theta|lambda|alpha|omega|quad|qquad|dfrac|frac|sqrt|sin|cos|tan|ln|log|bmatrix|langle|rangle|Rightarrow|leftarrow|cup|setminus|max|min|int|pi|divided by|to the power of|squared|approximately|circ|rad|uparrow|downarrow)\b)/iu;

const GENERIC_FILLER_TERMS = ["項目", "內容", "東西"];
const ENGLISH_FUNCTION_WORDS = new Set([
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "is",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

const ALLOWED_ENGLISH_PHRASES = [
  /\bOpen Model Lab\b/giu,
  /\bOPEN MODEL LAB\b/giu,
  /\bBuy Me a Coffee\b/giu,
  /\bGoogle AdSense\b/giu,
  /\bSupabase\b/giu,
  /\bStripe\b/giu,
  /\bPremium\b/giu,
  /\bEnglish\b/giu,
  /\bKaTeX\b/giu,
];

const ALLOWED_ENGLISH_SINGLE_WORDS = new Set([
  "adsense",
  "english",
  "katex",
  "premium",
  "stripe",
  "supabase",
]);

export const ZHHK_SEMANTIC_SOURCE_CATEGORIES = [
  "DOM fallback localizer",
  "message catalog",
  "content overlay",
  "simulation copy",
  "accessibility label",
  "protected-token corruption",
  "user fixture",
];

function capText(text, maxLength = 220) {
  const normalized = String(text).replace(/\s+/gu, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function countTerm(text, term) {
  return [...text.matchAll(new RegExp(term, "gu"))].length;
}

function stripAllowedEnglish(text) {
  return ALLOWED_ENGLISH_PHRASES.reduce((current, pattern) => current.replace(pattern, " "), text);
}

function sanitizeForEnglishFunctionWords(text) {
  return stripAllowedEnglish(text)
    .replace(EMAIL_LIKE_PATTERN, " ")
    .replace(URL_LIKE_PATTERN, " ")
    .replace(LABELED_LATEX_ARIA_FRAGMENT_PATTERN, " ")
    .replace(LATEX_TEXT_BLOCK_PATTERN, " ")
    .replace(INLINE_MATH_TOKEN_PATTERN, " ")
    .replace(INLINE_FORMULA_PATTERN, " ")
    .replace(NUMBERED_UNIT_PATTERN, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function hasProtectedTokenCorruption(text) {
  const emailTokens = [...text.matchAll(EMAIL_TOKEN_PATTERN)].map((match) => match[0]);
  const hasCorruptEmail = emailTokens.some((token) => {
    const validEmail = token.match(EMAIL_LIKE_PATTERN)?.[0] ?? "";

    if (!validEmail) {
      return CJK_PATTERN.test(token) || /@/u.test(token);
    }

    if (CJK_PATTERN.test(validEmail)) {
      return true;
    }

    const before = token.slice(0, token.indexOf(validEmail));
    const after = token.slice(token.indexOf(validEmail) + validEmail.length);
    return CJK_PATTERN.test(before) || (CJK_PATTERN.test(after) && !/^[\p{P}\p{S}]+/u.test(after));
  });

  if (hasCorruptEmail) {
    return true;
  }

  const urlMatches = [...text.matchAll(URL_LIKE_PATTERN)].map((match) => match[0]);
  if (urlMatches.some((url) => CJK_PATTERN.test(url))) {
    return true;
  }

  return [...text.matchAll(DOMAIN_LIKE_PATTERN)].some((match) => {
    const domain = match[0].replace(/[),.;:]+$/u, "");
    return CJK_PATTERN.test(domain) || /@|mailto:/iu.test(domain);
  });
}

function hasRepeatedGenericFiller(text) {
  return GENERIC_FILLER_TERMS.some((term) => {
    const adjacentPattern = new RegExp(`${term}(?:\\s*${term}){2,}`, "u");
    return adjacentPattern.test(text) || countTerm(text, term) >= 3;
  });
}

function hasMixedEnglishFunctionWord(text) {
  if (!CJK_PATTERN.test(text)) {
    return false;
  }

  const sanitized = sanitizeForEnglishFunctionWords(text);

  if (!sanitized) {
    return false;
  }

  return [...sanitized.matchAll(ENGLISH_TOKEN_PATTERN)].some((match) =>
    ENGLISH_FUNCTION_WORDS.has(match[0].toLowerCase()),
  );
}

function isMathAccessibilityEntry(entry) {
  return entry?.isAccessibilityLabel && String(entry?.elementRole ?? "").toLowerCase() === "math";
}

function hasUntranslatedEnglishLabel(text, entry) {
  if (!entry?.isAccessibilityLabel && !entry?.isControlLabel) {
    return false;
  }

  if (isMathAccessibilityEntry(entry)) {
    return false;
  }

  const sanitized = sanitizeForEnglishFunctionWords(text);

  if (!sanitized || CJK_PATTERN.test(sanitized)) {
    return false;
  }

  if (MATH_LABEL_PATTERN.test(sanitized)) {
    return false;
  }

  if (ALLOWED_ENGLISH_SINGLE_WORDS.has(sanitized.toLowerCase())) {
    return false;
  }

  return ENGLISH_PHRASE_PATTERN.test(sanitized);
}

function inferSemanticSourceCategory(routePath, entry, kind) {
  if (kind === "PROTECTED_TOKEN_CORRUPTION") {
    return "protected-token corruption";
  }

  if (entry?.isUserFixture) {
    return "user fixture";
  }

  if (entry?.isAccessibilityLabel || kind === "UNTRANSLATED_ACCESSIBILITY_LABEL") {
    return "accessibility label";
  }

  if (kind === "MESSAGE_KEY_LEAK") {
    return "message catalog";
  }

  if (
    /(?:simulation|sim|canvas|plot|graph|slider|voltage|velocity|amplitude|frequency|force|energy|charge|circuit|reaction|node|edge)/iu.test(
      `${entry?.text ?? ""} ${entry?.nearestHeading ?? ""} ${entry?.landmark ?? ""}`,
    )
  ) {
    return "simulation copy";
  }

  if (
    /\/(?:concepts|guided|tracks|challenges|tests)(?:\/|$)/u.test(routePath) &&
    !/(button|link|navigation|banner|contentinfo)/iu.test(
      `${entry?.elementRole ?? ""} ${entry?.landmark ?? ""}`,
    )
  ) {
    return "content overlay";
  }

  return "DOM fallback localizer";
}

function makeFinding({ routePath, category, kind, sample, entry, detail }) {
  const sourceCategory = inferSemanticSourceCategory(routePath, entry, kind);

  return {
    route: routePath,
    category,
    kind,
    sourceCategory,
    sample: capText(sample),
    detail: detail ? capText(detail) : null,
    nearestHeading: entry?.nearestHeading ? capText(entry.nearestHeading) : null,
    landmark: entry?.landmark ? capText(entry.landmark) : null,
    elementTag: entry?.elementTag ?? null,
    elementRole: entry?.elementRole ?? null,
    sourceType: entry?.sourceType ?? "visible text",
    snippets: Array.isArray(entry?.snippets) ? entry.snippets.map((snippet) => capText(snippet)) : [],
  };
}

function analyzeEntry(entry, routePath, category) {
  const text = String(entry?.text ?? "").replace(/\s+/gu, " ").trim();
  const findings = [];

  if (!text) {
    return findings;
  }

  if (hasProtectedTokenCorruption(text)) {
    findings.push(
      makeFinding({
        routePath,
        category,
        kind: "PROTECTED_TOKEN_CORRUPTION",
        sample: text,
        entry,
      }),
    );
  }

  if (hasRepeatedGenericFiller(text)) {
    findings.push(
      makeFinding({
        routePath,
        category,
        kind: "GENERIC_FILLER_REPEAT",
        sample: text,
        entry,
      }),
    );
  }

  if (hasMixedEnglishFunctionWord(text)) {
    findings.push(
      makeFinding({
        routePath,
        category,
        kind: "MIXED_ENGLISH_FUNCTION_WORD",
        sample: text,
        entry,
      }),
    );
  }

  if (SIMPLIFIED_CHAR_PATTERN.test(text)) {
    findings.push(
      makeFinding({
        routePath,
        category,
        kind: "SIMPLIFIED_CHAR",
        sample: text,
        entry,
      }),
    );
  }

  if (MOJIBAKE_PATTERN.test(text)) {
    findings.push(
      makeFinding({
        routePath,
        category,
        kind: "MOJIBAKE",
        sample: text,
        entry,
      }),
    );
  }

  if (
    !MATH_LABEL_PATTERN.test(text) &&
    MESSAGE_KEY_PATTERN.test(text.replace(EMAIL_LIKE_PATTERN, " ").replace(URL_LIKE_PATTERN, " "))
  ) {
    findings.push(
      makeFinding({
        routePath,
        category,
        kind: "MESSAGE_KEY_LEAK",
        sample: text,
        entry,
      }),
    );
  }

  if (hasUntranslatedEnglishLabel(text, entry)) {
    findings.push(
      makeFinding({
        routePath,
        category,
        kind: "UNTRANSLATED_ACCESSIBILITY_LABEL",
        sample: text,
        entry,
      }),
    );
  }

  return findings;
}

function findIdenticalLabelClusters(entries, routePath, category) {
  const clusters = new Map();

  for (const entry of entries) {
    const text = String(entry?.text ?? "").replace(/\s+/gu, " ").trim();

    if (!text) {
      continue;
    }

    const isClusterable =
      entry?.isAccessibilityLabel ||
      entry?.isControlLabel ||
      /heading/u.test(String(entry?.elementRole ?? ""));

    if (!isClusterable || !hasRepeatedGenericFiller(`${text} ${text} ${text}`)) {
      continue;
    }

    if (!clusters.has(text)) {
      clusters.set(text, new Map());
    }

    const uniqueLocationKey = [
      entry?.nearestHeading ?? "",
      entry?.landmark ?? "",
      entry?.elementTag ?? "",
      entry?.elementRole ?? "",
      Array.isArray(entry?.snippets) ? entry.snippets.join("\u0001") : "",
    ].join("\u0000");

    if (!clusters.get(text).has(uniqueLocationKey)) {
      clusters.get(text).set(uniqueLocationKey, entry);
    }
  }

  return [...clusters.entries()]
    .map(([text, clusteredEntriesByLocation]) => [text, [...clusteredEntriesByLocation.values()]])
    .filter(([, clusteredEntries]) => clusteredEntries.length >= 3)
    .map(([text, clusteredEntries]) =>
      makeFinding({
        routePath,
        category,
        kind: "IDENTICAL_LABEL_CLUSTER",
        sample: text,
        entry: clusteredEntries[0],
        detail: `${clusteredEntries.length} identical labels/headings on one route`,
      }),
    );
}

export function analyzeZhHkSemanticEntries(entries, routePath, options = {}) {
  const category = options.category ?? "public";
  const allFindings = [];
  const seen = new Set();

  for (const entry of entries) {
    for (const finding of analyzeEntry(entry, routePath, category)) {
      const key = [
        finding.route,
        finding.kind,
        finding.sourceCategory,
        finding.sample,
        finding.nearestHeading ?? "",
        finding.landmark ?? "",
        finding.elementTag ?? "",
        finding.elementRole ?? "",
        finding.sourceType ?? "",
      ].join("\u0000");

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      allFindings.push(finding);
    }
  }

  for (const finding of findIdenticalLabelClusters(entries, routePath, category)) {
    const key = [finding.route, finding.kind, finding.sample, finding.sourceType ?? ""].join("\u0000");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    allFindings.push(finding);
  }

  return allFindings;
}

export function buildZhHkSemanticReport(allFindings) {
  const routeMap = new Map();
  const sourceCategoryMap = new Map(
    ZHHK_SEMANTIC_SOURCE_CATEGORIES.map((sourceCategory) => [
      sourceCategory,
      {
        sourceCategory,
        issueCount: 0,
        findings: [],
      },
    ]),
  );

  for (const finding of allFindings) {
    if (!routeMap.has(finding.route)) {
      routeMap.set(finding.route, {
        route: finding.route,
        issueCount: 0,
        bySourceCategory: new Map(),
      });
    }

    const routeGroup = routeMap.get(finding.route);
    if (!routeGroup.bySourceCategory.has(finding.sourceCategory)) {
      routeGroup.bySourceCategory.set(finding.sourceCategory, {
        sourceCategory: finding.sourceCategory,
        issueCount: 0,
        findings: [],
      });
    }

    const routeSourceGroup = routeGroup.bySourceCategory.get(finding.sourceCategory);
    const globalSourceGroup =
      sourceCategoryMap.get(finding.sourceCategory) ??
      sourceCategoryMap
        .set(finding.sourceCategory, {
          sourceCategory: finding.sourceCategory,
          issueCount: 0,
          findings: [],
        })
        .get(finding.sourceCategory);

    routeGroup.issueCount += 1;
    routeSourceGroup.issueCount += 1;
    globalSourceGroup.issueCount += 1;
    routeSourceGroup.findings.push(finding);
    globalSourceGroup.findings.push(finding);
  }

  return {
    issueCount: allFindings.length,
    sourceCategories: ZHHK_SEMANTIC_SOURCE_CATEGORIES,
    routes: [...routeMap.values()].map((routeGroup) => ({
      ...routeGroup,
      bySourceCategory: [...routeGroup.bySourceCategory.values()].sort((a, b) =>
        a.sourceCategory.localeCompare(b.sourceCategory),
      ),
    })),
    bySourceCategory: [...sourceCategoryMap.values()],
  };
}
