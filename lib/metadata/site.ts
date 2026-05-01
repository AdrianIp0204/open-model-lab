import type { Metadata } from "next";
import { addLocalePrefix, localeOpenGraphMap, routing, type AppLocale } from "@/i18n/routing";

const FALLBACK_SITE_URL = "http://localhost:3000";
const OPEN_MODEL_LAB_APEX_HOST = "openmodellab.com";
const OPEN_MODEL_LAB_WWW_HOST = `www.${OPEN_MODEL_LAB_APEX_HOST}`;
const BRAND_ASSET_VERSION = "20260425";
const BRAND_FAVICON_ICO = "/favicon.ico";
const BRAND_ICON_SVG = "/branding/open-model-lab-mark.svg";
const BRAND_FAVICON_PNG = "/branding/open-model-lab-favicon-64.png";
const BRAND_ICON_192_PNG = "/branding/open-model-lab-icon-192.png";
const BRAND_ICON_512_PNG = "/branding/open-model-lab-icon-512.png";
const BRAND_APPLE_ICON_PNG = "/branding/open-model-lab-apple-touch-icon.png";

function versionBrandAsset(path: string) {
  return `${path}?v=${BRAND_ASSET_VERSION}`;
}

function readConfiguredSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL?.trim() ||
    process.env.OPEN_MODEL_LAB_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    FALLBACK_SITE_URL
  );
}

function normalizeConfiguredSiteUrl(value: string) {
  try {
    const parsedUrl = new URL(value);

    if (parsedUrl.hostname === OPEN_MODEL_LAB_WWW_HOST) {
      parsedUrl.hostname = OPEN_MODEL_LAB_APEX_HOST;
    }

    return parsedUrl.toString();
  } catch {
    return value;
  }
}

export const siteConfig = {
  name: "Open Model Lab",
  description:
    "Open Model Lab is a simulation-first learning site across physics, math, chemistry, and a bounded computer-science pilot, with interactive models, graphs, worked examples, and challenge prompts.",
  defaultKeywords: [
    "interactive science simulations",
    "interactive math simulations",
    "interactive chemistry simulations",
    "interactive computer science simulations",
    "science concepts",
    "math concepts",
    "chemistry concepts",
    "computer science concepts",
    "science learning",
    "simulation-first learning",
    "interactive graphs",
    "worked examples",
    "prediction mode",
    "quick tests",
  ],
  url: normalizeConfiguredSiteUrl(readConfiguredSiteUrl()),
  ogImage: "/og-default.svg",
} as const;

export function getSiteUrl(): URL {
  const url = siteConfig.url.endsWith("/")
    ? siteConfig.url
    : `${siteConfig.url}/`;
  return new URL(url);
}

export function getAbsoluteUrl(pathname = "/"): string {
  return new URL(pathname, getSiteUrl()).toString();
}

export function getLocaleAbsoluteUrl(pathname: string, locale: AppLocale): string {
  return getAbsoluteUrl(addLocalePrefix(pathname, locale));
}

export function buildLocaleAlternates(pathname: string, locale: AppLocale) {
  return {
    canonical: getLocaleAbsoluteUrl(pathname, locale),
    languages: Object.fromEntries(
      routing.locales.map((supportedLocale) => [
        supportedLocale,
        getLocaleAbsoluteUrl(pathname, supportedLocale),
      ]),
    ),
  };
}

export function getOpenGraphLocale(locale: AppLocale) {
  return localeOpenGraphMap[locale];
}

export function buildSiteMetadata(): Metadata {
  return {
    metadataBase: getSiteUrl(),
    applicationName: siteConfig.name,
    manifest: "/manifest.webmanifest",
    title: {
      default: siteConfig.name,
      template: `%s | ${siteConfig.name}`,
    },
    description: siteConfig.description,
    keywords: [...siteConfig.defaultKeywords],
    category: "education",
    robots: {
      index: true,
      follow: true,
    },
    icons: {
      icon: [
        { url: versionBrandAsset(BRAND_FAVICON_ICO), sizes: "any", type: "image/x-icon" },
        { url: versionBrandAsset(BRAND_FAVICON_PNG), sizes: "64x64", type: "image/png" },
        { url: versionBrandAsset(BRAND_ICON_192_PNG), sizes: "192x192", type: "image/png" },
        { url: versionBrandAsset(BRAND_ICON_512_PNG), sizes: "512x512", type: "image/png" },
        { url: versionBrandAsset(BRAND_ICON_SVG), type: "image/svg+xml" },
      ],
      shortcut: [
        { url: versionBrandAsset(BRAND_FAVICON_ICO), sizes: "any", type: "image/x-icon" },
      ],
      apple: [
        {
          url: versionBrandAsset(BRAND_APPLE_ICON_PNG),
          sizes: "180x180",
          type: "image/png",
        },
      ],
    },
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      title: siteConfig.name,
      description: siteConfig.description,
      url: getLocaleAbsoluteUrl("/", routing.defaultLocale),
      locale: getOpenGraphLocale(routing.defaultLocale),
      images: [siteConfig.ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: siteConfig.name,
      description: siteConfig.description,
      images: [siteConfig.ogImage],
    },
  };
}
