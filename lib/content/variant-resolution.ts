import type { ConceptContent } from "@/lib/content";
import type { DeepPartial } from "@/lib/i18n/content-translations";
import type {
  ConceptFallbackAttempt,
  ConceptVariantCandidateMetadata,
  ConceptVariantManifest,
  ResolvedConceptContentMetadata,
} from "@/lib/content/variant-types";

type LocalizedConceptOverlayBundle = {
  concepts?: Record<string, DeepPartial<ConceptContent>>;
};

type ResolveConceptVariantSelectionInput = {
  concept: ConceptContent;
  requestedLocale: string;
  manifest: ConceptVariantManifest;
  optimizedConceptOverlays: Record<string, DeepPartial<ConceptContent>>;
  localizedConceptOverlaysByLocale: Partial<Record<string, LocalizedConceptOverlayBundle>>;
};

type ResolvedVariantCandidate = {
  kind: "original" | "optimized" | "localized";
  locale: string;
  usable: boolean;
  overlay: DeepPartial<ConceptContent> | null;
  sourcePath: string | null;
  outputHash: string | null;
  stale: boolean;
  reviewStatus: ResolvedConceptContentMetadata["reviewStatus"];
  qaStatus: ResolvedConceptContentMetadata["qaStatus"];
  notes: string[];
  issues: string[];
  derivedFrom: ResolvedConceptContentMetadata["derivedFrom"];
  fallbackBaseVariant: ResolvedConceptContentMetadata["fallbackBaseVariant"];
  usesFallbackFields: ResolvedConceptContentMetadata["usesFallbackFields"];
  fallbackFieldCount: ResolvedConceptContentMetadata["fallbackFieldCount"];
  fallbackFieldPaths: ResolvedConceptContentMetadata["fallbackFieldPaths"];
  skippedReason: string | null;
};

export type ResolvedConceptVariantSelection = {
  optimizedOverlay: DeepPartial<ConceptContent> | null;
  localizedOverlay: DeepPartial<ConceptContent> | null;
  metadata: ResolvedConceptContentMetadata;
};

function buildOriginalCandidate(
  concept: ConceptContent,
  entry: ConceptVariantManifest["concepts"][string] | undefined,
): ResolvedVariantCandidate {
  return {
    kind: "original",
    locale: "en",
    usable: true,
    overlay: null,
    sourcePath: entry?.canonicalSourcePath ?? `content/concepts/${concept.slug}.json`,
    outputHash: entry?.canonicalSourceHash ?? "",
    stale: false,
    reviewStatus: "approved",
    qaStatus: "pass",
    notes: [],
    issues: [],
    derivedFrom: null,
    fallbackBaseVariant: null,
    usesFallbackFields: false,
    fallbackFieldCount: 0,
    fallbackFieldPaths: [],
    skippedReason: null,
  };
}

function buildDerivedCandidate(
  kind: "optimized" | "localized",
  locale: string,
  candidate: ConceptVariantCandidateMetadata | null | undefined,
  overlay: DeepPartial<ConceptContent> | undefined,
  missingReason: string,
): ResolvedVariantCandidate {
  if (!candidate?.exists && overlay) {
    return {
      kind,
      locale,
      usable: true,
      overlay,
      sourcePath: null,
      outputHash: null,
      stale: false,
      reviewStatus: kind === "localized" ? "ai-generated" : "draft",
      qaStatus: "unknown",
      notes: [],
      issues: [],
      derivedFrom: null,
      fallbackBaseVariant: null,
      usesFallbackFields: false,
      fallbackFieldCount: 0,
      fallbackFieldPaths: [],
      skippedReason: null,
    };
  }

  if (!candidate?.exists) {
    return {
      kind,
      locale,
      usable: false,
      overlay: null,
      sourcePath: null,
      outputHash: null,
      stale: false,
      reviewStatus: kind === "optimized" ? "draft" : "draft",
      qaStatus: "unknown",
      notes: [],
      issues: [],
      derivedFrom: candidate?.derivedFrom ?? null,
      fallbackBaseVariant: candidate?.fallbackBaseVariant ?? null,
      usesFallbackFields: candidate?.usesFallbackFields ?? false,
      fallbackFieldCount: candidate?.fallbackFieldCount ?? 0,
      fallbackFieldPaths: candidate?.fallbackFieldPaths ?? [],
      skippedReason: missingReason,
    };
  }

  if (!candidate.usable) {
    return {
      kind,
      locale,
      usable: false,
      overlay: null,
      sourcePath: candidate.sourcePath,
      outputHash: candidate.outputHash,
      stale: candidate.stale,
      reviewStatus: candidate.reviewStatus,
      qaStatus: candidate.qaStatus,
      notes: candidate.notes,
      issues: candidate.issues,
      derivedFrom: candidate.derivedFrom,
      fallbackBaseVariant: candidate.fallbackBaseVariant ?? null,
      usesFallbackFields: candidate.usesFallbackFields ?? false,
      fallbackFieldCount: candidate.fallbackFieldCount ?? 0,
      fallbackFieldPaths: candidate.fallbackFieldPaths ?? [],
      skippedReason:
        candidate.issues[0] ??
        `${kind === "optimized" ? "Optimized" : "Localized"} content is invalid.`,
    };
  }

  if (!overlay) {
    return {
      kind,
      locale,
      usable: false,
      overlay: null,
      sourcePath: candidate.sourcePath,
      outputHash: candidate.outputHash,
      stale: candidate.stale,
      reviewStatus: candidate.reviewStatus,
      qaStatus: candidate.qaStatus,
      notes: candidate.notes,
      issues: candidate.issues,
      derivedFrom: candidate.derivedFrom,
      fallbackBaseVariant: candidate.fallbackBaseVariant ?? null,
      usesFallbackFields: candidate.usesFallbackFields ?? false,
      fallbackFieldCount: candidate.fallbackFieldCount ?? 0,
      fallbackFieldPaths: candidate.fallbackFieldPaths ?? [],
      skippedReason: "Generated overlay data is missing for this variant.",
    };
  }

  return {
    kind,
    locale,
    usable: true,
    overlay,
    sourcePath: candidate.sourcePath,
    outputHash: candidate.outputHash,
    stale: candidate.stale,
    reviewStatus: candidate.reviewStatus,
    qaStatus: candidate.qaStatus,
    notes: candidate.notes,
    issues: candidate.issues,
    derivedFrom: candidate.derivedFrom,
    fallbackBaseVariant: candidate.fallbackBaseVariant ?? null,
    usesFallbackFields: candidate.usesFallbackFields ?? false,
    fallbackFieldCount: candidate.fallbackFieldCount ?? 0,
    fallbackFieldPaths: candidate.fallbackFieldPaths ?? [],
    skippedReason: null,
  };
}

