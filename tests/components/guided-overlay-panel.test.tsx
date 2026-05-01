import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GuidedOverlayPanel } from "@/components/concepts/GuidedOverlayPanel";

describe("GuidedOverlayPanel", () => {
  const overlays = [
    {
      id: "phaseArrow",
      label: "Phase arrow",
      shortDescription: "Shows where the motion starts along the cycle.",
      whatToNotice: ["It shifts the starting point.", "It does not change amplitude."],
      whyItMatters:
        "Phase helps compare two waves that have the same shape but start differently.",
      relatedControls: ["phase"],
      relatedGraphTabs: ["displacement"],
      relatedEquationVariables: ["phase"],
      defaultOn: true,
    },
    {
      id: "velocityVector",
      label: "Velocity vector",
      shortDescription: "Shows how quickly the system is moving at each point in time.",
      whatToNotice: ["It changes direction as the motion turns around."],
      relatedControls: ["omega"],
      relatedGraphTabs: ["velocity"],
      relatedEquationVariables: ["omega"],
      defaultOn: false,
    },
  ];

  const controls = [
    {
      id: "phase",
      kind: "slider" as const,
      label: "Phase",
      param: "phase",
      min: 0,
      max: 1,
      step: 0.1,
    },
    {
      id: "omega",
      kind: "slider" as const,
      label: "Angular frequency",
      param: "omega",
      min: 0,
      max: 4,
      step: 0.1,
    },
  ];

  const graphs = [
    {
      id: "displacement",
      label: "Displacement",
      xLabel: "time",
      yLabel: "x",
      series: ["displacement"],
    },
    {
      id: "velocity",
      label: "Velocity",
      xLabel: "time",
      yLabel: "v",
      series: ["velocity"],
    },
  ];

  const variableLinks = [
    {
      id: "phase",
      symbol: "\\phi",
      label: "Phase",
      param: "phase",
      tone: "coral" as const,
      description: "Phase",
      equationIds: ["eq-1"],
    },
    {
      id: "omega",
      symbol: "\\omega",
      label: "Angular frequency",
      param: "omega",
      tone: "teal" as const,
      description: "Angular frequency",
      equationIds: ["eq-1"],
    },
  ];

  it("shows focused overlay guidance and dispatches focus/toggle through the real handlers", async () => {
    const user = userEvent.setup();
    const onFocusOverlay = vi.fn();
    const onToggleOverlay = vi.fn();

    render(
      <GuidedOverlayPanel
        title="Guided overlays"
        intro="Start here"
        overlays={[...overlays]}
        values={{ phaseArrow: true, velocityVector: false }}
        focusedOverlayId="phaseArrow"
        controls={controls}
        graphs={graphs}
        variableLinks={variableLinks}
        activeGraphId="displacement"
        onFocusOverlay={onFocusOverlay}
        onToggleOverlay={onToggleOverlay}
      />,
    );

    expect(screen.getByText("Start here")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Phase arrow/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Velocity vector/i })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: /Hide overlay/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText("Visible").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Hidden").length).toBeGreaterThan(0);
    expect(screen.getByText("1 of 2 overlay cues visible")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Phase arrow" })).toBeInTheDocument();
    expect(screen.getByText(/shifts the starting point/i)).toBeInTheDocument();
    expect(screen.getByText(/Why it matters/i)).toBeInTheDocument();
    const relatedTargets = screen.getByRole("list", { name: "Related overlay targets" });
    expect(within(relatedTargets).getAllByRole("listitem")).toHaveLength(3);
    expect(relatedTargets).toHaveTextContent("Control");
    expect(relatedTargets).toHaveTextContent("Graph");
    expect(relatedTargets).toHaveTextContent("Equation");

    await user.click(screen.getByRole("button", { name: /Velocity vector/i }));
    await user.click(screen.getByRole("button", { name: /Hide overlay/i }));

    expect(onFocusOverlay).toHaveBeenCalledWith("velocityVector");
    expect(onToggleOverlay).toHaveBeenCalledWith("phaseArrow", false);
  });

  it("omits the why-it-matters block when not provided", () => {
    render(
      <GuidedOverlayPanel
        overlays={[
          {
            id: "amplitudeBand",
            label: "Amplitude band",
            shortDescription: "Marks the turning points of the oscillation.",
            whatToNotice: ["The peak height stays fixed when amplitude is fixed."],
            relatedControls: ["amplitude"],
            relatedGraphTabs: ["displacement"],
            relatedEquationVariables: ["amplitude"],
            defaultOn: false,
          },
        ]}
        values={{ amplitudeBand: false }}
        focusedOverlayId="amplitudeBand"
        controls={[
          {
            id: "amplitude",
            kind: "slider",
            label: "Amplitude",
            param: "amplitude",
            min: 0,
            max: 2,
            step: 0.1,
          },
        ]}
        graphs={[{ id: "displacement", label: "Displacement", xLabel: "t", yLabel: "x", series: ["x"] }]}
        variableLinks={[
          {
            id: "amplitude",
            symbol: "A",
            label: "Amplitude",
            param: "amplitude",
            tone: "amber",
            description: "Amplitude",
            equationIds: ["eq-1"],
          },
        ]}
        onFocusOverlay={() => undefined}
        onToggleOverlay={() => undefined}
      />,
    );

    expect(screen.getByRole("heading", { name: "Amplitude band" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Show overlay/i })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getAllByText("Hidden").length).toBeGreaterThan(1);
    expect(screen.queryByText(/Why it matters/i)).not.toBeInTheDocument();
    const relatedTargets = screen.getByRole("list", { name: "Related overlay targets" });
    expect(within(relatedTargets).getAllByRole("listitem")).toHaveLength(3);
    expect(relatedTargets).toHaveTextContent("Control");
    expect(relatedTargets).toHaveTextContent("Graph");
    expect(relatedTargets).toHaveTextContent("Equation");
  });
});
