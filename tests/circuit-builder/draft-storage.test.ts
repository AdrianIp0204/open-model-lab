// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import {
  CIRCUIT_DRAFT_STORAGE_KEY,
  clearCircuitDraftFromStorage,
  createDefaultCircuitEnvironment,
  readCircuitDraftFromStorage,
  writeCircuitDraftToStorage,
  type CircuitDocument,
} from "@/lib/circuit-builder";

describe("circuit draft storage", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("writes a versioned draft envelope containing only the normalized document payload", () => {
    const document: CircuitDocument = {
      version: 1,
      view: { zoom: 0.78, offsetX: 120, offsetY: 82 },
      environment: {
        ...createDefaultCircuitEnvironment(),
        lightLevelPercent: 80,
      },
      components: [
        {
          id: "ldr-1",
          label: "Light-dependent resistor 1",
          type: "ldr",
          x: 620,
          y: 224,
          rotation: 270,
          properties: {
            baseResistance: 900,
            manualResistance: 420,
            useAmbientLight: true,
          },
        },
      ],
      wires: [],
    };

    writeCircuitDraftToStorage(document);
    const raw = JSON.parse(
      window.localStorage.getItem(CIRCUIT_DRAFT_STORAGE_KEY) ?? "{}",
    ) as Record<string, unknown>;

    expect(raw.version).toBe(1);
    expect(typeof raw.savedAt).toBe("string");
    expect(raw.document).toBeTruthy();
    expect("past" in (raw.document as Record<string, unknown>)).toBe(false);
    expect("future" in (raw.document as Record<string, unknown>)).toBe(false);
    expect("historySession" in (raw.document as Record<string, unknown>)).toBe(false);
  });

  it("restores and normalizes a legacy raw document without a draft envelope", () => {
    window.localStorage.setItem(
      CIRCUIT_DRAFT_STORAGE_KEY,
      JSON.stringify({
        components: [
          {
            id: "thermistor-1",
            type: "thermistor",
            x: 480,
            y: 224,
            properties: { baseResistance: 220 },
          },
        ],
        wires: [],
      }),
    );

    const result = readCircuitDraftFromStorage();

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") {
      return;
    }
    expect(result.draft.savedAt).toBeNull();
    expect(result.draft.document.environment.temperatureC).toBe(25);
    expect(result.draft.document.components[0]?.properties.useAmbientTemperature).toBe(true);
  });

  it("clears invalid drafts safely", () => {
    window.localStorage.setItem(CIRCUIT_DRAFT_STORAGE_KEY, "{not valid json");

    const result = readCircuitDraftFromStorage();
    expect(result.kind).toBe("invalid");

    clearCircuitDraftFromStorage();
    expect(window.localStorage.getItem(CIRCUIT_DRAFT_STORAGE_KEY)).toBeNull();
  });
});
