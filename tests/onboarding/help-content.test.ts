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

  it("keeps manual assessment help available while suppressing automatic test overlays", () => {
    expect(getOnboardingRouteKey("/en/tests/concepts/simple-harmonic-motion")).toBe(
      "assessment",
    );
    expect(getOnboardingRouteKey("/tests/topics/mechanics")).toBe("assessment");
    expect(getOnboardingRouteKey("/tests/packs/physics-connected-models")).toBe(
      "assessment",
    );

    expect(
      shouldSuppressAutomaticOnboarding("/en/tests/concepts/simple-harmonic-motion"),
    ).toBe(true);
    expect(shouldSuppressAutomaticOnboarding("/tests/topics/mechanics")).toBe(true);
    expect(
      shouldSuppressAutomaticOnboarding("/tests/packs/physics-connected-models"),
    ).toBe(true);
    expect(shouldSuppressAutomaticOnboarding("/tests")).toBe(false);
  });
});
