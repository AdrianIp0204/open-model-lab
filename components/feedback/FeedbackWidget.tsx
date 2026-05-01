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
};

export function FeedbackWidget({
  context,
  fallbackEmail = previewFeedbackEmail,
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

  return (
    <div
      className="pointer-events-none fixed left-4 right-4 z-40 flex flex-col items-end gap-3 sm:left-auto sm:w-[26rem]"
      style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      {open ? (
        <section
          id={panelId}
          aria-labelledby={`${panelId}-title`}
          role="dialog"
          aria-modal="false"
          className="pointer-events-auto w-full lab-panel p-4 sm:p-5"
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
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
        className="pointer-events-auto inline-flex items-center rounded-full border border-line bg-paper-strong px-5 py-3 text-sm font-semibold text-ink-950 shadow-[0_16px_36px_rgba(15,28,36,0.14)] transition-transform duration-200 hover:-translate-y-0.5"
      >
        {open ? t("actions.hide") : t("label")}
      </button>
    </div>
  );
}
