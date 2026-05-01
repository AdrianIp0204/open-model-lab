import {
  getConceptBySlug,
  getSubjectDiscoverySummaries,
  getTopicDiscoverySummaryBySlug,
  type ConceptContent,
  type SubjectDiscoverySummary,
  type TopicDiscoverySummary,
} from "@/lib/content";
import {
  testPackCatalogSchema,
  type TestPackMetadata,
  type TestPackQuestionMetadata,
} from "@/lib/content/schema";
import { getCatalogData } from "@/lib/content/content-registry";
import {
  buildConceptQuizSession,
  hasConceptQuizSupport,
  type QuizChoice,
  type QuizQuestionInstance,
} from "@/lib/quiz";

const MIN_PACK_TEST_QUESTION_COUNT = 10;
const MAX_PACK_TEST_QUESTION_COUNT = 20;
const DEFAULT_PACK_TEST_QUESTION_COUNT = 14;

type PackTestConceptQuestionPlan = {
  kind: "concept-question";
  topicSlug: string;
  conceptSlug: string;
  sourceQuestionIndex: number;
  sourceCanonicalQuestionId: string;
};

type PackTestAuthoredQuestionPlan = {
  kind: "authored-question";
  question: TestPackQuestionMetadata;
};

export type PackTestQuestionPlan =
  | PackTestConceptQuestionPlan
  | PackTestAuthoredQuestionPlan;

export type PackTestDefinition = {
  id: string;
  kind: "pack";
  packSlug: string;
  subjectSlug: string;
  subjectTitle: string;
  title: string;
  summary: string;
  order: number;
  questionCount: number;
  includedTopicSlugs: string[];
  includedTopicTitles: string[];
  includedTopicCount: number;
  includedConceptSlugs: string[];
  includedConceptCount: number;
  authoredQuestionCount: number;
  bridgeQuestionCount: number;
  plans: PackTestQuestionPlan[];
};

export type PackTestCatalogEntry = {
  kind: "pack";
  id: string;
  order: number;
  packSlug: string;
  subjectSlug: string;
  subjectTitle: string;
  title: string;
  summary: string;
  questionCount: number;
  includedTopicSlugs: string[];
  includedTopicTitles: string[];
  includedTopicCount: number;
  includedConceptSlugs: string[];
  includedConceptCount: number;
  bridgeQuestionCount: number;
  testHref: string;
  reviewHref: string;
};

export type PackTestCatalogExclusion = {
  subjectSlug: string;
  subjectTitle: string;
  reason: string;
};

export type PackTestCatalog = {
  entries: PackTestCatalogEntry[];
  excluded: PackTestCatalogExclusion[];
  nextByPackSlug: Map<string, PackTestCatalogEntry | null>;
};

export type PackTestSession = {
  attemptId: string;
  seed: string;
  definition: PackTestDefinition;
  questions: QuizQuestionInstance[];
};

export type PackTestAuditEntry = {
  packSlug: string;
  title: string;
  subjectSlug: string;
  subjectTitle: string;
  questionCount: number;
  includedTopicSlugs: string[];
  includedConceptSlugs: string[];
  topicContributionCounts: Record<string, number>;
  conceptContributionCounts: Record<string, number>;
  authoredQuestionCount: number;
  bridgeQuestionCount: number;
  bridgeQuestionIds: string[];
};

type PackDefinitionBuildOptions = {
  authoringBySubjectSlug?: Map<string, TestPackMetadata>;
};

let cachedPackTestBuild: {
  definitions: PackTestDefinition[];
  excluded: PackTestCatalogExclusion[];
} | null = null;

function readPackAuthoring() {
  const entries = testPackCatalogSchema.parse(getCatalogData("testPacks")) as TestPackMetadata[];
  return new Map(entries.map((entry) => [entry.subjectSlug, entry]));
}

function getPackTestHref(packSlug: string) {
  return `/tests/packs/${packSlug}`;
}

