import { describe, expect, it } from "vitest";
import { getConceptBySlug, type ConceptContent } from "@/lib/content";
import { evaluateChallengeItem } from "@/lib/learning/challengeMode";
import type { ConceptSimulationSource } from "@/lib/physics";

function buildSimulationSource(concept: ConceptContent): ConceptSimulationSource {
  return {
    id: concept.id,
    title: concept.title,
    summary: concept.summary,
    slug: concept.slug,
    topic: concept.topic,
    equations: concept.equations,
    variableLinks: concept.variableLinks,
    simulation: {
      ...concept.simulation,
      kind: concept.simulation.kind,
      graphs: concept.graphs,
      accessibility: {
        simulationDescription: concept.accessibility.simulationDescription.paragraphs.join(" "),
        graphSummary: concept.accessibility.graphSummary.paragraphs.join(" "),
      },
    },
    noticePrompts: concept.noticePrompts,
    predictionMode: {
      title: concept.predictionMode.title,
      intro: concept.predictionMode.intro,
      items: concept.predictionMode.items.map((item) => ({
        id: item.id,
        prompt: item.prompt,
        changeLabel: item.changeLabel,
        choices: item.choices,
        correctChoiceId: item.correctChoiceId,
        explanation: item.explanation,
        observationHint: item.observationHint,
        scenario: {
          id: item.id,
          label: item.scenarioLabel,
          presetId: item.apply.presetId ?? item.applyPresetId,
          patch: item.apply.patch ?? item.applyPatch,
          highlightedControlIds: item.highlightedControls,
          highlightedGraphIds: item.highlightedGraphs,
          highlightedOverlayIds: item.highlightedOverlays,
        },
      })),
    },
    challengeMode: concept.challengeMode,
    featureAvailability: {
      prediction: concept.predictionMode.items.length > 0,
      compare: true,
      challenge: (concept.challengeMode?.items.length ?? 0) > 0,
      guidedOverlays: (concept.simulation.overlays ?? []).length > 0,
      noticePrompts: concept.noticePrompts.items.length > 0,
      workedExamples: concept.sections.workedExamples.items.length > 0,
      quickTest: concept.quickTest.questions.length > 0,
    },
  };
}

