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
  type StudyPlanCatalogFacet,
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
  getConceptProgressSummary,
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

type CatalogKindFilter = "all" | SavedStudyPlanEntryRecord["kind"];
type CatalogProgressFilter = "all" | "recent" | "recommended";

type StudyPlanCatalogOptionProgress = {
  lastActivityAt: string | null;
  hasRecentActivity: boolean;
  recommendedConceptCount: number;
  completedConceptCount: number;
  totalConceptCount: number;
};

type StudyPlanCatalogOptionWithProgress = StudyPlanCatalogOption & {
  catalogIndex: number;
  progress: StudyPlanCatalogOptionProgress;
};

function getLatestTimestamp(values: Array<string | null>) {
  const timestamps = values.filter((value): value is string => Boolean(value));

  if (!timestamps.length) {
    return null;
  }

  return timestamps.reduce((latest, value) => (value > latest ? value : latest), timestamps[0]);
}

function getUniqueCatalogFacets(
  options: StudyPlanCatalogOption[],
  facetKey: "subjectFacets" | "topicFacets",
  locale: AppLocale,
) {
  const facetByKey = new Map<string, StudyPlanCatalogFacet>();

  for (const option of options) {
    for (const facet of option[facetKey]) {
      if (!facetByKey.has(facet.key)) {
        facetByKey.set(facet.key, facet);
      }
    }
  }

  return Array.from(facetByKey.values()).sort((left, right) =>
    left.label.localeCompare(right.label, locale, { sensitivity: "base" }),
  );
}

