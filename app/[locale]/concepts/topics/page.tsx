import TopicDirectoryPage, {
  buildTopicDirectoryMetadata,
} from "../../../concepts/topics/TopicDirectoryRoute";
import { isAppLocale, type AppLocale } from "@/i18n/routing";

type LocalePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: LocalePageProps) {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    return {};
  }

  return buildTopicDirectoryMetadata(locale);
}

export default async function LocalizedTopicDirectoryPage({
  params,
}: LocalePageProps) {
  const { locale } = await params;
  const resolvedLocale: AppLocale = isAppLocale(locale) ? locale : "en";

  return <TopicDirectoryPage localeOverride={resolvedLocale} />;
}
