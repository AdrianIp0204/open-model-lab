import { z } from "zod";

const conceptIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Concept ids must be kebab-case.");

const starterTrackIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Starter track ids must be kebab-case.");

const conceptSlugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Concept slugs must be kebab-case.");

const conceptContentFileSchema = z
  .string()
  .min(1)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Concept content file keys must be kebab-case.",
  );

const conceptSubjectSchema = z.string().min(1);
const conceptTopicSchema = z.string().min(1);
const conceptDifficultySchema = z.string().min(1);
const starterTrackCheckpointIdSchema = z
  .string()
  .min(1)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Starter track checkpoint ids must be kebab-case.",
  );
const guidedCollectionIdSchema = z
  .string()
  .min(1)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Guided collection ids must be kebab-case.",
  );
const guidedCollectionStepIdSchema = z
  .string()
  .min(1)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Guided collection step ids must be kebab-case.",
  );

export const simulationKinds = [
  "reaction-rate-collision-theory",
  "dynamic-equilibrium",
  "shm",
  "ucm",
  "damping-resonance",
  "projectile",
  "drag-terminal-velocity",
  "vectors-components",
  "dot-product-projection",
  "torque",
  "static-equilibrium-centre-of-mass",
  "rotational-inertia",
  "rolling-motion",
  "angular-momentum",
  "momentum-impulse",
  "conservation-of-momentum",
  "collisions",
  "basic-circuits",
  "series-parallel-circuits",
  "equivalent-resistance",
  "power-energy-circuits",
  "rc-charging-discharging",
  "internal-resistance-terminal-voltage",
  "electric-fields",
  "gravitational-fields",
  "gravitational-potential",
  "circular-orbits",
  "escape-velocity",
  "electric-potential",
  "capacitance-electric-energy",
  "magnetic-fields",
  "electromagnetic-induction",
  "maxwell-equations-synthesis",
  "electromagnetic-waves",
  "light-spectrum-linkage",
  "dispersion-refractive-index-color",
  "polarization",
  "diffraction",
  "optical-resolution",
  "double-slit-interference",
  "photoelectric-effect",
  "atomic-spectra",
  "de-broglie-matter-waves",
  "bohr-model",
  "radioactivity-half-life",
  "magnetic-force",
  "refraction-snells-law",
  "mirrors",
  "lens-imaging",
  "beats",
  "sound-waves-longitudinal",
  "doppler-effect",
  "wave-speed-wavelength",
  "wave-interference",
  "standing-waves",
  "air-column-resonance",
  "temperature-internal-energy",
  "ideal-gas-kinetic-theory",
  "pressure-hydrostatic",
  "continuity-equation",
  "bernoulli-principle",
  "buoyancy-archimedes",
  "heat-transfer",
  "specific-heat-phase-change",
  "graph-transformations",
  "rational-functions",
  "matrix-transformations",
  "exponential-change",
  "derivative-as-slope",
  "optimization-constraints",
  "limits-continuity",
  "integral-accumulation",
  "vectors-2d",
  "complex-numbers-plane",
  "unit-circle-rotation",
  "polar-coordinates",
  "parametric-curves-motion",
  "sorting-algorithmic-trade-offs",
  "binary-search-halving",
  "graph-traversal",
  "solubility-saturation",
  "buffers-neutralization",
  "concentration-dilution",
  "stoichiometry-recipe",
  "acid-base-ph",
] as const;
export const conceptPageSectionIds = [
  "explanation",
  "keyIdeas",
  "workedExamples",
  "commonMisconception",
  "miniChallenge",
  "quickTest",
  "accessibility",
  "readNext",
] as const;

const conceptStatusSchema = z.enum(["draft", "review", "published", "archived"]);
const conceptPageSectionIdSchema = z.enum(conceptPageSectionIds);
const conceptPageV2GuidedStepIdSchema = z
  .string()
  .min(1)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Concept page V2 guided step ids must be kebab-case.",
  );
const controlValueSchema = z.union([z.string(), z.number(), z.boolean()]);

const textListSchema = z.array(z.string().min(1)).min(1);
const optionalTextListSchema = z.array(z.string().min(1)).optional();

const structuredTextSchema = z.strictObject({
  paragraphs: textListSchema,
});

const equationSchema = z.strictObject({
  id: z.string().min(1),
  latex: z.string().min(1),
  label: z.string().min(1),
  meaning: z.string().min(1),
  readAloud: z.string().min(1).optional(),
  notes: optionalTextListSchema,
});

const variableToneSchema = z.enum(["teal", "amber", "coral", "sky", "ink"]);
const conceptAccentSchema = z.enum(["teal", "amber", "coral", "sky", "ink"]);

const variableLinkSchema = z.strictObject({
  id: z.string().min(1),
  symbol: z.string().min(1),
  label: z.string().min(1),
  param: z.string().min(1),
  tone: variableToneSchema,
  description: z.string().min(1),
  equationIds: z.array(z.string().min(1)).min(1),
  graphIds: z.array(z.string().min(1)).optional(),
  overlayIds: z.array(z.string().min(1)).optional(),
});

const controlDisplayValueLabelSchema = z.strictObject({
  value: controlValueSchema,
  label: z.string().min(1),
});

const sliderControlSchema = z.strictObject({
  id: z.string().min(1),
  kind: z.literal("slider"),
  label: z.string().min(1),
  param: z.string().min(1),
  min: z.number(),
  max: z.number(),
  step: z.number().positive(),
  unit: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  displayValueLabels: z.array(controlDisplayValueLabelSchema).min(1).optional(),
});

const toggleControlSchema = z.strictObject({
  id: z.string().min(1),
  kind: z.literal("toggle"),
  label: z.string().min(1),
  param: z.string().min(1),
  description: z.string().min(1).optional(),
  displayValueLabels: z.array(controlDisplayValueLabelSchema).min(1).optional(),
});

const presetSchema = z.strictObject({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1).optional(),
  values: z.record(z.string(), controlValueSchema),
});

const overlaySchema = z.strictObject({
  id: z.string().min(1),
  label: z.string().min(1),
  shortDescription: z.string().min(1),
  whatToNotice: textListSchema,
  whyItMatters: z.string().min(1).optional(),
  relatedControls: z.array(z.string().min(1)).min(1).optional(),
  relatedGraphTabs: z.array(z.string().min(1)).min(1).optional(),
  relatedEquationVariables: z.array(z.string().min(1)).min(1).optional(),
  defaultOn: z.boolean(),
});

const interactionModeSchema = z.enum(["explore", "predict", "compare"]);

const noticePromptTypeSchema = z.enum([
  "observation",
  "compare",
  "graph-reading",
  "misconception",
  "try-this",
]);

const noticePromptRangeSchema = z
  .strictObject({
    param: z.string().min(1),
    min: z.number().optional(),
    max: z.number().optional(),
  })
  .refine((value) => value.min !== undefined || value.max !== undefined, {
    message: "Notice prompt controlRanges require at least one bound.",
  });

