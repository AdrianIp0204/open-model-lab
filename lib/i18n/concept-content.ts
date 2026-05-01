import type {
  ConceptContent,
  ConceptId,
  ResolvedConceptContentMetadata,
} from "@/lib/content";
import {
  getConceptById,
  getConceptBySlug,
  resolveConceptVariantSelection,
} from "@/lib/content";
import {
  buildConceptEditorialOverlaySource,
  sanitizeOverlayAgainstCanonical,
} from "@/lib/content/editorial-overlays";
import {
  localizeChallengeChecks,
  normalizeChallengeModeAuthoring,
} from "@/lib/content/challenges";
import {
  conceptVariantManifest,
  optimizedConceptOverlays,
} from "@/lib/content/generated/content-variants";
import type { AppLocale } from "@/i18n/routing";
import { contentTranslationsByLocale as generatedContentTranslationsByLocale } from "@/lib/i18n/generated/content-bundle";
import {
  type ContentTranslationBundle,
  type DeepPartial,
  emptyContentTranslations,
} from "@/lib/i18n/content-translations";
import { isPlainObject, mergeTranslatedValue } from "./content-merge";

// This module owns the rich concept resolver that consumes the generated concept variant manifest
// and full overlay bundles. Keep client-facing display helpers in `lib/i18n/content.ts`.
const contentTranslationsByLocale = generatedContentTranslationsByLocale as Partial<
  Record<AppLocale, ContentTranslationBundle>
>;

function getContentTranslations(locale: AppLocale): ContentTranslationBundle {
  return contentTranslationsByLocale[locale] ?? emptyContentTranslations;
}

function isChallengeCheckLike(value: unknown): value is Record<string, unknown> & { type: string } {
  return isPlainObject(value) && typeof value.type === "string";
}

function mergeChallengeChecksByIndex<
  T extends NonNullable<NonNullable<ConceptContent["challengeMode"]>["items"][number]["checks"]>,
>(
  baseChecks: T,
  translatedChecks: Array<DeepPartial<T[number]>>,
  options?: { preferTrailing?: boolean },
) {
  const preferTrailing = options?.preferTrailing ?? false;
  const startIndex =
    preferTrailing && translatedChecks.length < baseChecks.length
      ? baseChecks.length - translatedChecks.length
      : 0;

  return baseChecks.map((check, index) => {
    const translatedIndex = index - startIndex;

    if (translatedIndex < 0 || translatedIndex >= translatedChecks.length) {
      return check;
    }

    return mergeTranslatedValue(check, translatedChecks[translatedIndex]);
  }) as T;
}

function localizeSharedConceptAuthoringCopy(
  concept: ConceptContent,
  locale: AppLocale,
): ConceptContent {
  if (locale !== "zh-HK") {
    return concept;
  }

  if (!concept.noticePrompts) {
    return concept;
  }

  const localizedNoticeTitle =
    concept.noticePrompts.title === "What to notice"
      ? "觀察重點"
      : concept.noticePrompts.title;
  const localizedChallengeTitle =
    concept.challengeMode?.title === "Challenge mode"
      ? "挑戰模式"
      : concept.challengeMode?.title === "Challenge mode: centripetal force"
        ? "挑戰模式：向心力"
        : concept.challengeMode?.title;

  if (
    localizedNoticeTitle === concept.noticePrompts.title &&
    localizedChallengeTitle === concept.challengeMode?.title
  ) {
    return concept;
  }

  return {
    ...concept,
    noticePrompts: {
      ...concept.noticePrompts,
      title: localizedNoticeTitle,
    },
    challengeMode: concept.challengeMode
      ? {
          ...concept.challengeMode,
          title: localizedChallengeTitle,
        }
      : concept.challengeMode,
  };
}

