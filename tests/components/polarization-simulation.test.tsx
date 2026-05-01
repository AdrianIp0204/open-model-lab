import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PolarizationSimulation } from "@/components/simulations/PolarizationSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(): ConceptSimulationSource {
  const concept = getConceptBySlug("polarization");
  const simulationDescription = concept.accessibility.simulationDescription.paragraphs.join(" ");
  const graphSummary = concept.accessibility.graphSummary.paragraphs.join(" ");

  return {
    id: concept.id,
    title: concept.title,
    summary: concept.summary,
    slug: concept.slug,
    topic: concept.topic,
    equations: concept.equations,
    variableLinks: concept.variableLinks,
    accessibility: {
      simulationDescription,
      graphSummary,
    },
    simulation: {
      ...concept.simulation,
      graphs: concept.graphs,
      accessibility: {
        simulationDescription,
        graphSummary,
      },
    },
  };
}

describe("PolarizationSimulation", () => {
  it("renders compare badges for both polarization setups", () => {
    const source = buildSimulationSource();

    render(
      <PolarizationSimulation
        concept={source}
        params={{
          inputAmplitude: 1.1,
          inputAngle: 20,
          polarizerAngle: 50,
          unpolarized: false,
        }}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            inputAmplitude: 1.1,
            inputAngle: 20,
            polarizerAngle: 50,
            unpolarized: false,
          },
          setupB: {
            inputAmplitude: 1.1,
            inputAngle: 30,
            polarizerAngle: 70,
            unpolarized: true,
          },
          labelA: "Linear",
          labelB: "Unpolarized",
        }}
      />,
    );

    expect(
      screen.getByText((_, node) => node?.textContent === "Linear: theta_in 20°, axis 50°, I/I0 0.75"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, node) => node?.textContent === "Unpolarized: unpolarized, axis 70°, I/I0 0.5",
      ),
    ).toBeInTheDocument();
  });

  it("keeps the unpolarized first-pass cues readable on the bench", () => {
    const source = buildSimulationSource();

    render(
      <PolarizationSimulation
        concept={source}
        params={{
          inputAmplitude: 1.1,
          inputAngle: 30,
          polarizerAngle: 70,
          unpolarized: true,
        }}
        setParam={vi.fn()}
        overlayValues={{
          transverseGuide: true,
          projectionGuide: true,
          intensityGuide: true,
        }}
      />,
    );

    expect(screen.getByText(/first polarizer averages to half power/i)).toBeInTheDocument();
    expect(screen.getByText(/detector fraction 0.5/i)).toBeInTheDocument();
    expect(screen.getByText(/no fixed axis/i)).toBeInTheDocument();
  });

  it("shows a response-preview badge when the graph hovers a polarizer angle", () => {
    const source = buildSimulationSource();

    render(
      <PolarizationSimulation
        concept={source}
        params={{
          inputAmplitude: 1.1,
          inputAngle: 20,
          polarizerAngle: 50,
          unpolarized: false,
        }}
        setParam={vi.fn()}
        graphPreview={{
          kind: "response",
          graphId: "power-split",
          seriesId: "transmitted-power",
          seriesLabel: "Transmitted I/I0",
          point: { x: 75, y: 0.25 },
          pointIndex: 75,
          pointCount: 181,
        }}
      />,
    );

    expect(screen.getByText(/preview axis = 75°/i)).toBeInTheDocument();
  });

  it("localizes visible polarization bench chrome in zh-HK", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";
    const source = buildSimulationSource();

    render(
      <PolarizationSimulation
        concept={source}
        params={{
          inputAmplitude: 1.1,
          inputAngle: 30,
          polarizerAngle: 70,
          unpolarized: true,
        }}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            inputAmplitude: 1.1,
            inputAngle: 20,
            polarizerAngle: 50,
            unpolarized: false,
          },
          setupB: {
            inputAmplitude: 1.1,
            inputAngle: 30,
            polarizerAngle: 70,
            unpolarized: true,
          },
        }}
        overlayValues={{
          transverseGuide: true,
          projectionGuide: true,
          intensityGuide: true,
        }}
        graphPreview={{
          kind: "response",
          graphId: "power-split",
          seriesId: "transmitted-power",
          seriesLabel: "Transmitted I/I0",
          point: { x: 75, y: 0.25 },
          pointIndex: 75,
          pointCount: 181,
        }}
      />,
    );

    expect(screen.getByText("預覽軸角 = 75°")).toBeInTheDocument();
    expect(screen.getByText("偏振片狀態")).toBeInTheDocument();
    expect(screen.getByText("第一片偏振片平均只讓一半強度通過")).toBeInTheDocument();
    expect(screen.getByText("探測器比例 0.5")).toBeInTheDocument();
    expect(screen.getByText("沒有固定軸向")).toBeInTheDocument();
    expect(
      screen.getByText((_, node) => node?.textContent === "設定 A: θ_in 20°, 軸 50°, I/I0 0.75"),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, node) => node?.textContent === "設定 B: 非偏振, 軸 70°, I/I0 0.5"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/preview axis =/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Polarizer state/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Setup A/i)).not.toBeInTheDocument();
  });
});
