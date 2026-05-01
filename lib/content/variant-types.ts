export const contentReviewStatuses = [
  "draft",
  "ai-generated",
  "human-reviewed",
  "approved",
] as const;

export const contentQaStatuses = [
  "unknown",
  "pass",
  "warning",
  "fail",
] as const;

export const contentVariantKinds = [
  "original",
  "optimized",
  "localized",
] as const;

export type ContentReviewStatus = (typeof contentReviewStatuses)[number];
export type ContentQaStatus = (typeof contentQaStatuses)[number];
export type ContentVariantKind = (typeof contentVariantKinds)[number];

export type ConceptDerivedFromMetadata = {
  variant: Extract<ContentVariantKind, "original" | "optimized">;
  locale: string;
  recordedSourceHash: string | null;
  currentSourceHash: string | null;
};

export type ConceptVariantCandidateMetadata = {
  kind: Extract<ContentVariantKind, "optimized" | "localized">;
  locale: string;
  exists: boolean;
  usable: boolean;
  valid: boolean;
  stale: boolean;
  reviewStatus: ContentReviewStatus;
  qaStatus: ContentQaStatus;
  sourcePath: string | null;
  outputHash: string | null;
  derivedFrom: ConceptDerivedFromMetadata;
  provider: string | null;
  translatedAt: string | null;
  notes: string[];
  issues: string[];
  fallbackBaseVariant: Extract<ContentVariantKind, "original" | "optimized"> | null;
  usesFallbackFields: boolean;
  fallbackFieldCount: number;
  fallbackFieldPaths: string[];
};

export type ConceptVariantManifestEntry = {
  id: string;
  slug: string;
  title: string;
  canonicalLocale: "en";
  canonicalSourcePath: string;
  canonicalSourceHash: string;
  subject: string;
  topic: string;
  subtopic: string | null;
  tags: string[];
  prerequisites: string[];
  related: string[];
  simulationKind: string;
  hasInteractiveSimulation: boolean;
  hasOptimizedEnglish: boolean;
  availableLocales: string[];
  optimized: ConceptVariantCandidateMetadata | null;
  locales: Record<string, ConceptVariantCandidateMetadata>;
};

export type ConceptVariantSummary = {
  canonicalConceptCount: number;
  optimized: {
    detected: number;
    usable: number;
    invalid: number;
    stale: number;
    missing: number;
  };
  locales: Record<
    string,
    {
      detected: number;
      usable: number;
      invalid: number;
      stale: number;
      withFallback: number;
      missing: number;
    }
  >;
};

export type ConceptVariantManifest = {
  version: 1;
  generatedAt: string;
  canonicalLocale: "en";
  locales: string[];
  summary: ConceptVariantSummary;
  problems: string[];
  concepts: Record<string, ConceptVariantManifestEntry>;
};

export type ConceptFallbackAttempt = {
  kind: ContentVariantKind;
  locale: string;
  status: "used" | "skipped";
  sourcePath: string | null;
  reason: string | null;
  stale: boolean;
  reviewStatus: ContentReviewStatus;
  qaStatus: ContentQaStatus;
  issues: string[];
  fallbackBaseVariant: Extract<ContentVariantKind, "original" | "optimized"> | null;
  usesFallbackFields: boolean;
  fallbackFieldCount: number;
  fallbackFieldPaths: string[];
};

export type ResolvedConceptContentMetadata = {
  conceptId: string;
  slug: string;
  title: string;
  canonicalLocale: "en";
  requestedLocale: string;
  resolvedLocale: string;
  resolvedVariant: ContentVariantKind;
  sourcePath: string;
  canonicalSourcePath: string;
  canonicalSourceHash: string;
  resolvedSourceHash: string;
  hasOptimizedEnglish: boolean;
  availableLocales: string[];
  stale: boolean;
  reviewStatus: ContentReviewStatus;
  qaStatus: ContentQaStatus;
  notes: string[];
  issues: string[];
  derivedFrom: ConceptDerivedFromMetadata | null;
  fallbackBaseVariant: Extract<ContentVariantKind, "original" | "optimized"> | null;
  usesFallbackFields: boolean;
  fallbackFieldCount: number;
  fallbackFieldPaths: string[];
  fallbackReason: string | null;
  fallbackChain: ConceptFallbackAttempt[];
};
