import { isAppLocale, type AppLocale } from "@/i18n/routing";
import AccountSavedCompareSetupsPage, {
  buildSavedCompareSetupsMetadata,
} from "../../../account/compare-setups/page";

type LocalePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: LocalePageProps) {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    return {};
  }

  return buildSavedCompareSetupsMetadata(locale);
}

export default async function LocalizedAccountSavedCompareSetupsPage({
  params,
}: LocalePageProps) {
  const { locale } = await params;
  const resolvedLocale: AppLocale = isAppLocale(locale) ? locale : "en";

  return <AccountSavedCompareSetupsPage localeOverride={resolvedLocale} />;
}
