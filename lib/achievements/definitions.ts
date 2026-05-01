import { createHash } from "node:crypto";
import {
  getAllConcepts,
  getChallengeDiscoveryIndex,
  getStarterTracks,
} from "@/lib/content";
import { getConceptQuizCanonicalQuestionDescriptors } from "@/lib/quiz";
import {
  ACHIEVEMENT_MIN_VISIBLE_HOURS_PROGRESS,
  ACHIEVEMENT_REWARD_CHALLENGE_TARGET,
  ACHIEVEMENT_REWARD_DISCOUNT_PERCENT,
  ACHIEVEMENT_REWARD_EXPIRY_DAYS,
  ACHIEVEMENT_REWARD_KEY,
  ACHIEVEMENT_REWARD_STUDY_HOURS_TARGET,
  ACHIEVEMENT_REWARD_STUDY_SECONDS_TARGET,
  ACHIEVEMENT_STUDY_HEARTBEAT_SECONDS,
  ACHIEVEMENT_VISIT_ACTIVE_SECONDS,
  ACHIEVEMENT_VISIT_INTERACTION_COUNT,
} from "./constants";
import type {
  AchievementItemKind,
  AchievementStatKey,
} from "./types";

export {
  ACHIEVEMENT_MIN_VISIBLE_HOURS_PROGRESS,
  ACHIEVEMENT_REWARD_CHALLENGE_TARGET,
  ACHIEVEMENT_REWARD_DISCOUNT_PERCENT,
  ACHIEVEMENT_REWARD_EXPIRY_DAYS,
  ACHIEVEMENT_REWARD_KEY,
  ACHIEVEMENT_REWARD_STUDY_HOURS_TARGET,
  ACHIEVEMENT_REWARD_STUDY_SECONDS_TARGET,
  ACHIEVEMENT_STUDY_HEARTBEAT_SECONDS,
  ACHIEVEMENT_VISIT_ACTIVE_SECONDS,
  ACHIEVEMENT_VISIT_INTERACTION_COUNT,
};

export type AchievementDefinition = {
  key: string;
  kind: AchievementItemKind;
  title: string;
  description: string;
  categoryKey: string;
};

export type MilestoneAchievementDefinition = AchievementDefinition & {
  kind: "milestone";
  statKey: AchievementStatKey;
  target: number;
};

export type NamedAchievementDefinition = AchievementDefinition & {
  kind: "challenge" | "track";
};

const milestoneCatalog = [
  {
    statKey: "concept-visits",
    title: "Concept visits",
    description: "Concept pages you stayed with long enough to count as real study.",
    unitLabel: "concepts",
    targets: [3, 10, 20, 40],
  },
  {
    statKey: "question-answers",
    title: "Questions answered",
    description: "First submitted answers for unique quick-test questions.",
    unitLabel: "questions",
    targets: [10, 50, 150, 300],
  },
  {
    statKey: "challenge-completions",
    title: "Challenge modes completed",
    description: "Distinct challenge-mode solves across the concept catalog.",
    unitLabel: "challenges",
    targets: [1, 5, 15, 30],
  },
  {
    statKey: "track-completions",
    title: "Learning tracks completed",
    description: "Distinct starter tracks fully cleared through their authored flow.",
    unitLabel: "tracks",
    targets: [1, 3, 8, 15],
  },
  {
    statKey: "active-study-hours",
    title: "Active study time",
    description: "Visible, recently active study time counted from signed-in concept sessions.",
    unitLabel: "hours",
    targets: [1, 5, ACHIEVEMENT_REWARD_STUDY_HOURS_TARGET, 50],
  },
] as const satisfies ReadonlyArray<{
  statKey: AchievementStatKey;
  title: string;
  description: string;
  unitLabel: string;
  targets: number[];
}>;

const challengeBadgePrefix = "challenge:";
const trackBadgePrefix = "track:";
const milestoneBadgePrefix = "milestone:";

