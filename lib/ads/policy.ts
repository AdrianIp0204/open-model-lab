import {
  getAdSensePlacementConfig,
  getAdSenseProviderConfig,
  isAdSenseEnabled,
} from "./adsense";
import {
  getAdPlacementsForRouteGroup,
  isPlacementAllowedOnPath,
  resolveAdRouteGroup,
  type AdPlacement,
} from "./slots";

type PlacementRenderPolicyInput = {
  pathname: string | null | undefined;
  placement: AdPlacement;
  sessionReady: boolean;
  shouldShowAds: boolean;
};

type ProviderScriptPolicyInput = {
  pathname: string | null | undefined;
  sessionReady: boolean;
  shouldShowAds: boolean;
};

export function canRenderAdPlacement({
  pathname,
  placement,
  sessionReady,
  shouldShowAds,
}: PlacementRenderPolicyInput) {
  if (!sessionReady || !shouldShowAds || !isAdSenseEnabled()) {
    return false;
  }

  if (!getAdSenseProviderConfig()) {
    return false;
  }

  if (!isPlacementAllowedOnPath(placement, pathname)) {
    return false;
  }

  return getAdSensePlacementConfig(placement) !== null;
}

export function shouldLoadAdProviderScript({
  pathname,
  sessionReady,
  shouldShowAds,
}: ProviderScriptPolicyInput) {
  if (!sessionReady || !shouldShowAds || !isAdSenseEnabled()) {
    return false;
  }

  if (!getAdSenseProviderConfig()) {
    return false;
  }

  const routeGroup = resolveAdRouteGroup(pathname);

  if (!routeGroup) {
    return false;
  }

  return getAdPlacementsForRouteGroup(routeGroup).some(
    (placement) => getAdSensePlacementConfig(placement) !== null,
  );
}
