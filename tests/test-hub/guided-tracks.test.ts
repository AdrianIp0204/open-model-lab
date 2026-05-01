import { describe, expect, it } from "vitest";
import { getConceptBySlug } from "@/lib/content";
import {
  buildGuidedTestTracks,
  getPublishedConceptTestCatalog,
  getPublishedPackTestCatalog,
  getPublishedTopicTestCatalog,
  type GuidedTestTrack,
} from "@/lib/test-hub";
import type { ProgressSnapshot } from "@/lib/progress";

const conceptCatalog = getPublishedConceptTestCatalog();
const topicCatalog = getPublishedTopicTestCatalog();
const packCatalog = getPublishedPackTestCatalog();

function expectTrack(track: GuidedTestTrack | undefined) {
  expect(track).toBeTruthy();

  if (!track) {
    throw new Error("Expected guided track to exist");
  }

  return track;
}

describe("guided test tracks", () => {
  it("follows the real published concept order inside each topic track", () => {
    const tracks = buildGuidedTestTracks({
      conceptEntries: conceptCatalog.entries,
      topicEntries: topicCatalog.entries,
      packEntries: packCatalog.entries,
      snapshot: {
        version: 1,
        concepts: {},
        topicTests: {},
        packTests: {},
      },
    });

    const oscillationsTrack = expectTrack(
      tracks.find((track) => track.topicSlug === "oscillations"),
    );

    expect(oscillationsTrack.steps.map((step) => step.kind)).toEqual([
      "concept",
      "concept",
      "concept",
      "topic",
      "pack",
    ]);
    expect(
      oscillationsTrack.steps
        .filter((step) => step.kind === "concept")
        .map((step) => (step.entry.kind === "concept" ? step.entry.conceptSlug : null)),
    ).toEqual([
      "simple-harmonic-motion",
      "oscillation-energy",
      "damping-resonance",
    ]);
  });

  it("uses the topic test as the milestone after the concept sequence is completed", () => {
    const shm = getConceptBySlug("simple-harmonic-motion");
    const energy = getConceptBySlug("oscillation-energy");
    const damping = getConceptBySlug("damping-resonance");
    const snapshot: ProgressSnapshot = {
      version: 1,
      concepts: {
        "simple-harmonic-motion": {
          conceptId: shm.id,
          slug: shm.slug,
          completedQuickTestAt: "2026-04-18T08:05:00.000Z",
          quickTestAttemptCount: 1,
          quickTestLastIncorrectCount: 0,
        },
        "oscillation-energy": {
          conceptId: energy.id,
          slug: energy.slug,
          completedQuickTestAt: "2026-04-18T08:10:00.000Z",
          quickTestAttemptCount: 1,
          quickTestLastIncorrectCount: 0,
        },
        "damping-resonance": {
          conceptId: damping.id,
          slug: damping.slug,
          completedQuickTestAt: "2026-04-18T08:15:00.000Z",
          quickTestAttemptCount: 1,
          quickTestLastIncorrectCount: 0,
        },
      },
      topicTests: {},
      packTests: {},
    };

    const tracks = buildGuidedTestTracks({
      conceptEntries: conceptCatalog.entries,
      topicEntries: topicCatalog.entries,
      packEntries: packCatalog.entries,
      snapshot,
    });

    const oscillationsTrack = expectTrack(
      tracks.find((track) => track.topicSlug === "oscillations"),
    );

    expect(oscillationsTrack.nextStep?.kind).toBe("topic");
    expect(oscillationsTrack.nextStep?.entry).toMatchObject({
      kind: "topic",
      topicSlug: "oscillations",
    });
  });

  it("uses the relevant pack after the topic milestone is completed", () => {
    const shm = getConceptBySlug("simple-harmonic-motion");
    const energy = getConceptBySlug("oscillation-energy");
    const damping = getConceptBySlug("damping-resonance");
    const snapshot: ProgressSnapshot = {
      version: 1,
      concepts: {
        "simple-harmonic-motion": {
          conceptId: shm.id,
          slug: shm.slug,
          completedQuickTestAt: "2026-04-18T08:05:00.000Z",
          quickTestAttemptCount: 1,
          quickTestLastIncorrectCount: 0,
        },
        "oscillation-energy": {
          conceptId: energy.id,
          slug: energy.slug,
          completedQuickTestAt: "2026-04-18T08:10:00.000Z",
          quickTestAttemptCount: 1,
          quickTestLastIncorrectCount: 0,
        },
        "damping-resonance": {
          conceptId: damping.id,
          slug: damping.slug,
          completedQuickTestAt: "2026-04-18T08:15:00.000Z",
          quickTestAttemptCount: 1,
          quickTestLastIncorrectCount: 0,
        },
      },
      topicTests: {
        oscillations: {
          slug: "oscillations",
          completedAt: "2026-04-18T08:20:00.000Z",
          attemptCount: 1,
          lastIncorrectCount: 0,
          lastQuestionCount: 10,
        },
      },
      packTests: {},
    };

    const tracks = buildGuidedTestTracks({
      conceptEntries: conceptCatalog.entries,
      topicEntries: topicCatalog.entries,
      packEntries: packCatalog.entries,
      snapshot,
    });

    const oscillationsTrack = expectTrack(
      tracks.find((track) => track.topicSlug === "oscillations"),
    );

    expect(oscillationsTrack.nextStep?.kind).toBe("pack");
    expect(oscillationsTrack.nextStep?.entry).toMatchObject({
      kind: "pack",
      packSlug: "physics-connected-models",
    });
  });

  it("shows a completed guided track state when every published step is cleared", () => {
    const shm = getConceptBySlug("simple-harmonic-motion");
    const energy = getConceptBySlug("oscillation-energy");
    const damping = getConceptBySlug("damping-resonance");
    const snapshot: ProgressSnapshot = {
      version: 1,
      concepts: {
        "simple-harmonic-motion": {
          conceptId: shm.id,
          slug: shm.slug,
          completedQuickTestAt: "2026-04-18T08:05:00.000Z",
          quickTestAttemptCount: 1,
          quickTestLastIncorrectCount: 0,
        },
        "oscillation-energy": {
          conceptId: energy.id,
          slug: energy.slug,
          completedQuickTestAt: "2026-04-18T08:10:00.000Z",
          quickTestAttemptCount: 1,
          quickTestLastIncorrectCount: 0,
        },
        "damping-resonance": {
          conceptId: damping.id,
          slug: damping.slug,
          completedQuickTestAt: "2026-04-18T08:15:00.000Z",
          quickTestAttemptCount: 1,
          quickTestLastIncorrectCount: 0,
        },
      },
      topicTests: {
        oscillations: {
          slug: "oscillations",
          completedAt: "2026-04-18T08:20:00.000Z",
          attemptCount: 1,
          lastIncorrectCount: 0,
          lastQuestionCount: 10,
        },
      },
      packTests: {
        "physics-connected-models": {
          slug: "physics-connected-models",
          completedAt: "2026-04-18T08:25:00.000Z",
          attemptCount: 1,
          lastIncorrectCount: 0,
          lastQuestionCount: 16,
        },
      },
    };

    const tracks = buildGuidedTestTracks({
      conceptEntries: conceptCatalog.entries,
      topicEntries: topicCatalog.entries,
      packEntries: packCatalog.entries,
      snapshot,
    });

    const oscillationsTrack = expectTrack(
      tracks.find((track) => track.topicSlug === "oscillations"),
    );

    expect(oscillationsTrack.completedStepCount).toBe(5);
    expect(oscillationsTrack.nextStep).toBeNull();
  });
});
