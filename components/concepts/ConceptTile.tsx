"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ConceptSummary } from "./concept-catalog";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import {
  getConceptDisplayHighlights,
  getConceptDisplaySubtopic,
  getConceptDisplayShortTitle,
  getConceptDisplaySummary,
  getConceptDisplayTitle,
  getSubjectDisplayTitleFromValue,
} from "@/lib/i18n/content";
import {
  useConceptProgressSummary,
  type ConceptProgressSummary,
} from "@/lib/progress";
import { ProgressStatusBadge } from "@/components/progress/ProgressStatusBadge";
import { formatProgressMonthDay } from "@/components/progress/dateFormatting";
import { LearningVisual } from "@/components/visuals/LearningVisual";
import { getConceptVisualDescriptor } from "@/components/visuals/learningVisualDescriptors";

type ConceptTrackMembership = {
  trackSlug: string;
  trackTitle: string;
  stepIndex: number;
  totalSteps: number;
};

type ConceptTileCue = {
  label: string;
  note?: string;
  tone?: "teal" | "amber" | "coral" | "sky";
};

type ConceptTileProps = {
  concept: ConceptSummary;
  layout?: "feature" | "list";
  trackMemberships?: ConceptTrackMembership[];
  libraryCue?: ConceptTileCue | null;
  progressSummary?: ConceptProgressSummary | null;
  progressSource?: "local" | "synced";
};

const accentClasses: Record<ConceptSummary["accent"], string> = {
  teal: "from-teal-500/20 via-teal-500/8 to-transparent border-teal-500/20",
  amber: "from-amber-500/20 via-amber-500/8 to-transparent border-amber-500/20",
  coral: "from-coral-500/20 via-coral-500/8 to-transparent border-coral-500/20",
  sky: "from-sky-500/20 via-sky-500/8 to-transparent border-sky-500/20",
  ink: "from-ink-950/18 via-ink-950/8 to-transparent border-ink-950/20",
};

export function ConceptTile({
  concept,
  layout = "feature",
  libraryCue = null,
  progressSummary = null,
  progressSource = "local",
}: ConceptTileProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("ConceptTile");
  const isFeature = layout === "feature";
  const displayTitle = getConceptDisplayTitle(concept, locale);
  const displayShortTitle = getConceptDisplayShortTitle(concept, locale);
  const displaySummary = getConceptDisplaySummary(concept, locale);
  const displayHighlights = getConceptDisplayHighlights(concept, locale);
  const displaySubtopic = getConceptDisplaySubtopic(concept, locale);
  const displaySubject = getSubjectDisplayTitleFromValue(concept.subject, locale);
  const conceptHref = `/concepts/${concept.slug}`;
  const localProgressSummary = useConceptProgressSummary({
    id: concept.id,
    slug: concept.slug,
    title: concept.title,
  });
  const progress = progressSummary ?? localProgressSummary;
  const visual = getConceptVisualDescriptor(concept);

  const lastActiveLabel = formatProgressMonthDay(
    progress.lastActivityAt,
    progressSummary ? progressSource : "local",
    locale,
  );
  const discoveryNote = concept.heroConcept
    ? t("notes.goodFirstConcept")
    : isFeature
      ? t("notes.openConcept")
      : null;
  const libraryCueClasses =
    libraryCue?.tone === "teal"
      ? "border-teal-500/25 bg-teal-500/10 text-teal-700"
      : libraryCue?.tone === "amber"
        ? "border-amber-500/25 bg-amber-500/10 text-amber-700"
        : libraryCue?.tone === "coral"
          ? "border-coral-500/25 bg-coral-500/10 text-coral-700"
          : "border-sky-500/25 bg-sky-500/10 text-sky-700";
  const localizedCompactProgressNote =
    !isFeature && progress.status !== "not-started"
      ? [
          progress.status === "completed"
            ? t("progress.completed")
            : t("progress.inProgress"),
          lastActiveLabel,
        ]
          .filter((value): value is string => Boolean(value))
          .join(" · ") + "."
      : null;
  const showStatusBadge = !libraryCue && progress.status !== "not-started";
  const showGoodFirstBadge = isFeature && concept.heroConcept && !libraryCue;

  return (
    <Link
      href={conceptHref}
      className="block rounded-[26px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
    >
      <article
        className={[
          "motion-enter motion-card relative overflow-hidden",
          isFeature ? "feature-card" : "list-row-card",
        ].join(" ")}
      >
        <span className="sr-only">{t("actions.openConcept", { title: displayShortTitle })}</span>
        <div
          className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accentClasses[concept.accent]}`}
        />
        <div className={isFeature ? "grid gap-4" : "grid gap-3 sm:grid-cols-[6.5rem_minmax(0,1fr)] sm:items-start"}>
          <LearningVisual
            kind={visual.kind}
            motif={visual.motif}
            isFallback={visual.isFallback}
            tone={visual.tone ?? concept.accent}
            compact
            className={isFeature ? "h-28" : "h-24 sm:h-full sm:min-h-28"}
          />
          <div className={`min-w-0 flex-1 ${isFeature ? "space-y-3.5" : "space-y-3"}`}>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="lab-label">{displaySubject}</span>
                {showGoodFirstBadge ? (
                  <span className="rounded-full border border-teal-500/25 bg-teal-500/10 px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-teal-700">
                    {t("badges.goodFirstConcept")}
                  </span>
                ) : null}
                {libraryCue ? (
                  <span
                    className={[
                      "motion-chip rounded-full border px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em]",
                      libraryCueClasses,
                    ].join(" ")}
                  >
                    {libraryCue.label}
                  </span>
                ) : null}
                {showStatusBadge ? <ProgressStatusBadge status={progress.status} compact /> : null}
              </div>
              <h3
                className={
                  isFeature
                    ? "text-2xl font-semibold text-ink-950"
                    : "text-xl font-semibold text-ink-950"
                }
              >
                {displayTitle}
              </h3>
              <p
                className={[
                  "line-clamp-2 text-sm text-ink-700",
                  isFeature ? "max-w-xl leading-6" : "leading-6",
                ].join(" ")}
              >
                {displaySummary}
              </p>
              {displaySubtopic && isFeature ? <p className="section-kicker">{displaySubtopic}</p> : null}
              {libraryCue?.note ? (
                <p className="text-base leading-7 text-ink-600">{libraryCue.note}</p>
              ) : null}
              {localizedCompactProgressNote ? (
                <p className="text-sm leading-6 text-ink-600">
                  {localizedCompactProgressNote}
                </p>
              ) : null}
            </div>

            {isFeature ? (
              <div className="flex flex-wrap gap-2">
                {displayHighlights.slice(0, 1).map((item) => (
                  <span
                    key={item}
                    className="motion-chip rounded-full border border-line bg-paper px-3 py-1 text-sm text-ink-700"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : null}

            <div
              className={[
                "flex gap-2.5",
                discoveryNote
                  ? "flex-col sm:flex-row sm:items-center sm:justify-between"
                  : "justify-end",
              ].join(" ")}
            >
              {discoveryNote ? (
                <p className="text-sm leading-6 text-ink-500">{discoveryNote}</p>
              ) : null}
              <span aria-hidden="true" className="cta-primary shrink-0">
                {t("actions.openConcept", { title: displayShortTitle })}
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
