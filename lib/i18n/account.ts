type AccountIdentityKey = "learner" | "freeLearner" | "premiumLearner";

type AccountIdentityTranslator = (key: AccountIdentityKey) => string;

export function getLocalizedAccountDisplayName(
  displayName: string | null | undefined,
  t: AccountIdentityTranslator,
) {
  if (!displayName) {
    return displayName ?? "";
  }

  switch (displayName.trim().toLowerCase()) {
    case "learner":
      return t("learner");
    case "free learner":
      return t("freeLearner");
    case "premium learner":
      return t("premiumLearner");
    default:
      return displayName;
  }
}
