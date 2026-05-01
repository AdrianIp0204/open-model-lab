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

import BillingPage from "@/app/billing/page";

describe("billing page", () => {
  it("renders the public billing model, reward limits, and support path", async () => {
    render(await BillingPage());

    expect(screen.getByText("USD $5/month")).toBeInTheDocument();
    expect(screen.getByText("Saved exact-state setups")).toBeInTheDocument();
    expect(screen.getByText(/recurring monthly subscription/i)).toBeInTheDocument();
    expect(
      screen.getByText(/some eligible signed-in free accounts may unlock 25% off the first month/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/contact");
    expect(screen.getByRole("link", { name: "Pricing" })).toHaveAttribute(
      "href",
      "/pricing#compare",
    );
    expect(screen.getByRole("link", { name: "hello@openmodellab.example" })).toHaveAttribute(
      "href",
      "mailto:hello@openmodellab.example",
    );
  });
});
