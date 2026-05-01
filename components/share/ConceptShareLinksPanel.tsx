"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { PremiumFeatureNotice } from "@/components/account/PremiumFeatureNotice";
import { useConceptPageRuntimeSnapshot } from "@/components/concepts/ConceptLearningBridge";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { ConceptPageFeaturedSetup } from "@/lib/content";
import { useAccountSession } from "@/lib/account/client";
import { getConceptDisplayTitle } from "@/lib/i18n/content";
import {
  buildSavedSetupFingerprint,
  type SavedSetupRecord,
  type SavedSetupSourceType,
} from "@/lib/saved-setups";
import {
  deleteSavedSetup,
  renameSavedSetup,
  saveSavedSetup,
  useSavedSetups,
  useSavedSetupsSyncState,
} from "@/lib/saved-setups-store";
import type { ResolvedPublicExperimentCard } from "@/lib/share-links";
import type {
  ConceptFeaturedSetupLinkTarget,
  ConceptSimulationStateSource,
  ShareLinkTarget,
} from "@/lib/share-links";
import {
  buildConceptFeaturedSetupTargets,
  buildConceptLabHref,
  buildConceptTryThisShareTargets,
  conceptShareAnchorIds,
  resolveConceptSimulationSharePayloadFromHref,
  summarizeConceptSimulationState,
} from "@/lib/share-links";
import { ShareLinkButton } from "./ShareLinkButton";

type ConceptShareLinksPanelProps = {
  conceptId: string;
  conceptTitle: string;
  conceptSlug: string;
  simulationSource: ConceptSimulationStateSource;
  featuredSetups?: readonly ConceptPageFeaturedSetup[];
  publicExperimentCard?: ResolvedPublicExperimentCard | null;
  setupLinkState?: "none" | "restored" | "invalid";
  restoredStateParam?: string | null;
  restoredExperimentParam?: string | null;
  items: ShareLinkTarget[];
  title?: string;
  description?: string;
  variant?: "default" | "compact";
  className?: string;
};

const SAVED_SETUPS_LIBRARY_HREF = "/account/setups";
const SAVED_COMPARE_SETUPS_LIBRARY_HREF = "/account/compare-setups";

function renderLinkButtons(
  items: ShareLinkTarget[],
  conceptTitle: string,
  compact: boolean,
) {
  return items.map((item) => (
    <ShareLinkButton
      key={item.id}
      href={item.href}
      label={item.label}
      shareLabel={item.shareLabel}
      shareTitle={item.shareTitle ?? conceptTitle}
      preferWebShare={item.preferWebShare ?? false}
      copiedText={item.copiedText ?? "Copied"}
      sharedText={item.sharedText ?? "Shared"}
      ariaLabel={item.ariaLabel ?? `Copy ${item.label.toLowerCase()} link`}
      className={
        compact
          ? "inline-flex items-center justify-center rounded-full border border-line bg-paper-strong px-3 py-1.5 text-xs font-semibold text-ink-700 transition hover:border-teal-500/35 hover:bg-white/90"
          : "inline-flex items-center justify-center rounded-full border border-line bg-paper-strong px-3 py-1.5 text-sm font-semibold text-ink-700 transition hover:border-teal-500/35 hover:bg-white/90"
      }
    />
  ));
}

