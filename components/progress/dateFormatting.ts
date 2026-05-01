export function formatProgressMonthDay(
  value: string | null,
  progressSource: "local" | "synced",
  locale?: string,
) {
  if (!value) {
    return null;
  }

  try {
    const parsedValue = new Date(value);

    if (progressSource === "synced") {
      return new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(parsedValue);
    }

    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
    }).format(parsedValue);
  } catch {
    return null;
  }
}
