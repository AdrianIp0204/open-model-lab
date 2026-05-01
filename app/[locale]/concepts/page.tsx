import ConceptsPage, { buildConceptsMetadata } from "../../concepts/ConceptsRoute";
import { isAppLocale, type AppLocale } from "@/i18n/routing";

type LocalePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: LocalePageProps) {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    return {};
  }

  return buildConceptsMetadata(locale);
}

export default async function LocalizedConceptsPage({ params }: LocalePageProps) {
  const { locale } = await params;
  const resolvedLocale: AppLocale = isAppLocale(locale) ? locale : "en";

  return <ConceptsPage localeOverride={resolvedLocale} />;
}
