import optimizedConceptUiCopyData from "@/content/_meta/generated/optimized-concept-ui-copy.json";
import {
  assertOptimizedConceptUiCopy,
  type OptimizedConceptUiCopy,
} from "./content-variant-artifact-guards";

export const optimizedConceptUiCopy =
  assertOptimizedConceptUiCopy(optimizedConceptUiCopyData) as Record<
    string,
    OptimizedConceptUiCopy
  >;