function getPackReviewHref(subjectSlug: string) {
  return `/concepts/subjects/${subjectSlug}`;
}

function distributeAuthoredQuestions(
  authoredQuestions: TestPackQuestionMetadata[],
  conceptPlans: PackTestConceptQuestionPlan[],
): PackTestQuestionPlan[] {
  if (!authoredQuestions.length) {
    return conceptPlans;
  }

  const combinedPlans: PackTestQuestionPlan[] = [...conceptPlans];

  authoredQuestions.forEach((question, index) => {
    const insertionIndex = Math.min(
      combinedPlans.length,
      Math.floor(((index + 1) * combinedPlans.length) / (authoredQuestions.length + 1)),
    );

    combinedPlans.splice(insertionIndex, 0, {
      kind: "authored-question",
      question,
    });
  });

  return combinedPlans;
}

function buildPackConceptQuestionPlans(input: {
  includedTopics: TopicDiscoverySummary[];
  questionCount: number;
}): {
  plans: PackTestConceptQuestionPlan[];
  perTopicCap: number;
  perConceptCap: number;
} | null {
  if (!input.includedTopics.length) {
    return null;
  }

  const allConcepts = input.includedTopics.flatMap((topic) => topic.concepts);
  const conceptSessionMap = new Map(
    allConcepts.map((concept) => [
      concept.slug,
      buildConceptQuizSession(getConceptBySlug(concept.slug) as ConceptContent, {
        locale: "en",
        seed: `pack-definition:${concept.slug}`,
      }).questions,
    ]),
  );
  const perTopicCap = Math.min(
    7,
    Math.max(1, Math.ceil(input.questionCount / input.includedTopics.length)),
  );
  const perConceptCap = Math.min(
    3,
    Math.max(1, Math.ceil(input.questionCount / allConcepts.length)),
  );
  const selectedPlans: PackTestConceptQuestionPlan[] = [];
  const selectedCanonicalIds = new Set<string>();
  const selectedCountsByTopic = new Map<string, number>();
  const selectedCountsByConcept = new Map<string, number>();
  const topicConceptCursor = new Map<string, number>();

  while (selectedPlans.length < input.questionCount) {
    let addedInPass = false;

    for (const topic of input.includedTopics) {
      const selectedForTopic = selectedCountsByTopic.get(topic.slug) ?? 0;

      if (selectedForTopic >= perTopicCap) {
        continue;
      }

      const conceptCount = topic.concepts.length;
      let selectedConceptPlan: PackTestConceptQuestionPlan | null = null;
      const cursorStart = topicConceptCursor.get(topic.slug) ?? 0;

      for (let offset = 0; offset < conceptCount; offset += 1) {
        const concept = topic.concepts[(cursorStart + offset) % conceptCount]!;
        const selectedForConcept = selectedCountsByConcept.get(concept.slug) ?? 0;

        if (selectedForConcept >= perConceptCap) {
          continue;
        }

        const sourceQuestionIndex = selectedForConcept;
        const sourceQuestion = conceptSessionMap.get(concept.slug)?.[sourceQuestionIndex];

        if (!sourceQuestion) {
          continue;
        }

        const namespacedCanonicalQuestionId = `${concept.slug}:${sourceQuestion.canonicalQuestionId}`;

        if (selectedCanonicalIds.has(namespacedCanonicalQuestionId)) {
          continue;
        }

        selectedCanonicalIds.add(namespacedCanonicalQuestionId);
        selectedCountsByTopic.set(topic.slug, selectedForTopic + 1);
        selectedCountsByConcept.set(concept.slug, selectedForConcept + 1);
        topicConceptCursor.set(topic.slug, (cursorStart + offset + 1) % conceptCount);
        selectedConceptPlan = {
          kind: "concept-question",
          topicSlug: topic.slug,
          conceptSlug: concept.slug,
          sourceQuestionIndex,
          sourceCanonicalQuestionId: sourceQuestion.canonicalQuestionId,
        };
        break;
      }

      if (!selectedConceptPlan) {
        continue;
      }

      selectedPlans.push(selectedConceptPlan);
      addedInPass = true;

      if (selectedPlans.length >= input.questionCount) {
        break;
      }
    }

    if (!addedInPass) {
      break;
    }
  }

  return {
    plans: selectedPlans,
    perTopicCap,
    perConceptCap,
  };
}

