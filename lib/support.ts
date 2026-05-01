const FALLBACK_BUY_ME_A_COFFEE_URL = "https://buymeacoffee.com/openmodellab";

export function getBuyMeACoffeeUrl(): string {
  return (
    process.env.NEXT_PUBLIC_OPEN_MODEL_LAB_BUY_ME_A_COFFEE_URL?.trim() ||
    process.env.OPEN_MODEL_LAB_BUY_ME_A_COFFEE_URL?.trim() ||
    FALLBACK_BUY_ME_A_COFFEE_URL
  );
}
