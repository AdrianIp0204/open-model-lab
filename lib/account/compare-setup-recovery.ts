import type { AppLocale } from "@/i18n/routing";
import type { SavedCompareSetupRecord } from "@/lib/saved-compare-setups";
import {
  buildConceptLabHref,
  conceptShareAnchorIds,
  type ResolvedPublicExperimentCard,
} from "@/lib/share-links";

export type SavedCompareSetupRecoveryAction = {
  id: string;
  conceptSlug: string;
  title: string;
  updatedAt: string;
  setupALabel: string;
  setupBLabel: string;
  href: string;
};

export function buildSavedCompareSetupPublicExperimentCard(
  savedSetup: Pick<
    SavedCompareSetupRecord,
    "conceptSlug" | "title" | "setupALabel" | "setupBLabel" | "publicExperimentParam"
  >,
): ResolvedPublicExperimentCard {
  return {
    title: savedSetup.title,
    prompt: `Open this saved compare bench and start testing ${savedSetup.setupALabel} against ${savedSetup.setupBLabel} right away.`,
    kind: "saved-compare",
  };
}

export function buildSavedCompareSetupRecoveryAction(options: {
  savedSetup: SavedCompareSetupRecord;
  locale?: AppLocale;
}) {
  const { locale, savedSetup } = options;

  return {
    id: savedSetup.id,
    conceptSlug: savedSetup.conceptSlug,
    title: savedSetup.title,
    updatedAt: savedSetup.updatedAt,
    setupALabel: savedSetup.setupALabel,
    setupBLabel: savedSetup.setupBLabel,
    href: buildConceptLabHref(savedSetup.conceptSlug, {
      hash: conceptShareAnchorIds.liveBench,
      stateParam: savedSetup.stateParam,
      publicExperimentParam: savedSetup.publicExperimentParam,
      locale,
    }),
  } satisfies SavedCompareSetupRecoveryAction;
}
