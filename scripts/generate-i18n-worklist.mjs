import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildConceptEditorialOverlaySource,
  collectMissingOverlayLeafPaths,
  isPlainObject,
  mergeEditorialValue,
  sanitizeOverlayAgainstCanonical,
} from "../lib/content/editorial-overlays.mjs";
import { generateContentVariantBundle } from "./generate-content-variant-bundle.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultRepoRoot = path.resolve(__dirname, "..");
const fallbackBuckets = ["51+", "21-50", "6-20", "1-5"];
const protectedTokenPattern = /\{\{\s*[^}]+\s*\}\}|\$[^$]+\$|\\[A-Za-z]+/u;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, "utf8");
}

function toPosixRelativePath(rootPath, filePath) {
  return path.relative(rootPath, filePath).split(path.sep).join(path.posix.sep);
}

function getRepoPaths(repoRoot) {
  const contentRoot = path.join(repoRoot, "content");
  return {
    repoRoot,
    contentRoot,
    catalogPath: path.join(contentRoot, "catalog", "concepts.json"),
    conceptsRoot: path.join(contentRoot, "concepts"),
    i18nRoot: path.join(contentRoot, "i18n"),
    generatedRoot: path.join(contentRoot, "_meta", "generated"),
  };
}

function getStableArrayKey(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  if (value.every((item) => isPlainObject(item) && typeof item.id === "string")) {
    return "id";
  }

  if (value.every((item) => isPlainObject(item) && typeof item.slug === "string")) {
    return "slug";
  }

  return null;
}

function bucketFallbackCount(count) {
  if (count >= 51) {
    return "51+";
  }

  if (count >= 21) {
    return "21-50";
  }

  if (count >= 6) {
    return "6-20";
  }

  return "1-5";
}

function compareWorklistItems(left, right) {
  const bucketOrder =
    fallbackBuckets.indexOf(left.severityBucket) - fallbackBuckets.indexOf(right.severityBucket);

  if (bucketOrder !== 0) {
    return bucketOrder;
  }

  if (left.fallbackFieldCount !== right.fallbackFieldCount) {
    return right.fallbackFieldCount - left.fallbackFieldCount;
  }

  return left.slug.localeCompare(right.slug);
}

