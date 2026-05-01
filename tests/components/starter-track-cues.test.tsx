// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StarterTrackCues } from "@/components/concepts/StarterTrackCues";
import { getConceptBySlug, getStarterTrackMembershipsForConcept } from "@/lib/content";
import { localConceptProgressStore } from "@/lib/progress";

describe("StarterTrackCues", () => {
  afterEach(() => {
    window.localStorage.clear();
    localConceptProgressStore.resetForTests();
  });

  it("hydrates synced starter-track progress for a concept route before local browser state exists", () => {
    const concept = getConceptBySlug("vectors-components");
    const memberships = getStarterTrackMembershipsForConcept(concept.slug);

    render(
      <StarterTrackCues
        memberships={memberships}
        initialSyncedSnapshot={{
          version: 1,
          concepts: {
            "vectors-components": {
              conceptId: "concept-vectors-components",
              slug: "vectors-components",
              firstVisitedAt: "2026-03-27T10:00:00.000Z",
              lastVisitedAt: "2026-03-27T10:05:00.000Z",
              manualCompletedAt: "2026-03-27T10:05:00.000Z",
            },
          },
        }}
        variant="compact"
      />,
    );

    expect(screen.getAllByText(/^Synced$/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/projectile motion is the next concept in this track\./i),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: /track recap/i })
        .some((link) => link.getAttribute("href") === "/tracks/motion-and-circular-motion?mode=recap"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: /open next concept/i })
        .some((link) => link.getAttribute("href") === "/concepts/projectile-motion"),
    ).toBe(true);
  });

  it("prioritizes the bridge cue when the shared vectors path already has in-sequence math progress", () => {
    const concept = getConceptBySlug("vectors-components");
    const memberships = getStarterTrackMembershipsForConcept(concept.slug);

    render(
      <StarterTrackCues
        memberships={memberships}
        initialSyncedSnapshot={{
          version: 1,
          concepts: {
            "vectors-in-2d": {
              conceptId: "concept-vectors-in-2d",
              slug: "vectors-in-2d",
              manualCompletedAt: "2026-04-02T09:00:00.000Z",
              lastVisitedAt: "2026-04-02T09:05:00.000Z",
            },
            "vectors-components": {
              conceptId: "concept-vectors-components",
              slug: "vectors-components",
              manualCompletedAt: "2026-04-02T10:00:00.000Z",
              lastVisitedAt: "2026-04-02T10:05:00.000Z",
            },
          },
        }}
        variant="compact"
      />,
    );

    expect(screen.getByRole("link", { name: /vectors and motion bridge/i })).toHaveAttribute(
      "href",
      "/tracks/vectors-and-motion-bridge",
    );
    expect(screen.getByText(/also appears in motion and circular motion\./i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open checkpoint/i })).toHaveAttribute(
      "href",
      "/concepts/vectors-components?challenge=vc-ch-equal-components#challenge-mode",
    );
  });

  it("surfaces the modern-physics starter-track handoff on its concept pages", () => {
    const concept = getConceptBySlug("photoelectric-effect");
    const memberships = getStarterTrackMembershipsForConcept(concept.slug);

    render(
      <StarterTrackCues
        memberships={memberships}
        initialSyncedSnapshot={{
          version: 1,
          concepts: {
            "photoelectric-effect": {
              conceptId: "concept-photoelectric-effect",
              slug: "photoelectric-effect",
              firstVisitedAt: "2026-03-31T08:00:00.000Z",
              lastVisitedAt: "2026-03-31T08:05:00.000Z",
              manualCompletedAt: "2026-03-31T08:05:00.000Z",
            },
          },
        }}
        variant="compact"
      />,
    );

    expect(screen.getByText(/^Synced$/i)).toBeInTheDocument();
    expect(
      screen.getByText(/atomic spectra is the next concept in this track\./i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /track recap/i })).toHaveAttribute(
      "href",
      "/tracks/modern-physics?mode=recap",
    );
    expect(screen.getByRole("link", { name: /open next concept/i })).toHaveAttribute(
      "href",
      "/concepts/atomic-spectra",
    );
  });

  it("surfaces the wave-optics starter-track handoff on optics concept pages", () => {
    const concept = getConceptBySlug("polarization");
    const memberships = getStarterTrackMembershipsForConcept(concept.slug);

    render(
      <StarterTrackCues
        memberships={memberships}
        initialSyncedSnapshot={{
          version: 1,
          concepts: {
            polarization: {
              conceptId: "concept-polarization",
              slug: "polarization",
              firstVisitedAt: "2026-03-31T08:00:00.000Z",
              lastVisitedAt: "2026-03-31T08:05:00.000Z",
              manualCompletedAt: "2026-03-31T08:05:00.000Z",
            },
          },
        }}
        variant="compact"
      />,
    );

    expect(screen.getByText(/^Synced$/i)).toBeInTheDocument();
    expect(
      screen.getByText(/diffraction is the next concept in this track\./i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /track recap/i })).toHaveAttribute(
      "href",
      "/tracks/wave-optics?mode=recap",
    );
    expect(screen.getByRole("link", { name: /open next concept/i })).toHaveAttribute(
      "href",
      "/concepts/diffraction",
    );
  });
});
