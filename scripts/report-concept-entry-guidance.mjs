import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateContentVariantBundle } from "./generate-content-variant-bundle.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const dynamicToolIds = ["playback", "timeline", "graph-preview", "compare"];
const staticTimeSimulationKinds = new Set([
  "graph-transformations",
  "rational-functions",
  "matrix-transformations",
  "exponential-change",
  "complex-numbers-plane",
  "polar-coordinates",
  "parametric-curves-motion",
  "sorting-algorithmic-trade-offs",
  "binary-search-halving",
  "graph-traversal",
  "stoichiometry-recipe",
  "acid-base-ph",
  "derivative-as-slope",
  "optimization-constraints",
  "integral-accumulation",
  "basic-circuits",
  "ideal-gas-kinetic-theory",
  "pressure-hydrostatic",
  "buoyancy-archimedes",
  "internal-resistance-terminal-voltage",
  "electric-fields",
  "gravitational-fields",
  "gravitational-potential",
  "electric-potential",
  "capacitance-electric-energy",
  "magnetic-fields",
  "static-equilibrium-centre-of-mass",
  "lens-imaging",
  "optical-resolution",
  "polarization",
  "refraction-snells-law",
  "mirrors",
  "dot-product-projection",
  "vectors-2d",
]);

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStableArrayKey(value) {
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => isPlainObject(item) && typeof item.id === "string")
  ) {
    return "id";
  }

  if (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => isPlainObject(item) && typeof item.slug === "string")
  ) {
    return "slug";
  }

  return null;
}

function mergeOverlayValue(base, override) {
  if (override === undefined) {
    return base;
  }

  if (Array.isArray(base)) {
    if (!Array.isArray(override)) {
      return base;
    }

    const stableKey = getStableArrayKey(base);

    if (
      stableKey &&
      override.every((item) => isPlainObject(item) && typeof item[stableKey] === "string")
    ) {
      const overridesByStableKey = new Map(
        override.map((item) => [item[stableKey], item]),
      );

      return base.map((item) => mergeOverlayValue(item, overridesByStableKey.get(item[stableKey])));
    }

    return override;
  }

  if (isPlainObject(base) && isPlainObject(override)) {
    const merged = { ...base };

    for (const [key, value] of Object.entries(override)) {
      if ((key === "id" || key === "slug") && key in base) {
        merged[key] = base[key];
        continue;
      }

      merged[key] = mergeOverlayValue(base[key], value);
    }

    return merged;
  }

  return override;
}

function normalizeOptionalSentence(value) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized ? normalized : null;
}

function resolveInitialGraphId(concept) {
  const authoredInitialGraphId = concept.simulation?.ui?.initialGraphId;
  return (
    concept.graphs.find((graph) => graph.id === authoredInitialGraphId)?.id ??
    concept.graphs[0]?.id ??
    null
  );
}

function supportsTimeControls(kind) {
  return !staticTimeSimulationKinds.has(kind);
}

