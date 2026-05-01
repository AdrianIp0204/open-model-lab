// @vitest-environment jsdom

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChallengeModePanel } from "@/components/concepts/ChallengeModePanel";
import {
  setAnalyticsTransportForTests,
  type AnalyticsSubmission,
} from "@/lib/analytics";
import { localConceptProgressStore } from "@/lib/progress";
import type { ConceptSimulationSource } from "@/lib/physics";
import {
  buildConceptSimulationStateHref,
  conceptShareAnchorIds,
} from "@/lib/share-links";
import { ConceptPagePhaseProvider } from "@/components/concepts/ConceptPagePhaseContext";

const simulationSource: ConceptSimulationSource = {
  id: "concept-projectile-motion",
  title: "Projectile Motion",
  summary: "Launch a projectile.",
  slug: "projectile-motion",
  topic: "Mechanics",
  equations: [],
  variableLinks: [],
  simulation: {
    kind: "projectile",
    defaults: {
      speed: 19,
      angle: 39,
      gravity: 9.8,
      rangeMarker: true,
    },
    controls: [],
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
        shortDescription: "Marks landing distance.",
        whatToNotice: ["The landing distance changes when the launch changes."],
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
    accessibility: {
      simulationDescription: "Projectile simulation",
      graphSummary: "Trajectory graph",
    },
  },
  challengeMode: {
    title: "Challenge mode",
    items: [
      {
        id: "pm-ch-flat-far-shot",
        title: "Flat long shot",
        style: "target-setting",
        prompt: "Reach the target range.",
        successMessage: "Solved.",
        setup: {
          presetId: "earth-shot",
          graphId: "trajectory",
        },
        checks: [
          {
            type: "graph-active",
            label: "Open the trajectory graph.",
            graphId: "trajectory",
          },
          {
            type: "overlay-active",
            label: "Keep the range marker visible.",
            overlayId: "rangeMarker",
          },
          {
            type: "metric-range",
            label: "Match the range target.",
            metric: "range",
            min: 35,
            max: 38,
            displayUnit: "m",
          },
        ],
      },
      {
        id: "pm-ch-steeper-shot",
        title: "Steeper shot",
        style: "target-setting",
        prompt: "Move to a steeper launch.",
        successMessage: "Second challenge ready.",
        checks: [
          {
            type: "metric-range",
            label: "Match a shorter range.",
            metric: "range",
            min: 18,
            max: 20,
            displayUnit: "m",
          },
        ],
      },
    ],
  },
};

