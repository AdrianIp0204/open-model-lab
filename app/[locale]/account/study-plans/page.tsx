import { isAppLocale, type AppLocale } from "@/i18n/routing";
import AccountSavedStudyPlansPage, {
  buildSavedStudyPlansMetadata,
} from "../../../account/study-plans/page";

type LocalePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: LocalePageProps) {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    return {};
  }

  return buildSavedStudyPlansMetadata(locale);
}

export default async function LocalizedAccountSavedStudyPlansPage({
  params,
}: LocalePageProps) {
  const { locale } = await params;
  const resolvedLocale: AppLocale = isAppLocale(locale) ? locale : "en";

  return <AccountSavedStudyPlansPage localeOverride={resolvedLocale} />;
}
