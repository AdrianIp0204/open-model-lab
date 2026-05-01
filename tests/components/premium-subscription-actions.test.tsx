// @vitest-environment jsdom

import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";
import { PremiumSubscriptionActions } from "@/components/account/PremiumSubscriptionActions";
import type { AccountBillingSummary } from "@/lib/billing/model";
import type { AccountUserSummary } from "@/lib/account/model";
import type { ResolvedAccountEntitlement } from "@/lib/account/entitlements";

const useAccountSessionMock = vi.fn();
const refreshAccountSessionMock = vi.fn();
const routerRefreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: routerRefreshMock,
  }),
  useSearchParams: () => new URLSearchParams(globalThis.__TEST_SEARCH_PARAMS__ ?? ""),
}));

vi.mock("@/lib/account/client", () => ({
  useAccountSession: () => useAccountSessionMock(),
  refreshAccountSession: (...args: unknown[]) => refreshAccountSessionMock(...args),
}));

function buildFreeSession(overrides?: Record<string, unknown>) {
  return {
    initialized: true,
    status: "signed-in",
    user: {
      id: "user-1",
      email: "student@example.com",
      displayName: "Lab Student",
      createdAt: "2026-04-02T00:00:00.000Z",
      lastSignedInAt: "2026-04-02T00:00:00.000Z",
    },
    entitlement: resolveAccountEntitlement({
      tier: "free",
      source: "stored",
      updatedAt: "2026-04-02T00:00:00.000Z",
    }),
    billing: {
      source: "none",
      status: "none",
      canStartCheckout: true,
      canManageSubscription: false,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
    },
    authMode: "supabase",
    pendingAction: null,
    errorCode: null,
    errorMessage: null,
    noticeMessage: null,
    magicLinkCooldownExpiresAt: null,
    ...overrides,
  } satisfies MockAccountSession;
}

function buildPremiumSession(overrides?: Record<string, unknown>) {
  return {
    initialized: true,
    status: "signed-in",
    user: {
      id: "user-1",
      email: "premium@example.com",
      displayName: "Supporter Student",
      createdAt: "2026-04-02T00:00:00.000Z",
      lastSignedInAt: "2026-04-02T00:00:00.000Z",
    },
    entitlement: resolveAccountEntitlement({
      tier: "premium",
      source: "stored",
      updatedAt: "2026-04-02T00:00:00.000Z",
    }),
    billing: {
      source: "stripe",
      status: "active",
      canStartCheckout: false,
      canManageSubscription: true,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: "2026-05-02T00:00:00.000Z",
    },
    authMode: "supabase",
    pendingAction: null,
    errorCode: null,
    errorMessage: null,
    noticeMessage: null,
    magicLinkCooldownExpiresAt: null,
    ...overrides,
  } satisfies MockAccountSession;
}

function setLocationSearch(search = "") {
  vi.stubGlobal(
    "location",
    {
      assign: assignMock,
      search,
    } as unknown as Location,
  );
}

type MockAccountSession = {
  initialized: boolean;
  status: "signed-out" | "signed-in";
  user: AccountUserSummary | null;
  entitlement: ResolvedAccountEntitlement;
  billing: AccountBillingSummary | null;
  warnings?: {
    billingUnavailable?: boolean;
    billingNotConfigured?: boolean;
    billingConfigIssues?: string[];
  } | null;
  authMode: "supabase" | "dev-harness";
  pendingAction: "magic-link" | "logout" | null;
  errorCode: string | null;
  errorMessage: string | null;
  noticeMessage: string | null;
  magicLinkCooldownExpiresAt: number | null;
};

let currentSession: MockAccountSession = buildFreeSession();
const assignMock = vi.fn();
const PORTAL_RETURN_BASELINE_STORAGE_KEY =
  "open-model-lab.billing.portal-return-baseline.v1";

