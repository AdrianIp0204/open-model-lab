import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SimulationShell } from "@/components/simulations/SimulationShell";

const originalMatchMedia = window.matchMedia;

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe("SimulationShell", () => {
  afterEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
  });

  it("renders dedicated shell slots and keeps support content below the main bench", () => {
    mockMatchMedia(true);

    const { container } = render(
      <SimulationShell
        accessibilityDescription="Interactive lab status"
        transport={<div data-testid="transport">Transport</div>}
        benchHeader={<div data-testid="bench-header">Bench header</div>}
        scene={<div data-testid="scene">Scene</div>}
        benchEquations={<div data-testid="bench-equations">Bench equations</div>}
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
    const benchEquationsSlot = container.querySelector('[data-testid="simulation-shell-bench-equations"]');

    expect(sceneSlot?.textContent).toContain("Scene");
    expect(benchEquationsSlot?.textContent).toContain("Bench equations");
    expect(sceneSlot).toContainElement(benchEquationsSlot as HTMLElement);
    expect(benchEquationsSlot).toHaveClass(
      "pointer-events-none",
      "absolute",
      "left-1.5",
      "top-1.5",
      "z-20",
    );
    expect(controlsSlot?.textContent).toContain("Controls");
    expect(graphsSlot?.textContent).toContain("Graphs");
    expect(transportSlot?.textContent).toContain("Transport");
    expect(benchHeaderSlot?.textContent).toContain("Bench header");
    expect(container.querySelector('[data-testid="equations"]')?.compareDocumentPosition(graphsSlot!)).toBe(
      Node.DOCUMENT_POSITION_PRECEDING,
    );
    expect(
      (sceneSlot as HTMLElement).compareDocumentPosition(graphsSlot as HTMLElement) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      (sceneSlot as HTMLElement).compareDocumentPosition(controlsSlot as HTMLElement) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      (transportSlot as HTMLElement).compareDocumentPosition(controlsSlot as HTMLElement) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      (transportSlot as HTMLElement).compareDocumentPosition(graphsSlot as HTMLElement) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      (benchEquationsSlot as HTMLElement).compareDocumentPosition(graphsSlot as HTMLElement) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("preserves the transport-first shell order at the sm breakpoint and wider", () => {
    mockMatchMedia(true);

    const { container } = render(
      <SimulationShell
        accessibilityDescription="Interactive lab status"
        transport={<button type="button">Transport</button>}
        benchHeader={<div data-testid="bench-header">Bench header</div>}
        scene={<div data-testid="scene">Scene</div>}
        benchEquations={<div data-testid="bench-equations">Bench equations</div>}
        controls={<button type="button">Controls</button>}
        graphs={<button type="button">Graphs</button>}
        equations={<div data-testid="equations">Equations</div>}
        status={<div data-testid="status">Status</div>}
      />,
    );

    const shell = container.querySelector("[data-simulation-shell-breakpoint]");
    const sceneSlot = container.querySelector('[data-testid="simulation-shell-scene"]');
    const controlsSlot = container.querySelector('[data-testid="simulation-shell-controls"]');
    const graphsSlot = container.querySelector('[data-testid="simulation-shell-graphs"]');
    const transportSlot = container.querySelector('[data-testid="simulation-shell-transport"]');
    const benchHeaderSlot = container.querySelector('[data-testid="simulation-shell-bench-header"]');

    expect(shell).toHaveAttribute("data-simulation-shell-breakpoint", "sm");
    expect(transportSlot?.compareDocumentPosition(benchHeaderSlot as HTMLElement)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(
      (transportSlot as HTMLElement).compareDocumentPosition(sceneSlot as HTMLElement) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      (graphsSlot as HTMLElement).compareDocumentPosition(controlsSlot as HTMLElement) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(benchHeaderSlot).toHaveClass("order-2", "lg:order-1");
    expect(sceneSlot).toHaveClass("order-1");
    expect(graphsSlot).toHaveClass("order-3");
    expect(controlsSlot).toHaveClass("order-3", "lg:order-3");
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

  it("marks the focus-stage tone for concept benches that need stronger visual hierarchy", () => {
    const { container } = render(
      <SimulationShell
        accessibilityDescription="Interactive lab status"
        stageTone="focus"
        transport={<div data-testid="transport">Transport</div>}
        benchHeader={<section data-testid="bench-header">Bench header</section>}
        scene={<section data-testid="scene">Scene</section>}
        controls={<div data-testid="controls">Controls</div>}
        interactionRail={<section data-testid="interaction-rail">Interaction rail</section>}
        graphs={<section data-testid="graphs">Graphs</section>}
        equations={<div data-testid="equations">Equations</div>}
        status={<div data-testid="status">Status</div>}
      />,
    );

    const shell = container.querySelector('[data-stage-tone="focus"]');
    const benchHeaderSlot = container.querySelector('[data-focus-surface="bench-header"]');
    const sceneSlot = container.querySelector('[data-focus-surface="scene"]');
    const railSlot = container.querySelector('[data-focus-surface="rail"]');
    const graphsSlot = container.querySelector('[data-focus-surface="graphs"]');

    expect(shell).toHaveClass("simulation-shell--focus-stage");
    expect(benchHeaderSlot).toContainElement(screen.getByTestId("bench-header"));
    expect(sceneSlot).toContainElement(screen.getByTestId("scene"));
    expect(railSlot).toContainElement(screen.getByTestId("interaction-rail"));
    expect(graphsSlot).toContainElement(screen.getByTestId("graphs"));
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
