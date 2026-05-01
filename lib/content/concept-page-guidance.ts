import type { SimulationKind } from "@/lib/physics";
import type { ConceptContent } from "./schema";

export const conceptPageGuidanceToolHintIds = [
  "playback",
  "timeline",
  "graph-preview",
  "compare",
] as const;

export type ConceptPageGuidanceToolHintId =
  (typeof conceptPageGuidanceToolHintIds)[number];

type ConceptGuidanceHintKind =
  | "control"
  | "graph"
  | "overlay"
  | "preset"
  | "tool";

type ConceptGuidanceHintSurface =
  | "primary"
  | "more-tools"
  | "more-graphs"
  | "overlay"
  | "transport"
  | "graph-panel";

export type ResolvedConceptPageGuidanceHint = {
  id: string;
  kind: ConceptGuidanceHintKind;
  label: string;
  hidden: boolean;
  surface: ConceptGuidanceHintSurface;
};

export type ResolvedConceptPageGuidance = {
  source: "starter-task" | "notice-prompt" | "featured-setup" | "key-takeaway";
  action: string;
  detail: string | null;
  hints: ResolvedConceptPageGuidanceHint[];
  usedOverrides: {
    firstAction: boolean;
    watchFor: boolean;
    hints: boolean;
  };
};

export type ResolvedConceptPageGuidanceDiagnostics = {
  hasConcreteAction: boolean;
  hasConcreteDetail: boolean;
  hasDynamicToolHint: boolean;
  hasHiddenHint: boolean;
  usesGenericFallback: boolean;
};

