import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { LocaleDocumentSync } from "@/components/layout/LocaleDocumentSync";
import { isAppLocale, routing } from "@/i18n/routing";
import { getLocaleMessages } from "@/i18n/server";

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getLocaleMessages(locale);

  return (
    <NextIntlClientProvider key={locale} locale={locale} messages={messages}>
      <LocaleDocumentSync locale={locale} />
      {children}
    </NextIntlClientProvider>
  );
}
