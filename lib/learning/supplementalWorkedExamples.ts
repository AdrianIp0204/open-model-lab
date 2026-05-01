import type { ConceptSlug, ConceptWorkedExample } from "@/lib/content";
import {
  type ControlValue,
  formatNumber,
  resolveOptimizationConstraintsParams,
  resolveUnitCircleRotationParams,
  sampleOptimizationConstraintsState,
  sampleUnitCircleRotationState,
} from "@/lib/physics";
import type {
  LiveWorkedExampleState,
  ResolvedWorkedExample,
} from "./liveWorkedExamples";

type WorkedExampleTokenMap = Record<string, string>;
type SupplementalWorkedExampleBuilder = (state: LiveWorkedExampleState) => WorkedExampleTokenMap;
type WorkedExampleTemplateSource = {
  location: string;
  template: string;
};

const workedExampleTokenPattern = /\{\{([a-zA-Z0-9_-]+)\}\}/g;

function toNumber(value: ControlValue | undefined, fallback: number) {
  return typeof value === "number" ? value : fallback;
}

function interpolateTemplate(template: string, tokens: WorkedExampleTokenMap) {
  return template.replace(/\{\{([a-zA-Z0-9_-]+)\}\}/g, (_, key: string) => tokens[key] ?? "—");
}

function getWorkedExampleTemplateSources(
  example: ConceptWorkedExample,
): WorkedExampleTemplateSource[] {
  const sources: WorkedExampleTemplateSource[] = [
    { location: "prompt", template: example.prompt },
    ...example.steps.map((step) => ({
      location: `step "${step.id}"`,
      template: step.template,
    })),
    { location: "result", template: example.resultTemplate },
  ];

  if (example.interpretationTemplate) {
    sources.push({
      location: "interpretation",
      template: example.interpretationTemplate,
    });
  }

  return sources;
}

function collectWorkedExampleTemplateTokens(template: string) {
  const tokens = new Set<string>();

  for (const match of template.matchAll(workedExampleTokenPattern)) {
    const token = match[1];

    if (token) {
      tokens.add(token);
    }
  }

  return [...tokens];
}

function resolveOptimizationConstraintsTokens(state: LiveWorkedExampleState) {
  const resolved = resolveOptimizationConstraintsParams({
    width: toNumber(state.params.width, 3.4),
  });
  const snapshot = sampleOptimizationConstraintsState(resolved);

  return {
    widthValue: formatNumber(snapshot.width),
    heightValue: formatNumber(snapshot.height),
    areaValue: formatNumber(snapshot.area),
    areaSlopeValue: formatNumber(snapshot.areaSlope),
    optimumWidthValue: formatNumber(snapshot.optimumWidth),
    optimumAreaValue: formatNumber(snapshot.optimumArea),
    areaGapValue: formatNumber(snapshot.areaGap),
    slopeSignWord:
      Math.abs(snapshot.areaSlope) <= 0.12
        ? "approximately zero"
        : snapshot.areaSlope > 0
          ? "positive"
          : "negative",
    slopeDirectionText:
      Math.abs(snapshot.areaSlope) <= 0.12
        ? "barely change"
        : snapshot.areaSlope > 0
          ? "increase"
          : "decrease",
    areaInterpretation:
      Math.abs(snapshot.areaGap) <= 0.12
        ? "This rectangle is essentially the best square, so it is already at the maximum area for the fixed perimeter."
        : snapshot.width < snapshot.optimumWidth
          ? `This rectangle is still ${formatNumber(snapshot.areaGap)} square meters below the best case, and making it wider would move it toward the peak.`
          : `This rectangle is ${formatNumber(snapshot.areaGap)} square meters below the best case because it has already become too wide for the fixed perimeter.`,
    slopeInterpretation:
      Math.abs(snapshot.areaSlope) <= 0.12
        ? `The local slope is near zero here, so the objective graph is flat at the maximum near the ${formatNumber(snapshot.optimumWidth)} by ${formatNumber(snapshot.optimumWidth)} square.`
        : snapshot.areaSlope > 0
          ? "The positive slope means the objective is still climbing, so a little more width would increase the area."
          : "The negative slope means the objective is already falling, so a little more width would make the area smaller.",
  } satisfies WorkedExampleTokenMap;
}

