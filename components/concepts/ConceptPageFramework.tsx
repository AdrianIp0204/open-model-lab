import { Children } from "react";
import { useLocale, useTranslations } from "next-intl";
import type {
  ConceptContent,
  ReadNextRecommendation,
  StarterTrackConceptMembership,
} from "@/lib/content";
import { Link } from "@/i18n/navigation";
import type { WorkedExampleAccessMode } from "@/lib/account/entitlements";
import { resolveConceptPageSections } from "@/lib/content/concept-page-framework";
import {
  getSubjectDisplayTitleFromValue,
  getTopicDisplayTitleFromValue,
} from "@/lib/i18n/content";
import type { AppLocale } from "@/i18n/routing";
import { buildInitialConceptPageRuntimeSnapshot } from "@/lib/learning/conceptPageRuntime";
import type { ConceptSimulationSource } from "@/lib/physics";
import type { ProgressSnapshot } from "@/lib/progress";
import { hasConceptQuizSupport } from "@/lib/quiz";
import {
  buildConceptShareTargets,
  conceptShareAnchorIds,
  type ResolvedConceptSimulationState,
  type ResolvedPublicExperimentCard,
} from "@/lib/share-links";
import { DisplayAd, MultiplexAd } from "@/components/ads/AdSlot";
import { DisclosurePanel } from "@/components/layout/DisclosurePanel";
import { ConceptProgressCard } from "@/components/progress/ConceptProgressCard";
import { ConceptShareLinksPanel } from "@/components/share/ConceptShareLinksPanel";
import { PublicExperimentCard } from "@/components/share/PublicExperimentCard";
import { DeferredConceptSimulationRenderer } from "@/components/simulations/DeferredConceptSimulationRenderer";
import { ConceptAchievementTrackerProvider } from "./ConceptAchievementTracker";
import { ConceptLearningBridgeProvider } from "./ConceptLearningBridge";
import { ConceptPageStatusSurface } from "./ConceptPageStatusSurface";
import { ConceptPageV2Shell } from "./ConceptPageV2Shell";
import { StarterTrackCues } from "./StarterTrackCues";

type ConceptPageFrameworkProps = {
  concept: ConceptContent;
  simulationSource: ConceptSimulationSource;
  readNext: ReadNextRecommendation[];
  workedExampleMode?: WorkedExampleAccessMode;
  starterTrackMemberships?: StarterTrackConceptMembership[];
  initialSyncedSnapshot?: ProgressSnapshot | null;
  initialChallengeItemId?: string | null;
  initialSimulationState?: ResolvedConceptSimulationState | null;
  publicExperimentCard?: ResolvedPublicExperimentCard | null;
  setupLinkState?: "none" | "restored" | "invalid";
  restoredStateParam?: string | null;
  restoredExperimentParam?: string | null;
  runtimeResetKey?: string;
  subjectPage?: {
    title: string;
    path: string;
  } | null;
  topicPage?: {
    title: string;
    path: string;
  } | null;
};

function getOnboardingSurfaces(
  concept: ConceptContent,
  t: ReturnType<typeof useTranslations<"ConceptPage">>,
) {
  const surfaces: string[] = [];

  if (concept.noticePrompts.items.length) {
    surfaces.push(t("onboarding.whatToNotice"));
  }

  surfaces.push(t("onboarding.compareMode"));

  if (concept.predictionMode.items.length) {
    surfaces.push(t("onboarding.predictionMode"));
  }

  if (concept.sections.workedExamples.items.length) {
    surfaces.push(t("onboarding.workedExamples"));
  }

  if (hasConceptQuizSupport(concept)) {
    surfaces.push(t("onboarding.quickTest"));
  }

  if ((concept.challengeMode?.items.length ?? 0) > 0) {
    surfaces.push(t("onboarding.challengeMode"));
  }

  return surfaces;
}