describe("challenge mode evaluator", () => {
  it("evaluates the gravitational-field inverse-square target from the live state", () => {
    const concept = getConceptBySlug("gravitational-fields");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "gf-ch-quarter-field-by-distance",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        sourceMass: 2,
        probeX: 2,
        probeY: 0,
        testMass: 1,
      },
      activeGraphId: "strength-response",
      overlayValues: {
        fieldGrid: true,
        fieldVector: true,
        forceVector: true,
        distanceRings: true,
        scanLine: true,
      },
      time: 0,
      timeSource: "live",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the gravitational-potential distance target from the live state", () => {
    const concept = getConceptBySlug("gravitational-potential-energy");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "gp-ch-half-potential-quarter-field",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        sourceMass: 2,
        probeX: 2,
        probeY: 0,
        testMass: 1,
      },
      activeGraphId: "potential-energy-scan",
      overlayValues: {
        potentialMap: true,
        potentialContours: true,
        distanceRings: true,
        fieldArrow: true,
        forceArrow: true,
        scanLine: true,
      },
      time: 0,
      timeSource: "live",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the circular-orbits too-slow target from the live orbit state", () => {
    const concept = getConceptBySlug("circular-orbits-orbital-speed");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "co-ch-too-slow-falls-in",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        sourceMass: 4,
        orbitRadius: 1.6,
        speedFactor: 0.85,
      },
      activeGraphId: "acceleration-balance",
      overlayValues: {
        referenceOrbit: true,
        radiusLine: true,
        velocityVector: true,
        gravityVector: true,
        trail: true,
      },
      time: 0,
      timeSource: "live",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the Kepler compare target from the real A/B orbit setups", () => {
    const concept = getConceptBySlug("keplers-third-law-orbital-periods");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "ktl-ch-inner-vs-outer-years",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        sourceMass: 4,
        orbitRadius: 2.1,
        speedFactor: 1,
      },
      activeGraphId: "speed-history",
      overlayValues: {
        referenceOrbit: true,
        radiusLine: true,
        velocityVector: true,
        gravityVector: true,
        trail: true,
      },
      time: 0,
      timeSource: "live",
      compare: {
        activeTarget: "b",
        setupA: {
          sourceMass: 4,
          orbitRadius: 1.05,
          speedFactor: 1,
        },
        setupB: {
          sourceMass: 4,
          orbitRadius: 2.1,
          speedFactor: 1,
        },
      },
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the escape-velocity high-but-bound target from the live launch state", () => {
    const concept = getConceptBySlug("escape-velocity");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "ev-ch-high-climb-still-bound",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        sourceMass: 4,
        launchRadius: 1.6,
        speedFactor: 0.92,
      },
      activeGraphId: "radius-history",
      overlayValues: {
        launchMarker: true,
        turnaroundMarker: true,
        velocityVector: true,
        gravityVector: true,
        trail: true,
      },
      time: 0,
      timeSource: "live",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the thermodynamics compare target from the real A/B sample setups", () => {
    const concept = getConceptBySlug("temperature-and-internal-energy");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "tie-ch-same-temperature-more-total",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        particleCount: 36,
        heaterPower: 2.4,
        startingTemperature: 2.8,
        phasePlateauTemperature: 3.6,
        latentEnergyPerParticle: 0,
        initialPhaseProgress: 1,
        bondEnergyPerParticle: 0.9,
      },
      activeGraphId: "amount-internal-energy",
      overlayValues: {
        motionVectors: true,
        energySplit: true,
        phaseShelf: true,
        particleCounter: true,
      },
      time: 0,
      timeSource: "live",
      compare: {
        activeTarget: "b",
        setupA: {
          particleCount: 12,
          heaterPower: 2.4,
          startingTemperature: 2.8,
          phasePlateauTemperature: 3.6,
          latentEnergyPerParticle: 0,
          initialPhaseProgress: 1,
          bondEnergyPerParticle: 0.9,
        },
        setupB: {
          particleCount: 36,
          heaterPower: 2.4,
          startingTemperature: 2.8,
          phasePlateauTemperature: 3.6,
          latentEnergyPerParticle: 0,
          initialPhaseProgress: 1,
          bondEnergyPerParticle: 0.9,
        },
      },
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the thermodynamics shelf target from the live inspect state", () => {
    const concept = getConceptBySlug("temperature-and-internal-energy");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "tie-ch-catch-the-shelf",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        particleCount: 18,
        heaterPower: 2.6,
        startingTemperature: 2.4,
        phasePlateauTemperature: 3.6,
        latentEnergyPerParticle: 3.2,
        initialPhaseProgress: 0,
        bondEnergyPerParticle: 0.9,
      },
      activeGraphId: "temperature-history",
      overlayValues: {
        motionVectors: true,
        energySplit: true,
        phaseShelf: true,
        particleCounter: true,
      },
      time: 14,
      timeSource: "inspect",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the ideal-gas compression target from the live gas state", () => {
    const concept = getConceptBySlug("ideal-gas-law-and-kinetic-theory");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "igkt-ch-compress-doubles-pressure",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        particleCount: 24,
        temperature: 3.2,
        volume: 0.8,
      },
      activeGraphId: "pressure-volume",
      overlayValues: {
        speedCue: true,
        densityCue: true,
        wallHitCue: true,
        pressureGauge: true,
      },
      time: 0,
      timeSource: "live",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the ideal-gas compare target from the real A/B gas setups", () => {
    const concept = getConceptBySlug("ideal-gas-law-and-kinetic-theory");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "igkt-ch-same-pressure-different-cause",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        particleCount: 36,
        temperature: 3.2,
        volume: 1.6,
      },
      activeGraphId: "pressure-particle-count",
      overlayValues: {
        speedCue: true,
        densityCue: true,
        wallHitCue: true,
        pressureGauge: true,
      },
      time: 0,
      timeSource: "live",
      compare: {
        activeTarget: "b",
        setupA: {
          particleCount: 24,
          temperature: 4.8,
          volume: 1.6,
        },
        setupB: {
          particleCount: 36,
          temperature: 3.2,
          volume: 1.6,
        },
      },
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the pressure depth-only target from the live fluid state", () => {
    const concept = getConceptBySlug("pressure-and-hydrostatic-pressure");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "php-ch-hit-24-kpa-deep",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        force: 720,
        area: 0.15,
        density: 1000,
        gravity: 9.8,
        depth: 1.96,
      },
      activeGraphId: "pressure-depth",
      overlayValues: {
        surfaceLoad: true,
        depthGuide: true,
        pressureArrows: true,
        sameDepthLine: true,
      },
      time: 0,
      timeSource: "live",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the pressure compare target from the real A/B fluid setups", () => {
    const concept = getConceptBySlug("pressure-and-hydrostatic-pressure");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "php-ch-match-total-lower-surface",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        force: 600,
        area: 0.2,
        density: 1200,
        gravity: 9.8,
        depth: 1,
      },
      activeGraphId: "pressure-density",
      overlayValues: {
        surfaceLoad: true,
        depthGuide: true,
        pressureArrows: true,
        sameDepthLine: true,
      },
      time: 0,
      timeSource: "live",
      compare: {
        activeTarget: "b",
        setupA: {
          force: 720,
          area: 0.15,
          density: 1000,
          gravity: 9.8,
          depth: 1,
        },
        setupB: {
          force: 600,
          area: 0.2,
          density: 1200,
          gravity: 9.8,
          depth: 1,
        },
      },
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the continuity speed-ratio target from the live pipe state", () => {
    const concept = getConceptBySlug("continuity-equation");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "ce-ch-double-middle-speed",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        flowRate: 0.18,
        entryArea: 0.24,
        middleArea: 0.12,
      },
      activeGraphId: "speed-middle-area",
      overlayValues: {
        areaMarkers: true,
        speedArrows: true,
        flowRateEquality: true,
        flowSlices: false,
      },
      time: 0.6,
      timeSource: "live",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the continuity compare target from the real A/B pipe setups", () => {
    const concept = getConceptBySlug("continuity-equation");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "ce-ch-same-flow-wider-b",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        flowRate: 0.18,
        entryArea: 0.24,
        middleArea: 0.3,
      },
      activeGraphId: "flow-balance",
      overlayValues: {
        areaMarkers: true,
        speedArrows: true,
        flowRateEquality: true,
        flowSlices: false,
      },
      time: 1.2,
      timeSource: "live",
      compare: {
        activeTarget: "b",
        setupA: {
          flowRate: 0.18,
          entryArea: 0.24,
          middleArea: 0.12,
        },
        setupB: {
          flowRate: 0.18,
          entryArea: 0.24,
          middleArea: 0.3,
        },
      },
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the Bernoulli low-throat target from the live raised-flow state", () => {
    const concept = getConceptBySlug("bernoullis-principle");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "bp-ch-hit-low-throat-pressure",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        entryPressure: 32,
        flowRate: 0.18,
        entryArea: 0.1,
        throatArea: 0.05,
        throatHeight: 0,
      },
      activeGraphId: "pressure-throat-area",
      overlayValues: {
        continuityBridge: true,
        speedArrows: false,
        pressureGauges: true,
        energyBars: false,
        flowSlices: false,
      },
      time: 0.6,
      timeSource: "live",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the Bernoulli compare target from the real A/B throat setups", () => {
    const concept = getConceptBySlug("bernoullis-principle");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "bp-ch-wider-b-recovers-pressure",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        entryPressure: 32,
        flowRate: 0.18,
        entryArea: 0.1,
        throatArea: 0.09,
        throatHeight: 0.25,
      },
      activeGraphId: "pressure-throat-area",
      overlayValues: {
        continuityBridge: false,
        speedArrows: true,
        pressureGauges: true,
        energyBars: false,
        flowSlices: false,
      },
      time: 0.8,
      timeSource: "live",
      compare: {
        activeTarget: "b",
        setupA: {
          entryPressure: 32,
          flowRate: 0.18,
          entryArea: 0.1,
          throatArea: 0.05,
          throatHeight: 0.25,
        },
        setupB: {
          entryPressure: 32,
          flowRate: 0.18,
          entryArea: 0.1,
          throatArea: 0.09,
          throatHeight: 0.25,
        },
      },
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the buoyancy half-submerged balance target from the live fluid state", () => {
    const concept = getConceptBySlug("buoyancy-and-archimedes-principle");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "bap-ch-half-submerged-balance",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        objectDensity: 500,
        fluidDensity: 1000,
        gravity: 9.8,
        bottomDepth: 0.5,
      },
      activeGraphId: "required-fraction-object-density",
      overlayValues: {
        forceBalance: true,
        displacedFluid: true,
        equilibriumLine: true,
        pressureDifference: false,
      },
      time: 0,
      timeSource: "live",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the buoyancy compare target from the real A/B brine setups", () => {
    const concept = getConceptBySlug("buoyancy-and-archimedes-principle");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "bap-ch-less-submerged-in-brine",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        objectDensity: 650,
        fluidDensity: 1300,
        gravity: 9.8,
        bottomDepth: 0.5,
      },
      activeGraphId: "force-depth",
      overlayValues: {
        forceBalance: true,
        displacedFluid: true,
        equilibriumLine: true,
        pressureDifference: false,
      },
      time: 0,
      timeSource: "live",
      compare: {
        activeTarget: "b",
        setupA: {
          objectDensity: 650,
          fluidDensity: 1000,
          gravity: 9.8,
          bottomDepth: 0.65,
        },
        setupB: {
          objectDensity: 650,
          fluidDensity: 1300,
          gravity: 9.8,
          bottomDepth: 0.5,
        },
      },
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the drag slow-terminal target from the live fall setup", () => {
    const concept = getConceptBySlug("drag-and-terminal-velocity");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "dtv-ch-slow-the-fall",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        mass: 2,
        area: 0.1,
        dragStrength: 18,
      },
      activeGraphId: "terminal-speed-area",
      overlayValues: {
        forceBalance: false,
        terminalBand: true,
        distanceGuide: false,
      },
      time: 0,
      timeSource: "live",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the drag near-terminal freeze target from the inspected fall state", () => {
    const concept = getConceptBySlug("drag-and-terminal-velocity");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "dtv-ch-freeze-near-terminal",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        mass: 1.2,
        area: 0.12,
        dragStrength: 18,
      },
      activeGraphId: "force-balance",
      overlayValues: {
        forceBalance: true,
        terminalBand: true,
        distanceGuide: false,
      },
      time: 4,
      timeSource: "inspect",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the heat-transfer compare target from the real A/B rate setups", () => {
    const concept = getConceptBySlug("heat-transfer");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "ht-ch-slower-same-contrast",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        hotTemperature: 150,
        ambientTemperature: 25,
        materialConductivity: 0.9,
        contactQuality: 0.2,
        surfaceArea: 1.2,
        airflow: 1,
      },
      activeGraphId: "contact-response",
      overlayValues: {
        deltaBridge: true,
        pathwaySplit: true,
        areaCue: true,
        environmentCue: true,
      },
      time: 0,
      timeSource: "live",
      compare: {
        activeTarget: "b",
        setupA: {
          hotTemperature: 150,
          ambientTemperature: 25,
          materialConductivity: 1.8,
          contactQuality: 0.9,
          surfaceArea: 1.2,
          airflow: 1,
        },
        setupB: {
          hotTemperature: 150,
          ambientTemperature: 25,
          materialConductivity: 0.9,
          contactQuality: 0.2,
          surfaceArea: 1.2,
          airflow: 1,
        },
      },
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the heat-transfer radiation target from the live pathway state", () => {
    const concept = getConceptBySlug("heat-transfer");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "ht-ch-make-radiation-largest",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        hotTemperature: 170,
        ambientTemperature: 25,
        materialConductivity: 0.9,
        contactQuality: 0.08,
        surfaceArea: 1.2,
        airflow: 0.4,
      },
      activeGraphId: "pathway-rates",
      overlayValues: {
        deltaBridge: true,
        pathwaySplit: true,
        areaCue: true,
        environmentCue: true,
      },
      time: 0,
      timeSource: "live",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the sound-wave compression target from the live longitudinal state", () => {
    const concept = getConceptBySlug("sound-waves-longitudinal-motion");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "swl-ch-find-compression",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        amplitude: 0.16,
        waveSpeed: 2.4,
        wavelength: 1.8,
        probeX: 2.7,
      },
      activeGraphId: "probe-pressure",
      overlayValues: {
        motionDirections: true,
        compressionBands: true,
        energyTransfer: false,
      },
      time: 0,
      timeSource: "live",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the sound-wave compare target from the real A/B probe setups", () => {
    const concept = getConceptBySlug("sound-waves-longitudinal-motion");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "swl-ch-one-wavelength-later",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        amplitude: 0.12,
        waveSpeed: 2.4,
        wavelength: 1.8,
        probeX: 2.25,
      },
      activeGraphId: "displacement",
      overlayValues: {
        motionDirections: true,
        compressionBands: true,
        energyTransfer: false,
      },
      time: 0,
      timeSource: "live",
      compare: {
        activeTarget: "b",
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
      },
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the beats envelope-rate target from the live superposition state", () => {
    const concept = getConceptBySlug("beats");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "beats-ch-slow-pulses",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        amplitude: 0.12,
        frequencyA: 1,
        frequencyB: 1.2,
      },
      activeGraphId: "envelope",
      overlayValues: {
        envelopeGuide: true,
        loudnessCue: true,
        differenceGuide: true,
      },
      time: 0,
      timeSource: "live",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the beats compare target from the real A/B carrier setups", () => {
    const concept = getConceptBySlug("beats");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "beats-ch-same-beat-lower-carrier",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        amplitude: 0.12,
        frequencyA: 0.7,
        frequencyB: 1,
      },
      activeGraphId: "displacement",
      overlayValues: {
        envelopeGuide: true,
        loudnessCue: true,
        differenceGuide: true,
      },
      time: 0,
      timeSource: "live",
      compare: {
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
      },
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the capacitance voltage-only target from the live capacitor state", () => {
    const concept = getConceptBySlug("capacitance-and-stored-electric-energy");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "cee-ch-quadruple-energy-with-voltage",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        plateArea: 2.4,
        plateSeparation: 1.2,
        batteryVoltage: 6,
      },
      activeGraphId: "voltage-response",
      overlayValues: {
        fieldRegion: true,
        chargeDensityCue: true,
        geometryGuide: true,
        energyStore: true,
      },
      time: 0,
      timeSource: "live",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the Kirchhoff clean split target from the live grouped circuit state", () => {
    const concept = getConceptBySlug("kirchhoff-loop-and-junction-rules");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find((entry) => entry.id === "kjr-ch-clean-split");

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        voltage: 12,
        resistance1: 4,
        resistance2: 6,
        resistance3: 12,
        groupParallel: true,
      },
      activeGraphId: "current-map",
      overlayValues: {
        currentFlow: true,
        voltageLabels: true,
        nodeGuide: true,
        loopGuide: true,
        reductionGuide: false,
      },
      time: 0,
      timeSource: "live",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the RC 1tau charging target from the live transient state", () => {
    const concept = getConceptBySlug("rc-charging-and-discharging");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find((entry) => entry.id === "rc-ch-one-tau-charge");

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        sourceVoltage: 8,
        resistance: 2,
        capacitance: 1,
        charging: true,
      },
      activeGraphId: "normalized-response",
      overlayValues: {
        currentFlow: true,
        voltageLabels: true,
        tauMarkers: true,
        chargeCue: true,
        energyStore: true,
      },
      time: 2,
      timeSource: "inspect",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the internal-resistance heavy-load target from the live source state", () => {
    const concept = getConceptBySlug("internal-resistance-and-terminal-voltage");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "ir-ch-heavy-load-terminal-drop",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        emf: 12,
        internalResistance: 2,
        loadResistance: 2,
      },
      activeGraphId: "terminal-response",
      overlayValues: {
        currentFlow: true,
        voltageLabels: true,
        powerSplit: true,
        idealReference: true,
      },
      time: 0,
      timeSource: "live",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the specific-heat compare target from the real A/B pulse setups", () => {
    const concept = getConceptBySlug("specific-heat-and-phase-change");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "shpc-ch-same-pulse-higher-c",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        mass: 1.4,
        specificHeat: 4,
        heaterPower: 12,
        startingTemperature: 25,
        latentHeat: 260,
        initialPhaseFraction: 1,
        phaseChangeTemperature: 0,
      },
      activeGraphId: "specific-heat-response",
      overlayValues: {
        capacityCue: true,
        shelfCue: true,
        energySplit: true,
        curveGuide: true,
      },
      time: 4,
      timeSource: "inspect",
      compare: {
        activeTarget: "b",
        setupA: {
          mass: 1.4,
          specificHeat: 0.9,
          heaterPower: 12,
          startingTemperature: 25,
          latentHeat: 260,
          initialPhaseFraction: 1,
          phaseChangeTemperature: 0,
        },
        setupB: {
          mass: 1.4,
          specificHeat: 4,
          heaterPower: 12,
          startingTemperature: 25,
          latentHeat: 260,
          initialPhaseFraction: 1,
          phaseChangeTemperature: 0,
        },
      },
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the specific-heat shelf target from the live inspect state", () => {
    const concept = getConceptBySlug("specific-heat-and-phase-change");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "shpc-ch-catch-the-real-shelf",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        mass: 1.4,
        specificHeat: 2.1,
        heaterPower: 18,
        startingTemperature: -15,
        latentHeat: 260,
        initialPhaseFraction: 0,
        phaseChangeTemperature: 0,
      },
      activeGraphId: "heating-curve",
      overlayValues: {
        capacityCue: true,
        shelfCue: true,
        energySplit: true,
        curveGuide: true,
      },
      time: 6,
      timeSource: "inspect",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates a projectile target challenge from the live simulation state", () => {
    const concept = getConceptBySlug("projectile-motion");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find((entry) => entry.id === "pm-ch-flat-far-shot");

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        speed: 19,
        angle: 39,
        gravity: 9.8,
        velocityVector: true,
        componentVectors: true,
        apexMarker: true,
        rangeMarker: true,
      },
      activeGraphId: "trajectory",
      overlayValues: {
        velocityVector: true,
        componentVectors: true,
        apexMarker: true,
        rangeMarker: true,
      },
      time: 0,
      timeSource: "live",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the graph-transformations landmark target from the live transformed state", () => {
    const concept = getConceptBySlug("graph-transformations");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "gt-ch-reflect-land-vertex",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        horizontalShift: 0,
        verticalShift: 0,
        verticalScale: -1.2,
        mirrorY: true,
      },
      activeGraphId: "function-graph",
      overlayValues: {
        referenceCurve: true,
        vertexMarkers: true,
        shiftGuide: true,
      },
      time: 0,
      timeSource: "live",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the rational-functions domain-break target from the live reciprocal state", () => {
    const concept = getConceptBySlug("rational-functions-asymptotes-and-behavior");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "rf-ch-separate-hole-from-asymptote",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        asymptoteX: -1,
        horizontalAsymptoteY: 0.8,
        branchScale: -1.8,
        sampleDistance: 0.6,
        showHole: true,
        holeX: 1.3,
      },
      activeGraphId: "asymptote-response",
      overlayValues: {
        asymptotes: true,
        probeMarkers: true,
        holeMarker: true,
        intercepts: false,
      },
      time: 0,
      timeSource: "live",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the exponential quarter-target decay checkpoint from the live change state", () => {
    const concept = getConceptBySlug("exponential-change-growth-decay-logarithms");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "exp-ch-quarter-target-two-half-lives",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        initialValue: 8,
        rate: -0.23,
        targetValue: 2,
      },
      activeGraphId: "change-curve",
      overlayValues: {
        targetMarker: true,
        pairedRate: false,
        doublingHalfLife: true,
        logGuide: true,
      },
      time: 0,
      timeSource: "live",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the derivative near-flat target from the live tangent and secant state", () => {
    const concept = getConceptBySlug("derivative-as-slope-local-rate-of-change");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "ds-ch-catch-the-flat-tangent",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        pointX: 1.36,
        deltaX: 0.15,
        showSecant: true,
      },
      activeGraphId: "difference-quotient",
      overlayValues: {
        tangentLine: true,
        deltaGuide: true,
        slopeGuide: true,
      },
      time: 0,
      timeSource: "live",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the limits continuity-classification target from the live one-sided state", () => {
    const concept = getConceptBySlug("limits-and-continuity-approaching-a-value");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "lc-ch-agreeing-sides-broken-continuity",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        caseIndex: 1,
        approachDistance: 0.12,
      },
      activeGraphId: "one-sided-approach",
      overlayValues: {
        sampleMarkers: true,
        limitGuide: true,
        actualPoint: true,
      },
      time: 0,
      timeSource: "live",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the integral signed-area target from the live accumulation state", () => {
    const concept = getConceptBySlug("integral-as-accumulation-area");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "ia-ch-negative-height-positive-total",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        upperBound: 2.2,
      },
      activeGraphId: "accumulation-function",
      overlayValues: {
        signedArea: true,
        boundGuide: true,
        accumulationPoint: true,
      },
      time: 0,
      timeSource: "live",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the optimization maximum target from the fixed-perimeter rectangle state", () => {
    const concept = getConceptBySlug("optimization-maxima-minima-and-constraints");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "oc-ch-find-the-square-maximum",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        width: 6,
      },
      activeGraphId: "area-vs-width",
      overlayValues: {
        bestRectangle: true,
        constraintBand: true,
        areaGuides: true,
      },
      time: 0,
      timeSource: "live",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the 2D-vectors cancellation target from the live plane state", () => {
    const concept = getConceptBySlug("vectors-in-2d");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "v2d-ch-near-zero-result",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        ax: 3,
        ay: 2,
        bx: -2.8,
        by: -2.1,
        scalar: 1,
        subtractMode: false,
      },
      activeGraphId: "result-components",
      overlayValues: {
        componentGuides: true,
        tipToTail: true,
        scaledVector: true,
      },
      time: 0,
      timeSource: "live",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the new centripetal-force live target challenge from the same UCM state", () => {
    const concept = getConceptBySlug("uniform-circular-motion");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "ucm-ch-short-period-force-band",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        radius: 1.2,
        omega: 2.8,
        phase: 0.3,
      },
      activeGraphId: "angle",
      overlayValues: {
        radiusVector: true,
        velocityVector: true,
        centripetalVector: true,
        angleMarker: true,
        projectionGuides: false,
      },
      time: 0,
      timeSource: "live",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates centripetal-force compare checks against the real A/B setups", () => {
    const concept = getConceptBySlug("uniform-circular-motion");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "ucm-ch-match-period-change-pull",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        radius: 1.5,
        omega: 1.6,
        phase: 0.3,
      },
      activeGraphId: "angle",
      overlayValues: {
        radiusVector: true,
        velocityVector: true,
        centripetalVector: true,
        angleMarker: true,
        projectionGuides: false,
      },
      time: 0,
      timeSource: "live",
      compare: {
        activeTarget: "b",
        setupA: {
          radius: 0.9,
          omega: 1.6,
          phase: 0.3,
        },
        setupB: {
          radius: 1.5,
          omega: 1.6,
          phase: 0.3,
        },
      },
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates compare-based challenge checks against the real A/B setups", () => {
    const concept = getConceptBySlug("uniform-circular-motion");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "ucm-ch-compare-spin-rate",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        radius: 1.18,
        omega: 2.8,
        phase: 0.3,
      },
      activeGraphId: "angle",
      overlayValues: {
        radiusVector: true,
        velocityVector: true,
        centripetalVector: true,
        angleMarker: true,
        projectionGuides: false,
      },
      time: 0,
      timeSource: "live",
      compare: {
        activeTarget: "b",
        setupA: {
          radius: 1.2,
          omega: 1.4,
          phase: 0.3,
        },
        setupB: {
          radius: 1.18,
          omega: 2.8,
          phase: 0.3,
        },
      },
    });

    expect(evaluation.completed).toBe(true);
  });

  it("evaluates lens-imaging target checks from the live signed distances", () => {
    const concept = getConceptBySlug("lens-imaging");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "li-ch-real-image-target",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        converging: true,
        focalLength: 0.5,
        objectDistance: 0.9,
        objectHeight: 1,
      },
      activeGraphId: "image-map",
      overlayValues: {
        focusMarkers: false,
        principalRays: true,
        magnificationGuide: false,
      },
      time: 0,
      timeSource: "live",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates photoelectric stopping-point targets from the live emission bench", () => {
    const concept = getConceptBySlug("photoelectric-effect");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "pe-ch-cutoff-voltage",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        frequencyPHz: 1,
        intensity: 1,
        workFunctionEv: 2.3,
        collectorVoltage: -1.84,
      },
      activeGraphId: "collector-sweep",
      overlayValues: {
        thresholdGate: true,
        intensityFlux: true,
        stoppingField: true,
        energyBudget: true,
      },
      time: 0.25,
      timeSource: "live",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates atomic-spectra absorption targets from the live ladder bench", () => {
    const concept = getConceptBySlug("atomic-spectra");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "as-ch-match-absorption-notches",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        gap12Ev: 1.9,
        gap23Ev: 2.1,
        gap34Ev: 2.45,
        absorptionMode: true,
      },
      activeGraphId: "spectrum-lines",
      overlayValues: {
        transitionPairs: true,
        lineLabels: true,
        modeLock: true,
        quantizedSpacing: true,
      },
      time: 0.25,
      timeSource: "live",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates de-broglie whole-number-fit targets from the live matter-wave bench", () => {
    const concept = getConceptBySlug("de-broglie-matter-waves");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "dbmw-ch-heavy-shorter-wave",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        massMultiple: 2,
        speedMms: 2.2,
      },
      activeGraphId: "loop-fit",
      overlayValues: {
        wavelengthGuide: true,
        momentumLink: true,
        wholeNumberFit: true,
      },
      time: 0,
      timeSource: "live",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates bohr-model reverse-uv targets from the live hydrogen bench", () => {
    const concept = getConceptBySlug("bohr-model");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "bm-ch-ultraviolet-reverse",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        upperLevel: 2,
        lowerLevel: 1,
        excitationMode: true,
      },
      activeGraphId: "series-spectrum",
      overlayValues: {
        radiusRule: true,
        lineLabels: true,
        seriesFamily: true,
        reverseTransition: true,
      },
      time: 0.25,
      timeSource: "live",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates radioactivity half-life checkpoint targets from the live decay bench", () => {
    const concept = getConceptBySlug("radioactivity-half-life");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "rhl-ch-half-life-checkpoint",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        sampleSize: 64,
        halfLifeSeconds: 2.4,
      },
      activeGraphId: "remaining-count",
      overlayValues: {
        recentDecays: true,
        sampleVsExpected: true,
        halfLifeMarkers: true,
        singleVsSample: true,
      },
      time: 2.4,
      timeSource: "inspect",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates radioactivity small-sample spread targets from the live decay bench", () => {
    const concept = getConceptBySlug("radioactivity-half-life");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "rhl-ch-small-sample-spread",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        sampleSize: 12,
        halfLifeSeconds: 2.4,
      },
      activeGraphId: "remaining-fraction",
      overlayValues: {
        recentDecays: true,
        sampleVsExpected: true,
        halfLifeMarkers: true,
        singleVsSample: true,
      },
      time: 2.4,
      timeSource: "inspect",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates mirror target checks from the live signed distances", () => {
    const concept = getConceptBySlug("mirrors");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "mi-ch-real-image-target",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        curved: true,
        concave: true,
        focalLength: 0.5,
        objectDistance: 0.9,
        objectHeight: 1,
      },
      activeGraphId: "image-map",
      overlayValues: {
        equalAngles: true,
        focusMarkers: true,
        principalRays: true,
        distanceGuide: false,
      },
      time: 0,
      timeSource: "live",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates refraction targets from the live Snell-law state", () => {
    const concept = getConceptBySlug("refraction-snells-law");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "rs-ch-hit-refraction-target",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        incidentAngle: 45,
        n1: 1,
        n2: 1.6,
      },
      activeGraphId: "refraction-map",
      overlayValues: {
        normalGuide: true,
        speedGuide: true,
        criticalGuide: false,
      },
      time: 0,
      timeSource: "live",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates total-internal-reflection threshold checks from the live critical margin", () => {
    const concept = getConceptBySlug("total-internal-reflection");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "tir-ch-cross-threshold",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        incidentAngle: 48,
        n1: 1.52,
        n2: 1,
      },
      activeGraphId: "transition-map",
      overlayValues: {
        normalGuide: true,
        criticalGuide: true,
        reflectionGuide: true,
        speedGuide: true,
      },
      time: 0,
      timeSource: "live",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the Doppler higher-pitch target from the live pass-by state", () => {
    const concept = getConceptBySlug("doppler-effect");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "de-ch-higher-pitch-ahead",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        sourceFrequency: 1.1,
        sourceSpeed: 0.55,
        observerSpeed: 0.25,
        observerAhead: true,
      },
      activeGraphId: "observer-response",
      overlayValues: {
        motionVectors: true,
        frontBackSpacing: true,
        arrivalTiming: true,
      },
      time: 0,
      timeSource: "live",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the Doppler compare target from the real A/B pass-by setups", () => {
    const concept = getConceptBySlug("doppler-effect");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "de-ch-compare-low-vs-high",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        sourceFrequency: 1.1,
        sourceSpeed: 0.45,
        observerSpeed: 0,
        observerAhead: true,
      },
      activeGraphId: "observer-response",
      overlayValues: {
        motionVectors: true,
        frontBackSpacing: true,
        arrivalTiming: true,
      },
      time: 0,
      timeSource: "live",
      compare: {
        activeTarget: "b",
        setupA: {
          sourceFrequency: 1.1,
          sourceSpeed: 0.45,
          observerSpeed: 0,
          observerAhead: false,
        },
        setupB: {
          sourceFrequency: 1.1,
          sourceSpeed: 0.45,
          observerSpeed: 0.25,
          observerAhead: true,
        },
      },
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the polarization half-power target from the live polarizer state", () => {
    const concept = getConceptBySlug("polarization");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "pol-ch-half-power",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        inputAmplitude: 1.1,
        inputAngle: 0,
        polarizerAngle: 45,
        unpolarized: false,
      },
      activeGraphId: "power-split",
      overlayValues: {
        transverseGuide: true,
        projectionGuide: true,
        intensityGuide: true,
      },
      time: 0,
      timeSource: "live",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the double-slit first-dark target from the live optics state", () => {
    const concept = getConceptBySlug("double-slit-interference");
    const source = buildSimulationSource(concept);
    const item = concept.challengeMode?.items.find(
      (entry) => entry.id === "dsi-ch-find-first-dark",
    );

    expect(item).toBeTruthy();

    const evaluation = evaluateChallengeItem(source, item!, {
      params: {
        wavelength: 0.78,
        slitSeparation: 2.6,
        screenDistance: 5.4,
        probeY: 0.81,
      },
      activeGraphId: "pattern",
      overlayValues: {
        pathDifference: true,
        fringeSpacingGuide: true,
      },
      time: 0.2,
      timeSource: "inspect",
      compare: null,
    });

    expect(evaluation.completed).toBe(true);
    expect(evaluation.matchedCount).toBe(evaluation.totalCount);
  });

  it("evaluates the optical-resolution threshold and resolved-pair targets from the live image state", () => {
    const concept = getConceptBySlug("optical-resolution-imaging-limits");
    const source = buildSimulationSource(concept);
    const thresholdItem = concept.challengeMode?.items.find(
      (entry) => entry.id === "or-ch-hit-rayleigh-threshold",
    );
    const resolvedItem = concept.challengeMode?.items.find(
      (entry) => entry.id === "or-ch-open-a-clear-gap",
    );

    expect(thresholdItem).toBeTruthy();
    expect(resolvedItem).toBeTruthy();

    const thresholdEvaluation = evaluateChallengeItem(source, thresholdItem!, {
      params: {
        wavelengthNm: 550,
        apertureMm: 2.4,
        separationMrad: 0.28,
        probeYUm: 0,
      },
      activeGraphId: "image-profile",
      overlayValues: {
        apertureGuide: false,
        rayleighGuide: true,
        componentProfiles: false,
      },
      time: 0,
      timeSource: "live",
      compare: null,
    });

    const resolvedEvaluation = evaluateChallengeItem(source, resolvedItem!, {
      params: {
        wavelengthNm: 500,
        apertureMm: 3.6,
        separationMrad: 0.5,
        probeYUm: 0,
      },
      activeGraphId: "image-profile",
      overlayValues: {
        apertureGuide: false,
        rayleighGuide: false,
        componentProfiles: true,
      },
      time: 0,
      timeSource: "live",
      compare: null,
    });

    expect(thresholdEvaluation.completed).toBe(true);
    expect(thresholdEvaluation.matchedCount).toBe(thresholdEvaluation.totalCount);
    expect(resolvedEvaluation.completed).toBe(true);
    expect(resolvedEvaluation.matchedCount).toBe(resolvedEvaluation.totalCount);
  });
});
