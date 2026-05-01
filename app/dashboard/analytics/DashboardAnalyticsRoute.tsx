import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LearningAnalyticsPanel } from "@/components/account/LearningAnalyticsPanel";
import { PremiumFeatureNotice } from "@/components/account/PremiumFeatureNotice";
import { PremiumSubscriptionActions } from "@/components/account/PremiumSubscriptionActions";
import { decorateConceptSummaries } from "@/components/concepts/concept-catalog";
import { PageShell } from "@/components/layout/PageShell";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { addLocalePrefix } from "@/i18n/routing";
import { getLocaleMessages, getScopedTranslator, resolveServerLocaleFallback } from "@/i18n/server";
import {
  getGuidedCollections,
  getPublishedConceptMetadata,
  getConceptSummaries,
  getStarterTracks,
  getSubjectDiscoverySummaries,
  getTopicDiscoverySummaries,
} from "@/lib/content";
import {
  getAchievementStatsForUser,
  syncAchievementsFromTrustedProgressSnapshot,
} from "@/lib/achievements/service";
import {
  getSubjectDisplayDescription,
  getSubjectDisplayIntroduction,
  getSubjectDisplayTitle,
  getTopicDisplayDescription,
  getTopicDisplayIntroduction,
  getTopicDisplaySubject,
  getTopicDisplaySubtopics,
  getTopicDisplayTitle,
  localizeConceptSummaryDisplay,
  localizeGuidedCollection,
  localizeStarterTrack,
} from "@/lib/i18n/content";
import { buildPageMetadata } from "@/lib/metadata";
import { getAccountRouteMetadataCopy } from "@/lib/metadata/account-routes";
import { buildPremiumLearningAnalytics, createEmptyProgressSnapshot } from "@/lib/progress";
import {
  describeOptionalAccountDependencyFailure,
  getAccountSessionForCookieHeader,
  getStoredProgressForCookieHeader,
  shouldLogOptionalAccountDependencyFailureAsError,
} from "@/lib/account/supabase";

const EMPTY_ACHIEVEMENT_STATS = {
  conceptVisitCount: 0,
  questionAnswerCount: 0,
  distinctChallengeCompletionCount: 0,
  distinctTrackCompletionCount: 0,
  activeStudySeconds: 0,
};

