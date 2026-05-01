import { describe, expect, it } from "vitest";
import {
  getChallengeCatalogEntries,
  normalizeChallengeModeAuthoring,
} from "@/lib/content";

describe("challenge authoring helpers", () => {
  it("normalizes compact requirements and targets into runtime-ready checks", () => {
    const normalized = normalizeChallengeModeAuthoring(
      {
        title: "Challenge mode",
        items: [
          {
            id: "compact-compare",
            title: "Compact compare",
            style: "visible-condition",
            prompt: "Hold a target in compare mode.",
            successMessage: "Solved.",
            requirements: {
              graphId: "trajectory",
              overlayIds: ["rangeMarker"],
              timeSource: "inspect",
              compareTarget: "b",
            },
            targets: [
              {
                setup: "b",
                metric: "range",
                min: 35,
                max: 38,
                displayUnit: "m",
              },
              {
                param: "angle",
                min: 30,
                max: 40,
                displayUnit: "deg",
              },
            ],
          },
        ],
      },
      {
        graphs: [{ id: "trajectory", label: "Trajectory" }],
        overlays: [{ id: "rangeMarker", label: "Range marker" }],
      },
    );

    expect(normalized?.items[0].setup).toMatchObject({
      graphId: "trajectory",
      overlayIds: ["rangeMarker"],
      interactionMode: "compare",
    });
    expect(normalized?.items[0].checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "graph-active",
          graphId: "trajectory",
        }),
        expect.objectContaining({
          type: "overlay-active",
          overlayId: "rangeMarker",
        }),
        expect.objectContaining({
          type: "time-source",
          source: "inspect",
        }),
        expect.objectContaining({
          type: "compare-active",
          target: "b",
        }),
        expect.objectContaining({
          type: "compare-metric-range",
          setup: "b",
          metric: "range",
        }),
        expect.objectContaining({
          type: "param-range",
          param: "angle",
        }),
      ]),
    );
  });

  it("derives challenge catalog signals for future discovery surfaces", () => {
    const normalized = normalizeChallengeModeAuthoring(
      {
        title: "Challenge mode",
        items: [
          {
            id: "catalog-entry",
            title: "Catalog entry",
            style: "target-setting",
            prompt: "Tune the shot.",
            successMessage: "Solved.",
            requirements: {
              graphId: "trajectory",
              overlayIds: ["rangeMarker"],
              compareTarget: "b",
            },
            targets: [
              {
                setup: "b",
                metric: "range",
                min: 35,
                max: 38,
              },
            ],
          },
        ],
      },
      {
        graphs: [{ id: "trajectory", label: "Trajectory" }],
        overlays: [{ id: "rangeMarker", label: "Range marker" }],
      },
    );

    const entries = getChallengeCatalogEntries(normalized);

    expect(entries).toEqual([
      expect.objectContaining({
        id: "catalog-entry",
        depth: "stretch",
        checkCount: 4,
        cueLabels: expect.arrayContaining(["Compare mode", "Graph-linked", "Guided start"]),
        requirementLabels: expect.arrayContaining([
          "Open the Trajectory graph.",
          "Keep the Range marker visible.",
        ]),
        targetLabels: expect.arrayContaining(["Keep Setup B range between 35 and 38."]),
        graphIds: ["trajectory"],
        overlayIds: ["rangeMarker"],
        targetMetrics: ["range"],
        targetParams: [],
        usesCompare: true,
        compareTargets: ["b"],
        usesInspect: false,
      }),
    ]);
  });
});
