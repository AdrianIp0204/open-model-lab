// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  addLocalePrefix,
  replaceLocaleInPathname,
  resolveLocalePreference,
} from "@/i18n/routing";
import { resolveRequestLocale } from "@/i18n/request";

describe("i18n routing helpers", () => {
  it("adds and replaces locale prefixes on canonical paths", () => {
    expect(addLocalePrefix("/", "en")).toBe("/en");
    expect(addLocalePrefix("/concepts/unit-circle", "zh-HK")).toBe(
      "/zh-HK/concepts/unit-circle",
    );
    expect(replaceLocaleInPathname("/en/search", "zh-HK")).toBe("/zh-HK/search");
    expect(replaceLocaleInPathname("/search", "zh-HK")).toBe("/zh-HK/search");
  });

  it("resolves locale preference from the cookie before accept-language", () => {
    expect(
      resolveLocalePreference({
        localeCookie: "zh-HK",
        acceptLanguage: "en-US,en;q=0.8",
      }),
    ).toBe("zh-HK");

    expect(
      resolveLocalePreference({
        acceptLanguage: "zh-TW,zh;q=0.9,en;q=0.8",
      }),
    ).toBe("zh-HK");
  });

  it("prefers the matched route locale and otherwise falls back safely", () => {
    expect(
      resolveRequestLocale({
        requestLocale: "zh-HK",
        localeCookie: "en",
        acceptLanguage: "en-US,en;q=0.8",
      }),
    ).toBe("zh-HK");

    expect(
      resolveRequestLocale({
        requestLocale: "invalid-locale",
        localeCookie: "en",
        acceptLanguage: "zh-HK,zh;q=0.9",
      }),
    ).toBe("en");
  });
});
