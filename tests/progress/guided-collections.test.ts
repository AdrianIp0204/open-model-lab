import { describe, expect, it } from "vitest";
import { getGuidedCollectionBySlug } from "@/lib/content";
import { resolveGuidedCollectionAssignment } from "@/lib/guided/assignments";
import { resolveGuidedCollectionConceptBundle } from "@/lib/guided/concept-bundles";
import {
  createEmptyProgressSnapshot,
  getGuidedCollectionAssignmentProgressSummary,
  getGuidedConceptBundleProgressSummary,
  getGuidedCollectionProgressSummary,
  normalizeProgressSnapshot,
} from "@/lib/progress";

describe("guided collection progress", () => {
  it("starts on the first authored step before any saved progress exists", () => {
    const collection = getGuidedCollectionBySlug("electricity-bridge-lesson-set");
    const summary = getGuidedCollectionProgressSummary(
      createEmptyProgressSnapshot(),
      collection,
    );

    expect(summary.status).toBe("not-started");
    expect(summary.nextStep?.step.id).toBe("electricity-topic-route");
    expect(summary.stepProgress[0]).toMatchObject({
      status: "not-started",
      primaryAction: {
        href: "/concepts/topics/electricity",
        label: "Open topic page",
      },
    });
  });

  it("moves the next step forward once the early concept work is already saved", () => {
    const collection = getGuidedCollectionBySlug("electricity-bridge-lesson-set");
    const summary = getGuidedCollectionProgressSummary(
      normalizeProgressSnapshot({
        version: 1,
        concepts: {
          "electric-fields": {
            conceptId: "concept-electric-fields",
            slug: "electric-fields",
            manualCompletedAt: "2026-03-25T08:00:00.000Z",
          },
          "electric-potential": {
            conceptId: "concept-electric-potential",
            slug: "electric-potential",
            firstVisitedAt: "2026-03-25T09:00:00.000Z",
            lastVisitedAt: "2026-03-25T09:00:00.000Z",
          },
        },
      }),
      collection,
    );

    expect(summary.status).toBe("in-progress");
    expect(summary.nextStep?.step.id).toBe("electric-potential-concept");
    expect(summary.stepProgress[0].status).toBe("completed");
    expect(summary.stepProgress[1].status).toBe("completed");
    expect(summary.stepProgress[2]).toMatchObject({
      status: "in-progress",
      primaryAction: {
        href: "/concepts/electric-potential",
        label: "Continue concept",
      },
    });
  });

  it("treats a finished track and solved challenge as a completed collection when the remaining surfaces are satisfied", () => {
    const collection = getGuidedCollectionBySlug("waves-evidence-loop");
    const summary = getGuidedCollectionProgressSummary(
      normalizeProgressSnapshot({
        version: 1,
        concepts: {
          "simple-harmonic-motion": {
            conceptId: "concept-shm",
            slug: "simple-harmonic-motion",
            manualCompletedAt: "2026-03-25T08:00:00.000Z",
          },
          "wave-speed-wavelength": {
            conceptId: "concept-wave-speed-wavelength",
            slug: "wave-speed-wavelength",
            manualCompletedAt: "2026-03-25T08:10:00.000Z",
          },
          "sound-waves-longitudinal-motion": {
            conceptId: "concept-sound-waves-longitudinal-motion",
            slug: "sound-waves-longitudinal-motion",
            manualCompletedAt: "2026-03-25T08:15:00.000Z",
          },
          "pitch-frequency-loudness-intensity": {
            conceptId: "concept-pitch-frequency-loudness-intensity",
            slug: "pitch-frequency-loudness-intensity",
            manualCompletedAt: "2026-03-25T08:18:00.000Z",
          },
          beats: {
            conceptId: "concept-beats",
            slug: "beats",
            manualCompletedAt: "2026-03-25T08:18:30.000Z",
          },
          "doppler-effect": {
            conceptId: "concept-doppler-effect",
            slug: "doppler-effect",
            manualCompletedAt: "2026-03-25T08:19:00.000Z",
          },
          "wave-interference": {
            conceptId: "concept-wave-interference",
            slug: "wave-interference",
            manualCompletedAt: "2026-03-25T08:20:00.000Z",
            completedChallenges: {
              "wi-ch-find-dark-band": "2026-03-25T08:21:00.000Z",
            },
          },
          "standing-waves": {
            conceptId: "concept-standing-waves",
            slug: "standing-waves",
            manualCompletedAt: "2026-03-25T08:30:00.000Z",
            completedChallenges: {
              "sw-ch-probe-on-node": "2026-03-25T08:31:00.000Z",
            },
          },
          "resonance-air-columns-open-closed-pipes": {
            conceptId: "concept-resonance-air-columns-open-closed-pipes",
            slug: "resonance-air-columns-open-closed-pipes",
            manualCompletedAt: "2026-03-25T08:40:00.000Z",
          },
        },
      }),
      collection,
    );

    expect(summary.status).toBe("completed");
    expect(summary.completedStepCount).toBe(summary.totalSteps);
    expect(summary.stepProgress[2]).toMatchObject({
      status: "completed",
      primaryAction: {
        href: "/concepts/wave-interference?challenge=wi-ch-find-dark-band#challenge-mode",
        label: "Review challenge",
      },
    });
  });

  it("derives bundle progress from the same canonical concept, track, and challenge facts", () => {
    const collection = getGuidedCollectionBySlug("electricity-bridge-lesson-set");
    const bundle = resolveGuidedCollectionConceptBundle(collection, {
      id: "bundle-electricity-core",
      title: "Electricity core bundle",
      summary: "Fields, voltage, and one challenge checkpoint.",
      stepIds: [
        "electric-fields-concept",
        "electric-potential-concept",
        "electricity-voltage-checkpoint",
      ],
      launchStepId: "electric-potential-concept",
    });

    expect(bundle).not.toBeNull();

    const summary = getGuidedConceptBundleProgressSummary(
      normalizeProgressSnapshot({
        version: 1,
        concepts: {
          "electric-fields": {
            conceptId: "concept-electric-fields",
            slug: "electric-fields",
            manualCompletedAt: "2026-03-25T08:00:00.000Z",
          },
          "electric-potential": {
            conceptId: "concept-electric-potential",
            slug: "electric-potential",
            firstVisitedAt: "2026-03-25T08:15:00.000Z",
            lastVisitedAt: "2026-03-25T08:15:00.000Z",
            startedChallenges: {
              "ep-ch-positive-midpoint-plateau": "2026-03-25T08:20:00.000Z",
            },
          },
        },
      }),
      bundle!,
    );

    expect(summary.status).toBe("in-progress");
    expect(summary.completedStepCount).toBe(1);
    expect(summary.nextStep?.step.id).toBe("electric-potential-concept");
    expect(summary.stepProgress[2]).toMatchObject({
      status: "in-progress",
      primaryAction: {
        href: "/concepts/electric-potential?challenge=ep-ch-positive-midpoint-plateau#challenge-mode",
        label: "Continue challenge",
      },
    });
  });

  it("localizes guided collection step actions when a locale is provided", () => {
    const collection = getGuidedCollectionBySlug("electricity-bridge-lesson-set");
    const summary = getGuidedCollectionProgressSummary(
      createEmptyProgressSnapshot(),
      collection,
      "zh-HK",
    );

    expect(summary.stepProgress[0]).toMatchObject({
      primaryAction: {
        href: "/zh-HK/concepts/topics/electricity",
      },
    });
    expect(summary.stepProgress[1]).toMatchObject({
      primaryAction: {
        href: "/zh-HK/concepts/electric-fields",
      },
    });

    const assignment = resolveGuidedCollectionAssignment(collection, {
      id: "a3d5c9a2-0e64-4d21-a923-1cce7ef560a7",
      title: "Electricity bridge assignment",
      summary: "Fields plus one challenge checkpoint.",
      stepIds: ["electric-fields-concept", "electricity-voltage-checkpoint"],
      launchStepId: "electricity-voltage-checkpoint",
      teacherNote: "Use the challenge as the checkpoint handoff.",
      creatorDisplayName: "Teacher",
      createdAt: "2026-03-29T10:00:00.000Z",
      updatedAt: "2026-03-29T10:00:00.000Z",
    });

    const localizedAssignmentSummary = getGuidedCollectionAssignmentProgressSummary(
      normalizeProgressSnapshot({
        version: 1,
        concepts: {
          "electric-fields": {
            conceptId: "concept-electric-fields",
            slug: "electric-fields",
            manualCompletedAt: "2026-03-25T08:00:00.000Z",
          },
          "electric-potential": {
            conceptId: "concept-electric-potential",
            slug: "electric-potential",
            startedChallenges: {
              "ep-ch-positive-midpoint-plateau": "2026-03-25T08:20:00.000Z",
            },
          },
        },
      }),
      assignment!,
      "zh-HK",
    );

    expect(localizedAssignmentSummary.stepProgress[1]).toMatchObject({
      primaryAction: {
        href: "/zh-HK/concepts/electric-potential?challenge=ep-ch-positive-midpoint-plateau#challenge-mode",
      },
      secondaryAction: {
        href: "/zh-HK/concepts/electric-potential",
      },
    });
  });

  it("derives assignment progress from the same canonical concept, track, and challenge facts", () => {
    const collection = getGuidedCollectionBySlug("electricity-bridge-lesson-set");
    const assignment = resolveGuidedCollectionAssignment(collection, {
      id: "a3d5c9a2-0e64-4d21-a923-1cce7ef560a7",
      title: "Electricity bridge assignment",
      summary: "Fields plus one challenge checkpoint.",
      stepIds: ["electric-fields-concept", "electricity-voltage-checkpoint"],
      launchStepId: "electricity-voltage-checkpoint",
      teacherNote: "Use the challenge as the checkpoint handoff.",
      creatorDisplayName: "Teacher",
      createdAt: "2026-03-29T10:00:00.000Z",
      updatedAt: "2026-03-29T10:00:00.000Z",
    });

    expect(assignment).not.toBeNull();

    const summary = getGuidedCollectionAssignmentProgressSummary(
      normalizeProgressSnapshot({
        version: 1,
        concepts: {
          "electric-fields": {
            conceptId: "concept-electric-fields",
            slug: "electric-fields",
            manualCompletedAt: "2026-03-25T08:00:00.000Z",
          },
          "electric-potential": {
            conceptId: "concept-electric-potential",
            slug: "electric-potential",
            startedChallenges: {
              "ep-ch-positive-midpoint-plateau": "2026-03-25T08:20:00.000Z",
            },
          },
        },
      }),
      assignment!,
    );

    expect(summary.status).toBe("in-progress");
    expect(summary.completedStepCount).toBe(1);
    expect(summary.nextStep?.step.id).toBe("electricity-voltage-checkpoint");
    expect(summary.stepProgress[1]).toMatchObject({
      status: "in-progress",
      primaryAction: {
        href: "/concepts/electric-potential?challenge=ep-ch-positive-midpoint-plateau#challenge-mode",
        label: "Continue challenge",
      },
    });
  });
});
