import type { SimulationConfig, SimulationKind } from "./types";

function normalizeVisibleIds<T extends { id: string }>(
  items: T[],
  ids?: string[],
) {
  if (ids === undefined) {
    return {
      ids: undefined,
      invalidIds: [] as string[],
    };
  }

  const availableIds = new Set(items.map((item) => item.id));
  const seen = new Set<string>();
  const normalizedIds: string[] = [];
  const invalidIds: string[] = [];

  for (const id of ids) {
    if (!availableIds.has(id)) {
      invalidIds.push(id);
      continue;
    }

    if (seen.has(id)) {
      continue;
    }

    seen.add(id);
    normalizedIds.push(id);
  }

  return {
    ids: normalizedIds,
    invalidIds,
  };
}

export type ResolvedSimulationUiHints = {
  initialGraphId: string;
  primaryGraphIds?: string[];
  primaryControlIds?: string[];
  primaryPresetIds?: string[];
  starterExploreTasks: string[];
  invalidInitialGraphId: string | null;
  invalidPrimaryGraphIds: string[];
  invalidPrimaryControlIds: string[];
  invalidPrimaryPresetIds: string[];
};

export type SimulationFirstActionKind =
  | "playback"
  | "drag-probe"
  | "adjust-source"
  | "toggle-mode"
  | "inspect-state";

export type SimulationFirstActionMetadata = {
  kind: SimulationFirstActionKind;
};

const nonPlaybackFirstActionByKind = {
  "reaction-rate-collision-theory": "adjust-source",
  "dynamic-equilibrium": "toggle-mode",
  "graph-transformations": "drag-probe",
  "rational-functions": "inspect-state",
  "matrix-transformations": "drag-probe",
  "exponential-change": "adjust-source",
  "derivative-as-slope": "drag-probe",
  "optimization-constraints": "adjust-source",
  "limits-continuity": "inspect-state",
  "integral-accumulation": "inspect-state",
  "complex-numbers-plane": "drag-probe",
  "unit-circle-rotation": "drag-probe",
  "polar-coordinates": "drag-probe",
  "parametric-curves-motion": "playback",
  "sorting-algorithmic-trade-offs": "playback",
  "binary-search-halving": "inspect-state",
  "graph-traversal": "inspect-state",
  "solubility-saturation": "adjust-source",
  "buffers-neutralization": "adjust-source",
  "stoichiometry-recipe": "adjust-source",
  shm: "drag-probe",
  ucm: "playback",
  "damping-resonance": "playback",
  projectile: "drag-probe",
  "drag-terminal-velocity": "playback",
  "vectors-components": "playback",
  "dot-product-projection": "drag-probe",
  "vectors-2d": "drag-probe",
  torque: "playback",
  "static-equilibrium-centre-of-mass": "drag-probe",
  "rotational-inertia": "playback",
  "rolling-motion": "playback",
  "angular-momentum": "playback",
  "momentum-impulse": "playback",
  "conservation-of-momentum": "playback",
  collisions: "playback",
  "basic-circuits": "toggle-mode",
  "series-parallel-circuits": "playback",
  "equivalent-resistance": "playback",
  "power-energy-circuits": "playback",
  "rc-charging-discharging": "playback",
  "internal-resistance-terminal-voltage": "adjust-source",
  "electric-fields": "drag-probe",
  "gravitational-fields": "drag-probe",
  "gravitational-potential": "drag-probe",
  "circular-orbits": "playback",
  "escape-velocity": "playback",
  "electric-potential": "drag-probe",
  "capacitance-electric-energy": "adjust-source",
  "magnetic-fields": "drag-probe",
  "electromagnetic-induction": "playback",
  "maxwell-equations-synthesis": "playback",
  "electromagnetic-waves": "playback",
  "light-spectrum-linkage": "playback",
  "dispersion-refractive-index-color": "adjust-source",
  polarization: "adjust-source",
  diffraction: "adjust-source",
  "optical-resolution": "adjust-source",
  "double-slit-interference": "adjust-source",
  "photoelectric-effect": "playback",
  "atomic-spectra": "playback",
  "de-broglie-matter-waves": "adjust-source",
  "bohr-model": "playback",
  "radioactivity-half-life": "playback",
  "magnetic-force": "playback",
  "refraction-snells-law": "adjust-source",
  mirrors: "drag-probe",
  "lens-imaging": "drag-probe",
  beats: "playback",
  "sound-waves-longitudinal": "playback",
  "doppler-effect": "playback",
  "wave-speed-wavelength": "playback",
  "wave-interference": "adjust-source",
  "standing-waves": "playback",
  "air-column-resonance": "adjust-source",
  "temperature-internal-energy": "playback",
  "ideal-gas-kinetic-theory": "adjust-source",
  "pressure-hydrostatic": "adjust-source",
  "continuity-equation": "playback",
  "bernoulli-principle": "playback",
  "buoyancy-archimedes": "adjust-source",
  "heat-transfer": "playback",
  "specific-heat-phase-change": "playback",
  "concentration-dilution": "adjust-source",
  "acid-base-ph": "adjust-source",
} satisfies Record<SimulationKind, SimulationFirstActionKind>;

export function resolveSimulationFirstAction(
  kind: SimulationKind,
  options?: { hasInteractiveTime?: boolean },
): SimulationFirstActionMetadata {
  if (options?.hasInteractiveTime) {
    return { kind: "playback" };
  }

  const kindMetadata = nonPlaybackFirstActionByKind[kind];

  return {
    kind: kindMetadata === "playback" ? "inspect-state" : kindMetadata,
  };
}

export function resolveSimulationUiHints(
  simulation: Pick<SimulationConfig, "graphs" | "controls" | "presets" | "ui">,
): ResolvedSimulationUiHints {
  const authoredInitialGraphId = simulation.ui?.initialGraphId;
  const initialGraphId =
    simulation.graphs.find((graph) => graph.id === authoredInitialGraphId)?.id ??
    simulation.graphs[0]?.id ??
    "";
  const primaryControlIds = normalizeVisibleIds(
    simulation.controls,
    simulation.ui?.primaryControlIds,
  );
  const primaryGraphIds = normalizeVisibleIds(
    simulation.graphs,
    simulation.ui?.primaryGraphIds,
  );
  const primaryPresetIds = normalizeVisibleIds(
    simulation.presets,
    simulation.ui?.primaryPresetIds,
  );

  return {
    initialGraphId,
    primaryGraphIds: primaryGraphIds.ids,
    primaryControlIds: primaryControlIds.ids,
    primaryPresetIds: primaryPresetIds.ids,
    starterExploreTasks: simulation.ui?.starterExploreTasks ?? [],
    invalidInitialGraphId:
      authoredInitialGraphId && !simulation.graphs.some((graph) => graph.id === authoredInitialGraphId)
        ? authoredInitialGraphId
        : null,
    invalidPrimaryGraphIds: primaryGraphIds.invalidIds,
    invalidPrimaryControlIds: primaryControlIds.invalidIds,
    invalidPrimaryPresetIds: primaryPresetIds.invalidIds,
  };
}
