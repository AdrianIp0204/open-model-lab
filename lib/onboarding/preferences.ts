export const ONBOARDING_PREFERENCES_STORAGE_KEY =
  "open-model-lab.onboarding.v1";

export type OnboardingPreferences = {
  promptDismissed: boolean;
  disabled: boolean;
  completed: boolean;
  lastStep: number;
  updatedAt: string | null;
};

export const defaultOnboardingPreferences: OnboardingPreferences = {
  promptDismissed: false,
  disabled: false,
  completed: false,
  lastStep: 0,
  updatedAt: null,
};

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizePreferences(value: unknown): OnboardingPreferences {
  if (!value || typeof value !== "object") {
    return defaultOnboardingPreferences;
  }

  const candidate = value as Partial<OnboardingPreferences>;

  return {
    promptDismissed: Boolean(candidate.promptDismissed),
    disabled: Boolean(candidate.disabled),
    completed: Boolean(candidate.completed),
    lastStep:
      typeof candidate.lastStep === "number" && Number.isFinite(candidate.lastStep)
        ? Math.max(0, Math.floor(candidate.lastStep))
        : 0,
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : null,
  };
}

export function readOnboardingPreferences(): OnboardingPreferences {
  if (!canUseLocalStorage()) {
    return defaultOnboardingPreferences;
  }

  try {
    const raw = window.localStorage.getItem(ONBOARDING_PREFERENCES_STORAGE_KEY);

    if (!raw) {
      return defaultOnboardingPreferences;
    }

    return normalizePreferences(JSON.parse(raw));
  } catch {
    return defaultOnboardingPreferences;
  }
}

export function writeOnboardingPreferences(
  preferences: Partial<OnboardingPreferences>,
): OnboardingPreferences {
  const nextPreferences: OnboardingPreferences = {
    ...defaultOnboardingPreferences,
    ...readOnboardingPreferences(),
    ...preferences,
    updatedAt: new Date().toISOString(),
  };

  if (!canUseLocalStorage()) {
    return nextPreferences;
  }

  try {
    window.localStorage.setItem(
      ONBOARDING_PREFERENCES_STORAGE_KEY,
      JSON.stringify(nextPreferences),
    );
  } catch {
    return nextPreferences;
  }

  return nextPreferences;
}
