import {
  assignmentShareAnchorIds,
  buildConceptFeaturedSetupTargets,
  buildConceptTryThisShareTargets,
  buildConceptSimulationStateHref,
  buildChallengeEntryHref,
  buildGuidedCollectionAssignmentShareTargets,
  buildConceptShareTargets,
  buildGuidedCollectionBundleShareTargets,
  buildGuidedCollectionShareTargets,
  buildTrackCompletionShareTargets,
  buildTrackCompletionHref,
  buildTrackShareTargets,
  conceptShareAnchorIds,
  guidedCollectionShareAnchorIds,
  resolveGuidedCollectionBundle,
  resolveConceptSimulationState,
  resolveInitialChallengeItemId,
  resolvePublicExperimentCard,
  type ConceptSimulationStateSource,
} from "@/lib/share-links";
import { getAllConcepts, getGuidedCollectionBySlug, type ConceptContent } from "@/lib/content";
import { resolveGuidedCollectionAssignment } from "@/lib/guided/assignments";
import { resolveGuidedCollectionConceptBundle } from "@/lib/guided/concept-bundles";

function buildSimulationSource(concept: ConceptContent): ConceptSimulationStateSource {
  return {
    slug: concept.slug,
    simulation: {
      defaults: concept.simulation.defaults,
      presets: concept.simulation.presets,
      overlays: concept.simulation.overlays,
      graphs: concept.graphs,
    },
  };
}

function buildNonDefaultParams(
  defaults: Record<string, number | boolean | string>,
  numericDelta = 1,
) {
  return Object.fromEntries(
    Object.entries(defaults).map(([key, value]) => {
      if (typeof value === "number") {
        return [key, value + numericDelta];
      }

      if (typeof value === "boolean") {
        return [key, !value];
      }

      return [key, value];
    }),
  );
}

