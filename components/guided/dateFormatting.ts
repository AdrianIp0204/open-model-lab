"use client";

import type { AppLocale } from "@/i18n/routing";

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(locale: AppLocale, cacheKey: string, options: Intl.DateTimeFormatOptions) {
  const key = `${locale}:${cacheKey}`;
  const cachedFormatter = formatterCache.get(key);

  if (cachedFormatter) {
    return cachedFormatter;
  }

  const formatter = new Intl.DateTimeFormat(locale, options);
  formatterCache.set(key, formatter);
  return formatter;
}

export function formatGuidedProgressDate(
  value: string | null,
  progressSource: "local" | "synced",
  locale: AppLocale = "en",
) {
  if (!value) {
    return null;
  }

  try {
    const parsedValue = new Date(value);

    if (progressSource === "synced") {
      return getFormatter(locale, "synced-month-day", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(parsedValue);
    }

    return getFormatter(locale, "local-month-day", {
      month: "short",
      day: "numeric",
    }).format(parsedValue);
  } catch {
    return null;
  }
}

export function formatGuidedSharedTimestamp(value: string, locale: AppLocale = "en") {
  try {
    return getFormatter(locale, "synced-month-day-time", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
      timeZoneName: "short",
    }).format(new Date(value));
  } catch {
    return locale === "zh-HK" ? "最近" : "recently";
  }
}
