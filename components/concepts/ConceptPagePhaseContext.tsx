"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ConceptLearningPhaseId } from "@/lib/content/concept-learning-phases";
import type { ConceptPageV2Reveal } from "@/lib/content/schema";
export { getConceptPageBenchSupportTargetId } from "./concept-page-phase-support";

type ConceptPagePhaseContextValue = {
  activePhaseId?: ConceptLearningPhaseId | null;
  returnToSetupArea?: (options?: {
    phaseId?: ConceptLearningPhaseId;
  }) => void;
  guidedStepCard?: ReactNode;
  guidedStepSupport?: ReactNode;
  guidedReveal?: ConceptPageV2Reveal | null;
};

const ConceptPagePhaseContext = createContext<ConceptPagePhaseContextValue | null>(null);

ConceptPagePhaseContext.displayName = "ConceptPagePhaseContext";

export function ConceptPagePhaseProvider({
  activePhaseId,
  returnToSetupArea,
  guidedStepCard,
  guidedStepSupport,
  guidedReveal,
  children,
}: {
  activePhaseId?: ConceptLearningPhaseId | null;
  returnToSetupArea?: (options?: {
    phaseId?: ConceptLearningPhaseId;
  }) => void;
  guidedStepCard?: ReactNode;
  guidedStepSupport?: ReactNode;
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
