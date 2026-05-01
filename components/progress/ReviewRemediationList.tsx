"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { AppLocale } from "@/i18n/routing";
import {
  getProgressRemediationActionKey,
  getProgressRemediationDescriptionKey,
  getProgressRemediationKindLabelKey,
  getProgressRemediationTitleKey,
  shouldUseGenericProgressCopy,
} from "@/lib/i18n/progress";
import type { ReviewRemediationSuggestion } from "@/lib/progress";
import { localizeShareHref } from "@/lib/share-links";

type ReviewRemediationListProps = {
  suggestions: ReviewRemediationSuggestion[];
  variant?: "default" | "compact";
  className?: string;
};

const suggestionLabels: Record<ReviewRemediationSuggestion["kind"], string> = {
  "prerequisite-concept": "Prerequisite concept",
  "prerequisite-track": "Prep track",
  "track-recap": "Recap path",
  "guided-collection-bundle": "Concept bundle",
  "guided-collection": "Guided collection",
  "saved-compare-setup": "Saved compare setup",
};

export function ReviewRemediationList({
  suggestions,
  variant = "default",
  className,
}: ReviewRemediationListProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("ProgressRemediation");
  const useGenericProgressCopy = shouldUseGenericProgressCopy(locale);

  if (!suggestions.length) {
    return null;
  }

  const compact = variant === "compact";

  return (
    <section
      className={[
        compact
          ? "space-y-2"
          : "rounded-[20px] border border-line bg-paper-strong/80 p-4",
        className ?? "",
      ].join(" ")}
    >
      <div className="space-y-1">
        <p className="lab-label">{t("heading.label")}</p>
        {!compact ? (
          <p className="text-sm leading-6 text-ink-700">
            {t("heading.description")}
          </p>
        ) : null}
      </div>

      <div className="grid gap-3">
        {suggestions.map((suggestion) => {
          const displayKindLabel = useGenericProgressCopy
            ? t(getProgressRemediationKindLabelKey(suggestion.kind))
            : suggestionLabels[suggestion.kind];
          const displayTitle = useGenericProgressCopy
            ? t(getProgressRemediationTitleKey(suggestion.kind))
            : suggestion.title;
          const displayNote = useGenericProgressCopy
            ? t(getProgressRemediationDescriptionKey(suggestion.kind))
            : suggestion.note;
          const displayActionLabel = useGenericProgressCopy
            ? t(getProgressRemediationActionKey(suggestion.kind))
            : suggestion.action.label;
          const displayHref = localizeShareHref(suggestion.action.href, locale);

          return (
            <article
              key={suggestion.id}
              className={
                compact
                  ? "rounded-[18px] border border-line bg-paper-strong px-3 py-3"
                  : "rounded-[18px] border border-line bg-paper px-3.5 py-3"
              }
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                  {displayKindLabel}
                </span>
                <h4 className="text-sm font-semibold text-ink-950">{displayTitle}</h4>
              </div>
              <p className="mt-2 text-sm leading-6 text-ink-700">{displayNote}</p>
              <Link
                href={displayHref}
                className="mt-3 inline-flex items-center rounded-full border border-line bg-paper-strong px-3.5 py-2 text-sm font-semibold text-ink-900 transition-colors hover:border-ink-950/20 hover:bg-white"
              >
                {displayActionLabel}
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
