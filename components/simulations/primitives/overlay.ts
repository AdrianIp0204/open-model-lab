export function resolveOverlayOpacity(
  focusedOverlayId: string | null | undefined,
  overlayId: string,
  inactiveOpacity = 0.38,
) {
  if (!focusedOverlayId) {
    return 1;
  }

  return focusedOverlayId === overlayId ? 1 : inactiveOpacity;
}
