import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getOptionalStoredProgressForCookieHeader } from "@/lib/account/server-store";
import {
  getSubjectDiscoverySlugs,
  getSubjectDiscoverySummaryBySlug,
  type SubjectDiscoverySummary,
} from "@/lib/content";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getScopedTranslator, resolveServerLocaleFallback } from "@/i18n/server";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildItemListJsonLd,
  buildSubjectMetadata,
  getLocaleAbsoluteUrl,
  serializeJsonLd,
} from "@/lib/metadata";
import {
  getStarterTrackDisplaySummary,
  getStarterTrackDisplayTitle,
  getSubjectDisplayDescription,
  getSubjectDisplayTitle,
  getTopicDisplayDescription,
  getTopicDisplayTitle,
} from "@/lib/i18n/content";
import { PageShell } from "@/components/layout/PageShell";
import { SubjectLandingPage } from "@/components/concepts/SubjectLandingPage";

type SubjectPageProps = {
  params: Promise<{ slug: string }>;
};

async function getPageSubject(params: Promise<{ slug: string }>): Promise<SubjectDiscoverySummary> {
  const { slug } = await params;

  try {
    return getSubjectDiscoverySummaryBySlug(slug);
  } catch {
    notFound();
  }
}

export const dynamicParams = false;

export function generateStaticParams() {
  return getSubjectDiscoverySlugs().map((slug) => ({ slug }));
}

export async function buildSubjectPageMetadata({
  params,
  locale,
}: {
  params: Promise<{ slug: string }>;
  locale: AppLocale;
}) {
  const subject = await getPageSubject(params);
  const displayTitle = getSubjectDisplayTitle(subject, locale);
  const displayDescription = getSubjectDisplayDescription(subject, locale);

  return buildSubjectMetadata(
    {
      ...subject,
      title: displayTitle,
      description: displayDescription,
    },
    locale,
  );
}

export async function generateMetadata({ params }: SubjectPageProps) {
  return buildSubjectPageMetadata({
    params,
    locale: await resolveServerLocaleFallback(),
  });
}

export default async function SubjectPage({
  params,
  localeOverride,
}: SubjectPageProps & { localeOverride?: AppLocale }) {
  const locale = localeOverride ?? (await resolveServerLocaleFallback());
  const tSubject = await getScopedTranslator(locale, "SubjectLandingPage");
  const tConceptPage = await getScopedTranslator(locale, "ConceptPage");
  const cookieStore = await cookies();
  const { storedProgress: syncedProgress } = await getOptionalStoredProgressForCookieHeader({
    cookieHeader: cookieStore.toString(),
    routePath: "/concepts/subjects/[slug]",
  });
  const subject = await getPageSubject(params);
  const subjectTitle = getSubjectDisplayTitle(subject, locale);
  const subjectDescription = getSubjectDisplayDescription(subject, locale);
  const subjectJsonLd = serializeJsonLd([
    buildCollectionPageJsonLd({
      name: `${subjectTitle} subject page`,
      description: subjectDescription,
      url: getLocaleAbsoluteUrl(subject.path, locale),
    }),
    buildBreadcrumbJsonLd([
      { name: tConceptPage("breadcrumbs.home"), url: getLocaleAbsoluteUrl("/", locale) },
      { name: tConceptPage("breadcrumbs.conceptLibrary"), url: getLocaleAbsoluteUrl("/concepts", locale) },
      { name: tSubject("breadcrumbs.subjects"), url: getLocaleAbsoluteUrl("/concepts/subjects", locale) },
      { name: subjectTitle, url: getLocaleAbsoluteUrl(subject.path, locale) },
    ]),
    buildItemListJsonLd({
      name: tSubject("structuredData.topics", { subject: subjectTitle }),
      url: getLocaleAbsoluteUrl(subject.path, locale),
      items: subject.topics.map((topic) => ({
        name: getTopicDisplayTitle(topic, locale),
        url: getLocaleAbsoluteUrl(`/concepts/topics/${topic.slug}`, locale),
        description: getTopicDisplayDescription(topic, locale),
      })),
    }),
    buildItemListJsonLd({
      name: tSubject("structuredData.starterTracks", { subject: subjectTitle }),
      url: getLocaleAbsoluteUrl(subject.path, locale),
      items: [...subject.featuredStarterTracks, ...subject.bridgeStarterTracks].map((track) => ({
        name: getStarterTrackDisplayTitle(track, locale),
        url: getLocaleAbsoluteUrl(`/tracks/${track.slug}`, locale),
        description: getStarterTrackDisplaySummary(track, locale),
      })),
    }),
  ]);

  return (
    <PageShell
      layoutMode="section-shell"
      feedbackContext={{
        pageType: "concepts",
        pagePath: subject.path,
        pageTitle: `${subjectTitle} subject`,
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: subjectJsonLd }}
      />
      <SubjectLandingPage
        subject={subject}
        locale={locale}
        initialSyncedSnapshot={syncedProgress?.snapshot ?? null}
        leadIn={
          <div className="flex flex-wrap items-center gap-2 text-sm text-ink-600">
            <Link
              href="/"
              className="rounded-full border border-line bg-paper-strong px-3 py-1 transition-colors hover:border-ink-950/20 hover:text-ink-950"
            >
              {tConceptPage("breadcrumbs.home")}
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              href="/concepts"
              className="rounded-full border border-line bg-paper-strong px-3 py-1 transition-colors hover:border-ink-950/20 hover:text-ink-950"
            >
              {tConceptPage("breadcrumbs.conceptLibrary")}
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              href="/concepts/subjects"
              className="rounded-full border border-line bg-paper-strong px-3 py-1 transition-colors hover:border-ink-950/20 hover:text-ink-950"
            >
              {tSubject("breadcrumbs.subjects")}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-ink-950">
              {subjectTitle}
            </span>
          </div>
        }
      />
    </PageShell>
  );
}
