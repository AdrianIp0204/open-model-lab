// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAdSensePlacementConfig,
  getAdSenseProviderConfig,
  isAdSenseEnabled,
} from "@/lib/ads/adsense";
import {
  canRenderAdPlacement,
  shouldLoadAdProviderScript,
} from "@/lib/ads/policy";
import {
  getAdPlacementDefinition,
  getAdPlacementsForRouteGroup,
  isAdRouteEligible,
  isPlacementAllowedOnPath,
  resolveAdRouteGroup,
} from "@/lib/ads/slots";

describe("manual adsense policy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("stays disabled by default and requires the explicit feature flag", () => {
    expect(isAdSenseEnabled()).toBe(false);

    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_ENABLED", "true");

    expect(isAdSenseEnabled()).toBe(true);
  });

  it("resolves the route groups for eligible browse and concept pages", () => {
    expect(resolveAdRouteGroup("/")).toBe("home");
    expect(resolveAdRouteGroup("/about")).toBeNull();
    expect(resolveAdRouteGroup("/search")).toBe("search");
    expect(resolveAdRouteGroup("/concepts")).toBe("library");
    expect(resolveAdRouteGroup("/concepts/topics")).toBe("topic-directory");
    expect(resolveAdRouteGroup("/concepts/topics/mechanics")).toBe("topic-page");
    expect(resolveAdRouteGroup("/concepts/subjects")).toBe("subject-directory");
    expect(resolveAdRouteGroup("/concepts/subjects/physics")).toBe("subject-page");
    expect(resolveAdRouteGroup("/concepts/projectile-motion")).toBe("concept-page");
    expect(isAdRouteEligible("/about")).toBe(false);
    expect(resolveAdRouteGroup("/pricing")).toBeNull();
    expect(isAdRouteEligible("/pricing")).toBe(false);
  });

  it("keeps placements locked to their owning route groups", () => {
    expect(getAdPlacementDefinition("concept.postLabDisplay").routeGroup).toBe("concept-page");
    expect(getAdPlacementsForRouteGroup("home")).toContain("home.discoveryMid");
    expect(isPlacementAllowedOnPath("home.discoveryMid", "/")).toBe(true);
    expect(isPlacementAllowedOnPath("home.discoveryMid", "/concepts")).toBe(false);
    expect(isPlacementAllowedOnPath("concept.postLabDisplay", "/concepts/projectile-motion")).toBe(
      true,
    );
  });

  it("resolves typed AdSense configs for display and multiplex placements", () => {
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_CLIENT_ID", "ca-pub-1234567890123456");
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_HOME_DISCOVERY", "1234567890");
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_HOME_FOOTER_MULTIPLEX", "7654321098");

    expect(getAdSenseProviderConfig()).toEqual({
      clientId: "ca-pub-1234567890123456",
      scriptSrc:
        "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890123456",
    });
    expect(getAdSensePlacementConfig("home.discoveryMid")).toEqual({
      placement: "home.discoveryMid",
      unitType: "display",
      slotId: "1234567890",
      clientId: "ca-pub-1234567890123456",
      format: "auto",
      fullWidthResponsive: true,
    });
    expect(getAdSensePlacementConfig("home.footerMultiplex")).toEqual({
      placement: "home.footerMultiplex",
      unitType: "multiplex",
      slotId: "7654321098",
      clientId: "ca-pub-1234567890123456",
      format: "autorelaxed",
      matchedContentUiType: "image_stacked",
    });
  });

  it("requires full placement config for in-article units", () => {
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_CLIENT_ID", "ca-pub-1234567890123456");

    expect(getAdSensePlacementConfig("concept.bodyInArticle")).toBeNull();

    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_CONCEPT_BODY_IN_ARTICLE", "5555555555");

    expect(getAdSensePlacementConfig("concept.bodyInArticle")).toEqual({
      placement: "concept.bodyInArticle",
      unitType: "in-article",
      slotId: "5555555555",
      clientId: "ca-pub-1234567890123456",
      format: "fluid",
      layout: "in-article",
      fullWidthResponsive: true,
    });
  });

  it("loads the provider script only for enabled free routes with a configured placement", () => {
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_CLIENT_ID", "ca-pub-1234567890123456");
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_HOME_DISCOVERY", "1234567890");

    expect(
      shouldLoadAdProviderScript({
        pathname: "/",
        sessionReady: true,
        shouldShowAds: true,
      }),
    ).toBe(true);
    expect(
      shouldLoadAdProviderScript({
        pathname: "/about",
        sessionReady: true,
        shouldShowAds: true,
      }),
    ).toBe(false);
    expect(
      shouldLoadAdProviderScript({
        pathname: "/pricing",
        sessionReady: true,
        shouldShowAds: true,
      }),
    ).toBe(false);
    expect(
      shouldLoadAdProviderScript({
        pathname: "/",
        sessionReady: false,
        shouldShowAds: true,
      }),
    ).toBe(false);
    expect(
      shouldLoadAdProviderScript({
        pathname: "/",
        sessionReady: true,
        shouldShowAds: false,
      }),
    ).toBe(false);
  });

  it("fails closed when rendering placements without the feature flag, slot, or route eligibility", () => {
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_CLIENT_ID", "ca-pub-1234567890123456");
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_HOME_DISCOVERY", "1234567890");

    expect(
      canRenderAdPlacement({
        pathname: "/",
        placement: "home.discoveryMid",
        sessionReady: true,
        shouldShowAds: true,
      }),
    ).toBe(false);

    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_ENABLED", "true");

    expect(
      canRenderAdPlacement({
        pathname: "/pricing",
        placement: "home.discoveryMid",
        sessionReady: true,
        shouldShowAds: true,
      }),
    ).toBe(false);
    expect(
      canRenderAdPlacement({
        pathname: "/",
        placement: "home.footerMultiplex",
        sessionReady: true,
        shouldShowAds: true,
      }),
    ).toBe(false);
    expect(
      canRenderAdPlacement({
        pathname: "/",
        placement: "home.discoveryMid",
        sessionReady: false,
        shouldShowAds: true,
      }),
    ).toBe(false);
    expect(
      canRenderAdPlacement({
        pathname: "/",
        placement: "home.discoveryMid",
        sessionReady: true,
        shouldShowAds: true,
      }),
    ).toBe(true);
  });
});
