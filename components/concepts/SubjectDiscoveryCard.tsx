"use client";

import { useLocale, useTranslations } from "next-intl";
import type { SubjectDiscoverySummary } from "@/lib/content";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import {
  getConceptDisplayShortTitle,
  getStarterTrackDisplayTitle,
  getSubjectDisplayDescription,
  getSubjectDisplayTitle,
  getTopicDisplayTitle,
} from "@/lib/i18n/content";
import { LearningVisual } from "@/components/visuals/LearningVisual";
import { getSubjectVisualDescriptor } from "@/components/visuals/learningVisualDescriptors";

type SubjectDiscoveryCardProps = {
  subject: SubjectDiscoverySummary;
  variant?: "default" | "compact";
};

const accentTopClasses: Record<SubjectDiscoverySummary["accent"], string> = {
  teal: "from-teal-500/60 via-teal-500/14 to-transparent",
  amber: "from-amber-500/60 via-amber-500/14 to-transparent",
  coral: "from-coral-500/60 via-coral-500/14 to-transparent",
  sky: "from-sky-500/60 via-sky-500/14 to-transparent",
  ink: "from-ink-950/45 via-ink-950/10 to-transparent",
};

export function SubjectDiscoveryCard({
  subject,
  variant = "default",
}: SubjectDiscoveryCardProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("SubjectCard");
  const isCompact = variant === "compact";
  const displayTitle = getSubjectDisplayTitle(subject, locale);
  const displayDescription = getSubjectDisplayDescription(subject, locale);
  const visibleTopics = subject.featuredTopics.slice(0, isCompact ? 2 : 3);
  const visibleTracks = subject.featuredStarterTracks.slice(0, isCompact ? 1 : 2);
  const bridgeTrack = subject.bridgeStarterTracks[0] ?? null;
  const bestFirstTrack = subject.featuredStarterTracks[0] ?? null;
  const bestFirstConcept = subject.featuredConcepts[0] ?? null;
  const subjectVisual = getSubjectVisualDescriptor(subject);
  const compactMeta = [
    t("meta.topics", { count: subject.topicCount }),
    t("meta.concepts", { count: subject.conceptCount }),
  ];
  const compactNextMove = bestFirstTrack
    ? t("compact.goodFirstTrack", {
        title: getStarterTrackDisplayTitle(bestFirstTrack, locale),
      })
    : bestFirstConcept
      ? t("compact.goodFirstConcept", {
          title: getConceptDisplayShortTitle(bestFirstConcept, locale),
        })
      : null;

  if (isCompact) {
    return (
      <article className="motion-enter motion-card lab-panel relative overflow-hidden p-4">
        <div
          className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accentTopClasses[subject.accent]}`}
        />
        <div className="grid gap-3 sm:grid-cols-[6.5rem_minmax(0,1fr)] sm:items-start">
          <Link
            href={subject.path}
            aria-label={t("actions.openSubject")}
            className="block rounded-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            <LearningVisual
              kind={subjectVisual.kind}
              motif={subjectVisual.motif}
              overlay={subjectVisual.overlay}
              isFallback={subjectVisual.isFallback}
              fallbackKind={subjectVisual.fallbackKind}
              tone={subjectVisual.tone ?? subject.accent}
              compact
              className="h-24 sm:h-28"
            />
          </Link>
          <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="lab-label">{t("labels.subject")}</span>
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
            <h3 className="text-[1.25rem] font-semibold text-ink-950">{displayTitle}</h3>
            <p className="text-sm leading-6 text-ink-700">{displayDescription}</p>
            {compactNextMove ? (
              <p className="text-sm leading-5.5 text-ink-600">{compactNextMove}</p>
            ) : null}
          </div>

          <div>
            <Link
              href={subject.path}
              className="motion-button-solid inline-flex items-center rounded-full bg-ink-950 px-4 py-2.5 text-sm font-semibold"
              style={{ color: "var(--paper-strong)" }}
            >
              {t("actions.openSubject")}
            </Link>
          </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className="motion-enter motion-card lab-panel relative overflow-hidden p-5"
    >
      <div
        className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accentTopClasses[subject.accent]}`}
      />
      <div className="space-y-3.5">
        <Link
          href={subject.path}
          aria-label={t("actions.openSubject")}
          className="block rounded-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
        >
          <LearningVisual
            kind={subjectVisual.kind}
            motif={subjectVisual.motif}
            overlay={subjectVisual.overlay}
            isFallback={subjectVisual.isFallback}
            fallbackKind={subjectVisual.fallbackKind}
            tone={subjectVisual.tone ?? subject.accent}
            compact
          />
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <span className="lab-label">{t("labels.subject")}</span>
          <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
            {t("meta.topics", { count: subject.topicCount })}
          </span>
          <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
            {t("meta.concepts", { count: subject.conceptCount })}
          </span>
          <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
            {t("meta.starterTracks", { count: subject.starterTrackCount })}
          </span>
          {subject.bridgeTrackCount ? (
            <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
              {t("meta.bridges", { count: subject.bridgeTrackCount })}
            </span>
          ) : null}
        </div>

        <div className="space-y-2">
          <h3 className="text-[1.45rem] font-semibold text-ink-950">{displayTitle}</h3>
          <p className="text-sm leading-6 text-ink-700">{displayDescription}</p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
            {t("sections.featuredTopics")}
          </p>
          <div className="flex flex-wrap gap-2">
            {visibleTopics.map((topic) => (
              <Link
                key={topic.slug}
                href={`/concepts/topics/${topic.slug}`}
                className="motion-chip rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-700 hover:border-ink-950/20 hover:text-ink-950"
              >
                {getTopicDisplayTitle(topic, locale)}
              </Link>
            ))}
          </div>
        </div>

        {visibleTracks.length ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
              {t("sections.starterTracks")}
            </p>
            <div className="flex flex-wrap gap-2">
              {visibleTracks.map((track) => (
                <Link
                  key={track.slug}
                  href={`/tracks/${track.slug}`}
                  className="motion-chip rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-700 hover:border-ink-950/20 hover:text-ink-950"
                >
                  {getStarterTrackDisplayTitle(track, locale)}
                </Link>
              ))}
              {bridgeTrack ? (
                <Link
                  href={`/tracks/${bridgeTrack.slug}`}
                  className="motion-chip rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-700 hover:border-ink-950/20 hover:text-ink-950"
                >
                  {t("labels.bridge")}: {getStarterTrackDisplayTitle(bridgeTrack, locale)}
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Link
            href={subject.path}
            className="motion-button-solid inline-flex items-center rounded-full bg-ink-950 px-4 py-2.5 text-sm font-semibold"
            style={{ color: "var(--paper-strong)" }}
          >
            {t("actions.openSubject")}
          </Link>
          {bestFirstTrack ? (
            <Link
              href={`/tracks/${bestFirstTrack.slug}`}
              className="motion-button-outline inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-950 hover:border-ink-950/20"
            >
              {t("actions.startTrack", {
                title: getStarterTrackDisplayTitle(bestFirstTrack, locale),
              })}
            </Link>
          ) : bestFirstConcept ? (
            <Link
              href={`/concepts/${bestFirstConcept.slug}`}
              className="motion-button-outline inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-950 hover:border-ink-950/20"
            >
              {t("actions.startConcept", {
                title: getConceptDisplayShortTitle(bestFirstConcept, locale),
              })}
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
