// @vitest-environment jsdom

import { isValidElement } from "react";
import { describe, expect, it } from "vitest";

import LocalizedStarterTrackCompletionPage from "@/app/[locale]/tracks/[slug]/complete/page";

describe("localized starter track completion route", () => {
  it("passes the locale override through the wrapper route", async () => {
    const element = await LocalizedStarterTrackCompletionPage({
      params: Promise.resolve({
        locale: "zh-HK",
        slug: "motion-and-circular-motion",
      }),
    });

    expect(isValidElement(element)).toBe(true);
    expect(element.props.localeOverride).toBe("zh-HK");
    expect(element.props.params).toBeInstanceOf(Promise);
  });
});
