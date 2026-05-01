import SubjectPage, {
  buildSubjectPageMetadata,
  generateStaticParams,
} from "../../../../concepts/subjects/[slug]/page";
import { isAppLocale, type AppLocale } from "@/i18n/routing";

export { generateStaticParams };

export const dynamicParams = false;

type LocalizedSubjectPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: LocalizedSubjectPageProps) {
  const { locale, slug } = await params;

  if (!isAppLocale(locale)) {
    return {};
  }

  return buildSubjectPageMetadata({
    params: Promise.resolve({ slug }),
    locale,
  });
}

export default async function LocalizedSubjectPage({ params }: LocalizedSubjectPageProps) {
  const { locale, slug } = await params;
  const resolvedLocale: AppLocale = isAppLocale(locale) ? locale : "en";

  return <SubjectPage params={Promise.resolve({ slug })} localeOverride={resolvedLocale} />;
}
