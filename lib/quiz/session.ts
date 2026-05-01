import type { ConceptContent, ConceptWorkedExample } from "@/lib/content";
import { resolveLiveWorkedExample, type LiveWorkedExampleState } from "@/lib/learning/liveWorkedExamples";
import { resolveSupplementalLiveWorkedExample } from "@/lib/learning/supplementalWorkedExamples";
import { buildFriendlyTimeCandidates, chooseAlternativeFriendlyValue, collectFriendlyNumericCandidates } from "./mental-math";
import { createSeededRng } from "./rng";
import { resolveConceptQuizDefinition, getGeneratedQuestionSlotCount } from "./definition";
import { formatPiRadians, simplePiAnglePool } from "./symbolic";
import type {
  ConceptQuizSession,
  GeneratedQuizQuestionTemplateDefinition,
  QuizChoice,
  QuizGiven,
  QuizInstantiationOptions,
  QuizQuestionInstance,
  QuizWorkedExampleResolution,
} from "./types";

const missingWorkedExampleBuilderPattern = /Missing live worked-example builder/i;
const workedExampleTokenPattern = /\{\{[a-zA-Z0-9_-]+\}\}/;

function isStaticWorkedExample(example: ConceptWorkedExample) {
  return [
    example.prompt,
    ...example.steps.map((step) => step.template),
    example.resultTemplate,
    example.interpretationTemplate,
  ]
    .filter((template): template is string => Boolean(template))
    .every((template) => !workedExampleTokenPattern.test(template));
}

function resolveStaticWorkedExample(example: ConceptWorkedExample): QuizWorkedExampleResolution {
  return {
    example,
    prompt: example.prompt,
    steps: example.steps.map((step) => ({
      id: step.id,
      label: step.label,
      content: step.template,
    })),
    resultLabel: example.resultLabel,
    resultContent: example.resultTemplate,
    interpretation: example.interpretationTemplate,
    variableValues: example.variables.reduce<Record<string, string>>((accumulator, variable) => {
      accumulator[variable.id] = variable.valueKey;
      return accumulator;
    }, {}),
  };
}

function resolveWorkedExampleForQuiz(
  concept: ConceptContent,
  example: ConceptWorkedExample,
  state: LiveWorkedExampleState,
  locale: "en" | "zh-HK",
): QuizWorkedExampleResolution {
  try {
    const resolved = resolveLiveWorkedExample(concept.slug, example, state, locale);
    return {
      example,
      ...resolved,
    };
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !missingWorkedExampleBuilderPattern.test(error.message)
    ) {
      throw error;
    }

    const supplemental = resolveSupplementalLiveWorkedExample(concept.slug, example, state);

    if (supplemental) {
      return {
        example,
        ...supplemental,
      };
    }

    if (isStaticWorkedExample(example)) {
      return resolveStaticWorkedExample(example);
    }

    throw error;
  }
}

function findWorkedExample(
  concept: ConceptContent,
  exampleId: string,
) {
  return concept.sections.workedExamples.items.find((item) => item.id === exampleId) ?? null;
}

function getRelevantParamIds(
  concept: ConceptContent,
  example: ConceptWorkedExample,
) {
  const params = new Set<string>();

  for (const variable of example.variables) {
    if (!variable.variableId) {
      continue;
    }

    const linkedVariable = concept.variableLinks.find((item) => item.id === variable.variableId);

    if (linkedVariable?.param) {
      params.add(linkedVariable.param);
    }
  }

  for (const patchKey of Object.keys(example.applyAction?.patch ?? {})) {
    params.add(patchKey);
  }

  return [...params];
}

function isSliderControl(
  control: ConceptContent["simulation"]["controls"][number],
): control is Extract<ConceptContent["simulation"]["controls"][number], { kind: "slider" }> {
  return control.kind === "slider";
}

