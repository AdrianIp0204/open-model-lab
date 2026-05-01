import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const OUTPUT_DIRECTORY_SEGMENTS = ["output", "concept-scaffolds"];
const CATALOG_ENTRY_FILE_NAME = "catalog-entry.json";
const CONCEPT_CONTENT_FILE_NAME = "concept-content.json";
const README_FILE_NAME = "README.md";

function parseJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function ensureKebabCase(value, label) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value)) {
    throw new Error(`${label} must be kebab-case. Received "${value}".`);
  }
}

function requireOption(value, label) {
  if (!value) {
    throw new Error(`Missing required option "${label}".`);
  }

  return value;
}

function parseInteger(value, label) {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative integer. Received "${value}".`);
  }

  return parsed;
}

function midpointSliderValue(control) {
  const midpoint = (control.min + control.max) / 2;
  const stepped = Math.round((midpoint - control.min) / control.step) * control.step + control.min;
  return Number(stepped.toFixed(6));
}

function offsetSliderValue(control, direction) {
  const midpoint = midpointSliderValue(control);
  const delta = Math.max(control.step, (control.max - control.min) * 0.15);
  const raw = midpoint + delta * direction;
  const clamped = Math.min(control.max, Math.max(control.min, raw));
  const stepped =
    Math.round((clamped - control.min) / control.step) * control.step + control.min;
  return Number(stepped.toFixed(6));
}

function buildSliderRange(control) {
  const center = midpointSliderValue(control);
  const span = Math.max(control.step * 4, (control.max - control.min) * 0.12);
  const min = Math.min(control.max, Math.max(control.min, center - span / 2));
  const max = Math.min(control.max, Math.max(control.min, center + span / 2));

  return {
    min: Number(min.toFixed(6)),
    max: Number(max.toFixed(6)),
  };
}

function buildPatchValue(control, direction = 1) {
  if (!control) {
    return undefined;
  }

  if (control.kind === "toggle") {
    return true;
  }

  return offsetSliderValue(control, direction);
}

function relativeRepoPath(repoRoot, filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/gu, "/");
}

function loadCatalog(repoRoot) {
  const catalogPath = path.join(repoRoot, "content", "catalog", "concepts.json");
  const catalog = parseJsonFile(catalogPath);
  return {
    catalogPath,
    catalog,
  };
}

function loadConceptContent(repoRoot, contentFile) {
  return parseJsonFile(path.join(repoRoot, "content", "concepts", `${contentFile}.json`));
}

function buildGenericSeed() {
  return {
    equations: [
      {
        id: "primary-relation",
        latex: "y = f(x)",
        label: "Primary relation",
        meaning: "TODO: Replace with the governing relation that the live model should surface.",
      },
      {
        id: "comparison-relation",
        latex: "\\Delta y = y_2 - y_1",
        label: "Comparison relation",
        meaning: "TODO: Add a second relation that connects the graph or overlay back to the stage.",
      },
    ],
    variableLinks: [
      {
        id: "primary-variable",
        symbol: "x",
        label: "Primary value",
        param: "primaryValue",
        tone: "teal",
        description: "TODO: Describe how the main control changes the live stage, graph, and equation map.",
        equationIds: ["primary-relation"],
        graphIds: ["primary-graph"],
        overlayIds: ["guide-overlay"],
      },
      {
        id: "secondary-variable",
        symbol: "y",
        label: "Secondary value",
        param: "secondaryValue",
        tone: "amber",
        description: "TODO: Describe the second authored quantity and how it changes the live response.",
        equationIds: ["comparison-relation"],
        graphIds: ["primary-graph"],
        overlayIds: ["guide-overlay"],
      },
    ],
    simulation: {
      defaults: {
        primaryValue: 6,
        secondaryValue: 3,
        guideOverlay: true,
      },
      controls: [
        {
          id: "primary-value",
          kind: "slider",
          label: "Primary value",
          param: "primaryValue",
          min: 0,
          max: 12,
          step: 0.5,
          unit: "units",
          description: "TODO: Replace with the primary simulation control.",
        },
        {
          id: "secondary-value",
          kind: "slider",
          label: "Secondary value",
          param: "secondaryValue",
          min: 0,
          max: 8,
          step: 0.5,
          unit: "units",
          description: "TODO: Replace with the comparison or response control.",
        },
      ],
      presets: [
        {
          id: "baseline",
          label: "Baseline",
          description: "TODO: Replace with the default teaching case.",
          values: {
            primaryValue: 6,
            secondaryValue: 3,
          },
        },
        {
          id: "contrast-case",
          label: "Contrast case",
          description: "TODO: Replace with a second case that makes the contrast honest on the stage and graph.",
          values: {
            primaryValue: 9,
            secondaryValue: 2,
          },
        },
      ],
      overlays: [
        {
          id: "guide-overlay",
          label: "Guide overlay",
          shortDescription: "TODO: Replace with the main overlay that clarifies the live pattern.",
          whatToNotice: [
            "TODO: Replace with one concrete observation that the overlay makes easier to see.",
          ],
          whyItMatters: "TODO: Explain why the overlay is worth keeping near the interactive lab.",
          relatedControls: ["primaryValue", "secondaryValue"],
          relatedGraphTabs: ["primary-graph"],
          relatedEquationVariables: ["primary-variable"],
          defaultOn: true,
        },
      ],
    },
    graphs: [
      {
        id: "primary-graph",
        label: "Primary graph",
        xLabel: "x-axis",
        yLabel: "y-axis",
        series: ["mainSeries"],
        description: "TODO: Replace with the graph that should stay closest to the live interaction.",
      },
    ],
  };
}

function buildExactStateDecisionText(scaffold) {
  return scaffold.template
    ? "Review the seeded live state and decide whether it is stable enough to reopen as an exact-state link."
    : "Decide whether the live bench has a stable learner-facing state that is worth reopening and sharing.";
}

function buildCompareDecisionText(scaffold) {
  return scaffold.metadataEntry.simulationKind === "sorting-algorithmic-trade-offs"
    ? "Compare-save is worth considering when the concept benefits from side-by-side A/B scenes with the same controls."
    : "Do not force compare-save unless the concept naturally needs side-by-side A/B scenes and the compare mode stays legible.";
}

function cloneSeedFromTemplate(templateContent) {
  return {
    equations: structuredClone(templateContent.equations),
    variableLinks: structuredClone(templateContent.variableLinks),
    simulation: structuredClone(templateContent.simulation),
    graphs: structuredClone(templateContent.graphs),
  };
}

function pickSeedReferences(seed) {
  const sliderControls = seed.simulation.controls.filter((control) => control.kind === "slider");
  const primaryControl = sliderControls[0] ?? seed.simulation.controls[0] ?? null;
  const secondaryControl =
    sliderControls[1] ?? sliderControls[0] ?? seed.simulation.controls[1] ?? null;
  const primaryGraph = seed.graphs[0] ?? null;
  const primaryOverlay = seed.simulation.overlays?.[0] ?? null;
  const primaryPreset = seed.simulation.presets[0] ?? null;
  const primaryVariable = seed.variableLinks[0] ?? null;
  const secondaryVariable = seed.variableLinks[1] ?? seed.variableLinks[0] ?? null;

  return {
    primaryControl,
    secondaryControl,
    primaryGraph,
    primaryOverlay,
    primaryPreset,
    primaryVariable,
    secondaryVariable,
  };
}

function buildWorkedExample(refs, title) {
  const primaryControlLabel = refs.primaryControl?.label ?? "the main control";
  const primaryPresetId = refs.primaryPreset?.id;
  const primaryGraphId = refs.primaryGraph?.id;
  const primaryOverlayId = refs.primaryOverlay?.id;
  const firstVariable = refs.primaryVariable;
  const secondVariable = refs.secondaryVariable;

  const applyAction = {
    label: "Focus the live case",
    observationHint:
      "TODO: Describe what the learner should inspect on the stage and graph after applying the worked-example setup.",
    ...(primaryPresetId ? { presetId: primaryPresetId } : {}),
    ...(refs.primaryControl ? { highlightedControlIds: [refs.primaryControl.param] } : {}),
    ...(primaryGraphId ? { highlightedGraphIds: [primaryGraphId] } : {}),
    ...(primaryOverlayId ? { highlightedOverlayIds: [primaryOverlayId] } : {}),
  };

  return {
    title: "Live worked example",
    intro:
      "Start with one example that reads the real simulation state, not a detached worksheet. Replace the placeholder item id and add a matching builder before moving this concept into the canonical content folder.",
    items: [
      {
        id: "replace-with-live-worked-example-id",
        title: `TODO: Add a worked example for ${title}`,
        prompt: `TODO: Ask a concrete question that can be solved from the live ${primaryControlLabel} state and the current graph.`,
        variables: [
          {
            id: firstVariable?.id ?? "primary-variable",
            ...(firstVariable?.id ? { variableId: firstVariable.id } : {}),
            symbol: firstVariable?.symbol ?? "x",
            label: firstVariable?.label ?? "Primary value",
            valueKey: "primaryValueToken",
            unit: refs.primaryControl?.unit,
          },
          {
            id: secondVariable?.id ?? "secondary-variable",
            ...(secondVariable?.id ? { variableId: secondVariable.id } : {}),
            symbol: secondVariable?.symbol ?? "y",
            label: secondVariable?.label ?? "Secondary value",
            valueKey: "secondaryValueToken",
            unit: refs.secondaryControl?.unit,
          },
        ],
        steps: [
          {
            id: "identify-relation",
            label: "1. Identify the relation",
            template:
              "TODO: Replace with the relation or reasoning move that connects the live controls to the graph and stage.",
          },
          {
            id: "substitute-values",
            label: "2. Substitute the live values",
            template:
              "TODO: Replace with a token-backed substitution step such as {{primaryValueToken}} and {{secondaryValueToken}}.",
          },
          {
            id: "interpret-result",
            label: "3. Interpret the result",
            template:
              "TODO: Replace with the graph or stage interpretation that the learner should notice immediately.",
          },
        ],
        resultLabel: "TODO: Replace with the worked-example result label",
        resultTemplate: "TODO: Replace with the final resolved expression or value.",
        interpretationTemplate:
          "TODO: Explain how the result should change what the learner notices on the live stage or graph.",
        applyAction,
      },
    ],
  };
}

function buildChallengeMode(refs, title) {
  const requirements = {
    ...(refs.primaryGraph ? { graphId: refs.primaryGraph.id } : {}),
    ...(refs.primaryOverlay ? { overlayIds: [refs.primaryOverlay.id] } : {}),
  };

  const item = {
    id: `${title.toLowerCase().replace(/[^a-z0-9]+/gu, "-")}-challenge-1`,
    title: "TODO: Add one strong challenge",
    style: "target-setting",
    prompt:
      "TODO: Turn the real simulation state into one compact task that needs the graph, overlay, compare mode, or inspect time honestly.",
    successMessage:
      "TODO: Replace with the success message that explains what the learner actually demonstrated.",
    ...(refs.primaryPreset
      ? {
          setup: {
            presetId: refs.primaryPreset.id,
            note:
              "TODO: Replace with the guidance that helps the learner start from a sensible live setup.",
          },
        }
      : {}),
    ...(Object.keys(requirements).length ? { requirements } : {}),
    hints: [
      "TODO: Add one hint that points back to the graph, overlay, compare mode, or time rail instead of giving the answer away.",
    ],
  };

  if (refs.primaryControl?.kind === "slider") {
    const range = buildSliderRange(refs.primaryControl);

    item.targets = [
      {
        label: `TODO: Replace with the target band for ${refs.primaryControl.label}.`,
        param: refs.primaryControl.param,
        min: range.min,
        max: range.max,
        ...(refs.primaryControl.unit ? { displayUnit: refs.primaryControl.unit } : {}),
      },
    ];
  }

  return {
    title: "Challenge mode",
    intro:
      "Keep this short. One honest task is better than a long ladder, and it should reuse the same live simulation state rather than inventing a separate challenge model.",
    items: [item],
  };
}

function buildConceptContent(options, seed) {
  const refs = pickSeedReferences(seed);
  const primaryGraphLabel = refs.primaryGraph?.label ?? "the main graph";
  const primaryGraphId = refs.primaryGraph?.id;
  const primaryOverlayId = refs.primaryOverlay?.id;
  const primaryControlParam = refs.primaryControl?.param;
  const secondaryControlParam = refs.secondaryControl?.param;
  const predictionPatch = {
    ...(primaryControlParam
      ? {
          [primaryControlParam]:
            buildPatchValue(refs.primaryControl, 1) ?? midpointSliderValue(refs.primaryControl),
        }
      : {}),
    ...(secondaryControlParam && refs.secondaryControl && refs.secondaryControl !== refs.primaryControl
      ? {
          [secondaryControlParam]:
            buildPatchValue(refs.secondaryControl, -1) ??
            midpointSliderValue(refs.secondaryControl),
        }
      : {}),
  };

  return {
    sections: {
      explanation: {
        paragraphs: [
          `TODO: Replace with a short explanation of the live pattern ${options.title} should teach first.`,
          "TODO: Replace with a second paragraph that explains why the graph, overlays, and controls belong together on this page.",
        ],
      },
      keyIdeas: [
        "TODO: Add one durable takeaway that should still hold after the learner leaves the live prompt.",
        "TODO: Add one graph-linked idea that explains how the graph and stage describe the same behavior.",
        "TODO: Add one control or compare-mode takeaway that should survive past the worked examples.",
      ],
      commonMisconception: {
        myth: `TODO: Replace with a likely misconception about ${options.title}.`,
        correction: [
          "TODO: Add the first correction sentence.",
          "TODO: Add the second correction sentence that points back to the live model.",
        ],
      },
      workedExamples: buildWorkedExample(refs, options.title),
      miniChallenge: {
        prompt:
          "TODO: Add a single short prompt that makes the learner predict or explain a live change.",
        prediction:
          "TODO: Add an optional prediction sentence if the learner should commit before checking the stage.",
        answer: "TODO: Replace with the expected answer.",
        explanation:
          "TODO: Replace with the explanation that links the answer back to the stage and graph.",
      },
    },
    equations: seed.equations,
    variableLinks: seed.variableLinks,
    simulation: seed.simulation,
    graphs: seed.graphs,
    noticePrompts: {
      title: "What to notice",
      intro:
        "Keep prompts short and situational. The strongest prompt should point at a pattern the current graph or stage can actually show.",
      items: [
        {
          id: `${options.slug}-notice-live-pattern`,
          text: `TODO: Tell the learner what to notice first in ${options.title}.`,
          type: "observation",
          priority: 1,
          tryThis:
            "TODO: Add one concise action that changes the live state without leaving the main interaction.",
          whyItMatters:
            "TODO: Explain why this pattern matters for the concept rather than just the current screenshot.",
          ...(primaryControlParam ? { relatedControls: [primaryControlParam] } : {}),
          ...(primaryGraphId ? { relatedGraphTabs: [primaryGraphId] } : {}),
          ...(primaryOverlayId ? { relatedOverlays: [primaryOverlayId] } : {}),
        },
        {
          id: `${options.slug}-notice-graph-link`,
          text: `TODO: Explain how ${primaryGraphLabel} should reinforce the stage or time behavior.`,
          type: "graph-reading",
          priority: 3,
          ...(primaryGraphId ? { conditions: { graphTabs: [primaryGraphId] } } : {}),
          tryThis:
            "TODO: Add one graph-linked prompt that uses hovering, scrubbing, compare mode, or inspect time honestly.",
          whyItMatters:
            "TODO: Explain what this graph representation clarifies that the stage alone cannot.",
          ...(primaryGraphId ? { relatedGraphTabs: [primaryGraphId] } : {}),
          ...(primaryOverlayId ? { relatedOverlays: [primaryOverlayId] } : {}),
        },
      ],
    },
    predictionMode: {
      title: "Prediction mode",
      intro:
        "Keep one prediction item to start. It should set up a real control change, then ask the learner to compare the live result with the prediction.",
      items: [
        {
          id: `${options.slug}-prediction-1`,
          prompt: `TODO: Ask what should change in ${options.title} before the learner applies the live patch.`,
          scenarioLabel: "TODO: Name the change",
          changeLabel: "TODO: Optional short label for the control change",
          choices: [
            { id: "a", label: "TODO: Replace with the correct outcome." },
            { id: "b", label: "TODO: Replace with a plausible distractor." },
            { id: "c", label: "TODO: Replace with another plausible distractor." },
          ],
          correctChoiceId: "a",
          explanation:
            "TODO: Explain the correct reasoning in terms of the stage, graph, or overlay.",
          observationHint:
            "TODO: Tell the learner what to inspect after applying the change.",
          apply: { patch: predictionPatch },
          ...(primaryControlParam ? { highlightedControls: [primaryControlParam] } : {}),
          ...(primaryGraphId ? { highlightedGraphs: [primaryGraphId] } : {}),
          ...(primaryOverlayId ? { highlightedOverlays: [primaryOverlayId] } : {}),
        },
      ],
    },
    challengeMode: buildChallengeMode(refs, options.title),
    quickTest: {
      title: "Quick test",
      intro:
        "Keep the first authored check compact and conceptual. The explanation should reinforce the live representation rather than restate the prompt.",
      questions: [
        {
          id: `${options.slug}-quick-test-1`,
          type: "reasoning",
          prompt: `TODO: Ask one conceptual check about ${options.title}.`,
          choices: [
            { id: "a", label: "TODO: Replace with the correct answer." },
            { id: "b", label: "TODO: Replace with a plausible incorrect answer." },
            { id: "c", label: "TODO: Replace with another plausible incorrect answer." },
          ],
          correctChoiceId: "a",
          explanation:
            "TODO: Explain why the correct answer matches the real graph, overlay, or stage behavior.",
          selectedWrongExplanations: {
            b: "TODO: Explain why choice B is wrong.",
            c: "TODO: Explain why choice C is wrong.",
          },
          showMeAction: {
            label: "Show the live evidence",
            observationHint:
              "TODO: Describe what the learner should notice after the quick-test action runs.",
            ...(refs.primaryPreset ? { presetId: refs.primaryPreset.id } : {}),
            ...(primaryControlParam ? { highlightedControlIds: [primaryControlParam] } : {}),
            ...(primaryGraphId ? { highlightedGraphIds: [primaryGraphId] } : {}),
            ...(primaryOverlayId ? { highlightedOverlayIds: [primaryOverlayId] } : {}),
          },
        },
      ],
    },
    accessibility: {
      simulationDescription: {
        paragraphs: [
          `TODO: Describe the live simulation for ${options.title} in two short paragraphs.`,
          "TODO: Explain what changes when the learner adjusts the core controls or toggles the main overlay.",
        ],
      },
      graphSummary: {
        paragraphs: [
          "TODO: Summarize what the primary graph shows.",
          "TODO: Explain how the graph stays linked to the stage or time controls.",
        ],
      },
    },
    seo: {
      title: options.title,
      description:
        "TODO: Replace with the concise SEO description once the concept wording is stable.",
      keywords: ["TODO-keyword-1", "TODO-keyword-2", "TODO-keyword-3"],
    },
  };
}

function buildConceptMetadata(options, templateMetadata) {
  const metadata = {
    id: options.id,
    slug: options.slug,
    contentFile: options.contentFile,
    title: options.title,
    shortTitle: options.shortTitle ?? options.title,
    summary:
      options.summary ??
      `TODO: Summarize the main live pattern ${options.title} should teach in one sentence.`,
    subject: options.subject ?? templateMetadata?.subject ?? "TODO: Add a subject",
    topic: options.topic,
    subtopic: options.subtopic ?? "TODO: Add a subtopic",
    difficulty: options.difficulty ?? templateMetadata?.difficulty ?? "Intro",
    tags: ["TODO-tag-1", "TODO-tag-2", "TODO-tag-3"],
    prerequisites: [],
    related: [],
    recommendedNext: [],
    published: false,
    status: "draft",
    estimatedStudyMinutes:
      options.estimatedStudyMinutes ?? templateMetadata?.estimatedStudyMinutes ?? 25,
    accent: options.accent ?? templateMetadata?.accent ?? "teal",
    highlights: ["TODO highlight 1", "TODO highlight 2", "TODO highlight 3"],
    simulationKind: options.simulationKind,
  };

  if (options.sequence !== undefined) {
    metadata.sequence = options.sequence;
  }

  if (options.heroConcept) {
    metadata.heroConcept = true;
  }

  return metadata;
}

function resolveTemplate(repoRoot, catalog, options) {
  if (options.blank) {
    return null;
  }

  if (options.templateSlug) {
    const metadata = catalog.find((entry) => entry.slug === options.templateSlug);

    if (!metadata) {
      throw new Error(`Unknown template slug "${options.templateSlug}".`);
    }

    if (options.simulationKind && metadata.simulationKind !== options.simulationKind) {
      throw new Error(
        `Template slug "${options.templateSlug}" uses simulation kind "${metadata.simulationKind}", not "${options.simulationKind}".`,
      );
    }

    return {
      metadata,
      content: loadConceptContent(repoRoot, metadata.contentFile),
      selectionMode: "explicit",
    };
  }

  if (!options.simulationKind) {
    return null;
  }

  const metadata = catalog.find((entry) => entry.simulationKind === options.simulationKind);

  if (!metadata) {
    return null;
  }

  return {
    metadata,
    content: loadConceptContent(repoRoot, metadata.contentFile),
    selectionMode: "auto",
  };
}

function validateRequestedIdentity(catalog, options) {
  ensureKebabCase(options.slug, "Concept slug");
  ensureKebabCase(options.contentFile, "Concept content file");
  ensureKebabCase(options.id, "Concept id");

  if (catalog.some((entry) => entry.slug === options.slug)) {
    throw new Error(`Concept slug "${options.slug}" already exists in the catalog.`);
  }

  if (catalog.some((entry) => entry.id === options.id)) {
    throw new Error(`Concept id "${options.id}" already exists in the catalog.`);
  }

  if (catalog.some((entry) => entry.contentFile === options.contentFile)) {
    throw new Error(`Concept content file "${options.contentFile}" already exists in the catalog.`);
  }
}

function normalizeOptions(rawOptions) {
  const slug = requireOption(rawOptions.slug, "--slug");
  const title = requireOption(rawOptions.title, "--title");
  const subject = rawOptions.subject;
  const topic = requireOption(rawOptions.topic, "--topic");
  const simulationKind = rawOptions.simulationKind;

  if (!simulationKind && !rawOptions.templateSlug) {
    throw new Error('Provide "--simulation-kind" or "--template-slug".');
  }

  return {
    slug,
    title,
    subject,
    topic,
    templateSlug: rawOptions.templateSlug,
    simulationKind,
    contentFile: rawOptions.contentFile ?? slug,
    id: rawOptions.id ?? `concept-${slug}`,
    shortTitle: rawOptions.shortTitle,
    summary: rawOptions.summary,
    subtopic: rawOptions.subtopic,
    difficulty: rawOptions.difficulty,
    accent: rawOptions.accent,
    estimatedStudyMinutes:
      rawOptions.estimatedStudyMinutes !== undefined
        ? parseInteger(rawOptions.estimatedStudyMinutes, "--estimated-study-minutes")
        : undefined,
    sequence:
      rawOptions.sequence !== undefined ? parseInteger(rawOptions.sequence, "--sequence") : undefined,
    outputDir: rawOptions.outputDir,
    blank: Boolean(rawOptions.blank),
    force: Boolean(rawOptions.force),
    write: Boolean(rawOptions.write),
    help: Boolean(rawOptions.help),
    heroConcept: Boolean(rawOptions.heroConcept),
  };
}

function buildReadme(repoRoot, scaffold) {
  const templateLabel = scaffold.template
    ? `${scaffold.template.metadata.slug} (${scaffold.template.selectionMode} template match)`
    : "blank generic scaffold";

  const subjectLabel =
    scaffold.metadataEntry.subject === "TODO: Add a subject"
      ? "TODO: Add a subject"
      : scaffold.metadataEntry.subject;
  const setupDecision = scaffold.template
    ? "Review the seeded live state and decide whether it is stable enough to reopen as an exact-state link."
    : "Decide whether the live bench has a stable learner-facing state that is worth reopening and sharing.";
  const compareDecision =
    scaffold.metadataEntry.simulationKind === "sorting-algorithmic-trade-offs"
      ? "Compare-save is worth considering when the concept benefits from side-by-side A/B scenes with the same controls."
      : "Do not force compare-save unless the concept naturally needs side-by-side A/B scenes and the compare mode stays legible.";

  return `# ${scaffold.options.title} scaffold

This scaffold stays outside the canonical concept catalog until you move the files into place.

Template source: ${templateLabel}

Canonical subject: ${subjectLabel}
Canonical topic: ${scaffold.options.topic}
Canonical simulation kind: ${scaffold.options.simulationKind}

Generated files:

- \`${CATALOG_ENTRY_FILE_NAME}\`: paste this object into \`content/catalog/concepts.json\`
- \`${CONCEPT_CONTENT_FILE_NAME}\`: move this file to \`content/concepts/${scaffold.options.contentFile}.json\` after replacing the TODO content
- Content wave checklist: see the checklist section below

Recommended workflow:

1. Review the metadata scaffold first. Fill \`subject\`, \`prerequisites\`, \`related\`, and \`recommendedNext\` so read-next stays data-driven.
2. Decide whether this concept needs a new topic, a starter-track update, or a recommended-goal-path update before you polish the copy.
3. Replace the TODO teaching copy in the content scaffold. Keep the shared concept-page framework unless you need a bounded \`pageFramework.sections\` override.
4. Replace \`replace-with-live-worked-example-id\` and add or update the matching builder in \`lib/learning/liveWorkedExamples.ts\`.
5. Decide whether the concept should support exact-state setup links. If yes, make sure the live state is stable enough to reopen later and that any featured setups stay honest.
6. Decide whether compare-save is actually useful. If it is, keep the compare scene legible and route the saved scene through the existing compare library seam instead of inventing a new one.
7. If this concept reuses an existing simulation kind, keep the control params, graph ids, overlay ids, and preset ids aligned with the live runtime seams.
8. If this concept needs a brand new simulation kind, wire it through these shared seams before publishing:
   - \`lib/content/schema.ts\`
   - \`lib/content/loaders.ts\`
   - \`lib/physics/index.ts\`
   - \`components/simulations/ConceptSimulationRenderer.tsx\`
   - the new physics helpers, simulation component, and focused tests
9. Make sure the subject page, topic page, starter track, search, and start surfaces will surface the new concept once the catalog row lands.
10. Move the files into the canonical content paths only after the metadata, content, and runtime hooks are ready.
11. Run the full validation commands:
   - \`pnpm content:doctor\`
   - \`pnpm lint\`
   - \`pnpm exec tsc --noEmit\`
   - \`pnpm test\`
   - \`pnpm build\`

Notes:

- Exact-state setup decision: ${setupDecision}
- Compare-save decision: ${compareDecision}
- Canonical concept identity drives local-first progress automatically once the concept is registered in \`content/catalog/concepts.json\`.
- The scaffold intentionally keeps product behavior unchanged until you move the files into the live catalog/content directories.
- The checklist below is meant to be edited down to the exact task list for the current content wave, not kept as permanent prose.
- Default output directory: \`${relativeRepoPath(repoRoot, scaffold.output.defaultDirectory)}\`

---

${buildWaveChecklist(repoRoot, scaffold)}
`;
}

