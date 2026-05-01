import type { ConceptContent, ConceptSummary } from "@/lib/content";
import type { DeepPartial } from "@/lib/i18n/content-translations";
import {
  buildConceptEditorialOverlaySource as buildConceptEditorialOverlaySourceUntyped,
  collectIgnoredOverlayPaths as collectIgnoredOverlayPathsUntyped,
  collectMissingOverlayLeafPaths as collectMissingOverlayLeafPathsUntyped,
  isPlainObject as isPlainObjectUntyped,
  sanitizeOverlayAgainstCanonical as sanitizeOverlayAgainstCanonicalUntyped,
} from "./editorial-overlays.mjs";

type ConceptMetadataOverlaySource = {
  title?: ConceptSummary["title"];
  shortTitle?: ConceptSummary["shortTitle"];
  summary?: ConceptSummary["summary"];
  highlights?: ConceptSummary["highlights"];
  topic?: ConceptSummary["topic"];
  subtopic?: ConceptSummary["subtopic"];
  recommendedNext?: ConceptContent["recommendedNext"];
};

export function buildConceptEditorialOverlaySource(
  conceptMetadata: (Record<string, unknown> & Partial<ConceptMetadataOverlaySource>) | null | undefined,
  conceptContent: Partial<ConceptContent>,
) {
  return buildConceptEditorialOverlaySourceUntyped(
    conceptMetadata,
    conceptContent,
  ) as DeepPartial<ConceptContent>;
}

export function sanitizeOverlayAgainstCanonical(
  overlay: unknown,
  canonical: DeepPartial<ConceptContent>,
) {
  return sanitizeOverlayAgainstCanonicalUntyped(
    overlay,
    canonical,
  ) as DeepPartial<ConceptContent> | undefined;
}

export function collectMissingOverlayLeafPaths(
  canonical: DeepPartial<ConceptContent>,
  overlay: DeepPartial<ConceptContent> | undefined,
) {
  return collectMissingOverlayLeafPathsUntyped(canonical, overlay) as string[];
}

export function collectIgnoredOverlayPaths(
  overlay: unknown,
  canonical: DeepPartial<ConceptContent>,
  pathSegments: string[] = [],
) {
  return collectIgnoredOverlayPathsUntyped(overlay, canonical, pathSegments) as string[];
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return isPlainObjectUntyped(value) as boolean;
}