function buildBaseWorkedExampleState(
  concept: ConceptContent,
  example: ConceptWorkedExample,
  seed: string,
  slotIndex: number,
): LiveWorkedExampleState {
  const rng = createSeededRng(seed);
  const preferredPreset =
    (example.applyAction?.presetId
      ? concept.simulation.presets.find((preset) => preset.id === example.applyAction?.presetId)
      : null) ?? null;
  const availablePresets = preferredPreset
    ? [preferredPreset, ...concept.simulation.presets.filter((preset) => preset.id !== preferredPreset.id)]
    : concept.simulation.presets;
  const chosenPreset =
    availablePresets.length > 0
      ? availablePresets[(slotIndex + rng.int(availablePresets.length)) % availablePresets.length]!
      : null;
  const params: LiveWorkedExampleState["params"] = {
    ...concept.simulation.defaults,
    ...(chosenPreset?.values ?? {}),
  };
  const relevantParamIds = getRelevantParamIds(concept, example);
  const numericControls = concept.simulation.controls.filter(
    (
      control,
    ): control is Extract<ConceptContent["simulation"]["controls"][number], { kind: "slider" }> =>
      isSliderControl(control) &&
      (relevantParamIds.length === 0 || relevantParamIds.includes(control.param)),
  );

  if (numericControls.length > 0) {
    const primaryControl = numericControls[slotIndex % numericControls.length]!;
    const primaryCurrent = typeof params[primaryControl.param] === "number"
      ? (params[primaryControl.param] as number)
      : primaryControl.min;
    const primaryNext = chooseAlternativeFriendlyValue({
      min: primaryControl.min,
      max: primaryControl.max,
      step: primaryControl.step,
      current: primaryCurrent,
      presetValues: concept.simulation.presets
        .map((preset) => preset.values[primaryControl.param])
        .filter((value): value is number => typeof value === "number"),
      offset: slotIndex,
    });

    if (primaryNext !== null) {
      params[primaryControl.param] = primaryNext;
    }

    if (numericControls.length > 1 && rng.next() > 0.45) {
      const secondaryControl = numericControls[(slotIndex + 1) % numericControls.length]!;
      const secondaryCurrent = typeof params[secondaryControl.param] === "number"
        ? (params[secondaryControl.param] as number)
        : secondaryControl.min;
      const secondaryNext = chooseAlternativeFriendlyValue({
        min: secondaryControl.min,
        max: secondaryControl.max,
        step: secondaryControl.step,
        current: secondaryCurrent,
        presetValues: concept.simulation.presets
          .map((preset) => preset.values[secondaryControl.param])
          .filter((value): value is number => typeof value === "number"),
        offset: slotIndex + 1,
      });

      if (secondaryNext !== null) {
        params[secondaryControl.param] = secondaryNext;
      }
    }
  }

  if (
    concept.slug === "static-equilibrium-centre-of-mass" &&
    example.id === "current-centre-of-mass" &&
    Math.abs(typeof params.cargoPosition === "number" ? params.cargoPosition : 0) < 0.1
  ) {
    const preferredPosition = preferredPreset?.values.cargoPosition;
    const presetPosition = chosenPreset?.values.cargoPosition;
    params.cargoPosition =
      typeof preferredPosition === "number" && Math.abs(preferredPosition) >= 0.1
        ? preferredPosition
        : typeof presetPosition === "number" && Math.abs(presetPosition) >= 0.1
          ? presetPosition
          : 0.8;
  }

  const timeCandidates = buildFriendlyTimeCandidates(slotIndex % 3 === 0 ? 1 : 0);
  const time = example.dependsOnTime
    ? timeCandidates[slotIndex % timeCandidates.length] ?? 1
    : 0;

  return {
    slug: concept.slug,
    params,
    time,
    timeSource: "preview",
    activeGraphId: concept.graphs[0]?.id ?? null,
    interactionMode: "explore",
    activeCompareTarget: null,
    activePresetId: chosenPreset?.id ?? null,
  };
}

function serializeStateSignature(state: LiveWorkedExampleState) {
  return JSON.stringify({
    params: state.params,
    time: state.time,
    activePresetId: state.activePresetId,
  });
}