const noticePromptConditionsSchema = z.strictObject({
  graphTabs: z.array(z.string().min(1)).min(1).optional(),
  modes: z.array(interactionModeSchema).min(1).optional(),
  overlayIds: z.array(z.string().min(1)).min(1).optional(),
  responseMode: z.boolean().optional(),
  inspectState: z.enum(["live", "inspect", "preview"]).optional(),
  controlRanges: z.array(noticePromptRangeSchema).min(1).optional(),
  lastChangedControls: z.array(z.string().min(1)).min(1).optional(),
});

const noticePromptSchema = z.strictObject({
  id: z.string().min(1),
  text: z.string().min(1),
  type: noticePromptTypeSchema,
  priority: z.number().int().min(0).optional(),
  conditions: noticePromptConditionsSchema.optional(),
  tryThis: z.string().min(1).optional(),
  whyItMatters: z.string().min(1).optional(),
  relatedControls: z.array(z.string().min(1)).min(1).optional(),
  relatedGraphTabs: z.array(z.string().min(1)).min(1).optional(),
  relatedOverlays: z.array(z.string().min(1)).min(1).optional(),
  relatedEquationVariables: z.array(z.string().min(1)).min(1).optional(),
});

const noticePromptConfigSchema = z.strictObject({
  title: z.string().min(1).optional(),
  intro: z.string().min(1).optional(),
  items: z.array(noticePromptSchema).min(1),
});

const graphSchema = z.strictObject({
  id: z.string().min(1),
  label: z.string().min(1),
  xLabel: z.string().min(1),
  yLabel: z.string().min(1),
  series: z.array(z.string().min(1)).min(1),
  description: z.string().min(1).optional(),
});

const predictionChoiceSchema = z.strictObject({
  id: z.string().min(1),
  label: z.string().min(1),
});

const predictionApplySchema = z
  .strictObject({
    presetId: z.string().min(1).optional(),
    patch: z.record(z.string(), controlValueSchema).optional(),
  })
  .refine((value) => Boolean(value.presetId || value.patch), {
    message: "Prediction scenarios require a presetId or patch.",
  });

const predictionItemSchema = z
  .strictObject({
    id: z.string().min(1),
    prompt: z.string().min(1),
    scenarioLabel: z.string().min(1),
    changeLabel: z.string().min(1).optional(),
    choices: z.array(predictionChoiceSchema).min(2),
    correctChoiceId: z.string().min(1),
    explanation: z.string().min(1),
    observationHint: z.string().min(1),
    apply: predictionApplySchema,
    applyPresetId: z.string().min(1).optional(),
    applyPatch: z.record(z.string(), controlValueSchema).optional(),
    highlightedControls: z.array(z.string().min(1)).min(1).optional(),
    highlightedGraphs: z.array(z.string().min(1)).min(1).optional(),
    highlightedOverlays: z.array(z.string().min(1)).min(1).optional(),
  })
  .refine((value) => Boolean(value.apply || value.applyPresetId || value.applyPatch), {
    message: "Prediction items require apply, applyPresetId, or applyPatch.",
  });

const predictionModeSchema = z.strictObject({
  title: z.string().min(1).optional(),
  intro: z.string().min(1).optional(),
  items: z.array(predictionItemSchema).min(1),
});

const challengeStyleSchema = z.enum([
  "target-setting",
  "parameter-match",
  "maximize",
  "minimize",
  "visible-condition",
]);

const challengeSetupAuthoringSchema = z
  .strictObject({
    presetId: z.string().min(1).optional(),
    patch: z.record(z.string(), controlValueSchema).optional(),
    graphId: z.string().min(1).optional(),
    overlayIds: z.array(z.string().min(1)).min(1).optional(),
    inspectTime: z.number().min(0).optional(),
    interactionMode: z.enum(["explore", "compare"]).optional(),
    note: z.string().min(1).optional(),
  })
  .refine(
    (value) =>
      Boolean(
        value.presetId ||
          value.patch ||
          value.graphId ||
          value.overlayIds?.length ||
          value.inspectTime !== undefined ||
          value.interactionMode ||
          value.note,
      ),
    {
      message:
        "Challenge setups require a presetId, patch, graphId, overlayIds, inspectTime, interactionMode, or note.",
    },
  );

const challengeSetupSchema = z
  .strictObject({
    presetId: z.string().min(1).optional(),
    patch: z.record(z.string(), controlValueSchema).optional(),
    graphId: z.string().min(1).optional(),
    overlayIds: z.array(z.string().min(1)).min(1).optional(),
    inspectTime: z.number().min(0).optional(),
    interactionMode: z.enum(["explore", "compare"]).optional(),
    note: z.string().min(1).optional(),
  })
  .refine(
    (value) =>
      Boolean(
        value.presetId ||
          value.patch ||
          value.graphId ||
          value.overlayIds?.length ||
          value.inspectTime !== undefined ||
          value.interactionMode,
      ),
    {
      message:
        "Challenge setups require a presetId, patch, graphId, overlayIds, inspectTime, or interactionMode.",
    },
  );

const challengeRangeFieldsSchema = z.strictObject({
  min: z.number().optional(),
  max: z.number().optional(),
  displayUnit: z.string().min(1).optional(),
});

const challengeParamRangeCheckSchema = challengeRangeFieldsSchema
  .extend({
    type: z.literal("param-range"),
    label: z.string().min(1),
    param: z.string().min(1),
  })
  .refine((value) => value.min !== undefined || value.max !== undefined, {
    message: "Challenge param-range checks require a min or max.",
  });

const challengeMetricRangeCheckSchema = challengeRangeFieldsSchema
  .extend({
    type: z.literal("metric-range"),
    label: z.string().min(1),
    metric: z.string().min(1),
  })
  .refine((value) => value.min !== undefined || value.max !== undefined, {
    message: "Challenge metric-range checks require a min or max.",
  });

const challengeGraphActiveCheckSchema = z.strictObject({
  type: z.literal("graph-active"),
  label: z.string().min(1),
  graphId: z.string().min(1),
});

const challengeOverlayActiveCheckSchema = z.strictObject({
  type: z.literal("overlay-active"),
  label: z.string().min(1),
  overlayId: z.string().min(1),
  value: z.boolean().optional(),
});

const challengeTimeSourceCheckSchema = z.strictObject({
  type: z.literal("time-source"),
  label: z.string().min(1),
  source: z.enum(["live", "inspect", "preview"]),
});

const challengeTimeRangeCheckSchema = challengeRangeFieldsSchema
  .extend({
    type: z.literal("time-range"),
    label: z.string().min(1),
  })
  .refine((value) => value.min !== undefined || value.max !== undefined, {
    message: "Challenge time-range checks require a min or max.",
  });

const challengeCompareActiveCheckSchema = z.strictObject({
  type: z.literal("compare-active"),
  label: z.string().min(1),
  target: z.enum(["a", "b"]).optional(),
});

const challengeCompareParamRangeCheckSchema = challengeRangeFieldsSchema
  .extend({
    type: z.literal("compare-param-range"),
    label: z.string().min(1),
    setup: z.enum(["a", "b"]),
    param: z.string().min(1),
  })
  .refine((value) => value.min !== undefined || value.max !== undefined, {
    message: "Challenge compare-param-range checks require a min or max.",
  });

