// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { StarterTrackDetailPage } from "@/components/tracks/StarterTrackDetailPage";
import {
  setAnalyticsTransportForTests,
  type AnalyticsSubmission,
} from "@/lib/analytics";
import { getStarterTrackBySlug } from "@/lib/content";
import {
  localConceptProgressStore,
  markConceptCompleted,
  PROGRESS_STORAGE_KEY,
  recordChallengeCompleted,
  recordConceptVisit,
  recordQuickTestCompleted,
} from "@/lib/progress";

async function openTrackDetails(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByText(/track details/i));
}

describe("StarterTrackDetailPage", () => {
  afterEach(() => {
    window.localStorage.clear();
    localConceptProgressStore.resetForTests();
    setAnalyticsTransportForTests(null);
    globalThis.__TEST_LOCALE__ = undefined;
  });

  it("renders authored track context with a visible primary CTA and collapsed track details", async () => {
    const user = userEvent.setup();

    render(<StarterTrackDetailPage track={getStarterTrackBySlug("oscillations-and-energy")} />);

    expect(
      screen.getByRole("heading", { name: /oscillations and energy/i, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /oscillations and energy sections/i })).not.toBeInTheDocument();
    expect(screen.getByText(/see whether the oscillator loop is already secure/i)).toBeInTheDocument();
    expect(screen.getByText(/same system viewed from different angles/i)).toBeInTheDocument();
    expect(screen.getByText(/restoring-force loop/i)).toBeInTheDocument();
    expect(screen.getByTestId("track-primary-cta")).toHaveAttribute(
      "href",
      "/concepts/simple-harmonic-motion",
    );
    expect(screen.getByTestId("starter-track-test-cta-simple-harmonic-motion")).toHaveTextContent(
      "Take test",
    );
    expect(screen.getByTestId("starter-track-test-cta-simple-harmonic-motion")).toHaveAttribute(
      "href",
      "/tests/concepts/simple-harmonic-motion",
    );
    expect(screen.queryByTestId("starter-track-test-cta-oscillation-energy")).not.toBeInTheDocument();
    expect(screen.getByText(/track details/i)).toBeInTheDocument();

    await openTrackDetails(user);

    expect(screen.getByRole("button", { name: /copy track page link/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy guided path link/i })).toBeInTheDocument();
  });

  it("renders the starter track hero and steps in zh-HK", () => {
    render(
      <StarterTrackDetailPage
        locale="zh-HK"
        track={getStarterTrackBySlug("oscillations-and-energy")}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "振盪與能量", level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/由一個乾淨的振盪器開始，先看位移與回復力/i),
    ).toBeInTheDocument();
    expect(screen.getByText("回復力")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "簡諧運動" })).toBeInTheDocument();
  });

  it("keeps the guided action on the next incomplete step even with later-step visits", () => {
    recordConceptVisit({
      id: "concept-wave-interference",
      slug: "wave-interference",
      title: "Wave Interference",
    });

    render(<StarterTrackDetailPage track={getStarterTrackBySlug("waves")} />);

    expect(screen.getByTestId("track-primary-cta")).toHaveAttribute(
      "href",
      "/concepts/simple-harmonic-motion",
    );
    expect(
      screen.getAllByText(
        /wave interference already has progress, but simple harmonic motion is still the next guided step/i,
      ).length,
    ).toBeGreaterThan(0);
    expect(screen.getByTestId("starter-track-test-cta-wave-interference")).toHaveTextContent(
      "Take test",
    );
  });

  it("can surface recap-mode guidance when the starter probes are already ready later in the path", () => {
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        concepts: {
          "simple-harmonic-motion": {
            conceptId: "concept-shm",
            slug: "simple-harmonic-motion",
            completedQuickTestAt: "2026-03-29T08:00:00.000Z",
            quickTestAttemptCount: 1,
            quickTestLastIncorrectCount: 0,
          },
          "wave-speed-wavelength": {
            conceptId: "concept-wave-speed-wavelength",
            slug: "wave-speed-wavelength",
            completedQuickTestAt: "2026-03-29T08:10:00.000Z",
            quickTestAttemptCount: 1,
            quickTestLastIncorrectCount: 0,
          },
          "wave-interference": {
            conceptId: "concept-wave-interference",
            slug: "wave-interference",
            usedChallengeModeAt: "2026-03-29T08:20:00.000Z",
            startedChallenges: {
              "wi-ch-find-dark-band": "2026-03-29T08:20:00.000Z",
            },
            completedChallenges: {
              "wi-ch-find-dark-band": "2026-03-29T08:25:00.000Z",
            },
          },
        },
      }),
    );
    localConceptProgressStore.resetForTests();

    render(<StarterTrackDetailPage track={getStarterTrackBySlug("waves")} />);

    expect(screen.getAllByText(/use recap mode/i).length).toBeGreaterThan(0);
    expect(
      screen
        .getAllByRole("link", { name: /use recap mode/i })
        .some((link) => link.getAttribute("href") === "/tracks/waves?mode=recap"),
    ).toBe(true);
    expect(screen.getByRole("link", { name: /resume at simple harmonic motion/i })).toHaveAttribute(
      "href",
      "/concepts/simple-harmonic-motion",
    );
  });

  it("shows mastery cues on track steps when stronger local signals exist", () => {
    recordQuickTestCompleted({
      id: "concept-wave-interference",
      slug: "wave-interference",
      title: "Wave Interference",
    });

    render(<StarterTrackDetailPage track={getStarterTrackBySlug("waves")} />);

    expect(screen.getByText(/one stronger check is saved so far/i)).toBeInTheDocument();
  });

  it("surfaces the next ready checkpoint inside the guided path", () => {
    markConceptCompleted({
      id: "concept-vectors-components",
      slug: "vectors-components",
      title: "Vectors and Components",
    });
    markConceptCompleted({
      id: "concept-projectile-motion",
      slug: "projectile-motion",
      title: "Projectile Motion",
    });

    render(<StarterTrackDetailPage track={getStarterTrackBySlug("motion-and-circular-motion")} />);

    expect(
      screen.getByRole("heading", { name: /trajectory checkpoint/i, level: 3 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/checkpoint ready/i)).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: /open checkpoint/i })
        .every(
          (link) =>
            link.getAttribute("href") ===
            "/concepts/projectile-motion?challenge=pm-ch-flat-far-shot#challenge-mode",
        ),
    ).toBe(true);
  });

  it("renders synced guided-track progress before this browser has local history", () => {
    render(
      <StarterTrackDetailPage
        track={getStarterTrackBySlug("motion-and-circular-motion")}
        initialSyncedSnapshot={{
          version: 1,
          concepts: {
            "vectors-components": {
              conceptId: "concept-vectors-components",
              slug: "vectors-components",
              manualCompletedAt: "2026-03-25T08:00:00.000Z",
            },
            "projectile-motion": {
              conceptId: "concept-projectile-motion",
              slug: "projectile-motion",
              manualCompletedAt: "2026-03-25T09:00:00.000Z",
            },
          },
        }}
      />,
    );

    expect(screen.getByText(/synced across devices/i)).toBeInTheDocument();
    expect(screen.getByText(/synced track progress/i)).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: /open checkpoint/i })
        .every(
          (link) =>
            link.getAttribute("href") ===
            "/concepts/projectile-motion?challenge=pm-ch-flat-far-shot#challenge-mode",
        ),
    ).toBe(true);
  });

  it("uses a merged browser-plus-account snapshot when local track history already exists", () => {
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        concepts: {
          "uniform-circular-motion": {
            conceptId: "concept-uniform-circular-motion",
            slug: "uniform-circular-motion",
            firstVisitedAt: "2026-03-25T09:30:00.000Z",
            lastVisitedAt: "2026-03-25T09:35:00.000Z",
          },
        },
      }),
    );
    localConceptProgressStore.resetForTests();

    render(
      <StarterTrackDetailPage
        track={getStarterTrackBySlug("motion-and-circular-motion")}
        initialSyncedSnapshot={{
          version: 1,
          concepts: {
            "vectors-components": {
              conceptId: "concept-vectors-components",
              slug: "vectors-components",
              manualCompletedAt: "2026-03-25T08:00:00.000Z",
            },
            "projectile-motion": {
              conceptId: "concept-projectile-motion",
              slug: "projectile-motion",
              manualCompletedAt: "2026-03-25T09:00:00.000Z",
            },
          },
        }}
      />,
    );

    expect(screen.getByText(/synced across devices/i)).toBeInTheDocument();
    expect(screen.getByText(/synced track progress/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /uses the synced quick tests, checkpoint challenges, and track history already saved in your account\./i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/last active .*25.*mar|last active .*mar.*25/i)).toBeInTheDocument();
    expect(
      screen.getAllByRole("heading", { name: /trajectory checkpoint/i, level: 3 }).length,
    ).toBeGreaterThan(0);
    expect(
      screen
        .getAllByRole("link", { name: /open checkpoint/i })
        .every(
          (link) =>
            link.getAttribute("href") ===
            "/concepts/projectile-motion?challenge=pm-ch-flat-far-shot#challenge-mode",
        ),
    ).toBe(true);
  });

  it("keeps the electricity track on the voltage checkpoint before circuits", () => {
    markConceptCompleted({
      id: "concept-electric-fields",
      slug: "electric-fields",
      title: "Electric Fields",
    });
    markConceptCompleted({
      id: "concept-electric-potential",
      slug: "electric-potential",
      title: "Electric Potential",
    });

    render(<StarterTrackDetailPage track={getStarterTrackBySlug("electricity")} />);

    expect(
      screen.getAllByRole("heading", { name: /voltage bridge checkpoint/i, level: 3 }).length,
    ).toBeGreaterThan(0);
    expect(
      screen
        .getAllByRole("link", { name: /open checkpoint/i })
        .every(
          (link) =>
            link.getAttribute("href") ===
            "/concepts/electric-potential?challenge=ep-ch-positive-midpoint-plateau#challenge-mode",
        ),
    ).toBe(true);
  });

  it("surfaces the thermodynamics track as one bounded thermal path", () => {
    render(
      <StarterTrackDetailPage track={getStarterTrackBySlug("thermodynamics-and-kinetic-theory")} />,
    );

    expect(
      screen.getByRole("heading", { name: /thermodynamics and kinetic theory/i, level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/check the thermal bookkeeping before you enter heat flow/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId("track-primary-cta")).toHaveAttribute(
      "href",
      "/concepts/temperature-and-internal-energy",
    );
    expect(
      screen.getAllByRole("heading", { name: /gas-pressure bridge checkpoint/i, level: 3 }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("heading", { name: /heat-flow checkpoint/i, level: 3 }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("heading", { name: /heating-curve checkpoint/i, level: 3 }).length,
    ).toBeGreaterThan(0);
  });

  it("surfaces the fluid track as one bounded pressure-first path", () => {
    render(<StarterTrackDetailPage track={getStarterTrackBySlug("fluid-and-pressure")} />);

    expect(
      screen.getByRole("heading", { name: /fluid and pressure/i, level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/check the pressure-to-flow bridge before you open the full fluids path/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId("track-primary-cta")).toHaveAttribute(
      "href",
      "/concepts/pressure-and-hydrostatic-pressure",
    );
    expect(
      screen.getAllByRole("heading", { name: /hydrostatic checkpoint/i, level: 3 }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("heading", { name: /flow-pressure checkpoint/i, level: 3 }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("heading", { name: /terminal-speed checkpoint/i, level: 3 }).length,
    ).toBeGreaterThan(0);
  });

  it("surfaces the rotational track as one bounded mechanics branch with authored prep", async () => {
    const user = userEvent.setup();

    render(
      <StarterTrackDetailPage
        track={getStarterTrackBySlug("rotational-mechanics")}
        prerequisiteTracks={[getStarterTrackBySlug("motion-and-circular-motion")]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: /rotational mechanics/i, level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/check the turning-to-balance bridge first/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId("track-primary-cta")).toHaveAttribute(
      "href",
      "/concepts/torque",
    );
    await openTrackDetails(user);
    expect(screen.getByText(/recommended prep/i)).toBeInTheDocument();
    expect(
      screen
        .getAllByText(/motion and circular motion is the authored prerequisite for rotational mechanics/i)
        .length,
    ).toBeGreaterThan(0);
    expect(
      screen
        .getAllByRole("link")
        .some((link) => link.getAttribute("href") === "/tracks/motion-and-circular-motion"),
    ).toBe(true);
    expect(
      screen.getAllByRole("heading", { name: /balance checkpoint/i, level: 3 }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("heading", { name: /rolling-response checkpoint/i, level: 3 }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("heading", { name: /angular-momentum checkpoint/i, level: 3 }).length,
    ).toBeGreaterThan(0);
  });

  it("surfaces the gravity track as a bounded orbit path with authored prerequisite guidance", async () => {
    const user = userEvent.setup();

    render(
      <StarterTrackDetailPage
        track={getStarterTrackBySlug("gravity-and-orbits")}
        prerequisiteTracks={[getStarterTrackBySlug("motion-and-circular-motion")]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: /gravity and orbits/i, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/check the gravity bridge before you enter orbits/i)).toBeInTheDocument();
    expect(screen.getByTestId("track-primary-cta")).toHaveAttribute(
      "href",
      "/concepts/gravitational-fields",
    );
    await openTrackDetails(user);
    expect(screen.getByText(/recommended prep/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/motion and circular motion is the authored prerequisite for gravity and orbits/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen
        .getAllByRole("link")
        .some((link) => link.getAttribute("href") === "/tracks/motion-and-circular-motion"),
    ).toBe(true);
  });

  it("shows authored prerequisite guidance on advanced tracks", async () => {
    const user = userEvent.setup();

    render(
      <StarterTrackDetailPage
        track={getStarterTrackBySlug("magnetic-fields")}
        prerequisiteTracks={[getStarterTrackBySlug("electricity")]}
      />,
    );

    await openTrackDetails(user);
    expect(screen.getByText(/recommended prep/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/electricity is the authored prerequisite for magnetism/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen
        .getAllByRole("link")
        .some((link) => link.getAttribute("href") === "/tracks/electricity"),
    ).toBe(true);
  });

  it("uses the waves track as authored prep for the bounded sound branch", async () => {
    const user = userEvent.setup();

    render(
      <StarterTrackDetailPage
        track={getStarterTrackBySlug("sound-and-acoustics")}
        prerequisiteTracks={[getStarterTrackBySlug("waves")]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: /sound and acoustics/i, level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/check the sound bench before you jump deeper into acoustics/i),
    ).toBeInTheDocument();
    await openTrackDetails(user);
    expect(screen.getByText(/recommended prep/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/waves is the authored prerequisite for sound and acoustics/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen
        .getAllByRole("link")
        .some((link) => link.getAttribute("href") === "/tracks/waves"),
    ).toBe(true);
    expect(screen.getByTestId("track-primary-cta")).toHaveAttribute(
      "href",
      "/concepts/sound-waves-longitudinal-motion",
    );
  });

  it("surfaces the modern-physics track as one bounded evidence path", () => {
    render(<StarterTrackDetailPage track={getStarterTrackBySlug("modern-physics")} />);

    expect(
      screen.getByRole("heading", { name: /^modern physics$/i, level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/check the modern-physics evidence chain first/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId("track-primary-cta")).toHaveAttribute(
      "href",
      "/concepts/photoelectric-effect",
    );
    expect(
      screen.getAllByRole("heading", { name: /threshold-to-line checkpoint/i, level: 3 }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("heading", { name: /matter-wave fit checkpoint/i, level: 3 }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("heading", { name: /chance-versus-curve checkpoint/i, level: 3 }).length,
    ).toBeGreaterThan(0);
  });

  it("surfaces the wave-optics track as one bounded optics branch with authored prep", async () => {
    const user = userEvent.setup();

    render(
      <StarterTrackDetailPage
        track={getStarterTrackBySlug("wave-optics")}
        prerequisiteTracks={[getStarterTrackBySlug("waves")]}
      />,
    );

    expect(screen.getByRole("heading", { name: /^wave optics$/i, level: 1 })).toBeInTheDocument();
    expect(
      screen.getByText(/check the wave-pattern bench before you skip into color and imaging/i),
    ).toBeInTheDocument();
    await openTrackDetails(user);
    expect(screen.getByText(/recommended prep/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/waves is the authored prerequisite for wave optics/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen
        .getAllByRole("link")
        .some((link) => link.getAttribute("href") === "/tracks/waves"),
    ).toBe(true);
    expect(screen.getByTestId("track-primary-cta")).toHaveAttribute(
      "href",
      "/concepts/polarization",
    );
    expect(
      screen.getAllByRole("heading", { name: /single-slit checkpoint/i, level: 3 }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("heading", { name: /interference checkpoint/i, level: 3 }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("heading", { name: /resolution-limit checkpoint/i, level: 3 }).length,
    ).toBeGreaterThan(0);
  });

  it("surfaces the closing magnetic-force checkpoint after the earlier bridge is cleared", () => {
    markConceptCompleted({
      id: "concept-magnetic-fields",
      slug: "magnetic-fields",
      title: "Magnetic Fields",
    });
    recordChallengeCompleted(
      {
        id: "concept-magnetic-fields",
        slug: "magnetic-fields",
        title: "Magnetic Fields",
      },
      "mf-ch-build-upward-bridge",
    );
    markConceptCompleted({
      id: "concept-electromagnetic-induction",
      slug: "electromagnetic-induction",
      title: "Faraday's Law and Lenz's Law",
    });
    recordChallengeCompleted(
      {
        id: "concept-electromagnetic-induction",
        slug: "electromagnetic-induction",
        title: "Faraday's Law and Lenz's Law",
      },
      "emi-ch-high-flux-zero-emf",
    );
    markConceptCompleted({
      id: "concept-magnetic-force-moving-charges-currents",
      slug: "magnetic-force-moving-charges-currents",
      title: "Magnetic Force on Moving Charges and Currents",
    });

    render(<StarterTrackDetailPage track={getStarterTrackBySlug("magnetic-fields")} />);

    expect(
      screen.getByRole("heading", { name: /magnetic force direction checkpoint/i, level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /final checkpoint that closes the authored track after magnetic force on moving charges and currents\./i,
      ),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: /open checkpoint/i })
        .every(
          (link) =>
            link.getAttribute("href") ===
            "/concepts/magnetic-force-moving-charges-currents?challenge=mfmc-ch-charge-down-wire-up#challenge-mode",
        ),
    ).toBe(true);
  });

  it("sends completed tracks to the completion page from the primary action area", () => {
    markConceptCompleted({
      id: "concept-shm",
      slug: "simple-harmonic-motion",
      title: "Simple Harmonic Motion",
    });
    markConceptCompleted({
      id: "concept-oscillation-energy",
      slug: "oscillation-energy",
      title: "Oscillation and Energy",
    });
    markConceptCompleted({
      id: "concept-damping-resonance",
      slug: "damping-resonance",
      title: "Damping and Resonance",
    });
    recordChallengeCompleted(
      {
        id: "concept-oscillation-energy",
        slug: "oscillation-energy",
        title: "Oscillation and Energy",
      },
      "oe-ch-equal-split",
    );
    recordChallengeCompleted(
      {
        id: "concept-damping-resonance",
        slug: "damping-resonance",
        title: "Damping and Resonance",
      },
      "dr-ch-lock-near-resonance",
    );

    render(<StarterTrackDetailPage track={getStarterTrackBySlug("oscillations-and-energy")} />);

    expect(screen.getByTestId("track-primary-cta")).toHaveAttribute(
      "href",
      "/tracks/oscillations-and-energy/complete",
    );
  });

  it("renders recap mode with compact review actions derived from local signals", async () => {
    const user = userEvent.setup();

    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        concepts: {
          "simple-harmonic-motion": {
            conceptId: "concept-shm",
            slug: "simple-harmonic-motion",
            manualCompletedAt: "2026-03-25T08:00:00.000Z",
            completedQuickTestAt: "2026-03-25T08:10:00.000Z",
          },
          "wave-speed-wavelength": {
            conceptId: "concept-wave-speed-wavelength",
            slug: "wave-speed-wavelength",
            firstVisitedAt: "2026-03-25T09:00:00.000Z",
            lastVisitedAt: "2026-03-25T09:00:00.000Z",
            quickTestAttemptCount: 2,
            quickTestLastIncorrectCount: 2,
            quickTestMissStreak: 2,
            quickTestLastMissedAt: "2026-03-25T09:00:00.000Z",
          },
        },
      }),
    );

    render(
      <StarterTrackDetailPage
        track={getStarterTrackBySlug("waves")}
        initialMode="recap"
      />,
    );

    expect(screen.getByText(/revisit the track in the same authored order/i)).toBeInTheDocument();
    expect(screen.getByText(/retry checks/i)).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: /retry quick test/i })
        .every((link) => link.getAttribute("href") === "/concepts/wave-speed-wavelength#quick-test"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: /open full track/i })
        .some((link) => link.getAttribute("href") === "/tracks/waves"),
    ).toBe(true);
    await openTrackDetails(user);
    expect(screen.getByRole("button", { name: /copy recap mode link/i })).toBeInTheDocument();
  });

  it("emits track_started and track_continued signals from guided track actions", async () => {
    const user = userEvent.setup();
    const events: AnalyticsSubmission[] = [];

    setAnalyticsTransportForTests((event) => {
      events.push(event);
    });

    const firstRender = render(
      <StarterTrackDetailPage track={getStarterTrackBySlug("oscillations-and-energy")} />,
    );

    await user.click(screen.getByTestId("track-primary-cta"));

    expect(events).toContainEqual(
      expect.objectContaining({
        name: "track_started",
        payload: expect.objectContaining({
          pagePath: "/tracks/oscillations-and-energy",
          pageKind: "track",
          trackSlug: "oscillations-and-energy",
          status: "not-started",
          action: "start",
          targetConceptSlug: "simple-harmonic-motion",
        }),
      }),
    );

    events.length = 0;
    firstRender.unmount();

    recordConceptVisit({
      id: "concept-wave-interference",
      slug: "wave-interference",
      title: "Wave Interference",
    });

    render(<StarterTrackDetailPage track={getStarterTrackBySlug("waves")} />);

    await user.click(screen.getByTestId("track-primary-cta"));

    expect(events).toContainEqual(
      expect.objectContaining({
        name: "track_continued",
        payload: expect.objectContaining({
          pagePath: "/tracks/waves",
          pageKind: "track",
          trackSlug: "waves",
          status: "in-progress",
          action: "continue",
          targetConceptSlug: "simple-harmonic-motion",
        }),
      }),
    );
  });
});
