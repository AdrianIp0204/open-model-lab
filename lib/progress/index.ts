export {
  resolveAccountProgressSnapshot,
  type AccountProgressDisplaySnapshot,
  type AccountProgressDisplaySource,
} from "./account-display";

export {
  buildFreeTierProgressRecapSummary,
  type FreeTierProgressCompletion,
  type FreeTierProgressCompletionKind,
  type FreeTierProgressPrompt,
  type FreeTierProgressPromptKind,
  type FreeTierProgressRecapSummary,
  type FreeTierSubjectMomentum,
} from "./free-tier-recap";

export {
  buildPremiumCheckpointHistoryView,
  createEmptyProgressHistoryStore,
  normalizeProgressHistoryStore,
  updateProgressHistoryStore,
  PROGRESS_HISTORY_VERSION,
  type PremiumCheckpointHistoryConceptTrend,
  type PremiumCheckpointHistoryMetric,
  type ProgressHistoryConceptSummary,
  type PremiumCheckpointHistorySubjectTrend,
  type PremiumCheckpointHistoryView,
  type ProgressHistoryEvent,
  type ProgressHistoryEventKind,
  type ProgressHistorySubjectSummary,
  type ProgressHistoryStore,
  type ProgressHistoryTimelinePoint,
  type ProgressHistoryTimelineSubject,
} from "./history";

export {
  buildPremiumLearningAnalytics,
  type LearningAnalyticsConceptSummary,
  type LearningAnalyticsCoverageItem,
  type LearningAnalyticsMetric,
  type LearningAnalyticsNextStep,
  type LearningAnalyticsTopicInsight,
  type PremiumLearningAnalytics,
} from "./analytics";

export {
  buildPremiumAdaptiveReviewSummary,
  type PremiumAdaptiveReviewItem,
  type PremiumAdaptiveReviewOutcomeKind,
  type PremiumAdaptiveReviewSummary,
} from "./premium-adaptive-review";

export {
  buildGuidedCollectionEntryDiagnostic,
  buildRecommendedGoalPathEntryDiagnosticTeaser,
  buildStarterTrackEntryDiagnostic,
  type LearningPathEntryDiagnosticAction,
  type LearningPathEntryDiagnosticChallengeProbeProgress,
  type LearningPathEntryDiagnosticProbeProgress,
  type LearningPathEntryDiagnosticProbeStatus,
  type LearningPathEntryDiagnosticQuickTestProbeProgress,
  type LearningPathEntryDiagnosticRecommendationKind,
  type LearningPathEntryDiagnosticSummary,
  type RecommendedGoalPathEntryDiagnosticTeaser,
} from "./entry-diagnostics";

export {
  createEmptyProgressSnapshot,
  deriveConceptMasteryState,
  deriveConceptMasterySummary,
  deriveConceptProgressStatus,
  getChallengeProgressState,
  getChallengeStartedAt,
  getCompletedChallengeCount,
  getCompletedChallengeIds,
  getConceptPracticedFeatures,
  getConceptProgressLastActivityAt,
  getConceptProgressRecord,
  getConceptResurfacingCue,
  getConceptProgressSummary,
  getStartedChallengeCount,
  getStartedChallengeIds,
  normalizeConceptProgressRecord,
  normalizeProgressSnapshot,
  PROGRESS_STORAGE_KEY,
  PROGRESS_STORAGE_VERSION,
  selectReviewQueue,
  selectContinueLearning,
  type ConceptMasteryState,
  type ConceptMasterySummary,
  type ChallengeProgressState,
  type ConceptProgressRecord,
  type PackTestProgressRecord,
  type ConceptProgressStatus,
  type ConceptProgressSummary,
  type ConceptResurfacingCue,
  type ProgressConceptIdentity,
  type ProgressSnapshot,
  type TopicTestProgressRecord,
  type ReviewQueueItem,
  type ReviewQueueReasonKind,
} from "./model";

export {
  localConceptProgressStore,
  forceProgressSync,
  markConceptCompleted,
  recordChallengeCompleted,
  recordChallengeStarted,
  recordChallengeModeUsed,
  recordCompareModeUsed,
  recordConceptInteraction,
  recordConceptVisit,
  recordPredictionModeUsed,
  recordQuickTestStarted,
  recordQuickTestCompleted,
  recordPackTestStarted,
  recordPackTestCompleted,
  recordTopicTestStarted,
  recordTopicTestCompleted,
  recordWorkedExampleEngaged,
  resetConceptProgress,
  useConceptProgressSummary,
  useProgressSnapshotReady,
  useProgressSyncState,
  useProgressSnapshot,
  type ProgressSyncMode,
  type ProgressSyncState,
} from "./store";

