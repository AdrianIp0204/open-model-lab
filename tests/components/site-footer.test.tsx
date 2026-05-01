// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "@/components/layout/SiteFooter";

describe("SiteFooter", () => {
  it("links to the public trust pages and states the current ad policy succinctly", () => {
    render(<SiteFooter />);

    expect(screen.getByText("Open Model Lab")).toBeInTheDocument();
    expect(screen.getByText("How it works")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Trust" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "More" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: "Billing" })).toHaveAttribute("href", "/billing");
    expect(screen.getByRole("link", { name: "Ads" })).toHaveAttribute("href", "/ads");
    expect(screen.getByRole("link", { name: "Practice" })).toHaveAttribute("href", "/tests");
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "/about");
    expect(screen.getByRole("link", { name: "Pricing" })).toHaveAttribute("href", "/pricing");
    expect(screen.getAllByRole("link", { name: "Contact" })).toHaveLength(1);
    expect(
      screen.getAllByRole("link", { name: "Contact" }).every((link) => link.getAttribute("href") === "/contact"),
    ).toBe(true);
    expect(screen.getByRole("link", { name: "hello@openmodellab.example" })).toHaveAttribute(
      "href",
      "mailto:hello@openmodellab.example",
    );
    expect(
      screen.getByText(/free browsing may include ads on selected discovery pages/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/concept labs plus challenge flows stay clear/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/feedback notes keep the current page context attached/i),
    ).toBeInTheDocument();
  });
});
