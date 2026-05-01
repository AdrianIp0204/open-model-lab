import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import {
  getLocalizedConceptMasteryNote,
  getLocalizedProgressSupportReason,
} from "@/lib/i18n/progress";
import type { PremiumLearningAnalytics } from "@/lib/progress";
import { PageSection } from "@/components/layout/PageSection";
import { PageSectionFrame } from "@/components/layout/PageSectionFrame";
import { PremiumAdaptiveReviewPanel } from "@/components/progress/PremiumAdaptiveReviewPanel";
import { PremiumCheckpointHistoryPanel } from "./PremiumCheckpointHistoryPanel";

type LearningAnalyticsPanelProps = {
  analytics: PremiumLearningAnalytics;
  syncedProgressUnavailable?: boolean;
  achievementsUnavailable?: boolean;
  leadIn?: ReactNode;
};

type ProgressTranslateFn = (key: string, values?: Record<string, unknown>) => string;

function localizeProgressNote(
  note: string,
  locale: AppLocale,
  tProgress: ProgressTranslateFn,
) {
  if (locale === "en") {
    return note;
  }

  const supportDescriptor = getLocalizedProgressSupportReason(note);

  if (supportDescriptor) {
    return tProgress(supportDescriptor.key, supportDescriptor.values);
  }

  const masteryDescriptor = getLocalizedConceptMasteryNote(note);

  if (masteryDescriptor) {
    return tProgress(masteryDescriptor.key, masteryDescriptor.values);
  }

  return note;
}

function getInsightStatusLabel(
  statusLabel: PremiumLearningAnalytics["strengths"][number]["statusLabel"],
  t: ReturnType<typeof useTranslations<"LearningAnalyticsPanel">>,
) {
  switch (statusLabel) {
    case "Strongest":
      return t("status.strongest");
    case "Building":
      return t("status.building");
    default:
      return t("status.needsWork");
  }
}

function MetricCard({
  label,
  value,
  note,
  locale,
  tProgress,
}: PremiumLearningAnalytics["usageSnapshot"]["achievementMetrics"][number] & {
  locale: AppLocale;
  tProgress: ProgressTranslateFn;
}) {
  return (
    <article className="rounded-[22px] border border-line bg-paper-strong p-4">
      <p className="text-lg font-semibold text-ink-950">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-ink-700">
        {localizeProgressNote(note, locale, tProgress)}
      </p>
    </article>
  );
}

function TopicInsightCard({
  insight,
  t,
  locale,
  tProgress,
}: {
  insight: PremiumLearningAnalytics["strengths"][number];
  t: ReturnType<typeof useTranslations<"LearningAnalyticsPanel">>;
  locale: AppLocale;
  tProgress: ProgressTranslateFn;
}) {
  const tone =
    insight.statusLabel === "Strongest"
      ? "border-teal-500/25 bg-teal-500/10 text-teal-700"
      : insight.statusLabel === "Needs work"
        ? "border-amber-500/25 bg-amber-500/10 text-amber-800"
        : "border-sky-500/25 bg-sky-500/10 text-sky-700";

  return (
    <article className="rounded-[22px] border border-line bg-paper-strong p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-lg font-semibold text-ink-950">{insight.title}</h3>
        <span
          className={[
            "rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em]",
            tone,
          ].join(" ")}
        >
          {getInsightStatusLabel(insight.statusLabel, t)}
        </span>
      </div>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-ink-700">
        {insight.reasons.map((reason) => (
          <li key={reason}>{localizeProgressNote(reason, locale, tProgress)}</li>
        ))}
      </ul>
      <Link
        href={insight.href}
        className="mt-4 inline-flex items-center rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
      >
        {t("actions.openTopic")}
      </Link>
    </article>
  );
}

function CoverageRow({
  item,
  t,
  locale,
  tProgress,
}: {
  item: PremiumLearningAnalytics["coverage"][number];
  t: ReturnType<typeof useTranslations<"LearningAnalyticsPanel">>;
  locale: AppLocale;
  tProgress: ProgressTranslateFn;
}) {
  return (
    <article className="rounded-[20px] border border-line bg-paper-strong px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink-950">{item.title}</h3>
          <p className="mt-1 text-sm leading-6 text-ink-700">{item.activityLabel}</p>
        </div>
        <Link
          href={`/concepts/topics/${item.topicSlug}`}
          className="inline-flex items-center rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-ink-700 transition hover:border-ink-950/20 hover:bg-white"
        >
          {t("actions.openTopic")}
        </Link>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80">
        <div
          className="h-full rounded-full bg-teal-500"
          style={{ width: `${Math.max(8, Math.round(item.progressRatio * 100))}%` }}
          aria-hidden="true"
        />
      </div>
      {item.detail ? (
        <p className="mt-2 text-xs leading-5 text-ink-600">
          {localizeProgressNote(item.detail, locale, tProgress)}
        </p>
      ) : null}
    </article>
  );
}

function EmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[22px] border border-line bg-paper-strong p-4">
      <p className="text-sm font-semibold text-ink-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-ink-700">{body}</p>
    </div>
  );
}

export function LearningAnalyticsPanel({
  analytics,
  syncedProgressUnavailable = false,
  achievementsUnavailable = false,
  leadIn = null,
}: LearningAnalyticsPanelProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("LearningAnalyticsPanel");
  const tProgress = useTranslations("ProgressCopy") as unknown as ProgressTranslateFn;
  const sectionNavItems = [
    { id: "analytics-overview", label: t("sectionNav.overview.label"), compactLabel: t("sectionNav.overview.compact") },
    { id: "analytics-usage", label: t("sectionNav.usage.label"), compactLabel: t("sectionNav.usage.compact") },
    { id: "checkpoint-history", label: t("sectionNav.history.label"), compactLabel: t("sectionNav.history.compact") },
    { id: "analytics-strengths", label: t("sectionNav.strengths.label"), compactLabel: t("sectionNav.strengths.compact") },
    { id: "analytics-needs-work", label: t("sectionNav.needsWork.label"), compactLabel: t("sectionNav.needsWork.compact") },
    { id: "analytics-adaptive-review", label: t("sectionNav.review.label"), compactLabel: t("sectionNav.review.compact") },
    { id: "analytics-next-steps", label: t("sectionNav.nextSteps.label"), compactLabel: t("sectionNav.nextSteps.compact") },
    { id: "analytics-coverage", label: t("sectionNav.coverage.label"), compactLabel: t("sectionNav.coverage.compact") },
    { id: "analytics-methodology", label: t("sectionNav.methodology.label"), compactLabel: t("sectionNav.methodology.compact") },
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
      <section className="space-y-6">
        <PageSection id="analytics-overview" as="section" className="lab-panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="lab-label">{t("overview.label")}</p>
              <h2 className="mt-2 text-3xl font-semibold text-ink-950">
                {t("overview.title")}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-teal-500/25 bg-teal-500/10 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-teal-700">
                {t("overview.badges.premium")}
              </span>
              <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-600">
                {t("overview.badges.ruleBased")}
              </span>
              <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-600">
                {t("overview.badges.savedProgressOnly")}
              </span>
            </div>
          </div>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-ink-700">
            {t("overview.description")}
          </p>
          {syncedProgressUnavailable ? (
            <div className="mt-4 rounded-[22px] border border-amber-500/25 bg-amber-500/10 p-4">
              <p className="text-sm font-semibold text-ink-950">
                {t("warnings.syncedProgress.title")}
              </p>
              <p className="mt-2 text-sm leading-6 text-ink-700">
                {t("warnings.syncedProgress.body")}
              </p>
            </div>
          ) : null}
          {achievementsUnavailable ? (
            <div className="mt-4 rounded-[22px] border border-amber-500/25 bg-amber-500/10 p-4">
              <p className="text-sm font-semibold text-ink-950">
                {t("warnings.achievements.title")}
              </p>
              <p className="mt-2 text-sm leading-6 text-ink-700">
                {t("warnings.achievements.body")}
              </p>
            </div>
          ) : null}
        </PageSection>

        <PageSection
          id="analytics-usage"
          as="section"
          className="lab-panel p-5"
          aria-labelledby="analytics-usage-heading"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="lab-label">{t("usage.label")}</p>
              <h2 id="analytics-usage-heading" className="mt-2 text-2xl font-semibold text-ink-950">
                {t("usage.title")}
              </h2>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
            >
              {t("actions.backToDashboard")}
            </Link>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {analytics.usageSnapshot.achievementMetrics.map((metric) => (
              <MetricCard
                key={metric.label}
                {...metric}
                locale={locale}
                tProgress={tProgress}
              />
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {analytics.usageSnapshot.progressMetrics.map((metric) => (
              <MetricCard
                key={metric.label}
                {...metric}
                locale={locale}
                tProgress={tProgress}
              />
            ))}
          </div>
        </PageSection>

        <PremiumCheckpointHistoryPanel view={analytics.checkpointHistory} />

        <section className="grid gap-4 xl:grid-cols-2">
          <PageSection
            id="analytics-strengths"
            as="section"
            className="lab-panel p-5"
            aria-labelledby="analytics-strengths-heading"
          >
            <p className="lab-label">{t("strengths.label")}</p>
            <h2 id="analytics-strengths-heading" className="mt-2 text-2xl font-semibold text-ink-950">
              {t("strengths.title")}
            </h2>
            <div className="mt-4 grid gap-3">
              {analytics.strengths.length ? (
                analytics.strengths.map((insight) => (
                  <TopicInsightCard
                    key={insight.topicSlug}
                    insight={insight}
                    t={t}
                    locale={locale}
                    tProgress={tProgress}
                  />
                ))
              ) : (
                <EmptyState
                  title={t("strengths.empty.title")}
                  body={
                    analytics.hasRecordedProgress
                      ? t("strengths.empty.bodyWithProgress")
                      : t("strengths.empty.bodyWithoutProgress")
                  }
                />
              )}
            </div>
          </PageSection>

          <PageSection
            id="analytics-needs-work"
            as="section"
            className="lab-panel p-5"
            aria-labelledby="analytics-needs-work-heading"
          >
            <p className="lab-label">{t("needsWork.label")}</p>
            <h2 id="analytics-needs-work-heading" className="mt-2 text-2xl font-semibold text-ink-950">
              {t("needsWork.title")}
            </h2>
            <div className="mt-4 grid gap-3">
              {analytics.needsWork.length ? (
                analytics.needsWork.map((insight) => (
                  <TopicInsightCard
                    key={insight.topicSlug}
                    insight={insight}
                    t={t}
                    locale={locale}
                    tProgress={tProgress}
                  />
                ))
              ) : (
                <EmptyState
                  title={t("needsWork.empty.title")}
                  body={
                    analytics.hasRecordedProgress
                      ? t("needsWork.empty.bodyWithProgress")
                      : t("needsWork.empty.bodyWithoutProgress")
                  }
                />
              )}
            </div>
          </PageSection>
        </section>

        <PageSection id="analytics-adaptive-review" as="div">
          <PremiumAdaptiveReviewPanel summary={analytics.adaptiveReview} />
        </PageSection>

        <PageSection
          id="analytics-next-steps"
          as="section"
          className="lab-panel p-5"
          aria-labelledby="analytics-next-steps-heading"
        >
          <p className="lab-label">{t("nextSteps.label")}</p>
          <h2 id="analytics-next-steps-heading" className="mt-2 text-2xl font-semibold text-ink-950">
            {t("nextSteps.title")}
          </h2>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {analytics.nextSteps.map((step) => (
              <article key={step.id} className="rounded-[22px] border border-line bg-paper-strong p-4">
                <h3 className="text-lg font-semibold text-ink-950">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-700">
                  {localizeProgressNote(step.why, locale, tProgress)}
                </p>
                <Link
                  href={step.href}
                  className="mt-4 inline-flex items-center rounded-full bg-ink-950 px-4 py-2 text-sm font-semibold transition hover:opacity-90"
                  style={{ color: "var(--paper-strong)" }}
                >
                  {step.actionLabel}
                </Link>
              </article>
            ))}
          </div>
        </PageSection>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)]">
          <PageSection
            id="analytics-coverage"
            as="section"
            className="lab-panel p-5"
            aria-labelledby="analytics-coverage-heading"
          >
            <p className="lab-label">{t("coverage.label")}</p>
            <h2 id="analytics-coverage-heading" className="mt-2 text-2xl font-semibold text-ink-950">
              {t("coverage.title")}
            </h2>
            <div className="mt-4 grid gap-3">
              {analytics.coverage.length ? (
                analytics.coverage.map((item) => (
                  <CoverageRow
                    key={item.topicSlug}
                    item={item}
                    t={t}
                    locale={locale}
                    tProgress={tProgress}
                  />
                ))
              ) : (
                <EmptyState
                  title={t("coverage.empty.title")}
                  body={t("coverage.empty.body")}
                />
              )}
            </div>
          </PageSection>

          <PageSection
            id="analytics-methodology"
            as="section"
            className="lab-panel p-5"
            aria-labelledby="analytics-methodology-heading"
          >
            <p className="lab-label">{t("methodology.label")}</p>
            <h2 id="analytics-methodology-heading" className="mt-2 text-2xl font-semibold text-ink-950">
              {t("methodology.title")}
            </h2>
            <p className="mt-3 text-sm leading-6 text-ink-700">{analytics.methodologyNote}</p>
            <p className="mt-3 text-sm leading-6 text-ink-700">
              {t("methodology.strengthsAndPressure")}
            </p>
            <p className="mt-3 text-sm leading-6 text-ink-700">
              {t("methodology.sharedSignals")}
            </p>
          </PageSection>
        </section>
      </section>
    </PageSectionFrame>
  );
}
