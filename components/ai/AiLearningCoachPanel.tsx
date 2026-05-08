"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { AppLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { buildAiLearningContext } from "@/lib/ai/context";
import type { AiCoachCitation, AiCoachMode } from "@/lib/ai/types";
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

function getAiCoachErrorTranslationKey(code: string | undefined) {
  switch (code) {
    case "ai_features_disabled":
      return "errors.featuresDisabled";
    case "ai_auth_required":
      return "errors.authRequired";
    case "ai_premium_required":
      return "errors.premiumRequired";
    case "ai_monthly_quota_exceeded":
      return "errors.monthlyQuotaExceeded";
    case "rate_limited":
      return "errors.rateLimited";
    case "ai_quota_storage_unavailable":
      return "errors.quotaStorageUnavailable";
    case "ai_quota_record_failed":
      return "errors.quotaRecordFailed";
    case "ai_provider_unconfigured":
      return "errors.providerUnconfigured";
    case "ai_provider_unavailable":
      return "errors.providerUnavailable";
    default:
      return "errors.default";
  }
}

function shouldShowRequestIdForError(code: string | undefined) {
  return code !== "ai_auth_required" && code !== "ai_premium_required";
}

export function AiLearningCoachPanel({
  concept,
  simulationSource,
  locale,
}: AiLearningCoachPanelProps) {
  const t = useTranslations("AiLearningCoach");
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

  const getCitationTypeLabel = (type: AiCoachCitation["type"]) =>
    t(`citations.types.${type}`);
  const errorMessage = error ? t(getAiCoachErrorTranslationKey(error.code)) : null;
  const showRequestId =
    Boolean(error?.requestId) && shouldShowRequestIdForError(error?.code);

  return (
    <div
      data-testid="ai-learning-coach-widget"
      className="pointer-events-none fixed left-3 right-3 z-50 hidden flex-col items-start gap-3 sm:left-4 sm:right-auto sm:flex sm:w-[min(24rem,calc(100vw-2rem))]"
      style={{ bottom: "max(0.625rem, env(safe-area-inset-bottom))" }}
    >
      {open ? (
        <section
          id={panelId}
          aria-labelledby={`${panelId}-title`}
          role="dialog"
          aria-modal="false"
          data-testid="ai-learning-coach-panel"
          className="pointer-events-auto w-full max-h-[min(34rem,calc(100vh-6rem))] overflow-y-auto rounded-[22px] border border-line bg-paper-strong p-4 shadow-[0_20px_48px_rgba(15,28,36,0.22)] sm:p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <p className="lab-label text-sky-800">{t("label")}</p>
              <h2 id={`${panelId}-title`} className="text-lg font-semibold text-ink-950">
                {t("title")}
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-ink-700">
                {t("description")}
              </p>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closePanel}
              className="rounded-full border border-line bg-paper-strong px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-500 transition-colors hover:border-ink-950/20 hover:text-ink-700"
            >
              {t("actions.close")}
            </button>
          </div>

          <div
            data-testid="ai-learning-coach-body"
            className="mt-4 rounded-[18px] border border-line bg-white p-3"
          >
            {!session.initialized ? (
              <p className="text-sm leading-6 text-ink-700">{t("states.checking")}</p>
            ) : !canUseAiCoach ? (
              <div className="space-y-3 text-sm leading-6 text-ink-700">
                <p>{t("locked.description")}</p>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-full bg-ink-950 px-4 py-2 text-xs font-semibold text-paper-strong transition hover:opacity-90"
                >
                  {t("actions.viewSupporterOptions")}
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
                  {isLoading ? t("actions.thinking") : t("actions.guide")}
                </button>

                {isLoading ? (
                  <p className="text-sm leading-6 text-ink-700">
                    {t("states.loading")}
                  </p>
                ) : error ? (
                  <div className="space-y-1.5 text-sm leading-6 text-ink-700">
                    <p>{errorMessage}</p>
                    {showRequestId ? (
                      <p className="text-xs leading-5 text-ink-500">
                        {t("errors.requestId", { requestId: error.requestId ?? "" })}
                      </p>
                    ) : null}
                  </div>
                ) : response ? (
                  <div className="grid gap-2.5 text-sm leading-6 text-ink-800">
                    <p>
                      <span className="font-semibold text-ink-950">{t("response.try")}: </span>
                      {response.action}
                    </p>
                    <p>
                      <span className="font-semibold text-ink-950">{t("response.notice")}: </span>
                      {response.observe}
                    </p>
                    <p>
                      <span className="font-semibold text-ink-950">{t("response.think")}: </span>
                      {response.question}
                    </p>
                    {response.citations.length ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-600">
                          {t("citations.groundedIn")}
                        </p>
                        <ul className="mt-1 flex flex-wrap gap-1.5">
                          {response.citations.map((citation, index) => (
                            <li
                              key={`${citation.type}-${citation.label}-${index}`}
                              className="rounded-full border border-line bg-white px-2 py-1 text-[0.72rem] font-medium text-ink-700"
                            >
                              {getCitationTypeLabel(citation.type)}: {citation.label}
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
                    {t("states.empty")}
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
        className="pointer-events-auto inline-flex min-h-10 items-center rounded-full border border-line/85 bg-paper-strong/92 px-3 py-2 text-xs font-semibold text-ink-950 shadow-[0_10px_24px_rgba(15,28,36,0.12)] backdrop-blur transition-transform duration-200 hover:-translate-y-0.5 sm:min-h-0 sm:px-5 sm:py-3 sm:text-sm sm:shadow-[0_16px_36px_rgba(15,28,36,0.14)]"
      >
        {open ? t("actions.hide") : t("actions.trigger")}
      </button>
    </div>
  );
}
