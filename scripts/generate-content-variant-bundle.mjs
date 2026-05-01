import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildConceptEditorialOverlaySource,
  collectIgnoredOverlayPaths,
  collectMissingOverlayLeafPaths,
  isPlainObject,
  sanitizeOverlayAgainstCanonical,
} from "../lib/content/editorial-overlays.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultRepoRoot = path.resolve(__dirname, "..");

const canonicalLocale = "en";
const reviewStatuses = new Set([
  "draft",
  "ai-generated",
  "human-reviewed",
  "approved",
]);
const qaStatuses = new Set(["unknown", "pass", "warning", "fail"]);
const translationManifestPrefix = "concept:";
function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readJsonIfExists(filePath) {
  return fs.existsSync(filePath) ? readJson(filePath) : null;
}

function writeJson(filePath, value) {
  const nextContent = `${JSON.stringify(value, null, 2)}\n`;
  const currentContent = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;

  if (currentContent === nextContent) {
    return;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, nextContent, "utf8");
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const entries = Object.keys(value)
    .sort((left, right) => left.localeCompare(right))
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);

  return `{${entries.join(",")}}`;
}

function sha256Json(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function toPosixRelativePath(rootPath, filePath) {
  return path.relative(rootPath, filePath).split(path.sep).join(path.posix.sep);
}

function validateOverlaySubset(overlay, canonical, pathSegments = []) {
  const problems = [];
  const pathLabel = pathSegments.length > 0 ? pathSegments.join(".") : "<root>";

  if (canonical === undefined || canonical === null) {
    problems.push(`${pathLabel}: overlay path does not exist in canonical content`);
    return problems;
  }

  if (isPlainObject(overlay)) {
    if (!isPlainObject(canonical)) {
      problems.push(`${pathLabel}: expected ${typeof canonical}, found object`);
      return problems;
    }

    for (const [key, value] of Object.entries(overlay)) {
      if (!(key in canonical)) {
        continue;
      }

      problems.push(...validateOverlaySubset(value, canonical[key], [...pathSegments, key]));
    }

    return problems;
  }

  if (Array.isArray(overlay)) {
    if (!Array.isArray(canonical)) {
      problems.push(`${pathLabel}: expected ${typeof canonical}, found array`);
      return problems;
    }

    const overlayHasIds = overlay.every(
      (item) => isPlainObject(item) && typeof item.id === "string",
    );
    const canonicalHasIds = canonical.every(
      (item) => isPlainObject(item) && typeof item.id === "string",
    );
    const overlayHasSlugs = overlay.every(
      (item) => isPlainObject(item) && typeof item.slug === "string",
    );
    const canonicalHasSlugs = canonical.every(
      (item) => isPlainObject(item) && typeof item.slug === "string",
    );

    if (overlayHasIds && canonicalHasIds) {
      const canonicalById = new Map(canonical.map((item) => [item.id, item]));
      for (const item of overlay) {
        if (!canonicalById.has(item.id)) {
          problems.push(`${pathLabel}.id:${item.id}: id does not exist in canonical content`);
          continue;
        }

        problems.push(
          ...validateOverlaySubset(item, canonicalById.get(item.id), [
            ...pathSegments,
            `id:${item.id}`,
          ]),
        );
      }
      return problems;
    }

    if (canonicalHasIds && !overlayHasIds) {
      overlay.forEach((item, index) => {
        const childPath = [...pathSegments, String(index)].join(".");
        if (!isPlainObject(item) || typeof item.id !== "string") {
          problems.push(`${childPath}: missing stable id required for safe overlay merge`);
        }
      });
      return problems;
    }

    if (overlayHasSlugs && canonicalHasSlugs) {
      const canonicalBySlug = new Map(canonical.map((item) => [item.slug, item]));
      for (const item of overlay) {
        if (!canonicalBySlug.has(item.slug)) {
          problems.push(`${pathLabel}.slug:${item.slug}: slug does not exist in canonical content`);
          continue;
        }

        problems.push(
          ...validateOverlaySubset(item, canonicalBySlug.get(item.slug), [
            ...pathSegments,
            `slug:${item.slug}`,
          ]),
        );
      }
      return problems;
    }

    if (canonicalHasSlugs && !overlayHasSlugs) {
      overlay.forEach((item, index) => {
        const childPath = [...pathSegments, String(index)].join(".");
        if (!isPlainObject(item) || typeof item.slug !== "string") {
          problems.push(`${childPath}: missing stable slug required for safe overlay merge`);
        }
      });
      return problems;
    }

    overlay.forEach((value, index) => {
      const canonicalSample =
        canonical[index] ?? canonical.find((item) => item !== undefined) ?? canonical[0];

      if (canonicalSample !== undefined) {
        problems.push(
          ...validateOverlaySubset(value, canonicalSample, [...pathSegments, String(index)]),
        );
      }
    });
    return problems;
  }

  if (typeof overlay === "string") {
    if (typeof canonical !== "string") {
      problems.push(`${pathLabel}: expected ${typeof canonical}, found string`);
    }
    return problems;
  }

  if (typeof overlay !== typeof canonical) {
    problems.push(`${pathLabel}: expected ${typeof canonical}, found ${typeof overlay}`);
  }

  return problems;
}

function extractPlaceholderTokens(value) {
  if (typeof value !== "string") {
    return [];
  }

  return [...value.matchAll(/{{\s*[^}]+\s*}}/g)].map((match) => match[0]).sort();
}

