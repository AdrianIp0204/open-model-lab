import { describe, expect, it } from "vitest";
import {
  getOnboardingRouteKey,
  shouldSuppressAutomaticOnboarding,
} from "@/lib/onboarding/help-content";

describe("onboarding help route behavior", () => {
  it("suppresses automatic onboarding on the visual-first home page", () => {
    expect(getOnboardingRouteKey("/")).toBe("home");
    expect(getOnboardingRouteKey("/zh-HK")).toBe("home");
    expect(shouldSuppressAutomaticOnboarding("/")).toBe(true);
    expect(shouldSuppressAutomaticOnboarding("/zh-HK")).toBe(true);
  });

  it("keeps manual help available while suppressing automatic overlays on high-intent learner hubs", () => {
    expect(getOnboardingRouteKey("/search")).toBe("search");
    expect(getOnboardingRouteKey("/tests")).toBe("tests");
    expect(getOnboardingRouteKey("/tools")).toBe("tools");
    expect(getOnboardingRouteKey("/en/tests/concepts/simple-harmonic-motion")).toBe(
      "assessment",
    );
    expect(getOnboardingRouteKey("/tests/topics/mechanics")).toBe("assessment");
    expect(getOnboardingRouteKey("/tests/packs/physics-connected-models")).toBe(
      "assessment",
    );

    expect(shouldSuppressAutomaticOnboarding("/search")).toBe(true);
    expect(shouldSuppressAutomaticOnboarding("/tests")).toBe(true);
    expect(shouldSuppressAutomaticOnboarding("/tools")).toBe(true);
    expect(
      shouldSuppressAutomaticOnboarding("/en/tests/concepts/simple-harmonic-motion"),
    ).toBe(true);
    expect(shouldSuppressAutomaticOnboarding("/tests/topics/mechanics")).toBe(true);
    expect(
      shouldSuppressAutomaticOnboarding("/tests/packs/physics-connected-models"),
    ).toBe(true);
  });
});
