"use client";

import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { LearningPathEntryDiagnosticSummary } from "@/lib/progress";

type LearningPathEntryDiagnosticPanelProps = {
  diagnostic: LearningPathEntryDiagnosticSummary;
  evidenceNote: string;
  className?: string;
};

const recommendationClasses: Record<
  LearningPathEntryDiagnosticSummary["recommendationKind"],
  string
> = {
  "start-at-beginning": "border-amber-500/25 bg-amber-500/10 text-amber-700",
  "skip-ahead": "border-teal-500/25 bg-teal-500/10 text-teal-700",
  "review-prerequisite": "border-coral-500/25 bg-coral-500/10 text-coral-700",
  "take-recap": "border-sky-500/25 bg-sky-500/10 text-sky-700",
};

const probeStatusClasses = {
  ready: "border-teal-500/25 bg-teal-500/10 text-teal-700",
  review: "border-coral-500/25 bg-coral-500/10 text-coral-700",
  "in-progress": "border-amber-500/25 bg-amber-500/10 text-amber-700",
  "not-started": "border-line bg-paper text-ink-600",
} as const;

function copyText(locale: AppLocale, english: string, zhHongKong: string) {
  return locale === "zh-HK" ? zhHongKong : english;
}

function getProbeKindLabel(
  kind: LearningPathEntryDiagnosticSummary["probes"][number]["kind"],
  locale: AppLocale,
) {
  return kind === "quick-test"
    ? copyText(locale, "Quick test", "快速測驗")
    : copyText(locale, "Challenge", "挑戰");
}

export function LearningPathEntryDiagnosticPanel({
  diagnostic,
  evidenceNote,
  className,
}: LearningPathEntryDiagnosticPanelProps) {
  const locale = useLocale() as AppLocale;

  return (
    <section className={["lab-panel p-5 sm:p-6", className].filter(Boolean).join(" ")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="lab-label">{copyText(locale, "Entry diagnostic", "入口診斷")}</p>
          <h2 className="text-2xl font-semibold text-ink-950 sm:text-3xl">
            {copyText(
              locale,
              "Decide where to enter this path without opening a second testing system.",
              "不用另外打開第二套測試系統，也能判斷應該從這條路徑的哪裡開始。",
            )}
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-ink-700">{diagnostic.summary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span
            className={[
              "rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
              recommendationClasses[diagnostic.recommendationKind],
            ].join(" ")}
          >
            {diagnostic.recommendationLabel}
          </span>
          <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
            {copyText(
              locale,
              `${diagnostic.readyProbeCount} / ${diagnostic.probes.length} probes ready`,
              `${diagnostic.readyProbeCount} / ${diagnostic.probes.length} 個檢查已準備好`,
            )}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]">
        <article className="rounded-[28px] border border-line bg-paper-strong p-4 sm:p-5">
          <div className="space-y-3">
            <p className="lab-label">{diagnostic.title}</p>
            <h3 className="text-xl font-semibold text-ink-950">{diagnostic.recommendationLabel}</h3>
            <p className="text-sm leading-6 text-ink-700">{diagnostic.note}</p>
            <p className="text-xs leading-5 text-ink-600">{evidenceNote}</p>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={diagnostic.primaryAction.href}
              className="inline-flex items-center justify-center rounded-full bg-ink-950 px-4 py-2.5 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5"
              style={{ color: "var(--paper-strong)" }}
            >
              {diagnostic.primaryAction.label}
            </Link>
            {diagnostic.secondaryAction ? (
              <Link
                href={diagnostic.secondaryAction.href}
                className="inline-flex items-center justify-center rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-semibold text-ink-900 transition-colors hover:border-ink-950/20 hover:bg-white"
              >
                {diagnostic.secondaryAction.label}
              </Link>
            ) : null}
          </div>
        </article>

        <ol className="grid gap-3">
          {diagnostic.probes.map((probe) => (
            <li key={probe.id}>
              <article className="rounded-[24px] border border-line bg-paper-strong p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-line bg-paper px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-700">
                    {getProbeKindLabel(probe.kind, locale)}
                  </span>
                  <span
                    className={[
                      "rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
                      probeStatusClasses[probe.status],
                    ].join(" ")}
                  >
                    {probe.statusLabel}
                  </span>
                  <span className="rounded-full border border-line bg-paper px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                    {probe.kind === "quick-test"
                      ? copyText(
                          locale,
                          `${probe.questionCount} question${probe.questionCount === 1 ? "" : "s"}`,
                          `${probe.questionCount} 題`,
                        )
                      : copyText(
                          locale,
                          `${probe.checkCount} check${probe.checkCount === 1 ? "" : "s"}`,
                          `${probe.checkCount} 個檢查`,
                        )}
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  <h3 className="text-lg font-semibold text-ink-950">{probe.title}</h3>
                  <p className="text-sm leading-6 text-ink-700">{probe.summary}</p>
                  <p className="text-sm leading-6 text-ink-600">{probe.note}</p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-700">
                    {probe.concept.shortTitle ?? probe.concept.title}
                  </span>
                  {probe.kind === "challenge" && probe.usesCompare ? (
                    <span className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-700">
                      {copyText(locale, "Compare", "比較")}
                    </span>
                  ) : null}
                  {probe.kind === "challenge" && probe.usesInspect ? (
                    <span className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-700">
                      {copyText(locale, "Inspect time", "檢視時間")}
                    </span>
                  ) : null}
                </div>

                <div className="mt-4">
                  <Link
                    href={probe.primaryAction.href}
                    className="inline-flex items-center justify-center rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-semibold text-ink-900 transition-colors hover:border-ink-950/20 hover:bg-white"
                  >
                    {probe.primaryAction.label}
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
