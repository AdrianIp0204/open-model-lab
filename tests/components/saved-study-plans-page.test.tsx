// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SavedStudyPlansPage } from "@/components/account/SavedStudyPlansPage";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";
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
  ];

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

    render(
      <SavedStudyPlansPage
        concepts={concepts}
        starterTracks={[]}
        guidedCollections={[]}
        recommendedGoalPaths={[]}
      />,
    );

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
    expect(
      screen.getByRole("option", {
        name: new RegExp(`\\[${zhHkMessages.SavedStudyPlansPage.entryKinds.concept}\\]`),
      }),
    ).toBeInTheDocument();
  });
});
