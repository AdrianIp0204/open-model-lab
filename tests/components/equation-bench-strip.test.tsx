import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EquationBenchStrip } from "@/components/concepts/EquationPanel";
import type { SimulationEquation } from "@/lib/physics";

const equations: SimulationEquation[] = [
  {
    id: "shm-displacement",
    label: "Displacement",
    latex: "x(t)=A\\cos(\\omega t+\\phi)",
    meaning: "Displacement follows the current amplitude, frequency, and phase.",
  },
  {
    id: "shm-velocity",
    label: "Velocity",
    latex: "v(t)=-A\\omega\\sin(\\omega t+\\phi)",
    meaning: "Velocity is largest as the oscillator crosses equilibrium.",
  },
];

describe("EquationBenchStrip", () => {
  it("renders compact inline equation rows without a visible panel heading", () => {
    render(<EquationBenchStrip equations={equations} />);

    const strip = screen.getByTestId("bench-equation-strip");

    expect(strip).toHaveAccessibleName("Keep this in view while adjusting controls");
    expect(strip).toHaveAttribute("data-equation-variant", "hud");
    expect(strip).toHaveAttribute("data-equation-layout", "compact-inline");
    expect(within(strip).queryByText("Key relationship")).not.toBeInTheDocument();

    const displacement = within(strip).getByTestId("bench-equation-shm-displacement");
    const velocity = within(strip).getByTestId("bench-equation-shm-velocity");

    expect(displacement).toHaveAttribute("data-equation-row-variant", "inline");
    expect(velocity).toHaveAttribute("data-equation-row-variant", "inline");
    expect(displacement).toHaveTextContent("Displacement");
    expect(velocity).toHaveTextContent("Velocity");
    expect(
      within(displacement).getByRole("math", {
        name: /x\(t\).*A.*cos/i,
      }),
    ).toBeInTheDocument();
    expect(
      within(velocity).getByRole("math", {
        name: /v\(t\).*A.*omega.*sin/i,
      }),
    ).toBeInTheDocument();
  });
});