function resolveGraphInteractionKind(kind, graphId) {
  if (
    (kind === "graph-transformations" &&
      (graphId === "function-graph" || graphId === "vertex-height-map")) ||
    (kind === "rational-functions" && graphId === "asymptote-response") ||
    (kind === "matrix-transformations" &&
      (graphId === "probe-image-blend" || graphId === "basis-length-blend")) ||
    (kind === "exponential-change" &&
      (graphId === "change-curve" || graphId === "log-view")) ||
    (kind === "complex-numbers-plane" &&
      (graphId === "addition-sweep" || graphId === "multiplication-sweep")) ||
    (kind === "polar-coordinates" &&
      (graphId === "coordinate-sweep" || graphId === "angle-recovery")) ||
    (kind === "concentration-dilution" &&
      (graphId === "concentration-vs-solvent" || graphId === "concentration-vs-solute")) ||
    (kind === "stoichiometry-recipe" &&
      ["batches-vs-reactant-a", "batches-vs-reactant-b", "yield-vs-percent"].includes(graphId)) ||
    (kind === "solubility-saturation" &&
      [
        "dissolved-vs-solute",
        "excess-vs-solute",
        "capacity-vs-solvent",
        "saturation-vs-limit",
      ].includes(graphId)) ||
    (kind === "acid-base-ph" && ["ph-vs-acid", "ph-vs-base"].includes(graphId)) ||
    (kind === "buffers-neutralization" &&
      ["ph-vs-acid", "buffer-remaining-vs-acid"].includes(graphId)) ||
    (kind === "derivative-as-slope" &&
      ["slope-function", "difference-quotient"].includes(graphId)) ||
    (kind === "optimization-constraints" &&
      ["area-vs-width", "area-slope", "height-vs-width"].includes(graphId)) ||
    (kind === "limits-continuity" && graphId === "one-sided-approach") ||
    (kind === "integral-accumulation" &&
      ["source-function", "accumulation-function"].includes(graphId)) ||
    (kind === "reaction-rate-collision-theory" &&
      ["rate-temperature", "rate-concentration", "success-temperature"].includes(graphId)) ||
    (kind === "dynamic-equilibrium" && graphId === "equilibrium-share") ||
    (kind === "dot-product-projection" &&
      ["dot-product-response", "projection-response"].includes(graphId)) ||
    (kind === "vectors-2d" &&
      ["result-components", "result-magnitude"].includes(graphId)) ||
    (kind === "basic-circuits" &&
      ["current-map", "voltage-share"].includes(graphId)) ||
    (kind === "power-energy-circuits" &&
      ["current-voltage", "power-voltage", "power-resistance"].includes(graphId)) ||
    (kind === "internal-resistance-terminal-voltage" &&
      ["terminal-response", "power-split"].includes(graphId)) ||
    (kind === "temperature-internal-energy" &&
      ["amount-internal-energy", "amount-heating-rate"].includes(graphId)) ||
    (kind === "ideal-gas-kinetic-theory" &&
      [
        "pressure-volume",
        "pressure-temperature",
        "pressure-particle-count",
        "collision-temperature",
      ].includes(graphId)) ||
    (kind === "pressure-hydrostatic" &&
      ["pressure-depth", "pressure-density", "pressure-force", "pressure-area"].includes(graphId)) ||
    (kind === "continuity-equation" &&
      [
        "speed-entry-area",
        "speed-middle-area",
        "speed-flow-rate",
        "flow-balance",
      ].includes(graphId)) ||
    (kind === "bernoulli-principle" &&
      [
        "speed-throat-area",
        "pressure-throat-area",
        "pressure-flow-rate",
        "pressure-throat-height",
      ].includes(graphId)) ||
    (kind === "buoyancy-archimedes" &&
      ["force-depth", "force-fluid-density", "required-fraction-object-density"].includes(graphId)) ||
    (kind === "polarization" &&
      ["power-split", "field-projection"].includes(graphId)) ||
    (kind === "drag-terminal-velocity" &&
      [
        "terminal-speed-mass",
        "terminal-speed-area",
        "terminal-speed-drag-strength",
      ].includes(graphId)) ||
    (kind === "heat-transfer" &&
      ["contact-response", "contrast-response"].includes(graphId)) ||
    (kind === "specific-heat-phase-change" &&
      ["specific-heat-response", "latent-response"].includes(graphId)) ||
    (kind === "series-parallel-circuits" &&
      ["branch-current", "branch-voltage", "load-power"].includes(graphId)) ||
    (kind === "equivalent-resistance" &&
      ["equivalent-map", "current-map", "voltage-share"].includes(graphId)) ||
    (kind === "electric-fields" &&
      ["field-scan", "direction-scan"].includes(graphId)) ||
    (kind === "torque" && graphId === "direction-map") ||
    (kind === "static-equilibrium-centre-of-mass" &&
      ["support-torque", "support-reactions", "cargo-stability"].includes(graphId)) ||
    (kind === "rotational-inertia" &&
      ["inertia-map", "spin-up-map"].includes(graphId)) ||
    (kind === "rolling-motion" && graphId === "acceleration-map") ||
    (kind === "angular-momentum" &&
      ["momentum-map", "conserved-spin-map"].includes(graphId)) ||
    (kind === "gravitational-fields" &&
      ["field-components", "strength-response"].includes(graphId)) ||
    (kind === "gravitational-potential" &&
      ["potential-energy-scan", "field-link"].includes(graphId)) ||
    (kind === "electric-potential" &&
      ["potential-scan", "field-link"].includes(graphId)) ||
    (kind === "capacitance-electric-energy" && graphId === "voltage-response") ||
    (kind === "magnetic-fields" &&
      ["field-scan", "direction-scan"].includes(graphId)) ||
    (kind === "refraction-snells-law" &&
      ["refraction-map", "transition-map", "bend-map"].includes(graphId)) ||
    (kind === "dispersion-refractive-index-color" &&
      ["index-curve", "deviation-curve"].includes(graphId)) ||
    (kind === "mirrors" && ["image-map", "magnification"].includes(graphId)) ||
    (kind === "lens-imaging" && ["image-map", "magnification"].includes(graphId)) ||
    (kind === "damping-resonance" && graphId === "response") ||
    (kind === "doppler-effect" &&
      ["source-spacing", "observer-response"].includes(graphId)) ||
    (kind === "wave-speed-wavelength" && graphId === "phase-map") ||
    (kind === "diffraction" && graphId === "pattern") ||
    (kind === "optical-resolution" && graphId === "image-profile") ||
    (kind === "double-slit-interference" && graphId === "pattern") ||
    (kind === "wave-interference" && graphId === "pattern") ||
    (kind === "standing-waves" && graphId === "shape") ||
    (kind === "air-column-resonance" && ["shape", "ladder"].includes(graphId)) ||
    (kind === "sound-waves-longitudinal" && graphId === "intensity-response") ||
    (kind === "photoelectric-effect" &&
      ["energy-balance", "collector-sweep", "intensity-sweep"].includes(graphId)) ||
    (kind === "atomic-spectra" && graphId === "spectrum-lines") ||
    (kind === "de-broglie-matter-waves" &&
      ["wavelength-momentum", "loop-fit"].includes(graphId)) ||
    (kind === "bohr-model" && graphId === "series-spectrum")
  ) {
    return "response";
  }

  if (kind === "projectile" && graphId === "trajectory") {
    return "trajectory";
  }

  if (kind === "vectors-components" && graphId === "path") {
    return "trajectory";
  }

  return "time";
}

