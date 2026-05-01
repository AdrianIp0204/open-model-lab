import { describe, expect, it } from "vitest";
import {
  conceptLearningPhaseIds,
  getAllConcepts,
  getDefaultConceptLearningPhaseId,
  getReadNextRecommendations,
  resolveConceptLearningPhases,
  resolveConceptPageSections,
} from "@/lib/content";

const concepts = getAllConcepts();
const overrideConcepts = concepts.filter(
  (concept) => (concept.pageFramework?.sections?.length ?? 0) > 0,
);

type PhaseAuditFailure = {
  slug: string;
  issue: string;
  details?: unknown;
};

function auditConceptPhases(slug: string) {
  const concept = concepts.find((entry) => entry.slug === slug);

  if (!concept) {
    throw new Error(`Unknown concept slug: ${slug}`);
  }

  const readNext = getReadNextRecommendations(concept.slug);
  const sections = resolveConceptPageSections(concept, { readNext });
  const phases = resolveConceptLearningPhases(sections);
  const sectionIds = sections.map((section) => section.id);
  const assignedSectionIds = phases.flatMap((phase) =>
    phase.sections.map((section) => section.id),
  );
  const assignmentCounts = new Map<string, number>();

  for (const sectionId of assignedSectionIds) {
    assignmentCounts.set(sectionId, (assignmentCounts.get(sectionId) ?? 0) + 1);
  }

  return {
    concept,
    sections,
    phases,
    sectionIds,
    assignedSectionIds,
    visiblePhaseIds: phases
      .filter((phase) => phase.hasVisibleSections)
      .map((phase) => phase.id),
    duplicateAssignments: [...assignmentCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([sectionId]) => sectionId),
    unassignedSectionIds: sectionIds.filter(
      (sectionId) => !assignmentCounts.has(sectionId),
    ),
    defaultPhaseId: getDefaultConceptLearningPhaseId(phases),
  };
}

describe("concept phase rollout catalog audit", () => {
  it("resolves lower-page sections and learning phases across every published concept", () => {
    expect(concepts.length).toBeGreaterThan(0);

    const failures: PhaseAuditFailure[] = [];

    for (const concept of concepts) {
      try {
        const audit = auditConceptPhases(concept.slug);
        const expectedDefaultPhaseId = audit.visiblePhaseIds[0] ?? "explore";

        if (
          JSON.stringify(audit.phases.map((phase) => phase.id)) !==
          JSON.stringify([...conceptLearningPhaseIds])
        ) {
          failures.push({
            slug: concept.slug,
            issue: "non-canonical phase order",
            details: audit.phases.map((phase) => phase.id),
          });
        }

        if (audit.duplicateAssignments.length) {
          failures.push({
            slug: concept.slug,
            issue: "duplicate section assignment",
            details: audit.duplicateAssignments,
          });
        }

        if (audit.unassignedSectionIds.length) {
          failures.push({
            slug: concept.slug,
            issue: "unassigned lower-page sections",
            details: audit.unassignedSectionIds,
          });
        }

        if (audit.visiblePhaseIds.length === 0) {
          failures.push({
            slug: concept.slug,
            issue: "no visible learning phases",
            details: audit.sectionIds,
          });
        }

        if (audit.defaultPhaseId !== expectedDefaultPhaseId) {
          failures.push({
            slug: concept.slug,
            issue: "unexpected default phase",
            details: {
              expected: expectedDefaultPhaseId,
              received: audit.defaultPhaseId,
              visiblePhaseIds: audit.visiblePhaseIds,
            },
          });
        }
      } catch (error) {
        failures.push({
          slug: concept.slug,
          issue: "resolution threw",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    }

    expect(failures).toEqual([]);
  });

  it("keeps authored page-framework overrides phase-safe across the override subset", () => {
    expect(overrideConcepts.length).toBeGreaterThan(0);

    const failures: PhaseAuditFailure[] = [];

    for (const concept of overrideConcepts) {
      try {
        const audit = auditConceptPhases(concept.slug);
        const overrideConfigById = new Map(
          (concept.pageFramework?.sections ?? []).map((section) => [section.id, section] as const),
        );

        for (const phase of audit.phases) {
          const resolvedPhaseSectionIds = phase.sections.map((section) => section.id);
          const expectedPhaseSectionIds = audit.sections
            .filter((section) => phase.sectionIds.includes(section.id))
            .map((section) => section.id);

          if (
            JSON.stringify(resolvedPhaseSectionIds) !==
            JSON.stringify(expectedPhaseSectionIds)
          ) {
            failures.push({
              slug: concept.slug,
              issue: `phase grouping drifted for ${phase.id}`,
              details: {
                expectedPhaseSectionIds,
                resolvedPhaseSectionIds,
              },
            });
          }
        }

        for (const [sectionId, config] of overrideConfigById) {
          const groupedSection = audit.phases
            .flatMap((phase) => phase.sections)
            .find((section) => section.id === sectionId);

          if (config.enabled === false) {
            if (groupedSection) {
              failures.push({
                slug: concept.slug,
                issue: `disabled override section still rendered: ${sectionId}`,
              });
            }

            continue;
          }

          if (!groupedSection) {
            continue;
          }

          if (config.title && groupedSection.title !== config.title) {
            failures.push({
              slug: concept.slug,
              issue: `override title lost for ${sectionId}`,
              details: {
                expected: config.title,
                received: groupedSection.title,
              },
            });
          }
        }
      } catch (error) {
        failures.push({
          slug: concept.slug,
          issue: "override audit threw",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    }

    expect(failures).toEqual([]);
  });
});