function buildPackTestDefinition(
  subject: SubjectDiscoverySummary,
  order: number,
  options: PackDefinitionBuildOptions,
): PackTestDefinition | PackTestCatalogExclusion {
  if (subject.topics.length < 2) {
    return {
      subjectSlug: subject.slug,
      subjectTitle: subject.title,
      reason: "Cross-topic packs require at least two published topics within the same subject.",
    };
  }

  const authoring = options.authoringBySubjectSlug?.get(subject.slug);

  if (!authoring) {
    return {
      subjectSlug: subject.slug,
      subjectTitle: subject.title,
      reason: "No public pack authoring entry exists for this subject yet.",
    };
  }

  const includedTopics = authoring.includedTopicSlugs.map((topicSlug) => {
    const topic = getTopicDiscoverySummaryBySlug(topicSlug);

    if (topic.subject !== subject.title) {
      throw new Error(
        `Pack "${authoring.slug}" includes topic "${topicSlug}" outside the subject "${subject.title}".`,
      );
    }

    return topic;
  });

  if (includedTopics.length < 2) {
    return {
      subjectSlug: subject.slug,
      subjectTitle: subject.title,
      reason: "A public cross-topic pack must include at least two topics from the same subject.",
    };
  }

  const includedConcepts = includedTopics.flatMap((topic) => topic.concepts);

  if (!includedConcepts.length) {
    return {
      subjectSlug: subject.slug,
      subjectTitle: subject.title,
      reason: "The pack did not resolve any published concepts from its included topics.",
    };
  }

  const unresolvedConcepts = includedConcepts.filter((concept) => {
    const resolvedConcept = getConceptBySlug(concept.slug);
    return !resolvedConcept.published || !hasConceptQuizSupport(resolvedConcept);
  });

  if (unresolvedConcepts.length) {
    return {
      subjectSlug: subject.slug,
      subjectTitle: subject.title,
      reason: "Public packs can only include published concepts that resolve to quiz support.",
    };
  }

  const bridgeQuestions = (authoring.questions ?? []).filter((question) => question.kind === "bridge");

  if (bridgeQuestions.length < 2) {
    return {
      subjectSlug: subject.slug,
      subjectTitle: subject.title,
      reason: "Each shipped pack must include at least two explicit cross-topic bridge questions.",
    };
  }

  for (const question of authoring.questions ?? []) {
    for (const topicSlug of question.relatedTopicSlugs ?? []) {
      if (!authoring.includedTopicSlugs.includes(topicSlug)) {
        return {
          subjectSlug: subject.slug,
          subjectTitle: subject.title,
          reason: `Pack-authored question "${question.id}" references topic "${topicSlug}" outside the pack.`,
        };
      }
    }

    for (const conceptSlug of question.relatedConceptSlugs ?? []) {
      if (!includedConcepts.some((concept) => concept.slug === conceptSlug)) {
        return {
          subjectSlug: subject.slug,
          subjectTitle: subject.title,
          reason: `Pack-authored question "${question.id}" references concept "${conceptSlug}" outside the pack topics.`,
        };
      }
    }
  }

  const questionCount = authoring.questionCount ?? DEFAULT_PACK_TEST_QUESTION_COUNT;

  if (questionCount < MIN_PACK_TEST_QUESTION_COUNT || questionCount > MAX_PACK_TEST_QUESTION_COUNT) {
    return {
      subjectSlug: subject.slug,
      subjectTitle: subject.title,
      reason: `Packs must ship with ${MIN_PACK_TEST_QUESTION_COUNT}-${MAX_PACK_TEST_QUESTION_COUNT} questions.`,
    };
  }

  if ((authoring.questions ?? []).length > questionCount) {
    return {
      subjectSlug: subject.slug,
      subjectTitle: subject.title,
      reason: "Pack-authored questions exceed the configured pack question count.",
    };
  }

  const conceptQuestionCount = questionCount - (authoring.questions?.length ?? 0);
  const conceptQuestionPlanResult = buildPackConceptQuestionPlans({
    includedTopics,
    questionCount: conceptQuestionCount,
  });

  if (!conceptQuestionPlanResult) {
    return {
      subjectSlug: subject.slug,
      subjectTitle: subject.title,
      reason: "The pack could not collect any concept-backed questions.",
    };
  }

  const { plans: conceptPlans, perTopicCap, perConceptCap } = conceptQuestionPlanResult;

  if (conceptPlans.length !== conceptQuestionCount) {
    return {
      subjectSlug: subject.slug,
      subjectTitle: subject.title,
      reason: `The pack could only assemble ${conceptPlans.length} concept-backed questions for a ${questionCount}-question target.`,
    };
  }

  const selectedTopicSlugs = new Set(conceptPlans.map((plan) => plan.topicSlug));

  if (selectedTopicSlugs.size < 2) {
    return {
      subjectSlug: subject.slug,
      subjectTitle: subject.title,
      reason: "A cross-topic pack must draw from multiple topics, not just one dominant topic.",
    };
  }

  const topicContributionCounts = conceptPlans.reduce<Record<string, number>>((counts, plan) => {
    counts[plan.topicSlug] = (counts[plan.topicSlug] ?? 0) + 1;
    return counts;
  }, {});
  const conceptContributionCounts = conceptPlans.reduce<Record<string, number>>((counts, plan) => {
    counts[plan.conceptSlug] = (counts[plan.conceptSlug] ?? 0) + 1;
    return counts;
  }, {});

  if (Object.values(topicContributionCounts).some((count) => count > perTopicCap)) {
    return {
      subjectSlug: subject.slug,
      subjectTitle: subject.title,
      reason: "The pack exceeded its per-topic cap and became too lopsided.",
    };
  }

  if (Object.values(conceptContributionCounts).some((count) => count > perConceptCap)) {
    return {
      subjectSlug: subject.slug,
      subjectTitle: subject.title,
      reason: "The pack exceeded its per-concept cap and became too repetitive.",
    };
  }

  const plans = distributeAuthoredQuestions(authoring.questions ?? [], conceptPlans);

  return {
    id: `pack-test:${authoring.slug}`,
    kind: "pack",
    packSlug: authoring.slug,
    subjectSlug: subject.slug,
    subjectTitle: subject.title,
    title: authoring.title,
    summary: authoring.summary,
    order,
    questionCount: plans.length,
    includedTopicSlugs: authoring.includedTopicSlugs,
    includedTopicTitles: includedTopics.map((topic) => topic.title),
    includedTopicCount: includedTopics.length,
    includedConceptSlugs: includedConcepts.map((concept) => concept.slug),
    includedConceptCount: includedConcepts.length,
    authoredQuestionCount: (authoring.questions ?? []).length,
    bridgeQuestionCount: bridgeQuestions.length,
    plans,
  };
}

