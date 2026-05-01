// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  loadMessages,
  mergeMessages,
  resolveRequestLocale,
} from "@/i18n/request";

function getMessageValue(input: Record<string, unknown>, path: string) {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object" && key in current) {
      return (current as Record<string, unknown>)[key];
    }

    return undefined;
  }, input);
}

describe("i18n request config", () => {
  it("merges locale overrides without dropping english fallback keys", () => {
    const merged = mergeMessages(
      {
        Layout: {
          nav: {
            home: "Home",
            search: "Search",
          },
        },
      },
      {
        Layout: {
          nav: {
            home: "首頁",
          },
        },
      },
    );

    expect(merged).toEqual({
      Layout: {
        nav: {
          home: "首頁",
          search: "Search",
        },
      },
    });
  });

  it("loads zh-HK messages with english fallback intact", async () => {
    const messages = (await loadMessages("zh-HK")) as Record<string, unknown>;

    expect(getMessageValue(messages, "Layout.common.openConceptLibrary")).toBeTruthy();
    expect(getMessageValue(messages, "SearchPage.hero.title")).toBeTruthy();
    expect(getMessageValue(messages, "ConceptPage.share.title")).toBeTruthy();
  });

  it("prefers the current route locale over cookies and headers", () => {
    expect(
      resolveRequestLocale({
        requestLocale: "zh-HK",
        localeCookie: "en",
        acceptLanguage: "en-US,en;q=0.9",
      }),
    ).toBe("zh-HK");
  });

  it("falls back to cookie and then accept-language when the route locale is invalid", () => {
    expect(
      resolveRequestLocale({
        requestLocale: "fr",
        localeCookie: "zh-HK",
        acceptLanguage: "en-US,en;q=0.9",
      }),
    ).toBe("zh-HK");

    expect(
      resolveRequestLocale({
        requestLocale: "fr",
        localeCookie: "fr",
        acceptLanguage: "en-US,en;q=0.9",
      }),
    ).toBe("en");
  });
});
