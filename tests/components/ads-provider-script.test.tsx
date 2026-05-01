// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";

type MockAccountSession = {
  initialized: boolean;
  status: "signed-out" | "signed-in";
  user: { id: string } | null;
  entitlement: ReturnType<typeof resolveAccountEntitlement>;
};

const navigationState = vi.hoisted(() => ({
  pathname: "/",
}));

const accountState = vi.hoisted(() => ({
  session: null as MockAccountSession | null,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.pathname,
  useSearchParams: () => new URLSearchParams(globalThis.__TEST_SEARCH_PARAMS__ ?? ""),
}));

vi.mock("@/lib/account/client", () => ({
  useAccountSession: () => accountState.session,
}));

import { AdsProviderScript } from "@/components/ads/AdsProviderScript";

function getBootstrapScript() {
  return document.head.querySelector("#open-model-lab-adsense");
}

describe("AdsProviderScript", () => {
  beforeEach(() => {
    document.head.querySelector("#open-model-lab-adsense")?.remove();
    navigationState.pathname = "/";
    accountState.session = {
      initialized: true,
      status: "signed-out",
      user: null,
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "anonymous-default",
      }),
    };
  });

  afterEach(() => {
    document.head.querySelector("#open-model-lab-adsense")?.remove();
    vi.unstubAllEnvs();
  });

  it("injects the AdSense bootstrap once for free users on eligible routes", async () => {
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_CLIENT_ID", "ca-pub-1234567890123456");
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_HOME_DISCOVERY", "1234567890");

    const view = render(<AdsProviderScript />);

    await waitFor(() => {
      expect(getBootstrapScript()).not.toBeNull();
    });

    view.rerender(<AdsProviderScript />);

    await waitFor(() => {
      expect(document.head.querySelectorAll("#open-model-lab-adsense")).toHaveLength(1);
    });

    expect(getBootstrapScript()).toHaveAttribute(
      "src",
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890123456",
    );
  });

  it("stays dormant for premium users even on otherwise eligible routes", async () => {
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_CLIENT_ID", "ca-pub-1234567890123456");
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_HOME_DISCOVERY", "1234567890");
    accountState.session = {
      initialized: true,
      status: "signed-in",
      user: { id: "user-premium" },
      entitlement: resolveAccountEntitlement({
        tier: "premium",
        source: "stored",
        updatedAt: "2026-04-07T00:00:00.000Z",
      }),
    };

    render(<AdsProviderScript />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(getBootstrapScript()).toBeNull();
  });

  it("stays dormant on ad-free routes", async () => {
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_CLIENT_ID", "ca-pub-1234567890123456");
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_HOME_DISCOVERY", "1234567890");
    navigationState.pathname = "/about";

    render(<AdsProviderScript />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(getBootstrapScript()).toBeNull();
  });

  it("stays dormant while the account session is unresolved", async () => {
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_CLIENT_ID", "ca-pub-1234567890123456");
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_HOME_DISCOVERY", "1234567890");
    accountState.session = {
      initialized: false,
      status: "signed-out",
      user: null,
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "anonymous-default",
      }),
    };

    const { rerender } = render(<AdsProviderScript />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(getBootstrapScript()).toBeNull();

    accountState.session = {
      initialized: true,
      status: "signed-out",
      user: null,
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "anonymous-default",
      }),
    };
    rerender(<AdsProviderScript />);

    await waitFor(() => {
      expect(getBootstrapScript()).not.toBeNull();
    });
  });

  it("stays dormant when the feature flag is disabled or the current route has no configured placements", async () => {
    const { rerender } = render(<AdsProviderScript />);

    await waitFor(() => {
      expect(getBootstrapScript()).toBeNull();
    });

    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_CLIENT_ID", "ca-pub-1234567890123456");
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_HOME_DISCOVERY", "1234567890");
    navigationState.pathname = "/search";
    rerender(<AdsProviderScript />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(getBootstrapScript()).toBeNull();
  });

  it("does not bootstrap for premium users even when navigating across eligible routes", async () => {
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_CLIENT_ID", "ca-pub-1234567890123456");
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_HOME_DISCOVERY", "1234567890");
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_CONCEPT_LIBRARY_DISCOVERY", "0987654321");
    accountState.session = {
      initialized: true,
      status: "signed-in",
      user: { id: "user-premium" },
      entitlement: resolveAccountEntitlement({
        tier: "premium",
        source: "stored",
        updatedAt: "2026-04-07T00:00:00.000Z",
      }),
    };

    const view = render(<AdsProviderScript />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(getBootstrapScript()).toBeNull();

    navigationState.pathname = "/concepts";
    view.rerender(<AdsProviderScript />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(getBootstrapScript()).toBeNull();
  });
});
