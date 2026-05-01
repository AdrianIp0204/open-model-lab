import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { type AppLocale } from "@/i18n/routing";
import { getScopedTranslator, resolveServerLocaleFallback } from "@/i18n/server";
import {
  getSharedAssignmentById,
  getOptionalStoredProgressForCookieHeader,
} from "@/lib/account/server-store";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildItemListJsonLd,
  buildPageMetadata,
  getLocaleAbsoluteUrl,
  serializeJsonLd,
} from "@/lib/metadata";
import { PageShell } from "@/components/layout/PageShell";
import { AssignmentDetailPage } from "@/components/guided/AssignmentDetailPage";

type AssignmentPageProps = {
  params: Promise<{ id: string }>;
  localeOverride?: AppLocale;
};

export const dynamic = "force-dynamic";

async function getPageAssignment(params: Promise<{ id: string }>) {
  const { id } = await params;
  const assignment = await getSharedAssignmentById(id);

  if (!assignment) {
    notFound();
  }

  return assignment;
}

export async function buildAssignmentPageMetadata({
  params,
  locale,
}: {
  params: Promise<{ id: string }>;
  locale: AppLocale;
}): Promise<Metadata> {
  const t = await getScopedTranslator(locale, "AssignmentDetailPage");
  const assignment = await getPageAssignment(params);

  return buildPageMetadata({
    title: t("metadata.title", { title: assignment.title }),
    description: assignment.summary,
    pathname: `/assignments/${assignment.id}`,
    locale,
    keywords: [
      assignment.title,
      t("metadata.keywords.assignment"),
      t("metadata.keywords.guidedCollectionAssignment"),
      assignment.collectionTitle,
      ...assignment.concepts.map((concept) => concept.title),
    ],
    category: t("metadata.category"),
  });
}

export async function generateMetadata({
  params,
}: AssignmentPageProps): Promise<Metadata> {
  return buildAssignmentPageMetadata({
    params,
    locale: await resolveServerLocaleFallback(),
  });
}

export default async function AssignmentPage({
  params,
  localeOverride,
}: AssignmentPageProps) {
  const locale = localeOverride ?? (await resolveServerLocaleFallback());
  const t = await getScopedTranslator(locale, "AssignmentDetailPage");
  const cookieStore = await cookies();
  const { storedProgress: syncedProgress } = await getOptionalStoredProgressForCookieHeader({
    cookieHeader: cookieStore.toString(),
    routePath: "/assignments/[id]",
  });
  const assignment = await getPageAssignment(params);
  const assignmentPath = `/assignments/${assignment.id}`;
  const jsonLd = serializeJsonLd([
    buildCollectionPageJsonLd({
      name: assignment.title,
      description: assignment.summary,
      url: getLocaleAbsoluteUrl(assignmentPath, locale),
    }),
    buildBreadcrumbJsonLd([
      { name: t("breadcrumbs.home"), url: getLocaleAbsoluteUrl("/", locale) },
      {
        name: t("breadcrumbs.guidedCollections"),
        url: getLocaleAbsoluteUrl("/guided", locale),
      },
      {
        name: assignment.collectionTitle,
        url: getLocaleAbsoluteUrl(assignment.collectionPath, locale),
      },
      { name: assignment.title, url: getLocaleAbsoluteUrl(assignmentPath, locale) },
    ]),
    buildItemListJsonLd({
      name: t("structuredData.assignedStepsName", { title: assignment.title }),
      url: getLocaleAbsoluteUrl(assignmentPath, locale),
      items: assignment.steps.map((step) => ({
        name: step.title,
        url: getLocaleAbsoluteUrl(step.href, locale),
        description: step.summary,
      })),
    }),
  ]);

  return (
    <PageShell
      className="space-y-4"
      feedbackContext={{
        pageType: "other",
        pagePath: assignmentPath,
        pageTitle: assignment.title,
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <AssignmentDetailPage
        assignment={assignment}
        initialSyncedSnapshot={syncedProgress?.snapshot ?? null}
      />
    </PageShell>
  );
}
