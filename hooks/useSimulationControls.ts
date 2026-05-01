"use client";

import { useState } from "react";
import type { ControlValue, SimulationConfig } from "@/lib/physics";

type UseSimulationControlsArgs = Pick<SimulationConfig, "defaults" | "presets">;

type UseSimulationControlsOptions = {
  initialParams?: Record<string, ControlValue>;
  initialActivePresetId?: string | null;
};

export function useSimulationControls(
  { defaults, presets }: UseSimulationControlsArgs,
  options: UseSimulationControlsOptions = {},
) {
  const [params, setParams] = useState<Record<string, ControlValue>>(() => ({
    ...defaults,
    ...(options.initialParams ?? {}),
  }));
  const [activePresetId, setActivePresetId] = useState<string | null>(
    options.initialActivePresetId ?? null,
  );

  function setParam(param: string, value: ControlValue) {
    setParams((current) => ({ ...current, [param]: value }));
    setActivePresetId(null);
  }

  function applyValues(nextValues: Record<string, ControlValue>, nextActivePresetId: string | null = null) {
    setParams((current) => ({ ...current, ...nextValues }));
    setActivePresetId(nextActivePresetId);
  }

  function applyPreset(presetId: string) {
    const preset = presets.find((item) => item.id === presetId);
    if (!preset) {
      return;
    }

    setParams((current) => ({ ...current, ...preset.values }));
    setActivePresetId(presetId);
  }

  function reset() {
    setParams({ ...defaults });
    setActivePresetId(null);
  }

  return {
    params,
    setParam,
    applyValues,
    applyPreset,
    reset,
    activePresetId,
  };
}
