import TestHubRoute, {
  buildTestHubMetadata,
} from "../../tests/TestHubRoute";
import { isAppLocale, type AppLocale } from "@/i18n/routing";

type LocalePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: LocalePageProps) {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    return {};
  }

  return buildTestHubMetadata(locale);
}

export default async function LocalizedTestHubPage({
  params,
}: LocalePageProps) {
  const { locale } = await params;
  const resolvedLocale: AppLocale = isAppLocale(locale) ? locale : "en";

  return <TestHubRoute localeOverride={resolvedLocale} />;
}
