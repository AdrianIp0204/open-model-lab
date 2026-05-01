"use client";

import { useLocale } from "next-intl";
import { useMemo, useState } from "react";
import {
  MAX_SAVED_COMPARE_SETUPS_PER_CONCEPT,
  type SavedCompareSetupState,
  type SavedCompareSetupRecord,
} from "@/lib/account/compare-setups";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { addLocalePrefix } from "@/i18n/routing";
import { useAccountSession } from "@/lib/account/client";
import { PremiumFeatureNotice } from "@/components/account/PremiumFeatureNotice";
import {
  buildSavedCompareSetupPublicExperimentCard,
} from "@/lib/account/compare-setup-recovery";
import {
  buildSavedCompareSetupFingerprint,
  getSavedCompareSetupSourceLabel,
} from "@/lib/saved-compare-setups";
import {
  deleteSavedCompareSetup,
  findSavedCompareSetupByFingerprint,
  markSavedCompareSetupOpened,
  renameSavedCompareSetup,
  saveSavedCompareSetup,
  useSavedCompareSetups,
  useSavedCompareSetupsSyncState,
} from "@/lib/saved-compare-setups-store";
import {
  buildConceptLabHref,
  buildConceptSimulationStateLinkPayload,
  conceptShareAnchorIds,
  type ConceptSimulationStateSource,
  type ShareableConceptSimulationState,
} from "@/lib/share-links";
import { ShareLinkButton } from "@/components/share/ShareLinkButton";

type SavedCompareSetupsCardProps = {
  concept: {
    id: string;
    slug: string;
    title: string;
  };
  simulationSource: ConceptSimulationStateSource;
  compare: {
    activeTarget: "a" | "b";
    setupA: SavedCompareSetupState;
    setupB: SavedCompareSetupState;
  };
  activeGraphId: string | null;
  overlayValues: Record<string, boolean>;
  onRestore: (setup: SavedCompareSetupRecord) => void;
};

