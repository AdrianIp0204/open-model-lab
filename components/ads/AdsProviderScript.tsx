"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAccountSession } from "@/lib/account/client";
import { getAdSenseProviderConfig } from "@/lib/ads/adsense";
import { shouldLoadAdProviderScript } from "@/lib/ads/policy";

const ADSENSE_SCRIPT_ID = "open-model-lab-adsense";

export function AdsProviderScript() {
  const pathname = usePathname();
  const session = useAccountSession();
  const sessionReady = session.initialized;
  const shouldShowAds = session.entitlement.capabilities.shouldShowAds;

  useEffect(() => {
    if (
      !shouldLoadAdProviderScript({
        pathname,
        sessionReady,
        shouldShowAds,
      })
    ) {
      return;
    }

    const providerConfig = getAdSenseProviderConfig();

    if (!providerConfig || document.getElementById(ADSENSE_SCRIPT_ID)) {
      return;
    }

    const script = document.createElement("script");
    script.id = ADSENSE_SCRIPT_ID;
    script.async = true;
    script.src = providerConfig.scriptSrc;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
  }, [pathname, sessionReady, shouldShowAds]);

  return null;
}
