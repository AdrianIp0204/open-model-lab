import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AirColumnResonanceSimulation } from "@/components/simulations/AirColumnResonanceSimulation";
import { BeatsSimulation } from "@/components/simulations/BeatsSimulation";
import { DiffractionSimulation } from "@/components/simulations/DiffractionSimulation";
import { DoubleSlitInterferenceSimulation } from "@/components/simulations/DoubleSlitInterferenceSimulation";
import { DopplerEffectSimulation } from "@/components/simulations/DopplerEffectSimulation";
import { StandingWavesSimulation } from "@/components/simulations/StandingWavesSimulation";
import { SoundWavesLongitudinalSimulation } from "@/components/simulations/SoundWavesLongitudinalSimulation";
import { WaveInterferenceSimulation } from "@/components/simulations/WaveInterferenceSimulation";
import { WaveSpeedWavelengthSimulation } from "@/components/simulations/WaveSpeedWavelengthSimulation";
import { getConceptBySlug } from "@/lib/content";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(slug: string): ConceptSimulationSource {
  const concept = getConceptBySlug(slug);
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

describe("wave-stage simulation migrations", () => {
  it("renders compare-aware wave labels without rewriting the stage", () => {
    const source = buildSimulationSource("wave-speed-wavelength");

    render(
      <WaveSpeedWavelengthSimulation
        concept={source}
        params={{
          amplitude: 0.8,
          wavelength: 1.6,
          frequency: 1.2,
          probeX: 2,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            amplitude: 0.8,
            wavelength: 1.6,
            frequency: 1.2,
            probeX: 2,
          },
          setupB: {
            amplitude: 0.8,
            wavelength: 2.4,
            frequency: 0.8,
            probeX: 3,
          },
          labelA: "Baseline",
          labelB: "Variant",
        }}
      />,
    );

    expect(screen.getAllByText("Baseline").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Variant").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Wave state").length).toBeGreaterThan(0);
  });

  it("adds a compact mobile summary for the traveling-wave readout", () => {
    const source = buildSimulationSource("wave-speed-wavelength");

    render(
      <WaveSpeedWavelengthSimulation
        concept={source}
        params={{
          amplitude: 0.8,
          wavelength: 1.6,
          frequency: 1.2,
          probeX: 2,
        }}
        time={0}
        setParam={vi.fn()}
      />,
    );

    expect(screen.getAllByText("Wave state").length).toBeGreaterThan(1);
    expect(screen.getAllByText(/Delay to the probe/i).length).toBeGreaterThan(0);
  });

  it("keeps x-axis probe dragging keyboard-addressable through the shared surface", () => {
    const source = buildSimulationSource("standing-waves");
    const setParam = vi.fn();

    render(
      <StandingWavesSimulation
        concept={source}
        params={{
          amplitude: 0.6,
          length: 3,
          harmonic: 2,
          frequency: 1.5,
          probeX: 1.2,
        }}
        time={0}
        setParam={setParam}
      />,
    );

    fireEvent.keyDown(
      screen.getByRole("button", { name: /move probe position/i }),
      { key: "ArrowRight" },
    );

    expect(setParam).toHaveBeenCalledWith("probeX", 1.25);
  });

  it("keeps y-axis probe dragging keyboard-addressable through the shared surface", () => {
    const source = buildSimulationSource("wave-interference");
    const setParam = vi.fn();

    render(
      <WaveInterferenceSimulation
        concept={source}
        params={{
          amplitudeA: 1,
          amplitudeB: 1,
          wavelength: 1.5,
          frequency: 1,
          phaseOffset: 0,
          probeY: 0,
        }}
        time={0}
        setParam={setParam}
      />,
    );

    fireEvent.keyDown(
      screen.getByRole("button", { name: /move probe height/i }),
      { key: "ArrowUp" },
    );

    expect(setParam).toHaveBeenCalledWith("probeY", 0.1);
  });

  it("renders the diffraction bench and keeps probe dragging keyboard-addressable", () => {
    const source = buildSimulationSource("diffraction");
    const setParam = vi.fn();

    render(
      <DiffractionSimulation
        concept={source}
        params={{
          wavelength: 1,
          slitWidth: 2.4,
          probeY: 0.6,
        }}
        time={0}
        setParam={setParam}
        overlayValues={{
          slitWidthGuide: true,
          edgePaths: true,
          firstMinimumGuide: true,
        }}
      />,
    );

    expect(screen.getAllByText("Live readout").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/spread ratio/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/slit width/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/delta r_edge/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/r_top/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/incoming wavefronts/i).length).toBeGreaterThan(0);

    fireEvent.keyDown(
      screen.getByRole("button", { name: /move probe height/i }),
      { key: "ArrowUp" },
    );

    expect(setParam).toHaveBeenCalledWith("probeY", 0.7);
  });

  it("renders the double-slit bench and keeps probe dragging keyboard-addressable", () => {
    const source = buildSimulationSource("double-slit-interference");
    const setParam = vi.fn();

    render(
      <DoubleSlitInterferenceSimulation
        concept={source}
        params={{
          wavelength: 0.78,
          slitSeparation: 2.6,
          screenDistance: 5.4,
          probeY: 0.8,
        }}
        time={0}
        setParam={setParam}
        overlayValues={{
          geometryGuide: true,
          pathDifference: true,
          fringeSpacingGuide: true,
          phaseWheel: true,
        }}
      />,
    );

    expect(screen.getAllByText("Optics state").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/incoming wavefronts/i).length).toBeGreaterThan(0);

    fireEvent.keyDown(
      screen.getByRole("button", { name: /move probe height/i }),
      { key: "ArrowUp" },
    );

    expect(setParam).toHaveBeenCalledWith("probeY", 0.9);
  });

  it("renders compare-aware sound labels and keeps longitudinal probe dragging keyboard-addressable", () => {
    const source = buildSimulationSource("sound-waves-longitudinal-motion");
    const setParam = vi.fn();

    render(
      <SoundWavesLongitudinalSimulation
        concept={source}
        params={{
          amplitude: 0.12,
          waveSpeed: 2.4,
          wavelength: 1.8,
          probeX: 2.25,
        }}
        time={0}
        setParam={setParam}
        compare={{
          activeTarget: "a",
          setupA: {
            amplitude: 0.12,
            waveSpeed: 2.4,
            wavelength: 1.8,
            probeX: 2.25,
          },
          setupB: {
            amplitude: 0.12,
            waveSpeed: 2.4,
            wavelength: 1.8,
            probeX: 4.05,
          },
          labelA: "Baseline",
          labelB: "One wavelength farther",
        }}
      />,
    );

    expect(screen.getAllByText("Sound state").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Baseline").length).toBeGreaterThan(0);
    expect(screen.getAllByText("One wavelength farther").length).toBeGreaterThan(0);

    fireEvent.keyDown(
      screen.getAllByRole("button", { name: /move probe position/i })[0]!,
      { key: "ArrowRight" },
    );

    expect(setParam).toHaveBeenCalledWith("probeX", 2.3);
  });

  it("renders the shared sound bench with frequency-driven pitch controls and the intensity cue", () => {
    const source = buildSimulationSource("pitch-frequency-loudness-intensity");

    render(
      <SoundWavesLongitudinalSimulation
        concept={source}
        params={{
          amplitude: 0.18,
          waveSpeed: 2.4,
          frequency: 1.1,
          probeX: 2.2,
        }}
        time={0}
        setParam={vi.fn()}
      />,
    );

    expect(screen.getAllByText("Sound state").length).toBeGreaterThan(0);
    expect(screen.getAllByText("I cue").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/pitch follows frequency/i).length).toBeGreaterThan(0);
  });

  it("renders the beats bench with compare-aware labels and the beat-state readout", () => {
    const source = buildSimulationSource("beats");

    render(
      <BeatsSimulation
        concept={source}
        params={{
          amplitude: 0.12,
          frequencyA: 1,
          frequencyB: 1.2,
        }}
        time={0}
        setParam={vi.fn()}
        overlayValues={{
          envelopeGuide: true,
          loudnessCue: true,
          differenceGuide: true,
        }}
        compare={{
          activeTarget: "b",
          setupA: {
            amplitude: 0.12,
            frequencyA: 1.3,
            frequencyB: 1.6,
          },
          setupB: {
            amplitude: 0.12,
            frequencyA: 0.7,
            frequencyB: 1,
          },
          labelA: "Higher carrier",
          labelB: "Lower carrier",
        }}
      />,
    );

    expect(screen.getAllByText("Beat state").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Higher carrier").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Lower carrier").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/delta f/i).length).toBeGreaterThan(0);
  });

  it("renders the Doppler bench with compare-aware labels and spacing readouts", () => {
    const source = buildSimulationSource("doppler-effect");

    render(
      <DopplerEffectSimulation
        concept={source}
        params={{
          sourceFrequency: 1.1,
          sourceSpeed: 0.45,
          observerSpeed: 0.2,
          observerAhead: true,
        }}
        time={0}
        setParam={vi.fn()}
        compare={{
          activeTarget: "a",
          setupA: {
            sourceFrequency: 1.1,
            sourceSpeed: 0.45,
            observerSpeed: 0.2,
            observerAhead: true,
          },
          setupB: {
            sourceFrequency: 1.1,
            sourceSpeed: 0.45,
            observerSpeed: 0,
            observerAhead: false,
          },
          labelA: "Ahead",
          labelB: "Behind",
        }}
      />,
    );

    expect(screen.getAllByText("Doppler state").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ahead").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Behind").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/front spacing/i).length).toBeGreaterThan(0);
  });

  it("renders the air-column bench with compare-aware labels and keeps probe dragging keyboard-addressable", () => {
    const source = buildSimulationSource("resonance-air-columns-open-closed-pipes");
    const setParam = vi.fn();

    render(
      <AirColumnResonanceSimulation
        concept={source}
        params={{
          length: 1.2,
          closedEnd: false,
          resonanceOrder: 2,
          probeX: 0.6,
          amplitude: 0.12,
        }}
        time={0}
        setParam={setParam}
        compare={{
          activeTarget: "b",
          setupA: {
            length: 1.2,
            closedEnd: false,
            resonanceOrder: 2,
            probeX: 0.6,
            amplitude: 0.12,
          },
          setupB: {
            length: 1.2,
            closedEnd: true,
            resonanceOrder: 2,
            probeX: 0.6,
            amplitude: 0.12,
          },
          labelA: "Open tube",
          labelB: "Closed pipe",
        }}
      />,
    );

    expect(screen.getAllByText("Resonance state").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Open tube").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Closed pipe").length).toBeGreaterThan(0);

    fireEvent.keyDown(
      screen.getAllByRole("button", { name: /move probe position/i })[0]!,
      { key: "ArrowRight" },
    );

    expect(setParam).toHaveBeenCalledWith("probeX", 0.62);
  });
});
