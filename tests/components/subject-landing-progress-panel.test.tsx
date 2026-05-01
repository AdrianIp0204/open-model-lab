import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SubjectLandingProgressPanel } from "@/components/concepts/SubjectLandingProgressPanel";
import { getSubjectDiscoverySummaryBySlug } from "@/lib/content";
import { localConceptProgressStore, PROGRESS_STORAGE_KEY } from "@/lib/progress";
import zhHkMessages from "@/messages/zh-HK.json";

describe("SubjectLandingProgressPanel", () => {
  afterEach(() => {
    window.localStorage.clear();
    localConceptProgressStore.resetForTests();
  });

  it("starts with a subject-owned track when no saved subject progress exists", () => {
    render(
      <SubjectLandingProgressPanel subject={getSubjectDiscoverySummaryBySlug("chemistry")} />,
    );

    expect(screen.getByText(/no saved chemistry progress yet/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /start rates and equilibrium/i }),
    ).toHaveAttribute("href", "/tracks/rates-and-equilibrium");
    expect(
      screen.getByRole("link", { name: /open rates and equilibrium/i }),
    ).toHaveAttribute("href", "/concepts/topics/rates-and-equilibrium");
  });

  it("prefers within-subject continue-learning and still shows the current subject track", () => {
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        concepts: {
          "graph-transformations": {
            conceptId: "concept-graph-transformations",
            slug: "graph-transformations",
            firstVisitedAt: "2026-04-03T09:00:00.000Z",
            lastVisitedAt: "2026-04-03T09:10:00.000Z",
            lastInteractedAt: "2026-04-03T09:10:00.000Z",
          },
        },
      }),
    );
    localConceptProgressStore.resetForTests();

    render(<SubjectLandingProgressPanel subject={getSubjectDiscoverySummaryBySlug("math")} />);

    expect(
      screen
        .getAllByRole("link", { name: /continue concept/i })
        .every((link) => link.getAttribute("href") === "/concepts/graph-transformations"),
    ).toBe(true);
    expect(screen.getAllByText(/graph transformations/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/functions and change/i).length).toBeGreaterThan(0);
    expect(
      screen
        .getAllByRole("link", { name: /continue track/i })
        .every((link) => link.getAttribute("href") === "/tracks/functions-and-change"),
    ).toBe(true);
  });

  it("surfaces recent checkpoint clears and challenge solves inside the subject panel", () => {
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        concepts: {
          "projectile-motion": {
            conceptId: "concept-projectile-motion",
            slug: "projectile-motion",
            firstVisitedAt: "2026-04-03T09:00:00.000Z",
            lastVisitedAt: "2026-04-05T09:10:00.000Z",
            lastInteractedAt: "2026-04-05T09:10:00.000Z",
            completedChallenges: {
              "pm-ch-flat-far-shot": "2026-04-05T09:15:00.000Z",
              "pm-ch-apex-freeze": "2026-04-05T09:20:00.000Z",
            },
          },
        },
      }),
    );
    localConceptProgressStore.resetForTests();

    render(<SubjectLandingProgressPanel subject={getSubjectDiscoverySummaryBySlug("physics")} />);

    expect(screen.getByText(/challenge solves/i)).toBeInTheDocument();
    expect(screen.getByText(/trajectory checkpoint/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /reopen checkpoint/i })).toHaveAttribute(
      "href",
      "/concepts/projectile-motion?challenge=pm-ch-flat-far-shot#challenge-mode",
    );
  });

  it("renders zh-HK progress chrome for localized subject pages", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    render(<SubjectLandingProgressPanel subject={getSubjectDiscoverySummaryBySlug("physics")} />);

    expect(
      screen.getByText(
        (_, element) =>
          element?.classList.contains("lab-label") === true &&
          (element.textContent?.includes("物理") ?? false),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(zhHkMessages.SubjectLandingProgressPanel.sections.primaryNextStep)
        .length,
    ).toBeGreaterThan(0);
  });
});
