"use client";

import { createEmptyProgressSnapshot, type ProgressSnapshot } from "./model";
import { mergeProgressSnapshots } from "./sync";

export type AccountProgressDisplaySource = "local" | "synced" | "merged";

export type AccountProgressDisplaySnapshot = {
  snapshot: ProgressSnapshot;
  source: AccountProgressDisplaySource;
  hasLocalRecordedProgress: boolean;
  hasSyncedRecordedProgress: boolean;
};

function hasRecordedProgress(snapshot: ProgressSnapshot | null | undefined) {
  return Boolean(
    snapshot &&
      (Object.keys(snapshot.concepts).length > 0 ||
        Object.keys(snapshot.topicTests ?? {}).length > 0 ||
        Object.keys(snapshot.packTests ?? {}).length > 0),
  );
}

export function resolveAccountProgressSnapshot(
  localSnapshot: ProgressSnapshot | null | undefined,
  syncedSnapshot: ProgressSnapshot | null | undefined,
): AccountProgressDisplaySnapshot {
  const safeLocalSnapshot = localSnapshot ?? createEmptyProgressSnapshot();
  const hasLocalRecordedProgress = hasRecordedProgress(safeLocalSnapshot);
  const hasSyncedRecordedProgress = hasRecordedProgress(syncedSnapshot);

  if (hasLocalRecordedProgress && hasSyncedRecordedProgress) {
    return {
      snapshot: mergeProgressSnapshots(syncedSnapshot, safeLocalSnapshot),
      source: "merged",
      hasLocalRecordedProgress,
      hasSyncedRecordedProgress,
    };
  }

  if (hasSyncedRecordedProgress && syncedSnapshot) {
    return {
      snapshot: syncedSnapshot,
      source: "synced",
      hasLocalRecordedProgress,
      hasSyncedRecordedProgress,
    };
  }

  return {
    snapshot: safeLocalSnapshot,
    source: "local",
    hasLocalRecordedProgress,
    hasSyncedRecordedProgress,
  };
}
