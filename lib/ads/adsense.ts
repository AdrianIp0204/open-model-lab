import { getAdPlacementDefinition, type AdPlacement } from "./slots";

export type AdSensePlacementConfig =
  | {
      placement: AdPlacement;
      unitType: "display";
      slotId: string;
      clientId: string;
      format: "auto";
      fullWidthResponsive: true;
    }
  | {
      placement: AdPlacement;
      unitType: "in-article";
      slotId: string;
      clientId: string;
      format: "fluid";
      layout: "in-article";
      fullWidthResponsive: true;
    }
  | {
      placement: AdPlacement;
      unitType: "in-feed";
      slotId: string;
      clientId: string;
      format: "fluid";
      layout: "image-top";
      layoutKey: string;
    }
  | {
      placement: AdPlacement;
      unitType: "multiplex";
      slotId: string;
      clientId: string;
      format: "autorelaxed";
      matchedContentUiType: "image_stacked";
    };

export type AdSenseProviderConfig = {
  clientId: string;
  scriptSrc: string;
};

const ADSENSE_SCRIPT_BASE_URL =
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";

function parseBooleanEnvValue(value: string | undefined) {
  if (!value) {
    return false;
  }

  return /^(1|true|yes|on)$/i.test(value.trim());
}

function getConfiguredAdSenseClientId() {
  const clientId =
    process.env.NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_CLIENT_ID?.trim() ??
    process.env.OPEN_MODEL_LAB_ADSENSE_CLIENT_ID?.trim();

  return clientId && /^ca-pub-\d+$/.test(clientId) ? clientId : null;
}

function isValidAdSenseSlotId(slotId: string | undefined): slotId is string {
  return !!slotId && /^\d+$/.test(slotId);
}

function isValidLayoutKey(layoutKey: string | undefined): layoutKey is string {
  return !!layoutKey && layoutKey.trim().length > 0;
}

function getEnvValue(name: string) {
  return process.env[name]?.trim();
}

export function isAdSenseEnabled() {
  return parseBooleanEnvValue(
    process.env.NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_ENABLED ??
      process.env.OPEN_MODEL_LAB_ADSENSE_ENABLED,
  );
}

export function getAdSenseProviderConfig(): AdSenseProviderConfig | null {
  const clientId = getConfiguredAdSenseClientId();

  if (!clientId) {
    return null;
  }

  return {
    clientId,
    scriptSrc: `${ADSENSE_SCRIPT_BASE_URL}?client=${clientId}`,
  };
}

export function getAdSensePlacementConfig(
  placement: AdPlacement,
): AdSensePlacementConfig | null {
  const providerConfig = getAdSenseProviderConfig();
  const definition = getAdPlacementDefinition(placement);

  if (!providerConfig) {
    return null;
  }

  const slotId = getEnvValue(definition.slotEnvVar);

  if (!isValidAdSenseSlotId(slotId)) {
    return null;
  }

  const resolvedSlotId = slotId;

  const baseConfig = {
    placement,
    slotId: resolvedSlotId,
    clientId: providerConfig.clientId,
  } as const;

  if (definition.unitType === "in-feed") {
    const layoutKey = definition.layoutKeyEnvVar
      ? getEnvValue(definition.layoutKeyEnvVar)
      : undefined;

    if (!isValidLayoutKey(layoutKey)) {
      return null;
    }

    const resolvedLayoutKey = layoutKey;

    return {
      ...baseConfig,
      unitType: "in-feed",
      format: "fluid",
      layout: "image-top",
      layoutKey: resolvedLayoutKey,
    };
  }

  if (definition.unitType === "display") {
    return {
      ...baseConfig,
      unitType: "display",
      format: "auto",
      fullWidthResponsive: true,
    };
  }

  if (definition.unitType === "in-article") {
    return {
      ...baseConfig,
      unitType: "in-article",
      format: "fluid",
      layout: "in-article",
      fullWidthResponsive: true,
    };
  }

  return {
    ...baseConfig,
    unitType: "multiplex",
    format: "autorelaxed",
    matchedContentUiType: "image_stacked",
  };
}

export function hasConfiguredAdSensePlacement(placement?: AdPlacement) {
  if (placement) {
    return getAdSensePlacementConfig(placement) !== null;
  }

  return getConfiguredAdSenseClientId() !== null;
}
