"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  getConceptBySlug,
  getGuidedCollectionBySlug,
  getStarterTrackBySlug,
} from "@/lib/content";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import {
  getConceptDisplayTitle,
  getGuidedCollectionDisplayTitle,
  getStarterTrackDisplayTitle,
  getSubjectDisplayTitleFromValue,
} from "@/lib/i18n/content";
import type { FreeTierProgressRecapSummary } from "@/lib/progress";
import { formatProgressMonthDay } from "./dateFormatting";

type FreeTierProgressRecapPanelProps = {
  summary: FreeTierProgressRecapSummary;
  progressDateSource: "local" | "synced";
  progressSourceLabel: string;
  className?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  emptyTitle?: string;
  emptyNote?: string;
  browseHref?: string;
  browseLabel?: string;
};

function StatTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] border border-line bg-paper-strong p-4">
      <p className="text-lg font-semibold text-ink-950">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-500">{label}</p>
    </div>
  );
}

function CompletionKindBadge({
  kind,
}: {
  kind: "challenge" | "checkpoint";
}) {
  const t = useTranslations("FreeTierProgressRecapPanel");

  return (
    <span
      className={[
        "rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
        kind === "checkpoint"
          ? "border-amber-500/25 bg-amber-500/10 text-amber-700"
          : "border-teal-500/25 bg-teal-500/10 text-teal-700",
      ].join(" ")}
    >
      {kind === "checkpoint" ? t("badges.checkpoint") : t("badges.challenge")}
    </span>
  );
}

