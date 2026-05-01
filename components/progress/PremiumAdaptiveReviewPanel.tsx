import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getStarterTrackBySlug } from "@/lib/content";
import { getConceptDisplayTitle, getStarterTrackDisplayTitle } from "@/lib/i18n/content";
import {
  getLocalizedConceptMasteryNote,
  getLocalizedProgressSupportReason,
  getProgressActionKey,
  getProgressFocusLabelKey,
  getProgressReasonKey,
  shouldUseGenericProgressCopy,
} from "@/lib/i18n/progress";
import type { PremiumAdaptiveReviewSummary } from "@/lib/progress";
import { MasteryStateBadge } from "./MasteryStateBadge";
import { ProgressStatusBadge } from "./ProgressStatusBadge";
import { ReviewRemediationList } from "./ReviewRemediationList";
import { formatProgressMonthDay } from "./dateFormatting";

type PremiumAdaptiveReviewPanelProps = {
  summary: PremiumAdaptiveReviewSummary;
  variant?: "dashboard" | "analytics";
  className?: string;
  limit?: number;
};

type ProgressTranslateFn = (
  key: string,
  values?: Record<string, unknown>,
) => string;

const outcomeToneClasses = {
  checkpoint: "border-amber-500/30 bg-amber-500/10 text-amber-800",
  challenge: "border-coral-500/25 bg-coral-500/10 text-coral-700",
  diagnostic: "border-sky-500/25 bg-sky-500/10 text-sky-700",
  "quick-test": "border-teal-500/25 bg-teal-500/10 text-teal-700",
  concept: "border-line bg-paper text-ink-600",
} as const;

function getOutcomeLabel(
  outcomeKind: keyof typeof outcomeToneClasses,
  t: ReturnType<typeof useTranslations<"PremiumAdaptiveReviewPanel">>,
) {
  switch (outcomeKind) {
    case "checkpoint":
      return t("outcomes.checkpoint");
    case "challenge":
      return t("outcomes.challenge");
    case "diagnostic":
      return t("outcomes.diagnostic");
    case "quick-test":
      return t("outcomes.quickTest");
    default:
      return t("outcomes.concept");
  }
}

function getHeadingCopy(
  variant: NonNullable<PremiumAdaptiveReviewPanelProps["variant"]>,
  t: ReturnType<typeof useTranslations<"PremiumAdaptiveReviewPanel">>,
) {
  if (variant === "dashboard") {
    return {
      eyebrow: t("dashboard.eyebrow"),
      title: t("dashboard.title"),
      description: t("dashboard.description"),
      methodology: t("dashboard.methodology"),
    };
  }

  return {
    eyebrow: t("analytics.eyebrow"),
    title: t("analytics.title"),
    description: t("analytics.description"),
    methodology: t("analytics.methodology"),
  };
}

function EmptyAdaptiveReviewState({
  hasRecordedProgress,
  t,
}: Pick<PremiumAdaptiveReviewSummary, "hasRecordedProgress"> & {
  t: ReturnType<typeof useTranslations<"PremiumAdaptiveReviewPanel">>;
}) {
  return (
    <div className="rounded-[22px] border border-line bg-paper-strong p-4">
      <p className="text-sm font-semibold text-ink-950">
        {hasRecordedProgress
          ? t("empty.withProgress.title")
          : t("empty.withoutProgress.title")}
      </p>
      <p className="mt-2 text-sm leading-6 text-ink-700">
        {hasRecordedProgress
          ? t("empty.withProgress.description")
          : t("empty.withoutProgress.description")}
      </p>
    </div>
  );
}