const challengeCompareMetricRangeCheckSchema = z
  .strictObject({
    type: z.literal("compare-metric-range"),
    label: z.string().min(1),
    setup: z.enum(["a", "b"]),
    metric: z.string().min(1),
    min: z.number().optional(),
    max: z.number().optional(),
    displayUnit: z.string().min(1).optional(),
  })
  .refine((value) => value.min !== undefined || value.max !== undefined, {
    message: "Challenge compare-metric-range checks require a min or max.",
  });

const challengeCheckSchema = z.union([
  challengeParamRangeCheckSchema,
  challengeMetricRangeCheckSchema,
  challengeGraphActiveCheckSchema,
  challengeOverlayActiveCheckSchema,
  challengeTimeSourceCheckSchema,
  challengeTimeRangeCheckSchema,
  challengeCompareActiveCheckSchema,
  challengeCompareParamRangeCheckSchema,
  challengeCompareMetricRangeCheckSchema,
]);

const challengeRequirementTimeRangeSchema = challengeRangeFieldsSchema.extend({
  label: z.string().min(1).optional(),
}).refine((value) => value.min !== undefined || value.max !== undefined, {
  message: "Challenge requirement time ranges require a min or max.",
});

const challengeRequirementsSchema = z
  .strictObject({
    graphId: z.string().min(1).optional(),
    overlayIds: z.array(z.string().min(1)).min(1).optional(),
    timeSource: z.enum(["live", "inspect", "preview"]).optional(),
    timeRange: challengeRequirementTimeRangeSchema.optional(),
    compareActive: z.boolean().optional(),
    compareTarget: z.enum(["a", "b"]).optional(),
  })
  .refine(
    (value) =>
      Boolean(
        value.graphId ||
          value.overlayIds?.length ||
          value.timeSource ||
          value.timeRange ||
          value.compareActive ||
          value.compareTarget,
      ),
    {
      message:
        "Challenge requirements need a graphId, overlayIds, timeSource, timeRange, compareActive, or compareTarget.",
    },
  )
  .refine((value) => !value.compareTarget || value.compareActive !== false, {
    message: "Challenge requirements cannot set compareTarget when compareActive is false.",
    path: ["compareTarget"],
  });

const challengeTargetSchema = z
  .strictObject({
    label: z.string().min(1).optional(),
    setup: z.enum(["a", "b"]).optional(),
    param: z.string().min(1).optional(),
    metric: z.string().min(1).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    displayUnit: z.string().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.min === undefined && value.max === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Challenge targets require a min or max.",
        path: ["min"],
      });
    }

    if (value.param && value.metric) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Challenge targets cannot set both param and metric.",
        path: ["metric"],
      });
    }

    if (!value.param && !value.metric) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Challenge targets require a param or metric.",
        path: ["param"],
      });
    }
  });

const challengeModeItemAuthoringSchema = z
  .strictObject({
    id: z.string().min(1),
    title: z.string().min(1),
    style: challengeStyleSchema,
    prompt: z.string().min(1),
    successMessage: z.string().min(1),
    setup: challengeSetupAuthoringSchema.optional(),
    requirements: challengeRequirementsSchema.optional(),
    targets: z.array(challengeTargetSchema).min(1).optional(),
    hints: z.array(z.string().min(1)).min(1).optional(),
    checks: z.array(challengeCheckSchema).min(1).optional(),
  })
  .refine(
    (value) => Boolean(value.requirements || value.targets?.length || value.checks?.length),
    {
      message: "Challenge items require checks, requirements, or targets.",
      path: ["checks"],
    },
  );

const challengeModeItemSchema = z.strictObject({
  id: z.string().min(1),
  title: z.string().min(1),
  style: challengeStyleSchema,
  prompt: z.string().min(1),
  successMessage: z.string().min(1),
  setup: challengeSetupSchema.optional(),
  hints: z.array(z.string().min(1)).min(1).optional(),
  checks: z.array(challengeCheckSchema).min(1),
});

const challengeModeAuthoringSchema = z
  .strictObject({
    title: z.string().min(1).optional(),
    intro: z.string().min(1).optional(),
    items: z.array(challengeModeItemAuthoringSchema).min(1),
  })
  .superRefine((mode, ctx) => {
    const seen = new Set<string>();

    for (const [index, item] of mode.items.entries()) {
      if (seen.has(item.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate challenge item id "${item.id}".`,
          path: ["items", index, "id"],
        });
      }

      seen.add(item.id);
    }
  });

const challengeModeSchema = z
  .strictObject({
    title: z.string().min(1).optional(),
    intro: z.string().min(1).optional(),
    items: z.array(challengeModeItemSchema).min(1),
  })
  .superRefine((mode, ctx) => {
    const seen = new Set<string>();

    for (const [index, item] of mode.items.entries()) {
      if (seen.has(item.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate challenge item id "${item.id}".`,
          path: ["items", index, "id"],
        });
      }

      seen.add(item.id);
    }
  });

const quickTestChoiceSchema = z.strictObject({
  id: z.string().min(1),
  label: z.string().min(1),
});

const topicTestQuestionIdSchema = z
  .string()
  .min(1)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Topic test question ids must be kebab-case.",
  );

const topicTestQuestionKindSchema = z.enum(["bridge", "topic-check"]);

const topicTestQuestionTypeSchema = z.enum([
  "variable-effect",
  "graph-reading",
  "misconception-check",
  "compare-two-cases",
  "reasoning",
  "calculation",
  "worked-example",
]);

const topicTestQuestionSchema = z
  .strictObject({
    id: topicTestQuestionIdSchema,
    kind: topicTestQuestionKindSchema.default("topic-check"),
    type: topicTestQuestionTypeSchema.default("reasoning"),
    relatedConceptSlugs: z.array(conceptSlugSchema).min(1).optional(),
    authorNote: z.string().min(1).optional(),
    prompt: z.string().min(1),
    choices: z.array(quickTestChoiceSchema).min(2),
    correctChoiceId: z.string().min(1),
    explanation: z.string().min(1),
  })
  .superRefine((question, ctx) => {
    const seenChoiceIds = new Set<string>();

    for (const [index, choice] of question.choices.entries()) {
      if (seenChoiceIds.has(choice.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate topic test choice id "${choice.id}".`,
          path: ["choices", index, "id"],
        });
      }

      seenChoiceIds.add(choice.id);
    }

    if (!seenChoiceIds.has(question.correctChoiceId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Topic test question "${question.id}" references unknown correctChoiceId "${question.correctChoiceId}".`,
        path: ["correctChoiceId"],
      });
    }

    if (question.kind === "bridge" && (question.relatedConceptSlugs?.length ?? 0) < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Bridge topic test question "${question.id}" must reference at least two related concepts.`,
        path: ["relatedConceptSlugs"],
      });
    }
  });

export const topicTestCatalogEntrySchema = z
  .strictObject({
    topicSlug: conceptSlugSchema,
    questionCount: z.number().int().min(10).max(20).optional(),
    questions: z.array(topicTestQuestionSchema).optional(),
  })
  .superRefine((entry, ctx) => {
    const seenQuestionIds = new Set<string>();

    for (const [index, question] of (entry.questions ?? []).entries()) {
      if (seenQuestionIds.has(question.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate topic test question id "${question.id}".`,
          path: ["questions", index, "id"],
        });
      }

      seenQuestionIds.add(question.id);
    }
  });

