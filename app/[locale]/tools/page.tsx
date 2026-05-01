import ToolsDirectoryRoute, {
  buildToolsDirectoryMetadata,
} from "../../tools/ToolsDirectoryRoute";
import { isAppLocale, type AppLocale } from "@/i18n/routing";

type LocalePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: LocalePageProps) {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    return {};
  }

  return buildToolsDirectoryMetadata(locale);
}

export default async function LocalizedToolsDirectoryPage({
  params,
}: LocalePageProps) {
  const { locale } = await params;
  const resolvedLocale: AppLocale = isAppLocale(locale) ? locale : "en";

  return <ToolsDirectoryRoute localeOverride={resolvedLocale} />;
}