function findControl(concept, controlIdOrParam) {
  return concept.simulation.controls.find(
    (item) => item.id === controlIdOrParam || item.param === controlIdOrParam,
  );
}

function findGraph(concept, graphId) {
  return concept.graphs.find((item) => item.id === graphId);
}

function findOverlay(concept, overlayId) {
  return (concept.simulation.overlays ?? []).find((item) => item.id === overlayId) ?? null;
}

function findPreset(concept, presetId) {
  return concept.simulation.presets.find((item) => item.id === presetId) ?? null;
}

function makeActionVerb(kind) {
  switch (kind) {
    case "compare":
      return "Compare";
    case "graph-reading":
      return "Keep";
    case "misconception":
      return "Check";
    case "try-this":
      return "Change";
    case "observation":
    default:
      return "Change";
  }
}

function isConcreteActionText(value) {
  const text = normalizeOptionalSentence(value);
  if (!text || text.length < 16) {
    return false;
  }

  return /^(change|raise|lower|drag|switch|start|open|keep|move|use|enter|increase|decrease|toggle|scrub|pause|play|watch|compare|clone|leave|set|make|stay|apply|let|jump|run|add|turn)\b/i.test(
    text,
  );
}

function isConcreteDetailText(value) {
  const text = normalizeOptionalSentence(value);
  if (!text || text.length < 20) {
    return false;
  }

  return true;
}

