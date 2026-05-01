import { describe, expect, it } from "vitest";
import {
  getConceptBySlug,
  getReadNextRecommendations,
  getStarterTrackBySlug,
  getStarterTrackMembershipsForConcept,
  getTopicDiscoverySummaryBySlug,
} from "@/lib/content";

describe("computer-science graph traversal cluster wiring", () => {
  it("threads the graph-traversal concepts through the existing CS topic and starter track", () => {
    const graphRepresentation = getConceptBySlug("graph-representation-and-adjacency-intuition");
    const bfs = getConceptBySlug("breadth-first-search-and-layered-frontiers");
    const dfs = getConceptBySlug("depth-first-search-and-backtracking-paths");
    const frontierState = getConceptBySlug("frontier-and-visited-state-on-graphs");
    const topic = getTopicDiscoverySummaryBySlug("algorithms-and-search");
    const track = getStarterTrackBySlug("algorithms-and-search-foundations");

    expect(graphRepresentation.topic).toBe("Algorithms and Search");
    expect(graphRepresentation.prerequisites).toEqual([
      "binary-search-halving-the-search-space",
    ]);
    expect(bfs.prerequisites).toEqual(["graph-representation-and-adjacency-intuition"]);
    expect(dfs.prerequisites).toEqual(["graph-representation-and-adjacency-intuition"]);
    expect(frontierState.prerequisites).toEqual([
      "breadth-first-search-and-layered-frontiers",
      "depth-first-search-and-backtracking-paths",
    ]);
    expect(graphRepresentation.simulation.kind).toBe("graph-traversal");
    expect(bfs.simulation.kind).toBe("graph-traversal");
    expect(dfs.simulation.kind).toBe("graph-traversal");
    expect(frontierState.simulation.kind).toBe("graph-traversal");
    expect(topic.featuredConcepts.map((concept) => concept.slug)).toEqual([
      "sorting-and-algorithmic-trade-offs",
      "binary-search-halving-the-search-space",
      "graph-representation-and-adjacency-intuition",
      "breadth-first-search-and-layered-frontiers",
    ]);
    expect(track.concepts.map((concept) => concept.slug)).toEqual([
      "sorting-and-algorithmic-trade-offs",
      "binary-search-halving-the-search-space",
      "graph-representation-and-adjacency-intuition",
      "breadth-first-search-and-layered-frontiers",
      "depth-first-search-and-backtracking-paths",
      "frontier-and-visited-state-on-graphs",
    ]);
    expect(track.checkpoints.map((checkpoint) => checkpoint.id)).toEqual([
      "algorithms-search-sorting-checkpoint",
      "algorithms-search-binary-checkpoint",
    ]);
  });

  it("keeps the new graph concepts authored around one shared traversal bench", () => {
    const graphRepresentation = getConceptBySlug("graph-representation-and-adjacency-intuition");
    const bfs = getConceptBySlug("breadth-first-search-and-layered-frontiers");
    const dfs = getConceptBySlug("depth-first-search-and-backtracking-paths");
    const frontierState = getConceptBySlug("frontier-and-visited-state-on-graphs");

    expect(graphRepresentation.pageFramework?.featuredSetups?.map((setup) => setup.id)).toEqual([
      "layered-campus-neighborhood",
      "hub-detours-center",
    ]);
    expect(bfs.pageFramework?.featuredSetups?.map((setup) => setup.id)).toEqual([
      "layered-campus-bfs",
      "hub-detours-bfs",
    ]);
    expect(dfs.pageFramework?.featuredSetups?.map((setup) => setup.id)).toEqual([
      "layered-campus-dfs",
      "bridge-cycle-dfs",
    ]);
    expect(frontierState.pageFramework?.featuredSetups?.map((setup) => setup.id)).toEqual([
      "bridge-cycle-bfs",
      "bridge-cycle-dfs",
    ]);
    expect(bfs.noticePrompts?.items.map((item) => item.id)).toEqual([
      "bfs-notice-shallow-before-deep",
      "bfs-notice-frontier-can-widen-first",
    ]);
    expect(dfs.predictionMode?.items[0]).toMatchObject({
      id: "dfs-predict-newest-goes-next",
      apply: {
        presetId: "layered-campus-dfs",
      },
    });
    expect(frontierState.quickTest?.questions.map((question) => question.id)).toEqual([
      "fvsg-qt-frontier-vs-visited",
      "fvsg-qt-repeat-skip",
      "fvsg-qt-frontier-not-finished",
      "fvsg-qt-repeat-skip-why",
      "fvsg-qt-current-node",
    ]);
  });

  it("keeps read-next and track membership moving from list search into graph traversal", () => {
    expect(
      getReadNextRecommendations("binary-search-halving-the-search-space")[0],
    ).toMatchObject({
      slug: "graph-representation-and-adjacency-intuition",
      reasonKind: "curated",
    });
    expect(getReadNextRecommendations("graph-representation-and-adjacency-intuition")[0]).toMatchObject(
      {
        slug: "breadth-first-search-and-layered-frontiers",
        reasonKind: "curated",
      },
    );
    expect(getReadNextRecommendations("breadth-first-search-and-layered-frontiers")[0]).toMatchObject(
      {
        slug: "depth-first-search-and-backtracking-paths",
        reasonKind: "curated",
      },
    );
    expect(getReadNextRecommendations("depth-first-search-and-backtracking-paths")[0]).toMatchObject(
      {
        slug: "frontier-and-visited-state-on-graphs",
        reasonKind: "curated",
      },
    );
    expect(
      getStarterTrackMembershipsForConcept("frontier-and-visited-state-on-graphs").map(
        (membership) => membership.track.slug,
      ),
    ).toEqual(["algorithms-and-search-foundations"]);
    expect(getStarterTrackMembershipsForConcept("graph-representation-and-adjacency-intuition")[0]).toMatchObject(
      {
        stepIndex: 2,
        totalSteps: 6,
        previousConcept: { slug: "binary-search-halving-the-search-space" },
        nextConcept: { slug: "breadth-first-search-and-layered-frontiers" },
      },
    );
  });
});
