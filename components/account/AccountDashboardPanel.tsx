"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { AppLocale } from "@/i18n/routing";
import { ContinueLearningSection } from "@/components/progress/ContinueLearningSection";
import { FreeTierProgressRecapPanel } from "@/components/progress/FreeTierProgressRecapPanel";
import { PremiumAdaptiveReviewPanel } from "@/components/progress/PremiumAdaptiveReviewPanel";
import { ReviewQueueSection } from "@/components/progress/ReviewQueueSection";
import type { ConceptSummary } from "@/components/concepts/concept-catalog";
import { PageSection } from "@/components/layout/PageSection";
import { PageSectionFrame } from "@/components/layout/PageSectionFrame";
import type { AccountAchievementDashboardSnapshot } from "@/lib/achievements";
import {
  deriveBillingLifecycleStatus,
  type BillingLifecycleStatus,
} from "@/lib/billing/ui";
import { getLocalizedAccountDisplayName } from "@/lib/i18n/account";
import {
  getConceptDisplayTitle,
} from "@/lib/i18n/content";
import {
  getLocalizedConceptMasteryNote,
  getLocalizedProgressSupportReason,
  shouldUseGenericProgressCopy,
} from "@/lib/i18n/progress";
import { signOutAccount, useAccountSession } from "@/lib/account/client";
import type { AccountSession } from "@/lib/account/model";
import type { ResolvedSavedStudyPlan } from "@/lib/account/study-plans";
import type { GuidedCollectionSummary, StarterTrackSummary } from "@/lib/content";
import type { ResolvedGuidedCollectionAssignment } from "@/lib/guided/assignments";
import {
  buildFreeTierProgressRecapSummary,
  getGuidedCollectionAssignmentProgressSummary,
  buildPremiumAdaptiveReviewSummary,
  forceProgressSync,
  resolveAccountProgressSnapshot,
  useProgressSnapshot,
  useProgressSyncState,
  type PremiumCheckpointHistoryView,
  type ProgressSnapshot,
  type SavedContinueLearningState,
} from "@/lib/progress";
import {
  assignmentShareAnchorIds,
  buildGuidedCollectionAssignmentHref,
  buildGuidedCollectionAssignmentShareTargets,
} from "@/lib/share-links";
import { ShareLinkButton } from "@/components/share/ShareLinkButton";
import { PremiumFeatureNotice } from "./PremiumFeatureNotice";
import { PremiumCheckpointHistoryPanel } from "./PremiumCheckpointHistoryPanel";
import { PremiumSubscriptionActions } from "./PremiumSubscriptionActions";
import { SavedStudyPlansPreviewPanel } from "./SavedStudyPlansPreviewPanel";
import { Link, useRouter } from "@/i18n/navigation";

type TranslateFn = (key: string, values?: Record<string, unknown>) => string;

type AccountDashboardServerWarnings = {
  entitlementUnavailable?: boolean;
  billingUnavailable?: boolean;
  billingNotConfigured?: boolean;
  syncedProgressUnavailable?: boolean;
  achievementsUnavailable?: boolean;
};

type AccountDashboardPanelProps = {
  initialSession: AccountSession;
  concepts: ConceptSummary[];
  starterTracks: StarterTrackSummary[];
  guidedCollections: GuidedCollectionSummary[];
  achievementSnapshot: AccountAchievementDashboardSnapshot;
  initialSyncedContinueLearningState?: SavedContinueLearningState | null;
  initialSyncedSnapshot?: ProgressSnapshot | null;
  initialCheckpointHistoryView?: PremiumCheckpointHistoryView | null;
  savedGuidedAssignments?: ResolvedGuidedCollectionAssignment[];
  savedStudyPlans?: ResolvedSavedStudyPlan[];
  serverWarnings?: AccountDashboardServerWarnings;
  leadIn?: ReactNode;
};

function formatDate(value: string | null, locale: string) {
  if (!value) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
    }).format(new Date(value));
  } catch {
    return null;
  }
}

function formatBillingDate(value: string | null, locale: string) {
  if (!value) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(value));
  } catch {
    return null;
  }
}

function getLocalizedBillingLifecycleLabel(
  status: BillingLifecycleStatus,
  currentPeriodEnd: string | null,
  locale: string,
  t: TranslateFn,
) {
  const formattedPeriodEnd = formatBillingDate(currentPeriodEnd, locale);

  switch (status) {
    case "active":
      return t("billingLifecycle.active");
    case "active_canceling_at_period_end":
      return formattedPeriodEnd
        ? t("billingLifecycle.activeCancelingAtPeriodEndWithDate", {
            date: formattedPeriodEnd,
          })
        : t("billingLifecycle.activeCancelingAtPeriodEnd");
    case "payment_issue":
      return t("billingLifecycle.paymentIssue");
    case "ended":
      return t("billingLifecycle.ended");
    case "manual_premium":
      return t("billingLifecycle.manualPremium");
    default:
      return t("billingLifecycle.notStarted");
  }
}