export async function buildDashboardAnalyticsMetadata(
  locale: AppLocale,
): Promise<Metadata> {
  const t = await getScopedTranslator(locale, "DashboardAnalyticsPage");
  const metadataCopy = getAccountRouteMetadataCopy(locale, "dashboardAnalytics");

  return {
    ...buildPageMetadata({
      title: t("metadata.title"),
      description: t("metadata.description"),
      pathname: "/dashboard/analytics",
      locale,
      keywords: metadataCopy.keywords,
      category: metadataCopy.category,
    }),
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function DashboardAnalyticsPage({
  localeOverride,
}: {
  localeOverride?: AppLocale;
} = {}) {
  const locale = localeOverride ?? (await resolveServerLocaleFallback());
  await getLocaleMessages(locale);
  const t = await getScopedTranslator(locale, "DashboardAnalyticsPage");
  console.info("[dashboard/analytics] route render started");

  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();
    const session = await getAccountSessionForCookieHeader(cookieHeader);

    if (!session) {
      console.info("[dashboard/analytics] redirecting signed-out session", {
        hasCookieHeader: Boolean(cookieHeader),
      });
      redirect(addLocalePrefix("/account", locale));
    }

    if (!session.entitlement.capabilities.canUseAdvancedStudyTools) {
      return (
        <PageShell
          layoutMode="section-shell"
          feedbackContext={{
            pageType: "other",
            pagePath: "/dashboard/analytics",
            pageTitle: t("feedbackContext.pageTitle"),
          }}
          showFeedbackWidget={false}
        >
          <section className="space-y-6 sm:space-y-8">
            <SectionHeading
              eyebrow={t("premiumLocked.eyebrow")}
              title={t("premiumLocked.title")}
              description={t("premiumLocked.description")}
            />

            <section className="lab-panel p-6">
              <p className="text-sm leading-6 text-ink-700">
                {t("premiumLocked.body")}
              </p>
              <PremiumFeatureNotice
                className="mt-5"
                title={t("premiumLocked.notice.title")}
                freeDescription={t("premiumLocked.notice.freeDescription")}
                description={t("premiumLocked.notice.description")}
                showSignInCta={false}
              />
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
                >
                  {t("premiumLocked.actions.backToDashboard")}
                </Link>
              </div>
              <PremiumSubscriptionActions
                className="mt-5"
                context="account"
                initialSession={session}
                billingUnavailable={Boolean(session.warnings?.billingUnavailable)}
                billingNotConfigured={Boolean(session.warnings?.billingNotConfigured)}
              />
            </section>
          </section>
        </PageShell>
      );
    }

    let syncedProgress: Awaited<ReturnType<typeof getStoredProgressForCookieHeader>> = null;
    let syncedProgressUnavailable = false;
    let achievementsUnavailable = false;

    try {
      syncedProgress = await getStoredProgressForCookieHeader(cookieHeader);
    } catch (error) {
      const failure = describeOptionalAccountDependencyFailure(
        error,
        "user_concept_progress_snapshots",
      );
      const log = shouldLogOptionalAccountDependencyFailureAsError(failure)
        ? console.error
        : console.warn;

      log("[dashboard/analytics] synced progress unavailable during render", {
        userId: session.user.id,
        failureKind: failure.kind,
        relationName: failure.relationName,
        code: failure.code,
        message: failure.message,
        fallback: "empty_snapshot",
      });

      syncedProgressUnavailable = true;
    }

    if (syncedProgress?.snapshot) {
      try {
        await syncAchievementsFromTrustedProgressSnapshot({
          userId: session.user.id,
          entitlementTier: session.entitlement.tier,
          snapshot: syncedProgress.snapshot,
        });
      } catch (error) {
        const failure = describeOptionalAccountDependencyFailure(error);
        const log = shouldLogOptionalAccountDependencyFailureAsError(failure)
          ? console.error
          : console.warn;

        log("[dashboard/analytics] achievement sync unavailable during render", {
          userId: session.user.id,
          failureKind: failure.kind,
          relationName: failure.relationName,
          code: failure.code,
          message: failure.message,
          fallback: "analytics_without_fresh_achievement_sync",
        });

        achievementsUnavailable = true;
      }
    }

    let achievementStats = EMPTY_ACHIEVEMENT_STATS;

    try {
      achievementStats = await getAchievementStatsForUser({
        userId: session.user.id,
      });
    } catch (error) {
      const failure = describeOptionalAccountDependencyFailure(error);
      const log = shouldLogOptionalAccountDependencyFailureAsError(failure)
        ? console.error
        : console.warn;

      log("[dashboard/analytics] achievement stats unavailable during render", {
        userId: session.user.id,
        failureKind: failure.kind,
        relationName: failure.relationName,
        code: failure.code,
        message: failure.message,
        fallback: "analytics_with_empty_achievement_stats",
      });

      achievementsUnavailable = true;
    }

    const concepts = decorateConceptSummaries(getConceptSummaries(), {
      conceptMetadata: getPublishedConceptMetadata(),
    }).map((concept) => localizeConceptSummaryDisplay(concept, locale));
    const starterTracks = getStarterTracks().map((track) =>
      localizeStarterTrack(track, locale),
    );
    const subjectSummaries = getSubjectDiscoverySummaries().map((subject) => ({
      ...subject,
      title: getSubjectDisplayTitle(subject, locale),
      description: getSubjectDisplayDescription(subject, locale),
      introduction: getSubjectDisplayIntroduction(subject, locale),
    }));
    const topicSummaries = getTopicDiscoverySummaries().map((topic) => ({
      ...topic,
      title: getTopicDisplayTitle(topic, locale),
      description: getTopicDisplayDescription(topic, locale),
      introduction: getTopicDisplayIntroduction(topic, locale),
      subject: getTopicDisplaySubject(topic, locale),
      subtopics: getTopicDisplaySubtopics(topic, locale),
      concepts: topic.concepts.map((concept) => localizeConceptSummaryDisplay(concept, locale)),
    }));
    const guidedCollections = getGuidedCollections().map((collection) =>
      localizeGuidedCollection(collection, locale),
    );
    const analytics = buildPremiumLearningAnalytics({
      snapshot: syncedProgress?.snapshot ?? createEmptyProgressSnapshot(),
      history: syncedProgress?.history ?? null,
      achievementStats,
      concepts,
      starterTracks,
      subjectSummaries,
      topicSummaries,
      guidedCollections,
      locale,
    });

    console.info("[dashboard/analytics] route render completed", {
      userId: session.user.id,
      entitlementTier: session.entitlement.tier,
      syncedProgressUnavailable,
      achievementsUnavailable,
    });

    return (
      <PageShell
        layoutMode="section-shell"
        feedbackContext={{
          pageType: "other",
          pagePath: "/dashboard/analytics",
          pageTitle: t("feedbackContext.pageTitle"),
        }}
        showFeedbackWidget={false}
      >
        <LearningAnalyticsPanel
          analytics={analytics}
          syncedProgressUnavailable={syncedProgressUnavailable}
          achievementsUnavailable={achievementsUnavailable}
          leadIn={
            <SectionHeading
              eyebrow={t("hero.eyebrow")}
              title={t("hero.title")}
              description={t("hero.description")}
            />
          }
        />
      </PageShell>
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest?: unknown }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }

    if (error instanceof Error && error.message.includes("Dynamic server usage")) {
      throw error;
    }

    console.error("[dashboard/analytics] route render failed", {
      message: error instanceof Error ? error.message : null,
      name: error instanceof Error ? error.name : null,
    });
    throw error;
  }
}