export const topicTestCatalogSchema = z
  .array(topicTestCatalogEntrySchema)
  .superRefine((entries, ctx) => {
    const seenTopicSlugs = new Set<string>();

    for (const [index, entry] of entries.entries()) {
      if (seenTopicSlugs.has(entry.topicSlug)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate topic test entry for "${entry.topicSlug}".`,
          path: [index, "topicSlug"],
        });
      }

      seenTopicSlugs.add(entry.topicSlug);
    }
  });

const testPackIdSchema = z
  .string()
  .min(1)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Test pack slugs must be kebab-case.",
  );

const testPackQuestionKindSchema = z.enum(["bridge", "pack-check"]);

const testPackQuestionSchema = z
  .strictObject({
    id: topicTestQuestionIdSchema,
    kind: testPackQuestionKindSchema.default("pack-check"),
    type: topicTestQuestionTypeSchema.default("reasoning"),
    relatedTopicSlugs: z.array(conceptSlugSchema).min(1).optional(),
    relatedConceptSlugs: z.array(conceptSlugSchema).min(1).optional(),
    authorNote: z.string().min(1).optional(),
    prompt: z.string().min(1),
    choices: z.array(quickTestChoiceSchema).min(2),
    correctChoiceId: z.string().min(1),
    explanation: z.string().min(1),
  })
  .superRefine((question, ctx) => {
    const seenChoiceIds = new Set<string>();

    for (const [index, choice] of question.choices.entries()) {
      if (seenChoiceIds.has(choice.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate test-pack choice id "${choice.id}".`,
          path: ["choices", index, "id"],
        });
      }

      seenChoiceIds.add(choice.id);
    }

    if (!seenChoiceIds.has(question.correctChoiceId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Test-pack question "${question.id}" references unknown correctChoiceId "${question.correctChoiceId}".`,
        path: ["correctChoiceId"],
      });
    }

    if (question.kind === "bridge" && (question.relatedTopicSlugs?.length ?? 0) < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Bridge test-pack question "${question.id}" must reference at least two related topics.`,
        path: ["relatedTopicSlugs"],
      });
    }
  });

export const testPackCatalogEntrySchema = z
  .strictObject({
    slug: testPackIdSchema,
    subjectSlug: conceptSlugSchema,
    title: z.string().min(1),
    summary: z.string().min(1),
    includedTopicSlugs: z.array(conceptSlugSchema).min(2),
    questionCount: z.number().int().min(10).max(20).optional(),
    questions: z.array(testPackQuestionSchema).optional(),
  })
  .superRefine((entry, ctx) => {
    const seenQuestionIds = new Set<string>();
    const seenTopicSlugs = new Set<string>();

    for (const [index, topicSlug] of entry.includedTopicSlugs.entries()) {
      if (seenTopicSlugs.has(topicSlug)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate included topic slug "${topicSlug}" in test pack "${entry.slug}".`,
          path: ["includedTopicSlugs", index],
        });
      }

      seenTopicSlugs.add(topicSlug);
    }

    for (const [index, question] of (entry.questions ?? []).entries()) {
      if (seenQuestionIds.has(question.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate test-pack question id "${question.id}".`,
          path: ["questions", index, "id"],
        });
      }

      seenQuestionIds.add(question.id);
    }
  });

export const testPackCatalogSchema = z
  .array(testPackCatalogEntrySchema)
  .superRefine((entries, ctx) => {
    const seenSlugs = new Set<string>();
    const seenSubjects = new Set<string>();

    for (const [index, entry] of entries.entries()) {
      if (seenSlugs.has(entry.slug)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate test pack slug "${entry.slug}".`,
          path: [index, "slug"],
        });
      }

      if (seenSubjects.has(entry.subjectSlug)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate public test pack for subject "${entry.subjectSlug}".`,
          path: [index, "subjectSlug"],
        });
      }

      seenSlugs.add(entry.slug);
      seenSubjects.add(entry.subjectSlug);
    }
  });

const quickTestQuestionTypeSchema = z.enum([
  "variable-effect",
  "graph-reading",
  "misconception-check",
  "compare-two-cases",
  "reasoning",
]);

const quickTestShowMeActionSchema = z
  .strictObject({
    label: z.string().min(1).optional(),
    observationHint: z.string().min(1).optional(),
    presetId: z.string().min(1).optional(),
    patch: z.record(z.string(), controlValueSchema).optional(),
    highlightedControlIds: z.array(z.string().min(1)).min(1).optional(),
    highlightedGraphIds: z.array(z.string().min(1)).min(1).optional(),
    highlightedOverlayIds: z.array(z.string().min(1)).min(1).optional(),
  })
  .refine(
    (value) =>
      Boolean(
        value.presetId ||
          value.patch ||
          value.highlightedControlIds?.length ||
          value.highlightedGraphIds?.length ||
          value.highlightedOverlayIds?.length,
      ),
    {
      message:
        "Quick test showMeAction requires a presetId, patch, or at least one highlight target.",
    },
  );

const workedExampleVariableSchema = z.strictObject({
  id: z.string().min(1),
  variableId: z.string().min(1).optional(),
  symbol: z.string().min(1),
  label: z.string().min(1),
  valueKey: z.string().min(1),
  unit: z.string().min(1).optional(),
});

const workedExampleStepSchema = z.strictObject({
  id: z.string().min(1),
  label: z.string().min(1),
  template: z.string().min(1),
});

const workedExampleSchema = z.strictObject({
  id: z.string().min(1),
  title: z.string().min(1),
  prompt: z.string().min(1),
  dependsOnTime: z.boolean().optional(),
  applicability: z
    .strictObject({
      responseMode: z.boolean().optional(),
    })
    .optional(),
  variables: z.array(workedExampleVariableSchema).min(1),
  steps: z.array(workedExampleStepSchema).min(1),
  resultLabel: z.string().min(1),
  resultTemplate: z.string().min(1),
  interpretationTemplate: z.string().min(1).optional(),
  applyAction: quickTestShowMeActionSchema.optional(),
});

const workedExamplesSchema = z.strictObject({
  title: z.string().min(1).optional(),
  intro: z.string().min(1).optional(),
  items: z.array(workedExampleSchema).min(1),
});

const quickTestQuestionSchema = z.strictObject({
  id: z.string().min(1),
  prompt: z.string().min(1),
  type: quickTestQuestionTypeSchema,
  choices: z.array(quickTestChoiceSchema).min(2),
  correctChoiceId: z.string().min(1),
  explanation: z.string().min(1),
  selectedWrongExplanations: z.record(z.string(), z.string().min(1)).optional(),
  showMeAction: quickTestShowMeActionSchema.optional(),
});

const quickTestModeSchema = z.enum(["static", "generated", "hybrid"]);

const quickTestWorkedExampleTemplateSchema = z.strictObject({
  id: z.string().min(1),
  kind: z.literal("worked-example-result"),
  exampleId: z.string().min(1),
});

const quickTestExactAngleTemplateSchema = z.strictObject({
  id: z.string().min(1),
  kind: z.literal("exact-angle-radians"),
});

