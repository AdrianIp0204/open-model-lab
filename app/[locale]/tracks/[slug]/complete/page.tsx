import StarterTrackCompletionRoute, {
  buildStarterTrackCompletionPageMetadata,
  generateStaticParams,
} from "../../../../tracks/[slug]/complete/page";
import { isAppLocale, type AppLocale } from "@/i18n/routing";

export { generateStaticParams };

export const dynamicParams = false;

type LocalePageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: LocalePageProps) {
  const { locale, slug } = await params;

  if (!isAppLocale(locale)) {
    return {};
  }

  return buildStarterTrackCompletionPageMetadata({
    params: Promise.resolve({ slug }),
    locale,
  });
}

export default async function LocalizedStarterTrackCompletionPage({
  params,
}: LocalePageProps) {
  const { locale, slug } = await params;
  const resolvedLocale: AppLocale = isAppLocale(locale) ? locale : "en";

  return (
    <StarterTrackCompletionRoute
      params={Promise.resolve({ slug })}
      localeOverride={resolvedLocale}
    />
  );
}