function buildHintLabel(kind, surface, label) {
  if (kind === "tool") {
    switch (label) {
      case "playback":
        return "Play / pause";
      case "timeline":
        return "Timeline scrub";
      case "graph-preview":
        return "Hover graph";
      case "compare":
        return "Compare mode";
      default:
        return label;
    }
  }

  if (surface === "more-tools") {
    return `More tools: ${label}`;
  }

  if (surface === "more-graphs") {
    return `More graphs: ${label}`;
  }

  return label;
}

function pushHint(accumulator, seen, hint) {
  if (!hint) {
    return;
  }

  const key = `${hint.kind}:${hint.id}`;
  if (seen.has(key)) {
    return;
  }

  seen.add(key);
  accumulator.push(hint);
}

function buildControlHint(concept, controlIdOrParam, priority = 60) {
  const control = findControl(concept, controlIdOrParam);
  if (!control) {
    return null;
  }

  const hidden = !(concept.simulation.ui?.primaryControlIds ?? []).includes(control.id);
  const surface = hidden ? "more-tools" : "primary";

  return {
    id: control.id,
    kind: "control",
    label: control.label,
    surface,
    hidden,
    priority: hidden ? priority + 20 : priority,
  };
}

function buildGraphHint(concept, graphId, priority = 60) {
  const graph = findGraph(concept, graphId);
  if (!graph) {
    return null;
  }

  const hidden = !(concept.simulation.ui?.primaryGraphIds ?? []).includes(graph.id);
  const surface = hidden ? "more-graphs" : "primary";

  return {
    id: graph.id,
    kind: "graph",
    label: graph.label,
    surface,
    hidden,
    priority: hidden ? priority + 20 : priority,
  };
}

function buildOverlayHint(concept, overlayId, priority = 50) {
  const overlay = findOverlay(concept, overlayId);
  if (!overlay) {
    return null;
  }

  return {
    id: overlay.id,
    kind: "overlay",
    label: overlay.label,
    surface: "overlay",
    hidden: false,
    priority,
  };
}

function buildPresetHint(concept, presetId, priority = 68) {
  const preset = findPreset(concept, presetId);
  if (!preset) {
    return null;
  }

  const hidden = !(concept.simulation.ui?.primaryPresetIds ?? []).includes(preset.id);
  const surface = hidden ? "more-tools" : "primary";

  return {
    id: preset.id,
    kind: "preset",
    label: preset.label,
    surface,
    hidden,
    priority: hidden ? priority + 20 : priority,
  };
}

function buildToolHint(toolId, priority = 72) {
  return {
    id: toolId,
    kind: "tool",
    label: toolId,
    surface: toolId === "graph-preview" ? "graph-panel" : "transport",
    hidden: false,
    priority,
  };
}

function collectPromptHints(concept, prompt) {
  const hints = [];
  const seen = new Set();

  for (const controlId of prompt?.relatedControls ?? []) {
    pushHint(hints, seen, buildControlHint(concept, controlId, 64));
  }

  for (const graphId of prompt?.relatedGraphTabs ?? []) {
    pushHint(hints, seen, buildGraphHint(concept, graphId, 62));
  }

  for (const overlayId of prompt?.relatedOverlays ?? []) {
    pushHint(hints, seen, buildOverlayHint(concept, overlayId, 52));
  }

  return hints;
}

function collectFeaturedHints(concept, featuredSetup) {
  const hints = [];
  const seen = new Set();

  if (featuredSetup?.setup?.presetId) {
    pushHint(hints, seen, buildPresetHint(concept, featuredSetup.setup.presetId));
  }

  if (featuredSetup?.setup?.graphId) {
    pushHint(hints, seen, buildGraphHint(concept, featuredSetup.setup.graphId, 60));
  }

  for (const overlayId of featuredSetup?.setup?.overlayIds ?? []) {
    pushHint(hints, seen, buildOverlayHint(concept, overlayId, 50));
  }

  for (const controlId of Object.keys(featuredSetup?.setup?.patch ?? {})) {
    pushHint(hints, seen, buildControlHint(concept, controlId, 64));
  }

  return hints;
}

