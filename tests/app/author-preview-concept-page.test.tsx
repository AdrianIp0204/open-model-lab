// @vitest-environment jsdom

import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/layout/PageShell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/concepts/ConceptPageFramework", () => ({
  ConceptPageFramework: () => <div>Concept framework</div>,
}));

vi.mock("@/lib/quiz", () => ({
  hasConceptQuizSupport: () => true,
}));

vi.mock("@/lib/content", () => {
  const concept = {
    id: "projectile-motion",
    slug: "projectile-motion",
    title: "Projectile motion",
    summary: "Explore projectile motion.",
    topic: "Mechanics",
    contentFile: "projectile-motion",
    published: true,
    seo: { title: "Projectile motion", description: "SEO" },
    equations: [],
    variableLinks: [],
    accessibility: {
      simulationDescription: { paragraphs: ["Simulation description"] },
      graphSummary: { paragraphs: ["Graph summary"] },
    },
    noticePrompts: { title: "Notice", intro: "Intro", items: [] },
    predictionMode: { title: "Predict", intro: "Intro", items: [] },
    challengeMode: { items: [] },
    simulation: { graphs: [], overlays: [] },
    graphs: [],
    sections: { workedExamples: { items: [] } },
  };

  return {
    getAllConceptMetadata: () => [{ slug: concept.slug, published: true }],
    getConceptBySlug: () => concept,
    getStarterTrackMembershipsForConcept: () => [],
    resolveReadNextFromRegistry: () => [],
  };
});

import AuthorPreviewConceptPage from "@/app/author-preview/concepts/[slug]/page";

describe("AuthorPreviewConceptPage", () => {
  it("preserves the active locale in author preview navigation", async () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    render(
      await AuthorPreviewConceptPage({
        params: Promise.resolve({ slug: "projectile-motion" }),
      }),
    );

    expect(screen.getByRole("link", { name: "返回作者預覽" })).toHaveAttribute(
      "href",
      "/zh-HK/author-preview",
    );
    expect(screen.getByRole("link", { name: "打開公開頁面" })).toHaveAttribute(
      "href",
      "/zh-HK/concepts/projectile-motion",
    );
  });
});
