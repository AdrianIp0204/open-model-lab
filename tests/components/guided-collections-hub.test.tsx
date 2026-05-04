// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GuidedCollectionsHub } from "@/components/guided/GuidedCollectionsHub";
import { getGuidedCollectionBySlug } from "@/lib/content";

describe("GuidedCollectionsHub", () => {
  it("uses collection-aware motifs for the featured guided visuals", () => {
    const collection = getGuidedCollectionBySlug("waves-evidence-loop");

    render(<GuidedCollectionsHub guidedCollections={[collection]} goalPaths={[]} />);

    const visuals = screen.getAllByTestId("learning-visual");

    expect(visuals[0]).toHaveAttribute("data-visual-motif", "wave-motion");
    expect(visuals[1]).toHaveAttribute("data-visual-motif", "wave-motion");
    expect(visuals[0].closest("a")).toHaveAttribute("href", collection.path);
  });
});