function placeholderTokensMatch(left, right) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((token, index) => token === right[index]);
}

function collectPlaceholderMismatchPaths(overlay, canonical, pathSegments = []) {
  if (overlay === undefined || overlay === null || canonical === undefined || canonical === null) {
    return [];
  }

  if (isPlainObject(overlay)) {
    if (!isPlainObject(canonical)) {
      return [];
    }

    return Object.entries(overlay).flatMap(([key, value]) => {
      if (!(key in canonical)) {
        return [];
      }

      return collectPlaceholderMismatchPaths(value, canonical[key], [...pathSegments, key]);
    });
  }

  if (Array.isArray(overlay) && Array.isArray(canonical)) {
    const overlayHasIds = overlay.every(
      (item) => isPlainObject(item) && typeof item.id === "string",
    );
    const canonicalHasIds = canonical.every(
      (item) => isPlainObject(item) && typeof item.id === "string",
    );
    const overlayHasSlugs = overlay.every(
      (item) => isPlainObject(item) && typeof item.slug === "string",
    );
    const canonicalHasSlugs = canonical.every(
      (item) => isPlainObject(item) && typeof item.slug === "string",
    );

    if (overlayHasIds && canonicalHasIds) {
      const canonicalById = new Map(canonical.map((item) => [item.id, item]));
      return overlay.flatMap((item) => {
        const canonicalItem = canonicalById.get(item.id);

        if (!canonicalItem) {
          return [];
        }

        return collectPlaceholderMismatchPaths(item, canonicalItem, [
          ...pathSegments,
          `id:${item.id}`,
        ]);
      });
    }

    if (overlayHasSlugs && canonicalHasSlugs) {
      const canonicalBySlug = new Map(canonical.map((item) => [item.slug, item]));
      return overlay.flatMap((item) => {
        const canonicalItem = canonicalBySlug.get(item.slug);

        if (!canonicalItem) {
          return [];
        }

        return collectPlaceholderMismatchPaths(item, canonicalItem, [
          ...pathSegments,
          `slug:${item.slug}`,
        ]);
      });
    }

    return overlay.flatMap((value, index) => {
      const canonicalValue = canonical[index];

      if (canonicalValue === undefined) {
        return [];
      }

      return collectPlaceholderMismatchPaths(value, canonicalValue, [
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

function getRepoPaths(repoRoot) {
  const contentRoot = path.join(repoRoot, "content");
  return {
    repoRoot,
    contentRoot,
    catalogPath: path.join(contentRoot, "catalog", "concepts.json"),
    conceptsRoot: path.join(contentRoot, "concepts"),
    optimizedRoot: path.join(contentRoot, "optimized", "concepts"),
    i18nRoot: path.join(contentRoot, "i18n"),
    editorialManifestPath: path.join(contentRoot, "_meta", "editorial-manifest.json"),
    generatedMetaRoot: path.join(contentRoot, "_meta", "generated"),
    generatedManifestPath: path.join(contentRoot, "_meta", "generated", "concept-variant-manifest.json"),
    generatedOptimizedPath: path.join(contentRoot, "_meta", "generated", "optimized-concepts.json"),
    generatedOptimizedUiCopyPath: path.join(
      contentRoot,
      "_meta",
      "generated",
      "optimized-concept-ui-copy.json",
    ),
  };
}

function loadEditorialManifest(editorialManifestPath) {
  const payload = readJsonIfExists(editorialManifestPath);
  if (!isPlainObject(payload)) {
    return { version: 1, updatedAt: null, concepts: {} };
  }

  return {
    version: Number.isInteger(payload.version) ? payload.version : 1,
    updatedAt: typeof payload.updatedAt === "string" ? payload.updatedAt : null,
    concepts: isPlainObject(payload.concepts) ? payload.concepts : {},
  };
}

function getLocaleDirectories(i18nRoot) {
  if (!fs.existsSync(i18nRoot)) {
    return [];
  }

  return fs
    .readdirSync(i18nRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "generated")
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

function getDefaultReviewStatus(provider) {
  if (provider === "manual-review") {
    return "human-reviewed";
  }

  return provider ? "ai-generated" : "draft";
}

function normalizeMetadataOverride(raw, fallbackProvider = null, fallbackTranslatedAt = null) {
  const notes = [];
  const issues = [];
  const value = isPlainObject(raw) ? raw : {};
  const provider = typeof value.provider === "string" ? value.provider : fallbackProvider;
  const translatedAt =
    typeof value.translatedAt === "string" ? value.translatedAt : fallbackTranslatedAt;

  const requestedReviewStatus =
    typeof value.reviewStatus === "string" ? value.reviewStatus : getDefaultReviewStatus(provider);
  const requestedQaStatus = typeof value.qaStatus === "string" ? value.qaStatus : "unknown";

  const reviewStatus = reviewStatuses.has(requestedReviewStatus)
    ? requestedReviewStatus
    : "draft";
  const qaStatus = qaStatuses.has(requestedQaStatus) ? requestedQaStatus : "unknown";

  if (requestedReviewStatus !== reviewStatus) {
    issues.push(`Invalid reviewStatus "${requestedReviewStatus}".`);
  }

  if (requestedQaStatus !== qaStatus) {
    issues.push(`Invalid qaStatus "${requestedQaStatus}".`);
  }

  if (Array.isArray(value.notes)) {
    notes.push(...value.notes.filter((item) => typeof item === "string" && item.trim().length > 0));
  }

  if (Array.isArray(value.issues)) {
    issues.push(
      ...value.issues.filter((item) => typeof item === "string" && item.trim().length > 0),
    );
  }

  const derivedFrom = isPlainObject(value.derivedFrom) ? value.derivedFrom : null;
  const derivedVariant =
    derivedFrom?.variant === "optimized" || derivedFrom?.variant === "original"
      ? derivedFrom.variant
      : "original";
  const derivedLocale =
    typeof derivedFrom?.locale === "string" && derivedFrom.locale.length > 0
      ? derivedFrom.locale
      : canonicalLocale;
  const recordedSourceHash =
    typeof derivedFrom?.sourceHash === "string" ? derivedFrom.sourceHash : null;

  return {
    reviewStatus,
    qaStatus,
    provider,
    translatedAt,
    notes,
    issues,
    derivedFrom: {
      variant: derivedVariant,
      locale: derivedLocale,
      recordedSourceHash,
    },
  };
}

function buildVariantCandidate({
  kind,
  locale,
  variantFilePath,
  canonicalOverlay,
  fallbackProvider = null,
  fallbackTranslatedAt = null,
  defaultRecordedSourceHash = null,
  currentSourceHash = null,
  metadataOverride = null,
  translationManifestEntry = null,
}) {
  const variantExists = Boolean(variantFilePath && fs.existsSync(variantFilePath));
  const normalizedMetadata = normalizeMetadataOverride(
    metadataOverride,
    fallbackProvider,
    fallbackTranslatedAt,
  );
  const notes = [...normalizedMetadata.notes];
  const issues = [...normalizedMetadata.issues];

  if (!variantExists) {
    return {
      kind,
      locale,
      exists: false,
      usable: false,
      valid: false,
      stale: false,
      reviewStatus: normalizedMetadata.reviewStatus,
      qaStatus: normalizedMetadata.qaStatus,
      sourcePath: null,
      outputHash: null,
      derivedFrom: {
        ...normalizedMetadata.derivedFrom,
        recordedSourceHash:
          normalizedMetadata.derivedFrom.recordedSourceHash ?? defaultRecordedSourceHash,
        currentSourceHash,
      },
      provider: normalizedMetadata.provider,
      translatedAt: normalizedMetadata.translatedAt,
      notes,
      issues,
      overlay: null,
    };
  }

  const sourcePath = variantFilePath;
  let overlay = null;
  let outputHash = null;
  let valid = false;

  try {
    const rawOverlay = readJson(sourcePath);
    outputHash = sha256Json(rawOverlay);
    const ignoredPaths = collectIgnoredOverlayPaths(rawOverlay, canonicalOverlay);
    overlay = sanitizeOverlayAgainstCanonical(rawOverlay, canonicalOverlay) ?? null;
    const validationIssues =
      overlay !== null ? validateOverlaySubset(overlay, canonicalOverlay) : [];
    const placeholderMismatchPaths =
      kind === "optimized" && overlay !== null
        ? collectPlaceholderMismatchPaths(overlay, canonicalOverlay)
        : [];
    const hardValidationIssues = [...validationIssues];

    if (ignoredPaths.length > 0) {
      if (kind === "optimized") {
        hardValidationIssues.push(
          `Optimized overlay includes ignored protected or unsupported paths: ${ignoredPaths
            .slice(0, 5)
            .join(", ")}${ignoredPaths.length > 5 ? ", ..." : ""}.`,
        );
      } else {
        notes.push(
          `Ignored protected overlay fields: ${ignoredPaths.slice(0, 5).join(", ")}${
            ignoredPaths.length > 5 ? ", ..." : ""
          }.`,
        );
      }
    }

    if (placeholderMismatchPaths.length > 0) {
      hardValidationIssues.push(
        `Optimized overlay changed canonical placeholder tokens at: ${placeholderMismatchPaths
          .slice(0, 5)
          .join(", ")}${placeholderMismatchPaths.length > 5 ? ", ..." : ""}.`,
      );
    }

    if (hardValidationIssues.length > 0) {
      issues.push(...hardValidationIssues);
    } else if (overlay === null) {
      notes.push(
        ignoredPaths.length > 0
          ? "Overlay does not contain any editable fields after protected fields are removed and is treated as a no-op placeholder."
          : "Overlay file is empty or does not change any editable fields and is treated as a no-op placeholder.",
      );
      valid = true;
    } else {
      valid = true;
    }
  } catch (error) {
    issues.push(
      error instanceof Error ? `Failed to read variant JSON: ${error.message}` : "Failed to read variant JSON.",
    );
  }

  if (translationManifestEntry?.outputHash && outputHash && translationManifestEntry.outputHash !== outputHash) {
    issues.push("Recorded outputHash does not match the current overlay file.");
  }

  const derivedFrom = {
    ...normalizedMetadata.derivedFrom,
    recordedSourceHash:
      normalizedMetadata.derivedFrom.recordedSourceHash ??
      translationManifestEntry?.sourceHash ??
      defaultRecordedSourceHash,
    currentSourceHash,
  };
  const missingDerivedSource =
    kind !== "original" &&
    derivedFrom.recordedSourceHash !== null &&
    derivedFrom.currentSourceHash === null;
  const stale =
    derivedFrom.recordedSourceHash === null
      ? kind !== "original"
      : missingDerivedSource ||
        derivedFrom.recordedSourceHash !== derivedFrom.currentSourceHash;

  if (derivedFrom.recordedSourceHash === null && kind !== "original") {
    issues.push("Missing recorded source hash for derived content.");
  }

  if (missingDerivedSource) {
    issues.push("Derived base content is unavailable for stale detection.");
  }

  return {
    kind,
    locale,
    exists: true,
    usable: valid && overlay !== null,
    valid,
    stale,
    reviewStatus: normalizedMetadata.reviewStatus,
    qaStatus: normalizedMetadata.qaStatus,
    sourcePath,
    outputHash,
    derivedFrom,
    provider: normalizedMetadata.provider,
    translatedAt: normalizedMetadata.translatedAt,
    notes,
    issues,
    overlay,
  };
}

function buildOptimizedConceptUiCopy(overlay) {
  if (!isPlainObject(overlay)) {
    return {};
  }

  const uiCopy = {};

  for (const key of ["title", "shortTitle", "summary", "highlights", "subtopic"]) {
    if (key in overlay) {
      uiCopy[key] = overlay[key];
    }
  }

  if (Array.isArray(overlay.recommendedNext)) {
    uiCopy.recommendedNext = overlay.recommendedNext.map((item) => ({
      slug: item.slug,
      ...(typeof item.reasonLabel === "string" ? { reasonLabel: item.reasonLabel } : {}),
    }));
  }

  if (Array.isArray(overlay?.challengeMode?.items)) {
    uiCopy.challengeMode = {
      items: overlay.challengeMode.items.map((item) => ({
        id: item.id,
        ...(typeof item.title === "string" ? { title: item.title } : {}),
        ...(typeof item.prompt === "string" ? { prompt: item.prompt } : {}),
      })),
    };
  }

  return uiCopy;
}

function summarizeCandidates(entries, locales) {
  const summary = {
    canonicalConceptCount: entries.length,
    optimized: {
      detected: 0,
      usable: 0,
      invalid: 0,
      stale: 0,
      missing: entries.length,
    },
    locales: Object.fromEntries(
      locales.map((locale) => [
        locale,
        {
          detected: 0,
          usable: 0,
          invalid: 0,
          stale: 0,
          withFallback: 0,
          missing: entries.length,
        },
      ]),
    ),
  };

  for (const entry of entries) {
    if (entry.optimized?.exists) {
      summary.optimized.detected += 1;
      summary.optimized.missing -= 1;
      if (entry.optimized.usable) {
        summary.optimized.usable += 1;
      } else if (!entry.optimized.valid) {
        summary.optimized.invalid += 1;
      }
      if (entry.optimized.stale) {
        summary.optimized.stale += 1;
      }
    }

    for (const locale of locales) {
      const candidate = entry.locales[locale];
      if (!candidate?.exists) {
        continue;
      }

      summary.locales[locale].detected += 1;
      summary.locales[locale].missing -= 1;
      if (candidate.usable) {
        summary.locales[locale].usable += 1;
      } else if (!candidate.valid) {
        summary.locales[locale].invalid += 1;
      }
      if (candidate.stale) {
        summary.locales[locale].stale += 1;
      }
      if (candidate.usesFallbackFields) {
        summary.locales[locale].withFallback += 1;
      }
    }
  }

  return summary;
}

function toManifestCandidate(candidate, resolvedRoot) {
  return {
    kind: candidate.kind,
    locale: candidate.locale,
    exists: candidate.exists,
    usable: candidate.usable,
    valid: candidate.valid,
    stale: candidate.stale,
    reviewStatus: candidate.reviewStatus,
    qaStatus: candidate.qaStatus,
    sourcePath: candidate.sourcePath ? toPosixRelativePath(resolvedRoot, candidate.sourcePath) : null,
    outputHash: candidate.outputHash,
    derivedFrom: candidate.derivedFrom,
    provider: candidate.provider,
    translatedAt: candidate.translatedAt,
    notes: candidate.notes,
    issues: candidate.issues,
    fallbackBaseVariant: candidate.fallbackBaseVariant ?? null,
    usesFallbackFields: candidate.usesFallbackFields ?? false,
    fallbackFieldCount: candidate.fallbackFieldCount ?? 0,
    fallbackFieldPaths: candidate.fallbackFieldPaths ?? [],
  };
}

export function generateContentVariantBundle(repoRoot = defaultRepoRoot, options = {}) {
  const resolvedRoot = path.resolve(repoRoot);
  const paths = getRepoPaths(resolvedRoot);
  const writeFiles = options.writeFiles ?? true;
  const locales = getLocaleDirectories(paths.i18nRoot).filter((locale) => locale !== canonicalLocale);
  const conceptCatalog = readJson(paths.catalogPath);
  const editorialManifest = loadEditorialManifest(paths.editorialManifestPath);
  const problems = [];
  const concepts = {};
  const optimizedBundle = {};
  const optimizedUiCopyBundle = {};
  const orphanOptimizedFiles = [];
  const knownConceptSlugs = new Set(conceptCatalog.map((entry) => entry.slug));

  if (fs.existsSync(paths.optimizedRoot)) {
    for (const fileName of fs.readdirSync(paths.optimizedRoot).filter((value) => value.endsWith(".json"))) {
      const slug = fileName.replace(/\.json$/u, "");
      if (!knownConceptSlugs.has(slug)) {
        orphanOptimizedFiles.push(slug);
      }
    }
  }

  if (orphanOptimizedFiles.length > 0) {
    problems.push(
      `Found optimized overlays without matching canonical concepts: ${orphanOptimizedFiles.join(", ")}.`,
    );
  }

  for (const [slug] of Object.entries(editorialManifest.concepts)) {
    if (!knownConceptSlugs.has(slug)) {
      problems.push(`Editorial metadata exists for unknown concept "${slug}".`);
    }
  }

  for (const conceptMetadata of conceptCatalog) {
    const canonicalSourcePath = path.join(paths.conceptsRoot, `${conceptMetadata.contentFile}.json`);
    const canonicalConcept = readJson(canonicalSourcePath);
    const canonicalOverlay = buildConceptEditorialOverlaySource(conceptMetadata, canonicalConcept);
    const canonicalSourceHash = sha256Json(canonicalOverlay);
    const editorialEntry = isPlainObject(editorialManifest.concepts[conceptMetadata.slug])
      ? editorialManifest.concepts[conceptMetadata.slug]
      : {};
    const optimizedCandidate = buildVariantCandidate({
      kind: "optimized",
      locale: canonicalLocale,
      variantFilePath: path.join(paths.optimizedRoot, `${conceptMetadata.slug}.json`),
      canonicalOverlay,
      fallbackProvider: null,
      fallbackTranslatedAt: null,
      defaultRecordedSourceHash: canonicalSourceHash,
      currentSourceHash: canonicalSourceHash,
      metadataOverride: editorialEntry.optimized,
    });
    const localeCandidates = {};

    if (optimizedCandidate.usable && optimizedCandidate.overlay) {
      optimizedBundle[conceptMetadata.slug] = optimizedCandidate.overlay;
      optimizedUiCopyBundle[conceptMetadata.slug] = buildOptimizedConceptUiCopy(
        optimizedCandidate.overlay,
      );
    }

    for (const locale of locales) {
      const localeManifestPath = path.join(paths.i18nRoot, locale, "manifest.json");
      const localeManifest = readJsonIfExists(localeManifestPath);
      const manifestEntry =
        localeManifest?.entries?.[`${translationManifestPrefix}${conceptMetadata.slug}`] ?? null;
      const localeOverride = editorialEntry.locales?.[locale];
      const requestedBaseVariant =
        isPlainObject(localeOverride?.derivedFrom) &&
        localeOverride.derivedFrom.variant === "optimized"
          ? "optimized"
          : "original";
      const currentSourceHash =
        requestedBaseVariant === "optimized" && optimizedCandidate.outputHash
          ? optimizedCandidate.outputHash
          : canonicalSourceHash;

      localeCandidates[locale] = buildVariantCandidate({
        kind: "localized",
        locale,
        variantFilePath: path.join(paths.i18nRoot, locale, "concepts", `${conceptMetadata.slug}.json`),
        canonicalOverlay,
        fallbackProvider: typeof manifestEntry?.provider === "string" ? manifestEntry.provider : null,
        fallbackTranslatedAt:
          typeof manifestEntry?.translatedAt === "string" ? manifestEntry.translatedAt : null,
        defaultRecordedSourceHash: canonicalSourceHash,
        currentSourceHash,
        metadataOverride: localeOverride,
        translationManifestEntry: manifestEntry,
      });

      if (localeCandidates[locale].usable && localeCandidates[locale].overlay) {
        const fallbackFieldPaths = collectMissingOverlayLeafPaths(
          canonicalOverlay,
          localeCandidates[locale].overlay,
        );
        const fallbackBaseVariant = optimizedCandidate.usable ? "optimized" : "original";

        localeCandidates[locale] = {
          ...localeCandidates[locale],
          fallbackBaseVariant,
          usesFallbackFields: fallbackFieldPaths.length > 0,
          fallbackFieldCount: fallbackFieldPaths.length,
          fallbackFieldPaths: fallbackFieldPaths.slice(0, 25),
          notes:
            fallbackFieldPaths.length > 0 &&
            fallbackBaseVariant === "optimized" &&
            localeCandidates[locale].derivedFrom.variant !== "optimized"
              ? [
                  ...localeCandidates[locale].notes,
                  "This locale overlay inherits missing fields from optimized English at runtime, but stale detection still follows canonical English because derivedFrom.variant is not set to optimized.",
                ]
              : localeCandidates[locale].notes,
        };
      }
    }

    concepts[conceptMetadata.slug] = {
      id: conceptMetadata.id,
      slug: conceptMetadata.slug,
      title: conceptMetadata.title,
      canonicalLocale,
      canonicalSourcePath: toPosixRelativePath(resolvedRoot, canonicalSourcePath),
      canonicalSourceHash,
      subject: conceptMetadata.subject,
      topic: conceptMetadata.topic,
      subtopic: conceptMetadata.subtopic ?? null,
      tags: Array.isArray(conceptMetadata.tags) ? conceptMetadata.tags : [],
      prerequisites: Array.isArray(conceptMetadata.prerequisites) ? conceptMetadata.prerequisites : [],
      related: Array.isArray(conceptMetadata.related) ? conceptMetadata.related : [],
      simulationKind: conceptMetadata.simulationKind,
      hasInteractiveSimulation: Boolean(canonicalConcept.simulation),
      hasOptimizedEnglish: optimizedCandidate.exists,
      availableLocales: locales.filter((locale) => localeCandidates[locale]?.exists),
      optimized: toManifestCandidate(optimizedCandidate, resolvedRoot),
      locales: Object.fromEntries(
        Object.entries(localeCandidates).map(([locale, candidate]) => [
          locale,
          toManifestCandidate(candidate, resolvedRoot),
        ]),
      ),
    };
  }

  const conceptEntries = Object.values(concepts);
  const previousManifest = readJsonIfExists(paths.generatedManifestPath);
  const manifestBody = {
    version: 1,
    canonicalLocale,
    locales,
    summary: summarizeCandidates(conceptEntries, locales),
    problems,
    concepts,
  };
  const previousManifestBody = previousManifest
    ? {
        version: previousManifest.version,
        canonicalLocale: previousManifest.canonicalLocale,
        locales: previousManifest.locales,
        summary: previousManifest.summary,
        problems: previousManifest.problems,
        concepts: previousManifest.concepts,
      }
    : null;
  const manifestGeneratedAt =
    previousManifestBody && stableStringify(previousManifestBody) === stableStringify(manifestBody)
      ? previousManifest.generatedAt
      : new Date().toISOString();
  const manifest = {
    version: manifestBody.version,
    generatedAt: manifestGeneratedAt,
    canonicalLocale: manifestBody.canonicalLocale,
    locales: manifestBody.locales,
    summary: manifestBody.summary,
    problems: manifestBody.problems,
    concepts: manifestBody.concepts,
  };

  if (writeFiles) {
    writeJson(paths.generatedManifestPath, manifest);
    writeJson(paths.generatedOptimizedPath, optimizedBundle);
    writeJson(paths.generatedOptimizedUiCopyPath, optimizedUiCopyBundle);
  }

  return {
    manifest,
    optimizedBundle,
    optimizedUiCopyBundle,
    outputPaths: {
      manifest: paths.generatedManifestPath,
      optimizedConcepts: paths.generatedOptimizedPath,
      optimizedConceptUiCopy: paths.generatedOptimizedUiCopyPath,
    },
  };
}

if (process.argv[1] === __filename) {
  const result = generateContentVariantBundle(process.argv[2], { writeFiles: true });
  console.log(
    `Generated ${path.relative(path.resolve(process.argv[2] ?? defaultRepoRoot), result.outputPaths.manifest)}, ${path.relative(path.resolve(process.argv[2] ?? defaultRepoRoot), result.outputPaths.optimizedConcepts)}, and ${path.relative(path.resolve(process.argv[2] ?? defaultRepoRoot), result.outputPaths.optimizedConceptUiCopy)}.`,
  );
}
