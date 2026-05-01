import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TopicLandingPage } from "@/components/concepts/TopicLandingPage";
import {
  getRecommendedGoalPathsForTopic,
  getTopicDiscoverySummaryBySlug,
} from "@/lib/content";
import {
  createEmptyProgressSnapshot,
  localConceptProgressStore,
  PROGRESS_STORAGE_KEY,
} from "@/lib/progress";
import zhHkMessages from "@/messages/zh-HK.json";

vi.mock("@/components/ads/AdSlot", () => ({
  DisplayAd: ({ placement }: { placement: string }) => (
    <div data-testid={`ad-slot-${placement}`}>Display ad</div>
  ),
  MultiplexAd: ({ placement }: { placement: string }) => (
    <div data-testid={`ad-slot-${placement}`}>Multiplex ad</div>
  ),
}));

describe("TopicLandingPage", () => {
  afterEach(() => {
    window.localStorage.clear();
    localConceptProgressStore.resetForTests();
  });

  it("renders the authored topic introduction, best-first concepts, and grouped overview", () => {
    render(<TopicLandingPage topic={getTopicDiscoverySummaryBySlug("mechanics")} />);

    expect(screen.getByRole("heading", { name: /^Mechanics$/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/motion language and trajectories/i)).toBeInTheDocument();
    expect(screen.getByText(/momentum and interactions/i)).toBeInTheDocument();
    expect(screen.getByText(/uniform circular motion/i)).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: /start with vectors/i })
        .some((link) => link.getAttribute("href") === "/concepts/vectors-components"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: /^Rotational Mechanics$/i })
        .some((link) => link.getAttribute("href") === "/tracks/rotational-mechanics"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: /^Motion and Circular Motion$/i })
        .some((link) => link.getAttribute("href") === "/tracks/motion-and-circular-motion"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link")
        .some((link) => link.getAttribute("href") === "/tracks/rotational-mechanics"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link")
        .some((link) => link.getAttribute("href") === "/tracks/motion-and-circular-motion"),
    ).toBe(true);
    expect(
      screen.queryByRole("link", { name: /open recommended concept/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /see related track/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("ad-slot-topic.headerDisplay")).toBeInTheDocument();
    expect(screen.getByTestId("ad-slot-topic.footerMultiplex")).toBeInTheDocument();
  });

  it("turns local topic progress into continue and revisit cues", () => {
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        concepts: {
          "projectile-motion": {
            conceptId: "concept-projectile-motion",
            slug: "projectile-motion",
            firstVisitedAt: "2026-03-27T10:00:00.000Z",
            lastVisitedAt: "2026-03-27T10:05:00.000Z",
          },
          "momentum-impulse": {
            conceptId: "concept-momentum-impulse",
            slug: "momentum-impulse",
            completedQuickTestAt: "2026-03-26T09:00:00.000Z",
            quickTestAttemptCount: 2,
            quickTestLastIncorrectCount: 2,
            quickTestMissStreak: 2,
            quickTestLastMissedAt: "2026-03-26T09:00:00.000Z",
          },
        },
      }),
    );
    localConceptProgressStore.resetForTests();

    render(<TopicLandingPage topic={getTopicDiscoverySummaryBySlug("mechanics")} />);

    expect(
      screen
        .getAllByRole("link", { name: /continue concept/i })
        .some((link) => link.getAttribute("href") === "/concepts/projectile-motion"),
    ).toBe(true);
    expect(screen.getAllByText(/continue here/i).length).toBeGreaterThan(0);
    expect(
      screen
        .getAllByRole("link", { name: /retry quick test/i })
        .some((link) => link.getAttribute("href") === "/concepts/momentum-impulse#quick-test"),
    ).toBe(true);
    expect(
      screen.queryByRole("link", { name: /open secondary recommendation/i }),
    ).not.toBeInTheDocument();
  });

  it("uses synced topic cues when the browser is still empty", () => {
    const syncedSnapshot = createEmptyProgressSnapshot();
    syncedSnapshot.concepts["projectile-motion"] = {
      conceptId: "concept-projectile-motion",
      slug: "projectile-motion",
      firstVisitedAt: "2026-03-29T13:03:31.439Z",
      lastVisitedAt: "2026-03-29T13:03:31.439Z",
      lastInteractedAt: "2026-03-29T13:03:31.439Z",
    };
    syncedSnapshot.concepts["momentum-impulse"] = {
      conceptId: "concept-momentum-impulse",
      slug: "momentum-impulse",
      completedQuickTestAt: "2026-03-26T09:00:00.000Z",
      quickTestAttemptCount: 2,
      quickTestLastIncorrectCount: 2,
      quickTestMissStreak: 2,
      quickTestLastMissedAt: "2026-03-26T09:00:00.000Z",
    };

    render(
      <TopicLandingPage
        topic={getTopicDiscoverySummaryBySlug("mechanics")}
        initialSyncedSnapshot={syncedSnapshot}
      />,
    );

    expect(screen.getByText(/saved topic progress/i)).toBeInTheDocument();
    expect(screen.getByText(/saved concept progress model across your account/i)).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: /continue concept/i })
        .some((link) => link.getAttribute("href") === "/concepts/projectile-motion"),
    ).toBe(true);
    expect(screen.getAllByText(/quick-test follow-up/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/on this browser/i)).not.toBeInTheDocument();
  });

  it("keeps the sound topic connected to the bounded sound starter track", () => {
    render(<TopicLandingPage topic={getTopicDiscoverySummaryBySlug("sound")} />);

    expect(
      screen.getByRole("heading", { name: /^Sound$/i, level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /sound in a medium/i, level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: /^Sound and Acoustics$/i })
        .some((link) => link.getAttribute("href") === "/tracks/sound-and-acoustics"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: /open starter track/i })
        .some((link) => link.getAttribute("href") === "/tracks/sound-and-acoustics"),
    ).toBe(true);
  });

  it("keeps the electricity topic focused on the field-to-potential branch", () => {
    render(
      <TopicLandingPage
        topic={getTopicDiscoverySummaryBySlug("electricity")}
        goalPaths={getRecommendedGoalPathsForTopic("electricity")}
      />,
    );

    expect(screen.getByRole("heading", { name: /^Electricity$/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/fields, potential, and charge storage/i)).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: /open starter track/i })
        .some((link) => link.getAttribute("href") === "/tracks/electricity"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: /^Circuits$/i })
        .map((link) => link.getAttribute("href")),
    ).toContain("/concepts/topics/circuits");
    expect(
      screen
        .getAllByRole("link", { name: /^Electromagnetism$/i })
        .map((link) => link.getAttribute("href")),
    ).toContain("/concepts/topics/electromagnetism");
    expect(
      screen
        .getAllByRole("link", { name: /capacitance and stored electric energy/i })
        .some(
          (link) =>
            link.getAttribute("href") ===
            "/concepts/capacitance-and-stored-electric-energy",
        ),
    ).toBe(true);
    expect(screen.getAllByText(/specific learning goals/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/teacher-led electricity bridge objective/i)).toBeInTheDocument();
  });

  it("keeps the circuits topic coherent after adding Kirchhoff balance, RC response, and source realism", () => {
    render(<TopicLandingPage topic={getTopicDiscoverySummaryBySlug("circuits")} />);

    expect(screen.getByRole("heading", { name: /^Circuits$/i, level: 1 })).toBeInTheDocument();
    expect(screen.getAllByText(/kirchhoff balance/i).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", { name: /branches, kirchhoff balance, and reduction/i, level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: /kirchhoff loop and junction rules/i })
        .some((link) => link.getAttribute("href") === "/concepts/kirchhoff-loop-and-junction-rules"),
    ).toBe(true);
    expect(
      screen.getByRole("heading", { name: /storage and time response/i, level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: /rc charging and discharging/i })
        .some((link) => link.getAttribute("href") === "/concepts/rc-charging-and-discharging"),
    ).toBe(true);
    expect(
      screen.getByRole("heading", { name: /real sources under load/i, level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: /internal resistance and terminal voltage/i })
        .some(
          (link) =>
            link.getAttribute("href") ===
            "/concepts/internal-resistance-and-terminal-voltage",
        ),
    ).toBe(true);
  });

  it("keeps the thermodynamics topic anchored on the particle-to-pressure bridge", () => {
    render(<TopicLandingPage topic={getTopicDiscoverySummaryBySlug("thermodynamics")} />);

    expect(screen.getByRole("heading", { name: /^Thermodynamics$/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/temperature, internal energy, and gas pressure/i)).toBeInTheDocument();
    expect(screen.getByText(/heat flow and heating curves/i)).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: /start with temperature vs u/i })
        .some((link) => link.getAttribute("href") === "/concepts/temperature-and-internal-energy"),
    ).toBe(true);
    expect(screen.getAllByText(/ideal gas law and kinetic theory/i).length).toBeGreaterThan(0);
    expect(
      screen
        .getAllByRole("link", { name: /open concept/i })
        .some((link) => link.getAttribute("href") === "/concepts/ideal-gas-law-and-kinetic-theory"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: /open starter track/i })
        .some((link) => link.getAttribute("href") === "/tracks/thermodynamics-and-kinetic-theory"),
    ).toBe(true);
    expect(
      screen.getByRole("heading", { name: /^Heat Transfer$/i, level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: /open concept/i })
        .some((link) => link.getAttribute("href") === "/concepts/heat-transfer"),
    ).toBe(true);
    expect(
      screen.getByRole("heading", { name: /^Specific Heat and Phase Change$/i, level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: /open concept/i })
        .some((link) => link.getAttribute("href") === "/concepts/specific-heat-and-phase-change"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: /^Mechanics$/i })
        .map((link) => link.getAttribute("href")),
    ).toContain("/concepts/topics/mechanics");
    expect(
      screen
        .getAllByRole("link", { name: /^Electricity$/i })
        .map((link) => link.getAttribute("href")),
    ).toContain("/concepts/topics/electricity");
  });

  it("keeps the fluids topic pressure-first while branching through flow, buoyancy, and terminal-speed drag", () => {
    render(<TopicLandingPage topic={getTopicDiscoverySummaryBySlug("fluids")} />);

    expect(screen.getByRole("heading", { name: /^Fluids$/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/pressure as force per area/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /pressure in a resting fluid/i, level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /steady flow, speed, and pressure/i, level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /buoyancy from displaced fluid/i, level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /resistive motion through fluid/i, level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: /start with pressure in fluids/i })
        .some(
          (link) => link.getAttribute("href") === "/concepts/pressure-and-hydrostatic-pressure",
        ),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: /open starter track/i })
        .some((link) => link.getAttribute("href") === "/tracks/fluid-and-pressure"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: /^Fluid and Pressure$/i })
        .some((link) => link.getAttribute("href") === "/tracks/fluid-and-pressure"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: /open concept/i })
        .some((link) => link.getAttribute("href") === "/concepts/continuity-equation"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: /open concept/i })
        .some((link) => link.getAttribute("href") === "/concepts/bernoullis-principle"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: /open concept/i })
        .some(
          (link) => link.getAttribute("href") === "/concepts/buoyancy-and-archimedes-principle",
        ),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: /open concept/i })
        .some((link) => link.getAttribute("href") === "/concepts/drag-and-terminal-velocity"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: /^Mechanics$/i })
        .map((link) => link.getAttribute("href")),
    ).toContain("/concepts/topics/mechanics");
    expect(
      screen
        .getAllByRole("link", { name: /^Thermodynamics$/i })
        .map((link) => link.getAttribute("href")),
    ).toContain("/concepts/topics/thermodynamics");
  });

  it("positions electromagnetism between the magnetism topic and the optics branch", () => {
    render(<TopicLandingPage topic={getTopicDiscoverySummaryBySlug("electromagnetism")} />);

    expect(
      screen.getByRole("heading", { name: /^Electromagnetism$/i, level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /induction from changing flux/i, level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /field synthesis and propagation/i, level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link")
        .some((link) => link.getAttribute("href") === "/tracks/magnetic-fields"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link")
        .some((link) => link.getAttribute("href") === "/concepts/topics/magnetism"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link")
        .some((link) => link.getAttribute("href") === "/concepts/topics/optics"),
    ).toBe(true);
    expect(screen.getByText(/recommended prerequisite tracks/i)).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link")
        .some((link) => link.getAttribute("href") === "/tracks/magnetic-fields"),
    ).toBe(true);
  });

  it("keeps the optics topic anchored on the light-and-spectrum wave branch", () => {
    render(<TopicLandingPage topic={getTopicDiscoverySummaryBySlug("optics")} />);

    expect(screen.getByRole("heading", { name: /^Optics$/i, level: 1 })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /light as a wave/i, level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /boundaries and bending/i, level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: /start with light and spectrum/i })
        .some((link) => link.getAttribute("href") === "/concepts/light-spectrum-linkage"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link")
        .some((link) => link.getAttribute("href") === "/concepts/polarization"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link")
        .some((link) => link.getAttribute("href") === "/concepts/diffraction"),
    ).toBe(true);
    expect(
      screen.getByRole("heading", { name: /^Double-Slit Interference$/i, level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /^Dispersion \/ Refractive Index and Color$/i, level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /^Total Internal Reflection$/i, level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link")
        .some((link) => link.getAttribute("href") === "/tracks/wave-optics"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link")
        .some((link) => link.getAttribute("href") === "/concepts/topics/electromagnetism"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link")
        .some((link) => link.getAttribute("href") === "/concepts/topics/waves"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link")
        .some((link) => link.getAttribute("href") === "/concepts/topics/mirrors-and-lenses"),
    ).toBe(true);
  });

  it("keeps the modern-physics topic tied to the new starter track", () => {
    render(<TopicLandingPage topic={getTopicDiscoverySummaryBySlug("modern-physics")} />);

    expect(screen.getByRole("heading", { name: /^Modern Physics$/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/light and quantized matter/i)).toBeInTheDocument();
    expect(screen.getByText(/nuclear chance and decay curves/i)).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: /start with photoelectric effect/i })
        .some((link) => link.getAttribute("href") === "/concepts/photoelectric-effect"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: /open starter track/i })
        .some((link) => link.getAttribute("href") === "/tracks/modern-physics"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: /^Modern Physics$/i })
        .some((link) => link.getAttribute("href") === "/tracks/modern-physics"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link")
        .some((link) => link.getAttribute("href") === "/concepts/topics/optics"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link")
        .some((link) => link.getAttribute("href") === "/concepts/topics/electromagnetism"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link")
        .some((link) => link.getAttribute("href") === "/concepts/topics/waves"),
    ).toBe(true);
  });

  it("gives the new math topics a real starter path and guided goal", () => {
    render(
      <TopicLandingPage
        topic={getTopicDiscoverySummaryBySlug("functions")}
        goalPaths={getRecommendedGoalPathsForTopic("functions")}
      />,
    );

    expect(screen.getByRole("heading", { name: /^Functions$/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/parent curves and visible moves/i)).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: /open starter track/i })
        .some((link) => link.getAttribute("href") === "/tracks/functions-and-change"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: /^Calculus$/i })
        .map((link) => link.getAttribute("href")),
    ).toContain("/concepts/topics/calculus");
    expect(screen.getAllByText(/specific learning goals/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/build function and rate intuition from the graph first/i)).toBeInTheDocument();
  });

  it("keeps the vectors topic tied to the math-to-mechanics bridge", () => {
    render(
      <TopicLandingPage
        topic={getTopicDiscoverySummaryBySlug("vectors")}
        goalPaths={getRecommendedGoalPathsForTopic("vectors")}
      />,
    );

    expect(screen.getByRole("heading", { name: /^Vectors$/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/plane vectors and combination/i)).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: /open starter track/i })
        .some((link) => link.getAttribute("href") === "/tracks/vectors-and-motion-bridge"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: /^Mechanics$/i })
        .map((link) => link.getAttribute("href")),
    ).toContain("/concepts/topics/mechanics");
    expect(screen.getAllByText(/specific learning goals/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/bridge plane vectors into motion/i)).toBeInTheDocument();
  });

  it("gives the chemistry pilot a real topic route, starter track, and next branch", () => {
    render(
      <TopicLandingPage
        topic={getTopicDiscoverySummaryBySlug("rates-and-equilibrium")}
        goalPaths={getRecommendedGoalPathsForTopic("rates-and-equilibrium")}
      />,
    );

    expect(
      screen.getByRole("heading", { name: /^Rates and Equilibrium$/i, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/successful collisions set the rate/i)).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: /open starter track/i })
        .some((link) => link.getAttribute("href") === "/tracks/rates-and-equilibrium"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: /^Thermodynamics$/i })
        .map((link) => link.getAttribute("href")),
    ).toContain("/concepts/topics/thermodynamics");
    expect(screen.getAllByText(/specific learning goals/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/build chemistry intuition through rates and equilibrium/i),
    ).toBeInTheDocument();
  });

  it("renders zh-HK topic chrome and localized group copy", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    render(<TopicLandingPage topic={getTopicDiscoverySummaryBySlug("mechanics")} />);

    expect(screen.getByRole("heading", { name: /^力學$/i, level: 1 })).toBeInTheDocument();
    expect(
      screen.getAllByText(zhHkMessages.TopicLandingPage.labels.topicLandingPage).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText(/motion language and trajectories/i)).not.toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: zhHkMessages.TopicLandingPage.actions.browseLibrary })
        .some((link) => link.getAttribute("href") === "/concepts"),
    ).toBe(true);
  });
});
