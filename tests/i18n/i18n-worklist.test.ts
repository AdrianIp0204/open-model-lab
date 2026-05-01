// @vitest-environment node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import type { ConceptContent } from "@/lib/content";
import { buildConceptEditorialOverlaySource } from "@/lib/content/editorial-overlays";

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function importScriptModule(relativePath: string) {
  return import(pathToFileURL(path.resolve(process.cwd(), relativePath)).href);
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const entries = Object.keys(record)
    .sort((left, right) => left.localeCompare(right))
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`);

  return `{${entries.join(",")}}`;
}

function sha256Json(value: unknown) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function buildCatalogEntry(slug: string, sequence: number) {
  return {
    id: `concept-${slug}`,
    slug,
    contentFile: slug,
    title: `Concept ${slug}`,
    summary: `Canonical summary for ${slug}.`,
    topic: "Mechanics",
    subtopic: "Foundations",
    difficulty: "Intro",
    sequence,
    tags: ["demo"],
    related: [],
    recommendedNext: [
      {
        slug: "next-step",
        reasonLabel: `Why ${slug} leads to the next step.`,
      },
    ],
    published: true,
    status: "published",
    estimatedStudyMinutes: 10,
    heroConcept: false,
    accent: "teal",
    highlights: [`Highlight for ${slug}`],
    simulationKind: "demo-bench",
    subject: "Physics",
  };
}

function buildConceptContent(label: string): Partial<ConceptContent> {
  return {
    sections: {
      explanation: {
        paragraphs: [
          `${label} explanation paragraph one.`,
          `${label} explanation paragraph two.`,
        ],
      },
      keyIdeas: [`${label} key idea one.`, `${label} key idea two.`],
      commonMisconception: {
        myth: `${label} misconception.`,
        correction: [`${label} correction one.`, `${label} correction two.`],
      },
      workedExamples: {
        title: `${label} worked examples`,
        intro: `${label} worked example intro.`,
        items: [
          {
            id: "worked-example-a",
            title: `${label} worked example`,
            prompt: `At {{timeValue}}, describe the state for ${label}.`,
            variables: [
              { id: "time", label: "Time" },
              { id: "omega", label: "Angular frequency" },
            ],
            steps: [
              {
                id: "step-a",
                label: "Set up the relationship",
                template: "Protected step template",
              },
            ],
            resultLabel: `${label} result`,
            applyAction: {
              label: `Apply ${label}`,
              observationHint: `Observe the change for ${label}.`,
            },
          },
        ],
      },
      miniChallenge: {
        prompt: `${label} mini challenge prompt.`,
        prediction: `${label} mini challenge prediction.`,
        answer: `${label} mini challenge answer.`,
        explanation: `${label} mini challenge explanation.`,
      },
    },
    quickTest: {
      title: `${label} quick test`,
      intro: `${label} quick test intro.`,
      questions: [
        {
          id: "quick-test-a",
          prompt: `${label} quick test prompt.`,
          choices: [
            { id: "choice-a", label: "Choice A" },
            { id: "choice-b", label: "Choice B" },
          ],
          explanation: `${label} quick test explanation.`,
          selectedWrongExplanations: [`${label} wrong choice note.`],
          showMeAction: {
            label: `Show ${label}`,
            observationHint: `Look at the graph for ${label}.`,
          },
        },
      ],
    },
    accessibility: {
      simulationDescription: {
        paragraphs: [
          `${label} simulation accessibility one.`,
          `${label} simulation accessibility two.`,
        ],
      },
      graphSummary: {
        paragraphs: [`${label} graph summary one.`, `${label} graph summary two.`],
      },
    },
    pageFramework: {
      sections: [
        { id: "observe", title: "Observe" },
        { id: "predict", title: "Predict" },
      ],
      featuredSetups: [
        {
          id: "setup-a",
          label: "Baseline setup",
          description: `${label} baseline setup.`,
          setup: { note: `${label} baseline note.` },
        },
        {
          id: "setup-b",
          label: "Comparison setup",
          description: `${label} comparison setup.`,
          setup: { note: `${label} comparison note.` },
        },
      ],
    },
    equations: [
      {
        id: "equation-a",
        label: `${label} equation`,
        meaning: `${label} equation meaning.`,
        notes: [`${label} equation note one.`, `${label} equation note two.`],
        latex: "x = vt",
      },
    ],
    variableLinks: [
      {
        id: "variable-time",
        label: "Time",
        description: `${label} time description.`,
        param: "time",
      },
    ],
    simulation: {
      kind: "demo-bench",
      controls: [
        {
          id: "amplitude",
          label: "Amplitude",
          description: `${label} amplitude control.`,
          param: "amplitude",
          unit: "m",
        },
        {
          id: "time",
          label: "Time",
          description: `${label} time control.`,
          param: "time",
          unit: "s",
        },
      ],
      presets: [
        {
          id: "preset-a",
          label: "Baseline",
          description: `${label} baseline preset.`,
        },
        {
          id: "preset-b",
          label: "Offset",
          description: `${label} offset preset.`,
        },
      ],
      overlays: [
        {
          id: "guide",
          label: "Guide",
          shortDescription: `${label} guide.`,
          whatToNotice: [`Notice the guide for ${label}.`],
          whyItMatters: `${label} guide importance.`,
        },
        {
          id: "history",
          label: "History",
          shortDescription: `${label} history.`,
          whatToNotice: [`Notice the history for ${label}.`],
          whyItMatters: `${label} history importance.`,
        },
      ],
    },
    graphs: [
      {
        id: "graph-position",
        label: "Position",
        xLabel: "Time",
        yLabel: "Displacement",
        description: `${label} position graph.`,
      },
      {
        id: "graph-speed",
        label: "Speed",
        xLabel: "Time",
        yLabel: "Speed",
        description: `${label} speed graph.`,
      },
    ],
    noticePrompts: {
      title: "What to notice",
      intro: `${label} notice intro.`,
      items: [
        {
          id: "notice-a",
          text: `${label} notice text.`,
          tryThis: `${label} notice action.`,
          whyItMatters: `${label} notice reason.`,
        },
      ],
    },
    predictionMode: {
      title: "Prediction mode",
      intro: `${label} prediction intro.`,
      items: [
        {
          id: "prediction-a",
          prompt: `${label} prediction prompt.`,
          scenarioLabel: `${label} scenario.`,
          changeLabel: `${label} change.`,
          choices: [
            { id: "prediction-choice-a", label: "Increase" },
            { id: "prediction-choice-b", label: "Decrease" },
          ],
          explanation: `${label} prediction explanation.`,
          observationHint: `${label} prediction observation hint.`,
        },
      ],
    },
    challengeMode: {
      title: "Challenge mode",
      intro: `${label} challenge intro.`,
      items: [
        {
          id: "challenge-a",
          title: `${label} challenge`,
          prompt: `${label} challenge prompt.`,
          successMessage: `${label} challenge success.`,
          setup: { note: `${label} challenge setup note.` },
          hints: [`${label} hint one.`, `${label} hint two.`],
          checks: [
            {
              type: "range",
              label: `${label} check label`,
              param: "amplitude",
              metric: "amplitude",
              min: 1,
              max: 2,
              displayUnit: "m",
            },
          ],
          targets: [
            {
              setup: "A",
              param: "amplitude",
              metric: "amplitude",
              min: 1,
              max: 2,
              displayUnit: "m",
            },
          ],
        },
      ],
    },
  } as unknown as Partial<ConceptContent>;
}

type MutableOverlayShape = {
  summary?: string;
  sections?: {
    workedExamples?: {
      title?: string;
      intro?: string;
      items?: Array<{
        prompt?: string;
        variables?: Array<{
          label?: string;
        }>;
      }>;
    };
  };
  simulation?: {
    controls?: Array<{
      label?: string;
      description?: string;
    }>;
    presets?: Array<{
      description?: string;
    }>;
  };
  graphs?: Array<{
    description?: string;
  }>;
};

function removeFieldPaths<T extends Record<string, unknown>>(overlay: T, variant: string) {
  const next = cloneJson(overlay) as T & MutableOverlayShape;
  const workedExamples = next.sections?.workedExamples;
  const workedExample = workedExamples?.items?.[0];
  const firstVariable = workedExample?.variables?.[0];
  const firstControl = next.simulation?.controls?.[0];
  const firstPreset = next.simulation?.presets?.[0];
  const firstGraph = next.graphs?.[0];

  if (variant === "mid") {
    delete next.summary;
    if (workedExamples) {
      delete workedExamples.title;
      delete workedExamples.intro;
    }
    if (workedExample) {
      delete workedExample.prompt;
    }
    if (firstVariable) {
      delete firstVariable.label;
    }
    if (firstControl) {
      delete firstControl.label;
    }
    if (firstPreset) {
      delete firstPreset.description;
    }
    if (firstGraph) {
      delete firstGraph.description;
    }
  }

  if (variant === "low") {
    if (workedExample) {
      delete workedExample.prompt;
    }
    if (firstControl) {
      delete firstControl.description;
    }
    if (firstGraph) {
      delete firstGraph.description;
    }
  }

  return next;
}

function buildFixtureRepo() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "open-model-lab-i18n-worklist-"));
  const catalogEntries = [
    buildCatalogEntry("alpha-high", 1),
    buildCatalogEntry("zeta-high", 2),
    buildCatalogEntry("mid", 3),
    buildCatalogEntry("low", 4),
    buildCatalogEntry("clean", 5),
  ];

  writeJson(path.join(tempRoot, "content", "catalog", "concepts.json"), catalogEntries);

  const manifestEntries: Record<string, unknown> = {};

  for (const conceptMetadata of catalogEntries) {
    const conceptContent = buildConceptContent(conceptMetadata.slug);
    const overlaySource = buildConceptEditorialOverlaySource(conceptMetadata, conceptContent);

    writeJson(
      path.join(tempRoot, "content", "concepts", `${conceptMetadata.contentFile}.json`),
      conceptContent,
    );

    if (conceptMetadata.slug !== "mid") {
      const optimizedOverlay =
        conceptMetadata.slug === "low"
          ? {
              summary: "Optimized summary for low.",
              sections: {
                workedExamples: {
                  items: [
                    {
                      id: "worked-example-a",
                      prompt: "At {{timeValue}}, describe the current low-state snapshot.",
                    },
                  ],
                },
              },
            }
          : {
              summary: `Optimized summary for ${conceptMetadata.slug}.`,
            };

      writeJson(
        path.join(tempRoot, "content", "optimized", "concepts", `${conceptMetadata.slug}.json`),
        optimizedOverlay,
      );
    }

    const localeOverlay =
      conceptMetadata.slug === "alpha-high" || conceptMetadata.slug === "zeta-high"
        ? { title: `ZH ${conceptMetadata.slug}` }
        : conceptMetadata.slug === "mid"
          ? removeFieldPaths(overlaySource, "mid")
          : conceptMetadata.slug === "low"
            ? removeFieldPaths(overlaySource, "low")
            : overlaySource;

    writeJson(
      path.join(tempRoot, "content", "i18n", "zh-HK", "concepts", `${conceptMetadata.slug}.json`),
      localeOverlay,
    );

    manifestEntries[`concept:${conceptMetadata.slug}`] = {
      status: "done",
      provider: "manual-review",
      translatedAt: "2026-04-12T00:00:00.000Z",
      sourceHash: sha256Json(overlaySource),
      outputHash: sha256Json(localeOverlay),
      sourcePath: `content/concepts/${conceptMetadata.contentFile}.json`,
      outputPath: `content/i18n/zh-HK/concepts/${conceptMetadata.slug}.json`,
    };
  }

  writeJson(path.join(tempRoot, "content", "i18n", "zh-HK", "manifest.json"), {
    version: 1,
    locale: "zh-HK",
    createdAt: "2026-04-12T00:00:00.000Z",
    updatedAt: "2026-04-12T00:00:00.000Z",
    entries: manifestEntries,
  });

  return tempRoot;
}

describe("i18n worklist export", () => {
  let tempRoot: string | null = null;

  afterEach(() => {
    if (tempRoot) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
      tempRoot = null;
    }
  });

  it("exports only fallback concepts, preserves protected tokens, and orders deterministically", async () => {
    tempRoot = buildFixtureRepo();

    const { buildLocaleFallbackWorklist } = await importScriptModule(
      "scripts/generate-i18n-worklist.mjs",
    );
    const result = buildLocaleFallbackWorklist(tempRoot, { locale: "zh-HK" });

    expect(result.worklist.items.map((item: { slug: string }) => item.slug)).toEqual([
      "alpha-high",
      "zeta-high",
      "mid",
      "low",
    ]);
    expect(result.worklist.summary.conceptCount).toBe(4);
    expect(result.worklist.summary.bucketCounts["51+"]).toBe(2);
    expect(result.worklist.summary.bucketCounts["6-20"]).toBe(1);
    expect(result.worklist.summary.bucketCounts["1-5"]).toBe(1);
    expect(result.worklist.items.every((item: { slug: string }) => item.slug !== "clean")).toBe(
      true,
    );

    const lowItem = result.worklist.items.find((item: { slug: string }) => item.slug === "low");
    expect(lowItem).toMatchObject({
      severityBucket: "1-5",
      fallbackFieldCount: 3,
      fallbackBaseVariant: "optimized",
      targetOverlayPath: "content/i18n/zh-HK/concepts/low.json",
    });
    expect(lowItem.fallbackFieldPaths).toEqual([
      "sections.workedExamples.items.id:worked-example-a.prompt",
      "simulation.controls.id:amplitude.description",
      "graphs.id:graph-position.description",
    ]);
    expect(lowItem.sourcePatch).toEqual({
      sections: {
        workedExamples: {
          items: [
            {
              id: "worked-example-a",
              prompt: "At {{timeValue}}, describe the current low-state snapshot.",
            },
          ],
        },
      },
      simulation: {
        controls: [
          {
            id: "amplitude",
            description: "low amplitude control.",
          },
        ],
      },
      graphs: [
        {
          id: "graph-position",
          description: "low position graph.",
        },
      ],
    });
    expect(lowItem.protectedTokenPaths).toEqual([
      "sections.workedExamples.items.id:worked-example-a.prompt",
    ]);
    expect(JSON.stringify(lowItem.sourcePatch)).toContain("{{timeValue}}");
    expect(JSON.stringify(lowItem.sourcePatch)).not.toContain("Protected step template");
    expect(JSON.stringify(lowItem.sourcePatch)).not.toContain("\"param\"");
    expect(JSON.stringify(lowItem.sourcePatch)).not.toContain("\"unit\"");
    expect(lowItem.localeManifestSourceHash).toMatch(/^[a-f0-9]{64}$/u);

    const bucketFiltered = buildLocaleFallbackWorklist(tempRoot, {
      locale: "zh-HK",
      bucket: "51+",
    });
    expect(bucketFiltered.worklist.items.map((item: { slug: string }) => item.slug)).toEqual([
      "alpha-high",
      "zeta-high",
    ]);

    const minFiltered = buildLocaleFallbackWorklist(tempRoot, {
      locale: "zh-HK",
      minFallbackCount: 6,
    });
    expect(minFiltered.worklist.items.map((item: { slug: string }) => item.slug)).toEqual([
      "alpha-high",
      "zeta-high",
      "mid",
    ]);

    const slugFiltered = buildLocaleFallbackWorklist(tempRoot, {
      locale: "zh-HK",
      slugs: ["low"],
    });
    expect(slugFiltered.worklist.items.map((item: { slug: string }) => item.slug)).toEqual([
      "low",
    ]);
  });

  it("writes aggregate JSON and Markdown artifacts for the filtered set", async () => {
    tempRoot = buildFixtureRepo();

    const { generateLocaleFallbackWorklist } = await importScriptModule(
      "scripts/generate-i18n-worklist.mjs",
    );
    const result = generateLocaleFallbackWorklist(tempRoot, {
      locale: "zh-HK",
      slugs: ["low"],
    });

    expect(fs.existsSync(result.outputPaths.json)).toBe(true);
    expect(fs.existsSync(result.outputPaths.markdown)).toBe(true);

    const jsonArtifact = JSON.parse(fs.readFileSync(result.outputPaths.json, "utf8"));
    const markdownArtifact = fs.readFileSync(result.outputPaths.markdown, "utf8");

    expect(jsonArtifact.items).toHaveLength(1);
    expect(jsonArtifact.items[0]).toMatchObject({
      slug: "low",
      severityBucket: "1-5",
    });
    expect(markdownArtifact).toContain("# zh-HK Translation Worklist");
    expect(markdownArtifact).toContain("`low`");
    expect(markdownArtifact).toContain("content/i18n/zh-HK/concepts/low.json");
  });
});
