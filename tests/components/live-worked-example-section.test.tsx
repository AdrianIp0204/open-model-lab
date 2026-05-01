import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConceptLearningBridgeProvider, useConceptLearningBridge } from "@/components/concepts/ConceptLearningBridge";
import { LiveWorkedExampleSection } from "@/components/concepts/LiveWorkedExampleSection";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptPageRuntimeSnapshot } from "@/lib/learning/conceptPageRuntime";
import { localConceptProgressStore } from "@/lib/progress";

function WorkedExampleBridgeHarness({
  snapshot,
  onApplyAction,
}: {
  snapshot: ConceptPageRuntimeSnapshot | null;
  onApplyAction?: (action: unknown) => void;
}) {
  const {
    publishRuntimeSnapshot,
    registerWorkedExampleHandler,
  } = useConceptLearningBridge();

  useEffect(() => {
    publishRuntimeSnapshot(snapshot);
  }, [publishRuntimeSnapshot, snapshot]);

  useEffect(() => {
    registerWorkedExampleHandler({
      applyAction: (action) => onApplyAction?.(action),
      clearAction: () => {},
    });

    return () => {
      registerWorkedExampleHandler(null);
      publishRuntimeSnapshot(null);
    };
  }, [onApplyAction, publishRuntimeSnapshot, registerWorkedExampleHandler]);

  return null;
}

function textContentContains(fragment: string) {
  return (_content: string, element: Element | null) =>
    Boolean(element?.textContent?.includes(fragment));
}