export function buildPackTestDefinitionsFromSubjects(
  subjects: SubjectDiscoverySummary[],
  options: PackDefinitionBuildOptions = {},
) {
  const definitions: PackTestDefinition[] = [];
  const excluded: PackTestCatalogExclusion[] = [];

  subjects.forEach((subject, index) => {
    const built = buildPackTestDefinition(subject, index, options);

    if ("reason" in built) {
      excluded.push(built);
      return;
    }

    definitions.push(built);
  });

  return {
    definitions,
    excluded,
  };
}

function getCachedPackTestBuild() {
  if (!cachedPackTestBuild) {
    cachedPackTestBuild = buildPackTestDefinitionsFromSubjects(getSubjectDiscoverySummaries(), {
      authoringBySubjectSlug: readPackAuthoring(),
    });
  }

  return cachedPackTestBuild;
}

function buildPackTestCatalogEntries(definitions: PackTestDefinition[]) {
  return definitions.map(
    (definition) =>
      ({
        kind: "pack",
        id: definition.id,
        order: definition.order,
        packSlug: definition.packSlug,
        subjectSlug: definition.subjectSlug,
        subjectTitle: definition.subjectTitle,
        title: definition.title,
        summary: definition.summary,
        questionCount: definition.questionCount,
        includedTopicSlugs: definition.includedTopicSlugs,
        includedTopicTitles: definition.includedTopicTitles,
        includedTopicCount: definition.includedTopicCount,
        includedConceptSlugs: definition.includedConceptSlugs,
        includedConceptCount: definition.includedConceptCount,
        bridgeQuestionCount: definition.bridgeQuestionCount,
        testHref: getPackTestHref(definition.packSlug),
        reviewHref: getPackReviewHref(definition.subjectSlug),
      }) satisfies PackTestCatalogEntry,
  );
}

