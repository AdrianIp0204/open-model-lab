import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/metadata";

const BRAND_ASSET_VERSION = "20260425";

function versionBrandAsset(path: string) {
  return `${path}?v=${BRAND_ASSET_VERSION}`;
}

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: "#081730",
    theme_color: "#081730",
    icons: [
      {
        src: versionBrandAsset("/branding/open-model-lab-icon-192.png"),
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: versionBrandAsset("/branding/open-model-lab-icon-512.png"),
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: versionBrandAsset("/branding/open-model-lab-mark.svg"),
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