const staticTimeSimulationKinds = new Set<SimulationKind>([
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

function normalizeOptionalSentence(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function makeActionVerb(kind: ConceptContent["noticePrompts"]["items"][number]["type"]) {
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

function findControl(
  concept: ConceptContent,
  controlIdOrParam: string,
) {
  return concept.simulation.controls.find(
    (item) => item.id === controlIdOrParam || item.param === controlIdOrParam,
  );
}

function findGraph(concept: ConceptContent, graphId: string) {
  return concept.graphs.find((item) => item.id === graphId);
}

function findOverlay(concept: ConceptContent, overlayId: string) {
  return concept.simulation.overlays?.find((item) => item.id === overlayId) ?? null;
}

function findPreset(concept: ConceptContent, presetId: string) {
  return concept.simulation.presets.find((item) => item.id === presetId) ?? null;
}

function resolveInitialGraphId(concept: ConceptContent) {
  const authoredInitialGraphId = concept.simulation.ui?.initialGraphId;

  return (
    concept.graphs.find((graph) => graph.id === authoredInitialGraphId)?.id ??
    concept.graphs[0]?.id ??
    null
  );
}

function supportsTimeControls(kind: SimulationKind) {
  return !staticTimeSimulationKinds.has(kind);
}

function resolveGraphInteractionKind(kind: SimulationKind, graphId: string) {
  if (
    kind === "graph-transformations" &&
    (graphId === "function-graph" || graphId === "vertex-height-map")
  ) {
    return "response";
  }

  if (kind === "rational-functions" && graphId === "asymptote-response") {
    return "response";
  }

  if (
    kind === "matrix-transformations" &&
    (graphId === "probe-image-blend" || graphId === "basis-length-blend")
  ) {
    return "response";
  }

  if (
    kind === "exponential-change" &&
    (graphId === "change-curve" || graphId === "log-view")
  ) {
    return "response";
  }

  if (
    kind === "complex-numbers-plane" &&
    (graphId === "addition-sweep" || graphId === "multiplication-sweep")
  ) {
    return "response";
  }

  if (
    kind === "polar-coordinates" &&
    (graphId === "coordinate-sweep" || graphId === "angle-recovery")
  ) {
    return "response";
  }

  if (
    kind === "concentration-dilution" &&
    (graphId === "concentration-vs-solvent" || graphId === "concentration-vs-solute")
  ) {
    return "response";
  }

  if (
    kind === "stoichiometry-recipe" &&
    (graphId === "batches-vs-reactant-a" ||
      graphId === "batches-vs-reactant-b" ||
      graphId === "yield-vs-percent")
  ) {
    return "response";
  }

  if (
    kind === "solubility-saturation" &&
    (graphId === "dissolved-vs-solute" ||
      graphId === "excess-vs-solute" ||
      graphId === "capacity-vs-solvent" ||
      graphId === "saturation-vs-limit")
  ) {
    return "response";
  }

  if (kind === "acid-base-ph" && (graphId === "ph-vs-acid" || graphId === "ph-vs-base")) {
    return "response";
  }

  if (
    kind === "buffers-neutralization" &&
    (graphId === "ph-vs-acid" || graphId === "buffer-remaining-vs-acid")
  ) {
    return "response";
  }

  if (
    kind === "derivative-as-slope" &&
    (graphId === "slope-function" || graphId === "difference-quotient")
  ) {
    return "response";
  }

  if (
    kind === "optimization-constraints" &&
    (graphId === "area-vs-width" ||
      graphId === "area-slope" ||
      graphId === "height-vs-width")
  ) {
    return "response";
  }

  if (kind === "limits-continuity" && graphId === "one-sided-approach") {
    return "response";
  }

  if (
    kind === "integral-accumulation" &&
    (graphId === "source-function" || graphId === "accumulation-function")
  ) {
    return "response";
  }

  if (
    kind === "reaction-rate-collision-theory" &&
    (graphId === "rate-temperature" ||
      graphId === "rate-concentration" ||
      graphId === "success-temperature")
  ) {
    return "response";
  }

  if (kind === "dynamic-equilibrium" && graphId === "equilibrium-share") {
    return "response";
  }

  if (kind === "projectile" && graphId === "trajectory") {
    return "trajectory";
  }

  if (kind === "vectors-components" && graphId === "path") {
    return "trajectory";
  }

  if (
    kind === "dot-product-projection" &&
    (graphId === "dot-product-response" || graphId === "projection-response")
  ) {
    return "response";
  }

  if (
    kind === "vectors-2d" &&
    (graphId === "result-components" || graphId === "result-magnitude")
  ) {
    return "response";
  }

  if (
    kind === "basic-circuits" &&
    (graphId === "current-map" || graphId === "voltage-share")
  ) {
    return "response";
  }

  if (
    kind === "power-energy-circuits" &&
    (graphId === "current-voltage" ||
      graphId === "power-voltage" ||
      graphId === "power-resistance")
  ) {
    return "response";
  }

  if (
    kind === "internal-resistance-terminal-voltage" &&
    (graphId === "terminal-response" || graphId === "power-split")
  ) {
    return "response";
  }

  if (
    kind === "temperature-internal-energy" &&
    (graphId === "amount-internal-energy" || graphId === "amount-heating-rate")
  ) {
    return "response";
  }

  if (
    kind === "ideal-gas-kinetic-theory" &&
    (graphId === "pressure-volume" ||
      graphId === "pressure-temperature" ||
      graphId === "pressure-particle-count" ||
      graphId === "collision-temperature")
  ) {
    return "response";
  }

  if (
    kind === "pressure-hydrostatic" &&
    (graphId === "pressure-depth" ||
      graphId === "pressure-density" ||
      graphId === "pressure-force" ||
      graphId === "pressure-area")
  ) {
    return "response";
  }

  if (
    kind === "continuity-equation" &&
    (graphId === "speed-entry-area" ||
      graphId === "speed-middle-area" ||
      graphId === "speed-flow-rate" ||
      graphId === "flow-balance")
  ) {
    return "response";
  }

  if (
    kind === "bernoulli-principle" &&
    (graphId === "speed-throat-area" ||
      graphId === "pressure-throat-area" ||
      graphId === "pressure-flow-rate" ||
      graphId === "pressure-throat-height")
  ) {
    return "response";
  }

  if (
    kind === "buoyancy-archimedes" &&
    (graphId === "force-depth" ||
      graphId === "force-fluid-density" ||
      graphId === "required-fraction-object-density")
  ) {
    return "response";
  }

  if (
    kind === "polarization" &&
    (graphId === "power-split" || graphId === "field-projection")
  ) {
    return "response";
  }

  if (
    kind === "drag-terminal-velocity" &&
    (graphId === "terminal-speed-mass" ||
      graphId === "terminal-speed-area" ||
      graphId === "terminal-speed-drag-strength")
  ) {
    return "response";
  }

  if (
    kind === "heat-transfer" &&
    (graphId === "contact-response" || graphId === "contrast-response")
  ) {
    return "response";
  }

  if (
    kind === "specific-heat-phase-change" &&
    (graphId === "specific-heat-response" || graphId === "latent-response")
  ) {
    return "response";
  }

  if (
    kind === "series-parallel-circuits" &&
    (graphId === "branch-current" ||
      graphId === "branch-voltage" ||
      graphId === "load-power")
  ) {
    return "response";
  }

  if (
    kind === "equivalent-resistance" &&
    (graphId === "equivalent-map" ||
      graphId === "current-map" ||
      graphId === "voltage-share")
  ) {
    return "response";
  }

  if (
    kind === "electric-fields" &&
    (graphId === "field-scan" || graphId === "direction-scan")
  ) {
    return "response";
  }

  if (kind === "torque" && graphId === "direction-map") {
    return "response";
  }

  if (
    kind === "static-equilibrium-centre-of-mass" &&
    (graphId === "support-torque" ||
      graphId === "support-reactions" ||
      graphId === "cargo-stability")
  ) {
    return "response";
  }

  if (
    kind === "rotational-inertia" &&
    (graphId === "inertia-map" || graphId === "spin-up-map")
  ) {
    return "response";
  }

  if (kind === "rolling-motion" && graphId === "acceleration-map") {
    return "response";
  }

  if (
    kind === "angular-momentum" &&
    (graphId === "momentum-map" || graphId === "conserved-spin-map")
  ) {
    return "response";
  }

  if (
    kind === "gravitational-fields" &&
    (graphId === "field-components" || graphId === "strength-response")
  ) {
    return "response";
  }

  if (
    kind === "gravitational-potential" &&
    (graphId === "potential-energy-scan" || graphId === "field-link")
  ) {
    return "response";
  }

  if (
    kind === "electric-potential" &&
    (graphId === "potential-scan" || graphId === "field-link")
  ) {
    return "response";
  }

  if (kind === "capacitance-electric-energy" && graphId === "voltage-response") {
    return "response";
  }

  if (
    kind === "magnetic-fields" &&
    (graphId === "field-scan" || graphId === "direction-scan")
  ) {
    return "response";
  }

  if (
    kind === "refraction-snells-law" &&
    (graphId === "refraction-map" || graphId === "transition-map" || graphId === "bend-map")
  ) {
    return "response";
  }

  if (
    kind === "dispersion-refractive-index-color" &&
    (graphId === "index-curve" || graphId === "deviation-curve")
  ) {
    return "response";
  }

  if (kind === "mirrors" && (graphId === "image-map" || graphId === "magnification")) {
    return "response";
  }

  if (kind === "lens-imaging" && (graphId === "image-map" || graphId === "magnification")) {
    return "response";
  }

  if (kind === "damping-resonance" && graphId === "response") {
    return "response";
  }

  if (
    kind === "doppler-effect" &&
    (graphId === "source-spacing" || graphId === "observer-response")
  ) {
    return "response";
  }

  if (kind === "wave-speed-wavelength" && graphId === "phase-map") {
    return "response";
  }

  if (kind === "diffraction" && graphId === "pattern") {
    return "response";
  }

  if (kind === "optical-resolution" && graphId === "image-profile") {
    return "response";
  }

  if (kind === "double-slit-interference" && graphId === "pattern") {
    return "response";
  }

  if (kind === "wave-interference" && graphId === "pattern") {
    return "response";
  }

  if (kind === "standing-waves" && graphId === "shape") {
    return "response";
  }

  if (kind === "air-column-resonance" && (graphId === "shape" || graphId === "ladder")) {
    return "response";
  }

  if (kind === "sound-waves-longitudinal" && graphId === "intensity-response") {
    return "response";
  }

  if (
    kind === "photoelectric-effect" &&
    (graphId === "energy-balance" ||
      graphId === "collector-sweep" ||
      graphId === "intensity-sweep")
  ) {
    return "response";
  }

  if (kind === "atomic-spectra" && graphId === "spectrum-lines") {
    return "response";
  }

  if (
    kind === "de-broglie-matter-waves" &&
    (graphId === "wavelength-momentum" || graphId === "loop-fit")
  ) {
    return "response";
  }

  if (kind === "bohr-model" && graphId === "series-spectrum") {
    return "response";
  }

  return "time";
}

function isConcreteActionText(value: string | null | undefined) {
  const text = normalizeOptionalSentence(value);

  if (!text || text.length < 16) {
    return false;
  }

  return /^(change|raise|lower|drag|switch|start|open|keep|move|use|enter|increase|decrease|toggle|scrub|pause|play|watch|compare|clone|leave|set|make|stay|apply|let|jump|run|add|turn)\b/i.test(
    text,
  );
}

function isConcreteDetailText(value: string | null | undefined) {
  const text = normalizeOptionalSentence(value);

  if (!text || text.length < 20) {
    return false;
  }

  return true;
}

function pushHint(
  accumulator: Array<ResolvedConceptPageGuidanceHint & { priority: number }>,
  seen: Set<string>,
  hint: (ResolvedConceptPageGuidanceHint & { priority: number }) | null,
) {
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

function buildControlHint(
  concept: ConceptContent,
  controlIdOrParam: string,
  priority = 60,
) {
  const control = findControl(concept, controlIdOrParam);

  if (!control) {
    return null;
  }

  const hidden = !(
    concept.simulation.ui?.primaryControlIds ?? []
  ).includes(control.id);
  const surface: ConceptGuidanceHintSurface = hidden ? "more-tools" : "primary";

  return {
    id: control.id,
    kind: "control" as const,
    label: control.label,
    hidden,
    surface,
    priority: hidden ? priority + 20 : priority,
  };
}

function buildGraphHint(
  concept: ConceptContent,
  graphId: string,
  priority = 60,
) {
  const graph = findGraph(concept, graphId);

  if (!graph) {
    return null;
  }

  const hidden = !(
    concept.simulation.ui?.primaryGraphIds ?? []
  ).includes(graph.id);
  const surface: ConceptGuidanceHintSurface = hidden ? "more-graphs" : "primary";

  return {
    id: graph.id,
    kind: "graph" as const,
    label: graph.label,
    hidden,
    surface,
    priority: hidden ? priority + 20 : priority,
  };
}

function buildOverlayHint(
  concept: ConceptContent,
  overlayId: string,
  priority = 48,
) {
  const overlay = findOverlay(concept, overlayId);

  if (!overlay) {
    return null;
  }

  return {
    id: overlay.id,
    kind: "overlay" as const,
    label: overlay.label,
    hidden: false,
    surface: "overlay" as const,
    priority,
  };
}

function buildPresetHint(
  concept: ConceptContent,
  presetId: string,
  priority = 68,
) {
  const preset = findPreset(concept, presetId);

  if (!preset) {
    return null;
  }

  const hidden = !(
    concept.simulation.ui?.primaryPresetIds ?? []
  ).includes(preset.id);
  const surface: ConceptGuidanceHintSurface = hidden ? "more-tools" : "primary";

  return {
    id: preset.id,
    kind: "preset" as const,
    label: preset.label,
    hidden,
    surface,
    priority: hidden ? priority + 20 : priority,
  };
}

function buildToolHint(
  toolId: ConceptPageGuidanceToolHintId,
  label: string,
  surface: ConceptGuidanceHintSurface,
  priority = 72,
) {
  return {
    id: toolId,
    kind: "tool" as const,
    label,
    hidden: false,
    surface,
    priority,
  };
}

function collectPrimaryHints(concept: ConceptContent) {
  const hints: Array<ResolvedConceptPageGuidanceHint & { priority: number }> = [];
  const seen = new Set<string>();

  for (const controlId of concept.simulation.ui?.primaryControlIds ?? []) {
    pushHint(hints, seen, buildControlHint(concept, controlId));
  }

  for (const graphId of concept.simulation.ui?.primaryGraphIds ?? []) {
    pushHint(hints, seen, buildGraphHint(concept, graphId));
  }

  return hints;
}

function collectPromptHints(
  concept: ConceptContent,
  prompt: ConceptContent["noticePrompts"]["items"][number] | null,
) {
  if (!prompt) {
    return collectPrimaryHints(concept);
  }

  const hints: Array<ResolvedConceptPageGuidanceHint & { priority: number }> = [];
  const seen = new Set<string>();

  for (const controlIdOrParam of prompt.relatedControls ?? []) {
    pushHint(hints, seen, buildControlHint(concept, controlIdOrParam, 64));
  }

  for (const graphId of prompt.relatedGraphTabs ?? []) {
    pushHint(hints, seen, buildGraphHint(concept, graphId, 62));
  }

  for (const overlayId of prompt.relatedOverlays ?? []) {
    pushHint(hints, seen, buildOverlayHint(concept, overlayId, 52));
  }

  return hints.length > 0 ? hints : collectPrimaryHints(concept);
}

function collectFeaturedSetupHints(
  concept: ConceptContent,
  featuredSetup:
    | NonNullable<NonNullable<ConceptContent["pageFramework"]>["featuredSetups"]>[number]
    | null,
) {
  if (!featuredSetup) {
    return collectPrimaryHints(concept);
  }

  const hints: Array<ResolvedConceptPageGuidanceHint & { priority: number }> = [];
  const seen = new Set<string>();

  if (featuredSetup.setup.presetId) {
    pushHint(hints, seen, buildPresetHint(concept, featuredSetup.setup.presetId));
  }

  if (featuredSetup.setup.graphId) {
    pushHint(hints, seen, buildGraphHint(concept, featuredSetup.setup.graphId, 60));
  }

  for (const overlayId of featuredSetup.setup.overlayIds ?? []) {
    pushHint(hints, seen, buildOverlayHint(concept, overlayId, 50));
  }

  for (const controlIdOrParam of Object.keys(featuredSetup.setup.patch ?? {})) {
    pushHint(hints, seen, buildControlHint(concept, controlIdOrParam, 64));
  }

  return hints.length > 0 ? hints : collectPrimaryHints(concept);
}

function collectOverrideHints(
  concept: ConceptContent,
  entryGuidance: NonNullable<ConceptContent["pageFramework"]>["entryGuidance"] | undefined,
) {
  const hints: Array<ResolvedConceptPageGuidanceHint & { priority: number }> = [];
  const seen = new Set<string>();

  for (const hint of entryGuidance?.hints ?? []) {
    if (hint.kind === "control") {
      pushHint(hints, seen, buildControlHint(concept, hint.id, 96));
      continue;
    }

    if (hint.kind === "graph") {
      pushHint(hints, seen, buildGraphHint(concept, hint.id, 96));
      continue;
    }

    if (hint.kind === "overlay") {
      pushHint(hints, seen, buildOverlayHint(concept, hint.id, 90));
      continue;
    }

    if (hint.kind === "preset") {
      pushHint(hints, seen, buildPresetHint(concept, hint.id, 98));
      continue;
    }

    if (hint.kind === "tool") {
      const toolId = hint.id as ConceptPageGuidanceToolHintId;
      const label = normalizeOptionalSentence(hint.label);

      if (!conceptPageGuidanceToolHintIds.includes(toolId)) {
        continue;
      }

      pushHint(
        hints,
        seen,
        buildToolHint(
          toolId,
          label ?? toolId,
          toolId === "graph-preview" ? "graph-panel" : "transport",
          94,
        ),
      );
    }
  }

  return hints;
}

function buildGeneratedActionText(input: {
  concept: ConceptContent;
  prompt: ConceptContent["noticePrompts"]["items"][number] | null;
  featuredSetup:
    | NonNullable<NonNullable<ConceptContent["pageFramework"]>["featuredSetups"]>[number]
    | null;
}) {
  const { concept, prompt, featuredSetup } = input;
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
      ? buildGraphHint(concept, resolveInitialGraphId(concept)!, 56)
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

  if (featuredSetup?.setup.presetId) {
    const preset = findPreset(concept, featuredSetup.setup.presetId);
    if (preset) {
      return `Open ${preset.label} in More tools, then watch the live bench.`;
    }
  }

  return null;
}

function selectDetailText(input: {
  source: ResolvedConceptPageGuidance["source"];
  prompt: ConceptContent["noticePrompts"]["items"][number] | null;
  featuredSetup:
    | NonNullable<NonNullable<ConceptContent["pageFramework"]>["featuredSetups"]>[number]
    | null;
  keyTakeaway: string | null;
  whyItMatters: string | null;
  action: string;
}) {
  const { source, prompt, featuredSetup, keyTakeaway, whyItMatters, action } = input;
  const promptText = normalizeOptionalSentence(prompt?.text);
  const promptWhy = normalizeOptionalSentence(prompt?.whyItMatters);
  const setupNote = normalizeOptionalSentence(featuredSetup?.setup.note);
  const setupDescription = normalizeOptionalSentence(featuredSetup?.description);

  if (source === "starter-task") {
    return promptText ?? promptWhy ?? setupDescription ?? keyTakeaway ?? whyItMatters;
  }

  if (promptText && promptText !== action) {
    return promptText;
  }

  return promptWhy ?? setupNote ?? setupDescription ?? keyTakeaway ?? whyItMatters;
}

function buildCapabilityHints(
  concept: ConceptContent,
  activeGraphId: string | null,
  prompt: ConceptContent["noticePrompts"]["items"][number] | null,
  action: string,
) {
  const hints: Array<ResolvedConceptPageGuidanceHint & { priority: number }> = [];

  if (supportsTimeControls(concept.simulation.kind)) {
    hints.push(
      buildToolHint("playback", "Play / pause", "transport", 78),
      buildToolHint("timeline", "Timeline scrub", "transport", 76),
    );
  }

  if (activeGraphId) {
    const interactionKind = resolveGraphInteractionKind(
      concept.simulation.kind,
      activeGraphId,
    );

    if (interactionKind === "response" || interactionKind === "trajectory") {
      hints.push(
        buildToolHint("graph-preview", "Hover graph", "graph-panel", 74),
      );
    }
  }

  if (
    prompt?.type === "compare" ||
    /compare mode|compare\b/i.test(action)
  ) {
    hints.push(buildToolHint("compare", "Compare mode", "more-tools", 80));
  }

  return hints;
}

function finalizeHints(
  concept: ConceptContent,
  rawHints: Array<ResolvedConceptPageGuidanceHint & { priority: number }>,
  activeGraphId: string | null,
  prompt: ConceptContent["noticePrompts"]["items"][number] | null,
  action: string,
) {
  const seen = new Set<string>();
  const hints: Array<ResolvedConceptPageGuidanceHint & { priority: number }> = [];

  for (const hint of rawHints) {
    pushHint(hints, seen, hint);
  }

  for (const hint of buildCapabilityHints(concept, activeGraphId, prompt, action)) {
    pushHint(hints, seen, hint);
  }

  return hints
    .sort((left, right) => right.priority - left.priority)
    .slice(0, 4)
    .map((hint) => ({
      id: hint.id,
      kind: hint.kind,
      label: hint.label,
      hidden: hint.hidden,
      surface: hint.surface,
    }));
}

export function resolveConceptPageGuidance(
  concept: ConceptContent,
): ResolvedConceptPageGuidance | null {
  const starterTask = normalizeOptionalSentence(
    concept.simulation.ui?.starterExploreTasks?.[0],
  );
  const firstPrompt = concept.noticePrompts.items[0] ?? null;
  const firstFeaturedSetup = concept.pageFramework?.featuredSetups?.[0] ?? null;
  const keyTakeaway = normalizeOptionalSentence(concept.pageIntro?.keyTakeaway);
  const whyItMatters = normalizeOptionalSentence(concept.pageIntro?.whyItMatters);
  const entryGuidance = concept.pageFramework?.entryGuidance;
  const overrideHints = collectOverrideHints(concept, entryGuidance);
  const activeGraphId = resolveInitialGraphId(concept);

  let source: ResolvedConceptPageGuidance["source"] | null = null;
  let action: string | null = null;
  let detail: string | null = null;
  let hints: Array<ResolvedConceptPageGuidanceHint & { priority: number }> = [];

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
    const generatedAction = buildGeneratedActionText({
      concept,
      prompt: firstPrompt,
      featuredSetup: firstFeaturedSetup,
    });

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
    hints = collectFeaturedSetupHints(concept, firstFeaturedSetup);
  } else if (keyTakeaway) {
    source = "key-takeaway";
    action = keyTakeaway;
    detail = whyItMatters;
    hints = collectPrimaryHints(concept);
  }

  if (!source || !action) {
    return null;
  }

  const resolvedAction =
    normalizeOptionalSentence(entryGuidance?.firstAction) ?? action;
  const resolvedDetail =
    normalizeOptionalSentence(entryGuidance?.watchFor) ?? detail;
  const resolvedHints =
    overrideHints.length > 0 ? overrideHints : hints;

  return {
    source,
    action: resolvedAction,
    detail: resolvedDetail,
    hints: finalizeHints(concept, resolvedHints, activeGraphId, firstPrompt, resolvedAction),
    usedOverrides: {
      firstAction: Boolean(normalizeOptionalSentence(entryGuidance?.firstAction)),
      watchFor: Boolean(normalizeOptionalSentence(entryGuidance?.watchFor)),
      hints: overrideHints.length > 0,
    },
  };
}

export function resolveConceptPageGuidanceDiagnostics(
  guidance: ResolvedConceptPageGuidance | null,
): ResolvedConceptPageGuidanceDiagnostics {
  if (!guidance) {
    return {
      hasConcreteAction: false,
      hasConcreteDetail: false,
      hasDynamicToolHint: false,
      hasHiddenHint: false,
      usesGenericFallback: true,
    };
  }

  const hasConcreteAction = isConcreteActionText(guidance.action);
  const hasConcreteDetail = isConcreteDetailText(guidance.detail);
  const hasDynamicToolHint = guidance.hints.some((hint) => hint.kind === "tool");
  const hasHiddenHint = guidance.hints.some((hint) => hint.hidden);

  return {
    hasConcreteAction,
    hasConcreteDetail,
    hasDynamicToolHint,
    hasHiddenHint,
    usesGenericFallback: !hasConcreteAction || !hasConcreteDetail,
  };
}
