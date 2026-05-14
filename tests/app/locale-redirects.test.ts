// @vitest-environment node

import { describe, expect, it } from "vitest";
import { localeCookieName } from "@/i18n/routing";
import { buildDefaultLocaleRedirects } from "@/i18n/locale-redirects";

describe("default locale redirects", () => {
  it("redirects unprefixed public routes to the English locale namespace by default", () => {
    const redirects = buildDefaultLocaleRedirects();

    expect(redirects).toEqual(
      expect.arrayContaining([
        { source: "/", destination: "/en", permanent: false },
        { source: "/contact", destination: "/en/contact", permanent: false },
        { source: "/pricing", destination: "/en/pricing", permanent: false },
        { source: "/source", destination: "/en/source", permanent: false },
        { source: "/concepts/:path*", destination: "/en/concepts/:path*", permanent: false },
        { source: "/tests/:path*", destination: "/en/tests/:path*", permanent: false },
        { source: "/auth/confirm", destination: "/en/auth/confirm", permanent: false },
      ]),
    );
  });

  it("prefers the Traditional Chinese route namespace for cookie or browser language matches", () => {
    const redirects = buildDefaultLocaleRedirects();

    expect(redirects).toEqual(
      expect.arrayContaining([
        {
          source: "/contact",
          destination: "/zh-HK/contact",
          permanent: false,
          has: [{ type: "cookie", key: localeCookieName, value: "zh-HK" }],
        },
        {
          source: "/pricing",
          destination: "/zh-HK/pricing",
          permanent: false,
          has: [
            {
              type: "header",
              key: "accept-language",
              value: ".*(?:zh-HK|zh-TW|zh-CN|zh).*",
            },
          ],
        },
      ]),
    );
  });

  it("does not redirect api, assets, or auth callback hash handoff through locale routes", () => {
    const sources = new Set(buildDefaultLocaleRedirects().map((redirect) => redirect.source));

    expect(sources.has("/api/:path*")).toBe(false);
    expect(sources.has("/_next/:path*")).toBe(false);
    expect(sources.has("/favicon.ico")).toBe(false);
    expect(sources.has("/auth/callback")).toBe(false);
  });
});
