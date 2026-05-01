import ChemistryReactionMindMapRoute, {
  buildChemistryReactionMindMapMetadata,
} from "../../../tools/chemistry-reaction-mind-map/page";
import { isAppLocale, type AppLocale } from "@/i18n/routing";

type LocalePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: LocalePageProps) {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    return {};
  }

  return buildChemistryReactionMindMapMetadata(locale);
}

export default async function LocalizedChemistryReactionMindMapPage({
  params,
}: LocalePageProps) {
  const { locale } = await params;
  const resolvedLocale: AppLocale = isAppLocale(locale) ? locale : "en";

  return <ChemistryReactionMindMapRoute localeOverride={resolvedLocale} />;
}
