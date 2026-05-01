import StarterTrackPage, {
  buildStarterTrackPageMetadata,
  generateStaticParams,
} from "../../../tracks/[slug]/StarterTrackRoute";
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

  return buildStarterTrackPageMetadata({
    params: Promise.resolve({ slug }),
    locale,
  });
}

export default async function LocalizedStarterTrackPage({
  params,
  searchParams,
}: LocalePageProps) {
  const { locale, slug } = await params;
  const resolvedLocale: AppLocale = isAppLocale(locale) ? locale : "en";

  return (
    <StarterTrackPage
      params={Promise.resolve({ slug })}
      searchParams={searchParams}
      localeOverride={resolvedLocale}
    />
  );
}
