"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import {
  getStarterTrackDisplayHighlights,
  getStarterTrackDisplaySummary,
  getStarterTrackDisplayTitle,
} from "@/lib/i18n/content";
import type { StarterTrackRecommendationSummary } from "@/lib/progress";
import { LearningVisual } from "@/components/visuals/LearningVisual";
import { getStarterTrackVisualDescriptor } from "@/components/visuals/learningVisualDescriptors";

type StarterTrackRecommendationListProps = {
  recommendations: StarterTrackRecommendationSummary[];
  variant?: "default" | "track-details";
};

const accentTopClasses: Record<StarterTrackRecommendationSummary["track"]["accent"], string> = {
  teal: "from-teal-500/65 via-teal-500/20 to-transparent",
  amber: "from-amber-500/65 via-amber-500/20 to-transparent",
  coral: "from-coral-500/65 via-coral-500/20 to-transparent",
  sky: "from-sky-500/65 via-sky-500/20 to-transparent",
  ink: "from-ink-950/65 via-ink-950/20 to-transparent",
};

function getTrackStatusKey(status: StarterTrackRecommendationSummary["progress"]["status"]) {
  if (status === "completed") {
    return "status.completed";
  }

  if (status === "in-progress") {
    return "status.inProgress";
  }

  return "status.notStarted";
}

export function StarterTrackRecommendationList({
  recommendations,
  variant = "default",
}: StarterTrackRecommendationListProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("StarterTrackRecommendationList");

  if (!recommendations.length) {
    return null;
  }

  return (
    <div className="grid gap-3 xl:grid-cols-2">
      {recommendations.map((recommendation) => {
        const displayHighlights = getStarterTrackDisplayHighlights(
          recommendation.track,
          locale,
        );
        const visual = getStarterTrackVisualDescriptor(recommendation.track);
        const showTrackShortcut = recommendation.href !== `/tracks/${recommendation.track.slug}`;

        return (
        <article
          key={`${recommendation.relationshipLabel}-${recommendation.track.slug}`}
          className={[
            "relative overflow-hidden rounded-[24px] border border-line bg-paper p-4",
            variant === "track-details" ? "shadow-surface" : "",
          ].join(" ")}
        >
          <div
            className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accentTopClasses[recommendation.track.accent]}`}
          />

          <div className="grid gap-4 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:items-start">
            <Link
              href={recommendation.href}
              aria-label={getStarterTrackDisplayTitle(recommendation.track, locale)}
              data-testid={`starter-track-recommendation-visual-${recommendation.track.slug}`}
              className="block rounded-[18px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              <LearningVisual
                kind={visual.kind}
                motif={visual.motif}
                overlay={visual.overlay}
                isFallback={visual.isFallback}
                fallbackKind={visual.fallbackKind}
                tone={visual.tone ?? recommendation.track.accent}
                compact
                className="h-20 rounded-[18px] sm:h-24"
              />
            </Link>

            <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="lab-label">{t("label")}</span>
              <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                {t(getTrackStatusKey(recommendation.progress.status))}
              </span>
              <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                {t("moments", {
                  completed: recommendation.progress.completedFlowCount,
                  total: recommendation.progress.totalFlowCount,
                })}
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-ink-950">
                {getStarterTrackDisplayTitle(recommendation.track, locale)}
              </h3>
              <p className="line-clamp-2 text-sm leading-6 text-ink-700">
                {getStarterTrackDisplaySummary(recommendation.track, locale) ?? t("fallbackNote")}
              </p>
            </div>

            {variant === "default" ? (
              <div className="flex flex-wrap gap-2">
                {displayHighlights.slice(0, 2).map((item) => (
                  <span
                    key={`${recommendation.track.slug}-${item}`}
                    className="rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-700"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-ink-600">{recommendation.note}</p>
            )}

            <div className={variant === "track-details" ? "space-y-2" : "flex flex-wrap gap-3"}>
              <Link
                href={recommendation.href}
                className="inline-flex items-center rounded-full bg-ink-950 px-4 py-2.5 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5"
                style={{ color: "var(--paper-strong)" }}
              >
                {t("actions.openRecommendation")}
              </Link>
              {showTrackShortcut ? (
                <Link
                  href={`/tracks/${recommendation.track.slug}`}
                  className={
                    variant === "track-details"
                      ? "motion-link inline-flex text-sm font-semibold text-ink-700 underline underline-offset-4 transition-colors hover:text-ink-950"
                      : "inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-950 transition-colors hover:border-ink-950/20"
                  }
                >
                  {t("actions.openTrack")}
                </Link>
              ) : null}
            </div>
            </div>
          </div>
        </article>
        );
      })}
    </div>
  );
}
