import type { SubjectDiscoverySummary } from "./subjects";

export const startLearningConfidenceOptions = [
  "brand-new",
  "know-some-basics",
] as const;
export const startLearningCommitmentOptions = [
  "quick-start",
  "deeper-path",
] as const;
export const startLearningInterestNotSure = "not-sure" as const;

export type StartLearningConfidence =
  (typeof startLearningConfidenceOptions)[number];
export type StartLearningCommitment =
  (typeof startLearningCommitmentOptions)[number];
export type StartLearningInterest =
  | typeof startLearningInterestNotSure
  | SubjectDiscoverySummary["slug"];
export type StartLearningRecommendationKind =
  | "concept"
  | "topic"
  | "track"
  | "subject-directory";

export type StartLearningSubjectChoice = {
  subject: SubjectDiscoverySummary;
  quickConcept: SubjectDiscoverySummary["featuredConcepts"][number] | null;
  starterTopic: SubjectDiscoverySummary["featuredTopics"][number] | null;
  starterTrack: SubjectDiscoverySummary["featuredStarterTracks"][number] | null;
};

export type StartLearningRecommendation = {
  id: string;
  kind: StartLearningRecommendationKind;
  entitySlug: string | null;
  title: string;
  href: string;
  actionLabel: string;
  note: string;
  subjectSlug: string | null;
  subjectTitle: string | null;
  accent: SubjectDiscoverySummary["accent"];
  highlights: string[];
};

export type StartLearningRecommendationSet = {
  primary: StartLearningRecommendation;
  alternate: StartLearningRecommendation | null;
  browse: StartLearningRecommendation;
};

function compareConceptByLightweightStart(
  left: NonNullable<StartLearningSubjectChoice["quickConcept"]>,
  right: NonNullable<StartLearningSubjectChoice["quickConcept"]>,
) {
  const leftMinutes = left.estimatedStudyMinutes ?? Number.MAX_SAFE_INTEGER;
  const rightMinutes = right.estimatedStudyMinutes ?? Number.MAX_SAFE_INTEGER;

  if (leftMinutes !== rightMinutes) {
    return leftMinutes - rightMinutes;
  }

  const leftSequence = left.sequence ?? Number.MAX_SAFE_INTEGER;
  const rightSequence = right.sequence ?? Number.MAX_SAFE_INTEGER;

  if (leftSequence !== rightSequence) {
    return leftSequence - rightSequence;
  }

  return left.title.localeCompare(right.title);
}

function compareTrackByShortestPath(
  left: NonNullable<StartLearningSubjectChoice["starterTrack"]>,
  right: NonNullable<StartLearningSubjectChoice["starterTrack"]>,
) {
  if (left.concepts.length !== right.concepts.length) {
    return left.concepts.length - right.concepts.length;
  }

  if (left.estimatedStudyMinutes !== right.estimatedStudyMinutes) {
    return left.estimatedStudyMinutes - right.estimatedStudyMinutes;
  }

  const leftSequence = left.sequence ?? Number.MAX_SAFE_INTEGER;
  const rightSequence = right.sequence ?? Number.MAX_SAFE_INTEGER;

  if (leftSequence !== rightSequence) {
    return leftSequence - rightSequence;
  }

  return left.title.localeCompare(right.title);
}

export function buildStartLearningSubjectChoices(
  subjects: SubjectDiscoverySummary[],
): StartLearningSubjectChoice[] {
  return subjects.map((subject) => ({
    subject,
    quickConcept: subject.featuredConcepts[0] ?? subject.concepts[0] ?? null,
    starterTopic: subject.featuredTopics[0] ?? subject.topics[0] ?? null,
    starterTrack:
      subject.featuredStarterTracks[0] ?? subject.starterTracks[0] ?? null,
  }));
}

function buildConceptRecommendation(
  choice: StartLearningSubjectChoice,
  note: string,
): StartLearningRecommendation | null {
  if (!choice.quickConcept) {
    return null;
  }

  return {
    id: `concept-${choice.quickConcept.slug}`,
    kind: "concept",
    entitySlug: choice.quickConcept.slug,
    title: choice.quickConcept.title,
    href: `/concepts/${choice.quickConcept.slug}`,
    actionLabel: `Start ${choice.quickConcept.shortTitle ?? choice.quickConcept.title}`,
    note,
    subjectSlug: choice.subject.slug,
    subjectTitle: choice.subject.title,
    accent: choice.quickConcept.accent,
    highlights: choice.quickConcept.highlights.slice(0, 3),
  };
}

