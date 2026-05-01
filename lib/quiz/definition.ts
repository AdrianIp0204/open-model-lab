import type { ConceptContent } from "@/lib/content";
import type {
  ConceptQuizDefinition,
  GeneratedQuizQuestionTemplateDefinition,
  QuizCanonicalQuestionDescriptor,
  QuizGenerationSource,
  StaticQuizQuestionDefinition,
} from "./types";

export const DEFAULT_CONCEPT_QUIZ_QUESTION_COUNT = 5;

type ConceptQuizSource = Pick<
  ConceptContent,
  "id" | "slug" | "quickTest" | "sections" | "simulation"
>;

const exactAngleQuizKinds = new Set<ConceptContent["simulation"]["kind"]>([
  "unit-circle-rotation",
  "polar-coordinates",
]);

const quantitativeSimulationKinds = new Set<ConceptContent["simulation"]["kind"]>([
  "unit-circle-rotation",
  "polar-coordinates",
  "parametric-curves-motion",
  "vectors-components",
  "vectors-2d",
  "dot-product-projection",
  "projectile",
  "torque",
  "static-equilibrium-centre-of-mass",
  "rotational-inertia",
  "rolling-motion",
  "angular-momentum",
  "momentum-impulse",
  "conservation-of-momentum",
  "collisions",
  "ucm",
  "shm",
  "damping-resonance",
  "drag-terminal-velocity",
  "gravitational-fields",
  "gravitational-potential",
  "circular-orbits",
  "escape-velocity",
  "electric-fields",
  "electric-potential",
  "capacitance-electric-energy",
  "magnetic-fields",
  "electromagnetic-induction",
  "magnetic-force",
  "basic-circuits",
  "series-parallel-circuits",
  "equivalent-resistance",
  "power-energy-circuits",
  "rc-charging-discharging",
  "internal-resistance-terminal-voltage",
  "temperature-internal-energy",
  "ideal-gas-kinetic-theory",
  "pressure-hydrostatic",
  "continuity-equation",
  "bernoulli-principle",
  "buoyancy-archimedes",
  "heat-transfer",
  "specific-heat-phase-change",
  "wave-speed-wavelength",
  "beats",
  "doppler-effect",
  "standing-waves",
  "air-column-resonance",
  "refraction-snells-law",
  "lens-imaging",
  "diffraction",
  "optical-resolution",
  "double-slit-interference",
  "photoelectric-effect",
  "atomic-spectra",
  "de-broglie-matter-waves",
  "radioactivity-half-life",
  "reaction-rate-collision-theory",
  "stoichiometry-recipe",
  "concentration-dilution",
  "buffers-neutralization",
  "acid-base-ph",
  "solubility-saturation",
  "derivative-as-slope",
  "integral-accumulation",
  "optimization-constraints",
  "complex-numbers-plane",
]);

function buildStaticQuizQuestionDefinition(
  question: ConceptContent["quickTest"]["questions"][number],
): StaticQuizQuestionDefinition {
  return {
    kind: "static",
    id: question.id,
    canonicalQuestionId: question.id,
    type: question.type,
    prompt: question.prompt,
    choices: question.choices.map((choice) => ({
      id: choice.id,
      label: choice.label,
    })),
    correctChoiceId: question.correctChoiceId,
    explanation: question.explanation,
    showMeAction: question.showMeAction,
    selectedWrongExplanations: question.selectedWrongExplanations,
  };
}

