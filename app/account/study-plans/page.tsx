import type { Metadata } from "next";
import { SavedStudyPlansPage } from "@/components/account/SavedStudyPlansPage";
import { PageShell } from "@/components/layout/PageShell";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { resolveServerLocaleFallback, getScopedTranslator } from "@/i18n/server";
import {
  getConceptSummaries,
  getGuidedCollections,
  getRecommendedGoalPaths,
  getStarterTracks,
} from "@/lib/content";
import { buildPageMetadata } from "@/lib/metadata";
import { getAccountRouteMetadataCopy } from "@/lib/metadata/account-routes";

export async function buildSavedStudyPlansMetadata(locale: AppLocale): Promise<Metadata> {
  const t = await getScopedTranslator(locale, "AccountSavedStudyPlansPage");
  const metadataCopy = getAccountRouteMetadataCopy(locale, "savedStudyPlans");

  return {
    ...buildPageMetadata({
      title: t("feedbackTitle"),
      description: t("hero.description"),
      pathname: "/account/study-plans",
      locale,
      keywords: [t("feedbackTitle"), ...metadataCopy.keywords],
      category: t("hero.eyebrow"),
    }),
    robots: {
      index: false,
      follow: false,
    },
  };
}

export async function generateMetadata(): Promise<Metadata> {
  return buildSavedStudyPlansMetadata(await resolveServerLocaleFallback());
}

export default async function AccountSavedStudyPlansPage({
  localeOverride,
}: {
  localeOverride?: AppLocale;
} = {}) {
  const locale = localeOverride ?? (await resolveServerLocaleFallback());
  const t = await getScopedTranslator(locale, "AccountSavedStudyPlansPage");

  return (
    <PageShell
      feedbackContext={{
        pageType: "other",
        pagePath: "/account/study-plans",
        pageTitle: t("feedbackTitle"),
      }}
      showFeedbackWidget={false}
    >
      <section className="space-y-6 sm:space-y-8">
        <SectionHeading
          eyebrow={t("hero.eyebrow")}
          title={t("hero.title")}
          description={t("hero.description")}
        />

        <div className="flex flex-wrap gap-3">
          <Link
            href="/account/setups"
            className="inline-flex items-center rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
          >
            {t("actions.openSavedSetups")}
          </Link>
          <Link
            href="/account/compare-setups"
            className="inline-flex items-center rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
          >
            {t("actions.openCompareLibrary")}
          </Link>
        </div>

        <SavedStudyPlansPage
          concepts={getConceptSummaries()}
          starterTracks={getStarterTracks()}
          guidedCollections={getGuidedCollections()}
          recommendedGoalPaths={getRecommendedGoalPaths()}
        />
      </section>
    </PageShell>
  );
}
