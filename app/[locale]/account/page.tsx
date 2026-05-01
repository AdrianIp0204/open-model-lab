import AccountPage, { buildAccountMetadata } from "../../account/AccountRoute";
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

  return buildAccountMetadata(locale);
}

export default async function LocalizedAccountPage({
  params,
  searchParams,
}: LocalePageProps) {
  const { locale } = await params;
  const resolvedLocale: AppLocale = isAppLocale(locale) ? locale : "en";

  return <AccountPage localeOverride={resolvedLocale} searchParams={searchParams} />;
}
