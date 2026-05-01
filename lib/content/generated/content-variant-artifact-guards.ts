import type { ConceptContent } from "@/lib/content";
import type { DeepPartial } from "@/lib/i18n/content-translations";
import type { ConceptVariantManifest } from "@/lib/content/variant-types";

export type OptimizedConceptUiCopy = Pick<
  ConceptContent,
  "title" | "shortTitle" | "summary" | "highlights" | "subtopic"
> & {
  recommendedNext?: Array<{
    slug: string;
    reasonLabel?: string;
  }>;
  challengeMode?: {
    items: Array<{
      id: string;
      title?: string;
      prompt?: string;
    }>;
  };
};

function failGeneratedArtifact(message: string): never {
  throw new Error(`${message} Run \`pnpm content:registry\` to refresh generated content artifacts.`);
}

export function assertConceptVariantManifest(value: unknown): ConceptVariantManifest {
  if (
    typeof value !== "object" ||
    value === null ||
    (value as { version?: unknown }).version !== 1 ||
    typeof (value as { concepts?: unknown }).concepts !== "object" ||
    (value as { concepts?: unknown }).concepts === null
  ) {
    failGeneratedArtifact("Generated concept variant manifest is missing or malformed.");
  }

  return value as ConceptVariantManifest;
}

export function assertOptimizedConceptOverlays(
  value: unknown,
): Record<string, DeepPartial<ConceptContent>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    failGeneratedArtifact("Generated optimized concept overlay bundle is missing or malformed.");
  }

  return value as Record<string, DeepPartial<ConceptContent>>;
}

export function assertOptimizedConceptUiCopy(
  value: unknown,
): Record<string, OptimizedConceptUiCopy> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    failGeneratedArtifact("Generated optimized concept UI copy bundle is missing or malformed.");
  }

  return value as Record<string, OptimizedConceptUiCopy>;
}
