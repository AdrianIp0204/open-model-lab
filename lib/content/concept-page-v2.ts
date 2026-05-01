import { addLocalePrefix, type AppLocale } from "@/i18n/routing";
import enMessages from "@/messages/en.json";
import zhHkMessages from "@/messages/zh-HK.json";
import { buildConceptReviewHref, buildConceptTestHref } from "@/lib/test-hub";
import {
  conceptShareAnchorIds,
  getConceptSectionAnchorId,
} from "@/lib/share-links";
import { conceptLearningPhaseQueryParam } from "./concept-learning-phases";
import { resolveConceptPageGuidance, type ResolvedConceptPageGuidanceHint } from "./concept-page-guidance";
import {
  resolveConceptPageSections,
  type ResolvedConceptPageSection,
} from "./concept-page-framework";
import { getConceptBySlug } from "./loaders";
import type { ReadNextRecommendation } from "./read-next";
import type {
  ConceptContent,
  ConceptPageSectionId,
  ConceptPageV2,
  ConceptPageV2GuidedStep,
  ConceptPageV2InlineCheck,
  ConceptPageV2Reveal,
} from "./schema";

export const conceptPageV2LessonHashId = "guided-live-lab";
export const conceptPageV2StepHashPrefix = "guided-step-";

export type ResolvedConceptPageV2RevealItem = {
  id: string;
  kind: "control" | "graph" | "overlay" | "tool" | "section";
  label: string;
  tone?: "core" | "new" | "secondary";
};

export type ResolvedConceptPageV2InlineCheck = {
  eyebrow: string;
  title: string;
  prompt: string;
  supportingText?: string | null;
  choices?: string[];
};

export type ResolvedConceptPageV2Step = {
  id: string;
  hashId: string;
  label: string;
  summary?: string | null;
  goal: string;
  doThis: string;
  notice: string;
  explain: string;
  reveal: ConceptPageV2Reveal | null;
  revealItems: ResolvedConceptPageV2RevealItem[];
  inlineCheck?: ResolvedConceptPageV2InlineCheck | null;
  setup: ConceptPageV2GuidedStep["setup"] | null;
  focusPhase: "explore" | "understand" | "check" | null;
};

export type ResolvedConceptPageV2EquationSnapshot = {
  id: string;
  label: string;
  latex: string;
  meaning: string;
  readAloud?: string | null;
};

export type ResolvedConceptPageV2WrapUp = {
  learned: string[];
  misconception?: {
    myth: string;
    correction: string | null;
  } | null;
  testHref?: string | null;
  reviewHref?: string | null;
  nextConcepts: Array<{
    slug: string;
    title: string;
    reasonLabel?: string | null;
  }>;
  freePlayHref: string;
  challengeHref?: string | null;
  workedExamplesHref?: string | null;
};

export type ResolvedConceptPageV2Prerequisite = {
  slug: string;
  title: string;
};

export type ResolvedConceptPageV2SimulationPreview = {
  title: string;
  description: string;
};

export type ResolvedConceptPageV2 = {
  title: string;
  intuition: string;
  whyItMatters?: string | null;
  estimatedMinutes?: number | null;
  prerequisites: ResolvedConceptPageV2Prerequisite[];
  simulationPreview: ResolvedConceptPageV2SimulationPreview;
  keyTakeaway?: string | null;
  equationSnapshotNote?: string | null;
  equationSnapshot: ResolvedConceptPageV2EquationSnapshot[];
  startSetup: ConceptPageV2["startSetup"] | null;
  source: "authored" | "fallback";
  steps: ResolvedConceptPageV2Step[];
  wrapUp: ResolvedConceptPageV2WrapUp;
  wrapUpSections: ResolvedConceptPageSection[];
  referenceSections: ResolvedConceptPageSection[];
};

const v2CopyByLocale: Record<AppLocale, typeof enMessages.ConceptPage.v2> = {
  en: enMessages.ConceptPage.v2,
  "zh-HK": zhHkMessages.ConceptPage.v2,
};

function getV2Copy(locale: AppLocale) {
  return v2CopyByLocale[locale] ?? v2CopyByLocale.en;
}

