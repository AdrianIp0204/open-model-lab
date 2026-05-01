// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AssignmentDetailPage } from "@/components/guided/AssignmentDetailPage";
import { getGuidedCollectionBySlug } from "@/lib/content";
import { resolveGuidedCollectionAssignment } from "@/lib/guided/assignments";
import { localConceptProgressStore } from "@/lib/progress";

describe("AssignmentDetailPage", () => {
  afterEach(() => {
    window.localStorage.clear();
    localConceptProgressStore.resetForTests();
  });

  it("renders a stable assignment entry point with synced progress and learner-facing steps", () => {
    const collection = getGuidedCollectionBySlug("waves-evidence-loop");
    const assignment = resolveGuidedCollectionAssignment(collection, {
      id: "a3d5c9a2-0e64-4d21-a923-1cce7ef560a7",
      title: "Wave evidence assignment",
      summary: "Track plus one interference checkpoint.",
      stepIds: ["waves-starter-track", "waves-dark-band-challenge"],
      launchStepId: "waves-dark-band-challenge",
      teacherNote: "Use the challenge as the discussion handoff.",
      creatorDisplayName: "Teacher",
      createdAt: "2026-03-29T10:00:00.000Z",
      updatedAt: "2026-03-29T10:00:00.000Z",
    });

    render(
      <AssignmentDetailPage
        assignment={assignment!}
        initialSyncedSnapshot={{
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
            "wave-interference": {
              conceptId: "concept-wave-interference",
              slug: "wave-interference",
              startedChallenges: {
                "wi-ch-find-dark-band": "2026-03-25T08:20:00.000Z",
              },
            },
          },
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: /wave evidence assignment/i, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/curator note/i)).toBeInTheDocument();
    expect(screen.getByText(/use the challenge as the discussion handoff/i)).toBeInTheDocument();
    expect(screen.getByText(/synced assignment progress/i)).toBeInTheDocument();
    expect(screen.getByText("Last active Mar 25")).toBeInTheDocument();
    expect(screen.getByText("Updated Mar 29, 10:00 AM UTC")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy assignment page link/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /continue challenge/i })).toHaveAttribute(
      "href",
      "/concepts/wave-interference?challenge=wi-ch-find-dark-band#challenge-mode",
    );
  });

  it("localizes assignment chrome and learner actions in zh-HK", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    const collection = getGuidedCollectionBySlug("waves-evidence-loop");
    const assignment = resolveGuidedCollectionAssignment(collection, {
      id: "a3d5c9a2-0e64-4d21-a923-1cce7ef560a7",
      title: "Wave evidence assignment",
      summary: "Track plus one interference checkpoint.",
      stepIds: ["waves-starter-track", "waves-dark-band-challenge"],
      launchStepId: "waves-dark-band-challenge",
      teacherNote: "Use the challenge as the discussion handoff.",
      creatorDisplayName: "Teacher",
      createdAt: "2026-03-29T10:00:00.000Z",
      updatedAt: "2026-03-29T10:00:00.000Z",
    });

    render(
      <AssignmentDetailPage
        assignment={assignment!}
        initialSyncedSnapshot={{
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
            "wave-interference": {
              conceptId: "concept-wave-interference",
              slug: "wave-interference",
              startedChallenges: {
                "wi-ch-find-dark-band": "2026-03-25T08:20:00.000Z",
              },
            },
          },
        }}
      />,
    );

    expect(screen.getByText("首頁")).toBeInTheDocument();
    expect(screen.getByText("已同步的作業進度")).toBeInTheDocument();
    expect(screen.getByText("上次活動 3月25日")).toBeInTheDocument();
    expect(screen.getByText("更新於 3月29日 上午10:00 [UTC]")).toBeInTheDocument();
    expect(screen.getByText("編排者備註")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "複製作業頁面連結" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "繼續挑戰" })).toHaveAttribute(
      "href",
      "/zh-HK/concepts/wave-interference?challenge=wi-ch-find-dark-band#challenge-mode",
    );
  });
});
