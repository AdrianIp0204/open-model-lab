import { redirect } from "next/navigation";
import { isAppLocale, type AppLocale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/metadata";

const primaryRescuePath = "/rescue/edexcel-ial-physics-unit-5";

type LocalePageProps = {
  params: Promise<{ locale: string }>;
};

function buildRescueMetadata(locale: AppLocale) {
  return buildPageMetadata({
    title: "Exam Rescue",
    absoluteTitle: "Exam Rescue | Open Model Lab",
    description:
      "Open Model Lab now starts with a focused exam-rescue loop: diagnose weak topics, rescue the model, drill exam-style, and save progress.",
    pathname: "/",
    locale,
    keywords: ["exam rescue", "IAL physics", "physics revision", "interactive learning"],
    category: "education",
  });
}

export async function generateMetadata({ params }: LocalePageProps) {
  const { locale } = await params;
  const resolvedLocale: AppLocale = isAppLocale(locale) ? locale : "en";
  return buildRescueMetadata(resolvedLocale);
}

export default function LocalizedRescueRedirectPage(props: LocalePageProps) {
  void props.params;
  redirect(primaryRescuePath);
}
