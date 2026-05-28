"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { previewFeedbackEmail } from "@/lib/feedback";
import type { FeedbackContext } from "@/lib/feedback";

function FeedbackFormLoading() {
  const t = useTranslations("FeedbackWidget");

  return (
    <p
      role="status"
      className="rounded-3xl border border-line bg-paper-strong px-4 py-4 text-sm leading-6 text-ink-700"
    >
      {t("loading")}
    </p>
  );
}

const FeedbackCaptureForm = dynamic(
  () => import("./FeedbackCaptureForm").then((module) => module.FeedbackCaptureForm),
  {
    ssr: false,
    loading: FeedbackFormLoading,
  },
);

type FeedbackWidgetProps = {
  context: FeedbackContext;
  fallbackEmail?: string;
  mobileHidden?: boolean;
  placement?: "floating" | "inline";
};

export function FeedbackWidget({
  context,
  fallbackEmail = previewFeedbackEmail,
  mobileHidden = false,
  placement = "floating",
}: FeedbackWidgetProps) {
  const t = useTranslations("FeedbackWidget");
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

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

  const isInline = placement === "inline";

  return (
    <div
      className={[
        isInline
          ? "mx-auto flex w-full max-w-[88rem] flex-col items-end gap-3 px-4 pb-4 sm:px-6 lg:px-8"
          : "pointer-events-none z-40 mx-3 mb-3 flex-col items-end gap-3 sm:fixed sm:left-auto sm:right-4 sm:mx-0 sm:mb-0 sm:w-[26rem]",
        mobileHidden ? "hidden sm:flex" : "flex",
      ].join(" ")}
      style={isInline ? undefined : { bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      {open ? (
        <section
          id={panelId}
          aria-labelledby={`${panelId}-title`}
          role="dialog"
          aria-modal="false"
          className="pointer-events-auto w-full lab-panel p-4 sm:w-[26rem] sm:p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="lab-label">{t("label")}</p>
              <h2 id={`${panelId}-title`} className="text-lg font-semibold text-ink-950">
                {t("title")}
              </h2>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
              className="rounded-full border border-line bg-paper-strong px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-500 transition-colors hover:border-ink-950/20 hover:text-ink-700"
            >
              {t("actions.close")}
            </button>
          </div>

          <div className="mt-4">
            <FeedbackCaptureForm
              context={context}
              fallbackEmail={fallbackEmail}
              variant="compact"
            />
          </div>
        </section>
      ) : null}

      <button
        ref={triggerRef}
        type="button"
        aria-label={open ? t("actions.hide") : t("label")}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
        data-testid="feedback-widget-trigger"
        className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-paper-strong p-0 text-sm font-semibold text-ink-950 shadow-[0_16px_36px_rgba(15,28,36,0.14)] transition-transform duration-200 hover:-translate-y-0.5 sm:h-auto sm:w-auto sm:px-5 sm:py-3"
      >
        <svg
          aria-hidden="true"
          className="h-4 w-4 sm:hidden"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
          <path d="M8 9h8" />
          <path d="M8 13h5" />
        </svg>
        <span className="sr-only sm:not-sr-only">
          {open ? t("actions.hide") : t("label")}
        </span>
      </button>
    </div>
  );
}
