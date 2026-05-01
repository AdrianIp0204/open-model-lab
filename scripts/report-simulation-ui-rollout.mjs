import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateContentVariantBundle } from "./generate-content-variant-bundle.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

function readJson(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStableArrayKey(value) {
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => isPlainObject(item) && typeof item.id === "string")
  ) {
    return "id";
  }

  if (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => isPlainObject(item) && typeof item.slug === "string")
  ) {
    return "slug";
  }

  return null;
}

function mergeOverlayValue(base, override) {
  if (override === undefined) {
    return base;
  }

  if (Array.isArray(base)) {
    if (!Array.isArray(override)) {
      return base;
    }

    const stableKey = getStableArrayKey(base);

    if (
      stableKey &&
      override.every((item) => isPlainObject(item) && typeof item[stableKey] === "string")
    ) {
      const overridesByStableKey = new Map(
        override.map((item) => [item[stableKey], item]),
      );

      return base.map((item) => {
        const itemOverride = overridesByStableKey.get(item[stableKey]);
        return mergeOverlayValue(item, itemOverride);
      });
    }

    return override;
  }

  if (isPlainObject(base) && isPlainObject(override)) {
    const merged = { ...base };

    for (const [key, value] of Object.entries(override)) {
      if ((key === "id" || key === "slug") && key in base) {
        merged[key] = base[key];
        continue;
      }

      merged[key] = mergeOverlayValue(base[key], value);
    }

    return merged;
  }

  return override;
}

function resolveDefaultVisibleControls(controlCount, primaryControlIds) {
  return primaryControlIds.length > 0 ? primaryControlIds.length : Math.min(controlCount, 4);
}

function resolveDefaultVisibleGraphs(graphCount, primaryGraphIds) {
  return primaryGraphIds.length > 0 ? primaryGraphIds.length : graphCount;
}

function resolveEffectiveInitialGraphId(graphs, authoredInitialGraphId) {
  return graphs.find((graph) => graph.id === authoredInitialGraphId)?.id ?? graphs[0]?.id ?? null;
}

function buildRow(metadata, concept) {
  const controls = concept.simulation?.controls ?? [];
  const graphs = concept.graphs ?? [];
  const ui = concept.simulation?.ui ?? {};
  const authoredInitialGraphId =
    typeof ui.initialGraphId === "string" ? ui.initialGraphId : null;
  const primaryControlIds = Array.isArray(ui.primaryControlIds) ? ui.primaryControlIds : [];
  const primaryGraphIds = Array.isArray(ui.primaryGraphIds) ? ui.primaryGraphIds : [];
  const effectiveInitialGraphId = resolveEffectiveInitialGraphId(graphs, authoredInitialGraphId);
  const firstPrimaryGraphId = primaryGraphIds[0] ?? null;
  const defaultVisibleControlCount = resolveDefaultVisibleControls(controls.length, primaryControlIds);
  const defaultVisibleGraphCount = resolveDefaultVisibleGraphs(graphs.length, primaryGraphIds);
  const missingPrimaryControls = primaryControlIds.length === 0;
  const missingPrimaryGraphs = primaryGraphIds.length === 0;
  let initialGraphAlignmentStatus = "unconfigured";

  if (firstPrimaryGraphId) {
    if (effectiveInitialGraphId === firstPrimaryGraphId) {
      initialGraphAlignmentStatus = "aligned";
    } else {
      initialGraphAlignmentStatus = authoredInitialGraphId
        ? "misalignedInitialGraph"
        : "missingInitialGraphId";
    }
  }

  let configurationStatus = "fullyConfigured";

  if (missingPrimaryControls && missingPrimaryGraphs) {
    configurationStatus = "missingBoth";
  } else if (missingPrimaryControls) {
    configurationStatus = "missingPrimaryControlsOnly";
  } else if (missingPrimaryGraphs) {
    configurationStatus = "missingPrimaryGraphsOnly";
  }

  return {
    slug: metadata.slug,
    title: metadata.title,
    topic: metadata.topic,
    subject: metadata.subject,
    primaryControlIds,
    primaryGraphIds,
    authoredInitialGraphId,
    effectiveInitialGraphId,
    firstPrimaryGraphId,
    initialGraphAlignmentStatus,
    controlCount: controls.length,
    graphCount: graphs.length,
    defaultVisibleControlCount,
    defaultVisibleGraphCount,
    missingPrimaryControls,
    missingPrimaryGraphs,
    configurationStatus,
    starterSource:
      Array.isArray(ui.starterExploreTasks) && ui.starterExploreTasks.length > 0
        ? "starterExploreTasks"
        : concept.noticePrompts?.items?.[0]?.text
          ? "noticePrompts.items[0]"
          : "none",
    complexityScore:
      controls.length +
      graphs.length +
      defaultVisibleControlCount +
      defaultVisibleGraphCount,
  };
}

