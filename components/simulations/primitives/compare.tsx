"use client";

import type { ReactNode } from "react";
import { useLocale } from "next-intl";
import { localizeKnownCompareText } from "@/lib/i18n/copy-text";
import type { GraphSeriesSetupId, GraphStagePreview } from "@/lib/physics";

type CompareDescriptor = {
  activeTarget: GraphSeriesSetupId;
  labelA?: string;
  labelB?: string;
};

type ResolveCompareSceneOptions<Frame> = {
  compare?: CompareDescriptor | null;
  graphPreview?: Pick<GraphStagePreview, "setup"> | null;
  activeFrame: Frame;
  frameA?: Frame | null;
  frameB?: Frame | null;
  liveLabel?: string;
  defaultLabelA?: string;
  defaultLabelB?: string;
};

export function resolveCompareScene<Frame>({
  compare,
  graphPreview,
  activeFrame,
  frameA,
  frameB,
  liveLabel = "Live",
  defaultLabelA = "Setup A",
  defaultLabelB = "Setup B",
}: ResolveCompareSceneOptions<Frame>) {
  const compareEnabled = Boolean(compare);
  const previewedSetup = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const primaryFrame = compare
    ? previewedSetup === "a"
      ? frameA!
      : frameB!
    : activeFrame;
  const secondaryFrame = compare
    ? previewedSetup === "a"
      ? frameB!
      : frameA!
    : null;
  const primaryLabel = compare
    ? previewedSetup === "a"
      ? compare.labelA ?? defaultLabelA
      : compare.labelB ?? defaultLabelB
    : liveLabel;
  const secondaryLabel = compare
    ? previewedSetup === "a"
      ? compare.labelB ?? defaultLabelB
      : compare.labelA ?? defaultLabelA
    : null;

  return {
    compareEnabled,
    previewedSetup,
    primaryFrame,
    secondaryFrame,
    primaryLabel,
    secondaryLabel,
    canEditPrimary: !compare || !graphPreview || previewedSetup === compare.activeTarget,
  };
}

type CompareLegendProps = {
  primaryLabel: string;
  secondaryLabel: string | null;
};

export function CompareLegend({ primaryLabel, secondaryLabel }: CompareLegendProps) {
  const locale = useLocale();
  if (!secondaryLabel) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-700">
      <span className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-ink-600">
        <span className="h-0 w-5 border-t-2 border-solid border-ink-900" />
        {localizeKnownCompareText(locale, primaryLabel)}
      </span>
      <span className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-ink-600">
        <span className="h-0 w-5 border-t-2 border-dashed border-ink-900/70" />
        {localizeKnownCompareText(locale, secondaryLabel)}
      </span>
    </div>
  );
}

type SimulationPreviewBadgeProps = {
  children: ReactNode;
  tone?: "coral" | "sky" | "teal";
};

export function SimulationPreviewBadge({
  children,
  tone = "coral",
}: SimulationPreviewBadgeProps) {
  const toneClasses =
    tone === "teal"
      ? "border-teal-500/30 bg-teal-500/10 text-teal-700"
      : tone === "sky"
        ? "border-sky-500/30 bg-sky-500/10 text-sky-700"
        : "border-coral-500/30 bg-coral-500/10 text-coral-700";

  return (
    <span
      className={[
        "rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em]",
        toneClasses,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
