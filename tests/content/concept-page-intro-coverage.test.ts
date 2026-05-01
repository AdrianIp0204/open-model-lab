import { describe, expect, it } from "vitest";
import { getAllConceptMetadata, getAllConcepts } from "@/lib/content";

describe("concept page intro coverage", () => {
  it("keeps authored pageIntro definition and key takeaway on every published concept", () => {
    const publishedMetadata = getAllConceptMetadata().filter((concept) => concept.published);
    const conceptsBySlug = new Map(getAllConcepts().map((concept) => [concept.slug, concept]));
    const missingFields: Array<{
      slug: string;
      missing: string[];
    }> = [];

    for (const metadata of publishedMetadata) {
      const concept = conceptsBySlug.get(metadata.slug);

      if (!concept) {
        throw new Error(`Missing concept content for published slug ${metadata.slug}.`);
      }

      const missing: string[] = [];

      if (!concept.pageIntro?.definition?.trim()) {
        missing.push("pageIntro.definition");
      }

      if (!concept.pageIntro?.keyTakeaway?.trim()) {
        missing.push("pageIntro.keyTakeaway");
      }

      if (missing.length) {
        missingFields.push({
          slug: metadata.slug,
          missing,
        });
      }
    }

    expect(missingFields).toEqual([]);
  });

  it("keeps the guided-start source canonical across the published catalog", () => {
    const invalidSources = getAllConcepts().flatMap((concept) => {
      const hasStarterSequence =
        (concept.simulation.ui?.starterExploreTasks?.length ?? 0) > 0;
      const hasPromptFallback = (concept.noticePrompts.items.length ?? 0) > 0;

      if (hasStarterSequence || hasPromptFallback) {
        return [];
      }

      return [concept.slug];
    });

    expect(invalidSources).toEqual([]);
  });
});