const quickTestGeneratedTemplateSchema = z.discriminatedUnion("kind", [
  quickTestWorkedExampleTemplateSchema,
  quickTestExactAngleTemplateSchema,
]);

const quickTestSchema = z.strictObject({
  title: z.string().min(1).optional(),
  intro: z.string().min(1).optional(),
  mode: quickTestModeSchema.optional(),
  isQuantitative: z.boolean().optional(),
  questionCount: z.number().int().min(5).optional(),
  questions: z.array(quickTestQuestionSchema),
  templates: z.array(quickTestGeneratedTemplateSchema).optional(),
});

const conceptPageSectionConfigSchema = z.strictObject({
  id: conceptPageSectionIdSchema,
  enabled: z.boolean().optional(),
  title: z.string().min(1).optional(),
  order: z.number().int().min(0).optional(),
});

const conceptPageFeaturedSetupSchema = z.strictObject({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  setup: challengeSetupSchema,
});

const conceptPageEntryGuidanceHintSchema = z.strictObject({
  kind: z.enum(["control", "graph", "overlay", "preset", "tool"]),
  id: z.string().min(1),
  label: z.string().min(1).optional(),
});

const conceptPageEntryGuidanceSchema = z
  .strictObject({
    firstAction: z.string().min(1).optional(),
    watchFor: z.string().min(1).optional(),
    hints: z.array(conceptPageEntryGuidanceHintSchema).max(6).optional(),
  })
  .refine(
    (value) =>
      Boolean(
        value.firstAction ||
          value.watchFor ||
          (value.hints && value.hints.length > 0),
      ),
    {
      message:
        "Concept page entry guidance needs a firstAction, watchFor, or at least one hint.",
    },
  );

export const conceptPageFrameworkSchema = z
  .strictObject({
    sections: z.array(conceptPageSectionConfigSchema).optional(),
    featuredSetups: z.array(conceptPageFeaturedSetupSchema).max(4).optional(),
    entryGuidance: conceptPageEntryGuidanceSchema.optional(),
  })
  .superRefine((framework, ctx) => {
    const seen = new Set<string>();

    for (const [index, section] of (framework.sections ?? []).entries()) {
      if (seen.has(section.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate concept page section config "${section.id}".`,
          path: ["sections", index, "id"],
        });
      }

      seen.add(section.id);
    }

    const seenSetupIds = new Set<string>();

    for (const [index, setup] of (framework.featuredSetups ?? []).entries()) {
      if (seenSetupIds.has(setup.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate concept page featured setup "${setup.id}".`,
          path: ["featuredSetups", index, "id"],
        });
      }

      seenSetupIds.add(setup.id);
    }
  });

const conceptRecommendationSchema = z.strictObject({
  slug: conceptSlugSchema,
  reasonLabel: z.string().min(1).optional(),
});

const conceptPageIntroSchema = z
  .strictObject({
    definition: z.string().min(1).optional(),
    whyItMatters: z.string().min(1).optional(),
    keyTakeaway: z.string().min(1).optional(),
  })
  .refine(
    (value) =>
      Boolean(value.definition || value.whyItMatters || value.keyTakeaway),
    {
      message:
        "Concept page intro needs at least a definition, whyItMatters, or keyTakeaway.",
    },
  );

const conceptPageV2EquationSnapshotSchema = z.strictObject({
  title: z.string().min(1).optional(),
  note: z.string().min(1).optional(),
  equationIds: z.array(z.string().min(1)).min(1).max(3),
});

const conceptPageV2RevealSchema = z
  .strictObject({
    controlIds: z.array(z.string().min(1)).max(8).optional(),
    graphIds: z.array(z.string().min(1)).max(6).optional(),
    overlayIds: z.array(z.string().min(1)).max(8).optional(),
    toolHints: z.array(z.string().min(1)).max(6).optional(),
  })
  .refine(
    (value) =>
      Boolean(
        value.controlIds?.length ||
          value.graphIds?.length ||
          value.overlayIds?.length ||
          value.toolHints?.length,
      ),
    {
      message:
        "Concept page V2 reveals need at least one control, graph, overlay, or tool hint.",
    },
  );

const conceptPageV2InlineCheckSchema = z
  .strictObject({
    title: z.string().min(1).optional(),
    note: z.string().min(1).optional(),
    predictionIds: z.array(z.string().min(1)).min(1).max(2).optional(),
    questionIds: z.array(z.string().min(1)).min(1).max(3).optional(),
    includeMiniChallenge: z.boolean().optional(),
  })
  .refine(
    (value) =>
      Boolean(
        value.predictionIds?.length ||
          value.questionIds?.length ||
          value.includeMiniChallenge,
      ),
    {
      message:
        "Concept page V2 inline checks need predictionIds, questionIds, or includeMiniChallenge.",
    },
  );

const conceptPageV2NextConceptSchema = z.strictObject({
  slug: conceptSlugSchema,
  title: z.string().min(1).optional(),
  reasonLabel: z.string().min(1).optional(),
});

const conceptPageV2WrapUpSchema = z
  .strictObject({
    learned: z.array(z.string().min(1)).min(1).max(6).optional(),
    misconception: z.string().min(1).optional(),
    workedExampleRefs: z.array(z.string().min(1)).min(1).max(3).optional(),
    testCta: z.boolean().optional(),
    nextConcepts: z.array(conceptPageV2NextConceptSchema).min(1).max(4).optional(),
    freePlayPrompt: z.string().min(1).optional(),
  })
  .refine(
    (value) =>
      Boolean(
        value.learned?.length ||
          value.misconception ||
          value.workedExampleRefs?.length ||
          value.testCta !== undefined ||
          value.nextConcepts?.length ||
          value.freePlayPrompt,
      ),
    {
      message:
        "Concept page V2 wrapUp needs learned points, a misconception, worked examples, a test CTA flag, next concepts, or a free-play prompt.",
    },
  );

const conceptPageV2GuidedStepSchema = z
  .strictObject({
    id: conceptPageV2GuidedStepIdSchema,
    title: z.string().min(1),
    goal: z.string().min(1),
    doThis: z.string().min(1),
    notice: z.string().min(1),
    explain: z.string().min(1),
    reveal: conceptPageV2RevealSchema.optional(),
    setup: challengeSetupSchema.optional(),
    inlineCheck: conceptPageV2InlineCheckSchema.optional(),
  });

