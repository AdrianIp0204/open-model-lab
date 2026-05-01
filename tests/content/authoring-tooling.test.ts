import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import {
  getAllConceptMetadata,
  getAllConcepts,
  getAuthorPreviewIndex,
  getStarterTracks,
  validateConceptBundle,
  validateConceptRegistry,
  validateStarterTrackCatalog,
  type StarterTrackMetadata,
} from "@/lib/content";

async function importScriptModule(relativePath: string) {
  return import(pathToFileURL(path.resolve(process.cwd(), relativePath)).href);
}

describe("authoring tooling", () => {
  it("builds a developer preview index for the current concepts and starter tracks", () => {
    const preview = getAuthorPreviewIndex();

    expect(preview.summary.conceptCount).toBe(getAllConceptMetadata().length);
    expect(preview.summary.trackCount).toBe(getStarterTracks().length);
    expect(preview.concepts[0]).toMatchObject({
      slug: "simple-harmonic-motion",
      previewHref: "/author-preview/concepts/simple-harmonic-motion",
    });
    expect(preview.starterTracks[0].conceptPreviewHrefs[0]).toBe(
      "/author-preview/concepts/vectors-components",
    );
  });

  it("rejects published metadata that points at unpublished read-next targets", () => {
    const metadata = getAllConceptMetadata();
    const alpha = {
      ...metadata[0],
      prerequisites: [],
      related: [],
      recommendedNext: [{ slug: metadata[1].slug }],
    };
    const beta = {
      ...metadata[1],
      published: false,
      status: "draft" as const,
      prerequisites: [],
      related: [],
      recommendedNext: [],
    };

    expect(() => validateConceptRegistry([alpha, beta])).toThrow(
      /unpublished recommendedNext concept/i,
    );
  });

  it("rejects prerequisite cycles in the canonical metadata graph", () => {
    const metadata = getAllConceptMetadata();
    const alpha = {
      ...metadata[0],
      sequence: undefined,
      prerequisites: [metadata[1].slug],
      related: [],
      recommendedNext: [],
    };
    const beta = {
      ...metadata[1],
      sequence: undefined,
      prerequisites: [metadata[0].slug],
      related: [],
      recommendedNext: [],
    };

    expect(() => validateConceptRegistry([alpha, beta])).toThrow(/prerequisite cycle/i);
  });

  it("rejects duplicate control params inside a concept", () => {
    const concepts = getAllConcepts({ includeUnpublished: true }).map((concept) =>
      structuredClone(concept),
    );
    const [firstControl, secondControl] = concepts[0].simulation.controls;

    concepts[0].simulation.controls = [
      firstControl,
      {
        ...secondControl,
        param: firstControl.param,
      },
      ...concepts[0].simulation.controls.slice(2),
    ];

    expect(() => validateConceptBundle(concepts, getAllConceptMetadata())).toThrow(
      /duplicate control param/i,
    );
  });

  it("rejects featured setups that reference missing setup presets", () => {
    const concepts = getAllConcepts({ includeUnpublished: true }).map((concept) =>
      structuredClone(concept),
    );

    concepts[0].pageFramework = {
      ...concepts[0].pageFramework,
      featuredSetups: [
        {
          id: "broken-featured-setup",
          label: "Broken featured setup",
          description: "Broken",
          setup: {
            presetId: "missing-preset",
          },
        },
      ],
    };

    expect(() => validateConceptBundle(concepts, getAllConceptMetadata())).toThrow(
      /featured setup "broken-featured-setup" references missing setup presetId "missing-preset"/i,
    );
  });

  it("rejects entry-guidance hints that reference unknown bench targets", () => {
    const concepts = getAllConcepts({ includeUnpublished: true }).map((concept) =>
      structuredClone(concept),
    );

    concepts[0].pageFramework = {
      ...concepts[0].pageFramework,
      entryGuidance: {
        firstAction: "Try the bench.",
        hints: [{ kind: "tool", id: "missing-tool" }],
      },
    };

    expect(() => validateConceptBundle(concepts, getAllConceptMetadata())).toThrow(
      /entry guidance hint "missing-tool" references unknown tool/i,
    );
  });

  it("rejects published concepts that omit required hero intro fields", () => {
    const concepts = getAllConcepts({ includeUnpublished: true }).map((concept) =>
      structuredClone(concept),
    );

    delete concepts[0].pageIntro?.definition;
    delete concepts[0].pageIntro?.keyTakeaway;

    expect(() => validateConceptBundle(concepts, getAllConceptMetadata())).toThrow(
      /must author pageIntro\.definition/i,
    );
  });

  it("rejects worked examples without a matching runtime builder", () => {
    const concepts = getAllConcepts({ includeUnpublished: true }).map((concept) =>
      structuredClone(concept),
    );

    concepts[0].sections.workedExamples.items = [
      {
        ...concepts[0].sections.workedExamples.items[0],
        id: "missing-runtime-builder",
      },
      ...concepts[0].sections.workedExamples.items.slice(1),
    ];

    expect(() => validateConceptBundle(concepts, getAllConceptMetadata())).toThrow(
      /Missing live worked-example builder/i,
    );
  });

  it("allows static worked examples without a matching runtime builder", () => {
    const concepts = getAllConcepts({ includeUnpublished: true }).map((concept) =>
      structuredClone(concept),
    );

    delete concepts[0].v2;
    concepts[0].sections.workedExamples.items = [
      {
        id: "static-without-runtime-builder",
        title: "Static authored walkthrough",
        prompt: "A fixed walkthrough can still explain the graph without live token interpolation.",
        variables: [
          {
            id: "initial-value",
            symbol: "y_0",
            label: "Initial value",
            valueKey: "3",
          },
        ],
        steps: [
          {
            id: "step-1",
            label: "1. Read the preset",
            template: "The authored walkthrough already fixes the values for this one case.",
          },
        ],
        resultLabel: "Result",
        resultTemplate: "The static walkthrough renders directly from the authored text.",
      },
    ];

    expect(() =>
      validateConceptBundle(concepts, getAllConceptMetadata(), {
        quizFallbackPolicy: "off",
      }),
    ).not.toThrow();
  });

  it("allows fallback-backed quiz sessions on unpublished concepts so author preview can still inspect drafts", () => {
    const concepts = getAllConcepts({ includeUnpublished: true }).map((concept) =>
      structuredClone(concept),
    );

    concepts[0] = {
      ...concepts[0],
      published: false,
      v2: undefined,
      quickTest: {
        ...concepts[0].quickTest,
        mode: "hybrid",
        questions: concepts[0].quickTest.questions.slice(0, 2),
        templates: [],
      },
    };

    expect(() =>
      validateConceptBundle(concepts, getAllConceptMetadata(), {
        quizFallbackPolicy: "published-only",
      }),
    ).not.toThrow();
  });

  it("still rejects fallback-backed quiz sessions for published concepts", () => {
    const concepts = getAllConcepts({ includeUnpublished: true }).map((concept) =>
      structuredClone(concept),
    );

    const targetIndex = concepts.findIndex(
      (concept) => concept.slug === "sorting-and-algorithmic-trade-offs",
    );

    concepts[targetIndex] = {
      ...concepts[targetIndex],
      published: true,
      quickTest: {
        ...concepts[targetIndex].quickTest,
        mode: "hybrid",
        questions: concepts[targetIndex].quickTest.questions.slice(0, 2),
        templates: [],
      },
    };

    expect(() =>
      validateConceptBundle(concepts, getAllConceptMetadata(), {
        quizFallbackPolicy: "published-only",
      }),
    ).toThrow(/fallback-backed quiz question/i);
  });

  it("rejects worked-example templates with unknown runtime tokens", () => {
    const concepts = getAllConcepts({ includeUnpublished: true }).map((concept) =>
      structuredClone(concept),
    );

    concepts[0].sections.workedExamples.items = [
      {
        ...concepts[0].sections.workedExamples.items[0],
        prompt: "Broken token {{notARealToken}}",
      },
      ...concepts[0].sections.workedExamples.items.slice(1),
    ];

    expect(() => validateConceptBundle(concepts, getAllConceptMetadata())).toThrow(
      /unknown token/i,
    );
  });

  it("rejects compare-specific challenges that never activate compare mode", () => {
    const concepts = getAllConcepts({ includeUnpublished: true }).map((concept) =>
      structuredClone(concept),
    );

    const challengeConcept = concepts.find((concept) => concept.challengeMode?.items.length);

    if (!challengeConcept?.challengeMode) {
      throw new Error("Expected at least one concept with challenge mode authoring.");
    }

    challengeConcept.challengeMode = {
      ...challengeConcept.challengeMode,
      items: [
        {
          ...challengeConcept.challengeMode.items[0],
          setup: {
            ...challengeConcept.challengeMode.items[0].setup,
            interactionMode: undefined,
          },
          checks: [
            {
              type: "compare-param-range" as const,
              label: "Broken compare setup",
              setup: "b",
              param: challengeConcept.simulation.controls[0].param,
              min: 0,
              max: 10,
            },
          ],
        },
        ...challengeConcept.challengeMode.items.slice(1),
      ],
    };

    expect(() => validateConceptBundle(concepts, getAllConceptMetadata())).toThrow(
      /compare-specific checks without entering compare mode/i,
    );
  });

  it("rejects starter tracks that place a prerequisite after the dependent concept", () => {
    const brokenTrack: StarterTrackMetadata = {
      id: "starter-track-broken-prereq-order",
      slug: "broken-prereq-order",
      title: "Broken prerequisite order",
      summary: "Broken",
      introduction: "Broken",
      sequenceRationale: "Broken",
      sequence: 99,
      accent: "teal",
      highlights: ["Broken"],
      conceptSlugs: ["wave-speed-wavelength", "simple-harmonic-motion"],
    };

    expect(() => validateStarterTrackCatalog([brokenTrack])).toThrow(
      /places "wave-speed-wavelength" before prerequisite "simple-harmonic-motion"/i,
    );
  });

  it("builds a subject-aware concept scaffold with the newer integration checklist", async () => {
    const { buildConceptScaffold } = await importScriptModule("scripts/scaffold-concept.mjs");
    const scaffold = buildConceptScaffold(
      {
        slug: "authoring-check",
        title: "Authoring Check",
        subject: "Computer Science",
        topic: "Algorithms and Search",
        simulationKind: "binary-search-halving",
        blank: true,
      },
      process.cwd(),
    );
    const metadata = JSON.parse(scaffold.files.catalogEntry);

    expect(metadata).toMatchObject({
      slug: "authoring-check",
      title: "Authoring Check",
      subject: "Computer Science",
      topic: "Algorithms and Search",
      simulationKind: "binary-search-halving",
    });
    expect(scaffold.files.readme).toMatch(/starter track/i);
    expect(scaffold.files.readme).toMatch(/goal path/i);
    expect(scaffold.files.readme).toMatch(/content:doctor/i);
    expect(scaffold.files.readme).toMatch(/lib\/content\/loaders\.ts/i);
  });

  it("builds a clean content doctor report for the current repo", async () => {
    const { buildContentDoctorReport } = await importScriptModule("scripts/content-doctor.mjs");
    const report = buildContentDoctorReport(process.cwd());

    expect(report.summary.subjects).toContain("Computer Science");
    expect(report.findings.errors).toEqual([]);
    expect(report.findings.warnings).toEqual([]);
  });
});