function formatFacetLabels(facets: StudyPlanCatalogFacet[]) {
  return facets.map((facet) => facet.label).join(", ");
}

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
  const [catalogSearchQuery, setCatalogSearchQuery] = useState("");
  const [catalogKindFilter, setCatalogKindFilter] = useState<CatalogKindFilter>("all");
  const [catalogSubjectFilter, setCatalogSubjectFilter] = useState("all");
  const [catalogTopicFilter, setCatalogTopicFilter] = useState("all");
  const [catalogProgressFilter, setCatalogProgressFilter] =
    useState<CatalogProgressFilter>("all");
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
  const conceptBySlug = useMemo(
    () => new Map(concepts.map((concept) => [concept.slug, concept])),
    [concepts],
  );
  const catalogOptionsWithProgress = useMemo<StudyPlanCatalogOptionWithProgress[]>(
    () =>
      catalogOptions.map((option, catalogIndex) => {
        const conceptProgress = option.conceptSlugs
          .map((slug) => {
            const concept = conceptBySlug.get(slug);

            return concept ? getConceptProgressSummary(progressSnapshot, concept) : null;
          })
          .filter((summary): summary is NonNullable<typeof summary> => summary !== null);
        const lastActivityAt = getLatestTimestamp(
          conceptProgress.map((summary) => summary.lastActivityAt),
        );
        const recommendedConceptCount = conceptProgress.filter(
          (summary) =>
            summary.isUnfinished ||
            summary.mastery.state === "shaky" ||
            (summary.record?.quickTestLastIncorrectCount ?? 0) > 0,
        ).length;

        return {
          ...option,
          catalogIndex,
          progress: {
            lastActivityAt,
            hasRecentActivity: Boolean(lastActivityAt),
            recommendedConceptCount,
            completedConceptCount: conceptProgress.filter(
              (summary) => summary.status === "completed",
            ).length,
            totalConceptCount: conceptProgress.length || option.conceptCount,
          },
        };
      }),
    [catalogOptions, conceptBySlug, progressSnapshot],
  );
  const catalogSubjectOptions = useMemo(
    () => getUniqueCatalogFacets(catalogOptions, "subjectFacets", locale),
    [catalogOptions, locale],
  );
  const catalogTopicOptions = useMemo(
    () => getUniqueCatalogFacets(catalogOptions, "topicFacets", locale),
    [catalogOptions, locale],
  );
  const filteredCatalogOptions = useMemo(() => {
    const queryTerms = catalogSearchQuery
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    return catalogOptionsWithProgress
      .filter((option) => {
        if (catalogKindFilter !== "all" && option.kind !== catalogKindFilter) {
          return false;
        }

        if (
          catalogSubjectFilter !== "all" &&
          !option.subjectFacets.some((facet) => facet.key === catalogSubjectFilter)
        ) {
          return false;
        }

        if (
          catalogTopicFilter !== "all" &&
          !option.topicFacets.some((facet) => facet.key === catalogTopicFilter)
        ) {
          return false;
        }

        if (catalogProgressFilter === "recent" && !option.progress.hasRecentActivity) {
          return false;
        }

        if (
          catalogProgressFilter === "recommended" &&
          option.progress.recommendedConceptCount === 0
        ) {
          return false;
        }

        return queryTerms.every((term) => option.searchText.includes(term));
      })
      .sort((left, right) => {
        if (catalogProgressFilter !== "all") {
          const leftActivity = left.progress.lastActivityAt ?? "";
          const rightActivity = right.progress.lastActivityAt ?? "";

          if (leftActivity !== rightActivity) {
            return rightActivity.localeCompare(leftActivity);
          }

          if (left.progress.recommendedConceptCount !== right.progress.recommendedConceptCount) {
            return right.progress.recommendedConceptCount - left.progress.recommendedConceptCount;
          }
        }

        return left.catalogIndex - right.catalogIndex;
      });
  }, [
    catalogKindFilter,
    catalogOptionsWithProgress,
    catalogProgressFilter,
    catalogSearchQuery,
    catalogSubjectFilter,
    catalogTopicFilter,
  ]);
  const selectedCatalogOption =
    filteredCatalogOptions.find((option) => option.key === selectedEntryKey) ?? null;
  const draftedCatalogOptions = useMemo(
    () =>
      entryDrafts
        .map((entry) => catalogOptionByKey.get(buildStudyPlanEntryKey(entry)))
        .filter((option): option is StudyPlanCatalogOption => Boolean(option)),
    [catalogOptionByKey, entryDrafts],
  );
  const draftRouteSummary = useMemo(() => {
    const conceptSlugs = new Set<string>();
    let estimatedStudyMinutes = 0;

    for (const option of draftedCatalogOptions) {
      estimatedStudyMinutes += option.estimatedStudyMinutes;
      option.conceptSlugs.forEach((slug) => conceptSlugs.add(slug));
    }

    return {
      conceptCount: conceptSlugs.size,
      estimatedStudyMinutes,
    };
  }, [draftedCatalogOptions]);
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
    if (!filteredCatalogOptions.length) {
      if (selectedEntryKey) {
        setSelectedEntryKey("");
      }

      return;
    }

    if (!selectedEntryKey || !filteredCatalogOptions.some((option) => option.key === selectedEntryKey)) {
      setSelectedEntryKey(filteredCatalogOptions[0]?.key ?? "");
    }
  }, [filteredCatalogOptions, selectedEntryKey]);

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

  function getCatalogProgressLabel(option: StudyPlanCatalogOptionWithProgress) {
    if (option.progress.recommendedConceptCount > 0) {
      return t("catalog.progress.recommended", {
        count: option.progress.recommendedConceptCount,
      });
    }

    if (option.progress.hasRecentActivity) {
      return t("catalog.progress.recent");
    }

    return null;
  }

  function selectCatalogOption(optionKey: string) {
    resetMessages();
    setSelectedEntryKey(optionKey);
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
    const selectedOption = selectedCatalogOption;

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
    resetMessages();
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

  function removeDraftEntry(index: number) {
    resetMessages();
    setEntryDrafts((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    );
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

  const visibleCatalogResults = filteredCatalogOptions.slice(0, 10);

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

            <div
              className="rounded-[22px] border border-line bg-paper-strong p-4"
              data-testid="study-plan-picker"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink-950">
                    {t("builder.addEntry.title")}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-ink-600">
                    {t("builder.addEntry.description")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addEntryToDraft}
                  disabled={!selectedCatalogOption}
                  className="inline-flex items-center justify-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("builder.actions.addEntry")}
                </button>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_repeat(4,minmax(0,0.8fr))]">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-ink-900">
                    {t("builder.addEntry.search")}
                  </span>
                  <input
                    data-testid="study-plan-picker-search"
                    type="search"
                    value={catalogSearchQuery}
                    onChange={(event) => setCatalogSearchQuery(event.target.value)}
                    placeholder={t("builder.addEntry.searchPlaceholder")}
                    className="w-full rounded-[18px] border border-line bg-paper px-4 py-3 text-sm text-ink-900 outline-none transition focus:border-teal-500"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-ink-900">
                    {t("builder.addEntry.itemType")}
                  </span>
                  <select
                    data-testid="study-plan-picker-kind-filter"
                    value={catalogKindFilter}
                    onChange={(event) =>
                      setCatalogKindFilter(event.target.value as CatalogKindFilter)
                    }
                    className="w-full rounded-[18px] border border-line bg-paper px-4 py-3 text-sm text-ink-900 outline-none transition focus:border-teal-500"
                  >
                    <option value="all">{t("catalog.filters.allTypes")}</option>
                    <option value="concept">{t("entryKinds.concept")}</option>
                    <option value="track">{t("entryKinds.track")}</option>
                    <option value="guided-collection">{t("entryKinds.guidedCollection")}</option>
                    <option value="goal-path">{t("entryKinds.goalPath")}</option>
                  </select>
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-ink-900">
                    {t("builder.addEntry.subject")}
                  </span>
                  <select
                    data-testid="study-plan-picker-subject-filter"
                    value={catalogSubjectFilter}
                    onChange={(event) => setCatalogSubjectFilter(event.target.value)}
                    className="w-full rounded-[18px] border border-line bg-paper px-4 py-3 text-sm text-ink-900 outline-none transition focus:border-teal-500"
                  >
                    <option value="all">{t("catalog.filters.allSubjects")}</option>
                    {catalogSubjectOptions.map((facet) => (
                      <option key={facet.key} value={facet.key}>
                        {facet.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-ink-900">
                    {t("builder.addEntry.topic")}
                  </span>
                  <select
                    data-testid="study-plan-picker-topic-filter"
                    value={catalogTopicFilter}
                    onChange={(event) => setCatalogTopicFilter(event.target.value)}
                    className="w-full rounded-[18px] border border-line bg-paper px-4 py-3 text-sm text-ink-900 outline-none transition focus:border-teal-500"
                  >
                    <option value="all">{t("catalog.filters.allTopics")}</option>
                    {catalogTopicOptions.map((facet) => (
                      <option key={facet.key} value={facet.key}>
                        {facet.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-ink-900">
                    {t("builder.addEntry.progress")}
                  </span>
                  <select
                    data-testid="study-plan-picker-progress-filter"
                    value={catalogProgressFilter}
                    onChange={(event) =>
                      setCatalogProgressFilter(event.target.value as CatalogProgressFilter)
                    }
                    className="w-full rounded-[18px] border border-line bg-paper px-4 py-3 text-sm text-ink-900 outline-none transition focus:border-teal-500"
                  >
                    <option value="all">{t("catalog.filters.allProgress")}</option>
                    <option value="recent">{t("catalog.filters.recent")}</option>
                    <option value="recommended">{t("catalog.filters.recommended")}</option>
                  </select>
                </label>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(15rem,0.92fr)]">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
                      {t("catalog.resultsLabel")}
                    </p>
                    <p className="text-xs text-ink-600" aria-live="polite">
                      {t("catalog.resultCount", {
                        shown: visibleCatalogResults.length,
                        total: filteredCatalogOptions.length,
                      })}
                    </p>
                  </div>

                  {visibleCatalogResults.length ? (
                    <div
                      className="mt-2 grid max-h-[26rem] gap-2 overflow-y-auto pr-1"
                      role="list"
                      aria-label={t("catalog.resultsLabel")}
                      data-testid="study-plan-picker-results"
                    >
                      {visibleCatalogResults.map((option) => {
                        const isSelected = option.key === selectedEntryKey;
                        const progressLabel = getCatalogProgressLabel(option);

                        return (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => selectCatalogOption(option.key)}
                            aria-pressed={isSelected}
                            aria-label={t("builder.actions.chooseEntry", {
                              title: option.label,
                            })}
                            data-testid={`study-plan-picker-option-${option.key}`}
                            className={[
                              "w-full rounded-[18px] border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-teal-500",
                              isSelected
                                ? "border-teal-500 bg-teal-500/10"
                                : "border-line bg-paper hover:border-ink-950/20 hover:bg-white",
                            ].join(" ")}
                          >
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-500">
                                {getStudyPlanEntryKindLabel(option.kind, translate)}
                              </span>
                              {progressLabel ? (
                                <span className="rounded-full border border-teal-500/25 bg-teal-500/10 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-teal-700">
                                  {progressLabel}
                                </span>
                              ) : null}
                            </span>
                            <span className="mt-2 block text-sm font-semibold text-ink-950">
                              {option.label}
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-ink-700">
                              {option.detail}
                            </span>
                            <span className="mt-2 flex flex-wrap gap-2 text-[0.7rem] text-ink-600">
                              {option.subjectFacets.length ? (
                                <span>
                                  {t("catalog.meta.subjects", {
                                    subjects: formatFacetLabels(option.subjectFacets),
                                  })}
                                </span>
                              ) : null}
                              {option.topicFacets.length ? (
                                <span>
                                  {t("catalog.meta.topics", {
                                    topics: formatFacetLabels(option.topicFacets),
                                  })}
                                </span>
                              ) : null}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p
                      className="mt-3 rounded-[18px] border border-line bg-paper px-3 py-3 text-sm leading-6 text-ink-700"
                      data-testid="study-plan-picker-empty"
                    >
                      {t("catalog.noResults")}
                    </p>
                  )}
                </div>

                <div
                  className="rounded-[20px] border border-line bg-paper p-4"
                  data-testid="study-plan-selected-item-preview"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
                    {t("builder.selectedItem.title")}
                  </p>
                  {selectedCatalogOption ? (
                    <div className="mt-3 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-500">
                          {getStudyPlanEntryKindLabel(selectedCatalogOption.kind, translate)}
                        </span>
                        {getCatalogProgressLabel(selectedCatalogOption) ? (
                          <span className="rounded-full border border-teal-500/25 bg-teal-500/10 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-teal-700">
                            {getCatalogProgressLabel(selectedCatalogOption)}
                          </span>
                        ) : null}
                      </div>
                      <div>
                        <p className="text-base font-semibold text-ink-950">
                          {selectedCatalogOption.label}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-ink-700">
                          {selectedCatalogOption.detail}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-ink-600">
                        <span className="rounded-full border border-line bg-paper-strong px-3 py-1">
                          {t("catalog.meta.coverage", {
                            completed: selectedCatalogOption.progress.completedConceptCount,
                            total: selectedCatalogOption.progress.totalConceptCount,
                          })}
                        </span>
                        <span className="rounded-full border border-line bg-paper-strong px-3 py-1">
                          {t("catalog.meta.minutes", {
                            minutes: selectedCatalogOption.estimatedStudyMinutes,
                          })}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-ink-700">
                      {t("builder.selectedItem.empty")}
                    </p>
                  )}
                </div>
              </div>

              <div
                className="mt-4 rounded-[20px] border border-line bg-paper p-4"
                data-testid="study-plan-selected-route-preview"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink-950">
                      {t("builder.routePreview.title")}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-ink-700">
                      {entryDrafts.length
                        ? t("builder.routePreview.summary", {
                            items: entryDrafts.length,
                            concepts: draftRouteSummary.conceptCount,
                            minutes: draftRouteSummary.estimatedStudyMinutes,
                          })
                        : t("builder.addEntry.empty")}
                    </p>
                  </div>
                </div>

                {entryDrafts.length ? (
                  <ol className="mt-4 grid gap-3" data-testid="study-plan-selected-route">
                    {entryDrafts.map((entry, index) => {
                      const option = catalogOptionByKey.get(buildStudyPlanEntryKey(entry));

                      if (!option) {
                        return null;
                      }

                      return (
                        <li
                          key={option.key}
                          className="rounded-[18px] border border-line bg-paper-strong p-3"
                          data-testid={`study-plan-route-entry-${option.key}`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-500">
                                  {t("builder.entry.step", { step: index + 1 })}
                                </span>
                                <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-500">
                                  {getStudyPlanEntryKindLabel(entry.kind, translate)}
                                </span>
                              </div>
                              <p className="break-words text-sm font-semibold text-ink-950">
                                {option.label}
                              </p>
                              <p className="text-sm leading-6 text-ink-700">{option.detail}</p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => moveDraftEntry(index, -1)}
                                disabled={index === 0}
                                aria-label={t("builder.actions.moveUpAria", {
                                  title: option.label,
                                })}
                                className="rounded-full border border-line bg-paper px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-700 transition hover:border-ink-950/20 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {t("builder.actions.up")}
                              </button>
                              <button
                                type="button"
                                onClick={() => moveDraftEntry(index, 1)}
                                disabled={index === entryDrafts.length - 1}
                                aria-label={t("builder.actions.moveDownAria", {
                                  title: option.label,
                                })}
                                className="rounded-full border border-line bg-paper px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-700 transition hover:border-ink-950/20 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {t("builder.actions.down")}
                              </button>
                              <button
                                type="button"
                                onClick={() => removeDraftEntry(index)}
                                aria-label={t("builder.actions.removeAria", {
                                  title: option.label,
                                })}
                                className="rounded-full border border-line bg-paper px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-700 transition hover:border-coral-500/35 hover:bg-white"
                              >
                                {t("builder.actions.remove")}
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                ) : null}
              </div>
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