export {
  buildReviewActionHref,
  buildSavedContinueLearningState,
  getNextRecommendedConcept,
  normalizeSavedContinueLearningState,
  selectCurrentTrack,
  type ContinueLearningStateConcept,
  type CurrentTrackCandidate,
  type SavedContinueLearningFollowUp,
  type SavedContinueLearningPrimaryConcept,
  type SavedContinueLearningRecentConcept,
  type SavedContinueLearningRecommendation,
  type SavedContinueLearningReviewAction,
  type SavedContinueLearningReviewItem,
  type SavedContinueLearningState,
  type SavedContinueLearningTrackCue,
  type SavedContinueLearningTrack,
  type SavedContinueLearningTrackAction,
} from "./continue-learning-state";

export {
  buildStartLearningResumeSummary,
  type StartLearningResumePrimaryConcept,
  type StartLearningResumeSummary,
  type StartLearningResumeTrack,
  type StartLearningReviewAction,
} from "./start-learning";

export {
  buildReviewRemediationSuggestions,
  mergeSavedCompareSetupRemediationSuggestions,
  type ReviewRemediationAction,
  type ReviewRemediationActionKind,
  type ReviewRemediationConcept,
  type ReviewRemediationSuggestion,
  type ReviewRemediationSuggestionKind,
  type SavedCompareSetupRecoveryAction,
} from "./remediation";

export {
  selectAdaptiveReviewQueue,
  type AdaptiveReviewQueueItem,
  type ReviewQueueAction,
  type ReviewQueueActionKind,
  type ReviewQueueTrackContext,
} from "./review-queue";

export {
  mergeConceptProgressRecords,
  mergeProgressSnapshots,
  summarizeProgressMerge,
  type ProgressMergeSummary,
} from "./sync";

export {
  getGuidedCollectionAssignmentProgressSummary,
  getGuidedConceptBundleProgressSummary,
  getGuidedCollectionProgressSummary,
  type GuidedCollectionAssignmentProgressSummary,
  type GuidedConceptBundleProgressSummary,
  type GuidedCollectionProgressStatus,
  type GuidedCollectionProgressSummary,
  type GuidedCollectionStepAction,
  type GuidedCollectionStepProgress,
} from "./guided-collections";

export {
  compareStarterTrackProgressSummaries,
  getStarterTrackStatusPriority,
  type StarterTrackCheckpointAction,
  type StarterTrackCheckpointProgress,
  type StarterTrackCheckpointProgressStatus,
  getStarterTrackCompletionSummary,
  getStarterTrackRecapSummary,
  getStarterTrackMembershipAction,
  getStarterTrackPrimaryAction,
  getStarterTrackProgressSummary,
  type StarterTrackCompletionConcept,
  type StarterTrackCompletionGuidance,
  type StarterTrackCompletionGuidanceKind,
  type StarterTrackCompletionSummary,
  type StarterTrackRecapAction,
  type StarterTrackRecapActionKind,
  type StarterTrackRecapFocusKind,
  type StarterTrackRecapStep,
  type StarterTrackRecapSummary,
  type StarterTrackPrimaryAction,
  type StarterTrackProgressStatus,
  type StarterTrackProgressSummary,
} from "./tracks";

export {
  buildPrerequisiteTrackRecommendations,
  buildTopicStarterTrackRecommendations,
  type StarterTrackRecommendationSummary,
} from "./track-recommendations";

export {
  buildRecommendedGoalPathProgressSummary,
  type RecommendedGoalPathAction,
  type RecommendedGoalPathProgressStatus,
  type RecommendedGoalPathProgressSummary,
  type RecommendedGoalPathStepProgress,
} from "./recommended-goal-paths";

export {
  buildSavedStudyPlanProgressSummary,
  type SavedStudyPlanAction,
  type SavedStudyPlanEntryProgress,
  type SavedStudyPlanProgressStatus,
  type SavedStudyPlanProgressSummary,
} from "./study-plans";