function buildAlternativeWorkedExampleStates(
  concept: ConceptContent,
  example: ConceptWorkedExample,
  baseState: LiveWorkedExampleState,
  seed: string,
) {
  const relevantParamIds = getRelevantParamIds(concept, example);
  const numericControls = concept.simulation.controls.filter(
    (
      control,
    ): control is Extract<ConceptContent["simulation"]["controls"][number], { kind: "slider" }> =>
      isSliderControl(control) &&
      (relevantParamIds.length === 0 || relevantParamIds.includes(control.param)),
  );
  const signatures = new Set<string>([serializeStateSignature(baseState)]);
  const nextStates: LiveWorkedExampleState[] = [];

  const pushState = (state: LiveWorkedExampleState) => {
    const signature = serializeStateSignature(state);

    if (signatures.has(signature)) {
      return;
    }

    signatures.add(signature);
    nextStates.push(state);
  };

  for (const control of numericControls) {
    const currentValue =
      typeof baseState.params[control.param] === "number"
        ? (baseState.params[control.param] as number)
        : control.min;
    const candidates = collectFriendlyNumericCandidates({
      min: control.min,
      max: control.max,
      step: control.step,
      current: currentValue,
      presetValues: concept.simulation.presets
        .map((preset) => preset.values[control.param])
        .filter((value): value is number => typeof value === "number"),
    }).filter((candidate) => candidate !== currentValue);

    for (const candidate of candidates.slice(0, 4)) {
      pushState({
        ...baseState,
        params: {
          ...baseState.params,
          [control.param]: candidate,
        },
      });
    }
  }

  if (example.dependsOnTime) {
    for (const timeCandidate of buildFriendlyTimeCandidates(baseState.time)) {
      if (timeCandidate === baseState.time) {
        continue;
      }

      pushState({
        ...baseState,
        time: timeCandidate,
      });
    }
  }

  for (const preset of concept.simulation.presets) {
    if (preset.id === baseState.activePresetId) {
      continue;
    }

    pushState({
      ...baseState,
      params: {
        ...concept.simulation.defaults,
        ...preset.values,
      },
      activePresetId: preset.id,
    });
  }

  if (nextStates.length < 6 && numericControls.length > 0) {
    for (let index = 0; index < 8; index += 1) {
      pushState(
        buildBaseWorkedExampleState(
          concept,
          example,
          `${seed}:alt:${index}`,
          index + 1,
        ),
      );
    }
  }

  return nextStates;
}

function buildExplanationContent(resolution: QuizWorkedExampleResolution) {
  const sections = resolution.steps.map(
    (step) => `${step.label}\n${step.content}`,
  );

  sections.push(`${resolution.resultLabel}\n${resolution.resultContent}`);

  if (resolution.interpretation) {
    sections.push(resolution.interpretation);
  }

  return sections.join("\n\n");
}

function formatPromptSymbol(symbol: string) {
  return symbol
    .replace(/\\mathrm\{([^{}]+)\}/g, "$1")
    .replace(/\\lambda/g, "λ")
    .replace(/\\theta/g, "θ")
    .replace(/\\Delta/g, "Δ")
    .replace(/\\omega/g, "ω")
    .replace(/\\alpha/g, "α")
    .replace(/\\beta/g, "β")
    .replace(/\\mu/g, "μ")
    .replace(/\\pi/g, "π")
    .replace(/_\{([^}]+)\}/g, "_$1")
    .replace(/\\/g, "");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function valueAlreadyIncludesUnit(value: string, unit: string) {
  const normalizedValue = value.trim().toLowerCase();
  const normalizedUnit = unit.trim().toLowerCase();

  if (!normalizedValue || !normalizedUnit) {
    return false;
  }

  if (normalizedUnit === "deg") {
    return /(?:°|\bdeg\b|\bdegrees?\b)/i.test(value);
  }

  const unitPattern = new RegExp(
    `(?:^|\\s|[({])${escapeRegExp(normalizedUnit)}(?:$|\\s|[),.;])`,
    "i",
  );

  return unitPattern.test(normalizedValue);
}

function getDisplayUnit(value: string, unit?: string) {
  if (!unit || valueAlreadyIncludesUnit(value, unit)) {
    return undefined;
  }

  return unit;
}

