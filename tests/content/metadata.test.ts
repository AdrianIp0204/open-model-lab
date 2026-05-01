import { describe, expect, it } from "vitest";
import {
  getConceptBySlug,
  getGuidedCollectionBySlug,
  getStarterTrackBySlug,
  getTopicDiscoverySummaryBySlug,
} from "@/lib/content";
import { localizeGuidedCollection, localizeStarterTrack } from "@/lib/i18n/content";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildConceptJsonLd,
  buildConceptMetadata,
  buildGuidedCollectionMetadata,
  buildItemListJsonLd,
  buildOrganizationJsonLd,
  buildPageMetadata,
  buildStarterTrackCompletionMetadata,
  buildStarterTrackMetadata,
  buildTopicMetadata,
  buildWebApplicationJsonLd,
  buildWebsiteJsonLd,
  serializeJsonLd,
} from "@/lib/metadata";

describe("metadata helpers", () => {
  it("builds concept metadata from content defaults", () => {
    const concept = getConceptBySlug("simple-harmonic-motion");
    const metadata = buildConceptMetadata(concept);

    expect(metadata.title).toBe("Simple Harmonic Motion");
    expect(String(metadata.description).toLowerCase()).toContain(
      "interactive simple harmonic motion",
    );
    expect(metadata.alternates?.canonical).toContain("/concepts/simple-harmonic-motion");
  });

  it("builds discovery metadata for starter tracks and topic pages", () => {
    const trackMetadata = buildStarterTrackMetadata(
      getStarterTrackBySlug("oscillations-and-energy"),
    );
    const trackCompletionMetadata = buildStarterTrackCompletionMetadata(
      getStarterTrackBySlug("oscillations-and-energy"),
    );
    const topicMetadata = buildTopicMetadata(getTopicDiscoverySummaryBySlug("mechanics"));

    expect(trackMetadata.alternates?.canonical).toContain("/tracks/oscillations-and-energy");
    expect(trackMetadata.keywords).toContain("starter track");
    expect(trackCompletionMetadata.alternates?.canonical).toContain(
      "/tracks/oscillations-and-energy/complete",
    );
    expect(trackCompletionMetadata.keywords).toContain("track completion");
    expect(topicMetadata.alternates?.canonical).toContain("/concepts/topics/mechanics");
    expect(topicMetadata.keywords).toContain("Mechanics");
  });

  it("localizes discovery metadata labels for zh-HK track and guided detail pages", () => {
    const localizedTrack = localizeStarterTrack(
      getStarterTrackBySlug("gravity-and-orbits"),
      "zh-HK",
    );
    const localizedCollection = localizeGuidedCollection(
      getGuidedCollectionBySlug("electricity-bridge-lesson-set"),
      "zh-HK",
    );

    const zhTrackMetadata = buildStarterTrackMetadata(localizedTrack, "zh-HK");
    const zhTrackCompletionMetadata = buildStarterTrackCompletionMetadata(
      localizedTrack,
      "zh-HK",
    );
    const zhGuidedMetadata = buildGuidedCollectionMetadata(localizedCollection, "zh-HK");

    expect(zhTrackMetadata.title).toBe(`${localizedTrack.title} 入門路徑`);
    expect(zhTrackMetadata.keywords).toContain("入門路徑");
    expect(zhTrackCompletionMetadata.title).toBe(`${localizedTrack.title} 路徑完成回顧`);
    expect(zhTrackCompletionMetadata.keywords).toContain("路徑完成回顧");
    expect(zhGuidedMetadata.title).toBe(`${localizedCollection.title} 教學組合`);
    expect(zhGuidedMetadata.keywords).toContain("引導式合集");
    expect(zhGuidedMetadata.keywords).not.toContain("lesson set");
  });

  it("serializes JSON-LD safely", () => {
    const concept = getConceptBySlug("projectile-motion");
    const jsonLd = [
      buildConceptJsonLd(concept),
      buildBreadcrumbJsonLd([
        { name: "Home", url: "https://example.com/" },
        { name: "Concepts", url: "https://example.com/concepts" },
      ]),
      buildItemListJsonLd({
        name: "Example list",
        url: "https://example.com/concepts",
        items: [
          {
            name: "Projectile Motion",
            url: "https://example.com/concepts/projectile-motion",
          },
        ],
      }),
    ];
    const script = serializeJsonLd(jsonLd);

    expect(script).toContain('"@context":"https://schema.org"');
    expect(script).toContain('"BreadcrumbList"');
    expect(script).toContain('"ItemList"');
    expect(script).not.toContain("<script>");
  });

  it("supports brand-first page titles and homepage structured data", () => {
    const metadata = buildPageMetadata({
      title: "Interactive learning with live simulations",
      absoluteTitle: "Open Model Lab | Interactive learning with live simulations",
      description:
        "Open Model Lab is a simulation-first learning site across the current multi-subject catalog, with interactive models, graphs, worked examples, and challenge prompts.",
      pathname: "/",
      category: "education",
    });
    const websiteJsonLd = buildWebsiteJsonLd() as {
      potentialAction?: {
        target?: string;
      };
    };
    const organizationJsonLd = buildOrganizationJsonLd() as {
      "@type": string;
    };
    const webApplicationJsonLd = buildWebApplicationJsonLd() as {
      "@type": string;
      applicationCategory?: string;
    };

    expect(metadata.title).toEqual({
      absolute: "Open Model Lab | Interactive learning with live simulations",
    });
    expect(metadata.alternates?.canonical).toContain("http://localhost:3000/");
    expect(metadata.openGraph?.title).toBe(
      "Open Model Lab | Interactive learning with live simulations",
    );
    expect(websiteJsonLd.potentialAction?.target).toContain("/search?q={search_term_string}");
    expect(organizationJsonLd["@type"]).toBe("Organization");
    expect(webApplicationJsonLd["@type"]).toBe("WebApplication");
    expect(webApplicationJsonLd.applicationCategory).toBe("EducationalApplication");
  });

  it("supports locale-aware JSON-LD URLs and language tags", () => {
    const concept = getConceptBySlug("projectile-motion");
    const conceptJsonLd = buildConceptJsonLd(concept, "zh-HK") as {
      inLanguage?: string;
      url?: string;
    };
    const collectionJsonLd = buildCollectionPageJsonLd({
      name: "Open Model Lab 搜尋",
      description: "搜尋 Open Model Lab 目錄。",
      url: "http://localhost:3000/zh-HK/search",
      locale: "zh-HK",
    }) as {
      inLanguage?: string;
      isPartOf?: {
        url?: string;
      };
    };

    expect(conceptJsonLd.inLanguage).toBe("zh-HK");
    expect(conceptJsonLd.url).toContain("/zh-HK/concepts/projectile-motion");
    expect(collectionJsonLd.inLanguage).toBe("zh-HK");
    expect(collectionJsonLd.isPartOf?.url).toContain("/zh-HK");
  });
});