function normalizeText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function formatSlugTitle(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function resolvePrerequisites(concept: ConceptContent): ResolvedConceptPageV2Prerequisite[] {
  return (concept.prerequisites ?? []).map((slug) => {
    try {
      const prerequisite = getConceptBySlug(slug);

      return {
        slug,
        title: prerequisite.title,
      };
    } catch {
      return {
        slug,
        title: formatSlugTitle(slug),
      };
    }
  });
}

function interpolateV2CopyTemplate(
  template: string,
  values: Record<string, string | null>,
) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

function resolvePreviewControl(concept: ConceptContent) {
  const preferredControlId = concept.simulation.ui?.primaryControlIds?.[0];

  return (
    concept.simulation.controls.find(
      (control) =>
        control.id === preferredControlId ||
        ("param" in control && control.param === preferredControlId),
    ) ?? concept.simulation.controls[0] ?? null
  );
}

function resolvePreviewGraph(concept: ConceptContent) {
  const preferredGraphId =
    concept.simulation.ui?.initialGraphId ?? concept.simulation.ui?.primaryGraphIds?.[0];

  return (
    concept.graphs.find((graph) => graph.id === preferredGraphId) ??
    concept.graphs[0] ??
    null
  );
}

function resolveSimulationPreview(
  concept: ConceptContent,
  locale: AppLocale,
): ResolvedConceptPageV2SimulationPreview {
  const copy = getV2Copy(locale).simulationPreview;
  const previewControl = resolvePreviewControl(concept);
  const previewGraph = resolvePreviewGraph(concept);
  const controlLabel = previewControl
    ? previewControl.label ?? formatSlugTitle(previewControl.id)
    : null;
  const graphLabel = previewGraph
    ? previewGraph.label ?? formatSlugTitle(previewGraph.id)
    : null;
  const hasOverlays = (concept.simulation.overlays?.length ?? 0) > 0;

  const description = (() => {
    if (controlLabel && graphLabel) {
      return interpolateV2CopyTemplate(copy.controlAndGraphNamed, {
        control: controlLabel,
        graph: graphLabel,
      });
    }

    if (controlLabel) {
      return interpolateV2CopyTemplate(copy.controlNamed, {
        control: controlLabel,
        graph: null,
      });
    }

    if (graphLabel) {
      return interpolateV2CopyTemplate(copy.graphNamed, {
        control: null,
        graph: graphLabel,
      });
    }

    return hasOverlays ? copy.graphsOnly : copy.generic;
  })();

  return {
    title: concept.title,
    description,
  };
}

function pickFirstText(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const normalized = normalizeText(value);

    if (normalized) {
      return normalized;
    }
  }

  return "";
}

