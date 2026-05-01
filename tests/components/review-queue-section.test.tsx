// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReviewQueueSection } from "@/components/progress/ReviewQueueSection";
import type { ConceptSummary } from "@/components/concepts/concept-catalog";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";
import { getGuidedCollectionBySlug, getStarterTrackBySlug } from "@/lib/content";
import zhHkMessages from "@/messages/zh-HK.json";
import {
  buildSavedContinueLearningState,
  PROGRESS_STORAGE_KEY,
  localConceptProgressStore,
} from "@/lib/progress";

const useAccountSessionMock = vi.fn();

vi.mock("@/lib/account/client", () => ({
  useAccountSession: () => useAccountSessionMock(),
}));

const starterTracks = [getStarterTrackBySlug("motion-and-circular-motion")];

const concepts: ConceptSummary[] = [
  {
    id: "concept-vectors-components",
    slug: "vectors-components",
    title: "Vectors and Components",
    shortTitle: "Vectors",
    summary: "Rotate and decompose a live vector.",
    subject: "Physics",
    topic: "Mechanics",
    subtopic: "Foundations",
    difficulty: "Intro",
    sequence: 5,
    status: "published",
    estimatedStudyMinutes: 20,
    heroConcept: false,
    accent: "sky",
    highlights: ["Components"],
  },
  {
    id: "concept-shm",
    slug: "simple-harmonic-motion",
    title: "Simple Harmonic Motion",
    shortTitle: "SHM",
    summary: "See one repeating system.",
    subject: "Physics",
    topic: "Oscillations",
    subtopic: "Foundations",
    difficulty: "Intro",
    sequence: 10,
    status: "published",
    estimatedStudyMinutes: 25,
    heroConcept: true,
    accent: "teal",
    highlights: ["Amplitude"],
  },
  {
    id: "concept-projectile-motion",
    slug: "projectile-motion",
    title: "Projectile Motion",
    shortTitle: "Projectile",
    summary: "Follow a launch through space.",
    subject: "Physics",
    topic: "Mechanics",
    subtopic: "Two-dimensional motion",
    difficulty: "Intro",
    sequence: 30,
    status: "published",
    estimatedStudyMinutes: 25,
    heroConcept: true,
    accent: "coral",
    highlights: ["Trajectory"],
    prerequisites: ["vectors-components"],
  },
];