function buildTopicRecommendation(
  choice: StartLearningSubjectChoice,
  note: string,
): StartLearningRecommendation | null {
  if (!choice.starterTopic) {
    return null;
  }

  return {
    id: `topic-${choice.starterTopic.slug}`,
    kind: "topic",
    entitySlug: choice.starterTopic.slug,
    title: choice.starterTopic.title,
    href: `/concepts/topics/${choice.starterTopic.slug}`,
    actionLabel: `Open ${choice.starterTopic.title}`,
    note,
    subjectSlug: choice.subject.slug,
    subjectTitle: choice.subject.title,
    accent: choice.starterTopic.accent,
    highlights: choice.starterTopic.featuredConcepts
      .slice(0, 2)
      .map((concept) => concept.shortTitle ?? concept.title),
  };
}

function buildTrackRecommendation(
  choice: StartLearningSubjectChoice,
  note: string,
): StartLearningRecommendation | null {
  if (!choice.starterTrack) {
    return null;
  }

  return {
    id: `track-${choice.starterTrack.slug}`,
    kind: "track",
    entitySlug: choice.starterTrack.slug,
    title: choice.starterTrack.title,
    href: `/tracks/${choice.starterTrack.slug}`,
    actionLabel: `Start ${choice.starterTrack.title}`,
    note,
    subjectSlug: choice.subject.slug,
    subjectTitle: choice.subject.title,
    accent: choice.starterTrack.accent,
    highlights: choice.starterTrack.highlights.slice(0, 3),
  };
}

function buildSubjectDirectoryRecommendation(
  choice: StartLearningSubjectChoice | null,
): StartLearningRecommendation {
  if (!choice) {
    return {
      id: "subjects-directory",
      kind: "subject-directory",
      entitySlug: null,
      title: "Browse all subjects",
      href: "/concepts/subjects",
      actionLabel: "Browse all subjects",
      note: "Use the subject directory when you want the full subject map before committing to one branch.",
      subjectSlug: null,
      subjectTitle: null,
      accent: "ink",
      highlights: ["Subject maps", "Starter tracks", "Best-first concepts"],
    };
  }

  return {
    id: `subject-${choice.subject.slug}`,
    kind: "subject-directory",
    entitySlug: choice.subject.slug,
    title: `${choice.subject.title} subject page`,
    href: choice.subject.path,
    actionLabel: `Open ${choice.subject.title}`,
    note: `Use the ${choice.subject.title} subject page when you want starter tracks, topics, and best-first concepts framed together before choosing one.`,
    subjectSlug: choice.subject.slug,
    subjectTitle: choice.subject.title,
    accent: choice.subject.accent,
    highlights: choice.subject.featuredTopics
      .slice(0, 3)
      .map((topic) => topic.title),
  };
}

function getSpecificSubjectRecommendations(
  choice: StartLearningSubjectChoice,
  confidence: StartLearningConfidence,
  commitment: StartLearningCommitment,
): StartLearningRecommendationSet {
  const brandNewQuickConcept = buildConceptRecommendation(
    choice,
    `Start with one strong ${choice.subject.title.toLowerCase()} concept when you want the first move to stay visual and low-risk.`,
  );
  const knowSomeQuickTopic = buildTopicRecommendation(
    choice,
    `Open the ${choice.subject.title.toLowerCase()} topic map first when you already know some basics and want a clearer sense of place before choosing one concept.`,
  );
  const brandNewTrack = buildTrackRecommendation(
    choice,
    `Use the shortest authored ${choice.subject.title.toLowerCase()} starter path when you want the first few moves chosen for you.`,
  );
  const knowSomeTrack = buildTrackRecommendation(
    choice,
    choice.starterTrack?.entryDiagnostic
      ? `This track stays bounded, and its entry diagnostic can help you skip ahead cleanly if the opening bridge is already stable.`
      : `This track keeps the next few moves explicit without forcing you through a longer subject scan first.`,
  );

  const primary =
    commitment === "quick-start"
      ? confidence === "brand-new"
        ? brandNewQuickConcept ?? brandNewTrack ?? knowSomeQuickTopic
        : knowSomeQuickTopic ?? brandNewQuickConcept ?? knowSomeTrack
      : confidence === "brand-new"
        ? brandNewTrack ?? brandNewQuickConcept ?? knowSomeQuickTopic
        : knowSomeTrack ?? knowSomeQuickTopic ?? brandNewQuickConcept;

  if (!primary) {
    const browse = buildSubjectDirectoryRecommendation(choice);
    return {
      primary: browse,
      alternate: null,
      browse,
    };
  }

  const alternateCandidates = [
    commitment === "quick-start" ? brandNewTrack : null,
    confidence === "know-some-basics" ? knowSomeQuickTopic : brandNewQuickConcept,
    confidence === "know-some-basics" ? brandNewQuickConcept : knowSomeQuickTopic,
    commitment === "deeper-path" ? brandNewQuickConcept : knowSomeTrack,
  ].filter(
    (candidate): candidate is StartLearningRecommendation =>
      Boolean(candidate && candidate.id !== primary.id),
  );

  return {
    primary,
    alternate: alternateCandidates[0] ?? null,
    browse: buildSubjectDirectoryRecommendation(choice),
  };
}