function collectOverrideHints(concept, entryGuidance) {
  const hints = [];
  const seen = new Set();

  for (const hint of entryGuidance?.hints ?? []) {
    if (hint.kind === "control") {
      pushHint(hints, seen, buildControlHint(concept, hint.id, 96));
    } else if (hint.kind === "graph") {
      pushHint(hints, seen, buildGraphHint(concept, hint.id, 96));
    } else if (hint.kind === "overlay") {
      pushHint(hints, seen, buildOverlayHint(concept, hint.id, 90));
    } else if (hint.kind === "preset") {
      pushHint(hints, seen, buildPresetHint(concept, hint.id, 98));
    } else if (hint.kind === "tool" && dynamicToolIds.includes(hint.id)) {
      pushHint(hints, seen, buildToolHint(hint.id, 94));
    }
  }

  return hints;
}

function buildGeneratedActionText(concept, prompt, featuredSetup) {
  const relatedControls = (prompt?.relatedControls ?? [])
    .map((id) => buildControlHint(concept, id, 60))
    .filter(Boolean);
  const relatedGraphs = (prompt?.relatedGraphTabs ?? [])
    .map((id) => buildGraphHint(concept, id, 60))
    .filter(Boolean);
  const relatedOverlays = (prompt?.relatedOverlays ?? [])
    .map((id) => buildOverlayHint(concept, id, 48))
    .filter(Boolean);
  const fallbackControl =
    relatedControls[0] ??
    (concept.simulation.ui?.primaryControlIds ?? [])
      .map((id) => buildControlHint(concept, id, 56))
      .find(Boolean) ??
    null;
  const fallbackGraph =
    relatedGraphs[0] ??
    (concept.simulation.ui?.primaryGraphIds ?? [])
      .map((id) => buildGraphHint(concept, id, 56))
      .find(Boolean) ??
    (resolveInitialGraphId(concept)
      ? buildGraphHint(concept, resolveInitialGraphId(concept), 56)
      : null);
  const fallbackOverlay = relatedOverlays[0] ?? null;
  const verb = makeActionVerb(prompt?.type ?? "try-this");

  if (fallbackControl && fallbackGraph) {
    return `${verb} ${fallbackControl.label.toLowerCase()} with ${fallbackGraph.label} open.`;
  }

  if (fallbackControl && fallbackOverlay) {
    return `${verb} ${fallbackControl.label.toLowerCase()} and keep ${fallbackOverlay.label} visible.`;
  }

  if (fallbackGraph) {
    return `Keep ${fallbackGraph.label} open and watch the live bench.`;
  }

  if (featuredSetup?.setup?.presetId) {
    const preset = findPreset(concept, featuredSetup.setup.presetId);
    if (preset) {
      return `Open ${preset.label} in More tools, then watch the live bench.`;
    }
  }

  return null;
}

function selectDetailText({ source, prompt, featuredSetup, keyTakeaway, whyItMatters, action }) {
  const promptText = normalizeOptionalSentence(prompt?.text);
  const promptWhy = normalizeOptionalSentence(prompt?.whyItMatters);
  const setupNote = normalizeOptionalSentence(featuredSetup?.setup?.note);
  const setupDescription = normalizeOptionalSentence(featuredSetup?.description);

  if (source === "starter-task") {
    return promptText ?? promptWhy ?? setupDescription ?? keyTakeaway ?? whyItMatters;
  }

  if (promptText && promptText !== action) {
    return promptText;
  }

  return promptWhy ?? setupNote ?? setupDescription ?? keyTakeaway ?? whyItMatters;
}

