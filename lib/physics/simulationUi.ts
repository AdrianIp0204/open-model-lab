import type { SimulationConfig } from "./types";

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
