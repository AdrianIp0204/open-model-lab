// @vitest-environment jsdom

import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import zhHkMessages from "@/messages/zh-HK.json";

vi.mock("@/components/layout/PageShell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/layout/SectionHeading", () => ({
  SectionHeading: ({
    eyebrow,
    title,
    description,
    action,
  }: {
    eyebrow: string;
    title: string;
    description: string;
    action?: ReactNode;
  }) => (
    <div>
      <p>{eyebrow}</p>
      <h1>{title}</h1>
      <p>{description}</p>
      {action}
    </div>
  ),
}));

vi.mock("@/components/motion", () => ({
  MotionSection: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  MotionStaggerGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import AboutPage from "@/app/about/AboutRoute";

describe("about page", () => {
  it("renders the founder story and support calls to action", async () => {
    render(await AboutPage());

    expect(
      screen.getByText(/Open Model Lab started from a frustration I couldn't ignore/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/It felt like I was learning how to answer, not how to understand/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Become a Supporter/i }),
    ).toHaveAttribute("href", "/pricing#compare");
    expect(
      screen.getByRole("link", { name: /Billing, cancellation, and refund help/i }),
    ).toHaveAttribute("href", "/billing");
    expect(screen.getByRole("link", { name: /Donate via Buy Me a Coffee/i })).toHaveAttribute(
      "href",
      "https://buymeacoffee.com/openmodellab",
    );
    expect(screen.getByRole("link", { name: /Donate via Buy Me a Coffee/i })).toHaveAttribute(
      "target",
      "_blank",
    );
    expect(screen.getByRole("link", { name: /Donate via Buy Me a Coffee/i })).toHaveAttribute(
      "rel",
      "noreferrer noopener",
    );
    expect(
      screen.getByRole("link", { name: /Share feedback to help improve the website/i }),
    ).toHaveAttribute("href", "/contact");
    expect(screen.queryByTestId(/ad-slot-/)).not.toBeInTheDocument();
  });

  it("renders the route body in zh-HK through the active locale catalog", async () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    render(await AboutPage({ localeOverride: "zh-HK" }));

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: zhHkMessages.AboutPage.hero.title,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(zhHkMessages.AboutPage.story.origin.title)).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: zhHkMessages.AboutPage.support.cards.subscribe.primaryAction,
      }),
    ).toHaveAttribute("href", "/pricing#compare");
    expect(
      screen.queryByText(/Open Model Lab started from a frustration I couldn't ignore/i),
    ).not.toBeInTheDocument();
  });
});