const conceptPageV2Schema = z
  .strictObject({
    intuition: z.string().min(1).optional(),
    whyItMatters: z.string().min(1).optional(),
    estimatedMinutes: z.number().int().positive().optional(),
    equationSnapshot: conceptPageV2EquationSnapshotSchema.optional(),
    startSetup: challengeSetupSchema.optional(),
    guidedSteps: z.array(conceptPageV2GuidedStepSchema).min(1),
    wrapUp: conceptPageV2WrapUpSchema.optional(),
    referenceSections: z
      .array(conceptPageSectionIdSchema)
      .min(1)
      .max(conceptPageSectionIds.length)
      .optional(),
  })
  .superRefine((v2, ctx) => {
    const seen = new Set<string>();

    for (const [index, step] of v2.guidedSteps.entries()) {
      if (seen.has(step.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate concept page V2 guided step "${step.id}".`,
          path: ["guidedSteps", index, "id"],
        });
      }

      seen.add(step.id);
    }

    const seenReferenceSections = new Set<string>();

    for (const [index, sectionId] of (v2.referenceSections ?? []).entries()) {
      if (seenReferenceSections.has(sectionId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate concept page V2 reference section "${sectionId}".`,
          path: ["referenceSections", index],
        });
      }

      seenReferenceSections.add(sectionId);
    }

    const seenNextConceptSlugs = new Set<string>();

    for (const [index, nextConcept] of (v2.wrapUp?.nextConcepts ?? []).entries()) {
      if (seenNextConceptSlugs.has(nextConcept.slug)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate concept page V2 next concept "${nextConcept.slug}".`,
          path: ["wrapUp", "nextConcepts", index, "slug"],
        });
      }

      seenNextConceptSlugs.add(nextConcept.slug);
    }
  });

export const subjectCatalogEntrySchema = z.strictObject({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Subject ids must be kebab-case."),
  slug: conceptSlugSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  introduction: z.string().min(1),
  sequence: z.number().int().min(0).optional(),
  accent: conceptAccentSchema,
  featuredTopicSlugs: z.array(conceptSlugSchema).min(1),
  featuredStarterTrackSlugs: z.array(conceptSlugSchema).min(1),
  bridgeStarterTrackSlugs: z.array(conceptSlugSchema).optional(),
  featuredConceptSlugs: z.array(conceptSlugSchema).min(1),
});

export const subjectCatalogSchema = z.array(subjectCatalogEntrySchema).min(1);

const topicLandingGroupSchema = z.strictObject({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Topic group ids must be kebab-case."),
  title: z.string().min(1),
  description: z.string().min(1).optional(),
  conceptSlugs: z.array(conceptSlugSchema).min(1),
});

export const topicLandingCatalogEntrySchema = z.strictObject({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Topic ids must be kebab-case."),
  slug: conceptSlugSchema,
  subject: conceptSubjectSchema.default("Physics"),
  title: z.string().min(1),
  description: z.string().min(1),
  introduction: z.string().min(1),
  sequence: z.number().int().min(0).optional(),
  conceptTopics: z.array(conceptTopicSchema).min(1),
  relatedTopicSlugs: z.array(conceptSlugSchema).optional(),
  recommendedStarterTrackSlugs: z.array(conceptSlugSchema).optional(),
  featuredConceptSlugs: z.array(conceptSlugSchema).min(1),
  conceptGroups: z.array(topicLandingGroupSchema).min(1),
});

export const topicLandingCatalogSchema = z.array(topicLandingCatalogEntrySchema).min(1);

const starterTrackCheckpointChallengeSchema = z.strictObject({
  conceptSlug: conceptSlugSchema,
  challengeId: z.string().min(1),
});

const learningPathEntryDiagnosticProbeIdSchema = z
  .string()
  .min(1)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Learning-path diagnostic probe ids must be kebab-case.",
  );

const learningPathEntryDiagnosticQuickTestProbeSchema = z.strictObject({
  id: learningPathEntryDiagnosticProbeIdSchema,
  kind: z.literal("quick-test"),
  conceptSlug: conceptSlugSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
});

const learningPathEntryDiagnosticChallengeProbeSchema = z.strictObject({
  id: learningPathEntryDiagnosticProbeIdSchema,
  kind: z.literal("challenge"),
  conceptSlug: conceptSlugSchema,
  challengeId: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
});

export const learningPathEntryDiagnosticProbeSchema = z.discriminatedUnion("kind", [
  learningPathEntryDiagnosticQuickTestProbeSchema,
  learningPathEntryDiagnosticChallengeProbeSchema,
]);

export const learningPathEntryDiagnosticSchema = z
  .strictObject({
    title: z.string().min(1),
    summary: z.string().min(1),
    probes: z.array(learningPathEntryDiagnosticProbeSchema).min(1).max(3),
    skipToConcept: conceptSlugSchema.optional(),
    skipToStepId: guidedCollectionStepIdSchema.optional(),
  })
  .superRefine((diagnostic, ctx) => {
    const seenProbeIds = new Set<string>();

    for (const [index, probe] of diagnostic.probes.entries()) {
      if (seenProbeIds.has(probe.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate learning-path diagnostic probe id "${probe.id}".`,
          path: ["probes", index, "id"],
        });
      }

      seenProbeIds.add(probe.id);
    }

    if (diagnostic.skipToConcept && diagnostic.skipToStepId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Learning-path diagnostics cannot set both skipToConcept and skipToStepId.",
        path: ["skipToStepId"],
      });
    }
  });

export const starterTrackCheckpointSchema = z.strictObject({
  id: starterTrackCheckpointIdSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  afterConcept: conceptSlugSchema,
  conceptSlugs: z.array(conceptSlugSchema).min(1),
  challenge: starterTrackCheckpointChallengeSchema,
});

export const starterTrackCatalogEntrySchema = z.strictObject({
  id: starterTrackIdSchema,
  slug: conceptSlugSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  introduction: z.string().min(1),
  sequenceRationale: z.string().min(1),
  sequence: z.number().int().min(0).optional(),
  heroTrack: z.boolean().optional(),
  discoveryHighlight: z.boolean().optional(),
  accent: conceptAccentSchema,
  highlights: z.array(z.string().min(1)).min(1),
  conceptSlugs: z.array(conceptSlugSchema).min(1),
  checkpoints: z.array(starterTrackCheckpointSchema).optional(),
  entryDiagnostic: learningPathEntryDiagnosticSchema.optional(),
  recommendedNextTrackSlugs: z.array(conceptSlugSchema).optional(),
  prerequisiteTrackSlugs: z.array(conceptSlugSchema).optional(),
});

export const starterTrackCatalogSchema = z.array(starterTrackCatalogEntrySchema).min(1);

const guidedCollectionFormatSchema = z.enum(["lesson-set", "playlist"]);
const guidedCollectionSurfaceKindSchema = z.enum([
  "topic",
  "challenge-hub",
  "reference",
]);
const guidedCollectionSurfaceCompletionModeSchema = z.enum([
  "any-progress",
  "all-complete",
]);

const guidedCollectionStepBaseSchema = z.strictObject({
  id: guidedCollectionStepIdSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  purpose: z.string().min(1),
  estimatedMinutes: z.number().int().positive().optional(),
});

const guidedCollectionConceptStepSchema = guidedCollectionStepBaseSchema.extend({
  kind: z.literal("concept"),
  conceptSlug: conceptSlugSchema,
});

const guidedCollectionTrackStepSchema = guidedCollectionStepBaseSchema.extend({
  kind: z.literal("track"),
  trackSlug: conceptSlugSchema,
});

const guidedCollectionChallengeStepSchema = guidedCollectionStepBaseSchema.extend({
  kind: z.literal("challenge"),
  conceptSlug: conceptSlugSchema,
  challengeId: z.string().min(1),
});

