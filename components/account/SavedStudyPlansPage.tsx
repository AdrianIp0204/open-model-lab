"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { PremiumFeatureNotice } from "@/components/account/PremiumFeatureNotice";
import {
  buildStudyPlanCatalogOptions,
  buildStudyPlanEntryKey,
  formatStudyPlanTimestamp,
  getStudyPlanEntryDisplayTitle,
  getStudyPlanEntryKindLabel,
  getStudyPlanPrimaryActionLabel,
  getStudyPlanProgressNote,
  getStudyPlanStatusLabel,
  getStudyPlanStatusTone,
  readStudyPlansJsonResponse,
  type StudyPlanCatalogOption,
  type StudyPlansTranslate,
} from "@/components/account/saved-study-plan-display";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { useAccountSession } from "@/lib/account/client";
import type {
  ResolvedSavedStudyPlan,
  SavedStudyPlanEntryRecord,
} from "@/lib/account/study-plans";
import type {
  ConceptSummary,
  GuidedCollectionSummary,
  RecommendedGoalPathSummary,
  StarterTrackSummary,
} from "@/lib/content";
import {
  buildSavedStudyPlanProgressSummary,
  useProgressSnapshot,
} from "@/lib/progress";

type SavedStudyPlansPageProps = {
  concepts: ConceptSummary[];
  starterTracks: StarterTrackSummary[];
  guidedCollections: GuidedCollectionSummary[];
  recommendedGoalPaths: RecommendedGoalPathSummary[];
};

type StudyPlansResponse = {
  items: ResolvedSavedStudyPlan[];
};

type StudyPlanSaveResponse = StudyPlansResponse & {
  replacedExisting: boolean;
  savedPlan: ResolvedSavedStudyPlan;
};

