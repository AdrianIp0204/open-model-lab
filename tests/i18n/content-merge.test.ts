// @vitest-environment node

import { mergeTranslatedValue } from "@/lib/i18n/content-merge";
import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
});

describe("localized content shard merging", () => {
  it("replaces primitive arrays wholesale and preserves canonical arrays when no override exists", () => {
    expect(
      mergeTranslatedValue(
        { paragraphs: ["Original explanation"], highlights: ["Original highlight"] },
        { paragraphs: ["Localized explanation"] },
      ),
    ).toEqual({
      paragraphs: ["Localized explanation"],
      highlights: ["Original highlight"],
    });
  });

  it("merges deep shard overrides by stable id while preserving canonical fallback fields", async () => {
    vi.doMock("@/lib/i18n/generated/content-bundle", () => ({
      contentTranslationsByLocale: {
        "zh-HK": {
          catalog: {},
          concepts: {
            "synthetic-concept": {
              title: "繁體中文標題",
              summary: "繁體中文摘要",
              highlights: ["重點一", "重點二"],
              recommendedNext: [
                {
                  slug: "next-concept-a",
                  reasonLabel: "翻譯後的原因 A",
                },
              ],
              sections: {
                explanation: {
                  paragraphs: ["繁體中文說明"],
                },
                workedExamples: {
                  items: [
                    {
                      id: "worked-example-b",
                      title: "翻譯後的示例 B",
                    },
                    {
                      id: "worked-example-a",
                      title: "翻譯後的示例 A",
                      prompt: "翻譯後的提示 A",
                      variables: [
                        {
                          id: "variable-a",
                          label: "翻譯後的變數 A",
                        },
                      ],
                      steps: [
                        {
                          id: "step-a",
                          template: "翻譯後的步驟 A",
                        },
                      ],
                    },
                  ],
                },
              },
              equations: [
                {
                  id: "equation-a",
                  label: "ç¿»è­¯å¾Œçš„æ–¹ç¨‹",
                  latex: "tampered = true",
                },
              ],
              variableLinks: [
                {
                  id: "variable-link-a",
                  label: "ç¿»è­¯å¾Œçš„è®Šé‡é€£çµ",
                  param: "tamperedParam",
                },
              ],
              simulation: {
                kind: "tampered-simulation-kind",
              },
              quickTest: {
                questions: [
                  {
                    id: "question-b",
                    prompt: "翻譯後的問題 B",
                  },
                  {
                    id: "question-a",
                    prompt: "翻譯後的問題 A",
                    choices: [
                      {
                        id: "choice-b",
                        label: "翻譯後的選項 B",
                      },
                      {
                        id: "choice-a",
                        label: "翻譯後的選項 A",
                      },
                    ],
                  },
                ],
              },
            },
          },
        },
      },
    }));

    const {
      getConceptDisplayRecommendedNextReasonLabel,
    } = await import("@/lib/i18n/content");
    const { localizeConceptContent } = await import("@/lib/i18n/concept-content");

    const baseConcept = {
      slug: "synthetic-concept",
      id: "concept-synthetic",
      title: "English title",
      shortTitle: "English short title",
      summary: "English summary",
      highlights: ["English highlight"],
      topic: "English topic",
      subtopic: "English subtopic",
      sections: {
        explanation: {
          paragraphs: ["English explanation"],
        },
        workedExamples: {
          items: [
            {
              id: "worked-example-a",
              title: "English example A",
              prompt: "English prompt A",
              variables: [
                {
                  id: "variable-a",
                  label: "English variable A",
                  valueKey: "alpha",
                },
              ],
              steps: [
                {
                  id: "step-a",
                  label: "English step A",
                  template: "English step template A",
                },
              ],
              resultLabel: "English result label",
              resultTemplate: "English result template",
            },
            {
              id: "worked-example-b",
              title: "English example B",
              prompt: "English prompt B",
              resultLabel: "English result label B",
              resultTemplate: "English result template B",
            },
          ],
        },
      },
      quickTest: {
        questions: [
          {
            id: "question-a",
            prompt: "English question A",
            choices: [
              {
                id: "choice-a",
                label: "English choice A",
                explanation: "English choice explanation A",
              },
              {
                id: "choice-b",
                label: "English choice B",
                explanation: "English choice explanation B",
              },
            ],
          },
          {
            id: "question-b",
            prompt: "English question B",
            choices: [
              {
                id: "choice-c",
                label: "English choice C",
              },
            ],
          },
        ],
      },
      equations: [
        {
          id: "equation-a",
          latex: "x = vt",
          label: "English equation",
        },
      ],
      variableLinks: [
        {
          id: "variable-link-a",
          label: "English variable link",
          param: "velocity",
        },
      ],
      recommendedNext: [
        {
          slug: "next-concept-a",
          reasonLabel: "English reason A",
        },
        {
          slug: "next-concept-b",
          reasonLabel: "English reason B",
        },
      ],
      accessibility: {
        simulationDescription: {
          paragraphs: ["English accessibility description"],
        },
      },
      simulation: {
        kind: "shm",
        controls: [],
        presets: [],
        overlays: [],
      },
    } as const;

    const localizedConcept = localizeConceptContent(baseConcept as never, "zh-HK");

    expect(localizedConcept.title).toBe("繁體中文標題");
    expect(localizedConcept.shortTitle).toBe("English short title");
    expect(localizedConcept.summary).toBe("繁體中文摘要");
    expect(localizedConcept.highlights).toEqual(["重點一", "重點二"]);
    expect(localizedConcept.topic).toBe("English topic");
    expect(localizedConcept.subtopic).toBe("English subtopic");
    expect(localizedConcept.sections.explanation.paragraphs).toEqual(["繁體中文說明"]);
    expect(localizedConcept.sections.workedExamples.items).toEqual([
      expect.objectContaining({
        id: "worked-example-a",
        title: "翻譯後的示例 A",
        prompt: "翻譯後的提示 A",
      }),
      expect.objectContaining({
        id: "worked-example-b",
        title: "翻譯後的示例 B",
        prompt: "English prompt B",
      }),
    ]);
    expect(localizedConcept.sections.workedExamples.items[0]?.variables).toEqual([
      expect.objectContaining({
        id: "variable-a",
        label: "翻譯後的變數 A",
        valueKey: "alpha",
      }),
    ]);
    expect(localizedConcept.sections.workedExamples.items[0]?.steps).toEqual([
      expect.objectContaining({
        id: "step-a",
        label: "English step A",
        template: "English step template A",
      }),
    ]);
    expect(localizedConcept.equations).toEqual([
      expect.objectContaining({
        id: "equation-a",
        latex: "x = vt",
      }),
    ]);
    expect(localizedConcept.equations?.[0]?.label).not.toBe("English equation");
    expect(localizedConcept.variableLinks).toEqual([
      expect.objectContaining({
        id: "variable-link-a",
        param: "velocity",
      }),
    ]);
    expect(localizedConcept.variableLinks?.[0]?.label).not.toBe("English variable link");
    expect(localizedConcept.simulation.kind).toBe("shm");
      expect(localizedConcept.quickTest.questions).toEqual([
        expect.objectContaining({
          id: "question-a",
          prompt: "翻譯後的問題 A",
        }),
        expect.objectContaining({
          id: "question-b",
          prompt: "翻譯後的問題 B",
        }),
      ]);
    expect(localizedConcept.quickTest.questions[1]?.choices).toEqual([
      expect.objectContaining({
        id: "choice-c",
        label: "English choice C",
      }),
    ]);
    expect(localizedConcept.quickTest.questions[0]?.choices).toEqual([
      expect.objectContaining({
        id: "choice-a",
        label: "翻譯後的選項 A",
        explanation: "English choice explanation A",
      }),
      expect.objectContaining({
        id: "choice-b",
        label: "翻譯後的選項 B",
        explanation: "English choice explanation B",
      }),
    ]);
    expect(localizedConcept.accessibility.simulationDescription.paragraphs).toEqual([
      "English accessibility description",
    ]);
    expect(localizedConcept.recommendedNext).toEqual([
      expect.objectContaining({
        slug: "next-concept-a",
        reasonLabel: "翻譯後的原因 A",
      }),
      expect.objectContaining({
        slug: "next-concept-b",
        reasonLabel: "English reason B",
      }),
    ]);
    expect(
      getConceptDisplayRecommendedNextReasonLabel(
        baseConcept as never,
        baseConcept.recommendedNext[0],
        "zh-HK",
      ),
    ).toBe("翻譯後的原因 A");
    expect(
      getConceptDisplayRecommendedNextReasonLabel(
        baseConcept as never,
        {
          slug: "next-concept-b",
          reasonLabel: "English reason B",
        },
        "zh-HK",
      ),
    ).toBe("English reason B");
  }, 10_000);

  it("normalizes translated challenge authoring with localized graph, overlay, and control labels", async () => {
    vi.doMock("@/lib/i18n/generated/content-bundle", () => ({
      contentTranslationsByLocale: {
        "zh-HK": {
          catalog: {},
          concepts: {
            "synthetic-challenge": {
              graphs: [
                {
                  id: "trajectory",
                  label: "拋體軌跡",
                },
              ],
              simulation: {
                controls: [
                  {
                    id: "launch-angle",
                    label: "發射角度",
                  },
                ],
                overlays: [
                  {
                    id: "range-overlay",
                    label: "射程標記",
                  },
                ],
              },
              variableLinks: [
                {
                  id: "range-link",
                  label: "射程",
                },
              ],
              challengeMode: {
                title: "挑戰模式",
                intro: "把結果調整到目標範圍。",
                items: [
                  {
                    id: "challenge-a",
                    title: "調整發射角度",
                    prompt: "把射程調到指定範圍。",
                    successMessage: "完成。",
                    requirements: {
                      graphId: "trajectory",
                      overlayIds: ["range-overlay"],
                      compareTarget: "b",
                    },
                    targets: [
                      {
                        setup: "b",
                        param: "launchAngle",
                        min: 30,
                        max: 35,
                        displayUnit: "deg",
                      },
                    ],
                  },
                ],
              },
            },
          },
        },
      },
    }));

    const { localizeConceptContent } = await import("@/lib/i18n/concept-content");

    const baseConcept = {
      slug: "synthetic-challenge",
      id: "concept-synthetic-challenge",
      title: "English challenge title",
      summary: "English summary",
      challengeMode: {
        title: "Challenge mode",
        intro: "English intro",
        items: [
          {
            id: "challenge-a",
            title: "English challenge",
            style: "target-setting",
            prompt: "English prompt",
            successMessage: "English success",
            checks: [
              {
                type: "graph-active",
                label: "Open the Trajectory graph.",
                graphId: "trajectory",
              },
              {
                type: "overlay-active",
                label: "Keep the Range marker visible.",
                overlayId: "range-overlay",
              },
              {
                type: "compare-active",
                label: "Stay in compare mode while editing Setup B.",
                target: "b",
              },
              {
                type: "compare-param-range",
                label: "Keep Setup B launch angle between 30 deg and 35 deg.",
                setup: "b",
                param: "launchAngle",
                min: 30,
                max: 35,
                displayUnit: "deg",
              },
            ],
          },
        ],
      },
      graphs: [
        {
          id: "trajectory",
          label: "Trajectory",
        },
      ],
      variableLinks: [
        {
          id: "range-link",
          label: "Range",
          param: "range",
        },
      ],
      simulation: {
        controls: [
          {
            id: "launch-angle",
            kind: "slider",
            label: "Launch angle",
            param: "launchAngle",
          },
        ],
        overlays: [
          {
            id: "range-overlay",
            label: "Range marker",
          },
        ],
      },
    } as const;

    const localizedConcept = localizeConceptContent(baseConcept as never, "zh-HK");
    const checks = localizedConcept.challengeMode?.items[0]?.checks ?? [];

    expect(localizedConcept.challengeMode?.title).toBe("挑戰模式");
    expect(checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "graph-active",
          label: "打開「拋體軌跡」圖表。",
        }),
        expect.objectContaining({
          type: "overlay-active",
          label: "保持顯示「射程標記」。",
        }),
        expect.objectContaining({
          type: "compare-active",
          label: "保持在比較模式，並編輯設定 B。",
        }),
        expect.objectContaining({
          type: "compare-param-range",
          label: "把設定 B 的發射角度保持在 30 deg 至 35 deg。",
        }),
      ]),
    );
  });
});