function finalizeHints(concept, rawHints, activeGraphId) {
  const hints = [];
  const seen = new Set();

  for (const hint of rawHints) {
    pushHint(hints, seen, hint);
  }

  if (supportsTimeControls(concept.simulation.kind)) {
    pushHint(hints, seen, buildToolHint("playback", 78));
    pushHint(hints, seen, buildToolHint("timeline", 76));
  }

  if (activeGraphId) {
    const interactionKind = resolveGraphInteractionKind(concept.simulation.kind, activeGraphId);
    if (interactionKind === "response" || interactionKind === "trajectory") {
      pushHint(hints, seen, buildToolHint("graph-preview", 74));
    }
  }

  const firstPrompt = concept.noticePrompts.items[0] ?? null;
  if (
    firstPrompt?.type === "compare" ||
    /compare mode|compare\b/i.test(firstPrompt?.tryThis ?? "") ||
    /compare mode|compare\b/i.test(firstPrompt?.text ?? "")
  ) {
    pushHint(hints, seen, buildToolHint("compare", 80));
  }

  return hints
    .sort((left, right) => right.priority - left.priority)
    .slice(0, 4)
    .map((hint) => ({
      id: hint.id,
      kind: hint.kind,
      label: hint.label,
      surface: hint.surface,
      hidden: hint.hidden,
      displayLabel: buildHintLabel(hint.kind, hint.surface, hint.label),
    }));
}

function resolveGuidance(concept) {
  const starterTask = normalizeOptionalSentence(concept.simulation.ui?.starterExploreTasks?.[0]);
  const firstPrompt = concept.noticePrompts.items[0] ?? null;
  const firstFeaturedSetup = concept.pageFramework?.featuredSetups?.[0] ?? null;
  const keyTakeaway = normalizeOptionalSentence(concept.pageIntro?.keyTakeaway);
  const whyItMatters = normalizeOptionalSentence(concept.pageIntro?.whyItMatters);
  const entryGuidance = concept.pageFramework?.entryGuidance;
  const overrideHints = collectOverrideHints(concept, entryGuidance);
  const activeGraphId = resolveInitialGraphId(concept);

  let source = null;
  let action = null;
  let detail = null;
  let hints = [];

  if (starterTask) {
    source = "starter-task";
    action = starterTask;
    detail = selectDetailText({
      source,
      prompt: firstPrompt,
      featuredSetup: firstFeaturedSetup,
      keyTakeaway,
      whyItMatters,
      action,
    });
    hints = collectPromptHints(concept, firstPrompt);
  } else if (firstPrompt) {
    source = "notice-prompt";
    const promptTryThis = normalizeOptionalSentence(firstPrompt.tryThis);
    const promptText = normalizeOptionalSentence(firstPrompt.text);
    const generatedAction = buildGeneratedActionText(concept, firstPrompt, firstFeaturedSetup);

    action =
      promptTryThis ??
      (isConcreteActionText(promptText) ? promptText : null) ??
      generatedAction ??
      normalizeOptionalSentence(firstFeaturedSetup?.description) ??
      keyTakeaway ??
      whyItMatters ??
      "";
    detail = selectDetailText({
      source,
      prompt: firstPrompt,
      featuredSetup: firstFeaturedSetup,
      keyTakeaway,
      whyItMatters,
      action,
    });
    hints = collectPromptHints(concept, firstPrompt);
  } else if (firstFeaturedSetup) {
    source = "featured-setup";
    action =
      normalizeOptionalSentence(firstFeaturedSetup.description) ??
      normalizeOptionalSentence(firstFeaturedSetup.label) ??
      keyTakeaway ??
      whyItMatters ??
      "";
    detail = selectDetailText({
      source,
      prompt: firstPrompt,
      featuredSetup: firstFeaturedSetup,
      keyTakeaway,
      whyItMatters,
      action,
    });
    hints = collectFeaturedHints(concept, firstFeaturedSetup);
  } else if (keyTakeaway) {
    source = "key-takeaway";
    action = keyTakeaway;
    detail = whyItMatters;
    hints = [];
  }

  if (!source || !action) {
    return null;
  }

  const resolvedAction = normalizeOptionalSentence(entryGuidance?.firstAction) ?? action;
  const resolvedDetail = normalizeOptionalSentence(entryGuidance?.watchFor) ?? detail;
  const resolvedHints = overrideHints.length > 0 ? overrideHints : hints;

  return {
    source,
    action: resolvedAction,
    detail: resolvedDetail,
    hints: finalizeHints(concept, resolvedHints, activeGraphId),
    usedOverrides: {
      firstAction: Boolean(normalizeOptionalSentence(entryGuidance?.firstAction)),
      watchFor: Boolean(normalizeOptionalSentence(entryGuidance?.watchFor)),
      hints: overrideHints.length > 0,
    },
  };
}