export function ConceptPageFramework({
  concept,
  simulationSource,
  readNext,
  workedExampleMode = "live",
  starterTrackMemberships = [],
  initialSyncedSnapshot = null,
  initialChallengeItemId = null,
  initialSimulationState = null,
  publicExperimentCard = null,
  setupLinkState = "none",
  restoredStateParam = null,
  restoredExperimentParam = null,
  runtimeResetKey,
  subjectPage = null,
  topicPage = null,
}: ConceptPageFrameworkProps) {
  const t = useTranslations("ConceptPage");
  const locale = useLocale() as AppLocale;
  const resolvedSections = resolveConceptPageSections(concept, { readNext, locale });
  const initialRuntimeSnapshot = buildInitialConceptPageRuntimeSnapshot(
    concept,
    initialSimulationState,
  );
  const onboardingSurfaces = getOnboardingSurfaces(concept, t);
  const conceptSubjectLabel = getSubjectDisplayTitleFromValue(concept.subject, locale);
  const conceptTopicLabel = getTopicDisplayTitleFromValue(concept.topic, locale);
  const shareTargets = buildConceptShareTargets({
    slug: concept.slug,
    hasChallengeMode: Boolean(concept.challengeMode?.items.length),
    sections: resolvedSections,
    locale,
  });
  const shareDisclosureTitle = t("v2.shareToolsTitle");
  const shareDisclosureSummary = t("v2.shareToolsDescription");
  const progressDisclosureTitle = t("v2.progressSupportTitle");
  const progressDisclosureSummary = t("v2.progressSupportDescription");
  const liveLabChildren = Children.toArray([
    publicExperimentCard ? (
      <PublicExperimentCard
        key="public-experiment-card"
        conceptTitle={concept.title}
        card={publicExperimentCard}
      />
    ) : null,
    <div key="simulation-renderer-block">
      <DeferredConceptSimulationRenderer
        concept={simulationSource}
        readNext={readNext}
        initialSyncedSnapshot={initialSyncedSnapshot}
        initialChallengeItemId={initialChallengeItemId}
        initialSimulationState={initialSimulationState}
        starterGuidePlacement="external"
      />
    </div>,
  ]);
  const supportRailContent = Children.toArray([
    <ConceptShareLinksPanel
      key="share"
      conceptId={concept.id}
      conceptTitle={concept.title}
      conceptSlug={concept.slug}
      simulationSource={simulationSource}
      featuredSetups={concept.pageFramework?.featuredSetups ?? []}
      publicExperimentCard={publicExperimentCard}
      setupLinkState={setupLinkState}
      restoredStateParam={restoredStateParam}
      restoredExperimentParam={restoredExperimentParam}
      items={shareTargets}
      title={t("share.title")}
      description={t("share.description")}
      variant="compact"
    />,
  ]);
  const postPhaseSupportContent = Children.toArray([
    <ConceptProgressCard
      key="progress"
      concept={{
        id: concept.id,
        slug: concept.slug,
        title: concept.title,
      }}
      initialSyncedSnapshot={initialSyncedSnapshot}
      challengeIds={concept.challengeMode?.items.map((item) => item.id) ?? []}
      onboardingSurfaces={onboardingSurfaces}
      variant="compact"
    />,
    starterTrackMemberships.length ? (
      <StarterTrackCues
        key="starter-track-cues"
        memberships={starterTrackMemberships}
        initialSyncedSnapshot={initialSyncedSnapshot}
        variant="compact"
      />
    ) : null,
  ]);
  const afterPhasedSectionContent = Children.toArray([
    <section
      key="bench-utilities"
      data-testid="concept-bench-utilities"
      className="grid gap-3 xl:grid-cols-[minmax(0,1.08fr)]"
    >
      <DisclosurePanel
        title={shareDisclosureTitle}
        summary={shareDisclosureSummary}
      >
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.08fr)]">
          {supportRailContent}
        </div>
      </DisclosurePanel>
    </section>,
    <section
      key="post-phase-support"
      data-testid="concept-post-phase-support"
      className={[
        "grid gap-3",
        starterTrackMemberships.length
          ? "xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.96fr)]"
          : "xl:grid-cols-[minmax(0,1.08fr)]",
      ].join(" ")}
    >
      <DisclosurePanel
        title={progressDisclosureTitle}
        summary={progressDisclosureSummary}
        triggerTestId="concept-progress-disclosure-trigger"
      >
        <div
          className={[
            "grid gap-3",
            starterTrackMemberships.length
              ? "xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.96fr)]"
              : "xl:grid-cols-[minmax(0,1.08fr)]",
          ].join(" ")}
        >
          {postPhaseSupportContent}
        </div>
      </DisclosurePanel>
    </section>,
    <DisplayAd key="post-lab-display" placement="concept.postLabDisplay" />,
    <MultiplexAd key="footer-multiplex" placement="concept.footerMultiplex" />,
  ]);

  return (
    <div className="mx-auto w-full max-w-[88rem] px-4 pb-10 pt-4 sm:px-6 lg:px-8 lg:pt-8">
      <section className="space-y-4">
        <div className="hidden flex-nowrap items-center gap-2 overflow-x-auto pb-1 text-sm text-ink-600 sm:flex [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <Link href="/" className="section-kicker whitespace-nowrap transition-colors hover:text-ink-950">
            {t("breadcrumbs.home")}
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            href="/concepts"
            className="section-kicker whitespace-nowrap transition-colors hover:text-ink-950"
          >
            {t("breadcrumbs.conceptLibrary")}
          </Link>
          {subjectPage ? (
            <>
              <span aria-hidden="true">/</span>
              <Link
                href={subjectPage.path}
                className="section-kicker whitespace-nowrap transition-colors hover:text-ink-950"
              >
                {subjectPage.title}
              </Link>
            </>
          ) : null}
          {topicPage ? (
            <>
              <span aria-hidden="true">/</span>
              <Link
                href={topicPage.path}
                className="section-kicker whitespace-nowrap transition-colors hover:text-ink-950"
              >
                {topicPage.title}
              </Link>
            </>
          ) : null}
        </div>
      </section>

      <ConceptAchievementTrackerProvider conceptSlug={concept.slug}>
        <ConceptLearningBridgeProvider
          key={runtimeResetKey ?? concept.slug}
          initialRuntimeSnapshot={initialRuntimeSnapshot}
        >
          <ConceptPageV2Shell
            concept={concept}
            readNext={readNext}
            sections={resolvedSections}
            workedExampleMode={workedExampleMode}
            titleContextContent={
              <div className="space-y-2">
                <div className="hidden flex-wrap gap-2 sm:flex">
                  <span className="progress-pill">{conceptSubjectLabel}</span>
                  <span className="progress-pill">{conceptTopicLabel}</span>
                </div>

                <div className="space-y-2">
                  <p className="hidden sm:block lab-label">{t("labels.conceptModule")}</p>
                  <h1 className="max-w-4xl text-[1.75rem] font-semibold leading-[1.02] text-ink-950 sm:text-[2.3rem] lg:text-[2.45rem]">
                    {concept.title}
                  </h1>
                </div>
              </div>
            }
            statusContent={
              <div className="grid gap-2.5">
                <ConceptPageStatusSurface
                  concept={concept}
                  sections={resolvedSections}
                  readNext={readNext}
                  starterTrackMemberships={starterTrackMemberships}
                  initialSyncedSnapshot={initialSyncedSnapshot}
                  variant="compact"
                />
              </div>
            }
            liveLabContent={
              <div
                data-testid="concept-live-lab"
                data-onboarding-target="concept-live-lab"
                data-protected-learning-zone="concept-live-lab"
              >
                <div
                  id={conceptShareAnchorIds.interactiveLab}
                  className="scroll-mt-24 space-y-3"
                >
                  {liveLabChildren}
                </div>
              </div>
            }
            afterPhasedSections={afterPhasedSectionContent}
          />
        </ConceptLearningBridgeProvider>
      </ConceptAchievementTrackerProvider>
    </div>
  );
}
