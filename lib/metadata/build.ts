import type { Metadata } from "next";
import type {
  ConceptContent,
  ConceptSlug,
  GuidedCollectionSummary,
  StarterTrackSummary,
  SubjectDiscoverySummary,
  TopicDiscoverySummary,
} from "@/lib/content";
import { routing, type AppLocale } from "@/i18n/routing";
import {
  buildLocaleAlternates,
  getLocaleAbsoluteUrl,
  getOpenGraphLocale,
  siteConfig,
} from "./site";

type PageMetadataOptions = {
  title: string;
  absoluteTitle?: string;
  description: string;
  pathname: string;
  locale?: AppLocale;
  keywords?: string[];
  category?: string;
  openGraphType?: "website" | "article";
};

type MetadataLocaleCopy = {
  starterTrack: string;
  guidedCollection: string;
  lessonSet: string;
  playlist: string;
  concepts: string;
  conceptsAndTracks: string;
  trackCompletion: string;
  trackReflection: string;
  starterTracksCategory: string;
  guidedCollectionsCategory: string;
  subjectPath: (subject?: string) => string;
  trackCompletionDescription: (trackTitle: string) => string;
};

const metadataLocaleCopy: Record<AppLocale, MetadataLocaleCopy> = {
  en: {
    starterTrack: "starter track",
    guidedCollection: "guided collection",
    lessonSet: "lesson set",
    playlist: "playlist",
    concepts: "concepts",
    conceptsAndTracks: "concepts and tracks",
    trackCompletion: "track completion",
    trackReflection: "track reflection",
    starterTracksCategory: "Starter tracks",
    guidedCollectionsCategory: "Guided collections",
    subjectPath: (subject) =>
      subject ? `guided ${subject.toLowerCase()} path` : "guided subject path",
    trackCompletionDescription: (trackTitle) =>
      `Review what ${trackTitle} covers, see the concepts completed in the track, and choose the next bounded step.`,
  },
  "zh-HK": {
    starterTrack: "入門路徑",
    guidedCollection: "引導式合集",
    lessonSet: "教學組合",
    playlist: "播放清單",
    concepts: "概念",
    conceptsAndTracks: "概念與路徑",
    trackCompletion: "路徑完成回顧",
    trackReflection: "路徑回顧",
    starterTracksCategory: "入門路徑",
    guidedCollectionsCategory: "引導式合集",
    subjectPath: (subject) => (subject ? `${subject} 入門路徑` : "引導式學習路線"),
    trackCompletionDescription: (trackTitle) =>
      `回顧 ${trackTitle} 涵蓋的內容，查看你在這條路徑完成的概念，並選擇下一個清楚的步驟。`,
  },
};

function getMetadataLocaleCopy(locale: AppLocale = routing.defaultLocale): MetadataLocaleCopy {
  return metadataLocaleCopy[locale] ?? metadataLocaleCopy[routing.defaultLocale];
}

function mergeKeywords(...groups: Array<string[] | undefined>): string[] {
  return [...new Set([siteConfig.name, ...siteConfig.defaultKeywords, ...groups.flatMap((group) => group ?? [])])];
}

function buildConceptKeywords(concept: ConceptContent): string[] {
  return mergeKeywords(
    [
      concept.title,
      concept.subject,
      concept.topic,
      concept.slug.replace(/-/g, " "),
    ],
    concept.seo?.keywords,
  );
}

function buildStarterTrackKeywords(
  track: StarterTrackSummary,
  locale: AppLocale = routing.defaultLocale,
): string[] {
  const copy = getMetadataLocaleCopy(locale);
  const trackSubjects = Array.from(new Set(track.concepts.map((concept) => concept.subject)));

  return mergeKeywords(
    [
      track.title,
      copy.starterTrack,
      copy.subjectPath(trackSubjects.length === 1 ? trackSubjects[0] : undefined),
    ],
    track.highlights,
    trackSubjects,
    Array.from(new Set(track.concepts.map((concept) => concept.topic))),
    track.concepts.map((concept) => concept.title),
  );
}

function buildGuidedCollectionKeywords(
  collection: GuidedCollectionSummary,
  locale: AppLocale = routing.defaultLocale,
): string[] {
  const copy = getMetadataLocaleCopy(locale);

  return mergeKeywords(
    [
      collection.title,
      copy.guidedCollection,
      collection.format === "lesson-set" ? copy.lessonSet : copy.playlist,
    ],
    collection.highlights,
    collection.concepts.map((concept) => concept.title),
    collection.topics.map((topic) => topic.title),
    collection.relatedTracks.map((track) => track.title),
  );
}

function buildTopicKeywords(
  topic: TopicDiscoverySummary,
  locale: AppLocale = routing.defaultLocale,
): string[] {
  const copy = getMetadataLocaleCopy(locale);

  return mergeKeywords(
    [
      topic.title,
      topic.subject,
      locale === routing.defaultLocale ? `${topic.subject.toLowerCase()} topic` : `${topic.subject} 主題`,
      copy.concepts,
    ],
    topic.sourceTopics,
    topic.subtopics,
    topic.featuredConcepts.map((concept) => concept.title),
    topic.starterTracks.map((track) => track.title),
    topic.relatedTopics.map((relatedTopic) => relatedTopic.title),
  );
}

