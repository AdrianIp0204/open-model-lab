"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import type { AchievementToastSummary } from "@/lib/achievements";

type AchievementCelebrationToastsProps = {
  toasts: AchievementToastSummary[];
  onDismiss: (key: string, earnedAt: string | null) => void;
};

const TOAST_LIFETIME_MS = 4200;

export function AchievementCelebrationToasts({
  toasts,
  onDismiss,
}: AchievementCelebrationToastsProps) {
  const t = useTranslations("AchievementCelebrationToasts");

  useEffect(() => {
    if (!toasts.length) {
      return;
    }

    const timers = toasts.map((toast) =>
      window.setTimeout(() => {
        onDismiss(toast.key, toast.earnedAt ?? null);
      }, TOAST_LIFETIME_MS),
    );

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [onDismiss, toasts]);

  if (!toasts.length) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-40 flex max-w-sm flex-col gap-3"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <section
          key={`${toast.key}:${toast.earnedAt ?? ""}`}
          className="pointer-events-auto rounded-[22px] border border-teal-500/25 bg-white/96 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.14)] backdrop-blur"
          role="status"
        >
          <p className="lab-label">{t("label")}</p>
          <h2 className="mt-2 text-base font-semibold text-ink-950">{toast.title}</h2>
          <p className="mt-2 text-sm leading-6 text-ink-700">{toast.description}</p>
          <button
            type="button"
            onClick={() => onDismiss(toast.key, toast.earnedAt ?? null)}
            className="mt-3 inline-flex items-center rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-ink-700 transition hover:border-teal-500/35 hover:bg-white"
          >
            {t("dismiss")}
          </button>
        </section>
      ))}
    </div>
  );
}
