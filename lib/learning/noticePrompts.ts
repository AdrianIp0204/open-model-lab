import type { ControlValue, NoticePrompt, NoticePromptConfig } from "@/lib/physics";

export type NoticePromptContext = {
  params: Record<string, ControlValue>;
  activeGraphId: string | null;
  activeGraphLabel: string | null;
  interactionMode: "explore" | "predict" | "compare";
  activeCompareTarget: "a" | "b" | null;
  focusedOverlayId: string | null;
  visibleOverlayIds: string[];
  timeSource: "live" | "inspect" | "preview";
  time: number;
  lastChangedParam: string | null;
  formatGraphBadge?: (label: string) => string;
  formatPausedBadge?: (time: number) => string;
  formatPreviewBadge?: (time: number) => string;
  formatActiveSetupBadge?: (target: "a" | "b") => string;
};

export type ResolvedNoticePrompt = NoticePrompt & {
  contextBadges: string[];
  score: number;
};

type RankedPrompt = ResolvedNoticePrompt & {
  order: number;
};

function buildContextBadges(prompt: NoticePrompt, context: NoticePromptContext) {
  const badges: string[] = [];

  if (prompt.relatedGraphTabs?.includes(context.activeGraphId ?? "") && context.activeGraphLabel) {
    badges.push(
      context.formatGraphBadge
        ? context.formatGraphBadge(context.activeGraphLabel)
        : `Graph: ${context.activeGraphLabel}`,
    );
  }

  if (context.timeSource === "inspect") {
    badges.push(
      context.formatPausedBadge
        ? context.formatPausedBadge(context.time)
        : `Paused at t = ${context.time.toFixed(2)} s`,
    );
  } else if (context.timeSource === "preview") {
    badges.push(
      context.formatPreviewBadge
        ? context.formatPreviewBadge(context.time)
        : `Previewing t = ${context.time.toFixed(2)} s`,
    );
  }

  if (context.interactionMode === "compare" && context.activeCompareTarget) {
    badges.push(
      context.formatActiveSetupBadge
        ? context.formatActiveSetupBadge(context.activeCompareTarget)
        : `Setup ${context.activeCompareTarget.toUpperCase()} is active`,
    );
  }

  return badges.slice(0, 2);
}

function matchesOverlayCondition(prompt: NoticePrompt, context: NoticePromptContext) {
  const overlayIds = prompt.conditions?.overlayIds;

  if (!overlayIds?.length) {
    return true;
  }

  const visibleOverlayIds = new Set(context.visibleOverlayIds);
  if (context.focusedOverlayId) {
    visibleOverlayIds.add(context.focusedOverlayId);
  }

  return overlayIds.some((overlayId) => visibleOverlayIds.has(overlayId));
}

function matchesControlRanges(prompt: NoticePrompt, context: NoticePromptContext) {
  const ranges = prompt.conditions?.controlRanges;

  if (!ranges?.length) {
    return true;
  }

  return ranges.every((range) => {
    const value = context.params[range.param];
    if (typeof value !== "number") {
      return false;
    }

    if (range.min !== undefined && value < range.min) {
      return false;
    }

    if (range.max !== undefined && value > range.max) {
      return false;
    }

    return true;
  });
}

function scorePrompt(prompt: NoticePrompt, context: NoticePromptContext) {
  const conditions = prompt.conditions;
  let score = prompt.priority ?? 0;
  let specificity = 0;

  if (!conditions) {
    return score;
  }

  if (conditions.modes?.length) {
    if (!conditions.modes.includes(context.interactionMode)) {
      return null;
    }

    score += 28;
    specificity += 1;
  }

  if (conditions.graphTabs?.length) {
    if (!context.activeGraphId || !conditions.graphTabs.includes(context.activeGraphId)) {
      return null;
    }

    score += 24;
    specificity += 1;
  }

  if (!matchesOverlayCondition(prompt, context)) {
    return null;
  }

  if (conditions.overlayIds?.length) {
    score += 18;
    specificity += 1;
  }

  if (conditions.responseMode !== undefined) {
    const responseMode = Boolean(context.params.responseMode ?? context.params.resonanceMode);
    if (responseMode !== conditions.responseMode) {
      return null;
    }

    score += 16;
    specificity += 1;
  }

  if (conditions.inspectState) {
    if (context.timeSource !== conditions.inspectState) {
      return null;
    }

    score += 30;
    specificity += 1;
  }

  if (!matchesControlRanges(prompt, context)) {
    return null;
  }

  if (conditions.controlRanges?.length) {
    score += 10 + conditions.controlRanges.length * 4;
    specificity += conditions.controlRanges.length;
  }

  if (conditions.lastChangedControls?.length) {
    if (
      !context.lastChangedParam ||
      !conditions.lastChangedControls.includes(context.lastChangedParam)
    ) {
      return null;
    }

    score += 22;
    specificity += 1;
  }

  if (context.interactionMode === "compare" && prompt.type === "compare") {
    score += 8;
  }

  if (context.activeGraphId && prompt.relatedGraphTabs?.includes(context.activeGraphId)) {
    score += 3;
  }

  if (context.focusedOverlayId && prompt.relatedOverlays?.includes(context.focusedOverlayId)) {
    score += 3;
  }

  return score + specificity * 6;
}

export function resolveNoticePrompts(
  config: NoticePromptConfig | null | undefined,
  context: NoticePromptContext,
) {
  if (!config?.items.length) {
    return [];
  }

  const ranked = config.items
    .map<RankedPrompt | null>((prompt, order) => {
      const score = scorePrompt(prompt, context);
      if (score === null) {
        return null;
      }

      return {
        ...prompt,
        contextBadges: buildContextBadges(prompt, context),
        score,
        order,
      };
    })
    .filter((prompt): prompt is RankedPrompt => prompt !== null)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.order - b.order;
    });

  if (ranked.length) {
    return ranked;
  }

  return config.items
    .map<RankedPrompt>((prompt, order) => ({
      ...prompt,
      contextBadges: buildContextBadges(prompt, context),
      score: prompt.priority ?? 0,
      order,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.order - b.order;
    });
}
