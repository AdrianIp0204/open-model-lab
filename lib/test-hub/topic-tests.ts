import {
  getConceptBySlug,
  getTopicDiscoverySummaries,
  type ConceptContent,
  type TopicDiscoverySummary,
} from "@/lib/content";
import {
  topicTestCatalogSchema,
  type TopicTestMetadata,
  type TopicTestQuestionMetadata,
} from "@/lib/content/schema";
import { getCatalogData } from "@/lib/content/content-registry";
import {
  buildConceptQuizSession,
  hasConceptQuizSupport,
  type QuizChoice,
  type QuizQuestionInstance,
} from "@/lib/quiz";

const MIN_TOPIC_TEST_QUESTION_COUNT = 10;
const MAX_TOPIC_TEST_QUESTION_COUNT = 20;
const DEFAULT_TOPIC_TEST_QUESTION_MULTIPLIER = 3;

type TopicTestConceptQuestionPlan = {
  kind: "concept-question";
  conceptSlug: string;
  sourceQuestionIndex: number;
  sourceCanonicalQuestionId: string;
};

type TopicTestAuthoredQuestionPlan = {
  kind: "authored-question";
  question: TopicTestQuestionMetadata;
};

export type TopicTestQuestionPlan =
  | TopicTestConceptQuestionPlan
  | TopicTestAuthoredQuestionPlan;

export type TopicTestDefinition = {
  id: string;
  kind: "topic";
  topicSlug: string;
  title: string;
  summary: string;
  subject: string;
  order: number;
  questionCount: number;
  includedConceptSlugs: string[];
  includedConceptCount: number;
  authoredQuestionCount: number;
  bridgeQuestionCount: number;
  plans: TopicTestQuestionPlan[];
};

export type TopicTestCatalogEntry = {
  kind: "topic";
  id: string;
  order: number;
  topicSlug: string;
  title: string;
  summary: string;
  subject: string;
  questionCount: number;
  includedConceptSlugs: string[];
  includedConceptCount: number;
  authoredQuestionCount: number;
  bridgeQuestionCount: number;
  testHref: string;
  reviewHref: string;
};

export type TopicTestCatalogExclusion = {
  topicSlug: string;
  title: string;
  reason: string;
};

export type TopicTestCatalog = {
  entries: TopicTestCatalogEntry[];
  excluded: TopicTestCatalogExclusion[];
  nextByTopicSlug: Map<string, TopicTestCatalogEntry | null>;
};

export type TopicTestSession = {
  attemptId: string;
  seed: string;
  definition: TopicTestDefinition;
  questions: QuizQuestionInstance[];
};

export type TopicTestAuditEntry = {
  topicSlug: string;
  title: string;
  subject: string;
  questionCount: number;
  includedConceptSlugs: string[];
  includedConceptCount: number;
  conceptContributionCounts: Record<string, number>;
  authoredQuestionCount: number;
  bridgeQuestionCount: number;
  bridgeQuestionIds: string[];
};

type TopicTestTopicLike = Pick<
  TopicDiscoverySummary,
  "slug" | "title" | "description" | "subject" | "concepts"
>;

type TopicConceptResolver = (conceptSlug: string) => Pick<
  ConceptContent,
  | "id"
  | "slug"
  | "title"
  | "published"
  | "quickTest"
  | "sections"
  | "simulation"
  | "graphs"
  | "variableLinks"
> | null;

type TopicDefinitionBuildOptions = {
  resolveConceptBySlug?: TopicConceptResolver;
  authoringByTopicSlug?: Map<string, TopicTestMetadata>;
};

let cachedTopicTestBuild: {
  definitions: TopicTestDefinition[];
  excluded: TopicTestCatalogExclusion[];
} | null = null;

function readTopicTestAuthoring() {
  const entries = topicTestCatalogSchema.parse(getCatalogData("topicTests")) as TopicTestMetadata[];
  return new Map(entries.map((entry) => [entry.topicSlug, entry]));
}