function buildDefaultGeneratedTemplates(
  concept: ConceptQuizSource,
): GeneratedQuizQuestionTemplateDefinition[] {
  const templates = new Map<string, GeneratedQuizQuestionTemplateDefinition>();

  for (const authoredTemplate of concept.quickTest.templates ?? []) {
    const origin: QuizGenerationSource = "explicit-template";

    if (authoredTemplate.kind === "worked-example-result") {
      templates.set(authoredTemplate.id, {
        ...authoredTemplate,
        canonicalTemplateId: authoredTemplate.id,
        questionType: "calculation",
        origin,
        isParameterized: true,
      });
      continue;
    }

    templates.set(authoredTemplate.id, {
      ...authoredTemplate,
      canonicalTemplateId: authoredTemplate.id,
      questionType: "calculation",
      origin,
      isParameterized: true,
    });
  }

  for (const example of concept.sections.workedExamples.items) {
    const templateId = `worked-example:${example.id}`;

    if (templates.has(templateId)) {
      continue;
    }

    templates.set(templateId, {
      kind: "worked-example-result",
      id: templateId,
      canonicalTemplateId: templateId,
      exampleId: example.id,
      questionType: "calculation",
      origin: "derived-worked-example",
      isParameterized: true,
    });
  }

  if (exactAngleQuizKinds.has(concept.simulation.kind)) {
    const templateId = "exact-angle-radians";

    if (!templates.has(templateId)) {
      templates.set(templateId, {
        kind: "exact-angle-radians",
        id: templateId,
        canonicalTemplateId: templateId,
        questionType: "calculation",
        origin: "built-in-exact-angle",
        isParameterized: true,
      });
    }
  }

  const misconceptionTemplateId = "misconception-check";

  if (!templates.has(misconceptionTemplateId)) {
    templates.set(misconceptionTemplateId, {
      kind: "misconception-check",
      id: misconceptionTemplateId,
      canonicalTemplateId: misconceptionTemplateId,
      questionType: "reasoning",
      origin: "fallback-misconception",
      isParameterized: false,
    });
  }

  return [...templates.values()];
}

export function resolveConceptQuizDefinition(concept: ConceptQuizSource): ConceptQuizDefinition {
  const staticQuestions = concept.quickTest.questions.map(buildStaticQuizQuestionDefinition);
  const templates = buildDefaultGeneratedTemplates(concept);
  const questionCount = Math.max(
    DEFAULT_CONCEPT_QUIZ_QUESTION_COUNT,
    concept.quickTest.questionCount ?? 0,
    staticQuestions.length,
  );
  const mode =
    concept.quickTest.mode ??
    (staticQuestions.length >= questionCount
      ? "static"
      : staticQuestions.length
        ? "hybrid"
        : "generated");

  return {
    conceptId: concept.id,
    conceptSlug: concept.slug,
    mode,
    questionCount,
    staticQuestions,
    templates,
  };
}

export function getGeneratedQuestionSlotCount(definition: ConceptQuizDefinition) {
  switch (definition.mode) {
    case "static":
      return 0;
    case "generated":
      return definition.questionCount;
    case "hybrid":
      return Math.max(0, definition.questionCount - definition.staticQuestions.length);
    default:
      return 0;
  }
}

export function getConceptQuizCanonicalQuestionDescriptors(
  concept: ConceptQuizSource,
): QuizCanonicalQuestionDescriptor[] {
  const definition = resolveConceptQuizDefinition(concept);
  const descriptors: QuizCanonicalQuestionDescriptor[] = definition.staticQuestions.map(
    (question) => ({
      canonicalQuestionId: question.canonicalQuestionId,
      versionSource: question,
    }),
  );
  const generatedSlotCount = getGeneratedQuestionSlotCount(definition);

  if (generatedSlotCount === 0 || definition.templates.length === 0) {
    return descriptors;
  }

  for (let slotIndex = 0; slotIndex < generatedSlotCount; slotIndex += 1) {
    const template = definition.templates[slotIndex % definition.templates.length]!;

    descriptors.push({
      canonicalQuestionId: `generated:slot:${slotIndex + 1}`,
      versionSource: {
        template,
        slotIndex,
      },
    });
  }

  return descriptors;
}

export function hasConceptQuizSupport(concept: ConceptQuizSource) {
  return resolveConceptQuizDefinition(concept).questionCount > 0;
}

export function isConceptQuizQuantitative(concept: ConceptQuizSource) {
  return concept.quickTest.isQuantitative ?? quantitativeSimulationKinds.has(concept.simulation.kind);
}
