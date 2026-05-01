"use client";

import { useLocale, useTranslations } from "next-intl";
import type { GuidedCollectionSummary } from "@/lib/content";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import {
  getGuidedCollectionDisplayHighlights,
  getGuidedCollectionDisplaySummary,
  getGuidedCollectionDisplayTitle,
} from "@/lib/i18n/content";
import { guidedCollectionShareAnchorIds } from "@/lib/share-links";
import { LearningVisual } from "@/components/visuals/LearningVisual";

type GuidedCollectionCardProps = {
  collection: GuidedCollectionSummary;
  variant?: "default" | "compact" | "guided-hub";
  statusNote?: string | null;
};

const accentTopClasses: Record<GuidedCollectionSummary["accent"], string> = {
  teal: "from-teal-500/65 via-teal-500/18 to-transparent",
  amber: "from-amber-500/65 via-amber-500/18 to-transparent",
  coral: "from-coral-500/65 via-coral-500/18 to-transparent",
  sky: "from-sky-500/65 via-sky-500/18 to-transparent",
  ink: "from-ink-950/55 via-ink-950/14 to-transparent",
};

const accentPanelClasses: Record<GuidedCollectionSummary["accent"], string> = {
  teal: "border-teal-500/20 bg-teal-500/10",
  amber: "border-amber-500/20 bg-amber-500/10",
  coral: "border-coral-500/20 bg-coral-500/10",
  sky: "border-sky-500/20 bg-sky-500/10",
  ink: "border-ink-950/15 bg-ink-950/5",
};

export function GuidedCollectionCard({
  collection,
  variant = "default",
  statusNote = null,
}: GuidedCollectionCardProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("GuidedCollectionCard");
  const compact = variant === "compact";
  const guidedHub = variant === "guided-hub";
  const displayTitle = getGuidedCollectionDisplayTitle(collection, locale);
  const displaySummary = getGuidedCollectionDisplaySummary(collection, locale);
  const displayHighlights = getGuidedCollectionDisplayHighlights(collection, locale);
  const visibleHighlights = displayHighlights.slice(0, compact ? 2 : displayHighlights.length);
  const compactMeta = [
    t("meta.steps", { count: collection.steps.length }),
    t("meta.concepts", { count: collection.conceptCount }),
  ];

  if (guidedHub) {
    return (
      <article className="motion-enter motion-card list-row-card relative overflow-hidden p-5">
        <div
          className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accentTopClasses[collection.accent]}`}
        />

        <div className="grid gap-4 lg:grid-cols-[7rem_minmax(0,1fr)_auto] lg:items-start">
          <LearningVisual kind="guided" tone={collection.accent} compact className="h-24 lg:h-full" />
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="lab-label">{t(`formats.${collection.format}`)}</span>
              {compactMeta.map((item) => (
                <span key={item} className="progress-pill text-sm">
                  {item}
                </span>
              ))}
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-ink-950">{displayTitle}</h3>
              <p className="text-sm leading-6 text-ink-700">{displaySummary}</p>
              <p className="text-sm leading-6 text-ink-600">
                {statusNote ?? t("compact.sequenceNote", { count: collection.conceptCount })}
              </p>
            </div>
          </div>

          <div className="shrink-0 lg:justify-self-end">
            <Link href={collection.path} className="cta-primary">
              {t("actions.openFormat", { format: t(`formats.${collection.format}`).toLowerCase() })}
            </Link>
          </div>
        </div>
      </article>
    );
  }

  if (compact) {
    return (
      <article className="motion-enter motion-card lab-panel relative overflow-hidden p-4">
        <div
          className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accentTopClasses[collection.accent]}`}
        />

        <div className="grid gap-3 sm:grid-cols-[6.5rem_minmax(0,1fr)] sm:items-start">
          <LearningVisual kind="guided" tone={collection.accent} compact className="h-24 sm:h-full" />
          <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="lab-label">{t(`formats.${collection.format}`)}</span>
            {compactMeta.map((item) => (
              <span
                key={item}
                className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500"
              >
                {item}
              </span>
            ))}
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-ink-950 sm:text-xl">
              <Link
                href={collection.path}
                className="motion-link transition-colors hover:text-teal-700"
              >
                {displayTitle}
              </Link>
            </h3>
            <p className="text-sm leading-6 text-ink-700">{displaySummary}</p>
            <p className="text-sm leading-5.5 text-ink-600">
              {t("compact.sequenceNote", { count: collection.conceptCount })}
            </p>
          </div>

          <div>
            <Link
              href={collection.path}
              className="motion-button-solid inline-flex items-center justify-center rounded-full bg-ink-950 px-4 py-2.5 text-sm font-semibold"
              style={{ color: "var(--paper-strong)" }}
            >
              {t("actions.openFormat", { format: t(`formats.${collection.format}`).toLowerCase() })}
            </Link>
          </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className="motion-enter motion-card lab-panel relative overflow-hidden p-5 sm:p-6"
    >
      <div
        className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accentTopClasses[collection.accent]}`}
      />

      <div className={compact ? "space-y-3.5" : "space-y-5"}>
        <LearningVisual kind="guided" tone={collection.accent} compact={!compact} />
        <div className="flex flex-wrap items-center gap-2">
          <span className="lab-label">{t(`formats.${collection.format}`)}</span>
          <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
            {t("meta.steps", { count: collection.steps.length })}
          </span>
          <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
            {t("meta.concepts", { count: collection.conceptCount })}
          </span>
          <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
            {t("meta.minutes", { count: collection.estimatedStudyMinutes })}
          </span>
        </div>

        <div className="space-y-2">
          <h3 className={compact ? "text-lg font-semibold text-ink-950 sm:text-xl" : "text-2xl font-semibold text-ink-950"}>
            <Link
              href={collection.path}
              className="motion-link transition-colors hover:text-teal-700"
            >
              {displayTitle}
            </Link>
          </h3>
          <p className="text-sm leading-5.5 text-ink-700 sm:leading-6">{displaySummary}</p>
        </div>

        <div className={`rounded-[24px] border ${compact ? "p-3.5" : "p-4"} ${accentPanelClasses[collection.accent]}`}>
          <p className="text-sm font-semibold text-ink-950">{t("sections.collectionShape")}</p>
          <p className="mt-2 text-sm leading-5.5 text-ink-700 sm:leading-6">
            {t("sections.collectionShapeDescription", {
              trackCount: collection.trackCount,
              challengeCount: collection.challengeStepCount,
              surfaceCount: collection.surfaceStepCount,
            })}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {visibleHighlights.map((item) => (
            <span
              key={item}
              className="motion-chip rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-700"
            >
              {item}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={collection.path}
            className="motion-button-solid inline-flex items-center justify-center rounded-full bg-ink-950 px-4 py-2.5 text-sm font-semibold"
            style={{ color: "var(--paper-strong)" }}
          >
            {t("actions.openFormat", { format: t(`formats.${collection.format}`).toLowerCase() })}
          </Link>
          <Link
            href={`${collection.path}#${guidedCollectionShareAnchorIds.bundle}`}
            className="motion-button-outline inline-flex items-center justify-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-900 hover:border-ink-950/20 hover:bg-white"
          >
            {t("actions.buildBundle")}
          </Link>
        </div>
      </div>
    </article>
  );
}