function getAchievementCategoryLabelKey(statKey: string) {
  switch (statKey) {
    case "concept-visits":
      return "conceptVisits";
    case "question-answers":
      return "questionAnswers";
    case "challenge-completions":
      return "challengeCompletions";
    case "track-completions":
      return "trackCompletions";
    case "active-study-hours":
    default:
      return "activeStudyHours";
  }
}

function getSyncLabel(
  mode: ReturnType<typeof useProgressSyncState>["mode"],
  t: TranslateFn,
) {
  switch (mode) {
    case "synced":
      return t("sync.label.synced");
    case "syncing":
      return t("sync.label.syncing");
    case "error":
      return t("sync.label.error");
    default:
      return t("sync.label.local");
  }
}

function getLastSyncStatusLabel(
  mode: ReturnType<typeof useProgressSyncState>["mode"],
  lastSyncedAtLabel: string | null,
  t: TranslateFn,
) {
  switch (mode) {
    case "synced":
      return lastSyncedAtLabel
        ? t("sync.status.lastConfirmed", { date: lastSyncedAtLabel })
        : t("sync.status.syncedJustNow");
    case "syncing":
      return lastSyncedAtLabel
        ? t("sync.status.refreshingSince", { date: lastSyncedAtLabel })
        : t("sync.status.syncing");
    case "error":
      return lastSyncedAtLabel
        ? t("sync.status.lastConfirmed", { date: lastSyncedAtLabel })
        : t("sync.status.retryNeeded");
    default:
      return lastSyncedAtLabel
        ? t("sync.status.lastConfirmed", { date: lastSyncedAtLabel })
        : t("sync.status.localFallback");
  }
}

function getSyncTone(mode: ReturnType<typeof useProgressSyncState>["mode"]) {
  switch (mode) {
    case "synced":
      return "border-teal-500/25 bg-teal-500/10 text-teal-700";
    case "syncing":
      return "border-amber-500/25 bg-amber-500/10 text-amber-700";
    case "error":
      return "border-coral-500/25 bg-coral-500/10 text-coral-700";
    default:
      return "border-line bg-paper text-ink-600";
  }
}

function getGuidedAssignmentStatusLabel(
  status: ReturnType<typeof getGuidedCollectionAssignmentProgressSummary>["status"],
  t: TranslateFn,
) {
  switch (status) {
    case "completed":
      return t("guidedAssignments.status.completed");
    case "in-progress":
      return t("guidedAssignments.status.inProgress");
    default:
      return t("guidedAssignments.status.notStarted");
  }
}

function getGuidedAssignmentStatusTone(
  status: ReturnType<typeof getGuidedCollectionAssignmentProgressSummary>["status"],
) {
  switch (status) {
    case "completed":
      return "border-teal-500/25 bg-teal-500/10 text-teal-700";
    case "in-progress":
      return "border-amber-500/25 bg-amber-500/10 text-amber-700";
    default:
      return "border-line bg-paper text-ink-600";
  }
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-line bg-paper-strong p-4">
      <p className="text-lg font-semibold text-ink-950">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-500">{label}</p>
    </div>
  );
}

function getAchievementSnapshotStatusLabel(
  status: AccountAchievementDashboardSnapshot["milestoneCategories"][number]["status"],
  t: TranslateFn,
) {
  switch (status) {
    case "earned":
      return t("achievementSnapshot.status.earned");
    case "maxed":
      return t("achievementSnapshot.status.maxed");
    default:
      return t("achievementSnapshot.status.nextUp");
  }
}

