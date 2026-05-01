import { describe, expect, it } from "vitest";
import { getConceptBySlug } from "@/lib/content";
import { resolveConceptContentBySlug } from "@/lib/i18n/concept-content";
import { resolveLiveWorkedExample } from "@/lib/learning/liveWorkedExamples";

describe("live worked examples", () => {
  it("localizes the uniform-circular-motion live worked examples in zh-HK", () => {
    const { content: concept } = resolveConceptContentBySlug(
      "uniform-circular-motion",
      "zh-HK",
    );
    const projectionExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-x-projection",
    );
    const accelerationExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "centripetal-acceleration",
    );

    expect(projectionExample).toBeTruthy();
    expect(accelerationExample).toBeTruthy();

    const state = {
      slug: concept.slug,
      params: {
        radius: 1,
        omega: 1.4,
        phase: 0.3,
      },
      time: 1,
      timeSource: "live" as const,
      activeGraphId: "projections",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "projection-link",
    };

    const resolvedProjection = resolveLiveWorkedExample(
      concept.slug,
      projectionExample!,
      state,
      "zh-HK",
    );
    const resolvedAcceleration = resolveLiveWorkedExample(
      concept.slug,
      accelerationExample!,
      state,
      "zh-HK",
    );
    const projectionCopy = [
      resolvedProjection.prompt,
      ...resolvedProjection.steps.map((step) => step.content),
      resolvedProjection.resultLabel,
      resolvedProjection.resultContent,
      resolvedProjection.interpretation,
    ].join(" ");
    const accelerationCopy = [
      resolvedAcceleration.prompt,
      ...resolvedAcceleration.steps.map((step) => step.content),
      resolvedAcceleration.resultLabel,
      resolvedAcceleration.resultContent,
      resolvedAcceleration.interpretation,
    ].join(" ");

    expect(projectionCopy).toContain("使用圓周運動的水平投影關係");
    expect(projectionCopy).toContain("目前角度為");
    expect(projectionCopy).toContain("負的 x 投影表示粒子位於軌道左側");
    expect(accelerationCopy).toContain("對於均速圓周運動");
    expect(accelerationCopy).toContain("所以 $a_c");
    expect(accelerationCopy).toContain("向心加速度");
    expect(`${projectionCopy} ${accelerationCopy}`).not.toMatch(
      /Use the horizontal|The current angle|The negative x projection|For uniform circular motion|The inward acceleration/u,
    );
  });

  it("resolves the gravitational-fields worked examples against the live field state", () => {
    const concept = getConceptBySlug("gravitational-fields");
    const fieldExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-gravity-field",
    );
    const forceExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-probe-force",
    );

    expect(fieldExample).toBeTruthy();
    expect(forceExample).toBeTruthy();

    const state = {
      slug: concept.slug,
      params: {
        sourceMass: 2,
        probeX: 2,
        probeY: 0,
        testMass: 2,
      },
      time: 0,
      timeSource: "live" as const,
      activeGraphId: "strength-response",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "axis-double-distance",
    };

    const resolvedField = resolveLiveWorkedExample(concept.slug, fieldExample!, state);
    const resolvedForce = resolveLiveWorkedExample(concept.slug, forceExample!, state);

    expect(resolvedField.resultContent).toContain("0.5");
    expect(resolvedField.interpretation).toMatch(/horizontal axis|toward the source/i);
    expect(resolvedForce.resultContent).toContain("1");
    expect(resolvedForce.interpretation).toMatch(/heavier probe mass scales the force/i);
  });

  it("resolves the torque worked examples against the live turning state", () => {
    const concept = getConceptBySlug("torque");
    const torqueExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-torque",
    );
    const turningExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-turning-state",
    );

    expect(torqueExample).toBeTruthy();
    expect(turningExample).toBeTruthy();

    const torqueState = {
      slug: concept.slug,
      params: {
        forceMagnitude: 2,
        forceAngle: 90,
        applicationDistance: 1.6,
      },
      time: 0,
      timeSource: "live" as const,
      activeGraphId: "torque",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "handle-right-angle",
    };

    const turningState = {
      ...torqueState,
      time: 2.4,
      timeSource: "inspect" as const,
      activeGraphId: "rotation-angle",
      activePresetId: "clockwise-push",
    };

    const resolvedTorque = resolveLiveWorkedExample(concept.slug, torqueExample!, torqueState);
    const resolvedTurning = resolveLiveWorkedExample(concept.slug, turningExample!, turningState);

    expect(resolvedTorque.resultContent).toContain("3.2");
    expect(resolvedTorque.resultContent).toContain("0.46");
    expect(resolvedTorque.interpretation).toMatch(/counterclockwise|handle|stronger twist/i);
    expect(resolvedTurning.resultContent).toContain("1.1");
    expect(resolvedTurning.resultContent).toContain("1.32");
    expect(resolvedTurning.interpretation).toMatch(/counterclockwise|angular speed|rotation/i);
  });

  it("resolves the static-equilibrium worked examples against the live balance state", () => {
    const concept = getConceptBySlug("static-equilibrium-centre-of-mass");
    const centerExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-centre-of-mass",
    );
    const supportExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-support-check",
    );

    expect(centerExample).toBeTruthy();
    expect(supportExample).toBeTruthy();

    const state = {
      slug: concept.slug,
      params: {
        cargoMass: 4,
        cargoPosition: 1.2,
        supportCenter: 0.25,
        supportWidth: 0.8,
      },
      time: 0,
      timeSource: "live" as const,
      activeGraphId: "support-reactions",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "narrow-near-edge",
    };

    const resolvedCenter = resolveLiveWorkedExample(concept.slug, centerExample!, state);
    const resolvedSupport = resolveLiveWorkedExample(concept.slug, supportExample!, state);

    expect(resolvedCenter.resultContent).toContain("0.6");
    expect(resolvedCenter.resultContent).toContain("78.4");
    expect(resolvedCenter.interpretation).toMatch(/right|combined centre of mass/i);
    expect(resolvedSupport.resultContent).toContain("0.05");
    expect(resolvedSupport.resultContent).toContain("73.5");
    expect(resolvedSupport.interpretation).toMatch(/stable|support region|reactions/i);
  });

  it("resolves the rotational-inertia worked examples against the live rotor state", () => {
    const concept = getConceptBySlug("rotational-inertia");
    const inertiaExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-inertia-response",
    );
    const spinExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-spin-up-state",
    );

    expect(inertiaExample).toBeTruthy();
    expect(spinExample).toBeTruthy();

    const inertiaState = {
      slug: concept.slug,
      params: {
        appliedTorque: 4,
        massRadius: 0.95,
      },
      time: 0,
      timeSource: "live" as const,
      activeGraphId: "inertia-map",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "wide-rim",
    };

    const spinState = {
      ...inertiaState,
      params: {
        appliedTorque: 4,
        massRadius: 0.24,
      },
      time: 2.4,
      timeSource: "inspect" as const,
      activeGraphId: "rotation-angle",
      activePresetId: "compact-core",
    };

    const resolvedInertia = resolveLiveWorkedExample(concept.slug, inertiaExample!, inertiaState);
    const resolvedSpin = resolveLiveWorkedExample(concept.slug, spinExample!, spinState);

    expect(resolvedInertia.resultContent).toContain("5.86");
    expect(resolvedInertia.resultContent).toContain("0.68");
    expect(resolvedInertia.interpretation).toMatch(/far from the axis|resists spin-up/i);
    expect(resolvedSpin.resultContent).toContain("12.07");
    expect(resolvedSpin.resultContent).toContain("14.48");
    expect(resolvedSpin.interpretation).toMatch(/close to the axis|gains angular speed quickly/i);
  });

  it("resolves the rolling-motion worked examples against the live incline state", () => {
    const concept = getConceptBySlug("rolling-motion");
    const accelerationExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-rolling-acceleration",
    );
    const stateExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-no-slip-state",
    );

    expect(accelerationExample).toBeTruthy();
    expect(stateExample).toBeTruthy();

    const accelerationState = {
      slug: concept.slug,
      params: {
        slopeAngle: 12,
        radius: 0.22,
        inertiaFactor: 1,
      },
      time: 0,
      timeSource: "live" as const,
      activeGraphId: "acceleration-map",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "hoop-baseline",
    };

    const noSlipState = {
      ...accelerationState,
      params: {
        slopeAngle: 12,
        radius: 0.16,
        inertiaFactor: 0.4,
      },
      time: 1.8,
      timeSource: "inspect" as const,
      activeGraphId: "speed-link",
      activePresetId: "small-sphere-fast-spin",
    };

    const resolvedAcceleration = resolveLiveWorkedExample(
      concept.slug,
      accelerationExample!,
      accelerationState,
    );
    const resolvedState = resolveLiveWorkedExample(concept.slug, stateExample!, noSlipState);

    expect(resolvedAcceleration.resultContent).toContain("1.02");
    expect(resolvedAcceleration.resultContent).toContain("2.17");
    expect(resolvedAcceleration.interpretation).toMatch(/hoop|rim-heavy|longer/i);
    expect(resolvedState.resultContent).toContain("16.39");
    expect(resolvedState.resultContent).toContain("2.62");
    expect(resolvedState.interpretation).toMatch(/smaller radius|angular speed|sphere/i);
  });

  it("resolves the angular-momentum worked examples against the live rotor state", () => {
    const concept = getConceptBySlug("angular-momentum");
    const momentumExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-angular-momentum",
    );
    const sameLExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "compact-reference-spin",
    );

    expect(momentumExample).toBeTruthy();
    expect(sameLExample).toBeTruthy();

    const momentumState = {
      slug: concept.slug,
      params: {
        massRadius: 0.95,
        angularSpeed: 2.4,
      },
      time: 0,
      timeSource: "live" as const,
      activeGraphId: "momentum-map",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "wide-same-speed",
    };

    const sameLState = {
      ...momentumState,
      params: {
        massRadius: 0.95,
        angularSpeed: 0.93,
      },
      activeGraphId: "conserved-spin-map",
      activePresetId: "wide-same-l",
    };

    const resolvedMomentum = resolveLiveWorkedExample(
      concept.slug,
      momentumExample!,
      momentumState,
    );
    const resolvedSameL = resolveLiveWorkedExample(concept.slug, sameLExample!, sameLState);

    expect(resolvedMomentum.resultContent).toContain("5.86");
    expect(resolvedMomentum.resultContent).toContain("14.08");
    expect(resolvedMomentum.interpretation).toMatch(/wide layout|much more angular momentum/i);
    expect(resolvedSameL.resultContent).toContain("5.93");
    expect(resolvedSameL.interpretation).toMatch(/same angular momentum|faster spin/i);
  });

  it("resolves the gravitational-potential worked examples against the live well state", () => {
    const concept = getConceptBySlug("gravitational-potential-energy");
    const potentialExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-gravitational-potential",
    );
    const energyExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-gravitational-potential-energy",
    );

    expect(potentialExample).toBeTruthy();
    expect(energyExample).toBeTruthy();

    const state = {
      slug: concept.slug,
      params: {
        sourceMass: 2,
        probeX: 2,
        probeY: 0,
        testMass: 2,
      },
      time: 0,
      timeSource: "live" as const,
      activeGraphId: "potential-energy-scan",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "axis-two-meters",
    };

    const resolvedPotential = resolveLiveWorkedExample(concept.slug, potentialExample!, state);
    const resolvedEnergy = resolveLiveWorkedExample(concept.slug, energyExample!, state);

    expect(resolvedPotential.resultContent).toContain("-1");
    expect(resolvedPotential.interpretation).toMatch(/toward zero|stays negative/i);
    expect(resolvedEnergy.resultContent).toContain("-2");
    expect(resolvedEnergy.interpretation).toMatch(/heavier positive probe mass/i);
  });

  it("resolves the circular-orbits worked examples against the live orbit state", () => {
    const concept = getConceptBySlug("circular-orbits-orbital-speed");
    const speedExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "required-circular-speed",
    );
    const balanceExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-orbit-balance",
    );

    expect(speedExample).toBeTruthy();
    expect(balanceExample).toBeTruthy();

    const state = {
      slug: concept.slug,
      params: {
        sourceMass: 4,
        orbitRadius: 1.6,
        speedFactor: 1,
      },
      time: 0,
      timeSource: "live" as const,
      activeGraphId: "acceleration-balance",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "reference-orbit",
    };

    const resolvedSpeed = resolveLiveWorkedExample(concept.slug, speedExample!, state);
    const resolvedBalance = resolveLiveWorkedExample(concept.slug, balanceExample!, state);

    expect(resolvedSpeed.resultContent).toContain("1.58");
    expect(resolvedSpeed.interpretation).toMatch(/gravity-and-turning balance|circular speed/i);
    expect(resolvedBalance.resultContent).toContain("1.56");
    expect(resolvedBalance.interpretation).toMatch(/hold the radius steady|gravity is supplying/i);
  });

  it("resolves the Kepler-period worked examples against the live orbit state", () => {
    const concept = getConceptBySlug("keplers-third-law-orbital-periods");
    const periodExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-circular-period",
    );
    const ratioExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "radius-doubling-ratio",
    );

    expect(periodExample).toBeTruthy();
    expect(ratioExample).toBeTruthy();

    const state = {
      slug: concept.slug,
      params: {
        sourceMass: 4,
        orbitRadius: 1.4,
        speedFactor: 1,
      },
      time: 0,
      timeSource: "live" as const,
      activeGraphId: "speed-history",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "kepler-baseline",
    };

    const resolvedPeriod = resolveLiveWorkedExample(concept.slug, periodExample!, state);
    const resolvedRatio = resolveLiveWorkedExample(concept.slug, ratioExample!, state);

    expect(resolvedPeriod.resultContent).toContain("5.2");
    expect(resolvedPeriod.interpretation).toMatch(/circumference divided by the allowed circular speed|longer year|shortens the year/i);
    expect(resolvedRatio.resultContent).toContain("2.83");
    expect(resolvedRatio.interpretation).toMatch(/0.71|2.83 times/i);
  });

  it("resolves the escape-velocity worked examples against the live launch state", () => {
    const concept = getConceptBySlug("escape-velocity");
    const speedExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "required-escape-speed",
    );
    const energyExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-energy-check",
    );

    expect(speedExample).toBeTruthy();
    expect(energyExample).toBeTruthy();

    const state = {
      slug: concept.slug,
      params: {
        sourceMass: 4,
        launchRadius: 1.6,
        speedFactor: 0.92,
      },
      time: 0,
      timeSource: "live" as const,
      activeGraphId: "specific-energy",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "high-but-bound",
    };

    const resolvedSpeed = resolveLiveWorkedExample(concept.slug, speedExample!, state);
    const resolvedEnergy = resolveLiveWorkedExample(concept.slug, energyExample!, state);

    expect(resolvedSpeed.resultContent).toContain("2.24");
    expect(resolvedSpeed.interpretation).toMatch(/threshold|launching farther|heavier source/i);
    expect(resolvedEnergy.resultContent).toContain("-0.38");
    expect(resolvedEnergy.interpretation).toMatch(/high bound trip|turnaround|negative total/i);
  });

  it("resolves the temperature/internal-energy worked examples against the live thermal state", () => {
    const concept = getConceptBySlug("temperature-and-internal-energy");
    const amountExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "same-temperature-different-total-energy",
    );
    const shelfExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "heating-through-the-shelf",
    );

    expect(amountExample).toBeTruthy();
    expect(shelfExample).toBeTruthy();

    const amountState = {
      slug: concept.slug,
      params: {
        particleCount: 36,
        heaterPower: 2.4,
        startingTemperature: 2.8,
        phasePlateauTemperature: 3.6,
        latentEnergyPerParticle: 0,
        initialPhaseProgress: 1,
        bondEnergyPerParticle: 0.9,
      },
      time: 0,
      timeSource: "live" as const,
      activeGraphId: "amount-internal-energy",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "large-warm-sample",
    };

    const shelfState = {
      ...amountState,
      params: {
        particleCount: 18,
        heaterPower: 2.6,
        startingTemperature: 3.6,
        phasePlateauTemperature: 3.6,
        latentEnergyPerParticle: 3.2,
        initialPhaseProgress: 0.35,
        bondEnergyPerParticle: 0.9,
      },
      time: 2,
      activeGraphId: "temperature-history",
      activePresetId: "on-the-shelf",
    };

    const resolvedAmount = resolveLiveWorkedExample(concept.slug, amountExample!, amountState);
    const resolvedShelf = resolveLiveWorkedExample(concept.slug, shelfExample!, shelfState);

    expect(resolvedAmount.resultContent).toContain("75.6");
    expect(resolvedAmount.resultContent).toContain("108");
    expect(resolvedAmount.interpretation).toMatch(/same average motion|whole-sample|more particles/i);
    expect(resolvedShelf.resultContent).toContain("5.2");
    expect(resolvedShelf.resultContent).toContain("44.03");
    expect(resolvedShelf.interpretation).toMatch(/still adding energy|filling the shelf|temperature starts climbing again/i);
  });

  it("resolves the ideal-gas worked examples against the live gas state", () => {
    const concept = getConceptBySlug("ideal-gas-law-and-kinetic-theory");
    const pressureExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-pressure-state",
    );
    const kineticExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-kinetic-link",
    );

    expect(pressureExample).toBeTruthy();
    expect(kineticExample).toBeTruthy();

    const pressureState = {
      slug: concept.slug,
      params: {
        particleCount: 24,
        temperature: 3.2,
        volume: 1.6,
      },
      time: 0,
      timeSource: "live" as const,
      activeGraphId: "pressure-volume",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "room-baseline",
    };

    const kineticState = {
      ...pressureState,
      params: {
        particleCount: 24,
        temperature: 4.8,
        volume: 1.6,
      },
      activeGraphId: "collision-temperature",
      activePresetId: "hotter-same-box",
    };

    const resolvedPressure = resolveLiveWorkedExample(
      concept.slug,
      pressureExample!,
      pressureState,
    );
    const resolvedKinetic = resolveLiveWorkedExample(
      concept.slug,
      kineticExample!,
      kineticState,
    );

    expect(resolvedPressure.resultContent).toContain("10.55");
    expect(resolvedPressure.resultContent).toContain("82.48");
    expect(resolvedPressure.interpretation).toMatch(/middle-pressure|all matter together/i);
    expect(resolvedKinetic.resultContent).toContain("2.96");
    expect(resolvedKinetic.resultContent).toContain("101");
    expect(resolvedKinetic.interpretation).toMatch(/middle|particle motion|crowding cues/i);
  });

  it("resolves the pressure-hydrostatic worked examples against the live fluid state", () => {
    const concept = getConceptBySlug("pressure-and-hydrostatic-pressure");
    const pressureExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-total-pressure",
    );
    const deeperExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "one-meter-deeper",
    );

    expect(pressureExample).toBeTruthy();
    expect(deeperExample).toBeTruthy();

    const state = {
      slug: concept.slug,
      params: {
        force: 720,
        area: 0.15,
        density: 1000,
        gravity: 9.8,
        depth: 1,
      },
      time: 0,
      timeSource: "live" as const,
      activeGraphId: "pressure-depth",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "water-baseline",
    };

    const resolvedPressure = resolveLiveWorkedExample(concept.slug, pressureExample!, state);
    const resolvedDeeper = resolveLiveWorkedExample(concept.slug, deeperExample!, state);

    expect(resolvedPressure.resultContent).toContain("4.8");
    expect(resolvedPressure.resultContent).toContain("9.8");
    expect(resolvedPressure.resultContent).toContain("14.6");
    expect(resolvedPressure.interpretation).toMatch(/fluid column is doing most of the work/i);
    expect(resolvedDeeper.resultContent).toContain("9.8");
    expect(resolvedDeeper.resultContent).toContain("24.4");
    expect(resolvedDeeper.interpretation).toMatch(/same rule still holds|extra meter adds another/i);
  });

  it("resolves the continuity worked examples against the live flow state", () => {
    const concept = getConceptBySlug("continuity-equation");
    const speedExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-section-speeds",
    );
    const sliceExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "same-time-flow-slices",
    );

    expect(speedExample).toBeTruthy();
    expect(sliceExample).toBeTruthy();

    const state = {
      slug: concept.slug,
      params: {
        flowRate: 0.18,
        entryArea: 0.24,
        middleArea: 0.12,
      },
      time: 0.8,
      timeSource: "live" as const,
      activeGraphId: "speed-middle-area",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "baseline-stream",
    };

    const resolvedSpeed = resolveLiveWorkedExample(concept.slug, speedExample!, state);
    const resolvedSlice = resolveLiveWorkedExample(concept.slug, sliceExample!, state);

    expect(resolvedSpeed.resultContent).toContain("0.75");
    expect(resolvedSpeed.resultContent).toContain("1.5");
    expect(resolvedSpeed.resultContent).toContain("2");
    expect(resolvedSpeed.interpretation).toMatch(/smaller|faster|same flow rate/i);
    expect(resolvedSlice.resultContent).toContain("0.15");
    expect(resolvedSlice.resultContent).toContain("0.3");
    expect(resolvedSlice.interpretation).toMatch(/same-time slice|same flow rate|faster section/i);
  });

  it("resolves the Bernoulli worked examples against the live raised-throat state", () => {
    const concept = getConceptBySlug("bernoullis-principle");
    const throatExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-throat-state",
    );
    const levelExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "level-vs-raised-throat",
    );

    expect(throatExample).toBeTruthy();
    expect(levelExample).toBeTruthy();

    const state = {
      slug: concept.slug,
      params: {
        entryPressure: 32,
        flowRate: 0.18,
        entryArea: 0.1,
        throatArea: 0.05,
        throatHeight: 0.25,
      },
      time: 0.8,
      timeSource: "live" as const,
      activeGraphId: "pressure-throat-area",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "baseline-venturi",
    };

    const resolvedThroat = resolveLiveWorkedExample(concept.slug, throatExample!, state);
    const resolvedLevel = resolveLiveWorkedExample(concept.slug, levelExample!, state);

    expect(resolvedThroat.resultContent).toContain("3.6");
    expect(resolvedThroat.resultContent).toContain("24.69");
    expect(resolvedThroat.interpretation).toMatch(/extra speed|Bernoulli budget|lifting/i);
    expect(resolvedLevel.resultContent).toContain("27.14");
    expect(resolvedLevel.interpretation).toMatch(/height term|recovered pressure/i);
  });

  it("resolves the buoyancy worked examples against the live immersed-block state", () => {
    const concept = getConceptBySlug("buoyancy-and-archimedes-principle");
    const buoyantForceExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-buoyant-force",
    );
    const balanceExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-force-balance",
    );

    expect(buoyantForceExample).toBeTruthy();
    expect(balanceExample).toBeTruthy();

    const state = {
      slug: concept.slug,
      params: {
        objectDensity: 650,
        fluidDensity: 1000,
        gravity: 9.8,
        bottomDepth: 0.65,
      },
      time: 0,
      timeSource: "live" as const,
      activeGraphId: "force-depth",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "water-balanced",
    };

    const resolvedBuoyantForce = resolveLiveWorkedExample(
      concept.slug,
      buoyantForceExample!,
      state,
    );
    const resolvedBalance = resolveLiveWorkedExample(concept.slug, balanceExample!, state);

    expect(resolvedBuoyantForce.resultContent).toContain("509.6");
    expect(resolvedBuoyantForce.resultContent).toContain("0.05");
    expect(resolvedBuoyantForce.interpretation).toMatch(/partly submerged|pushing it deeper/i);
    expect(resolvedBalance.resultContent).toContain("509.6");
    expect(resolvedBalance.resultContent).toContain("0");
    expect(resolvedBalance.interpretation).toMatch(/balanced here|real float position/i);
  });

  it("resolves the drag-and-terminal-velocity worked examples against the live fall state", () => {
    const concept = getConceptBySlug("drag-and-terminal-velocity");
    const terminalExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-terminal-speed",
    );
    const balanceExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-force-balance",
    );

    expect(terminalExample).toBeTruthy();
    expect(balanceExample).toBeTruthy();

    const state = {
      slug: concept.slug,
      params: {
        mass: 2,
        area: 0.05,
        dragStrength: 12,
      },
      time: 0,
      timeSource: "live" as const,
      activeGraphId: "speed-history",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "baseline-drop",
    };

    const resolvedTerminal = resolveLiveWorkedExample(concept.slug, terminalExample!, state);
    const resolvedBalance = resolveLiveWorkedExample(concept.slug, balanceExample!, state);

    expect(resolvedTerminal.resultContent).toContain("19.6");
    expect(resolvedTerminal.resultContent).toContain("5.72");
    expect(resolvedTerminal.interpretation).toMatch(/terminal speed|balance speed/i);
    expect(resolvedBalance.resultContent).toContain("19.6");
    expect(resolvedBalance.resultContent).toContain("9.8");
    expect(resolvedBalance.interpretation).toMatch(/quadratic drag term|constant weight/i);
  });

  it("resolves the heat-transfer worked examples against the live heat-flow state", () => {
    const concept = getConceptBySlug("heat-transfer");
    const splitExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-pathway-split",
    );
    const coolingExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "cooling-over-time",
    );

    expect(splitExample).toBeTruthy();
    expect(coolingExample).toBeTruthy();

    const splitState = {
      slug: concept.slug,
      params: {
        hotTemperature: 150,
        ambientTemperature: 25,
        materialConductivity: 1.8,
        contactQuality: 0.9,
        surfaceArea: 1.2,
        airflow: 1,
      },
      time: 0,
      timeSource: "live" as const,
      activeGraphId: "pathway-rates",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "metal-bench",
    };

    const coolingState = {
      ...splitState,
      params: {
        hotTemperature: 120,
        ambientTemperature: 25,
        materialConductivity: 0.8,
        contactQuality: 0.25,
        surfaceArea: 1.3,
        airflow: 2,
      },
      time: 20,
      activeGraphId: "temperature-history",
      activePresetId: "windy-room",
    };

    const resolvedSplit = resolveLiveWorkedExample(concept.slug, splitExample!, splitState);
    const resolvedCooling = resolveLiveWorkedExample(concept.slug, coolingExample!, coolingState);

    expect(resolvedSplit.resultContent).toContain("43.74");
    expect(resolvedSplit.resultContent).toContain("13.5");
    expect(resolvedSplit.resultContent).toContain("6.66");
    expect(resolvedSplit.interpretation).toMatch(/conduction is dominant/i);
    expect(resolvedCooling.resultContent).toContain("577.38");
    expect(resolvedCooling.resultContent).toContain("26.4");
    expect(resolvedCooling.interpretation).toMatch(/smaller remaining temperature contrast|cools/i);
  });

  it("resolves the sound-wave worked examples against the live longitudinal state", () => {
    const concept = getConceptBySlug("sound-waves-longitudinal-motion");
    const timingExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "sound-travel-timing",
    );
    const compressionExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "local-compression-cue",
    );

    expect(timingExample).toBeTruthy();
    expect(compressionExample).toBeTruthy();

    const timingState = {
      slug: concept.slug,
      params: {
        amplitude: 0.12,
        waveSpeed: 2.4,
        wavelength: 1.8,
        probeX: 2.25,
      },
      time: 0,
      timeSource: "live" as const,
      activeGraphId: "displacement",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "baseline",
    };

    const compressionState = {
      ...timingState,
      params: {
        amplitude: 0.16,
        waveSpeed: 2.4,
        wavelength: 1.8,
        probeX: 2.7,
      },
      activeGraphId: "probe-pressure",
      activePresetId: "strong-compression",
    };

    const resolvedTiming = resolveLiveWorkedExample(
      concept.slug,
      timingExample!,
      timingState,
    );
    const resolvedCompression = resolveLiveWorkedExample(
      concept.slug,
      compressionExample!,
      compressionState,
    );

    expect(resolvedTiming.resultContent).toContain("1.33");
    expect(resolvedTiming.resultContent).toContain("0.94");
    expect(resolvedTiming.interpretation).toMatch(/travel delay|oscillation pattern arrives/i);
    expect(resolvedCompression.resultContent).toContain("1");
    expect(resolvedCompression.interpretation).toMatch(/compression|crowded more tightly/i);
  });

  it("resolves the pitch-frequency-loudness worked examples against the live sound state", () => {
    const concept = getConceptBySlug("pitch-frequency-loudness-intensity");
    const pitchExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "pitch-from-frequency",
    );
    const loudnessExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "loudness-from-amplitude",
    );

    expect(pitchExample).toBeTruthy();
    expect(loudnessExample).toBeTruthy();

    const pitchState = {
      slug: concept.slug,
      params: {
        amplitude: 0.1,
        waveSpeed: 2.4,
        frequency: 1.6,
        probeX: 2.2,
      },
      time: 0,
      timeSource: "live" as const,
      activeGraphId: "displacement",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "higher-pitch",
    };

    const loudnessState = {
      ...pitchState,
      params: {
        amplitude: 0.18,
        waveSpeed: 2.4,
        frequency: 1.1,
        probeX: 2.2,
      },
      activeGraphId: "intensity-response",
      activePresetId: "louder",
    };

    const resolvedPitch = resolveLiveWorkedExample(concept.slug, pitchExample!, pitchState);
    const resolvedLoudness = resolveLiveWorkedExample(
      concept.slug,
      loudnessExample!,
      loudnessState,
    );

    expect(resolvedPitch.resultContent).toContain("1.5");
    expect(resolvedPitch.resultContent).toContain("0.63");
    expect(resolvedPitch.interpretation).toMatch(/cycles quickly|compression spacing is tighter/i);
    expect(resolvedLoudness.resultContent).toContain("0.03");
    expect(resolvedLoudness.interpretation).toMatch(/treated as louder|intensity cue is strong/i);
  });

  it("resolves the beats worked examples against the live superposition state", () => {
    const concept = getConceptBySlug("beats");
    const beatRateExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "beat-rate-from-frequencies",
    );
    const envelopeExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-envelope-strength",
    );

    expect(beatRateExample).toBeTruthy();
    expect(envelopeExample).toBeTruthy();

    const beatRateState = {
      slug: concept.slug,
      params: {
        amplitude: 0.12,
        frequencyA: 1,
        frequencyB: 1.2,
      },
      time: 0,
      timeSource: "live" as const,
      activeGraphId: "displacement",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "slow-pulses",
    };

    const envelopeState = {
      ...beatRateState,
      time: 1.25,
      activeGraphId: "envelope",
    };

    const resolvedBeatRate = resolveLiveWorkedExample(
      concept.slug,
      beatRateExample!,
      beatRateState,
    );
    const resolvedEnvelope = resolveLiveWorkedExample(
      concept.slug,
      envelopeExample!,
      envelopeState,
    );

    expect(resolvedBeatRate.resultContent).toContain("0.2");
    expect(resolvedBeatRate.resultContent).toContain("1.1");
    expect(resolvedBeatRate.interpretation).toMatch(/frequency difference|beat envelope/i);
    expect(resolvedEnvelope.resultContent).toContain("0.17");
    expect(resolvedEnvelope.resultContent).toContain("0.5");
    expect(resolvedEnvelope.interpretation).toMatch(/partway through the beat cycle/i);
  });

  it("resolves the Doppler worked examples against the live moving-source state", () => {
    const concept = getConceptBySlug("doppler-effect");
    const spacingExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "front-vs-rear-spacing",
    );
    const heardExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "heard-frequency-from-motion",
    );

    expect(spacingExample).toBeTruthy();
    expect(heardExample).toBeTruthy();

    const spacingState = {
      slug: concept.slug,
      params: {
        sourceFrequency: 1.1,
        sourceSpeed: 0.55,
        observerSpeed: 0,
        observerAhead: true,
      },
      time: 0,
      timeSource: "live" as const,
      activeGraphId: "source-spacing",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "city-pass",
    };

    const heardState = {
      ...spacingState,
      params: {
        sourceFrequency: 1.1,
        sourceSpeed: 0.45,
        observerSpeed: 0,
        observerAhead: false,
      },
      activeGraphId: "observer-response",
      activePresetId: "behind-trailing",
    };

    const resolvedSpacing = resolveLiveWorkedExample(
      concept.slug,
      spacingExample!,
      spacingState,
    );
    const resolvedHeard = resolveLiveWorkedExample(concept.slug, heardExample!, heardState);

    expect(resolvedSpacing.resultContent).toContain("2.41");
    expect(resolvedSpacing.resultContent).toContain("3.41");
    expect(resolvedSpacing.interpretation).toMatch(/front spacing|rear spacing|compressed/i);
    expect(resolvedHeard.resultContent).toContain("0.96");
    expect(resolvedHeard.resultContent).toContain("1.04");
    expect(resolvedHeard.interpretation).toMatch(/heard pitch drops|lower/i);
  });

  it("resolves the specific-heat and phase-change worked examples against the live thermal state", () => {
    const concept = getConceptBySlug("specific-heat-and-phase-change");
    const pulseExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "same-input-different-temperature-rise",
    );
    const shelfExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "reading-the-shelf",
    );

    expect(pulseExample).toBeTruthy();
    expect(shelfExample).toBeTruthy();

    const pulseState = {
      slug: concept.slug,
      params: {
        mass: 1.4,
        specificHeat: 0.9,
        heaterPower: 12,
        startingTemperature: 25,
        latentHeat: 260,
        initialPhaseFraction: 1,
        phaseChangeTemperature: 0,
      },
      time: 4,
      timeSource: "inspect" as const,
      activeGraphId: "specific-heat-response",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "low-c-liquid",
    };

    const shelfState = {
      ...pulseState,
      params: {
        mass: 1.4,
        specificHeat: 2.1,
        heaterPower: 18,
        startingTemperature: 0,
        latentHeat: 260,
        initialPhaseFraction: 0.35,
        phaseChangeTemperature: 0,
      },
      time: 2,
      activeGraphId: "heating-curve",
      activePresetId: "melting-on-the-shelf",
    };

    const resolvedPulse = resolveLiveWorkedExample(concept.slug, pulseExample!, pulseState);
    const resolvedShelf = resolveLiveWorkedExample(concept.slug, shelfExample!, shelfState);

    expect(resolvedPulse.resultContent).toContain("48");
    expect(resolvedPulse.resultContent).toContain("38.1");
    expect(resolvedPulse.interpretation).toMatch(/small m c|larger m c|temperature response/i);
    expect(resolvedShelf.resultContent).toContain("44.89");
    expect(resolvedShelf.resultContent).toContain("36");
    expect(resolvedShelf.interpretation).toMatch(/real shelf state|phase fraction|latent-energy term/i);
  });

  it("resolves the magnetic-fields worked examples against the live field state", () => {
    const concept = getConceptBySlug("magnetic-fields");
    const netFieldExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-net-field",
    );
    const comparisonExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-source-comparison",
    );

    expect(netFieldExample).toBeTruthy();
    expect(comparisonExample).toBeTruthy();

    const state = {
      slug: concept.slug,
      params: {
        currentA: 2,
        currentB: -2,
        sourceSeparation: 2.4,
        probeX: 0,
        probeY: 1,
      },
      time: 0,
      timeSource: "live" as const,
      activeGraphId: "direction-scan",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "opposite-currents-lift",
    };

    const resolvedNetField = resolveLiveWorkedExample(concept.slug, netFieldExample!, state);
    const resolvedComparison = resolveLiveWorkedExample(
      concept.slug,
      comparisonExample!,
      state,
    );

    expect(resolvedNetField.resultContent).toContain("1.97");
    expect(resolvedNetField.interpretation).toMatch(/balanced|net field/i);
    expect(resolvedComparison.resultContent).toContain("theta_B");
    expect(resolvedComparison.interpretation).toMatch(/superposition|counterclockwise|clockwise/i);
  });

  it("resolves the magnetic-force worked examples against the live force state", () => {
    const concept = getConceptBySlug("magnetic-force-moving-charges-currents");
    const chargeExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-charge-force",
    );
    const wireExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-wire-force",
    );

    expect(chargeExample).toBeTruthy();
    expect(wireExample).toBeTruthy();

    const state = {
      slug: concept.slug,
      params: {
        fieldStrength: -0.8,
        speed: 1.5,
        directionAngle: 0,
        negativeCharge: true,
        current: 2,
      },
      time: 0,
      timeSource: "live" as const,
      activeGraphId: "force",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "charge-down-wire-up",
    };

    const resolvedCharge = resolveLiveWorkedExample(concept.slug, chargeExample!, state);
    const resolvedWire = resolveLiveWorkedExample(concept.slug, wireExample!, state);

    expect(resolvedCharge.resultContent).toContain("1.2");
    expect(resolvedCharge.resultContent).toContain("1.88");
    expect(resolvedCharge.interpretation).toMatch(/negative charge reverses/i);
    expect(resolvedWire.resultContent).toContain("1.6");
    expect(resolvedWire.interpretation).toMatch(/bridge to current|current-segment rule/i);
  });

  it("resolves the electromagnetic-induction worked examples against the live induction state", () => {
    const concept = getConceptBySlug("electromagnetic-induction");
    const inductionExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-flux-and-emf",
    );
    const slopeExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "flux-peak-versus-emf",
    );

    expect(inductionExample).toBeTruthy();
    expect(slopeExample).toBeTruthy();

    const state = {
      slug: concept.slug,
      params: {
        magnetStrength: 1.4,
        coilTurns: 120,
        coilArea: 1,
        speed: 1.2,
        startOffset: 2.6,
        northFacingCoil: true,
      },
      time: 1.4,
      timeSource: "live" as const,
      activeGraphId: "induced-response",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "approach-and-pass",
    };

    const resolvedInduction = resolveLiveWorkedExample(concept.slug, inductionExample!, state);
    const resolvedSlope = resolveLiveWorkedExample(concept.slug, slopeExample!, state);

    expect(resolvedInduction.resultContent).toContain("\\mathcal{E}");
    expect(resolvedInduction.resultContent).toContain("\\Lambda");
    expect(resolvedInduction.interpretation).toMatch(/counterclockwise|clockwise|near zero/i);
    expect(resolvedSlope.resultContent).toContain("d\\Lambda/dt");
    expect(resolvedSlope.interpretation).toMatch(/slope of the flux curve|linked flux is/i);
  });

  it("resolves the Maxwell synthesis worked examples against the live four-law state", () => {
    const concept = getConceptBySlug("maxwells-equations-synthesis");
    const sourceLawExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-source-laws",
    );
    const circulationExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-circulation-bridge",
    );

    expect(sourceLawExample).toBeTruthy();
    expect(circulationExample).toBeTruthy();

    const state = {
      slug: concept.slug,
      params: {
        chargeSource: 1.1,
        conductionCurrent: 0.4,
        electricChangeRate: 1.2,
        magneticChangeRate: 1.2,
        cycleRate: 1.1,
      },
      time: 0.25,
      timeSource: "live" as const,
      activeGraphId: "faraday-wave-link",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "strong-light-bridge",
    };

    const resolvedSourceLaw = resolveLiveWorkedExample(concept.slug, sourceLawExample!, state);
    const resolvedCirculation = resolveLiveWorkedExample(
      concept.slug,
      circulationExample!,
      state,
    );

    expect(resolvedSourceLaw.resultContent).toContain("\\oint \\vec{E}");
    expect(resolvedSourceLaw.resultContent).toContain("\\oint \\vec{B}");
    expect(resolvedSourceLaw.interpretation).toMatch(/source term|magnetic-flux law|closed/i);
    expect(resolvedCirculation.resultContent).toContain("\\oint \\vec{B}");
    expect(resolvedCirculation.resultContent).toContain("\\text{bridge}");
    expect(resolvedCirculation.interpretation).toMatch(/light-like bridge|changing-field|loop laws/i);
  });

  it("resolves the electromagnetic-waves worked examples against the live field-pair state", () => {
    const concept = getConceptBySlug("electromagnetic-waves");
    const pairExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "local-field-pair",
    );
    const delayExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "source-probe-delay",
    );

    expect(pairExample).toBeTruthy();
    expect(delayExample).toBeTruthy();

    const state = {
      slug: concept.slug,
      params: {
        electricAmplitude: 1.2,
        waveSpeed: 2.8,
        wavelength: 1.8,
        probeX: 1.8,
      },
      time: 0.25,
      timeSource: "live" as const,
      activeGraphId: "source-probe",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "one-wavelength-lag",
    };

    const resolvedPair = resolveLiveWorkedExample(concept.slug, pairExample!, state);
    const resolvedDelay = resolveLiveWorkedExample(concept.slug, delayExample!, state);

    expect(resolvedPair.resultContent).toContain("E_p");
    expect(resolvedPair.interpretation).toMatch(/triad|positive|negative|zero crossing/i);
    expect(resolvedDelay.resultContent).toContain("\\Delta t");
    expect(resolvedDelay.interpretation).toMatch(/same phase|whole-number cycle|half-number/i);
  });

  it("resolves the light-spectrum worked examples against the live spectrum-and-medium state", () => {
    const concept = getConceptBySlug("light-spectrum-linkage");
    const bandExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "visible-band-frequency",
    );
    const mediumExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "medium-wavelength-delay",
    );

    expect(bandExample).toBeTruthy();
    expect(mediumExample).toBeTruthy();

    const state = {
      slug: concept.slug,
      params: {
        fieldAmplitude: 1.05,
        logWavelength: -6.27,
        mediumIndex: 1.52,
        probeCycles: 1,
      },
      time: 0.25,
      timeSource: "live" as const,
      activeGraphId: "source-probe",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "green-glass",
    };

    const resolvedBand = resolveLiveWorkedExample(concept.slug, bandExample!, state);
    const resolvedMedium = resolveLiveWorkedExample(concept.slug, mediumExample!, state);

    expect(resolvedBand.resultContent).toContain("Visible light");
    expect(resolvedBand.resultContent).toContain("THz");
    expect(resolvedBand.interpretation).toMatch(/green visible light|visible window/i);
    expect(resolvedMedium.resultContent).toContain("lambda_m");
    expect(resolvedMedium.resultContent).toContain("delta t");
    expect(resolvedMedium.interpretation).toMatch(/higher index lowers the speed|source frequency stays/i);
  });

  it("resolves the polarization worked examples against the live polarizer state", () => {
    const concept = getConceptBySlug("polarization");
    const outputExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-output-state",
    );
    const blockedExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-blocked-share",
    );

    expect(outputExample).toBeTruthy();
    expect(blockedExample).toBeTruthy();

    const state = {
      slug: concept.slug,
      params: {
        inputAmplitude: 1.1,
        inputAngle: 30,
        polarizerAngle: 70,
        unpolarized: true,
      },
      time: 0,
      timeSource: "live" as const,
      activeGraphId: "power-split",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "unpolarized-half",
    };

    const resolvedOutput = resolveLiveWorkedExample(concept.slug, outputExample!, state);
    const resolvedBlocked = resolveLiveWorkedExample(concept.slug, blockedExample!, state);

    expect(resolvedOutput.resultContent).toContain("I/I_0 = 0.5");
    expect(resolvedOutput.resultContent).toContain("70°");
    expect(resolvedOutput.interpretation).toMatch(/mixed input|one half/i);
    expect(resolvedBlocked.resultContent).toContain("I_{blocked}/I_0 = 0.5");
    expect(resolvedBlocked.interpretation).toMatch(/preferred axis|half the intensity on average/i);
  });

  it("resolves the photoelectric worked examples against the live emission state", () => {
    const concept = getConceptBySlug("photoelectric-effect");
    const energyExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-energy-budget",
    );
    const stoppingExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-stopping-potential",
    );

    expect(energyExample).toBeTruthy();
    expect(stoppingExample).toBeTruthy();

    const state = {
      slug: concept.slug,
      params: {
        frequencyPHz: 1,
        intensity: 1,
        workFunctionEv: 2.3,
        collectorVoltage: -1.84,
      },
      time: 0.25,
      timeSource: "live" as const,
      activeGraphId: "collector-sweep",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "stopping-potential-cutoff",
    };

    const resolvedEnergy = resolveLiveWorkedExample(concept.slug, energyExample!, state);
    const resolvedStopping = resolveLiveWorkedExample(concept.slug, stoppingExample!, state);

    expect(resolvedEnergy.resultContent).toContain("K_{\\max}");
    expect(resolvedEnergy.interpretation).toMatch(/exceeds the work function|below threshold/i);
    expect(resolvedStopping.resultContent).toContain("V_{\\text{stop}}");
    expect(resolvedStopping.resultContent).toContain("I_{\\text{col}}");
    expect(resolvedStopping.interpretation).toMatch(/stopping point|collector current/i);
  });

  it("resolves the atomic-spectra worked examples against the live ladder state", () => {
    const concept = getConceptBySlug("atomic-spectra");
    const visibleExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-visible-pair",
    );
    const modeExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-mode-line",
    );

    expect(visibleExample).toBeTruthy();
    expect(modeExample).toBeTruthy();

    const state = {
      slug: concept.slug,
      params: {
        gap12Ev: 1.9,
        gap23Ev: 2.6,
        gap34Ev: 2.7,
        absorptionMode: true,
      },
      time: 0.25,
      timeSource: "live" as const,
      activeGraphId: "spectrum-lines",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "hydrogen-like-absorption",
    };

    const resolvedVisible = resolveLiveWorkedExample(concept.slug, visibleExample!, state);
    const resolvedMode = resolveLiveWorkedExample(concept.slug, modeExample!, state);

    expect(resolvedVisible.resultContent).toContain("\\lambda_{2\\to1}");
    expect(resolvedVisible.resultContent).toContain("visible lines");
    expect(resolvedVisible.interpretation).toMatch(/visible|line/i);
    expect(resolvedMode.resultContent).toContain("\\Delta E_{4\\to1}");
    expect(resolvedMode.resultContent).toContain("\\lambda_{4\\leftrightarrow1}");
    expect(resolvedMode.interpretation).toMatch(/same wavelengths|bright|dark/i);
  });

  it("resolves the de-broglie matter-wave worked examples against the live bench", () => {
    const concept = getConceptBySlug("de-broglie-matter-waves");
    const wavelengthExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-wavelength-from-momentum",
    );
    const fitExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-loop-fit",
    );

    expect(wavelengthExample).toBeTruthy();
    expect(fitExample).toBeTruthy();

    const state = {
      slug: concept.slug,
      params: {
        massMultiple: 2,
        speedMms: 2.2,
      },
      time: 0,
      timeSource: "live" as const,
      activeGraphId: "loop-fit",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "heavier-same-speed",
    };

    const resolvedWavelength = resolveLiveWorkedExample(concept.slug, wavelengthExample!, state);
    const resolvedFit = resolveLiveWorkedExample(concept.slug, fitExample!, state);

    expect(resolvedWavelength.resultContent).toContain("\\lambda");
    expect(resolvedWavelength.resultContent).toContain("kg");
    expect(resolvedWavelength.interpretation).toMatch(/momentum|short/i);
    expect(resolvedFit.resultContent).toContain("N =");
    expect(resolvedFit.resultContent).toContain("\\Delta n");
    expect(resolvedFit.interpretation).toMatch(/whole-number|seam|loop/i);
  });

  it("resolves the bohr-model worked examples against the live hydrogen state", () => {
    const concept = getConceptBySlug("bohr-model");
    const transitionExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "active-transition-wavelength",
    );
    const seriesExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-series-scale",
    );

    expect(transitionExample).toBeTruthy();
    expect(seriesExample).toBeTruthy();

    const state = {
      slug: concept.slug,
      params: {
        upperLevel: 3,
        lowerLevel: 2,
        excitationMode: true,
      },
      time: 0.25,
      timeSource: "live" as const,
      activeGraphId: "series-spectrum",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "balmer-reverse-excitation",
    };

    const resolvedTransition = resolveLiveWorkedExample(concept.slug, transitionExample!, state);
    const resolvedSeries = resolveLiveWorkedExample(concept.slug, seriesExample!, state);

    expect(resolvedTransition.resultContent).toContain("\\Delta E");
    expect(resolvedTransition.resultContent).toContain("\\lambda");
    expect(resolvedTransition.interpretation).toMatch(/visible|quantized|Balmer/i);
    expect(resolvedSeries.resultContent).toContain("Balmer series");
    expect(resolvedSeries.resultContent).toContain("r_i / r_f");
    expect(resolvedSeries.interpretation).toMatch(/Balmer|limit|crowd/i);
  });

  it("resolves the radioactivity-half-life worked examples against the live decay bench", () => {
    const concept = getConceptBySlug("radioactivity-half-life");
    const expectedExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-expected-remaining",
    );
    const spreadExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-sample-spread",
    );

    expect(expectedExample).toBeTruthy();
    expect(spreadExample).toBeTruthy();

    const state = {
      slug: concept.slug,
      params: {
        sampleSize: 64,
        halfLifeSeconds: 2.4,
      },
      time: 2.4,
      timeSource: "inspect" as const,
      activeGraphId: "remaining-count",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "class-lab",
    };

    const resolvedExpected = resolveLiveWorkedExample(concept.slug, expectedExample!, state);
    const resolvedSpread = resolveLiveWorkedExample(concept.slug, spreadExample!, state);

    expect(resolvedExpected.resultContent).toContain("32");
    expect(resolvedExpected.resultContent).toContain("2.4 s");
    expect(resolvedExpected.interpretation).toMatch(/half-life|expected|halved/i);
    expect(resolvedSpread.resultContent).toContain("27");
    expect(resolvedSpread.resultContent).toContain("-5");
    expect(resolvedSpread.interpretation).toMatch(/small sample|expectation|yes\/no|curve/i);
  });
  it("resolves the double-slit worked examples against the live optics geometry", () => {
    const concept = getConceptBySlug("double-slit-interference");
    const phaseExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "path-difference-to-phase",
    );
    const spacingExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "fringe-spacing-geometry",
    );

    expect(phaseExample).toBeTruthy();
    expect(spacingExample).toBeTruthy();

    const phaseState = {
      slug: concept.slug,
      params: {
        wavelength: 0.78,
        slitSeparation: 2.6,
        screenDistance: 5.4,
        probeY: 0.81,
      },
      time: 0.2,
      timeSource: "inspect" as const,
      activeGraphId: "pattern",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "first-dark",
    };
    const spacingState = {
      ...phaseState,
      params: {
        wavelength: 1,
        slitSeparation: 1.8,
        screenDistance: 6.2,
        probeY: 1.7,
      },
      activePresetId: "wide-fringes",
    };

    const resolvedPhase = resolveLiveWorkedExample(concept.slug, phaseExample!, phaseState);
    const resolvedSpacing = resolveLiveWorkedExample(concept.slug, spacingExample!, spacingState);

    expect(resolvedPhase.resultContent).toContain("rad");
    expect(resolvedPhase.interpretation).toMatch(/dark fringe|opposite in phase|nearly cancel/i);
    expect(resolvedSpacing.resultContent).toContain("3.44");
    expect(resolvedSpacing.interpretation).toMatch(/far apart|geometry|lambda L \/ d/i);
  });

  it("resolves the optical-resolution worked examples against the live detector profile", () => {
    const concept = getConceptBySlug("optical-resolution-imaging-limits");
    const thresholdExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "rayleigh-limit-from-live-aperture",
    );
    const ratioExample = concept.sections.workedExamples.items.find(
      (item) => item.id === "current-separation-versus-threshold",
    );

    expect(thresholdExample).toBeTruthy();
    expect(ratioExample).toBeTruthy();

    const thresholdState = {
      slug: concept.slug,
      params: {
        wavelengthNm: 550,
        apertureMm: 2.4,
        separationMrad: 0.28,
        probeYUm: 0,
      },
      time: 0,
      timeSource: "live" as const,
      activeGraphId: "image-profile",
      interactionMode: "explore" as const,
      activeCompareTarget: null,
      activePresetId: "near-threshold",
    };
    const ratioState = {
      ...thresholdState,
      params: {
        wavelengthNm: 650,
        apertureMm: 1.6,
        separationMrad: 0.22,
        probeYUm: 0,
      },
      activePresetId: "blurred-pair",
    };

    const resolvedThreshold = resolveLiveWorkedExample(
      concept.slug,
      thresholdExample!,
      thresholdState,
    );
    const resolvedRatio = resolveLiveWorkedExample(concept.slug, ratioExample!, ratioState);

    expect(resolvedThreshold.resultContent).toContain("0.28");
    expect(resolvedThreshold.resultContent).toContain("33.55");
    expect(resolvedThreshold.interpretation).toMatch(/Rayleigh threshold|visible dip|detector profile/i);
    expect(resolvedRatio.resultContent).toContain("0.44");
    expect(resolvedRatio.interpretation).toMatch(/one broad blur|merged|below 1/i);
  });
});
