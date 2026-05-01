import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PageShell } from "@/components/layout/PageShell";

vi.mock("@/components/analytics/AnalyticsPageView", () => ({
  AnalyticsPageView: () => <div data-testid="analytics-page-view" />,
}));

vi.mock("@/components/feedback/FeedbackWidget", () => ({
  FeedbackWidget: () => <div data-testid="feedback-widget" />,
}));

vi.mock("@/components/onboarding/OnboardingExperience", () => ({
  OnboardingExperience: () => <div data-testid="onboarding-experience" />,
}));

vi.mock("@/components/layout/SiteHeader", () => ({
  SiteHeader: () => <header data-testid="site-header" />,
}));

vi.mock("@/components/layout/SiteFooter", () => ({
  SiteFooter: () => <footer data-testid="site-footer" />,
}));

describe("PageShell", () => {
  it("reserves extra mobile bottom space when the floating feedback widget is visible", () => {
    render(
      <PageShell layoutMode="section-shell" className="space-y-4">
        <p>Concept page content</p>
      </PageShell>,
    );

    const main = screen.getByRole("main");
    expect(main).toHaveClass("w-full", "pb-28", "sm:pb-16", "space-y-4");
    expect(main).not.toHaveClass("max-w-[88rem]");
    expect(screen.getByTestId("feedback-widget")).toBeInTheDocument();
  });

  it("keeps the smaller bottom padding when the feedback widget is disabled", () => {
    render(
      <PageShell showFeedbackWidget={false}>
        <p>Account page content</p>
      </PageShell>,
    );

    const main = screen.getByRole("main");
    expect(main).toHaveClass("max-w-[88rem]", "pb-16");
    expect(main).not.toHaveClass("pb-28", "sm:pb-16");
    expect(screen.queryByTestId("feedback-widget")).not.toBeInTheDocument();
  });
});