function buildPackTestCatalog(
  entries: PackTestCatalogEntry[],
  excluded: PackTestCatalogExclusion[],
) {
  const nextByPackSlug = new Map<string, PackTestCatalogEntry | null>();

  entries.forEach((entry, index) => {
    const sameSubjectNext =
      entries
        .slice(index + 1)
        .find((candidate) => candidate.subjectSlug === entry.subjectSlug) ?? null;
    nextByPackSlug.set(entry.packSlug, sameSubjectNext ?? entries[index + 1] ?? null);
  });

  return {
    entries,
    excluded,
    nextByPackSlug,
  } satisfies PackTestCatalog;
}

export function getPublishedPackTestCatalog() {
  const built = getCachedPackTestBuild();
  return buildPackTestCatalog(buildPackTestCatalogEntries(built.definitions), built.excluded);
}

export function getPublishedPackTestDefinitionBySlug(packSlug: string) {
  const definition = getCachedPackTestBuild().definitions.find(
    (entry) => entry.packSlug === packSlug,
  );

  if (!definition) {
    throw new Error(`Unknown published pack test slug: ${packSlug}`);
  }

  return definition;
}

export function getNextPublishedPackTestEntry(packSlug: string) {
  return getPublishedPackTestCatalog().nextByPackSlug.get(packSlug) ?? null;
}

export function auditPackTestDefinitions(
  definitions: PackTestDefinition[],
): PackTestAuditEntry[] {
  return definitions.map((definition) => {
    const topicContributionCounts = definition.plans.reduce<Record<string, number>>(
      (counts, plan) => {
        if (plan.kind === "concept-question") {
          counts[plan.topicSlug] = (counts[plan.topicSlug] ?? 0) + 1;
        }

        return counts;
      },
      Object.fromEntries(definition.includedTopicSlugs.map((slug) => [slug, 0])),
    );
    const conceptContributionCounts = definition.plans.reduce<Record<string, number>>(
      (counts, plan) => {
        if (plan.kind === "concept-question") {
          counts[plan.conceptSlug] = (counts[plan.conceptSlug] ?? 0) + 1;
        }

        return counts;
      },
      Object.fromEntries(definition.includedConceptSlugs.map((slug) => [slug, 0])),
    );
    const bridgeQuestionIds = definition.plans.flatMap((plan) =>
      plan.kind === "authored-question" && plan.question.kind === "bridge"
        ? [plan.question.id]
        : [],
    );

    return {
      packSlug: definition.packSlug,
      title: definition.title,
      subjectSlug: definition.subjectSlug,
      subjectTitle: definition.subjectTitle,
      questionCount: definition.questionCount,
      includedTopicSlugs: definition.includedTopicSlugs,
      includedConceptSlugs: definition.includedConceptSlugs,
      topicContributionCounts,
      conceptContributionCounts,
      authoredQuestionCount: definition.authoredQuestionCount,
      bridgeQuestionCount: definition.bridgeQuestionCount,
      bridgeQuestionIds,
    } satisfies PackTestAuditEntry;
  });
}

