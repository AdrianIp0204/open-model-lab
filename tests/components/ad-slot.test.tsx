// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";
import {
  AdSlot,
  DisplayAd,
  InArticleAd,
  MultiplexAd,
} from "@/components/ads/AdSlot";

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

describe("AdSlot", () => {
  beforeEach(() => {
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
    delete window.adsbygoogle;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete window.adsbygoogle;
  });

  it("renders a display placement for free browsing when the route and slot are eligible", async () => {
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_CLIENT_ID", "ca-pub-1234567890123456");
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_HOME_DISCOVERY", "1234567890");
    window.adsbygoogle = [];

    render(<DisplayAd placement="home.discoveryMid" />);

    expect(screen.getByTestId("ad-slot-home.discoveryMid")).toHaveAttribute(
      "data-ad-unit-type",
      "display",
    );
    expect(screen.getByTestId("adsense-unit-home.discoveryMid")).toHaveAttribute(
      "data-ad-slot",
      "1234567890",
    );
    expect(screen.getByTestId("adsense-unit-home.discoveryMid")).toHaveAttribute(
      "data-ad-format",
      "auto",
    );

    await waitFor(() => {
      expect(window.adsbygoogle).toHaveLength(1);
    });
  });

  it("renders the in-article attributes for long-form placements", () => {
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_CLIENT_ID", "ca-pub-1234567890123456");
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_CONCEPT_BODY_IN_ARTICLE", "2345678901");
    navigationState.pathname = "/concepts/vectors-components";

    render(<InArticleAd placement="concept.bodyInArticle" />);

    expect(screen.getByTestId("ad-slot-concept.bodyInArticle")).toHaveAttribute(
      "data-ad-unit-type",
      "in-article",
    );
    expect(screen.getByTestId("adsense-unit-concept.bodyInArticle")).toHaveAttribute(
      "data-ad-layout",
      "in-article",
    );
    expect(screen.getByTestId("adsense-unit-concept.bodyInArticle")).toHaveAttribute(
      "data-ad-format",
      "fluid",
    );
  });

  it("renders multiplex placements with the matched-content attribute", () => {
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_CLIENT_ID", "ca-pub-1234567890123456");
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_HOME_FOOTER_MULTIPLEX", "3456789012");

    render(<MultiplexAd placement="home.footerMultiplex" />);

    expect(screen.getByTestId("ad-slot-home.footerMultiplex")).toHaveAttribute(
      "data-ad-unit-type",
      "multiplex",
    );
    expect(screen.getByTestId("adsense-unit-home.footerMultiplex")).toHaveAttribute(
      "data-matched-content-ui-type",
      "image_stacked",
    );
  });

  it("stays hidden for premium sessions", () => {
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_CLIENT_ID", "ca-pub-1234567890123456");
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_HOME_DISCOVERY", "1234567890");
    accountState.session = {
      initialized: true,
      status: "signed-in",
      user: {
        id: "user-premium",
      },
      entitlement: resolveAccountEntitlement({
        tier: "premium",
        source: "stored",
        updatedAt: "2026-04-07T00:00:00.000Z",
      }),
    };

    const { container } = render(<DisplayAd placement="home.discoveryMid" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("stays hidden on ad-free routes even when the placement exists elsewhere", () => {
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_CLIENT_ID", "ca-pub-1234567890123456");
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_HOME_DISCOVERY", "1234567890");
    navigationState.pathname = "/pricing";

    const { container } = render(<DisplayAd placement="home.discoveryMid" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("fails closed when the feature flag or slot config is missing", () => {
    const firstRender = render(<AdSlot placement="home.discoveryMid" />);

    expect(firstRender.container).toBeEmptyDOMElement();

    firstRender.unmount();

    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_CLIENT_ID", "ca-pub-1234567890123456");

    const secondRender = render(<AdSlot placement="home.discoveryMid" />);

    expect(secondRender.container).toBeEmptyDOMElement();
  });

  it("stays hidden while the account session is still unresolved", () => {
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

    const { container } = render(<DisplayAd placement="home.discoveryMid" />);

    expect(container).toBeEmptyDOMElement();
  });
});