describe("LiveWorkedExampleSection", () => {
  afterEach(() => {
    window.localStorage.clear();
    localConceptProgressStore.resetForTests();
  });

  it(
    "updates in live mode, freezes the current snapshot, and resumes live sync",
    async () => {
      const user = userEvent.setup();
      const concept = getConceptBySlug("simple-harmonic-motion");

      const initialSnapshot: ConceptPageRuntimeSnapshot = {
        slug: concept.slug,
        title: concept.title,
        topic: concept.topic,
        params: {
          amplitude: 1.4,
          omega: 1.8,
          phase: 0,
        },
        time: 0,
        timeSource: "live",
        activeGraphId: "displacement",
        interactionMode: "explore",
        activeCompareTarget: null,
        activePresetId: null,
        overlayValues: {},
        focusedOverlayId: null,
        featureAvailability: {
          prediction: true,
          compare: true,
          guidedOverlays: true,
          noticePrompts: true,
          workedExamples: true,
          quickTest: true,
        },
      };

      const { rerender } = render(
        <ConceptLearningBridgeProvider>
          <WorkedExampleBridgeHarness snapshot={initialSnapshot} />
          <LiveWorkedExampleSection concept={concept} />
        </ConceptLearningBridgeProvider>,
      );

      expect(screen.getByText(/Live at 0\.00/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^Live$/i })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: /^Frozen$/i })).toHaveAttribute("aria-pressed", "false");
      expect(screen.getByText(/1\.4 m/i)).toBeInTheDocument();

      rerender(
        <ConceptLearningBridgeProvider>
          <WorkedExampleBridgeHarness
            snapshot={{
              ...initialSnapshot,
              time: 0.5,
            }}
          />
          <LiveWorkedExampleSection concept={concept} />
        </ConceptLearningBridgeProvider>,
      );

      expect(screen.getByText(/Live at 0\.50/i)).toBeInTheDocument();
      expect(screen.getAllByText(/0\.87/i).length).toBeGreaterThan(0);

      await user.click(screen.getByRole("button", { name: /frozen/i }));

      rerender(
        <ConceptLearningBridgeProvider>
          <WorkedExampleBridgeHarness
            snapshot={{
              ...initialSnapshot,
              time: 1,
            }}
          />
          <LiveWorkedExampleSection concept={concept} />
        </ConceptLearningBridgeProvider>,
      );

      expect(screen.getByText(/Frozen values/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^Live$/i })).toHaveAttribute("aria-pressed", "false");
      expect(screen.getByRole("button", { name: /^Frozen$/i })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByText(/Live at 0\.50/i)).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /^Live$/i }));

      expect(screen.getByRole("button", { name: /^Live$/i })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: /^Frozen$/i })).toHaveAttribute("aria-pressed", "false");
      expect(screen.getByText(/Live at 1\.00/i)).toBeInTheDocument();
    },
    10000,
  );

  it("renders a frozen premium cue for free-tier mode without exposing live interaction", async () => {
    const user = userEvent.setup();
    const concept = getConceptBySlug("projectile-motion");

    const initialSnapshot: ConceptPageRuntimeSnapshot = {
      slug: concept.slug,
      title: concept.title,
      topic: concept.topic,
      params: {
        speed: 18,
        angle: 45,
        gravity: 9.8,
      },
      time: 0.4,
      timeSource: "inspect",
      activeGraphId: "trajectory",
      interactionMode: "explore",
      activeCompareTarget: null,
      activePresetId: null,
      overlayValues: {},
      focusedOverlayId: null,
      featureAvailability: {
        prediction: true,
        compare: true,
        guidedOverlays: true,
        noticePrompts: true,
        workedExamples: true,
        quickTest: true,
      },
    };

    const { rerender } = render(
      <ConceptLearningBridgeProvider initialRuntimeSnapshot={initialSnapshot}>
        <WorkedExampleBridgeHarness snapshot={initialSnapshot} />
        <LiveWorkedExampleSection concept={concept} mode="frozen" />
      </ConceptLearningBridgeProvider>,
    );

    expect(screen.getAllByText(/^Frozen walkthrough$/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        new RegExp(`Example 1 of ${concept.sections.workedExamples.items.length}`, "i"),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Supporter unlocks saved study tools, exact-state sharing, and the richer review surfaces that support this guided flow\./i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Frozen values/i)).toBeInTheDocument();
    expect(screen.getByText(/Using frozen parameters/i)).toBeInTheDocument();
    expect(screen.getAllByText(/18 m\/s/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /^Live$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Frozen$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /lock current values/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /apply earth shot/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view plans/i })).toHaveAttribute(
      "href",
      "/pricing#compare",
    );

    await user.click(
      screen.getByRole("button", { name: /velocity components at the current time/i }),
    );
    expect(
      screen.getByText(
        new RegExp(
          `Example ${
            concept.sections.workedExamples.items.findIndex(
              (item) => item.title === "Velocity components at the current time",
            ) + 1
          } of ${concept.sections.workedExamples.items.length}`,
          "i",
        ),
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Frozen at 0\.40/i)).toBeInTheDocument();
    expect(screen.getAllByText(/12\.73/i).length).toBeGreaterThan(0);

    rerender(
      <ConceptLearningBridgeProvider initialRuntimeSnapshot={initialSnapshot}>
        <WorkedExampleBridgeHarness
          snapshot={{
            ...initialSnapshot,
            time: 0.9,
            params: {
              ...initialSnapshot.params,
              speed: 24,
            },
          }}
        />
        <LiveWorkedExampleSection concept={concept} mode="frozen" />
      </ConceptLearningBridgeProvider>,
    );

    expect(screen.getByText(/Frozen at 0\.40/i)).toBeInTheDocument();
    expect(screen.queryByText(/24 m\/s/i)).not.toBeInTheDocument();
  });

  it("can apply a worked-example state through the live bridge", async () => {
    const user = userEvent.setup();
    const onApplyAction = vi.fn();
    const concept = getConceptBySlug("projectile-motion");

    render(
      <ConceptLearningBridgeProvider>
        <WorkedExampleBridgeHarness
          snapshot={{
            slug: concept.slug,
            title: concept.title,
            topic: concept.topic,
            params: {
              speed: 18,
              angle: 45,
              gravity: 9.8,
            },
            time: 0.4,
            timeSource: "inspect",
            activeGraphId: "trajectory",
            interactionMode: "explore",
            activeCompareTarget: null,
            activePresetId: null,
            overlayValues: {},
            focusedOverlayId: null,
            featureAvailability: {
              prediction: true,
              compare: true,
              guidedOverlays: true,
              noticePrompts: true,
              workedExamples: true,
              quickTest: true,
            },
          }}
          onApplyAction={onApplyAction}
        />
        <LiveWorkedExampleSection concept={concept} />
      </ConceptLearningBridgeProvider>,
    );

    const earthShotButton = screen.getByRole("button", { name: /^predicted range$/i });
    const velocityComponentsButton = screen.getByRole("button", {
      name: /velocity components at the current time/i,
    });

    expect(earthShotButton).toHaveAttribute("aria-pressed", "true");
    expect(velocityComponentsButton).toHaveAttribute("aria-pressed", "false");

    await user.click(screen.getByRole("button", { name: /apply earth shot/i }));

    expect(onApplyAction).toHaveBeenCalledWith(
      expect.objectContaining({
        presetId: "earth-shot",
        highlightedGraphIds: ["trajectory"],
      }),
    );
    expect(screen.getByText(/Example state applied/i)).toBeInTheDocument();
    expect(screen.getByText(/Compare the range marker on the stage/i)).toBeInTheDocument();

    await user.click(velocityComponentsButton);

    expect(earthShotButton).toHaveAttribute("aria-pressed", "false");
    expect(velocityComponentsButton).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText(/Example state applied/i)).not.toBeInTheDocument();
  });

  it("renders authored static worked examples when no runtime builder exists", () => {
    const concept = getConceptBySlug("exponential-change-growth-decay-logarithms");

    render(
      <ConceptLearningBridgeProvider
        initialRuntimeSnapshot={{
          slug: concept.slug,
          title: concept.title,
          topic: concept.topic,
          params: {
            initialValue: 3,
            rate: 0.25,
            targetValue: 12,
          },
          time: 0,
          timeSource: "inspect",
          activeGraphId: "change-curve",
          interactionMode: "explore",
          activeCompareTarget: null,
          activePresetId: "growth-to-target",
          overlayValues: {
            targetMarker: true,
            pairedRate: true,
            doublingHalfLife: true,
            logGuide: true,
          },
          focusedOverlayId: null,
          featureAvailability: {
            prediction: true,
            compare: true,
            guidedOverlays: true,
            noticePrompts: true,
            workedExamples: true,
            quickTest: true,
          },
        }}
      >
        <LiveWorkedExampleSection concept={concept} />
      </ConceptLearningBridgeProvider>,
    );

    expect(
      screen.getByText(/A population starts at 3 units and grows at a continuous rate of 0\.25/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(textContentContains("The curve reaches the target after about")).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(textContentContains("5.55 time units")).length).toBeGreaterThan(0);
  });

  it("resolves the momentum/impulse worked examples against the live pulse state", async () => {
    const user = userEvent.setup();
    const onApplyAction = vi.fn();
    const concept = getConceptBySlug("momentum-impulse");

    render(
      <ConceptLearningBridgeProvider>
        <WorkedExampleBridgeHarness
          snapshot={{
            slug: concept.slug,
            title: concept.title,
            topic: concept.topic,
            params: {
              mass: 1.5,
              initialVelocity: 0.6,
              force: 3,
              pulseDuration: 0.4,
            },
            time: 0.6,
            timeSource: "inspect",
            activeGraphId: "momentum",
            interactionMode: "explore",
            activeCompareTarget: null,
            activePresetId: null,
            overlayValues: {},
            focusedOverlayId: null,
            featureAvailability: {
              prediction: true,
              compare: true,
              guidedOverlays: true,
              noticePrompts: true,
              workedExamples: true,
              quickTest: true,
            },
          }}
          onApplyAction={onApplyAction}
        />
        <LiveWorkedExampleSection concept={concept} />
      </ConceptLearningBridgeProvider>,
    );

    expect(screen.getByText(/Paused at 0\.60/i)).toBeInTheDocument();
    expect(
      screen.getByText(/The pulse is active right now, so the momentum is still changing linearly/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /impulse from the pulse/i }));

    expect(screen.getByText(/This is a short, strong push/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /apply long gentle push/i }));

    expect(onApplyAction).toHaveBeenCalledWith(
      expect.objectContaining({
        presetId: "long-gentle-push",
        highlightedGraphIds: ["force", "impulse", "momentum"],
      }),
    );
    expect(screen.getByText(/Compare the wider force pulse/i)).toBeInTheDocument();
  });

  it("resolves the conservation-of-momentum worked examples against the live system state", async () => {
    const user = userEvent.setup();
    const onApplyAction = vi.fn();
    const concept = getConceptBySlug("conservation-of-momentum");

    render(
      <ConceptLearningBridgeProvider>
        <WorkedExampleBridgeHarness
          snapshot={{
            slug: concept.slug,
            title: concept.title,
            topic: concept.topic,
            params: {
              massA: 1.2,
              massB: 2.4,
              systemVelocity: 0.5,
              interactionForce: 1.6,
              interactionDuration: 0.5,
            },
            time: 0.7,
            timeSource: "inspect",
            activeGraphId: "momenta",
            interactionMode: "explore",
            activeCompareTarget: null,
            activePresetId: null,
            overlayValues: {},
            focusedOverlayId: null,
            featureAvailability: {
              prediction: true,
              compare: true,
              guidedOverlays: true,
              noticePrompts: true,
              workedExamples: true,
              quickTest: true,
            },
          }}
          onApplyAction={onApplyAction}
        />
        <LiveWorkedExampleSection concept={concept} />
      </ConceptLearningBridgeProvider>,
    );

    expect(
      screen.getByText(/the carts are exchanging internal forces right now, but the total momentum still stays fixed/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /final momentum split/i }));

    expect(screen.getByText(/cart a is lighter, so the same equal-and-opposite momentum change/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /apply long gentle split/i }));

    expect(onApplyAction).toHaveBeenCalledWith(
      expect.objectContaining({
        presetId: "long-gentle-split",
        highlightedGraphIds: ["forces", "momenta"],
      }),
    );
    expect(screen.getByText(/Compare the lower, wider force pair/i)).toBeInTheDocument();
  });

  it("resolves the collisions worked examples against the live collision state", async () => {
    const user = userEvent.setup();
    const onApplyAction = vi.fn();
    const concept = getConceptBySlug("collisions");

    render(
      <ConceptLearningBridgeProvider>
        <WorkedExampleBridgeHarness
          snapshot={{
            slug: concept.slug,
            title: concept.title,
            topic: concept.topic,
            params: {
              massA: 1.5,
              massB: 1.5,
              speedA: 1.6,
              speedB: 0,
              elasticity: 0,
            },
            time: 4,
            timeSource: "inspect",
            activeGraphId: "momentum",
            interactionMode: "explore",
            activeCompareTarget: null,
            activePresetId: null,
            overlayValues: {
              collisionZone: true,
              centerOfMass: true,
              relativeSpeed: true,
              momentumBars: true,
            },
            focusedOverlayId: null,
            featureAvailability: {
              prediction: true,
              compare: true,
              guidedOverlays: true,
              noticePrompts: true,
              workedExamples: true,
              quickTest: true,
            },
          }}
          onApplyAction={onApplyAction}
        />
        <LiveWorkedExampleSection concept={concept} />
      </ConceptLearningBridgeProvider>,
    );

    expect(
      screen.getByText(/the collision has already happened, but the system total stays unchanged/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /post-collision velocities/i }));

    expect(
      screen.getByText(/With e = 0, the carts leave together with one shared velocity/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /apply sticky collision/i }));

    expect(onApplyAction).toHaveBeenCalledWith(
      expect.objectContaining({
        presetId: "sticky-collision",
        highlightedGraphIds: ["momentum", "energy"],
      }),
    );
    expect(
      screen.getByText(/Watch the total momentum line stay flat while the total kinetic energy drops/i),
    ).toBeInTheDocument();
  });

  it("resolves the oscillation-energy worked examples against live energy state", async () => {
    const user = userEvent.setup();
    const onApplyAction = vi.fn();
    const concept = getConceptBySlug("oscillation-energy");

    render(
      <ConceptLearningBridgeProvider>
        <WorkedExampleBridgeHarness
          snapshot={{
            slug: concept.slug,
            title: concept.title,
            topic: concept.topic,
            params: {
              amplitude: 1,
              springConstant: 2,
              mass: 1,
              phase: 0,
            },
            time: 0,
            timeSource: "inspect",
            activeGraphId: "energy",
            interactionMode: "explore",
            activeCompareTarget: null,
            activePresetId: null,
            overlayValues: {},
            focusedOverlayId: null,
            featureAvailability: {
              prediction: true,
              compare: true,
              guidedOverlays: true,
              noticePrompts: true,
              workedExamples: true,
              quickTest: true,
            },
          }}
          onApplyAction={onApplyAction}
        />
        <LiveWorkedExampleSection concept={concept} />
      </ConceptLearningBridgeProvider>,
    );

    expect(screen.getAllByText(/1 kg/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/2 N\/m/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /total energy from amplitude/i }));

    expect(screen.getAllByText(/1 m/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /show wide arc/i }));

    expect(onApplyAction).toHaveBeenCalledWith(
      expect.objectContaining({
        presetId: "wide-arc",
        highlightedGraphIds: ["energy", "displacement"],
      }),
    );
    expect(screen.getByText(/turning points move outward/i)).toBeInTheDocument();
  });

  it("resolves the vectors/components worked examples against the live runtime state", async () => {
    const user = userEvent.setup();
    const onApplyAction = vi.fn();
    const concept = getConceptBySlug("vectors-components");

    render(
      <ConceptLearningBridgeProvider>
        <WorkedExampleBridgeHarness
          snapshot={{
            slug: concept.slug,
            title: concept.title,
            topic: concept.topic,
            params: {
              magnitude: 8,
              angle: 35,
            },
            time: 1.5,
            timeSource: "inspect",
            activeGraphId: "position",
            interactionMode: "explore",
            activeCompareTarget: null,
            activePresetId: null,
            overlayValues: {},
            focusedOverlayId: null,
            featureAvailability: {
              prediction: true,
              compare: true,
              guidedOverlays: true,
              noticePrompts: true,
              workedExamples: true,
              quickTest: true,
            },
          }}
          onApplyAction={onApplyAction}
        />
        <LiveWorkedExampleSection concept={concept} />
      </ConceptLearningBridgeProvider>,
    );

    expect(screen.getAllByText(/6\.55/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/4\.59/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /current displacement/i }));

    expect(screen.getAllByText(/9\.83/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/6\.88/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /show downward dive/i }));

    expect(onApplyAction).toHaveBeenCalledWith(
      expect.objectContaining({
        presetId: "downward-dive",
        highlightedGraphIds: ["path", "position"],
      }),
    );
    expect(screen.getByText(/negative vertical component/i)).toBeInTheDocument();
  });

  it("resolves the electric-fields worked examples against the live field state", async () => {
    const user = userEvent.setup();
    const onApplyAction = vi.fn();
    const concept = getConceptBySlug("electric-fields");

    render(
      <ConceptLearningBridgeProvider>
        <WorkedExampleBridgeHarness
          snapshot={{
            slug: concept.slug,
            title: concept.title,
            topic: concept.topic,
            params: {
              sourceChargeA: 2,
              sourceChargeB: 2,
              sourceSeparation: 2,
              probeX: 0,
              probeY: 1,
              testCharge: -0.5,
            },
            time: 0,
            timeSource: "inspect",
            activeGraphId: "field-scan",
            interactionMode: "explore",
            activeCompareTarget: null,
            activePresetId: null,
            overlayValues: {
              fieldGrid: true,
              fieldVectors: true,
              forceVector: true,
              scanLine: true,
            },
            focusedOverlayId: null,
            featureAvailability: {
              prediction: true,
              compare: true,
              guidedOverlays: true,
              noticePrompts: true,
              workedExamples: true,
              quickTest: true,
            },
          }}
          onApplyAction={onApplyAction}
        />
        <LiveWorkedExampleSection concept={concept} />
      </ConceptLearningBridgeProvider>,
    );

    expect(screen.getAllByText(textContentContains("1.41")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(textContentContains("0.71")).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /current net field at the probe/i }));
    expect(screen.getAllByText(textContentContains("1.41")).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /show balanced like-charge arch/i }));

    expect(onApplyAction).toHaveBeenCalledWith(
      expect.objectContaining({
        presetId: "like-charge-arch",
        highlightedGraphIds: ["field-scan", "direction-scan"],
      }),
    );

    await user.click(screen.getByRole("button", { name: /current force on the test charge/i }));
    await user.click(screen.getByRole("button", { name: /flip to a negative test charge/i }));

    expect(onApplyAction).toHaveBeenCalledWith(
      expect.objectContaining({
        presetId: "negative-test-charge",
        highlightedOverlayIds: ["fieldVectors", "forceVector"],
      }),
    );
  });

  it("resolves the basic-circuits worked examples against the live circuit state", async () => {
    const user = userEvent.setup();
    const onApplyAction = vi.fn();
    const concept = getConceptBySlug("basic-circuits");

    render(
      <ConceptLearningBridgeProvider>
        <WorkedExampleBridgeHarness
          snapshot={{
            slug: concept.slug,
            title: concept.title,
            topic: concept.topic,
            params: {
              voltage: 12,
              resistanceA: 4,
              resistanceB: 12,
              parallelMode: true,
            },
            time: 0,
            timeSource: "inspect",
            activeGraphId: "current-map",
            interactionMode: "explore",
            activeCompareTarget: null,
            activePresetId: null,
            overlayValues: {
              currentArrows: true,
              voltageDrops: true,
              nodeGuide: true,
            },
            focusedOverlayId: null,
            featureAvailability: {
              prediction: true,
              compare: true,
              guidedOverlays: true,
              noticePrompts: true,
              workedExamples: true,
              quickTest: true,
            },
          }}
          onApplyAction={onApplyAction}
        />
        <LiveWorkedExampleSection concept={concept} />
      </ConceptLearningBridgeProvider>,
    );

    expect(screen.getByText(/Following current parameters/i)).toBeInTheDocument();
    expect(screen.getAllByText(/12 V/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/4 ohm/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/12 ohm/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /branch b current and voltage/i }));

    expect(
      screen.getByText(
        /Branch B draws less current because both branches see the same battery voltage/i,
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /show branch split/i }));

    expect(onApplyAction).toHaveBeenCalledWith(
      expect.objectContaining({
        presetId: "branch-split",
        highlightedOverlayIds: ["currentArrows", "nodeGuide"],
      }),
    );
    expect(
      screen.getByText(
        /the blue branch keeps the full battery voltage but carries less current/i,
      ),
    ).toBeInTheDocument();
  });

  it("resolves the power/energy circuits worked examples against the live source-load state", async () => {
    const user = userEvent.setup();
    const onApplyAction = vi.fn();
    const concept = getConceptBySlug("power-energy-circuits");

    render(
      <ConceptLearningBridgeProvider>
        <WorkedExampleBridgeHarness
          snapshot={{
            slug: concept.slug,
            title: concept.title,
            topic: concept.topic,
            params: {
              voltage: 12,
              loadResistance: 8,
            },
            time: 3,
            timeSource: "inspect",
            activeGraphId: "energy-transfer",
            interactionMode: "explore",
            activeCompareTarget: null,
            activePresetId: null,
            overlayValues: {
              currentArrows: true,
              voltageLabels: true,
              powerGlow: true,
              energyMeter: true,
            },
            focusedOverlayId: null,
            featureAvailability: {
              prediction: true,
              compare: true,
              guidedOverlays: true,
              noticePrompts: true,
              workedExamples: true,
              quickTest: true,
            },
          }}
          onApplyAction={onApplyAction}
        />
        <LiveWorkedExampleSection concept={concept} />
      </ConceptLearningBridgeProvider>,
    );

    expect(screen.getByText(/Following current parameters/i)).toBeInTheDocument();
    expect(
      screen.getByText(/For the current source and load, what current flows and how much power/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /current and power right now/i }));
    expect(screen.getByText(/moderate-power setup/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /show boosted source/i }));
    expect(onApplyAction).toHaveBeenCalledWith(
      expect.objectContaining({
        presetId: "boosted-source",
        highlightedGraphIds: ["current-voltage", "power-voltage"],
      }),
    );

    await user.click(screen.getByRole("button", { name: /energy delivered by the current time/i }));
    expect(screen.getByText(/Paused at 3\.00/i)).toBeInTheDocument();
    expect(screen.getAllByText(textContentContains("54")).length).toBeGreaterThan(0);
    expect(screen.getByText(/growing linearly with time/i)).toBeInTheDocument();
  });

  it("resolves the series/parallel circuits worked examples against the live branch state", async () => {
    const user = userEvent.setup();
    const onApplyAction = vi.fn();
    const concept = getConceptBySlug("series-parallel-circuits");

    render(
      <ConceptLearningBridgeProvider>
        <WorkedExampleBridgeHarness
          snapshot={{
            slug: concept.slug,
            title: concept.title,
            topic: concept.topic,
            params: {
              voltage: 12,
              resistanceA: 4,
              resistanceB: 12,
              parallelMode: true,
            },
            time: 4,
            timeSource: "inspect",
            activeGraphId: "load-power",
            interactionMode: "explore",
            activeCompareTarget: null,
            activePresetId: null,
            overlayValues: {
              currentFlow: true,
              voltageLabels: true,
              brightnessGuide: true,
              nodeGuide: true,
            },
            focusedOverlayId: null,
            featureAvailability: {
              prediction: true,
              compare: true,
              guidedOverlays: true,
              noticePrompts: true,
              workedExamples: true,
              quickTest: true,
            },
          }}
          onApplyAction={onApplyAction}
        />
        <LiveWorkedExampleSection concept={concept} />
      </ConceptLearningBridgeProvider>,
    );

    expect(screen.getByText(/Following current parameters/i)).toBeInTheDocument();
    expect(screen.getAllByText(/12 V/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/4 ohm/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/12 ohm/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /load b rate and brightness/i }));

    expect(
      screen.getByText(
        /Load B is dimmer because both branches see the same battery voltage/i,
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /show unequal parallel pair/i }));

    expect(onApplyAction).toHaveBeenCalledWith(
      expect.objectContaining({
        presetId: "parallel-unequal-loads",
        highlightedGraphIds: ["branch-current", "load-power"],
      }),
    );
    expect(
      screen.getByText(/Load B keeps the full battery voltage in parallel/i),
    ).toBeInTheDocument();
  });

  it("resolves the equivalent-resistance worked examples against the live grouped state", async () => {
    const user = userEvent.setup();
    const onApplyAction = vi.fn();
    const concept = getConceptBySlug("equivalent-resistance");

    render(
      <ConceptLearningBridgeProvider>
        <WorkedExampleBridgeHarness
          snapshot={{
            slug: concept.slug,
            title: concept.title,
            topic: concept.topic,
            params: {
              voltage: 18,
              resistance1: 6,
              resistance2: 6,
              resistance3: 6,
              groupParallel: true,
            },
            time: 4,
            timeSource: "inspect",
            activeGraphId: "equivalent-map",
            interactionMode: "explore",
            activeCompareTarget: null,
            activePresetId: null,
            overlayValues: {
              currentFlow: true,
              voltageLabels: true,
              reductionGuide: true,
              nodeGuide: true,
            },
            focusedOverlayId: null,
            featureAvailability: {
              prediction: true,
              compare: true,
              guidedOverlays: true,
              noticePrompts: true,
              workedExamples: true,
              quickTest: true,
            },
          }}
          onApplyAction={onApplyAction}
        />
        <LiveWorkedExampleSection concept={concept} />
      </ConceptLearningBridgeProvider>,
    );

    expect(screen.getByText(/Following current parameters/i)).toBeInTheDocument();
    expect(screen.getAllByText(/18 V/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/6 ohm/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /group voltage and resistor-3 charge/i }));

    expect(
      screen.getByText(/Matching grouped branches keep the same group voltage/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /show unequal parallel group/i }));

    expect(onApplyAction).toHaveBeenCalledWith(
      expect.objectContaining({
        presetId: "parallel-group-unequal",
        highlightedGraphIds: ["current-map", "voltage-share"],
      }),
    );
    expect(
      screen.getByText(/R3 keeps the full group voltage in parallel/i),
    ).toBeInTheDocument();
  });

  it("resolves the Kirchhoff worked examples against the live grouped circuit state", async () => {
    const user = userEvent.setup();
    const onApplyAction = vi.fn();
    const concept = getConceptBySlug("kirchhoff-loop-and-junction-rules");

    render(
      <ConceptLearningBridgeProvider>
        <WorkedExampleBridgeHarness
          snapshot={{
            slug: concept.slug,
            title: concept.title,
            topic: concept.topic,
            params: {
              voltage: 12,
              resistance1: 4,
              resistance2: 6,
              resistance3: 12,
              groupParallel: true,
            },
            time: 0,
            timeSource: "inspect",
            activeGraphId: "current-map",
            interactionMode: "explore",
            activeCompareTarget: null,
            activePresetId: null,
            overlayValues: {
              currentFlow: true,
              voltageLabels: true,
              nodeGuide: true,
              loopGuide: true,
              reductionGuide: false,
            },
            focusedOverlayId: null,
            featureAvailability: {
              prediction: true,
              compare: true,
              guidedOverlays: true,
              noticePrompts: true,
              workedExamples: true,
              quickTest: true,
            },
          }}
          onApplyAction={onApplyAction}
        />
        <LiveWorkedExampleSection concept={concept} />
      </ConceptLearningBridgeProvider>,
    );

    expect(screen.getAllByText(textContentContains("1.5")).length).toBeGreaterThan(0);

    await user.click(
      screen.getByRole("button", { name: /junction balance and the missing branch current/i }),
    );
    expect(
      screen.getByText(/larger-resistance branch keeps the smaller current/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /loop balance around the r3 branch/i }));
    expect(screen.getByText(/lower branch loop balances/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /show the clean series loop/i }));

    expect(onApplyAction).toHaveBeenCalledWith(
      expect.objectContaining({
        presetId: "series-clean-loop",
        highlightedOverlayIds: ["voltageLabels", "loopGuide"],
      }),
    );
  });

  it("resolves the RC worked examples against the live transient state", async () => {
    const user = userEvent.setup();
    const onApplyAction = vi.fn();
    const concept = getConceptBySlug("rc-charging-and-discharging");

    render(
      <ConceptLearningBridgeProvider>
        <WorkedExampleBridgeHarness
          snapshot={{
            slug: concept.slug,
            title: concept.title,
            topic: concept.topic,
            params: {
              sourceVoltage: 8,
              resistance: 2,
              capacitance: 1,
              charging: true,
            },
            time: 2,
            timeSource: "inspect",
            activeGraphId: "voltage-time",
            interactionMode: "explore",
            activeCompareTarget: null,
            activePresetId: null,
            overlayValues: {
              currentFlow: true,
              voltageLabels: true,
              tauMarkers: true,
              chargeCue: true,
              energyStore: true,
            },
            focusedOverlayId: null,
            featureAvailability: {
              prediction: true,
              compare: true,
              guidedOverlays: true,
              noticePrompts: true,
              workedExamples: true,
              quickTest: true,
            },
          }}
          onApplyAction={onApplyAction}
        />
        <LiveWorkedExampleSection concept={concept} />
      </ConceptLearningBridgeProvider>,
    );

    expect(screen.getAllByText(textContentContains("2")).length).toBeGreaterThan(0);

    await user.click(
      screen.getByRole("button", { name: /time constant and capacitor voltage/i }),
    );
    expect(screen.getByText(/already close to the source value/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /current and stored energy/i }));
    expect(screen.getByText(/stored energy rises slowly at first/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /show discharge/i }));

    expect(onApplyAction).toHaveBeenCalledWith(
      expect.objectContaining({
        presetId: "discharge-starter",
        highlightedOverlayIds: ["currentFlow", "energyStore"],
      }),
    );
  });

  it("resolves the internal-resistance worked examples against the live source state", async () => {
    const user = userEvent.setup();
    const onApplyAction = vi.fn();
    const concept = getConceptBySlug("internal-resistance-and-terminal-voltage");

    render(
      <ConceptLearningBridgeProvider>
        <WorkedExampleBridgeHarness
          snapshot={{
            slug: concept.slug,
            title: concept.title,
            topic: concept.topic,
            params: {
              emf: 12,
              internalResistance: 2,
              loadResistance: 2,
            },
            time: 0,
            timeSource: "live",
            activeGraphId: "terminal-response",
            interactionMode: "explore",
            activeCompareTarget: null,
            activePresetId: null,
            overlayValues: {
              currentFlow: true,
              voltageLabels: true,
              powerSplit: true,
              idealReference: true,
            },
            focusedOverlayId: null,
            featureAvailability: {
              prediction: true,
              compare: true,
              guidedOverlays: true,
              noticePrompts: true,
              workedExamples: true,
              quickTest: true,
            },
          }}
          onApplyAction={onApplyAction}
        />
        <LiveWorkedExampleSection concept={concept} />
      </ConceptLearningBridgeProvider>,
    );

    expect(screen.getAllByText(textContentContains("6")).length).toBeGreaterThan(0);

    await user.click(
      screen.getByRole("button", { name: /current and terminal voltage under load/i }),
    );
    expect(screen.getByText(/heavy load pulls a large current/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /power delivered to the load vs power lost inside the source/i }));
    expect(screen.getByText(/visible share is still being lost inside the source/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /show low-r reference/i }));

    expect(onApplyAction).toHaveBeenCalledWith(
      expect.objectContaining({
        presetId: "near-ideal-source",
        highlightedOverlayIds: ["powerSplit", "idealReference"],
      }),
    );
  });

  it("resolves the electric-potential worked examples against the live potential state", async () => {
    const user = userEvent.setup();
    const onApplyAction = vi.fn();
    const concept = getConceptBySlug("electric-potential");

    render(
      <ConceptLearningBridgeProvider>
        <WorkedExampleBridgeHarness
          snapshot={{
            slug: concept.slug,
            title: concept.title,
            topic: concept.topic,
            params: {
              sourceChargeA: 2,
              sourceChargeB: 2,
              sourceSeparation: 2,
              probeX: 0,
              probeY: 1,
              testCharge: -0.5,
            },
            time: 0,
            timeSource: "inspect",
            activeGraphId: "potential-scan",
            interactionMode: "explore",
            activeCompareTarget: null,
            activePresetId: null,
            overlayValues: {
              potentialMap: true,
              equipotentialContours: true,
              fieldArrow: true,
              scanLine: true,
            },
            focusedOverlayId: null,
            featureAvailability: {
              prediction: true,
              compare: true,
              guidedOverlays: true,
              noticePrompts: true,
              workedExamples: true,
              quickTest: true,
            },
          }}
          onApplyAction={onApplyAction}
        />
        <LiveWorkedExampleSection concept={concept} />
      </ConceptLearningBridgeProvider>,
    );

    expect(screen.getAllByText(textContentContains("2.83")).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /current net potential at the probe/i }));
    expect(screen.getAllByText(textContentContains("2.83")).length).toBeGreaterThan(0);

    await user.click(
      screen.getByRole("button", { name: /current potential energy of the test charge/i }),
    );
    expect(screen.getByText(/opposite signs here, so the potential energy is negative/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /show negative test-charge energy/i }));

    expect(onApplyAction).toHaveBeenCalledWith(
      expect.objectContaining({
        presetId: "negative-test-energy",
        highlightedOverlayIds: ["potentialMap", "fieldArrow"],
      }),
    );
  });

  it("resolves the capacitance worked examples against the live capacitor state", async () => {
    const user = userEvent.setup();
    const onApplyAction = vi.fn();
    const concept = getConceptBySlug("capacitance-and-stored-electric-energy");

    render(
      <ConceptLearningBridgeProvider>
        <WorkedExampleBridgeHarness
          snapshot={{
            slug: concept.slug,
            title: concept.title,
            topic: concept.topic,
            params: {
              plateArea: 2,
              plateSeparation: 2,
              batteryVoltage: 4,
            },
            time: 0,
            timeSource: "inspect",
            activeGraphId: "voltage-response",
            interactionMode: "explore",
            activeCompareTarget: null,
            activePresetId: null,
            overlayValues: {
              fieldRegion: true,
              chargeDensityCue: true,
              geometryGuide: true,
              energyStore: true,
            },
            focusedOverlayId: null,
            featureAvailability: {
              prediction: true,
              compare: true,
              guidedOverlays: true,
              noticePrompts: true,
              workedExamples: true,
              quickTest: true,
            },
          }}
          onApplyAction={onApplyAction}
        />
        <LiveWorkedExampleSection concept={concept} />
      </ConceptLearningBridgeProvider>,
    );

    expect(screen.getAllByText(textContentContains("1")).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /current capacitance/i }));
    expect(screen.getByText(/moderate capacitance/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /current stored electric energy/i }));
    expect(screen.getByText(/middle-voltage setup/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /show higher-voltage storage/i }));

    expect(onApplyAction).toHaveBeenCalledWith(
      expect.objectContaining({
        presetId: "high-voltage-storage",
        highlightedOverlayIds: ["fieldRegion", "energyStore"],
      }),
    );
  });

  it("resolves the wave-speed-wavelength worked examples against the live traveling-wave state", async () => {
    const user = userEvent.setup();
    const onApplyAction = vi.fn();
    const concept = getConceptBySlug("wave-speed-wavelength");

    render(
      <ConceptLearningBridgeProvider>
        <WorkedExampleBridgeHarness
          snapshot={{
            slug: concept.slug,
            title: concept.title,
            topic: concept.topic,
            params: {
              amplitude: 1,
              waveSpeed: 2.4,
              wavelength: 1.6,
              probeX: 2.4,
            },
            time: 0,
            timeSource: "inspect",
            activeGraphId: "phase-map",
            interactionMode: "explore",
            activeCompareTarget: null,
            activePresetId: null,
            overlayValues: {},
            focusedOverlayId: null,
            featureAvailability: {
              prediction: true,
              compare: true,
              guidedOverlays: true,
              noticePrompts: true,
              workedExamples: true,
              quickTest: true,
            },
          }}
          onApplyAction={onApplyAction}
        />
        <LiveWorkedExampleSection concept={concept} />
      </ConceptLearningBridgeProvider>,
    );

    expect(screen.getAllByText(textContentContains("2.4 m/s")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(textContentContains("1.5")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(textContentContains("0.67")).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /probe delay and phase lag/i }));

    expect(screen.getAllByText(textContentContains("1 s")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(textContentContains("1.5")).length).toBeGreaterThan(0);
    expect(screen.getByText(/out of phase/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /show one full-cycle lag/i }));

    expect(onApplyAction).toHaveBeenCalledWith(
      expect.objectContaining({
        presetId: "one-wavelength-away",
        highlightedGraphIds: ["phase-map", "displacement"],
      }),
    );
    expect(screen.getByText(/one wavelength away repeats the source phase/i)).toBeInTheDocument();
  });

  it("resolves the wave-interference worked examples against the live screen geometry", async () => {
    const user = userEvent.setup();
    const onApplyAction = vi.fn();
    const concept = getConceptBySlug("wave-interference");

    render(
      <ConceptLearningBridgeProvider>
        <WorkedExampleBridgeHarness
          snapshot={{
            slug: concept.slug,
            title: concept.title,
            topic: concept.topic,
            params: {
              amplitudeA: 1,
              amplitudeB: 1,
              wavelength: 1.6,
              phaseOffset: 0,
              probeY: 0.8,
            },
            time: 0.2,
            timeSource: "inspect",
            activeGraphId: "pattern",
            interactionMode: "explore",
            activeCompareTarget: null,
            activePresetId: null,
            overlayValues: {},
            focusedOverlayId: null,
            featureAvailability: {
              prediction: true,
              compare: true,
              guidedOverlays: true,
              noticePrompts: true,
              workedExamples: true,
              quickTest: true,
            },
          }}
          onApplyAction={onApplyAction}
        />
        <LiveWorkedExampleSection concept={concept} />
      </ConceptLearningBridgeProvider>,
    );

    expect(screen.getAllByText(/0\.8 m/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/0\.26/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1\.02/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /combined amplitude at the probe/i }));

    expect(screen.getAllByText(/1\.74/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/0\.76/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /show incomplete cancellation/i }));

    expect(onApplyAction).toHaveBeenCalledWith(
      expect.objectContaining({
        presetId: "unequal-sources",
        highlightedGraphIds: ["displacement", "pattern"],
      }),
    );
    expect(screen.getByText(/leftover combined motion instead of a perfect null/i)).toBeInTheDocument();
  });

  it("resolves the diffraction worked examples against the live slit geometry", async () => {
    const user = userEvent.setup();
    const onApplyAction = vi.fn();
    const concept = getConceptBySlug("diffraction");

    render(
      <ConceptLearningBridgeProvider>
        <WorkedExampleBridgeHarness
          snapshot={{
            slug: concept.slug,
            title: concept.title,
            topic: concept.topic,
            params: {
              wavelength: 1,
              slitWidth: 2.4,
              probeY: 2.55,
            },
            time: 0.2,
            timeSource: "inspect",
            activeGraphId: "pattern",
            interactionMode: "explore",
            activeCompareTarget: null,
            activePresetId: null,
            overlayValues: {
              slitWidthGuide: true,
              edgePaths: true,
              firstMinimumGuide: true,
            },
            focusedOverlayId: null,
            featureAvailability: {
              prediction: true,
              compare: true,
              guidedOverlays: true,
              noticePrompts: true,
              workedExamples: true,
              quickTest: true,
            },
          }}
          onApplyAction={onApplyAction}
        />
        <LiveWorkedExampleSection concept={concept} />
      </ConceptLearningBridgeProvider>,
    );

    expect(screen.getAllByText(textContentContains("2.4")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(textContentContains("0.42")).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /probe intensity from the edge-path split/i }));

    expect(screen.getByText(/near a diffraction minimum/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /move to a dim band/i }));

    expect(onApplyAction).toHaveBeenCalledWith(
      expect.objectContaining({
        presetId: "off-center-dim",
        highlightedGraphIds: ["pattern", "displacement"],
      }),
    );
    expect(screen.getByText(/edge-path difference is about one wavelength/i)).toBeInTheDocument();
  });

  it("resolves the double-slit worked examples against the live optics geometry", async () => {
    const user = userEvent.setup();
    const onApplyAction = vi.fn();
    const concept = getConceptBySlug("double-slit-interference");

    render(
      <ConceptLearningBridgeProvider>
        <WorkedExampleBridgeHarness
          snapshot={{
            slug: concept.slug,
            title: concept.title,
            topic: concept.topic,
            params: {
              wavelength: 0.78,
              slitSeparation: 2.6,
              screenDistance: 5.4,
              probeY: 0.81,
            },
            time: 0.2,
            timeSource: "inspect",
            activeGraphId: "pattern",
            interactionMode: "explore",
            activeCompareTarget: null,
            activePresetId: "first-dark",
            overlayValues: {
              geometryGuide: true,
              pathDifference: true,
              fringeSpacingGuide: true,
              phaseWheel: true,
            },
            focusedOverlayId: null,
            featureAvailability: {
              prediction: true,
              compare: true,
              guidedOverlays: true,
              noticePrompts: true,
              workedExamples: true,
              quickTest: true,
            },
          }}
          onApplyAction={onApplyAction}
        />
        <LiveWorkedExampleSection concept={concept} />
      </ConceptLearningBridgeProvider>,
    );

    expect(screen.getAllByText(/0\.81/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/dark fringe|nearly cancel|opposite in phase/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /fringe spacing from wavelength and geometry/i }));

    expect(screen.getAllByText(/1\.62/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /show wide fringes/i }));

    expect(onApplyAction).toHaveBeenCalledWith(
      expect.objectContaining({
        presetId: "wide-fringes",
        highlightedGraphIds: ["pattern"],
      }),
    );
    expect(screen.getByText(/lambda times L over d/i)).toBeInTheDocument();
  });

  it("resolves the standing-waves worked examples against the live harmonic state", async () => {
    const user = userEvent.setup();
    const onApplyAction = vi.fn();
    const concept = getConceptBySlug("standing-waves");

    render(
      <ConceptLearningBridgeProvider>
        <WorkedExampleBridgeHarness
          snapshot={{
            slug: concept.slug,
            title: concept.title,
            topic: concept.topic,
            params: {
              amplitude: 1.1,
              length: 1.6,
              modeNumber: 3,
              probeX: 0.8,
            },
            time: 0,
            timeSource: "inspect",
            activeGraphId: "shape",
            interactionMode: "explore",
            activeCompareTarget: null,
            activePresetId: null,
            overlayValues: {},
            focusedOverlayId: null,
            featureAvailability: {
              prediction: true,
              compare: true,
              guidedOverlays: true,
              noticePrompts: true,
              workedExamples: true,
              quickTest: true,
            },
          }}
          onApplyAction={onApplyAction}
        />
        <LiveWorkedExampleSection concept={concept} />
      </ConceptLearningBridgeProvider>,
    );

    expect(screen.getAllByText(textContentContains("1.6 m")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(textContentContains("1.07")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(textContentContains("1.13")).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /current probe displacement/i }));

    expect(screen.getAllByText(textContentContains("1.1")).length).toBeGreaterThan(0);
    expect(screen.getByText(/this probe sits at an antinode/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /move to a node/i }));

    expect(onApplyAction).toHaveBeenCalledWith(
      expect.objectContaining({
        presetId: "node-probe",
        highlightedGraphIds: ["shape", "displacement"],
      }),
    );
    expect(screen.getByText(/local time trace collapses/i)).toBeInTheDocument();
  });

  it("resolves the total-internal-reflection worked examples against the live threshold state", async () => {
    const user = userEvent.setup();
    const onApplyAction = vi.fn();
    const concept = getConceptBySlug("total-internal-reflection");

    render(
      <ConceptLearningBridgeProvider>
        <WorkedExampleBridgeHarness
          snapshot={{
            slug: concept.slug,
            title: concept.title,
            topic: concept.topic,
            params: {
              incidentAngle: 50,
              n1: 1.52,
              n2: 1,
            },
            time: 0,
            timeSource: "inspect",
            activeGraphId: "transition-map",
            interactionMode: "explore",
            activeCompareTarget: null,
            activePresetId: null,
            overlayValues: {
              normalGuide: true,
              criticalGuide: true,
              reflectionGuide: true,
              speedGuide: true,
            },
            focusedOverlayId: null,
            featureAvailability: {
              prediction: true,
              compare: true,
              guidedOverlays: true,
              noticePrompts: true,
              workedExamples: true,
              quickTest: true,
            },
          }}
          onApplyAction={onApplyAction}
        />
        <LiveWorkedExampleSection concept={concept} />
      </ConceptLearningBridgeProvider>,
    );

    expect(screen.getAllByText(textContentContains("41.14")).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /classify the current boundary state/i }));

    expect(
      screen.getAllByText(textContentContains("Total internal reflection")).length,
    ).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /apply above-critical glass to air/i }));

    expect(onApplyAction).toHaveBeenCalledWith(
      expect.objectContaining({
        presetId: "glass-to-air-above-critical",
        highlightedGraphIds: ["transition-map"],
      }),
    );
    expect(screen.getByText(/reflected ray stays in medium 1/i)).toBeInTheDocument();
  });

  it("resolves the dispersion worked examples against the live prism state", async () => {
    const user = userEvent.setup();
    const onApplyAction = vi.fn();
    const concept = getConceptBySlug("dispersion-refractive-index-color");

    render(
      <ConceptLearningBridgeProvider>
        <WorkedExampleBridgeHarness
          snapshot={{
            slug: concept.slug,
            title: concept.title,
            topic: concept.topic,
            params: {
              wavelengthNm: 450,
              referenceIndex: 1.62,
              dispersionStrength: 0.045,
              prismAngle: 22,
            },
            time: 0,
            timeSource: "inspect",
            activeGraphId: "deviation-curve",
            interactionMode: "explore",
            activeCompareTarget: null,
            activePresetId: null,
            overlayValues: {
              colorFan: true,
              indexGuide: true,
              thinPrismGuide: true,
            },
            focusedOverlayId: null,
            featureAvailability: {
              prediction: true,
              compare: true,
              guidedOverlays: true,
              noticePrompts: true,
              workedExamples: true,
              quickTest: true,
            },
          }}
          onApplyAction={onApplyAction}
        />
        <LiveWorkedExampleSection concept={concept} />
      </ConceptLearningBridgeProvider>,
    );

    expect(screen.getAllByText(textContentContains("1.64")).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /red-violet prism spread/i }));

    expect(screen.getAllByText(textContentContains("0.77")).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /apply wide flint prism/i }));

    expect(onApplyAction).toHaveBeenCalledWith(
      expect.objectContaining({
        presetId: "wide-flint",
        highlightedGraphIds: ["deviation-curve"],
      }),
    );
    expect(screen.getByText(/shorter wavelengths use the larger refractive index/i)).toBeInTheDocument();
  });

  it("resolves the lens-imaging worked examples against the live lens state", async () => {
    const user = userEvent.setup();
    const onApplyAction = vi.fn();
    const concept = getConceptBySlug("lens-imaging");

    render(
      <ConceptLearningBridgeProvider>
        <WorkedExampleBridgeHarness
          snapshot={{
            slug: concept.slug,
            title: concept.title,
            topic: concept.topic,
            params: {
              converging: true,
              focalLength: 0.8,
              objectDistance: 2.4,
              objectHeight: 1,
            },
            time: 0,
            timeSource: "inspect",
            activeGraphId: "image-map",
            interactionMode: "explore",
            activeCompareTarget: null,
            activePresetId: null,
            overlayValues: {},
            focusedOverlayId: null,
            featureAvailability: {
              prediction: true,
              compare: true,
              guidedOverlays: true,
              noticePrompts: true,
              workedExamples: true,
              quickTest: true,
            },
          }}
          onApplyAction={onApplyAction}
        />
        <LiveWorkedExampleSection concept={concept} />
      </ConceptLearningBridgeProvider>,
    );

    expect(screen.getAllByText(textContentContains("0.8 m")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(textContentContains("2.4 m")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(textContentContains("1.2")).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /solve the image height/i }));

    expect(screen.getByText(/negative magnification flips the image/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /apply diverging lens/i }));

    expect(onApplyAction).toHaveBeenCalledWith(
      expect.objectContaining({
        presetId: "diverging-reference",
        highlightedGraphIds: ["magnification"],
      }),
    );
    expect(screen.getByText(/positive magnification keeps the image upright/i)).toBeInTheDocument();
  });

  it("resolves the mirror worked examples against the live mirror state", async () => {
    const user = userEvent.setup();
    const onApplyAction = vi.fn();
    const concept = getConceptBySlug("mirrors");

    render(
      <ConceptLearningBridgeProvider>
        <WorkedExampleBridgeHarness
          snapshot={{
            slug: concept.slug,
            title: concept.title,
            topic: concept.topic,
            params: {
              curved: true,
              concave: true,
              focalLength: 0.8,
              objectDistance: 2.4,
              objectHeight: 1,
            },
            time: 0,
            timeSource: "inspect",
            activeGraphId: "image-map",
            interactionMode: "explore",
            activeCompareTarget: null,
            activePresetId: null,
            overlayValues: {},
            focusedOverlayId: null,
            featureAvailability: {
              prediction: true,
              compare: true,
              guidedOverlays: true,
              noticePrompts: true,
              workedExamples: true,
              quickTest: true,
            },
          }}
          onApplyAction={onApplyAction}
        />
        <LiveWorkedExampleSection concept={concept} />
      </ConceptLearningBridgeProvider>,
    );

    expect(screen.getAllByText(textContentContains("0.8 m")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(textContentContains("2.4 m")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(textContentContains("1.2")).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /solve the image height/i }));

    expect(screen.getByText(/negative magnification flips the image/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /apply concave inside focus/i }));

    expect(onApplyAction).toHaveBeenCalledWith(
      expect.objectContaining({
        presetId: "concave-inside-focus",
        highlightedGraphIds: ["magnification"],
      }),
    );
    expect(screen.getByText(/positive magnification keeps the image upright/i)).toBeInTheDocument();
  });

  it("uses the seeded runtime snapshot to avoid a null-state waiting flash", () => {
    const concept = getConceptBySlug("simple-harmonic-motion");

    render(
      <ConceptLearningBridgeProvider
        initialRuntimeSnapshot={{
          slug: concept.slug,
          title: concept.title,
          topic: concept.topic,
          params: {
            amplitude: 1.4,
            omega: 1.8,
            phase: 0,
          },
          time: 0,
          timeSource: "live",
          activeGraphId: "displacement",
          interactionMode: "explore",
          activeCompareTarget: null,
          activePresetId: null,
          overlayValues: {},
          focusedOverlayId: null,
          featureAvailability: {
            prediction: true,
            compare: true,
            guidedOverlays: true,
            noticePrompts: true,
            workedExamples: true,
            quickTest: true,
          },
        }}
      >
        <LiveWorkedExampleSection concept={concept} />
      </ConceptLearningBridgeProvider>,
    );

    expect(screen.queryByText(/Waiting for the live simulation state/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Live values/i)).toBeInTheDocument();
    expect(screen.getByText(/Live at 0\.00/i)).toBeInTheDocument();
  });
});
