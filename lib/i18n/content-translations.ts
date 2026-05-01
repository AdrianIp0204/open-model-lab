import type { ConceptContent } from "@/lib/content";

export type DeepPartial<T> = T extends Array<infer U>
  ? Array<DeepPartial<U>>
  : T extends object
    ? {
        [K in keyof T]?: DeepPartial<T[K]>;
      }
    : T;

export type CatalogTranslationCollection = {
  subjects?: Record<
    string,
    {
      title?: string;
      description?: string;
      introduction?: string;
    }
  >;
  topics?: Record<
    string,
    {
      title?: string;
      description?: string;
      introduction?: string;
      groups?: Array<{
        id: string;
        title?: string;
        description?: string;
      }>;
    }
  >;
  starterTracks?: Record<
    string,
    {
      title?: string;
      summary?: string;
      introduction?: string;
      highlights?: string[];
    }
  >;
  guidedCollections?: Record<
    string,
    {
      title?: string;
      summary?: string;
      highlights?: string[];
    }
  >;
  recommendedGoalPaths?: Record<
    string,
    {
      title?: string;
      summary?: string;
      objective?: string;
    }
  >;
};

export type ConceptTranslationCollection = Record<string, DeepPartial<ConceptContent>>;

export type ContentTranslationBundle = {
  catalog: CatalogTranslationCollection;
  concepts: ConceptTranslationCollection;
};

export type ConceptRecommendationWithReason = {
  slug: string;
  reasonLabel?: string;
};

export type ConceptRecommendationSource = {
  slug: string;
  recommendedNext?: ConceptRecommendationWithReason[];
};

export const emptyCatalogTranslations: CatalogTranslationCollection = {};
export const emptyConceptTranslations: ConceptTranslationCollection = {};
export const emptyContentTranslations: ContentTranslationBundle = {
  catalog: emptyCatalogTranslations,
  concepts: emptyConceptTranslations,
};