let cachedMilestones: MilestoneAchievementDefinition[] | null = null;
let cachedNamedAchievements:
  | {
      challengeBadges: NamedAchievementDefinition[];
      trackBadges: NamedAchievementDefinition[];
      byKey: Map<string, AchievementDefinition>;
    }
  | null = null;
let cachedQuestionVersionKeys: Map<string, string> | null = null;

function buildMilestoneTitle(target: number, unitLabel: string) {
  return `${target} ${unitLabel} milestone`;
}

function buildMilestoneDescription(groupTitle: string, target: number) {
  return `Reached the ${target} mark for ${groupTitle.toLowerCase()}.`;
}

export function getMilestoneAchievementDefinitions() {
  if (cachedMilestones) {
    return cachedMilestones;
  }

  cachedMilestones = milestoneCatalog.flatMap((group) =>
    group.targets.map(
      (target) =>
        ({
          key: `${milestoneBadgePrefix}${group.statKey}:${target}`,
          kind: "milestone",
          statKey: group.statKey,
          target,
          title: buildMilestoneTitle(target, group.unitLabel),
          description: buildMilestoneDescription(group.title, target),
          categoryKey: group.statKey,
        }) satisfies MilestoneAchievementDefinition,
    ),
  );

  return cachedMilestones;
}

function buildNamedAchievementCache() {
  const byKey = new Map<string, AchievementDefinition>();
  const challengeBadges = getChallengeDiscoveryIndex().entries.map((entry) => {
    const definition = {
      key: `${challengeBadgePrefix}${entry.concept.slug}:${entry.id}`,
      kind: "challenge",
      title: `Completed ${entry.title} challenge mode`,
      description: `Solved the ${entry.title} challenge on ${entry.concept.title}.`,
      categoryKey: "challenge-completions",
    } satisfies NamedAchievementDefinition;

    byKey.set(definition.key, definition);
    return definition;
  });
  const trackBadges = getStarterTracks().map((track) => {
    const definition = {
      key: `${trackBadgePrefix}${track.slug}`,
      kind: "track",
      title: `Completed ${track.title} learning track`,
      description: `Finished the full authored flow for ${track.title}.`,
      categoryKey: "track-completions",
    } satisfies NamedAchievementDefinition;

    byKey.set(definition.key, definition);
    return definition;
  });

  for (const definition of getMilestoneAchievementDefinitions()) {
    byKey.set(definition.key, definition);
  }

  return {
    challengeBadges,
    trackBadges,
    byKey,
  };
}

export function getNamedAchievementDefinitions() {
  if (!cachedNamedAchievements) {
    cachedNamedAchievements = buildNamedAchievementCache();
  }

  return cachedNamedAchievements;
}

export function getAchievementDefinition(key: string) {
  return getNamedAchievementDefinitions().byKey.get(key) ?? null;
}

function buildQuestionVersion(versionSource: unknown) {
  return createHash("sha1")
    .update(
      JSON.stringify(versionSource),
      "utf8",
    )
    .digest("hex")
    .slice(0, 12);
}

function buildQuestionVersionKeyCache() {
  const questionVersionKeys = new Map<string, string>();

  for (const concept of getAllConcepts()) {
    for (const descriptor of getConceptQuizCanonicalQuestionDescriptors(concept)) {
      questionVersionKeys.set(
        `${concept.slug}:${descriptor.canonicalQuestionId}`,
        `${concept.slug}:${descriptor.canonicalQuestionId}:${buildQuestionVersion(descriptor.versionSource)}`,
      );
    }
  }

  return questionVersionKeys;
}

export function getQuestionVersionKey(conceptSlug: string, questionId: string) {
  if (!cachedQuestionVersionKeys) {
    cachedQuestionVersionKeys = buildQuestionVersionKeyCache();
  }

  return cachedQuestionVersionKeys.get(`${conceptSlug}:${questionId}`) ?? null;
}

export function getMilestoneCatalog() {
  return milestoneCatalog;
}
