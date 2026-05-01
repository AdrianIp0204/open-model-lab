"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ExpandedSubjectSpotlight } from "@/lib/content";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import {
  getConceptDisplayShortTitle,
  getGoalPathDisplayTitle,
  getGuidedCollectionDisplayTitle,
  getStarterTrackDisplayTitle,
  getSubjectDisplayDescription,
  getSubjectDisplayIntroduction,
  getSubjectDisplayTitle,
  getTopicDisplayTitle,
} from "@/lib/i18n/content";

type ExpandedSubjectSpotlightGridProps = {
  spotlights: ExpandedSubjectSpotlight[];
  variant?: "default" | "compact";
};

const accentTopClasses: Record<
  ExpandedSubjectSpotlight["subject"]["accent"],
  string
> = {
  teal: "from-teal-500/60 via-teal-500/14 to-transparent",
  amber: "from-amber-500/60 via-amber-500/14 to-transparent",
  coral: "from-coral-500/60 via-coral-500/14 to-transparent",
  sky: "from-sky-500/60 via-sky-500/14 to-transparent",
  ink: "from-ink-950/45 via-ink-950/10 to-transparent",
};

const accentPanelClasses: Record<
  ExpandedSubjectSpotlight["subject"]["accent"],
  string
> = {
  teal: "border-teal-500/20 bg-teal-500/10",
  amber: "border-amber-500/20 bg-amber-500/10",
  coral: "border-coral-500/20 bg-coral-500/10",
  sky: "border-sky-500/20 bg-sky-500/10",
  ink: "border-ink-950/15 bg-ink-950/5",
};

function getCollectionLabel(
  spotlight: ExpandedSubjectSpotlight,
  t: ReturnType<typeof useTranslations<"ExpandedSubjectSpotlight">>,
) {
  if (!spotlight.guidedCollection) {
    return null;
  }

  return spotlight.guidedCollection.format === "lesson-set"
    ? t("labels.lessonSet")
    : t("labels.playlist");
}

function SpotlightLinkTile({
  label,
  title,
  href,
}: {
  label: string;
  title: string;
  href: string;
}) {
  return (
    <div className="rounded-[20px] border border-line bg-paper-strong p-3">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
        {label}
      </p>
      <Link
        href={href}
        className="motion-link mt-2 block text-sm font-semibold text-ink-950 transition-colors hover:text-teal-700"
      >
        {title}
      </Link>
    </div>
  );
}

export function ExpandedSubjectSpotlightGrid({
  spotlights,
  variant = "default",
}: ExpandedSubjectSpotlightGridProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("ExpandedSubjectSpotlight");

  if (!spotlights.length) {
    return null;
  }

  const compact = variant === "compact";

  return (
    <div
      className={`grid gap-4 ${compact ? "xl:grid-cols-3" : "xl:grid-cols-3"}`}
    >
      {spotlights.map((spotlight) => {
        const collectionLabel = getCollectionLabel(spotlight, t);
        const subjectTitle = getSubjectDisplayTitle(spotlight.subject, locale);
        const subjectDescription = getSubjectDisplayDescription(spotlight.subject, locale);
        const subjectIntro = getSubjectDisplayIntroduction(spotlight.subject, locale);
        const featuredTopicTitle = spotlight.featuredTopic
          ? getTopicDisplayTitle(spotlight.featuredTopic, locale)
          : null;
        const starterTrackTitle = spotlight.starterTrack
          ? getStarterTrackDisplayTitle(spotlight.starterTrack, locale)
          : null;
        const collectionTitle = spotlight.guidedCollection
          ? getGuidedCollectionDisplayTitle(spotlight.guidedCollection, locale)
          : null;
        const goalPathTitle = spotlight.goalPath
          ? getGoalPathDisplayTitle(spotlight.goalPath, locale)
          : null;
        const featuredConceptTitle = spotlight.featuredConcept
          ? getConceptDisplayShortTitle(spotlight.featuredConcept, locale)
          : null;

        return (
          <article
            key={spotlight.subject.slug}
            className={`motion-enter motion-card lab-panel relative overflow-hidden ${
              compact ? "p-4" : "p-5"
            }`}
          >
            <div
              className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accentTopClasses[spotlight.subject.accent]}`}
            />
            <div className={compact ? "space-y-3.5" : "space-y-4"}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="lab-label">{t("labels.newerSubjectBranch")}</span>
                <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                  {t("meta.topics", { count: spotlight.subject.topicCount })}
                </span>
                <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                  {t("meta.starterTracks", {
                    count: spotlight.subject.starterTrackCount,
                  })}
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-[1.45rem] font-semibold text-ink-950">
                  {subjectTitle}
                </h3>
                <p className="text-sm leading-6 text-ink-700">
                  {subjectDescription}
                </p>
              </div>

              <div
                className={`rounded-[24px] border p-4 ${accentPanelClasses[spotlight.subject.accent]}`}
              >
                <p className="text-sm font-semibold text-ink-950">
                  {t("sections.fastestHonestRoute")}
                </p>
                <p className="mt-2 text-sm leading-6 text-ink-700">
                  {spotlight.starterTrack
                    ? t("sections.fastestHonestRouteWithTrack", {
                        title: starterTrackTitle ?? spotlight.starterTrack.title,
                      })
                    : subjectIntro}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {spotlight.featuredTopic ? (
                  <SpotlightLinkTile
                    label={t("labels.topic")}
                    title={featuredTopicTitle ?? spotlight.featuredTopic.title}
                    href={`/concepts/topics/${spotlight.featuredTopic.slug}`}
                  />
                ) : null}
                {spotlight.starterTrack ? (
                  <SpotlightLinkTile
                    label={t("labels.starterTrack")}
                    title={starterTrackTitle ?? spotlight.starterTrack.title}
                    href={`/tracks/${spotlight.starterTrack.slug}`}
                  />
                ) : null}
                {spotlight.guidedCollection ? (
                  <SpotlightLinkTile
                    label={collectionLabel ?? t("labels.guidedCollection")}
                    title={collectionTitle ?? spotlight.guidedCollection.title}
                    href={spotlight.guidedCollection.path}
                  />
                ) : null}
                {spotlight.goalPath ? (
                  <SpotlightLinkTile
                    label={t("labels.goalPath")}
                    title={goalPathTitle ?? spotlight.goalPath.title}
                    href={spotlight.goalPath.path}
                  />
                ) : null}
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={spotlight.subject.path}
                  className="motion-button-solid inline-flex items-center rounded-full bg-ink-950 px-4 py-2.5 text-sm font-semibold"
                  style={{ color: "var(--paper-strong)" }}
                >
                  {t("actions.openSubject", { title: subjectTitle })}
                </Link>
                {spotlight.starterTrack ? (
                  <Link
                    href={`/tracks/${spotlight.starterTrack.slug}`}
                    className="motion-button-outline inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-950 hover:border-ink-950/20"
                  >
                    {t("actions.startTrack", {
                      title: starterTrackTitle ?? spotlight.starterTrack.title,
                    })}
                  </Link>
                ) : spotlight.featuredConcept ? (
                  <Link
                    href={`/concepts/${spotlight.featuredConcept.slug}`}
                    className="motion-button-outline inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-950 hover:border-ink-950/20"
                  >
                    {t("actions.startConcept", {
                      title:
                        featuredConceptTitle ??
                        spotlight.featuredConcept.shortTitle ??
                        spotlight.featuredConcept.title,
                    })}
                  </Link>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
