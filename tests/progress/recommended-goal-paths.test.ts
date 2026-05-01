import { describe, expect, it } from "vitest";
import { getRecommendedGoalPathBySlug } from "@/lib/content";
import {
  buildRecommendedGoalPathProgressSummary,
  createEmptyProgressSnapshot,
} from "@/lib/progress";

describe("recommended goal path progress", () => {
  it("surfaces authored prerequisite prep when a branch-prep goal has not started yet", () => {
    const summary = buildRecommendedGoalPathProgressSummary(
      createEmptyProgressSnapshot(),
      getRecommendedGoalPathBySlug("prepare-for-electromagnetism"),
    );

    expect(summary.status).toBe("not-started");
    expect(summary.primaryAction).toMatchObject({
      href: "/tracks/electricity",
      label: "Start Electricity",
    });
    expect(summary.prerequisiteRecommendations[0]?.note).toMatch(
      /Electricity is the authored prerequisite for Magnetism/i,
    );
  });

  it("reuses continue-learning logic when a concept inside the goal path already has progress", () => {
    const snapshot = createEmptyProgressSnapshot();

    snapshot.concepts["wave-interference"] = {
      conceptId: "concept-wave-interference",
      slug: "wave-interference",
      firstVisitedAt: "2026-03-28T10:00:00.000Z",
      lastVisitedAt: "2026-03-28T10:05:00.000Z",
    };

    const summary = buildRecommendedGoalPathProgressSummary(
      snapshot,
      getRecommendedGoalPathBySlug("waves-intuition"),
    );

    expect(summary.status).toBe("in-progress");
    expect(summary.primaryAction).toMatchObject({
      href: "/concepts/wave-interference",
      label: "Continue concept",
    });
  });

  it("preserves locale in recommended goal path actions", () => {
    const snapshot = createEmptyProgressSnapshot();

    snapshot.concepts["wave-interference"] = {
      conceptId: "concept-wave-interference",
      slug: "wave-interference",
      firstVisitedAt: "2026-03-28T10:00:00.000Z",
      lastVisitedAt: "2026-03-28T10:05:00.000Z",
    };

    const summary = buildRecommendedGoalPathProgressSummary(
      snapshot,
      getRecommendedGoalPathBySlug("waves-intuition"),
      "zh-HK",
    );

    expect(summary.primaryAction).toMatchObject({
      href: "/zh-HK/concepts/wave-interference",
      label: "繼續概念",
    });
    expect(summary.stepProgress.some((step) => step.primaryAction.href.startsWith("/zh-HK/"))).toBe(true);
    expect(summary.bundleAction?.href.startsWith("/zh-HK/")).toBe(true);
  });
});