function formatSavedCompareTimestamp(timestamp: string | null) {
  if (!timestamp) {
    return null;
  }

  const value = new Date(timestamp);

  if (Number.isNaN(value.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function getCompareSyncTone(
  mode: ReturnType<typeof useSavedCompareSetupsSyncState>["mode"],
) {
  switch (mode) {
    case "synced":
      return "border-teal-500/25 bg-teal-500/10 text-teal-700";
    case "syncing":
      return "border-amber-500/25 bg-amber-500/10 text-amber-700";
    case "error":
      return "border-coral-500/25 bg-coral-500/10 text-coral-700";
    default:
      return "border-line bg-paper text-ink-600";
  }
}

function getCompareSyncLabel(
  mode: ReturnType<typeof useSavedCompareSetupsSyncState>["mode"],
) {
  switch (mode) {
    case "synced":
      return "Synced";
    case "syncing":
      return "Syncing";
    case "error":
      return "Retry needed";
    default:
      return "Local-only";
  }
}

function buildCurrentCompareState(
  simulationSource: ConceptSimulationStateSource,
  compare: SavedCompareSetupsCardProps["compare"],
  activeGraphId: string | null,
  overlayValues: Record<string, boolean>,
): ShareableConceptSimulationState {
  const activeSetup =
    compare.activeTarget === "a" ? compare.setupA : compare.setupB;
  const focusedOverlayId =
    (simulationSource.simulation.overlays ?? []).find(
      (overlay) => overlayValues[overlay.id],
    )?.id ??
    simulationSource.simulation.overlays?.[0]?.id ??
    null;

  return {
    params: { ...activeSetup.params },
    activePresetId: activeSetup.activePresetId,
    activeGraphId,
    overlayValues: { ...overlayValues },
    focusedOverlayId,
    time: 0,
    timeSource: "live",
    compare: {
      activeTarget: compare.activeTarget,
      setupA: {
        label: compare.setupA.label,
        params: { ...compare.setupA.params },
        activePresetId: compare.setupA.activePresetId,
      },
      setupB: {
        label: compare.setupB.label,
        params: { ...compare.setupB.params },
        activePresetId: compare.setupB.activePresetId,
      },
    },
  };
}

function buildUniqueCompareSetupTitle(
  baseTitle: string,
  existingItems: SavedCompareSetupRecord[],
) {
  const normalizedBaseTitle = baseTitle.trim() || "Compare scene";
  const existingTitleKeys = new Set(
    existingItems.map((item) => item.title.trim().toLowerCase()),
  );

  if (!existingTitleKeys.has(normalizedBaseTitle.toLowerCase())) {
    return normalizedBaseTitle;
  }

  let suffix = 2;

  while (existingTitleKeys.has(`${normalizedBaseTitle} ${suffix}`.toLowerCase())) {
    suffix += 1;
  }

  return `${normalizedBaseTitle} ${suffix}`;
}

export function SavedCompareSetupsCard({
  concept,
  simulationSource,
  compare,
  activeGraphId,
  overlayValues,
  onRestore,
}: SavedCompareSetupsCardProps) {
  const session = useAccountSession();
  const locale = useLocale() as AppLocale;
  const compareSyncState = useSavedCompareSetupsSyncState();
  const allSavedCompareSetups = useSavedCompareSetups();
  const canSaveCompareSetups =
    session.entitlement.capabilities.canSaveCompareSetups;
  const canSyncCompareSetups =
    session.status === "signed-in" &&
    session.entitlement.capabilities.canSaveCompareSetups &&
    session.entitlement.capabilities.canSyncProgress;
  const signedIn = session.status === "signed-in";
  const premiumLocked = signedIn && !canSaveCompareSetups;
  const [draftTitle, setDraftTitle] = useState("");
  const [editingSetupId, setEditingSetupId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const conceptSavedCompareSetups = useMemo(
    () =>
      allSavedCompareSetups.filter((item) => item.conceptSlug === concept.slug),
    [allSavedCompareSetups, concept.slug],
  );
  const currentCompareState = useMemo(
    () =>
      buildCurrentCompareState(
        simulationSource,
        compare,
        activeGraphId,
        overlayValues,
      ),
    [activeGraphId, compare, overlayValues, simulationSource],
  );
  const currentCompareLinkPayload = useMemo(
    () =>
      buildConceptSimulationStateLinkPayload({
        source: simulationSource,
        conceptSlug: concept.slug,
        state: currentCompareState,
        hash: conceptShareAnchorIds.liveBench,
        publicExperimentCard: {
          conceptSlug: concept.slug,
          title: `${compare.setupA.label} vs ${compare.setupB.label}`,
          prompt: buildSavedCompareSetupPublicExperimentCard({
            conceptSlug: concept.slug,
            title: `${compare.setupA.label} vs ${compare.setupB.label}`,
            setupALabel: compare.setupA.label,
            setupBLabel: compare.setupB.label,
            publicExperimentParam: null,
          }).prompt,
          kind: "saved-compare",
        },
      }),
    [compare.setupA.label, compare.setupB.label, concept.slug, currentCompareState, simulationSource],
  );
  const currentCompareFingerprint = currentCompareLinkPayload.stateParam
    ? buildSavedCompareSetupFingerprint({
        conceptSlug: concept.slug,
        stateParam: currentCompareLinkPayload.stateParam,
      })
    : null;
  const currentSavedCompareSetup = findSavedCompareSetupByFingerprint(
    conceptSavedCompareSetups,
    currentCompareFingerprint,
  );

  function clearMessages() {
    setStatusMessage(null);
    setErrorMessage(null);
  }

  function handleSaveCurrentCompareSetup() {
    if (!currentCompareLinkPayload.stateParam) {
      return;
    }

    clearMessages();

    try {
      const result = saveSavedCompareSetup({
        conceptId: concept.id,
        conceptSlug: concept.slug,
        conceptTitle: concept.title,
        title: buildUniqueCompareSetupTitle(
          draftTitle.trim() || `${compare.setupA.label} vs ${compare.setupB.label}`,
          conceptSavedCompareSetups,
        ),
        stateParam: currentCompareLinkPayload.stateParam,
        publicExperimentParam: currentCompareLinkPayload.publicExperimentParam,
        setupALabel: compare.setupA.label,
        setupBLabel: compare.setupB.label,
        sourceType: "manual",
      });

      setDraftTitle(result.savedSetup.title);
      setEditingSetupId(null);
      setStatusMessage(
        result.status === "created"
          ? canSyncCompareSetups
            ? `Saved "${result.savedSetup.title}" locally. Account sync will carry it to the compare library next.`
            : `Saved "${result.savedSetup.title}" on this browser.`
          : `"${result.savedSetup.title}" is already saved in this compare library.`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Saved compare setup could not be stored.",
      );
    }
  }

  function handleRenameSetup(setup: SavedCompareSetupRecord, title: string) {
    clearMessages();

    try {
      const renamed = renameSavedCompareSetup(setup.id, title.trim());

      if (!renamed) {
        throw new Error("Saved compare setup could not be renamed.");
      }

      setEditingSetupId(null);
      setDraftTitle("");
      setStatusMessage(`Renamed "${renamed.title}".`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Saved compare setup could not be renamed.",
      );
    }
  }

  function handleDeleteSetup(setup: SavedCompareSetupRecord) {
    clearMessages();

    try {
      const removed = deleteSavedCompareSetup(setup.id);

      if (!removed) {
        throw new Error("Saved compare setup could not be deleted.");
      }

      if (editingSetupId === setup.id) {
        setEditingSetupId(null);
        setDraftTitle("");
      }

      setStatusMessage(
        canSyncCompareSetups
          ? `Removed "${removed.title}". Account sync will carry that compare-library delete next.`
          : `Removed "${removed.title}" from this browser.`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Saved compare setup could not be deleted.",
      );
    }
  }

  function renderSavedCompareSetupCard(setup: SavedCompareSetupRecord) {
    const openHref = buildConceptLabHref(concept.slug, {
      hash: conceptShareAnchorIds.liveBench,
      stateParam: setup.stateParam,
      publicExperimentParam: setup.publicExperimentParam,
      locale,
    });
    const isEditing = editingSetupId === setup.id;

    return (
      <article
        key={setup.id}
        className="rounded-[18px] border border-line bg-paper-strong px-3 py-3"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-950">{setup.title}</p>
            <p className="mt-1 text-xs leading-5 text-ink-600">
              {setup.setupALabel} vs {setup.setupBLabel}
            </p>
            <p className="mt-1 text-xs leading-5 text-ink-500">
              {getSavedCompareSetupSourceLabel(setup.sourceType)}
              {formatSavedCompareTimestamp(setup.updatedAt)
                ? ` | Updated ${formatSavedCompareTimestamp(setup.updatedAt)}`
                : ""}
              {formatSavedCompareTimestamp(setup.lastOpenedAt)
                ? ` | Opened ${formatSavedCompareTimestamp(setup.lastOpenedAt)}`
                : ""}
            </p>
          </div>

          {!isEditing ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  clearMessages();
                  markSavedCompareSetupOpened(setup.id);
                  setDraftTitle(setup.title);
                  setEditingSetupId(null);
                  setStatusMessage(`Restored "${setup.title}".`);
                  onRestore(setup);
                }}
                className="rounded-full border border-line bg-white px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-800 transition hover:border-teal-500/35 hover:bg-white/90"
              >
                Restore
              </button>
              <Link
                href={openHref}
                onClick={() => {
                  markSavedCompareSetupOpened(setup.id);
                }}
                className="rounded-full border border-line bg-white px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-800 transition hover:border-teal-500/35 hover:bg-white/90"
              >
                Open
              </Link>
              <ShareLinkButton
                href={openHref}
                label="Copy compare link"
                ariaLabel={`Copy ${setup.title} compare link`}
                shareTitle={`${setup.title} | ${concept.title}`}
                className="rounded-full border border-line bg-white px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-800 transition hover:border-ink-950/20 hover:bg-white/90"
              />
              <button
                type="button"
                onClick={() => {
                  clearMessages();
                  setEditingSetupId(setup.id);
                  setDraftTitle(setup.title);
                }}
                className="rounded-full border border-line bg-white px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-800 transition hover:border-teal-500/35 hover:bg-white/90"
              >
                Rename
              </button>
              <button
                type="button"
                onClick={() => handleDeleteSetup(setup)}
                className="rounded-full border border-line bg-white px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-700 transition hover:border-coral-500/35 hover:bg-white/90"
              >
                Delete
              </button>
            </div>
          ) : null}
        </div>

        {isEditing ? (
          <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <label className="block">
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                Compare setup name
              </span>
              <input
                type="text"
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                maxLength={80}
                className="mt-1.5 w-full rounded-2xl border border-line bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus-visible:border-teal-500 focus-visible:ring-2 focus-visible:ring-teal-500/30"
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleRenameSetup(setup, draftTitle)}
                disabled={draftTitle.trim().length === 0}
                className="inline-flex items-center justify-center rounded-full border border-teal-500/25 bg-teal-500 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:border-line disabled:bg-paper-strong disabled:text-ink-500"
              >
                Save name
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingSetupId(null);
                  setDraftTitle("");
                  clearMessages();
                }}
                className="inline-flex items-center justify-center rounded-full border border-line bg-paper px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-700 transition hover:border-line-dark hover:bg-white/90"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </article>
    );
  }

  const syncLabel = getCompareSyncLabel(compareSyncState.mode);
  const syncTone = getCompareSyncTone(compareSyncState.mode);
  const savedCompareLibraryHref = addLocalePrefix("/account/compare-setups", locale);

  return (
    <section className="rounded-[20px] border border-line bg-paper px-3.5 py-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
        <div>
          <p className="lab-label">Saved compare setups</p>
          <p className="mt-1 text-sm leading-6 text-ink-700">
            Save named A/B scenes for {concept.title} so the same compare bench can be reopened,
            synced, and shared later.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canSaveCompareSetups ? (
            <span
              className={[
                "rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
                syncTone,
              ].join(" ")}
            >
              {syncLabel}
            </span>
          ) : null}
          <span
            className={[
              "rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
              signedIn && canSaveCompareSetups
                ? "border-teal-500/25 bg-teal-500/10 text-teal-700"
                : "border-amber-500/25 bg-amber-500/10 text-amber-800",
            ].join(" ")}
          >
            {signedIn ? (canSaveCompareSetups ? "Supporter" : "Supporter only") : "Sign in"}
          </span>
        </div>
      </div>

      {!signedIn ? (
        <PremiumFeatureNotice
          className="mt-3"
          title="Saved compare setups"
          freeDescription="Compare mode still works live while you are signed out."
          description="Supporter saves named A/B scenes so you can reopen the same compare bench later, sync it across supported browsers, and keep its exact-state link inside the product."
        />
      ) : premiumLocked ? (
        <PremiumFeatureNotice
          className="mt-3"
          title="Saved compare setups"
          freeDescription="Compare mode still works right here."
          description="Supporter keeps named compare benches in a local-first library, syncs them across supported browsers, and reopens them through the same exact-state setup-link seam."
        />
      ) : (
        <div className="mt-3 space-y-3">
          <div className="rounded-[18px] border border-line bg-paper-strong px-3.5 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-950">
                  Current compare scene
                </p>
                <p className="mt-1 text-xs leading-5 text-ink-700">
                  {compare.setupA.label} vs {compare.setupB.label}
                </p>
                <p className="mt-1 text-xs leading-5 text-ink-600">
                  {currentSavedCompareSetup
                    ? canSyncCompareSetups
                      ? "This exact A/B scene is already in your synced compare library."
                      : "This exact A/B scene is already saved on this browser."
                    : "Save the current A/B scene exactly as it appears now. Copy the live compare link from the share panel below the bench when you want to send it elsewhere."}
                </p>
              </div>
              <Link
                href={savedCompareLibraryHref}
                className="rounded-full border border-line bg-white px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-800 transition hover:border-ink-950/20 hover:bg-white/90"
              >
                Open compare library
              </Link>
            </div>

            {currentSavedCompareSetup ? (
              <div className="mt-3 rounded-[18px] border border-teal-500/25 bg-teal-500/10 px-3.5 py-3">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                  Current saved compare scene
                </p>
                <p className="mt-1 text-sm font-semibold text-ink-950">
                  {currentSavedCompareSetup.title}
                </p>
                <p className="mt-1 text-xs leading-5 text-ink-700">
                  {getSavedCompareSetupSourceLabel(currentSavedCompareSetup.sourceType)}
                  {formatSavedCompareTimestamp(currentSavedCompareSetup.updatedAt)
                    ? ` | Updated ${formatSavedCompareTimestamp(currentSavedCompareSetup.updatedAt)}`
                    : ""}
                </p>
              </div>
            ) : (
              <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <label className="block">
                  <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                    Compare setup name
                  </span>
                  <input
                    type="text"
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    placeholder={`${compare.setupA.label} vs ${compare.setupB.label}`}
                    maxLength={80}
                    className="mt-1.5 w-full rounded-2xl border border-line bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus-visible:border-teal-500 focus-visible:ring-2 focus-visible:ring-teal-500/30"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleSaveCurrentCompareSetup}
                  disabled={!currentCompareLinkPayload.stateParam}
                  className="inline-flex items-center justify-center rounded-full border border-teal-500/25 bg-teal-500 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:border-line disabled:bg-paper-strong disabled:text-ink-500"
                >
                  Save compare setup
                </button>
              </div>
            )}
          </div>

          <p className="text-xs leading-5 text-ink-600">
            Save up to {MAX_SAVED_COMPARE_SETUPS_PER_CONCEPT} compare setups per concept on one
            library. Exact duplicate compare scenes collapse into the same saved item instead of
            creating noisy copies.
          </p>

          {errorMessage ? (
            <p
              role="alert"
              className="rounded-2xl border border-coral-500/25 bg-coral-500/10 px-3 py-2 text-sm text-coral-800"
            >
              {errorMessage}
            </p>
          ) : null}
          {!errorMessage && statusMessage ? (
            <p
              role="status"
              className="rounded-2xl border border-teal-500/25 bg-teal-500/10 px-3 py-2 text-sm text-teal-800"
            >
              {statusMessage}
            </p>
          ) : null}

          {conceptSavedCompareSetups.length ? (
            <div className="grid max-h-72 gap-2 overflow-y-auto pr-1">
              {conceptSavedCompareSetups.map(renderSavedCompareSetupCard)}
            </div>
          ) : (
            <p className="text-sm leading-6 text-ink-700">
              No saved compare setups yet for this concept.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

