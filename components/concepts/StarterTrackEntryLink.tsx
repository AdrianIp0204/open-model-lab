"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { StarterTrackSummary } from "@/lib/content";
import { getStarterTrackDisplayTitle } from "@/lib/i18n/content";
import {
  getStarterTrackProgressSummary,
  resolveAccountProgressSnapshot,
  useProgressSnapshot,
  type ProgressSnapshot,
} from "@/lib/progress";
import { buildTrackCompletionHref } from "@/lib/share-links";

type StarterTrackEntryLinkProps = {
  track: StarterTrackSummary;
  className?: string;
  labelVariant?: "default" | "named";
  initialSyncedSnapshot?: ProgressSnapshot | null;
};

function getActionLabel(
  trackTitle: string,
  status: ReturnType<typeof getStarterTrackProgressSummary>["status"],
  labelVariant: NonNullable<StarterTrackEntryLinkProps["labelVariant"]>,
  t: ReturnType<typeof useTranslations<"StarterTrackEntryLink">>,
) {
  if (labelVariant === "named") {
    if (status === "completed") {
      return t("named.completed", { title: trackTitle });
    }

    if (status === "in-progress") {
      return t("named.inProgress", { title: trackTitle });
    }

    return t("named.notStarted", { title: trackTitle });
  }

  if (status === "completed") {
    return t("default.completed");
  }

  if (status === "in-progress") {
    return t("default.inProgress");
  }

  return t("default.notStarted");
}

export function StarterTrackEntryLink({
  track,
  className,
  labelVariant = "default",
  initialSyncedSnapshot = null,
}: StarterTrackEntryLinkProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("StarterTrackEntryLink");
  const localSnapshot = useProgressSnapshot();
  const snapshot = resolveAccountProgressSnapshot(
    localSnapshot,
    initialSyncedSnapshot,
  ).snapshot;
  const progress = getStarterTrackProgressSummary(snapshot, track);
  const displayTitle = getStarterTrackDisplayTitle(track, locale);
  const href =
    progress.status === "completed"
      ? buildTrackCompletionHref(track.slug)
      : `/tracks/${track.slug}`;

  return (
    <Link href={href} className={className}>
      {getActionLabel(displayTitle, progress.status, labelVariant, t)}
    </Link>
  );
}
