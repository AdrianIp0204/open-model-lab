import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveServerLocaleFallback } from "@/i18n/server";
import {
  getAllConceptMetadata,
  getConceptBySlug,
  getStarterTrackMembershipsForConcept,
  resolveReadNextFromRegistry,
  type ConceptContent,
} from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";
import { hasConceptQuizSupport } from "@/lib/quiz";
import { localizeShareHref } from "@/lib/share-links";
import { copyText } from "@/lib/i18n/copy-text";
import { ConceptPageFramework } from "@/components/concepts/ConceptPageFramework";
import { PageShell } from "@/components/layout/PageShell";

type AuthorPreviewConceptPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveServerLocaleFallback();

  return {
    title: copyText(locale, "Author Concept Preview | Open Model Lab", "作者概念預覽｜Open Model Lab"),
    robots: {
      index: false,
      follow: false,
    },
  };
}

export const dynamic = "force-dynamic";

function assertAuthorPreviewEnabled() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
}

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

function buildPreviewReadNext(concept: ConceptContent) {
  const previewRegistry = getAllConceptMetadata().map((entry) =>
    entry.slug === concept.slug ? { ...entry, published: true } : entry,
  );

  return resolveReadNextFromRegistry(previewRegistry, concept.slug);
}

async function getPreviewConcept(params: Promise<{ slug: string }>) {
  const { slug } = await params;

  try {
    return getConceptBySlug(slug, { includeUnpublished: true });
  } catch {
    notFound();
  }
}

export default async function AuthorPreviewConceptPage({
  params,
}: AuthorPreviewConceptPageProps) {
  assertAuthorPreviewEnabled();

  const locale = await resolveServerLocaleFallback();
  const concept = await getPreviewConcept(params);
  const readNext = buildPreviewReadNext(concept);
  const starterTrackMemberships = getStarterTrackMembershipsForConcept(concept.slug);
  const simulationSource = buildSimulationSource(concept);

  return (
    <PageShell className="space-y-4" showFeedbackWidget={false}>
      <section className="lab-panel flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="space-y-2">
          <p className="lab-label">
            {copyText(locale, "Developer-only author preview", "僅供開發者使用的作者預覽")}
          </p>
          <h1 className="text-2xl font-semibold text-ink-950">{concept.title}</h1>
          <p className="text-sm text-ink-700">
            {copyText(locale, "Previewing", "正在預覽")} <code>{concept.slug}</code>{" "}
            {copyText(locale, "from", "，來源檔案為")} <code>{concept.contentFile}.json</code>.
            {" "}
            {copyText(
              locale,
              "This route is hidden in production and can render draft concepts through the shared concept-page framework before they ship publicly.",
              "這條路由會在正式環境中隱藏，並可在公開發佈前透過共用概念頁框架渲染草稿概念。",
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={localizeShareHref("/author-preview", locale)}
            className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:border-ink-950/20 hover:text-ink-950"
          >
            {copyText(locale, "Back to author preview", "返回作者預覽")}
          </Link>
          {concept.published ? (
            <Link
              href={localizeShareHref(`/concepts/${concept.slug}`, locale)}
              className="rounded-full border border-line bg-paper-strong px-4 py-2 text-sm font-medium text-ink-950 transition-colors hover:border-ink-950/20"
            >
              {copyText(locale, "Open public page", "打開公開頁面")}
            </Link>
          ) : null}
        </div>
      </section>

      <ConceptPageFramework
        concept={concept}
        simulationSource={simulationSource}
        readNext={readNext}
        starterTrackMemberships={starterTrackMemberships}
      />
    </PageShell>
  );
}
