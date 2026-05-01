// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

describe("site metadata config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("prefers the explicit Open Model Lab site URL env when building metadata", async () => {
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL", "https://openmodellab.example");
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

  it("normalizes the production www host to the apex canonical host", async () => {
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL", "https://www.openmodellab.com");

    const { buildSiteMetadata, getAbsoluteUrl, getSiteUrl } = await import("@/lib/metadata");
    const metadata = buildSiteMetadata();

    expect(getSiteUrl().toString()).toBe("https://openmodellab.com/");
    expect(getAbsoluteUrl("/privacy")).toBe("https://openmodellab.com/privacy");
    expect(metadata.metadataBase?.toString()).toBe("https://openmodellab.com/");
  });

  it("preserves localhost site URLs for local development", async () => {
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL", "http://localhost:4321");

    const { getAbsoluteUrl, getSiteUrl } = await import("@/lib/metadata");

    expect(getSiteUrl().toString()).toBe("http://localhost:4321/");
    expect(getAbsoluteUrl("/privacy")).toBe("http://localhost:4321/privacy");
  });
});
