"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { ResolvedSavedStudyPlan } from "@/lib/account/study-plans";
import {
  getConceptDisplayTitle,
  getGoalPathDisplayTitle,
  getGuidedCollectionDisplayTitle,
  getStarterTrackDisplayTitle,
} from "@/lib/i18n/content";
import {
  buildSavedStudyPlanProgressSummary,
  type ProgressSnapshot,
} from "@/lib/progress";

type SavedStudyPlansPreviewPanelProps = {
  plans: ResolvedSavedStudyPlan[];
  snapshot: ProgressSnapshot;
};

function formatTimestamp(value: string | null, locale: string) {
  if (!value) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return null;
  }
}

function getStatusLabel(
  status: ReturnType<typeof buildSavedStudyPlanProgressSummary>["status"],
  t: ReturnType<typeof useTranslations<"SavedStudyPlansPreviewPanel">>,
) {
  switch (status) {
    case "completed":
      return t("status.completed");
    case "in-progress":
      return t("status.inProgress");
    default:
      return t("status.notStarted");
  }
}

function getStatusTone(status: ReturnType<typeof buildSavedStudyPlanProgressSummary>["status"]) {
  switch (status) {
    case "completed":
      return "border-teal-500/25 bg-teal-500/10 text-teal-700";
    case "in-progress":
      return "border-amber-500/25 bg-amber-500/10 text-amber-800";
    default:
      return "border-line bg-paper text-ink-600";
  }
}

function getEntryKindLabel(
  kind: ResolvedSavedStudyPlan["entries"][number]["kind"],
  t: ReturnType<typeof useTranslations<"SavedStudyPlansPreviewPanel">>,
) {
  switch (kind) {
    case "guided-collection":
      return t("entryKinds.guidedCollection");
    case "goal-path":
      return t("entryKinds.goalPath");
    case "track":
      return t("entryKinds.track");
    default:
      return t("entryKinds.concept");
  }
}

function getEntryDisplayTitle(
  entry: ResolvedSavedStudyPlan["entries"][number],
  locale: AppLocale,
) {
  switch (entry.kind) {
    case "concept":
      return getConceptDisplayTitle(entry.concept, locale);
    case "track":
      return getStarterTrackDisplayTitle(entry.track, locale);
    case "guided-collection":
      return getGuidedCollectionDisplayTitle(entry.collection, locale);
    case "goal-path":
      return getGoalPathDisplayTitle(entry.goalPath, locale);
  }
}

function getLocalizedProgressNote(
  progress: ReturnType<typeof buildSavedStudyPlanProgressSummary>,
  t: ReturnType<typeof useTranslations<"SavedStudyPlansPreviewPanel">>,
  locale: AppLocale,
) {
  const nextEntry = progress.nextEntry;

  if (!nextEntry) {
    return t("notes.completed");
  }

  const entryTitle = getEntryDisplayTitle(nextEntry.entry, locale);

  switch (nextEntry.entry.kind) {
    case "concept":
      return t("notes.concept", { title: entryTitle });
    case "track":
      return t("notes.track", { title: entryTitle });
    case "guided-collection":
      return t("notes.guidedCollection", { title: entryTitle });
    case "goal-path":
      return t("notes.goalPath", { title: entryTitle });
    default:
      return t("notes.default");
  }
}

function getLocalizedPrimaryActionLabel(
  progress: ReturnType<typeof buildSavedStudyPlanProgressSummary>,
  t: ReturnType<typeof useTranslations<"SavedStudyPlansPreviewPanel">>,
) {
  const nextEntry = progress.nextEntry;

  if (!nextEntry) {
    return t("actions.reviewPlan");
  }

  switch (nextEntry.entry.kind) {
    case "concept":
      return t("actions.openConcept");
    case "track":
      return t("actions.openTrack");
    case "guided-collection":
      return t("actions.openGuidedCollection");
    case "goal-path":
      return t("actions.openGoalPath");
    default:
      return t("actions.openPlan");
  }
}

export function SavedStudyPlansPreviewPanel({
  plans,
  snapshot,
}: SavedStudyPlansPreviewPanelProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("SavedStudyPlansPreviewPanel");

  return (
    <section
      id="dashboard-study-plans"
      className="lab-panel p-5"
      aria-labelledby="dashboard-study-plans-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="lab-label">{t("label")}</p>
          <h2
            id="dashboard-study-plans-heading"
            className="mt-2 text-2xl font-semibold text-ink-950"
          >
            {t("title")}
          </h2>
        </div>
        <Link
          href="/account/study-plans"
          className="inline-flex items-center rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
        >
          {t("actions.manage")}
        </Link>
      </div>
      <p className="mt-3 max-w-4xl text-sm leading-6 text-ink-700">
        {t("description")}
      </p>

      {plans.length ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {plans.slice(0, 4).map((plan) => {
            const progress = buildSavedStudyPlanProgressSummary(snapshot, plan, locale);
            const updatedAtLabel = formatTimestamp(plan.updatedAt, locale);
            const primaryActionLabel = getLocalizedPrimaryActionLabel(progress, t);
            const primaryActionHref = progress.nextEntry?.primaryAction.href ?? "/account/study-plans";
            const primaryActionNote = getLocalizedProgressNote(progress, t, locale);

            return (
              <article
                key={plan.id}
                className="rounded-[24px] border border-line bg-paper-strong p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={[
                          "rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em]",
                          getStatusTone(progress.status),
                        ].join(" ")}
                      >
                        {getStatusLabel(progress.status, t)}
                      </span>
                      <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-500">
                        {t("meta.entries", { count: plan.entries.length })}
                      </span>
                      <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-500">
                        {t("meta.concepts", { count: plan.conceptCount })}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-ink-950">{plan.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-ink-700">
                        {plan.summary ?? t("fallbackSummary")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink-600">
                  {updatedAtLabel ? (
                    <span className="rounded-full border border-line bg-paper px-3 py-1">
                      {t("meta.updated", { date: updatedAtLabel })}
                    </span>
                  ) : null}
                  <span className="rounded-full border border-line bg-paper px-3 py-1">
                    {t("meta.entriesComplete", {
                      completed: progress.completedEntryCount,
                      total: progress.totalEntries,
                    })}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {plan.entries.slice(0, 4).map((entry) => (
                    <span
                      key={entry.key}
                      className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-700"
                    >
                      {getEntryKindLabel(entry.kind, t)}: {getEntryDisplayTitle(entry, locale)}
                    </span>
                  ))}
                </div>

                <div className="mt-4 rounded-[20px] border border-line bg-paper p-3">
                  <p className="text-sm font-semibold text-ink-950">{t("nextActionLabel")}</p>
                  <p className="mt-2 text-sm leading-6 text-ink-700">{primaryActionNote}</p>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={primaryActionHref}
                    className="inline-flex items-center rounded-full bg-ink-950 px-4 py-2.5 text-sm font-semibold transition hover:opacity-90"
                    style={{ color: "var(--paper-strong)" }}
                  >
                    {primaryActionLabel}
                  </Link>
                  <Link
                    href="/account/study-plans"
                    className="inline-flex items-center rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
                  >
                    {t("actions.openLibrary")}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 rounded-[24px] border border-line bg-paper-strong p-4">
          <p className="text-sm font-semibold text-ink-950">{t("empty.title")}</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-700">
            {t("empty.description")}
          </p>
          <Link
            href="/account/study-plans"
            className="mt-4 inline-flex items-center rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
          >
            {t("actions.build")}
          </Link>
        </div>
      )}
    </section>
  );
}
