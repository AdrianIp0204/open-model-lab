import { NextIntlClientProvider } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getLocaleMessages, getScopedTranslator, resolveServerLocaleFallback } from "@/i18n/server";
import {
  getConceptCatalogMetrics,
  getChallengeDiscoveryMetrics,
  getGuidedCollections,
  getPublishedConceptMetadata,
  getConceptSummaries,
  getSubjectDiscoverySummaries,
  getStarterTrackDiscoveryHighlights,
  getStarterTracks,
  getTopicDiscoverySummaries,
} from "@/lib/content";
import {
  buildCollectionPageJsonLd,
  buildItemListJsonLd,
  buildOrganizationJsonLd,
  buildPageMetadata,
  buildWebApplicationJsonLd,
  buildWebsiteJsonLd,
  getLocaleAbsoluteUrl,
  serializeJsonLd,
} from "@/lib/metadata";
import {
  getConceptDisplayShortTitle,
  getConceptDisplaySummary,
  getConceptDisplayTitle,
  getGuidedCollectionDisplaySummary,
  getGuidedCollectionDisplayTitle,
  getStarterTrackDisplaySummary,
  getStarterTrackDisplayTitle,
  getSubjectDisplayDescription,
  getSubjectDisplayTitle,
  getTopicDisplayDescription,
  getTopicDisplayTitle,
} from "@/lib/i18n/content";
import { PageShell } from "@/components/layout/PageShell";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { DisclosurePanel } from "@/components/layout/DisclosurePanel";
import {
  decorateConceptSummaries,
  getFeaturedConcepts,
  getQuickStartConcept,
} from "@/components/concepts/concept-catalog";
import { HomeContinueLearningSurface } from "@/components/progress/HomeContinueLearningSurface";
import { ConceptTile } from "@/components/concepts/ConceptTile";
import { StarterTrackEntryLink } from "@/components/concepts/StarterTrackEntryLink";
import { StarterTrackCard } from "@/components/concepts/StarterTrackCard";
import { SubjectDiscoveryCard } from "@/components/concepts/SubjectDiscoveryCard";
import { TopicDiscoveryCard } from "@/components/concepts/TopicDiscoveryCard";
import { GuidedCollectionCard } from "@/components/guided/GuidedCollectionCard";
import { DisplayAd, MultiplexAd } from "@/components/ads/AdSlot";
import { HomeHeroLivePreview } from "@/components/home/HomeHeroLivePreview";
import { PageSection } from "@/components/layout/PageSection";
import { MotionSection, MotionStaggerGroup } from "@/components/motion";
import {
  LearningVisual,
  type LearningVisualKind,
  type LearningVisualTone,
} from "@/components/visuals/LearningVisual";

export async function buildHomeMetadata(locale: AppLocale) {
  const t = await getScopedTranslator(locale, "HomePage");
  const homeTopicKeywords = getTopicDiscoverySummaries().map((topic) =>
    getTopicDisplayTitle(topic, locale),
  );

  return buildPageMetadata({
    title: t("metadata.title"),
    absoluteTitle: t("metadata.absoluteTitle"),
    description: t("metadata.description"),
    pathname: "/",
    locale,
    keywords: [
      t("metadata.keywords.interactiveLearning"),
      t("metadata.keywords.scienceLessons"),
      t("metadata.keywords.mathLessons"),
      t("metadata.keywords.chemistryLessons"),
      t("metadata.keywords.computerScienceLessons"),
      t("metadata.keywords.conceptLibrary"),
      ...homeTopicKeywords,
    ],
    category: "education",
  });
}

function selectSubjectBalancedItems<T>(
  items: T[],
  limit: number,
  getSubject: (item: T) => string | null | undefined,
) {
  const picked: T[] = [];
  const seenSubjects = new Set<string>();

  for (const item of items) {
    if (picked.length >= limit) {
      break;
    }

    const subject = getSubject(item);

    if (!subject || seenSubjects.has(subject)) {
      continue;
    }

    seenSubjects.add(subject);
    picked.push(item);
  }

  if (picked.length >= limit) {
    return picked;
  }

  for (const item of items) {
    if (picked.length >= limit || picked.includes(item)) {
      continue;
    }

    picked.push(item);
  }

  return picked;
}