export function getPublishedPackTestAudit() {
  const built = getCachedPackTestBuild();
  return {
    entries: auditPackTestDefinitions(built.definitions),
    excluded: built.excluded,
  };
}

function buildPackAuthoredQuestionInstance(
  packSlug: string,
  question: TestPackQuestionMetadata,
  orderIndex: number,
) {
  const correctChoice = question.choices.find((choice) => choice.id === question.correctChoiceId);

  if (!correctChoice) {
    throw new Error(
      `Pack "${packSlug}" authored question "${question.id}" is missing its correct choice.`,
    );
  }

  return {
    instanceId: `pack:${packSlug}:authored:${question.id}:${orderIndex + 1}`,
    canonicalQuestionId: `pack:${packSlug}:authored:${question.id}`,
    kind: "static" as const,
    type: question.type,
    prompt: question.prompt,
    choices: question.choices as QuizChoice[],
    correctChoiceId: question.correctChoiceId,
    explanation: question.explanation,
    formattedCorrectAnswer: correctChoice.label,
  } satisfies QuizQuestionInstance;
}

export function buildPackTestSession(
  packSlug: string,
  options: {
    locale?: "en" | "zh-HK";
    seed: string;
  },
): PackTestSession {
  const definition = getPublishedPackTestDefinitionBySlug(packSlug);
  const conceptSessionCache = new Map<string, ReturnType<typeof buildConceptQuizSession>>();

  const getConceptSession = (conceptSlug: string) => {
    const cachedSession = conceptSessionCache.get(conceptSlug);

    if (cachedSession) {
      return cachedSession;
    }

    const session = buildConceptQuizSession(getConceptBySlug(conceptSlug), {
      locale: options.locale ?? "en",
      seed: `${options.seed}:pack:${packSlug}:concept:${conceptSlug}`,
    });

    conceptSessionCache.set(conceptSlug, session);
    return session;
  };

  const questions = definition.plans.map((plan, index) => {
    if (plan.kind === "authored-question") {
      return buildPackAuthoredQuestionInstance(packSlug, plan.question, index);
    }

    const sourceQuestion =
      getConceptSession(plan.conceptSlug).questions[plan.sourceQuestionIndex];

    if (!sourceQuestion) {
      throw new Error(
        `Pack "${packSlug}" could not resolve question index ${plan.sourceQuestionIndex} from concept "${plan.conceptSlug}".`,
      );
    }

    return {
      ...sourceQuestion,
      instanceId: `pack:${packSlug}:${plan.topicSlug}:${plan.conceptSlug}:${sourceQuestion.instanceId}:${index + 1}`,
      canonicalQuestionId: `pack:${packSlug}:concept:${plan.conceptSlug}:${sourceQuestion.canonicalQuestionId}`,
      showMeAction: undefined,
    } satisfies QuizQuestionInstance;
  });

  const canonicalQuestionIds = new Set(questions.map((question) => question.canonicalQuestionId));

  if (questions.length !== definition.questionCount) {
    throw new Error(
      `Pack "${packSlug}" built ${questions.length} questions instead of ${definition.questionCount}.`,
    );
  }

  if (canonicalQuestionIds.size !== questions.length) {
    throw new Error(`Pack "${packSlug}" built duplicate canonical questions.`);
  }

  return {
    attemptId: `pack-test:${packSlug}:attempt:${options.seed}`,
    seed: options.seed,
    definition,
    questions,
  };
}
