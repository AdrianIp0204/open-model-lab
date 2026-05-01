import GuidedCollectionsPage, {
  buildGuidedCollectionsMetadata,
} from "../../guided/GuidedCollectionsRoute";
import { isAppLocale, type AppLocale } from "@/i18n/routing";

type LocalePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: LocalePageProps) {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    return {};
  }

  return buildGuidedCollectionsMetadata(locale);
}

export default async function LocalizedGuidedCollectionsPage({
  params,
}: LocalePageProps) {
  const { locale } = await params;
  const resolvedLocale: AppLocale = isAppLocale(locale) ? locale : "en";

  return <GuidedCollectionsPage localeOverride={resolvedLocale} />;
}
