import { localeCookieName } from "./routing";

export type LocaleRedirectRule = {
  source: string;
  destination: string;
  permanent: false;
  has?: Array<
    | {
        type: "cookie";
        key: string;
        value: string;
      }
    | {
        type: "header";
        key: string;
        value: string;
      }
  >;
};

const defaultLocaleRedirectSources = [
  "/",
  "/about",
  "/account/:path*",
  "/ads",
  "/assignments/:path*",
  "/auth/confirm",
  "/billing",
  "/challenges",
  "/circuit-builder",
  "/concepts/:path*",
  "/contact",
  "/dashboard/:path*",
  "/guided/:path*",
  "/pricing",
  "/privacy",
  "/search",
  "/source",
  "/start",
  "/terms",
  "/tests/:path*",
  "/tools/:path*",
  "/tracks/:path*",
] as const;

function destinationForSource(source: string, locale: "en" | "zh-HK") {
  return source === "/" ? `/${locale}` : `/${locale}${source}`;
}

function buildRedirect(source: string, locale: "en" | "zh-HK", has?: LocaleRedirectRule["has"]) {
  return {
    source,
    destination: destinationForSource(source, locale),
    permanent: false,
    ...(has ? { has } : {}),
  } satisfies LocaleRedirectRule;
}

export function buildDefaultLocaleRedirects(): LocaleRedirectRule[] {
  return defaultLocaleRedirectSources.flatMap((source) => [
    buildRedirect(source, "zh-HK", [
      {
        type: "cookie",
        key: localeCookieName,
        value: "zh-HK",
      },
    ]),
    buildRedirect(source, "zh-HK", [
      {
        type: "header",
        key: "accept-language",
        value: ".*(?:zh-HK|zh-TW|zh-CN|zh).*",
      },
    ]),
    buildRedirect(source, "en"),
  ]);
}
