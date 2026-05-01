import { describe, expect, it } from "vitest";
import { getAllConcepts } from "@/lib/content";
import { hasConceptQuizSupport } from "@/lib/quiz";
import {
  buildConceptTestCatalogEntriesFromConcepts,
  buildTestCatalog,
  getPublishedConceptTestCatalog,
} from "@/lib/test-hub";

describe("test hub catalog", () => {
  it("includes every published concept with quiz support", () => {
    const catalog = getPublishedConceptTestCatalog();
    const publishedQuizConcepts = getAllConcepts().filter((concept) =>
      hasConceptQuizSupport(concept),
    );

    expect(catalog.entries.map((entry) => entry.conceptSlug)).toEqual(
      publishedQuizConcepts.map((concept) => concept.slug),
    );
  });

  it("excludes unpublished concepts when catalog entries are built from mixed content", () => {
    const concept = getAllConcepts()[0]!;
    const entries = buildConceptTestCatalogEntriesFromConcepts([
      concept,
      {
        ...concept,
        id: "draft-concept-id",
        slug: "draft-concept",
        title: "Draft concept",
        published: false,
      },
    ]);

    expect(entries.map((entry) => entry.conceptSlug)).toEqual([concept.slug]);
  });

  it("uses same-topic progression before falling back to the next global test", () => {
    const concept = getAllConcepts()[0]!;
    const catalog = buildTestCatalog(
      buildConceptTestCatalogEntriesFromConcepts([
        {
          ...concept,
          slug: "topic-a-first",
          title: "Topic A First",
          topic: "Topic A",
        },
        {
          ...concept,
          slug: "topic-b-only",
          title: "Topic B Only",
          topic: "Topic B",
        },
        {
          ...concept,
          slug: "topic-a-second",
          title: "Topic A Second",
          topic: "Topic A",
        },
        {
          ...concept,
          slug: "topic-c-last",
          title: "Topic C Last",
          topic: "Topic C",
        },
      ]),
    );

    expect(catalog.nextByConceptSlug.get("topic-a-first")?.conceptSlug).toBe(
      "topic-a-second",
    );
    expect(catalog.nextByConceptSlug.get("topic-a-second")?.conceptSlug).toBe(
      "topic-c-last",
    );
    expect(catalog.nextByConceptSlug.get("topic-c-last")).toBeNull();
  });

  it("uses the standalone concept-test route for test-oriented entry points", () => {
    const catalog = getPublishedConceptTestCatalog();

    for (const entry of catalog.entries) {
      expect(entry.testHref).toBe(`/tests/concepts/${entry.conceptSlug}`);
      expect(entry.testHref).not.toContain("phase=");
    }
  });
});
