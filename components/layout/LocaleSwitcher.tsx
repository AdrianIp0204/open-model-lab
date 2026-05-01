"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  type AppLocale,
  localeCookieName,
  localeLabels,
  routing,
} from "@/i18n/routing";

const localeCookieMaxAge = 60 * 60 * 24 * 365;

export function LocaleSwitcher({
  className = "",
}: {
  className?: string;
}) {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("Locale");
  const [selectedLocale, setSelectedLocale] = useState(locale);

  useEffect(() => {
    setSelectedLocale(locale);
  }, [locale]);

  function handleChange(nextLocale: AppLocale) {
    const currentPathname = pathname ?? "/";
    const search = searchParams.toString();
    const hash = window.location.hash;
    const nextHref = `${currentPathname}${search ? `?${search}` : ""}${hash}`;

    document.cookie = `${localeCookieName}=${encodeURIComponent(nextLocale)}; path=/; max-age=${localeCookieMaxAge}; samesite=lax`;
    setSelectedLocale(nextLocale);

    router.replace(nextHref, {
      locale: nextLocale,
      scroll: false,
    });
  }

  return (
    <label
      className={[
        "inline-flex items-center gap-2 rounded-full border border-line bg-paper-strong px-3 py-2 text-sm text-ink-950 shadow-sm",
        className,
      ]
        .join(" ")
        .trim()}
    >
      <span className="sr-only">{t("label")}</span>
      <select
        aria-label={t("switcherAria")}
        value={selectedLocale}
        onChange={(event) => handleChange(event.target.value as AppLocale)}
        className="min-w-0 bg-transparent pr-5 text-sm text-ink-950 outline-none"
      >
        {routing.locales.map((option) => (
          <option key={option} value={option}>
            {localeLabels[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
