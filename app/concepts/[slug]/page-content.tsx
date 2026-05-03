import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { getOptionalStoredProgressForCookieHeader } from "@/lib/account/server-store";
import { resolveWorkedExampleAccessMode } from "@/lib/account/entitlements";
import { getAccountSessionForCookieHeader } from "@/lib/account/supabase";
import {
  getConceptBySlug,
  getReadNextRecommendations,
  getStarterTrackMembershipsForConcept,
  getSubjectDiscoverySummaryForConceptSlug,
  getTopicDiscoverySummaryForConceptSlug,
  type ConceptContent,
} from "@/lib/content";
import {
  buildBreadcrumbJsonLd,
  buildConceptCanonicalUrl,
  buildConceptJsonLd,
  buildConceptMetadata,
  getLocaleAbsoluteUrl,
  serializeJsonLd,
} from "@/lib/metadata";
import {
  getSubjectDisplayTitle,
  getTopicDisplayTitle,
  localizeReadNextRecommendations,
} from "@/lib/i18n/content";
import { localizeConceptContent } from "@/lib/i18n/concept-content";
import type { ConceptSimulationSource } from "@/lib/physics";
import {
  resolveConceptSimulationState,
  resolvePublicExperimentCard,
  resolveInitialChallengeItemId,
} from "@/lib/share-links";
import { hasConceptQuizSupport } from "@/lib/quiz";
import { PageShell } from "@/components/layout/PageShell";
import { ConceptPageFramework } from "@/components/concepts/ConceptPageFramework";

export type ConceptPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type ConceptPageRenderOptions = ConceptPageProps & {
  locale: AppLocale;
};

function joinParagraphs(paragraphs: string[]) {
  return paragraphs.join(" ");
}

function buildSimulationSource(concept: ConceptContent): ConceptSimulationSource {
  const simulationDescription = joinParagraphs(
    concept.accessibility.simulationDescription.paragraphs,
  );
  const graphSummary = joinParagraphs(concept.accessibility.graphSummary.paragraphs);

  return {
    id: concept.id,
    title: concept.title,
    summary: concept.summary,
    slug: concept.slug,
    topic: concept.topic,
    equations: concept.equations,
    variableLinks: concept.variableLinks,
    seo: concept.seo,
    accessibility: {
      simulationDescription,
      graphSummary,
    },
    noticePrompts: {
      title: concept.noticePrompts.title,
      intro: concept.noticePrompts.intro,
      items: concept.noticePrompts.items,
    },
    predictionMode: {
      title: concept.predictionMode.title,
      intro: concept.predictionMode.intro,
      items: concept.predictionMode.items.map((item) => ({
        id: item.id,
        prompt: item.prompt,
        changeLabel: item.changeLabel,
        choices: item.choices,
        correctChoiceId: item.correctChoiceId,
        explanation: item.explanation,
        observationHint: item.observationHint,
        scenario: {
          id: item.id,
          label: item.scenarioLabel,
          presetId: item.apply.presetId ?? item.applyPresetId,
          patch: item.apply.patch ?? item.applyPatch,
          highlightedControlIds: item.highlightedControls,
          highlightedGraphIds: item.highlightedGraphs,
          highlightedOverlayIds: item.highlightedOverlays,
        },
      })),
    },
    challengeMode: concept.challengeMode,
    featureAvailability: {
      prediction: concept.predictionMode.items.length > 0,
      compare: true,
      challenge: (concept.challengeMode?.items.length ?? 0) > 0,
      guidedOverlays: (concept.simulation.overlays ?? []).length > 0,
      noticePrompts: concept.noticePrompts.items.length > 0,
      workedExamples: concept.sections.workedExamples.items.length > 0,
      quickTest: hasConceptQuizSupport(concept),
    },
    simulation: {
      ...concept.simulation,
      graphs: concept.graphs,
      accessibility: {
        simulationDescription,
        graphSummary,
      },
    },
  };
}

async function getPageConcept(params: Promise<{ slug: string }>) {
  const { slug } = await params;

  try {
    return {
      requestedSlug: slug,
      concept: getConceptBySlug(slug),
    };
  } catch {
    notFound();
  }
}

function buildQueryString(searchParams: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        query.append(key, item);
      }
      continue;
    }

    if (value !== undefined) {
      query.append(key, value);
    }
  }

  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export async function generateConceptMetadata({
  params,
  locale,
}: {
  params: Promise<{ slug: string }>;
  locale: AppLocale;
}): Promise<Metadata> {
  const { concept } = await getPageConcept(params);
  return buildConceptMetadata(localizeConceptContent(concept, locale), locale);
}