export function SavedStudyPlansPage({
  concepts,
  starterTracks,
  guidedCollections,
  recommendedGoalPaths,
}: SavedStudyPlansPageProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("SavedStudyPlansPage");
  const translate = t as unknown as StudyPlansTranslate;
  const session = useAccountSession();
  const progressSnapshot = useProgressSnapshot();
  const canUseStudyPlans =
    session.status === "signed-in" && session.entitlement.capabilities.canUseAdvancedStudyTools;
  const [plans, setPlans] = useState<ResolvedSavedStudyPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [summaryDraft, setSummaryDraft] = useState("");
  const [entryDrafts, setEntryDrafts] = useState<SavedStudyPlanEntryRecord[]>([]);
  const [selectedEntryKey, setSelectedEntryKey] = useState("");
  const [pendingAction, setPendingAction] = useState<"save" | "delete" | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const catalogOptions = useMemo<StudyPlanCatalogOption[]>(
    () =>
      buildStudyPlanCatalogOptions({
        concepts,
        starterTracks,
        guidedCollections,
        recommendedGoalPaths,
        locale,
        t: translate,
      }),
    [
      concepts,
      guidedCollections,
      locale,
      recommendedGoalPaths,
      starterTracks,
      translate,
    ],
  );
  const catalogOptionByKey = useMemo(
    () => new Map(catalogOptions.map((option) => [option.key, option])),
    [catalogOptions],
  );
  const progressByPlanId = useMemo(
    () =>
      new Map(
        plans.map((plan) => [
          plan.id,
          buildSavedStudyPlanProgressSummary(progressSnapshot, plan, locale),
        ]),
      ),
    [locale, plans, progressSnapshot],
  );

  useEffect(() => {
    if (!catalogOptions.length || selectedEntryKey) {
      return;
    }

    setSelectedEntryKey(catalogOptions[0]?.key ?? "");
  }, [catalogOptions, selectedEntryKey]);

  useEffect(() => {
    if (!canUseStudyPlans) {
      setPlans([]);
      setLoadingPlans(false);
      setLoadError(null);
      return;
    }

    let cancelled = false;

    async function loadPlans() {
      setLoadingPlans(true);
      setLoadError(null);

      try {
        const response = await fetch("/api/account/study-plans", {
          cache: "no-store",
        });
        const payload = await readStudyPlansJsonResponse<StudyPlansResponse>(
          response,
          t("errors.loadFailed"),
        );

        if (!cancelled) {
          setPlans(payload.items);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : t("errors.loadFailed"),
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingPlans(false);
        }
      }
    }

    void loadPlans();

    return () => {
      cancelled = true;
    };
  }, [canUseStudyPlans, t]);

  function resetMessages() {
    setStatusMessage(null);
    setActionError(null);
  }

  function resetDraft() {
    setEditingPlanId(null);
    setTitleDraft("");
    setSummaryDraft("");
    setEntryDrafts([]);
  }

  function startEditingPlan(plan: ResolvedSavedStudyPlan) {
    resetMessages();
    setEditingPlanId(plan.id);
    setTitleDraft(plan.title);
    setSummaryDraft(plan.summary ?? "");
    setEntryDrafts(
      plan.entries.map((entry) => ({
        kind: entry.kind,
        slug: entry.slug,
      })),
    );
  }

  function addEntryToDraft() {
    resetMessages();
    const selectedOption = catalogOptionByKey.get(selectedEntryKey);

    if (!selectedOption) {
      return;
    }

    const nextEntry: SavedStudyPlanEntryRecord = {
      kind: selectedOption.kind,
      slug: selectedOption.slug,
    };

    if (entryDrafts.some((entry) => buildStudyPlanEntryKey(entry) === buildStudyPlanEntryKey(nextEntry))) {
      setActionError(t("errors.duplicateEntry", { title: selectedOption.label }));
      return;
    }

    setEntryDrafts((current) => [...current, nextEntry]);
  }

  function moveDraftEntry(index: number, direction: -1 | 1) {
    setEntryDrafts((current) => {
      const nextIndex = index + direction;

      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const nextEntries = [...current];
      const currentEntry = nextEntries[index];

      nextEntries[index] = nextEntries[nextIndex];
      nextEntries[nextIndex] = currentEntry;

      return nextEntries;
    });
  }

  async function handleSavePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();

    if (!titleDraft.trim()) {
      setActionError(t("errors.titleRequired"));
      return;
    }

    if (!entryDrafts.length) {
      setActionError(t("errors.entriesRequired"));
      return;
    }

    setPendingAction("save");

    try {
      const response = await fetch("/api/account/study-plans", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          id: editingPlanId ?? undefined,
          title: titleDraft.trim(),
          summary: summaryDraft.trim() || null,
          entries: entryDrafts,
        }),
      });
      const payload = await readStudyPlansJsonResponse<StudyPlanSaveResponse>(
        response,
        t("errors.saveFailed"),
      );

      setPlans(payload.items);
      setStatusMessage(
        payload.replacedExisting
          ? t("status.updated", { title: payload.savedPlan.title })
          : t("status.saved", { title: payload.savedPlan.title }),
      );
      resetDraft();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : t("errors.saveFailed"),
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function handleDeletePlan(plan: ResolvedSavedStudyPlan) {
    resetMessages();
    setPendingAction("delete");

    try {
      const response = await fetch("/api/account/study-plans", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          id: plan.id,
        }),
      });
      const payload = await readStudyPlansJsonResponse<StudyPlansResponse>(
        response,
        t("errors.deleteFailed"),
      );

      setPlans(payload.items);

      if (editingPlanId === plan.id) {
        resetDraft();
      }

      setStatusMessage(t("status.deleted", { title: plan.title }));
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : t("errors.deleteFailed"),
      );
    } finally {
      setPendingAction(null);
    }
  }

  if (!session.initialized) {
    return (
      <section className="lab-panel p-5">
        <p className="lab-label">{t("loading.label")}</p>
        <p className="mt-3 text-sm leading-6 text-ink-700">
          {t("loading.description")}
        </p>
      </section>
    );
  }

  if (!canUseStudyPlans) {
    return (
      <section className="space-y-4">
        <PremiumFeatureNotice
          title={t("premium.title")}
          freeDescription={t("premium.freeDescription")}
          description={t("premium.description")}
        />
        <div className="flex flex-wrap gap-3">
          <Link
            href="/guided"
            className="inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
          >
            {t("premium.actions.openGuidedCollections")}
          </Link>
          <Link
            href="/pricing#compare"
            className="inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
          >
            {t("premium.actions.seePremiumDetails")}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)]">
        <section className="lab-panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="lab-label">{t("builder.label")}</p>
              <h2 className="mt-2 text-2xl font-semibold text-ink-950">
                {editingPlanId ? t("builder.editTitle") : t("builder.createTitle")}
              </h2>
            </div>
            {editingPlanId ? (
              <button
                type="button"
                onClick={() => {
                  resetMessages();
                  resetDraft();
                }}
                className="inline-flex items-center rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
              >
                {t("builder.actions.cancelEdit")}
              </button>
            ) : null}
          </div>

          <p className="mt-3 text-sm leading-6 text-ink-700">
            {t("builder.description")}
          </p>

          {actionError ? (
            <p
              role="alert"
              className="mt-4 rounded-2xl border border-coral-500/25 bg-coral-500/10 px-3 py-2 text-sm text-coral-800"
            >
              {actionError}
            </p>
          ) : null}
          {!actionError && statusMessage ? (
            <p
              role="status"
              className="mt-4 rounded-2xl border border-teal-500/25 bg-teal-500/10 px-3 py-2 text-sm text-teal-800"
            >
              {statusMessage}
            </p>
          ) : null}

          <form className="mt-4 space-y-4" onSubmit={handleSavePlan}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-ink-900">{t("builder.fields.planName")}</span>
              <input
                type="text"
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
                maxLength={80}
                className="w-full rounded-[18px] border border-line bg-paper px-4 py-3 text-sm text-ink-900 outline-none transition focus:border-teal-500"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-ink-900">{t("builder.fields.summary")}</span>
              <textarea
                value={summaryDraft}
                onChange={(event) => setSummaryDraft(event.target.value)}
                maxLength={240}
                rows={3}
                className="w-full rounded-[18px] border border-line bg-paper px-4 py-3 text-sm text-ink-900 outline-none transition focus:border-teal-500"
              />
            </label>

            <div className="rounded-[22px] border border-line bg-paper-strong p-4">
              <p className="text-sm font-semibold text-ink-950">{t("builder.addEntry.title")}</p>
              <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-ink-900">
                    {t("builder.addEntry.catalogItem")}
                  </span>
                  <select
                    value={selectedEntryKey}
                    onChange={(event) => setSelectedEntryKey(event.target.value)}
                    className="w-full rounded-[18px] border border-line bg-paper px-4 py-3 text-sm text-ink-900 outline-none transition focus:border-teal-500"
                  >
                    {catalogOptions.map((option) => (
                      <option key={option.key} value={option.key}>
                        [{getStudyPlanEntryKindLabel(option.kind, translate)}] {option.label} - {option.detail}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={addEntryToDraft}
                  className="inline-flex items-center justify-center self-end rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
                >
                  {t("builder.actions.addEntry")}
                </button>
              </div>

              {entryDrafts.length ? (
                <div className="mt-4 grid gap-3">
                  {entryDrafts.map((entry, index) => {
                    const option = catalogOptionByKey.get(buildStudyPlanEntryKey(entry));

                    if (!option) {
                      return null;
                    }

                    return (
                      <div
                        key={option.key}
                        className="rounded-[20px] border border-line bg-paper p-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-500">
                                {t("builder.entry.step", { step: index + 1 })}
                              </span>
                              <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-500">
                                {getStudyPlanEntryKindLabel(entry.kind, translate)}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-ink-950">{option.label}</p>
                            <p className="text-sm leading-6 text-ink-700">{option.detail}</p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => moveDraftEntry(index, -1)}
                              disabled={index === 0}
                              className="rounded-full border border-line bg-paper-strong px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-700 transition hover:border-ink-950/20 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {t("builder.actions.up")}
                            </button>
                            <button
                              type="button"
                              onClick={() => moveDraftEntry(index, 1)}
                              disabled={index === entryDrafts.length - 1}
                              className="rounded-full border border-line bg-paper-strong px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-700 transition hover:border-ink-950/20 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {t("builder.actions.down")}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setEntryDrafts((current) =>
                                  current.filter((_, currentIndex) => currentIndex !== index),
                                )
                              }
                              className="rounded-full border border-line bg-paper-strong px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-700 transition hover:border-coral-500/35 hover:bg-white"
                            >
                              {t("builder.actions.remove")}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-ink-700">
                  {t("builder.addEntry.empty")}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={pendingAction === "save"}
                className="inline-flex items-center rounded-full bg-ink-950 px-5 py-3 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ color: "var(--paper-strong)" }}
              >
                {pendingAction === "save"
                  ? t("builder.actions.saving")
                  : editingPlanId
                    ? t("builder.actions.saveChanges")
                    : t("builder.actions.savePlan")}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetMessages();
                  resetDraft();
                }}
                className="inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
              >
                {t("builder.actions.resetDraft")}
              </button>
            </div>
          </form>
        </section>

        <section className="lab-panel p-5">
          <p className="lab-label">{t("library.label")}</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink-950">
            {loadingPlans
              ? t("library.loadingTitle")
              : t("library.title", { count: plans.length })}
          </h2>
          <p className="mt-3 text-sm leading-6 text-ink-700">
            {t("library.description")}
          </p>

          {loadError ? (
            <p
              role="alert"
              className="mt-4 rounded-2xl border border-coral-500/25 bg-coral-500/10 px-3 py-2 text-sm text-coral-800"
            >
              {loadError}
            </p>
          ) : null}

          {loadingPlans ? (
            <p className="mt-4 text-sm leading-6 text-ink-700">{t("library.loadingBody")}</p>
          ) : plans.length ? (
            <div className="mt-4 grid gap-3">
              {plans.map((plan) => {
                const progress = progressByPlanId.get(plan.id);
                const updatedAtLabel = formatStudyPlanTimestamp(plan.updatedAt, locale);
                const primaryActionLabel = progress
                  ? getStudyPlanPrimaryActionLabel(progress, translate)
                  : t("actions.openPlan");
                const primaryActionHref =
                  progress?.nextEntry?.primaryAction.href ?? "/account/study-plans";
                const primaryActionNote = progress
                  ? getStudyPlanProgressNote(progress, locale, translate)
                  : t("notes.default");

                return (
                  <article
                    key={plan.id}
                    className="rounded-[22px] border border-line bg-paper-strong p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {progress ? (
                            <span
                              className={[
                                "rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em]",
                                getStudyPlanStatusTone(progress.status),
                              ].join(" ")}
                            >
                              {getStudyPlanStatusLabel(progress.status, translate)}
                            </span>
                          ) : null}
                          <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-500">
                            {t("library.meta.entries", { count: plan.entries.length })}
                          </span>
                          <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-500">
                            {t("library.meta.concepts", { count: plan.conceptCount })}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-ink-950">{plan.title}</h3>
                          <p className="mt-2 text-sm leading-6 text-ink-700">
                            {plan.summary ?? t("library.fallbackSummary")}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink-600">
                      {updatedAtLabel ? (
                        <span className="rounded-full border border-line bg-paper px-3 py-1">
                          {t("library.meta.updated", { date: updatedAtLabel })}
                        </span>
                      ) : null}
                      {progress ? (
                        <span className="rounded-full border border-line bg-paper px-3 py-1">
                          {t("library.meta.entriesComplete", {
                            completed: progress.completedEntryCount,
                            total: progress.totalEntries,
                          })}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {plan.entries.map((entry) => (
                        <span
                          key={entry.key}
                          className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-700"
                        >
                          {getStudyPlanEntryKindLabel(entry.kind, translate)}:{" "}
                          {getStudyPlanEntryDisplayTitle(entry, locale)}
                        </span>
                      ))}
                    </div>

                    {progress ? (
                      <div className="mt-4 rounded-[20px] border border-line bg-paper p-3">
                        <p className="text-sm font-semibold text-ink-950">
                          {t("library.nextActionLabel")}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-ink-700">
                          {primaryActionNote}
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-3">
                      {progress ? (
                        <Link
                          href={primaryActionHref}
                          className="inline-flex items-center rounded-full bg-ink-950 px-4 py-2.5 text-sm font-semibold transition hover:opacity-90"
                          style={{ color: "var(--paper-strong)" }}
                        >
                          {primaryActionLabel}
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => startEditingPlan(plan)}
                        className="inline-flex items-center rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
                      >
                        {t("library.actions.editPlan")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void handleDeletePlan(plan);
                        }}
                        disabled={pendingAction === "delete"}
                        className="inline-flex items-center rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-semibold text-ink-900 transition hover:border-coral-500/35 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {t("library.actions.delete")}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-[22px] border border-line bg-paper-strong p-4">
              <p className="text-sm font-semibold text-ink-950">{t("library.empty.title")}</p>
              <p className="mt-2 text-sm leading-6 text-ink-700">
                {t("library.empty.description")}
              </p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
