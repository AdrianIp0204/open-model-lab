import { Children, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { ConceptContent, ReadNextRecommendation } from "@/lib/content";
import type { WorkedExampleAccessMode } from "@/lib/account/entitlements";
import type { ResolvedConceptPageSection } from "@/lib/content/concept-page-framework";
import { getConceptSectionAnchorId } from "@/lib/share-links";
import { InArticleAd } from "@/components/ads/AdSlot";
import { DisclosurePanel } from "@/components/layout/DisclosurePanel";
import { buildConceptReviewHref, getNextPublishedConceptTestEntry } from "@/lib/test-hub";
import { RichMathText } from "./MathFormula";
import { LiveWorkedExampleSection } from "./LiveWorkedExampleSection";
import { QuickTestSection } from "./QuickTestSection";
import { ReadNextSection } from "./ReadNextSection";

type ConceptPageSectionsProps = {
  concept: ConceptContent;
  readNext: ReadNextRecommendation[];
  sections: ResolvedConceptPageSection[];
  workedExampleMode?: WorkedExampleAccessMode;
};

function ParagraphStack({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className="space-y-3 text-sm leading-[1.65rem] text-ink-700">
      {paragraphs.map((paragraph) => (
        <RichMathText key={paragraph} as="p" content={paragraph} />
      ))}
    </div>
  );
}

function renderSection(
  section: ResolvedConceptPageSection,
  concept: ConceptContent,
  readNext: ReadNextRecommendation[],
  workedExampleMode: WorkedExampleAccessMode,
  quickTestCompletionNav: {
    hubHref: string;
    reviewHref: string;
    nextTest?: {
      href: string;
      title: string;
    } | null;
  } | null,
  t: ReturnType<typeof useTranslations<"ConceptPageSections">>,
) {
  let content: ReactNode = null;

  switch (section.id) {
    case "explanation":
      content = (
        <article key={section.id} className="lab-panel p-5">
          <p className="lab-label">{t("explanation.label")}</p>
          <RichMathText as="h2" content={section.title} className="mt-2 text-2xl font-semibold text-ink-950" />
          <div className="mt-3.5">
            <ParagraphStack paragraphs={concept.sections.explanation.paragraphs} />
          </div>
        </article>
      );
      break;
    case "keyIdeas":
      content = (
        <article key={section.id} className="lab-panel p-5">
          <RichMathText as="p" content={section.title} className="lab-label" />
          <div className="mt-3.5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {concept.sections.keyIdeas.map((item, index) => (
              <div
                key={`${section.id}-${index}-${item}`}
                className="rounded-3xl border border-line bg-paper-strong px-4 py-4 text-sm leading-6 text-ink-700"
              >
                <span className="mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-teal-500/12 font-mono text-xs font-semibold text-teal-600">
                  0{index + 1}
                </span>
                <RichMathText as="span" content={item} />
              </div>
            ))}
          </div>
        </article>
      );
      break;
    case "workedExamples":
      content = (
        <DisclosurePanel
          key={section.id}
          eyebrow={t("workedExamples.label")}
          title={section.title}
          summary={t("workedExamples.summary")}
        >
          <LiveWorkedExampleSection
            concept={concept}
            mode={workedExampleMode}
            sectionTitle={section.title}
          />
        </DisclosurePanel>
      );
      break;
    case "commonMisconception":
      content = (
        <DisclosurePanel
          key={section.id}
          eyebrow={t("commonMisconception.label")}
          title={section.title}
          summary={t("commonMisconception.summary")}
        >
          <RichMathText
            as="p"
            content={concept.sections.commonMisconception.myth}
            className="rounded-3xl border border-coral-500/30 bg-coral-500/10 px-4 py-4 text-base font-semibold leading-7 text-ink-950"
          />
          <div className="mt-4">
            <ParagraphStack paragraphs={concept.sections.commonMisconception.correction} />
          </div>
        </DisclosurePanel>
      );
      break;
    case "miniChallenge":
      content = (
        <article key={section.id} className="lab-panel p-5">
          <RichMathText as="p" content={section.title} className="lab-label" />
          <RichMathText
            as="div"
            content={concept.sections.miniChallenge.prompt}
            className="mt-3 text-sm leading-7 text-ink-700"
          />
          {concept.sections.miniChallenge.prediction ? (
            <div className="mt-4 rounded-3xl border border-teal-500/25 bg-teal-500/10 px-4 py-4 text-sm leading-6 text-ink-800">
              <p className="font-semibold text-ink-950">{t("miniChallenge.predictionPrompt")}</p>
              <RichMathText
                as="div"
                content={concept.sections.miniChallenge.prediction}
                className="mt-2"
              />
            </div>
          ) : null}
          <div className="mt-4 rounded-3xl border border-line bg-paper-strong px-4 py-4 text-sm leading-6 text-ink-700">
            <p className="font-semibold text-ink-950">{t("miniChallenge.checkReasoning")}</p>
            <RichMathText
              as="div"
              content={concept.sections.miniChallenge.answer}
              className="mt-2"
            />
            <RichMathText
              as="div"
              content={concept.sections.miniChallenge.explanation}
              className="mt-3"
            />
          </div>
        </article>
      );
      break;
    case "quickTest":
      content = (
        <QuickTestSection
          key={section.id}
          concept={{
            id: concept.id,
            slug: concept.slug,
            title: concept.title,
            quickTest: concept.quickTest,
            sections: concept.sections,
            simulation: concept.simulation,
            graphs: concept.graphs,
            variableLinks: concept.variableLinks,
          }}
          sectionTitle={section.title}
          completionNav={quickTestCompletionNav}
        />
      );
      break;
    case "accessibility":
      content = (
        <DisclosurePanel
          key={section.id}
          eyebrow={t("accessibility.label")}
          title={section.title}
          summary={t("accessibility.summary")}
        >
          <div className="space-y-4">
            <ParagraphStack paragraphs={concept.accessibility.simulationDescription.paragraphs} />
            <div className="rounded-3xl border border-line bg-paper-strong px-4 py-4">
              <p className="text-base font-semibold text-ink-950">{t("accessibility.graphSummary")}</p>
              <div className="mt-3">
                <ParagraphStack paragraphs={concept.accessibility.graphSummary.paragraphs} />
              </div>
            </div>
          </div>
        </DisclosurePanel>
      );
      break;
    case "readNext":
      content = (
        <ReadNextSection
          key={section.id}
          items={readNext}
          sectionTitle={section.title}
        />
      );
      break;
    default:
      return null;
  }

  const anchorId = getConceptSectionAnchorId(section.id);

  if (!anchorId) {
    return content;
  }

  return (
    <div key={section.id} id={anchorId} className="scroll-mt-24">
      {content}
    </div>
  );
}

