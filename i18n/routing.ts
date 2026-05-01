import { defineRouting } from "next-intl/routing";

export const localeCookieName = "open-model-lab.locale";

export const localeRegistry = {
  en: {
    label: "English",
    openGraphLocale: "en_US",
    defaultCurrency: "USD",
  },
  "zh-HK": {
    label: "\u7E41\u9AD4\u4E2D\u6587",
    openGraphLocale: "zh_HK",
    defaultCurrency: "HKD",
  },
} as const;

export const localeLabels = Object.fromEntries(
  Object.entries(localeRegistry).map(([locale, metadata]) => [locale, metadata.label]),
) as Record<keyof typeof localeRegistry, string>;

export const localeOpenGraphMap = Object.fromEntries(
  Object.entries(localeRegistry).map(([locale, metadata]) => [
    locale,
    metadata.openGraphLocale,
  ]),
) as Record<keyof typeof localeRegistry, string>;

export const localeDefaultCurrency = Object.fromEntries(
  Object.entries(localeRegistry).map(([locale, metadata]) => [
    locale,
    metadata.defaultCurrency,
  ]),
) as Record<keyof typeof localeRegistry, string>;

export const routing = defineRouting({
  locales: Object.keys(localeRegistry) as Array<keyof typeof localeRegistry>,
  defaultLocale: "en",
  localePrefix: "always",
  localeCookie: {
    name: localeCookieName,
    maxAge: 60 * 60 * 24 * 365,
  },
});

export type AppLocale = (typeof routing.locales)[number];

const localePrefixMatchers = routing.locales
  .slice()
  .sort((left, right) => right.length - left.length)
  .map((locale) => ({
    locale,
    prefix: `/${locale}`,
  }));

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return routing.locales.includes(value as AppLocale);
}

export function getPathLocale(pathname: string): AppLocale | null {
  for (const { locale, prefix } of localePrefixMatchers) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return locale;
    }
  }

  return null;
}

export function stripLocalePrefix(pathname: string): string {
  const locale = getPathLocale(pathname);

  if (!locale) {
    return pathname || "/";
  }

  const prefix = `/${locale}`;
  const strippedPath = pathname.slice(prefix.length);

  return strippedPath.length > 0 ? strippedPath : "/";
}

export function addLocalePrefix(pathname: string, locale: AppLocale): string {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const unprefixedPath = stripLocalePrefix(normalizedPath);

  return unprefixedPath === "/" ? `/${locale}` : `/${locale}${unprefixedPath}`;
}

export function replaceLocaleInPathname(pathname: string, locale: AppLocale): string {
  return addLocalePrefix(pathname, locale);
}

export function getLocaleBasePath(locale: AppLocale): string {
  return `/${locale}`;
}

export function getLocaleFromAcceptLanguage(
  headerValue: string | null | undefined,
): AppLocale {
  if (!headerValue) {
    return routing.defaultLocale;
  }

  const rankedLocales = headerValue
    .split(",")
    .map((entry) => {
      const [rawTag, ...params] = entry.trim().split(";");
      const quality = params
        .find((param) => param.trim().startsWith("q="))
        ?.split("=")[1];

      return {
        tag: rawTag.trim(),
        quality: quality ? Number.parseFloat(quality) : 1,
      };
    })
    .filter((entry) => entry.tag)
    .sort((left, right) => right.quality - left.quality);

  for (const candidate of rankedLocales) {
    if (isAppLocale(candidate.tag)) {
      return candidate.tag;
    }

    const normalizedTag = candidate.tag.toLowerCase();

    if (
      normalizedTag.startsWith("zh-hk") ||
      normalizedTag.startsWith("zh-tw") ||
      normalizedTag.startsWith("zh-hant")
    ) {
      return "zh-HK";
    }

    if (normalizedTag.startsWith("en")) {
      return "en";
    }
  }

  return routing.defaultLocale;
}

export function resolveLocalePreference(input: {
  pathname?: string;
  localeCookie?: string | null;
  acceptLanguage?: string | null;
}): AppLocale {
  const pathnameLocale = input.pathname ? getPathLocale(input.pathname) : null;

  if (pathnameLocale) {
    return pathnameLocale;
  }

  if (isAppLocale(input.localeCookie)) {
    return input.localeCookie;
  }

  return getLocaleFromAcceptLanguage(input.acceptLanguage);
}