describe("PremiumSubscriptionActions", () => {
  beforeEach(() => {
    currentSession = {
      initialized: true,
      status: "signed-out",
      user: null,
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "anonymous-default",
      }),
      billing: null,
      authMode: "supabase",
      pendingAction: null,
      errorCode: null,
      errorMessage: null,
      noticeMessage: null,
      magicLinkCooldownExpiresAt: null,
    } satisfies MockAccountSession;
    useAccountSessionMock.mockImplementation(() => currentSession);
    refreshAccountSessionMock.mockResolvedValue(undefined);
    vi.stubGlobal("fetch", vi.fn());
    window.sessionStorage.clear();
    setLocationSearch("");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    globalThis.__TEST_LOCALE__ = undefined;
    useAccountSessionMock.mockReset();
    refreshAccountSessionMock.mockReset();
    routerRefreshMock.mockReset();
    assignMock.mockReset();
    window.sessionStorage.clear();
  });

  it("asks signed-out users to sign in before checkout", () => {
    render(<PremiumSubscriptionActions context="pricing" />);

    expect(screen.getByText(/sign in first so stripe can attach supporter/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in first" })).toHaveAttribute(
      "href",
      "/account",
    );
    expect(
      screen.getByRole("link", { name: "Billing / cancellation / refunds" }),
    ).toHaveAttribute("href", "/billing");
  });

  it("renders zh-HK pricing and billing actions through the locale catalogs", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";
    currentSession = buildFreeSession();

    render(<PremiumSubscriptionActions context="pricing" />);

    expect(screen.getByRole("button", { name: /[\u4e00-\u9fff]{2,}/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /[\u4e00-\u9fff]{2,}/ })).toHaveAttribute(
      "href",
      "/zh-HK/billing",
    );
    expect(screen.getAllByText(/[\u4e00-\u9fff]{2,}/).length).toBeGreaterThan(1);
    expect(screen.queryByText(/start supporter checkout/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sign in first/i)).not.toBeInTheDocument();
  });

  it("localizes signed-out pricing links in zh-HK", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    render(<PremiumSubscriptionActions context="pricing" />);

    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));

    expect(hrefs).toContain("/zh-HK/account");
    expect(hrefs).toContain("/zh-HK/concepts");
    expect(hrefs).toContain("/zh-HK/billing");
    expect(screen.queryByText(/sign in first/i)).not.toBeInTheDocument();
  });

  it("shows a bounded signed-out notice when Stripe returns from checkout without an account session", () => {
    setLocationSearch("?billing=checkout-returned");

    render(<PremiumSubscriptionActions context="account" />);

    expect(
      screen.getByText(/stripe returned to the site, but this browser does not currently have a signed-in open model lab account session/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in first" })).toHaveAttribute(
      "href",
      "/account",
    );
  });

  it("shows a bounded signed-out notice when Stripe returns from the billing portal", () => {
    setLocationSearch("?billing=portal-returned");

    render(<PremiumSubscriptionActions context="account" />);

    expect(
      screen.getByText(/this browser is not currently signed in to the account that manages billing/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Billing / cancellation / refunds" })[0],
    ).toHaveAttribute("href", "/billing");
  });

  it("uses the provided initial session before the client account store finishes hydrating", () => {
    currentSession = {
      ...buildFreeSession(),
      initialized: false,
      status: "signed-out",
      user: null,
      billing: null,
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "anonymous-default",
      }),
    };

    render(
      <PremiumSubscriptionActions
        context="account"
        initialSession={{
          user: buildPremiumSession().user,
          entitlement: buildPremiumSession().entitlement,
          billing: buildPremiumSession().billing,
        }}
      />,
    );

    expect(screen.getByRole("button", { name: "Manage subscription" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sign in first" })).not.toBeInTheDocument();
  });

  it("starts checkout for signed-in free users with the active locale", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);

    globalThis.__TEST_LOCALE__ = "zh-HK";
    currentSession = buildFreeSession();
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          url: "https://checkout.stripe.test/session",
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
    );

    render(<PremiumSubscriptionActions context="pricing" />);

    await user.click(screen.getAllByRole("button")[0]!);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/billing/checkout",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          accept: "application/json",
          "content-type": "application/json",
        }),
        body: JSON.stringify({
          locale: "zh-HK",
        }),
      }),
    );
    expect(assignMock).toHaveBeenCalledWith("https://checkout.stripe.test/session");
  });

  it("starts billing portal management with the active locale", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);

    globalThis.__TEST_LOCALE__ = "zh-HK";
    currentSession = buildPremiumSession();
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          url: "https://billing.stripe.test/session",
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
    );

    render(<PremiumSubscriptionActions context="account" />);

    await user.click(screen.getAllByRole("button")[0]!);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/billing/portal",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          accept: "application/json",
          "content-type": "application/json",
        }),
        body: JSON.stringify({
          locale: "zh-HK",
        }),
      }),
    );
    expect(assignMock).toHaveBeenCalledWith("https://billing.stripe.test/session");
  });

  it("shows manage subscription for signed-in premium Stripe users", () => {
    currentSession = buildPremiumSession();

    render(<PremiumSubscriptionActions context="account" />);

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Manage subscription" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Start Supporter checkout" }),
    ).not.toBeInTheDocument();
  });

  it("shows a bounded billing-unavailable state instead of Stripe actions", () => {
    currentSession = buildPremiumSession({
      warnings: {
        billingUnavailable: true,
      },
    });

    render(<PremiumSubscriptionActions context="account" billingUnavailable />);

    expect(
      screen.getByText(/billing status is currently unavailable for this supporter account/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check status again" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Manage subscription" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Start Supporter checkout" }),
    ).not.toBeInTheDocument();
  });

  it("shows a bounded billing-not-configured state instead of Stripe actions", () => {
    currentSession = buildFreeSession({
      warnings: {
        billingNotConfigured: true,
        billingConfigIssues: ["missing_price_id"],
      },
    });

    render(
      <PremiumSubscriptionActions
        context="account"
        billingNotConfigured
      />,
    );

    expect(
      screen.getByText(
        /stripe checkout is not configured for this deployment because the stripe price id is missing/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check status again" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Start Supporter checkout" }),
    ).not.toBeInTheDocument();
  });

  it("shows a confirmed return notice when checkout comes back and premium is already active", async () => {
    currentSession = buildPremiumSession();
    setLocationSearch("?billing=checkout-returned");

    render(<PremiumSubscriptionActions context="account" />);

    expect(
      await screen.findByText(/supporter is now active for this account/i),
    ).toBeInTheDocument();
  });

  it("reconciles a returned checkout session once and refreshes the account entitlement", async () => {
    const fetchMock = vi.mocked(fetch);

    currentSession = buildFreeSession();
    setLocationSearch("?billing=checkout-returned&session_id=cs_return_123");
    fetchMock.mockImplementation(async (input) => {
      if (input === "/api/billing/reconcile") {
        return new Response(
          JSON.stringify({
            ok: true,
            status: "reconciled",
            premiumGranted: true,
            entitlementTier: "premium",
            syncSource: "return_reconciliation",
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        );
      }

      throw new Error(`Unexpected fetch: ${String(input)}`);
    });

    render(<PremiumSubscriptionActions context="account" />);

    await screen.findByText(
      /stripe returned to the site and open model lab is checking the completed supporter checkout now/i,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/billing/reconcile",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          sessionId: "cs_return_123",
        }),
      }),
    );
    await waitFor(() => {
      expect(refreshAccountSessionMock).toHaveBeenCalledTimes(2);
    });
  });

  it("refreshes the current route once when a returned checkout upgrades the same session to Premium", async () => {
    currentSession = buildFreeSession();
    setLocationSearch("?billing=checkout-returned");

    const view = render(<PremiumSubscriptionActions context="account" />);

    expect(routerRefreshMock).not.toHaveBeenCalled();
    expect(
      await screen.findByText(
        /stripe returned to the site and open model lab is checking the completed supporter checkout now/i,
      ),
    ).toBeInTheDocument();

    currentSession = buildPremiumSession();
    view.rerender(<PremiumSubscriptionActions context="account" />);

    await waitFor(() => {
      expect(routerRefreshMock).toHaveBeenCalledTimes(1);
    });

    view.rerender(<PremiumSubscriptionActions context="account" />);

    await waitFor(() => {
      expect(routerRefreshMock).toHaveBeenCalledTimes(1);
    });
  });

  it("shows a bounded pending checkout confirmation state before timing out", async () => {
    vi.useFakeTimers();
    currentSession = buildFreeSession();
    setLocationSearch("?billing=checkout-returned");

    render(<PremiumSubscriptionActions context="account" />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(
      screen.getByText(
        /stripe returned to the site and open model lab is checking the completed supporter checkout now/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Start Supporter checkout" }),
    ).not.toBeInTheDocument();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await act(async () => {
        vi.advanceTimersByTime(1_000);
        await Promise.resolve();
      });
    }

    expect(refreshAccountSessionMock).toHaveBeenCalledTimes(6);
    expect(
      screen.getByText(/stripe returned to the site, and supporter is still syncing for this account/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check status again" })).toBeInTheDocument();
  });

  it("explains payment issues for free accounts with an existing Stripe subscription", () => {
    currentSession = buildFreeSession({
      billing: {
        source: "stripe",
        status: "past_due",
        canStartCheckout: false,
        canManageSubscription: true,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: "2026-05-02T00:00:00.000Z",
      },
    });

    render(<PremiumSubscriptionActions context="account" />);

    expect(screen.getByText("Payment issue")).toBeInTheDocument();
    expect(
      screen.getByText(
        /not currently supporter because the last stripe subscription state still shows a payment issue/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Manage billing" })).toBeInTheDocument();
  });

  it("explains cancel-at-period-end for Stripe-backed premium", () => {
    currentSession = buildPremiumSession({
      billing: {
        source: "stripe",
        status: "canceling",
        canStartCheckout: false,
        canManageSubscription: true,
        cancelAtPeriodEnd: true,
        currentPeriodEnd: "2026-05-02T00:00:00.000Z",
      },
    });

    render(<PremiumSubscriptionActions context="account" />);

    expect(screen.getByText("Active until May 2, 2026")).toBeInTheDocument();
    expect(
      screen.getByText(/supporter stays active on this account until .*2026/i),
    ).toBeInTheDocument();
  });

  it("continues polling after a portal return until the billing state actually changes", async () => {
    vi.useFakeTimers();
    currentSession = buildPremiumSession();
    setLocationSearch("?billing=portal-returned");

    refreshAccountSessionMock.mockImplementation(async () => {
      if (refreshAccountSessionMock.mock.calls.length >= 3) {
        currentSession = buildPremiumSession({
          billing: {
            source: "stripe",
            status: "canceling",
            canStartCheckout: false,
            canManageSubscription: true,
            cancelAtPeriodEnd: true,
            currentPeriodEnd: "2026-05-02T00:00:00.000Z",
          },
        });
      }
    });

    render(<PremiumSubscriptionActions context="account" />);

    expect(
      screen.getByText(
        /stripe billing portal returned to the site and open model lab is refreshing the subscription state now/i,
      ),
    ).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(1_000);
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(1_000);
      await Promise.resolve();
    });

    expect(refreshAccountSessionMock).toHaveBeenCalledTimes(3);
    expect(
      screen.getByText(
        /billing changes from stripe are now reflected on this account, and supporter is set to end on/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Active until May 2, 2026")).toBeInTheDocument();
  });

  it("recognizes an already-updated scheduled cancellation after the portal redirect reloads", async () => {
    currentSession = buildPremiumSession({
      billing: {
        source: "stripe",
        status: "canceling",
        canStartCheckout: false,
        canManageSubscription: true,
        cancelAtPeriodEnd: true,
        currentPeriodEnd: "2026-05-02T00:00:00.000Z",
      },
    });
    window.sessionStorage.setItem(
      PORTAL_RETURN_BASELINE_STORAGE_KEY,
      JSON.stringify({
        entitlementTier: "premium",
        entitlementSource: "stored",
        entitlementUpdatedAt: "2026-04-02T00:00:00.000Z",
        billingSource: "stripe",
        billingStatus: "active",
        billingCancelAtPeriodEnd: false,
        billingCurrentPeriodEnd: "2026-05-02T00:00:00.000Z",
        canStartCheckout: false,
        canManageSubscription: true,
      }),
    );
    setLocationSearch("?billing=portal-returned");

    render(<PremiumSubscriptionActions context="account" />);

    expect(
      await screen.findByText(
        /billing changes from stripe are now reflected on this account, and supporter is set to end on/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Active until May 2, 2026")).toBeInTheDocument();
  });

  it("shows ended billing for accounts whose Stripe subscription is fully canceled", () => {
    currentSession = buildFreeSession({
      billing: {
        source: "stripe",
        status: "ended",
        canStartCheckout: true,
        canManageSubscription: false,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: "2026-05-02T00:00:00.000Z",
      },
    });

    render(<PremiumSubscriptionActions context="account" />);

    expect(screen.getByText("Ended")).toBeInTheDocument();
    expect(
      screen.getByText(
        /this account is not currently supporter because the last stripe subscription has ended/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start Supporter checkout" })).toBeInTheDocument();
  });

  it("shows the pricing cancellation notice when checkout returns canceled", async () => {
    setLocationSearch("?billing=checkout-canceled");

    render(<PremiumSubscriptionActions context="pricing" />);

    expect(
      await screen.findByText(
        /supporter checkout was canceled before stripe confirmed a completed session/i,
      ),
    ).toBeInTheDocument();
  });
});
