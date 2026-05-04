import type { MetadataRoute } from "next";
import { getAbsoluteUrl } from "@/lib/metadata";

const robotsDisallowPaths = ["/api"] as const;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...robotsDisallowPaths],
    },
    sitemap: getAbsoluteUrl("/sitemap.xml"),
  };
}
