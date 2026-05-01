// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("saved circuits store", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
  });

  it("creates, updates, renames, deletes, and orders saved circuits by updated time", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-15T00:00:00.000Z"));
    const store = await import("@/lib/circuit-builder/saved-circuits-store");
    store.localSavedCircuitsStore.resetForTests();

    const first = store.saveSavedCircuit({
      title: "Alpha circuit",
      document: {
        version: 1,
        view: { zoom: 0.78, offsetX: 120, offsetY: 82 },
        environment: { temperatureC: 25, lightLevelPercent: 35 },
        components: [],
        wires: [],
      },
    }).savedCircuit;
    vi.setSystemTime(new Date("2026-04-15T00:01:00.000Z"));
    const second = store.saveSavedCircuit({
      title: "Beta circuit",
      document: {
        version: 1,
        view: { zoom: 0.78, offsetX: 120, offsetY: 82 },
        environment: { temperatureC: 40, lightLevelPercent: 90 },
        components: [],
        wires: [],
      },
    }).savedCircuit;

    let raw = JSON.parse(
      window.localStorage.getItem(store.SAVED_CIRCUITS_STORAGE_KEY) ?? "{}",
    ) as { items: Array<{ id: string; title: string }> };
    expect(raw.items[0]?.title).toBe("Beta circuit");

    vi.setSystemTime(new Date("2026-04-15T00:02:00.000Z"));
    const updated = store.saveSavedCircuit({
      existingId: first.id,
      title: first.title,
      document: {
        version: 1,
        view: { zoom: 0.92, offsetX: 88, offsetY: 64 },
        environment: { temperatureC: 60, lightLevelPercent: 70 },
        components: [],
        wires: [],
      },
    }).savedCircuit;
    raw = JSON.parse(
      window.localStorage.getItem(store.SAVED_CIRCUITS_STORAGE_KEY) ?? "{}",
    ) as { items: Array<{ id: string; title: string }> };
    expect(raw.items[0]?.id).toBe(updated.id);

    vi.setSystemTime(new Date("2026-04-15T00:03:00.000Z"));
    const renamed = store.renameSavedCircuit(second.id, "Renamed beta");
    expect(renamed?.title).toBe("Renamed beta");
    expect(store.getSavedCircuitById(second.id)?.title).toBe("Renamed beta");

    const deleted = store.deleteSavedCircuit(first.id);
    expect(deleted?.id).toBe(first.id);
    expect(store.getSavedCircuitById(first.id)).toBeNull();
  });

  it("drops corrupt saved entries safely while keeping valid circuits", async () => {
    window.localStorage.setItem(
      "open-model-lab.circuit-builder.saved-circuits.v1",
      JSON.stringify({
        version: "v1",
        items: [
          {
            id: "valid-1",
            title: "Valid saved circuit",
            createdAt: "2026-04-15T00:00:00.000Z",
            updatedAt: "2026-04-15T01:00:00.000Z",
            document: {
              version: 1,
              view: { zoom: 0.78, offsetX: 120, offsetY: 82 },
              environment: { temperatureC: 25, lightLevelPercent: 35 },
              components: [],
              wires: [],
            },
          },
          {
            id: "broken-1",
            title: "Broken circuit",
            createdAt: "2026-04-15T00:00:00.000Z",
            updatedAt: "2026-04-15T01:00:00.000Z",
            document: "{not a circuit}",
          },
        ],
      }),
    );

    const store = await import("@/lib/circuit-builder/saved-circuits-store");
    store.localSavedCircuitsStore.resetForTests();

    expect(store.getSavedCircuitsDiscardedCount()).toBe(1);
    expect(store.getSavedCircuitById("valid-1")?.title).toBe("Valid saved circuit");
    expect(store.getSavedCircuitById("broken-1")).toBeNull();
  });
});
