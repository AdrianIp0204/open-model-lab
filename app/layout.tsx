import type { Metadata, Viewport } from "next";
import "katex/dist/katex.min.css";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { AccountSyncProvider } from "@/components/account/AccountSyncProvider";
import { AdsProviderScript } from "@/components/ads/AdsProviderScript";
import { LocaleDocumentSync } from "@/components/layout/LocaleDocumentSync";
import { isAppLocale, type AppLocale } from "@/i18n/routing";
import { getLocaleMessages } from "@/i18n/server";
import { buildSiteMetadata } from "@/lib/metadata";
import "./globals.css";

export const metadata: Metadata = buildSiteMetadata();

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let rootLocale: string | null = null;

  try {
    const rootParamsModule = (await import(
      "next/dist/server/request/root-params"
    )) as {
      getRootParam?: (paramName: string) => Promise<string | null | undefined>;
    };

    if (typeof rootParamsModule.getRootParam === "function") {
      rootLocale = (await rootParamsModule.getRootParam("locale")) ?? null;
    }
  } catch {
    rootLocale = null;
  }

  const locale = isAppLocale(rootLocale) ? rootLocale : ((await getLocale()) as AppLocale);
  const messages = await getLocaleMessages(locale);

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <LocaleDocumentSync locale={locale} />
          <AccountSyncProvider>
            <AdsProviderScript />
            {children}
          </AccountSyncProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
