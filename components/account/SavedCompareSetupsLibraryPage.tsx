"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { PremiumFeatureNotice } from "@/components/account/PremiumFeatureNotice";
import { ShareLinkButton } from "@/components/share/ShareLinkButton";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { useAccountSession } from "@/lib/account/client";
import type { ConceptSummary } from "@/lib/content";
import {
  getConceptDisplayTitle,
  getSubjectDisplayTitleFromValue,
  getTopicDisplayTitleFromValue,
} from "@/lib/i18n/content";
import {
  deleteSavedCompareSetup,
  markSavedCompareSetupOpened,
  renameSavedCompareSetup,
  syncSavedCompareSetupsNow,
  useSavedCompareSetups,
  useSavedCompareSetupsSyncState,
} from "@/lib/saved-compare-setups-store";
import type {
  SavedCompareSetupRecord,
  SavedCompareSetupSourceType,
} from "@/lib/saved-compare-setups";
import { buildConceptLabHref, conceptShareAnchorIds } from "@/lib/share-links";

type SavedCompareSetupsLibraryPageProps = {
  concepts: Array<Pick<ConceptSummary, "id" | "slug" | "title" | "subject" | "topic">>;
};

function formatSavedCompareTimestamp(timestamp: string | null, locale: string) {
  if (!timestamp) {
    return null;
  }

  const parsed = new Date(timestamp);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function getSavedCompareSyncTone(
  mode: ReturnType<typeof useSavedCompareSetupsSyncState>["mode"],
) {
  switch (mode) {
    case "synced":
      return "border-teal-500/25 bg-teal-500/10 text-teal-700";
    case "syncing":
      return "border-amber-500/30 bg-amber-500/10 text-amber-800";
    case "error":
      return "border-coral-500/30 bg-coral-500/10 text-coral-800";
    default:
      return "border-line bg-paper text-ink-600";
  }
}

function getSavedCompareSyncLabel(
  mode: ReturnType<typeof useSavedCompareSetupsSyncState>["mode"],
  t: ReturnType<typeof useTranslations<"SavedCompareSetupsLibraryPage">>,
) {
  switch (mode) {
    case "synced":
      return t("sync.labels.synced");
    case "syncing":
      return t("sync.labels.syncing");
    case "error":
      return t("sync.labels.retryNeeded");
    default:
      return t("sync.labels.localOnly");
  }
}

function getSavedCompareSourceLabel(
  sourceType: SavedCompareSetupSourceType,
  t: ReturnType<typeof useTranslations<"SavedCompareSetupsLibraryPage">>,
) {
  switch (sourceType) {
    case "preset-derived":
      return t("card.source.presetDerived");
    case "imported-from-link":
      return t("card.source.importedFromLink");
    default:
      return t("card.source.savedHere");
  }
}

function getSavedCompareMergeNote(
  summary: ReturnType<typeof useSavedCompareSetupsSyncState>["lastMergeSummary"],
  t: ReturnType<typeof useTranslations<"SavedCompareSetupsLibraryPage">>,
) {
  if (!summary) {
    return null;
  }

  if (summary.importedLocalSetupCount > 0) {
    return t("sync.merge.importedLocal", {
      count: summary.importedLocalSetupCount,
    });
  }

  if (summary.importedRemoteSetupCount > 0) {
    return t("sync.merge.importedRemote", {
      count: summary.importedRemoteSetupCount,
    });
  }

  if (summary.deletedByTombstoneCount > 0) {
    return t("sync.merge.deletedByTombstone", {
      count: summary.deletedByTombstoneCount,
    });
  }

  if (summary.dedupedDuplicateCount > 0) {
    return t("sync.merge.deduped", {
      count: summary.dedupedDuplicateCount,
    });
  }

  return null;
}

function getSavedCompareSyncDescription(
  mode: ReturnType<typeof useSavedCompareSetupsSyncState>["mode"],
  email: string | undefined,
  t: ReturnType<typeof useTranslations<"SavedCompareSetupsLibraryPage">>,
) {
  const safeEmail = email ?? t("sync.emailFallback");

  switch (mode) {
    case "synced":
      return t("sync.description.synced", { email: safeEmail });
    case "syncing":
      return t("sync.description.syncing", { email: safeEmail });
    case "error":
      return t("sync.description.error");
    default:
      return t("sync.description.localOnly");
  }
}

function SavedCompareSetupCard({
  savedSetup,
  concept,
  locale,
  t,
  renameDraft,
  isEditing,
  onRenameDraftChange,
  onStartRename,
  onRename,
  onCancelRename,
  onDelete,
}: {
  savedSetup: SavedCompareSetupRecord;
  concept: Pick<ConceptSummary, "id" | "slug" | "title" | "subject" | "topic"> | null;
  locale: AppLocale;
  t: ReturnType<typeof useTranslations<"SavedCompareSetupsLibraryPage">>;
  renameDraft: string;
  isEditing: boolean;
  onRenameDraftChange: (value: string) => void;
  onStartRename: () => void;
  onRename: () => void;
  onCancelRename: () => void;
  onDelete: () => void;
}) {
  const openHref = concept
    ? buildConceptLabHref(concept.slug, {
        hash: conceptShareAnchorIds.liveBench,
        stateParam: savedSetup.stateParam,
        publicExperimentParam: savedSetup.publicExperimentParam,
        locale,
      })
    : null;
  const conceptTitle = concept
    ? getConceptDisplayTitle(concept, locale)
    : savedSetup.conceptTitle;
  const subjectTitle = concept
    ? getSubjectDisplayTitleFromValue(concept.subject, locale)
    : null;
  const topicTitle = concept
    ? getTopicDisplayTitleFromValue(concept.topic, locale)
    : null;
  const updatedAtLabel = formatSavedCompareTimestamp(savedSetup.updatedAt, locale);
  const lastOpenedAtLabel = formatSavedCompareTimestamp(savedSetup.lastOpenedAt, locale);
  const metaParts = [
    getSavedCompareSourceLabel(savedSetup.sourceType, t),
    updatedAtLabel ? t("card.meta.updated", { date: updatedAtLabel }) : null,
    lastOpenedAtLabel ? t("card.meta.opened", { date: lastOpenedAtLabel }) : null,
  ].filter((value): value is string => Boolean(value));

  return (
    <article className="rounded-[24px] border border-line bg-paper-strong p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap gap-2">
            {concept ? (
              <>
                <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                  {subjectTitle}
                </span>
                <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                  {topicTitle}
                </span>
              </>
            ) : (
              <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-amber-800">
                {t("card.badges.conceptUnavailable")}
              </span>
            )}
            <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
              {t("card.badges.compare")}
            </span>
          </div>

          <div>
            <p className="text-sm font-semibold text-ink-950">{savedSetup.title}</p>
            <p className="mt-1 text-sm leading-6 text-ink-700">{conceptTitle}</p>
            <p className="mt-1 text-xs leading-5 text-ink-600">
              {t("card.meta.compareLabels", {
                setupA: savedSetup.setupALabel,
                setupB: savedSetup.setupBLabel,
              })}
            </p>
          </div>

          <p className="text-xs leading-5 text-ink-600">{metaParts.join(" | ")}</p>
        </div>

        {!isEditing ? (
          <div className="flex flex-wrap items-center gap-2">
            {openHref ? (
              <Link
                href={openHref}
                onClick={() => {
                  markSavedCompareSetupOpened(savedSetup.id);
                }}
                className="rounded-full border border-line bg-paper px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-800 transition hover:border-ink-950/20 hover:bg-white"
              >
                {t("card.actions.open")}
              </Link>
            ) : null}
            {openHref ? (
              <ShareLinkButton
                href={openHref}
                label={t("card.actions.copyLink")}
                copiedText={t("card.actions.copied")}
                ariaLabel={t("card.actions.copyLinkAria", {
                  title: savedSetup.title,
                })}
                shareTitle={`${savedSetup.title} | ${savedSetup.conceptTitle}`}
                className="rounded-full border border-line bg-paper px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-800 transition hover:border-teal-500/35 hover:bg-white/90"
              />
            ) : null}
            <button
              type="button"
              onClick={onStartRename}
              className="rounded-full border border-line bg-paper px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-800 transition hover:border-teal-500/35 hover:bg-white/90"
            >
              {t("card.actions.rename")}
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-full border border-line bg-paper px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-700 transition hover:border-coral-500/35 hover:bg-white/90"
            >
              {t("card.actions.delete")}
            </button>
          </div>
        ) : null}
      </div>

      {isEditing ? (
        <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <label className="block">
            <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
              {t("card.renameLabel")}
            </span>
            <input
              type="text"
              value={renameDraft}
              onChange={(event) => onRenameDraftChange(event.target.value)}
              maxLength={80}
              className="mt-1.5 w-full rounded-2xl border border-line bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus-visible:border-teal-500 focus-visible:ring-2 focus-visible:ring-teal-500/30"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onRename}
              disabled={renameDraft.trim().length === 0}
              className="inline-flex items-center justify-center rounded-full border border-teal-500/25 bg-teal-500 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:border-line disabled:bg-paper-strong disabled:text-ink-500"
            >
              {t("card.actions.saveName")}
            </button>
            <button
              type="button"
              onClick={onCancelRename}
              className="inline-flex items-center justify-center rounded-full border border-line bg-paper px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-700 transition hover:border-line-dark hover:bg-white/90"
            >
              {t("card.actions.cancel")}
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function SavedCompareSetupsLibraryPage({
  concepts,
}: SavedCompareSetupsLibraryPageProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("SavedCompareSetupsLibraryPage");
  const session = useAccountSession();
  const savedCompareSetups = useSavedCompareSetups();
  const syncState = useSavedCompareSetupsSyncState();
  const canSaveCompareSetups =
    session.entitlement.capabilities.canSaveCompareSetups;
  const canSyncCompareSetups =
    session.status === "signed-in" &&
    session.entitlement.capabilities.canSaveCompareSetups &&
    session.entitlement.capabilities.canSyncProgress;
  const [editingSetupId, setEditingSetupId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const conceptsBySlug = useMemo(
    () => new Map(concepts.map((concept) => [concept.slug, concept])),
    [concepts],
  );
  const syncLabel = getSavedCompareSyncLabel(syncState.mode, t);
  const syncTone = getSavedCompareSyncTone(syncState.mode);
  const syncMergeNote = getSavedCompareMergeNote(syncState.lastMergeSummary, t);
  const lastSyncedAtLabel = formatSavedCompareTimestamp(syncState.lastSyncedAt, locale);

  function clearMessages() {
    setStatusMessage(null);
    setErrorMessage(null);
  }

  if (!session.initialized) {
    return (
      <section className="lab-panel p-5">
        <p className="lab-label">{t("loading.label")}</p>
        <p className="mt-3 text-sm leading-6 text-ink-700">{t("loading.description")}</p>
      </section>
    );
  }

  if (!canSaveCompareSetups) {
    return (
      <section className="space-y-4">
        <PremiumFeatureNotice
          title={t("premium.title")}
          freeDescription={t("premium.freeDescription")}
          description={t("premium.description")}
        />
        <div className="flex flex-wrap gap-3">
          <Link
            href="/start"
            className="inline-flex items-center rounded-full bg-ink-950 px-5 py-3 text-sm font-semibold transition hover:opacity-90"
            style={{ color: "var(--paper-strong)" }}
          >
            {t("premium.actions.startHere")}
          </Link>
          <Link
            href="/concepts"
            className="inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
          >
            {t("premium.actions.browseConcepts")}
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
          >
            {t("premium.actions.searchLibrary")}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="lab-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="lab-label">{t("hero.label")}</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink-950">
              {canSyncCompareSetups ? t("hero.syncedTitle") : t("hero.localTitle")}
            </h2>
            <p className="mt-3 text-sm leading-6 text-ink-700">
              {canSyncCompareSetups
                ? t("hero.syncedDescription")
                : t("hero.localDescription")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/account/setups"
              className="rounded-full border border-line bg-paper px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
            >
              {t("hero.actions.openSavedSetups")}
            </Link>
          </div>
        </div>

        {errorMessage ? (
          <p
            role="alert"
            className="mt-4 rounded-2xl border border-coral-500/25 bg-coral-500/10 px-3 py-2 text-sm text-coral-800"
          >
            {errorMessage}
          </p>
        ) : null}
        {!errorMessage && statusMessage ? (
          <p
            role="status"
            className="mt-4 rounded-2xl border border-teal-500/25 bg-teal-500/10 px-3 py-2 text-sm text-teal-800"
          >
            {statusMessage}
          </p>
        ) : null}

        {canSyncCompareSetups ? (
          <div className="mt-4 rounded-[22px] border border-line bg-paper-strong p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                    {t("sync.statusLabel")}
                  </span>
                  <span
                    className={[
                      "rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
                      syncTone,
                    ].join(" ")}
                  >
                    {syncLabel}
                  </span>
                </div>
                <p className="text-sm leading-6 text-ink-700">
                  {getSavedCompareSyncDescription(syncState.mode, session.user?.email, t)}
                </p>
                {lastSyncedAtLabel ? (
                  <p className="text-xs leading-5 text-ink-600">
                    {t("sync.lastSynced", { date: lastSyncedAtLabel })}
                  </p>
                ) : null}
                {syncMergeNote ? (
                  <p className="text-xs leading-5 text-ink-600">{syncMergeNote}</p>
                ) : null}
                {syncState.errorMessage ? (
                  <p
                    role="alert"
                    className="rounded-2xl border border-coral-500/25 bg-coral-500/10 px-3 py-2 text-sm text-coral-800"
                  >
                    {t("sync.error")}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => {
                  void syncSavedCompareSetupsNow();
                }}
                disabled={syncState.mode === "syncing"}
                className="inline-flex items-center rounded-full border border-line bg-paper px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-900 transition hover:border-ink-950/20 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {syncState.mode === "syncing" ? t("sync.syncing") : t("sync.syncNow")}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {savedCompareSetups.length ? (
        <div className="grid gap-3">
          {savedCompareSetups.map((savedSetup) => {
            const concept = conceptsBySlug.get(savedSetup.conceptSlug) ?? null;

            return (
              <SavedCompareSetupCard
                key={savedSetup.id}
                savedSetup={savedSetup}
                concept={concept}
                locale={locale}
                t={t}
                renameDraft={renameDraft}
                isEditing={editingSetupId === savedSetup.id}
                onRenameDraftChange={setRenameDraft}
                onStartRename={() => {
                  clearMessages();
                  setEditingSetupId(savedSetup.id);
                  setRenameDraft(savedSetup.title);
                }}
                onRename={() => {
                  clearMessages();

                  const renamed = renameSavedCompareSetup(
                    savedSetup.id,
                    renameDraft.trim(),
                  );

                  if (!renamed) {
                    setErrorMessage(t("errors.renameFailed"));
                    return;
                  }

                  setEditingSetupId(null);
                  setRenameDraft("");
                  setStatusMessage(t("status.renamed", { title: renamed.title }));
                }}
                onCancelRename={() => {
                  setEditingSetupId(null);
                  setRenameDraft("");
                  clearMessages();
                }}
                onDelete={() => {
                  clearMessages();

                  const removed = deleteSavedCompareSetup(savedSetup.id);

                  if (!removed) {
                    setErrorMessage(t("errors.removeFailed"));
                    return;
                  }

                  if (editingSetupId === savedSetup.id) {
                    setEditingSetupId(null);
                    setRenameDraft("");
                  }

                  setStatusMessage(
                    canSyncCompareSetups
                      ? t("status.removedSynced", { title: removed.title })
                      : t("status.removedLocal", { title: removed.title }),
                  );
                }}
              />
            );
          })}
        </div>
      ) : (
        <section className="lab-panel p-5">
          <p className="lab-label">{t("empty.label")}</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink-950">
            {t("empty.title")}
          </h2>
          <p className="mt-3 text-sm leading-6 text-ink-700">
            {t("empty.description")}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/start"
              className="inline-flex items-center rounded-full bg-ink-950 px-5 py-3 text-sm font-semibold transition hover:opacity-90"
              style={{ color: "var(--paper-strong)" }}
            >
              {t("empty.actions.startHere")}
            </Link>
            <Link
              href="/concepts"
              className="inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
            >
              {t("empty.actions.browseConcepts")}
            </Link>
            <Link
              href="/search"
              className="inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
            >
              {t("empty.actions.searchLibrary")}
            </Link>
          </div>
        </section>
      )}
    </section>
  );
}
