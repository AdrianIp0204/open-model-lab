"use client";

import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import {
  mergeSavedCompareSetupRemediationSuggestions,
  type ReviewQueueReasonKind,
  type ReviewRemediationAction,
  type ReviewRemediationSuggestion,
  type SavedCompareSetupRecoveryAction,
} from "@/lib/progress";
import type { AppLocale } from "@/i18n/routing";
import { useAccountSession } from "@/lib/account/client";
import { ReviewRemediationList } from "./ReviewRemediationList";

type AccountAwareReviewRemediationListProps = {
  concept: {
    slug: string;
    title: string;
  };
  reasonKind: ReviewQueueReasonKind;
  primaryAction: ReviewRemediationAction;
  secondaryAction: ReviewRemediationAction | null;
  suggestions: ReviewRemediationSuggestion[];
  variant?: "default" | "compact";
  className?: string;
  limit?: number;
};

type SavedCompareSetupRecoveryResponse = {
  items: SavedCompareSetupRecoveryAction[];
  error?: string;
};

export function AccountAwareReviewRemediationList({
  concept,
  reasonKind,
  primaryAction,
  secondaryAction,
  suggestions,
  variant = "default",
  className,
  limit = 2,
}: AccountAwareReviewRemediationListProps) {
  const session = useAccountSession();
  const locale = useLocale() as AppLocale;
  const canUseAdvancedStudyTools = session.entitlement.capabilities.canUseAdvancedStudyTools;
  const [savedCompareRecoveryState, setSavedCompareRecoveryState] = useState<{
    conceptSlug: string | null;
    items: SavedCompareSetupRecoveryAction[];
  }>({
    conceptSlug: null,
    items: [],
  });
  const accountRecoveryActions =
    session.initialized &&
    session.status === "signed-in" &&
    savedCompareRecoveryState.conceptSlug === concept.slug
      ? savedCompareRecoveryState.items
      : [];

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    if (!session.initialized || session.status !== "signed-in" || !canUseAdvancedStudyTools) {
      return () => {
        active = false;
        controller.abort();
      };
    }

    void fetch(
      `/api/account/compare-setups/recovery?concept=${encodeURIComponent(concept.slug)}&locale=${encodeURIComponent(locale)}`,
      {
        cache: "no-store",
        signal: controller.signal,
      },
    )
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as SavedCompareSetupRecoveryResponse;

        if (!response.ok) {
          throw new Error(payload.error ?? "Saved compare setup recovery could not be loaded.");
        }

        return payload.items ?? [];
      })
      .then((items) => {
        if (!active) {
          return;
        }

        setSavedCompareRecoveryState({
          conceptSlug: concept.slug,
          items,
        });
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setSavedCompareRecoveryState({
          conceptSlug: concept.slug,
          items: [],
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [
    canUseAdvancedStudyTools,
    concept.slug,
    locale,
    session.initialized,
    session.status,
    session.user?.id,
  ]);

  const displaySuggestions = mergeSavedCompareSetupRemediationSuggestions(
    suggestions,
    {
      concept,
      reasonKind,
      primaryAction,
      secondaryAction,
    },
    accountRecoveryActions,
    limit,
  );

  return (
    <ReviewRemediationList
      suggestions={displaySuggestions}
      variant={variant}
      className={className}
    />
  );
}
