"use client";

import { useTranslations } from "next-intl";
import type { ResolvedPublicExperimentCard } from "@/lib/share-links";
import { conceptShareAnchorIds } from "@/lib/share-links";

type PublicExperimentCardProps = {
  conceptTitle: string;
  card: ResolvedPublicExperimentCard;
};

export function PublicExperimentCard({
  conceptTitle,
  card,
}: PublicExperimentCardProps) {
  const t = useTranslations("PublicExperimentCard");

  const kindLabels: Record<ResolvedPublicExperimentCard["kind"], string> = {
    "guided-setup": t("kinds.guidedSetup"),
    "live-setup": t("kinds.sharedSetup"),
    "compare-setup": t("kinds.sharedCompareBench"),
    "saved-compare": t("kinds.savedCompareSetup"),
  };

  const kindDescriptions: Record<ResolvedPublicExperimentCard["kind"], string> = {
    "guided-setup": t("descriptions.guidedSetup"),
    "live-setup": t("descriptions.liveSetup"),
    "compare-setup": t("descriptions.compareSetup"),
    "saved-compare": t("descriptions.savedCompare"),
  };

  return (
    <section className="rounded-[22px] border border-line bg-[linear-gradient(135deg,rgba(30,166,162,0.12),rgba(255,255,255,0.96))] p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-teal-500/25 bg-teal-500/10 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-teal-700">
              {t("labels.setupLink")}
            </span>
            <span className="rounded-full border border-line bg-white/80 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600">
              {kindLabels[card.kind]}
            </span>
          </div>
          <div>
            <p className="lab-label">{conceptTitle}</p>
            <h2 className="mt-1 text-xl font-semibold leading-tight text-ink-950 sm:text-2xl">
              {card.title}
            </h2>
          </div>
          <p className="max-w-3xl text-sm leading-6 text-ink-700">
            {card.prompt ?? kindDescriptions[card.kind]}
          </p>
        </div>

        <a
          href={`#${conceptShareAnchorIds.liveBench}`}
          className="inline-flex items-center justify-center rounded-full border border-teal-500/25 bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600"
        >
          {t("actions.tryThisSetup")}
        </a>
      </div>
    </section>
  );
}
