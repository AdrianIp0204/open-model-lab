export const OPEN_ONBOARDING_HELP_EVENT = "open-model-lab:onboarding-open-help";

export type OpenOnboardingHelpDetail = {
  restoreFocusTo?: HTMLElement | null;
};

export function dispatchOpenOnboardingHelp(restoreFocusTo?: HTMLElement | null) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<OpenOnboardingHelpDetail>(OPEN_ONBOARDING_HELP_EVENT, {
      detail: { restoreFocusTo },
    }),
  );
}

export function isOpenOnboardingHelpEvent(
  event: Event,
): event is CustomEvent<OpenOnboardingHelpDetail> {
  return event.type === OPEN_ONBOARDING_HELP_EVENT;
}
