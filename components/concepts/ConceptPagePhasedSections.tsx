"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { WorkedExampleAccessMode } from "@/lib/account/entitlements";
import {
  getDefaultConceptLearningPhaseId,
  conceptLearningPhaseQueryParam,
  parseConceptLearningPhaseId,
  resolveInitialConceptLearningPhaseId,
  resolveConceptLearningPhases,
  type ConceptLearningPhaseId,
  type ResolvedConceptLearningPhase,
} from "@/lib/content/concept-learning-phases";
import {
  resolveConceptPageGuidance,
  type ResolvedConceptPageGuidanceHint,
} from "@/lib/content/concept-page-guidance";
import type { ResolvedConceptPageSection } from "@/lib/content/concept-page-framework";
import type { ReadNextRecommendation } from "@/lib/content/read-next";
import type { ConceptContent } from "@/lib/content/schema";
import { conceptShareAnchorIds, getConceptSectionAnchorId } from "@/lib/share-links";
import {
  addPageSectionNavigationIntentListener,
  emitPageSectionLocationChange,
  scrollToPageSection,
} from "@/components/layout/page-section-nav";
import {
  ConceptPagePhaseProvider,
  getConceptPageBenchSupportTargetId,
} from "./ConceptPagePhaseContext";
import { RichMathText } from "./MathFormula";
import { ConceptPageSections } from "./ConceptPageSections";

type ConceptPagePhasedSectionsProps = {
  concept: ConceptContent;
  readNext: ReadNextRecommendation[];
  sections: ResolvedConceptPageSection[];
  workedExampleMode?: WorkedExampleAccessMode;
  liveLabContent?: ReactNode;
  supportRail?: ReactNode;
  afterPhasedSections?: ReactNode;
  phaseOwnedAnchorIds?: Partial<Record<ConceptLearningPhaseId, readonly string[]>>;
};

const conceptLearningPhasePresentation = {
  explore: {
    tabActive:
      "border-teal-600 bg-[linear-gradient(180deg,rgba(20,184,166,0.16)_0%,rgba(255,255,255,0.98)_100%)] text-ink-950 shadow-[0_10px_24px_rgba(13,148,136,0.16)]",
    tabInactive:
      "border-line bg-white/78 text-ink-800 hover:border-teal-500/30 hover:bg-white",
    stepBadge: "border-teal-500/25 bg-teal-500/10 text-teal-700",
    countBadge: "border-teal-500/20 bg-teal-500/8 text-teal-700",
    panel:
      "border-teal-500/25 bg-[linear-gradient(180deg,rgba(20,184,166,0.08)_0%,rgba(255,255,255,0.96)_22%,rgba(255,255,255,0.99)_100%)]",
    summary:
      "border-teal-500/20 bg-[linear-gradient(135deg,rgba(20,184,166,0.12)_0%,rgba(14,165,233,0.08)_52%,rgba(255,255,255,0.92)_100%)]",
    accent:
      "bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.18),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.12),transparent_32%)]",
    chip: "border-teal-500/20 bg-white/82 text-teal-700",
    contentWrapper: "mx-auto w-full max-w-5xl",
  },
  understand: {
    tabActive:
      "border-sky-600 bg-[linear-gradient(180deg,rgba(14,165,233,0.16)_0%,rgba(255,255,255,0.98)_100%)] text-ink-950 shadow-[0_10px_24px_rgba(14,165,233,0.16)]",
    tabInactive:
      "border-line bg-white/78 text-ink-800 hover:border-sky-500/30 hover:bg-white",
    stepBadge: "border-sky-500/25 bg-sky-500/10 text-sky-700",
    countBadge: "border-sky-500/20 bg-sky-500/8 text-sky-700",
    panel:
      "border-sky-500/25 bg-[linear-gradient(180deg,rgba(14,165,233,0.08)_0%,rgba(255,255,255,0.96)_22%,rgba(255,255,255,0.99)_100%)]",
    summary:
      "border-sky-500/20 bg-[linear-gradient(135deg,rgba(14,165,233,0.12)_0%,rgba(59,130,246,0.08)_52%,rgba(255,255,255,0.92)_100%)]",
    accent:
      "bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_32%)]",
    chip: "border-sky-500/20 bg-white/82 text-sky-700",
    contentWrapper: "w-full",
  },
  check: {
    tabActive:
      "border-amber-600 bg-[linear-gradient(180deg,rgba(245,158,11,0.16)_0%,rgba(255,255,255,0.98)_100%)] text-ink-950 shadow-[0_10px_24px_rgba(245,158,11,0.16)]",
    tabInactive:
      "border-line bg-white/78 text-ink-800 hover:border-amber-500/30 hover:bg-white",
    stepBadge: "border-amber-500/25 bg-amber-500/10 text-amber-700",
    countBadge: "border-amber-500/20 bg-amber-500/8 text-amber-700",
    panel:
      "border-amber-500/25 bg-[linear-gradient(180deg,rgba(245,158,11,0.08)_0%,rgba(255,255,255,0.96)_22%,rgba(255,255,255,0.99)_100%)]",
    summary:
      "border-amber-500/20 bg-[linear-gradient(135deg,rgba(245,158,11,0.12)_0%,rgba(249,115,22,0.08)_52%,rgba(255,255,255,0.92)_100%)]",
    accent:
      "bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.12),transparent_32%)]",
    chip: "border-amber-500/20 bg-white/82 text-amber-700",
    contentWrapper: "mx-auto w-full max-w-5xl",
  },
} satisfies Record<
  ConceptLearningPhaseId,
  {
    tabActive: string;
    tabInactive: string;
    stepBadge: string;
    countBadge: string;
    panel: string;
    summary: string;
    accent: string;
    chip: string;
    contentWrapper: string;
  }