describe("share links", () => {
  it("builds bounded concept and track share targets from existing routes", () => {
    const conceptTargets = buildConceptShareTargets({
      slug: "projectile-motion",
      hasChallengeMode: true,
      sections: [
        {
          id: "workedExamples",
          title: "Worked examples",
          slot: "practice-main",
          order: 30,
        },
        {
          id: "quickTest",
          title: "Quick test",
          slot: "assessment",
          order: 60,
        },
        {
          id: "readNext",
          title: "Read next",
          slot: "support-aside",
          order: 80,
        },
      ],
    });

    expect(conceptTargets.map((target) => target.href)).toEqual([
      "/concepts/projectile-motion",
      `/concepts/projectile-motion#${conceptShareAnchorIds.interactiveLab}`,
      `/concepts/projectile-motion#${conceptShareAnchorIds.challengeMode}`,
      `/concepts/projectile-motion#${conceptShareAnchorIds.workedExamples}`,
      `/concepts/projectile-motion#${conceptShareAnchorIds.quickTest}`,
      `/concepts/projectile-motion#${conceptShareAnchorIds.readNext}`,
    ]);

    expect(buildTrackShareTargets("waves").map((target) => target.href)).toEqual([
      "/tracks/waves",
      "/tracks/waves#guided-path",
      "/tracks/waves?mode=recap",
    ]);
    expect(
      buildGuidedCollectionShareTargets("waves-evidence-loop").map((target) => target.href),
    ).toEqual([
      "/guided/waves-evidence-loop",
      `/guided/waves-evidence-loop#${guidedCollectionShareAnchorIds.steps}`,
    ]);
    expect(buildTrackCompletionShareTargets("waves").map((target) => target.href)).toEqual([
      "/tracks/waves/complete",
      "/tracks/waves",
      "/tracks/waves?mode=recap",
    ]);
    expect(buildTrackCompletionHref("waves")).toBe("/tracks/waves/complete");
  });

  it("encodes and resolves shareable concept bundles on top of guided collections", () => {
    const collection = getGuidedCollectionBySlug("electricity-bridge-lesson-set");
    const bundle = resolveGuidedCollectionConceptBundle(collection, {
      id: "bundle-electricity-bridge",
      title: "Electricity bridge bundle",
      summary:
        "Keep the field-to-voltage bridge tight, then launch directly into the existing challenge checkpoint.",
      stepIds: [
        "electricity-topic-route",
        "electric-fields-concept",
        "electric-potential-concept",
        "electricity-voltage-checkpoint",
      ],
      launchStepId: "electric-potential-concept",
    });

    expect(bundle).not.toBeNull();

    const targets = buildGuidedCollectionBundleShareTargets(bundle!);

    expect(targets[0]?.href).toMatch(
      /^\/guided\/electricity-bridge-lesson-set\?bundle=v1\.[A-Za-z0-9_-]+#concept-bundle$/,
    );
    expect(targets[1]?.href).toBe("/concepts/electric-potential");

    const resolvedBundle = resolveGuidedCollectionBundle(
      new URL(targets[0]!.href, "https://openmodellab.local").searchParams.get("bundle") ??
        undefined,
      collection,
    );

    expect(resolvedBundle).toMatchObject({
      id: "bundle-electricity-bridge",
      title: "Electricity bridge bundle",
      collectionSlug: "electricity-bridge-lesson-set",
      stepIds: [
        "electricity-topic-route",
        "electric-fields-concept",
        "electric-potential-concept",
        "electricity-voltage-checkpoint",
      ],
      launchStep: {
        id: "electric-potential-concept",
        href: "/concepts/electric-potential",
      },
    });
  });

  it("builds stable assignment share targets on top of guided collection bundles", () => {
    const collection = getGuidedCollectionBySlug("waves-evidence-loop");
    const assignment = resolveGuidedCollectionAssignment(collection, {
      id: "a3d5c9a2-0e64-4d21-a923-1cce7ef560a7",
      title: "Wave evidence assignment",
      summary: "Track plus one interference checkpoint.",
      stepIds: ["waves-starter-track", "waves-dark-band-challenge"],
      launchStepId: "waves-dark-band-challenge",
      teacherNote: "Use the challenge as the discussion handoff.",
      creatorDisplayName: "Teacher",
      createdAt: "2026-03-29T10:00:00.000Z",
      updatedAt: "2026-03-29T10:00:00.000Z",
    });

    expect(assignment).not.toBeNull();

    expect(buildGuidedCollectionAssignmentShareTargets(assignment!).map((target) => target.href)).toEqual([
      "/assignments/a3d5c9a2-0e64-4d21-a923-1cce7ef560a7",
      `/assignments/a3d5c9a2-0e64-4d21-a923-1cce7ef560a7#${assignmentShareAnchorIds.steps}`,
      "/concepts/wave-interference?challenge=wi-ch-find-dark-band#challenge-mode",
    ]);
  });

  it("can preserve the active locale in guided share targets", () => {
    const projectileMotion = getAllConcepts().find(
      (concept) => concept.slug === "projectile-motion",
    );
    const collection = getGuidedCollectionBySlug("waves-evidence-loop");
    const assignment = resolveGuidedCollectionAssignment(collection, {
      id: "a3d5c9a2-0e64-4d21-a923-1cce7ef560a7",
      title: "Wave evidence assignment",
      summary: "Track plus one interference checkpoint.",
      stepIds: ["waves-starter-track", "waves-dark-band-challenge"],
      launchStepId: "waves-dark-band-challenge",
      teacherNote: "Use the challenge as the discussion handoff.",
      creatorDisplayName: "Teacher",
      createdAt: "2026-03-29T10:00:00.000Z",
      updatedAt: "2026-03-29T10:00:00.000Z",
    });
    const bundle = resolveGuidedCollectionConceptBundle(
      getGuidedCollectionBySlug("electricity-bridge-lesson-set"),
      {
        id: "bundle-electricity-bridge",
        title: "Electricity bridge bundle",
        summary:
          "Keep the field-to-voltage bridge tight, then launch directly into the existing challenge checkpoint.",
        stepIds: [
          "electricity-topic-route",
          "electric-fields-concept",
          "electric-potential-concept",
          "electricity-voltage-checkpoint",
        ],
        launchStepId: "electric-potential-concept",
      },
    );

    expect(projectileMotion).toBeDefined();
    expect(buildGuidedCollectionShareTargets("waves-evidence-loop", "zh-HK").map((target) => target.href)).toEqual([
      "/zh-HK/guided/waves-evidence-loop",
      `/zh-HK/guided/waves-evidence-loop#${guidedCollectionShareAnchorIds.steps}`,
    ]);
    expect(
      buildConceptShareTargets({
        slug: "projectile-motion",
        hasChallengeMode: true,
        sections: [
          {
            id: "workedExamples",
            title: "Worked examples",
            slot: "practice-main",
            order: 30,
          },
          {
            id: "quickTest",
            title: "Quick test",
            slot: "assessment",
            order: 60,
          },
        ],
        locale: "zh-HK",
      }).map((target) => target.href),
    ).toEqual([
      "/zh-HK/concepts/projectile-motion",
      `/zh-HK/concepts/projectile-motion#${conceptShareAnchorIds.interactiveLab}`,
      `/zh-HK/concepts/projectile-motion#${conceptShareAnchorIds.challengeMode}`,
      `/zh-HK/concepts/projectile-motion#${conceptShareAnchorIds.workedExamples}`,
      `/zh-HK/concepts/projectile-motion#${conceptShareAnchorIds.quickTest}`,
    ]);
    expect(
      buildConceptTryThisShareTargets({
        source: buildSimulationSource(projectileMotion!),
        conceptSlug: projectileMotion!.slug,
        conceptTitle: projectileMotion!.title,
        locale: "zh-HK",
        state: {
          params: buildNonDefaultParams(projectileMotion!.simulation.defaults),
          activePresetId: null,
          activeGraphId: projectileMotion!.graphs[0]?.id ?? null,
          overlayValues: Object.fromEntries(
            (projectileMotion!.simulation.overlays ?? []).map((overlay) => [
              overlay.id,
              overlay.defaultOn,
            ]),
          ),
          focusedOverlayId: projectileMotion!.simulation.overlays?.[0]?.id ?? null,
          time: 0,
          timeSource: "live",
          compare: null,
        },
      })[0]?.href,
    ).toMatch(/^\/zh-HK\/concepts\/projectile-motion\?state=v1\.[A-Za-z0-9_-]+/);
    expect(buildTrackShareTargets("waves", "zh-HK").map((target) => target.href)).toEqual([
      "/zh-HK/tracks/waves",
      "/zh-HK/tracks/waves#guided-path",
      "/zh-HK/tracks/waves?mode=recap",
    ]);
    expect(buildTrackCompletionShareTargets("waves", "zh-HK").map((target) => target.href)).toEqual([
      "/zh-HK/tracks/waves/complete",
      "/zh-HK/tracks/waves",
      "/zh-HK/tracks/waves?mode=recap",
    ]);
    expect(
      buildGuidedCollectionAssignmentShareTargets(assignment!, "zh-HK").map(
        (target) => target.href,
      ),
    ).toEqual([
      "/zh-HK/assignments/a3d5c9a2-0e64-4d21-a923-1cce7ef560a7",
      `/zh-HK/assignments/a3d5c9a2-0e64-4d21-a923-1cce7ef560a7#${assignmentShareAnchorIds.steps}`,
      "/zh-HK/concepts/wave-interference?challenge=wi-ch-find-dark-band#challenge-mode",
    ]);
    expect(
      buildGuidedCollectionBundleShareTargets(bundle!, "zh-HK").map((target) => target.href),
    ).toEqual([
      expect.stringMatching(
        /^\/zh-HK\/guided\/electricity-bridge-lesson-set\?bundle=v1\.[A-Za-z0-9_-]+#concept-bundle$/,
      ),
      "/zh-HK/concepts/electric-potential",
    ]);
  });

  it("keeps challenge entry state bounded to a canonical challenge id", () => {
    expect(
      buildChallengeEntryHref("projectile-motion", "pm-ch-steeper-shot"),
    ).toBe(
      "/concepts/projectile-motion?challenge=pm-ch-steeper-shot#challenge-mode",
    );
    expect(
      buildChallengeEntryHref("projectile-motion", "pm-ch-steeper-shot", "zh-HK"),
    ).toBe(
      "/zh-HK/concepts/projectile-motion?challenge=pm-ch-steeper-shot#challenge-mode",
    );
    expect(
      resolveInitialChallengeItemId("pm-ch-steeper-shot", [
        "pm-ch-flat-far-shot",
        "pm-ch-steeper-shot",
      ]),
    ).toBe("pm-ch-steeper-shot");
    expect(
      resolveInitialChallengeItemId("missing-id", [
        "pm-ch-flat-far-shot",
        "pm-ch-steeper-shot",
      ]),
    ).toBeNull();
    expect(
      resolveInitialChallengeItemId(["pm-ch-steeper-shot"], [
        "pm-ch-flat-far-shot",
        "pm-ch-steeper-shot",
      ]),
    ).toBe("pm-ch-steeper-shot");
  });

  it("encodes and resolves exact simulation state with inspect time and overlay focus", () => {
    const simulationSource: ConceptSimulationStateSource = {
      slug: "projectile-motion",
      simulation: {
        defaults: {
          speed: 18,
          angle: 45,
          gravity: 9.8,
        },
        presets: [
          {
            id: "earth-shot",
            label: "Earth shot",
            values: {
              speed: 18,
              angle: 45,
              gravity: 9.8,
            },
          },
        ],
        overlays: [
          {
            id: "rangeMarker",
            label: "Range marker",
            shortDescription: "Marks the landing range.",
            whatToNotice: ["Range changes with launch conditions."],
            defaultOn: true,
          },
          {
            id: "apexMarker",
            label: "Apex marker",
            shortDescription: "Marks the peak height.",
            whatToNotice: ["The apex shifts when the angle changes."],
            defaultOn: false,
          },
        ],
        graphs: [
          {
            id: "trajectory",
            label: "Trajectory",
            xLabel: "x",
            yLabel: "y",
            series: ["trajectory"],
          },
        ],
      },
    };

    const href = buildConceptSimulationStateHref({
      source: simulationSource,
      conceptSlug: "projectile-motion",
      state: {
        params: {
          speed: 22,
          angle: 58,
          gravity: 9.8,
        },
        activePresetId: null,
        activeGraphId: "trajectory",
        overlayValues: {
          rangeMarker: false,
          apexMarker: true,
        },
        focusedOverlayId: "apexMarker",
        time: 1.25,
        timeSource: "inspect",
        compare: null,
      },
    });

    expect(href).toMatch(
      /^\/concepts\/projectile-motion\?state=v1\.[A-Za-z0-9_-]+#interactive-lab$/,
    );

    const resolved = resolveConceptSimulationState(
      new URL(href, "https://openmodellab.local").searchParams.get("state") ?? undefined,
      simulationSource,
    );

    expect(resolved).toEqual({
      params: {
        speed: 22,
        angle: 58,
        gravity: 9.8,
      },
      activePresetId: null,
      activeGraphId: "trajectory",
      overlayValues: {
        rangeMarker: false,
        apexMarker: true,
      },
      focusedOverlayId: "apexMarker",
      inspectTime: 1.25,
      compare: null,
    });
  });

  it("keeps concept state share links browser-safe when Buffer lacks base64url support", () => {
    const simulationSource: ConceptSimulationStateSource = {
      slug: "projectile-motion",
      simulation: {
        defaults: {
          speed: 18,
          angle: 45,
          gravity: 9.8,
        },
        presets: [],
        overlays: [
          {
            id: "rangeMarker",
            label: "Range marker",
            shortDescription: "Marks the landing range.",
            whatToNotice: ["Range changes with launch conditions."],
            defaultOn: true,
          },
        ],
        graphs: [
          {
            id: "trajectory",
            label: "Trajectory",
            xLabel: "x",
            yLabel: "y",
            series: ["trajectory"],
          },
        ],
      },
    };
    const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
    const originalBuffer = globalThis.Buffer;

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {},
    });
    globalThis.Buffer = {
      from() {
        throw new TypeError("Unknown encoding: base64url");
      },
    } as unknown as typeof Buffer;

    try {
      const href = buildConceptSimulationStateHref({
        source: simulationSource,
        conceptSlug: "projectile-motion",
        state: {
          params: {
            speed: 22,
            angle: 58,
            gravity: 9.8,
          },
          activePresetId: null,
          activeGraphId: "trajectory",
          overlayValues: {
            rangeMarker: false,
          },
          focusedOverlayId: "rangeMarker",
          time: 0,
          timeSource: "live",
          compare: null,
        },
      });

      expect(href).toMatch(
        /^\/concepts\/projectile-motion\?state=v1\.[A-Za-z0-9_-]+#interactive-lab$/,
      );
      expect(
        resolveConceptSimulationState(
          new URL(href, "https://openmodellab.local").searchParams.get("state") ?? undefined,
          simulationSource,
        ),
      ).toEqual({
        params: {
          speed: 22,
          angle: 58,
          gravity: 9.8,
        },
        activePresetId: null,
        activeGraphId: "trajectory",
        overlayValues: {
          rangeMarker: false,
        },
        focusedOverlayId: "rangeMarker",
        inspectTime: null,
        compare: null,
      });
    } finally {
      if (originalWindowDescriptor) {
        Object.defineProperty(globalThis, "window", originalWindowDescriptor);
      } else {
        Reflect.deleteProperty(globalThis, "window");
      }
      globalThis.Buffer = originalBuffer;
    }
  });

  it("keeps compare setup state bounded while preserving the active challenge entry", () => {
    const simulationSource: ConceptSimulationStateSource = {
      slug: "projectile-motion",
      simulation: {
        defaults: {
          speed: 18,
          angle: 45,
          gravity: 9.8,
        },
        presets: [
          {
            id: "earth-shot",
            label: "Earth shot",
            values: {
              speed: 18,
              angle: 45,
              gravity: 9.8,
            },
          },
        ],
        overlays: [
          {
            id: "rangeMarker",
            label: "Range marker",
            shortDescription: "Marks the landing range.",
            whatToNotice: ["Range changes with launch conditions."],
            defaultOn: true,
          },
        ],
        graphs: [
          {
            id: "trajectory",
            label: "Trajectory",
            xLabel: "x",
            yLabel: "y",
            series: ["trajectory"],
          },
        ],
      },
    };

    const href = buildConceptSimulationStateHref({
      source: simulationSource,
      conceptSlug: "projectile-motion",
      challengeId: "pm-ch-flat-far-shot",
      hash: conceptShareAnchorIds.challengeMode,
      state: {
        params: {
          speed: 18,
          angle: 60,
          gravity: 1.6,
        },
        activePresetId: null,
        activeGraphId: "trajectory",
        overlayValues: {
          rangeMarker: true,
        },
        focusedOverlayId: "rangeMarker",
        time: 0.9,
        timeSource: "inspect",
        compare: {
          activeTarget: "b",
          setupA: {
            label: "Earth baseline",
            params: {
              speed: 18,
              angle: 45,
              gravity: 9.8,
            },
            activePresetId: "earth-shot",
          },
          setupB: {
            label: "Moon variant",
            params: {
              speed: 18,
              angle: 60,
              gravity: 1.6,
            },
            activePresetId: null,
          },
        },
      },
    });

    expect(href).toMatch(
      /^\/concepts\/projectile-motion\?challenge=pm-ch-flat-far-shot&state=v1\.[A-Za-z0-9_-]+#challenge-mode$/,
    );

    const resolved = resolveConceptSimulationState(
      new URL(href, "https://openmodellab.local").searchParams.get("state") ?? undefined,
      simulationSource,
    );

    expect(resolved).toEqual({
      params: {
        speed: 18,
        angle: 60,
        gravity: 1.6,
      },
      activePresetId: null,
      activeGraphId: "trajectory",
      overlayValues: {
        rangeMarker: true,
      },
      focusedOverlayId: "rangeMarker",
      inspectTime: 0.9,
      compare: {
        activeTarget: "b",
        setupA: {
          label: "Earth baseline",
          params: {
            speed: 18,
            angle: 45,
            gravity: 9.8,
          },
          activePresetId: "earth-shot",
        },
        setupB: {
          label: "Moon variant",
          params: {
            speed: 18,
            angle: 60,
            gravity: 1.6,
          },
          activePresetId: null,
        },
      },
    });
  });

  it("encodes the same exact state deterministically even when object key order changes", () => {
    const simulationSource: ConceptSimulationStateSource = {
      slug: "projectile-motion",
      simulation: {
        defaults: {
          speed: 18,
          angle: 45,
          gravity: 9.8,
        },
        presets: [
          {
            id: "earth-shot",
            label: "Earth shot",
            values: {
              speed: 18,
              angle: 45,
              gravity: 9.8,
            },
          },
        ],
        overlays: [
          {
            id: "rangeMarker",
            label: "Range marker",
            shortDescription: "Marks the landing range.",
            whatToNotice: ["Range changes with launch conditions."],
            defaultOn: true,
          },
          {
            id: "apexMarker",
            label: "Apex marker",
            shortDescription: "Marks the peak height.",
            whatToNotice: ["The apex shifts when the angle changes."],
            defaultOn: false,
          },
        ],
        graphs: [
          {
            id: "trajectory",
            label: "Trajectory",
            xLabel: "x",
            yLabel: "y",
            series: ["trajectory"],
          },
          {
            id: "velocity-components",
            label: "Velocity components",
            xLabel: "time",
            yLabel: "velocity",
            series: ["vx", "vy"],
          },
        ],
      },
    };

    const encodedA = buildConceptSimulationStateHref({
      source: simulationSource,
      conceptSlug: "projectile-motion",
      state: {
        params: {
          speed: 18,
          angle: 60,
          gravity: 1.6,
        },
        activePresetId: null,
        activeGraphId: "velocity-components",
        overlayValues: {
          rangeMarker: false,
          apexMarker: true,
        },
        focusedOverlayId: "apexMarker",
        time: 0.9,
        timeSource: "inspect",
        compare: {
          activeTarget: "b",
          setupA: {
            label: "Earth baseline",
            params: {
              speed: 18,
              angle: 45,
              gravity: 9.8,
            },
            activePresetId: "earth-shot",
          },
          setupB: {
            label: "Moon variant",
            params: {
              speed: 18,
              angle: 60,
              gravity: 1.6,
            },
            activePresetId: null,
          },
        },
      },
    });
    const encodedB = buildConceptSimulationStateHref({
      source: simulationSource,
      conceptSlug: "projectile-motion",
      state: {
        params: {
          gravity: 1.6,
          speed: 18,
          angle: 60,
        },
        activePresetId: null,
        activeGraphId: "velocity-components",
        overlayValues: {
          apexMarker: true,
          rangeMarker: false,
        },
        focusedOverlayId: "apexMarker",
        time: 0.9,
        timeSource: "inspect",
        compare: {
          activeTarget: "b",
          setupA: {
            label: "Earth baseline",
            params: {
              gravity: 9.8,
              angle: 45,
              speed: 18,
            },
            activePresetId: "earth-shot",
          },
          setupB: {
            label: "Moon variant",
            params: {
              gravity: 1.6,
              angle: 60,
              speed: 18,
            },
            activePresetId: null,
          },
        },
      },
    });

    expect(encodedA).toBe(encodedB);
  });

  it("keeps exact-state links within the bounded URL budget across published concepts", () => {
    const concepts = getAllConcepts();

    for (const concept of concepts) {
      const simulationSource = buildSimulationSource(concept);
      const lastGraphId =
        simulationSource.simulation.graphs[simulationSource.simulation.graphs.length - 1]?.id ??
        null;
      const lastOverlayId =
        simulationSource.simulation.overlays?.[
          (simulationSource.simulation.overlays?.length ?? 1) - 1
        ]?.id ?? null;
      const overlayValues = Object.fromEntries(
        (simulationSource.simulation.overlays ?? []).map((overlay, index, overlays) => [
          overlay.id,
          index === overlays.length - 1,
        ]),
      );
      const stateHref = buildConceptSimulationStateHref({
        source: simulationSource,
        conceptSlug: concept.slug,
        state: {
          params: buildNonDefaultParams(simulationSource.simulation.defaults, 1),
          activePresetId: simulationSource.simulation.presets[0]?.id ?? null,
          activeGraphId: lastGraphId,
          overlayValues,
          focusedOverlayId: lastOverlayId,
          time: 0.75,
          timeSource: "inspect",
          compare: {
            activeTarget: "b",
            setupA: {
              label: "Baseline",
              params: simulationSource.simulation.defaults,
              activePresetId: simulationSource.simulation.presets[0]?.id ?? null,
            },
            setupB: {
              label: "Variant",
              params: buildNonDefaultParams(simulationSource.simulation.defaults, 2),
              activePresetId: null,
            },
          },
        },
      });
      const stateParam =
        new URL(stateHref, "https://openmodellab.local").searchParams.get("state");

      expect(stateParam, `${concept.slug} should keep an exact-state payload`).toBeTruthy();
      expect(
        stateParam?.length ?? 0,
        `${concept.slug} should stay within the current exact-state budget`,
      ).toBeLessThanOrEqual(1800);
      expect(
        resolveConceptSimulationState(stateParam ?? undefined, simulationSource),
        `${concept.slug} should round-trip its bounded exact state`,
      ).toMatchObject({
        inspectTime: 0.75,
        activeGraphId: lastGraphId ?? simulationSource.simulation.graphs[0]?.id ?? null,
        focusedOverlayId: lastOverlayId,
        compare: {
          activeTarget: "b",
        },
      });
    }
  });

  it("omits the state query when the link already matches the default bench state", () => {
    const simulationSource: ConceptSimulationStateSource = {
      slug: "projectile-motion",
      simulation: {
        defaults: {
          speed: 18,
          angle: 45,
          gravity: 9.8,
        },
        presets: [],
        overlays: [
          {
            id: "rangeMarker",
            label: "Range marker",
            shortDescription: "Marks the landing range.",
            whatToNotice: ["Range changes with launch conditions."],
            defaultOn: true,
          },
        ],
        graphs: [
          {
            id: "trajectory",
            label: "Trajectory",
            xLabel: "x",
            yLabel: "y",
            series: ["trajectory"],
          },
        ],
      },
    };

    expect(
      buildConceptSimulationStateHref({
        source: simulationSource,
        conceptSlug: "projectile-motion",
        state: {
          params: {
            speed: 18,
            angle: 45,
            gravity: 9.8,
          },
          activePresetId: null,
          activeGraphId: "trajectory",
          overlayValues: {
            rangeMarker: true,
          },
          focusedOverlayId: "rangeMarker",
          time: 0,
          timeSource: "live",
          compare: null,
        },
      }),
    ).toBe("/concepts/projectile-motion#interactive-lab");
  });

  it("builds a try-this setup target for the live bench state", () => {
    const simulationSource: ConceptSimulationStateSource = {
      slug: "projectile-motion",
      simulation: {
        defaults: {
          speed: 18,
          angle: 45,
          gravity: 9.8,
        },
        presets: [
          {
            id: "earth-shot",
            label: "Earth shot",
            values: {
              speed: 18,
              angle: 45,
              gravity: 9.8,
            },
          },
        ],
        overlays: [
          {
            id: "rangeMarker",
            label: "Range marker",
            shortDescription: "Marks the landing range.",
            whatToNotice: ["Range changes with launch conditions."],
            defaultOn: true,
          },
        ],
        graphs: [
          {
            id: "trajectory",
            label: "Trajectory",
            xLabel: "x",
            yLabel: "y",
            series: ["trajectory"],
          },
        ],
      },
    };

    const [target] = buildConceptTryThisShareTargets({
      source: simulationSource,
      conceptSlug: "projectile-motion",
      conceptTitle: "Projectile Motion",
      state: {
        params: {
          speed: 18,
          angle: 52,
          gravity: 9.8,
        },
        activePresetId: null,
        activeGraphId: "trajectory",
        overlayValues: {
          rangeMarker: true,
        },
        focusedOverlayId: "rangeMarker",
        time: 0.5,
        timeSource: "inspect",
        compare: null,
      },
    });

    expect(target).toEqual(
      expect.objectContaining({
        id: "try-this-setup",
        label: "Current setup",
        buttonLabel: "Copy current setup",
        ariaLabel: "Copy current setup link",
        href: expect.stringMatching(
          /^\/concepts\/projectile-motion\?state=v1\.[A-Za-z0-9_-]+&experiment=v1\.[A-Za-z0-9_-]+#interactive-lab$/,
        ),
      }),
    );

    expect(
      resolvePublicExperimentCard(
        new URL(target!.href, "https://openmodellab.local").searchParams.get("experiment") ??
          undefined,
        "projectile-motion",
      ),
    ).toEqual({
      title: "Current setup",
      prompt: "Reopen this shared bench state and start changing the live controls immediately.",
      kind: "live-setup",
    });
  });

  it("keeps named preset sharing stable even after live time advances or the view changes", () => {
    const simulationSource: ConceptSimulationStateSource = {
      slug: "projectile-motion",
      simulation: {
        defaults: {
          speed: 18,
          angle: 45,
          gravity: 9.8,
        },
        presets: [
          {
            id: "earth-shot",
            label: "Earth shot",
            values: {
              speed: 18,
              angle: 45,
              gravity: 9.8,
            },
          },
        ],
        overlays: [
          {
            id: "rangeMarker",
            label: "Range marker",
            shortDescription: "Marks the landing range.",
            whatToNotice: ["Range changes with launch conditions."],
            defaultOn: false,
          },
        ],
        graphs: [
          {
            id: "trajectory",
            label: "Trajectory",
            xLabel: "x",
            yLabel: "y",
            series: ["trajectory"],
          },
          {
            id: "velocity",
            label: "Velocity",
            xLabel: "t",
            yLabel: "v",
            series: ["velocity"],
          },
        ],
      },
    };

    const [target] = buildConceptTryThisShareTargets({
      source: simulationSource,
      conceptSlug: "projectile-motion",
      conceptTitle: "Projectile Motion",
      state: {
        params: {
          speed: 18,
          angle: 45,
          gravity: 9.8,
        },
        activePresetId: "earth-shot",
        activeGraphId: "velocity",
        overlayValues: {
          rangeMarker: true,
        },
        focusedOverlayId: "rangeMarker",
        time: 1.75,
        timeSource: "live",
        compare: null,
      },
    });

    expect(target).toEqual(
      expect.objectContaining({
        label: "Preset: Earth shot",
        buttonLabel: "Copy preset setup",
        ariaLabel: "Copy preset setup link",
      }),
    );

    expect(
      resolvePublicExperimentCard(
        new URL(target!.href, "https://openmodellab.local").searchParams.get("experiment") ??
          undefined,
        "projectile-motion",
      ),
    ).toEqual({
      title: "Earth shot",
      prompt: "Reopen this named preset setup and start adjusting the live controls immediately.",
      kind: "live-setup",
    });
  });

  it("builds guided featured setup targets through the same canonical state link seam", () => {
    const concept = getAllConcepts().find((entry) => entry.slug === "projectile-motion");

    expect(concept).toBeTruthy();

    const targets = buildConceptFeaturedSetupTargets({
      source: buildSimulationSource(concept!),
      conceptSlug: concept!.slug,
      setups: concept!.pageFramework?.featuredSetups ?? [],
    });

    expect(targets.map((target) => target.label)).toEqual(["Earth shot", "Moon hop"]);
    expect(targets[0]?.href).toMatch(
      /^\/concepts\/projectile-motion\?state=v1\.[A-Za-z0-9_-]+&experiment=v1\.[A-Za-z0-9_-]+#interactive-lab$/,
    );

    const resolvedState = resolveConceptSimulationState(
      new URL(targets[1]!.href, "https://openmodellab.local").searchParams.get("state") ?? undefined,
      buildSimulationSource(concept!),
    );

    expect(resolvedState?.activeGraphId).toBe("velocity");
    expect(resolvedState?.activePresetId).toBe("moon-hop");
    expect(
      resolvePublicExperimentCard(
        new URL(targets[1]!.href, "https://openmodellab.local").searchParams.get("experiment") ??
          undefined,
        concept!.slug,
      ),
    ).toEqual({
      title: "Moon hop",
      prompt: expect.stringMatching(/low-gravity launch/i),
      kind: "guided-setup",
    });
  });

  it("builds compare-aware try-this setup targets that can reopen a single setup or the full A/B state", () => {
    const simulationSource: ConceptSimulationStateSource = {
      slug: "projectile-motion",
      simulation: {
        defaults: {
          speed: 18,
          angle: 45,
          gravity: 9.8,
        },
        presets: [
          {
            id: "earth-shot",
            label: "Earth shot",
            values: {
              speed: 18,
              angle: 45,
              gravity: 9.8,
            },
          },
        ],
        overlays: [
          {
            id: "rangeMarker",
            label: "Range marker",
            shortDescription: "Marks the landing range.",
            whatToNotice: ["Range changes with launch conditions."],
            defaultOn: true,
          },
        ],
        graphs: [
          {
            id: "trajectory",
            label: "Trajectory",
            xLabel: "x",
            yLabel: "y",
            series: ["trajectory"],
          },
        ],
      },
    };

    const targets = buildConceptTryThisShareTargets({
      source: simulationSource,
      conceptSlug: "projectile-motion",
      conceptTitle: "Projectile Motion",
      state: {
        params: {
          speed: 18,
          angle: 60,
          gravity: 1.6,
        },
        activePresetId: null,
        activeGraphId: "trajectory",
        overlayValues: {
          rangeMarker: true,
        },
        focusedOverlayId: "rangeMarker",
        time: 0.9,
        timeSource: "inspect",
        compare: {
          activeTarget: "b",
          setupA: {
            label: "Earth baseline",
            params: {
              speed: 18,
              angle: 45,
              gravity: 9.8,
            },
            activePresetId: "earth-shot",
          },
          setupB: {
            label: "Moon variant",
            params: {
              speed: 18,
              angle: 60,
              gravity: 1.6,
            },
            activePresetId: null,
          },
        },
      },
    });

    expect(targets.map((target) => target.label)).toEqual([
      "Earth baseline vs Moon variant",
      "A: Earth baseline",
      "B: Moon variant",
    ]);
    expect(targets[0]?.buttonLabel).toBe("Copy compare setup");
    expect(targets[0]?.ariaLabel).toBe("Copy compare setup link");
    expect(targets[1]?.ariaLabel).toBe("Copy setup A link");
    expect(targets[2]?.ariaLabel).toBe("Copy setup B link");
    expect(targets[0]?.href).toMatch(
      /^\/concepts\/projectile-motion\?state=v1\.[A-Za-z0-9_-]+&experiment=v1\.[A-Za-z0-9_-]+#interactive-lab$/,
    );

    const compareState = resolveConceptSimulationState(
      new URL(targets[0]!.href, "https://openmodellab.local").searchParams.get("state") ?? undefined,
      simulationSource,
    );
    const setupAState = resolveConceptSimulationState(
      new URL(targets[1]!.href, "https://openmodellab.local").searchParams.get("state") ?? undefined,
      simulationSource,
    );
    const setupBState = resolveConceptSimulationState(
      new URL(targets[2]!.href, "https://openmodellab.local").searchParams.get("state") ?? undefined,
      simulationSource,
    );

    expect(compareState?.compare).toEqual({
      activeTarget: "b",
      setupA: {
        label: "Earth baseline",
        params: {
          speed: 18,
          angle: 45,
          gravity: 9.8,
        },
        activePresetId: "earth-shot",
      },
      setupB: {
        label: "Moon variant",
        params: {
          speed: 18,
          angle: 60,
          gravity: 1.6,
        },
        activePresetId: null,
      },
    });
    expect(setupAState).toEqual({
      params: {
        speed: 18,
        angle: 45,
        gravity: 9.8,
      },
      activePresetId: "earth-shot",
      activeGraphId: "trajectory",
      overlayValues: {
        rangeMarker: true,
      },
      focusedOverlayId: "rangeMarker",
      inspectTime: 0.9,
      compare: null,
    });
    expect(setupBState).toEqual({
      params: {
        speed: 18,
        angle: 60,
        gravity: 1.6,
      },
      activePresetId: null,
      activeGraphId: "trajectory",
      overlayValues: {
        rangeMarker: true,
      },
      focusedOverlayId: "rangeMarker",
      inspectTime: 0.9,
      compare: null,
    });
    expect(
      resolvePublicExperimentCard(
        new URL(targets[0]!.href, "https://openmodellab.local").searchParams.get("experiment") ??
          undefined,
        "projectile-motion",
      ),
    ).toEqual({
      title: "Earth baseline vs Moon variant",
      prompt: "Open this shared compare bench and start changing either setup in the live lab.",
      kind: "compare-setup",
    });
    expect(
      resolvePublicExperimentCard(
        new URL(targets[2]!.href, "https://openmodellab.local").searchParams.get("experiment") ??
          undefined,
        "projectile-motion",
      ),
    ).toEqual({
      title: "Moon variant",
      prompt: "Open this shared setup from the compare bench and start manipulating it in the live lab.",
      kind: "live-setup",
    });
    expect(
      resolvePublicExperimentCard(
        new URL(targets[0]!.href, "https://openmodellab.local").searchParams.get("experiment") ??
          undefined,
        "simple-harmonic-motion",
      ),
    ).toBeNull();
  });
});
