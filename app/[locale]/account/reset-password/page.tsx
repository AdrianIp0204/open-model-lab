import { isAppLocale, type AppLocale } from "@/i18n/routing";
import ResetPasswordPage, { buildResetPasswordMetadata } from "../../../account/reset-password/page";

type LocalePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: LocalePageProps) {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    return {};
  }

  return buildResetPasswordMetadata(locale);
}

export default async function LocalizedResetPasswordPage({ params }: LocalePageProps) {
  const { locale } = await params;
  const resolvedLocale: AppLocale = isAppLocale(locale) ? locale : "en";

  return <ResetPasswordPage localeOverride={resolvedLocale} />;
}