function AchievementSnapshotCard({
  category,
  t,
  locale,
}: {
  category: AccountDashboardPanelProps["achievementSnapshot"]["milestoneCategories"][number];
  t: TranslateFn;
  locale: AppLocale;
}) {
  const categoryKey = getAchievementCategoryLabelKey(category.statKey);
  const title =
    locale === "en"
      ? category.title
      : t(`achievementSnapshot.categoryTitles.${categoryKey}`);
  const summary =
    locale === "en"
      ? category.summaryTitle
      : category.status === "earned"
        ? t("achievementSnapshot.summary.earned", { title })
        : category.status === "maxed"
          ? t("achievementSnapshot.summary.maxed", { title })
          : t("achievementSnapshot.summary.nextUp", { title });

  return (
    <article className="rounded-[22px] border border-line bg-paper-strong p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-ink-950">{title}</h3>
          <p className="mt-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-500">
            {getAchievementSnapshotStatusLabel(category.status, t)}
          </p>
        </div>
        {category.rewardRelevant ? (
          <span className="rounded-full border border-teal-500/25 bg-teal-500/10 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-teal-700">
            {t("achievementSnapshot.rewardUnlocks")}
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-ink-950">{summary}</p>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
        {t("achievementSnapshot.progress")}
      </p>
      <p className="mt-1 text-sm leading-6 text-ink-700">{category.progressLabel}</p>
    </article>
  );
}

export function AccountDashboardPanel({
  initialSession,
  concepts,
  starterTracks,
  guidedCollections,
  achievementSnapshot,
  initialSyncedContinueLearningState = null,
  initialSyncedSnapshot = null,
  initialCheckpointHistoryView = null,
  savedGuidedAssignments = [],
  savedStudyPlans = [],
  serverWarnings,
  leadIn = null,
}: AccountDashboardPanelProps) {
  const router = useRouter();
  const locale = useLocale() as AppLocale;
  const t = useTranslations("DashboardPage.panel");
  const tAccountIdentity = useTranslations("AccountIdentity");
  const tProgress = useTranslations("ProgressCopy");
  const translate = t as unknown as TranslateFn;
  const translateProgress = tProgress as unknown as TranslateFn;
  const session = useAccountSession();
  const syncState = useProgressSyncState();
  const progressSnapshot = useProgressSnapshot();
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const progressDisplay = resolveAccountProgressSnapshot(
    progressSnapshot,
    initialSyncedSnapshot,
  );
  const freeTierRecap = useMemo(
    () =>
      buildFreeTierProgressRecapSummary({
        snapshot: progressDisplay.snapshot,
        concepts,
        starterTracks,
        guidedCollections,
        locale,
    }),
    [concepts, guidedCollections, locale, progressDisplay.snapshot, starterTracks],
  );
  const premiumAdaptiveReview = useMemo(
    () =>
      buildPremiumAdaptiveReviewSummary({
        snapshot: progressDisplay.snapshot,
        concepts,
        starterTracks,
        guidedCollections,
        limit: 2,
        locale,
      }),
    [concepts, guidedCollections, locale, progressDisplay.snapshot, starterTracks],
  );
  const conceptCount = Object.keys(progressSnapshot.concepts).length;
  const isRedirectingToAccount =
    session.initialized && session.status === "signed-out";

  useEffect(() => {
    if (!isRedirectingToAccount) {
      return;
    }

    router.replace("/account");
  }, [isRedirectingToAccount, router]);

  async function handleManualSync() {
    setIsManualSyncing(true);

    try {
      await forceProgressSync();
    } finally {
      setIsManualSyncing(false);
    }
  }

  if (isRedirectingToAccount) {
    return (
      <section className="lab-panel p-6">
        <p className="lab-label">{t("redirect.label")}</p>
        <h2 className="mt-3 text-3xl font-semibold text-ink-950">
          {t("redirect.title")}
        </h2>
        <p className="mt-3 text-sm leading-6 text-ink-700">
          {t("redirect.description")}
        </p>
      </section>
    );
  }

  const activeSession =
    session.initialized && session.status === "signed-in" && session.user
      ? {
          user: session.user,
          entitlement: session.entitlement,
          billing: session.billing,
        }
      : initialSession;
  const { user, entitlement, billing } = activeSession;
  const localizedAccountDisplayName = getLocalizedAccountDisplayName(
    user.displayName,
    tAccountIdentity,
  );
  const isPremium = entitlement.tier === "premium";
  const billingUnavailable = Boolean(
    (session.initialized && session.status === "signed-in"
      ? session.warnings?.billingUnavailable
      : initialSession.warnings?.billingUnavailable) ?? serverWarnings?.billingUnavailable,
  );
  const entitlementUnavailable = Boolean(
    (session.initialized && session.status === "signed-in"
      ? session.warnings?.entitlementUnavailable
      : initialSession.warnings?.entitlementUnavailable) ?? serverWarnings?.entitlementUnavailable,
  );
  const billingNotConfigured = Boolean(
    (session.initialized && session.status === "signed-in"
      ? session.warnings?.billingNotConfigured
      : initialSession.warnings?.billingNotConfigured) ?? serverWarnings?.billingNotConfigured,
  );
  const syncedProgressUnavailable = Boolean(serverWarnings?.syncedProgressUnavailable);
  const achievementsUnavailable = Boolean(serverWarnings?.achievementsUnavailable);
  const billingLifecycleStatus = deriveBillingLifecycleStatus({
    entitlement,
    billing,
  });
  const canUseLearningAnalytics = entitlement.capabilities.canUseAdvancedStudyTools;
  const lastSyncLabel = formatDate(syncState.lastSyncedAt, locale);
  const accountCreatedLabel = formatDate(user.createdAt, locale);
  const syncedPrimaryConcept = initialSyncedContinueLearningState?.primaryConcept ?? null;
  const useGenericProgressCopy = shouldUseGenericProgressCopy(locale);
  const syncedPrimaryConceptTitle = syncedPrimaryConcept
    ? getConceptDisplayTitle(
        {
          slug: syncedPrimaryConcept.slug,
          title: syncedPrimaryConcept.title,
        },
        locale,
      )
    : null;
  const syncedPrimaryConceptNote = syncedPrimaryConcept
    ? (() => {
        if (!useGenericProgressCopy) {
          return (
            syncedPrimaryConcept.resumeReason ??
            syncedPrimaryConcept.masteryNote ??
            t("premiumShortcuts.syncedHandoff.defaultNote")
          );
        }

        if (syncedPrimaryConcept.resumeReason) {
          const descriptor = getLocalizedProgressSupportReason(
            syncedPrimaryConcept.resumeReason,
          );
          if (descriptor) {
            return translateProgress(descriptor.key, descriptor.values);
          }
        }

        if (syncedPrimaryConcept.masteryNote) {
          const descriptor = getLocalizedConceptMasteryNote(
            syncedPrimaryConcept.masteryNote,
          );
          if (descriptor) {
            return translateProgress(descriptor.key, descriptor.values);
          }
        }

        return t("premiumShortcuts.syncedHandoff.defaultNote");
      })()
    : null;
  const progressSourceLabel =
    progressDisplay.source === "merged"
      ? t("guidedAssignments.progressSource.merged")
      : progressDisplay.source === "synced"
        ? t("guidedAssignments.progressSource.synced")
        : t("guidedAssignments.progressSource.local");
  const sectionNavItems = [
    {
      id: "dashboard-overview",
      label: t("sectionNav.overview.label"),
      compactLabel: t("sectionNav.overview.compact"),
    },
    {
      id: "dashboard-learning-analytics",
      label: t("sectionNav.analytics.label"),
      compactLabel: t("sectionNav.analytics.compact"),
    },
    {
      id: "dashboard-guided-assignments",
      label: t("sectionNav.guidedAssignments.label"),
      compactLabel: t("sectionNav.guidedAssignments.compact"),
    },
    ...(isPremium && initialCheckpointHistoryView
      ? [
          {
            id: "dashboard-checkpoint-history",
            label: t("sectionNav.checkpointHistory.label"),
            compactLabel: t("sectionNav.checkpointHistory.compact"),
          },
        ]
      : []),
    ...(isPremium
      ? [
          {
            id: "dashboard-study-plans",
            label: t("sectionNav.studyPlans.label"),
            compactLabel: t("sectionNav.studyPlans.compact"),
          },
        ]
      : []),
    {
      id: "dashboard-achievements",
      label: t("sectionNav.achievements.label"),
      compactLabel: t("sectionNav.achievements.compact"),
    },
    {
      id: "dashboard-continue-learning",
      label: t("sectionNav.continueLearning.label"),
      compactLabel: t("sectionNav.continueLearning.compact"),
    },
    ...(isPremium
      ? [
          {
            id: "dashboard-adaptive-review",
            label: t("sectionNav.adaptiveReview.label"),
            compactLabel: t("sectionNav.adaptiveReview.compact"),
          },
          {
            id: "dashboard-review-queue",
            label: t("sectionNav.reviewQueue.label"),
            compactLabel: t("sectionNav.reviewQueue.compact"),
          },
        ]
      : []),
  ];

  return (
    <PageSectionFrame
      sectionNav={{
        label: t("sectionNav.label"),
        title: t("sectionNav.title"),
        mobileLabel: t("sectionNav.mobileLabel"),
        items: sectionNavItems,
      }}
    >
      {leadIn ? <div className="mb-6 space-y-3 sm:mb-8">{leadIn}</div> : null}
      <div className="space-y-8">
        <PageSection
          id="dashboard-overview"
          as="section"
          className="grid gap-4 xl:grid-cols-[minmax(0,1.06fr)_minmax(22rem,0.94fr)]"
        >
        <div className="lab-panel p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="lab-label">{t("overview.label")}</span>
            <span
              className={[
                "rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
                isPremium
                  ? "border-teal-500/25 bg-teal-500/10 text-teal-700"
                  : "border-line bg-paper-strong text-ink-600",
              ].join(" ")}
            >
              {isPremium ? t("overview.badges.premium") : t("overview.badges.freeTier")}
            </span>
            <span
              className={[
                "rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
                getSyncTone(syncState.mode),
              ].join(" ")}
            >
              {getSyncLabel(syncState.mode, translate)}
            </span>
          </div>

          <h2 className="mt-3 text-3xl font-semibold text-ink-950">
            {t("overview.welcome", { name: localizedAccountDisplayName })}
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink-700">
            {isPremium
              ? t("overview.descriptions.premium", { email: user.email })
              : t("overview.descriptions.free", { email: user.email })}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={t("overview.stats.tier")}
              value={isPremium ? t("overview.stats.premium") : t("overview.stats.free")}
            />
            <StatCard
              label={t("overview.stats.progressMode")}
              value={getSyncLabel(syncState.mode, translate)}
            />
            <StatCard
              label={t("overview.stats.billing")}
              value={getLocalizedBillingLifecycleLabel(
                billingLifecycleStatus,
                billing?.currentPeriodEnd ?? null,
                locale,
                translate,
              )}
            />
            <StatCard
              label={t("overview.stats.ads")}
              value={
                entitlement.capabilities.shouldShowAds
                  ? t("overview.stats.adsEligible")
                  : t("overview.stats.adFree")
              }
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/concepts"
              className="inline-flex items-center rounded-full bg-ink-950 px-5 py-3 text-sm font-semibold transition hover:opacity-90"
              style={{ color: "var(--paper-strong)" }}
            >
              {t("overview.actions.browseConcepts")}
            </Link>
            <Link
              href="/challenges"
              className="inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
            >
              {t("overview.actions.challengeHub")}
            </Link>
            <Link
              href="/account/setups"
              className="inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
            >
              {t("overview.actions.savedSetups")}
            </Link>
            <Link
              href="/account/compare-setups"
              className="inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
            >
              {t("overview.actions.compareSetups")}
            </Link>
            <Link
              href="/account/study-plans"
              className="inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
            >
              {t("overview.actions.studyPlans")}
            </Link>
            <Link
              href="/account"
              className="inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
            >
              {t("overview.actions.accountSettings")}
            </Link>
            <button
              type="button"
              onClick={handleManualSync}
              disabled={syncState.mode === "syncing" || isManualSyncing}
              className="inline-flex items-center rounded-full bg-ink-950 px-5 py-3 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ color: "var(--paper-strong)" }}
            >
              {syncState.mode === "syncing" || isManualSyncing
                ? t("overview.actions.syncing")
                : t("overview.actions.syncNow")}
            </button>
            <button
              type="button"
              onClick={() => void signOutAccount()}
              disabled={session.pendingAction === "logout"}
              className="inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {session.pendingAction === "logout"
                ? t("overview.actions.signingOut")
                : t("overview.actions.signOut")}
            </button>
          </div>

          {entitlementUnavailable ||
          billingUnavailable ||
          billingNotConfigured ||
          syncedProgressUnavailable ||
          achievementsUnavailable ? (
            <div className="mt-5 rounded-[24px] border border-amber-500/25 bg-amber-500/10 p-4">
              <p className="text-sm font-semibold text-ink-950">
                {t("overview.warnings.title")}
              </p>
              <div className="mt-3 grid gap-3 text-sm leading-6 text-ink-700">
                {entitlementUnavailable ? (
                  <p>{t("overview.warnings.entitlementUnavailable")}</p>
                ) : null}
                {billingUnavailable ? (
                  <p>{t("overview.warnings.billingUnavailable")}</p>
                ) : null}
                {billingNotConfigured ? (
                  <p>{t("overview.warnings.billingNotConfigured")}</p>
                ) : null}
                {syncedProgressUnavailable ? (
                  <p>{t("overview.warnings.syncedProgressUnavailable")}</p>
                ) : null}
                {achievementsUnavailable ? (
                  <p>{t("overview.warnings.achievementsUnavailable")}</p>
                ) : null}
              </div>
            </div>
          ) : null}

          {!isPremium ? (
            <FreeTierProgressRecapPanel
              summary={freeTierRecap}
              progressDateSource={progressDisplay.source === "local" ? "local" : "synced"}
              progressSourceLabel={progressSourceLabel}
              className="mt-5"
              eyebrow={t("overview.freeTierRecap.eyebrow")}
              title={t("overview.freeTierRecap.title")}
              description={t("overview.freeTierRecap.description")}
              emptyTitle={t("overview.freeTierRecap.emptyTitle")}
              emptyNote={t("overview.freeTierRecap.emptyNote")}
              browseHref="/challenges"
              browseLabel={t("overview.freeTierRecap.browse")}
            />
          ) : null}

          {!isPremium ? (
            <>
              <PremiumFeatureNotice
                className="mt-5"
                title={t("overview.premiumNotice.title")}
                freeDescription={t("overview.premiumNotice.freeDescription")}
                description={t("overview.premiumNotice.description")}
                showSignInCta={false}
              />
              <PremiumSubscriptionActions
                className="mt-5"
                context="account"
                initialSession={initialSession}
                billingUnavailable={billingUnavailable}
                billingNotConfigured={billingNotConfigured}
              />
            </>
          ) : (
            <>
              <div className="mt-5 rounded-[24px] border border-line bg-paper-strong p-4">
                <p className="text-sm font-semibold text-ink-950">
                  {t("overview.premiumStatus.title")}
                </p>
                <p className="mt-2 text-sm leading-6 text-ink-700">
                  {t("overview.premiumStatus.description")}
                </p>
              </div>
              <PremiumSubscriptionActions
                className="mt-5"
                context="account"
                initialSession={initialSession}
                billingUnavailable={billingUnavailable}
                billingNotConfigured={billingNotConfigured}
              />
            </>
          )}

          {syncState.errorMessage ? (
            <p className="mt-4 text-sm text-coral-700">{syncState.errorMessage}</p>
          ) : null}
          {session.errorMessage ? (
            <p className="mt-4 text-sm text-coral-700">{session.errorMessage}</p>
          ) : null}
        </div>

        <aside className="grid gap-4">
          <section className="lab-panel p-5">
            <p className="lab-label">{t("sessionState.label")}</p>
            <dl className="mt-4 space-y-3 text-sm text-ink-700">
              <div className="rounded-[20px] border border-line bg-paper-strong px-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
                  {t("sessionState.signedInEmail")}
                </dt>
                <dd className="mt-2">{user.email}</dd>
              </div>
              <div className="rounded-[20px] border border-line bg-paper-strong px-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
                  {t("sessionState.accountCreated")}
                </dt>
                <dd className="mt-2">{accountCreatedLabel ?? t("sessionState.thisAccount")}</dd>
              </div>
              <div className="rounded-[20px] border border-line bg-paper-strong px-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
                  {t("sessionState.lastSync")}
                </dt>
                <dd className="mt-2">
                  {getLastSyncStatusLabel(syncState.mode, lastSyncLabel, translate)}
                </dd>
              </div>
              <div className="rounded-[20px] border border-line bg-paper-strong px-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
                  {t("sessionState.localConceptRecords")}
                </dt>
                <dd className="mt-2">{conceptCount}</dd>
              </div>
            </dl>
          </section>

          <PageSection
            id="dashboard-learning-analytics"
            as="section"
            className="lab-panel p-5"
            aria-labelledby="dashboard-learning-analytics-heading"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="lab-label">{t("learningAnalytics.label")}</p>
                <h2
                  id="dashboard-learning-analytics-heading"
                  className="mt-2 text-2xl font-semibold text-ink-950"
                >
                  {t("learningAnalytics.title")}
                </h2>
              </div>
              <span
                className={[
                  "rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em]",
                  canUseLearningAnalytics
                    ? "border-teal-500/25 bg-teal-500/10 text-teal-700"
                    : "border-amber-500/25 bg-amber-500/10 text-amber-800",
                ].join(" ")}
              >
                {canUseLearningAnalytics
                  ? t("learningAnalytics.badges.live")
                  : t("learningAnalytics.badges.locked")}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-ink-700">
              {canUseLearningAnalytics
                ? t("learningAnalytics.descriptions.live")
                : t("learningAnalytics.descriptions.locked")}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                t("learningAnalytics.chips.usageSnapshot"),
                t("learningAnalytics.chips.checkpointHistory"),
                t("learningAnalytics.chips.masteryTrends"),
                t("learningAnalytics.chips.adaptiveReview"),
                t("learningAnalytics.chips.ruleBasedNextSteps"),
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-700"
                >
                  {item}
                </span>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              {canUseLearningAnalytics ? (
                <Link
                  href="/dashboard/analytics"
                  className="inline-flex items-center rounded-full bg-ink-950 px-5 py-3 text-sm font-semibold transition hover:opacity-90"
                  style={{ color: "var(--paper-strong)" }}
                >
                  {t("learningAnalytics.actions.open")}
                </Link>
              ) : (
                <Link
                  href="/pricing#compare"
                  className="inline-flex items-center rounded-full bg-ink-950 px-5 py-3 text-sm font-semibold transition hover:opacity-90"
                  style={{ color: "var(--paper-strong)" }}
                >
                  {t("learningAnalytics.actions.unlock")}
                </Link>
                )}
              </div>
          </PageSection>

          {!isPremium ? (
            <section className="lab-panel p-5">
              <p className="lab-label">{t("freeTierKeeps.label")}</p>
              <div className="mt-4 grid gap-3">
                {[
                  t("freeTierKeeps.items.coreConcepts"),
                  t("freeTierKeeps.items.tracksAndChallenges"),
                  t("freeTierKeeps.items.progressSync"),
                  t("freeTierKeeps.items.realAccount"),
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-[20px] border border-line bg-paper-strong px-4 py-3 text-sm leading-6 text-ink-700"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <section className="lab-panel p-5">
              <p className="lab-label">{t("premiumShortcuts.label")}</p>
              <div className="mt-4 grid gap-3">
                <div className="rounded-[20px] border border-line bg-paper-strong px-4 py-3">
                  <p className="text-sm font-semibold text-ink-950">
                    {t("premiumShortcuts.adFree.title")}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink-700">
                    {t("premiumShortcuts.adFree.body")}
                  </p>
                </div>
                <div className="rounded-[20px] border border-line bg-paper-strong px-4 py-3">
                  <p className="text-sm font-semibold text-ink-950">
                    {t("premiumShortcuts.savedTools.title")}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink-700">
                    {t("premiumShortcuts.savedTools.body")}
                  </p>
                </div>
                {syncedPrimaryConcept ? (
                  <div className="rounded-[20px] border border-teal-500/25 bg-teal-500/10 px-4 py-3">
                    <p className="text-sm font-semibold text-ink-950">
                      {t("premiumShortcuts.syncedHandoff.title")}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-ink-700">
                      {syncedPrimaryConceptTitle}: {syncedPrimaryConceptNote}
                    </p>
                    <Link
                      href={`/concepts/${syncedPrimaryConcept.slug}`}
                      className="mt-3 inline-flex items-center rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
                    >
                      {t("premiumShortcuts.syncedHandoff.action")}
                    </Link>
                  </div>
                ) : null}
              </div>
            </section>
          )}
        </aside>
        </PageSection>

        <PageSection
          id="dashboard-guided-assignments"
          as="section"
          className="lab-panel p-5"
          aria-labelledby="dashboard-guided-assignments-heading"
        >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{t("guidedAssignments.label")}</p>
            <h2
              id="dashboard-guided-assignments-heading"
              className="mt-2 text-2xl font-semibold text-ink-950"
            >
              {t("guidedAssignments.title")}
            </h2>
          </div>
          <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-600">
            {t("guidedAssignments.savedCount", { count: savedGuidedAssignments.length })}
          </span>
        </div>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-ink-700">
          {t("guidedAssignments.summary", {
            progressSource: progressSourceLabel.toLowerCase(),
          })}
        </p>

        {savedGuidedAssignments.length ? (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {savedGuidedAssignments.map((assignment) => {
              const assignmentProgress = getGuidedCollectionAssignmentProgressSummary(
                progressDisplay.snapshot,
                assignment,
              );
              const primaryAction =
                assignmentProgress.status === "completed"
                  ? {
                      href: buildGuidedCollectionAssignmentHref(
                        assignment.id,
                        assignmentShareAnchorIds.steps,
                      ),
                      label: t("guidedAssignments.actions.reviewAssignedSteps"),
                    }
                  : (assignmentProgress.nextStep?.primaryAction ?? {
                      href: assignment.launchStep.href,
                      label: t("guidedAssignments.actions.openLaunchStep"),
                    });
              const shareTarget = buildGuidedCollectionAssignmentShareTargets(
                assignment,
                locale,
              )[0];
              const updatedAtLabel = formatDate(assignment.updatedAt, locale);
              const lastActivityLabel = formatDate(assignmentProgress.lastActivityAt, locale);

              return (
                <article
                  key={assignment.id}
                  className="rounded-[24px] border border-line bg-paper-strong p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={[
                            "rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em]",
                            getGuidedAssignmentStatusTone(assignmentProgress.status),
                          ].join(" ")}
                        >
                          {getGuidedAssignmentStatusLabel(
                            assignmentProgress.status,
                            translate,
                          )}
                        </span>
                        <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-500">
                          {t("guidedAssignments.meta.steps", { count: assignment.steps.length })}
                        </span>
                        <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-500">
                          {t("guidedAssignments.meta.concepts", { count: assignment.conceptCount })}
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold text-ink-950">{assignment.title}</h3>
                      <p className="text-sm leading-6 text-ink-700">{assignment.summary}</p>
                    </div>
                    <ShareLinkButton
                      {...shareTarget}
                      className="inline-flex items-center rounded-full border border-line bg-paper px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-800 transition hover:border-ink-950/20 hover:bg-white"
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink-600">
                    <Link
                      href={assignment.collectionPath}
                      className="rounded-full border border-line bg-paper px-3 py-1 transition hover:border-ink-950/20 hover:bg-white hover:text-ink-950"
                    >
                      {assignment.collectionTitle}
                    </Link>
                    {updatedAtLabel ? (
                      <span className="rounded-full border border-line bg-paper px-3 py-1">
                        {t("guidedAssignments.meta.updated", { date: updatedAtLabel })}
                      </span>
                    ) : null}
                    {lastActivityLabel ? (
                      <span className="rounded-full border border-line bg-paper px-3 py-1">
                        {t("guidedAssignments.meta.lastActive", { date: lastActivityLabel })}
                      </span>
                    ) : null}
                  </div>

                  {assignment.teacherNote ? (
                    <div className="mt-4 rounded-[20px] border border-line bg-paper p-3">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-500">
                        {t("guidedAssignments.meta.instructorNote")}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-ink-700">
                        {assignment.teacherNote}
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-4 rounded-[20px] border border-line bg-paper p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ink-950">
                        {t("guidedAssignments.meta.learnerProgress")}
                      </p>
                      <p className="text-xs text-ink-600">
                        {t("guidedAssignments.meta.stepsComplete", {
                          completed: assignmentProgress.completedStepCount,
                          total: assignmentProgress.totalSteps,
                        })}
                      </p>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper-strong">
                      <div
                        className="h-full rounded-full bg-ink-950 transition-[width]"
                        style={{
                          width: `${
                            assignmentProgress.totalSteps
                              ? Math.round(
                                  (assignmentProgress.completedStepCount /
                                    assignmentProgress.totalSteps) *
                                    100,
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink-600">
                      <span className="rounded-full border border-line bg-paper-strong px-3 py-1">
                        {t("guidedAssignments.meta.coveredConceptsComplete", {
                          completed: assignmentProgress.completedConceptCount,
                          total: assignmentProgress.totalConcepts,
                        })}
                      </span>
                      <span className="rounded-full border border-line bg-paper-strong px-3 py-1">
                        {t("guidedAssignments.meta.launchStartsOn", {
                          title: assignment.launchStep.title,
                        })}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-ink-700">
                      {assignmentProgress.status === "completed"
                        ? t("guidedAssignments.notes.completed")
                        : assignmentProgress.nextStep
                          ? t("guidedAssignments.notes.nextStep", {
                              title: assignmentProgress.nextStep.step.title,
                              note: assignmentProgress.nextStep.note,
                            })
                          : t("guidedAssignments.notes.default")}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={primaryAction.href}
                      className="inline-flex items-center rounded-full bg-ink-950 px-4 py-2.5 text-sm font-semibold transition hover:opacity-90"
                      style={{ color: "var(--paper-strong)" }}
                    >
                      {primaryAction.label}
                    </Link>
                    <Link
                      href={buildGuidedCollectionAssignmentHref(assignment.id)}
                      className="inline-flex items-center rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
                    >
                      {t("guidedAssignments.actions.openAssignment")}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-5 rounded-[24px] border border-line bg-paper-strong p-4">
            <p className="text-sm font-semibold text-ink-950">
              {t("guidedAssignments.empty.title")}
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-700">
              {t("guidedAssignments.empty.description")}
            </p>
            <Link
              href="/guided"
              className="mt-4 inline-flex items-center rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
            >
              {t("guidedAssignments.actions.openGuidedCollections")}
            </Link>
          </div>
        )}
        </PageSection>

        {isPremium && initialCheckpointHistoryView ? (
          <PremiumCheckpointHistoryPanel
            view={initialCheckpointHistoryView}
            variant="dashboard"
          />
        ) : null}

        {isPremium ? (
          <SavedStudyPlansPreviewPanel
            plans={savedStudyPlans}
            snapshot={progressDisplay.snapshot}
          />
        ) : null}

        <PageSection
          id="dashboard-achievements"
          as="section"
          className="lab-panel p-5"
          aria-labelledby="dashboard-achievement-snapshot-heading"
        >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{t("achievementSnapshot.label")}</p>
            <h2
              id="dashboard-achievement-snapshot-heading"
              className="mt-2 text-2xl font-semibold text-ink-950"
            >
              {t("achievementSnapshot.title")}
            </h2>
          </div>
          <Link
            href="/account"
            className="inline-flex items-center rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
          >
            {t("achievementSnapshot.viewAll")}
          </Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {achievementSnapshot.milestoneCategories.length ? (
            achievementSnapshot.milestoneCategories.map((category) => (
              <AchievementSnapshotCard
                key={category.statKey}
                category={category}
                t={translate}
                locale={locale}
              />
            ))
          ) : (
            <div className="rounded-[22px] border border-line bg-paper-strong p-4 md:col-span-2 xl:col-span-5">
              <p className="text-sm font-semibold text-ink-950">
                {t("achievementSnapshot.empty.title")}
              </p>
              <p className="mt-2 text-sm leading-6 text-ink-700">
                {achievementsUnavailable
                  ? t("achievementSnapshot.empty.unavailable")
                  : t("achievementSnapshot.empty.default")}
              </p>
            </div>
          )}
        </div>
        </PageSection>

        <PageSection id="dashboard-continue-learning" as="div">
          <ContinueLearningSection concepts={concepts} />
        </PageSection>

        {isPremium ? (
          <PageSection id="dashboard-adaptive-review" as="div">
            <PremiumAdaptiveReviewPanel
              summary={premiumAdaptiveReview}
              variant="dashboard"
            />
          </PageSection>
        ) : null}

        {isPremium ? (
          <PageSection id="dashboard-review-queue" as="div">
            <ReviewQueueSection
              concepts={concepts}
              starterTracks={starterTracks}
              guidedCollections={guidedCollections}
              initialSyncedContinueLearningState={initialSyncedContinueLearningState}
              initialSyncedSnapshot={initialSyncedSnapshot}
            />
          </PageSection>
        ) : null}
      </div>
    </PageSectionFrame>
  );
}
