"use client";

import type { AppLocale } from "@/i18n/routing";
import { buildAiLearningContext } from "@/lib/ai/context";
import type { AiCoachMode } from "@/lib/ai/types";
import type { ConceptContent } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";
import { useConceptPageRuntimeSnapshot } from "@/components/concepts/ConceptLearningBridge";
import { useAiCoach } from "./useAiCoach";

type AiLearningCoachPanelProps = {
  concept: ConceptContent;
  simulationSource: ConceptSimulationSource;
  locale: AppLocale;
};

const citationTypeLabels = {
  page: "Page",
  simulation: "Simulation",
  formula: "Formula",
  "learning-flow": "Learning flow",
} as const;

export function AiLearningCoachPanel({
  concept,
  simulationSource,
  locale,
}: AiLearningCoachPanelProps) {
  const runtimeSnapshot = useConceptPageRuntimeSnapshot();
  const { response, isLoading, error, requestCoach } = useAiCoach();

  const handleRequest = (mode: AiCoachMode) => {
    const context = buildAiLearningContext({
      concept,
      simulationSource,
      runtimeSnapshot,
      locale,
    });

    void requestCoach(mode, context);
  };

  return (
    <section
      aria-labelledby="ai-learning-coach-title"
      data-testid="ai-learning-coach-panel"
      className="rounded-[22px] border border-sky-200/80 bg-sky-50/70 p-3 text-ink-900 shadow-sm shadow-sky-900/5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="lab-label text-sky-800">AI guidance</p>
          <h2
            id="ai-learning-coach-title"
            className="mt-1 text-sm font-semibold text-ink-950"
          >
            AI Learning Coach
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-ink-700">
            Get one thing to try, one thing to notice, and one question to think about.
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleRequest("guide")}
          disabled={isLoading}
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-ink-950 px-3.5 py-2 text-xs font-semibold text-paper-strong transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Thinking..." : "Guide me"}
        </button>
      </div>

      <div className="mt-3 rounded-[18px] border border-white/80 bg-white/65 p-3">
        {isLoading ? (
          <p className="text-sm leading-6 text-ink-700">
            Thinking of a useful next step...
          </p>
        ) : error ? (
          <p className="text-sm leading-6 text-ink-700">
            The AI coach is unavailable right now. Try changing one simulation control
            and watching what changes.
          </p>
        ) : response ? (
          <div className="grid gap-2.5 text-sm leading-6 text-ink-800">
            <p>
              <span className="font-semibold text-ink-950">Try: </span>
              {response.action}
            </p>
            <p>
              <span className="font-semibold text-ink-950">Notice: </span>
              {response.observe}
            </p>
            <p>
              <span className="font-semibold text-ink-950">Think: </span>
              {response.question}
            </p>
            {response.citations.length ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-600">
                  Grounded in
                </p>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {response.citations.map((citation, index) => (
                    <li
                      key={`${citation.type}-${citation.label}-${index}`}
                      className="rounded-full border border-line bg-paper-strong px-2 py-1 text-[0.72rem] font-medium text-ink-700"
                    >
                      {citationTypeLabels[citation.type]}: {citation.label}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {response.safetyNote ? (
              <p className="rounded-[14px] border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs leading-5 text-amber-900">
                {response.safetyNote}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm leading-6 text-ink-700">
            Use this when you want one concrete next move on the live bench.
          </p>
        )}
      </div>
    </section>
  );
}
