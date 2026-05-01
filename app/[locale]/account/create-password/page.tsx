import { isAppLocale, type AppLocale } from "@/i18n/routing";
import CreatePasswordPage, { buildCreatePasswordMetadata } from "../../../account/create-password/page";

type LocalePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: LocalePageProps) {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    return {};
  }

  return buildCreatePasswordMetadata(locale);
}

export default async function LocalizedCreatePasswordPage({ params }: LocalePageProps) {
  const { locale } = await params;
  const resolvedLocale: AppLocale = isAppLocale(locale) ? locale : "en";

  return <CreatePasswordPage localeOverride={resolvedLocale} />;
}
