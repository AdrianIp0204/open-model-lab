import type { ConceptContent } from "@/lib/content";
import { routing, type AppLocale } from "@/i18n/routing";
import { buildConceptCanonicalUrl } from "./build";
import { getAbsoluteUrl, getLocaleAbsoluteUrl, siteConfig } from "./site";

type JsonLdValue = Record<string, unknown> | Array<unknown>;
type LinkedItem = {
  name: string;
  url: string;
  description?: string;
};

export function serializeJsonLd(value: JsonLdValue): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

type LocaleJsonLdOptions = {
  locale?: AppLocale;
  url?: string;
  description?: string;
};

function resolveJsonLdUrl(pathname: string, locale?: AppLocale) {
  return locale ? getLocaleAbsoluteUrl(pathname, locale) : getAbsoluteUrl(pathname);
}

function resolveJsonLdLanguage(locale?: AppLocale) {
  return locale ?? routing.defaultLocale;
}

export function buildWebsiteJsonLd(options: LocaleJsonLdOptions = {}) {
  const url = options.url ?? resolveJsonLdUrl("/", options.locale);
  const description = options.description ?? siteConfig.description;

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    description,
    url,
    inLanguage: resolveJsonLdLanguage(options.locale),
    potentialAction: {
      "@type": "SearchAction",
      target: `${resolveJsonLdUrl("/search", options.locale)}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url,
    },
  };
}

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: getAbsoluteUrl("/"),
    description: siteConfig.description,
  };
}

export function buildWebApplicationJsonLd(options: LocaleJsonLdOptions = {}) {
  const url = options.url ?? resolveJsonLdUrl("/", options.locale);
  const description = options.description ?? siteConfig.description;

  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: siteConfig.name,
    description,
    url,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    browserRequirements: "Requires JavaScript and a modern web browser.",
    inLanguage: resolveJsonLdLanguage(options.locale),
    isAccessibleForFree: true,
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url,
    },
  };
}

export function buildConceptJsonLd(
  concept: ConceptContent,
  locale: AppLocale = routing.defaultLocale,
) {
  const url = buildConceptCanonicalUrl(concept.slug, locale);

  return {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: concept.title,
    description: concept.summary,
    url,
    inLanguage: resolveJsonLdLanguage(locale),
    isAccessibleForFree: true,
    educationalLevel: concept.difficulty,
    educationalUse: "self-study",
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: resolveJsonLdUrl("/", locale),
    },
    about: {
      "@type": "Thing",
      name: concept.topic,
    },
    learningResourceType: ["Interactive simulation", "Worked example"],
    keywords: [
      concept.title,
      concept.subject,
      concept.topic,
      ...(concept.seo?.keywords ?? []),
    ],
  };
}

export function buildCollectionPageJsonLd({
  name,
  description,
  url,
  locale,
}: {
  name: string;
  description: string;
  url: string;
  locale?: AppLocale;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url,
    inLanguage: resolveJsonLdLanguage(locale),
    isPartOf: {
      "@type": "WebSite",
      name: siteConfig.name,
      url: resolveJsonLdUrl("/", locale),
    },
  };
}

export function buildItemListJsonLd({
  name,
  url,
  items,
}: {
  name: string;
  url: string;
  items: LinkedItem[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    url,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: {
        "@type": "Thing",
        name: item.name,
        url: item.url,
        ...(item.description ? { description: item.description } : {}),
      },
      ...(item.description ? { description: item.description } : {}),
    })),
  };
}

export function buildBreadcrumbJsonLd(items: LinkedItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
