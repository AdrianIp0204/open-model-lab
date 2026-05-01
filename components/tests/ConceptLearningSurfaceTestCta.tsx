"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import {
  buildConceptEntryAssessmentSessionDescriptor,
  useAssessmentSessionMatch,
  useAssessmentSessionStoreReady,
} from "@/lib/assessment-sessions";
import { type ProgressSnapshot } from "@/lib/progress";
import {
  getConceptTestProgressState,
  getPublishedConceptTestEntryBySlug,
  resolveTestHubAssessmentActionKind,
} from "@/lib/test-hub";

type ConceptLearningSurfaceTestCtaProps = {
  conceptSlug: string;
  snapshot: ProgressSnapshot;
  progressReady: boolean;
  className: string;
  testId?: string;
};

export function ConceptLearningSurfaceTestCta({
  conceptSlug,
  snapshot,
  progressReady,
  className,
  testId,
}: ConceptLearningSurfaceTestCtaProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("AssessmentCta");
  const entry = useMemo(
    () => getPublishedConceptTestEntryBySlug(conceptSlug),
    [conceptSlug],
  );
  const assessmentSessionReady = useAssessmentSessionStoreReady();
  const resumeDescriptor = useMemo(
    () =>
      entry ? buildConceptEntryAssessmentSessionDescriptor(entry, locale) : null,
    [entry, locale],
  );
  const resumeMatch = useAssessmentSessionMatch(resumeDescriptor);

  if (!entry) {
    return null;
  }

  const ready = progressReady && assessmentSessionReady;

  if (!ready) {
    return null;
  }

  const progress = getConceptTestProgressState(snapshot, entry);
  const actionKind = resolveTestHubAssessmentActionKind({
    progress,
    resumeMatch,
    ready,
  });

  const label =
    actionKind === "resume"
      ? t("resume")
      : actionKind === "continue"
        ? t("continue")
        : actionKind === "retake"
          ? t("retake")
          : t("start");

  return (
    <Link
      href={entry.testHref}
      className={className}
      data-testid={testId}
    >
      {label}
    </Link>
  );
}
