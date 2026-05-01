// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PremiumFeatureNotice,
  PREMIUM_PRICING_HREF,
  PREMIUM_SIGN_IN_HREF,
} from "@/components/account/PremiumFeatureNotice";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";
import enMessages from "@/messages/en.json";
import zhHkMessages from "@/messages/zh-HK.json";

const useAccountSessionMock = vi.fn();

vi.mock("@/lib/account/client", () => ({
  useAccountSession: () => useAccountSessionMock(),
}));

describe("PremiumFeatureNotice", () => {
  beforeEach(() => {
    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-out",
      user: null,
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "anonymous-default",
      }),
    });
  });

  afterEach(() => {
    globalThis.__TEST_LOCALE__ = undefined;
    useAccountSessionMock.mockReset();
  });

  it("shows sign-in and pricing paths for signed-out users", () => {
    render(
      <PremiumFeatureNotice
        title="Saved compare setups"
        freeDescription="Compare mode still works here."
        description="Supporter saves named compare setups so you can reopen the same bench later."
      />,
    );

    expect(screen.getByText("Saved compare setups")).toBeInTheDocument();
    expect(
      screen.getByText(/compare mode still works here\. supporter saves named compare setups/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/save and sync the same core learning progress across devices/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: enMessages.PremiumFeatureNotice.actions.viewPlans })).toHaveAttribute(
      "href",
      PREMIUM_PRICING_HREF,
    );
    expect(screen.getByRole("link", { name: enMessages.PremiumFeatureNotice.actions.signIn })).toHaveAttribute(
      "href",
      PREMIUM_SIGN_IN_HREF,
    );
    expect(screen.queryByRole("link", { name: /^sign in$/i })).not.toBeInTheDocument();
  });

  it("shows only the upgrade path for signed-in free users", () => {
    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-in",
      user: {
        id: "user-1",
      },
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
    });

    render(
      <PremiumFeatureNotice
        title="Exact-state setup sharing"
        description="Supporter copies the live bench into reusable setup links."
      />,
    );

    expect(screen.getByText(/already syncs the same core learning progress across devices/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: enMessages.PremiumFeatureNotice.actions.viewPlans })).toHaveAttribute(
      "href",
      PREMIUM_PRICING_HREF,
    );
    expect(screen.queryByRole("link", { name: enMessages.PremiumFeatureNotice.actions.signIn })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^sign in$/i })).not.toBeInTheDocument();
  });

  it("falls back to a localized default title when none is provided", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    render(
      <PremiumFeatureNotice description="Supporter saves named compare setups so you can reopen the same bench later." />,
    );

    expect(screen.getByText(zhHkMessages.PremiumFeatureNotice.title)).toBeInTheDocument();
  });

  it("stays hidden for premium users", () => {
    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-in",
      user: {
        id: "user-1",
      },
      entitlement: resolveAccountEntitlement({
        tier: "premium",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
    });

    const { container } = render(
      <PremiumFeatureNotice
        title="Advanced review and remediation"
        description="Supporter adds richer synced remediation."
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