export async function renderConceptPage({
  params,
  searchParams,
  locale,
}: ConceptPageRenderOptions) {
  const tCommon = await getTranslations("Common");
  const tConceptPage = await getTranslations("ConceptPage");
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const [{ storedProgress: syncedProgress }, session] = await Promise.all([
    getOptionalStoredProgressForCookieHeader({
      cookieHeader,
      routePath: "/concepts/[slug]",
    }),
    getAccountSessionForCookieHeader(cookieHeader).catch((error) => {
      console.warn("[concept-route] optional account session unavailable during render", {
        routePath: "/concepts/[slug]",
        message: error instanceof Error ? error.message : null,
        name: error instanceof Error ? error.name : null,
        fallback: "anonymous_worked_examples",
      });

      return null;
    }),
  ]);
  const { requestedSlug, concept } = await getPageConcept(params);
  const localizedConcept = localizeConceptContent(concept, locale);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const workedExampleMode = resolveWorkedExampleAccessMode(session?.entitlement);

  if (requestedSlug !== concept.slug) {
    redirect(`/concepts/${concept.slug}${buildQueryString(resolvedSearchParams)}`);
  }

  const simulationSource = buildSimulationSource(localizedConcept);
  const subjectPage = getSubjectDiscoverySummaryForConceptSlug(concept.slug);
  const topicPage = getTopicDiscoverySummaryForConceptSlug(concept.slug);
  const subjectPath = subjectPage.path;
  const topicPath = `/concepts/topics/${topicPage.slug}`;
  const subjectDisplayTitle = getSubjectDisplayTitle(subjectPage, locale);
  const topicDisplayTitle = getTopicDisplayTitle(topicPage, locale);
  const jsonLd = serializeJsonLd([
    buildConceptJsonLd(localizedConcept, locale),
    buildBreadcrumbJsonLd([
      { name: tCommon("home"), url: getLocaleAbsoluteUrl("/", locale) },
      {
        name: tConceptPage("breadcrumbs.conceptLibrary"),
        url: getLocaleAbsoluteUrl("/concepts", locale),
      },
      { name: subjectDisplayTitle, url: getLocaleAbsoluteUrl(subjectPath, locale) },
      { name: topicDisplayTitle, url: getLocaleAbsoluteUrl(topicPath, locale) },
      { name: localizedConcept.title, url: buildConceptCanonicalUrl(concept.slug, locale) },
    ]),
  ]);
  const readNext = localizeReadNextRecommendations(
    localizedConcept,
    getReadNextRecommendations(concept.slug),
    locale,
  );
  const starterTrackMemberships = getStarterTrackMembershipsForConcept(concept.slug);
  const initialChallengeItemId = resolveInitialChallengeItemId(
    resolvedSearchParams.challenge,
    concept.challengeMode?.items.map((item) => item.id) ?? [],
  );
  const requestedChallengeParam = Array.isArray(resolvedSearchParams.challenge)
    ? resolvedSearchParams.challenge[0]
    : resolvedSearchParams.challenge;
  const requestedStateParam = Array.isArray(resolvedSearchParams.state)
    ? resolvedSearchParams.state[0]
    : resolvedSearchParams.state;
  const requestedExperimentParam = Array.isArray(resolvedSearchParams.experiment)
    ? resolvedSearchParams.experiment[0]
    : resolvedSearchParams.experiment;
  const initialSimulationState = resolveConceptSimulationState(
    requestedStateParam,
    simulationSource,
  );
  const publicExperimentCard = resolvePublicExperimentCard(
    resolvedSearchParams.experiment,
    concept.slug,
  );
  const setupLinkState = requestedStateParam
    ? initialSimulationState
      ? "restored"
      : "invalid"
    : "none";

  return (
    <PageShell
      layoutMode="section-shell"
      className="space-y-4"
      feedbackContext={{
        pageType: "concept",
        pagePath: `/concepts/${concept.slug}`,
        pageTitle: localizedConcept.title,
        conceptId: concept.id,
        conceptSlug: concept.slug,
        conceptTitle: localizedConcept.title,
        topicSlug: topicPage.slug,
        topicTitle: topicDisplayTitle,
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />

      <ConceptPageFramework
        concept={localizedConcept}
        simulationSource={simulationSource}
        readNext={readNext}
        workedExampleMode={workedExampleMode}
        starterTrackMemberships={starterTrackMemberships}
        initialSyncedSnapshot={syncedProgress?.snapshot ?? null}
        initialChallengeItemId={initialChallengeItemId}
        initialSimulationState={initialSimulationState}
        publicExperimentCard={publicExperimentCard}
        setupLinkState={setupLinkState}
        restoredStateParam={initialSimulationState ? requestedStateParam ?? null : null}
        restoredExperimentParam={publicExperimentCard ? requestedExperimentParam ?? null : null}
        locale={locale}
        runtimeResetKey={[
          concept.slug,
          requestedChallengeParam ?? "",
          requestedStateParam ?? "",
          requestedExperimentParam ?? "",
        ].join("|")}
        subjectPage={{
          title: subjectDisplayTitle,
          path: subjectPath,
        }}
        topicPage={{
          title: topicDisplayTitle,
          path: topicPath,
        }}
      />
    </PageShell>
  );
}