function toFallbackAttempt(candidate: ResolvedVariantCandidate, status: "used" | "skipped"): ConceptFallbackAttempt {
  return {
    kind: candidate.kind,
    locale: candidate.locale,
    status,
    sourcePath: candidate.sourcePath,
    reason: status === "used" ? null : candidate.skippedReason,
    stale: candidate.stale,
    reviewStatus: candidate.reviewStatus,
    qaStatus: candidate.qaStatus,
    issues: candidate.issues,
    fallbackBaseVariant: candidate.fallbackBaseVariant,
    usesFallbackFields: candidate.usesFallbackFields,
    fallbackFieldCount: candidate.fallbackFieldCount,
    fallbackFieldPaths: candidate.fallbackFieldPaths,
  };
}

export function resolveConceptVariantSelection(
  input: ResolveConceptVariantSelectionInput,
): ResolvedConceptVariantSelection {
  const { concept, requestedLocale, manifest, optimizedConceptOverlays, localizedConceptOverlaysByLocale } =
    input;
  const entry = manifest.concepts[concept.slug];
  const optimizedCandidate = buildDerivedCandidate(
    "optimized",
    "en",
    entry?.optimized,
    optimizedConceptOverlays[concept.slug],
    "No optimized English content exists.",
  );
  const localizedCandidate =
    requestedLocale === "en"
      ? null
      : buildDerivedCandidate(
          "localized",
          requestedLocale,
          entry?.locales?.[requestedLocale],
          localizedConceptOverlaysByLocale[requestedLocale]?.concepts?.[concept.slug],
          `No localized content exists for ${requestedLocale}.`,
        );
  const originalCandidate = buildOriginalCandidate(concept, entry);
  const candidates =
    requestedLocale === "en"
      ? [optimizedCandidate, originalCandidate]
      : [localizedCandidate, optimizedCandidate, originalCandidate].filter(
          (candidate): candidate is ResolvedVariantCandidate => Boolean(candidate),
        );

  const fallbackChain: ConceptFallbackAttempt[] = [];
  let selectedCandidate = originalCandidate;

  for (const candidate of candidates) {
    if (candidate.usable) {
      selectedCandidate = candidate;
      fallbackChain.push(toFallbackAttempt(candidate, "used"));
      break;
    }

    fallbackChain.push(toFallbackAttempt(candidate, "skipped"));
  }

  const localizedOverlay =
    selectedCandidate.kind === "localized" ? selectedCandidate.overlay : null;
  const optimizedOverlay =
    requestedLocale === "en"
      ? selectedCandidate.kind === "optimized"
        ? optimizedCandidate.overlay
        : null
      : optimizedCandidate.usable
        ? optimizedCandidate.overlay
        : null;
  const fallbackReason =
    fallbackChain.find((attempt) => attempt.status === "skipped")?.reason ?? null;

  return {
    optimizedOverlay,
    localizedOverlay,
    metadata: {
      conceptId: concept.id,
      slug: concept.slug,
      title: entry?.title ?? concept.title,
      canonicalLocale: "en",
      requestedLocale,
      resolvedLocale: selectedCandidate.kind === "localized" ? requestedLocale : "en",
      resolvedVariant: selectedCandidate.kind,
      sourcePath: selectedCandidate.sourcePath ?? entry?.canonicalSourcePath ?? "",
      canonicalSourcePath: entry?.canonicalSourcePath ?? selectedCandidate.sourcePath ?? "",
      canonicalSourceHash: entry?.canonicalSourceHash ?? "",
      resolvedSourceHash:
        selectedCandidate.kind === "original"
          ? entry?.canonicalSourceHash ?? ""
          : selectedCandidate.outputHash ?? "",
      hasOptimizedEnglish: entry?.hasOptimizedEnglish ?? optimizedCandidate.usable,
      availableLocales: entry?.availableLocales ?? [],
      stale: selectedCandidate.stale,
      reviewStatus: selectedCandidate.reviewStatus,
      qaStatus: selectedCandidate.qaStatus,
      notes: selectedCandidate.notes,
      issues: selectedCandidate.issues,
      derivedFrom: selectedCandidate.derivedFrom,
      fallbackBaseVariant: selectedCandidate.fallbackBaseVariant,
      usesFallbackFields: selectedCandidate.usesFallbackFields,
      fallbackFieldCount: selectedCandidate.fallbackFieldCount,
      fallbackFieldPaths: selectedCandidate.fallbackFieldPaths,
      fallbackReason,
      fallbackChain,
    },
  };
}
