// @vitest-environment node

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import conceptsCatalog from "@/content/catalog/concepts.json";
import type { ConceptContent } from "@/lib/content";
import {
  buildConceptEditorialOverlaySource,
  collectIgnoredOverlayPaths,
  isPlainObject,
} from "@/lib/content/editorial-overlays";

const CONCEPT_OVERLAY_DIR = path.join(
  process.cwd(),
  "content",
  "i18n",
  "zh-HK",
  "concepts",
);

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
]);

const DISALLOWED_VALUE_PATTERNS: RegExp[] = [
  /\?{2,}/u,
  /[为这设读图点线术层触样压观际动后让页发总时数条颗级测并运应觉气温]/u,
  /閲/u,
  /読/u,
  /\bSetup [AB]\b/u,
  /\bBox [AB]\b/u,
  /\bBaseline\b/u,
  /\bVariant\b/u,
  /\bCase [AB]\b/u,
  /\bCrowding\b/u,
  /\bCompare mode\b/u,
  /\bStoichiometric\b/u,
  /\\θ(?:_|[A-Za-z])/u,
  /活生生的/u,
  /活生生的例子/u,
  /工作臺/u,
  /繫結/u,
];

const ENGLISH_LEAK_FIELD_KEYS = new Set([
  "title",
  "shortTitle",
  "summary",
  "intro",
  "prompt",
  "text",
  "description",
  "shortDescription",
  "whyItMatters",
  "reasonLabel",
  "changeLabel",
  "resultLabel",
  "successMessage",
  "observationHint",
  "meaning",
  "myth",
  "answer",
  "prediction",
  "explanation",
  "correction",
  "label",
]);

const ENGLISH_PHRASE_PATTERN = /\b[A-Za-z]{3,}(?:[\s/-]+[A-Za-z][A-Za-z0-9-]{1,})+\b/u;
const INLINE_MATH_TOKEN_PATTERN =
  /\{\{[^}]+\}\}|\$[^$]+\$|\b[a-zA-Z]+(?:_[a-zA-Z0-9]+)+\b|\b[a-zA-Z]+(?:\/[a-zA-Z0-9]+)+\b/gu;
const PLACEHOLDER_PATTERN = /\{\{\s*[^}]+\s*\}\}/gu;

function isRecord(value: unknown): value is Record<string, unknown> {
  return isPlainObject(value);
}

function getStableArrayKey(value: unknown): "id" | "slug" | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  if (value.every((item) => isRecord(item) && typeof item.id === "string")) {
    return "id";
  }

  if (value.every((item) => isRecord(item) && typeof item.slug === "string")) {
    return "slug";
  }

  return null;
}

