import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ControlPanel } from "@/components/simulations";

describe("ControlPanel", () => {
  it("renders sliders, toggles, and presets", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onPreset = vi.fn();
    const onReset = vi.fn();

    render(
      <ControlPanel
        controls={[
          {
            id: "amplitude",
            kind: "slider",
            label: "Amplitude",
            param: "amplitude",
            min: 0,
            max: 10,
            step: 0.5,
            unit: "m",
            description: "Oscillation height",
          },
          {
            id: "damping",
            kind: "toggle",
            label: "Damping",
            param: "damping",
            description: "Adds decay",
          },
        ]}
        presets={[
          { id: "default", label: "Default", description: "Baseline", values: { amplitude: 2 } },
        ]}
        values={{ amplitude: 2, damping: false }}
        activePresetId={null}
        onChange={onChange}
        onPreset={onPreset}
        onReset={onReset}
      />,
    );

    expect(screen.getByText("Amplitude")).toBeInTheDocument();
    expect(screen.getByText("Damping")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Default Baseline" }));
    await user.click(screen.getByRole("button", { name: "Reset" }));
    await user.click(screen.getByLabelText("Damping"));

    expect(onPreset).toHaveBeenCalledWith("default");
    expect(onReset).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith("damping", true);
  });

  it("keeps authored primary controls visible, leaves passive cues collapsed, and collapses advanced tools again on reset", async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();

    render(
      <ControlPanel
        controls={[
          {
            id: "amplitude",
            kind: "slider",
            label: "Amplitude",
            param: "amplitude",
            min: 0,
            max: 10,
            step: 0.5,
          },
          {
            id: "omega",
            kind: "slider",
            label: "Angular frequency",
            param: "omega",
            min: 0,
            max: 10,
            step: 0.5,
          },
          {
            id: "phase",
            kind: "slider",
            label: "Phase",
            param: "phase",
            min: 0,
            max: 6.28,
            step: 0.01,
          },
          {
            id: "show-secant",
            kind: "toggle",
            label: "Show secant",
            param: "showSecant",
          },
        ]}
        presets={[
          { id: "calm-start", label: "Calm start", values: { amplitude: 1 } },
          { id: "fast-cycle", label: "Fast cycle", values: { amplitude: 2 } },
        ]}
        primaryControlIds={["amplitude", "omega"]}
        primaryPresetIds={[]}
        values={{ amplitude: 2, omega: 1.5, phase: 0.3, showSecant: true }}
        activePresetId={null}
        activeVariableId="phase-variable"
        highlightedControlIds={["phase"]}
        variableLinks={[
          {
            id: "amplitude-variable",
            symbol: "A",
            label: "Amplitude",
            param: "amplitude",
            tone: "teal",
            description: "Amplitude variable",
            equationIds: [],
          },
          {
            id: "phase-variable",
            symbol: "\\phi",
            label: "Phase",
            param: "phase",
            tone: "coral",
            description: "Phase variable",
            equationIds: [],
          },
        ]}
        onChange={vi.fn()}
        onPreset={vi.fn()}
        onReset={onReset}
      />,
    );

    const moreTools = screen.getByTestId("control-panel-more-tools");
    const toggle = within(moreTools).getByRole("button", { name: "More tools" });

    expect(moreTools).not.toBeNull();
    expect(screen.getByRole("slider", { name: "Amplitude" }).closest("details")).toBeNull();
    expect(screen.getByRole("slider", { name: "Angular frequency" }).closest("details")).toBeNull();
    expect(screen.queryByRole("slider", { name: "Phase" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Calm start/i })).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("slider", { name: "Phase" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Calm start/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reset" }));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps legacy default control visibility when no primary ids are authored", () => {
    render(
      <ControlPanel
        controls={[
          {
            id: "graph-index",
            kind: "slider",
            label: "Graph",
            param: "graphIndex",
            min: 0,
            max: 2,
            step: 1,
          },
          {
            id: "start-node",
            kind: "slider",
            label: "Start node",
            param: "startNodeIndex",
            min: 0,
            max: 7,
            step: 1,
          },
          {
            id: "target-node",
            kind: "slider",
            label: "Target node",
            param: "targetNodeIndex",
            min: 0,
            max: 7,
            step: 1,
          },
          {
            id: "traversal-mode",
            kind: "slider",
            label: "Traversal mode",
            param: "traversalMode",
            min: 0,
            max: 1,
            step: 1,
          },
          {
            id: "show-cue",
            kind: "toggle",
            label: "Show cue",
            param: "showCue",
          },
        ]}
        presets={[
          { id: "default", label: "Default", values: { graphIndex: 0 } },
          { id: "alt", label: "Alternate", values: { graphIndex: 1 } },
        ]}
        values={{
          graphIndex: 0,
          startNodeIndex: 0,
          targetNodeIndex: 7,
          traversalMode: 0,
          showCue: true,
        }}
        activePresetId={null}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("slider", { name: "Graph" })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Start node" })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Target node" })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Traversal mode" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Default" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Alternate" })).toBeInTheDocument();
    const moreTools = screen.getByTestId("control-panel-more-tools");
    const toggle = within(moreTools).getByRole("button", { name: "More tools" });
    expect(moreTools).not.toBeNull();
    expect(screen.queryByRole("checkbox", { name: "Show cue" })).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("auto-expands advanced tools only for explicit reveal paths", () => {
    render(
      <ControlPanel
        controls={[
          {
            id: "amplitude",
            kind: "slider",
            label: "Amplitude",
            param: "amplitude",
            min: 0,
            max: 10,
            step: 0.5,
          },
          {
            id: "phase",
            kind: "slider",
            label: "Phase",
            param: "phase",
            min: 0,
            max: 6.28,
            step: 0.01,
          },
        ]}
        presets={[]}
        primaryControlIds={["amplitude"]}
        values={{ amplitude: 2, phase: 0.3 }}
        activePresetId={null}
        highlightedControlIds={["phase"]}
        autoRevealControlIds={["phase"]}
        onChange={vi.fn()}
      />,
    );

    const moreTools = screen.getByTestId("control-panel-more-tools");
    const toggle = within(moreTools).getByRole("button", { name: "More tools" });

    expect(moreTools).not.toBeNull();
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("auto-expands advanced controls when a hidden control carries restored non-default state", () => {
    render(
      <ControlPanel
        controls={[
          {
            id: "amplitude",
            kind: "slider",
            label: "Amplitude",
            param: "amplitude",
            min: 0,
            max: 10,
            step: 0.5,
          },
          {
            id: "phase",
            kind: "slider",
            label: "Phase",
            param: "phase",
            min: 0,
            max: 6.28,
            step: 0.01,
          },
        ]}
        presets={[]}
        defaultValues={{ amplitude: 2, phase: 0 }}
        primaryControlIds={["amplitude"]}
        values={{ amplitude: 2, phase: 1.57 }}
        activePresetId={null}
        onChange={vi.fn()}
      />,
    );

    const moreTools = screen.getByTestId("control-panel-more-tools");
    const toggle = within(moreTools).getByRole("button", { name: "More tools" });

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("slider", { name: "Phase" })).toBeInTheDocument();
  });

  it("renders supplementary tools inside More tools and keeps them hidden until expanded", async () => {
    const user = userEvent.setup();

    render(
      <ControlPanel
        controls={[
          {
            id: "amplitude",
            kind: "slider",
            label: "Amplitude",
            param: "amplitude",
            min: 0,
            max: 10,
            step: 0.5,
          },
        ]}
        presets={[]}
        values={{ amplitude: 2 }}
        activePresetId={null}
        supplementaryTools={<button type="button">Enter compare mode</button>}
        onChange={vi.fn()}
      />,
    );

    const moreTools = screen.getByTestId("control-panel-more-tools");
    const toggle = within(moreTools).getByRole("button", { name: "More tools" });

    expect(screen.queryByRole("button", { name: "Enter compare mode" })).not.toBeInTheDocument();

    await user.click(toggle);

    expect(screen.getByTestId("control-panel-supplementary-tools")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enter compare mode" })).toBeInTheDocument();
  });

  it("can keep supplementary tools open even when no hidden controls or presets exist", () => {
    render(
      <ControlPanel
        controls={[
          {
            id: "amplitude",
            kind: "slider",
            label: "Amplitude",
            param: "amplitude",
            min: 0,
            max: 10,
            step: 0.5,
          },
        ]}
        presets={[]}
        values={{ amplitude: 2 }}
        activePresetId={null}
        supplementaryTools={<button type="button">Reset variant</button>}
        forceMoreToolsOpen
        onChange={vi.fn()}
      />,
    );

    const moreTools = screen.getByTestId("control-panel-more-tools");
    const toggle = within(moreTools).getByRole("button", { name: "More tools" });

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Reset variant" })).toBeInTheDocument();
  });
});
