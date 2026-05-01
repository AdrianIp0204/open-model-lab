// @vitest-environment jsdom

import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/layout/PageShell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/layout/SectionHeading", () => ({
  SectionHeading: ({
    eyebrow,
    title,
    description,
  }: {
    eyebrow: string;
    title: string;
    description: string;
  }) => (
    <div>
      <p>{eyebrow}</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
}));

import AdsPage from "@/app/ads/page";
import BillingPage from "@/app/billing/page";
import PrivacyPage from "@/app/privacy/page";
import TermsPage from "@/app/terms/page";

describe("public trust pages", () => {
  it("renders the privacy page with local storage, Stripe, and direct support guidance", async () => {
    render(await PrivacyPage());

    expect(screen.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeInTheDocument();
    expect(
      screen.getByText(/saves learning progress in this browser by default/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/last updated/i)).toBeInTheDocument();
    expect(screen.getByText(/stripe handles checkout and billing/i)).toBeInTheDocument();
    expect(screen.getByText(/saved setups, saved compare setups, exact-state sharing/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /billing details/i })).toHaveAttribute(
      "href",
      "/billing",
    );
    expect(screen.getByRole("link", { name: /read ad disclosure/i })).toHaveAttribute(
      "href",
      "/ads",
    );
    expect(
      screen.getAllByRole("link", { name: "Contact" }).every((link) => link.getAttribute("href") === "/contact"),
    ).toBe(true);
  });

  it("renders the terms page with bounded launch-use expectations", async () => {
    render(await TermsPage());

    expect(
      screen.getByText(/the service is educational, not professional advice/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /billing details/i })).toHaveAttribute(
      "href",
      "/billing",
    );
    expect(screen.getByRole("link", { name: /ads and sponsorship/i })).toHaveAttribute(
      "href",
      "/ads",
    );
    expect(screen.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/contact");
  });

  it("renders the billing page with subscription, refund, and support details", async () => {
    render(await BillingPage());

    expect(screen.getByText("USD $5/month")).toBeInTheDocument();
    expect(screen.getByText(/refund requests are reviewed case by case/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Compare free core learning and the Supporter plan on Pricing." }),
    ).toHaveAttribute("href", "/pricing#compare");
    expect(
      screen.getByRole("link", { name: "Use Account to sign in first and manage billing later." }),
    ).toHaveAttribute("href", "/account");
  });

  it("renders the ads page with allowed and protected surface guidance", async () => {
    render(await AdsPage());

    expect(screen.getByText(/home page/i)).toBeInTheDocument();
    expect(
      screen.getByText(/about, billing, privacy, terms, contact, support, and other sensitive trust pages/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/simulation stage, controls, graphs, equations, and time rails/i)).toBeInTheDocument();
    expect(screen.getAllByText(/google adsense/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /pricing/i })).toHaveAttribute("href", "/pricing");
    expect(screen.getByRole("link", { name: /privacy/i })).toHaveAttribute("href", "/privacy");
  });
});
