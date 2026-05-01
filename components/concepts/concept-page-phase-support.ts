import type { ConceptLearningPhaseId } from "@/lib/content/concept-learning-phases";
import { conceptShareAnchorIds } from "@/lib/share-links";

export function getConceptPageBenchSupportTargetId(
  phaseId: ConceptLearningPhaseId,
) {
  switch (phaseId) {
    case "explore":
      return "concept-bench-support-explore";
    case "understand":
      return "concept-bench-support-understand";
    case "check":
      return conceptShareAnchorIds.challengeMode;
    default:
      return conceptShareAnchorIds.liveBench;
  }
}
