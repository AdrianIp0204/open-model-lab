// default open-next.config.ts file created by @opennextjs/cloudflare
import {
  defineCloudflareConfig,
  type OpenNextConfig,
} from "@opennextjs/cloudflare";
// import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { getCloudflareSkewProtectionConfig } from "./lib/deployment/cloudflare-assets";

const baseConfig = defineCloudflareConfig({
  // For best results consider enabling R2 caching
  // See https://opennext.js.org/cloudflare/caching for more details
  // incrementalCache: r2IncrementalCache
});

const skewProtectionConfig = getCloudflareSkewProtectionConfig();

export default {
  ...baseConfig,
  cloudflare: {
    ...baseConfig.cloudflare,
    ...(skewProtectionConfig
      ? {
          skewProtection: skewProtectionConfig,
        }
      : {}),
  },
} satisfies OpenNextConfig;
