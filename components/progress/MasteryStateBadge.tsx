"use client";

import { useTranslations } from "next-intl";
import type { ConceptMasteryState } from "@/lib/progress";

type MasteryStateBadgeProps = {
  state: ConceptMasteryState;
  compact?: boolean;
};

const stateClasses: Record<ConceptMasteryState, string> = {
  new: "border-line bg-paper-strong text-ink-600",
  practiced: "border-sky-500/25 bg-sky-500/10 text-sky-700",
  shaky: "border-amber-500/30 bg-amber-500/12 text-amber-700",
  solid: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700",
};

export function MasteryStateBadge({
  state,
  compact = false,
}: MasteryStateBadgeProps) {
  const t = useTranslations("MasteryStateBadge");

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border font-semibold",
        compact ? "px-2.5 py-1 text-[0.68rem]" : "px-3 py-1 text-xs",
        stateClasses[state],
      ].join(" ")}
    >
      {t(state)}
    </span>
  );
}
