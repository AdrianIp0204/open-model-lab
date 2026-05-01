// @vitest-environment node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ConceptContent } from "@/lib/content";

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function importScriptModule(relativePath: string) {
  return import(pathToFileURL(path.resolve(process.cwd(), relativePath)).href);
}

function buildManifestEntry(overrides?: Record<string, unknown>) {
  return {
    id: "concept-synthetic",
    slug: "synthetic-concept",
    title: "Original title",
    canonicalLocale: "en",
    canonicalSourcePath: "content/concepts/synthetic-concept.json",
    canonicalSourceHash: "canonical-hash",
    subject: "Physics",
    topic: "Mechanics",
    subtopic: null,
    tags: [],
    prerequisites: [],
    related: [],
    simulationKind: "shm",
    hasInteractiveSimulation: true,
    hasOptimizedEnglish: false,
    availableLocales: [],
    optimized: null,
    locales: {},
    ...overrides,
  };
}

function buildSyntheticConcept(): ConceptContent {
  return {
    id: "concept-synthetic",
    slug: "synthetic-concept",
    title: "Original title",
    shortTitle: "Original short title",
    summary: "Original summary",
    highlights: ["Original highlight"],
    topic: "Mechanics",
    subtopic: "Foundations",
    sections: {
      explanation: {
        paragraphs: ["Original explanation"],
      },
      workedExamples: {
        items: [],
      },
    },
    quickTest: {
      questions: [],
    },
    accessibility: {
      simulationDescription: {
        paragraphs: ["Original accessibility description"],
      },
      graphSummary: {
        paragraphs: ["Original graph summary"],
      },
    },
    simulation: {
      kind: "shm",
      controls: [],
      presets: [],
      overlays: [],
    },
    graphs: [],
    noticePrompts: {
      title: "What to notice",
      items: [],
    },
    predictionMode: {
      title: "Prediction mode",
      intro: "Original prediction intro",
      items: [],
    },
    recommendedNext: [
      {
        slug: "next-step",
        reasonLabel: "Original next-step reason",
      },
    ],
  } as unknown as ConceptContent;
}

beforeEach(() => {
  vi.resetModules();
});

