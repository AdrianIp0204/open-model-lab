"use client";

import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ConceptContent } from "@/lib/content";
import { buildConceptAssessmentSessionDescriptor } from "@/lib/assessment-sessions";
import { recordQuickTestCompleted, recordQuickTestStarted } from "@/lib/progress";
import { buildConceptQuizSession, type ConceptQuizSession } from "@/lib/quiz";
import { useConceptLearningBridge } from "./ConceptLearningBridge";
import { useConceptAchievementTracker } from "./ConceptAchievementTracker";
import { QuizRunnerSection } from "@/components/quizzes/QuizRunnerSection";

type QuickTestCompletionNav = {
  hubHref: string;
  reviewHref: string;
  nextTest?: {
    href: string;
    title: string;
  } | null;
};

type QuickTestSupplementaryActionsSection = {
  title: string;
  description?: string;
  actions: Array<{
    href: string;
    label: string;
    tone?: "primary" | "secondary";
  }>;
};

type QuickTestSectionProps = {
  concept: Pick<
    ConceptContent,
    "id" | "slug" | "title" | "quickTest" | "sections" | "simulation" | "graphs" | "variableLinks"
  >;
  sectionTitle?: string;
  completionNav?: QuickTestCompletionNav | null;
  showSimulationActions?: boolean;
  supplementaryActionsSection?: QuickTestSupplementaryActionsSection | null;
};

function buildCompletionDescription(
  t: ReturnType<typeof useTranslations<"QuickTestSection">>,
  input: {
    finalIncorrectCount: number;
    initialMissedCount: number;
  },
) {
  if (input.initialMissedCount === 0) {
    return `${t("complete.intro")} ${t("complete.cleanNote")}`;
  }

  if (input.finalIncorrectCount === 0) {
    return `${t("complete.intro")} ${t("complete.tryAgainResolved", {
      count: input.initialMissedCount,
    })}`;
  }

  return `${t("complete.intro")} ${t("complete.tryAgainStillMissed", {
    count: input.finalIncorrectCount,
  })}`;
}

export function QuickTestSection({
  concept,
  sectionTitle,
  completionNav = null,
  showSimulationActions = true,
  supplementaryActionsSection = null,
}: QuickTestSectionProps) {
  const t = useTranslations("QuickTestSection");
  const locale = useLocale() as "en" | "zh-HK";
  const { applyQuickTestAction, clearQuickTestAction } = useConceptLearningBridge();
  const { markMeaningfulInteraction, trackQuestionAnswered } = useConceptAchievementTracker();

  useEffect(() => () => clearQuickTestAction(), [clearQuickTestAction]);

  function buildSession(input: {
    locale: "en" | "zh-HK";
    seed: string;
    attemptNumber: number;
  }): ConceptQuizSession {
    return buildConceptQuizSession(concept as ConceptContent, {
      locale: input.locale,
      seed: input.seed,
    });
  }

  return (
    <QuizRunnerSection
      title={sectionTitle ?? concept.quickTest.title ?? t("title")}
      intro={concept.quickTest.intro}
      seedBase={concept.slug}
      resumeDescriptor={buildConceptAssessmentSessionDescriptor(
        concept as ConceptContent,
        locale,
      )}
      buildSession={buildSession}
      buildRoundSummaryDescription={({ missedCount }) =>
        t("roundSummary.description", { count: missedCount })
      }
      buildCompletionDescription={(input) => buildCompletionDescription(t, input)}
      supplementaryActionsSection={supplementaryActionsSection}
      completionActions={
        completionNav
          ? [
              ...(completionNav.nextTest
                ? [
                    {
                      href: completionNav.nextTest.href,
                      label: t("actions.nextTest"),
                      tone: "primary" as const,
                    },
                  ]
                : []),
              {
                href: completionNav.reviewHref,
                label: t("actions.reviewConcept"),
              },
              {
                href: completionNav.hubHref,
                label: t("actions.backToTestHub"),
              },
            ]
          : []
      }
      onMeaningfulInteraction={markMeaningfulInteraction}
      onQuestionAnswered={trackQuestionAnswered}
      onAttemptStarted={() => {
        recordQuickTestStarted({
          id: concept.id,
          slug: concept.slug,
          title: concept.title,
        });
      }}
      onAttemptCompleted={({ finalIncorrectCount, questionCount }) => {
        recordQuickTestCompleted(
          {
            id: concept.id,
            slug: concept.slug,
            title: concept.title,
          },
          {
            incorrectAnswers: finalIncorrectCount,
            totalQuestions: questionCount,
          },
        );
      }}
      onShowMeAction={showSimulationActions ? applyQuickTestAction : undefined}
      onClearShowMeAction={showSimulationActions ? clearQuickTestAction : undefined}
    />
  );
}
