import PackTestRoute, {
  buildPackTestMetadata,
  generateStaticParams,
} from "../../../../tests/packs/[slug]/PackTestRoute";
import { isAppLocale, type AppLocale } from "@/i18n/routing";

type LocalizedPackTestPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export { generateStaticParams };

export const dynamicParams = false;

export async function generateMetadata({ params }: LocalizedPackTestPageProps) {
  const { locale, slug } = await params;

  if (!isAppLocale(locale)) {
    return {};
  }

  return buildPackTestMetadata(slug, locale);
}

export default async function LocalizedPackTestPage({
  params,
}: LocalizedPackTestPageProps) {
  const { locale, slug } = await params;
  const resolvedLocale: AppLocale = isAppLocale(locale) ? locale : "en";

  return <PackTestRoute params={Promise.resolve({ slug })} localeOverride={resolvedLocale} />;
}