function renderSlotGroup(
  slotKey: string,
  mainSections: ResolvedConceptPageSection[],
  asideSections: ResolvedConceptPageSection[],
  concept: ConceptContent,
  readNext: ReadNextRecommendation[],
  workedExampleMode: WorkedExampleAccessMode,
  quickTestCompletionNav: {
    hubHref: string;
    reviewHref: string;
    nextTest?: {
      href: string;
      title: string;
    } | null;
  } | null,
  t: ReturnType<typeof useTranslations<"ConceptPageSections">>,
) {
  if (!mainSections.length && !asideSections.length) {
    return null;
  }

  if (!mainSections.length) {
    return (
      <div key={slotKey} className="space-y-4">
        {asideSections.map((section) =>
          renderSection(section, concept, readNext, workedExampleMode, quickTestCompletionNav, t),
        )}
      </div>
    );
  }

  if (!asideSections.length) {
    return (
      <div key={slotKey} className="space-y-4">
        {mainSections.map((section) =>
          renderSection(section, concept, readNext, workedExampleMode, quickTestCompletionNav, t),
        )}
      </div>
    );
  }

  return (
    <div key={slotKey} className="grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
      <div className="space-y-4">
        {mainSections.map((section) =>
          renderSection(section, concept, readNext, workedExampleMode, quickTestCompletionNav, t),
        )}
      </div>
      <div className="space-y-4">
        {asideSections.map((section) =>
          renderSection(section, concept, readNext, workedExampleMode, quickTestCompletionNav, t),
        )}
      </div>
    </div>
  );
}

export function ConceptPageSections({
  concept,
  readNext,
  sections,
  workedExampleMode = "live",
}: ConceptPageSectionsProps) {
  const t = useTranslations("ConceptPageSections");
  const nextTest = concept.published
    ? getNextPublishedConceptTestEntry(concept.slug)
    : null;
  const quickTestCompletionNav = concept.published
    ? {
        hubHref: "/tests",
        reviewHref: buildConceptReviewHref(concept.slug),
        nextTest: nextTest
          ? {
              href: nextTest.testHref,
              title: nextTest.title,
            }
          : null,
      }
    : null;
  const overviewSections = sections.filter((section) => section.slot === "overview");
  const practiceMainSections = sections.filter((section) => section.slot === "practice-main");
  const practiceAsideSections = sections.filter((section) => section.slot === "practice-aside");
  const assessmentSections = sections.filter((section) => section.slot === "assessment");
  const supportMainSections = sections.filter((section) => section.slot === "support-main");
  const supportAsideSections = sections.filter((section) => section.slot === "support-aside");
  const sectionBlocks = Children.toArray([
    ...overviewSections.map((section) =>
      renderSection(section, concept, readNext, workedExampleMode, quickTestCompletionNav, t),
    ),
    overviewSections.length ? (
      <InArticleAd key="body-in-article" placement="concept.bodyInArticle" />
    ) : null,
    renderSlotGroup(
      "practice",
      practiceMainSections,
      practiceAsideSections,
      concept,
      readNext,
      workedExampleMode,
      quickTestCompletionNav,
      t,
    ),
    ...assessmentSections.map((section) =>
      renderSection(section, concept, readNext, workedExampleMode, quickTestCompletionNav, t),
    ),
    renderSlotGroup(
      "support",
      supportMainSections,
      supportAsideSections,
      concept,
      readNext,
      workedExampleMode,
      quickTestCompletionNav,
      t,
    ),
  ]);

  return <section className="space-y-4">{sectionBlocks}</section>;
}
