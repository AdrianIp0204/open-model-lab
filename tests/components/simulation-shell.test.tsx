import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SimulationShell } from "@/components/simulations/SimulationShell";

describe("SimulationShell", () => {
  it("renders dedicated shell slots and keeps support content below the main bench", () => {
    const { container } = render(
      <SimulationShell
        accessibilityDescription="Interactive lab status"
        transport={<div data-testid="transport">Transport</div>}
        benchHeader={<div data-testid="bench-header">Bench header</div>}
        scene={<div data-testid="scene">Scene</div>}
        controls={<div data-testid="controls">Controls</div>}
        graphs={<div data-testid="graphs">Graphs</div>}
        notice={<div data-testid="notice">Notice</div>}
        interactionRail={<div data-testid="interaction-rail">Interaction rail</div>}
        equations={<div data-testid="equations">Equations</div>}
        supportDock={<div data-testid="support-dock">Support dock</div>}
        status={<div data-testid="status">Status</div>}
      />,
    );

    const sceneSlot = container.querySelector('[data-testid="simulation-shell-scene"]');
    const controlsSlot = container.querySelector('[data-testid="simulation-shell-controls"]');
    const graphsSlot = container.querySelector('[data-testid="simulation-shell-graphs"]');
    const transportSlot = container.querySelector('[data-testid="simulation-shell-transport"]');
    const benchHeaderSlot = container.querySelector('[data-testid="simulation-shell-bench-header"]');

    expect(sceneSlot?.textContent).toContain("Scene");
    expect(controlsSlot?.textContent).toContain("Controls");
    expect(graphsSlot?.textContent).toContain("Graphs");
    expect(transportSlot?.textContent).toContain("Transport");
    expect(benchHeaderSlot?.textContent).toContain("Bench header");
    expect(container.querySelector('[data-testid="equations"]')?.compareDocumentPosition(graphsSlot!)).toBe(
      Node.DOCUMENT_POSITION_PRECEDING,
    );
  });

  it("docks the first action with controls when only the interaction rail exists", () => {
    const { container } = render(
      <SimulationShell
        accessibilityDescription="Interactive lab status"
        controlsAnchorId="live-controls"
        controlsAnchorLabel="Controls"
        transport={<div data-testid="transport">Transport</div>}
        scene={<div data-testid="scene">Scene</div>}
        controls={<div data-testid="controls">Controls</div>}
        graphs={<div data-testid="graphs">Graphs</div>}
        interactionRail={<div data-testid="interaction-rail">Interaction rail</div>}
        equations={<div data-testid="equations">Equations</div>}
        status={<div data-testid="status">Status</div>}
      />,
    );

    const controlsSlot = container.querySelector('[data-testid="simulation-shell-controls"]');
    const controlsPanel = container.querySelector('[data-testid="simulation-shell-control-panel"]');
    const controls = container.querySelector('[data-testid="controls"]');
    const firstAction = container.querySelector('[data-testid="simulation-shell-first-action"]');
    const guides = container.querySelector('[data-testid="simulation-shell-guides"]');
    expect(firstAction).not.toBeNull();
    expect(firstAction?.textContent).toContain("Interaction rail");
    expect(controlsSlot).not.toBeNull();
    expect(controlsPanel).toHaveAttribute("id", "live-controls");
    expect(controlsPanel).toHaveAttribute("aria-label", "Controls");
    expect(controls).not.toBeNull();
    expect(controlsSlot).toContainElement(firstAction as HTMLElement);
    expect(
      (firstAction as HTMLElement).compareDocumentPosition(controls as HTMLElement) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(guides).toBeNull();
  });

  it("keeps notice prompts below the bench while the first action stays by controls", () => {
    const { container } = render(
      <SimulationShell
        accessibilityDescription="Interactive lab status"
        transport={<div data-testid="transport">Transport</div>}
        scene={<div data-testid="scene">Scene</div>}
        controls={<div data-testid="controls">Controls</div>}
        graphs={<div data-testid="graphs">Graphs</div>}
        notice={<div data-testid="notice">Notice</div>}
        interactionRail={<div data-testid="interaction-rail">Interaction rail</div>}
        equations={<div data-testid="equations">Equations</div>}
        status={<div data-testid="status">Status</div>}
      />,
    );

    const guides = container.querySelector('[data-testid="simulation-shell-guides"]');
    const firstAction = container.querySelector('[data-testid="simulation-shell-first-action"]');
    expect(guides).not.toBeNull();
    expect(guides?.className).not.toContain("lg:grid-cols-2");
    expect(guides?.textContent).toContain("Notice");
    expect(firstAction).not.toBeNull();
    expect(firstAction?.textContent).toContain("Interaction rail");
  });
});
