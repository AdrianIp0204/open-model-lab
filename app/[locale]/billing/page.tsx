import { isAppLocale, type AppLocale } from "@/i18n/routing";
import BillingPage, { buildBillingMetadata } from "../../billing/page";

type LocalePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: LocalePageProps) {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    return {};
  }

  return buildBillingMetadata(locale);
}

export default async function LocalizedBillingPage({ params }: LocalePageProps) {
  const { locale } = await params;
  const resolvedLocale: AppLocale = isAppLocale(locale) ? locale : "en";

  return <BillingPage localeOverride={resolvedLocale} />;
}
