"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type {
  PremiumCheckpointHistoryConceptTrend,
  PremiumCheckpointHistorySubjectTrend,
  PremiumCheckpointHistoryView,
  ProgressHistoryEvent,
  ProgressHistoryTimelinePoint,
} from "@/lib/progress";

type PremiumCheckpointHistoryPanelProps = {
  view: PremiumCheckpointHistoryView;
  variant?: "analytics" | "dashboard";
};

function formatDate(value: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getEventKindLabel(
  event: ProgressHistoryEvent,
  t: ReturnType<typeof useTranslations<"PremiumCheckpointHistoryPanel">>,
) {
  switch (event.kind) {
    case "checkpoint-cleared":
      return t("eventKinds.checkpoint");
    case "challenge-solved":
      return t("eventKinds.challenge");
    default:
      return t("eventKinds.mastery");
  }
}

function getTrendStatusLabel(
  statusLabel: PremiumCheckpointHistorySubjectTrend["statusLabel"],
  t: ReturnType<typeof useTranslations<"PremiumCheckpointHistoryPanel">>,
) {
  switch (statusLabel) {
    case "Stable":
      return t("status.stable");
    case "Strengthening":
      return t("status.strengthening");
    case "Needs work":
      return t("status.needsWork");
    default:
      return t("status.building");
  }
}

function MetricCard({
  label,
  value,
  note,
}: PremiumCheckpointHistoryView["metrics"][number]) {
  return (
    <article className="rounded-[22px] border border-line bg-paper-strong p-4">
      <p className="text-lg font-semibold text-ink-950">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-ink-700">{note}</p>
    </article>
  );
}

function EventTone({
  event,
  t,
}: {
  event: ProgressHistoryEvent;
  t: ReturnType<typeof useTranslations<"PremiumCheckpointHistoryPanel">>;
}) {
  const tone =
    event.kind === "checkpoint-cleared"
      ? "border-amber-500/25 bg-amber-500/10 text-amber-800"
      : event.kind === "challenge-solved"
        ? "border-teal-500/25 bg-teal-500/10 text-teal-700"
        : "border-sky-500/25 bg-sky-500/10 text-sky-700";

  return (
    <span
      className={[
        "rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em]",
        tone,
      ].join(" ")}
    >
      {getEventKindLabel(event, t)}
    </span>
  );
}

function EventCard({
  event,
  t,
  locale,
}: {
  event: ProgressHistoryEvent;
  t: ReturnType<typeof useTranslations<"PremiumCheckpointHistoryPanel">>;
  locale: string;
}) {
  return (
    <article className="rounded-[22px] border border-line bg-paper-strong p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink-950">{event.title}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-ink-500">
            {formatDate(event.occurredAt, locale)}
          </p>
        </div>
        <EventTone event={event} t={t} />
      </div>
      <p className="mt-3 text-sm leading-6 text-ink-700">{event.note}</p>
      <p className="mt-3 text-xs uppercase tracking-[0.14em] text-ink-500">
        {event.subjectTitle ?? t("subjectUnavailable")} / {event.conceptTitle}
      </p>
      <Link
        href={event.href}
        className="mt-4 inline-flex items-center rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
      >
        {t("actions.reopen")}
      </Link>
    </article>
  );
}

function TrendPointCard({
  point,
  t,
  locale,
}: {
  point: ProgressHistoryTimelinePoint;
  t: ReturnType<typeof useTranslations<"PremiumCheckpointHistoryPanel">>;
  locale: string;
}) {
  return (
    <article className="rounded-[20px] border border-line bg-paper-strong px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink-950">{formatDate(point.recordedAt, locale)}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-ink-500">
            {t("timeline.trackedConcepts", { count: point.touchedConceptCount })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-ink-700">
          <span className="rounded-full border border-line bg-paper px-3 py-1">
            {t("timeline.solid", { count: point.solidConceptCount })}
          </span>
          <span className="rounded-full border border-line bg-paper px-3 py-1">
            {t("timeline.checkpoints", { count: point.checkpointClearCount })}
          </span>
          <span className="rounded-full border border-line bg-paper px-3 py-1">
            {t("timeline.challenges", { count: point.solvedChallengeCount })}
          </span>
        </div>
      </div>
    </article>
  );
}

function TrendCard({
  item,
  href,
  t,
}: {
  item: PremiumCheckpointHistorySubjectTrend | PremiumCheckpointHistoryConceptTrend;
  href: string;
  t: ReturnType<typeof useTranslations<"PremiumCheckpointHistoryPanel">>;
}) {
  const title = "subjectTitle" in item ? item.subjectTitle : item.title;
  const tone =
    item.statusLabel === "Stable"
      ? "border-teal-500/25 bg-teal-500/10 text-teal-700"
      : item.statusLabel === "Strengthening"
        ? "border-sky-500/25 bg-sky-500/10 text-sky-700"
        : item.statusLabel === "Needs work"
          ? "border-amber-500/25 bg-amber-500/10 text-amber-800"
          : "border-line bg-paper text-ink-600";

  return (
    <article className="rounded-[22px] border border-line bg-paper-strong p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-lg font-semibold text-ink-950">{title}</h3>
        <span
          className={[
            "rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em]",
            tone,
          ].join(" ")}
        >
          {getTrendStatusLabel(item.statusLabel, t)}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-ink-700">{item.summary}</p>
      <p className="mt-2 text-xs leading-5 text-ink-600">{item.detail}</p>
      <Link
        href={href}
        className="mt-4 inline-flex items-center rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
      >
        {t("actions.open")}
      </Link>
    </article>
  );
}

export function PremiumCheckpointHistoryPanel({
  view,
  variant = "analytics",
}: PremiumCheckpointHistoryPanelProps) {
  const locale = useLocale();
  const t = useTranslations("PremiumCheckpointHistoryPanel");
  const recentEvents = variant === "dashboard" ? view.recentEvents.slice(0, 3) : view.recentEvents;
  const timeline = variant === "dashboard" ? view.timeline.slice(-3) : view.timeline;
  const stableSubjects =
    variant === "dashboard" ? view.stableSubjects.slice(0, 1) : view.stableSubjects;
  const needsWorkSubjects =
    variant === "dashboard" ? view.needsWorkSubjects.slice(0, 1) : view.needsWorkSubjects;
  const stableConcepts =
    variant === "dashboard" ? view.stableConcepts.slice(0, 1) : view.stableConcepts;
  const needsWorkConcepts =
    variant === "dashboard" ? view.needsWorkConcepts.slice(0, 1) : view.needsWorkConcepts;

  return (
    <section
      id={
        variant === "analytics"
          ? "checkpoint-history"
          : variant === "dashboard"
            ? "dashboard-checkpoint-history"
            : undefined
      }
      className="space-y-4"
      aria-labelledby={`${variant}-checkpoint-history-heading`}
    >
      <section className="lab-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">
              {variant === "dashboard" ? t("labels.dashboard") : t("labels.analytics")}
            </p>
            <h2
              id={`${variant}-checkpoint-history-heading`}
              className="mt-2 text-2xl font-semibold text-ink-950"
            >
              {variant === "dashboard" ? t("titles.dashboard") : t("titles.analytics")}
            </h2>
          </div>
          {variant === "dashboard" ? (
            <Link
              href="/dashboard/analytics#checkpoint-history"
              className="inline-flex items-center rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
            >
              {t("actions.openFullView")}
            </Link>
          ) : null}
        </div>
        <p className="mt-3 text-sm leading-6 text-ink-700">
          {variant === "dashboard" ? t("descriptions.dashboard") : view.methodologyNote}
        </p>
        {!view.hasRecordedProgress ? (
          <div className="mt-4 rounded-[22px] border border-line bg-paper-strong p-4">
            <p className="text-sm font-semibold text-ink-950">{t("empty.title")}</p>
            <p className="mt-2 text-sm leading-6 text-ink-700">{t("empty.description")}</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {view.metrics.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </div>
        )}
      </section>

      {recentEvents.length ? (
        <section className="lab-panel p-5">
          <p className="lab-label">{t("recentMoves.label")}</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink-950">
            {t("recentMoves.title")}
          </h2>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {recentEvents.map((event) => (
              <EventCard key={event.id} event={event} t={t} locale={locale} />
            ))}
          </div>
        </section>
      ) : null}

      {timeline.length ? (
        <section className="lab-panel p-5">
          <p className="lab-label">{t("timeline.label")}</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink-950">
            {t("timeline.title")}
          </h2>
          <div className="mt-4 grid gap-3 xl:grid-cols-3">
            {timeline.map((point) => (
              <TrendPointCard key={point.recordedAt} point={point} t={t} locale={locale} />
            ))}
          </div>
        </section>
      ) : null}

      {variant === "dashboard" ? (
        <section className="grid gap-4 xl:grid-cols-2">
          <section className="lab-panel p-5">
            <p className="lab-label">{t("dashboardStableSubject.label")}</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink-950">
              {t("dashboardStableSubject.title")}
            </h2>
            <div className="mt-4 grid gap-3">
              {stableSubjects.length ? (
                stableSubjects.map((item) => (
                  <TrendCard
                    key={item.id}
                    item={item}
                    href={item.subjectPath ?? "/concepts/subjects"}
                    t={t}
                  />
                ))
              ) : (
                <div className="rounded-[22px] border border-line bg-paper-strong p-4 text-sm leading-6 text-ink-700">
                  {t("dashboardStableSubject.empty")}
                </div>
              )}
            </div>
          </section>

          <section className="lab-panel p-5">
            <p className="lab-label">{t("dashboardNeedsWork.label")}</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink-950">
              {t("dashboardNeedsWork.title")}
            </h2>
            <div className="mt-4 grid gap-3">
              {needsWorkConcepts.length ? (
                needsWorkConcepts.map((item) => (
                  <TrendCard key={item.id} item={item} href={item.href} t={t} />
                ))
              ) : (
                <div className="rounded-[22px] border border-line bg-paper-strong p-4 text-sm leading-6 text-ink-700">
                  {t("dashboardNeedsWork.empty")}
                </div>
              )}
            </div>
          </section>
        </section>
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          <section className="lab-panel p-5">
            <p className="lab-label">{t("stableSubjects.label")}</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink-950">
              {t("stableSubjects.title")}
            </h2>
            <div className="mt-4 grid gap-3">
              {stableSubjects.length ? (
                stableSubjects.map((item) => (
                  <TrendCard
                    key={item.id}
                    item={item}
                    href={item.subjectPath ?? "/concepts/subjects"}
                    t={t}
                  />
                ))
              ) : (
                <div className="rounded-[22px] border border-line bg-paper-strong p-4 text-sm leading-6 text-ink-700">
                  {t("stableSubjects.empty")}
                </div>
              )}
            </div>
          </section>

          <section className="lab-panel p-5">
            <p className="lab-label">{t("subjectPressure.label")}</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink-950">
              {t("subjectPressure.title")}
            </h2>
            <div className="mt-4 grid gap-3">
              {needsWorkSubjects.length ? (
                needsWorkSubjects.map((item) => (
                  <TrendCard
                    key={item.id}
                    item={item}
                    href={item.subjectPath ?? "/concepts/subjects"}
                    t={t}
                  />
                ))
              ) : (
                <div className="rounded-[22px] border border-line bg-paper-strong p-4 text-sm leading-6 text-ink-700">
                  {t("subjectPressure.empty")}
                </div>
              )}
            </div>
          </section>

          <section className="lab-panel p-5">
            <p className="lab-label">{t("stableConcepts.label")}</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink-950">
              {t("stableConcepts.title")}
            </h2>
            <div className="mt-4 grid gap-3">
              {stableConcepts.length ? (
                stableConcepts.map((item) => (
                  <TrendCard key={item.id} item={item} href={item.href} t={t} />
                ))
              ) : (
                <div className="rounded-[22px] border border-line bg-paper-strong p-4 text-sm leading-6 text-ink-700">
                  {t("stableConcepts.empty")}
                </div>
              )}
            </div>
          </section>

          <section className="lab-panel p-5">
            <p className="lab-label">{t("needsWorkConcepts.label")}</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink-950">
              {t("needsWorkConcepts.title")}
            </h2>
            <div className="mt-4 grid gap-3">
              {needsWorkConcepts.length ? (
                needsWorkConcepts.map((item) => (
                  <TrendCard key={item.id} item={item} href={item.href} t={t} />
                ))
              ) : (
                <div className="rounded-[22px] border border-line bg-paper-strong p-4 text-sm leading-6 text-ink-700">
                  {t("needsWorkConcepts.empty")}
                </div>
              )}
            </div>
          </section>
        </section>
      )}
    </section>
  );
}