function getConceptSlugFromHref(href: string) {
  return href.match(/^\/concepts\/([^/?#]+)/)?.[1] ?? null;
}

function getTrackSlugFromHref(href: string) {
  return href.match(/^\/tracks\/([^/?#]+)/)?.[1] ?? null;
}

function getGuidedSlugFromHref(href: string) {
  return href.match(/^\/guided\/([^/?#]+)/)?.[1] ?? null;
}

export function FreeTierProgressRecapPanel({
  summary,
  progressDateSource,
  progressSourceLabel,
  className,
  eyebrow,
  title,
  description,
  emptyTitle,
  emptyNote,
  browseHref = "/concepts",
  browseLabel,
}: FreeTierProgressRecapPanelProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("FreeTierProgressRecapPanel");
  const resolvedEyebrow = eyebrow ?? t("eyebrow");
  const resolvedTitle = title ?? t("title");
  const resolvedDescription = description ?? t("description");
  const resolvedEmptyTitle = emptyTitle ?? t("empty.title");
  const resolvedEmptyNote = emptyNote ?? t("empty.note");
  const resolvedBrowseLabel = browseLabel ?? t("actions.browseConcepts");
  const displayProgressSourceLabel =
    progressSourceLabel === "Saved local progress"
      ? t("progressSources.local")
      : progressSourceLabel === "Saved synced progress"
        ? t("progressSources.synced")
        : progressSourceLabel === "Saved local + synced progress"
          ? t("progressSources.merged")
          : progressSourceLabel;

  function getDisplayTitle(item: {
    kind: "challenge" | "checkpoint" | "concept" | "track" | "guided";
    title: string;
    href: string;
  }) {
    const conceptSlug = getConceptSlugFromHref(item.href);

    if (
      (item.kind === "challenge" ||
        item.kind === "checkpoint" ||
        item.kind === "concept") &&
      conceptSlug
    ) {
      const concept = getConceptBySlug(conceptSlug);
      const displayTitle = getConceptDisplayTitle(concept, locale);

      if (item.kind === "challenge") {
        return t("dynamic.challengeTitle", { title: displayTitle });
      }

      if (item.kind === "checkpoint") {
        return t("dynamic.checkpointTitle", { title: displayTitle });
      }

      return displayTitle;
    }

    if (item.kind === "track") {
      const trackSlug = getTrackSlugFromHref(item.href);
      if (trackSlug) {
        return getStarterTrackDisplayTitle(getStarterTrackBySlug(trackSlug), locale);
      }
    }

    if (item.kind === "guided") {
      const guidedSlug = getGuidedSlugFromHref(item.href);
      if (guidedSlug) {
        return getGuidedCollectionDisplayTitle(getGuidedCollectionBySlug(guidedSlug), locale);
      }
    }

    return item.title;
  }

  function getDisplayNote(item: {
    kind: "challenge" | "checkpoint" | "concept" | "track" | "guided";
    title: string;
    href: string;
  }) {
    const displayTitle = getDisplayTitle(item);

    switch (item.kind) {
      case "challenge":
        return t("notes.challenge", { title: displayTitle });
      case "checkpoint":
        return t("notes.checkpoint", { title: displayTitle });
      case "track":
        return t("notes.track", { title: displayTitle });
      case "guided":
        return t("notes.guided", { title: displayTitle });
      default:
        return t("notes.concept", { title: displayTitle });
    }
  }

  function getActionLabel(prompt: {
    kind: "concept" | "track" | "checkpoint" | "guided";
    href: string;
    actionLabel: string;
  }) {
    if (prompt.href.includes("#quick-test")) {
      return t("actions.retryQuickTest");
    }

    if (prompt.href.includes("#challenge-mode")) {
      return t("actions.openChallenge");
    }

    switch (prompt.kind) {
      case "track":
        return t("actions.continueTrack");
      case "guided":
        return t("actions.openGuided");
      case "checkpoint":
        return t("actions.openCheckpoint");
      default:
        return /review/i.test(prompt.actionLabel)
          ? t("actions.reviewConcept")
          : t("actions.continueConcept");
    }
  }

  return (
    <section className={["lab-panel p-5", className].filter(Boolean).join(" ")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="lab-label">{resolvedEyebrow}</p>
          <h2 className="text-2xl font-semibold text-ink-950">{resolvedTitle}</h2>
          <p className="max-w-3xl text-sm leading-6 text-ink-700">{resolvedDescription}</p>
        </div>
        <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
          {displayProgressSourceLabel}
        </span>
      </div>

      {summary.hasRecordedProgress ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <StatTile
              label={t("stats.challengeSolves")}
              value={String(summary.completedChallengeCount)}
            />
            <StatTile
              label={t("stats.checkpointClears")}
              value={String(summary.completedCheckpointCount)}
            />
            <StatTile
              label={t("stats.subjectsMoving")}
              value={String(summary.subjectMomentum.length)}
            />
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.04fr)_minmax(19rem,0.96fr)]">
            <section className="rounded-[24px] border border-line bg-paper-strong p-4">
              <p className="text-sm font-semibold text-ink-950">{t("sections.recentWins")}</p>
              {summary.recentCompletions.length ? (
                <div className="mt-3 grid gap-3">
                  {summary.recentCompletions.map((item) => {
                    const completedLabel = formatProgressMonthDay(
                      item.completedAt,
                      progressDateSource,
                      locale,
                    );
                    const displaySubject = item.subjectTitle
                      ? getSubjectDisplayTitleFromValue(item.subjectTitle, locale)
                      : null;

                    return (
                      <article
                        key={item.id}
                        className="rounded-[20px] border border-line bg-paper p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <CompletionKindBadge kind={item.kind} />
                          {displaySubject ? (
                            <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                              {displaySubject}
                            </span>
                          ) : null}
                          {completedLabel ? (
                            <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                              {completedLabel}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-3 text-lg font-semibold text-ink-950">
                          {getDisplayTitle(item)}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-ink-700">
                          {getDisplayNote(item)}
                        </p>
                        <Link
                          href={item.href}
                          className="mt-3 inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2 text-sm font-semibold text-ink-950 transition hover:border-ink-950/20 hover:bg-white"
                        >
                          {item.kind === "checkpoint"
                            ? t("actions.reopenCheckpoint")
                            : t("actions.reopenChallenge")}
                        </Link>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-ink-700">{t("empty.recentWins")}</p>
              )}
            </section>

            <div className="grid gap-4">
              <section className="rounded-[24px] border border-line bg-paper-strong p-4">
                <p className="text-sm font-semibold text-ink-950">{t("sections.nextPrompts")}</p>
                {summary.nextPrompts.length ? (
                  <div className="mt-3 grid gap-3">
                    {summary.nextPrompts.map((prompt) => (
                      <article
                        key={prompt.id}
                        className="rounded-[20px] border border-line bg-paper p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                            {t(`kinds.${prompt.kind}`)}
                          </span>
                          {prompt.subjectTitle ? (
                            <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                              {getSubjectDisplayTitleFromValue(prompt.subjectTitle, locale)}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-3 text-lg font-semibold text-ink-950">
                          {getDisplayTitle(prompt)}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-ink-700">
                          {getDisplayNote(prompt)}
                        </p>
                        <Link
                          href={prompt.href}
                          className="mt-3 inline-flex items-center rounded-full bg-ink-950 px-4 py-2 text-sm font-semibold text-paper-strong transition hover:opacity-90"
                        >
                          {getActionLabel(prompt)}
                        </Link>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-ink-700">{t("empty.nextPrompts")}</p>
                )}
              </section>

              <section className="rounded-[24px] border border-line bg-paper-strong p-4">
                <p className="text-sm font-semibold text-ink-950">{t("sections.subjectMomentum")}</p>
                {summary.subjectMomentum.length ? (
                  <div className="mt-3 grid gap-3">
                    {summary.subjectMomentum.map((item) => {
                      const displaySubjectTitle = getSubjectDisplayTitleFromValue(
                        item.subjectTitle,
                        locale,
                      );
                      const content = (
                        <div className="rounded-[20px] border border-line bg-paper p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-ink-950">
                              {displaySubjectTitle}
                            </p>
                            <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                              {t("momentum.touched", { count: item.touchedConceptCount })}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-ink-700">
                            {t("momentum.summary", {
                              completedConcepts: item.completedConceptCount,
                              solvedChallenges: item.solvedChallengeCount,
                              clearedCheckpoints: item.clearedCheckpointCount,
                            })}
                          </p>
                        </div>
                      );

                      if (!item.path) {
                        return <div key={item.subjectTitle}>{content}</div>;
                      }

                      return (
                        <Link
                          key={item.subjectTitle}
                          href={item.path}
                          className="transition hover:opacity-95"
                        >
                          {content}
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-ink-700">
                    {t("empty.subjectMomentum")}
                  </p>
                )}
              </section>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-5 rounded-[24px] border border-line bg-paper-strong p-4">
          <p className="text-sm font-semibold text-ink-950">{resolvedEmptyTitle}</p>
          <p className="mt-2 text-sm leading-6 text-ink-700">{resolvedEmptyNote}</p>
          <Link
            href={browseHref}
            className="mt-4 inline-flex items-center rounded-full bg-ink-950 px-4 py-2.5 text-sm font-semibold text-paper-strong transition hover:opacity-90"
          >
            {resolvedBrowseLabel}
          </Link>
        </div>
      )}
    </section>
  );
}