describe("content variant runtime fallback", () => {
  it("uses optimized English for en when present and valid", async () => {
    vi.doMock("@/lib/content/generated/content-variants", () => ({
      optimizedConceptOverlays: {
        "synthetic-concept": {
          title: "Optimized title",
          summary: "Optimized summary",
        },
      },
      conceptVariantManifest: {
        version: 1,
        generatedAt: "2026-04-12T00:00:00.000Z",
        canonicalLocale: "en",
        locales: ["zh-HK"],
        summary: {
          canonicalConceptCount: 1,
          optimized: { detected: 1, usable: 1, invalid: 0, stale: 0, missing: 0 },
          locales: {
            "zh-HK": { detected: 0, usable: 0, invalid: 0, stale: 0, missing: 1 },
          },
        },
        problems: [],
        concepts: {
          "synthetic-concept": buildManifestEntry({
            hasOptimizedEnglish: true,
            optimized: {
              kind: "optimized",
              locale: "en",
              exists: true,
              usable: true,
              valid: true,
              stale: false,
              reviewStatus: "human-reviewed",
              qaStatus: "pass",
              sourcePath: "content/optimized/concepts/synthetic-concept.json",
              outputHash: "optimized-hash",
              derivedFrom: {
                variant: "original",
                locale: "en",
                recordedSourceHash: "canonical-hash",
                currentSourceHash: "canonical-hash",
              },
              provider: "manual",
              translatedAt: "2026-04-12T00:00:00.000Z",
              notes: [],
              issues: [],
            },
          }),
        },
      },
    }));
    vi.doMock("@/lib/i18n/generated/content-bundle", () => ({
      contentTranslationsByLocale: {
        "zh-HK": { catalog: {}, concepts: {} },
      },
    }));

    const { resolveConceptContentVariant } = await import("@/lib/i18n/concept-content");
    const result = resolveConceptContentVariant(buildSyntheticConcept(), "en");

    expect(result.content.title).toBe("Optimized title");
    expect(result.content.summary).toBe("Optimized summary");
    expect(result.metadata.resolvedVariant).toBe("optimized");
    expect(result.metadata.resolvedLocale).toBe("en");
  }, 10_000);

  it("falls back from localized to optimized to original safely", async () => {
    vi.doMock("@/lib/content/generated/content-variants", () => ({
      optimizedConceptOverlays: {
        "synthetic-concept": {
          title: "Optimized title",
          summary: "Optimized summary",
        },
      },
      conceptVariantManifest: {
        version: 1,
        generatedAt: "2026-04-12T00:00:00.000Z",
        canonicalLocale: "en",
        locales: ["zh-HK"],
        summary: {
          canonicalConceptCount: 1,
          optimized: { detected: 1, usable: 1, invalid: 0, stale: 0, missing: 0 },
          locales: {
            "zh-HK": { detected: 1, usable: 0, invalid: 1, stale: 0, missing: 0 },
          },
        },
        problems: [],
        concepts: {
          "synthetic-concept": buildManifestEntry({
            hasOptimizedEnglish: true,
            availableLocales: ["zh-HK"],
            optimized: {
              kind: "optimized",
              locale: "en",
              exists: true,
              usable: true,
              valid: true,
              stale: false,
              reviewStatus: "approved",
              qaStatus: "pass",
              sourcePath: "content/optimized/concepts/synthetic-concept.json",
              outputHash: "optimized-hash",
              derivedFrom: {
                variant: "original",
                locale: "en",
                recordedSourceHash: "canonical-hash",
                currentSourceHash: "canonical-hash",
              },
              provider: "manual",
              translatedAt: "2026-04-12T00:00:00.000Z",
              notes: [],
              issues: [],
            },
            locales: {
              "zh-HK": {
                kind: "localized",
                locale: "zh-HK",
                exists: true,
                usable: false,
                valid: false,
                stale: false,
                reviewStatus: "ai-generated",
                qaStatus: "warning",
                sourcePath: "content/i18n/zh-HK/concepts/synthetic-concept.json",
                outputHash: "localized-hash",
                derivedFrom: {
                  variant: "original",
                  locale: "en",
                  recordedSourceHash: "canonical-hash",
                  currentSourceHash: "canonical-hash",
                },
                provider: "ollama",
                translatedAt: "2026-04-12T00:00:00.000Z",
                notes: [],
                issues: ["Broken localized overlay"],
              },
            },
          }),
        },
      },
    }));
    vi.doMock("@/lib/i18n/generated/content-bundle", () => ({
      contentTranslationsByLocale: {
        "zh-HK": {
          catalog: {},
          concepts: {
            "synthetic-concept": {
              title: "Localized title",
            },
          },
        },
      },
    }));

    const { resolveConceptContentVariant } = await import("@/lib/i18n/concept-content");
    const optimizedFallback = resolveConceptContentVariant(buildSyntheticConcept(), "zh-HK");

    expect(optimizedFallback.content.title).toBe("Optimized title");
    expect(optimizedFallback.metadata.resolvedVariant).toBe("optimized");
    expect(optimizedFallback.metadata.fallbackReason).toBe("Broken localized overlay");
    expect(optimizedFallback.metadata.fallbackChain[0]).toMatchObject({
      kind: "localized",
      status: "skipped",
    });

    vi.resetModules();
    vi.doMock("@/lib/content/generated/content-variants", () => ({
      optimizedConceptOverlays: {},
      conceptVariantManifest: {
        version: 1,
        generatedAt: "2026-04-12T00:00:00.000Z",
        canonicalLocale: "en",
        locales: ["zh-HK"],
        summary: {
          canonicalConceptCount: 1,
          optimized: { detected: 0, usable: 0, invalid: 0, stale: 0, missing: 1 },
          locales: {
            "zh-HK": { detected: 0, usable: 0, invalid: 0, stale: 0, missing: 1 },
          },
        },
        problems: [],
        concepts: {
          "synthetic-concept": buildManifestEntry(),
        },
      },
    }));
    vi.doMock("@/lib/i18n/generated/content-bundle", () => ({
      contentTranslationsByLocale: {
        "zh-HK": { catalog: {}, concepts: {} },
      },
    }));

    const { resolveConceptContentVariant: resolveOriginal } = await import("@/lib/i18n/concept-content");
    const originalFallback = resolveOriginal(buildSyntheticConcept(), "zh-HK");

    expect(originalFallback.content.title).toBe("Original title");
    expect(originalFallback.metadata.resolvedVariant).toBe("original");
    expect(originalFallback.metadata.resolvedLocale).toBe("en");
  });

  it("falls back to original English for en when no optimized variant exists", async () => {
    vi.doMock("@/lib/content/generated/content-variants", () => ({
      optimizedConceptOverlays: {},
      conceptVariantManifest: {
        version: 1,
        generatedAt: "2026-04-12T00:00:00.000Z",
        canonicalLocale: "en",
        locales: ["zh-HK"],
        summary: {
          canonicalConceptCount: 1,
          optimized: { detected: 0, usable: 0, invalid: 0, stale: 0, missing: 1 },
          locales: {
            "zh-HK": { detected: 0, usable: 0, invalid: 0, stale: 0, missing: 1 },
          },
        },
        problems: [],
        concepts: {
          "synthetic-concept": buildManifestEntry(),
        },
      },
    }));
    vi.doMock("@/lib/i18n/generated/content-bundle", () => ({
      contentTranslationsByLocale: {
        "zh-HK": { catalog: {}, concepts: {} },
      },
    }));

    const { resolveConceptContentVariant } = await import("@/lib/i18n/concept-content");
    const result = resolveConceptContentVariant(buildSyntheticConcept(), "en");

    expect(result.content.title).toBe("Original title");
    expect(result.metadata.resolvedVariant).toBe("original");
    expect(result.metadata.fallbackChain[0]).toMatchObject({
      kind: "optimized",
      status: "skipped",
    });
  });

  it("uses localized content when present and falls back to optimized fields for untranslated copy", async () => {
    vi.doMock("@/lib/content/generated/content-variants", () => ({
      optimizedConceptOverlays: {
        "synthetic-concept": {
          summary: "Optimized summary",
        },
      },
      conceptVariantManifest: {
        version: 1,
        generatedAt: "2026-04-12T00:00:00.000Z",
        canonicalLocale: "en",
        locales: ["zh-HK"],
        summary: {
          canonicalConceptCount: 1,
          optimized: { detected: 1, usable: 1, invalid: 0, stale: 0, missing: 0 },
          locales: {
            "zh-HK": { detected: 1, usable: 1, invalid: 0, stale: 0, missing: 0 },
          },
        },
        problems: [],
        concepts: {
          "synthetic-concept": buildManifestEntry({
            hasOptimizedEnglish: true,
            availableLocales: ["zh-HK"],
            optimized: {
              kind: "optimized",
              locale: "en",
              exists: true,
              usable: true,
              valid: true,
              stale: false,
              reviewStatus: "approved",
              qaStatus: "pass",
              sourcePath: "content/optimized/concepts/synthetic-concept.json",
              outputHash: "optimized-hash",
              derivedFrom: {
                variant: "original",
                locale: "en",
                recordedSourceHash: "canonical-hash",
                currentSourceHash: "canonical-hash",
              },
              provider: "manual",
              translatedAt: "2026-04-12T00:00:00.000Z",
              notes: [],
              issues: [],
            },
            locales: {
              "zh-HK": {
                kind: "localized",
                locale: "zh-HK",
                exists: true,
                usable: true,
                valid: true,
                stale: false,
                reviewStatus: "human-reviewed",
                qaStatus: "pass",
                sourcePath: "content/i18n/zh-HK/concepts/synthetic-concept.json",
                outputHash: "localized-hash",
                derivedFrom: {
                  variant: "original",
                  locale: "en",
                  recordedSourceHash: "canonical-hash",
                  currentSourceHash: "canonical-hash",
                },
                provider: "manual-review",
                translatedAt: "2026-04-12T00:00:00.000Z",
                notes: [],
                issues: [],
                fallbackBaseVariant: "optimized",
                usesFallbackFields: true,
                fallbackFieldCount: 2,
                fallbackFieldPaths: [
                  "summary",
                  "recommendedNext.slug:next-step.reasonLabel",
                ],
              },
            },
          }),
        },
      },
    }));
    vi.doMock("@/lib/i18n/generated/content-bundle", () => ({
      contentTranslationsByLocale: {
        "zh-HK": {
          catalog: {},
          concepts: {
            "synthetic-concept": {
              title: "本地化標題",
            },
          },
        },
      },
    }));

    const { resolveConceptContentVariant } = await import("@/lib/i18n/concept-content");
    const result = resolveConceptContentVariant(buildSyntheticConcept(), "zh-HK");

    expect(result.content.title).toBe("本地化標題");
    expect(result.content.summary).toBe("Optimized summary");
    expect(result.metadata.resolvedVariant).toBe("localized");
    expect(result.metadata.resolvedLocale).toBe("zh-HK");
    expect(result.metadata.usesFallbackFields).toBe(true);
    expect(result.metadata.fallbackBaseVariant).toBe("optimized");
    expect(result.metadata.fallbackFieldCount).toBe(2);
    expect(result.metadata.fallbackFieldPaths).toEqual([
      "summary",
      "recommendedNext.slug:next-step.reasonLabel",
    ]);
  });

  it("preserves protected structural fields when overlays attempt to override them", async () => {
    vi.doMock("@/lib/content/generated/content-variants", () => ({
      optimizedConceptOverlays: {},
      conceptVariantManifest: {
        version: 1,
        generatedAt: "2026-04-12T00:00:00.000Z",
        canonicalLocale: "en",
        locales: ["zh-HK"],
        summary: {
          canonicalConceptCount: 1,
          optimized: { detected: 0, usable: 0, invalid: 0, stale: 0, missing: 1 },
          locales: {
            "zh-HK": {
              detected: 1,
              usable: 1,
              invalid: 0,
              stale: 0,
              withFallback: 0,
              missing: 0,
            },
          },
        },
        problems: [],
        concepts: {
          "synthetic-concept": buildManifestEntry({
            availableLocales: ["zh-HK"],
            locales: {
              "zh-HK": {
                kind: "localized",
                locale: "zh-HK",
                exists: true,
                usable: true,
                valid: true,
                stale: false,
                reviewStatus: "human-reviewed",
                qaStatus: "pass",
                sourcePath: "content/i18n/zh-HK/concepts/synthetic-concept.json",
                outputHash: "localized-hash",
                derivedFrom: {
                  variant: "original",
                  locale: "en",
                  recordedSourceHash: "canonical-hash",
                  currentSourceHash: "canonical-hash",
                },
                provider: "manual-review",
                translatedAt: "2026-04-12T00:00:00.000Z",
                notes: [],
                issues: [],
                fallbackBaseVariant: "original",
                usesFallbackFields: false,
                fallbackFieldCount: 0,
                fallbackFieldPaths: [],
              },
            },
          }),
        },
      },
    }));
    vi.doMock("@/lib/i18n/generated/content-bundle", () => ({
      contentTranslationsByLocale: {
        "zh-HK": {
          catalog: {},
          concepts: {
            "synthetic-concept": {
              title: "Localized title",
              equations: [
                {
                  id: "equation-a",
                  label: "Localized equation label",
                  latex: "tampered = true",
                },
              ],
              variableLinks: [
                {
                  id: "variable-link-a",
                  label: "Localized variable link",
                  param: "tamperedParam",
                },
              ],
              simulation: {
                kind: "tampered-kind",
              },
              sections: {
                workedExamples: {
                  items: [
                    {
                      id: "worked-example-a",
                      steps: [
                        {
                          id: "step-a",
                          template: "tampered template",
                        },
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
      },
    }));

    const { resolveConceptContentVariant } = await import("@/lib/i18n/concept-content");
    const result = resolveConceptContentVariant(
      {
        ...buildSyntheticConcept(),
        equations: [
          {
            id: "equation-a",
            latex: "x = vt",
            label: "Original equation label",
          },
        ],
        variableLinks: [
          {
            id: "variable-link-a",
            label: "Original variable link",
            param: "velocity",
          },
        ],
        sections: {
          explanation: {
            paragraphs: ["Original explanation"],
          },
          workedExamples: {
            items: [
              {
                id: "worked-example-a",
                steps: [
                  {
                    id: "step-a",
                    label: "Original step label",
                    template: "Original step template",
                  },
                ],
              },
            ],
          },
        },
      } as unknown as ConceptContent,
      "zh-HK",
    );

    expect(result.content.title).toBe("Localized title");
    expect(result.content.equations?.[0]).toMatchObject({
      id: "equation-a",
      label: "Localized equation label",
      latex: "x = vt",
    });
    expect(result.content.variableLinks?.[0]).toMatchObject({
      id: "variable-link-a",
      label: "Localized variable link",
      param: "velocity",
    });
    expect(result.content.simulation.kind).toBe("shm");
    expect(
      result.content.sections.workedExamples.items[0]?.steps?.[0]?.template,
    ).toBe("Original step template");
  });
});

describe("content variant manifest generation", () => {
  it("treats empty optimized overlay files as no-op placeholders instead of invalid overlays", async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "open-model-lab-content-variants-empty-"));

    try {
      writeJson(path.join(tempRoot, "content", "catalog", "concepts.json"), [
        {
          id: "concept-demo",
          slug: "demo-concept",
          contentFile: "demo-concept",
          title: "Demo concept",
          summary: "Original summary",
          topic: "Mechanics",
          difficulty: "Intro",
          sequence: 1,
          tags: [],
          related: [],
          recommendedNext: [],
          published: true,
          status: "published",
          estimatedStudyMinutes: 10,
          heroConcept: false,
          accent: "teal",
          highlights: ["Original highlight"],
          simulationKind: "shm",
          subject: "Physics",
        },
      ]);
      writeJson(path.join(tempRoot, "content", "concepts", "demo-concept.json"), {
        sections: {
          explanation: {
            paragraphs: ["Original explanation"],
          },
        },
        quickTest: {
          questions: [],
        },
        accessibility: {
          simulationDescription: {
            paragraphs: ["Original accessibility description"],
          },
          graphSummary: {
            paragraphs: ["Original graph summary"],
          },
        },
        simulation: {
          kind: "shm",
          controls: [],
          presets: [],
          overlays: [],
        },
        graphs: [],
        noticePrompts: {
          title: "What to notice",
          items: [],
        },
        predictionMode: {
          title: "Prediction mode",
          intro: "Prediction intro",
          items: [],
        },
      });
      writeJson(path.join(tempRoot, "content", "optimized", "concepts", "demo-concept.json"), {});

      const { generateContentVariantBundle } = await importScriptModule(
        "scripts/generate-content-variant-bundle.mjs",
      );
      const result = generateContentVariantBundle(tempRoot, { writeFiles: false });
      const optimizedEntry = result.manifest.concepts["demo-concept"].optimized;

      expect(optimizedEntry.exists).toBe(true);
      expect(optimizedEntry.valid).toBe(true);
      expect(optimizedEntry.usable).toBe(false);
      expect(optimizedEntry.issues).toEqual([]);
      expect(
        optimizedEntry.notes.some((note: string) => note.includes("no-op placeholder")),
      ).toBe(true);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("marks optimized overlays invalid when they include ignored protected fields", async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "open-model-lab-content-variants-protected-"));

    try {
      writeJson(path.join(tempRoot, "content", "catalog", "concepts.json"), [
        {
          id: "concept-demo",
          slug: "demo-concept",
          contentFile: "demo-concept",
          title: "Demo concept",
          summary: "Original summary",
          topic: "Mechanics",
          difficulty: "Intro",
          sequence: 1,
          tags: [],
          related: [],
          recommendedNext: [],
          published: true,
          status: "published",
          estimatedStudyMinutes: 10,
          heroConcept: false,
          accent: "teal",
          highlights: ["Original highlight"],
          simulationKind: "shm",
          subject: "Physics",
        },
      ]);
      writeJson(path.join(tempRoot, "content", "concepts", "demo-concept.json"), {
        sections: {
          explanation: {
            paragraphs: ["Original explanation"],
          },
        },
        quickTest: {
          questions: [],
        },
        accessibility: {
          simulationDescription: {
            paragraphs: ["Original accessibility description"],
          },
          graphSummary: {
            paragraphs: ["Original graph summary"],
          },
        },
        simulation: {
          kind: "shm",
          controls: [],
          presets: [],
          overlays: [],
        },
        graphs: [],
        noticePrompts: {
          title: "What to notice",
          items: [],
        },
        predictionMode: {
          title: "Prediction mode",
          intro: "Prediction intro",
          items: [],
        },
      });
      writeJson(path.join(tempRoot, "content", "optimized", "concepts", "demo-concept.json"), {
        title: "Optimized demo concept",
        simulation: {
          kind: "tampered-kind",
        },
      });

      const { generateContentVariantBundle } = await importScriptModule(
        "scripts/generate-content-variant-bundle.mjs",
      );
      const { buildContentVariantStatusReport } = await importScriptModule(
        "scripts/content-variant-status.mjs",
      );
      const result = generateContentVariantBundle(tempRoot, { writeFiles: false });
      const optimizedEntry = result.manifest.concepts["demo-concept"].optimized;
      const report = buildContentVariantStatusReport(tempRoot);

      expect(optimizedEntry.valid).toBe(false);
      expect(optimizedEntry.usable).toBe(false);
      expect(
        optimizedEntry.issues.some((issue: string) =>
          issue.includes("ignored protected or unsupported paths"),
        ),
      ).toBe(true);
      expect(result.optimizedBundle["demo-concept"]).toBeUndefined();
      expect(report.errors).toContainEqual(
        expect.stringContaining("optimized:demo-concept: Optimized overlay includes ignored protected or unsupported paths"),
      );
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("preserves simulation.ui disclosure hints in generated optimized bundles when overlays author them", async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "open-model-lab-content-variants-simulation-ui-"));

    try {
      writeJson(path.join(tempRoot, "content", "catalog", "concepts.json"), [
        {
          id: "concept-demo",
          slug: "demo-concept",
          contentFile: "demo-concept",
          title: "Demo concept",
          summary: "Original summary",
          topic: "Mechanics",
          difficulty: "Intro",
          sequence: 1,
          tags: [],
          related: [],
          recommendedNext: [],
          published: true,
          status: "published",
          estimatedStudyMinutes: 10,
          heroConcept: false,
          accent: "teal",
          highlights: ["Original highlight"],
          simulationKind: "shm",
          subject: "Physics",
        },
      ]);
      writeJson(path.join(tempRoot, "content", "concepts", "demo-concept.json"), {
        sections: {
          explanation: {
            paragraphs: ["Original explanation"],
          },
        },
        quickTest: {
          questions: [],
        },
        accessibility: {
          simulationDescription: {
            paragraphs: ["Original accessibility description"],
          },
          graphSummary: {
            paragraphs: ["Original graph summary"],
          },
        },
        simulation: {
          kind: "shm",
          ui: {
            initialGraphId: "displacement",
            primaryGraphIds: ["displacement"],
            primaryControlIds: ["amplitude"],
          },
          controls: [
            { id: "amplitude", kind: "slider", label: "Amplitude", param: "amplitude", min: 0, max: 2, step: 0.1 },
          ],
          presets: [],
          overlays: [],
        },
        graphs: [{ id: "displacement", label: "Displacement", xLabel: "t", yLabel: "x", series: ["x"] }],
        noticePrompts: {
          title: "What to notice",
          items: [],
        },
        predictionMode: {
          title: "Prediction mode",
          intro: "Prediction intro",
          items: [],
        },
      });
      writeJson(path.join(tempRoot, "content", "optimized", "concepts", "demo-concept.json"), {
        simulation: {
          ui: {
            initialGraphId: "displacement",
            primaryGraphIds: ["displacement"],
            primaryControlIds: ["amplitude"],
          },
        },
      });

      const { generateContentVariantBundle } = await importScriptModule(
        "scripts/generate-content-variant-bundle.mjs",
      );
      const result = generateContentVariantBundle(tempRoot, { writeFiles: false });

      expect(result.optimizedBundle["demo-concept"]).toEqual({
        simulation: {
          ui: {
            initialGraphId: "displacement",
            primaryGraphIds: ["displacement"],
            primaryControlIds: ["amplitude"],
          },
        },
      });
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("marks optimized overlays invalid when edited copy drops canonical placeholders", async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "open-model-lab-content-variants-placeholders-"));

    try {
      writeJson(path.join(tempRoot, "content", "catalog", "concepts.json"), [
        {
          id: "concept-demo",
          slug: "demo-concept",
          contentFile: "demo-concept",
          title: "Demo concept",
          summary: "Original summary",
          topic: "Mechanics",
          difficulty: "Intro",
          sequence: 1,
          tags: [],
          related: [],
          recommendedNext: [],
          published: true,
          status: "published",
          estimatedStudyMinutes: 10,
          heroConcept: false,
          accent: "teal",
          highlights: ["Original highlight"],
          simulationKind: "shm",
          subject: "Physics",
        },
      ]);
      writeJson(path.join(tempRoot, "content", "concepts", "demo-concept.json"), {
        sections: {
          explanation: {
            paragraphs: ["Original explanation"],
          },
          workedExamples: {
            items: [
              {
                id: "example-a",
                prompt: "At time {{timeValue}}, what does the graph show?",
              },
            ],
          },
        },
        quickTest: {
          questions: [],
        },
        accessibility: {
          simulationDescription: {
            paragraphs: ["Original accessibility description"],
          },
          graphSummary: {
            paragraphs: ["Original graph summary"],
          },
        },
        simulation: {
          kind: "shm",
          controls: [],
          presets: [],
          overlays: [],
        },
        graphs: [],
        noticePrompts: {
          title: "What to notice",
          items: [],
        },
        predictionMode: {
          title: "Prediction mode",
          intro: "Prediction intro",
          items: [],
        },
      });
      writeJson(path.join(tempRoot, "content", "optimized", "concepts", "demo-concept.json"), {
        sections: {
          workedExamples: {
            items: [
              {
                id: "example-a",
                prompt: "At the current instant, what does the graph show?",
              },
            ],
          },
        },
      });

      const { generateContentVariantBundle } = await importScriptModule(
        "scripts/generate-content-variant-bundle.mjs",
      );
      const { buildContentVariantStatusReport } = await importScriptModule(
        "scripts/content-variant-status.mjs",
      );
      const result = generateContentVariantBundle(tempRoot, { writeFiles: false });
      const optimizedEntry = result.manifest.concepts["demo-concept"].optimized;
      const report = buildContentVariantStatusReport(tempRoot);

      expect(optimizedEntry.valid).toBe(false);
      expect(optimizedEntry.usable).toBe(false);
      expect(
        optimizedEntry.issues.some((issue: string) =>
          issue.includes("changed canonical placeholder tokens"),
        ),
      ).toBe(true);
      expect(result.optimizedBundle["demo-concept"]).toBeUndefined();
      expect(report.errors).toContainEqual(
        expect.stringContaining("optimized:demo-concept: Optimized overlay changed canonical placeholder tokens"),
      );
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("generates manifest metadata, optimized bundles, and stale detection", async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "open-model-lab-content-variants-"));

    try {
      writeJson(path.join(tempRoot, "content", "catalog", "concepts.json"), [
        {
          id: "concept-demo",
          slug: "demo-concept",
          contentFile: "demo-concept",
          title: "Demo concept",
          summary: "Original summary",
          topic: "Mechanics",
          difficulty: "Intro",
          sequence: 1,
          tags: ["demo"],
          related: [],
          recommendedNext: [],
          published: true,
          status: "published",
          estimatedStudyMinutes: 10,
          heroConcept: false,
          accent: "teal",
          highlights: ["Original highlight"],
          simulationKind: "shm",
          subject: "Physics",
        },
      ]);
      writeJson(path.join(tempRoot, "content", "concepts", "demo-concept.json"), {
        sections: {
          explanation: {
            paragraphs: ["Original explanation"],
          },
        },
        quickTest: {
          questions: [],
        },
        accessibility: {
          simulationDescription: {
            paragraphs: ["Original accessibility description"],
          },
          graphSummary: {
            paragraphs: ["Original graph summary"],
          },
        },
        simulation: {
          controls: [],
          presets: [],
          overlays: [],
        },
        graphs: [],
        noticePrompts: {
          title: "What to notice",
          items: [],
        },
        predictionMode: {
          title: "Prediction mode",
          intro: "Prediction intro",
          items: [],
        },
      });
      writeJson(path.join(tempRoot, "content", "optimized", "concepts", "demo-concept.json"), {
        title: "Optimized demo concept",
      });
      writeJson(path.join(tempRoot, "content", "i18n", "zh-HK", "concepts", "demo-concept.json"), {
        title: "示範概念",
      });
      writeJson(path.join(tempRoot, "content", "i18n", "zh-HK", "manifest.json"), {
        version: 1,
        locale: "zh-HK",
        createdAt: "2026-04-12T00:00:00.000Z",
        updatedAt: "2026-04-12T00:00:00.000Z",
        entries: {
          "concept:demo-concept": {
            provider: "ollama",
            translatedAt: "2026-04-12T00:00:00.000Z",
            sourceHash: "outdated-source-hash",
            outputHash: "outdated-output-hash",
          },
        },
      });
      writeJson(path.join(tempRoot, "content", "_meta", "editorial-manifest.json"), {
        version: 1,
        updatedAt: "2026-04-12T00:00:00.000Z",
        concepts: {
          "demo-concept": {
            optimized: {
              reviewStatus: "human-reviewed",
              qaStatus: "pass",
              derivedFrom: {
                variant: "original",
                locale: "en",
                sourceHash: "outdated-source-hash",
              },
            },
          },
        },
      });

      const { generateContentVariantBundle } = await importScriptModule(
        "scripts/generate-content-variant-bundle.mjs",
      );
      const { buildContentVariantStatusReport, formatContentVariantStatusReport } =
        await importScriptModule("scripts/content-variant-status.mjs");
      const result = generateContentVariantBundle(tempRoot, { writeFiles: true });
      const entry = result.manifest.concepts["demo-concept"];
      const report = buildContentVariantStatusReport(tempRoot);

      expect(entry.optimized.exists).toBe(true);
      expect(entry.optimized.stale).toBe(true);
      expect(entry.locales["zh-HK"].exists).toBe(true);
      expect(entry.locales["zh-HK"].stale).toBe(true);
      expect(entry.locales["zh-HK"].usesFallbackFields).toBe(true);
      expect(entry.locales["zh-HK"].fallbackBaseVariant).toBe("optimized");
      expect(entry.locales["zh-HK"].fallbackFieldCount).toBeGreaterThan(0);
      expect(result.optimizedBundle["demo-concept"]).toEqual({
        title: "Optimized demo concept",
      });
      expect(result.optimizedUiCopyBundle["demo-concept"]).toEqual({
        title: "Optimized demo concept",
      });
      expect(
        JSON.parse(
          fs.readFileSync(
            path.join(tempRoot, "content", "_meta", "generated", "optimized-concepts.json"),
            "utf8",
          ),
        ),
      ).toEqual({
        "demo-concept": {
          title: "Optimized demo concept",
        },
      });
      expect(
        JSON.parse(
          fs.readFileSync(
            path.join(
              tempRoot,
              "content",
              "_meta",
              "generated",
              "optimized-concept-ui-copy.json",
            ),
            "utf8",
          ),
        ),
      ).toEqual({
        "demo-concept": {
          title: "Optimized demo concept",
        },
      });
      expect(formatContentVariantStatusReport(report)).toContain("Optimized English:");
      expect(formatContentVariantStatusReport(report)).toContain("zh-HK:");
      expect(formatContentVariantStatusReport(report)).toContain("withFallback=1");
      expect(formatContentVariantStatusReport(report)).toContain(
        "localized overlay falls back to optimized",
      );
      expect(report.warnings.some((warning: string) => warning.includes("stale"))).toBe(true);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("marks localized overlays stale when they explicitly derive from optimized English and optimized English changes", async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "open-model-lab-content-variants-optimized-"));

    try {
      writeJson(path.join(tempRoot, "content", "catalog", "concepts.json"), [
        {
          id: "concept-demo",
          slug: "demo-concept",
          contentFile: "demo-concept",
          title: "Demo concept",
          summary: "Original summary",
          topic: "Mechanics",
          difficulty: "Intro",
          sequence: 1,
          tags: [],
          related: [],
          recommendedNext: [],
          published: true,
          status: "published",
          estimatedStudyMinutes: 10,
          heroConcept: false,
          accent: "teal",
          highlights: ["Original highlight"],
          simulationKind: "shm",
          subject: "Physics",
        },
      ]);
      writeJson(path.join(tempRoot, "content", "concepts", "demo-concept.json"), {
        sections: {
          explanation: {
            paragraphs: ["Original explanation"],
          },
        },
        quickTest: {
          questions: [],
        },
        accessibility: {
          simulationDescription: {
            paragraphs: ["Original accessibility description"],
          },
          graphSummary: {
            paragraphs: ["Original graph summary"],
          },
        },
        simulation: {
          controls: [],
          presets: [],
          overlays: [],
        },
        graphs: [],
        noticePrompts: {
          title: "What to notice",
          items: [],
        },
        predictionMode: {
          title: "Prediction mode",
          intro: "Prediction intro",
          items: [],
        },
      });
      writeJson(path.join(tempRoot, "content", "optimized", "concepts", "demo-concept.json"), {
        title: "Optimized demo concept",
      });
      writeJson(path.join(tempRoot, "content", "i18n", "zh-HK", "concepts", "demo-concept.json"), {
        title: "示範概念",
      });
      writeJson(path.join(tempRoot, "content", "_meta", "editorial-manifest.json"), {
        version: 1,
        updatedAt: "2026-04-12T00:00:00.000Z",
        concepts: {
          "demo-concept": {
            locales: {
              "zh-HK": {
                derivedFrom: {
                  variant: "optimized",
                  locale: "en",
                  sourceHash: "outdated-optimized-hash",
                },
              },
            },
          },
        },
      });

      const { generateContentVariantBundle } = await importScriptModule(
        "scripts/generate-content-variant-bundle.mjs",
      );
      const result = generateContentVariantBundle(tempRoot, { writeFiles: false });
      const localizedEntry = result.manifest.concepts["demo-concept"].locales["zh-HK"];

      expect(localizedEntry.stale).toBe(true);
      expect(localizedEntry.derivedFrom.variant).toBe("optimized");
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});

describe("generated artifact guards", () => {
  it("fails clearly when generated artifact data is malformed", async () => {
    const {
      assertConceptVariantManifest,
      assertOptimizedConceptUiCopy,
    } = await import("@/lib/content/generated/content-variant-artifact-guards");

    expect(() => assertConceptVariantManifest(null)).toThrow(
      /Run `pnpm content:registry`/i,
    );
    expect(() => assertOptimizedConceptUiCopy([])).toThrow(
      /Run `pnpm content:registry`/i,
    );
  });
});
