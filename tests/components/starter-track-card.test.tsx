// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StarterTrackCard } from "@/components/concepts/StarterTrackCard";
import { getStarterTrackBySlug } from "@/lib/content";
import {
  createEmptyProgressSnapshot,
  localConceptProgressStore,
  markConceptCompleted,
  recordChallengeCompleted,
  recordConceptVisit,
  recordQuickTestCompleted,
} from "@/lib/progress";

describe("StarterTrackCard", () => {
  afterEach(() => {
    window.localStorage.clear();
    localConceptProgressStore.resetForTests();
  });

  it("renders the starter track path and starts from the first concept by default", () => {
    render(<StarterTrackCard track={getStarterTrackBySlug("motion-and-circular-motion")} />);

    expect(screen.getByRole("heading", { name: /motion and circular motion/i })).toBeInTheDocument();
    expect(screen.getByText("0 / 5 moments complete")).toBeInTheDocument();
    expect(screen.getByText("0 / 3 concepts and 0 / 2 checkpoints cleared.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /start track/i })).toHaveAttribute(
      "href",
      "/tracks/motion-and-circular-motion",
    );
    expect(screen.getByRole("link", { name: /jump to vectors/i })).toHaveAttribute(
      "href",
      "/concepts/vectors-components",
    );
  });

  it("switches to continue mode when local progress already exists", () => {
    recordConceptVisit({
      id: "concept-wave-interference",
      slug: "wave-interference",
      title: "Wave Interference",
    });

    render(<StarterTrackCard track={getStarterTrackBySlug("waves")} />);

    expect(screen.getByRole("link", { name: /continue track/i })).toHaveAttribute(
      "href",
      "/tracks/waves",
    );
    expect(screen.getByRole("link", { name: /open recap/i })).toHaveAttribute(
      "href",
      "/tracks/waves?mode=recap",
    );
    expect(screen.getByText("0 / 11 moments complete")).toBeInTheDocument();
  });

  it("renders signed-in synced track progress when the browser is still empty", () => {
    const syncedSnapshot = createEmptyProgressSnapshot();
    syncedSnapshot.concepts["vectors-components"] = {
      conceptId: "concept-vectors-components",
      slug: "vectors-components",
      firstVisitedAt: "2026-03-29T09:30:00.000Z",
      lastVisitedAt: "2026-03-29T09:30:00.000Z",
    };

    render(
      <StarterTrackCard
        track={getStarterTrackBySlug("motion-and-circular-motion")}
        initialSyncedSnapshot={syncedSnapshot}
      />,
    );

    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /continue track/i })).toHaveAttribute(
      "href",
      "/tracks/motion-and-circular-motion",
    );
    expect(screen.getByRole("link", { name: /open recap/i })).toHaveAttribute(
      "href",
      "/tracks/motion-and-circular-motion?mode=recap",
    );
  });

  it("renders compact progress for the expanded magnetic track", () => {
    render(<StarterTrackCard track={getStarterTrackBySlug("magnetic-fields")} />);

    expect(screen.getByRole("heading", { name: /^magnetism$/i })).toBeInTheDocument();
    expect(screen.getByText("0 / 6 moments complete")).toBeInTheDocument();
    expect(screen.getByText("0 / 3 concepts and 0 / 3 checkpoints cleared.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /start track/i })).toHaveAttribute(
      "href",
      "/tracks/magnetic-fields",
    );
    expect(screen.getByRole("link", { name: /jump to b-fields/i })).toHaveAttribute(
      "href",
      "/concepts/magnetic-fields",
    );
  });

  it("links completed tracks to the completion page", () => {
    recordQuickTestCompleted({
      id: "concept-shm",
      slug: "simple-harmonic-motion",
      title: "Simple Harmonic Motion",
    });
    markConceptCompleted({
      id: "concept-shm",
      slug: "simple-harmonic-motion",
      title: "Simple Harmonic Motion",
    });
    recordQuickTestCompleted({
      id: "concept-oscillation-energy",
      slug: "oscillation-energy",
      title: "Oscillation and Energy",
    });
    markConceptCompleted({
      id: "concept-oscillation-energy",
      slug: "oscillation-energy",
      title: "Oscillation and Energy",
    });
    recordChallengeCompleted(
      {
        id: "concept-oscillation-energy",
        slug: "oscillation-energy",
        title: "Oscillation and Energy",
      },
      "oe-ch-equal-split",
    );
    recordQuickTestCompleted({
      id: "concept-damping-resonance",
      slug: "damping-resonance",
      title: "Damping and Resonance",
    });
    markConceptCompleted({
      id: "concept-damping-resonance",
      slug: "damping-resonance",
      title: "Damping and Resonance",
    });
    recordChallengeCompleted(
      {
        id: "concept-damping-resonance",
        slug: "damping-resonance",
        title: "Damping and Resonance",
      },
      "dr-ch-lock-near-resonance",
    );

    render(<StarterTrackCard track={getStarterTrackBySlug("oscillations-and-energy")} />);

    expect(screen.getByRole("link", { name: /track completion/i })).toHaveAttribute(
      "href",
      "/tracks/oscillations-and-energy/complete",
    );
    expect(screen.getByRole("link", { name: /open recap/i })).toHaveAttribute(
      "href",
      "/tracks/oscillations-and-energy?mode=recap",
    );
  });
});
