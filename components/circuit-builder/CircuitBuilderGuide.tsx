"use client";

import {
  circuitBuilderChallenges,
  getCircuitBuilderChallenge,
  type CircuitBuilderChallengeCheck,
  type CircuitBuilderChallengeId,
} from "@/lib/circuit-builder";
import type { AppLocale } from "@/i18n/routing";

type CircuitBuilderGuideProps = {
  locale: AppLocale;
  activeChallengeId: CircuitBuilderChallengeId;
  checkResult: CircuitBuilderChallengeCheck | null;
  explanationOpen: boolean;
  onSelectChallenge: (id: CircuitBuilderChallengeId) => void;
  onLoadStarter: () => void;
  onCheck: () => void;
  onToggleExplanation: () => void;
};

function text(locale: AppLocale, en: string, zhHk: string) {
  return locale === "zh-HK" ? zhHk : en;
}

export function CircuitBuilderGuide({
  locale,
  activeChallengeId,
  checkResult,
  explanationOpen,
  onSelectChallenge,
  onLoadStarter,
  onCheck,
  onToggleExplanation,
}: CircuitBuilderGuideProps) {
  const activeChallenge = getCircuitBuilderChallenge(activeChallengeId);
  const resultTone =
    checkResult?.status === "success"
      ? "border-teal-500/25 bg-teal-500/8 text-teal-800"
      : checkResult?.status === "wrong-placement"
        ? "border-coral-500/25 bg-coral-500/8 text-coral-800"
        : "border-amber-500/25 bg-amber-500/10 text-amber-800";

  return (
    <section
      className="page-band p-2.5"
      aria-label={text(locale, "Guided circuit build and check", "引導式電路搭建和檢查")}
      data-circuit-builder-guide=""
    >
      <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="lab-label">{text(locale, "Guided mode", "引導模式")}</p>
            <span
              className={[
                "rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em]",
                checkResult ? resultTone : "border-line bg-paper-strong text-ink-600",
              ].join(" ")}
              data-circuit-guide-state={checkResult?.status ?? "ready"}
            >
              {checkResult
                ? checkResult.title
                : text(locale, "Ready to check", "準備檢查")}
            </span>
          </div>
          <h2 className="mt-1 text-base font-semibold text-ink-950">
            {activeChallenge.title[locale]}
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-5 text-ink-700">
            {activeChallenge.goal[locale]}
          </p>
        </div>

        <div className="flex min-w-0 flex-wrap gap-1.5 xl:justify-end">
          <button
            type="button"
            className="min-h-[44px] rounded-full border border-line bg-paper px-3 py-2 text-xs font-semibold text-ink-950 transition hover:border-ink-950/20 hover:bg-paper-strong"
            onClick={onLoadStarter}
          >
            {activeChallenge.starterLabel[locale]}
          </button>
          <button
            type="button"
            className="min-h-[44px] rounded-full border border-teal-500/25 bg-teal-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-600"
            onClick={onCheck}
          >
            {text(locale, "Check my circuit", "檢查我的電路")}
          </button>
          <button
            type="button"
            className="min-h-[44px] rounded-full border border-line bg-paper px-3 py-2 text-xs font-semibold text-ink-950 transition hover:border-ink-950/20 hover:bg-paper-strong disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!checkResult}
            aria-expanded={explanationOpen}
            onClick={onToggleExplanation}
          >
            {text(locale, "Explain result", "解釋結果")}
          </button>
        </div>
      </div>

      <div
        className="mt-2 flex max-w-full gap-1.5 overflow-x-auto pb-0.5"
        role="tablist"
        aria-label={text(locale, "Guided circuit goals", "引導式電路目標")}
      >
        {circuitBuilderChallenges.map((challenge) => {
          const selected = challenge.id === activeChallengeId;
          return (
            <button
              key={challenge.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={[
                "min-h-[44px] shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition",
                selected
                  ? "border-ink-950 bg-ink-950 text-white"
                  : "border-line bg-paper text-ink-800 hover:border-ink-950/20",
              ].join(" ")}
              data-circuit-guide-goal={challenge.id}
              onClick={() => onSelectChallenge(challenge.id)}
            >
              {challenge.title[locale]}
            </button>
          );
        })}
      </div>

      {checkResult ? (
        <div
          className={[
            "mt-2 rounded-[18px] border px-3 py-2 text-sm leading-5",
            resultTone,
          ].join(" ")}
          data-circuit-guide-result={checkResult.status}
        >
          <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="min-w-0">
              <p className="font-semibold text-ink-950">{checkResult.title}</p>
              <p className="mt-1 text-ink-800">{checkResult.hint}</p>
              {explanationOpen ? (
                <p className="mt-2 rounded-2xl border border-white/50 bg-white/55 px-3 py-2 text-ink-800">
                  {checkResult.explanation}
                </p>
              ) : null}
            </div>
            {checkResult.measurements.length > 0 ? (
              <dl className="grid min-w-[13rem] gap-1 sm:grid-cols-2 lg:grid-cols-1">
                {checkResult.measurements.map((measurement) => (
                  <div
                    key={measurement.label}
                    className="rounded-xl border border-white/60 bg-white/65 px-2.5 py-1.5"
                  >
                    <dt className="text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-ink-500">
                      {measurement.label}
                    </dt>
                    <dd className="mt-0.5 font-semibold text-ink-950">
                      {measurement.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