function buildBenchCta(concept) {
  if (concept.noticePrompts.items.length > 0) {
    return "Open what to notice";
  }

  return "Back to the bench";
}

function loadEffectiveEnConcepts() {
  const catalog = readJson(path.join("content", "catalog", "concepts.json"));
  const publishedEntries = catalog.filter((entry) => entry.published);
  const { optimizedBundle } = generateContentVariantBundle(repoRoot, { writeFiles: false });

  return publishedEntries.map((metadata) => {
    const canonicalConcept = readJson(path.join("content", "concepts", `${metadata.contentFile}.json`));
    const effectiveConcept = optimizedBundle[metadata.slug]
      ? mergeOverlayValue(canonicalConcept, optimizedBundle[metadata.slug])
      : canonicalConcept;

    return {
      metadata,
      concept: effectiveConcept,
    };
  });
}

export function buildConceptEntryGuidanceReport() {
  const entries = loadEffectiveEnConcepts();
  const rows = entries.map(({ metadata, concept }) => {
    const guidance = resolveGuidance(concept);
    const activeGraphId = resolveInitialGraphId(concept);
    const interactionKind = activeGraphId
      ? resolveGraphInteractionKind(concept.simulation.kind, activeGraphId)
      : "time";
    const hasConcreteAction = isConcreteActionText(guidance?.action);
    const hasConcreteDetail = isConcreteDetailText(guidance?.detail);
    const hasDynamicToolHint = guidance?.hints.some((hint) => dynamicToolIds.includes(hint.id)) ?? false;
    const hasHiddenHint = guidance?.hints.some((hint) => hint.hidden) ?? false;
    const needsDynamicHint =
      supportsTimeControls(concept.simulation.kind) ||
      interactionKind === "response" ||
      interactionKind === "trajectory";
    const firstPrompt = concept.noticePrompts.items[0] ?? null;
    const firstFeaturedSetup = concept.pageFramework?.featuredSetups?.[0] ?? null;
    const importantHiddenTargets = [
      ...(firstPrompt?.relatedControls ?? []).map((id) => buildControlHint(concept, id, 60)),
      ...(firstPrompt?.relatedGraphTabs ?? []).map((id) => buildGraphHint(concept, id, 60)),
      ...(firstFeaturedSetup?.setup?.presetId
        ? [buildPresetHint(concept, firstFeaturedSetup.setup.presetId)]
        : []),
      ...(firstFeaturedSetup?.setup?.graphId
        ? [buildGraphHint(concept, firstFeaturedSetup.setup.graphId, 60)]
        : []),
      ...Object.keys(firstFeaturedSetup?.setup?.patch ?? {}).map((id) =>
        buildControlHint(concept, id, 60),
      ),
      ...(concept.pageFramework?.entryGuidance?.hints ?? []).map((hint) => {
        if (hint.kind === "control") return buildControlHint(concept, hint.id, 96);
        if (hint.kind === "graph") return buildGraphHint(concept, hint.id, 96);
        if (hint.kind === "preset") return buildPresetHint(concept, hint.id, 96);
        return null;
      }),
    ].filter(Boolean);
    const likelyHiddenToolNeed = importantHiddenTargets.some((hint) => hint.hidden);
    const referencesUnavailableTargets = (guidance?.hints ?? []).some((hint) => {
      if (hint.kind === "control") {
        return !findControl(concept, hint.id);
      }
      if (hint.kind === "graph") {
        return !findGraph(concept, hint.id);
      }
      if (hint.kind === "overlay") {
        return !findOverlay(concept, hint.id);
      }
      if (hint.kind === "preset") {
        return !findPreset(concept, hint.id);
      }
      return hint.kind === "tool" && !dynamicToolIds.includes(hint.id);
    });

    return {
      route: `/en/concepts/${metadata.slug}`,
      slug: metadata.slug,
      title: metadata.title,
      source: guidance?.source ?? "none",
      firstAction: guidance?.action ?? null,
      watchFor: guidance?.detail ?? null,
      hintRowItems: (guidance?.hints ?? []).map((hint) => hint.displayLabel),
      phaseCta: buildBenchCta(concept),
      nextStepPreviewPresent: true,
      referencesUnavailableTargets,
      hasConcreteAction,
      hasConcreteDetail,
      hasDynamicToolHint,
      hasHiddenHint,
      likelyHiddenToolNeed,
      missingDynamicHint: needsDynamicHint && !hasDynamicToolHint,
      missingHiddenHint: likelyHiddenToolNeed && !hasHiddenHint,
      usesGenericFallback: !hasConcreteAction || !hasConcreteDetail,
      overrideUsed:
        guidance?.usedOverrides.firstAction ||
        guidance?.usedOverrides.watchFor ||
        guidance?.usedOverrides.hints,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    totalPublishedConcepts: rows.length,
    concreteFirstActionCount: rows.filter((row) => row.hasConcreteAction).length,
    concreteObservationLineCount: rows.filter((row) => row.hasConcreteDetail).length,
    relevantDynamicControlHintCount: rows.filter((row) => row.hasDynamicToolHint).length,
    relevantHiddenToolHintCount: rows.filter((row) => row.hasHiddenHint).length,
    nextStepPreviewCount: rows.filter((row) => row.nextStepPreviewPresent).length,
    genericFallbackCount: rows.filter((row) => row.usesGenericFallback).length,
    overrideCount: rows.filter((row) => row.overrideUsed).length,
    referencesUnavailableTargetCount: rows.filter((row) => row.referencesUnavailableTargets).length,
    rows,
  };
}

function printTextReport(report) {
  console.log(
    `Published concept routes: ${report.totalPublishedConcepts}\n` +
      `Concrete first-action guidance: ${report.concreteFirstActionCount}\n` +
      `Concrete supporting line: ${report.concreteObservationLineCount}\n` +
      `Relevant dynamic-control hints: ${report.relevantDynamicControlHintCount}\n` +
      `Relevant hidden-tool hints: ${report.relevantHiddenToolHintCount}\n` +
      `Next-step preview visible: ${report.nextStepPreviewCount}\n` +
      `Routes still relying on generic fallback: ${report.genericFallbackCount}\n` +
      `Routes using authored guidance overrides: ${report.overrideCount}\n` +
      `Routes referencing unavailable targets: ${report.referencesUnavailableTargetCount}\n`,
  );

  console.table(
    report.rows
      .filter(
        (row) =>
          row.usesGenericFallback ||
          row.missingDynamicHint ||
          row.missingHiddenHint ||
          row.referencesUnavailableTargets,
      )
      .map((row) => ({
        slug: row.slug,
        source: row.source,
        concreteAction: row.hasConcreteAction,
        concreteDetail: row.hasConcreteDetail,
        dynamicHint: row.hasDynamicToolHint,
        hiddenHint: row.hasHiddenHint,
        genericFallback: row.usesGenericFallback,
        firstAction: row.firstAction,
        watchFor: row.watchFor,
        hints: row.hintRowItems.join(" | "),
      })),
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const report = buildConceptEntryGuidanceReport();

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printTextReport(report);
  }
}