function buildWaveChecklist(repoRoot, scaffold) {
  const subjectLabel =
    scaffold.metadataEntry.subject === "TODO: Add a subject"
      ? "TODO: Add a subject"
      : scaffold.metadataEntry.subject;
  return `# Content Wave Checklist

Use this checklist when turning the scaffold into a published concept.

## Catalog / Path Wiring

- [ ] Add or update the canonical concept row in \`content/catalog/concepts.json\`.
- [ ] Confirm the subject is \`${subjectLabel}\` and the topic is \`${scaffold.options.topic}\`.
- [ ] Add or extend the matching topic landing page when the concept should surface as a first-class topic slice.
- [ ] Add or extend the starter track when the concept should be a core step in a bounded learning path.
- [ ] Add or extend the recommended goal path if this concept should be the "start here" or "continue next" step for a topic.
- [ ] Confirm read-next targets point at real published concepts and do not dead-end.

## Discovery Surfaces

- [ ] Verify the concept appears on the subject page.
- [ ] Verify the concept appears in \`/start\` recommendations when relevant.
- [ ] Verify the concept appears in \`/search\` with the intended subject and topic labels.
- [ ] Verify topic, track, and concept copy still reads naturally on laptop-width screens.
- [ ] Verify the subject count and subject cards remain accurate if this wave changes the catalog shape.

## Teaching Content

- [ ] Replace all TODO teaching copy in \`content/concepts/${scaffold.options.contentFile}.json\`.
- [ ] Add or update a live worked-example builder in \`lib/learning/liveWorkedExamples.ts\`.
- [ ] Add or update prediction and quick-test items so the concept can be taught interactively, not just described.
- [ ] Add a compact challenge item if the concept should be assessed through the live bench.
- [ ] Keep the shared concept-page framework unless a bounded section override is truly needed.

## Exact-State / Save Decisions

- [ ] ${buildExactStateDecisionText(scaffold)}
- [ ] If yes, ensure the setup state is learner-facing, stable, and worth reopening later.
- [ ] If yes, add featured setups only when they make the live state easier to teach.
- [ ] ${buildCompareDecisionText(scaffold)}
- [ ] If compare is not useful, do not force compare metadata or compare UI surface area.

## Validation

- [ ] Run \`pnpm validate:content\`.
- [ ] Run \`pnpm content:doctor\`.
- [ ] Run \`pnpm lint\`.
- [ ] Run \`pnpm exec tsc --noEmit\`.
- [ ] Run \`pnpm test\`.
- [ ] Run \`pnpm build\`.

## Quality Checks

- [ ] Confirm the challenge / setup / compare precedence still makes sense.
- [ ] Confirm the new content did not require stale expectation updates in existing tests.
- [ ] Confirm the author-preview route still shows the concept and track wiring clearly.
- [ ] Confirm setup/save/compare affordances only appear where the live bench can actually support them.
- [ ] Confirm the content wave did not require a hidden copy change in onboarding or account surfaces.

## Current Fit

- Subject: \`${subjectLabel}\`
- Topic: \`${scaffold.options.topic}\`
- Simulation kind: \`${scaffold.options.simulationKind}\`
- Exact-state candidate: \`${buildExactStateDecisionText(scaffold)}\`
- Compare-save candidate: \`${buildCompareDecisionText(scaffold)}\`
- Default output directory: \`${relativeRepoPath(repoRoot, scaffold.output.defaultDirectory)}\`
`;
}