>;

function getConceptLearningPhaseTabId(phaseId: ConceptLearningPhaseId) {
  return `concept-learning-phase-tab-${phaseId}`;
}

function getConceptLearningPhasePanelId(phaseId: ConceptLearningPhaseId) {
  return `concept-learning-phase-panel-${phaseId}`;
}

function readLocationHashId() {
  if (typeof window === "undefined") {
    return "";
  }

  return decodeURIComponent(window.location.hash.replace(/^#/, ""));
}

function readLocationPhaseState() {
  if (typeof window === "undefined") {
    return {
      hasPhaseParam: false,
      phaseId: null as ConceptLearningPhaseId | null,
    };
  }

  const url = new URL(window.location.href);

  return {
    hasPhaseParam: url.searchParams.has(conceptLearningPhaseQueryParam),
    phaseId: parseConceptLearningPhaseId(
      url.searchParams.get(conceptLearningPhaseQueryParam),
    ),
  };
}

function getFirstPhaseAnchorId(phase: ResolvedConceptLearningPhase | undefined) {
  if (!phase) {
    return null;
  }

  for (const section of phase.sections) {
    const anchorId = getConceptSectionAnchorId(section.id);

    if (anchorId) {
      return anchorId;
    }
  }

  return null;
}

function resolveManualPhaseHashId(input: {
  currentHashId: string;
  nextPhase: ResolvedConceptLearningPhase | undefined;
  phaseIdByAnchorId: ReadonlyMap<string, ConceptLearningPhaseId>;
}) {
  const { currentHashId, nextPhase, phaseIdByAnchorId } = input;

  if (!currentHashId) {
    return null;
  }

  const currentHashPhaseId = phaseIdByAnchorId.get(currentHashId);

  if (!currentHashPhaseId) {
    return currentHashId;
  }

  if (currentHashPhaseId === nextPhase?.id) {
    return currentHashId;
  }

  return getFirstPhaseAnchorId(nextPhase);
}

function replaceLocationPhaseState(input: {
  phaseId: ConceptLearningPhaseId;
  hashId: string | null;
}) {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set(conceptLearningPhaseQueryParam, input.phaseId);
  url.hash = input.hashId ? input.hashId : "";
  window.history.replaceState(window.history.state, "", url);
  emitPageSectionLocationChange();
}

function shouldScrollPhaseContentIntoView(element: HTMLElement) {
  if (typeof window === "undefined") {
    return false;
  }

  const rect = element.getBoundingClientRect();
  const visibilityThreshold = Math.min(window.innerHeight * 0.35, 240);

  return rect.top > visibilityThreshold;
}

function scrollToBenchSupportTarget(targetId: string) {
  if (typeof document === "undefined") {
    return false;
  }

  const element = document.getElementById(targetId);

  if (!element) {
    return false;
  }

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  element.scrollIntoView({
    behavior: prefersReducedMotion ? "auto" : "smooth",
    block: "start",
  });

  return true;
}

function focusSetupArea() {
  if (typeof document === "undefined") {
    return false;
  }

  const setupElement = document.getElementById(conceptShareAnchorIds.liveBench);

  if (!(setupElement instanceof HTMLElement)) {
    return false;
  }

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  setupElement.scrollIntoView({
    behavior: prefersReducedMotion ? "auto" : "smooth",
    block: "start",
  });
  setupElement.focus({ preventScroll: true });
  return true;
}

type ConceptLearningPhaseBenchHandoff = {
  title: string;
  description: string;
  cta: string;
  targetId: string;
};

function formatGuidanceHintLabel(
  hint: ResolvedConceptPageGuidanceHint,
  t: ReturnType<typeof useTranslations<"ConceptPage">>,
) {
  if (hint.kind === "tool") {
    switch (hint.id) {
      case "playback":
        return t("guidedStart.toolHints.playback");
      case "timeline":
        return t("guidedStart.toolHints.timeline");
      case "graph-preview":
        return t("guidedStart.toolHints.graphPreview");
      case "compare":
        return t("guidedStart.toolHints.compare");
      default:
        return hint.label;
    }
  }

  if (hint.surface === "more-tools") {
    return t("guidedStart.hintPrefixes.moreTools", { label: hint.label });
  }

  if (hint.surface === "more-graphs") {
    return t("guidedStart.hintPrefixes.moreGraphs", { label: hint.label });
  }

  return hint.label;
}

export function ConceptPagePhasedSections({
  concept,
  readNext,
  sections,
  workedExampleMode = "live",
  liveLabContent,
  supportRail,
  afterPhasedSections,
  phaseOwnedAnchorIds,
}: ConceptPagePhasedSectionsProps) {
  const t = useTranslations("ConceptPage");
  const phases = useMemo(() => resolveConceptLearningPhases(sections), [sections]);
  const defaultActivePhaseId = getDefaultConceptLearningPhaseId(phases);
  const liveLabStack = useMemo(
    () => {
      const nextContent: ReactNode[] = [];

      if (liveLabContent) {
        nextContent.push(
          <Fragment key="live-lab-content">{liveLabContent}</Fragment>,
        );
      }

      if (supportRail) {
        nextContent.push(<Fragment key="support-rail">{supportRail}</Fragment>);
      }

      return nextContent;
    },
    [liveLabContent, supportRail],
  );
  const entryGuidance = useMemo(() => resolveConceptPageGuidance(concept), [concept]);
  const postPhaseContent = useMemo(
    () =>
      afterPhasedSections
        ? [<Fragment key="after-phased-sections">{afterPhasedSections}</Fragment>]
        : [],
    [afterPhasedSections],
  );
  const phaseContentRef = useRef<HTMLElement | null>(null);
  const activePhaseSummaryHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const phaseTabRefs = useRef<Record<ConceptLearningPhaseId, HTMLButtonElement | null>>({
    explore: null,
    understand: null,
    check: null,
  });
  const pendingPhaseContentScrollRef = useRef<ConceptLearningPhaseId | null>(null);
  const pendingPhaseSummaryFocusRef = useRef<ConceptLearningPhaseId | null>(null);
  const pendingBenchHandoffHighlightRef = useRef<ConceptLearningPhaseId | null>(null);
  const benchHandoffHighlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activePhaseId, setActivePhaseId] = useState<ConceptLearningPhaseId>(
    defaultActivePhaseId,
  );
  const [pendingHashId, setPendingHashId] = useState<string | null>(null);
  const [highlightedBenchHandoffPhaseId, setHighlightedBenchHandoffPhaseId] =
    useState<ConceptLearningPhaseId | null>(null);
  const phaseById = useMemo(
    () => new Map(phases.map((phase) => [phase.id, phase] as const)),
    [phases],
  );

  const phaseIdByAnchorId = useMemo(() => {
    const nextMap = new Map<string, ConceptLearningPhaseId>();

    for (const phase of phases) {
      for (const section of phase.sections) {
        const anchorId = getConceptSectionAnchorId(section.id);

        if (!anchorId) {
          continue;
        }

        nextMap.set(anchorId, phase.id);
      }
    }

    if (phaseOwnedAnchorIds) {
      for (const [phaseId, anchorIds] of Object.entries(phaseOwnedAnchorIds)) {
        for (const anchorId of anchorIds ?? []) {
          nextMap.set(anchorId, phaseId as ConceptLearningPhaseId);
        }
      }
    }

    return nextMap;
  }, [phaseOwnedAnchorIds, phases]);

  const activePhase =
    phases.find((phase) => phase.id === activePhaseId) ??
    phases.find((phase) => phase.id === defaultActivePhaseId) ??
    phases[0];
  const activePhaseIndex = activePhase
    ? phases.findIndex((phase) => phase.id === activePhase.id)
    : -1;
  const activePhaseStep = activePhaseIndex >= 0 ? activePhaseIndex + 1 : 1;
  const previousPhase = useMemo(() => {
    if (!activePhase) {
      return null;
    }

    for (let index = phases.length - 1; index >= 0; index -= 1) {
      const phase = phases[index];

      if (phase.order >= activePhase.order || !phase.hasVisibleSections) {
        continue;
      }

      return phase;
    }

    return null;
  }, [activePhase, phases]);
  const nextPhase = useMemo(() => {
    if (!activePhase) {
      return null;
    }

    for (const phase of phases) {
      if (phase.order <= activePhase.order || !phase.hasVisibleSections) {
        continue;
      }

      return phase;
    }

    return null;
  }, [activePhase, phases]);
  const isFlowComplete = !nextPhase;
  const nextRecommendedConcept = readNext[0] ?? null;
  const activePhaseLabel = activePhase
    ? t(`phases.items.${activePhase.id}.label`)
    : t("phases.items.explore.label");
  const activePhasePurpose = activePhase
    ? t(`phases.items.${activePhase.id}.purpose`)
    : t("phases.items.explore.purpose");
  const activePhaseHelper = activePhase
    ? t(`phases.items.${activePhase.id}.helper`)
    : t("phases.items.explore.helper");
  const activePhaseFraming = activePhase
    ? t(`phases.items.${activePhase.id}.framing`)
    : t("phases.items.explore.framing");
  const activePhaseBenchHandoff = useMemo<ConceptLearningPhaseBenchHandoff>(() => {
    if (!activePhase) {
      return {
        title: t("phases.benchActivity.fallbackLabel"),
        description: t("phases.benchActivity.fallbackDescriptions.explore"),
        cta: t("phases.benchActivity.fallbackAction"),
        targetId: conceptShareAnchorIds.liveBench,
      };
    }

    if (activePhase.id === "explore" && concept.noticePrompts.items.length > 0) {
      return {
        title: t("phases.items.explore.benchLabel"),
        description: t("phases.items.explore.benchDescription"),
        cta: t("phases.items.explore.benchAction"),
        targetId: getConceptPageBenchSupportTargetId("explore"),
      };
    }

    if (
      activePhase.id === "understand" &&
      (concept.simulation.overlays?.length ?? 0) > 0
    ) {
      return {
        title: t("phases.items.understand.benchLabel"),
        description: t("phases.items.understand.benchDescription"),
        cta: t("phases.items.understand.benchAction"),
        targetId: getConceptPageBenchSupportTargetId("understand"),
      };
    }

    if (activePhase.id === "check" && (concept.challengeMode?.items.length ?? 0) > 0) {
      return {
        title: t("phases.items.check.benchLabel"),
        description: t("phases.items.check.benchDescription"),
        cta: t("phases.items.check.benchAction"),
        targetId: getConceptPageBenchSupportTargetId("check"),
      };
    }

    return {
      title: t("phases.benchActivity.fallbackLabel"),
      description: t(`phases.benchActivity.fallbackDescriptions.${activePhase.id}`),
      cta: t("phases.benchActivity.fallbackAction"),
      targetId: conceptShareAnchorIds.liveBench,
    };
  }, [activePhase, concept.challengeMode?.items.length, concept.noticePrompts.items.length, concept.simulation.overlays?.length, t]);
  const hasReadNextSection = activePhase?.sections.some((section) => section.id === "readNext") ?? false;
  const isBenchHandoffHighlighted =
    highlightedBenchHandoffPhaseId === (activePhase?.id ?? defaultActivePhaseId);
  const renderedAnchorIds = useMemo(
    () => {
      const activePhaseAnchorIds = (activePhase?.sections ?? []).flatMap((section) => {
        const anchorId = getConceptSectionAnchorId(section.id);
        return anchorId ? [anchorId] : [];
      });
      const activePhaseOwnedAnchorIds = activePhase
        ? phaseOwnedAnchorIds?.[activePhase.id] ?? []
        : [];

      return new Set([...activePhaseAnchorIds, ...activePhaseOwnedAnchorIds]);
    },
    [activePhase, phaseOwnedAnchorIds],
  );
  const scrollPhaseContentIntoView = useCallback(() => {
    const phaseContent = phaseContentRef.current;

    if (!phaseContent || !shouldScrollPhaseContentIntoView(phaseContent)) {
      return;
    }

    phaseContent.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  const syncPhaseFromLocation = useCallback(() => {
    const hashId = readLocationHashId();
    const { hasPhaseParam, phaseId: queryPhaseId } = readLocationPhaseState();
    const hashPhaseId = hashId ? phaseIdByAnchorId.get(hashId) ?? null : null;
    const nextPhaseId = resolveInitialConceptLearningPhaseId({
      phases,
      hashPhaseId,
      queryPhaseId,
    });

    setActivePhaseId(nextPhaseId);
    setPendingHashId(hashPhaseId ? hashId : null);

    if (hashPhaseId) {
      if (!hasPhaseParam || queryPhaseId !== hashPhaseId) {
        replaceLocationPhaseState({
          phaseId: hashPhaseId,
          hashId,
        });
      }

      return;
    }

    if (hasPhaseParam && queryPhaseId !== nextPhaseId) {
      replaceLocationPhaseState({
        phaseId: nextPhaseId,
        hashId: hashId || null,
      });
    }
  }, [phaseIdByAnchorId, phases]);

  const handleSectionNavigationIntent = useCallback((anchorId: string) => {
    const targetPhaseId = phaseIdByAnchorId.get(anchorId);

    if (!targetPhaseId) {
      return;
    }

    replaceLocationPhaseState({
      phaseId: targetPhaseId,
      hashId: anchorId,
    });

    if (activePhaseId === targetPhaseId && renderedAnchorIds.has(anchorId)) {
      setPendingHashId(null);
      return;
    }

    pendingBenchHandoffHighlightRef.current = targetPhaseId;
    setPendingHashId(anchorId);
    setActivePhaseId(targetPhaseId);
  }, [activePhaseId, phaseIdByAnchorId, renderedAnchorIds]);

  const handleManualPhaseChange = useCallback((
    nextPhaseId: ConceptLearningPhaseId,
    options?: {
      focusSummary?: boolean;
      scrollToPhaseContent?: boolean;
    },
  ) => {
    const nextPhase = phaseById.get(nextPhaseId);
    const nextHashId = resolveManualPhaseHashId({
      currentHashId: readLocationHashId(),
      nextPhase,
      phaseIdByAnchorId,
    });

    pendingPhaseContentScrollRef.current = options?.scrollToPhaseContent
      ? nextPhaseId
      : null;
    pendingPhaseSummaryFocusRef.current = options?.focusSummary ? nextPhaseId : null;
    pendingBenchHandoffHighlightRef.current =
      activePhaseId === nextPhaseId ? null : nextPhaseId;
    setPendingHashId(null);
    replaceLocationPhaseState({
      phaseId: nextPhaseId,
      hashId: nextHashId,
    });

    if (activePhaseId === nextPhaseId) {
      if (options?.scrollToPhaseContent) {
        scrollPhaseContentIntoView();
        pendingPhaseContentScrollRef.current = null;
      }

      if (options?.focusSummary) {
        activePhaseSummaryHeadingRef.current?.focus();
        pendingPhaseSummaryFocusRef.current = null;
      }

      return;
    }

    setActivePhaseId(nextPhaseId);
  }, [activePhaseId, phaseById, phaseIdByAnchorId, scrollPhaseContentIntoView]);

  useEffect(() => {
    // This keeps the active phase aligned with the currently available authored phases.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActivePhaseId((current) => {
      return phases.some((phase) => phase.id === current) ? current : defaultActivePhaseId;
    });
  }, [defaultActivePhaseId, phases]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    // This is the initial URL-to-phase sync before the hash/popstate listeners take over.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    syncPhaseFromLocation();
    window.addEventListener("hashchange", syncPhaseFromLocation);
    window.addEventListener("popstate", syncPhaseFromLocation);

    return () => {
      window.removeEventListener("hashchange", syncPhaseFromLocation);
      window.removeEventListener("popstate", syncPhaseFromLocation);
    };
  }, [syncPhaseFromLocation]);

  useEffect(() => {
    return addPageSectionNavigationIntentListener(handleSectionNavigationIntent);
  }, [handleSectionNavigationIntent]);

  useEffect(() => {
    if (!pendingHashId || !renderedAnchorIds.has(pendingHashId)) {
      return;
    }

    scrollToPageSection(pendingHashId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendingHashId((current) => (current === pendingHashId ? null : current));
  }, [pendingHashId, renderedAnchorIds]);

  useEffect(() => {
    if (pendingPhaseContentScrollRef.current === activePhaseId) {
      scrollPhaseContentIntoView();
      pendingPhaseContentScrollRef.current = null;
    }

    if (pendingPhaseSummaryFocusRef.current === activePhaseId) {
      activePhaseSummaryHeadingRef.current?.focus();
      pendingPhaseSummaryFocusRef.current = null;
    }
  }, [activePhaseId, scrollPhaseContentIntoView]);

  useEffect(() => {
    if (pendingBenchHandoffHighlightRef.current !== activePhaseId) {
      return;
    }

    pendingBenchHandoffHighlightRef.current = null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHighlightedBenchHandoffPhaseId(activePhaseId);

    if (benchHandoffHighlightTimeoutRef.current) {
      clearTimeout(benchHandoffHighlightTimeoutRef.current);
    }

    benchHandoffHighlightTimeoutRef.current = setTimeout(() => {
      setHighlightedBenchHandoffPhaseId((current) =>
        current === activePhaseId ? null : current,
      );
      benchHandoffHighlightTimeoutRef.current = null;
    }, 2200);
  }, [activePhaseId]);

  useEffect(() => {
    return () => {
      if (benchHandoffHighlightTimeoutRef.current) {
        clearTimeout(benchHandoffHighlightTimeoutRef.current);
      }
    };
  }, []);

  const handleBenchHandoffClick = useCallback(() => {
    if (scrollToBenchSupportTarget(activePhaseBenchHandoff.targetId)) {
      return;
    }

    focusSetupArea();
  }, [activePhaseBenchHandoff.targetId]);

  const handleReturnToSetupArea = useCallback(
    (options?: {
      phaseId?: ConceptLearningPhaseId;
    }) => {
      const nextPhaseId = options?.phaseId ?? "explore";

      pendingPhaseContentScrollRef.current = null;
      pendingPhaseSummaryFocusRef.current = null;
      pendingBenchHandoffHighlightRef.current = null;
      setPendingHashId(null);
      replaceLocationPhaseState({
        phaseId: nextPhaseId,
        hashId: conceptShareAnchorIds.liveBench,
      });

      if (activePhaseId !== nextPhaseId) {
        setActivePhaseId(nextPhaseId);
      }

      focusSetupArea();
    },
    [activePhaseId],
  );

  const handlePhaseTabKeyDown = useCallback((
    event: KeyboardEvent<HTMLButtonElement>,
    phaseId: ConceptLearningPhaseId,
  ) => {
    const currentIndex = phases.findIndex((phase) => phase.id === phaseId);

    if (currentIndex === -1) {
      return;
    }

    let nextIndex: number | null = null;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextIndex = (currentIndex + 1) % phases.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        nextIndex = (currentIndex - 1 + phases.length) % phases.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = phases.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const nextPhaseId = phases[nextIndex]?.id;

    if (!nextPhaseId) {
      return;
    }

    handleManualPhaseChange(nextPhaseId);
    phaseTabRefs.current[nextPhaseId]?.focus();
  }, [handleManualPhaseChange, phases]);

  return (
    <ConceptPagePhaseProvider
      activePhaseId={activePhase?.id ?? defaultActivePhaseId}
      returnToSetupArea={handleReturnToSetupArea}
    >
      <section className="mt-4 space-y-4 lg:mt-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)] lg:items-start">
          <div
            className="page-band px-4 py-4 sm:px-5"
            data-testid="concept-learning-phase-entry-rail"
            data-active-phase={activePhase?.id ?? defaultActivePhaseId}
          >
            <div
              className={[
                "relative overflow-hidden rounded-[24px] border px-4 py-4",
                conceptLearningPhasePresentation[activePhase?.id ?? defaultActivePhaseId].summary,
              ].join(" ")}
              data-testid="concept-learning-phase-summary"
            >
              <div
                aria-hidden="true"
                className={[
                  "absolute inset-0",
                  conceptLearningPhasePresentation[activePhase?.id ?? defaultActivePhaseId].accent,
                ].join(" ")}
              />
              <div className="relative space-y-4">
                <div className="space-y-2">
                  <p className="lab-label">{t("phases.currentLabel")}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={[
                        "rounded-full border px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em]",
                        conceptLearningPhasePresentation[activePhase?.id ?? defaultActivePhaseId]
                          .stepBadge,
                      ].join(" ")}
                      data-testid="concept-learning-phase-step"
                    >
                      {t("phases.step", { step: activePhaseStep, total: phases.length })}
                    </span>
                    <span
                      className={[
                        "rounded-full border px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em]",
                        conceptLearningPhasePresentation[activePhase?.id ?? defaultActivePhaseId]
                          .countBadge,
                      ].join(" ")}
                    >
                      {t("phases.count", { count: activePhase?.sections.length ?? 0 })}
                    </span>
                  </div>
                  <h2
                    ref={activePhaseSummaryHeadingRef}
                    tabIndex={-1}
                    className="text-2xl font-semibold text-ink-950 focus-visible:outline-none"
                  >
                    {activePhaseLabel}
                  </h2>
                  <p className="text-sm font-medium leading-6 text-ink-600">
                    {activePhaseHelper}
                  </p>
                  <p className="text-base leading-7 text-ink-700">{activePhasePurpose}</p>
                </div>

                <div className="progress-track">
                  <div
                    className="progress-value"
                    style={{ width: `${Math.max(1, (activePhaseStep / phases.length) * 100)}%` }}
                  />
                </div>

                <div
                  role="tablist"
                  aria-label={t("phases.groupLabel")}
                  className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1"
                >
                  {phases.map((phase, index) => {
                    const isActive = phase.id === activePhase?.id;
                    const presentation = conceptLearningPhasePresentation[phase.id];

                    return (
                      <button
                        key={phase.id}
                        type="button"
                        id={getConceptLearningPhaseTabId(phase.id)}
                        role="tab"
                        aria-selected={isActive}
                        aria-controls={getConceptLearningPhasePanelId(phase.id)}
                        tabIndex={isActive ? 0 : -1}
                        data-testid={`concept-learning-phase-${phase.id}`}
                        ref={(element) => {
                          phaseTabRefs.current[phase.id] = element;
                        }}
                        onClick={() =>
                          handleManualPhaseChange(phase.id, {
                            scrollToPhaseContent: true,
                          })
                        }
                        onKeyDown={(event) => handlePhaseTabKeyDown(event, phase.id)}
                        className={[
                          "group flex min-h-[5.35rem] flex-col items-start rounded-[20px] border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
                          isActive ? presentation.tabActive : presentation.tabInactive,
                        ].join(" ")}
                      >
                        <div className="flex flex-wrap items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.14em]">
                          <span
                            className={[
                              "rounded-full border px-2.5 py-1",
                              presentation.stepBadge,
                            ].join(" ")}
                          >
                            {t("phases.stepShort", { step: index + 1 })}
                          </span>
                          <span
                            className={[
                              "rounded-full border px-2.5 py-1",
                              presentation.countBadge,
                            ].join(" ")}
                          >
                            {t("phases.count", { count: phase.sections.length })}
                          </span>
                        </div>
                        <span className="mt-2 text-base font-semibold text-ink-950">
                          {t(`phases.items.${phase.id}.label`)}
                        </span>
                        <span
                          className={[
                            "mt-1 text-sm leading-6",
                            isActive ? "text-ink-800" : "text-ink-600",
                          ].join(" ")}
                        >
                          {t(`phases.items.${phase.id}.helper`)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {entryGuidance ? (
                  <section
                    id="guided-start"
                    data-testid="concept-guided-start-card"
                    className="rounded-[22px] border border-teal-500/22 bg-[linear-gradient(135deg,rgba(20,184,166,0.12)_0%,rgba(255,255,255,0.95)_48%,rgba(255,255,255,0.98)_100%)] px-4 py-4 shadow-[0_12px_28px_rgba(13,148,136,0.08)]"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="lab-label">{t("guidedStart.label")}</p>
                      {entryGuidance.source === "starter-task" ? (
                        <span className="rounded-full border border-teal-500/25 bg-white/85 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-teal-700">
                          {t("guidedStart.sequenceBadge")}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-2 text-lg font-semibold text-ink-950">
                      {t("guidedStart.title")}
                    </h3>
                    <RichMathText
                      as="div"
                      content={entryGuidance.action}
                      className="mt-2 text-sm font-semibold leading-6 text-ink-900"
                    />
                    {entryGuidance.detail ? (
                      <RichMathText
                        as="div"
                        content={entryGuidance.detail}
                        className="mt-2 text-sm leading-6 text-ink-700"
                      />
                    ) : null}
                    {entryGuidance.hints.length ? (
                      <ul
                        data-testid="concept-guided-start-hints"
                        className="mt-3 flex flex-wrap gap-2"
                      >
                        {entryGuidance.hints.map((hint) => (
                          <li
                            key={`${hint.kind}-${hint.id}`}
                            className="rounded-full border border-white/80 bg-white/88 px-3 py-1.5 text-xs font-medium text-ink-700 shadow-sm"
                          >
                            {formatGuidanceHintLabel(hint, t)}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        data-testid="concept-learning-phase-bench-cta"
                        onClick={handleBenchHandoffClick}
                        className="inline-flex min-h-11 items-center justify-center rounded-full border border-ink-950 bg-ink-950 px-4 py-2.5 text-sm font-semibold text-paper-strong transition hover:bg-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                      >
                        {activePhaseBenchHandoff.cta}
                      </button>
                    </div>
                  </section>
                ) : null}

                <div className="grid gap-3">
                  <div className="rounded-[20px] border border-white/70 bg-white/82 px-4 py-4 shadow-sm">
                    <p className="lab-label">{t("phases.focusLabel")}</p>
                    <p className="mt-2 text-base leading-7 text-ink-800">
                      {activePhaseFraming}
                    </p>
                  </div>

                  <div
                    className={[
                      "rounded-[20px] border px-4 py-4 shadow-sm transition-all duration-300",
                      isBenchHandoffHighlighted
                        ? "border-ink-950/15 bg-white shadow-[0_16px_30px_rgba(15,28,36,0.12)] ring-2 ring-ink-950/8"
                        : "border-white/70 bg-white/82",
                    ].join(" ")}
                    data-testid="concept-learning-phase-bench-handoff"
                    data-highlighted={isBenchHandoffHighlighted ? "true" : "false"}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="lab-label">{t("phases.benchActivity.label")}</p>
                      {isBenchHandoffHighlighted ? (
                        <span
                          className={[
                            "rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em]",
                            conceptLearningPhasePresentation[activePhase?.id ?? defaultActivePhaseId]
                              .countBadge,
                          ].join(" ")}
                          aria-live="polite"
                        >
                          {t("phases.benchActivity.updated")}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-base font-semibold text-ink-950">
                      {activePhaseBenchHandoff.title}
                    </p>
                    <p className="mt-1.5 text-base leading-7 text-ink-700">
                      {activePhaseBenchHandoff.description}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {previousPhase ? (
                    <button
                      type="button"
                      data-testid="concept-learning-phase-previous"
                      onClick={() =>
                        handleManualPhaseChange(previousPhase.id, {
                          focusSummary: true,
                        })
                      }
                      className="inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-white/90 px-4 py-2.5 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                    >
                      {t("phases.navigation.previous")}
                    </button>
                  ) : null}

                  {nextPhase ? (
                    <button
                      type="button"
                      data-testid="concept-learning-phase-next"
                      onClick={() =>
                        handleManualPhaseChange(nextPhase.id, {
                          focusSummary: true,
                        })
                      }
                      className="inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-white/90 px-4 py-2.5 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                    >
                      {t("phases.navigation.continue", {
                        phase: t(`phases.items.${nextPhase.id}.label`),
                      })}
                    </button>
                  ) : null}
                </div>

                {isFlowComplete ? (
                  nextRecommendedConcept ? (
                    <Link
                      href={`/concepts/${nextRecommendedConcept.slug}`}
                      data-testid="concept-learning-phase-next-concept"
                      className="group rounded-[20px] border border-amber-500/25 bg-[linear-gradient(135deg,rgba(245,158,11,0.14)_0%,rgba(255,255,255,0.96)_100%)] px-4 py-4 shadow-sm transition hover:border-amber-500/40 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/25 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                    >
                      <p className="lab-label">{t("phases.navigation.finalTitle")}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-amber-500/20 bg-white/80 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-amber-700">
                          {nextRecommendedConcept.reasonLabel}
                        </span>
                      </div>
                      <p className="mt-2 text-base font-semibold text-ink-950 group-hover:text-amber-700">
                        {nextRecommendedConcept.title}
                      </p>
                      <p className="mt-1.5 text-sm leading-6 text-ink-700">
                        {nextRecommendedConcept.summary}
                      </p>
                    </Link>
                  ) : (
                    <div className="rounded-[20px] border border-white/75 bg-white/82 px-4 py-4 text-sm text-ink-800 shadow-sm">
                      <p className="lab-label">{t("phases.navigation.finalTitle")}</p>
                      <p className="mt-2 leading-6 text-ink-800">
                        {hasReadNextSection
                          ? t("phases.navigation.finalReadNext")
                          : t("phases.navigation.finalDefault")}
                      </p>
                    </div>
                  )
                ) : null}
              </div>
            </div>
          </div>

          <div className="min-w-0 space-y-4">{liveLabStack}</div>
        </div>

        <section
          ref={phaseContentRef}
          className="scroll-mt-24 space-y-4"
          data-testid="concept-learning-phases"
          data-active-phase={activePhase?.id ?? defaultActivePhaseId}
        >
        {phases.map((phase) => {
          const isActive = phase.id === activePhase?.id;
          const presentation = conceptLearningPhasePresentation[phase.id];

          return (
            <div
              key={phase.id}
              id={getConceptLearningPhasePanelId(phase.id)}
              role="tabpanel"
              aria-labelledby={getConceptLearningPhaseTabId(phase.id)}
              hidden={!isActive}
              tabIndex={isActive ? 0 : undefined}
              data-testid={`concept-learning-phase-panel-${phase.id}`}
              className={
                isActive
                  ? ["space-y-4 rounded-[28px] border px-4 py-4 sm:px-5", presentation.panel].join(
                      " ",
                    )
                  : undefined
              }
            >
              {isActive ? (
                <>
                  <div className={presentation.contentWrapper}>
                    {phase.hasVisibleSections ? (
                      <ConceptPageSections
                        concept={concept}
                        readNext={readNext}
                        sections={phase.sections}
                        workedExampleMode={workedExampleMode}
                      />
                    ) : (
                      <div className="lab-panel p-5 text-sm leading-6 text-ink-600">
                        {t("phases.empty")}
                      </div>
                    )}
                  </div>

                  {isFlowComplete ? (
                    <div
                      className="rounded-[24px] border border-white/80 bg-white/86 px-4 py-4 shadow-sm"
                      data-testid="concept-learning-phase-completion"
                    >
                      <p className="lab-label">{t("phases.completion.label")}</p>
                      <h3 className="mt-2 text-base font-semibold text-ink-950">
                        {t("phases.completion.title")}
                      </h3>
                      <p className="mt-1.5 max-w-3xl text-sm leading-6 text-ink-700">
                        {hasReadNextSection
                          ? t("phases.completion.readNext")
                          : t("phases.completion.default")}
                      </p>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          );
        })}
        </section>

        {postPhaseContent}
      </section>
    </ConceptPagePhaseProvider>
  );
}
