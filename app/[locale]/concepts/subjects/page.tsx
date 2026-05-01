import SubjectDirectoryPage, {
  buildSubjectDirectoryMetadata,
} from "../../../concepts/subjects/page";
import { isAppLocale, type AppLocale } from "@/i18n/routing";

type LocalePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: LocalePageProps) {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    return {};
  }

  return buildSubjectDirectoryMetadata(locale);
}

export default async function LocalizedSubjectDirectoryPage({
  params,
}: LocalePageProps) {
  const { locale } = await params;
  const resolvedLocale: AppLocale = isAppLocale(locale) ? locale : "en";

  return <SubjectDirectoryPage localeOverride={resolvedLocale} />;
}
