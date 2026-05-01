// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

describe("metadata routes", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("points robots.txt at the configured sitemap URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL", "https://openmodellab.example");

    const { default: robots } = await import("@/app/robots");
    const output = robots();

    expect(output.sitemap).toBe("https://openmodellab.example/sitemap.xml");
    expect(output.rules).toEqual({
      userAgent: "*",
      allow: "/",
    });
  });

  it("normalizes robots and sitemap URLs to the apex host when www is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL", "https://www.openmodellab.com");
    vi.doMock("@/lib/content", () => ({
      getAllConcepts: () => [],
      getConceptLastModified: () => new Date("2026-01-01T00:00:00.000Z"),
      getGuidedCollectionCatalogLastModified: () => new Date("2026-01-01T00:00:00.000Z"),
      getGuidedCollections: () => [],
      getStarterTrackCatalogLastModified: () => new Date("2026-01-01T00:00:00.000Z"),
      getStarterTracks: () => [],
      getSubjectCatalogLastModified: () => new Date("2026-01-01T00:00:00.000Z"),
      getSubjectDiscoverySummaries: () => [],
      getTopicDiscoverySummaries: () => [],
      getTopicLastModified: () => new Date("2026-01-01T00:00:00.000Z"),
    }));

    const { default: robots } = await import("@/app/robots");
    const { default: sitemap } = await import("@/app/sitemap");

    expect(robots().sitemap).toBe("https://openmodellab.com/sitemap.xml");
    expect(sitemap().every((entry) => entry.url.startsWith("https://openmodellab.com/"))).toBe(
      true,
    );
  });

  it("serves versioned manifest icons for the updated favicon set", async () => {
    const { default: manifest } = await import("@/app/manifest");
    const output = manifest();

    expect(output.icons).toEqual([
      {
        src: "/branding/open-model-lab-icon-192.png?v=20260425",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/branding/open-model-lab-icon-512.png?v=20260425",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/branding/open-model-lab-mark.svg?v=20260425",
        sizes: "any",
        type: "image/svg+xml",
      },
    ]);
  });

  it("includes the new public trust pages in the sitemap", async () => {
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL", "https://openmodellab.example");
    vi.doMock("@/lib/content", () => ({
      getAllConcepts: () => [],
      getConceptLastModified: () => new Date("2026-01-01T00:00:00.000Z"),
      getGuidedCollectionCatalogLastModified: () => new Date("2026-01-01T00:00:00.000Z"),
      getGuidedCollections: () => [],
      getStarterTrackCatalogLastModified: () => new Date("2026-01-01T00:00:00.000Z"),
      getStarterTracks: () => [],
      getSubjectCatalogLastModified: () => new Date("2026-01-01T00:00:00.000Z"),
      getSubjectDiscoverySummaries: () => [
        {
          slug: "physics",
          path: "/concepts/subjects/physics",
        },
      ],
      getTopicDiscoverySummaries: () => [],
      getTopicLastModified: () => new Date("2026-01-01T00:00:00.000Z"),
    }));

    const { default: sitemap } = await import("@/app/sitemap");
    const entries = sitemap();
    const urls = new Set(entries.map((entry) => entry.url));
    const homeEntry = entries.find((entry) => entry.url === "https://openmodellab.example/en");
    const privacyEntry = entries.find(
      (entry) => entry.url === "https://openmodellab.example/en/privacy",
    );

    expect(homeEntry?.priority).toBe(1);
    expect(privacyEntry?.priority).toBeLessThan(homeEntry?.priority ?? 0);
    expect(urls.has("https://openmodellab.example/en/search")).toBe(true);
    expect(urls.has("https://openmodellab.example/zh-HK/search")).toBe(true);
    expect(urls.has("https://openmodellab.example/en/start")).toBe(true);
    expect(urls.has("https://openmodellab.example/en/tools")).toBe(true);
    expect(urls.has("https://openmodellab.example/zh-HK/tools")).toBe(true);
    expect(urls.has("https://openmodellab.example/en/circuit-builder")).toBe(true);
    expect(
      urls.has("https://openmodellab.example/en/tools/chemistry-reaction-mind-map"),
    ).toBe(true);
    expect(urls.has("https://openmodellab.example/en/concepts/subjects")).toBe(true);
    expect(urls.has("https://openmodellab.example/zh-HK/concepts/subjects")).toBe(true);
    expect(urls.has("https://openmodellab.example/en/concepts/subjects/physics")).toBe(true);
    expect(urls.has("https://openmodellab.example/zh-HK/concepts/subjects/physics")).toBe(true);
    expect(urls.has("https://openmodellab.example/en/privacy")).toBe(true);
    expect(urls.has("https://openmodellab.example/zh-HK/privacy")).toBe(true);
    expect(urls.has("https://openmodellab.example/en/terms")).toBe(true);
    expect(urls.has("https://openmodellab.example/en/ads")).toBe(true);
  });
});