export function buildSimulationUiRolloutReport() {
  const catalog = readJson(path.join("content", "catalog", "concepts.json"));
  const publishedEntries = catalog.filter((entry) => entry.published);
  const { optimizedBundle } = generateContentVariantBundle(repoRoot, { writeFiles: false });
  const comparisons = publishedEntries.map((metadata) => {
    const canonicalConcept = readJson(path.join("content", "concepts", `${metadata.contentFile}.json`));
    const effectiveEnConcept = optimizedBundle[metadata.slug]
      ? mergeOverlayValue(canonicalConcept, optimizedBundle[metadata.slug])
      : canonicalConcept;

    return {
      canonical: buildRow(metadata, canonicalConcept),
      effectiveEn: buildRow(metadata, effectiveEnConcept),
    };
  });
  const rows = comparisons.map((item) => item.canonical);
  const effectiveEnRows = comparisons.map((item) => item.effectiveEn);
  const fullyConfigured = rows.filter((row) => row.configurationStatus === "fullyConfigured");
  const effectiveEnFullyConfigured = effectiveEnRows.filter(
    (row) => row.configurationStatus === "fullyConfigured",
  );
  const initialGraphAlignmentIssues = rows.filter(
    (row) =>
      row.initialGraphAlignmentStatus === "missingInitialGraphId" ||
      row.initialGraphAlignmentStatus === "misalignedInitialGraph",
  );
  const effectiveEnInitialGraphAlignmentIssues = effectiveEnRows.filter(
    (row) =>
      row.initialGraphAlignmentStatus === "missingInitialGraphId" ||
      row.initialGraphAlignmentStatus === "misalignedInitialGraph",
  );
  const effectiveEnDisclosureMismatches = comparisons
    .filter(({ canonical }) => canonical.configurationStatus === "fullyConfigured")
    .filter(({ canonical, effectiveEn }) => {
      return (
        canonical.configurationStatus !== effectiveEn.configurationStatus ||
        JSON.stringify(canonical.primaryControlIds ?? null) !==
          JSON.stringify(effectiveEn.primaryControlIds ?? null) ||
        JSON.stringify(canonical.primaryGraphIds ?? null) !==
          JSON.stringify(effectiveEn.primaryGraphIds ?? null) ||
        canonical.effectiveInitialGraphId !== effectiveEn.effectiveInitialGraphId
      );
    })
    .map(({ canonical, effectiveEn }) => ({
      slug: canonical.slug,
      title: canonical.title,
      canonicalConfigurationStatus: canonical.configurationStatus,
      effectiveEnConfigurationStatus: effectiveEn.configurationStatus,
      canonicalPrimaryControlIds: canonical.primaryControlIds ?? null,
      effectiveEnPrimaryControlIds: effectiveEn.primaryControlIds ?? null,
      canonicalPrimaryGraphIds: canonical.primaryGraphIds ?? null,
      effectiveEnPrimaryGraphIds: effectiveEn.primaryGraphIds ?? null,
      canonicalInitialGraphId: canonical.effectiveInitialGraphId,
      effectiveEnInitialGraphId: effectiveEn.effectiveInitialGraphId,
    }));
  const remaining = rows
    .filter((row) => row.missingPrimaryControls || row.missingPrimaryGraphs)
    .sort((left, right) => {
      if (right.complexityScore !== left.complexityScore) {
        return right.complexityScore - left.complexityScore;
      }
      if (right.controlCount !== left.controlCount) {
        return right.controlCount - left.controlCount;
      }
      if (right.graphCount !== left.graphCount) {
        return right.graphCount - left.graphCount;
      }
      return left.slug.localeCompare(right.slug);
    });

  return {
    generatedAt: new Date().toISOString(),
    publishedConceptCount: publishedEntries.length,
    fullyConfiguredCount: fullyConfigured.length,
    effectiveEnFullyConfiguredCount: effectiveEnFullyConfigured.length,
    partiallyConfiguredCount: rows.filter(
      (row) =>
        row.configurationStatus === "missingPrimaryControlsOnly" ||
        row.configurationStatus === "missingPrimaryGraphsOnly",
    ).length,
    remainingCount: remaining.length,
    missingBothCount: rows.filter((row) => row.configurationStatus === "missingBoth").length,
    missingPrimaryControlsOnlyCount: rows.filter(
      (row) => row.configurationStatus === "missingPrimaryControlsOnly",
    ).length,
    missingPrimaryGraphsOnlyCount: rows.filter(
      (row) => row.configurationStatus === "missingPrimaryGraphsOnly",
    ).length,
    alignedInitialGraphCount: rows.filter(
      (row) => row.initialGraphAlignmentStatus === "aligned",
    ).length,
    effectiveEnAlignedInitialGraphCount: effectiveEnRows.filter(
      (row) => row.initialGraphAlignmentStatus === "aligned",
    ).length,
    initialGraphAlignmentIssueCount: initialGraphAlignmentIssues.length,
    initialGraphAlignmentIssues,
    effectiveEnInitialGraphAlignmentIssueCount: effectiveEnInitialGraphAlignmentIssues.length,
    effectiveEnInitialGraphAlignmentIssues,
    effectiveEnDisclosureMismatchCount: effectiveEnDisclosureMismatches.length,
    effectiveEnDisclosureMismatches,
    remaining,
  };
}

