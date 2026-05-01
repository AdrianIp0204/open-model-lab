import TopicPage, {
  buildTopicPageMetadata,
  generateStaticParams,
} from "../../../../concepts/topics/[slug]/page";
import { isAppLocale, type AppLocale } from "@/i18n/routing";

export { generateStaticParams };

export const dynamicParams = false;

type LocalizedTopicPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: LocalizedTopicPageProps) {
  const { locale, slug } = await params;

  if (!isAppLocale(locale)) {
    return {};
  }

  return buildTopicPageMetadata({
    params: Promise.resolve({ slug }),
    locale,
  });
}

export default async function LocalizedTopicPage({ params }: LocalizedTopicPageProps) {
  const { locale, slug } = await params;
  const resolvedLocale: AppLocale = isAppLocale(locale) ? locale : "en";

  return <TopicPage params={Promise.resolve({ slug })} localeOverride={resolvedLocale} />;
}
