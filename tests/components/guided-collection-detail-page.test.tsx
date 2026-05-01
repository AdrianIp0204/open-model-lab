// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GuidedCollectionDetailPage } from "@/components/guided/GuidedCollectionDetailPage";
import { getGuidedCollectionBySlug } from "@/lib/content";
import { resolveGuidedCollectionConceptBundle } from "@/lib/guided/concept-bundles";
import {
  localConceptProgressStore,
  markConceptCompleted,
  recordChallengeStarted,
} from "@/lib/progress";

async function openDisclosure(user: ReturnType<typeof userEvent.setup>, label: RegExp) {
  const summary = screen.getByText(label).closest("summary");
  expect(summary).not.toBeNull();
  await user.click(summary!);
}

describe("GuidedCollectionDetailPage", () => {
  afterEach(() => {
    window.localStorage.clear();
    localConceptProgressStore.resetForTests();
  });

  it(
    "renders the authored collection context with one visible primary CTA and collapsed secondary details",
    async () => {
      const user = userEvent.setup();

      render(
        <GuidedCollectionDetailPage
          collection={getGuidedCollectionBySlug("electricity-bridge-lesson-set")}
        />,
      );

      expect(
        screen.getByRole("heading", { name: /electricity bridge lesson set/i, level: 1 }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/check the bridge before you replay the whole launch/i),
      ).toBeInTheDocument();
      expect(screen.getByTestId("guided-detail-primary-cta")).toBeInTheDocument();
      expect(screen.queryByRole("navigation", { name: /sections/i })).not.toBeInTheDocument();
      expect(
        screen.getByText(/teacher wants tighter control over the early field-to-voltage transition/i),
      ).not.toBeVisible();
      expect(screen.getByRole("button", { name: /copy collection page link/i })).not.toBeVisible();
      expect(screen.getByRole("button", { name: /copy ordered steps link/i })).not.toBeVisible();

      await openDisclosure(user, /about this guided path/i);

      expect(
        screen.getByText(/teacher wants tighter control over the early field-to-voltage transition/i),
      ).toBeInTheDocument();

      await openDisclosure(user, /share or assign this path/i);

      expect(screen.getByRole("button", { name: /copy collection page link/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /copy ordered steps link/i })).toBeInTheDocument();
      expect(
        screen
          .getAllByRole("link", { name: /open topic page/i })
          .every((link) => link.getAttribute("href") === "/concepts/topics/electricity"),
      ).toBe(true);
    },
    10000,
  );

  it("uses synced progress when this browser has no local history", () => {
    render(
      <GuidedCollectionDetailPage
        collection={getGuidedCollectionBySlug("waves-evidence-loop")}
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
              firstVisitedAt: "2026-03-25T08:20:00.000Z",
              lastVisitedAt: "2026-03-25T08:20:00.000Z",
              startedChallenges: {
                "wi-ch-find-dark-band": "2026-03-25T08:21:00.000Z",
              },
            },
          },
        }}
      />,
    );

    expect(screen.getByText(/synced progress/i)).toBeInTheDocument();
    expect(screen.getByText(/synced guided progress/i)).toBeInTheDocument();
    expect(screen.getByText("Last active Mar 25")).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: /continue challenge/i })
        .some(
          (link) =>
            link.getAttribute("href") ===
            "/concepts/wave-interference?challenge=wi-ch-find-dark-band#challenge-mode",
        ),
    ).toBe(true);
  });

  it("formats synced guided dates in zh-HK when a localized collection page is rendered", () => {
    render(
      <GuidedCollectionDetailPage
        locale="zh-HK"
        collection={getGuidedCollectionBySlug("waves-evidence-loop")}
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
              firstVisitedAt: "2026-03-25T08:20:00.000Z",
              lastVisitedAt: "2026-03-25T08:20:00.000Z",
              startedChallenges: {
                "wi-ch-find-dark-band": "2026-03-25T08:21:00.000Z",
              },
            },
          },
        }}
      />,
    );

    expect(screen.getByText("已同步引導進度")).toBeInTheDocument();
    expect(screen.getByText("最近活動：3月25日")).toBeInTheDocument();
  });

  it("advances the highlighted step once earlier concept progress is already saved locally", () => {
    markConceptCompleted({
      id: "concept-electric-fields",
      slug: "electric-fields",
      title: "Electric Fields",
    });
    recordChallengeStarted(
      {
        id: "concept-electric-potential",
        slug: "electric-potential",
        title: "Electric Potential",
      },
      "ep-ch-positive-midpoint-plateau",
    );

    render(
      <GuidedCollectionDetailPage
        collection={getGuidedCollectionBySlug("electricity-bridge-lesson-set")}
      />,
    );

    expect(screen.getByText(/challenge mode has already been opened for this step/i)).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: /continue challenge/i })
        .some(
          (link) =>
            link.getAttribute("href") ===
            "/concepts/electric-potential?challenge=ep-ch-positive-midpoint-plateau#challenge-mode",
        ),
    ).toBe(true);
  });

  it("can recommend a later collection step when the diagnostic bridge is already ready", () => {
    render(
      <GuidedCollectionDetailPage
        collection={getGuidedCollectionBySlug("electricity-to-magnetism-bridge")}
        initialSyncedSnapshot={{
          version: 1,
          concepts: {
            "magnetic-fields": {
              conceptId: "concept-magnetic-fields",
              slug: "magnetic-fields",
              usedChallengeModeAt: "2026-03-29T10:00:00.000Z",
              startedChallenges: {
                "mf-ch-build-upward-bridge": "2026-03-29T10:00:00.000Z",
              },
              completedChallenges: {
                "mf-ch-build-upward-bridge": "2026-03-29T10:04:00.000Z",
              },
            },
            "electromagnetic-induction": {
              conceptId: "concept-electromagnetic-induction",
              slug: "electromagnetic-induction",
              usedChallengeModeAt: "2026-03-29T10:08:00.000Z",
              startedChallenges: {
                "emi-ch-high-flux-zero-emf": "2026-03-29T10:08:00.000Z",
              },
              completedChallenges: {
                "emi-ch-high-flux-zero-emf": "2026-03-29T10:12:00.000Z",
              },
            },
          },
        }}
      />,
    );

    expect(screen.getAllByText(/skip ahead/i).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", {
        name: /skip to add maxwell's four-law synthesis as the capstone concept/i,
      }),
    ).toHaveAttribute("href", "/concepts/maxwells-equations-synthesis");
  });

  it("renders a shared concept bundle preview and launch order on the guided collection page", async () => {
    const user = userEvent.setup();
    const collection = getGuidedCollectionBySlug("waves-evidence-loop");
    const activeBundle = resolveGuidedCollectionConceptBundle(collection, {
      id: "bundle-waves-core",
      title: "Waves core bundle",
      summary: "Keep the topic map, track, and interference checkpoint in one compact link.",
      stepIds: [
        "waves-topic-route",
        "waves-starter-track",
        "waves-dark-band-challenge",
      ],
      launchStepId: "waves-starter-track",
    });

    render(
      <GuidedCollectionDetailPage
        collection={collection}
        activeBundle={activeBundle}
      />,
    );

    await openDisclosure(user, /share or assign this path/i);

    expect(screen.getByRole("heading", { name: /package a compact launch path/i })).toBeInTheDocument();
    expect(screen.getByText(/shared bundle/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /launch bundle/i })).toHaveAttribute(
      "href",
      "/tracks/waves",
    );
    expect(screen.getByRole("button", { name: /copy concept bundle link/i })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /save the current bundle selection as a stable assignment link/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/waves core bundle/i)).toBeInTheDocument();
  });
});