export function buildConceptScaffold(rawOptions, repoRoot = process.cwd()) {
  const options = normalizeOptions(rawOptions);
  const { catalogPath, catalog } = loadCatalog(repoRoot);

  validateRequestedIdentity(catalog, options);

  const template = resolveTemplate(repoRoot, catalog, options);
  const normalizedSimulationKind = options.simulationKind ?? template?.metadata.simulationKind;

  if (!normalizedSimulationKind) {
    throw new Error("Unable to resolve a simulation kind for the scaffold.");
  }

  options.simulationKind = normalizedSimulationKind;

  const seed = template ? cloneSeedFromTemplate(template.content) : buildGenericSeed();
  const metadataEntry = buildConceptMetadata(options, template?.metadata ?? null);
  const content = buildConceptContent(options, seed);
  const defaultDirectory = path.resolve(
    repoRoot,
    options.outputDir ?? path.join(...OUTPUT_DIRECTORY_SEGMENTS, options.slug),
  );

  const scaffold = {
    options,
    catalogPath,
    template,
    metadataEntry,
    content,
    output: {
      defaultDirectory,
      catalogEntryFileName: CATALOG_ENTRY_FILE_NAME,
      conceptContentFileName: CONCEPT_CONTENT_FILE_NAME,
      readmeFileName: README_FILE_NAME,
    },
  };

  return {
    ...scaffold,
    files: {
      catalogEntry: `${JSON.stringify(metadataEntry, null, 2)}\n`,
      conceptContent: `${JSON.stringify(content, null, 2)}\n`,
      readme: buildReadme(repoRoot, scaffold),
    },
  };
}

