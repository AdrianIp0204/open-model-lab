import HomePage, { buildHomeMetadata } from "../_localized/home-page";
import { isAppLocale, type AppLocale } from "@/i18n/routing";

type LocalePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: LocalePageProps) {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    return {};
  }

  return buildHomeMetadata(locale);
}

export default async function LocalizedHomePage({ params }: LocalePageProps) {
  const { locale } = await params;
  const resolvedLocale: AppLocale = isAppLocale(locale) ? locale : "en";

  return <HomePage localeOverride={resolvedLocale} />;
}
