export const conceptQualityStatuses = [
  "not reviewed",
  "needs shared fix",
  "needs content rewrite",
  "needs simulation visual fix",
  "passed",
];

export const conceptQualityThresholds = {
  firstViewportY: 900,
  controlsViewportMultiplier: 1.5,
  maxHorizontalOverflowPx: 2,
  maxVisibleClippingSamples: 0,
  minTouchTargetPx: 44,
  maxTinyTouchTargets: 0,
  maxDuplicateSupportSurfaces: 2,
};

export const representativeInteractionStatuses = [
  "passed",
  "failed",
  "skipped",
  "not-run",
];

const statusRank = new Map(
  conceptQualityStatuses.map((status, index) => [status, index]),
);

function isAuditReviewed(audit) {
  return Boolean(audit && audit.route?.attempted);
}

function hasIssue(audit, code) {
  return Array.isArray(audit?.issues) && audit.issues.some((issue) => issue.code === code);
}

function hasAnyIssue(audit, codes) {
  return codes.some((code) => hasIssue(audit, code));
}

function classifyViewportAudit(audit) {
  if (!isAuditReviewed(audit)) {
    return {
      status: "not reviewed",
      reasons: ["No browser audit was recorded."],
    };
  }

  const reasons = [];

  if (!audit.route?.ok) {
    reasons.push(`Route did not return an OK document response (${audit.route?.status ?? "no response"}).`);
    return { status: "needs shared fix", reasons };
  }

  if (hasAnyIssue(audit, ["missing_h1", "missing_current_step_cue", "missing_controls", "missing_lesson_rail", "cue_after_first_viewport", "controls_after_one_point_five_viewports"])) {
    reasons.push("The shared concept-page shell is missing a required first-view surface.");
    return { status: "needs shared fix", reasons };
  }

  if (hasAnyIssue(audit, ["page_horizontal_overflow", "visible_clipping", "tiny_touch_target", "duplicate_support_surfaces"])) {
    reasons.push("The shared responsive layout has overflow, clipping, duplicate support, or touch-target debt.");
    return { status: "needs shared fix", reasons };
  }

  if (hasAnyIssue(audit, ["missing_scene", "missing_graphs", "scene_below_first_view", "interaction_failed"])) {
    reasons.push("The simulation visual surface is missing, below the first view, or does not respond to a representative interaction.");
    return { status: "needs simulation visual fix", reasons };
  }

  if (hasAnyIssue(audit, ["h1_title_mismatch", "localized_text_leak", "empty_guidance_text"])) {
    reasons.push("The page has visible content or localization copy that needs concept-level rewrite/review.");
    return { status: "needs content rewrite", reasons };
  }

  return {
    status: "passed",
    reasons: [],
  };
}

export function classifyConceptQualityRow(row) {
  const viewportAudits = Array.isArray(row?.viewportAudits) ? row.viewportAudits : [];

  if (viewportAudits.length === 0) {
    return {
      status: "not reviewed",
      reasons: ["No viewport audits were recorded."],
    };
  }

  const classifications = viewportAudits.map(classifyViewportAudit);
  const worst = classifications.reduce((currentWorst, candidate) => {
    const currentRank = statusRank.get(currentWorst.status) ?? 0;
    const candidateRank = statusRank.get(candidate.status) ?? 0;

    return candidateRank < currentRank ? candidate : currentWorst;
  });
  const reasons = Array.from(
    new Set(classifications.flatMap((classification) => classification.reasons)),
  );

  return {
    status: worst.status,
    reasons,
  };
}