function normalizeTextForDeduplication(value: string) {
  return value
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function dedupeResolvedText(items: string[]) {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const item of items) {
    const key = normalizeTextForDeduplication(item);

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

function buildStepHashId(stepId: string) {
  return `${conceptPageV2StepHashPrefix}${stepId}`;
}

export function getConceptPageV2StepHashId(stepId: string) {
  return buildStepHashId(stepId);
}

function getControlLabel(concept: ConceptContent, controlId: string) {
  return (
    concept.simulation.controls.find(
      (control) => control.id === controlId || control.param === controlId,
    )?.label ?? null
  );
}

function getGraphLabel(concept: ConceptContent, graphId: string) {
  return concept.graphs.find((graph) => graph.id === graphId)?.label ?? null;
}

function getOverlayLabel(concept: ConceptContent, overlayId: string) {
  return (
    concept.simulation.overlays?.find((overlay) => overlay.id === overlayId)?.label ??
    null
  );
}

function getSectionLabel(sections: readonly ResolvedConceptPageSection[], sectionId: ConceptPageSectionId) {
  return sections.find((section) => section.id === sectionId)?.title ?? null;
}

function getToolHintLabel(locale: AppLocale, hintId: string) {
  const toolHints = getV2Copy(locale).toolHints;

  switch (hintId) {
    case "playback":
      return toolHints.playback;
    case "timeline":
      return toolHints.timeline;
    case "graph-preview":
      return toolHints.graphPreview;
    case "compare":
      return toolHints.compare;
    default:
      return null;
  }
}

function buildRevealItems(input: {
  concept: ConceptContent;
  locale: AppLocale;
  sections: readonly ResolvedConceptPageSection[];
  reveal: ConceptPageV2Reveal | null | undefined;
}) {
  const { concept, locale, sections, reveal } = input;

  if (!reveal) {
    return [] satisfies ResolvedConceptPageV2RevealItem[];
  }

  const items: ResolvedConceptPageV2RevealItem[] = [];

  for (const controlId of reveal.controlIds ?? []) {
    const label = getControlLabel(concept, controlId);

    if (label) {
      items.push({
        id: controlId,
        kind: "control",
        label,
        tone: "core",
      });
    }
  }

  for (const graphId of reveal.graphIds ?? []) {
    const label = getGraphLabel(concept, graphId);

    if (label) {
      items.push({
        id: graphId,
        kind: "graph",
        label,
        tone: "new",
      });
    }
  }

  for (const overlayId of reveal.overlayIds ?? []) {
    const label = getOverlayLabel(concept, overlayId);

    if (label) {
      items.push({
        id: overlayId,
        kind: "overlay",
        label,
        tone: "secondary",
      });
    }
  }

  for (const toolHint of reveal.toolHints ?? []) {
    const label = getToolHintLabel(locale, toolHint);

    if (label) {
      items.push({
        id: toolHint,
        kind: "tool",
        label,
        tone: "secondary",
      });
    }
  }

  for (const sectionId of [] as ConceptPageSectionId[]) {
    const label = getSectionLabel(sections, sectionId);

    if (label) {
      items.push({
        id: sectionId,
        kind: "section",
        label,
        tone: "secondary",
      });
    }
  }

  return items;
}

function resolveStepFocusPhase(
  step: Pick<ResolvedConceptPageV2Step, "inlineCheck">,
  index: number,
  total: number,
): ResolvedConceptPageV2Step["focusPhase"] {
  void step;

  if (total <= 1) {
    return "explore";
  }

  if (index === 0) {
    return "explore";
  }

  if (index === total - 1) {
    return "check";
  }

  return "understand";
}

function resolveEquationSnapshot(
  concept: ConceptContent,
): ResolvedConceptPageV2EquationSnapshot[] {
  const authoredSnapshot = concept.v2?.equationSnapshot;
  const equationIds =
    authoredSnapshot?.equationIds ??
    concept.equations.slice(0, 2).map((equation) => equation.id);
  const fallbackNote = concept.pageIntro?.keyTakeaway ?? concept.summary;

  return equationIds
    .map((equationId) => concept.equations.find((equation) => equation.id === equationId))
    .filter((equation): equation is ConceptContent["equations"][number] => Boolean(equation))
    .map((equation, index) => ({
      id: equation.id,
      label:
        authoredSnapshot?.title && index === 0
          ? authoredSnapshot.title
          : equation.label,
      latex: equation.latex,
      meaning: equation.meaning ?? fallbackNote ?? "",
      readAloud: equation.readAloud ?? null,
    }));
}

function resolveFallbackReveal(
  concept: ConceptContent,
  stepIndex: number,
  guidanceHints: ResolvedConceptPageGuidanceHint[],
): ConceptPageV2Reveal | null {
  const prompt = concept.noticePrompts.items[stepIndex] ?? concept.noticePrompts.items[0] ?? null;

  if (prompt) {
    return {
      controlIds: prompt.relatedControls?.slice(0, 4),
      graphIds: prompt.relatedGraphTabs?.slice(0, 2),
      overlayIds: prompt.relatedOverlays?.slice(0, 3),
      toolHints: stepIndex === 0 ? ["playback"] : undefined,
    };
  }

  const controlIds = guidanceHints
    .filter((hint) => hint.kind === "control")
    .slice(0, 3)
    .map((hint) => hint.id);
  const graphIds = guidanceHints
    .filter((hint) => hint.kind === "graph")
    .slice(0, 2)
    .map((hint) => hint.id);
  const overlayIds = guidanceHints
    .filter((hint) => hint.kind === "overlay")
    .slice(0, 2)
    .map((hint) => hint.id);

  if (!controlIds.length && !graphIds.length && !overlayIds.length) {
    return null;
  }

  return {
    controlIds: controlIds.length ? controlIds : undefined,
    graphIds: graphIds.length ? graphIds : undefined,
    overlayIds: overlayIds.length ? overlayIds : undefined,
  };
}

function resolveFallbackInlineCheck(
  concept: ConceptContent,
  locale: AppLocale,
  stepIndex: number,
): ResolvedConceptPageV2InlineCheck | null {
  const copy = getV2Copy(locale);

  if (stepIndex === 0 && concept.predictionMode.items[0]) {
    const item = concept.predictionMode.items[0];

    return {
      eyebrow: copy.inlineChecks.predictionEyebrow,
      title: item.prompt,
      prompt: item.changeLabel ?? item.scenarioLabel,
      supportingText: item.observationHint,
      choices: item.choices.map((choice) => choice.label),
    };
  }

  if (stepIndex === 1 && concept.quickTest.questions[0]) {
    const question = concept.quickTest.questions[0];

    return {
      eyebrow: copy.inlineChecks.graphEyebrow,
      title: question.prompt,
      prompt: question.explanation,
      supportingText: concept.quickTest.intro,
      choices: question.choices.slice(0, 3).map((choice) => choice.label),
    };
  }

  if (stepIndex === 2 && concept.sections.miniChallenge.prompt) {
    return {
      eyebrow: copy.inlineChecks.explainEyebrow,
      title: copy.inlineChecks.explainTitle,
      prompt: concept.sections.miniChallenge.prompt,
      supportingText:
        concept.sections.miniChallenge.prediction ?? concept.sections.miniChallenge.explanation,
    };
  }

  if (stepIndex >= 3 && concept.quickTest.questions[1]) {
    const question = concept.quickTest.questions[1];

    return {
      eyebrow: copy.inlineChecks.quickCheckEyebrow,
      title: question.prompt,
      prompt: question.explanation,
      supportingText: concept.quickTest.intro,
      choices: question.choices.slice(0, 3).map((choice) => choice.label),
    };
  }

  return null;
}

function resolveAuthoredInlineCheck(
  concept: ConceptContent,
  locale: AppLocale,
  inlineCheck: ConceptPageV2InlineCheck | undefined,
): ResolvedConceptPageV2InlineCheck | null {
  if (!inlineCheck) {
    return null;
  }

  const copy = getV2Copy(locale);
  const predictionItem = inlineCheck.predictionIds?.length
    ? concept.predictionMode.items.find((item) => item.id === inlineCheck.predictionIds?.[0])
    : null;
  const question = inlineCheck.questionIds?.length
    ? concept.quickTest.questions.find((item) => item.id === inlineCheck.questionIds?.[0])
    : null;

  if (predictionItem) {
    return {
      eyebrow: copy.inlineChecks.predictionEyebrow,
      title: inlineCheck.title ?? predictionItem.prompt,
      prompt: predictionItem.changeLabel ?? predictionItem.scenarioLabel,
      supportingText: inlineCheck.note ?? predictionItem.observationHint,
      choices: predictionItem.choices.map((choice) => choice.label),
    };
  }

  if (question) {
    return {
      eyebrow: copy.inlineChecks.graphEyebrow,
      title: inlineCheck.title ?? question.prompt,
      prompt: inlineCheck.note ?? question.explanation,
      choices: question.choices.map((choice) => choice.label),
    };
  }

  if (inlineCheck.includeMiniChallenge && concept.sections.miniChallenge.prompt) {
    return {
      eyebrow: copy.inlineChecks.explainEyebrow,
      title: inlineCheck.title ?? copy.inlineChecks.explainTitle,
      prompt: concept.sections.miniChallenge.prompt,
      supportingText:
        inlineCheck.note ??
        concept.sections.miniChallenge.prediction ??
        concept.sections.miniChallenge.explanation,
    };
  }

  return null;
}

function resolveFallbackSteps(
  concept: ConceptContent,
  locale: AppLocale,
  sections: readonly ResolvedConceptPageSection[],
): ResolvedConceptPageV2Step[] {
  const copy = getV2Copy(locale).fallback;
  const guidance = resolveConceptPageGuidance(concept);
  const hints = guidance?.hints ?? [];
  const starterTasks = concept.simulation.ui?.starterExploreTasks ?? [];
  const quickTestQuestion = concept.quickTest.questions[0] ?? null;
  const secondQuickTestQuestion = concept.quickTest.questions[1] ?? null;
  const keyIdeas = concept.sections.keyIdeas;

  const fallbackSteps = [
    {
      id: "start-with-the-live-model",
      label: copy.steps.seePattern.title,
      summary: copy.steps.seePattern.goal,
      goal: pickFirstText(
        concept.pageIntro?.definition,
        concept.summary,
      ),
      doThis: pickFirstText(
        starterTasks[0],
        guidance?.action,
        concept.sections.explanation.paragraphs[0],
      ),
      notice: pickFirstText(
        guidance?.detail,
        keyIdeas[0],
        concept.pageIntro?.keyTakeaway,
      ),
      explain: pickFirstText(
        concept.sections.explanation.paragraphs[0],
        concept.pageIntro?.whyItMatters,
      ),
      reveal: resolveFallbackReveal(concept, 0, hints),
      setup: null,
      inlineCheck: resolveFallbackInlineCheck(concept, locale, 0),
    },
    {
      id: "connect-the-pattern",
      label: copy.steps.changeObserve.title,
      summary: copy.steps.changeObserve.goal,
      goal: pickFirstText(
        concept.pageIntro?.keyTakeaway,
        concept.sections.workedExamples.intro,
        concept.sections.explanation.paragraphs[1],
      ),
      doThis: pickFirstText(
        starterTasks[1],
        concept.sections.workedExamples.intro,
        keyIdeas[0],
      ),
      notice: pickFirstText(
        keyIdeas[0],
        concept.sections.commonMisconception.myth,
        concept.pageIntro?.whyItMatters,
      ),
      explain: pickFirstText(
        concept.sections.commonMisconception.correction[0],
        concept.sections.explanation.paragraphs[1],
        concept.pageIntro?.keyTakeaway,
      ),
      reveal: resolveFallbackReveal(concept, 1, hints),
      setup: null,
      inlineCheck: resolveFallbackInlineCheck(concept, locale, 1),
    },
    {
      id: "explain-the-pattern",
      label: copy.steps.explainPattern.title,
      summary: copy.steps.explainPattern.goal,
      goal: pickFirstText(
        concept.sections.workedExamples.intro,
        concept.sections.commonMisconception.myth,
        concept.pageIntro?.keyTakeaway,
      ),
      doThis: pickFirstText(
        concept.sections.workedExamples.items[0]?.prompt,
        concept.sections.miniChallenge.prompt,
        starterTasks[2],
      ),
      notice: pickFirstText(
        concept.sections.commonMisconception.myth,
        keyIdeas[1],
        concept.sections.workedExamples.intro,
      ),
      explain: pickFirstText(
        concept.sections.commonMisconception.correction[0],
        concept.sections.miniChallenge.explanation,
        concept.pageIntro?.keyTakeaway,
      ),
      reveal: resolveFallbackReveal(concept, 2, hints),
      setup: null,
      inlineCheck: resolveFallbackInlineCheck(concept, locale, 2),
    },
    {
      id: "check-what-you-can-explain",
      label: copy.steps.checkUnderstanding.title,
      summary: copy.steps.checkUnderstanding.goal,
      goal: pickFirstText(
        concept.quickTest.intro,
        concept.sections.miniChallenge.prompt,
        concept.pageIntro?.keyTakeaway,
      ),
      doThis: pickFirstText(
        concept.sections.miniChallenge.prompt,
        quickTestQuestion?.prompt,
        starterTasks[2],
      ),
      notice: pickFirstText(
        secondQuickTestQuestion?.prompt,
        concept.sections.miniChallenge.prediction,
        concept.sections.commonMisconception.myth,
        quickTestQuestion?.explanation,
      ),
      explain: pickFirstText(
        secondQuickTestQuestion?.explanation,
        concept.sections.miniChallenge.explanation,
        concept.pageIntro?.keyTakeaway,
        concept.sections.commonMisconception.correction[0],
      ),
      reveal: resolveFallbackReveal(concept, 3, hints),
      setup: null,
      inlineCheck: resolveFallbackInlineCheck(concept, locale, 3),
    },
  ] satisfies Array<Omit<ResolvedConceptPageV2Step, "hashId" | "revealItems" | "focusPhase">>;

  return fallbackSteps.map((step, index, allSteps) => ({
    ...step,
    hashId: buildStepHashId(step.id),
    revealItems: buildRevealItems({
      concept,
      locale,
      sections,
      reveal: step.reveal,
    }),
    focusPhase: resolveStepFocusPhase(step, index, allSteps.length),
  }));
}

function resolveAuthoredSteps(
  concept: ConceptContent,
  locale: AppLocale,
  sections: readonly ResolvedConceptPageSection[],
): ResolvedConceptPageV2Step[] {
  const v2 = concept.v2;

  if (!v2?.guidedSteps.length) {
    return [];
  }

  return v2.guidedSteps.map((step, index, allSteps) => {
    const reveal = step.reveal ?? null;
    const resolved: Omit<ResolvedConceptPageV2Step, "focusPhase"> = {
      id: step.id,
      hashId: buildStepHashId(step.id),
      label: step.title,
      summary: null,
      goal: step.goal,
      doThis: step.doThis,
      notice: step.notice,
      explain: step.explain,
      reveal,
      revealItems: buildRevealItems({
        concept,
        locale,
        sections,
        reveal,
      }),
      inlineCheck: resolveAuthoredInlineCheck(concept, locale, step.inlineCheck),
      setup: step.setup ?? null,
    };

    return {
      ...resolved,
      focusPhase: resolveStepFocusPhase(resolved, index, allSteps.length),
    };
  });
}

function resolveWrapUpSections(
  resolvedSections: readonly ResolvedConceptPageSection[],
  referenceSections: readonly ResolvedConceptPageSection[],
) {
  const referenceIds = new Set(referenceSections.map((section) => section.id));

  return resolvedSections.filter(
    (section) =>
      !referenceIds.has(section.id) &&
      ["readNext"].includes(section.id),
  );
}

function resolveReferenceSections(
  concept: ConceptContent,
  resolvedSections: readonly ResolvedConceptPageSection[],
) {
  const authoredReferenceIds = concept.v2?.referenceSections;
  const referenceIds = [
    ...(
    authoredReferenceIds ??
    (["explanation", "keyIdeas", "workedExamples", "quickTest", "accessibility"] as const)
    ),
    ...(resolvedSections.some((section) => section.id === "quickTest") ? (["quickTest"] as const) : []),
  ];

  return [...new Set(referenceIds)]
    .map((sectionId) => resolvedSections.find((section) => section.id === sectionId))
    .filter((section): section is ResolvedConceptPageSection => Boolean(section));
}

function resolveFallbackWrapUpLearned(concept: ConceptContent) {
  const keyTakeaway = normalizeText(concept.pageIntro?.keyTakeaway);
  const keyTakeawayKey = keyTakeaway
    ? normalizeTextForDeduplication(keyTakeaway)
    : null;
  const distinctKeyIdeas = concept.sections.keyIdeas.filter((item) => {
    const normalized = normalizeText(item);

    if (!normalized) {
      return false;
    }

    return !keyTakeawayKey || normalizeTextForDeduplication(normalized) !== keyTakeawayKey;
  });

  if (distinctKeyIdeas.length) {
    return distinctKeyIdeas.slice(0, 2);
  }

  return keyTakeaway ? [keyTakeaway] : [];
}

function resolveWrapUp(
  concept: ConceptContent,
  locale: AppLocale,
  readNext: ReadNextRecommendation[],
  sections: readonly ResolvedConceptPageSection[],
): ResolvedConceptPageV2WrapUp {
  const wrapUp = concept.v2?.wrapUp;
  const learned = dedupeResolvedText(
    wrapUp?.learned?.length
      ? wrapUp.learned
      : resolveFallbackWrapUpLearned(concept),
  );

  const authoredNextConcepts =
    wrapUp?.nextConcepts?.map((item) => ({
      slug: item.slug,
      title:
        item.title ??
        readNext.find((entry) => entry.slug === item.slug)?.title ??
        item.slug,
      reasonLabel: item.reasonLabel ?? null,
    })) ?? [];
  const nextConcepts =
    authoredNextConcepts.length > 0
      ? authoredNextConcepts
      : readNext.slice(0, 3).map((entry) => ({
          slug: entry.slug,
          title: entry.title,
          reasonLabel: entry.reasonLabel ?? null,
        }));
  const workedExamplesSection = sections.find((section) => section.id === "workedExamples");

  return {
    learned,
    misconception: normalizeText(wrapUp?.misconception ?? concept.sections.commonMisconception.myth)
      ? {
          myth: wrapUp?.misconception ?? concept.sections.commonMisconception.myth,
          correction:
            concept.sections.commonMisconception.correction[0] ?? null,
        }
      : null,
    testHref: wrapUp?.testCta === false ? null : buildConceptTestHref(concept.slug),
    reviewHref: buildConceptReviewHref(concept.slug),
    nextConcepts,
    freePlayHref: `#${conceptShareAnchorIds.liveBench}`,
    challengeHref:
      (concept.challengeMode?.items.length ?? 0) > 0
        ? `${addLocalePrefix(
            `/concepts/${concept.slug}`,
            locale,
          )}?${conceptLearningPhaseQueryParam}=check#${conceptShareAnchorIds.challengeMode}`
        : null,
    workedExamplesHref: workedExamplesSection
      ? `#${getConceptSectionAnchorId(workedExamplesSection.id)}`
      : null,
  };
}

export function resolveConceptPageV2(
  concept: ConceptContent,
  options: {
    locale?: AppLocale;
    readNext?: ReadNextRecommendation[];
  } = {},
): ResolvedConceptPageV2 {
  const locale = options.locale ?? "en";
  const readNext = options.readNext ?? [];
  const resolvedSections = resolveConceptPageSections(concept, {
    locale,
    readNext,
  });
  const steps = resolveAuthoredSteps(concept, locale, resolvedSections);
  const resolvedSteps =
    steps.length > 0 ? steps : resolveFallbackSteps(concept, locale, resolvedSections);
  const referenceSections = resolveReferenceSections(concept, resolvedSections);
  const wrapUpSections = resolveWrapUpSections(resolvedSections, referenceSections);

  return {
    title: concept.title,
    intuition:
      concept.v2?.intuition ??
      concept.pageIntro?.definition ??
      concept.summary,
    whyItMatters:
      concept.v2?.whyItMatters ??
      concept.pageIntro?.whyItMatters ??
      null,
    estimatedMinutes:
      concept.v2?.estimatedMinutes ??
      concept.estimatedStudyMinutes ??
      null,
    prerequisites: resolvePrerequisites(concept),
    simulationPreview: resolveSimulationPreview(concept, locale),
    keyTakeaway: concept.pageIntro?.keyTakeaway ?? null,
    equationSnapshotNote: concept.v2?.equationSnapshot?.note ?? null,
    equationSnapshot: resolveEquationSnapshot(concept),
    startSetup: concept.v2?.startSetup ?? null,
    source: steps.length > 0 ? "authored" : "fallback",
    steps: resolvedSteps,
    wrapUp: resolveWrapUp(concept, locale, readNext, resolvedSections),
    wrapUpSections,
    referenceSections,
  };
}

export function resolveConceptPageV2StepIdFromLegacyPhase(
  model: Pick<ResolvedConceptPageV2, "steps">,
  phaseId: "explore" | "understand" | "check" | null | undefined,
) {
  if (!phaseId) {
    return model.steps[0]?.id ?? null;
  }

  return (
    model.steps.find((step) => step.focusPhase === phaseId)?.id ??
    model.steps.at(phaseId === "check" ? -1 : phaseId === "understand" ? 1 : 0)?.id ??
    model.steps[0]?.id ??
    null
  );
}

export function resolveConceptPageV2StepIdFromHash(
  model: Pick<ResolvedConceptPageV2, "steps">,
  hashId: string,
) {
  if (!hashId) {
    return null;
  }

  const normalizedHash = hashId.replace(/^#/, "");

  if (normalizedHash.startsWith(conceptPageV2StepHashPrefix)) {
    const stepId = normalizedHash.slice(conceptPageV2StepHashPrefix.length);
    return model.steps.some((step) => step.id === stepId) ? stepId : null;
  }

  if (
    normalizedHash === conceptShareAnchorIds.quickTest ||
    normalizedHash === conceptShareAnchorIds.challengeMode ||
    normalizedHash === conceptShareAnchorIds.readNext ||
    normalizedHash === conceptShareAnchorIds.workedExamples
  ) {
    return model.steps.at(-1)?.id ?? null;
  }

  return null;
}