function walkVisibleStrings(
  value: unknown,
  keyPath: string[] = [],
  collector: Array<{ path: string; value: string }> = [],
) {
  if (typeof value === "string") {
    const lastKey = keyPath[keyPath.length - 1] ?? "";

    if (
      !NON_VISIBLE_KEYS.has(lastKey) &&
      !keyPath.some((segment) => IGNORED_SEGMENTS.has(segment))
    ) {
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

function shouldAuditEnglishLeak(path: string, value: string) {
  const sanitizedValue = value
    .replace(INLINE_MATH_TOKEN_PATTERN, " ")
    .replace(/\\[A-Za-z]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();

  if (!ENGLISH_PHRASE_PATTERN.test(sanitizedValue)) {
    return false;
  }

  const segments = path.split(".");
  const lastKey = segments[segments.length - 1] ?? "";

  if (!ENGLISH_LEAK_FIELD_KEYS.has(lastKey)) {
    return false;
  }

  return true;
}

function extractPlaceholderTokens(value: unknown) {
  if (typeof value !== "string") {
    return [];
  }

  return [...value.matchAll(PLACEHOLDER_PATTERN)].map((match) => match[0]).sort();
}

function placeholderTokensMatch(left: string[], right: string[]) {
  return left.length === right.length && left.every((token, index) => token === right[index]);
}

function collectPlaceholderMismatchPaths(
  overlay: unknown,
  canonical: unknown,
  pathSegments: string[] = [],
): string[] {
  if (overlay === undefined || overlay === null || canonical === undefined || canonical === null) {
    return [];
  }

  if (isRecord(overlay) && isRecord(canonical)) {
    return Object.entries(overlay).flatMap(([key, value]) => {
      if (!(key in canonical)) {
        return [];
      }

      return collectPlaceholderMismatchPaths(value, canonical[key], [...pathSegments, key]);
    });
  }

  if (Array.isArray(overlay) && Array.isArray(canonical)) {
    const stableKey = getStableArrayKey(canonical);

    if (stableKey) {
      const canonicalByStableKey = new Map(
        canonical
          .filter((item) => isRecord(item) && typeof item[stableKey] === "string")
          .map((item) => [item[stableKey], item]),
      );

      return overlay.flatMap((item) => {
        if (!isRecord(item) || typeof item[stableKey] !== "string") {
          return [];
        }

        const canonicalItem = canonicalByStableKey.get(item[stableKey]);
        if (!canonicalItem) {
          return [];
        }

        return collectPlaceholderMismatchPaths(item, canonicalItem, [
          ...pathSegments,
          `${stableKey}:${item[stableKey]}`,
        ]);
      });
    }

    return overlay.flatMap((item, index) => {
      const canonicalItem = canonical[index];
      if (canonicalItem === undefined) {
        return [];
      }

      return collectPlaceholderMismatchPaths(item, canonicalItem, [
        ...pathSegments,
        String(index),
      ]);
    });
  }

  if (typeof overlay === "string" && typeof canonical === "string") {
    const canonicalTokens = extractPlaceholderTokens(canonical);
    const overlayTokens = extractPlaceholderTokens(overlay);

    if (
      (canonicalTokens.length > 0 || overlayTokens.length > 0) &&
      !placeholderTokensMatch(canonicalTokens, overlayTokens)
    ) {
      return [pathSegments.join(".")];
    }
  }

  return [];
}

describe("zh-HK concept overlays", () => {
  it("provide overlay shards for every published concept", () => {
    const filenames = new Set(
      readdirSync(CONCEPT_OVERLAY_DIR)
        .filter((entry) => entry.endsWith(".json"))
        .map((entry) => entry.replace(/\.json$/u, "")),
    );
    const publishedSlugs = (conceptsCatalog as Array<{ slug: string; status?: string }>)
      .filter((concept) => concept.status === "published")
      .map((concept) => concept.slug);

    const missing = publishedSlugs.filter((slug) => !filenames.has(slug));
    expect(missing).toEqual([]);
  });

  it("avoid placeholder corruption, Simplified residue, and visible English leak markers", () => {
    const filenames = readdirSync(CONCEPT_OVERLAY_DIR).filter((entry) => entry.endsWith(".json"));
    const issues: string[] = [];

    for (const filename of filenames) {
      const filePath = path.join(CONCEPT_OVERLAY_DIR, filename);
      const overlay = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
      const visibleStrings = walkVisibleStrings(overlay);

      for (const entry of visibleStrings) {
        const matchedPattern = DISALLOWED_VALUE_PATTERNS.find((pattern) => pattern.test(entry.value));

        if (matchedPattern) {
          issues.push(`${filename} :: ${entry.path} :: ${matchedPattern} :: ${entry.value}`);
          continue;
        }

        if (shouldAuditEnglishLeak(entry.path, entry.value)) {
          issues.push(`${filename} :: ${entry.path} :: ENGLISH_PHRASE :: ${entry.value}`);
        }
      }
    }

    expect(issues).toEqual([]);
  });

  it("stay inside the live editorial overlay contract and preserve canonical placeholders", () => {
    const conceptMetadataBySlug = new Map(
      (conceptsCatalog as Array<{ slug: string; contentFile: string }>).map((concept) => [
        concept.slug,
        concept,
      ]),
    );
    const filenames = readdirSync(CONCEPT_OVERLAY_DIR).filter((entry) => entry.endsWith(".json"));
    const issues: string[] = [];

    for (const filename of filenames) {
      const slug = filename.replace(/\.json$/u, "");
      const conceptMetadata = conceptMetadataBySlug.get(slug);

      if (!conceptMetadata) {
        issues.push(`${filename} :: missing concept metadata`);
        continue;
      }

      const canonicalPath = path.join(
        process.cwd(),
        "content",
        "concepts",
        `${conceptMetadata.contentFile}.json`,
      );
      const canonicalConcept = JSON.parse(readFileSync(canonicalPath, "utf8")) as Partial<ConceptContent>;
      const canonicalOverlay = buildConceptEditorialOverlaySource(
        conceptMetadata,
        canonicalConcept,
      );
      const overlayPath = path.join(CONCEPT_OVERLAY_DIR, filename);
      const overlay = JSON.parse(readFileSync(overlayPath, "utf8")) as unknown;
      const ignoredPaths = collectIgnoredOverlayPaths(overlay, canonicalOverlay);
      const placeholderMismatchPaths = collectPlaceholderMismatchPaths(
        overlay,
        canonicalOverlay,
      );

      ignoredPaths.forEach((path: string) => issues.push(`${filename} :: ignored :: ${path}`));
      placeholderMismatchPaths.forEach((path: string) =>
        issues.push(`${filename} :: placeholder :: ${path}`),
      );
    }

    expect(issues).toEqual([]);
  });
});
