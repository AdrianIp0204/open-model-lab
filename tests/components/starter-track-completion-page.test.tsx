// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StarterTrackCompletionPage } from "@/components/tracks/StarterTrackCompletionPage";
import { getStarterTrackBySlug } from "@/lib/content";
import { getStarterTrackCompletionContentContext } from "@/lib/content/track-completion";
import { PROGRESS_STORAGE_KEY, localConceptProgressStore } from "@/lib/progress";

describe("StarterTrackCompletionPage", () => {
  afterEach(() => {
    window.localStorage.clear();
    localConceptProgressStore.resetForTests();
    globalThis.__TEST_LOCALE__ = undefined;
  });

  it("keeps the route useful before the track is complete", { timeout: 10_000 }, () => {
    render(
      <StarterTrackCompletionPage
        track={getStarterTrackBySlug("motion-and-circular-motion")}
        completionContext={getStarterTrackCompletionContentContext(
          getStarterTrackBySlug("motion-and-circular-motion"),
        )}
      />,
    );

    expect(
      screen.getByRole("heading", { name: /motion and circular motion is still in progress/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /start with vectors/i }),
    ).toHaveAttribute("href", "/concepts/vectors-components");
    expect(
      screen.getByText(
        /remaining concepts: vectors and components, projectile motion, uniform circular motion\./i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/remaining checkpoints: trajectory checkpoint, turning-motion checkpoint\./i),
    ).toBeInTheDocument();
  });

  it("suggests the rotational track after the motion foundations are complete", () => {
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
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
            completedChallenges: {
              "pm-ch-flat-far-shot": "2026-03-25T09:05:00.000Z",
            },
          },
          "uniform-circular-motion": {
            conceptId: "concept-uniform-circular-motion",
            slug: "uniform-circular-motion",
            manualCompletedAt: "2026-03-25T10:00:00.000Z",
            completedChallenges: {
              "ucm-ch-match-period-change-pull": "2026-03-25T10:05:00.000Z",
            },
          },
        },
      }),
    );

    render(
      <StarterTrackCompletionPage
        track={getStarterTrackBySlug("motion-and-circular-motion")}
        completionContext={getStarterTrackCompletionContentContext(
          getStarterTrackBySlug("motion-and-circular-motion"),
        )}
      />,
    );

    expect(
      screen.getByRole("heading", { name: /motion and circular motion complete/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /start rotational mechanics/i })).toHaveAttribute(
      "href",
      "/tracks/rotational-mechanics",
    );
  });

  it("localizes the suggested next track action in zh-HK", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
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
            completedChallenges: {
              "pm-ch-flat-far-shot": "2026-03-25T09:05:00.000Z",
            },
          },
          "uniform-circular-motion": {
            conceptId: "concept-uniform-circular-motion",
            slug: "uniform-circular-motion",
            manualCompletedAt: "2026-03-25T10:00:00.000Z",
            completedChallenges: {
              "ucm-ch-match-period-change-pull": "2026-03-25T10:05:00.000Z",
            },
          },
        },
      }),
    );

    render(
      <StarterTrackCompletionPage
        track={getStarterTrackBySlug("motion-and-circular-motion")}
        completionContext={getStarterTrackCompletionContentContext(
          getStarterTrackBySlug("motion-and-circular-motion"),
        )}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "運動與圓周運動 已完成", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "開始 轉動力學" })).toHaveAttribute(
      "href",
      "/zh-HK/tracks/rotational-mechanics",
    );
  });

  it("suggests the gravity track after the rotational branch is complete", () => {
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        concepts: {
          torque: {
            conceptId: "concept-torque",
            slug: "torque",
            manualCompletedAt: "2026-03-25T08:00:00.000Z",
          },
          "static-equilibrium-centre-of-mass": {
            conceptId: "concept-static-equilibrium-centre-of-mass",
            slug: "static-equilibrium-centre-of-mass",
            manualCompletedAt: "2026-03-25T08:30:00.000Z",
            completedChallenges: {
              "secm-ch-balance-heavy-right-load": "2026-03-25T08:35:00.000Z",
            },
          },
          "rotational-inertia": {
            conceptId: "concept-rotational-inertia",
            slug: "rotational-inertia",
            manualCompletedAt: "2026-03-25T09:00:00.000Z",
          },
          "rolling-motion": {
            conceptId: "concept-rolling-motion",
            slug: "rolling-motion",
            manualCompletedAt: "2026-03-25T09:30:00.000Z",
            completedChallenges: {
              "rolling-motion-ch-compare-race": "2026-03-25T09:35:00.000Z",
            },
          },
          "angular-momentum": {
            conceptId: "concept-angular-momentum",
            slug: "angular-momentum",
            manualCompletedAt: "2026-03-25T10:00:00.000Z",
            completedChallenges: {
              "angular-momentum-ch-compare-same-l": "2026-03-25T10:05:00.000Z",
            },
          },
        },
      }),
    );

    render(
      <StarterTrackCompletionPage
        track={getStarterTrackBySlug("rotational-mechanics")}
        completionContext={getStarterTrackCompletionContentContext(
          getStarterTrackBySlug("rotational-mechanics"),
        )}
      />,
    );

    expect(
      screen.getByRole("heading", { name: /rotational mechanics complete/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /start gravity and orbits/i })).toHaveAttribute(
      "href",
      "/tracks/gravity-and-orbits",
    );
  });

  it("renders a completion reflection from the saved local progress", () => {
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
          "oscillation-energy": {
            conceptId: "concept-oscillation-energy",
            slug: "oscillation-energy",
            manualCompletedAt: "2026-03-25T09:00:00.000Z",
            completedChallenges: {
              "oe-ch-equal-split": "2026-03-25T09:05:00.000Z",
            },
          },
          "damping-resonance": {
            conceptId: "concept-damping-resonance",
            slug: "damping-resonance",
            manualCompletedAt: "2026-03-25T10:00:00.000Z",
            completedChallenges: {
              "dr-ch-lock-near-resonance": "2026-03-25T10:05:00.000Z",
            },
          },
        },
      }),
    );

    render(
      <StarterTrackCompletionPage
        track={getStarterTrackBySlug("oscillations-and-energy")}
        completionContext={getStarterTrackCompletionContentContext(
          getStarterTrackBySlug("oscillations-and-energy"),
        )}
      />,
    );

    expect(
      screen.getByRole("heading", { name: /oscillations and energy complete/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/you completed shm, energy in shm, and damping in the authored order/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/you also cleared 2 track checkpoints/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open recap mode/i })).toHaveAttribute(
      "href",
      "/tracks/oscillations-and-energy?mode=recap",
    );
    expect(screen.getByRole("link", { name: /open oscillations/i })).toHaveAttribute(
      "href",
      "/concepts/topics/oscillations",
    );
    expect(screen.getByRole("link", { name: /continue waves/i })).toHaveAttribute(
      "href",
      "/tracks/waves",
    );
    expect(screen.getByRole("button", { name: /copy completion page link/i })).toBeInTheDocument();
  });

  it("localizes the completion summary chrome in zh-HK", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

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
          "oscillation-energy": {
            conceptId: "concept-oscillation-energy",
            slug: "oscillation-energy",
            manualCompletedAt: "2026-03-25T09:00:00.000Z",
            completedChallenges: {
              "oe-ch-equal-split": "2026-03-25T09:05:00.000Z",
            },
          },
          "damping-resonance": {
            conceptId: "concept-damping-resonance",
            slug: "damping-resonance",
            manualCompletedAt: "2026-03-25T10:00:00.000Z",
            completedChallenges: {
              "dr-ch-lock-near-resonance": "2026-03-25T10:05:00.000Z",
            },
          },
        },
      }),
    );

    render(
      <StarterTrackCompletionPage
        track={getStarterTrackBySlug("oscillations-and-energy")}
        completionContext={getStarterTrackCompletionContentContext(
          getStarterTrackBySlug("oscillations-and-energy"),
        )}
      />,
    );

    expect(screen.getAllByText("路徑完成").length).toBeGreaterThan(1);
    expect(
      screen.getByRole("heading", { name: "振盪與能量 已完成", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText("回復力")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "簡諧運動" })).toBeInTheDocument();
    expect(screen.getByText("檢查點回顧")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "打開重溫模式" })).toHaveAttribute(
      "href",
      "/zh-HK/tracks/oscillations-and-energy?mode=recap",
    );
    expect(screen.getByRole("button", { name: "複製完成頁面連結" })).toBeInTheDocument();
    expect(screen.getByText("下一步")).toBeInTheDocument();
  });

  it("renders a synced completion reflection before this browser has local history", () => {
    render(
      <StarterTrackCompletionPage
        track={getStarterTrackBySlug("oscillations-and-energy")}
        completionContext={getStarterTrackCompletionContentContext(
          getStarterTrackBySlug("oscillations-and-energy"),
        )}
        initialSyncedSnapshot={{
          version: 1,
          concepts: {
            "simple-harmonic-motion": {
              conceptId: "concept-shm",
              slug: "simple-harmonic-motion",
              manualCompletedAt: "2026-03-25T08:00:00.000Z",
              completedQuickTestAt: "2026-03-25T08:10:00.000Z",
            },
            "oscillation-energy": {
              conceptId: "concept-oscillation-energy",
              slug: "oscillation-energy",
              manualCompletedAt: "2026-03-25T09:00:00.000Z",
              completedChallenges: {
                "oe-ch-equal-split": "2026-03-25T09:05:00.000Z",
              },
            },
            "damping-resonance": {
              conceptId: "concept-damping-resonance",
              slug: "damping-resonance",
              manualCompletedAt: "2026-03-25T10:00:00.000Z",
              completedChallenges: {
                "dr-ch-lock-near-resonance": "2026-03-25T10:05:00.000Z",
              },
            },
          },
        }}
      />,
    );

    expect(screen.getByText(/synced across devices/i)).toBeInTheDocument();
    expect(
      screen.getByText(/this page is built from the synced account progress already saved/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /oscillations and energy complete/i }),
    ).toBeInTheDocument();
  });

  it("uses a merged browser-plus-account snapshot when this browser already has related track history", () => {
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        concepts: {
          "damping-resonance": {
            conceptId: "concept-damping-resonance",
            slug: "damping-resonance",
            manualCompletedAt: "2026-03-25T10:00:00.000Z",
            completedChallenges: {
              "dr-ch-lock-near-resonance": "2026-03-25T10:05:00.000Z",
            },
          },
        },
      }),
    );
    localConceptProgressStore.resetForTests();

    render(
      <StarterTrackCompletionPage
        track={getStarterTrackBySlug("oscillations-and-energy")}
        completionContext={getStarterTrackCompletionContentContext(
          getStarterTrackBySlug("oscillations-and-energy"),
        )}
        initialSyncedSnapshot={{
          version: 1,
          concepts: {
            "simple-harmonic-motion": {
              conceptId: "concept-shm",
              slug: "simple-harmonic-motion",
              manualCompletedAt: "2026-03-25T08:00:00.000Z",
              completedQuickTestAt: "2026-03-25T08:10:00.000Z",
            },
            "oscillation-energy": {
              conceptId: "concept-oscillation-energy",
              slug: "oscillation-energy",
              manualCompletedAt: "2026-03-25T09:00:00.000Z",
              completedChallenges: {
                "oe-ch-equal-split": "2026-03-25T09:05:00.000Z",
              },
            },
          },
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: /oscillations and energy complete/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open recap mode/i })).toHaveAttribute(
      "href",
      "/tracks/oscillations-and-energy?mode=recap",
    );
  });

  it("keeps the terminal magnetism completion flow compact and challenge-aware", () => {
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        concepts: {
          "magnetic-fields": {
            conceptId: "concept-magnetic-fields",
            slug: "magnetic-fields",
            manualCompletedAt: "2026-03-25T10:00:00.000Z",
            completedChallenges: {
              "mf-ch-build-upward-bridge": "2026-03-25T10:05:00.000Z",
            },
          },
          "electromagnetic-induction": {
            conceptId: "concept-electromagnetic-induction",
            slug: "electromagnetic-induction",
            manualCompletedAt: "2026-03-25T10:10:00.000Z",
            completedChallenges: {
              "emi-ch-high-flux-zero-emf": "2026-03-25T10:15:00.000Z",
            },
          },
          "magnetic-force-moving-charges-currents": {
            conceptId: "concept-magnetic-force-moving-charges-currents",
            slug: "magnetic-force-moving-charges-currents",
            manualCompletedAt: "2026-03-25T10:20:00.000Z",
            completedChallenges: {
              "mfmc-ch-charge-down-wire-up": "2026-03-25T10:25:00.000Z",
            },
          },
        },
      }),
    );

    render(
      <StarterTrackCompletionPage
        track={getStarterTrackBySlug("magnetic-fields")}
        completionContext={getStarterTrackCompletionContentContext(
          getStarterTrackBySlug("magnetic-fields"),
        )}
      />,
    );

    expect(screen.getByRole("heading", { name: /^magnetism complete$/i })).toBeInTheDocument();
    expect(screen.getByText(/checkpoint recap/i)).toBeInTheDocument();
    expect(screen.getByText(/magnetic superposition checkpoint/i)).toBeInTheDocument();
    expect(screen.getByText(/faraday\/lenz checkpoint/i)).toBeInTheDocument();
    expect(screen.getByText(/magnetic force direction checkpoint/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open magnetism challenges/i })).toHaveAttribute(
      "href",
      "/challenges?track=magnetic-fields",
    );
    expect(
      screen
        .getAllByRole("link")
        .some((link) => link.getAttribute("href") === "/concepts/topics/magnetism"),
    ).toBe(true);
  });
});