function getTrackPrimarySubject(
  track: Awaited<ReturnType<typeof getStarterTracks>>[number],
) {
  return track.concepts[0]?.subject ?? null;
}

type HomeRouteChoiceCardProps = {
  locale: AppLocale;
  eyebrow: string;
  title: string;
  description: string;
  meta?: string;
  visualKind: LearningVisualKind;
  tone: LearningVisualTone;
  actions: Array<{
    href: string;
    label: string;
  }>;
};

function HomeRouteChoiceCard({
  locale,
  eyebrow,
  title,
  description,
  meta,
  visualKind,
  tone,
  actions,
}: HomeRouteChoiceCardProps) {
  return (
    <article className="motion-enter motion-card rounded-[26px] border border-line bg-paper-strong/96 p-5 shadow-surface">
      <div className="space-y-4">
        <LearningVisual kind={visualKind} tone={tone} compact />
        <div className="space-y-2">
          <p className="lab-label">{eyebrow}</p>
          <h3 className="text-xl font-semibold text-ink-950">{title}</h3>
          <p className="line-clamp-2 text-sm leading-6 text-ink-700">{description}</p>
        </div>

        {meta ? (
          <p className="inline-flex rounded-full border border-line bg-paper px-3 py-1 text-xs font-medium text-ink-700">
            {meta}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              locale={locale}
              className="motion-button-outline inline-flex items-center rounded-full border border-line bg-paper px-4 py-2 text-sm font-medium text-ink-950 hover:border-ink-950/25"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </article>
  );
}

type HomeEntryCardProps = {
  locale: AppLocale;
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  testId: string;
  visualKind: LearningVisualKind;
  tone: LearningVisualTone;
};

function HomeEntryCard({
  locale,
  href,
  eyebrow,
  title,
  description,
  testId,
  visualKind,
  tone,
}: HomeEntryCardProps) {
  return (
    <Link
      href={href}
      locale={locale}
      data-testid={testId}
      className="motion-button-outline group grid min-h-[8.5rem] grid-cols-[5.25rem_minmax(0,1fr)] gap-3 rounded-[20px] border border-line bg-paper-strong/92 px-3 py-3 text-left transition hover:border-ink-950/24 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper sm:min-h-[9rem] sm:grid-cols-1"
    >
      <LearningVisual kind={visualKind} tone={tone} compact className="h-full min-h-20 sm:h-24" />
      <span className="min-w-0 self-center sm:self-auto">
        <span className="lab-label block text-[0.68rem] tracking-[0.14em]">{eyebrow}</span>
        <span className="mt-1.5 block text-sm font-semibold leading-5 text-ink-950">{title}</span>
        <span className="mt-1 line-clamp-2 block text-xs leading-5 text-ink-600">{description}</span>
      </span>
    </Link>
  );
}

export async function generateMetadata() {
  return buildHomeMetadata(await resolveServerLocaleFallback());
}

export default async function HomePage({
  localeOverride,
}: {
  localeOverride?: AppLocale;
} = {}) {
  const locale = localeOverride ?? (await resolveServerLocaleFallback());
  const messages = await getLocaleMessages(locale);
  const tHome = await getScopedTranslator(locale, "HomePage");
  const tCommon = await getScopedTranslator(locale, "Common");
  const conceptCatalog = decorateConceptSummaries(getConceptSummaries(), {
    conceptMetadata: getPublishedConceptMetadata(),
  });
  const catalogMetrics = getConceptCatalogMetrics();
  const starterTracks = getStarterTracks();
  const discoveryStarterTracks = getStarterTrackDiscoveryHighlights(starterTracks.length);
  const featuredStarterTracks = selectSubjectBalancedItems(
    discoveryStarterTracks,
    3,
    getTrackPrimarySubject,
  );
  const guidedCollections = getGuidedCollections();
  const challengeMetrics = getChallengeDiscoveryMetrics();
  const quickStartConcept = getQuickStartConcept(conceptCatalog);
  const featuredConcepts = selectSubjectBalancedItems(
    getFeaturedConcepts(conceptCatalog, conceptCatalog.length),
    3,
    (concept) => concept.subject,
  );
  const subjectSummaries = getSubjectDiscoverySummaries();
  const featuredSubjects = subjectSummaries;
  const topicSummaries = getTopicDiscoverySummaries();
  const featuredTopics = selectSubjectBalancedItems(topicSummaries, 3, (topic) => topic.subject);
  const primaryTrack = starterTracks.find((track) => track.heroTrack) ?? starterTracks[0] ?? null;
  const labPrinciples = [
    {
      title: tHome("labPrinciples.seeSystem.title"),
      description: tHome("labPrinciples.seeSystem.description"),
    },
    {
      title: tHome("labPrinciples.changeOneThing.title"),
      description: tHome("labPrinciples.changeOneThing.description"),
    },
    {
      title: tHome("labPrinciples.readTheGraph.title"),
      description: tHome("labPrinciples.readTheGraph.description"),
    },
  ];
  const quickStartConceptTitle = quickStartConcept
    ? getConceptDisplayTitle(quickStartConcept, locale)
    : null;
  const quickStartConceptShortTitle = quickStartConcept
    ? getConceptDisplayShortTitle(quickStartConcept, locale)
    : null;
  const primaryTrackTitle = primaryTrack
    ? getStarterTrackDisplayTitle(primaryTrack, locale)
    : null;
  const routeChoices = [
    {
      eyebrow: tHome("guidedStarts.eyebrow"),
      title: tHome("guidedStarts.title"),
      description: tHome("guidedStarts.summary"),
      meta: tHome("routeChoices.guidedStats", {
        trackCount: starterTracks.length,
        collectionCount: guidedCollections.length,
      }),
      visualKind: "guided" as const,
      tone: "sky" as const,
      actions: [
        {
          href: "/concepts",
          label: tHome("guidedStarts.browseAllTracks"),
        },
        {
          href: "/guided",
          label: tHome("guidedStarts.browseAllCollections"),
        },
      ],
    },
    {
      eyebrow: tHome("routes.eyebrow"),
      title: tHome("routes.title"),
      description: tHome("routes.summary"),
      meta: tHome("routeChoices.mapStats", {
        subjectCount: subjectSummaries.length,
        topicCount: topicSummaries.length,
      }),
      visualKind: "topic" as const,
      tone: "amber" as const,
      actions: [
        {
          href: "/concepts/subjects",
          label: tHome("routes.openSubjectDirectory"),
        },
        {
          href: "/concepts/topics",
          label: tHome("routes.openTopicDirectory"),
        },
      ],
    },
    {
      eyebrow: tHome("challenges.eyebrow"),
      title: tHome("challenges.title"),
      description: tHome("challenges.summary", {
        count: challengeMetrics.totalChallenges,
      }),
      meta: tHome("routeChoices.challengeStats", {
        count: challengeMetrics.totalChallenges,
      }),
      visualKind: "challenge" as const,
      tone: "coral" as const,
      actions: [
        {
          href: "/challenges",
          label: tHome("challenges.action"),
        },
      ],
    },
  ];
  const heroEntryCards = [
    {
      href: "/concepts",
      eyebrow: tHome("hero.entryCards.simulations.eyebrow"),
      title: tHome("hero.entryCards.simulations.title"),
      description: tHome("hero.entryCards.simulations.description"),
      testId: "home-entry-card-simulations",
      visualKind: "simulation" as const,
      tone: "teal" as const,
    },
    {
      href: "/guided",
      eyebrow: tHome("hero.entryCards.guided.eyebrow"),
      title: tHome("hero.entryCards.guided.title"),
      description: tHome("hero.entryCards.guided.description"),
      testId: "home-entry-card-guided",
      visualKind: "guided" as const,
      tone: "sky" as const,
    },
    {
      href: "/tests",
      eyebrow: tHome("hero.entryCards.tests.eyebrow"),
      title: tHome("hero.entryCards.tests.title"),
      description: tHome("hero.entryCards.tests.description"),
      testId: "home-entry-card-tests",
      visualKind: "test" as const,
      tone: "coral" as const,
    },
    {
      href: "/tools",
      eyebrow: tHome("hero.entryCards.tools.eyebrow"),
      title: tHome("hero.entryCards.tools.title"),
      description: tHome("hero.entryCards.tools.description"),
      testId: "home-entry-card-tools",
      visualKind: "tool" as const,
      tone: "amber" as const,
    },
  ];
  const websiteJsonLd = serializeJsonLd([
    buildWebsiteJsonLd({
      locale,
      description: tHome("metadata.description"),
      url: getLocaleAbsoluteUrl("/", locale),
    }),
    buildOrganizationJsonLd(),
    buildWebApplicationJsonLd({
      locale,
      description: tHome("metadata.description"),
      url: getLocaleAbsoluteUrl("/", locale),
    }),
    buildCollectionPageJsonLd({
      name: tHome("structuredData.homeCollection"),
      description: tHome("metadata.description"),
      url: getLocaleAbsoluteUrl("/", locale),
      locale,
    }),
    buildItemListJsonLd({
      name: tHome("structuredData.featuredConcepts"),
      url: getLocaleAbsoluteUrl("/", locale),
      items: featuredConcepts.map((concept) => ({
        name: getConceptDisplayTitle(concept, locale),
        url: getLocaleAbsoluteUrl(`/concepts/${concept.slug}`, locale),
        description: getConceptDisplaySummary(concept, locale),
      })),
    }),
    buildItemListJsonLd({
      name: tHome("structuredData.topicDiscovery"),
      url: getLocaleAbsoluteUrl("/concepts/topics", locale),
      items: topicSummaries.map((topic) => ({
        name: getTopicDisplayTitle(topic, locale),
        url: getLocaleAbsoluteUrl(`/concepts/topics/${topic.slug}`, locale),
        description: getTopicDisplayDescription(topic, locale),
      })),
    }),
    buildItemListJsonLd({
      name: tHome("structuredData.subjectEntryPages"),
      url: getLocaleAbsoluteUrl("/concepts/subjects", locale),
      items: subjectSummaries.map((subject) => ({
        name: getSubjectDisplayTitle(subject, locale),
        url: getLocaleAbsoluteUrl(subject.path, locale),
        description: getSubjectDisplayDescription(subject, locale),
      })),
    }),
    buildItemListJsonLd({
      name: tHome("structuredData.starterTracks"),
      url: getLocaleAbsoluteUrl("/", locale),
      items: starterTracks.map((track) => ({
        name: getStarterTrackDisplayTitle(track, locale),
        url: getLocaleAbsoluteUrl(`/tracks/${track.slug}`, locale),
        description: getStarterTrackDisplaySummary(track, locale),
      })),
    }),
    buildItemListJsonLd({
      name: tHome("structuredData.guidedCollections"),
      url: getLocaleAbsoluteUrl("/guided", locale),
      items: guidedCollections.map((collection) => ({
        name: getGuidedCollectionDisplayTitle(collection, locale),
        url: getLocaleAbsoluteUrl(collection.path, locale),
        description: getGuidedCollectionDisplaySummary(collection, locale),
      })),
    }),
  ]);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <PageShell
        feedbackContext={{
          pageType: "home",
          pagePath: "/",
          pageTitle: tCommon("home"),
        }}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: websiteJsonLd }}
        />

      <PageSection id="home-overview" as="section" className="space-y-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)] xl:items-start">
          <div className="space-y-4">
            <div className="space-y-3">
              <p className="lab-label">{tHome("hero.eyebrow")}</p>
              <h1 className="max-w-3xl text-[2.55rem] font-semibold leading-[1.02] text-ink-950 sm:text-[4rem] sm:leading-[0.98]">
                {tHome("hero.title")}
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-ink-700">
                {tHome("hero.description")}
              </p>
            </div>

            <nav
              aria-label={tHome("hero.actionsAriaLabel")}
              data-onboarding-target="home-start-actions"
              className="flex flex-wrap gap-3"
            >
              <Link href="/start" locale={locale} className="cta-primary">
                {tCommon("startHere")}
              </Link>
              <Link href="/concepts" locale={locale} className="cta-secondary">
                {tHome("hero.browseAction")}
              </Link>
              <Link href="/tests" locale={locale} className="cta-secondary">
                {tHome("hero.practiceAction")}
              </Link>
              <Link href="/tools" locale={locale} className="cta-secondary">
                {tHome("hero.toolsAction")}
              </Link>
            </nav>

          </div>

          <div
            className="motion-enter motion-card page-hero-surface p-4 xl:row-span-2"
            data-testid="home-hero-preview"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(30,166,162,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(241,102,89,0.12),transparent_28%)]" />
            <div className="relative space-y-3">
              <p className="lab-label">{tHome("liveBench.eyebrow")}</p>

              <div className="rounded-[26px] border border-line bg-paper-strong p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                <HomeHeroLivePreview />
              </div>

              <p className="text-base leading-7 text-ink-700">
                {tHome("liveBench.description")}
              </p>
            </div>
          </div>

          <nav
            aria-label={tHome("hero.entryCardsAriaLabel")}
            className="grid gap-2.5 sm:grid-cols-2 xl:col-start-1 xl:row-start-2"
          >
            {heroEntryCards.map((entry) => (
              <HomeEntryCard
                key={entry.href}
                locale={locale}
                href={entry.href}
                eyebrow={entry.eyebrow}
                title={entry.title}
                description={entry.description}
                testId={entry.testId}
                visualKind={entry.visualKind}
                tone={entry.tone}
              />
            ))}
          </nav>
        </div>
      </PageSection>

      <PageSection id="home-resume" as="section" className="mt-12 space-y-4">
        <div className="space-y-1">
          <p className="lab-label">{tHome("resume.eyebrow")}</p>
          <h2 className="text-[2rem] font-semibold text-ink-950 sm:text-[2.5rem]">
            {tHome("resume.title")}
          </h2>
        </div>
        <HomeContinueLearningSurface
          concepts={conceptCatalog}
          starterTracks={starterTracks}
          guidedCollections={guidedCollections}
          topicSummaries={topicSummaries}
          quickStartConcept={quickStartConcept}
          initialSyncedContinueLearningState={null}
          initialSyncedSnapshot={null}
        />
      </PageSection>

      <DisplayAd placement="home.heroBelow" />

      <PageSection id="home-discovery-bench" as="div" className="mt-12">
        <MotionSection as="section" className="space-y-5" delay={60}>
          <SectionHeading
            density="dense"
            eyebrow={tHome("discovery.eyebrow")}
            title={tHome("discovery.title")}
            description={tHome("discovery.description", {
              count: catalogMetrics.totalConcepts,
            })}
            action={
              <Link
                href="/concepts"
                locale={locale}
                className="motion-button-outline inline-flex items-center rounded-full border border-line bg-paper-strong px-5 py-3 text-sm font-medium text-ink-950 hover:border-ink-950/25"
              >
                {tCommon("openConceptLibrary")}
              </Link>
            }
          />

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(20rem,0.82fr)] xl:items-start">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {featuredConcepts.map((concept, index) => (
                  <div
                    key={concept.slug}
                    className={
                      featuredConcepts.length % 2 === 1 && index === featuredConcepts.length - 1
                        ? "md:col-span-2"
                        : undefined
                    }
                  >
                    <ConceptTile concept={concept} layout="list" />
                  </div>
                ))}
              </div>

              <div className="motion-enter motion-card page-band grid gap-4 p-4 md:grid-cols-3 sm:p-5">
                {labPrinciples.map((item, index) => (
                  <article key={item.title}>
                    <p className="lab-label">0{index + 1}</p>
                    <h3 className="mt-2 text-lg font-semibold text-ink-950">{item.title}</h3>
                    <p className="mt-2 text-base leading-7 text-ink-700">
                      {item.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <div className="grid gap-4 xl:self-start">
              {quickStartConcept ? (
                <div className="motion-enter motion-card rounded-[28px] border border-line bg-ink-950 p-5 text-paper-strong shadow-surface">
                  <p className="lab-label text-white/70">{tHome("quickStart.eyebrow")}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    {quickStartConceptTitle}
                  </h2>
                  <p className="mt-2 text-base leading-7 text-white/80">
                    {tHome("quickStart.description")}
                  </p>
                  <Link
                    href={`/concepts/${quickStartConcept.slug}`}
                    locale={locale}
                    className="cta-secondary mt-4"
                    style={{ color: "var(--ink-950)" }}
                  >
                    {tHome("quickStart.action", {
                      title: quickStartConceptShortTitle ?? quickStartConceptTitle ?? "",
                    })}
                  </Link>
                </div>
              ) : null}

              {primaryTrack ? (
                <div className="motion-enter motion-card page-band p-4 sm:p-5">
                  <p className="lab-label">{tHome("primaryTrack.eyebrow")}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-ink-950">
                    {primaryTrackTitle}
                  </h2>
                  <p className="mt-2 text-base leading-7 text-ink-700">
                    {tHome("primaryTrack.description", {
                      count: primaryTrack.concepts.length,
                    })}
                  </p>
                  <StarterTrackEntryLink
                    track={primaryTrack}
                    initialSyncedSnapshot={null}
                    labelVariant="named"
                    className="motion-button-outline mt-4 inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-semibold text-ink-950 hover:border-ink-950/25"
                  />
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <div className="motion-enter page-band space-y-4 p-4 sm:p-5">
              <div className="space-y-1">
                <p className="lab-label">{tHome("routeChoices.eyebrow")}</p>
                <h3 className="text-2xl font-semibold text-ink-950">
                  {tHome("routeChoices.title")}
                </h3>
                <p className="max-w-3xl text-sm leading-6 text-ink-700">
                  {tHome("routeChoices.description")}
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {routeChoices.map((choice) => (
                  <HomeRouteChoiceCard
                    key={choice.title}
                    eyebrow={choice.eyebrow}
                    title={choice.title}
                    description={choice.description}
                    meta={choice.meta}
                    visualKind={choice.visualKind}
                    tone={choice.tone}
                    locale={locale}
                    actions={choice.actions}
                  />
                ))}
              </div>
            </div>

            <SectionHeading
              density="dense"
              level={3}
              eyebrow={tHome("routePreviews.eyebrow")}
              title={tHome("routePreviews.title")}
              description={tHome("routePreviews.description")}
            />

            <DisclosurePanel
              eyebrow={tHome("guidedStarts.eyebrow")}
              title={tHome("guidedStarts.previewTitle")}
              summary={tHome("guidedStarts.previewSummary")}
            >
              <div className="grid gap-6 xl:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="lab-label">{tHome("guidedStarts.tracksLabel")}</p>
                    <Link
                      href="/concepts"
                      locale={locale}
                      className="text-sm font-medium text-ink-700 underline decoration-ink-300 underline-offset-4 transition-colors hover:text-ink-950"
                    >
                      {tHome("guidedStarts.browseAllTracks")}
                    </Link>
                  </div>
                  <MotionStaggerGroup className="grid gap-3" baseDelay={110}>
                    {featuredStarterTracks.map((track) => (
                      <StarterTrackCard
                        key={track.slug}
                        track={track}
                        variant="compact"
                        initialSyncedSnapshot={null}
                      />
                    ))}
                  </MotionStaggerGroup>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="lab-label">{tHome("guidedStarts.collectionsLabel")}</p>
                    <Link
                      href="/guided"
                      locale={locale}
                      className="text-sm font-medium text-ink-700 underline decoration-ink-300 underline-offset-4 transition-colors hover:text-ink-950"
                    >
                      {tHome("guidedStarts.browseAllCollections")}
                    </Link>
                  </div>
                  <MotionStaggerGroup className="grid gap-3" baseDelay={120}>
                    {guidedCollections.map((collection) => (
                      <GuidedCollectionCard
                        key={collection.slug}
                        collection={collection}
                        variant="compact"
                      />
                    ))}
                  </MotionStaggerGroup>
                </div>
              </div>
            </DisclosurePanel>

            <DisclosurePanel
              eyebrow={tHome("routes.eyebrow")}
              title={tHome("routes.previewTitle")}
              summary={tHome("routes.previewSummary")}
            >
              <div className="grid gap-6 xl:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="lab-label">{tHome("routes.subjectsLabel")}</p>
                    <Link
                      href="/concepts/subjects"
                      locale={locale}
                      className="text-sm font-medium text-ink-700 underline decoration-ink-300 underline-offset-4 transition-colors hover:text-ink-950"
                    >
                      {tHome("routes.openSubjectDirectory")}
                    </Link>
                  </div>
                  <div className="grid gap-3">
                    {featuredSubjects.map((subject) => (
                      <SubjectDiscoveryCard
                        key={subject.slug}
                        subject={subject}
                        variant="compact"
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="lab-label">{tHome("routes.topicsLabel")}</p>
                    <Link
                      href="/concepts/topics"
                      locale={locale}
                      className="text-sm font-medium text-ink-700 underline decoration-ink-300 underline-offset-4 transition-colors hover:text-ink-950"
                    >
                      {tHome("routes.openTopicDirectory")}
                    </Link>
                  </div>
                  <div className="grid gap-3">
                    {featuredTopics.map((topic) => (
                      <TopicDiscoveryCard key={topic.slug} topic={topic} variant="compact" />
                    ))}
                  </div>
                </div>
              </div>
            </DisclosurePanel>

            <DisclosurePanel
              eyebrow={tHome("challenges.eyebrow")}
              title={tHome("challenges.previewTitle")}
              summary={tHome("challenges.previewSummary", {
                count: challengeMetrics.totalChallenges,
              })}
            >
              <div className="flex flex-wrap items-center gap-3">
                <p className="max-w-2xl text-sm leading-6 text-ink-700">
                  {tHome("challenges.description")}
                </p>
                <Link
                  href="/challenges"
                  locale={locale}
                  className="motion-button-outline inline-flex items-center rounded-full border border-line bg-paper-strong px-4 py-2.5 text-sm font-medium text-ink-950 hover:border-ink-950/25"
                >
                  {tHome("challenges.action")}
                </Link>
              </div>
            </DisclosurePanel>
          </div>
        </MotionSection>
      </PageSection>

      <DisplayAd placement="home.discoveryMid" className="mt-8" />

      <MultiplexAd placement="home.footerMultiplex" />

        <PageSection id="home-next-steps" as="div" className="mt-12">
        <MotionSection as="section" delay={110}>
          <div className="motion-enter motion-card page-band flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <p className="lab-label">{tHome("feedback.eyebrow")}</p>
              <h2 className="text-[2rem] font-semibold text-ink-950">
                {tHome("feedback.title")}
              </h2>
              <p className="max-w-2xl text-base leading-7 text-ink-700">
                {tHome("feedback.description")}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/contact"
                locale={locale}
                className="cta-secondary"
              >
                {tHome("feedback.action")}
              </Link>
            </div>
          </div>
        </MotionSection>
        </PageSection>
      </PageShell>
    </NextIntlClientProvider>
  );
}
