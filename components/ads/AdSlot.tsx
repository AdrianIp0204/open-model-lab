"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import type { AppLocale } from "@/i18n/routing";
import { useAccountSession } from "@/lib/account/client";
import { getAdSensePlacementConfig } from "@/lib/ads/adsense";
import { canRenderAdPlacement } from "@/lib/ads/policy";
import { copyText } from "@/lib/i18n/copy-text";
import {
  getAdPlacementDefinition,
  type AdPlacement,
  type ManualAdUnitType,
} from "@/lib/ads/slots";

type AdSlotProps = {
  placement: AdPlacement;
  className?: string;
};

type TypedAdSlotProps = AdSlotProps & {
  expectedType: ManualAdUnitType;
};

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

function AdSlotFrame({
  placement,
  className = "",
  expectedType,
}: TypedAdSlotProps) {
  const pathname = usePathname();
  const locale = useLocale() as AppLocale;
  const session = useAccountSession();
  const adUnitRef = useRef<HTMLModElement | null>(null);
  const definition = getAdPlacementDefinition(placement);
  const sponsoredLabel = copyText(locale, "Sponsored", "贊助內容");

  const config = useMemo(() => {
    if (
      !session.initialized ||
      !canRenderAdPlacement({
        pathname,
        placement,
        sessionReady: session.initialized,
        shouldShowAds: session.entitlement.capabilities.shouldShowAds,
      })
    ) {
      return null;
    }

    return getAdSensePlacementConfig(placement);
  }, [
    pathname,
    placement,
    session.entitlement.capabilities.shouldShowAds,
    session.initialized,
  ]);

  useEffect(() => {
    if (!config) {
      return;
    }

    const adUnitElement = adUnitRef.current;

    if (!adUnitElement || adUnitElement.dataset.adRequestState === "requested") {
      return;
    }

    adUnitElement.dataset.adRequestState = "requested";

    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
    } catch {
      adUnitElement.dataset.adRequestState = "failed";
    }
  }, [config]);

  if (!config || definition.unitType !== expectedType) {
    return null;
  }

  const frameToneClassName =
    definition.unitType === "multiplex"
      ? "bg-[linear-gradient(180deg,rgba(250,249,244,0.98),rgba(244,241,233,0.96))]"
      : definition.unitType === "in-article"
        ? "bg-[linear-gradient(180deg,rgba(249,248,243,0.98),rgba(245,241,234,0.94))]"
        : "bg-[linear-gradient(180deg,rgba(252,251,246,0.98),rgba(247,244,236,0.95))]";
  const contentToneClassName =
    definition.unitType === "multiplex"
      ? "bg-white/72"
      : "bg-white/80";

  return (
    <aside
      aria-label={sponsoredLabel}
      data-testid={`ad-slot-${placement}`}
      data-ad-placement={placement}
      data-ad-unit-type={definition.unitType}
      className={className}
    >
      <div
        className={`rounded-[24px] border border-line/90 ${frameToneClassName} p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] sm:p-5`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600">
            {sponsoredLabel}
          </span>
          <span className="text-xs text-ink-500">{definition.label}</span>
        </div>

        <div
          className={`mt-3 rounded-[18px] border border-line/80 ${contentToneClassName} px-3 py-3 sm:px-4 ${definition.minHeightClassName}`}
        >
          <ins
            ref={adUnitRef}
            className="adsbygoogle block h-full w-full overflow-hidden"
            data-testid={`adsense-unit-${placement}`}
            data-ad-client={config.clientId}
            data-ad-format={config.format}
            data-ad-slot={config.slotId}
            data-full-width-responsive={
              "fullWidthResponsive" in config
                ? String(config.fullWidthResponsive)
                : undefined
            }
            data-ad-layout={"layout" in config ? config.layout : undefined}
            data-ad-layout-key={"layoutKey" in config ? config.layoutKey : undefined}
            data-matched-content-ui-type={
              "matchedContentUiType" in config
                ? config.matchedContentUiType
                : undefined
            }
            style={{ display: "block" }}
          />
        </div>
      </div>
    </aside>
  );
}

export function AdSlot({ placement, className = "" }: AdSlotProps) {
  const definition = getAdPlacementDefinition(placement);

  return (
    <AdSlotFrame
      placement={placement}
      className={className}
      expectedType={definition.unitType}
    />
  );
}

export function DisplayAd(props: AdSlotProps) {
  return <AdSlotFrame {...props} expectedType="display" />;
}

export function InFeedAd(props: AdSlotProps) {
  return <AdSlotFrame {...props} expectedType="in-feed" />;
}

export function InArticleAd(props: AdSlotProps) {
  return <AdSlotFrame {...props} expectedType="in-article" />;
}

export function MultiplexAd(props: AdSlotProps) {
  return <AdSlotFrame {...props} expectedType="multiplex" />;
}