function buildSubjectKeywords(
  subject: SubjectDiscoverySummary,
  locale: AppLocale = routing.defaultLocale,
): string[] {
  const copy = getMetadataLocaleCopy(locale);

  return mergeKeywords(
    [
      subject.title,
      locale === routing.defaultLocale ? `${subject.title.toLowerCase()} concepts` : `${subject.title} ${copy.concepts}`,
      locale === routing.defaultLocale ? `${subject.title.toLowerCase()} topics` : `${subject.title} 主題`,
    ],
    subject.featuredTopics.map((topic) => topic.title),
    subject.featuredStarterTracks.map((track) => track.title),
    subject.bridgeStarterTracks.map((track) => track.title),
    subject.featuredConcepts.map((concept) => concept.title),
  );
}

export function buildPageMetadata({
  title,
  absoluteTitle,
  description,
  pathname,
  locale = routing.defaultLocale,
  keywords,
  category,
  openGraphType = "website",
}: PageMetadataOptions): Metadata {
  const canonicalUrl = getLocaleAbsoluteUrl(pathname, locale);
  const socialTitle = absoluteTitle ?? title;

  return {
    title: absoluteTitle ? { absolute: absoluteTitle } : title,
    description,
    keywords: mergeKeywords(keywords),
    category,
    alternates: buildLocaleAlternates(pathname, locale),
    openGraph: {
      type: openGraphType,
      siteName: siteConfig.name,
      title: socialTitle,
      description,
      url: canonicalUrl,
      locale: getOpenGraphLocale(locale),
      images: [siteConfig.ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [siteConfig.ogImage],
    },
  };
}

export function buildConceptMetadata(
  concept: ConceptContent,
  locale?: AppLocale,
): Metadata {
  const useLocalizedSurfaceCopy = locale && locale !== routing.defaultLocale;
  const title = useLocalizedSurfaceCopy
    ? concept.title
    : concept.seo?.title ?? concept.title;
  const description = useLocalizedSurfaceCopy
    ? concept.summary
    : concept.seo?.description ?? concept.summary;

  return buildPageMetadata({
    title,
    description,
    pathname: `/concepts/${concept.slug}`,
    locale,
    keywords: buildConceptKeywords(concept),
    category: concept.topic,
    openGraphType: "article",
  });
}

export function buildStarterTrackMetadata(
  track: StarterTrackSummary,
  locale?: AppLocale,
): Metadata {
  const resolvedLocale = locale ?? routing.defaultLocale;
  const copy = getMetadataLocaleCopy(resolvedLocale);

  return buildPageMetadata({
    title: `${track.title} ${copy.starterTrack}`,
    description: track.summary,
    pathname: `/tracks/${track.slug}`,
    locale: resolvedLocale,
    keywords: buildStarterTrackKeywords(track, resolvedLocale),
    category: copy.starterTracksCategory,
  });
}

export function buildStarterTrackCompletionMetadata(
  track: StarterTrackSummary,
  locale?: AppLocale,
): Metadata {
  const resolvedLocale = locale ?? routing.defaultLocale;
  const copy = getMetadataLocaleCopy(resolvedLocale);

  return buildPageMetadata({
    title: `${track.title} ${copy.trackCompletion}`,
    description: copy.trackCompletionDescription(track.title),
    pathname: `/tracks/${track.slug}/complete`,
    locale: resolvedLocale,
    keywords: [
      ...buildStarterTrackKeywords(track, resolvedLocale),
      copy.trackCompletion,
      copy.trackReflection,
    ],
    category: copy.starterTracksCategory,
  });
}

export function buildGuidedCollectionMetadata(
  collection: GuidedCollectionSummary,
  locale?: AppLocale,
): Metadata {
  const resolvedLocale = locale ?? routing.defaultLocale;
  const copy = getMetadataLocaleCopy(resolvedLocale);
  const label = collection.format === "lesson-set" ? copy.lessonSet : copy.playlist;

  return buildPageMetadata({
    title: `${collection.title} ${label}`,
    description: collection.summary,
    pathname: `/guided/${collection.slug}`,
    locale: resolvedLocale,
    keywords: buildGuidedCollectionKeywords(collection, resolvedLocale),
    category: copy.guidedCollectionsCategory,
  });
}

export function buildTopicMetadata(
  topic: TopicDiscoverySummary,
  locale?: AppLocale,
): Metadata {
  const resolvedLocale = locale ?? routing.defaultLocale;
  const copy = getMetadataLocaleCopy(resolvedLocale);

  return buildPageMetadata({
    title: `${topic.title} ${copy.concepts}`,
    description: topic.description,
    pathname: `/concepts/topics/${topic.slug}`,
    locale: resolvedLocale,
    keywords: buildTopicKeywords(topic, resolvedLocale),
    category: topic.title,
  });
}

export function buildSubjectMetadata(
  subject: SubjectDiscoverySummary,
  locale?: AppLocale,
): Metadata {
  const resolvedLocale = locale ?? routing.defaultLocale;
  const copy = getMetadataLocaleCopy(resolvedLocale);

  return buildPageMetadata({
    title: `${subject.title} ${copy.conceptsAndTracks}`,
    description: subject.description,
    pathname: `/concepts/subjects/${subject.slug}`,
    locale: resolvedLocale,
    keywords: buildSubjectKeywords(subject, resolvedLocale),
    category: subject.title,
  });
}

export function buildConceptCanonicalUrl(
  slug: ConceptSlug,
  locale: AppLocale = routing.defaultLocale,
): string {
  return getLocaleAbsoluteUrl(`/concepts/${slug}`, locale);
}
