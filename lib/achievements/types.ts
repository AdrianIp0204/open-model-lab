export const achievementStatKeys = [
  "concept-visits",
  "question-answers",
  "challenge-completions",
  "track-completions",
  "active-study-hours",
] as const;

export type AchievementStatKey = (typeof achievementStatKeys)[number];

export const achievementItemKinds = ["milestone", "challenge", "track"] as const;

export type AchievementItemKind = (typeof achievementItemKinds)[number];

export type AchievementStats = {
  conceptVisitCount: number;
  questionAnswerCount: number;
  distinctChallengeCompletionCount: number;
  distinctTrackCompletionCount: number;
  activeStudySeconds: number;
};

export type AchievementMilestoneProgress = {
  statKey: AchievementStatKey;
  currentValue: number;
  nextTarget: number | null;
  progressRatio: number;
};

export type AccountAchievementItemSummary = {
  key: string;
  kind: AchievementItemKind;
  title: string;
  description: string;
  earned: boolean;
  earnedAt: string | null;
  categoryKey: string;
};

export type AchievementMilestoneGroupSummary = {
  statKey: AchievementStatKey;
  title: string;
  description: string;
  unitLabel: string;
  currentValue: number;
  nextMilestone: AchievementMilestoneProgress;
  items: AccountAchievementItemSummary[];
};

export const achievementDashboardMilestoneStatuses = [
  "next-up",
  "earned",
  "maxed",
] as const;

export type AchievementDashboardMilestoneStatus =
  (typeof achievementDashboardMilestoneStatuses)[number];

export type AchievementDashboardMilestoneSummary = {
  statKey: AchievementStatKey;
  title: string;
  summaryTitle: string;
  progressLabel: string;
  status: AchievementDashboardMilestoneStatus;
  rewardRelevant: boolean;
};

export type AchievementNamedGroupSummary = {
  key: "challenge-completions" | "track-completions";
  title: string;
  description: string;
  items: AccountAchievementItemSummary[];
};

export const achievementRewardStatuses = [
  "locked",
  "unlocked",
  "claimed",
  "expired",
  "premium-ineligible",
  "used",
  "already-used",
  "unavailable",
  "temporarily-unavailable",
] as const;

export type AchievementRewardStatus = (typeof achievementRewardStatuses)[number];

export type AchievementRewardSummary = {
  key: string;
  status: AchievementRewardStatus;
  title: string;
  description: string;
  reasonLabel: string | null;
  unlockedAt: string | null;
  expiresAt: string | null;
  claimedAt: string | null;
  usedAt: string | null;
  claimable: boolean;
  resumable: boolean;
  checkoutReady: boolean;
};

export type AccountAchievementOverview = {
  stats: AchievementStats;
  milestoneGroups: AchievementMilestoneGroupSummary[];
  namedGroups: AchievementNamedGroupSummary[];
  reward: AchievementRewardSummary;
};

export type AccountAchievementDashboardSnapshot = {
  milestoneCategories: AchievementDashboardMilestoneSummary[];
};

export type AchievementToastSummary = Pick<
  AccountAchievementItemSummary,
  "key" | "kind" | "title" | "description" | "earnedAt"
>;

export const accountAchievementEventTypes = [
  "concept_engagement",
  "question_answered",
  "challenge_completed",
  "track_completed",
] as const;

export type AccountAchievementEventType = (typeof accountAchievementEventTypes)[number];

export type ConceptEngagementAchievementEvent = {
  type: "concept_engagement";
  conceptSlug: string;
  sessionId: string;
  interactionCount: number;
  heartbeatSlot: number | null;
  sessionActiveStudySeconds?: number | null;
};

export type QuestionAnsweredAchievementEvent = {
  type: "question_answered";
  conceptSlug: string;
  questionId: string;
};

export type ChallengeCompletedAchievementEvent = {
  type: "challenge_completed";
  conceptSlug: string;
  challengeId: string;
};

export type TrackCompletedAchievementEvent = {
  type: "track_completed";
  trackSlug: string;
};

export type AccountAchievementEvent =
  | ConceptEngagementAchievementEvent
  | QuestionAnsweredAchievementEvent
  | ChallengeCompletedAchievementEvent
  | TrackCompletedAchievementEvent;

export type AccountAchievementEventResponse = {
  ok: true;
  newlyEarnedAchievements: AchievementToastSummary[];
  reward: AchievementRewardSummary;
};
