import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { AccountDashboardPanel } from "@/components/account/AccountDashboardPanel";
import { decorateConceptSummaries } from "@/components/concepts/concept-catalog";
import { PageShell } from "@/components/layout/PageShell";
import { SectionHeading } from "@/components/layout/SectionHeading";
import {
  getGuidedCollections,
  getPublishedConceptMetadata,
  getConceptSummaries,
  getStarterTracks,
  getSubjectDiscoverySummaries,
} from "@/lib/content";
import {
  getSubjectDisplayDescription,
  getSubjectDisplayIntroduction,
  getSubjectDisplayTitle,
  localizeConceptSummaryDisplay,
  localizeGuidedCollection,
  localizeStarterTrack,
} from "@/lib/i18n/content";
import {
  getAccountAchievementDashboardSnapshot,
  getAccountAchievementDashboardSnapshotForAuthenticatedUser,
  syncAchievementsFromTrustedProgressSnapshot,
} from "@/lib/achievements/service";
import type { AccountAchievementDashboardSnapshot } from "@/lib/achievements";
import { buildPageMetadata } from "@/lib/metadata";
import { getAccountRouteMetadataCopy } from "@/lib/metadata/account-routes";
import { buildPremiumCheckpointHistoryView, createEmptyProgressSnapshot } from "@/lib/progress";
import {
  describeOptionalAccountDependencyFailure,
  getAccountSessionForCookieHeader,
  getStoredProgressForCookieHeader,
  shouldLogOptionalAccountDependencyFailureAsError,
} from "@/lib/account/supabase";
import {
  getStoredAssignmentsIndexForCookieHeader,
  getStoredStudyPlansIndexForCookieHeader,
} from "@/lib/account/server-store";
import type { AppLocale } from "@/i18n/routing";
import { addLocalePrefix } from "@/i18n/routing";
import { getLocaleMessages, getScopedTranslator, resolveServerLocaleFallback } from "@/i18n/server";

const EMPTY_ACHIEVEMENT_DASHBOARD_SNAPSHOT: AccountAchievementDashboardSnapshot = {
  milestoneCategories: [],
};

