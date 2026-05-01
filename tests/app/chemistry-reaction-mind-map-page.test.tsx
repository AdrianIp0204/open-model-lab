// @vitest-environment jsdom

import { isValidElement, type ReactNode } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/layout/PageShell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import ChemistryReactionMindMapRoute from "@/app/tools/chemistry-reaction-mind-map/page";
import LocalizedChemistryReactionMindMapPage from "@/app/[locale]/tools/chemistry-reaction-mind-map/page";

describe("chemistry reaction mind map route", () => {
  it("shows a useful default inspector state before anything is selected", async () => {
    render(await ChemistryReactionMindMapRoute());

    const defaultState = screen.getByTestId("chemistry-default-state");
    expect(defaultState).toBeInTheDocument();
    expect(
      within(defaultState).getByText(/select a family or pathway/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId("chemistry-selection-summary")).toHaveTextContent(
      /nothing selected yet/i,
    );
  });

  it("renders the chemistry graph and opens node and edge details", async () => {
    const user = userEvent.setup();

    render(await ChemistryReactionMindMapRoute());

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /see how core organic functional-group families connect/i,
      }),
    ).toBeInTheDocument();

    const alcoholNode = screen.getByTestId("chem-node-alcohol");
    expect(alcoholNode).toHaveClass("z-20");

    await user.click(alcoholNode);

    const nodeDetails = screen.getByTestId("chem-node-details");
    expect(nodeDetails).toBeInTheDocument();
    expect(
      within(nodeDetails).getByText(
        /higher than alkanes and haloalkanes of similar size/i,
      ),
    ).toBeInTheDocument();
    expect(nodeDetails.textContent?.replace(/\s+/g, "")).toContain("CnH2n+1OH");
    expect(
      within(nodeDetails).getByLabelText(/CnH2n\+1OH/i),
    ).toBeInTheDocument();

    await user.click(
      screen.getByTestId("chem-edge-alcohol-to-aldehyde-oxidation"),
    );

    const edgeDetails = screen.getByTestId("chem-edge-details");
    expect(edgeDetails).toBeInTheDocument();
    expect(screen.getByText(/primary alcohols only/i)).toBeInTheDocument();
    expect(
      within(edgeDetails).getByLabelText(
        /RCH2OH\(l\) \+ \[O\] -> RCHO\(l\) \+ H2O\(l\)/i,
      ),
    ).toBeInTheDocument();
    expect(
      within(edgeDetails).getByLabelText(
        /CH3CH2OH\(l\) \+ \[O\] -> CH3CHO\(l\) \+ H2O\(l\)/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows incoming and outgoing adjacency sections from the data when a node is selected", async () => {
    const user = userEvent.setup();

    render(await ChemistryReactionMindMapRoute());

    await user.click(screen.getByTestId("chem-node-alcohol"));

    const nodeDetails = screen.getByTestId("chem-node-details");
    expect(
      within(nodeDetails).getByText(/can be made from/i),
    ).toBeInTheDocument();
    expect(
      within(nodeDetails).getByText(/can convert to/i),
    ).toBeInTheDocument();
    expect(
      within(nodeDetails).getByTestId(
        "chem-node-pathway-incoming-alkene-to-alcohol-hydration",
      ),
    ).toHaveTextContent(/from alkene/i);
    expect(
      within(nodeDetails).getByTestId(
        "chem-node-pathway-outgoing-alcohol-to-aldehyde-oxidation",
      ),
    ).toHaveTextContent(/to aldehyde/i);
  });

  it("renders subgroup applicability and multi-reactant context in adjacency items", async () => {
    const user = userEvent.setup();

    render(await ChemistryReactionMindMapRoute());

    await user.click(screen.getByTestId("chem-node-alcohol"));

    expect(
      screen.getByTestId(
        "chem-node-pathway-outgoing-alcohol-to-aldehyde-oxidation",
      ),
    ).toHaveTextContent(/primary alcohols only/i);

    await user.click(screen.getByTestId("chem-node-carboxylic-acid"));

    expect(
      screen.getByTestId(
        "chem-node-pathway-outgoing-carboxylic-acid-to-ester-esterification",
      ),
    ).toHaveTextContent(/alcohol family/i);
  });

  it("moves from a node adjacency item into the selected edge details", async () => {
    const user = userEvent.setup();

    render(await ChemistryReactionMindMapRoute());

    await user.click(screen.getByTestId("chem-node-alcohol"));
    await user.click(
      within(
        screen.getByTestId(
          "chem-node-pathway-outgoing-alcohol-to-aldehyde-oxidation",
        ),
      ).getByRole("button", { name: /oxidation to aldehyde pathway/i }),
    );

    expect(screen.getByTestId("chem-edge-details")).toBeInTheDocument();
    expect(screen.getByTestId("chemistry-selection-summary")).toHaveTextContent(
      /selected pathway: oxidation to aldehyde/i,
    );
  });

  it("offers comparison from a node adjacency item and shows both groups side by side", async () => {
    const user = userEvent.setup();

    render(await ChemistryReactionMindMapRoute());

    await user.click(screen.getByTestId("chem-node-alcohol"));
    await user.click(
      screen.getByTestId(
        "chem-node-compare-outgoing-alcohol-to-aldehyde-oxidation",
      ),
    );

    expect(screen.getByTestId("chemistry-compare-panel")).toBeInTheDocument();
    expect(screen.getByTestId("chemistry-selection-summary")).toHaveTextContent(
      /comparing alcohol with aldehyde/i,
    );
    expect(screen.getByTestId("chem-camera-status")).toHaveTextContent(
      /view: comparing alcohol ↔ aldehyde/i,
    );
    expect(screen.getByTestId("chemistry-graph-viewport")).toHaveAttribute(
      "data-chem-camera-mode",
      "compare",
    );
    expect(screen.getByTestId("chem-scope-status")).toHaveAttribute(
      "data-chem-scope-summary",
      "2 nodes · 2 pathways in active view",
    );
    expect(screen.getByTestId("chem-active-camera-frame")).toHaveAttribute(
      "data-chem-camera-frame",
      "compare",
    );
    expect(screen.getByTestId("chem-mobile-camera-mode")).toHaveTextContent(
      /compare/i,
    );
    expect(
      screen.getByTestId("chem-minimap-camera-mode-label"),
    ).toHaveTextContent(/compare/i);
    expect(screen.getByTestId("chem-compare-column-alcohol")).toHaveTextContent(
      /alcohol/i,
    );
    expect(
      screen.getByTestId("chem-compare-column-aldehyde"),
    ).toHaveTextContent(/aldehyde/i);
    expect(screen.getByTestId("chem-compare-column-alcohol")).toHaveTextContent(
      /boiling point trends/i,
    );
    expect(
      screen.getByTestId("chem-compare-column-aldehyde"),
    ).toHaveTextContent(/solubility trends/i);
  });

  it("supports keyboard selection for nodes and edges", async () => {
    const user = userEvent.setup();

    render(await ChemistryReactionMindMapRoute());

    const nodeButton = screen.getByTestId("chem-node-alcohol");
    act(() => {
      nodeButton.focus();
    });
    await user.keyboard("{Enter}");

    expect(screen.getByTestId("chem-node-details")).toBeInTheDocument();
    expect(screen.getByTestId("chemistry-selection-summary")).toHaveTextContent(
      /selected group: alcohol/i,
    );

    const edgeButton = screen.getByTestId(
      "chem-edge-alcohol-to-aldehyde-oxidation",
    );
    act(() => {
      edgeButton.focus();
    });
    await user.keyboard("{Enter}");

    expect(screen.getByTestId("chem-edge-details")).toBeInTheDocument();
    expect(screen.getByTestId("chemistry-selection-summary")).toHaveTextContent(
      /selected pathway: oxidation to aldehyde/i,
    );
  });

  it("previews connected pathways and groups when graph controls receive focus", async () => {
    render(await ChemistryReactionMindMapRoute());

    const nodeButton = screen.getByTestId("chem-node-alcohol");
    const edgeButton = screen.getByTestId(
      "chem-edge-alcohol-to-aldehyde-oxidation",
    );
    const edgePath = screen.getByTestId(
      "chem-edge-path-alcohol-to-aldehyde-oxidation",
    );

    fireEvent.focus(nodeButton);

    expect(screen.getByTestId("chem-preview-status")).toHaveTextContent(
      /preview: alcohol connects to 7 pathways/i,
    );
    expect(screen.getByTestId("chemistry-graph-viewport")).toHaveAttribute(
      "data-chem-trace-active",
      "true",
    );
    expect(screen.getByTestId("chem-graph-minimap")).toHaveAttribute(
      "data-chem-trace-active",
      "true",
    );
    expect(screen.getByTestId("chem-trace-preview")).toHaveAttribute(
      "data-chem-trace-kind",
      "node",
    );
    expect(screen.getByTestId("chem-trace-preview")).toHaveTextContent(
      /trace.*node.*alcohol.*7 connected pathways.*4 in · 3 out/i,
    );
    expect(edgeButton).toHaveAttribute("data-chem-context", "connected");
    expect(edgeButton).toHaveAttribute("data-chem-hover-context", "node");
    expect(edgeButton).toHaveAttribute("data-chem-layer-priority", "preview");
    expect(edgeButton.getAttribute("style")).toContain("z-index: 36");
    expect(edgeButton).toHaveAttribute("data-chem-label-density", "detailed");
    expect(
      within(edgeButton).getByTestId(
        "chem-edge-endpoints-alcohol-to-aldehyde-oxidation",
      ),
    ).toHaveClass(/block/);
    expect(edgePath).toHaveAttribute("data-chem-context", "connected");
    expect(
      screen.getByTestId("chem-minimap-edge-alcohol-to-aldehyde-oxidation"),
    ).toHaveAttribute("data-chem-hover-context", "node");
    expect(
      screen.getByTestId("chem-minimap-edge-alcohol-to-aldehyde-oxidation"),
    ).toHaveAttribute("data-chem-trace-active", "true");
    expect(screen.getByTestId("chem-minimap-node-alkene")).toHaveAttribute(
      "data-chem-hover-context",
      "node",
    );
    expect(screen.getByTestId("chem-minimap-node-alkene")).toHaveAttribute(
      "data-chem-trace-active",
      "true",
    );
    expect(screen.getByTestId("chem-node-alkene")).toHaveAttribute(
      "data-chem-context",
      "connected",
    );
    expect(screen.getByTestId("chem-node-alkene")).toHaveAttribute(
      "data-chem-layer-priority",
      "connected",
    );
    expect(screen.getByTestId("chem-node-ester")).toHaveAttribute(
      "data-chem-context",
      "dimmed",
    );
    expect(screen.getByTestId("chem-node-ester")).toHaveAttribute(
      "data-chem-layer-priority",
      "dimmed",
    );
    expect(
      screen.getByTestId("chem-edge-carboxylic-acid-to-ester-esterification"),
    ).toHaveAttribute("data-chem-context", "dimmed");
    expect(
      screen.getByTestId("chem-edge-halo-alcohol-to-aldehyde-oxidation"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("chem-edge-direction-alcohol-to-aldehyde-oxidation"),
    ).toHaveAttribute("data-chem-hover-context", "node");

    fireEvent.blur(nodeButton);
    fireEvent.focus(edgeButton);

    expect(screen.getByTestId("chem-preview-status")).toHaveTextContent(
      /preview: alcohol → aldehyde through oxidation to aldehyde/i,
    );
    expect(screen.getByTestId("chem-trace-preview")).toHaveAttribute(
      "data-chem-trace-kind",
      "pathway",
    );
    expect(screen.getByTestId("chem-trace-preview")).toHaveTextContent(
      /trace.*pathway.*oxidation to aldehyde.*alcohol → aldehyde.*oxidation/i,
    );
    expect(edgeButton).toHaveAttribute("data-chem-hover-context", "edge");
    expect(edgeButton).toHaveAttribute("data-chem-layer-priority", "preview");
    expect(
      screen.getByTestId("chem-minimap-edge-alcohol-to-aldehyde-oxidation"),
    ).toHaveAttribute("data-chem-hover-context", "edge");
    expect(screen.getByTestId("chem-minimap-node-alcohol")).toHaveAttribute(
      "data-chem-hover-context",
      "edge",
    );
    expect(screen.getByTestId("chem-node-alcohol")).toHaveAttribute(
      "data-chem-hover-context",
      "edge",
    );
    expect(screen.getByTestId("chem-node-alcohol")).toHaveAttribute(
      "data-chem-layer-priority",
      "preview",
    );
    expect(screen.getByTestId("chem-node-ketone")).toHaveAttribute(
      "data-chem-context",
      "dimmed",
    );
    expect(
      screen.getByTestId("chem-edge-ketone-to-alcohol-reduction"),
    ).toHaveAttribute("data-chem-context", "dimmed");
    expect(screen.getByTestId("chem-node-alcohol")).toHaveAttribute(
      "data-chem-edge-role",
      "source",
    );
    expect(screen.getByTestId("chem-node-alcohol")).toHaveAttribute(
      "data-chem-edge-role-context",
      "previewed-pathway",
    );
    expect(screen.getByTestId("chem-node-edge-role-alcohol")).toHaveTextContent(
      /from/i,
    );
    expect(screen.getByTestId("chem-node-aldehyde")).toHaveAttribute(
      "data-chem-context",
      "connected",
    );
    expect(screen.getByTestId("chem-node-aldehyde")).toHaveAttribute(
      "data-chem-edge-role",
      "target",
    );
    expect(
      screen.getByTestId("chem-node-edge-role-aldehyde"),
    ).toHaveTextContent(/to/i);
  });

  it("keeps source and product roles visible after a pathway is selected", async () => {
    const user = userEvent.setup();

    render(await ChemistryReactionMindMapRoute());

    await user.click(
      screen.getByTestId("chem-edge-alcohol-to-aldehyde-oxidation"),
    );

    expect(screen.getByTestId("chem-node-alcohol")).toHaveAttribute(
      "data-chem-edge-role-context",
      "selected-pathway",
    );
    expect(screen.getByTestId("chem-node-edge-role-alcohol")).toHaveTextContent(
      /from/i,
    );
    expect(
      screen.getByTestId("chem-node-edge-role-aldehyde"),
    ).toHaveTextContent(/to/i);
    expect(
      screen.getByLabelText(
        /alcohol family node\. source side of oxidation to aldehyde pathway/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(
        /aldehyde family node\. product side of oxidation to aldehyde pathway/i,
      ),
    ).toBeInTheDocument();
  });

  it("counter-scales pathway labels so the graph stays readable at fitted zoom", async () => {
    render(await ChemistryReactionMindMapRoute());

    const edgeLabel = screen.getByTestId(
      "chem-edge-alcohol-to-aldehyde-oxidation",
    );

    expect(
      Number(edgeLabel.getAttribute("data-chem-label-scale")),
    ).toBeGreaterThan(1);
    expect(edgeLabel).toHaveStyle({ transformOrigin: "center" });
    expect(edgeLabel).toHaveAttribute("data-chem-layer-priority", "default");
    expect(edgeLabel.getAttribute("style")).toContain("z-index: 10");
    expect(edgeLabel.getAttribute("style")).toContain(
      "translate(-50%, -50%) scale(",
    );
  });

  it("keeps pathway direction visible inside edge labels", async () => {
    render(await ChemistryReactionMindMapRoute());

    const edgeLabel = screen.getByTestId(
      "chem-edge-alcohol-to-aldehyde-oxidation",
    );

    expect(
      within(edgeLabel).getByTestId(
        "chem-edge-endpoints-alcohol-to-aldehyde-oxidation",
      ),
    ).toHaveTextContent(/alcohol → aldehyde/i);
    expect(
      within(edgeLabel).getByTestId(
        "chem-edge-reaction-type-alcohol-to-aldehyde-oxidation",
      ),
    ).toHaveTextContent(/oxidation/i);
    expect(edgeLabel).toHaveAttribute("data-chem-reaction-type", "Oxidation");
    expect(edgeLabel).toHaveAttribute("data-chem-flow-source", "relay");
    expect(edgeLabel).toHaveAttribute("data-chem-flow-target", "product");
    expect(edgeLabel).toHaveAttribute("data-chem-flow-transition", "2→3");
    expect(edgeLabel).toHaveAttribute("data-chem-crosses-flow-band", "true");
    expect(
      within(edgeLabel).getByTestId(
        "chem-edge-flow-transition-alcohol-to-aldehyde-oxidation",
      ),
    ).toHaveTextContent("2→3");
    expect(edgeLabel).toHaveAccessibleName(
      /oxidation to aldehyde pathway from alcohol to aldehyde/i,
    );
    expect(edgeLabel).toHaveAccessibleName(/reaction type: oxidation/i);
  });

  it("shows incoming and outgoing pathway counts on graph nodes", async () => {
    render(await ChemistryReactionMindMapRoute());

    const alcoholNode = screen.getByTestId("chem-node-alcohol");

    expect(alcoholNode).toHaveAttribute("data-chem-pathway-total", "7");
    expect(alcoholNode).toHaveAttribute("data-chem-pathway-incoming", "4");
    expect(alcoholNode).toHaveAttribute("data-chem-pathway-outgoing", "3");
    expect(alcoholNode).toHaveAttribute(
      "data-chem-pathway-bias",
      "incoming-heavy",
    );
    expect(alcoholNode).toHaveAttribute("data-chem-flow-band", "relay");
    expect(alcoholNode).toHaveAttribute("data-chem-flow-order", "2");
    expect(alcoholNode).toHaveAttribute("data-chem-flow-tone", "hub");
    expect(alcoholNode).toHaveAttribute("data-chem-layer-priority", "default");
    expect(alcoholNode.getAttribute("style")).toContain("z-index: 20");
    expect(screen.getByTestId("chem-node-flow-stage-alcohol")).toHaveAttribute(
      "data-chem-flow-band",
      "relay",
    );
    expect(screen.getByTestId("chem-node-flow-stage-alcohol")).toHaveAttribute(
      "data-chem-flow-active",
      "false",
    );
    expect(screen.getByTestId("chem-node-flow-pill-alcohol")).toHaveAttribute(
      "data-chem-flow-band",
      "relay",
    );
    expect(screen.getByTestId("chem-node-flow-pill-alcohol")).toHaveAttribute(
      "data-chem-flow-order",
      "2",
    );
    expect(screen.getByTestId("chem-node-flow-pill-alcohol")).toHaveTextContent(
      "2",
    );
    expect(
      screen.getByTestId("chem-node-pathway-bias-alcohol"),
    ).toHaveAttribute("data-chem-pathway-bias", "incoming-heavy");
    expect(
      screen.getByTestId("chem-node-pathway-count-alcohol"),
    ).toHaveTextContent(/4 in · 3 out/i);
    expect(
      screen.getByTestId("chem-node-pathway-balance-alcohol"),
    ).toHaveAttribute("data-chem-incoming-share", "57");
    expect(
      screen.getByTestId("chem-node-pathway-balance-alcohol"),
    ).toHaveAttribute("data-chem-outgoing-share", "43");
    expect(alcoholNode).toHaveAccessibleName(
      /alcohol family node\. 7 connected pathways: 4 incoming, 3 outgoing/i,
    );
  });

  it("summarizes the active graph camera context for visible and assistive users", async () => {
    const user = userEvent.setup();

    render(await ChemistryReactionMindMapRoute());

    const cameraStatus = screen.getByTestId("chem-camera-status");
    const scopeStatus = screen.getByTestId("chem-scope-status");
    const flowStatus = screen.getByTestId("chem-flow-status");
    const viewport = screen.getByTestId("chemistry-graph-viewport");
    const flowRail = screen.getByTestId("chem-graph-flow-rail");
    const mobileCameraStrip = screen.getByTestId("chem-mobile-camera-strip");
    const minimapStatusStrip = screen.getByTestId("chem-minimap-status-strip");

    expect(screen.getByTestId("chem-graph-flow-structure")).toBeInTheDocument();
    expect(flowRail).toHaveTextContent(/flow: all stages/i);
    expect(flowRail).toHaveAttribute("data-chem-active-flow-bands", "");
    expect(flowRail).toHaveAttribute(
      "data-chem-active-flow-summary",
      "All stages",
    );
    expect(screen.getByTestId("chem-flow-rail-stage-entry")).toHaveAttribute(
      "data-chem-flow-order",
      "1",
    );
    expect(screen.getByTestId("chem-flow-rail-stage-entry")).toHaveAttribute(
      "data-chem-flow-active",
      "false",
    );
    expect(
      screen.getByTestId("chem-flow-rail-stage-entry"),
    ).not.toHaveAttribute("aria-current");
    expect(screen.getByTestId("chem-flow-rail-stage-relay")).toHaveTextContent(
      /relay/i,
    );
    expect(screen.getByTestId("chem-flow-rail-stage-product")).toHaveAttribute(
      "data-chem-flow-tone",
      "sink",
    );
    expect(
      screen.getByTestId("chem-flow-rail-connector-entry-relay"),
    ).toHaveAttribute("data-chem-flow-transition", "1→2");
    expect(
      screen.getByTestId("chem-flow-rail-connector-entry-relay"),
    ).toHaveAttribute("data-chem-flow-active", "false");
    expect(screen.getByTestId("chem-graph-flow-band-entry")).toHaveAttribute(
      "data-chem-flow-tone",
      "source",
    );
    expect(screen.getByTestId("chem-graph-flow-band-entry")).toHaveAttribute(
      "data-chem-flow-order",
      "1",
    );
    expect(screen.getByTestId("chem-graph-flow-band-entry")).toHaveAttribute(
      "data-chem-flow-active",
      "false",
    );
    expect(
      screen.getByTestId("chem-graph-flow-marker-entry"),
    ).toHaveTextContent("1");
    expect(screen.getByTestId("chem-graph-flow-label-entry")).toHaveTextContent(
      /entry/i,
    );
    expect(screen.getByTestId("chem-graph-flow-band-relay")).toHaveAttribute(
      "data-chem-flow-tone",
      "hub",
    );
    expect(
      screen.getByTestId("chem-graph-flow-marker-relay"),
    ).toHaveTextContent("2");
    expect(screen.getByTestId("chem-graph-flow-label-relay")).toHaveTextContent(
      /relay/i,
    );
    expect(screen.getByTestId("chem-graph-flow-band-product")).toHaveAttribute(
      "data-chem-flow-tone",
      "sink",
    );
    expect(
      screen.getByTestId("chem-graph-flow-marker-product"),
    ).toHaveTextContent("3");
    expect(
      screen.getByTestId("chem-minimap-flow-marker-product"),
    ).toHaveAttribute("data-chem-flow-order", "3");
    expect(
      screen.getByTestId("chem-minimap-flow-label-product"),
    ).toHaveTextContent(/product/i);
    expect(screen.getByTestId("chem-minimap-window-center-x")).toHaveAttribute(
      "data-chem-window-center-x",
    );
    expect(screen.getByTestId("chem-minimap-window-center-y")).toHaveAttribute(
      "data-chem-window-center-y",
    );
    expect(minimapStatusStrip).toHaveAttribute(
      "data-chem-minimap-camera-mode",
      "graph",
    );
    expect(minimapStatusStrip).toHaveAttribute(
      "data-chem-active-flow-summary",
      "All stages",
    );
    expect(minimapStatusStrip).toHaveAttribute(
      "data-chem-visible-coverage",
      "100",
    );
    expect(screen.getByTestId("chem-minimap-flow-summary")).toHaveTextContent(
      /all stages/i,
    );
    expect(
      screen.getByTestId("chem-minimap-visible-coverage"),
    ).toHaveTextContent(/100% visible/i);
    expect(
      screen.getByTestId("chem-graph-flow-spine-checkpoint-1"),
    ).toHaveAttribute("data-chem-flow-band", "entry");
    expect(
      screen.getByTestId("chem-graph-flow-spine-checkpoint-1"),
    ).toHaveAttribute("data-chem-flow-active", "false");
    expect(
      screen.getByTestId("chem-graph-flow-corridor-entry-relay"),
    ).toHaveAttribute("data-chem-flow-transition", "1→2");
    expect(
      screen.getByTestId("chem-graph-flow-corridor-entry-relay"),
    ).toHaveAttribute("data-chem-flow-active", "false");
    expect(
      screen.getByTestId("chem-minimap-flow-corridor-relay-product"),
    ).toHaveAttribute("data-chem-flow-transition", "2→3");
    expect(cameraStatus).toHaveTextContent(/view: full reaction map/i);
    expect(scopeStatus).toHaveTextContent(
      /7 nodes · 11 pathways in active view/i,
    );
    expect(flowStatus).toHaveTextContent(/flow: all stages/i);
    expect(
      screen.queryByTestId("chem-active-camera-frame"),
    ).not.toBeInTheDocument();
    expect(viewport).toHaveAccessibleDescription(/view: full reaction map/i);
    expect(viewport).toHaveAccessibleDescription(
      /7 nodes · 11 pathways in active view/i,
    );
    expect(viewport).toHaveAccessibleDescription(/flow: all stages/i);
    expect(viewport).toHaveAccessibleDescription(
      /focus or hover a node or pathway/i,
    );
    expect(viewport).toHaveAttribute("data-chem-active-flow-bands", "");
    expect(viewport).toHaveAttribute(
      "data-chem-active-flow-summary",
      "All stages",
    );
    expect(viewport).toHaveAttribute("data-chem-visible-coverage", "100");
    expect(mobileCameraStrip).toHaveAttribute("data-chem-camera-mode", "graph");
    expect(mobileCameraStrip).toHaveAttribute(
      "data-chem-active-flow-bands",
      "",
    );
    expect(mobileCameraStrip).toHaveAttribute(
      "data-chem-visible-coverage",
      "100",
    );
    expect(mobileCameraStrip).toHaveAttribute(
      "data-chem-active-flow-summary",
      "All stages",
    );
    expect(screen.getByTestId("chem-mobile-camera-mode")).toHaveTextContent(
      /full/i,
    );
    expect(screen.getByTestId("chem-mobile-camera-coverage")).toHaveTextContent(
      /100% visible/i,
    );
    expect(screen.getByTestId("chem-mobile-flow-summary")).toHaveTextContent(
      /all stages/i,
    );

    await user.click(screen.getByTestId("chem-node-alcohol"));
    expect(cameraStatus).toHaveTextContent(/view: alcohol group/i);
    expect(scopeStatus).toHaveTextContent(
      /1 node · 7 pathways in active view/i,
    );
    expect(flowStatus).toHaveTextContent(/flow: relay/i);
    expect(viewport).toHaveAttribute("data-chem-scope-nodes", "1");
    expect(viewport).toHaveAttribute("data-chem-scope-pathways", "7");
    expect(viewport).toHaveAttribute("data-chem-active-flow-bands", "relay");
    expect(viewport).toHaveAttribute("data-chem-active-flow-summary", "Relay");
    expect(flowRail).toHaveAttribute("data-chem-active-flow-bands", "relay");
    expect(screen.getByTestId("chem-flow-rail-stage-relay")).toHaveAttribute(
      "data-chem-flow-active",
      "true",
    );
    expect(screen.getByTestId("chem-active-camera-frame")).toHaveAttribute(
      "data-chem-camera-frame",
      "node",
    );
    expect(screen.getByTestId("chem-active-camera-frame")).toHaveAttribute(
      "data-chem-camera-frame-tone",
      "focus",
    );
    expect(screen.getByTestId("chem-active-camera-frame")).toHaveAttribute(
      "data-chem-active-flow-summary",
      "Relay",
    );
    expect(
      screen.getByTestId("chem-active-camera-flow-label"),
    ).toHaveTextContent(/^Relay$/i);
    expect(screen.getByTestId("chem-active-camera-flow-label")).toHaveAttribute(
      "data-chem-active-flow-bands",
      "relay",
    );
    expect(screen.getByTestId("chem-graph-flow-band-entry")).toHaveAttribute(
      "data-chem-flow-active",
      "false",
    );
    expect(screen.getByTestId("chem-graph-flow-band-relay")).toHaveAttribute(
      "data-chem-flow-active",
      "true",
    );
    expect(screen.getByTestId("chem-minimap-flow-band-relay")).toHaveAttribute(
      "data-chem-flow-active",
      "true",
    );
    expect(screen.getByTestId("chem-minimap-active-scope")).toHaveAttribute(
      "data-chem-active-flow-summary",
      "Relay",
    );
    expect(screen.getByTestId("chem-flow-rail-stage-relay")).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(
      screen.getByTestId("chem-graph-flow-spine-checkpoint-2"),
    ).toHaveAttribute("data-chem-flow-active", "true");
    expect(screen.getByTestId("chem-node-flow-stage-alcohol")).toHaveAttribute(
      "data-chem-flow-active",
      "true",
    );
    expect(screen.getByTestId("chem-node-flow-pill-alcohol")).toHaveAttribute(
      "data-chem-flow-active",
      "true",
    );
    expect(screen.getByTestId("chem-node-alcohol")).toHaveAttribute(
      "data-chem-layer-priority",
      "selected",
    );
    expect(
      screen.getByTestId("chem-node-alcohol").getAttribute("style"),
    ).toContain("z-index: 40");
    expect(screen.getByTestId("chem-graph-flow-band-product")).toHaveAttribute(
      "data-chem-flow-active",
      "false",
    );

    await user.click(
      screen.getByTestId("chem-edge-alcohol-to-aldehyde-oxidation"),
    );
    expect(cameraStatus).toHaveTextContent(/view: alcohol → aldehyde pathway/i);
    expect(scopeStatus).toHaveTextContent(
      /2 nodes · 1 pathway in active view/i,
    );
    expect(viewport).toHaveAttribute(
      "data-chem-active-flow-bands",
      "relay product",
    );
    expect(viewport).toHaveAttribute(
      "data-chem-active-flow-summary",
      "Relay → Product",
    );
    expect(screen.getByTestId("chem-active-camera-frame")).toHaveAttribute(
      "data-chem-camera-frame",
      "edge",
    );
    expect(screen.getByTestId("chem-active-camera-frame")).toHaveAttribute(
      "data-chem-active-flow-bands",
      "relay product",
    );
    expect(screen.getByTestId("chem-active-camera-flow-label")).toHaveAttribute(
      "data-chem-active-flow-summary",
      "Relay → Product",
    );
    expect(
      screen.getByTestId("chem-edge-alcohol-to-aldehyde-oxidation"),
    ).toHaveAttribute("data-chem-layer-priority", "selected");
    expect(
      screen
        .getByTestId("chem-edge-alcohol-to-aldehyde-oxidation")
        .getAttribute("style"),
    ).toContain("z-index: 42");
    expect(screen.getByTestId("chem-node-alcohol")).toHaveAttribute(
      "data-chem-layer-priority",
      "preview",
    );
    expect(screen.getByTestId("chem-flow-rail-stage-product")).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(screen.getByTestId("chem-graph-flow-band-relay")).toHaveAttribute(
      "data-chem-flow-active",
      "true",
    );
    expect(screen.getByTestId("chem-graph-flow-band-product")).toHaveAttribute(
      "data-chem-flow-active",
      "true",
    );
    expect(
      screen.getByTestId("chem-graph-flow-corridor-relay-product"),
    ).toHaveAttribute("data-chem-flow-active", "true");
    expect(
      screen.getByTestId("chem-flow-rail-connector-relay-product"),
    ).toHaveAttribute("data-chem-flow-active", "true");
    expect(
      screen.getByTestId("chem-graph-flow-corridor-entry-relay"),
    ).toHaveAttribute("data-chem-flow-active", "false");
    expect(
      screen.getByTestId("chem-minimap-flow-corridor-relay-product"),
    ).toHaveAttribute("data-chem-flow-active", "true");
    expect(
      screen.getByTestId("chem-graph-flow-spine-checkpoint-3"),
    ).toHaveAttribute("data-chem-flow-active", "true");
    expect(
      screen.getByTestId("chem-edge-path-alcohol-to-aldehyde-oxidation"),
    ).toHaveAttribute("data-chem-flow-transition", "2→3");

    await user.selectOptions(screen.getByTestId("chem-route-start"), "alkene");
    await user.selectOptions(
      screen.getByTestId("chem-route-target"),
      "carboxylic-acid",
    );
    await user.click(screen.getByTestId("chem-route-search"));

    expect(cameraStatus).toHaveTextContent(
      /view: route alkene → carboxylic acid/i,
    );
    expect(scopeStatus).toHaveTextContent(
      /4 nodes · 3 pathways in active view/i,
    );
    expect(viewport).toHaveAttribute("data-chem-scope-nodes", "4");
    expect(viewport).toHaveAttribute("data-chem-scope-pathways", "3");
    expect(viewport).toHaveAttribute(
      "data-chem-active-flow-bands",
      "entry relay product",
    );
    expect(viewport).toHaveAttribute(
      "data-chem-active-flow-summary",
      "Entry → Relay → Product",
    );
    expect(screen.getByTestId("chem-active-camera-frame")).toHaveAttribute(
      "data-chem-camera-frame",
      "route",
    );
    expect(screen.getByTestId("chem-active-camera-frame")).toHaveAttribute(
      "data-chem-camera-frame-tone",
      "route",
    );
    expect(screen.getByTestId("chem-active-camera-frame")).toHaveAttribute(
      "data-chem-active-flow-summary",
      "Entry → Relay → Product",
    );
    expect(
      screen.getByTestId("chem-active-camera-flow-label"),
    ).toHaveTextContent(/entry → relay → product/i);
    expect(screen.getByTestId("chem-graph-flow-band-entry")).toHaveAttribute(
      "data-chem-flow-active",
      "true",
    );
    expect(screen.getByTestId("chem-graph-flow-band-relay")).toHaveAttribute(
      "data-chem-flow-active",
      "true",
    );
    expect(screen.getByTestId("chem-graph-flow-band-product")).toHaveAttribute(
      "data-chem-flow-active",
      "true",
    );
    expect(
      screen.getByTestId("chem-graph-flow-corridor-entry-relay"),
    ).toHaveAttribute("data-chem-flow-active", "true");
    expect(
      screen.getByTestId("chem-graph-flow-corridor-relay-product"),
    ).toHaveAttribute("data-chem-flow-active", "true");
    expect(flowRail).toHaveAttribute(
      "data-chem-active-flow-bands",
      "entry relay product",
    );
    expect(
      screen.getByTestId("chem-flow-rail-connector-entry-relay"),
    ).toHaveAttribute("data-chem-flow-active", "true");
    expect(
      screen.getByTestId("chem-flow-rail-connector-relay-product"),
    ).toHaveAttribute("data-chem-flow-active", "true");
    expect(
      screen.getByTestId("chem-edge-alkene-to-alcohol-hydration"),
    ).toHaveAttribute("data-chem-flow-transition", "1→2");
    expect(
      screen.getByTestId("chem-edge-alkene-to-alcohol-hydration"),
    ).toHaveAttribute("data-chem-layer-priority", "route");
    expect(screen.getByTestId("chem-node-alkene")).toHaveAttribute(
      "data-chem-layer-priority",
      "endpoint",
    );
    expect(screen.getByTestId("chem-node-alcohol")).toHaveAttribute(
      "data-chem-layer-priority",
      "route",
    );
    expect(
      screen.getByTestId("chem-edge-path-alcohol-to-aldehyde-oxidation"),
    ).toHaveAttribute("data-chem-flow-transition", "2→3");
    expect(mobileCameraStrip).toHaveAttribute("data-chem-camera-mode", "route");
    expect(screen.getByTestId("chem-mobile-camera-mode")).toHaveTextContent(
      /route/i,
    );
    expect(minimapStatusStrip).toHaveAttribute(
      "data-chem-minimap-camera-mode",
      "route",
    );
    expect(minimapStatusStrip).toHaveAttribute(
      "data-chem-active-flow-summary",
      "Entry → Relay → Product",
    );
  });

  it("lets edge details navigate back to the source and product groups", async () => {
    const user = userEvent.setup();

    render(await ChemistryReactionMindMapRoute());

    await user.click(
      screen.getByTestId("chem-edge-alcohol-to-aldehyde-oxidation"),
    );
    await user.click(screen.getByTestId("chem-edge-source-node"));

    expect(screen.getByTestId("chem-node-details")).toBeInTheDocument();
    expect(screen.getByTestId("chemistry-selection-summary")).toHaveTextContent(
      /selected group: alcohol/i,
    );

    await user.click(
      screen.getByTestId("chem-edge-alcohol-to-aldehyde-oxidation"),
    );
    await user.click(screen.getByTestId("chem-edge-target-node"));

    expect(screen.getByTestId("chem-node-details")).toBeInTheDocument();
    expect(screen.getByTestId("chemistry-selection-summary")).toHaveTextContent(
      /selected group: aldehyde/i,
    );
  });

  it("offers comparison from edge details and preserves direct pathway context", async () => {
    const user = userEvent.setup();

    render(await ChemistryReactionMindMapRoute());

    await user.click(
      screen.getByTestId("chem-edge-alcohol-to-aldehyde-oxidation"),
    );
    await user.click(screen.getByTestId("chem-edge-compare-groups"));

    const comparePanel = screen.getByTestId("chemistry-compare-panel");
    expect(comparePanel).toBeInTheDocument();
    expect(
      within(comparePanel).getByText(
        /direct conversions between these groups/i,
      ),
    ).toBeInTheDocument();
    expect(
      within(comparePanel).getByTestId(
        "chem-compare-direct-alcohol-to-aldehyde-oxidation",
      ),
    ).toHaveTextContent(/primary alcohols only/i);
  });

  it("finds a multi-step route from direct start and target selection", async () => {
    const user = userEvent.setup();

    render(await ChemistryReactionMindMapRoute());

    await user.selectOptions(screen.getByTestId("chem-route-start"), "alkene");
    await user.selectOptions(
      screen.getByTestId("chem-route-target"),
      "carboxylic-acid",
    );
    await user.click(screen.getByTestId("chem-route-search"));

    const routePanel = screen.getByTestId("chemistry-route-panel");
    expect(routePanel).toBeInTheDocument();
    expect(screen.getByTestId("chemistry-selection-summary")).toHaveTextContent(
      /route: alkene to carboxylic acid \(3 steps\)/i,
    );
    expect(within(routePanel).getByText(/route 1/i)).toBeInTheDocument();
    expect(within(routePanel).getByText(/hydration/i)).toBeInTheDocument();
    expect(
      within(routePanel).getByText(/oxidation to aldehyde/i),
    ).toBeInTheDocument();
    expect(
      within(routePanel).getByText(/oxidation to carboxylic acid/i),
    ).toBeInTheDocument();
  });

  it("applies stable route graph markers when a route is selected", async () => {
    const user = userEvent.setup();

    render(await ChemistryReactionMindMapRoute());

    await user.selectOptions(screen.getByTestId("chem-route-start"), "alkene");
    await user.selectOptions(
      screen.getByTestId("chem-route-target"),
      "carboxylic-acid",
    );
    await user.click(screen.getByTestId("chem-route-search"));

    expect(screen.getByTestId("chem-node-alkene")).toHaveAttribute(
      "data-chem-route-context",
      "endpoint",
    );
    expect(screen.getByTestId("chem-node-alkene")).toHaveAttribute(
      "data-chem-context",
      "connected",
    );
    expect(screen.getByTestId("chem-node-alkene")).toHaveAttribute(
      "data-chem-route-step",
      "1",
    );
    expect(screen.getByTestId("chem-node-route-step-alkene")).toHaveTextContent(
      "1",
    );
    expect(screen.getByTestId("chem-minimap-node-alkene")).toHaveAttribute(
      "data-chem-route-step",
      "1",
    );
    expect(screen.getByTestId("chem-minimap-node-alkene")).toHaveAttribute(
      "data-chem-flow-band",
      "entry",
    );
    expect(
      screen.getByTestId("chem-minimap-node-flow-stage-alkene"),
    ).toHaveAttribute("data-chem-flow-active", "true");
    expect(
      screen.getByTestId("chem-minimap-node-route-step-alkene"),
    ).toHaveTextContent("1");
    expect(
      screen.getByTestId("chem-node-route-stage-alkene"),
    ).toHaveTextContent(/start/i);
    expect(screen.getByTestId("chem-node-route-stage-alkene")).toHaveAttribute(
      "data-chem-route-stage-label",
      "Start",
    );
    expect(
      screen.getByLabelText(/alkene family node\. route start/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId("chem-node-alcohol")).toHaveAttribute(
      "data-chem-route-context",
      "route",
    );
    expect(
      screen.getByTestId("chem-node-route-step-alcohol"),
    ).toHaveTextContent("2");
    expect(
      screen.getByTestId("chem-node-route-stage-alcohol"),
    ).toHaveTextContent(/step 2/i);
    expect(screen.getByTestId("chem-node-route-stage-alcohol")).toHaveAttribute(
      "data-chem-route-stage-label",
      "Step 2",
    );
    expect(
      screen.getByLabelText(/alcohol family node\. route node 2 of 4/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId("chem-node-carboxylic-acid")).toHaveAttribute(
      "data-chem-route-context",
      "endpoint",
    );
    expect(screen.getByTestId("chem-node-carboxylic-acid")).toHaveAttribute(
      "data-chem-route-step",
      "4",
    );
    expect(
      screen.getByTestId("chem-node-route-step-carboxylic-acid"),
    ).toHaveTextContent("4");
    expect(
      screen.getByTestId("chem-minimap-node-route-step-carboxylic-acid"),
    ).toHaveTextContent("4");
    expect(
      screen.getByTestId("chem-minimap-node-flow-stage-carboxylic-acid"),
    ).toHaveAttribute("data-chem-flow-band", "product");
    expect(
      screen.getByTestId("chem-minimap-node-label-alcohol"),
    ).toHaveTextContent("Alcohol");
    expect(
      screen.getByTestId("chem-minimap-node-label-carboxylic-acid"),
    ).toHaveTextContent("Carboxylic…");
    expect(
      screen.getByTestId("chem-minimap-node-label-carboxylic-acid"),
    ).toHaveAttribute("data-chem-minimap-label", "Carboxylic acid");
    expect(
      screen.getByTestId("chem-node-route-stage-carboxylic-acid"),
    ).toHaveTextContent(/target/i);
    expect(
      screen.getByTestId("chem-node-route-stage-carboxylic-acid"),
    ).toHaveAttribute("data-chem-route-stage-label", "Target");
    expect(
      screen.getByLabelText(/carboxylic acid family node\. route target/i),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("chem-edge-alkene-to-alcohol-hydration"),
    ).toHaveAttribute("data-chem-route-context", "route");
    expect(
      screen.getByTestId("chem-edge-alkene-to-alcohol-hydration"),
    ).toHaveAttribute("data-chem-context", "connected");
    expect(
      screen.getByTestId("chem-minimap-edge-alkene-to-alcohol-hydration"),
    ).toHaveAttribute("data-chem-route-context", "route");
    expect(
      screen.getByTestId("chem-minimap-edge-alkene-to-alcohol-hydration"),
    ).toHaveAttribute("data-chem-flow-transition", "1→2");
    expect(
      screen.getByTestId(
        "chem-minimap-edge-route-step-alkene-to-alcohol-hydration",
      ),
    ).toHaveAttribute("data-chem-route-step", "1");
    expect(
      screen.getByTestId(
        "chem-minimap-edge-route-step-alkene-to-alcohol-hydration",
      ),
    ).toHaveAttribute("data-chem-flow-transition", "1→2");
    expect(
      screen.getByTestId(
        "chem-minimap-edge-route-step-alcohol-to-aldehyde-oxidation",
      ),
    ).toHaveTextContent("2");
    expect(screen.getByTestId("chem-route-progress-node-trail")).toHaveAttribute(
      "data-chem-route-node-count",
      "4",
    );
    expect(screen.getByTestId("chem-route-progress-node-trail")).toHaveTextContent(
      /1\s*alkene\s*→\s*2\s*alcohol\s*→\s*3\s*aldehyde\s*→\s*4\s*carboxylic acid/i,
    );
    expect(screen.getByTestId("chem-route-progress-step-list")).toHaveAttribute(
      "data-chem-route-edge-count",
      "3",
    );
    expect(
      screen.getByTestId(
        "chem-route-progress-step-detail-alcohol-to-aldehyde-oxidation",
      ),
    ).toHaveTextContent(/2\s*oxidation to aldehyde\s*alcohol\s*→\s*aldehyde/i);
    expect(
      screen.getByTestId(
        "chem-route-progress-step-flow-aldehyde-to-carboxylic-acid-oxidation",
      ),
    ).toHaveTextContent(/aldehyde\s*→\s*carboxylic acid/i);
    expect(screen.getByTestId("chem-route-progress-node-alkene")).toHaveAttribute(
      "data-chem-route-role",
      "start",
    );
    expect(screen.getByTestId("chem-route-progress-node-alkene")).toHaveAttribute(
      "data-chem-flow-band",
      "entry",
    );
    expect(
      screen.getByTestId("chem-route-progress-node-flow-carboxylic-acid"),
    ).toHaveAttribute("data-chem-flow-band", "product");
    expect(
      screen.getByTestId(
        "chem-route-progress-step-detail-alcohol-to-aldehyde-oxidation",
      ),
    ).toHaveAttribute("data-chem-flow-transition", "2→3");
    expect(
      screen.getByTestId(
        "chem-route-progress-step-flow-source-alcohol-to-aldehyde-oxidation",
      ),
    ).toHaveAttribute("data-chem-flow-band", "relay");
    expect(
      screen.getByTestId(
        "chem-route-progress-step-flow-target-aldehyde-to-carboxylic-acid-oxidation",
      ),
    ).toHaveAttribute("data-chem-flow-band", "product");
    expect(
      screen.getByTestId("chem-route-progress-node-carboxylic-acid"),
    ).toHaveAttribute("data-chem-route-role", "target");
    expect(
      screen.getByTestId("chem-edge-path-alkene-to-alcohol-hydration"),
    ).toHaveAttribute("marker-end", "url(#chemistry-edge-arrow-route)");
    expect(
      screen.getByTestId("chem-edge-halo-alkene-to-alcohol-hydration"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("chem-edge-direction-alkene-to-alcohol-hydration"),
    ).toHaveAttribute("data-chem-route-context", "route");
    expect(screen.getByTestId("chem-node-ester")).toHaveAttribute(
      "data-chem-route-context",
      "dimmed",
    );
  });

  it("opens edge details from a selected route step and can return to route results", async () => {
    const user = userEvent.setup();

    render(await ChemistryReactionMindMapRoute());

    await user.selectOptions(screen.getByTestId("chem-route-start"), "alkene");
    await user.selectOptions(
      screen.getByTestId("chem-route-target"),
      "carboxylic-acid",
    );
    await user.click(screen.getByTestId("chem-route-search"));
    await user.click(
      screen.getByRole("button", { name: /step 2: oxidation to aldehyde/i }),
    );

    expect(screen.getByTestId("chem-edge-details")).toBeInTheDocument();
    expect(screen.getByTestId("chem-route-view-results")).toBeInTheDocument();

    await user.click(screen.getByTestId("chem-route-view-results"));
    expect(screen.getByTestId("chemistry-route-panel")).toBeInTheDocument();
  });

  it("can open route results from compare mode", async () => {
    const user = userEvent.setup();

    render(await ChemistryReactionMindMapRoute());

    await user.click(screen.getByTestId("chem-node-alcohol"));
    await user.click(
      screen.getByTestId(
        "chem-node-compare-outgoing-alcohol-to-aldehyde-oxidation",
      ),
    );
    await user.click(screen.getByTestId("chem-compare-show-routes"));

    expect(screen.getByTestId("chemistry-route-panel")).toBeInTheDocument();
    expect(screen.getByTestId("chemistry-selection-summary")).toHaveTextContent(
      /route: alcohol to aldehyde \(1 step\)/i,
    );
  });

  it("shows a clear no-route state when no bounded directed route exists", async () => {
    const user = userEvent.setup();

    render(await ChemistryReactionMindMapRoute());

    await user.selectOptions(screen.getByTestId("chem-route-start"), "ester");
    await user.selectOptions(
      screen.getByTestId("chem-route-target"),
      "haloalkane",
    );
    await user.click(screen.getByTestId("chem-route-search"));

    expect(screen.getByTestId("chem-route-no-results")).toBeInTheDocument();
    expect(screen.getByTestId("chemistry-selection-summary")).toHaveTextContent(
      /no short route shown for ester to haloalkane/i,
    );
  });

  it("preserves multi-reactant co-reactant context in comparison pathway rows", async () => {
    const user = userEvent.setup();

    render(await ChemistryReactionMindMapRoute());

    await user.click(
      screen.getByTestId("chem-edge-carboxylic-acid-to-ester-esterification"),
    );
    await user.click(screen.getByTestId("chem-edge-compare-groups"));

    expect(
      screen.getByTestId(
        "chem-compare-direct-carboxylic-acid-to-ester-esterification",
      ),
    ).toHaveTextContent(/also needs: alcohol family/i);
  });

  it("shows co-reactant metadata and representative-example labeling for esterification", async () => {
    const user = userEvent.setup();

    render(await ChemistryReactionMindMapRoute());

    await user.click(
      screen.getByTestId("chem-edge-carboxylic-acid-to-ester-esterification"),
    );

    const edgeDetails = screen.getByTestId("chem-edge-details");
    expect(edgeDetails).toBeInTheDocument();
    expect(screen.getByTestId("chem-edge-co-reactants")).toHaveTextContent(
      /alcohol family/i,
    );
    expect(
      within(edgeDetails).getByText(/representative example/i),
    ).toBeInTheDocument();
  });

  it("keeps alkene hydration on a representative-example equation rather than a misleading generic one", async () => {
    const user = userEvent.setup();

    render(await ChemistryReactionMindMapRoute());

    await user.click(
      screen.getByTestId("chem-edge-alkene-to-alcohol-hydration"),
    );

    const edgeDetails = screen.getByTestId("chem-edge-details");
    expect(
      within(edgeDetails).queryByText(/generic family equation/i),
    ).not.toBeInTheDocument();
    expect(
      within(edgeDetails).getAllByText(/representative example/i).length,
    ).toBeGreaterThan(0);
    expect(
      within(edgeDetails).getByLabelText(
        /CH2=CH2\(g\) \+ H2O\(g\) -> CH3CH2OH\(l\)/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows borohydride-style reduction details for carbonyl reduction edges", async () => {
    const user = userEvent.setup();

    render(await ChemistryReactionMindMapRoute());

    await user.click(
      screen.getByTestId("chem-edge-aldehyde-to-alcohol-reduction"),
    );

    const edgeDetails = screen.getByTestId("chem-edge-details");
    expect(edgeDetails).toHaveTextContent(/sodium borohydride/i);
    expect(
      within(edgeDetails).getByLabelText(/RCHO\(l\) \+ 2\[H\] -> RCH2OH\(l\)/i),
    ).toBeInTheDocument();
  });

  it("applies stable graph context state to highlighted and dimmed elements", async () => {
    const user = userEvent.setup();

    render(await ChemistryReactionMindMapRoute());

    await user.click(screen.getByTestId("chem-node-alcohol"));

    expect(screen.getByTestId("chem-node-alcohol")).toHaveAttribute(
      "data-chem-context",
      "selected",
    );
    expect(screen.getByTestId("chem-node-alkene")).toHaveAttribute(
      "data-chem-context",
      "connected",
    );
    expect(screen.getByTestId("chem-node-ester")).toHaveAttribute(
      "data-chem-context",
      "dimmed",
    );
    expect(
      screen.getByTestId("chem-edge-alkene-to-alcohol-hydration"),
    ).toHaveAttribute("data-chem-context", "connected");
    expect(
      screen.getByTestId("chem-edge-ester-to-carboxylic-acid-hydrolysis"),
    ).toHaveAttribute("data-chem-context", "dimmed");
  });

  it("applies stable graph compare context and can exit comparison cleanly", async () => {
    const user = userEvent.setup();

    render(await ChemistryReactionMindMapRoute());

    await user.click(screen.getByTestId("chem-node-alcohol"));
    await user.click(
      screen.getByTestId(
        "chem-node-compare-outgoing-alcohol-to-aldehyde-oxidation",
      ),
    );

    expect(screen.getByTestId("chem-node-alcohol")).toHaveAttribute(
      "data-chem-context",
      "compared",
    );
    expect(screen.getByTestId("chem-node-aldehyde")).toHaveAttribute(
      "data-chem-context",
      "compared",
    );
    expect(
      screen.getByTestId("chem-edge-alcohol-to-aldehyde-oxidation"),
    ).toHaveAttribute("data-chem-context", "compared");
    expect(screen.getByTestId("chem-node-ester")).toHaveAttribute(
      "data-chem-context",
      "dimmed",
    );

    await user.click(screen.getByTestId("chem-compare-exit"));

    expect(
      screen.queryByTestId("chemistry-compare-panel"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("chem-node-details")).toBeInTheDocument();
    expect(screen.getByTestId("chemistry-selection-summary")).toHaveTextContent(
      /selected group: alcohol/i,
    );
  });

  it("returns to edge details when comparison was launched from an edge", async () => {
    const user = userEvent.setup();

    render(await ChemistryReactionMindMapRoute());

    await user.click(
      screen.getByTestId("chem-edge-alcohol-to-aldehyde-oxidation"),
    );
    await user.click(screen.getByTestId("chem-edge-compare-groups"));

    expect(screen.getByTestId("chemistry-compare-panel")).toBeInTheDocument();

    await user.click(screen.getByTestId("chem-compare-exit"));

    expect(
      screen.queryByTestId("chemistry-compare-panel"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("chem-edge-details")).toBeInTheDocument();
    expect(screen.getByTestId("chemistry-selection-summary")).toHaveTextContent(
      /selected pathway: oxidation to aldehyde/i,
    );
  });

  it("shows bounded multi-step routes from direct start and target selection", async () => {
    const user = userEvent.setup();

    render(await ChemistryReactionMindMapRoute());

    await user.selectOptions(screen.getByTestId("chem-route-start"), "alkene");
    await user.selectOptions(
      screen.getByTestId("chem-route-target"),
      "carboxylic-acid",
    );
    await user.click(screen.getByTestId("chem-route-search"));

    const routePanel = screen.getByTestId("chemistry-route-panel");
    expect(routePanel).toBeInTheDocument();
    expect(screen.getByTestId("chemistry-selection-summary")).toHaveTextContent(
      /route: alkene to carboxylic acid \(3 steps\)/i,
    );
    expect(within(routePanel).getByText(/route 1/i)).toBeInTheDocument();
    expect(within(routePanel).getByText(/hydration/i)).toBeInTheDocument();
    expect(
      within(routePanel).getByText(/oxidation to aldehyde/i),
    ).toBeInTheDocument();
    expect(
      within(routePanel).getByText(/oxidation to carboxylic acid/i),
    ).toBeInTheDocument();
  });

  it("applies stable route markers to route nodes and edges", async () => {
    const user = userEvent.setup();

    render(await ChemistryReactionMindMapRoute());

    await user.selectOptions(screen.getByTestId("chem-route-start"), "alkene");
    await user.selectOptions(
      screen.getByTestId("chem-route-target"),
      "carboxylic-acid",
    );
    await user.click(screen.getByTestId("chem-route-search"));

    expect(screen.getByTestId("chem-node-alkene")).toHaveAttribute(
      "data-chem-route-context",
      "endpoint",
    );
    expect(screen.getByTestId("chem-node-alkene")).toHaveAttribute(
      "data-chem-route-step",
      "1",
    );
    expect(screen.getByTestId("chem-node-route-step-alkene")).toHaveTextContent(
      "1",
    );
    expect(screen.getByTestId("chem-node-alcohol")).toHaveAttribute(
      "data-chem-route-context",
      "route",
    );
    expect(
      screen.getByTestId("chem-node-route-step-alcohol"),
    ).toHaveTextContent("2");
    expect(screen.getByTestId("chem-node-carboxylic-acid")).toHaveAttribute(
      "data-chem-route-context",
      "endpoint",
    );
    expect(screen.getByTestId("chem-node-carboxylic-acid")).toHaveAttribute(
      "data-chem-route-step",
      "4",
    );
    expect(
      screen.getByTestId("chem-node-route-step-carboxylic-acid"),
    ).toHaveTextContent("4");
    expect(
      screen.getByTestId("chem-edge-alkene-to-alcohol-hydration"),
    ).toHaveAttribute("data-chem-route-context", "route");
    expect(screen.getByTestId("chem-node-ester")).toHaveAttribute(
      "data-chem-route-context",
      "dimmed",
    );
  });

  it("opens edge details from a route step and can return to route results", async () => {
    const user = userEvent.setup();

    render(await ChemistryReactionMindMapRoute());

    await user.selectOptions(screen.getByTestId("chem-route-start"), "alkene");
    await user.selectOptions(
      screen.getByTestId("chem-route-target"),
      "carboxylic-acid",
    );
    await user.click(screen.getByTestId("chem-route-search"));
    await user.click(
      screen.getByRole("button", { name: /step 2: oxidation to aldehyde/i }),
    );

    expect(screen.getByTestId("chem-edge-details")).toBeInTheDocument();
    expect(screen.getByTestId("chem-route-view-results")).toBeInTheDocument();

    await user.click(screen.getByTestId("chem-route-view-results"));
    expect(screen.getByTestId("chemistry-route-panel")).toBeInTheDocument();
  });

  it("shows route notes for subgroup-specific and multi-reactant steps", async () => {
    const user = userEvent.setup();

    render(await ChemistryReactionMindMapRoute());

    await user.selectOptions(screen.getByTestId("chem-route-start"), "alcohol");
    await user.selectOptions(screen.getByTestId("chem-route-target"), "ester");
    await user.click(screen.getByTestId("chem-route-search"));

    const routePanel = screen.getByTestId("chemistry-route-panel");
    expect(routePanel).toHaveTextContent(/subgroup-specific step/i);
    expect(routePanel).toHaveTextContent(/needs extra co-reactant/i);
    expect(routePanel).toHaveTextContent(/also needs: alcohol family/i);
  });

  it("can open route results from compare mode", async () => {
    const user = userEvent.setup();

    render(await ChemistryReactionMindMapRoute());

    await user.click(screen.getByTestId("chem-node-alcohol"));
    await user.click(
      screen.getByTestId(
        "chem-node-compare-outgoing-alcohol-to-aldehyde-oxidation",
      ),
    );
    await user.click(screen.getByTestId("chem-compare-show-routes"));

    expect(screen.getByTestId("chemistry-route-panel")).toBeInTheDocument();
    expect(screen.getByTestId("chemistry-selection-summary")).toHaveTextContent(
      /route: alcohol to aldehyde \(1 step\)/i,
    );
  });

  it("shows a clear no-route state when no bounded directed route exists", async () => {
    const user = userEvent.setup();

    render(await ChemistryReactionMindMapRoute());

    await user.selectOptions(screen.getByTestId("chem-route-start"), "ester");
    await user.selectOptions(
      screen.getByTestId("chem-route-target"),
      "haloalkane",
    );
    await user.click(screen.getByTestId("chem-route-search"));

    expect(screen.getByTestId("chem-route-no-results")).toBeInTheDocument();
    expect(screen.getByTestId("chemistry-selection-summary")).toHaveTextContent(
      /no short route shown for ester to haloalkane/i,
    );
  });

  it("renders through the locale wrapper route", async () => {
    const element = await LocalizedChemistryReactionMindMapPage({
      params: Promise.resolve({ locale: "en" }),
    });

    expect(isValidElement(element)).toBe(true);
    expect(element.props.localeOverride).toBe("en");
  });

  it("keeps a split worksurface structure with a self-scrolling inspector shell", async () => {
    render(await ChemistryReactionMindMapRoute());

    expect(screen.getByTestId("chemistry-worksurface")).toHaveAttribute(
      "data-chemistry-layout",
      "split-panel",
    );
    expect(screen.getByTestId("chemistry-inspector-scroll")).toHaveAttribute(
      "data-scroll-mode",
      "self",
    );
  });

  it("supports zoom controls and fit-to-view with stable graph state markers", async () => {
    const user = userEvent.setup();

    render(await ChemistryReactionMindMapRoute());

    const viewport = screen.getByTestId("chemistry-graph-viewport");
    const guidanceId = viewport.getAttribute("aria-describedby");
    const fitScale = viewport.getAttribute("data-chem-scale");
    const zoomStatus = screen.getByTestId("chem-zoom-status");

    expect(guidanceId?.split(" ")).toEqual([
      "chemistry-interaction-guidance",
      "chemistry-graph-keyboard-guidance",
      "chemistry-graph-legend",
      "chemistry-graph-camera-status",
      "chemistry-graph-scope-status",
      "chemistry-graph-flow-status",
      "chemistry-graph-preview-status",
    ]);
    expect(screen.getByTestId("chem-graph-legend")).toHaveAttribute(
      "data-chem-legend",
      "direction focus route",
    );
    expect(screen.getByTestId("chem-graph-legend")).toHaveTextContent(
      /arrows show reactant to product direction.*teal marks selected or focused context.*amber marks route steps/i,
    );
    expect(viewport).toHaveAccessibleDescription(
      /arrows show reactant to product direction/i,
    );
    expect(
      document.getElementById("chemistry-graph-keyboard-guidance"),
    ).toHaveTextContent(/arrow keys to pan/i);
    expect(screen.getByTestId("chem-keyboard-shortcuts")).toHaveTextContent(
      /keyboard shortcuts.*arrow keys pan.*\+ \/ - zoom.*0 fits active view/i,
    );
    expect(zoomStatus).toHaveAttribute("aria-live", "polite");
    expect(screen.getByTestId("chem-scope-status")).toHaveTextContent(
      /7 nodes · 11 pathways in active view/i,
    );
    expect(screen.getByTestId("chem-flow-status")).toHaveTextContent(
      /flow: all stages/i,
    );
    expect(screen.getByTestId("chem-preview-status")).toHaveTextContent(
      /focus or hover a node or pathway to trace connections/i,
    );
    expect(viewport).toHaveAttribute("data-chem-scope-nodes", "7");
    expect(viewport).toHaveAttribute("data-chem-scope-pathways", "11");
    expect(viewport).toHaveAttribute(
      "data-chem-active-flow-summary",
      "All stages",
    );
    expect(viewport).toHaveAttribute("data-chem-pan-guard", "visible-scene");
    expect(screen.getByTestId("chem-pan-affordance")).toHaveAttribute(
      "data-chem-pan-edges",
      "none",
    );
    expect(screen.getByTestId("chem-pan-affordance-left")).toHaveClass(
      "opacity-0",
    );
    expect(viewport).toHaveAttribute("data-chem-zoom-boundary", "within");
    expect(screen.getByTestId("chem-zoom-in")).toBeEnabled();
    expect(screen.getByTestId("chem-zoom-out")).toBeEnabled();

    await user.click(screen.getByTestId("chem-zoom-in"));
    expect(viewport.getAttribute("data-chem-scale")).not.toBe(fitScale);
    expect(zoomStatus).not.toHaveTextContent(
      `Zoom: ${Math.round(Number(fitScale) * 100)}%`,
    );

    await user.click(screen.getByTestId("chem-fit-view"));
    expect(viewport.getAttribute("data-chem-scale")).toBe(fitScale);
  });

  it("disables zoom controls at graph scale boundaries", async () => {
    const user = userEvent.setup();

    render(await ChemistryReactionMindMapRoute());

    const viewport = screen.getByTestId("chemistry-graph-viewport");
    const zoomIn = screen.getByTestId("chem-zoom-in");
    const zoomOut = screen.getByTestId("chem-zoom-out");

    for (let index = 0; index < 10; index += 1) {
      await user.click(zoomIn);
    }

    expect(viewport).toHaveAttribute("data-chem-zoom-boundary", "max");
    expect(zoomIn).toBeDisabled();
    expect(zoomOut).toBeEnabled();

    for (let index = 0; index < 16; index += 1) {
      await user.click(zoomOut);
    }

    expect(viewport).toHaveAttribute("data-chem-zoom-boundary", "min");
    expect(zoomOut).toBeDisabled();
    expect(zoomIn).toBeEnabled();
  });

  it("keeps extreme wheel panning within a visible-scene guard", async () => {
    render(await ChemistryReactionMindMapRoute());

    const viewport = screen.getByTestId("chemistry-graph-viewport");
    Object.defineProperty(viewport, "clientWidth", {
      configurable: true,
      value: 520,
    });
    Object.defineProperty(viewport, "clientHeight", {
      configurable: true,
      value: 360,
    });

    fireEvent.wheel(viewport, { deltaX: -10_000, deltaY: -10_000 });
    expect(Number(viewport.getAttribute("data-chem-offset-x"))).toBeLessThan(
      1_000,
    );
    expect(Number(viewport.getAttribute("data-chem-offset-y"))).toBeLessThan(
      1_000,
    );

    fireEvent.wheel(viewport, { deltaX: 10_000, deltaY: 10_000 });
    expect(Number(viewport.getAttribute("data-chem-offset-x"))).toBeGreaterThan(
      -1_000,
    );
    expect(Number(viewport.getAttribute("data-chem-offset-y"))).toBeGreaterThan(
      -1_000,
    );
  });

  it("keeps graph keyboard shortcuts available from focused map controls", async () => {
    const user = userEvent.setup();

    render(await ChemistryReactionMindMapRoute());

    const viewport = screen.getByTestId("chemistry-graph-viewport");
    const initialOffsetX = viewport.getAttribute("data-chem-offset-x");

    act(() => {
      viewport.focus();
    });
    await user.keyboard("{ArrowRight}");
    expect(viewport.getAttribute("data-chem-offset-x")).not.toBe(
      initialOffsetX,
    );

    const pannedOffsetX = viewport.getAttribute("data-chem-offset-x");
    act(() => {
      screen.getByTestId("chem-node-alcohol").focus();
    });
    await user.keyboard("{ArrowRight}");
    expect(viewport.getAttribute("data-chem-offset-x")).not.toBe(pannedOffsetX);

    const nodePannedOffsetX = viewport.getAttribute("data-chem-offset-x");
    act(() => {
      screen.getByTestId("chem-edge-alcohol-to-aldehyde-oxidation").focus();
    });
    await user.keyboard("{ArrowLeft}");
    expect(viewport.getAttribute("data-chem-offset-x")).not.toBe(
      nodePannedOffsetX,
    );
  });

  it("switches graph camera mode between full graph, node, edge, and route contexts", async () => {
    const user = userEvent.setup();

    render(await ChemistryReactionMindMapRoute());

    const viewport = screen.getByTestId("chemistry-graph-viewport");
    expect(viewport).toHaveAttribute("data-chem-camera-mode", "graph");
    expect(viewport).toHaveAttribute("data-chem-fit-scope", "full-graph");

    await user.click(screen.getByTestId("chem-node-alcohol"));
    expect(viewport).toHaveAttribute("data-chem-camera-mode", "node");
    expect(viewport).toHaveAttribute("data-chem-fit-scope", "active-context");

    await user.click(
      screen.getByTestId("chem-edge-alcohol-to-aldehyde-oxidation"),
    );
    expect(viewport).toHaveAttribute("data-chem-camera-mode", "edge");

    await user.selectOptions(screen.getByTestId("chem-route-start"), "alkene");
    await user.selectOptions(
      screen.getByTestId("chem-route-target"),
      "carboxylic-acid",
    );
    await user.click(screen.getByTestId("chem-route-search"));
    expect(viewport).toHaveAttribute("data-chem-camera-mode", "route");

    await user.click(screen.getByTestId("chem-route-clear"));
    expect(viewport).toHaveAttribute("data-chem-camera-mode", "graph");
    expect(viewport).toHaveAttribute("data-chem-fit-scope", "full-graph");
  });

  it("supports background drag-to-pan without breaking subsequent selection", async () => {
    const user = userEvent.setup();

    render(await ChemistryReactionMindMapRoute());

    const viewport = screen.getByTestId("chemistry-graph-viewport");
    const initialOffsetX = viewport.getAttribute("data-chem-offset-x");

    fireEvent.pointerDown(viewport, {
      pointerId: 1,
      pointerType: "mouse",
      clientX: 120,
      clientY: 120,
    });
    expect(document.activeElement).toBe(viewport);
    fireEvent.pointerMove(viewport, {
      pointerId: 1,
      pointerType: "mouse",
      clientX: 180,
      clientY: 150,
    });
    fireEvent.pointerUp(viewport, {
      pointerId: 1,
      pointerType: "mouse",
      clientX: 180,
      clientY: 150,
    });

    expect(viewport.getAttribute("data-chem-offset-x")).not.toBe(
      initialOffsetX,
    );

    await user.click(screen.getByTestId("chem-node-alcohol"));
    expect(screen.getByTestId("chem-node-details")).toBeInTheDocument();
  });

  it("supports touch background drag-to-pan on coarse pointers", async () => {
    render(await ChemistryReactionMindMapRoute());

    const viewport = screen.getByTestId("chemistry-graph-viewport");
    const initialOffsetY = viewport.getAttribute("data-chem-offset-y");

    fireEvent.pointerDown(viewport, {
      pointerId: 7,
      pointerType: "touch",
      clientX: 80,
      clientY: 80,
    });
    fireEvent.pointerMove(viewport, {
      pointerId: 7,
      pointerType: "touch",
      clientX: 116,
      clientY: 144,
    });
    fireEvent.pointerUp(viewport, {
      pointerId: 7,
      pointerType: "touch",
      clientX: 116,
      clientY: 144,
    });

    expect(viewport.getAttribute("data-chem-offset-y")).not.toBe(
      initialOffsetY,
    );
  });

  it("keeps captured background panning active when the pointer briefly leaves the viewport", async () => {
    render(await ChemistryReactionMindMapRoute());

    const viewport = screen.getByTestId(
      "chemistry-graph-viewport",
    ) as HTMLDivElement;
    const capturedPointers = new Set<number>();
    const setPointerCapture = vi.fn((pointerId: number) =>
      capturedPointers.add(pointerId),
    );
    const hasPointerCapture = vi.fn((pointerId: number) =>
      capturedPointers.has(pointerId),
    );
    const releasePointerCapture = vi.fn((pointerId: number) =>
      capturedPointers.delete(pointerId),
    );
    viewport.setPointerCapture = setPointerCapture;
    viewport.hasPointerCapture = hasPointerCapture;
    viewport.releasePointerCapture = releasePointerCapture;
    const initialOffsetX = viewport.getAttribute("data-chem-offset-x");

    fireEvent.pointerDown(viewport, {
      pointerId: 9,
      pointerType: "mouse",
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerLeave(viewport, {
      pointerId: 9,
      pointerType: "mouse",
      clientX: 210,
      clientY: 120,
    });
    fireEvent.pointerMove(viewport, {
      pointerId: 9,
      pointerType: "mouse",
      clientX: 230,
      clientY: 140,
    });
    fireEvent.pointerUp(viewport, {
      pointerId: 9,
      pointerType: "mouse",
      clientX: 230,
      clientY: 140,
    });

    expect(setPointerCapture).toHaveBeenCalledWith(9);
    expect(viewport.getAttribute("data-chem-offset-x")).not.toBe(
      initialOffsetX,
    );
    expect(releasePointerCapture).toHaveBeenCalledWith(9);
  });

  it("keeps compare mode usable after zooming", async () => {
    const user = userEvent.setup();

    render(await ChemistryReactionMindMapRoute());

    await user.click(screen.getByTestId("chem-zoom-in"));
    await user.click(screen.getByTestId("chem-node-alcohol"));
    await user.click(
      screen.getByTestId(
        "chem-node-compare-outgoing-alcohol-to-aldehyde-oxidation",
      ),
    );

    expect(screen.getByTestId("chemistry-compare-panel")).toBeInTheDocument();
  });

  it("omits a dedicated ionic-equation block when an edge only has explanatory ionic note text", async () => {
    const user = userEvent.setup();

    render(await ChemistryReactionMindMapRoute());

    await user.click(
      screen.getByTestId("chem-edge-alcohol-to-aldehyde-oxidation"),
    );

    const edgeDetails = screen.getByTestId("chem-edge-details");
    expect(
      within(edgeDetails).queryByLabelText(
        /Organic oxidation is usually taught/i,
      ),
    ).not.toBeInTheDocument();
    expect(
      within(edgeDetails).getByText(/Organic oxidation is usually taught/i),
    ).toBeInTheDocument();
  });

  it("shows reagent and catalyst formulas through notation hooks where they are available", async () => {
    const user = userEvent.setup();

    render(await ChemistryReactionMindMapRoute());

    await user.click(
      screen.getByTestId("chem-edge-aldehyde-to-alcohol-reduction"),
    );
    let edgeDetails = screen.getByTestId("chem-edge-details");
    expect(edgeDetails).toHaveTextContent(/sodium borohydride/i);
    expect(within(edgeDetails).getByLabelText(/NaBH4/i)).toBeInTheDocument();

    await user.click(
      screen.getByTestId("chem-edge-carboxylic-acid-to-ester-esterification"),
    );
    edgeDetails = screen.getByTestId("chem-edge-details");
    expect(edgeDetails).toHaveTextContent(/concentrated sulfuric acid/i);
    expect(
      within(edgeDetails).getByLabelText(/H2SO4\(l\)/i),
    ).toBeInTheDocument();
  });
});
