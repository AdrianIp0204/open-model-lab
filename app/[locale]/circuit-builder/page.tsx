import {
  buildCircuitBuilderMetadata,
  CircuitBuilderRoute,
} from "../../circuit-builder/CircuitBuilderRoute";
import { isAppLocale, type AppLocale } from "@/i18n/routing";

type LocalePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: LocalePageProps) {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    return {};
  }

  return buildCircuitBuilderMetadata(locale);
}

export default async function LocalizedCircuitBuilderPage({
  params,
}: LocalePageProps) {
  const { locale } = await params;
  const resolvedLocale: AppLocale = isAppLocale(locale) ? locale : "en";

  return CircuitBuilderRoute({ localeOverride: resolvedLocale });
}
