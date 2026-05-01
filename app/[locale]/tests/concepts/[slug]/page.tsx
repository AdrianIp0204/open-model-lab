import { isAppLocale, type AppLocale } from "@/i18n/routing";
import ConceptTestRoute, {
  buildConceptTestMetadata,
  generateStaticParams,
} from "@/app/tests/concepts/[slug]/page";

type LocalizedConceptTestRouteProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export const dynamicParams = false;
export { generateStaticParams };

export async function generateMetadata({
  params,
}: LocalizedConceptTestRouteProps) {
  const { slug, locale } = await params;

  if (!isAppLocale(locale)) {
    return {};
  }

  return buildConceptTestMetadata(slug, locale);
}

export default async function LocalizedConceptTestRoute({
  params,
}: LocalizedConceptTestRouteProps) {
  const { slug, locale } = await params;
  const resolvedLocale: AppLocale = isAppLocale(locale) ? locale : "en";

  return (
    <ConceptTestRoute
      params={Promise.resolve({ slug })}
      localeOverride={resolvedLocale}
    />
  );
}
