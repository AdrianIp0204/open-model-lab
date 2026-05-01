// @vitest-environment jsdom

import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/layout/PageShell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/lib/content", () => ({
  getAuthorPreviewIndex: () => ({
    generatedAt: "2026-04-25T00:00:00.000Z",
    summary: {
      conceptCount: 1,
      publishedConceptCount: 1,
      draftConceptCount: 0,
      trackCount: 1,
      totalChallengeItems: 2,
      totalWorkedExamples: 3,
      totalQuickTestQuestions: 4,
    },
    concepts: [
      {
        slug: "projectile-motion",
        status: "published",
        topic: "Mechanics",
        simulationKind: "2d",
        title: "Projectile motion",
        contentFile: "projectile-motion",
        previewHref: "/author-preview/concepts/projectile-motion",
        publicHref: "/concepts/projectile-motion",
        previewReadNext: [],
        prerequisiteSlugs: [],
        relatedSlugs: [],
        starterTrackSlugs: ["motion-and-circular-motion"],
        sectionOrder: ["intro", "explore"],
        counts: {
          equations: 1,
          controls: 2,
          presets: 3,
          overlays: 4,
          graphs: 5,
          noticePrompts: 6,
          predictionItems: 7,
          challengeItems: 8,
          workedExamples: 9,
          quickTestQuestions: 10,
        },
        lastModified: "2026-04-25T00:00:00.000Z",
      },
    ],
    starterTracks: [
      {
        slug: "motion-and-circular-motion",
        title: "Motion and circular motion",
        publicHref: "/tracks/motion-and-circular-motion",
        conceptSlugs: ["projectile-motion"],
        conceptPreviewHrefs: ["/author-preview/concepts/projectile-motion"],
        estimatedStudyMinutes: 45,
      },
    ],
  }),
}));

import AuthorPreviewIndexPage from "@/app/author-preview/page";

describe("AuthorPreviewIndexPage", () => {
  it("preserves the active locale in preview and public links", async () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    render(await AuthorPreviewIndexPage());

    expect(screen.getByRole("link", { name: "打開預覽" })).toHaveAttribute(
      "href",
      "/zh-HK/author-preview/concepts/projectile-motion",
    );
    expect(screen.getByRole("link", { name: "打開公開頁面" })).toHaveAttribute(
      "href",
      "/zh-HK/concepts/projectile-motion",
    );
    expect(screen.getByRole("link", { name: "打開路徑頁面" })).toHaveAttribute(
      "href",
      "/zh-HK/tracks/motion-and-circular-motion",
    );
    expect(screen.getByRole("link", { name: "預覽 projectile-motion" })).toHaveAttribute(
      "href",
      "/zh-HK/author-preview/concepts/projectile-motion",
    );
  });
});
