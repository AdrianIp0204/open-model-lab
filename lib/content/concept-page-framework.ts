import type {
  ConceptContent,
  ConceptPageFramework,
  ConceptPageSectionConfig,
  ConceptPageSectionId,
} from "./schema";
import type { ReadNextRecommendation } from "./read-next";
import type { AppLocale } from "@/i18n/routing";
import { hasConceptQuizSupport } from "@/lib/quiz";
import enMessages from "@/messages/en.json";
import zhHkMessages from "@/messages/zh-HK.json";

export type ConceptPageSectionSlot =
  | "overview"
  | "practice-main"
  | "practice-aside"
  | "assessment"
  | "support-main"
  | "support-aside";

export type ResolvedConceptPageSection = {
  id: ConceptPageSectionId;
  slot: ConceptPageSectionSlot;
  title: string;
  order: number;
};

type SectionDefinition = {
  id: ConceptPageSectionId;
  slot: ConceptPageSectionSlot;
  defaultOrder: number;
};

type ResolveOptions = {
  readNext?: ReadNextRecommendation[];
  defaultTitles?: Partial<Record<ConceptPageSectionId, string>>;
  locale?: AppLocale;
};

const DEFAULT_SECTION_DEFINITIONS: SectionDefinition[] = [
  {
    id: "explanation",
    slot: "overview",
    defaultOrder: 10,
  },
  {
    id: "keyIdeas",
    slot: "overview",
    defaultOrder: 20,
  },
  {
    id: "workedExamples",
    slot: "practice-main",
    defaultOrder: 30,
  },
  {
    id: "commonMisconception",
    slot: "practice-aside",
    defaultOrder: 40,
  },
  {
    id: "miniChallenge",
    slot: "practice-aside",
    defaultOrder: 50,
  },
  {
    id: "quickTest",
    slot: "assessment",
    defaultOrder: 60,
  },
  {
    id: "accessibility",
    slot: "support-main",
    defaultOrder: 70,
  },
  {
    id: "readNext",
    slot: "support-aside",
    defaultOrder: 80,
  },
];

const defaultSectionTitlesByLocale: Record<
  AppLocale,
  Record<ConceptPageSectionId, string>
> = {
  en: {
    explanation: enMessages.ConceptPage.sections.explanation,
    keyIdeas: enMessages.ConceptPage.sections.keyIdeas,
    workedExamples: enMessages.ConceptPage.sections.workedExamples,
    commonMisconception: enMessages.ConceptPage.sections.commonMisconception,
    miniChallenge: enMessages.ConceptPage.sections.miniChallenge,
    quickTest: enMessages.ConceptPage.sections.quickTest,
    accessibility: enMessages.ConceptPage.sections.accessibility,
    readNext: enMessages.ConceptPage.sections.readNext,
  },
  "zh-HK": {
    explanation: zhHkMessages.ConceptPage.sections.explanation,
    keyIdeas: zhHkMessages.ConceptPage.sections.keyIdeas,
    workedExamples: zhHkMessages.ConceptPage.sections.workedExamples,
    commonMisconception: zhHkMessages.ConceptPage.sections.commonMisconception,
    miniChallenge: zhHkMessages.ConceptPage.sections.miniChallenge,
    quickTest: zhHkMessages.ConceptPage.sections.quickTest,
    accessibility: zhHkMessages.ConceptPage.sections.accessibility,
    readNext: zhHkMessages.ConceptPage.sections.readNext,
  },
};

export function getDefaultConceptPageSectionTitle(
  sectionId: ConceptPageSectionId,
  locale: AppLocale = "en",
) {
  return defaultSectionTitlesByLocale[locale]?.[sectionId] ?? defaultSectionTitlesByLocale.en[sectionId];
}

function buildConfigMap(pageFramework?: ConceptPageFramework) {
  return new Map(
    (pageFramework?.sections ?? []).map((section) => [section.id, section]),
  );
}

function isSectionAvailable(
  concept: ConceptContent,
  sectionId: ConceptPageSectionId,
  options: ResolveOptions,
) {
  switch (sectionId) {
    case "explanation":
      return concept.sections.explanation.paragraphs.length > 0;
    case "keyIdeas":
      return concept.sections.keyIdeas.length > 0;
    case "workedExamples":
      return concept.sections.workedExamples.items.length > 0;
    case "commonMisconception":
      return Boolean(
        concept.sections.commonMisconception.myth &&
          concept.sections.commonMisconception.correction.length,
      );
    case "miniChallenge":
      return Boolean(concept.sections.miniChallenge.prompt);
    case "quickTest":
      return hasConceptQuizSupport(concept);
    case "accessibility":
      return Boolean(
        concept.accessibility.simulationDescription.paragraphs.length ||
          concept.accessibility.graphSummary.paragraphs.length,
      );
    case "readNext":
      return Boolean(options.readNext?.length);
    default:
      return false;
  }
}

export function resolveConceptPageSections(
  concept: ConceptContent,
  options: ResolveOptions = {},
): ResolvedConceptPageSection[] {
  const configMap = buildConfigMap(concept.pageFramework);
  const locale = options.locale ?? "en";

  return DEFAULT_SECTION_DEFINITIONS.filter((definition) => {
    const config = configMap.get(definition.id);

    if (config?.enabled === false) {
      return false;
    }

    return isSectionAvailable(concept, definition.id, options);
  })
    .map((definition) => {
      const config = configMap.get(definition.id);

      return {
        id: definition.id,
        slot: definition.slot,
        title:
          config?.title ??
          options.defaultTitles?.[definition.id] ??
          getDefaultConceptPageSectionTitle(definition.id, locale),
        order: config?.order ?? definition.defaultOrder,
      };
    })
    .sort((left, right) => left.order - right.order);
}

export function getConceptPageSectionConfig(
  concept: ConceptContent,
  sectionId: ConceptPageSectionId,
): ConceptPageSectionConfig | undefined {
  return concept.pageFramework?.sections?.find((section) => section.id === sectionId);
}