describe("ReviewQueueSection", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-27T12:00:00.000Z"));
    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-out",
      user: null,
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "anonymous-default",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    globalThis.__TEST_LOCALE__ = undefined;
    vi.unstubAllGlobals();
    window.localStorage.clear();
    localConceptProgressStore.resetForTests();
    fetchMock.mockReset();
    useAccountSessionMock.mockReset();
    vi.useRealTimers();
  });

  it("surfaces low-confidence and stale review candidates from local progress", () => {
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        concepts: {
          "vectors-components": {
            conceptId: "concept-vectors-components",
            slug: "vectors-components",
            firstVisitedAt: "2026-03-24T08:00:00.000Z",
            lastVisitedAt: "2026-03-24T08:10:00.000Z",
          },
          "simple-harmonic-motion": {
            conceptId: "concept-shm",
            slug: "simple-harmonic-motion",
            firstVisitedAt: "2026-03-18T08:00:00.000Z",
            lastVisitedAt: "2026-03-18T08:10:00.000Z",
          },
          "projectile-motion": {
            conceptId: "concept-projectile-motion",
            slug: "projectile-motion",
            manualCompletedAt: "2026-03-22T09:00:00.000Z",
          },
        },
      }),
    );

    render(<ReviewQueueSection concepts={concepts} starterTracks={starterTracks} />);

    expect(
      screen.getByRole("heading", {
        name: /surface the concepts that need another pass/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Projectile Motion")).toBeInTheDocument();
    expect(screen.getByText("Simple Harmonic Motion")).toBeInTheDocument();
    expect(screen.getByText(/needs confidence/i)).toBeInTheDocument();
    expect(screen.getAllByText(/unfinished/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/motion and circular motion entry diagnostic still needs flat long shot/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open projectile checkpoint/i })).toHaveAttribute(
      "href",
      "/concepts/projectile-motion?challenge=pm-ch-flat-far-shot#challenge-mode",
    );
    expect(screen.getByRole("link", { name: /resume concept/i })).toHaveAttribute(
      "href",
      "/concepts/simple-harmonic-motion",
    );
  });

  it("labels repeated quick-test misses as review work worth resurfacing", () => {
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        concepts: {
          "vectors-components": {
            conceptId: "concept-vectors-components",
            slug: "vectors-components",
            firstVisitedAt: "2026-03-27T11:00:00.000Z",
            lastVisitedAt: "2026-03-27T11:10:00.000Z",
          },
          "projectile-motion": {
            conceptId: "concept-projectile-motion",
            slug: "projectile-motion",
            completedQuickTestAt: "2026-03-26T09:00:00.000Z",
            quickTestAttemptCount: 2,
            quickTestLastIncorrectCount: 2,
            quickTestMissStreak: 2,
            quickTestLastMissedAt: "2026-03-26T09:00:00.000Z",
          },
        },
      }),
    );

    render(<ReviewQueueSection concepts={concepts} starterTracks={starterTracks} />);

    expect(screen.getByText(/missed checks/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/quick test has ended with missed questions 2 times in a row/i).length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /retry quick test/i })).toHaveAttribute(
      "href",
      "/concepts/projectile-motion#quick-test",
    );
    expect(screen.getByRole("link", { name: /review vectors/i })).toHaveAttribute(
      "href",
      "/concepts/vectors-components",
    );
  });

  it("renders a compact concept-bundle recovery suggestion when a guided collection can shrink the reset path", () => {
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        concepts: {
          "simple-harmonic-motion": {
            conceptId: "concept-shm",
            slug: "simple-harmonic-motion",
            firstVisitedAt: "2026-03-29T10:00:00.000Z",
            lastVisitedAt: "2026-03-29T10:05:00.000Z",
          },
          "electric-potential": {
            conceptId: "concept-electric-potential",
            slug: "electric-potential",
            completedQuickTestAt: "2026-03-26T09:00:00.000Z",
            quickTestAttemptCount: 2,
            quickTestLastIncorrectCount: 2,
            quickTestMissStreak: 2,
            quickTestLastMissedAt: "2026-03-26T09:00:00.000Z",
          },
        },
      }),
    );

    render(
      <ReviewQueueSection
        concepts={[
          {
            id: "concept-shm",
            slug: "simple-harmonic-motion",
            title: "Simple Harmonic Motion",
            shortTitle: "SHM",
            summary: "See one repeating system.",
            subject: "Physics",
            topic: "Oscillations",
            subtopic: "Foundations",
            difficulty: "Intro",
            sequence: 10,
            status: "published",
            estimatedStudyMinutes: 25,
            heroConcept: true,
            accent: "teal",
            highlights: ["Amplitude"],
          },
          {
            id: "concept-electric-fields",
            slug: "electric-fields",
            title: "Electric Fields",
            shortTitle: "E-fields",
            summary: "See how source charges set the field direction and strength.",
            subject: "Physics",
            topic: "Electricity",
            subtopic: "Field and force",
            difficulty: "Intro",
            sequence: 31,
            status: "published",
            estimatedStudyMinutes: 25,
            heroConcept: false,
            accent: "sky",
            highlights: ["Field direction"],
          },
          {
            id: "concept-electric-potential",
            slug: "electric-potential",
            title: "Electric Potential",
            shortTitle: "Potential",
            summary: "Bridge the field picture into voltage and potential difference.",
            subject: "Physics",
            topic: "Electricity",
            subtopic: "Potential and voltage",
            difficulty: "Intro",
            sequence: 32,
            status: "published",
            estimatedStudyMinutes: 30,
            heroConcept: false,
            accent: "sky",
            highlights: ["Voltage"],
            prerequisites: ["electric-fields"],
          },
        ]}
        starterTracks={[getStarterTrackBySlug("electricity")]}
        guidedCollections={[getGuidedCollectionBySlug("electricity-bridge-lesson-set")]}
      />,
    );

    expect(screen.getAllByText(/concept bundle/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/electricity bridge lesson set/i)).toBeInTheDocument();

    const bundleLink = screen.getByRole("link", { name: /open focus bundle/i });
    expect(bundleLink.getAttribute("href")).toMatch(
      /^\/guided\/electricity-bridge-lesson-set\?bundle=v1\.[A-Za-z0-9_-]+#concept-bundle$/,
    );
  });

  it("falls back to synced review cues when this browser has no local progress yet", () => {
    const syncedState = buildSavedContinueLearningState(
      {
        version: 1,
        concepts: {
          "vectors-components": {
            conceptId: "concept-vectors-components",
            slug: "vectors-components",
            firstVisitedAt: "2026-03-27T11:00:00.000Z",
            lastVisitedAt: "2026-03-27T11:10:00.000Z",
          },
          "projectile-motion": {
            conceptId: "concept-projectile-motion",
            slug: "projectile-motion",
            completedQuickTestAt: "2026-03-26T09:00:00.000Z",
            quickTestAttemptCount: 2,
            quickTestLastIncorrectCount: 2,
            quickTestMissStreak: 2,
            quickTestLastMissedAt: "2026-03-26T09:00:00.000Z",
          },
        },
      },
      {
        concepts,
        starterTracks,
        computedAt: "2026-03-27T12:00:00.000Z",
      },
    );

    render(
      <ReviewQueueSection
        concepts={concepts}
        starterTracks={starterTracks}
        initialSyncedContinueLearningState={syncedState}
      />,
    );

    expect(screen.getByText(/synced across devices/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /retry quick test/i })).toHaveAttribute(
      "href",
      "/concepts/projectile-motion#quick-test",
    );
    expect(screen.getByText("Last active Mar 26")).toBeInTheDocument();
  });

  it("uses a merged browser-plus-account snapshot when local progress already exists", () => {
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        concepts: {
          "uniform-circular-motion": {
            conceptId: "concept-uniform-circular-motion",
            slug: "uniform-circular-motion",
            firstVisitedAt: "2026-03-27T11:30:00.000Z",
            lastVisitedAt: "2026-03-27T11:35:00.000Z",
          },
        },
      }),
    );
    localConceptProgressStore.resetForTests();

    render(
      <ReviewQueueSection
        concepts={concepts}
        starterTracks={starterTracks}
        initialSyncedSnapshot={{
          version: 1,
          concepts: {
            "vectors-components": {
              conceptId: "concept-vectors-components",
              slug: "vectors-components",
              manualCompletedAt: "2026-03-27T10:00:00.000Z",
            },
            "projectile-motion": {
              conceptId: "concept-projectile-motion",
              slug: "projectile-motion",
              manualCompletedAt: "2026-03-27T10:10:00.000Z",
            },
          },
        }}
      />,
    );

    expect(screen.getAllByText(/checkpoint/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /open checkpoint/i })).toHaveAttribute(
      "href",
      "/concepts/projectile-motion?challenge=pm-ch-flat-far-shot#challenge-mode",
    );
  });

  it("labels checkpoint recovery when a ready checkpoint is being skipped past", () => {
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        concepts: {
          "vectors-components": {
            conceptId: "concept-vectors-components",
            slug: "vectors-components",
            manualCompletedAt: "2026-03-20T09:00:00.000Z",
          },
          "projectile-motion": {
            conceptId: "concept-projectile-motion",
            slug: "projectile-motion",
            manualCompletedAt: "2026-03-21T09:00:00.000Z",
          },
          "uniform-circular-motion": {
            conceptId: "concept-uniform-circular-motion",
            slug: "uniform-circular-motion",
            firstVisitedAt: "2026-03-25T09:00:00.000Z",
            lastVisitedAt: "2026-03-25T09:05:00.000Z",
          },
        },
      }),
    );

    render(<ReviewQueueSection concepts={concepts} starterTracks={starterTracks} />);

    expect(screen.getAllByText(/checkpoint/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /open checkpoint/i })).toHaveAttribute(
      "href",
      "/concepts/projectile-motion?challenge=pm-ch-flat-far-shot#challenge-mode",
    );
  });

  it("can add a saved compare setup recovery action when the review card has no stronger catalog recovery path", async () => {
    vi.useRealTimers();
    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-in",
      user: {
        id: "user-1",
      },
      entitlement: resolveAccountEntitlement({
        tier: "premium",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "saved-compare-1",
            conceptSlug: "compare-practice",
            name: "Baseline vs variant",
            updatedAt: "2026-03-27T12:00:00.000Z",
            setupALabel: "Baseline",
            setupBLabel: "Variant",
            href: "/concepts/compare-practice?state=v1.saved&experiment=v1.saved#live-bench",
          },
        ],
      }),
    });
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        concepts: {
          "compare-practice": {
            conceptId: "concept-compare-practice",
            slug: "compare-practice",
            manualCompletedAt: "2026-03-26T09:00:00.000Z",
          },
        },
      }),
    );

    render(
      <ReviewQueueSection
        concepts={[
          {
            id: "concept-compare-practice",
            slug: "compare-practice",
            title: "Compare Practice",
            shortTitle: "Compare Practice",
            summary: "Use compare mode to test one bench against another.",
            subject: "Physics",
            topic: "Mechanics",
            subtopic: "Foundations",
            difficulty: "Intro",
            sequence: 40,
            status: "published",
            estimatedStudyMinutes: 20,
            heroConcept: false,
            accent: "teal",
            highlights: ["Compare mode"],
          },
        ]}
        starterTracks={[]}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/saved compare setup/i)).toBeInTheDocument();
    });

    expect(screen.getByRole("link", { name: /open saved setup/i })).toHaveAttribute(
      "href",
      "/concepts/compare-practice?state=v1.saved&experiment=v1.saved#live-bench",
    );
  });

  it("shows sign-in and pricing paths for signed-out review sessions", () => {
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        concepts: {
          "projectile-motion": {
            conceptId: "concept-projectile-motion",
            slug: "projectile-motion",
            completedQuickTestAt: "2026-03-26T09:00:00.000Z",
            quickTestAttemptCount: 2,
            quickTestLastIncorrectCount: 2,
            quickTestMissStreak: 2,
            quickTestLastMissedAt: "2026-03-26T09:00:00.000Z",
          },
        },
      }),
    );

    render(<ReviewQueueSection concepts={concepts} starterTracks={starterTracks} />);

    expect(screen.getByText("Advanced review stays in Supporter")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View Supporter plan" })).toHaveAttribute(
      "href",
      "/pricing#compare",
    );
    expect(screen.getByRole("link", { name: /sign in for sync/i })).toHaveAttribute(
      "href",
      "/account",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows one Supporter notice for signed-in free review sessions without fetching recovery actions", () => {
    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-in",
      user: {
        id: "user-1",
      },
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
    });
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        concepts: {
          "projectile-motion": {
            conceptId: "concept-projectile-motion",
            slug: "projectile-motion",
            completedQuickTestAt: "2026-03-26T09:00:00.000Z",
            quickTestAttemptCount: 2,
            quickTestLastIncorrectCount: 2,
            quickTestMissStreak: 2,
            quickTestLastMissedAt: "2026-03-26T09:00:00.000Z",
          },
        },
      }),
    );

    render(<ReviewQueueSection concepts={concepts} starterTracks={starterTracks} />);

    expect(
      screen.getByText(/free accounts still keep the core progress flow/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View Supporter plan" })).toHaveAttribute(
      "href",
      "/pricing#compare",
    );
    expect(screen.queryByRole("link", { name: /sign in for sync/i })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renders zh-HK review copy without leaking English queue reasons", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        concepts: {
          "vectors-components": {
            conceptId: "concept-vectors-components",
            slug: "vectors-components",
            firstVisitedAt: "2026-03-27T11:00:00.000Z",
            lastVisitedAt: "2026-03-27T11:10:00.000Z",
          },
          "projectile-motion": {
            conceptId: "concept-projectile-motion",
            slug: "projectile-motion",
            completedQuickTestAt: "2026-03-26T09:00:00.000Z",
            quickTestAttemptCount: 2,
            quickTestLastIncorrectCount: 2,
            quickTestMissStreak: 2,
            quickTestLastMissedAt: "2026-03-26T09:00:00.000Z",
          },
        },
      }),
    );

    render(<ReviewQueueSection concepts={concepts} starterTracks={starterTracks} />);

    expect(
      screen.getByRole("heading", {
        name: zhHkMessages.ReviewQueueSection.heading.title,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(zhHkMessages.ProgressCopy.reviewReasons.missedChecks),
    ).toBeInTheDocument();
    expect(screen.queryByText(/quick test has ended with missed questions/i)).not.toBeInTheDocument();
    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"))
      .filter((href): href is string => Boolean(href));
    expect(hrefs).toContain("/zh-HK/concepts/projectile-motion#quick-test");
  });
});