export function buildConceptQualityReport({
  generatedAt,
  catalogCount,
  command,
  thresholds = conceptQualityThresholds,
  viewports,
  rows,
}) {
  const normalizedRows = rows.map((row) => {
    const classification = classifyConceptQualityRow(row);

    return {
      ...row,
      reviewStatus: classification.status,
      reviewReasons: classification.reasons,
    };
  });
  const byStatus = Object.fromEntries(conceptQualityStatuses.map((status) => [status, 0]));
  const interactionsByStatus = Object.fromEntries(
    representativeInteractionStatuses.map((status) => [status, 0]),
  );

  for (const row of normalizedRows) {
    byStatus[row.reviewStatus] = (byStatus[row.reviewStatus] ?? 0) + 1;

    for (const audit of row.viewportAudits ?? []) {
      const status = audit.interaction?.status ?? "not-run";
      interactionsByStatus[status] = (interactionsByStatus[status] ?? 0) + 1;
    }
  }
  const attemptedInteractionCount =
    (interactionsByStatus.passed ?? 0) + (interactionsByStatus.failed ?? 0);

  return {
    schemaVersion: 1,
    generatedAt,
    command,
    catalogCount,
    auditedCount: normalizedRows.length,
    thresholds,
    viewports,
    summary: {
      byStatus,
      passed: byStatus.passed,
      unpassed: normalizedRows.length - byStatus.passed,
      interactions: {
        byStatus: interactionsByStatus,
        attempted: attemptedInteractionCount,
        notAttempted:
          (interactionsByStatus.skipped ?? 0) + (interactionsByStatus["not-run"] ?? 0),
      },
    },
    rows: normalizedRows,
  };
}

export function getConceptQualityGateFailures(report, options = {}) {
  const failStatuses = new Set(
    options.failStatuses ?? [
      "not reviewed",
      "needs shared fix",
      "needs simulation visual fix",
    ],
  );

  return report.rows
    .filter((row) => failStatuses.has(row.reviewStatus))
    .map((row) => ({
      slug: row.slug,
      title: row.title,
      reviewStatus: row.reviewStatus,
      reviewReasons: row.reviewReasons,
    }));
}

export function assertConceptQualityGate(report, options = {}) {
  const failures = getConceptQualityGateFailures(report, options);

  if (failures.length > 0) {
    const sample = failures
      .slice(0, 10)
      .map((failure) => `${failure.slug}: ${failure.reviewStatus}`)
      .join("\n");
    throw new Error(`Concept quality gate failed for ${failures.length} page(s).\n${sample}`);
  }
}

export function assertRepresentativeInteractionCoverage(report, options = {}) {
  const minAttempted = options.minAttempted ?? 1;
  const attempted = report.summary?.interactions?.attempted ?? 0;

  if (attempted < minAttempted) {
    const byStatus = report.summary?.interactions?.byStatus ?? {};
    throw new Error(
      `Representative interaction coverage failed: expected at least ${minAttempted} real interaction attempt(s), saw ${attempted}. Status counts: ${JSON.stringify(byStatus)}`,
    );
  }
}

function formatMetric(value) {
  if (value === undefined || value === null) {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "yes" : "no";
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }

  return String(value).replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
}

export function renderConceptQualityMatrixMarkdown(report) {
  const lines = [
    "# Concept Page Quality Matrix",
    "",
    `Generated: ${report.generatedAt}`,
    `Command: \`${report.command}\``,
    `Coverage: ${report.auditedCount}/${report.catalogCount} concept slugs`,
    "",
    "## Status Summary",
    "",
    "| Status | Count |",
    "| --- | ---: |",
    ...conceptQualityStatuses.map((status) => `| ${status} | ${report.summary.byStatus[status] ?? 0} |`),
    "",
    "## Matrix",
    "",
    "| Slug | Title | Status | Reason | Route | H1 | Scene | Cue | Controls | Graphs | Lesson rail | Overflow px | Clipping | Touch gaps | i18n leaks | Interaction |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- |",
  ];

  for (const row of report.rows) {
    const worstAudit =
      row.viewportAudits.find((audit) => audit.issues?.length > 0) ?? row.viewportAudits[0] ?? {};
    const positions = worstAudit.positions ?? {};
    const metrics = worstAudit.metrics ?? {};
    const interaction = worstAudit.interaction ?? {};
    const reason = row.reviewReasons[0] ?? "Meets current SHM-quality thresholds.";

    lines.push(
      [
        row.slug,
        row.title,
        row.reviewStatus,
        reason,
        worstAudit.route?.ok,
        worstAudit.h1?.visible,
        positions.scene?.visible,
        positions.cue?.visible,
        positions.controls?.visible,
        positions.graphs?.visible,
        positions.lessonRail?.visible,
        metrics.horizontalOverflowPx ?? 0,
        metrics.visibleClippingCount ?? 0,
        metrics.tinyTouchTargetCount ?? 0,
        metrics.localizedLeakCount ?? 0,
        interaction.status ?? "not-run",
      ]
        .map(formatMetric)
        .join(" | ")
        .replace(/^/, "| ")
        .replace(/$/, " |"),
    );
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}
