// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

describe("site metadata config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("falls back to the production Open Model Lab origin instead of localhost", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const { buildSiteMetadata, getAbsoluteUrl, getSiteUrl } = await import("@/lib/metadata");
    const metadata = buildSiteMetadata();

    expect(getSiteUrl().toString()).toBe("https://openmodellab.com/");
    expect(getAbsoluteUrl("/en")).toBe("https://openmodellab.com/en");
    expect(metadata.metadataBase?.toString()).toBe("https://openmodellab.com/");
  });

  it("prefers the explicit Open Model Lab site URL env when building metadata", async () => {
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL", "https://openmodellab.example/base?x=1#top");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://legacy.example");

    const { buildSiteMetadata, getAbsoluteUrl, getSiteUrl } = await import("@/lib/metadata");
    const metadata = buildSiteMetadata();

    expect(getSiteUrl().toString()).toBe("https://openmodellab.example/");
    expect(getAbsoluteUrl("/privacy")).toBe("https://openmodellab.example/privacy");
    expect(metadata.metadataBase?.toString()).toBe("https://openmodellab.example/");
    expect(metadata.manifest).toBe("/manifest.webmanifest");
    expect(metadata.icons).toMatchObject({
      icon: [
        { url: "/favicon.ico?v=20260425", sizes: "any", type: "image/x-icon" },
        {
          url: "/branding/open-model-lab-favicon-64.png?v=20260425",
          sizes: "64x64",
          type: "image/png",
        },
        {
          url: "/branding/open-model-lab-icon-192.png?v=20260425",
          sizes: "192x192",
          type: "image/png",
        },
        {
          url: "/branding/open-model-lab-icon-512.png?v=20260425",
          sizes: "512x512",
          type: "image/png",
        },
        { url: "/branding/open-model-lab-mark.svg?v=20260425", type: "image/svg+xml" },
      ],
      shortcut: [{ url: "/favicon.ico?v=20260425", sizes: "any", type: "image/x-icon" }],
      apple: [
        {
          url: "/branding/open-model-lab-apple-touch-icon.png?v=20260425",
          sizes: "180x180",
          type: "image/png",
        },
      ],
    });
  });

  it("normalizes configured production hosts to the https apex canonical host", async () => {
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL", "http://www.openmodellab.com/somewhere?x=1#top");

    const { buildSiteMetadata, getAbsoluteUrl, getSiteUrl } = await import("@/lib/metadata");
    const metadata = buildSiteMetadata();

    expect(getSiteUrl().toString()).toBe("https://openmodellab.com/");
    expect(getAbsoluteUrl("/privacy")).toBe("https://openmodellab.com/privacy");
    expect(metadata.metadataBase?.toString()).toBe("https://openmodellab.com/");
  });

  it("preserves localhost site URLs for local development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL", "http://localhost:4321");

    const { getAbsoluteUrl, getSiteUrl } = await import("@/lib/metadata");

    expect(getSiteUrl().toString()).toBe("http://localhost:4321/");
    expect(getAbsoluteUrl("/privacy")).toBe("http://localhost:4321/privacy");
  });

  it("does not emit localhost metadata URLs in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL", "http://localhost:4321");

    const { buildSiteMetadata, getAbsoluteUrl, getSiteUrl } = await import("@/lib/metadata");
    const metadata = buildSiteMetadata();

    expect(getSiteUrl().toString()).toBe("https://openmodellab.com/");
    expect(getAbsoluteUrl("/privacy")).toBe("https://openmodellab.com/privacy");
    expect(metadata.openGraph?.url).toBe("https://openmodellab.com/en");
  });
});