function getTopicTestHref(topicSlug: string) {
  return `/tests/topics/${topicSlug}`;
}

function getTopicReviewHref(topicSlug: string) {
  return `/concepts/topics/${topicSlug}`;
}

function getDefaultTopicQuestionCount(conceptCount: number) {
  return Math.max(
    MIN_TOPIC_TEST_QUESTION_COUNT,
    Math.min(MAX_TOPIC_TEST_QUESTION_COUNT, conceptCount * DEFAULT_TOPIC_TEST_QUESTION_MULTIPLIER),
  );
}

function distributeAuthoredQuestions(
  authoredQuestions: TopicTestQuestionMetadata[],
  conceptPlans: TopicTestConceptQuestionPlan[],
): TopicTestQuestionPlan[] {
  if (!authoredQuestions.length) {
    return conceptPlans;
  }

  const combinedPlans: TopicTestQuestionPlan[] = [...conceptPlans];

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

function buildConceptQuestionPlans(input: {
  conceptSessions: Array<{
    conceptSlug: string;
    questions: QuizQuestionInstance[];
  }>;
  questionCount: number;
}): {
  perConceptCap: number;
  plans: TopicTestConceptQuestionPlan[];
} | null {
  if (!input.conceptSessions.length) {
    return null;
  }

  const perConceptCap = Math.min(
    5,
    Math.max(1, Math.ceil(input.questionCount / input.conceptSessions.length)),
  );
  const selectedPlans: TopicTestConceptQuestionPlan[] = [];
  const selectedCanonicalIds = new Set<string>();
  const selectedCountsByConcept = new Map<string, number>();
  let sourceQuestionIndex = 0;

  while (selectedPlans.length < input.questionCount) {
    let addedInPass = false;

    for (const session of input.conceptSessions) {
      const selectedForConcept = selectedCountsByConcept.get(session.conceptSlug) ?? 0;

      if (selectedForConcept >= perConceptCap) {
        continue;
      }

      const sourceQuestion = session.questions[sourceQuestionIndex];

      if (!sourceQuestion) {
        continue;
      }

      const namespacedCanonicalQuestionId = `${session.conceptSlug}:${sourceQuestion.canonicalQuestionId}`;

      if (selectedCanonicalIds.has(namespacedCanonicalQuestionId)) {
        continue;
      }

      selectedCanonicalIds.add(namespacedCanonicalQuestionId);
      selectedCountsByConcept.set(session.conceptSlug, selectedForConcept + 1);
      selectedPlans.push({
        kind: "concept-question",
        conceptSlug: session.conceptSlug,
        sourceQuestionIndex,
        sourceCanonicalQuestionId: sourceQuestion.canonicalQuestionId,
      });
      addedInPass = true;

      if (selectedPlans.length >= input.questionCount) {
        break;
      }
    }

    if (!addedInPass) {
      break;
    }

    sourceQuestionIndex += 1;
  }

  return {
    perConceptCap,
    plans: selectedPlans,
  };
}

function buildTopicTestDefinition(
  topic: TopicTestTopicLike,
  order: number,
  options: TopicDefinitionBuildOptions,
): TopicTestDefinition | TopicTestCatalogExclusion {
  const resolveConceptBySlug = options.resolveConceptBySlug ?? ((conceptSlug) => getConceptBySlug(conceptSlug));
  const authoring = options.authoringByTopicSlug?.get(topic.slug);
  const includedConceptSlugs = topic.concepts.map((concept) => concept.slug);

  if (includedConceptSlugs.length < 2) {
    return {
      topicSlug: topic.slug,
      title: topic.title,
      reason: "Topic tests require at least two published concepts with quiz support.",
    };
  }

  const resolvedConcepts = includedConceptSlugs.map((conceptSlug) => resolveConceptBySlug(conceptSlug));

  if (resolvedConcepts.some((concept) => !concept)) {
    return {
      topicSlug: topic.slug,
      title: topic.title,
      reason: "Topic test assembly could not resolve every published concept in the topic.",
    };
  }

  const quizReadyConcepts = resolvedConcepts.filter(
    (concept): concept is NonNullable<(typeof resolvedConcepts)[number]> =>
      Boolean(concept?.published && hasConceptQuizSupport(concept)),
  );

  if (quizReadyConcepts.length !== resolvedConcepts.length) {
    return {
      topicSlug: topic.slug,
      title: topic.title,
      reason: "Topic tests only ship when every included concept is published and resolves to quiz support.",
    };
  }

  const authoredQuestions = authoring?.questions ?? [];
  const bridgeQuestions = authoredQuestions.filter((question) => question.kind === "bridge");

  for (const authoredQuestion of authoredQuestions) {
    for (const conceptSlug of authoredQuestion.relatedConceptSlugs ?? []) {
      if (!includedConceptSlugs.includes(conceptSlug)) {
        return {
          topicSlug: topic.slug,
          title: topic.title,
          reason: `Authored topic question "${authoredQuestion.id}" references concept "${conceptSlug}" outside the topic.`,
        };
      }
    }
  }

  if (bridgeQuestions.length === 0) {
    return {
      topicSlug: topic.slug,
      title: topic.title,
      reason: "Topic tests must include at least one explicit bridge question that connects multiple concepts in the topic.",
    };
  }

  const questionCount = authoring?.questionCount ?? getDefaultTopicQuestionCount(quizReadyConcepts.length);

  if (authoredQuestions.length > questionCount) {
    return {
      topicSlug: topic.slug,
      title: topic.title,
      reason: `Authored topic questions exceed the target question count (${questionCount}).`,
    };
  }

  const validationConceptSessions = quizReadyConcepts.map((concept) => ({
    conceptSlug: concept.slug,
    questions: buildConceptQuizSession(concept as ConceptContent, {
      locale: "en",
      seed: `topic-test:${topic.slug}:definition:${concept.slug}`,
    }).questions,
  }));

  const conceptQuestionCount = questionCount - authoredQuestions.length;
  const conceptQuestionPlanResult = buildConceptQuestionPlans({
    conceptSessions: validationConceptSessions,
    questionCount: conceptQuestionCount,
  });

  if (!conceptQuestionPlanResult) {
    return {
      topicSlug: topic.slug,
      title: topic.title,
      reason: "Topic test assembly could not collect any concept-backed questions.",
    };
  }

  const { perConceptCap, plans: conceptPlans } = conceptQuestionPlanResult;

  if (conceptPlans.length !== conceptQuestionCount) {
    return {
      topicSlug: topic.slug,
      title: topic.title,
      reason: `Topic test assembly could only select ${conceptPlans.length} concept-backed questions for a ${questionCount}-question target.`,
    };
  }

  const selectedConceptSlugs = new Set(conceptPlans.map((plan) => plan.conceptSlug));

  if (selectedConceptSlugs.size < 2) {
    return {
      topicSlug: topic.slug,
      title: topic.title,
      reason: "Topic tests must draw from multiple concepts instead of one dominant concept.",
    };
  }

  const selectionCounts = conceptPlans.reduce<Record<string, number>>((counts, plan) => {
    counts[plan.conceptSlug] = (counts[plan.conceptSlug] ?? 0) + 1;
    return counts;
  }, {});

  if (Object.values(selectionCounts).some((count) => count > perConceptCap)) {
    return {
      topicSlug: topic.slug,
      title: topic.title,
      reason: "Topic test assembly exceeded the per-concept cap and became too lopsided.",
    };
  }

  const plans = distributeAuthoredQuestions(authoredQuestions, conceptPlans);

  if (plans.length < MIN_TOPIC_TEST_QUESTION_COUNT || plans.length > MAX_TOPIC_TEST_QUESTION_COUNT) {
    return {
      topicSlug: topic.slug,
      title: topic.title,
      reason: `Topic tests must ship with ${MIN_TOPIC_TEST_QUESTION_COUNT}-${MAX_TOPIC_TEST_QUESTION_COUNT} questions.`,
    };
  }

  return {
    id: `topic-test:${topic.slug}`,
    kind: "topic",
    topicSlug: topic.slug,
    title: topic.title,
    summary: topic.description,
    subject: topic.subject,
    order,
    questionCount: plans.length,
    includedConceptSlugs,
    includedConceptCount: includedConceptSlugs.length,
    authoredQuestionCount: authoredQuestions.length,
    bridgeQuestionCount: bridgeQuestions.length,
    plans,
  };
}

export function buildTopicTestDefinitionsFromTopics(
  topics: TopicTestTopicLike[],
  options: TopicDefinitionBuildOptions = {},
) {
  const definitions: TopicTestDefinition[] = [];
  const excluded: TopicTestCatalogExclusion[] = [];

  topics.forEach((topic, index) => {
    const built = buildTopicTestDefinition(topic, index, options);

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

function getCachedTopicTestBuild() {
  if (!cachedTopicTestBuild) {
    cachedTopicTestBuild = buildTopicTestDefinitionsFromTopics(getTopicDiscoverySummaries(), {
      authoringByTopicSlug: readTopicTestAuthoring(),
    });
  }

  return cachedTopicTestBuild;
}

function buildTopicTestCatalogEntries(definitions: TopicTestDefinition[]) {
  return definitions.map(
    (definition) =>
      ({
        kind: "topic",
        id: definition.id,
        order: definition.order,
        topicSlug: definition.topicSlug,
        title: definition.title,
        summary: definition.summary,
        subject: definition.subject,
        questionCount: definition.questionCount,
        includedConceptSlugs: definition.includedConceptSlugs,
        includedConceptCount: definition.includedConceptCount,
        authoredQuestionCount: definition.authoredQuestionCount,
        bridgeQuestionCount: definition.bridgeQuestionCount,
        testHref: getTopicTestHref(definition.topicSlug),
        reviewHref: getTopicReviewHref(definition.topicSlug),
      }) satisfies TopicTestCatalogEntry,
  );
}

function buildTopicTestCatalog(entries: TopicTestCatalogEntry[], excluded: TopicTestCatalogExclusion[]) {
  const nextByTopicSlug = new Map<string, TopicTestCatalogEntry | null>();

  entries.forEach((entry, index) => {
    const sameSubjectNext =
      entries.slice(index + 1).find((candidate) => candidate.subject === entry.subject) ?? null;
    nextByTopicSlug.set(entry.topicSlug, sameSubjectNext ?? entries[index + 1] ?? null);
  });

  return {
    entries,
    excluded,
    nextByTopicSlug,
  } satisfies TopicTestCatalog;
}

export function getPublishedTopicTestCatalog() {
  const built = getCachedTopicTestBuild();
  return buildTopicTestCatalog(buildTopicTestCatalogEntries(built.definitions), built.excluded);
}

export function getPublishedTopicTestDefinitionBySlug(topicSlug: string) {
  const definition = getCachedTopicTestBuild().definitions.find(
    (entry) => entry.topicSlug === topicSlug,
  );

  if (!definition) {
    throw new Error(`Unknown published topic test slug: ${topicSlug}`);
  }

  return definition;
}

export function getNextPublishedTopicTestEntry(topicSlug: string) {
  return getPublishedTopicTestCatalog().nextByTopicSlug.get(topicSlug) ?? null;
}

export function auditTopicTestDefinitions(
  definitions: TopicTestDefinition[],
): TopicTestAuditEntry[] {
  return definitions.map((definition) => {
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
      topicSlug: definition.topicSlug,
      title: definition.title,
      subject: definition.subject,
      questionCount: definition.questionCount,
      includedConceptSlugs: definition.includedConceptSlugs,
      includedConceptCount: definition.includedConceptCount,
      conceptContributionCounts,
      authoredQuestionCount: definition.authoredQuestionCount,
      bridgeQuestionCount: definition.bridgeQuestionCount,
      bridgeQuestionIds,
    } satisfies TopicTestAuditEntry;
  });
}

export function getPublishedTopicTestAudit() {
  const built = getCachedTopicTestBuild();
  return {
    entries: auditTopicTestDefinitions(built.definitions),
    excluded: built.excluded,
  };
}

function buildTopicAuthoredQuestionInstance(
  topicSlug: string,
  question: TopicTestQuestionMetadata,
  orderIndex: number,
) {
  const correctChoice = question.choices.find((choice) => choice.id === question.correctChoiceId);

  if (!correctChoice) {
    throw new Error(
      `Topic test "${topicSlug}" authored question "${question.id}" is missing its correct choice.`,
    );
  }

  return {
    instanceId: `topic:${topicSlug}:authored:${question.id}:${orderIndex + 1}`,
    canonicalQuestionId: `topic:${topicSlug}:authored:${question.id}`,
    kind: "static" as const,
    type: question.type,
    prompt: question.prompt,
    choices: question.choices as QuizChoice[],
    correctChoiceId: question.correctChoiceId,
    explanation: question.explanation,
    formattedCorrectAnswer: correctChoice.label,
  } satisfies QuizQuestionInstance;
}

export function buildTopicTestSession(
  topicSlug: string,
  options: {
    locale?: "en" | "zh-HK";
    seed: string;
  },
): TopicTestSession {
  const definition = getPublishedTopicTestDefinitionBySlug(topicSlug);
  const conceptSessionCache = new Map<string, ReturnType<typeof buildConceptQuizSession>>();

  const getConceptSession = (conceptSlug: string) => {
    const cachedSession = conceptSessionCache.get(conceptSlug);

    if (cachedSession) {
      return cachedSession;
    }

    const concept = getConceptBySlug(conceptSlug);
    const session = buildConceptQuizSession(concept, {
      locale: options.locale ?? "en",
      seed: `${options.seed}:topic:${topicSlug}:concept:${conceptSlug}`,
    });

    conceptSessionCache.set(conceptSlug, session);
    return session;
  };

  const questions = definition.plans.map((plan, index) => {
    if (plan.kind === "authored-question") {
      return buildTopicAuthoredQuestionInstance(topicSlug, plan.question, index);
    }

    const sourceQuestion =
      getConceptSession(plan.conceptSlug).questions[plan.sourceQuestionIndex];

    if (!sourceQuestion) {
      throw new Error(
        `Topic test "${topicSlug}" could not resolve question index ${plan.sourceQuestionIndex} from concept "${plan.conceptSlug}".`,
      );
    }

    return {
      ...sourceQuestion,
      instanceId: `topic:${topicSlug}:${plan.conceptSlug}:${sourceQuestion.instanceId}:${index + 1}`,
      canonicalQuestionId: `topic:${topicSlug}:concept:${plan.conceptSlug}:${sourceQuestion.canonicalQuestionId}`,
      showMeAction: undefined,
    } satisfies QuizQuestionInstance;
  });

  const canonicalQuestionIds = new Set(questions.map((question) => question.canonicalQuestionId));

  if (questions.length !== definition.questionCount) {
    throw new Error(
      `Topic test "${topicSlug}" built ${questions.length} questions instead of ${definition.questionCount}.`,
    );
  }

  if (canonicalQuestionIds.size !== questions.length) {
    throw new Error(`Topic test "${topicSlug}" built duplicate canonical questions.`);
  }

  return {
    attemptId: `topic-test:${topicSlug}:attempt:${options.seed}`,
    seed: options.seed,
    definition,
    questions,
  };
}
