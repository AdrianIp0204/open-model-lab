import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SUBJECT_ASSUMPTION_SCAN_FILES = [
  "app/page.tsx",
  "app/start/page.tsx",
  "app/concepts/page.tsx",
  "app/concepts/subjects/page.tsx",
  "app/concepts/topics/page.tsx",
  "components/start/StartLearningPage.tsx",
  "components/search/SearchPage.tsx",
  "components/concepts/SubjectLandingPage.tsx",
];

const SUBJECT_ASSUMPTION_PATTERNS = [
  {
    id: "legacy-three-subject-copy",
    pattern:
      /\bPhysics\b(?:\s*[,/]\s*|\s+and\s+|\s+\/\s+).*?\bMath\b(?:\s*[,/]\s*|\s+and\s+|\s+\/\s+).*?\bChemistry\b/isu,
    message:
      "This file still enumerates Physics, Math, and Chemistry directly. Prefer generic current-subject copy so future subject additions do not require another sweep.",
  },
  {
    id: "three-subject-assumption",
    pattern: /\bthree-subject\b|\bthree subjects\b/iu,
    message:
      "This file still describes the catalog as a three-subject product. Use current-subject wording instead.",
  },
];

function parseCliArgs(argv) {
  const parsed = {
    json: false,
    failOnWarnings: false,
    root: process.cwd(),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    switch (token) {
      case "--json":
        parsed.json = true;
        break;
      case "--fail-on-warnings":
        parsed.failOnWarnings = true;
        break;
      case "--root": {
        const value = argv[index + 1];
        if (!value || value.startsWith("--")) {
          throw new Error('Missing value for "--root".');
        }
        parsed.root = path.resolve(value);
        index += 1;
        break;
      }
      case "--help":
        parsed.help = true;
        break;
      default:
        throw new Error(`Unknown argument "${token}".`);
    }
  }

  return parsed;
}

function buildUsageText() {
  return `Usage:

  node scripts/content-doctor.mjs
  node scripts/content-doctor.mjs --json
  node scripts/content-doctor.mjs --fail-on-warnings

Options:

  --json              Print the full report as JSON.
  --fail-on-warnings  Exit with code 1 when warnings are present.
  --root <path>       Run the doctor against a different repo root.
  --help              Show this message.
`;
}

