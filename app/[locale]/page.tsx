import { redirect } from "next/navigation";
import { isAppLocale, type AppLocale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/metadata";

type LocalePageProps = {
  params: Promise<{ locale: string }>;
};

function buildArenaMetadata(locale: AppLocale) {
  return buildPageMetadata({
    title: "Concept Arena",
    absoluteTitle: "Concept Arena | Open Model Lab",
    description:
      "Open Model Lab v2 starts with fast mastery trials: answer, reveal, level up, and share the challenge.",
    pathname: "/",
    locale,
    keywords: ["Concept Arena", "physics challenge", "interactive learning", "simple harmonic motion"],
    category: "education",
  });
}

export async function generateMetadata({ params }: LocalePageProps) {
  const { locale } = await params;
  const resolvedLocale: AppLocale = isAppLocale(locale) ? locale : "en";
  return buildArenaMetadata(resolvedLocale);
}

export default function LocalizedArenaRedirectPage(props: LocalePageProps) {
  void props.params;
  redirect("/arena/shm");
}