function buildMissingTranslationPatch(source, localized) {
  if (source === undefined) {
    return undefined;
  }

  if (Array.isArray(source)) {
    const stableKey = getStableArrayKey(source);

    if (!stableKey) {
      if (!Array.isArray(localized) || source.length !== localized.length) {
        return source;
      }

      const missingPaths = collectMissingOverlayLeafPaths(source, localized);
      return missingPaths.length > 0 ? source : undefined;
    }

    if (!Array.isArray(localized)) {
      return source;
    }

    const localizedByStableKey = new Map(
      localized
        .filter((item) => isPlainObject(item) && typeof item[stableKey] === "string")
        .map((item) => [item[stableKey], item]),
    );
    const items = [];

    for (const sourceItem of source) {
      if (!isPlainObject(sourceItem) || typeof sourceItem[stableKey] !== "string") {
        continue;
      }

      const localizedItem = localizedByStableKey.get(sourceItem[stableKey]);
      const missingItem = buildMissingTranslationPatch(sourceItem, localizedItem);

      if (missingItem === undefined) {
        continue;
      }

      if (isPlainObject(missingItem) && !(stableKey in missingItem)) {
        items.push({ [stableKey]: sourceItem[stableKey], ...missingItem });
      } else {
        items.push(missingItem);
      }
    }

    return items.length > 0 ? items : undefined;
  }

  if (isPlainObject(source)) {
    if (!isPlainObject(localized)) {
      return source;
    }

    const result = {};

    for (const [key, value] of Object.entries(source)) {
      const missingValue = buildMissingTranslationPatch(value, localized[key]);

      if (missingValue !== undefined) {
        result[key] = missingValue;
      }
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }

  return localized === undefined ? source : undefined;
}

function collectProtectedTokenPaths(value, pathSegments = []) {
  if (typeof value === "string") {
    return protectedTokenPattern.test(value) ? [pathSegments.join(".")] : [];
  }

  if (Array.isArray(value)) {
    const stableKey = getStableArrayKey(value);

    if (stableKey) {
      return value.flatMap((item) =>
        collectProtectedTokenPaths(item, [...pathSegments, `${stableKey}:${item[stableKey]}`]),
      );
    }

    return value.flatMap((item, index) =>
      collectProtectedTokenPaths(item, [...pathSegments, String(index)]),
    );
  }

  if (isPlainObject(value)) {
    return Object.entries(value).flatMap(([key, nestedValue]) =>
      collectProtectedTokenPaths(nestedValue, [...pathSegments, key]),
    );
  }

  return [];
}

function buildWorklistNotes(candidate, protectedTokenPaths) {
  const notes = [];

  if (candidate.fallbackBaseVariant === "optimized") {
    notes.push("Missing fields currently inherit from optimized English at runtime.");
  } else {
    notes.push("Missing fields currently inherit from canonical English at runtime.");
  }

  if (candidate.fallbackFieldCount >= 51) {
    notes.push("Large translation packet. Translate in smaller chunks if using an external model.");
  }

  if (protectedTokenPaths.length > 0) {
    notes.push("Preserve placeholders, LaTeX, and protected tokens exactly in the exported fields.");
  }

  return notes;
}

function buildArtifactBaseName(locale, filters) {
  const segments = [`i18n-worklist-${locale}`];

  if (filters.bucket) {
    segments.push(`bucket-${filters.bucket.replace(/\+/gu, "plus")}`);
  }

  if (filters.minFallbackCount !== null) {
    segments.push(`min-${filters.minFallbackCount}`);
  }

  if (filters.slugs.length === 1) {
    segments.push(`slug-${filters.slugs[0]}`);
  } else if (filters.slugs.length > 1) {
    segments.push(`slugs-${filters.slugs.length}`);
  }

  return segments.join("--");
}

function renderMarkdownWorklist(worklist) {
  const lines = [
    `# ${worklist.locale} Translation Worklist`,
    "",
    `Generated: ${worklist.generatedAt}`,
    "",
    `Filtered concepts: ${worklist.summary.conceptCount}`,
    `Total fallback fields: ${worklist.summary.totalFallbackFields}`,
    "",
    "## Filters",
    "",
    `- Locale: \`${worklist.locale}\``,
    `- Bucket: ${worklist.filters.bucket ? `\`${worklist.filters.bucket}\`` : "all"}`,
    `- Minimum fallback count: ${
      worklist.filters.minFallbackCount !== null ? `\`${worklist.filters.minFallbackCount}\`` : "none"
    }`,
    `- Slugs: ${
      worklist.filters.slugs.length > 0
        ? worklist.filters.slugs.map((slug) => `\`${slug}\``).join(", ")
        : "all"
    }`,
    "",
    "## Buckets",
    "",
  ];

  for (const bucket of fallbackBuckets) {
    lines.push(`- \`${bucket}\`: ${worklist.summary.bucketCounts[bucket] ?? 0}`);
  }

  lines.push("");
  lines.push("## Items");
  lines.push("");

  if (worklist.items.length === 0) {
    lines.push("No localized fallback work items matched the current filters.");
    lines.push("");
    return lines.join("\n");
  }

  for (const item of worklist.items) {
    const samplePaths = item.fallbackFieldPaths.slice(0, 5);
    lines.push(`### \`${item.slug}\``);
    lines.push("");
    lines.push(`- Title: ${item.title}`);
    lines.push(`- Fallback fields: ${item.fallbackFieldCount}`);
    lines.push(`- Severity bucket: \`${item.severityBucket}\``);
    lines.push(`- Runtime English base: \`${item.fallbackBaseVariant}\``);
    lines.push(`- Target overlay: \`${item.targetOverlayPath}\``);
    lines.push(
      `- Protected-token fields in source patch: ${item.protectedTokenPaths.length > 0 ? item.protectedTokenPaths.length : 0}`,
    );

    if (samplePaths.length > 0) {
      lines.push(`- Sample missing fields: ${samplePaths.map((value) => `\`${value}\``).join(", ")}`);
    }

    if (item.notes.length > 0) {
      lines.push(`- Notes: ${item.notes.join(" ")}`);
    }

    lines.push("");
  }

  lines.push("Use the JSON artifact for the full translation-ready source patch. Each `sourcePatch` contains only the currently missing editorial fields and preserves stable ids and protected tokens.");
  lines.push("");
  return lines.join("\n");
}

export function buildLocaleFallbackWorklist(repoRoot = defaultRepoRoot, options = {}) {
  const resolvedRoot = path.resolve(repoRoot);
  const locale = options.locale ?? "zh-HK";
  const filters = {
    slugs: [...new Set((options.slugs ?? []).filter((value) => typeof value === "string" && value.length > 0))].sort(
      (left, right) => left.localeCompare(right),
    ),
    minFallbackCount:
      Number.isInteger(options.minFallbackCount) && options.minFallbackCount >= 1
        ? options.minFallbackCount
        : null,
    bucket: options.bucket ?? null,
  };
  const paths = getRepoPaths(resolvedRoot);
  const conceptCatalog = readJson(paths.catalogPath);
  const localeManifestPath = path.join(paths.i18nRoot, locale, "manifest.json");
  const localeManifest = fs.existsSync(localeManifestPath) ? readJson(localeManifestPath) : { entries: {} };
  const { manifest, optimizedBundle } = generateContentVariantBundle(resolvedRoot, { writeFiles: false });
  const items = [];

  for (const conceptMetadata of conceptCatalog) {
    if (filters.slugs.length > 0 && !filters.slugs.includes(conceptMetadata.slug)) {
      continue;
    }

    const manifestEntry = manifest.concepts[conceptMetadata.slug];
    const localeCandidate = manifestEntry?.locales?.[locale];

    if (!localeCandidate?.usable || !localeCandidate.usesFallbackFields) {
      continue;
    }

    if (
      filters.minFallbackCount !== null &&
      localeCandidate.fallbackFieldCount < filters.minFallbackCount
    ) {
      continue;
    }

    const severityBucket = bucketFallbackCount(localeCandidate.fallbackFieldCount);
    if (filters.bucket && severityBucket !== filters.bucket) {
      continue;
    }

    const canonicalConceptPath = path.join(
      paths.conceptsRoot,
      `${conceptMetadata.contentFile}.json`,
    );
    const canonicalConcept = readJson(canonicalConceptPath);
    const canonicalOverlay = buildConceptEditorialOverlaySource(conceptMetadata, canonicalConcept);
    const optimizedOverlay = optimizedBundle[conceptMetadata.slug];
    const englishBaseOverlay =
      localeCandidate.fallbackBaseVariant === "optimized" && optimizedOverlay
        ? mergeEditorialValue(canonicalOverlay, optimizedOverlay)
        : canonicalOverlay;
    const localeOverlayPath = path.join(paths.i18nRoot, locale, "concepts", `${conceptMetadata.slug}.json`);
    const rawLocaleOverlay = readJson(localeOverlayPath);
    const localizedOverlay = sanitizeOverlayAgainstCanonical(rawLocaleOverlay, canonicalOverlay) ?? {};
    const fallbackFieldPaths = collectMissingOverlayLeafPaths(englishBaseOverlay, localizedOverlay);
    const sourcePatch = buildMissingTranslationPatch(englishBaseOverlay, localizedOverlay) ?? {};
    const protectedTokenPaths = collectProtectedTokenPaths(sourcePatch);
    const localeManifestEntry = localeManifest.entries?.[`concept:${conceptMetadata.slug}`] ?? null;

    items.push({
      slug: conceptMetadata.slug,
      title: manifestEntry.title,
      locale,
      targetOverlayPath: toPosixRelativePath(resolvedRoot, localeOverlayPath),
      fallbackFieldCount: fallbackFieldPaths.length,
      fallbackFieldPaths,
      severityBucket,
      fallbackBaseVariant: localeCandidate.fallbackBaseVariant ?? "original",
      fallbackBaseSourcePath:
        localeCandidate.fallbackBaseVariant === "optimized" && manifestEntry.optimized?.sourcePath
          ? manifestEntry.optimized.sourcePath
          : manifestEntry.canonicalSourcePath,
      canonicalSourcePath: manifestEntry.canonicalSourcePath,
      optimizedSourcePath: manifestEntry.optimized?.sourcePath ?? null,
      englishSourceHash:
        localeCandidate.fallbackBaseVariant === "optimized"
          ? manifestEntry.optimized?.outputHash ?? manifestEntry.canonicalSourceHash
          : manifestEntry.canonicalSourceHash,
      localeManifestSourceHash:
        typeof localeManifestEntry?.sourceHash === "string" ? localeManifestEntry.sourceHash : null,
      protectedTokenPaths,
      notes: buildWorklistNotes(localeCandidate, protectedTokenPaths),
      sourcePatch,
    });
  }

  items.sort(compareWorklistItems);

  const bucketCounts = Object.fromEntries(
    fallbackBuckets.map((bucket) => [bucket, items.filter((item) => item.severityBucket === bucket).length]),
  );
  const worklist = {
    version: 1,
    generatedAt: new Date().toISOString(),
    locale,
    filters,
    summary: {
      conceptCount: items.length,
      totalFallbackFields: items.reduce((total, item) => total + item.fallbackFieldCount, 0),
      bucketCounts,
    },
    items,
  };
  const artifactBaseName = buildArtifactBaseName(locale, filters);

  return {
    worklist,
    outputPaths: {
      json: path.join(paths.generatedRoot, `${artifactBaseName}.json`),
      markdown: path.join(paths.generatedRoot, `${artifactBaseName}.md`),
    },
  };
}

export function generateLocaleFallbackWorklist(repoRoot = defaultRepoRoot, options = {}) {
  const writeFiles = options.writeFiles ?? true;
  const result = buildLocaleFallbackWorklist(repoRoot, options);

  if (writeFiles) {
    writeJson(result.outputPaths.json, result.worklist);
    writeText(result.outputPaths.markdown, `${renderMarkdownWorklist(result.worklist)}\n`);
  }

  return result;
}

function parseArgs(argv) {
  const options = {
    locale: "zh-HK",
    slugs: [],
    minFallbackCount: null,
    bucket: null,
    repoRoot: defaultRepoRoot,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--locale") {
      options.locale = argv[index + 1] ?? options.locale;
      index += 1;
      continue;
    }

    if (argument === "--slug") {
      const value = argv[index + 1];
      if (value) {
        options.slugs.push(value);
      }
      index += 1;
      continue;
    }

    if (argument === "--min-fallback-count") {
      const value = Number.parseInt(argv[index + 1] ?? "", 10);
      if (!Number.isNaN(value) && value >= 1) {
        options.minFallbackCount = value;
      }
      index += 1;
      continue;
    }

    if (argument === "--bucket") {
      const value = argv[index + 1] ?? null;
      if (value && fallbackBuckets.includes(value)) {
        options.bucket = value;
      } else if (value) {
        throw new Error(`Unsupported bucket "${value}". Expected one of ${fallbackBuckets.join(", ")}.`);
      }
      index += 1;
      continue;
    }

    if (!argument.startsWith("--")) {
      options.repoRoot = argument;
    }
  }

  return options;
}

if (process.argv[1] === __filename) {
  const options = parseArgs(process.argv.slice(2));
  const result = generateLocaleFallbackWorklist(options.repoRoot, options);
  const relativeRoot = path.resolve(options.repoRoot);

  console.log(
    [
      `Generated ${result.worklist.locale} worklist for ${result.worklist.summary.conceptCount} concept(s).`,
      `JSON: ${path.relative(relativeRoot, result.outputPaths.json)}`,
      `Markdown: ${path.relative(relativeRoot, result.outputPaths.markdown)}`,
    ].join("\n"),
  );
}
