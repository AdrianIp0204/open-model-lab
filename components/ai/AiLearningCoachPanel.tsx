"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { AppLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { buildAiLearningContext } from "@/lib/ai/context";
import type { AiCoachMode } from "@/lib/ai/types";
import { useAccountSession } from "@/lib/account/client";
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
  const panelId = useId();
  const runtimeSnapshot = useConceptPageRuntimeSnapshot();
  const session = useAccountSession();
  const { response, isLoading, error, requestCoach } = useAiCoach();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const canUseAiCoach =
    session.initialized &&
    session.status === "signed-in" &&
    session.entitlement.capabilities.canUseAiCoach;

  useEffect(() => {
    if (!open) {
      return;
    }

    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const closePanel = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleRequest = (mode: AiCoachMode) => {
    if (!canUseAiCoach) {
      return;
    }

    const context = buildAiLearningContext({
      concept,
      simulationSource,
      runtimeSnapshot,
      locale,
    });

    void requestCoach(mode, context);
  };

  return (
    <div
      data-testid="ai-learning-coach-widget"
      className="pointer-events-none fixed left-4 right-4 z-40 flex flex-col items-end gap-3 sm:left-auto sm:w-[26rem]"
      style={{ bottom: "calc(max(1rem, env(safe-area-inset-bottom)) + 4.25rem)" }}
    >
      {open ? (
        <section
          id={panelId}
          aria-labelledby={`${panelId}-title`}
          role="dialog"
          aria-modal="false"
          data-testid="ai-learning-coach-panel"
          className="pointer-events-auto w-full max-h-[min(36rem,calc(100vh-7rem))] overflow-y-auto lab-panel p-4 sm:p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <p className="lab-label text-sky-800">AI guidance</p>
              <h2 id={`${panelId}-title`} className="text-lg font-semibold text-ink-950">
                AI Learning Coach
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-ink-700">
                Get one thing to try, one thing to notice, and one question to think
                about.
              </p>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closePanel}
              className="rounded-full border border-line bg-paper-strong px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-500 transition-colors hover:border-ink-950/20 hover:text-ink-700"
            >
              Close
            </button>
          </div>

          <div className="mt-4 rounded-[18px] border border-line bg-paper-strong/85 p-3">
            {!session.initialized ? (
              <p className="text-sm leading-6 text-ink-700">Checking supporter access...</p>
            ) : !canUseAiCoach ? (
              <div className="space-y-3 text-sm leading-6 text-ink-700">
                <p>
                  AI Coach is a Supporter feature because model calls have real API
                  cost.
                </p>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-full bg-ink-950 px-4 py-2 text-xs font-semibold text-paper-strong transition hover:opacity-90"
                >
                  View supporter options
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => handleRequest("guide")}
                  disabled={isLoading}
                  className="inline-flex items-center justify-center rounded-full bg-ink-950 px-4 py-2 text-xs font-semibold text-paper-strong transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? "Thinking..." : "Guide me"}
                </button>

                {isLoading ? (
                  <p className="text-sm leading-6 text-ink-700">
                    Thinking of a useful next step...
                  </p>
                ) : error ? (
                  <p className="text-sm leading-6 text-ink-700">
                    {error.message ||
                      "The AI coach is unavailable right now. Try changing one simulation control and watching what changes."}
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
                              className="rounded-full border border-line bg-white px-2 py-1 text-[0.72rem] font-medium text-ink-700"
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
            )}
          </div>
        </section>
      ) : null}

      <button
        ref={triggerRef}
        type="button"
        data-testid="ai-learning-coach-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
        className="pointer-events-auto inline-flex items-center rounded-full border border-line bg-paper-strong px-5 py-3 text-sm font-semibold text-ink-950 shadow-[0_16px_36px_rgba(15,28,36,0.14)] transition-transform duration-200 hover:-translate-y-0.5"
      >
        {open ? "Hide AI Coach" : "AI Coach"}
      </button>
    </div>
  );
}