export function PremiumAdaptiveReviewPanel({
  summary,
  variant = "analytics",
  className,
  limit = variant === "dashboard" ? 2 : 3,
}: PremiumAdaptiveReviewPanelProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("PremiumAdaptiveReviewPanel");
  const tProgress = useTranslations("ProgressCopy");
  const translateProgress = tProgress as unknown as ProgressTranslateFn;
  const copy = getHeadingCopy(variant, t);
  const items = summary.items.slice(0, Math.max(0, limit));
  const useGenericProgressCopy = shouldUseGenericProgressCopy(locale);

  return (
    <section className={["space-y-4", className].filter(Boolean).join(" ")}>
      <div className="space-y-2">
        <p className="lab-label">{copy.eyebrow}</p>
        <h2 className="text-xl font-semibold text-ink-950 sm:text-2xl">{copy.title}</h2>
        <p className="max-w-4xl text-sm leading-6 text-ink-700">{copy.description}</p>
        <p className="max-w-4xl text-sm leading-6 text-ink-700">
          {useGenericProgressCopy ? copy.methodology : summary.methodologyNote}
        </p>
      </div>

      {items.length ? (
        <div className={variant === "dashboard" ? "grid gap-4 xl:grid-cols-2" : "grid gap-4"}>
          {items.map((item) => {
            const lastActiveLabel = formatProgressMonthDay(item.lastActivityAt, "synced", locale);
            const displayTitle = getConceptDisplayTitle(item.concept, locale);
            const displayReasonLabel = useGenericProgressCopy
              ? translateProgress(getProgressReasonKey(item.reasonKind))
              : item.reasonLabel;
            const displayWhyChosen = useGenericProgressCopy
              ? (() => {
                  const descriptor = getLocalizedProgressSupportReason(item.whyChosen);
                  if (descriptor) {
                    return translateProgress(descriptor.key, descriptor.values);
                  }

                  const masteryDescriptor = getLocalizedConceptMasteryNote(item.whyChosen);
                  if (masteryDescriptor) {
                    return translateProgress(
                      masteryDescriptor.key,
                      masteryDescriptor.values,
                    );
                  }

                  return translateProgress(getProgressReasonKey(item.reasonKind));
                })()
              : item.whyChosen;
            const displaySupportReasons = useGenericProgressCopy
              ? item.supportReasons
                  .map((reason) => {
                    const descriptor = getLocalizedProgressSupportReason(reason);
                    return descriptor
                      ? translateProgress(descriptor.key, descriptor.values)
                      : null;
                  })
                  .filter((reason): reason is string => Boolean(reason))
              : item.supportReasons;
            const displayTrackTitle = item.trackContext
              ? getStarterTrackDisplayTitle(
                  getStarterTrackBySlug(item.trackContext.trackSlug),
                  locale,
                )
              : null;
            const trackCueLabel =
              item.trackContext && useGenericProgressCopy
                ? translateProgress(getProgressFocusLabelKey(item.trackContext.focusKind))
                : item.trackContext?.focusLabel ?? null;
            const trackCueNote =
              item.trackContext && useGenericProgressCopy
                ? t("trackCue.note", { title: displayTrackTitle ?? item.trackContext.trackTitle })
                : item.trackContext?.note ?? null;
            const primaryActionLabel = useGenericProgressCopy
              ? translateProgress(
                  getProgressActionKey(item.primaryAction.kind, {
                    conceptStatus: item.progressStatus,
                  }),
                )
              : item.primaryAction.label;
            const secondaryActionLabel =
              item.secondaryAction && useGenericProgressCopy
                ? translateProgress(
                    getProgressActionKey(item.secondaryAction.kind, {
                      conceptStatus: item.progressStatus,
                    }),
                  )
                : item.secondaryAction?.label ?? null;
            const outcomeLabel = useGenericProgressCopy
              ? getOutcomeLabel(item.outcomeKind, t)
              : item.outcomeLabel;

            return (
              <article key={item.id} className="lab-panel p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={[
                      "rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
                      outcomeToneClasses[item.outcomeKind],
                    ].join(" ")}
                  >
                    {outcomeLabel}
                  </span>
                  <ProgressStatusBadge status={item.progressStatus} compact />
                  <MasteryStateBadge state={item.masteryState} compact />
                  {item.trackContext ? (
                    <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                      {trackCueLabel}
                    </span>
                  ) : null}
                  {lastActiveLabel ? (
                    <span className="rounded-full border border-line bg-paper px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                      {t("meta.lastActive", { date: lastActiveLabel })}
                    </span>
                  ) : null}
                </div>

                <h3 className="mt-4 text-xl font-semibold text-ink-950">{displayTitle}</h3>
                <p className="mt-2 text-sm font-semibold uppercase tracking-[0.16em] text-ink-500">
                  {displayReasonLabel}
                </p>
                <p className="mt-2 text-sm leading-6 text-ink-700">
                  <span className="font-semibold text-ink-950">{t("meta.chosenBecause")}</span>{" "}
                  {displayWhyChosen}
                </p>
                {item.trackContext ? (
                  <p className="mt-2 text-sm leading-6 text-ink-600">
                    {displayTrackTitle ?? item.trackContext.trackTitle}: {trackCueNote}
                  </p>
                ) : null}

                {displaySupportReasons.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {displaySupportReasons.slice(0, 2).map((reason) => (
                      <span
                        key={reason}
                        className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs text-ink-700"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={item.primaryAction.href}
                    className="inline-flex items-center rounded-full bg-ink-950 px-4 py-2.5 text-sm font-semibold transition hover:opacity-90"
                    style={{ color: "var(--paper-strong)" }}
                  >
                    {primaryActionLabel}
                  </Link>
                  {item.secondaryAction ? (
                    <Link
                      href={item.secondaryAction.href}
                      className="inline-flex items-center rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
                    >
                      {secondaryActionLabel}
                    </Link>
                  ) : null}
                </div>

                <ReviewRemediationList
                  suggestions={item.remediationSuggestions}
                  variant="compact"
                  className="mt-4"
                />
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyAdaptiveReviewState hasRecordedProgress={summary.hasRecordedProgress} t={t} />
      )}
    </section>
  );
}
