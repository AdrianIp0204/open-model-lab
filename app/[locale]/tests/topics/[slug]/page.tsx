import TopicTestRoute, {
  buildTopicTestMetadata,
  generateStaticParams,
} from "../../../../tests/topics/[slug]/TopicTestRoute";
import { isAppLocale, type AppLocale } from "@/i18n/routing";

type LocalizedTopicTestPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export { generateStaticParams };

export const dynamicParams = false;

export async function generateMetadata({ params }: LocalizedTopicTestPageProps) {
  const { locale, slug } = await params;

  if (!isAppLocale(locale)) {
    return {};
  }

  return buildTopicTestMetadata(slug, locale);
}

export default async function LocalizedTopicTestPage({
  params,
}: LocalizedTopicTestPageProps) {
  const { locale, slug } = await params;
  const resolvedLocale: AppLocale = isAppLocale(locale) ? locale : "en";

  return <TopicTestRoute params={Promise.resolve({ slug })} localeOverride={resolvedLocale} />;
}