export async function buildDashboardMetadata(locale: AppLocale): Promise<Metadata> {
  const t = await getScopedTranslator(locale, "DashboardPage");
  const metadataCopy = getAccountRouteMetadataCopy(locale, "dashboard");

  return {
    ...buildPageMetadata({
      title: t("metadata.title"),
      description: t("metadata.description"),
      pathname: "/dashboard",
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

export default async function DashboardPage({
  localeOverride,
}: {
  localeOverride?: AppLocale;
} = {}) {
  const locale = localeOverride ?? (await resolveServerLocaleFallback());
  const messages = await getLocaleMessages(locale);
  const t = await getScopedTranslator(locale, "DashboardPage");
  console.info("[dashboard] route render started");

  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();
    const session = await getAccountSessionForCookieHeader(cookieHeader);

    if (!session) {
      console.info("[dashboard] route redirecting signed-out session", {
        hasCookieHeader: Boolean(cookieHeader),
      });
      redirect(addLocalePrefix("/account", locale));
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

      log("[dashboard] synced progress unavailable during signed-in dashboard render", {
        userId: session.user.id,
        failureKind: failure.kind,
        relationName: failure.relationName,
        code: failure.code,
        message: failure.message,
        fallback: "local_progress_only",
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

        log("[dashboard] achievement sync unavailable during signed-in dashboard render", {
          userId: session.user.id,
          failureKind: failure.kind,
          relationName: failure.relationName,
          code: failure.code,
          message: failure.message,
          fallback: "achievement_snapshot_without_sync",
        });

        achievementsUnavailable = true;
      }
    }

    let achievementSnapshot = EMPTY_ACHIEVEMENT_DASHBOARD_SNAPSHOT;

    try {
      achievementSnapshot = await getAccountAchievementDashboardSnapshot({
        userId: session.user.id,
      });
    } catch (error) {
      const failure = describeOptionalAccountDependencyFailure(error);

      try {
        achievementSnapshot = await getAccountAchievementDashboardSnapshotForAuthenticatedUser({
          userId: session.user.id,
          cookieHeader,
        });

        console.warn("[dashboard] achievement snapshot used authenticated fallback", {
          userId: session.user.id,
          failureKind: failure.kind,
          relationName: failure.relationName,
          code: failure.code,
          message: failure.message,
          fallback: "authenticated_snapshot_read",
        });
      } catch (fallbackError) {
        const fallbackFailure = describeOptionalAccountDependencyFailure(fallbackError);
        const log = shouldLogOptionalAccountDependencyFailureAsError(fallbackFailure)
          ? console.error
          : console.warn;

        log("[dashboard] achievement snapshot unavailable during signed-in dashboard render", {
          userId: session.user.id,
          failureKind: fallbackFailure.kind,
          relationName: fallbackFailure.relationName,
          code: fallbackFailure.code,
          message: fallbackFailure.message,
          primaryFailureKind: failure.kind,
          primaryRelationName: failure.relationName,
          primaryCode: failure.code,
          primaryMessage: failure.message,
          fallback: "empty_achievement_snapshot",
        });

        achievementsUnavailable = true;
      }
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
    const guidedCollections = getGuidedCollections().map((collection) =>
      localizeGuidedCollection(collection, locale),
    );
    const savedGuidedAssignments =
      (await getStoredAssignmentsIndexForCookieHeader(cookieHeader)) ?? [];
    const savedStudyPlans = session.entitlement.capabilities.canUseAdvancedStudyTools
      ? ((await getStoredStudyPlansIndexForCookieHeader(cookieHeader)) ?? [])
      : [];
    const checkpointHistoryView = session.entitlement.capabilities.canUseAdvancedStudyTools
        ? buildPremiumCheckpointHistoryView({
          snapshot: syncedProgress?.snapshot ?? createEmptyProgressSnapshot(),
          history: syncedProgress?.history ?? null,
          concepts,
          subjects: subjectSummaries,
          starterTracks,
          locale,
        })
      : null;

    console.info("[dashboard] route render completed", {
      userId: session.user.id,
      entitlementTier: session.entitlement.tier,
      warningKeys: Object.keys(session.warnings ?? {}),
      syncedProgressUnavailable,
      achievementsUnavailable,
    });

    return (
      <NextIntlClientProvider locale={locale} messages={messages}>
        <PageShell
          layoutMode="section-shell"
          feedbackContext={{
            pageType: "other",
            pagePath: "/dashboard",
            pageTitle: t("feedbackContext.pageTitle"),
          }}
          showFeedbackWidget={false}
        >
          <AccountDashboardPanel
            initialSession={session}
            concepts={concepts}
            starterTracks={starterTracks}
            guidedCollections={guidedCollections}
            initialSyncedContinueLearningState={syncedProgress?.continueLearningState ?? null}
            initialSyncedSnapshot={syncedProgress?.snapshot ?? null}
            initialCheckpointHistoryView={checkpointHistoryView}
            savedGuidedAssignments={savedGuidedAssignments}
            savedStudyPlans={savedStudyPlans}
            achievementSnapshot={achievementSnapshot}
            serverWarnings={{
              entitlementUnavailable: Boolean(session.warnings?.entitlementUnavailable),
              billingUnavailable: Boolean(session.warnings?.billingUnavailable),
              billingNotConfigured: Boolean(session.warnings?.billingNotConfigured),
              syncedProgressUnavailable,
              achievementsUnavailable,
            }}
            leadIn={
              <SectionHeading
                eyebrow={t("hero.eyebrow")}
                title={t("hero.title")}
                description={t("hero.description")}
              />
            }
          />
        </PageShell>
      </NextIntlClientProvider>
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

    if (
      error instanceof Error &&
      error.message.includes("Dynamic server usage")
    ) {
      throw error;
    }

    console.error("[dashboard] route render failed", {
      message: error instanceof Error ? error.message : null,
      name: error instanceof Error ? error.name : null,
    });
    throw error;
  }
}