export function writeConceptScaffold(scaffold, outputDir, options = {}) {
  const targetDirectory = path.resolve(outputDir ?? scaffold.output.defaultDirectory);
  const targetFiles = [
    path.join(targetDirectory, scaffold.output.catalogEntryFileName),
    path.join(targetDirectory, scaffold.output.conceptContentFileName),
    path.join(targetDirectory, scaffold.output.readmeFileName),
  ];

  if (!options.force) {
    for (const filePath of targetFiles) {
      if (fs.existsSync(filePath)) {
        throw new Error(
          `Refusing to overwrite existing scaffold file "${filePath}". Use --force to replace it.`,
        );
      }
    }
  }

  fs.mkdirSync(targetDirectory, { recursive: true });
  fs.writeFileSync(targetFiles[0], scaffold.files.catalogEntry, "utf8");
  fs.writeFileSync(targetFiles[1], scaffold.files.conceptContent, "utf8");
  fs.writeFileSync(targetFiles[2], scaffold.files.readme, "utf8");

  return {
    directory: targetDirectory,
    files: targetFiles,
  };
}

export function parseCliArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token?.startsWith("--")) {
      throw new Error(`Unexpected argument "${token}".`);
    }

    const key = token.slice(2);

    if (["blank", "force", "help", "hero-concept", "write"].includes(key)) {
      parsed[key === "hero-concept" ? "heroConcept" : key] = true;
      continue;
    }

    const value = argv[index + 1];

    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for "${token}".`);
    }

    index += 1;

    const normalizedKey = key.replace(/-([a-z])/gu, (_, letter) => letter.toUpperCase());
    parsed[normalizedKey] = value;
  }

  return parsed;
}

function buildUsageText() {
  return `Usage:

  node scripts/scaffold-concept.mjs --slug electric-dipole --title "Electric Dipole" --topic Electricity --simulation-kind electric-fields --write

