import type { DeepPartial } from "@/lib/i18n/content-translations";

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStableArrayKey(value: unknown[]) {
  if (
    value.length > 0 &&
    value.every((item) => isPlainObject(item) && typeof item.id === "string")
  ) {
    return "id" as const;
  }

  if (
    value.length > 0 &&
    value.every((item) => isPlainObject(item) && typeof item.slug === "string")
  ) {
    return "slug" as const;
  }

  return null;
}

// Arrays merge only when they expose stable `id` or `slug` keys. Otherwise the overlay replaces
// the canonical array wholesale. Overlay objects also preserve canonical `id` and `slug` values so
// editorial variants cannot rewrite stable identity fields.
export function mergeTranslatedValue<T>(base: T, override: DeepPartial<T> | undefined): T {
  if (override === undefined) {
    return base;
  }

  if (Array.isArray(base)) {
    if (!Array.isArray(override)) {
      return base;
    }

    const stableKey = getStableArrayKey(base);

    if (
      stableKey &&
      override.every((item) => isPlainObject(item) && typeof item[stableKey] === "string")
    ) {
      const overridesByStableKey = new Map(
        override.map((item) => [item[stableKey], item]),
      );

      return base.map((item) => {
        const itemOverride = overridesByStableKey.get(item[stableKey]);
        return mergeTranslatedValue(item, itemOverride);
      }) as T;
    }

    return override as T;
  }

  if (isPlainObject(base) && isPlainObject(override)) {
    const merged: Record<string, unknown> = { ...base };

    for (const [key, value] of Object.entries(override)) {
      if ((key === "id" || key === "slug") && key in base) {
        merged[key] = (base as Record<string, unknown>)[key];
        continue;
      }

      merged[key] = mergeTranslatedValue(
        (base as Record<string, unknown>)[key],
        value as DeepPartial<unknown>,
      );
    }

    return merged as T;
  }

  return override as T;
}
