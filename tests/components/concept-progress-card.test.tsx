// @vitest-environment jsdom

import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConceptProgressCard } from "@/components/progress/ConceptProgressCard";
import {
  setAnalyticsTransportForTests,
  type AnalyticsSubmission,
} from "@/lib/analytics";
import {
  localConceptProgressStore,
  recordConceptVisit,
  recordQuickTestCompleted,
} from "@/lib/progress";

describe("ConceptProgressCard", () => {
  afterEach(() => {
    window.localStorage.clear();
    localConceptProgressStore.resetForTests();
    setAnalyticsTransportForTests(null);
    vi.useRealTimers();
  });

  it("emits a concept_started signal on the first local visit", async () => {
    const events: AnalyticsSubmission[] = [];

    setAnalyticsTransportForTests((event) => {
      events.push(event);
    });

    render(
      <ConceptProgressCard
        concept={{
          id: "concept-projectile-motion",
          slug: "projectile-motion",
          title: "Projectile Motion",
        }}
        challengeIds={["pm-ch-flat-far-shot"]}
        onboardingSurfaces={["What to notice"]}
      />,
    );

    await waitFor(() =>
      expect(
        localConceptProgressStore.getSnapshot().concepts["projectile-motion"]?.firstVisitedAt,
      ).toBeTruthy(),
    );

    expect(events).toContainEqual(
      expect.objectContaining({
        name: "concept_started",
        payload: expect.objectContaining({
          pagePath: "/concepts/projectile-motion",
          pageKind: "concept",
          conceptId: "concept-projectile-motion",
          conceptSlug: "projectile-motion",
        }),
      }),
    );
  });

  it("does not emit concept_started when the concept already has local progress", async () => {
    recordConceptVisit({
      id: "concept-projectile-motion",
      slug: "projectile-motion",
      title: "Projectile Motion",
    });

    const events: AnalyticsSubmission[] = [];

    setAnalyticsTransportForTests((event) => {
      events.push(event);
    });

    render(
      <ConceptProgressCard
        concept={{
          id: "concept-projectile-motion",
          slug: "projectile-motion",
          title: "Projectile Motion",
        }}
      />,
    );

    await waitFor(() =>
      expect(
        localConceptProgressStore.getSnapshot().concepts["projectile-motion"]?.firstVisitedAt,
      ).toBeTruthy(),
    );

    expect(events).toEqual([]);
  });

  it("surfaces a weak-area revisit cue when the last quick tests were missed", async () => {
    recordQuickTestCompleted(
      {
        id: "concept-projectile-motion",
        slug: "projectile-motion",
        title: "Projectile Motion",
      },
      {
        incorrectAnswers: 2,
        totalQuestions: 4,
      },
    );
    recordQuickTestCompleted(
      {
        id: "concept-projectile-motion",
        slug: "projectile-motion",
        title: "Projectile Motion",
      },
      {
        incorrectAnswers: 2,
        totalQuestions: 4,
      },
    );

    const { getByText } = render(
      <ConceptProgressCard
        concept={{
          id: "concept-projectile-motion",
          slug: "projectile-motion",
          title: "Projectile Motion",
        }}
      />,
    );

    expect(getByText(/worth revisiting/i)).toBeInTheDocument();
    expect(
      getByText(/quick test has ended with missed questions 2 times in a row/i),
    ).toBeInTheDocument();
  });

  it("renders synced challenge history without re-emitting concept_started", async () => {
    const events: AnalyticsSubmission[] = [];

    setAnalyticsTransportForTests((event) => {
      events.push(event);
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-29T12:46:00.000Z"));

    const { getByText } = render(
      <ConceptProgressCard
        concept={{
          id: "concept-projectile-motion",
          slug: "projectile-motion",
          title: "Projectile Motion",
        }}
        initialSyncedSnapshot={{
          version: 1,
          concepts: {
            "projectile-motion": {
              conceptId: "concept-projectile-motion",
              slug: "projectile-motion",
              firstVisitedAt: "2026-03-27T10:00:00.000Z",
              lastVisitedAt: "2026-03-27T10:05:00.000Z",
              usedChallengeModeAt: "2026-03-27T10:00:00.000Z",
              startedChallenges: {
                "pm-ch-flat-far-shot": "2026-03-27T10:02:00.000Z",
              },
            },
          },
        }}
        challengeIds={["pm-ch-flat-far-shot"]}
      />,
    );

    expect(getByText(/Last activity Mar 29, 12:46 PM UTC\./i)).toBeInTheDocument();
    vi.useRealTimers();
    await waitFor(() =>
      expect(
        localConceptProgressStore.getSnapshot().concepts["projectile-motion"]?.lastVisitedAt,
      ).toBeTruthy(),
    );

    expect(getByText(/^Synced$/i)).toBeInTheDocument();
    expect(getByText(/started 1 of 1 challenge/i)).toBeInTheDocument();
    expect(events).toEqual([]);
  });
});