Options:

  --slug                    Required. Kebab-case concept slug.
  --title                   Required. Public concept title.
  --subject                 Optional subject label. Defaults to a template subject or TODO.
  --topic                   Required. Canonical topic label.
  --simulation-kind         Required unless --template-slug is provided.
  --template-slug           Optional explicit template concept to seed controls, graphs, and overlays.
  --content-file            Optional. Defaults to the slug.
  --id                      Optional. Defaults to concept-<slug>.
  --short-title             Optional short title.
  --summary                 Optional metadata summary placeholder override.
  --subtopic                Optional subtopic label.
  --difficulty              Optional difficulty label.
  --accent                  Optional accent token.
  --estimated-study-minutes Optional estimated study time.
  --sequence                Optional metadata sequence number.
  --hero-concept            Optional. Marks the scaffolded metadata as a hero concept.
  --blank                   Skip template seeding and use the generic minimal scaffold instead.
  --output-dir              Optional output directory. Defaults to output/concept-scaffolds/<slug>.
  --write                   Write the scaffold files to disk. Without this flag the command prints the planned output only.
  --force                   Overwrite existing scaffold files when used with --write.
  --help                    Show this help text.
`;
}

async function runCli() {
  const rawArgs = parseCliArgs(process.argv.slice(2));

  if (rawArgs.help) {
    process.stdout.write(buildUsageText());
    return;
  }

  const scaffold = buildConceptScaffold(rawArgs);
  const repoRoot = process.cwd();

  if (!scaffold.options.write) {
    process.stdout.write(
      [
        `Scaffold ready for "${scaffold.options.slug}".`,
        `Catalog path: ${relativeRepoPath(repoRoot, scaffold.catalogPath)}`,
        `Default output directory: ${relativeRepoPath(repoRoot, scaffold.output.defaultDirectory)}`,
        `Template source: ${
          scaffold.template
            ? `${scaffold.template.metadata.slug} (${scaffold.template.selectionMode})`
            : "blank generic scaffold"
        }`,
        'Run again with "--write" to create the scaffold files.',
      ].join("\n") + "\n",
    );
    return;
  }

  const result = writeConceptScaffold(scaffold, scaffold.output.defaultDirectory, {
    force: scaffold.options.force,
  });

  process.stdout.write(
    [
      `Wrote concept scaffold for "${scaffold.options.slug}" to ${relativeRepoPath(repoRoot, result.directory)}.`,
      ...result.files.map((filePath) => `- ${relativeRepoPath(repoRoot, filePath)}`),
    ].join("\n") + "\n",
  );
}

const cliEntry = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;

if (cliEntry && import.meta.url === cliEntry) {
  runCli().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
