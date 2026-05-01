import { describe, expect, it } from "vitest";
import {
  getGuidedCollectionBySlug,
  getRecommendedGoalPathBySlug,
  getStarterTrackBySlug,
} from "@/lib/content";
import {
  buildGuidedCollectionEntryDiagnostic,
  buildRecommendedGoalPathEntryDiagnosticTeaser,
  buildStarterTrackEntryDiagnostic,
  createEmptyProgressSnapshot,
} from "@/lib/progress";

describe("entry diagnostics", () => {
  it("reuses starter-track prerequisite recommendations before a later magnetic entry", () => {
    const diagnostic = buildStarterTrackEntryDiagnostic(
      createEmptyProgressSnapshot(),
      getStarterTrackBySlug("magnetic-fields"),
      [getStarterTrackBySlug("electricity")],
    );

    expect(diagnostic).toMatchObject({
      recommendationKind: "review-prerequisite",
      primaryAction: {
        href: "/tracks/electricity",
        label: "Start Electricity prerequisite track",
      },
      secondaryAction: {
        href: "/concepts/magnetic-fields",
        label: "Begin with Magnetic Fields",
      },
    });
  });

  it("can prefer recap mode when the authored track probes are already satisfied later in the path", () => {
    const diagnostic = buildStarterTrackEntryDiagnostic(
      {
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
      },
      getStarterTrackBySlug("waves"),
    );

    expect(diagnostic).toMatchObject({
      recommendationKind: "take-recap",
      primaryAction: {
        href: "/tracks/waves?mode=recap",
        label: "Use recap mode",
      },
      secondaryAction: {
        href: "/concepts/simple-harmonic-motion",
        label: "Resume at Simple Harmonic Motion",
      },
      readyProbeCount: 3,
    });
  });

  it("can hand an active starter track into recap mode when saved checks still need review", () => {
    const diagnostic = buildStarterTrackEntryDiagnostic(
      {
        version: 1,
        concepts: {
          "wave-speed-wavelength": {
            conceptId: "concept-wave-speed-wavelength",
            slug: "wave-speed-wavelength",
            firstVisitedAt: "2026-03-29T09:00:00.000Z",
            lastVisitedAt: "2026-03-29T09:00:00.000Z",
            completedQuickTestAt: "2026-03-29T09:05:00.000Z",
            quickTestAttemptCount: 2,
            quickTestLastIncorrectCount: 2,
            quickTestMissStreak: 2,
            quickTestLastMissedAt: "2026-03-29T09:05:00.000Z",
          },
        },
      },
      getStarterTrackBySlug("waves"),
    );

    expect(diagnostic).toMatchObject({
      recommendationKind: "take-recap",
      primaryAction: {
        href: "/tracks/waves?mode=recap",
        label: "Use recap mode",
      },
    });
  });

  it("preserves locale in starter-track diagnostic actions and teaser sources", () => {
    const diagnostic = buildStarterTrackEntryDiagnostic(
      {
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
      },
      getStarterTrackBySlug("waves"),
      [],
      "zh-HK",
    );
    const teaser = buildRecommendedGoalPathEntryDiagnosticTeaser(
      createEmptyProgressSnapshot(),
      getRecommendedGoalPathBySlug("waves-intuition"),
      "zh-HK",
    );

    expect(diagnostic).toMatchObject({
      primaryAction: {
        href: "/zh-HK/tracks/waves?mode=recap",
      },
      secondaryAction: {
        href: "/zh-HK/concepts/simple-harmonic-motion",
      },
    });
    expect(teaser).toMatchObject({
      sourceHref: "/zh-HK/guided/waves-evidence-loop",
    });
  });

  it("can skip ahead inside a guided collection when the bridge probes are already ready", () => {
    const diagnostic = buildGuidedCollectionEntryDiagnostic(
      {
        version: 1,
        concepts: {
          "magnetic-fields": {
            conceptId: "concept-magnetic-fields",
            slug: "magnetic-fields",
            usedChallengeModeAt: "2026-03-29T10:00:00.000Z",
            startedChallenges: {
              "mf-ch-build-upward-bridge": "2026-03-29T10:00:00.000Z",
            },
            completedChallenges: {
              "mf-ch-build-upward-bridge": "2026-03-29T10:04:00.000Z",
            },
          },
          "electromagnetic-induction": {
            conceptId: "concept-electromagnetic-induction",
            slug: "electromagnetic-induction",
            usedChallengeModeAt: "2026-03-29T10:08:00.000Z",
            startedChallenges: {
              "emi-ch-high-flux-zero-emf": "2026-03-29T10:08:00.000Z",
            },
            completedChallenges: {
              "emi-ch-high-flux-zero-emf": "2026-03-29T10:12:00.000Z",
            },
          },
        },
      },
      getGuidedCollectionBySlug("electricity-to-magnetism-bridge"),
    );

    expect(diagnostic).toMatchObject({
      recommendationKind: "skip-ahead",
      primaryAction: {
        href: "/concepts/maxwells-equations-synthesis",
        label: "Skip to Add Maxwell's four-law synthesis as the capstone concept",
      },
      readyProbeCount: 2,
    });
  });

  it("preserves locale in guided-collection diagnostic actions", () => {
    const diagnostic = buildGuidedCollectionEntryDiagnostic(
      {
        version: 1,
        concepts: {
          "magnetic-fields": {
            conceptId: "concept-magnetic-fields",
            slug: "magnetic-fields",
            usedChallengeModeAt: "2026-03-29T10:00:00.000Z",
            startedChallenges: {
              "mf-ch-build-upward-bridge": "2026-03-29T10:00:00.000Z",
            },
            completedChallenges: {
              "mf-ch-build-upward-bridge": "2026-03-29T10:04:00.000Z",
            },
          },
          "electromagnetic-induction": {
            conceptId: "concept-electromagnetic-induction",
            slug: "electromagnetic-induction",
            usedChallengeModeAt: "2026-03-29T10:08:00.000Z",
            startedChallenges: {
              "emi-ch-high-flux-zero-emf": "2026-03-29T10:08:00.000Z",
            },
            completedChallenges: {
              "emi-ch-high-flux-zero-emf": "2026-03-29T10:12:00.000Z",
            },
          },
        },
      },
      getGuidedCollectionBySlug("electricity-to-magnetism-bridge"),
      "zh-HK",
    );

    expect(diagnostic).toMatchObject({
      primaryAction: {
        href: "/zh-HK/concepts/maxwells-equations-synthesis",
      },
      secondaryAction: {
        href: "/zh-HK/tracks/electricity?mode=recap",
      },
    });
  });

  it("can surface the first diagnostic-bearing source inside a recommended goal path", () => {
    const teaser = buildRecommendedGoalPathEntryDiagnosticTeaser(
      createEmptyProgressSnapshot(),
      getRecommendedGoalPathBySlug("waves-intuition"),
    );

    expect(teaser).toMatchObject({
      sourceKind: "guided-collection",
      sourceTitle: "Waves Evidence Loop",
      sourceHref: "/guided/waves-evidence-loop",
      diagnostic: {
        recommendationKind: "start-at-beginning",
      },
    });
  });
});
