import { isAppLocale, type AppLocale } from "@/i18n/routing";
import AccountSavedSetupsPage, {
  buildSavedSetupsMetadata,
} from "../../../account/setups/page";

type LocalePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: LocalePageProps) {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    return {};
  }

  return buildSavedSetupsMetadata(locale);
}

export default async function LocalizedAccountSavedSetupsPage({ params }: LocalePageProps) {
  const { locale } = await params;
  const resolvedLocale: AppLocale = isAppLocale(locale) ? locale : "en";

  return <AccountSavedSetupsPage localeOverride={resolvedLocale} />;
}
