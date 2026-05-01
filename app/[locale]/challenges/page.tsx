import ChallengeHubPage, {
  buildChallengesMetadata,
} from "../../challenges/ChallengesRoute";
import { isAppLocale, type AppLocale } from "@/i18n/routing";

type LocalePageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: LocalePageProps) {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    return {};
  }

  return buildChallengesMetadata(locale);
}

export default async function LocalizedChallengesPage({
  params,
  searchParams,
}: LocalePageProps) {
  const { locale } = await params;
  const resolvedLocale: AppLocale = isAppLocale(locale) ? locale : "en";

  return <ChallengeHubPage searchParams={searchParams} localeOverride={resolvedLocale} />;
}