function translateStableShareItem(
  item: ShareLinkTarget,
  t: ReturnType<typeof useTranslations<"ConceptShareLinksPanel">>,
) {
  switch (item.id) {
    case "concept-page":
      return {
        ...item,
        label: t("links.conceptPage"),
        shareLabel: t("actions.shareConceptPage"),
        ariaLabel: t("aria.copyConceptPageLink"),
        copiedText: t("feedback.copiedConceptPageLink"),
        sharedText: t("feedback.sharedConceptPage"),
      };
    case "interactive-lab":
      return {
        ...item,
        label: t("links.interactiveLab"),
        shareLabel: t("actions.shareInteractiveLab"),
        ariaLabel: t("aria.copyInteractiveLabLink"),
        copiedText: t("feedback.copiedInteractiveLabLink"),
        sharedText: t("feedback.sharedInteractiveLab"),
      };
    case "challenge-mode":
      return {
        ...item,
        label: t("links.challengeMode"),
        shareLabel: t("actions.shareChallengeMode"),
        ariaLabel: t("aria.copyChallengeModeLink"),
        copiedText: t("feedback.copiedChallengeModeLink"),
        sharedText: t("feedback.sharedChallengeMode"),
      };
    case "workedExamples":
      return {
        ...item,
        label: t("links.workedExamples"),
        shareLabel: t("actions.shareWorkedExamples"),
        ariaLabel: t("aria.copyWorkedExamplesLink"),
        copiedText: t("feedback.copiedWorkedExamplesLink"),
        sharedText: t("feedback.sharedWorkedExamples"),
      };
    case "quickTest":
      return {
        ...item,
        label: t("links.quickTest"),
        shareLabel: t("actions.shareQuickTest"),
        ariaLabel: t("aria.copyQuickTestLink"),
        copiedText: t("feedback.copiedQuickTestLink"),
        sharedText: t("feedback.sharedQuickTest"),
      };
    case "readNext":
      return {
        ...item,
        label: t("links.readNext"),
        shareLabel: t("actions.shareReadNext"),
        ariaLabel: t("aria.copyReadNextLink"),
        copiedText: t("feedback.copiedReadNextLink"),
        sharedText: t("feedback.sharedReadNext"),
      };
    default:
      return item;
  }
}

