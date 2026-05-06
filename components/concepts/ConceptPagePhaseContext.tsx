"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ConceptLearningPhaseId } from "@/lib/content/concept-learning-phases";
import type { ResolvedConceptPageV2Step } from "@/lib/content/concept-page-v2";
import type { ConceptPageV2Reveal } from "@/lib/content/schema";
export { getConceptPageBenchSupportTargetId } from "./concept-page-phase-support";

export type ConceptPageGuidedStepContext = {
  step: ResolvedConceptPageV2Step;
  index: number;
  count: number;
};

type ConceptPagePhaseContextValue = {
  activePhaseId?: ConceptLearningPhaseId | null;
  returnToSetupArea?: (options?: {
    phaseId?: ConceptLearningPhaseId;
  }) => void;
  guidedStepCard?: ReactNode;
  guidedStepSupport?: ReactNode;
  guidedStep?: ConceptPageGuidedStepContext | null;
  guidedReveal?: ConceptPageV2Reveal | null;
};

const ConceptPagePhaseContext = createContext<ConceptPagePhaseContextValue | null>(null);

ConceptPagePhaseContext.displayName = "ConceptPagePhaseContext";

export function ConceptPagePhaseProvider({
  activePhaseId,
  returnToSetupArea,
  guidedStepCard,
  guidedStepSupport,
  guidedStep,
  guidedReveal,
  children,
}: {
  activePhaseId?: ConceptLearningPhaseId | null;
  returnToSetupArea?: (options?: {
    phaseId?: ConceptLearningPhaseId;
  }) => void;
  guidedStepCard?: ReactNode;
  guidedStepSupport?: ReactNode;
  guidedStep?: ConceptPageGuidedStepContext | null;
  guidedReveal?: ConceptPageV2Reveal | null;
  children: ReactNode;
}) {
  return (
    <ConceptPagePhaseContext.Provider
      value={{
        activePhaseId,
        returnToSetupArea,
        guidedStepCard,
        guidedStepSupport,
        guidedStep,
        guidedReveal,
      }}
    >
      {children}
    </ConceptPagePhaseContext.Provider>
  );
}

export function useConceptPagePhase() {
  return useContext(ConceptPagePhaseContext);
}