function resolveTranslatedChallengeItem(
  concept: ConceptContent,
  challengeContext: Pick<
    ConceptContent,
    "graphs" | "simulation" | "variableLinks"
  >,
  locale: AppLocale,
  baseItem: NonNullable<ConceptContent["challengeMode"]>["items"][number],
  translatedItem: Record<string, unknown>,
) {
  const translatedTargets = Array.isArray(translatedItem.targets)
    ? translatedItem.targets
    : undefined;
  const translatedChecks = Array.isArray(translatedItem.checks)
    ? translatedItem.checks
    : undefined;
  const hasAuthoringTargets =
    translatedTargets?.some((target) => isPlainObject(target) && !("type" in target)) ?? false;
  const hasRequirementAuthoring = isPlainObject(translatedItem.requirements);
  const hasMislabeledChecks =
    translatedTargets?.length && translatedTargets.every((target) => isChallengeCheckLike(target));
  const hasTranslatedChecks = translatedChecks?.every((check) => isPlainObject(check)) ?? false;

  if (hasTranslatedChecks && !hasAuthoringTargets && !hasRequirementAuthoring && !hasMislabeledChecks) {
    const mergedChecks = mergeChallengeChecksByIndex(
      baseItem.checks,
      (translatedChecks ?? []) as Array<DeepPartial<(typeof baseItem.checks)[number]>>,
    );

    return mergeTranslatedValue(baseItem, {
      ...(translatedItem as DeepPartial<typeof baseItem>),
      checks: mergedChecks,
    });
  }

  if (!hasAuthoringTargets && !hasRequirementAuthoring && !hasMislabeledChecks) {
    if (locale === "en") {
      return mergeTranslatedValue(baseItem, translatedItem as DeepPartial<typeof baseItem>);
    }

    return mergeTranslatedValue(baseItem, {
      ...(translatedItem as DeepPartial<typeof baseItem>),
      checks: localizeChallengeChecks(baseItem.checks, {
        graphs: challengeContext.graphs,
        overlays: challengeContext.simulation.overlays,
        controls: challengeContext.simulation.controls,
        variableLinks: challengeContext.variableLinks,
        locale,
      }),
    });
  }

  const normalizedMode = normalizeChallengeModeAuthoring(
    {
      items: [
        {
          id: baseItem.id,
          title:
            typeof translatedItem.title === "string" ? translatedItem.title : baseItem.title,
          style: baseItem.style,
          prompt:
            typeof translatedItem.prompt === "string" ? translatedItem.prompt : baseItem.prompt,
          successMessage:
            typeof translatedItem.successMessage === "string"
              ? translatedItem.successMessage
              : baseItem.successMessage,
          setup: isPlainObject(translatedItem.setup)
            ? mergeTranslatedValue(
                baseItem.setup ?? {},
                translatedItem.setup as DeepPartial<NonNullable<typeof baseItem.setup>>,
              )
            : baseItem.setup,
          hints: Array.isArray(translatedItem.hints)
            ? (translatedItem.hints as typeof baseItem.hints)
            : baseItem.hints,
          checks: hasMislabeledChecks
            ? (translatedTargets as NonNullable<typeof baseItem.checks>)
            : (translatedChecks as NonNullable<typeof baseItem.checks> | undefined),
          requirements: hasRequirementAuthoring
            ? (translatedItem.requirements as Record<string, unknown>)
            : undefined,
          targets: hasAuthoringTargets ? (translatedTargets as Array<Record<string, unknown>>) : undefined,
        },
      ],
    },
    {
      graphs: challengeContext.graphs,
      overlays: challengeContext.simulation.overlays,
      controls: challengeContext.simulation.controls,
      variableLinks: challengeContext.variableLinks,
      locale,
    },
  );
  const normalizedItem = normalizedMode?.items[0];

  if (!normalizedItem) {
    return mergeTranslatedValue(baseItem, translatedItem as DeepPartial<typeof baseItem>);
  }

  return mergeTranslatedValue(baseItem, {
    ...(normalizedItem as DeepPartial<typeof baseItem>),
    checks: mergeChallengeChecksByIndex(
      baseItem.checks,
      (normalizedItem.checks ?? []) as Array<DeepPartial<(typeof baseItem.checks)[number]>>,
      { preferTrailing: hasAuthoringTargets && !hasRequirementAuthoring },
    ),
  });
}