describe("ChallengeModePanel", () => {
  afterEach(() => {
    window.localStorage.clear();
    localConceptProgressStore.resetForTests();
    setAnalyticsTransportForTests(null);
  });

  it("records completion from the live state and lets the user apply a setup", async () => {
    const handleApplySetup = vi.fn();

    render(
      <ChallengeModePanel
        concept={{
          id: "concept-projectile-motion",
          slug: "projectile-motion",
          title: "Projectile Motion",
        }}
        simulationSource={simulationSource}
        challengeMode={simulationSource.challengeMode!}
        runtime={{
          params: {
            speed: 19,
            angle: 39,
            gravity: 9.8,
            rangeMarker: true,
          },
          activeGraphId: "trajectory",
          overlayValues: {
            rangeMarker: true,
          },
          time: 0,
          timeSource: "live",
          compare: null,
        }}
        readNext={[
          {
            slug: "vectors-components",
            title: "Vectors and Components",
            summary: "Builds on components",
            topic: "Mechanics",
            difficulty: "Intro",
            reasonLabel: "Builds on this",
            reasonKind: "builds-on-this",
          },
        ]}
        onApplySetup={handleApplySetup}
      />,
    );

    await waitFor(() =>
      expect(
        localConceptProgressStore.getSnapshot().concepts["projectile-motion"]?.completedChallenges,
      ).toMatchObject({
        "pm-ch-flat-far-shot": expect.any(String),
      }),
    );

    expect(screen.getByText(/challenge already solved/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open next challenge/i })).toBeVisible();
    expect(screen.getByRole("link", { name: /^read next$/i })).toHaveAttribute(
      "href",
      "/concepts/vectors-components",
    );

    await userEvent.click(screen.getByRole("button", { name: /apply suggested start/i }));
    expect(handleApplySetup).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: /open next challenge/i }));
    expect(screen.getByRole("heading", { name: /steeper shot/i })).toBeInTheDocument();
  });

  it("opens a requested challenge item and copies a stable challenge entry link", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText,
      },
      configurable: true,
    });

    render(
      <ChallengeModePanel
        concept={{
          id: "concept-projectile-motion",
          slug: "projectile-motion",
          title: "Projectile Motion",
        }}
        simulationSource={simulationSource}
        challengeMode={simulationSource.challengeMode!}
        runtime={{
          params: {
            speed: 19,
            angle: 39,
            gravity: 9.8,
            rangeMarker: true,
          },
          activeGraphId: "trajectory",
          overlayValues: {
            rangeMarker: true,
          },
          time: 0,
          timeSource: "live",
          compare: null,
        }}
        onApplySetup={() => {}}
        initialItemId="pm-ch-steeper-shot"
      />,
    );

    expect(screen.getByRole("heading", { name: /steeper shot/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /share|分享/i }));

    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/concepts/projectile-motion?challenge=pm-ch-steeper-shot#challenge-mode`,
    );
  });

  it("preserves the active locale when copying the fallback challenge entry link", async () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText,
      },
      configurable: true,
    });

    render(
      <ChallengeModePanel
        concept={{
          id: "concept-projectile-motion",
          slug: "projectile-motion",
          title: "Projectile Motion",
        }}
        simulationSource={simulationSource}
        challengeMode={simulationSource.challengeMode!}
        runtime={{
          params: {
            speed: 19,
            angle: 39,
            gravity: 9.8,
            rangeMarker: true,
          },
          activeGraphId: "trajectory",
          overlayValues: {
            rangeMarker: true,
          },
          time: 0,
          timeSource: "live",
          compare: null,
        }}
        onApplySetup={() => {}}
        initialItemId="pm-ch-steeper-shot"
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /share|分享/i }));

    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/zh-HK/concepts/projectile-motion?challenge=pm-ch-steeper-shot#challenge-mode`,
    );
  });

  it("copies the current challenge with the exact simulation state when provided", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText,
      },
      configurable: true,
    });

    render(
      <ChallengeModePanel
        concept={{
          id: "concept-projectile-motion",
          slug: "projectile-motion",
          title: "Projectile Motion",
        }}
        simulationSource={simulationSource}
        challengeMode={simulationSource.challengeMode!}
        runtime={{
          params: {
            speed: 19,
            angle: 39,
            gravity: 9.8,
            rangeMarker: true,
          },
          activeGraphId: "trajectory",
          overlayValues: {
            rangeMarker: true,
          },
          time: 0.6,
          timeSource: "inspect",
          compare: null,
        }}
        onApplySetup={() => {}}
        initialItemId="pm-ch-steeper-shot"
        buildShareHref={(challengeId) =>
          buildConceptSimulationStateHref({
            source: simulationSource,
            conceptSlug: "projectile-motion",
            challengeId,
            hash: conceptShareAnchorIds.challengeMode,
            state: {
              params: {
                speed: 19,
                angle: 39,
                gravity: 9.8,
                rangeMarker: true,
              },
              activePresetId: null,
              activeGraphId: "trajectory",
              overlayValues: {
                rangeMarker: true,
              },
              focusedOverlayId: "rangeMarker",
              time: 0.6,
              timeSource: "inspect",
              compare: null,
            },
          })
        }
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /challenge share actions/i }));

    expect(writeText.mock.calls[0]?.[0]).toMatch(
      /^http:\/\/localhost(?::\d+)?\/concepts\/projectile-motion\?challenge=pm-ch-steeper-shot&state=v1\.[A-Za-z0-9_-]+#challenge-mode$/,
    );
  });

  it("emits challenge_started and challenge_completed for a deep-linked challenge", async () => {
    const events: AnalyticsSubmission[] = [];

    setAnalyticsTransportForTests((event) => {
      events.push(event);
    });

    render(
      <ChallengeModePanel
        concept={{
          id: "concept-projectile-motion",
          slug: "projectile-motion",
          title: "Projectile Motion",
        }}
        simulationSource={simulationSource}
        challengeMode={simulationSource.challengeMode!}
        runtime={{
          params: {
            speed: 19,
            angle: 39,
            gravity: 9.8,
            rangeMarker: true,
          },
          activeGraphId: "trajectory",
          overlayValues: {
            rangeMarker: true,
          },
          time: 0,
          timeSource: "live",
          compare: null,
        }}
        onApplySetup={() => {}}
        initialItemId="pm-ch-flat-far-shot"
      />,
    );

    await waitFor(() =>
      expect(events).toContainEqual(
        expect.objectContaining({
          name: "challenge_started",
          payload: expect.objectContaining({
            pagePath: "/concepts/projectile-motion",
            challengeId: "pm-ch-flat-far-shot",
            source: "deep-link",
          }),
        }),
      ),
    );

    await waitFor(() =>
      expect(events).toContainEqual(
        expect.objectContaining({
          name: "challenge_completed",
          payload: expect.objectContaining({
            pagePath: "/concepts/projectile-motion",
            challengeId: "pm-ch-flat-far-shot",
            source: "challenge-evaluation",
          }),
        }),
      ),
    );
  });

  it("stores exact started challenge ids and reveals the structured explanation flow", async () => {
    const handleApplySetup = vi.fn();

    render(
      <ChallengeModePanel
        concept={{
          id: "concept-projectile-motion",
          slug: "projectile-motion",
          title: "Projectile Motion",
        }}
        simulationSource={simulationSource}
        challengeMode={simulationSource.challengeMode!}
        runtime={{
          params: {
            speed: 18,
            angle: 45,
            gravity: 9.8,
            rangeMarker: true,
          },
          activeGraphId: "trajectory",
          overlayValues: {
            rangeMarker: true,
          },
          time: 0,
          timeSource: "live",
          compare: null,
        }}
        onApplySetup={handleApplySetup}
        initialItemId="pm-ch-flat-far-shot"
      />,
    );

    await waitFor(() =>
      expect(
        localConceptProgressStore.getSnapshot().concepts["projectile-motion"]?.startedChallenges,
      ).toMatchObject({
        "pm-ch-flat-far-shot": expect.any(String),
      }),
    );
    expect(
      localConceptProgressStore.getSnapshot().concepts["projectile-motion"]?.startedChallenges?.[
        "pm-ch-steeper-shot"
      ],
    ).toBeUndefined();

    await userEvent.click(screen.getByRole("button", { name: /reveal explanation/i }));

    expect(screen.getByText(/^Explanation$/i)).toBeVisible();
    expect(screen.getByText(/^Requirements$/i)).toBeVisible();
    expect(screen.getByText(/^Targets$/i)).toBeVisible();
    expect(screen.getByText(/^Completion proves$/i)).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: /retry from suggested start/i }));
    expect(handleApplySetup).toHaveBeenCalledTimes(1);
  });

  it("surfaces revealed support state with hint progress and explanation badges", async () => {
    const user = userEvent.setup();
    const hintedSource: ConceptSimulationSource = {
      ...simulationSource,
      challengeMode: {
        ...simulationSource.challengeMode!,
        items: simulationSource.challengeMode!.items.map((item) =>
          item.id === "pm-ch-flat-far-shot"
            ? {
                ...item,
                hints: ["Start from the Earth shot.", "Keep the range marker visible."],
              }
            : item,
        ),
      },
    };

    render(
      <ChallengeModePanel
        concept={{
          id: "concept-projectile-motion",
          slug: "projectile-motion",
          title: "Projectile Motion",
        }}
        simulationSource={hintedSource}
        challengeMode={hintedSource.challengeMode!}
        runtime={{
          params: {
            speed: 18,
            angle: 45,
            gravity: 9.8,
            rangeMarker: true,
          },
          activeGraphId: "trajectory",
          overlayValues: {
            rangeMarker: true,
          },
          time: 0,
          timeSource: "live",
          compare: null,
        }}
        onApplySetup={vi.fn()}
        initialItemId="pm-ch-flat-far-shot"
      />,
    );

    expect(screen.getByRole("button", { name: /show hint 1\/2/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /show hint 1\/2/i }));

    expect(screen.getByText(/hint 1\/2 shown/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /show hint 2\/2/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reveal explanation/i }));

    expect(screen.getByText(/explanation open/i)).toBeInTheDocument();
  });

  it("scrolls back to the live bench without resetting the active challenge state", async () => {
    const handleApplySetup = vi.fn();
    const setupRegion = document.createElement("div");
    const scrollIntoView = vi.fn();
    const focus = vi.fn();

    setupRegion.id = conceptShareAnchorIds.liveBench;
    setupRegion.tabIndex = -1;
    Object.defineProperty(setupRegion, "scrollIntoView", {
      value: scrollIntoView,
      configurable: true,
    });
    Object.defineProperty(setupRegion, "focus", {
      value: focus,
      configurable: true,
    });
    document.body.appendChild(setupRegion);

    render(
      <ChallengeModePanel
        concept={{
          id: "concept-projectile-motion",
          slug: "projectile-motion",
          title: "Projectile Motion",
        }}
        simulationSource={simulationSource}
        challengeMode={simulationSource.challengeMode!}
        runtime={{
          params: {
            speed: 19,
            angle: 39,
            gravity: 9.8,
            rangeMarker: true,
          },
          activeGraphId: "trajectory",
          overlayValues: {
            rangeMarker: true,
          },
          time: 0,
          timeSource: "live",
          compare: null,
        }}
        onApplySetup={handleApplySetup}
        initialItemId="pm-ch-steeper-shot"
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /reveal explanation/i }));
    expect(screen.getByText(/^Explanation$/i)).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: /back to setup/i }));

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(screen.getByRole("heading", { name: /steeper shot/i })).toBeInTheDocument();
    expect(screen.getByText(/^Explanation$/i)).toBeVisible();
    expect(handleApplySetup).not.toHaveBeenCalled();

    setupRegion.remove();
  });

  it("keeps apply suggested start on the full challenge panel and returns to setup in check phase", async () => {
    const handleApplySetup = vi.fn();
    const returnToSetupArea = vi.fn();

    render(
      <ConceptPagePhaseProvider
        activePhaseId="check"
        returnToSetupArea={returnToSetupArea}
      >
        <ChallengeModePanel
          concept={{
            id: "concept-projectile-motion",
            slug: "projectile-motion",
            title: "Projectile Motion",
          }}
          simulationSource={simulationSource}
          challengeMode={simulationSource.challengeMode!}
          runtime={{
            params: {
              speed: 19,
              angle: 39,
              gravity: 9.8,
              rangeMarker: true,
            },
            activeGraphId: "trajectory",
            overlayValues: {
              rangeMarker: true,
            },
            time: 0,
            timeSource: "live",
            compare: null,
          }}
          onApplySetup={handleApplySetup}
          initialItemId="pm-ch-flat-far-shot"
        />
      </ConceptPagePhaseProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: /apply suggested start/i }));

    expect(handleApplySetup).toHaveBeenCalledTimes(1);
    expect(returnToSetupArea).toHaveBeenCalledWith({ phaseId: "explore" });
  });

  it("renders the floating reminder as a task-only checklist with a collapse toggle", async () => {
    render(
      <ChallengeModePanel
        concept={{
          id: "concept-projectile-motion",
          slug: "projectile-motion",
          title: "Projectile Motion",
        }}
        simulationSource={simulationSource}
        challengeMode={simulationSource.challengeMode!}
        runtime={{
          params: {
            speed: 19,
            angle: 39,
            gravity: 9.8,
            rangeMarker: true,
          },
          activeGraphId: "trajectory",
          overlayValues: {
            rangeMarker: true,
          },
          time: 0,
          timeSource: "live",
          compare: null,
        }}
        onApplySetup={vi.fn()}
        initialItemId="pm-ch-flat-far-shot"
        displayMode="floating-reminder"
      />,
    );

    const panel = screen.getByTestId("challenge-mode-floating-panel");

    expect(panel).toHaveAttribute("data-display-mode", "floating-reminder");
    expect(within(panel).getByText(/^Requirements$/i)).toBeInTheDocument();
    expect(within(panel).getAllByTestId("challenge-mode-reminder-item").length).toBeGreaterThan(0);
    expect(within(panel).getByTestId("challenge-mode-reminder-body")).toBeInTheDocument();
    expect(within(panel).queryByText(/reach the target range\./i)).not.toBeInTheDocument();
    expect(within(panel).queryByRole("button", { name: /apply suggested start/i })).not.toBeInTheDocument();
    expect(within(panel).queryByRole("button", { name: /back to setup/i })).not.toBeInTheDocument();
    expect(within(panel).queryByRole("button", { name: /reveal explanation/i })).not.toBeInTheDocument();
    expect(within(panel).queryByText(/^Suggested start$/i)).not.toBeInTheDocument();

    const toggle = within(panel).getByRole("button", { name: /hide tasks/i });
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    await userEvent.click(toggle);
    expect(within(panel).getByRole("button", { name: /show tasks/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(within(panel).queryByTestId("challenge-mode-reminder-body")).not.toBeInTheDocument();
  });

  it("does not offer apply suggested start when the challenge only has setup guidance text", () => {
    const guidanceOnlySource: ConceptSimulationSource = {
      ...simulationSource,
      challengeMode: {
        title: "Challenge mode",
        items: [
          {
            id: "pm-ch-guidance-only",
            title: "Guidance only",
            style: "target-setting",
            prompt: "Use the note, but there is no authored restore setup.",
            successMessage: "Solved.",
            setup: {
              note: "Adjust the setup manually, then verify the result.",
            },
            checks: [
              {
                type: "graph-active",
                label: "Open the trajectory graph.",
                graphId: "trajectory",
              },
            ],
          },
        ],
      },
    };

    render(
      <ChallengeModePanel
        concept={{
          id: "concept-projectile-motion",
          slug: "projectile-motion",
          title: "Projectile Motion",
        }}
        simulationSource={guidanceOnlySource}
        challengeMode={guidanceOnlySource.challengeMode!}
        runtime={{
          params: {
            speed: 19,
            angle: 39,
            gravity: 9.8,
            rangeMarker: true,
          },
          activeGraphId: null,
          overlayValues: {
            rangeMarker: true,
          },
          time: 0,
          timeSource: "live",
          compare: null,
        }}
        onApplySetup={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: /apply suggested start/i })).not.toBeInTheDocument();
    expect(screen.getByText(/^Suggested start$/i)).toBeInTheDocument();
  });

  it("does not refresh a deep-linked challenge start on runtime rerenders", async () => {
    const { rerender } = render(
      <ChallengeModePanel
        concept={{
          id: "concept-projectile-motion",
          slug: "projectile-motion",
          title: "Projectile Motion",
        }}
        simulationSource={simulationSource}
        challengeMode={simulationSource.challengeMode!}
        runtime={{
          params: {
            speed: 18,
            angle: 45,
            gravity: 9.8,
            rangeMarker: true,
          },
          activeGraphId: "trajectory",
          overlayValues: {
            rangeMarker: true,
          },
          time: 0,
          timeSource: "live",
          compare: null,
        }}
        onApplySetup={() => {}}
        initialItemId="pm-ch-flat-far-shot"
      />,
    );

    await waitFor(() =>
      expect(
        localConceptProgressStore.getSnapshot().concepts["projectile-motion"]?.startedChallenges?.[
          "pm-ch-flat-far-shot"
        ],
      ).toEqual(expect.any(String)),
    );

    const initialStartedAt =
      localConceptProgressStore.getSnapshot().concepts["projectile-motion"]?.startedChallenges?.[
        "pm-ch-flat-far-shot"
      ] ?? null;

    await new Promise((resolve) => setTimeout(resolve, 20));

    rerender(
      <ChallengeModePanel
        concept={{
          id: "concept-projectile-motion",
          slug: "projectile-motion",
          title: "Projectile Motion",
        }}
        simulationSource={simulationSource}
        challengeMode={{
          ...simulationSource.challengeMode!,
          items: simulationSource.challengeMode!.items.map((item) => ({
            ...item,
            checks: item.checks.map((check) => ({ ...check })),
            hints: item.hints ? [...item.hints] : undefined,
            setup: item.setup ? { ...item.setup } : undefined,
          })),
        }}
        runtime={{
          params: {
            speed: 18,
            angle: 45,
            gravity: 9.8,
            rangeMarker: true,
          },
          activeGraphId: "trajectory",
          overlayValues: {
            rangeMarker: true,
          },
          time: 0.6,
          timeSource: "inspect",
          compare: null,
        }}
        onApplySetup={() => {}}
        initialItemId="pm-ch-flat-far-shot"
      />,
    );

    await waitFor(() =>
      expect(
        localConceptProgressStore.getSnapshot().concepts["projectile-motion"]?.startedChallenges?.[
          "pm-ch-flat-far-shot"
        ],
      ).toBe(initialStartedAt),
    );
  });

  it("hydrates solved challenge history from synced progress before this browser has local data", () => {
    render(
      <ChallengeModePanel
        concept={{
          id: "concept-projectile-motion",
          slug: "projectile-motion",
          title: "Projectile Motion",
        }}
        simulationSource={simulationSource}
        challengeMode={simulationSource.challengeMode!}
        runtime={{
          params: {
            speed: 18,
            angle: 45,
            gravity: 9.8,
            rangeMarker: true,
          },
          activeGraphId: "trajectory",
          overlayValues: {
            rangeMarker: true,
          },
          time: 0,
          timeSource: "live",
          compare: null,
        }}
        initialSyncedSnapshot={{
          version: 1,
          concepts: {
            "projectile-motion": {
              conceptId: "concept-projectile-motion",
              slug: "projectile-motion",
              usedChallengeModeAt: "2026-03-27T10:00:00.000Z",
              completedChallenges: {
                "pm-ch-flat-far-shot": "2026-03-27T10:05:00.000Z",
              },
            },
          },
        }}
        onApplySetup={() => {}}
        initialItemId="pm-ch-flat-far-shot"
      />,
    );

    expect(screen.getByText(/^1 solved$/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^Solved$/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/already solved in synced progress/i)).toBeInTheDocument();
  });
});
