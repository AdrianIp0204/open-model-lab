import { cookies, headers } from "next/headers";
import type { AbstractIntlMessages, Formats } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import {
  isAppLocale,
  localeCookieName,
  resolveLocalePreference,
  type AppLocale,
} from "./routing";

export const formats = {
  dateTime: {
    short: {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
    shortWithTime: {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    },
    syncedShort: {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    },
    syncedShortWithTime: {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
    },
  },
  number: {
    integer: {
      maximumFractionDigits: 0,
    },
    compact: {
      notation: "compact",
      maximumFractionDigits: 1,
    },
    percent: {
      style: "percent",
      maximumFractionDigits: 0,
    },
  },
} satisfies Formats;

export async function loadMessages(locale: string) {
  const englishMessages = (await import("../messages/en.json")).default;

  if (locale === "en") {
    return englishMessages;
  }

  const localeMessages = (
    await import(`../messages/${locale}.json`)
  ).default as AbstractIntlMessages;

  return mergeMessages(englishMessages, localeMessages);
}

export function mergeMessages(
  base: AbstractIntlMessages,
  override: AbstractIntlMessages,
): AbstractIntlMessages {
  const mergedEntries = Object.entries(base).map(([key, value]) => {
    const overrideValue = override[key];

    if (isPlainMessageObject(value) && isPlainMessageObject(overrideValue)) {
      return [key, mergeMessages(value, overrideValue)];
    }

    return [key, overrideValue ?? value];
  });

  for (const [key, value] of Object.entries(override)) {
    if (!(key in base)) {
      mergedEntries.push([key, value]);
    }
  }

  return Object.fromEntries(mergedEntries);
}

function isPlainMessageObject(value: unknown): value is AbstractIntlMessages {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function resolveRequestLocale(input: {
  requestLocale?: string | null;
  localeCookie?: string | null;
  acceptLanguage?: string | null;
}): AppLocale {
  if (isAppLocale(input.requestLocale)) {
    return input.requestLocale;
  }

  return resolveLocalePreference({
    localeCookie: input.localeCookie,
    acceptLanguage: input.acceptLanguage,
  });
}

export default getRequestConfig(async ({ requestLocale }) => {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const locale = resolveRequestLocale({
    requestLocale: await requestLocale,
    localeCookie: cookieStore.get(localeCookieName)?.value ?? null,
    acceptLanguage: headerStore.get("accept-language"),
  });

  return {
    locale,
    messages: await loadMessages(locale),
    now: new Date(),
    formats,
  };
});