function readJson(repoRoot, relativePath) {
  const filePath = path.join(repoRoot, relativePath);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readText(repoRoot, relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function addFinding(report, severity, code, message, location) {
  report.findings[severity].push({
    code,
    message,
    ...(location ? { location } : {}),
  });
}

function unique(values) {
  return [...new Set(values)];
}

function normalizeTrackSubjects(track, conceptsBySlug) {
  return unique(
    track.conceptSlugs
      .map((slug) => conceptsBySlug.get(slug)?.subject)
      .filter((subject) => typeof subject === "string" && subject.length > 0),
  );
}

function checkFeaturedSetupPayload({
  concept,
  setup,
  controlsByParam,
  presetIds,
  graphIds,
  overlayIds,
  report,
}) {
  const location = `content/concepts/${concept.contentFile}.json#pageFramework.featuredSetups.${setup.id}`;

  if (setup.setup?.presetId && !presetIds.has(setup.setup.presetId)) {
    addFinding(
      report,
      "errors",
      "featured-setup-missing-preset",
      `Concept "${concept.slug}" featured setup "${setup.id}" references missing preset "${setup.setup.presetId}".`,
      location,
    );
  }

  if (setup.setup?.graphId && !graphIds.has(setup.setup.graphId)) {
    addFinding(
      report,
      "errors",
      "featured-setup-missing-graph",
      `Concept "${concept.slug}" featured setup "${setup.id}" references unknown graph "${setup.setup.graphId}".`,
      location,
    );
  }

  for (const overlayId of setup.setup?.overlayIds ?? []) {
    if (!overlayIds.has(overlayId)) {
      addFinding(
        report,
        "errors",
        "featured-setup-missing-overlay",
        `Concept "${concept.slug}" featured setup "${setup.id}" references unknown overlay "${overlayId}".`,
        location,
      );
    }
  }

  for (const [param, value] of Object.entries(setup.setup?.patch ?? {})) {
    const control = controlsByParam.get(param);

    if (!control) {
      addFinding(
        report,
        "errors",
        "featured-setup-missing-control",
        `Concept "${concept.slug}" featured setup "${setup.id}" patches unknown control param "${param}".`,
        location,
      );
      continue;
    }

    if (control.kind === "toggle") {
      if (typeof value !== "boolean") {
        addFinding(
          report,
          "errors",
          "featured-setup-invalid-toggle",
          `Concept "${concept.slug}" featured setup "${setup.id}" must patch toggle "${param}" with a boolean value.`,
          location,
        );
      }
      continue;
    }

    if (typeof value !== "number" || !Number.isFinite(value)) {
      addFinding(
        report,
        "errors",
        "featured-setup-invalid-slider",
        `Concept "${concept.slug}" featured setup "${setup.id}" must patch slider "${param}" with a finite number.`,
        location,
      );
      continue;
    }

    if (value < control.min || value > control.max) {
      addFinding(
        report,
        "errors",
        "featured-setup-out-of-range",
        `Concept "${concept.slug}" featured setup "${setup.id}" patches slider "${param}" with ${value}, outside ${control.min}..${control.max}.`,
        location,
      );
    }
  }
}

function buildContentDoctorReport(repoRoot = process.cwd()) {
  const report = {
    generatedAt: new Date().toISOString(),
    repoRoot,
    summary: {
      subjectCount: 0,
      topicCount: 0,
      starterTrackCount: 0,
      goalPathCount: 0,
      conceptCount: 0,
      publishedConceptCount: 0,
      featuredSetupConceptCount: 0,
      compareFeaturedSetupConceptCount: 0,
      subjects: [],
    },
    findings: {
      errors: [],
      warnings: [],
    },
  };

  const concepts = readJson(repoRoot, "content/catalog/concepts.json");
  const subjects = readJson(repoRoot, "content/catalog/subjects.json");
  const topics = readJson(repoRoot, "content/catalog/topics.json");
  const starterTracks = readJson(repoRoot, "content/catalog/starter-tracks.json");
  const goalPaths = readJson(repoRoot, "content/catalog/recommended-goal-paths.json");

  const conceptsBySlug = new Map(concepts.map((entry) => [entry.slug, entry]));
  const subjectsByTitle = new Map(subjects.map((entry) => [entry.title, entry]));
  const topicsBySlug = new Map(topics.map((entry) => [entry.slug, entry]));
  const tracksBySlug = new Map(starterTracks.map((entry) => [entry.slug, entry]));

  report.summary.subjectCount = subjects.length;
  report.summary.topicCount = topics.length;
  report.summary.starterTrackCount = starterTracks.length;
  report.summary.goalPathCount = goalPaths.length;
  report.summary.conceptCount = concepts.length;
  report.summary.publishedConceptCount = concepts.filter((entry) => entry.published).length;
  report.summary.subjects = subjects.map((entry) => entry.title);

  for (const subject of subjects) {
    const publishedConcepts = concepts.filter(
      (concept) => concept.subject === subject.title && concept.published,
    );
    const topicEntries = topics.filter((topic) => topic.subject === subject.title);
    const trackEntries = starterTracks.filter((track) =>
      track.conceptSlugs.some((slug) => conceptsBySlug.get(slug)?.subject === subject.title),
    );

    if (!publishedConcepts.length) {
      addFinding(
        report,
        "errors",
        "subject-without-published-concepts",
        `Subject "${subject.title}" has no published concepts.`,
        `content/catalog/subjects.json#${subject.slug}`,
      );
    }

    if (!topicEntries.length) {
      addFinding(
        report,
        "warnings",
        "subject-without-topic-page",
        `Subject "${subject.title}" has no first-class topic page yet.`,
        `content/catalog/subjects.json#${subject.slug}`,
      );
    }

    if (!trackEntries.length) {
      addFinding(
        report,
        "warnings",
        "subject-without-starter-track",
        `Subject "${subject.title}" has no starter track touching its published concepts.`,
        `content/catalog/subjects.json#${subject.slug}`,
      );
    }

    for (const topicSlug of subject.featuredTopicSlugs ?? []) {
      const topic = topicsBySlug.get(topicSlug);
      if (!topic) {
        addFinding(
          report,
          "errors",
          "subject-featured-topic-missing",
          `Subject "${subject.title}" references missing featured topic "${topicSlug}".`,
          `content/catalog/subjects.json#${subject.slug}`,
        );
      } else if (topic.subject !== subject.title) {
        addFinding(
          report,
          "errors",
          "subject-featured-topic-cross-subject",
          `Subject "${subject.title}" features topic "${topic.slug}" from "${topic.subject}".`,
          `content/catalog/subjects.json#${subject.slug}`,
        );
      }
    }

    for (const trackSlug of [
      ...(subject.featuredStarterTrackSlugs ?? []),
      ...(subject.bridgeStarterTrackSlugs ?? []),
    ]) {
      const track = tracksBySlug.get(trackSlug);
      if (!track) {
        addFinding(
          report,
          "errors",
          "subject-featured-track-missing",
          `Subject "${subject.title}" references missing starter track "${trackSlug}".`,
          `content/catalog/subjects.json#${subject.slug}`,
        );
        continue;
      }

      const trackSubjects = normalizeTrackSubjects(track, conceptsBySlug);
      if (!trackSubjects.includes(subject.title)) {
        addFinding(
          report,
          "errors",
          "subject-featured-track-cross-subject",
          `Subject "${subject.title}" features starter track "${track.slug}" without any ${subject.title} concepts.`,
          `content/catalog/subjects.json#${subject.slug}`,
        );
      } else if (
        trackSubjects.length > 1 &&
        !(subject.bridgeStarterTrackSlugs ?? []).includes(trackSlug)
      ) {
        addFinding(
          report,
          "warnings",
          "subject-featured-track-mixed-subjects",
          `Subject "${subject.title}" features starter track "${track.slug}" across multiple subjects (${trackSubjects.join(", ")}).`,
          `content/catalog/subjects.json#${subject.slug}`,
        );
      }
    }

    for (const conceptSlug of subject.featuredConceptSlugs ?? []) {
      const concept = conceptsBySlug.get(conceptSlug);
      if (!concept) {
        addFinding(
          report,
          "errors",
          "subject-featured-concept-missing",
          `Subject "${subject.title}" references missing featured concept "${conceptSlug}".`,
          `content/catalog/subjects.json#${subject.slug}`,
        );
      } else if (concept.subject !== subject.title) {
        addFinding(
          report,
          "errors",
          "subject-featured-concept-cross-subject",
          `Subject "${subject.title}" features concept "${concept.slug}" from "${concept.subject}".`,
          `content/catalog/subjects.json#${subject.slug}`,
        );
      }
    }
  }

  for (const topic of topics) {
    if (!subjectsByTitle.has(topic.subject)) {
      addFinding(
        report,
        "errors",
        "topic-missing-subject",
        `Topic "${topic.slug}" references unknown subject "${topic.subject}".`,
        `content/catalog/topics.json#${topic.slug}`,
      );
    }

    const conceptsInTopic = concepts.filter(
      (concept) => concept.topic && topic.conceptTopics.includes(concept.topic),
    );

    if (!conceptsInTopic.some((concept) => concept.published)) {
      addFinding(
        report,
        "warnings",
        "topic-without-published-concepts",
        `Topic "${topic.slug}" currently has no published concepts in its canonical topic labels.`,
        `content/catalog/topics.json#${topic.slug}`,
      );
    }

    for (const conceptSlug of topic.featuredConceptSlugs ?? []) {
      const concept = conceptsBySlug.get(conceptSlug);
      if (!concept) {
        addFinding(
          report,
          "errors",
          "topic-featured-concept-missing",
          `Topic "${topic.slug}" references missing featured concept "${conceptSlug}".`,
          `content/catalog/topics.json#${topic.slug}`,
        );
        continue;
      }

      if (concept.subject !== topic.subject) {
        addFinding(
          report,
          "errors",
          "topic-featured-concept-cross-subject",
          `Topic "${topic.slug}" features concept "${concept.slug}" from "${concept.subject}".`,
          `content/catalog/topics.json#${topic.slug}`,
        );
      }
    }

    for (const group of topic.conceptGroups ?? []) {
      for (const conceptSlug of group.conceptSlugs ?? []) {
        const concept = conceptsBySlug.get(conceptSlug);
        if (!concept) {
          addFinding(
            report,
            "errors",
            "topic-group-concept-missing",
            `Topic "${topic.slug}" group "${group.id}" references missing concept "${conceptSlug}".`,
            `content/catalog/topics.json#${topic.slug}`,
          );
          continue;
        }

        if (concept.subject !== topic.subject) {
          addFinding(
            report,
            "errors",
            "topic-group-cross-subject",
            `Topic "${topic.slug}" group "${group.id}" includes concept "${concept.slug}" from "${concept.subject}".`,
            `content/catalog/topics.json#${topic.slug}`,
          );
        }
      }
    }

    for (const trackSlug of topic.recommendedStarterTrackSlugs ?? []) {
      const track = tracksBySlug.get(trackSlug);

      if (!track) {
        addFinding(
          report,
          "errors",
          "topic-recommended-track-missing",
          `Topic "${topic.slug}" references missing recommended starter track "${trackSlug}".`,
          `content/catalog/topics.json#${topic.slug}`,
        );
        continue;
      }

      const trackSubjects = normalizeTrackSubjects(track, conceptsBySlug);
      if (!trackSubjects.includes(topic.subject)) {
        addFinding(
          report,
          "errors",
          "topic-recommended-track-cross-subject",
          `Topic "${topic.slug}" recommends starter track "${track.slug}" without any ${topic.subject} concepts.`,
          `content/catalog/topics.json#${topic.slug}`,
        );
      }

    }
  }

  for (const track of starterTracks) {
    const trackSubjects = normalizeTrackSubjects(track, conceptsBySlug);
    const isBridgeTrack = subjects.some((subject) =>
      (subject.bridgeStarterTrackSlugs ?? []).includes(track.slug),
    );

    if (trackSubjects.length > 1 && !isBridgeTrack) {
      addFinding(
        report,
        "warnings",
        "starter-track-mixed-subjects",
        `Starter track "${track.slug}" spans multiple subjects (${trackSubjects.join(", ")}).`,
        `content/catalog/starter-tracks.json#${track.slug}`,
      );
    }
  }

  for (const goalPath of goalPaths) {
    const stepSubjects = [];

    for (const step of goalPath.steps ?? []) {
      switch (step.kind) {
        case "concept": {
          const concept = conceptsBySlug.get(step.conceptSlug);
          if (concept?.subject) {
            stepSubjects.push(concept.subject);
          }
          break;
        }
        case "topic": {
          const topic = topicsBySlug.get(step.topicSlug);
          if (topic?.subject) {
            stepSubjects.push(topic.subject);
          }
          break;
        }
        case "track": {
          const track = tracksBySlug.get(step.trackSlug);
          stepSubjects.push(...normalizeTrackSubjects(track ?? { conceptSlugs: [] }, conceptsBySlug));
          break;
        }
        default:
          break;
      }
    }

    const goalSubjects = unique(stepSubjects);
    if (!goalSubjects.length) {
      addFinding(
        report,
        "warnings",
        "goal-path-without-subject-signal",
        `Recommended goal path "${goalPath.slug}" does not currently resolve a subject signal from its topic/track/concept steps.`,
        `content/catalog/recommended-goal-paths.json#${goalPath.slug}`,
      );
    }
  }

  for (const concept of concepts) {
    const content = readJson(repoRoot, `content/concepts/${concept.contentFile}.json`);
    const featuredSetups = content.pageFramework?.featuredSetups ?? [];
    if (featuredSetups.length) {
      report.summary.featuredSetupConceptCount += 1;
    }

    if (featuredSetups.some((entry) => entry.setup?.interactionMode === "compare")) {
      report.summary.compareFeaturedSetupConceptCount += 1;
    }

    const controlsByParam = new Map(
      (content.simulation?.controls ?? []).map((control) => [control.param, control]),
    );
    const presetIds = new Set((content.simulation?.presets ?? []).map((preset) => preset.id));
    const graphIds = new Set((content.graphs ?? []).map((graph) => graph.id));
    const overlayIds = new Set((content.simulation?.overlays ?? []).map((overlay) => overlay.id));

    for (const setup of featuredSetups) {
      checkFeaturedSetupPayload({
        concept,
        setup,
        controlsByParam,
        presetIds,
        graphIds,
        overlayIds,
        report,
      });
    }
  }

  for (const relativePath of SUBJECT_ASSUMPTION_SCAN_FILES) {
    const absolutePath = path.join(repoRoot, relativePath);
    if (!fs.existsSync(absolutePath)) {
      continue;
    }

    const source = readText(repoRoot, relativePath);

    for (const check of SUBJECT_ASSUMPTION_PATTERNS) {
      if (check.pattern.test(source)) {
        addFinding(
          report,
          "warnings",
          check.id,
          check.message,
          relativePath,
        );
      }
    }
  }

  return report;
}

function formatFindings(findings) {
  return findings.map((finding) => {
    const location = finding.location ? ` (${finding.location})` : "";
    return `- [${finding.code}] ${finding.message}${location}`;
  });
}

function printContentDoctorReport(report) {
  const lines = [];

  lines.push("Open Model Lab content doctor");
  lines.push("");
  lines.push(
    `Subjects ${report.summary.subjectCount} | Topics ${report.summary.topicCount} | Starter tracks ${report.summary.starterTrackCount} | Goal paths ${report.summary.goalPathCount}`,
  );
  lines.push(
    `Concepts ${report.summary.conceptCount} (${report.summary.publishedConceptCount} published) | Featured setups ${report.summary.featuredSetupConceptCount} | Compare-featured ${report.summary.compareFeaturedSetupConceptCount}`,
  );
  lines.push(`Subjects: ${report.summary.subjects.join(", ")}`);
  lines.push("");

  if (report.findings.errors.length) {
    lines.push("Errors");
    lines.push(...formatFindings(report.findings.errors));
    lines.push("");
  }

  if (report.findings.warnings.length) {
    lines.push("Warnings");
    lines.push(...formatFindings(report.findings.warnings));
    lines.push("");
  }

  if (!report.findings.errors.length && !report.findings.warnings.length) {
    lines.push("No content doctor findings.");
  }

  return lines.join("\n");
}

export { buildContentDoctorReport, printContentDoctorReport, parseCliArgs };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const options = parseCliArgs(process.argv.slice(2));

    if (options.help) {
      console.log(buildUsageText());
      process.exit(0);
    }

    const report = buildContentDoctorReport(options.root);

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(printContentDoctorReport(report));
    }

    const hasWarnings = report.findings.warnings.length > 0;
    const hasErrors = report.findings.errors.length > 0;
    process.exit(hasErrors || (options.failOnWarnings && hasWarnings) ? 1 : 0);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
