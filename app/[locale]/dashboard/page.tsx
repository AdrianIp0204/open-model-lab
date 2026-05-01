import DashboardPage, { buildDashboardMetadata } from "../../dashboard/DashboardRoute";
import { isAppLocale, type AppLocale } from "@/i18n/routing";

type LocalePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: LocalePageProps) {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    return {};
  }

  return buildDashboardMetadata(locale);
}

export default async function LocalizedDashboardPage({ params }: LocalePageProps) {
  const { locale } = await params;
  const resolvedLocale: AppLocale = isAppLocale(locale) ? locale : "en";

  return <DashboardPage localeOverride={resolvedLocale} />;
}
