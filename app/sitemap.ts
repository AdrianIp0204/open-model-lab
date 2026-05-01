import type { MetadataRoute } from "next";
import {
  getAllConcepts,
  getConceptLastModified,
  getGuidedCollectionCatalogLastModified,
  getGuidedCollections,
  getStarterTrackCatalogLastModified,
  getStarterTracks,
  getSubjectCatalogLastModified,
  getSubjectDiscoverySummaries,
  getTopicDiscoverySummaries,
  getTopicLastModified,
} from "@/lib/content";
import { routing, type AppLocale } from "@/i18n/routing";
import { getLocaleAbsoluteUrl } from "@/lib/metadata";
import { learningToolSitemapPaths } from "@/lib/tools/learning-tools";

const staticRoutes = [
  { path: "/", priority: 1, changeFrequency: "monthly" as const },
  { path: "/challenges", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/search", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/start", priority: 0.85, changeFrequency: "monthly" as const },
  { path: "/concepts", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/concepts/subjects", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/concepts/topics", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/guided", priority: 0.8, changeFrequency: "monthly" as const },
  ...learningToolSitemapPaths.map((path) => ({
    path,
    priority: path === "/tools" ? 0.75 : 0.7,
    changeFrequency: "monthly" as const,
  })),
  { path: "/about", priority: 0.6, changeFrequency: "yearly" as const },
  { path: "/pricing", priority: 0.5, changeFrequency: "yearly" as const },
  { path: "/privacy", priority: 0.4, changeFrequency: "yearly" as const },
  { path: "/terms", priority: 0.4, changeFrequency: "yearly" as const },
  { path: "/billing", priority: 0.4, changeFrequency: "yearly" as const },
  { path: "/ads", priority: 0.4, changeFrequency: "yearly" as const },
  { path: "/contact", priority: 0.5, changeFrequency: "yearly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const locales = [...routing.locales] as AppLocale[];
  const starterTrackCatalogLastModified = getStarterTrackCatalogLastModified().getTime();
  const guidedCollectionCatalogLastModified = getGuidedCollectionCatalogLastModified().getTime();
  const subjectCatalogLastModified = getSubjectCatalogLastModified().getTime();
  const conceptEntries: MetadataRoute.Sitemap = getAllConcepts().flatMap((concept) =>
    locales.map((locale) => ({
      url: getLocaleAbsoluteUrl(`/concepts/${concept.slug}`, locale),
      lastModified: getConceptLastModified(concept.slug),
      changeFrequency: "monthly",
      priority: 0.8,
    })),
  );
  const topicEntries: MetadataRoute.Sitemap = getTopicDiscoverySummaries().flatMap((topic) =>
    locales.map((locale) => ({
      url: getLocaleAbsoluteUrl(`/concepts/topics/${topic.slug}`, locale),
      lastModified: getTopicLastModified(topic.slug),
      changeFrequency: "monthly",
      priority: 0.75,
    })),
  );
  const subjectEntries: MetadataRoute.Sitemap = getSubjectDiscoverySummaries().flatMap(
    (subject) =>
      locales.map((locale) => ({
        url: getLocaleAbsoluteUrl(subject.path, locale),
        lastModified: new Date(subjectCatalogLastModified),
        changeFrequency: "monthly",
        priority: 0.75,
      })),
  );
  const trackEntries: MetadataRoute.Sitemap = getStarterTracks().flatMap((track) =>
    locales.map((locale) => ({
      url: getLocaleAbsoluteUrl(`/tracks/${track.slug}`, locale),
      lastModified: new Date(
        Math.max(
          starterTrackCatalogLastModified,
          ...track.concepts.map((concept) => getConceptLastModified(concept.slug).getTime()),
        ),
      ),
      changeFrequency: "monthly",
      priority: 0.7,
    })),
  );
  const trackCompletionEntries: MetadataRoute.Sitemap = getStarterTracks().flatMap((track) =>
    locales.map((locale) => ({
      url: getLocaleAbsoluteUrl(`/tracks/${track.slug}/complete`, locale),
      lastModified: new Date(
        Math.max(
          starterTrackCatalogLastModified,
          ...track.concepts.map((concept) => getConceptLastModified(concept.slug).getTime()),
        ),
      ),
      changeFrequency: "monthly",
      priority: 0.65,
    })),
  );
  const guidedCollectionEntries: MetadataRoute.Sitemap = getGuidedCollections().flatMap(
    (collection) =>
      locales.map((locale) => ({
        url: getLocaleAbsoluteUrl(collection.path, locale),
        lastModified: new Date(
          Math.max(
            guidedCollectionCatalogLastModified,
            ...collection.concepts.map((concept) => getConceptLastModified(concept.slug).getTime()),
          ),
        ),
        changeFrequency: "monthly",
        priority: 0.7,
      })),
  );

  const routeEntries: MetadataRoute.Sitemap = staticRoutes.flatMap((route) =>
    locales.map((locale) => ({
      url: getLocaleAbsoluteUrl(route.path, locale),
      lastModified: new Date(),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
  );

  return [
    ...routeEntries,
    ...subjectEntries,
    ...topicEntries,
    ...trackEntries,
    ...trackCompletionEntries,
    ...guidedCollectionEntries,
    ...conceptEntries,
  ];
}
