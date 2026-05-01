import DashboardAnalyticsPage, {
  buildDashboardAnalyticsMetadata,
} from "../../../dashboard/analytics/DashboardAnalyticsRoute";
import { isAppLocale, type AppLocale } from "@/i18n/routing";

type LocalePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: LocalePageProps) {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    return {};
  }

  return buildDashboardAnalyticsMetadata(locale);
}

export default async function LocalizedDashboardAnalyticsPage({
  params,
}: LocalePageProps) {
  const { locale } = await params;
  const resolvedLocale: AppLocale = isAppLocale(locale) ? locale : "en";

  return <DashboardAnalyticsPage localeOverride={resolvedLocale} />;
}