function getNotSureRecommendations(
  choices: StartLearningSubjectChoice[],
  confidence: StartLearningConfidence,
  commitment: StartLearningCommitment,
): StartLearningRecommendationSet {
  const expandedSubjectSlugs = new Set(
    choices.slice(1).map((choice) => choice.subject.slug),
  );
  const conceptChoices = choices
    .filter((choice) => choice.quickConcept)
    .sort((left, right) =>
      compareConceptByLightweightStart(left.quickConcept!, right.quickConcept!),
    );
  const trackChoices = choices
    .filter((choice) => choice.starterTrack)
    .sort((left, right) =>
      compareTrackByShortestPath(left.starterTrack!, right.starterTrack!),
    );
  const quickChoice =
    conceptChoices.find((choice) => expandedSubjectSlugs.has(choice.subject.slug)) ??
    conceptChoices[0] ??
    null;
  const shortTrackChoice =
    trackChoices.find(
      (choice) =>
        expandedSubjectSlugs.has(choice.subject.slug) &&
        choice.subject.slug !== quickChoice?.subject.slug,
    ) ??
    trackChoices.find((choice) => choice.subject.slug !== quickChoice?.subject.slug) ??
    trackChoices[0] ??
    null;
  const quickRecommendation = quickChoice
    ? buildConceptRecommendation(
        quickChoice,
        confidence === "brand-new"
          ? `This is the lightest current cross-subject first step when you want to see one live idea before choosing a bigger branch.`
          : `Use one short concept as a compact reset, then branch wider once the shared product language feels familiar again.`,
      )
    : null;
  const deeperRecommendation = shortTrackChoice
    ? buildTrackRecommendation(
        shortTrackChoice,
        confidence === "brand-new"
          ? `This is the shortest current starter path across the subject pages, so it is a safe first route when you want more guidance than a single concept.`
          : `This is the shortest current starter path across the subject pages, so it is the cleanest structured re-entry if you already know some basics.`,
      )
    : null;
  const primary =
    commitment === "quick-start"
      ? quickRecommendation ?? deeperRecommendation
      : deeperRecommendation ?? quickRecommendation;
  const alternate =
    commitment === "quick-start"
      ? deeperRecommendation
      : quickRecommendation;
  const browse = buildSubjectDirectoryRecommendation(null);

  if (!primary) {
    return {
      primary: browse,
      alternate: null,
      browse,
    };
  }

  return {
    primary,
    alternate:
      alternate && alternate.id !== primary.id ? alternate : null,
    browse,
  };
}

export function getStartLearningRecommendationSet(
  choices: StartLearningSubjectChoice[],
  options: {
    interest: StartLearningInterest;
    confidence: StartLearningConfidence;
    commitment: StartLearningCommitment;
  },
): StartLearningRecommendationSet {
  if (options.interest === startLearningInterestNotSure) {
    return getNotSureRecommendations(
      choices,
      options.confidence,
      options.commitment,
    );
  }

  const matchingChoice =
    choices.find((choice) => choice.subject.slug === options.interest) ?? null;

  if (!matchingChoice) {
    return getNotSureRecommendations(
      choices,
      options.confidence,
      options.commitment,
    );
  }

  return getSpecificSubjectRecommendations(
    matchingChoice,
    options.confidence,
    options.commitment,
  );
}