function resolveUnitCircleRotationTokens(state: LiveWorkedExampleState) {
  const resolved = resolveUnitCircleRotationParams({
    angularSpeed: toNumber(state.params.angularSpeed ?? state.params.omega, 1),
    omega: toNumber(state.params.omega ?? state.params.angularSpeed, 1),
    phase: toNumber(state.params.phase, 0.18),
  });
  const snapshot = sampleUnitCircleRotationState(resolved, state.time);

  return {
    timeValue: formatNumber(state.time),
    omegaValue: formatNumber(resolved.angularSpeed),
    phaseValue: formatNumber(resolved.phase),
    angleValue: formatNumber(snapshot.wrappedAngle),
    angleDegValue: formatNumber(snapshot.angleDeg),
    cosValue: formatNumber(snapshot.x),
    sinValue: formatNumber(snapshot.y),
    regionValue: snapshot.regionLabel,
    cosineSignValue:
      snapshot.cosineSign === "positive"
        ? "positive"
        : snapshot.cosineSign === "negative"
          ? "negative"
          : "zero",
    sineSignValue:
      snapshot.sineSign === "positive"
        ? "positive"
        : snapshot.sineSign === "negative"
          ? "negative"
          : "zero",
    referenceAngleDegValue: formatNumber(snapshot.referenceAngleDeg),
    projectionInterpretation:
      snapshot.regionLabel === "Positive y-axis" || snapshot.regionLabel === "Negative y-axis"
        ? "The point is sitting on the y-axis, so cosine has dropped to zero while sine carries the full vertical projection."
        : Math.abs(snapshot.x) < 0.08
          ? "Cosine is close to zero here because the point is nearly above or below the origin, so the horizontal projection has almost vanished."
          : snapshot.x > 0
            ? "The positive cosine value matches the point staying on the right side of the unit circle."
            : "The negative cosine value matches the point sitting on the left side of the unit circle.",
    signInterpretation: snapshot.regionLabel.startsWith("Quadrant")
      ? `${snapshot.regionLabel} keeps cosine ${snapshot.cosineSign} and sine ${snapshot.sineSign}, which is exactly what the x and y projections show.`
      : `On ${snapshot.regionLabel.toLowerCase()}, one projection lands exactly on an axis value of zero while the other keeps the full sign of that axis.`,
  } satisfies WorkedExampleTokenMap;
}

const builders: Partial<
  Record<ConceptSlug, Record<string, SupplementalWorkedExampleBuilder>>
> = {
  "unit-circle-sine-cosine-from-rotation": {
    "read-the-current-projections": resolveUnitCircleRotationTokens,
    "read-the-current-signs": resolveUnitCircleRotationTokens,
  },
  "optimization-maxima-minima-and-constraints": {
    "current-height-and-area": resolveOptimizationConstraintsTokens,
    "current-area-slope": resolveOptimizationConstraintsTokens,
  },
};

function getSupplementalWorkedExampleBuilder(
  slug: ConceptSlug,
  exampleId: string,
): SupplementalWorkedExampleBuilder | null {
  return builders[slug]?.[exampleId] ?? null;
}

export function getSupplementalWorkedExampleTokenValidationIssues(
  slug: ConceptSlug,
  example: ConceptWorkedExample,
  state: LiveWorkedExampleState,
): string[] | null {
  const builder = getSupplementalWorkedExampleBuilder(slug, example.id);

  if (!builder) {
    return null;
  }

  const tokens = builder(state);
  const tokenKeys = new Set(Object.keys(tokens));
  const issues = new Set<string>();

  for (const variable of example.variables) {
    if (!tokenKeys.has(variable.valueKey)) {
      issues.add(
        `Concept "${slug}" workedExamples item "${example.id}" references unknown valueKey "${variable.valueKey}".`,
      );
    }
  }

  for (const source of getWorkedExampleTemplateSources(example)) {
    for (const token of collectWorkedExampleTemplateTokens(source.template)) {
      if (!tokenKeys.has(token)) {
        issues.add(
          `Concept "${slug}" workedExamples item "${example.id}" ${source.location} references unknown token "${token}".`,
        );
      }
    }
  }

  return [...issues];
}

export function resolveSupplementalLiveWorkedExample(
  slug: ConceptSlug,
  example: ConceptWorkedExample,
  state: LiveWorkedExampleState,
): ResolvedWorkedExample | null {
  const builder = getSupplementalWorkedExampleBuilder(slug, example.id);

  if (!builder) {
    return null;
  }

  const tokens = builder(state);

  return {
    prompt: interpolateTemplate(example.prompt, tokens),
    steps: example.steps.map((step) => ({
      id: step.id,
      label: step.label,
      content: interpolateTemplate(step.template, tokens),
    })),
    resultLabel: example.resultLabel,
    resultContent: interpolateTemplate(example.resultTemplate, tokens),
    interpretation: example.interpretationTemplate
      ? interpolateTemplate(example.interpretationTemplate, tokens)
      : undefined,
    variableValues: example.variables.reduce<Record<string, string>>((accumulator, variable) => {
      accumulator[variable.id] = tokens[variable.valueKey] ?? "—";
      return accumulator;
    }, {}),
  };
}
