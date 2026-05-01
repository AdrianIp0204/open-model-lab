"use client";

import { useTranslations } from "next-intl";
import type { ConceptProgressStatus } from "@/lib/progress";

type ProgressStatusBadgeProps = {
  status: ConceptProgressStatus;
  compact?: boolean;
};

const statusClasses: Record<ConceptProgressStatus, string> = {
  "not-started": "border-line bg-paper-strong text-ink-600",
  started: "border-sky-500/25 bg-sky-500/10 text-sky-700",
  practiced: "border-teal-500/25 bg-teal-500/10 text-teal-700",
  completed: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700",
};

export function ProgressStatusBadge({
  status,
  compact = false,
}: ProgressStatusBadgeProps) {
  const t = useTranslations("ProgressStatusBadge");

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border font-mono uppercase tracking-[0.16em]",
        compact ? "px-2.5 py-1 text-[0.68rem]" : "px-3 py-1 text-xs",
        statusClasses[status],
      ].join(" ")}
    >
      {t(status)}
    </span>
  );
}
