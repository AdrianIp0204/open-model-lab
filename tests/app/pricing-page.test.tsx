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

vi.mock("@/components/account/PremiumSubscriptionActions", () => ({
  PremiumSubscriptionActions: () => <div>Billing actions</div>,
}));

import PricingPage from "@/app/pricing/PricingRoute";

describe("PricingPage", () => {
  it("renders the comparison anchor and distinguishes sign-in from the Supporter plan", async () => {
    globalThis.__TEST_LOCALE__ = "en";

    render(await PricingPage());

    expect(document.getElementById("compare")).not.toBeNull();
    expect(
      screen.getByText(
        /signing in is optional\. free accounts can sync core progress across devices/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/stripe handles supporter checkout, subscription management, and billing/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Saved exact-state setups")).toBeInTheDocument();
    expect(
      screen.getByText(/free browsing may show ads on selected eligible discovery and public routes only/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "How ads work" })).toHaveAttribute(
      "href",
      "/ads",
    );
    expect(
      screen.getByRole("link", { name: "Billing / cancellation / refunds" }),
    ).toHaveAttribute("href", "/billing");
    expect(screen.getByText("Billing actions")).toBeInTheDocument();
  });

  it("renders the zh-HK pricing body through message catalogs", async () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    render(await PricingPage());

    expect(
      screen.getByRole("heading", {
        name: /核心學習內容會保持免費；支持者方案幫助項目持續運作/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/免費帳戶可在不同裝置之間同步核心進度/i)).toBeInTheDocument();
    expect(screen.getByText("已儲存精確狀態設定")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "了解廣告如何運作" }),
    ).toHaveAttribute("href", "/ads");
    expect(screen.getByRole("link", { name: "收費 / 取消 / 退款" })).toHaveAttribute(
      "href",
      "/billing",
    );
  });
});
