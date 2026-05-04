import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getAbsoluteUrl } from "@/lib/metadata";

const privateRoutePrefixes = [
  "/account",
  "/api",
  "/assignments",
  "/auth",
  "/author-preview",
  "/dashboard",
  "/debug",
  "/dev",
] as const;

function buildRobotsDisallowPaths() {
  return [
    ...privateRoutePrefixes,
    ...routing.locales.flatMap((locale) =>
      privateRoutePrefixes.map((path) => `/${locale}${path}`),
    ),
  ];
}

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: buildRobotsDisallowPaths(),
    },
    sitemap: getAbsoluteUrl("/sitemap.xml"),
  };
}
