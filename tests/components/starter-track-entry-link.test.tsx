// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StarterTrackEntryLink } from "@/components/concepts/StarterTrackEntryLink";
import { getStarterTrackBySlug } from "@/lib/content";
import { createEmptyProgressSnapshot, localConceptProgressStore } from "@/lib/progress";

describe("StarterTrackEntryLink", () => {
  afterEach(() => {
    window.localStorage.clear();
    localConceptProgressStore.resetForTests();
  });

  it("uses the synced snapshot on first render when local progress is empty", () => {
    const syncedSnapshot = createEmptyProgressSnapshot();
    syncedSnapshot.concepts["vectors-components"] = {
      conceptId: "concept-vectors-components",
      slug: "vectors-components",
      firstVisitedAt: "2026-03-29T09:30:00.000Z",
      lastVisitedAt: "2026-03-29T09:30:00.000Z",
    };

    render(
      <StarterTrackEntryLink
        track={getStarterTrackBySlug("motion-and-circular-motion")}
        labelVariant="named"
        initialSyncedSnapshot={syncedSnapshot}
      />,
    );

    expect(
      screen.getByRole("link", { name: /continue motion and circular motion/i }),
    ).toHaveAttribute("href", "/tracks/motion-and-circular-motion");
  });
});
