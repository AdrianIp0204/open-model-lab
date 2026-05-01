import GuidedCollectionPage, {
  buildGuidedCollectionPageMetadata,
  generateStaticParams,
} from "../../../guided/[slug]/GuidedCollectionRoute";
import { isAppLocale, type AppLocale } from "@/i18n/routing";

export { generateStaticParams };

type LocalePageProps = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamicParams = false;

export async function generateMetadata({ params }: LocalePageProps) {
  const { locale, slug } = await params;

  if (!isAppLocale(locale)) {
    return {};
  }

  return buildGuidedCollectionPageMetadata({
    params: Promise.resolve({ slug }),
    locale,
  });
}

export default async function LocalizedGuidedCollectionPage({
  params,
  searchParams,
}: LocalePageProps) {
  const { locale, slug } = await params;
  const resolvedLocale: AppLocale = isAppLocale(locale) ? locale : "en";

  return (
    <GuidedCollectionPage
      params={Promise.resolve({ slug })}
      searchParams={searchParams}
      localeOverride={resolvedLocale}
    />
  );
}