const guidedCollectionSurfaceStepSchema = guidedCollectionStepBaseSchema.extend({
  kind: z.literal("surface"),
  surfaceKind: guidedCollectionSurfaceKindSchema,
  href: z
    .string()
    .min(1)
    .startsWith("/", "Guided collection surfaces must use internal relative paths."),
  actionLabel: z.string().min(1),
  completionMode: guidedCollectionSurfaceCompletionModeSchema.optional(),
  relatedConceptSlugs: z.array(conceptSlugSchema).min(1),
});

const guidedCollectionStepSchema = z.discriminatedUnion("kind", [
  guidedCollectionConceptStepSchema,
  guidedCollectionTrackStepSchema,
  guidedCollectionChallengeStepSchema,
  guidedCollectionSurfaceStepSchema,
]);

export const guidedCollectionCatalogEntrySchema = z
  .strictObject({
    id: guidedCollectionIdSchema,
    slug: conceptSlugSchema,
    title: z.string().min(1),
    format: guidedCollectionFormatSchema,
    summary: z.string().min(1),
    introduction: z.string().min(1),
    sequenceRationale: z.string().min(1),
    educatorNote: z.string().min(1).optional(),
    sequence: z.number().int().min(0).optional(),
    accent: conceptAccentSchema,
    highlights: z.array(z.string().min(1)).min(1),
    steps: z.array(guidedCollectionStepSchema).min(1),
    entryDiagnostic: learningPathEntryDiagnosticSchema.optional(),
  })
  .superRefine((collection, ctx) => {
    const seenStepIds = new Set<string>();

    for (const [index, step] of collection.steps.entries()) {
      if (seenStepIds.has(step.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate guided collection step id "${step.id}".`,
          path: ["steps", index, "id"],
        });
      }

      seenStepIds.add(step.id);
    }
  });

export const guidedCollectionCatalogSchema = z.array(guidedCollectionCatalogEntrySchema).min(1);

const conceptMetadataSchemaBase = z.strictObject({
  id: conceptIdSchema,
  slug: conceptSlugSchema,
  aliases: z.array(conceptSlugSchema).optional(),
  contentFile: conceptContentFileSchema,
  title: z.string().min(1),
  shortTitle: z.string().min(1).optional(),
  summary: z.string().min(1),
  subject: conceptSubjectSchema.default("Physics"),
  topic: conceptTopicSchema,
  subtopic: z.string().min(1).optional(),
  difficulty: conceptDifficultySchema,
  sequence: z.number().int().min(0).optional(),
  tags: z.array(z.string().min(1)).optional(),
  prerequisites: z.array(conceptSlugSchema).optional(),
  related: z.array(conceptSlugSchema).optional(),
  recommendedNext: z.array(conceptRecommendationSchema).optional(),
  published: z.boolean(),
  status: conceptStatusSchema.optional(),
  estimatedStudyMinutes: z.number().int().positive().optional(),
  heroConcept: z.boolean().optional(),
  accent: conceptAccentSchema,
  highlights: z.array(z.string().min(1)).min(1),
  simulationKind: z.enum(simulationKinds),
});

export const conceptCatalogEntrySchema = conceptMetadataSchemaBase.superRefine(
  (entry, ctx) => {
    if (entry.status === "published" && !entry.published) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Concept status cannot be published when published is false.",
        path: ["status"],
      });
    }

    if (
      entry.published &&
      entry.status !== undefined &&
      entry.status !== "published"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Published concepts must use status \"published\" when status is provided.",
        path: ["status"],
      });
    }
  },
);

export const conceptCatalogSchema = z.array(conceptCatalogEntrySchema).min(1);

const sectionSchema = z.strictObject({
  explanation: structuredTextSchema,
  keyIdeas: textListSchema,
  commonMisconception: z.strictObject({
    myth: z.string().min(1),
    correction: textListSchema,
  }),
  workedExamples: workedExamplesSchema,
  miniChallenge: z.strictObject({
    prompt: z.string().min(1),
    prediction: z.string().min(1).optional(),
    answer: z.string().min(1),
    explanation: z.string().min(1),
  }),
});

const accessibilitySchema = z.strictObject({
  simulationDescription: structuredTextSchema,
  graphSummary: structuredTextSchema,
});

const seoSchema = z
  .strictObject({
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    keywords: z.array(z.string().min(1)).min(1).optional(),
  })
  .optional();

const simulationConfigSchema = z.strictObject({
  defaults: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  controls: z.array(z.union([sliderControlSchema, toggleControlSchema])).min(1),
  presets: z.array(presetSchema).min(1),
  overlays: z.array(overlaySchema).optional(),
  ui: z
    .strictObject({
      initialGraphId: z.string().min(1).optional(),
      primaryGraphIds: z.array(z.string().min(1)).optional(),
      primaryControlIds: z.array(z.string().min(1)).optional(),
      primaryPresetIds: z.array(z.string().min(1)).optional(),
      starterExploreTasks: z.array(z.string().min(1)).min(1).optional(),
    })
    .optional(),
});

export const conceptRichContentSchema = z.strictObject({
  pageFramework: conceptPageFrameworkSchema.optional(),
  pageIntro: conceptPageIntroSchema.optional(),
  v2: conceptPageV2Schema.optional(),
  sections: sectionSchema,
  equations: z.array(equationSchema).min(1),
  variableLinks: z.array(variableLinkSchema).min(1),
  simulation: simulationConfigSchema,
  graphs: z.array(graphSchema).min(1),
  noticePrompts: noticePromptConfigSchema,
  predictionMode: predictionModeSchema,
  challengeMode: challengeModeAuthoringSchema.optional(),
  quickTest: quickTestSchema,
  accessibility: accessibilitySchema,
  seo: seoSchema,
});

export const conceptRecordSchema = conceptCatalogEntrySchema.extend({
  pageFramework: conceptPageFrameworkSchema.optional(),
  pageIntro: conceptPageIntroSchema.optional(),
  v2: conceptPageV2Schema.optional(),
  sections: sectionSchema,
  equations: z.array(equationSchema).min(1),
  variableLinks: z.array(variableLinkSchema).min(1),
  simulation: simulationConfigSchema.extend({
    kind: z.enum(simulationKinds),
  }),
  graphs: z.array(graphSchema).min(1),
  noticePrompts: noticePromptConfigSchema,
  predictionMode: predictionModeSchema,
  challengeMode: challengeModeSchema.optional(),
  quickTest: quickTestSchema,
  accessibility: accessibilitySchema,
  seo: seoSchema,
});

export const conceptSchema = conceptRichContentSchema;
export const conceptRegistryEntrySchema = conceptCatalogEntrySchema;
export const conceptRegistrySchema = conceptCatalogSchema;

export type ConceptId = z.infer<typeof conceptIdSchema>;
export type StarterTrackId = z.infer<typeof starterTrackIdSchema>;
export type GuidedCollectionId = z.infer<typeof guidedCollectionIdSchema>;
export type ConceptSlug = z.infer<typeof conceptSlugSchema>;
export type ConceptContentFile = z.infer<typeof conceptContentFileSchema>;
export type ConceptSubject = z.infer<typeof conceptSubjectSchema>;
export type ConceptTopic = z.infer<typeof conceptTopicSchema>;
export type ConceptDifficulty = z.infer<typeof conceptDifficultySchema>;
export type ConceptStatus = z.infer<typeof conceptStatusSchema>;
export type SimulationKind = (typeof simulationKinds)[number];

export type ConceptMetadata = z.infer<typeof conceptCatalogEntrySchema>;
export type ConceptRichContent = z.infer<typeof conceptRichContentSchema>;
export type ConceptContent = z.infer<typeof conceptRecordSchema>;
export type ConceptSection = ConceptContent["sections"];
export type ConceptEquation = ConceptContent["equations"][number];
export type ConceptVariableLink = ConceptContent["variableLinks"][number];
export type ConceptGraph = ConceptContent["graphs"][number];
export type ConceptControl = ConceptContent["simulation"]["controls"][number];
export type ConceptNoticePromptConfig = ConceptContent["noticePrompts"];
export type ConceptNoticePrompt = ConceptNoticePromptConfig["items"][number];
export type ConceptNoticePromptType = ConceptNoticePrompt["type"];
export type ConceptNoticePromptConditions = NonNullable<
  ConceptNoticePrompt["conditions"]
>;
export type ConceptPredictionMode = ConceptContent["predictionMode"];
export type ConceptPredictionItem = ConceptPredictionMode["items"][number];
export type ConceptPredictionChoice = ConceptPredictionItem["choices"][number];
export type ConceptChallengeModeAuthoring = z.infer<typeof challengeModeAuthoringSchema>;
export type ConceptChallengeItemAuthoring = ConceptChallengeModeAuthoring["items"][number];
export type ConceptChallengeRequirementsAuthoring = NonNullable<
  ConceptChallengeItemAuthoring["requirements"]
>;
export type ConceptChallengeTargetAuthoring = NonNullable<
  ConceptChallengeItemAuthoring["targets"]
>[number];
export type ConceptChallengeMode = NonNullable<ConceptContent["challengeMode"]>;
export type ConceptChallengeItem = ConceptChallengeMode["items"][number];
export type ConceptChallengeSetup = NonNullable<ConceptChallengeItem["setup"]>;
export type ConceptChallengeCheck = ConceptChallengeItem["checks"][number];
export type ConceptQuickTest = ConceptContent["quickTest"];
export type ConceptQuickTestQuestion = ConceptQuickTest["questions"][number];
export type ConceptQuickTestChoice = ConceptQuickTestQuestion["choices"][number];
export type ConceptQuickTestQuestionType = ConceptQuickTestQuestion["type"];
export type ConceptQuickTestMode = ConceptQuickTest["mode"];
export type ConceptQuickTestTemplate = NonNullable<ConceptQuickTest["templates"]>[number];
export type ConceptQuickTestShowMeAction = NonNullable<
  ConceptQuickTestQuestion["showMeAction"]
>;
export type ConceptPageSectionId = z.infer<typeof conceptPageSectionIdSchema>;
export type ConceptPageV2GuidedStepId = z.infer<typeof conceptPageV2GuidedStepIdSchema>;
export type ConceptPageV2GuidedStep = z.infer<typeof conceptPageV2GuidedStepSchema>;
export type ConceptPageV2 = z.infer<typeof conceptPageV2Schema>;
export type ConceptPageV2EquationSnapshot = NonNullable<
  ConceptPageV2["equationSnapshot"]
>;
export type ConceptPageV2Reveal = NonNullable<ConceptPageV2GuidedStep["reveal"]>;
export type ConceptPageV2InlineCheck = NonNullable<
  ConceptPageV2GuidedStep["inlineCheck"]
>;
export type ConceptPageV2WrapUp = NonNullable<ConceptPageV2["wrapUp"]>;
export type ConceptPageV2NextConcept = NonNullable<
  ConceptPageV2WrapUp["nextConcepts"]
>[number];
export type ConceptPageSectionConfig = z.infer<typeof conceptPageSectionConfigSchema>;
export type ConceptPageFramework = z.infer<typeof conceptPageFrameworkSchema>;
export type ConceptPageIntro = z.infer<typeof conceptPageIntroSchema>;
export type ConceptPageFeaturedSetup = NonNullable<
  ConceptPageFramework["featuredSetups"]
>[number];
export type ConceptWorkedExamples = ConceptSection["workedExamples"];
export type ConceptWorkedExample = ConceptWorkedExamples["items"][number];
export type ConceptWorkedExampleVariable = ConceptWorkedExample["variables"][number];
export type ConceptWorkedExampleStep = ConceptWorkedExample["steps"][number];
export type ConceptWorkedExampleAction = NonNullable<
  ConceptWorkedExample["applyAction"]
>;
export type ConceptRecommendation = NonNullable<
  ConceptMetadata["recommendedNext"]
>[number];
export type ConceptAccent = z.infer<typeof conceptAccentSchema>;
export type SubjectMetadata = z.infer<typeof subjectCatalogEntrySchema>;
export type TopicLandingMetadata = z.infer<typeof topicLandingCatalogEntrySchema>;
export type TopicLandingGroupMetadata = TopicLandingMetadata["conceptGroups"][number];
export type TopicTestMetadata = z.infer<typeof topicTestCatalogEntrySchema>;
export type TopicTestQuestionMetadata = NonNullable<TopicTestMetadata["questions"]>[number];
export type TopicTestQuestionKind = z.infer<typeof topicTestQuestionKindSchema>;
export type TestPackMetadata = z.infer<typeof testPackCatalogEntrySchema>;
export type TestPackQuestionMetadata = NonNullable<TestPackMetadata["questions"]>[number];
export type TestPackQuestionKind = z.infer<typeof testPackQuestionKindSchema>;
export type StarterTrackCheckpointMetadata = z.infer<typeof starterTrackCheckpointSchema>;
export type LearningPathEntryDiagnosticMetadata = z.infer<
  typeof learningPathEntryDiagnosticSchema
>;
export type LearningPathEntryDiagnosticProbeMetadata =
  LearningPathEntryDiagnosticMetadata["probes"][number];
export type StarterTrackMetadata = z.infer<typeof starterTrackCatalogEntrySchema>;
export type GuidedCollectionFormat = z.infer<typeof guidedCollectionFormatSchema>;
export type GuidedCollectionSurfaceKind = z.infer<typeof guidedCollectionSurfaceKindSchema>;
export type GuidedCollectionSurfaceCompletionMode = z.infer<
  typeof guidedCollectionSurfaceCompletionModeSchema
>;
export type GuidedCollectionMetadata = z.infer<typeof guidedCollectionCatalogEntrySchema>;
export type GuidedCollectionStepMetadata = GuidedCollectionMetadata["steps"][number];
export type ConceptSummary = Pick<
  ConceptMetadata,
  | "id"
  | "slug"
  | "title"
  | "shortTitle"
  | "summary"
  | "subject"
  | "topic"
  | "subtopic"
  | "difficulty"
  | "sequence"
  | "status"
  | "estimatedStudyMinutes"
  | "heroConcept"
  | "accent"
  | "highlights"
>;

export const conceptCollectionSchema = z.array(conceptRichContentSchema).min(1);
export const normalizedConceptCollectionSchema = z.array(conceptRecordSchema).min(1);
