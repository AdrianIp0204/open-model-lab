import SearchPage, { buildSearchMetadata } from "../../search/page";
import { isAppLocale, type AppLocale } from "@/i18n/routing";

type LocalePageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: LocalePageProps) {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    return {};
  }

  return buildSearchMetadata(locale);
}

export default async function LocalizedSearchPage({
  params,
  searchParams,
}: LocalePageProps) {
  const { locale } = await params;
  const resolvedLocale: AppLocale = isAppLocale(locale) ? locale : "en";

  return <SearchPage localeOverride={resolvedLocale} searchParams={searchParams} />;
}