function normalizeSetupMatchText(content: string) {
  return formatPromptSymbol(
    content
      .replace(/\$+/g, "")
      .replace(/\\mathrm\{([^{}]+)\}/g, "$1")
      .replace(/\\,/g, " ")
      .replace(/\\;/g, " ")
      .replace(/\\quad\b/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function buildWorkedExamplePrompt(input: {
  resolution: QuizWorkedExampleResolution;
  givens: QuizGiven[];
  targetVariableId?: string;
  answerSource: "result" | "variable";
  locale: "en" | "zh-HK";
}) {
  const isZhHk = input.locale === "zh-HK";
  const normalizedPromptText = normalizeSetupMatchText(input.resolution.prompt);
  const summaryParts = input.givens.slice(0, 3).map((given) => {
    const symbolOrLabel = given.symbol ? formatPromptSymbol(given.symbol) : given.label;

    return `${symbolOrLabel} = ${given.value}${given.unit ? ` ${given.unit}` : ""}`;
  });
  const promptAlreadyStatesSetup = summaryParts.length > 0
    && summaryParts.every((summaryPart) =>
      normalizedPromptText.includes(normalizeSetupMatchText(summaryPart)),
    );
  const setupLead = promptAlreadyStatesSetup
    ? ""
    : summaryParts.length > 0
      ? isZhHk
        ? `對於這個生成設定（${summaryParts.join("，")}），`
        : `For this generated setup (${summaryParts.join(", ")}), `
      : isZhHk
        ? "對於這個生成設定，"
        : "For this generated setup, ";

  if (input.answerSource === "variable" && input.targetVariableId) {
    const variable = input.resolution.example.variables.find(
      (item) => item.id === input.targetVariableId,
    );

    if (variable) {
      if (isZhHk) {
        return `${input.resolution.prompt}\n\n${setupLead}哪個數值符合${variable.label}？`;
      }

      return `${input.resolution.prompt}\n\n${setupLead}${setupLead ? "which" : "Which"} value matches ${variable.label}?`;
    }
  }

  if (isZhHk) {
    return `${input.resolution.prompt}\n\n${setupLead}選出相符的結果。`;
  }

  return `${input.resolution.prompt}\n\n${setupLead}${setupLead ? "choose" : "Choose"} the result that fits.`;
}

function buildWorkedExampleGivens(input: {
  resolution: QuizWorkedExampleResolution;
  targetVariableId?: string;
}) {
  const concreteVariables = input.resolution.example.variables.filter(
    (variable) => (input.resolution.variableValues[variable.id] ?? "—") !== "—",
  );
  const primaryVariables = concreteVariables.filter(
    (variable) =>
      Boolean(variable.variableId) ||
      variable.id === "time" ||
      /time/i.test(variable.label),
  );
  const sourceVariables = [
    ...primaryVariables,
    ...concreteVariables.filter((variable) => !primaryVariables.includes(variable)),
  ];

  return (sourceVariables.length ? sourceVariables : input.resolution.example.variables)
    .filter((variable) => variable.id !== input.targetVariableId)
    .map((variable) => {
      const value = input.resolution.variableValues[variable.id] ?? "—";

      return {
        id: variable.id,
        label: variable.label,
        symbol: variable.symbol ? formatPromptSymbol(variable.symbol) : variable.symbol,
        value,
        unit: getDisplayUnit(value, variable.unit),
      } satisfies QuizGiven;
    })
    .slice(0, 4);
}

function buildChoiceSet(labels: string[], correctLabel: string, seed: string) {
  const alphabet = ["a", "b", "c", "d", "e", "f"];
  const rng = createSeededRng(seed);
  const orderedLabels = rng.shuffle(labels).slice(0, 4);
  const choices: QuizChoice[] = orderedLabels.map((label, index) => ({
    id: alphabet[index] ?? `choice-${index + 1}`,
    label,
  }));
  const correctChoice = choices.find((choice) => choice.label === correctLabel);

  if (!correctChoice) {
    throw new Error("Generated question choices lost the correct answer.");
  }

  return {
    choices,
    correctChoiceId: correctChoice.id,
  };
}

function buildWorkedExampleQuestionInstance(input: {
  concept: ConceptContent;
  template: Extract<GeneratedQuizQuestionTemplateDefinition, { kind: "worked-example-result" }>;
  canonicalQuestionId: string;
  instanceId: string;
  locale: "en" | "zh-HK";
  seed: string;
  slotIndex: number;
}) {
  const example = findWorkedExample(input.concept, input.template.exampleId);

  if (!example) {
    throw new Error(
      `Concept "${input.concept.slug}" is missing worked example "${input.template.exampleId}" for quiz generation.`,
    );
  }

  const baseState = buildBaseWorkedExampleState(
    input.concept,
    example,
    input.seed,
    input.slotIndex,
  );
  const baseResolution = resolveWorkedExampleForQuiz(
    input.concept,
    example,
    baseState,
    input.locale,
  );
  const alternativeStates = buildAlternativeWorkedExampleStates(
    input.concept,
    example,
    baseState,
    input.seed,
  );
  const alternativeResolutions = alternativeStates.map((state) => ({
    state,
    resolution: resolveWorkedExampleForQuiz(input.concept, example, state, input.locale),
  }));
  const variableCandidates = example.variables.map((variable) => ({
    answerSource: "variable" as const,
    variableId: variable.id,
    labels: new Set<string>([
      baseResolution.variableValues[variable.id] ?? "—",
      ...alternativeResolutions.map(
        (entry) => entry.resolution.variableValues[variable.id] ?? "—",
      ),
    ]),
  }));
  const resultCandidate = {
    answerSource: "result" as const,
    variableId: undefined,
    labels: new Set<string>([
      baseResolution.resultContent,
      ...alternativeResolutions.map((entry) => entry.resolution.resultContent),
    ]),
  };
  const answerCandidate = resultCandidate.labels.size >= 4
    ? resultCandidate
    : variableCandidates
        .sort((left, right) => right.labels.size - left.labels.size)
        .find((candidate) => candidate.labels.size >= 4) ?? resultCandidate;
  const correctLabel =
    answerCandidate.answerSource === "result"
      ? baseResolution.resultContent
      : baseResolution.variableValues[answerCandidate.variableId!] ?? "—";
  const distractorLabels = alternativeResolutions
    .map((entry) =>
      answerCandidate.answerSource === "result"
        ? entry.resolution.resultContent
        : entry.resolution.variableValues[answerCandidate.variableId!] ?? "—",
    )
    .filter((label, index, labels) => label !== correctLabel && labels.indexOf(label) === index)
    .slice(0, 3);

  if (distractorLabels.length < 3) {
    throw new Error(
      `Concept "${input.concept.slug}" quiz template "${input.template.id}" could not generate unique distractors.`,
    );
  }

  const { choices, correctChoiceId } = buildChoiceSet(
    [correctLabel, ...distractorLabels],
    correctLabel,
    `${input.seed}:choices`,
  );
  const givens = buildWorkedExampleGivens({
    resolution: baseResolution,
    targetVariableId: answerCandidate.variableId,
  });

  return {
    instanceId: input.instanceId,
    canonicalQuestionId: input.canonicalQuestionId,
    kind: "generated" as const,
    templateId: input.template.canonicalTemplateId,
    type: input.template.questionType,
    prompt: buildWorkedExamplePrompt({
      resolution: baseResolution,
      givens,
      targetVariableId: answerCandidate.variableId,
      answerSource: answerCandidate.answerSource,
      locale: input.locale,
    }),
    givens,
    choices,
    correctChoiceId,
    formattedCorrectAnswer: correctLabel,
    explanation: buildExplanationContent(baseResolution),
    showMeAction: example.applyAction,
    generationSource: input.template.origin,
    isParameterized: input.template.isParameterized,
    parameterSnapshot: {
      params: { ...baseState.params },
      time: baseState.time,
      activePresetId: baseState.activePresetId,
      answerSource: answerCandidate.answerSource,
      answerVariableId: answerCandidate.variableId,
      note: example.title,
    },
  } satisfies QuizQuestionInstance;
}

function buildExactAngleQuestionInstance(input: {
  concept: ConceptContent;
  template: Extract<GeneratedQuizQuestionTemplateDefinition, { kind: "exact-angle-radians" }>;
  canonicalQuestionId: string;
  instanceId: string;
  seed: string;
}) {
  const rng = createSeededRng(input.seed);
  const angle = simplePiAnglePool[rng.int(simplePiAnglePool.length)]!;
  const correctLabel = formatPiRadians({
    numerator: angle.numerator,
    denominator: angle.denominator,
  });
  const distractorLabels = [
    formatPiRadians({
      numerator: angle.numerator,
      denominator: angle.denominator * 2,
    }),
    formatPiRadians({
      numerator: angle.numerator * 2,
      denominator: angle.denominator,
    }),
    formatPiRadians({
      numerator: Math.max(1, angle.denominator - angle.numerator),
      denominator: angle.denominator,
    }),
  ].filter((label, index, labels) => label !== correctLabel && labels.indexOf(label) === index);

  const fallbackDistractors = simplePiAnglePool
    .map((candidate) =>
      formatPiRadians({
        numerator: candidate.numerator,
        denominator: candidate.denominator,
      }),
    )
    .filter((label, index, labels) => label !== correctLabel && labels.indexOf(label) === index);

  for (const label of fallbackDistractors) {
    if (distractorLabels.length >= 3) {
      break;
    }

    if (!distractorLabels.includes(label)) {
      distractorLabels.push(label);
    }
  }

  const { choices, correctChoiceId } = buildChoiceSet(
    [correctLabel, ...distractorLabels.slice(0, 3)],
    correctLabel,
    `${input.seed}:choices`,
  );

  return {
    instanceId: input.instanceId,
    canonicalQuestionId: input.canonicalQuestionId,
    kind: "generated" as const,
    templateId: input.template.canonicalTemplateId,
    type: input.template.questionType,
    prompt: `A generated angle on ${input.concept.title} is ${angle.degrees}°. Which exact radian measure matches it?`,
    givens: [
      {
        id: "degrees",
        label: "Angle",
        value: `${angle.degrees}°`,
      },
    ],
    choices,
    correctChoiceId,
    formattedCorrectAnswer: correctLabel,
    explanation: `${angle.degrees}° = ${angle.degrees}/180 × π, so the exact radian measure simplifies to ${correctLabel}.`,
    parameterSnapshot: {
      params: {},
      time: 0,
      activePresetId: null,
      answerSource: "result",
      note: `${angle.degrees}° to radians`,
    },
  } satisfies QuizQuestionInstance;
}

function buildMisconceptionQuestionInstance(input: {
  concept: ConceptContent;
  template: Extract<GeneratedQuizQuestionTemplateDefinition, { kind: "misconception-check" }>;
  canonicalQuestionId: string;
  instanceId: string;
  seed: string;
}) {
  const promptVariants = [
    `Which statement is the misconception this concept warns against?`,
    `Which claim should you reject on ${input.concept.title}?`,
    `Which statement contradicts the correction on this concept page?`,
    `Which statement is the myth, not the key idea, for ${input.concept.title}?`,
    `Which statement does the concept explicitly correct?`,
  ];
  const distractorPool = [
    ...input.concept.sections.commonMisconception.correction,
    ...input.concept.sections.keyIdeas,
  ];
  const rng = createSeededRng(input.seed);
  const uniqueDistractors = rng
    .shuffle(distractorPool)
    .filter(
      (label, index, labels) =>
        label !== input.concept.sections.commonMisconception.myth &&
        labels.indexOf(label) === index,
    )
    .slice(0, 3);

  if (uniqueDistractors.length < 3) {
    throw new Error(
      `Concept "${input.concept.slug}" misconception template could not generate enough distractors.`,
    );
  }

  const correctLabel = input.concept.sections.commonMisconception.myth;
  const { choices, correctChoiceId } = buildChoiceSet(
    [correctLabel, ...uniqueDistractors],
    correctLabel,
    `${input.seed}:choices`,
  );

  return {
    instanceId: input.instanceId,
    canonicalQuestionId: input.canonicalQuestionId,
    kind: "generated" as const,
    templateId: input.template.canonicalTemplateId,
    type: input.template.questionType,
    prompt: promptVariants[rng.int(promptVariants.length)]!,
    choices,
    correctChoiceId,
    formattedCorrectAnswer: correctLabel,
    explanation: input.concept.sections.commonMisconception.correction.join("\n\n"),
    generationSource: input.template.origin,
    isParameterized: input.template.isParameterized,
  } satisfies QuizQuestionInstance;
}

function buildGeneratedQuestionInstance(input: {
  concept: ConceptContent;
  template: GeneratedQuizQuestionTemplateDefinition;
  canonicalQuestionId: string;
  instanceId: string;
  locale: "en" | "zh-HK";
  seed: string;
  slotIndex: number;
}) {
  switch (input.template.kind) {
    case "worked-example-result":
      return buildWorkedExampleQuestionInstance({
        concept: input.concept,
        template: input.template,
        canonicalQuestionId: input.canonicalQuestionId,
        instanceId: input.instanceId,
        locale: input.locale,
        seed: input.seed,
        slotIndex: input.slotIndex,
      });
    case "exact-angle-radians":
      return buildExactAngleQuestionInstance({
        concept: input.concept,
        template: input.template,
        canonicalQuestionId: input.canonicalQuestionId,
        instanceId: input.instanceId,
        seed: input.seed,
      });
    case "misconception-check":
      return buildMisconceptionQuestionInstance({
        concept: input.concept,
        template: input.template,
        canonicalQuestionId: input.canonicalQuestionId,
        instanceId: input.instanceId,
        seed: input.seed,
      });
    default:
      throw new Error(`Unsupported generated quiz template "${(input.template as { kind: string }).kind}".`);
  }
}

function buildStaticQuestionInstance(
  question: ConceptQuizSession["definition"]["staticQuestions"][number],
): QuizQuestionInstance {
  const correctChoice = question.choices.find((choice) => choice.id === question.correctChoiceId);

  if (!correctChoice) {
    throw new Error(`Static question "${question.id}" is missing its correct choice.`);
  }

  return {
    instanceId: `static:${question.id}`,
    canonicalQuestionId: question.canonicalQuestionId,
    kind: "static",
    type: question.type,
    prompt: question.prompt,
    choices: question.choices,
    correctChoiceId: question.correctChoiceId,
    explanation: question.explanation,
    formattedCorrectAnswer: correctChoice.label,
    showMeAction: question.showMeAction,
    selectedWrongExplanations: question.selectedWrongExplanations,
  };
}

function getTemplatePriority(template: GeneratedQuizQuestionTemplateDefinition) {
  switch (template.origin) {
    case "explicit-template":
      return 0;
    case "derived-worked-example":
      return 1;
    case "built-in-exact-angle":
      return 2;
    case "fallback-misconception":
      return 3;
    default:
      return 9;
  }
}

export function buildConceptQuizSession(
  concept: ConceptContent,
  options: QuizInstantiationOptions,
): ConceptQuizSession {
  const definition = resolveConceptQuizDefinition(concept);
  const questions: QuizQuestionInstance[] = definition.staticQuestions.map(buildStaticQuestionInstance);
  const generatedSlotCount = getGeneratedQuestionSlotCount(definition);
  const seenSignatures = new Set(
    questions.map((question) => `${question.prompt}::${question.formattedCorrectAnswer}`),
  );

  if (generatedSlotCount > 0) {
    if (definition.templates.length === 0) {
      throw new Error(
        `Concept "${concept.slug}" requires generated quiz questions but has no available templates.`,
      );
    }

    for (let slotIndex = 0; slotIndex < generatedSlotCount; slotIndex += 1) {
      const canonicalQuestionId = `generated:slot:${slotIndex + 1}`;
      let instance: QuizQuestionInstance | null = null;
      const templateOrder = [...definition.templates]
        .sort((left, right) => getTemplatePriority(left) - getTemplatePriority(right))
        .sort((left, right) => {
          if (getTemplatePriority(left) !== getTemplatePriority(right)) {
            return 0;
          }

          const leftPreferred = left.origin !== "fallback-misconception";
          const rightPreferred = right.origin !== "fallback-misconception";

          if (!leftPreferred || !rightPreferred) {
            return 0;
          }

          const leftIndex =
            definition.templates.findIndex((template) => template.canonicalTemplateId === left.canonicalTemplateId);
          const rightIndex =
            definition.templates.findIndex((template) => template.canonicalTemplateId === right.canonicalTemplateId);
          const leftOffset = (leftIndex - slotIndex + definition.templates.length) % definition.templates.length;
          const rightOffset = (rightIndex - slotIndex + definition.templates.length) % definition.templates.length;

          return leftOffset - rightOffset;
        });

      for (const template of templateOrder) {
        for (let reroll = 0; reroll < 12; reroll += 1) {
          try {
            const nextInstance = buildGeneratedQuestionInstance({
              concept,
              template,
              canonicalQuestionId,
              instanceId: `${canonicalQuestionId}@${options.seed}:${reroll + 1}`,
              locale: options.locale ?? "en",
              seed: `${options.seed}:${template.canonicalTemplateId}:${slotIndex + 1}:${reroll + 1}`,
              slotIndex,
            });
            const signature = `${nextInstance.prompt}::${nextInstance.formattedCorrectAnswer}`;

            if (seenSignatures.has(signature)) {
              continue;
            }

            seenSignatures.add(signature);
            instance = nextInstance;
            break;
          } catch {
            continue;
          }
        }

        if (instance) {
          break;
        }
      }

      if (!instance) {
        throw new Error(
          `Concept "${concept.slug}" could not generate a unique quiz question for slot ${slotIndex + 1}.`,
        );
      }

      questions.push(instance);
    }
  }

  if (questions.length < definition.questionCount) {
    throw new Error(
      `Concept "${concept.slug}" could only build ${questions.length} quiz questions; at least ${definition.questionCount} are required.`,
    );
  }

  return {
    attemptId: `attempt:${options.seed}`,
    seed: options.seed,
    definition,
    questions: questions.slice(0, definition.questionCount),
  };
}