function resolveTranslatedChallengeMode(
  concept: ConceptContent,
  challengeContext: Pick<ConceptContent, "graphs" | "simulation" | "variableLinks">,
  locale: AppLocale,
  translatedChallengeMode: Record<string, unknown>,
) {
  const baseMode = concept.challengeMode;

  if (!baseMode) {
    return undefined;
  }

  const translatedItems = Array.isArray(translatedChallengeMode.items)
    ? translatedChallengeMode.items
    : [];
  const translatedItemsById = new Map(
    translatedItems
      .filter(
        (item): item is Record<string, unknown> & { id: string } =>
          isPlainObject(item) && typeof item.id === "string",
      )
      .map((item) => [item.id, item]),
  );

  return {
    ...baseMode,
    title:
      typeof translatedChallengeMode.title === "string"
        ? translatedChallengeMode.title
        : baseMode.title,
    intro:
      typeof translatedChallengeMode.intro === "string"
        ? translatedChallengeMode.intro
        : baseMode.intro,
    items: baseMode.items.map((item) => {
      const translatedItem = translatedItemsById.get(item.id);
      return translatedItem
        ? resolveTranslatedChallengeItem(concept, challengeContext, locale, item, translatedItem)
        : item;
    }),
  };
}

export function resolveConceptContentVariant(
  concept: ConceptContent,
  locale: AppLocale,
): { content: ConceptContent; metadata: ResolvedConceptContentMetadata } {
  const canonicalOverlay = buildConceptEditorialOverlaySource(concept, concept);
  const localizedOverlay = sanitizeOverlayAgainstCanonical(
    getContentTranslations(locale).concepts[concept.slug],
    canonicalOverlay,
  );
  const localizedConceptOverlaysByLocale =
    locale === "en"
      ? {}
      : {
          [locale]: {
            concepts: localizedOverlay
              ? { [concept.slug]: localizedOverlay }
              : {},
          },
        };
  const { optimizedOverlay, localizedOverlay: selectedLocalizedOverlay, metadata } =
    resolveConceptVariantSelection({
      concept,
      requestedLocale: locale,
      manifest: conceptVariantManifest,
      optimizedConceptOverlays,
      localizedConceptOverlaysByLocale,
    });
  const baseConcept = optimizedOverlay ? mergeTranslatedValue(concept, optimizedOverlay) : concept;
  let resolvedConcept = baseConcept;

  if (selectedLocalizedOverlay) {
    const localizedConcept = mergeTranslatedValue(baseConcept, selectedLocalizedOverlay);

    if (baseConcept.challengeMode && isPlainObject(selectedLocalizedOverlay.challengeMode)) {
      resolvedConcept = {
        ...localizedConcept,
        challengeMode: resolveTranslatedChallengeMode(
          baseConcept,
          localizedConcept,
          locale,
          selectedLocalizedOverlay.challengeMode,
        ),
      };
    } else {
      resolvedConcept = localizedConcept;
    }
  }

  return {
    content: localizeSharedConceptAuthoringCopy(resolvedConcept, locale),
    metadata,
  };
}

export function resolveConceptContentBySlug(
  slug: string,
  locale: AppLocale,
  options?: { includeUnpublished?: boolean },
) {
  return resolveConceptContentVariant(getConceptBySlug(slug, options), locale);
}

export function resolveConceptContentById(
  id: ConceptId,
  locale: AppLocale,
  options?: { includeUnpublished?: boolean },
) {
  return resolveConceptContentVariant(getConceptById(id, options), locale);
}

export function localizeConceptContent(
  concept: ConceptContent,
  locale: AppLocale,
): ConceptContent {
  return resolveConceptContentVariant(concept, locale).content;
}
