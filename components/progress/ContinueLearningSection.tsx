"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getConceptDisplayTitle } from "@/lib/i18n/content";
import { shouldUseGenericProgressCopy } from "@/lib/i18n/progress";
import { localizeShareHref } from "@/lib/share-links";
import type { ConceptSummary } from "@/lib/content";
import {
  getConceptResurfacingCue,
  selectContinueLearning,
  useProgressSnapshot,
  useProgressSnapshotReady,
} from "@/lib/progress";
import { ConceptLearningSurfaceTestCta } from "@/components/tests/ConceptLearningSurfaceTestCta";
import { LearningVisual } from "@/components/visuals/LearningVisual";
import { formatProgressMonthDay } from "./dateFormatting";
import { MasteryStateBadge } from "./MasteryStateBadge";
import { ProgressStatusBadge } from "./ProgressStatusBadge";

type ContinueLearningSectionProps = {
  concepts: ConceptSummary[];
  className?: string;
};

function getRecentActionLabel(
  status: "not-started" | "started" | "practiced" | "completed",
  t: ReturnType<typeof useTranslations<"ContinueLearningSection">>,
) {
  return status === "completed" ? t("actions.reviewConcept") : t("actions.continue");
}

export function ContinueLearningSection({
  concepts,
  className,
}: ContinueLearningSectionProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("ContinueLearningSection");
  const tProgress = useTranslations("ProgressCopy");
  const useGenericProgressCopy = shouldUseGenericProgressCopy(locale);
  const snapshot = useProgressSnapshot();
  const progressReady = useProgressSnapshotReady();
  const { primary, recent } = selectContinueLearning(snapshot, concepts, 3);
  const hasRecordedProgress = Boolean(primary || recent.length);
  const primaryResurfacingCue = primary ? getConceptResurfacingCue(primary) : null;
  const primaryLastActiveLabel = primary?.lastActivityAt
    ? formatProgressMonthDay(primary.lastActivityAt, "local", locale)
    : null;

  return (
    <section className={["space-y-3", className].filter(Boolean).join(" ")}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <p className="lab-label">{t("heading.label")}</p>
          <h2 className="text-xl font-semibold text-ink-950 sm:text-2xl">
            {t("heading.title")}
          </h2>
        </div>
        <p className="text-sm text-ink-600">{t("heading.badge")}</p>
      </div>

      {primary ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.92fr)]">
          <article className="lab-panel grid gap-4 p-5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-start">
            <Link
              href={localizeShareHref(`/concepts/${primary.concept.slug}`, locale)}
              aria-label={getConceptDisplayTitle(
                {
                  slug: primary.concept.slug,
                  title: primary.concept.title ?? primary.concept.slug,
                },
                locale,
              )}
              className="block rounded-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              <LearningVisual kind="progress" tone="teal" compact className="h-28 sm:min-h-28" />
            </Link>
            <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <ProgressStatusBadge status={primary.status} />
              <MasteryStateBadge state={primary.mastery.state} />
              {primaryResurfacingCue ? (
                <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                  {t("primary.revisit")}
                </span>
              ) : null}
              {primaryLastActiveLabel ? (
                <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-600">
                  {t("primary.lastActive", {
                    date: primaryLastActiveLabel,
                  })}
                </span>
              ) : null}
            </div>
            <h3 className="mt-4 text-2xl font-semibold text-ink-950">
              {getConceptDisplayTitle(
                {
                  slug: primary.concept.slug,
                  title: primary.concept.title ?? primary.concept.slug,
                },
                locale,
              )}
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-700">
              {t("primary.description")}{" "}
              {useGenericProgressCopy
                ? primaryResurfacingCue
                  ? tProgress("descriptions.recentReview")
                  : tProgress("descriptions.recentMomentum")
                : primaryResurfacingCue
                  ? primaryResurfacingCue.reason
                  : primary.mastery.note}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                href={localizeShareHref(`/concepts/${primary.concept.slug}`, locale)}
                data-testid={`continue-learning-primary-concept-cta-${primary.concept.slug}`}
                className="inline-flex items-center rounded-full bg-ink-950 px-5 py-2.5 text-sm font-semibold transition-transform hover:-translate-y-0.5"
                style={{ color: "var(--paper-strong)" }}
              >
                {t("actions.continueConcept")}
              </Link>
              <ConceptLearningSurfaceTestCta
                conceptSlug={primary.concept.slug}
                snapshot={snapshot}
                progressReady={progressReady}
                className="inline-flex items-center rounded-full border border-line bg-paper-strong px-5 py-2.5 text-sm font-semibold text-ink-800 transition hover:border-teal-500/35 hover:bg-white/90"
                testId={`continue-learning-test-cta-${primary.concept.slug}`}
              />
              <Link
                href={localizeShareHref("/concepts", locale)}
                className="inline-flex items-center rounded-full border border-line bg-paper-strong px-5 py-2.5 text-sm font-semibold text-ink-800 transition hover:border-teal-500/35 hover:bg-white/90"
              >
                {t("actions.browseLibrary")}
              </Link>
            </div>
            </div>
          </article>

            <div className="grid gap-3">
              {recent.length ? (
                recent.map((item) => {
                const resurfacingCue = getConceptResurfacingCue(item);

                return (
                  <article key={item.concept.slug} className="lab-panel-compact">
                    <div className="flex flex-wrap items-center gap-2">
                      <ProgressStatusBadge status={item.status} compact />
                      <MasteryStateBadge state={item.mastery.state} compact />
                      {resurfacingCue ? (
                        <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-amber-700">
                          {t("recent.revisit")}
                        </span>
                      ) : null}
                      {item.lastActivityAt ? (
                        <span className="text-xs text-ink-500">
                          {formatProgressMonthDay(item.lastActivityAt, "local", locale)}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-lg font-semibold text-ink-950">
                      {getConceptDisplayTitle(
                        {
                          slug: item.concept.slug,
                          title: item.concept.title ?? item.concept.slug,
                        },
                        locale,
                      )}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-ink-600">
                      {useGenericProgressCopy
                        ? resurfacingCue
                          ? tProgress("descriptions.recentReview")
                          : tProgress("descriptions.recentMomentum")
                        : resurfacingCue
                          ? resurfacingCue.reason
                          : item.mastery.note}
                    </p>
                    <Link
                      href={localizeShareHref(`/concepts/${item.concept.slug}`, locale)}
                      className="mt-3 inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2 text-sm font-semibold text-ink-800 transition hover:border-teal-500/35 hover:bg-white/90"
                    >
                      {getRecentActionLabel(item.status, t)}
                    </Link>
                    <ConceptLearningSurfaceTestCta
                      conceptSlug={item.concept.slug}
                      snapshot={snapshot}
                      progressReady={progressReady}
                      className="mt-3 inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2 text-sm font-semibold text-ink-800 transition hover:border-teal-500/35 hover:bg-white/90"
                      testId={`continue-learning-test-cta-${item.concept.slug}`}
                    />
                  </article>
                );
              })
            ) : (
              <article className="lab-panel-compact">
                <p className="lab-label">{t("recent.emptyLabel")}</p>
                <p className="mt-3 text-sm leading-6 text-ink-700">
                  {t("recent.emptyDescription")}
                </p>
              </article>
            )}
          </div>
        </div>
      ) : hasRecordedProgress ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.92fr)]">
          <article className="lab-panel grid gap-4 p-5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-start">
            <Link
              href={localizeShareHref("/concepts", locale)}
              aria-label={t("actions.browseLibrary")}
              className="block rounded-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              <LearningVisual kind="progress" tone="teal" compact className="h-28 sm:min-h-28" />
            </Link>
            <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <ProgressStatusBadge status="completed" />
              <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-600">
                {t("caughtUp.badge")}
              </span>
            </div>
            <h3 className="mt-4 text-2xl font-semibold text-ink-950">
              {t("caughtUp.title")}
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-700">
              {t("caughtUp.description")}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                href={localizeShareHref("/concepts", locale)}
                className="inline-flex items-center rounded-full bg-ink-950 px-5 py-2.5 text-sm font-semibold transition-transform hover:-translate-y-0.5"
                style={{ color: "var(--paper-strong)" }}
              >
                {t("actions.browseLibrary")}
              </Link>
            </div>
            </div>
          </article>

          <div className="grid gap-3">
            {recent.map((item) => {
              const resurfacingCue = getConceptResurfacingCue(item);

              return (
                <article key={item.concept.slug} className="lab-panel-compact">
                  <div className="flex flex-wrap items-center gap-2">
                    <ProgressStatusBadge status={item.status} compact />
                    <MasteryStateBadge state={item.mastery.state} compact />
                    {resurfacingCue ? (
                      <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-amber-700">
                        {t("recent.revisit")}
                      </span>
                    ) : null}
                    {item.lastActivityAt ? (
                      <span className="text-xs text-ink-500">
                        {formatProgressMonthDay(item.lastActivityAt, "local", locale)}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-lg font-semibold text-ink-950">
                    {getConceptDisplayTitle(
                      {
                        slug: item.concept.slug,
                        title: item.concept.title ?? item.concept.slug,
                      },
                      locale,
                    )}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink-600">
                    {useGenericProgressCopy
                      ? resurfacingCue
                        ? tProgress("descriptions.recentReview")
                        : tProgress("descriptions.recentMomentum")
                      : resurfacingCue
                        ? resurfacingCue.reason
                        : item.mastery.note}
                  </p>
                  <Link
                    href={localizeShareHref(`/concepts/${item.concept.slug}`, locale)}
                    className="mt-3 inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2 text-sm font-semibold text-ink-800 transition hover:border-teal-500/35 hover:bg-white/90"
                  >
                    {getRecentActionLabel(item.status, t)}
                  </Link>
                  <ConceptLearningSurfaceTestCta
                    conceptSlug={item.concept.slug}
                    snapshot={snapshot}
                    progressReady={progressReady}
                    className="mt-3 inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2 text-sm font-semibold text-ink-800 transition hover:border-teal-500/35 hover:bg-white/90"
                    testId={`continue-learning-test-cta-${item.concept.slug}`}
                  />
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="lab-panel grid gap-4 p-5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center">
          <Link
            href={localizeShareHref("/concepts", locale)}
            aria-label={t("empty.action")}
            className="block rounded-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            <LearningVisual kind="progress" tone="sky" compact className="h-24" />
          </Link>
          <div className="min-w-0">
          <p className="text-sm leading-6 text-ink-700">
            {t("empty.description")}
          </p>
          <Link
            href={localizeShareHref("/concepts", locale)}
            className="mt-4 inline-flex items-center rounded-full bg-ink-950 px-5 py-2.5 text-sm font-semibold transition-transform hover:-translate-y-0.5"
            style={{ color: "var(--paper-strong)" }}
          >
            {t("empty.action")}
          </Link>
          </div>
        </div>
      )}
    </section>
  );
}
