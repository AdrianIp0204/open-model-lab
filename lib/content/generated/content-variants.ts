import optimizedConceptOverlaysData from "@/content/_meta/generated/optimized-concepts.json";
import conceptVariantManifestData from "@/content/_meta/generated/concept-variant-manifest.json";
import type { ConceptContent } from "@/lib/content";
import type { DeepPartial } from "@/lib/i18n/content-translations";
import {
  assertConceptVariantManifest,
  assertOptimizedConceptOverlays,
} from "./content-variant-artifact-guards";

export const optimizedConceptOverlays =
  assertOptimizedConceptOverlays(
    optimizedConceptOverlaysData,
  ) as Record<string, DeepPartial<ConceptContent>>;

export const conceptVariantManifest =
  assertConceptVariantManifest(conceptVariantManifestData);
