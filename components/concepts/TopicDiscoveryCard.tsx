"use client";

import { useLocale, useTranslations } from "next-intl";
import type { TopicDiscoverySummary } from "@/lib/content";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import {
  getConceptDisplayShortTitle,
  getTopicDisplayDescription,
  getTopicDisplaySubject,
  getTopicDisplaySubtopics,
  getTopicDisplayTitle,
} from "@/lib/i18n/content";

type TopicDiscoveryCardProps = {
  topic: TopicDiscoverySummary;
  variant?: "default" | "compact";
};

const accentTopClasses: Record<TopicDiscoverySummary["accent"], string> = {
  teal: "from-teal-500/60 via-teal-500/14 to-transparent",
  amber: "from-amber-500/60 via-amber-500/14 to-transparent",
  coral: "from-coral-500/60 via-coral-500/14 to-transparent",
  sky: "from-sky-500/60 via-sky-500/14 to-transparent",
  ink: "from-ink-950/45 via-ink-950/10 to-transparent",
};

export function TopicDiscoveryCard({
  topic,
  variant = "default",
}: TopicDiscoveryCardProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("TopicCard");
  const isCompact = variant === "compact";
  const displayTitle = getTopicDisplayTitle(topic, locale);
  const displayDescription = getTopicDisplayDescription(topic, locale);
  const displaySubject = getTopicDisplaySubject(topic, locale);
  const visibleConcepts = topic.featuredConcepts.slice(0, isCompact ? 2 : 3);
  const visibleSubtopics = getTopicDisplaySubtopics(topic, locale).slice(
    0,
    isCompact ? 2 : 3,
  );
  const bestFirstConcept = topic.featuredConcepts[0] ?? null;
  const compactMeta = [
    displaySubject,
    t("meta.concepts", { count: topic.conceptCount }),
  ];

  if (isCompact) {
    return (
      <article className="motion-enter motion-card lab-panel relative overflow-hidden p-4">
        <div
          className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accentTopClasses[topic.accent]}`}
        />
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="lab-label">{t("labels.topic")}</span>
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
            {bestFirstConcept ? (
              <p className="text-sm leading-5.5 text-ink-600">
                {t("compact.goodFirstConcept", {
                  title: getConceptDisplayShortTitle(bestFirstConcept, locale),
                })}
              </p>
            ) : null}
          </div>

          <div>
            <Link
              href={`/concepts/topics/${topic.slug}`}
              className="motion-button-solid inline-flex items-center rounded-full bg-ink-950 px-4 py-2.5 text-sm font-semibold"
              style={{ color: "var(--paper-strong)" }}
            >
              {t("actions.openTopic")}
            </Link>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="motion-enter motion-card lab-panel relative overflow-hidden p-5">
      <div
        className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accentTopClasses[topic.accent]}`}
      />
      <div className="space-y-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="lab-label">{t("labels.topic")}</span>
          <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
            {displaySubject}
          </span>
          <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
            {t("meta.concepts", { count: topic.conceptCount })}
          </span>
          <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
            {t("meta.minutes", { count: topic.estimatedStudyMinutes })}
          </span>
          {topic.starterTracks.length ? (
            <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
              {t("meta.starterTracks", { count: topic.starterTracks.length })}
            </span>
          ) : null}
        </div>

        <div className="space-y-2">
          <h3 className="text-[1.45rem] font-semibold text-ink-950">{displayTitle}</h3>
          <p className="text-sm leading-6 text-ink-700">{displayDescription}</p>
        </div>

        {visibleSubtopics.length ? (
          <div className="flex flex-wrap gap-2">
            {visibleSubtopics.map((subtopic) => (
              <span
                key={subtopic}
                className="motion-chip rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-700"
              >
                {subtopic}
              </span>
            ))}
          </div>
        ) : null}

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
            {t("sections.bestFirstConcepts")}
          </p>
          <div className="flex flex-wrap gap-2">
            {visibleConcepts.map((concept) => (
              <Link
                key={concept.slug}
                href={`/concepts/${concept.slug}`}
                className="motion-chip rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-700 hover:border-ink-950/20 hover:text-ink-950"
              >
                {getConceptDisplayShortTitle(concept, locale)}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/concepts/topics/${topic.slug}`}
            className="motion-button-solid inline-flex items-center rounded-full bg-ink-950 px-4 py-2.5 text-sm font-semibold"
            style={{ color: "var(--paper-strong)" }}
          >
            {t("actions.openTopic")}
          </Link>
          {bestFirstConcept ? (
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