function formatSavedSetupTimestamp(timestamp: string | null, locale: AppLocale) {
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

function buildBaseSavedSetupTitle({
  publicExperimentCard,
  summaryLabel,
  summaryKind,
}: {
  publicExperimentCard: ResolvedPublicExperimentCard | null;
  summaryLabel: string;
  summaryKind: "default" | "preset" | "modified" | "compare";
}) {
  if (publicExperimentCard?.title) {
    return publicExperimentCard.title;
  }

  if (summaryKind === "preset") {
    return summaryLabel.replace(/\s+preset$/iu, "");
  }

  return summaryLabel;
}

function buildUniqueSavedSetupTitle(
  baseTitle: string,
  existingItems: SavedSetupRecord[],
  fallbackTitle: string,
) {
  const normalizedBaseTitle = baseTitle.trim() || fallbackTitle.trim();
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

function SetupStateNotice({
  label,
  description,
  compact,
  actionHref,
}: {
  label: string;
  description: string;
  compact: boolean;
  actionHref: string | null;
}) {
  const t = useTranslations("ConceptShareLinksPanel");

  return (
    <div className="rounded-[18px] border border-line bg-paper px-3.5 py-3">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
        {t("sections.currentBench")}
      </p>
      <p className="mt-1 text-sm font-semibold text-ink-900">{label}</p>
      <p className={compact ? "mt-1 text-xs leading-5 text-ink-700" : "mt-1 text-sm leading-6 text-ink-700"}>
        {description}
      </p>
      {actionHref ? (
        <Link
          href={actionHref}
          className="mt-3 inline-flex items-center rounded-full border border-line bg-paper-strong px-3 py-1.5 text-xs font-semibold text-ink-700 transition hover:border-ink-950/20 hover:bg-white"
        >
          {t("actions.openDefaultBench")}
        </Link>
      ) : null}
    </div>
  );
}

function FeaturedSetupLinks({
  targets,
}: {
  targets: ConceptFeaturedSetupLinkTarget[];
}) {
  const t = useTranslations("ConceptShareLinksPanel");

  if (!targets.length) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
        {t("sections.featuredSetups")}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {targets.map((target) => (
          <Link
            key={target.id}
            href={target.href}
            className="rounded-[18px] border border-line bg-paper px-3.5 py-3 transition hover:border-ink-950/20 hover:bg-white"
          >
            <p className="text-sm font-semibold text-ink-900">{target.label}</p>
            <p className="mt-1 text-xs leading-5 text-ink-700">{target.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function CurrentSavedSetupCard({
  savedSetup,
  compact,
  eyebrow,
  detailPrefix,
  renameDraft,
  onRenameDraftChange,
  onStartRename,
  onRename,
  onCancelRename,
  onDelete,
  isEditing,
}: {
  savedSetup: SavedSetupRecord;
  compact: boolean;
  eyebrow: string;
  detailPrefix: string | null;
  renameDraft: string;
  onRenameDraftChange: (value: string) => void;
  onStartRename: () => void;
  onRename: () => void;
  onCancelRename: () => void;
  onDelete: () => void;
  isEditing: boolean;
}) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("ConceptShareLinksPanel");
  const updatedAtLabel = formatSavedSetupTimestamp(savedSetup.updatedAt, locale);
  const openedAtLabel = formatSavedSetupTimestamp(savedSetup.lastOpenedAt, locale);
  const sourceLabel =
    savedSetup.sourceType === "imported-from-link"
      ? t("savedSetups.sourceTypes.importedFromLink")
      : savedSetup.sourceType === "preset-derived"
        ? t("savedSetups.sourceTypes.presetDerived")
        : t("savedSetups.sourceTypes.manual");

  return (
    <div className="rounded-[18px] border border-teal-500/25 bg-teal-500/10 px-3.5 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
            {eyebrow}
          </p>
          <p className="mt-1 text-sm font-semibold text-ink-950">{savedSetup.title}</p>
          <p className={compact ? "mt-1 text-xs leading-5 text-ink-700" : "mt-1 text-sm leading-6 text-ink-700"}>
            {detailPrefix ?? sourceLabel}
            {updatedAtLabel ? ` | ${t("savedSetups.updatedAt", { date: updatedAtLabel })}` : ""}
            {openedAtLabel ? ` | ${t("savedSetups.openedAt", { date: openedAtLabel })}` : ""}
          </p>
        </div>
        {!isEditing ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onStartRename}
              className="rounded-full border border-line bg-paper px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-800 transition hover:border-teal-500/35 hover:bg-white/90"
            >
              {t("actions.rename")}
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-full border border-line bg-paper px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-700 transition hover:border-coral-500/35 hover:bg-white/90"
            >
              {t("actions.delete")}
            </button>
            <Link
              href={SAVED_SETUPS_LIBRARY_HREF}
              className="rounded-full border border-line bg-paper px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-800 transition hover:border-ink-950/20 hover:bg-white"
            >
              {t("actions.openSavedSetups")}
            </Link>
          </div>
        ) : null}
      </div>
      {isEditing ? (
        <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <label className="block">
            <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
              {t("fields.savedSetupName")}
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
              {t("actions.saveName")}
            </button>
            <button
              type="button"
              onClick={onCancelRename}
              className="inline-flex items-center justify-center rounded-full border border-line bg-paper px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-700 transition hover:border-line-dark hover:bg-white/90"
            >
              {t("actions.cancel")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function buildCurrentSavedSetupSourceType(input: {
  restoredStateStillCurrent: boolean;
  currentStateKind: "default" | "preset" | "modified" | "compare";
}): SavedSetupSourceType {
  if (input.restoredStateStillCurrent) {
    return "imported-from-link";
  }

  if (input.currentStateKind === "preset") {
    return "preset-derived";
  }

  return "manual";
}

function stripPresetSuffix(label: string) {
  return label.replace(/\s+preset$/iu, "");
}

export function ConceptShareLinksPanel({
  conceptId,
  conceptTitle,
  conceptSlug,
  simulationSource,
  featuredSetups = [],
  publicExperimentCard = null,
  setupLinkState = "none",
  restoredStateParam = null,
  restoredExperimentParam = null,
  items,
  title = "Try this setup",
  description = "Jump to a named bench state or copy the one you are looking at now. Shared links reopen the same controls, graph, overlays, and compare context.",
  variant = "default",
  className,
}: ConceptShareLinksPanelProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("ConceptShareLinksPanel");
  const session = useAccountSession();
  const runtimeSnapshot = useConceptPageRuntimeSnapshot();
  const savedSetups = useSavedSetups();
  const savedSetupsSyncState = useSavedSetupsSyncState();
  const canShareStateLinks = session.entitlement.capabilities.canShareStateLinks;
  const canSaveSetups = session.entitlement.capabilities.canSaveCompareSetups;
  const canSyncSavedSetups =
    session.status === "signed-in" &&
    session.entitlement.capabilities.canSaveCompareSetups &&
    session.entitlement.capabilities.canSyncProgress;
  const sessionLoading = !session.initialized;
  const showCombinedPremiumNotice =
    !sessionLoading && !canSaveSetups && !canShareStateLinks;
  const compact = variant === "compact";
  const displayConceptTitle = getConceptDisplayTitle(
    { slug: conceptSlug, title: conceptTitle },
    locale,
  );
  const resolvedTitle = title === "Try this setup" ? t("title") : title;
  const resolvedDescription =
    description ===
    "Jump to a named bench state or copy the one you are looking at now. Shared links reopen the same controls, graph, overlays, and compare context."
      ? t("description")
      : description;
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingSavedSetupId, setEditingSavedSetupId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  const featuredSetupTargets = useMemo(
    () =>
      buildConceptFeaturedSetupTargets({
        source: simulationSource,
        conceptSlug,
        setups: featuredSetups,
      }),
    [conceptSlug, featuredSetups, simulationSource],
  );
  const tryThisItems = useMemo(() => {
    if (!runtimeSnapshot) {
      return [];
    }

    return buildConceptTryThisShareTargets({
      source: simulationSource,
      conceptSlug,
      conceptTitle,
      locale,
      state: {
        params: runtimeSnapshot.params,
        activePresetId: runtimeSnapshot.activePresetId,
        activeGraphId: runtimeSnapshot.activeGraphId,
        overlayValues: runtimeSnapshot.overlayValues,
        focusedOverlayId: runtimeSnapshot.focusedOverlayId,
        time: runtimeSnapshot.time,
        timeSource: runtimeSnapshot.timeSource,
        compare: runtimeSnapshot.compare ?? null,
      },
    });
  }, [conceptSlug, conceptTitle, locale, runtimeSnapshot, simulationSource]);
  const currentStateSummary = useMemo(() => {
    if (!runtimeSnapshot) {
      return null;
    }

    return summarizeConceptSimulationState(simulationSource, {
      params: runtimeSnapshot.params,
      activePresetId: runtimeSnapshot.activePresetId,
      activeGraphId: runtimeSnapshot.activeGraphId,
      overlayValues: runtimeSnapshot.overlayValues,
      focusedOverlayId: runtimeSnapshot.focusedOverlayId,
      time: runtimeSnapshot.time,
      timeSource: runtimeSnapshot.timeSource,
      compare: runtimeSnapshot.compare ?? null,
    });
  }, [runtimeSnapshot, simulationSource]);
  const isCompareScene = Boolean(runtimeSnapshot?.compare);
  const resetHref = buildConceptLabHref(conceptSlug, {
    hash: conceptShareAnchorIds.interactiveLab,
    locale,
  });
  const showResetLink = Boolean(
    runtimeSnapshot &&
      (setupLinkState !== "none" || (currentStateSummary && currentStateSummary.kind !== "default")),
  );
  const shouldShowStateNotice = Boolean(
    currentStateSummary &&
      (setupLinkState !== "none" || currentStateSummary.kind !== "default"),
  );
  const setupLinkNotice =
    setupLinkState === "invalid"
      ? t("notices.invalidSetupLink")
      : setupLinkState === "restored"
        ? t("notices.restoredSetupLink")
        : null;
  const translatedCurrentStateSummary = currentStateSummary
    ? {
        ...currentStateSummary,
        label:
          currentStateSummary.kind === "default"
            ? t("state.defaultBench")
            : currentStateSummary.kind === "preset"
              ? t("state.presetBench", {
                  title: stripPresetSuffix(currentStateSummary.label),
                })
              : currentStateSummary.kind === "modified"
                ? t("state.customSetup")
                : currentStateSummary.label,
        description:
          currentStateSummary.kind === "compare"
            ? t("state.compareDescription")
            : currentStateSummary.kind === "default"
              ? t("state.defaultDescription")
              : currentStateSummary.kind === "preset"
                ? t("state.presetDescription")
                : t("state.customDescription"),
      }
    : null;
  const exactStateDescription =
    runtimeSnapshot?.compare
      ? t("descriptions.copyCompareSetup")
      : t("descriptions.copyCurrentSetup");
  const translatedTryThisItems = tryThisItems.map((item) => {
    switch (item.id) {
      case "try-this-compare":
        return {
          ...item,
          buttonLabel: t("actions.copyCompareSetup"),
          shareLabel: t("actions.shareCompareSetup"),
          ariaLabel: t("aria.copyCompareSetupLink"),
          copiedText: t("feedback.copiedCompareSetupLink"),
          sharedText: t("feedback.sharedCompareSetup"),
        };
      case "try-this-setup-a":
        return {
          ...item,
          buttonLabel: t("actions.copySetupA"),
          shareLabel: t("actions.shareSetupA"),
          ariaLabel: t("aria.copySetupALink"),
          copiedText: t("feedback.copiedSetupALink"),
          sharedText: t("feedback.sharedSetupA"),
        };
      case "try-this-setup-b":
        return {
          ...item,
          buttonLabel: t("actions.copySetupB"),
          shareLabel: t("actions.shareSetupB"),
          ariaLabel: t("aria.copySetupBLink"),
          copiedText: t("feedback.copiedSetupBLink"),
          sharedText: t("feedback.sharedSetupB"),
        };
      case "try-this-setup":
        return {
          ...item,
          label:
            translatedCurrentStateSummary?.kind === "default"
              ? t("links.defaultLiveBench")
              : translatedCurrentStateSummary?.kind === "preset"
                ? t("links.presetSetup")
                : t("links.currentSetup"),
          buttonLabel:
            translatedCurrentStateSummary?.kind === "default"
              ? t("actions.copyDefaultSetup")
              : translatedCurrentStateSummary?.kind === "preset"
                ? t("actions.copyPresetSetup")
                : t("actions.copyCurrentSetup"),
          shareLabel:
            translatedCurrentStateSummary?.kind === "default"
              ? t("actions.shareDefaultSetup")
              : translatedCurrentStateSummary?.kind === "preset"
                ? t("actions.sharePresetSetup")
                : t("actions.shareCurrentSetup"),
          ariaLabel:
            translatedCurrentStateSummary?.kind === "default"
              ? t("aria.copyDefaultSetupLink")
              : translatedCurrentStateSummary?.kind === "preset"
                ? t("aria.copyPresetSetupLink")
                : t("aria.copyCurrentSetupLink"),
          copiedText:
            translatedCurrentStateSummary?.kind === "default"
              ? t("feedback.copiedDefaultSetupLink")
              : translatedCurrentStateSummary?.kind === "preset"
                ? t("feedback.copiedPresetSetupLink")
                : t("feedback.copiedCurrentSetupLink"),
          sharedText:
            translatedCurrentStateSummary?.kind === "default"
              ? t("feedback.sharedDefaultSetup")
              : translatedCurrentStateSummary?.kind === "preset"
                ? t("feedback.sharedPresetSetup")
                : t("feedback.sharedCurrentSetup"),
        };
      default:
        return item;
    }
  });
  const translatedStableItems = items.map((item) => translateStableShareItem(item, t));
  const [primaryTryThisItem, ...secondaryTryThisItems] = translatedTryThisItems;
  const currentSharePayload = primaryTryThisItem
    ? resolveConceptSimulationSharePayloadFromHref(primaryTryThisItem.href)
    : {
        stateParam: null,
        publicExperimentParam: null,
      };
  const restoredStateStillCurrent = Boolean(
    (restoredStateParam && currentSharePayload.stateParam === restoredStateParam) ||
      (!restoredStateParam &&
        restoredExperimentParam &&
        currentSharePayload.publicExperimentParam === restoredExperimentParam),
  );
  const effectivePublicExperimentCard =
    restoredStateStillCurrent && publicExperimentCard ? publicExperimentCard : null;
  const currentSavedSetupFingerprint =
    runtimeSnapshot && primaryTryThisItem
      ? buildSavedSetupFingerprint({
          conceptSlug,
          stateParam: currentSharePayload.stateParam,
        })
      : null;
  const conceptSavedSetups = useMemo(
    () => savedSetups.filter((item) => item.conceptSlug === conceptSlug),
    [conceptSlug, savedSetups],
  );
  const currentSavedSetup =
    currentSavedSetupFingerprint
      ? conceptSavedSetups.find(
          (item) => buildSavedSetupFingerprint(item) === currentSavedSetupFingerprint,
        ) ?? null
      : null;
  const currentSavedSetupEyebrow = canSyncSavedSetups
    ? savedSetupsSyncState.mode === "synced"
      ? t("savedSetups.accountSaved")
      : savedSetupsSyncState.mode === "syncing"
        ? t("savedSetups.syncingToAccount")
        : savedSetupsSyncState.mode === "error"
          ? t("savedSetups.savedLocallyWhileSyncRetries")
          : t("savedSetups.savedLocallyFirst")
    : t("savedSetups.savedOnThisBrowser");
  const currentSavedSetupDetailPrefix = canSyncSavedSetups
    ? savedSetupsSyncState.mode === "synced"
      ? t("savedSetups.syncedToAccount")
      : savedSetupsSyncState.mode === "error"
        ? t("savedSetups.savedLocally")
        : t("savedSetups.readyToSync")
    : null;

  function clearMessages() {
    setStatusMessage(null);
    setErrorMessage(null);
  }

  function handleSaveCurrentSetup() {
    if (!runtimeSnapshot || !currentStateSummary || isCompareScene) {
      return;
    }

    clearMessages();

    try {
      const baseTitle = buildBaseSavedSetupTitle({
        publicExperimentCard: effectivePublicExperimentCard,
        summaryLabel:
          translatedCurrentStateSummary?.label ?? currentStateSummary.label,
        summaryKind: currentStateSummary.kind,
      });
      const result = saveSavedSetup({
        conceptId,
        conceptSlug,
        conceptTitle,
        title: buildUniqueSavedSetupTitle(
          baseTitle,
          conceptSavedSetups,
          t("savedSetups.defaultTitle"),
        ),
        stateParam: currentSharePayload.stateParam,
        publicExperimentParam:
          restoredStateStillCurrent && restoredExperimentParam
            ? restoredExperimentParam
            : currentSharePayload.publicExperimentParam,
        sourceType: buildCurrentSavedSetupSourceType({
          restoredStateStillCurrent,
          currentStateKind: currentStateSummary.kind,
        }),
      });

      setStatusMessage(
        result.status === "existing"
          ? t("status.alreadySaved", {
              title: result.savedSetup.title,
              destination: canSyncSavedSetups
                ? t("savedSetups.libraryDestination")
                : t("savedSetups.browserDestination"),
            })
          : canSyncSavedSetups
            ? t("status.savedLocallyForSync", { title: result.savedSetup.title })
            : t("status.savedOnBrowser", { title: result.savedSetup.title }),
      );
      setEditingSavedSetupId(null);
      setRenameDraft("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : canSyncSavedSetups
            ? t("errors.saveBeforeSync")
            : t("errors.saveOnBrowser"),
      );
    }
  }

  function handleRenameCurrentSavedSetup() {
    if (!currentSavedSetup) {
      return;
    }

    clearMessages();

    try {
      const renamed = renameSavedSetup(currentSavedSetup.id, renameDraft.trim());

      if (!renamed) {
        throw new Error(t("errors.rename"));
      }

      setEditingSavedSetupId(null);
      setRenameDraft("");
      setStatusMessage(t("status.renamed", { title: renamed.title }));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("errors.rename"),
      );
    }
  }

  function handleDeleteCurrentSavedSetup() {
    if (!currentSavedSetup) {
      return;
    }

    clearMessages();

    try {
      const removed = deleteSavedSetup(currentSavedSetup.id);

      if (!removed) {
        throw new Error(t("errors.remove"));
      }

      setEditingSavedSetupId(null);
      setRenameDraft("");
      setStatusMessage(
        canSyncSavedSetups
          ? t("status.removedForSync", { title: removed.title })
          : t("status.removedOnBrowser", { title: removed.title }),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("errors.remove"),
      );
    }
  }

  function startRenameCurrentSavedSetup() {
    if (!currentSavedSetup) {
      return;
    }

    clearMessages();
    setEditingSavedSetupId(currentSavedSetup.id);
    setRenameDraft(currentSavedSetup.title);
  }

  return (
    <section
      className={[
        compact ? "rounded-[20px] border border-line bg-paper-strong/90 p-4" : "lab-panel p-4 sm:p-5",
        className ?? "",
      ].join(" ")}
    >
      <div className="space-y-2">
        <p className="lab-label">{resolvedTitle}</p>
        <p className={compact ? "max-w-2xl text-sm leading-5 text-ink-700" : "max-w-2xl text-sm leading-6 text-ink-700"}>
          {resolvedDescription}
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {setupLinkNotice ? (
          <div className="rounded-[18px] border border-amber-500/30 bg-amber-500/10 px-3.5 py-3 text-sm leading-6 text-ink-800">
            {setupLinkNotice}
          </div>
        ) : null}

        {currentStateSummary && shouldShowStateNotice ? (
          <SetupStateNotice
            label={translatedCurrentStateSummary?.label ?? currentStateSummary.label}
            description={translatedCurrentStateSummary?.description ?? currentStateSummary.description}
            compact={compact}
            actionHref={showResetLink ? resetHref : null}
          />
        ) : null}

        <FeaturedSetupLinks targets={featuredSetupTargets} />
      </div>

      {runtimeSnapshot ? (
        <div className="mt-4 border-t border-line pt-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                {isCompareScene ? t("sections.savedCompareSetups") : t("sections.savedSetups")}
              </p>
              <p className={compact ? "max-w-2xl text-sm leading-5 text-ink-700" : "max-w-2xl text-sm leading-6 text-ink-700"}>
                {isCompareScene
                  ? canSaveSetups
                    ? t("descriptions.compareModePremium")
                    : t("descriptions.compareModeFree")
                  : canSaveSetups
                    ? canSyncSavedSetups
                      ? t("descriptions.savedSetupsAccount")
                      : t("descriptions.savedSetupsLocal")
                    : t("descriptions.savedSetupsPremium")}
              </p>
            </div>

            {canSaveSetups && !isCompareScene && !currentSavedSetup ? (
              <button
                type="button"
                onClick={handleSaveCurrentSetup}
                className={
                  compact
                    ? "inline-flex items-center justify-center rounded-full border border-line bg-paper px-3.5 py-2 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
                    : "inline-flex items-center justify-center rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
                }
              >
                {t("actions.saveSetup")}
              </button>
            ) : null}
          </div>

          <div className="mt-3 space-y-3">
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

            {sessionLoading ? (
              <div className="rounded-[18px] border border-line bg-paper px-3.5 py-3">
                <p className="text-sm font-semibold text-ink-900">{t("loading.savedSetupAccessTitle")}</p>
                <p className={compact ? "mt-1 text-xs leading-5 text-ink-700" : "mt-1 text-sm leading-6 text-ink-700"}>
                  {t("loading.savedSetupAccessDescription")}
                </p>
              </div>
            ) : isCompareScene ? (
              <div className="rounded-[18px] border border-line bg-paper px-3.5 py-3">
                <p className="text-sm font-semibold text-ink-900">
                  {t("compare.title")}
                </p>
                <p className={compact ? "mt-1 text-xs leading-5 text-ink-700" : "mt-1 text-sm leading-6 text-ink-700"}>
                  {t("compare.description")}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link
                    href={SAVED_COMPARE_SETUPS_LIBRARY_HREF}
                    className="rounded-full border border-line bg-paper-strong px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-800 transition hover:border-ink-950/20 hover:bg-white"
                  >
                    {t("actions.openCompareLibrary")}
                  </Link>
                  <Link
                    href={SAVED_SETUPS_LIBRARY_HREF}
                    className="rounded-full border border-line bg-paper-strong px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-800 transition hover:border-ink-950/20 hover:bg-white"
                  >
                    {t("actions.openSavedSetups")}
                  </Link>
                </div>
              </div>
            ) : canSaveSetups ? (
              currentSavedSetup ? (
                <CurrentSavedSetupCard
                  savedSetup={currentSavedSetup}
                  compact={compact}
                  eyebrow={currentSavedSetupEyebrow}
                  detailPrefix={currentSavedSetupDetailPrefix}
                  renameDraft={renameDraft}
                  onRenameDraftChange={setRenameDraft}
                  onStartRename={startRenameCurrentSavedSetup}
                  onRename={handleRenameCurrentSavedSetup}
                  onCancelRename={() => {
                    setEditingSavedSetupId(null);
                    setRenameDraft("");
                    clearMessages();
                  }}
                  onDelete={handleDeleteCurrentSavedSetup}
                  isEditing={editingSavedSetupId === currentSavedSetup.id}
                />
              ) : (
                <div className="rounded-[18px] border border-line bg-paper px-3.5 py-3">
                  <p className="text-sm font-semibold text-ink-900">{t("empty.noSavedSetupTitle")}</p>
                  <p className={compact ? "mt-1 text-xs leading-5 text-ink-700" : "mt-1 text-sm leading-6 text-ink-700"}>
                    {conceptSavedSetups.length
                      ? t("empty.savedSetupsExist", {
                          count: conceptSavedSetups.length,
                          concept: displayConceptTitle,
                        })
                      : canSyncSavedSetups
                        ? t("empty.noSavedSetupsAccount", { concept: displayConceptTitle })
                        : t("empty.noSavedSetupsLocal", { concept: displayConceptTitle })}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link
                      href={SAVED_SETUPS_LIBRARY_HREF}
                      className="rounded-full border border-line bg-paper-strong px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-800 transition hover:border-ink-950/20 hover:bg-white"
                    >
                      {t("actions.openSavedSetups")}
                    </Link>
                  </div>
                </div>
              )
            ) : (
              <PremiumFeatureNotice
                className="mt-0"
                title={
                  showCombinedPremiumNotice
                    ? t("premium.savedSetupsAndExactLinksTitle")
                    : t("premium.savedSetupsTitle")
                }
                freeDescription={t("premium.stableLinksFreeDescription")}
                description={
                  showCombinedPremiumNotice
                    ? t("premium.savedSetupsAndExactLinksDescription")
                    : t("premium.savedSetupsDescription")
                }
              />
            )}
          </div>
        </div>
      ) : null}

      {runtimeSnapshot ? (
        <div className="mt-4 border-t border-line pt-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                {t("sections.copyCurrentSetup")}
              </p>
              <p className={compact ? "max-w-2xl text-sm leading-5 text-ink-700" : "max-w-2xl text-sm leading-6 text-ink-700"}>
                {canShareStateLinks
                  ? exactStateDescription
                  : t("descriptions.exactStateSharingLocked")}
              </p>
            </div>

            {canShareStateLinks && primaryTryThisItem ? (
              <ShareLinkButton
                href={primaryTryThisItem.href}
                label={primaryTryThisItem.buttonLabel ?? primaryTryThisItem.label}
                shareLabel={primaryTryThisItem.shareLabel}
                shareTitle={primaryTryThisItem.shareTitle ?? displayConceptTitle}
                preferWebShare={primaryTryThisItem.preferWebShare ?? true}
                copiedText={primaryTryThisItem.copiedText ?? "Copied"}
                sharedText={primaryTryThisItem.sharedText ?? "Shared"}
                ariaLabel={primaryTryThisItem.ariaLabel ?? t("aria.copyCurrentSetupLink")}
                className={
                  compact
                    ? "inline-flex items-center justify-center rounded-full border border-line bg-paper px-3.5 py-2 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
                    : "inline-flex items-center justify-center rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
                }
              />
            ) : null}
          </div>

          {canShareStateLinks ? (
            secondaryTryThisItems.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {renderLinkButtons(secondaryTryThisItems, displayConceptTitle, compact)}
              </div>
            ) : null
          ) : canSaveSetups ? (
            <PremiumFeatureNotice
              className="mt-3"
              title={t("premium.exactStateSharingTitle")}
              freeDescription={t("premium.stableLinksFreeDescription")}
              description={t("premium.exactStateSharingDescription")}
            />
          ) : null}
        </div>
      ) : null}

      {translatedStableItems.length ? (
        <div className="mt-4 border-t border-line pt-3">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
            {t("sections.stableLinks")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {renderLinkButtons(translatedStableItems, displayConceptTitle, compact)}
          </div>
        </div>
      ) : null}
    </section>
  );
}
