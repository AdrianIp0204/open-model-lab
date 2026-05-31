// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SavedStudyPlansPage } from "@/components/account/SavedStudyPlansPage";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";
import type { GuidedCollectionSummary, StarterTrackSummary } from "@/lib/content";
import zhHkMessages from "@/messages/zh-HK.json";

const useAccountSessionMock = vi.fn();
const useProgressSnapshotMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("@/lib/account/client", () => ({
  useAccountSession: () => useAccountSessionMock(),
}));

vi.mock("@/lib/progress", async () => {
  const actual = await vi.importActual<typeof import("@/lib/progress")>(
    "@/lib/progress",
  );

  return {
    ...actual,
    useProgressSnapshot: () => useProgressSnapshotMock(),
  };
});

describe("SavedStudyPlansPage", () => {
  const concepts = [
    {
      id: "concept-projectile-motion",
      slug: "projectile-motion",
      title: "Projectile Motion",
      shortTitle: "Projectile",
      subject: "Physics",
      topic: "Mechanics",
      summary: "Track two-dimensional motion with linked graph and controls.",
      estimatedStudyMinutes: 18,
      difficulty: "intro" as const,
      accent: "coral" as const,
      highlights: ["Trajectory"],
      tags: [],
      featured: false,
      family: "physics" as const,
      goodFirstConcept: true,
      status: "published" as const,
    },
    {
      id: "concept-uniform-circular-motion",
      slug: "uniform-circular-motion",
      title: "Uniform Circular Motion",
      shortTitle: "Circular motion",
      subject: "Physics",
      topic: "Mechanics",
      summary: "Read turning motion as velocity changes direction.",
      estimatedStudyMinutes: 20,
      difficulty: "intro" as const,
      accent: "coral" as const,
      highlights: ["Centripetal acceleration"],
      tags: [],
      featured: false,
      family: "physics" as const,
      goodFirstConcept: false,
      status: "published" as const,
    },
  ];
  const starterTrack = {
    id: "starter-track-motion-circular",
    slug: "motion-and-circular-motion",
    title: "Motion and Circular Motion",
    summary: "Start with vector components, projectile paths, and circular motion.",
    introduction: "Use this track for connected motion practice.",
    sequenceRationale: "Components and projectiles lead into turning motion.",
    accent: "coral",
    highlights: ["Components", "Trajectories"],
    conceptSlugs: concepts.map((concept) => concept.slug),
    concepts,
    checkpoints: [],
    entryDiagnostic: null,
    estimatedStudyMinutes: 38,
  } as unknown as StarterTrackSummary;
  const guidedCollection = {
    id: "guided-collection-waves-evidence-loop",
    slug: "waves-evidence-loop",
    format: "lesson-set",
    title: "Waves Evidence Loop",
    summary: "Keep the waves story bounded for a lesson block.",
    introduction: "Use this collection for compact wave evidence.",
    sequenceRationale: "Orient, practice, and close with one evidence loop.",
    accent: "sky",
    highlights: ["Topic orientation", "Wave starter track"],
    path: "/guided/waves-evidence-loop",
    steps: [],
    entryDiagnostic: null,
    conceptSlugs: [concepts[0]!.slug],
    concepts: [concepts[0]!],
    topics: [{ slug: "mechanics", title: "Mechanics", path: "/concepts/topics/mechanics" }],
    relatedTracks: [],
    estimatedStudyMinutes: 24,
    conceptCount: 1,
    trackCount: 0,
    challengeStepCount: 0,
    surfaceStepCount: 0,
  } as unknown as GuidedCollectionSummary;

  function renderPage() {
    return render(
      <SavedStudyPlansPage
        concepts={concepts}
        starterTracks={[starterTrack]}
        guidedCollections={[guidedCollection]}
        recommendedGoalPaths={[]}
      />,
    );
  }

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    });
    useProgressSnapshotMock.mockReturnValue({
      version: 1,
      concepts: {},
    });
    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-in",
      user: {
        id: "user-1",
        email: "student@example.com",
      },
      entitlement: resolveAccountEntitlement({
        tier: "premium",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    useProgressSnapshotMock.mockReset();
    useAccountSessionMock.mockReset();
  });

  it("renders the saved study-plan workspace in zh-HK", async () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    renderPage();

    expect(
      await screen.findByText(zhHkMessages.SavedStudyPlansPage.builder.createTitle),
    ).toBeInTheDocument();
    expect(
      screen.getByText(zhHkMessages.SavedStudyPlansPage.library.empty.title),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: zhHkMessages.SavedStudyPlansPage.builder.actions.addEntry,
      }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("study-plan-picker-search")).toBeInTheDocument();
    expect(screen.getByTestId("study-plan-picker-results")).toBeInTheDocument();
    expect(
      screen.getByText(zhHkMessages.SavedStudyPlansPage.builder.selectedItem.title),
    ).toBeInTheDocument();
  });

  it("filters catalog items and keeps the selected route preview editable", async () => {
    const user = userEvent.setup();

    useProgressSnapshotMock.mockReturnValue({
      version: 1,
      concepts: {
        "projectile-motion": {
          conceptId: "concept-projectile-motion",
          slug: "projectile-motion",
          firstVisitedAt: "2026-04-05T09:00:00.000Z",
          lastVisitedAt: "2026-04-05T09:10:00.000Z",
          quickTestLastIncorrectCount: 2,
        },
      },
    });

    renderPage();

    await screen.findByText("Build a saved study plan");

    await user.selectOptions(screen.getByTestId("study-plan-picker-kind-filter"), "concept");
    await user.selectOptions(screen.getByTestId("study-plan-picker-subject-filter"), "physics");
    await user.selectOptions(screen.getByTestId("study-plan-picker-topic-filter"), "mechanics");
    await user.selectOptions(
      screen.getByTestId("study-plan-picker-progress-filter"),
      "recommended",
    );
    await user.type(screen.getByTestId("study-plan-picker-search"), "projectile");
    await user.click(screen.getByTestId("study-plan-picker-option-concept:projectile-motion"));

    expect(screen.getByTestId("study-plan-selected-item-preview")).toHaveTextContent(
      "Projectile Motion",
    );

    await user.click(screen.getByRole("button", { name: "Add item" }));

    const routePreview = screen.getByTestId("study-plan-selected-route-preview");
    expect(routePreview).toHaveTextContent("Projectile Motion");
    expect(routePreview).toHaveTextContent("1 item covering 1 concept - 18 min");

    await user.clear(screen.getByTestId("study-plan-picker-search"));
    await user.selectOptions(screen.getByTestId("study-plan-picker-kind-filter"), "track");
    await user.selectOptions(screen.getByTestId("study-plan-picker-progress-filter"), "all");
    await user.type(screen.getByTestId("study-plan-picker-search"), "motion circular");
    await user.click(
      screen.getByTestId("study-plan-picker-option-track:motion-and-circular-motion"),
    );
    await user.click(screen.getByRole("button", { name: "Add item" }));

    expect(routePreview).toHaveTextContent("Motion and Circular Motion");
    await user.click(
      screen.getByRole("button", { name: "Move Motion and Circular Motion up" }),
    );

    const routeTextAfterMove = within(routePreview).getByTestId("study-plan-selected-route")
      .textContent;
    expect(routeTextAfterMove?.indexOf("Motion and Circular Motion")).toBeLessThan(
      routeTextAfterMove?.indexOf("Projectile Motion") ?? Number.MAX_SAFE_INTEGER,
    );

    await user.click(screen.getByRole("button", { name: "Remove Projectile Motion" }));
    expect(routePreview).not.toHaveTextContent("Projectile Motion");
    expect(routePreview).toHaveTextContent("Motion and Circular Motion");
  });
});