function printTextReport(report) {
  console.log(
      `Published concept pages: ${report.publishedConceptCount}\n` +
      `Fully configured for disclosure: ${report.fullyConfiguredCount}\n` +
      `Effectively configured on /en routes: ${report.effectiveEnFullyConfiguredCount}\n` +
      `Partially configured (missing one side only): ${report.partiallyConfiguredCount}\n` +
      `Missing both primary controls and primary graphs: ${report.missingBothCount}\n` +
      `Missing primary controls only: ${report.missingPrimaryControlsOnlyCount}\n` +
      `Missing primary graphs only: ${report.missingPrimaryGraphsOnlyCount}\n` +
      `Configured pages with aligned first graph: ${report.alignedInitialGraphCount}\n` +
      `Effectively aligned first graph on /en routes: ${report.effectiveEnAlignedInitialGraphCount}\n` +
      `Configured pages with first-graph alignment issues: ${report.initialGraphAlignmentIssueCount}\n` +
      `Configured /en route pages with first-graph alignment issues: ${report.effectiveEnInitialGraphAlignmentIssueCount}\n` +
      `Configured canonical pages that lose disclosure hints on /en routes: ${report.effectiveEnDisclosureMismatchCount}\n` +
      `Remaining pages missing primary controls and/or primary graphs: ${report.remainingCount}\n`,
  );

  if (report.initialGraphAlignmentIssueCount > 0) {
    console.log("First-graph alignment issues:\n");
    console.table(
      report.initialGraphAlignmentIssues.map((row) => ({
        slug: row.slug,
        authoredInitialGraphId: row.authoredInitialGraphId ?? "<none>",
        effectiveInitialGraphId: row.effectiveInitialGraphId ?? "<none>",
        firstPrimaryGraphId: row.firstPrimaryGraphId ?? "<none>",
        initialGraphAlignmentStatus: row.initialGraphAlignmentStatus,
      })),
    );
  }

  if (report.remaining.length === 0) {
    console.log("All published concepts have authored disclosure hints.");
    return;
  }

  if (report.effectiveEnDisclosureMismatchCount > 0) {
    console.log("Configured /en route mismatches:\n");
    console.table(
      report.effectiveEnDisclosureMismatches.map((row) => ({
        slug: row.slug,
        canonicalControls: (row.canonicalPrimaryControlIds ?? []).join(", ") || "<none>",
        effectiveControls: (row.effectiveEnPrimaryControlIds ?? []).join(", ") || "<none>",
        canonicalGraphs: (row.canonicalPrimaryGraphIds ?? []).join(", ") || "<none>",
        effectiveGraphs: (row.effectiveEnPrimaryGraphIds ?? []).join(", ") || "<none>",
        canonicalInitial: row.canonicalInitialGraphId ?? "<none>",
        effectiveInitial: row.effectiveEnInitialGraphId ?? "<none>",
      })),
    );
  }

  console.table(
    report.remaining.map((row) => ({
      slug: row.slug,
      controls: row.controlCount,
      graphs: row.graphCount,
      defaultControls: row.defaultVisibleControlCount,
      defaultGraphs: row.defaultVisibleGraphCount,
      status: row.configurationStatus,
      missingPrimaryControls: row.missingPrimaryControls,
      missingPrimaryGraphs: row.missingPrimaryGraphs,
      starterSource: row.starterSource,
      score: row.complexityScore,
    })),
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const report = buildSimulationUiRolloutReport();
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printTextReport(report);
  }
}
