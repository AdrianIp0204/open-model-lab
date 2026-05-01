// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SubjectLandingPage } from "@/components/concepts/SubjectLandingPage";
import { getSubjectDiscoverySummaryBySlug } from "@/lib/content";
import zhHkMessages from "@/messages/zh-HK.json";

vi.mock("@/components/ads/AdSlot", () => ({
  DisplayAd: ({ placement }: { placement: string }) => (
    <div data-testid={`ad-slot-${placement}`}>Display ad</div>
  ),
  MultiplexAd: ({ placement }: { placement: string }) => (
    <div data-testid={`ad-slot-${placement}`}>Multiplex ad</div>
  ),
}));

describe("SubjectLandingPage", () => {
  it("links the subject hero to the shared start-learning and search routes", async () => {
    render(
      await SubjectLandingPage({
        subject: getSubjectDiscoverySummaryBySlug("chemistry"),
      }),
    );

    expect(
      screen.getByRole("link", { name: /new here\? start here/i }),
    ).toHaveAttribute("href", "/start?subject=chemistry");
    expect(
      screen.getByRole("link", { name: /search chemistry/i }),
    ).toHaveAttribute("href", "/search?subject=chemistry");
    expect(screen.getByTestId("ad-slot-subject.headerDisplay")).toBeInTheDocument();
    expect(screen.getByTestId("ad-slot-subject.footerMultiplex")).toBeInTheDocument();
  });

  it("renders the computer-science landing hero through the same bounded subject pattern", async () => {
    render(
      await SubjectLandingPage({
        subject: getSubjectDiscoverySummaryBySlug("computer-science"),
      }),
    );

    expect(
      screen.getByRole("link", { name: /new here\? start here/i }),
    ).toHaveAttribute("href", "/start?subject=computer-science");
    expect(
      screen
        .getAllByRole("link", { name: /search computer science/i })
        .some((link) => link.getAttribute("href") === "/search?subject=computer-science"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: /^Open Algorithms and Search$/i })
        .every((link) => link.getAttribute("href") === "/concepts/topics/algorithms-and-search"),
    ).toBe(true);
  });

  it("renders zh-HK subject chrome and actions when a locale override is provided", async () => {
    render(
      await SubjectLandingPage({
        subject: getSubjectDiscoverySummaryBySlug("physics"),
        locale: "zh-HK",
      }),
    );

    expect(
      screen.getAllByText(zhHkMessages.SubjectLandingPage.labels.subjectEntry).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", {
        name: zhHkMessages.SubjectLandingPage.actions.newHereStartHere,
      }),
    ).toHaveAttribute("href", "/start?subject=physics");
  });
});
