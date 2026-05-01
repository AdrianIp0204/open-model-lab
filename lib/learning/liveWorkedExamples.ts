import type { AppLocale } from "@/i18n/routing";
import type { ConceptSlug, ConceptWorkedExample } from "@/lib/content";
import {
  TAU,
  type ControlValue,
  degToRad,
  formatMeasurement,
  formatComplex,
  formatNumber,
  formatSpectrumFrequency,
  formatSpectrumWavelength,
  formatSpeedFractionOfC,
  sampleBasicCircuitsState,
  sampleEquivalentResistanceState,
  sampleInternalResistanceTerminalVoltageState,
  samplePowerEnergyCircuitsState,
  sampleRcChargingDischargingState,
  sampleIdealGasLawKineticTheoryState,
  samplePressureHydrostaticState,
  CONTINUITY_EQUATION_SLICE_DURATION,
  sampleContinuityEquationState,
  sampleBernoulliPrincipleState,
  sampleBuoyancyArchimedesState,
  sampleDragTerminalVelocityState,
  resolveTemperatureInternalEnergyParams,
  sampleSeriesParallelCircuitsState,
  resolveElectricFieldsParams,
  resolveGravitationalFieldsParams,
  resolveGravitationalPotentialParams,
  resolveCircularOrbitKeplerRatio,
  resolveCircularOrbitPeriod,
  resolveCircularOrbitSpeed,
  resolveCircularOrbitsParams,
  resolveEscapeVelocityParams,
  resolveElectricPotentialParams,
  resolveCapacitanceElectricEnergyParams,
  resolveMagneticForceParams,
  resolveMagneticFieldsParams,
  resolveMirrorsParams,
  resolvePolarizationParams,
  peakFrequency,
  resolveDispersionRefractiveIndexColorParams,
  resolveRefractionSnellsLawParams,
  resolveDiffractionParams,
  resolveDerivativeSlopeParams,
  resolveDynamicEquilibriumParams,
  resolveIntegralAccumulationParams,
  resolveComplexNumbersPlaneParams,
  resolveParametricCurvesMotionParams,
  resolveSortingTradeoffsParams,
  resolveBinarySearchHalvingParams,
  resolveSolubilitySaturationParams,
  resolveBuffersNeutralizationParams,
  resolveConcentrationDilutionParams,
  resolveAcidBasePhParams,
  resolveOpticalResolutionParams,
  resolveDoubleSlitInterferenceParams,
  resolveLensImagingParams,
  resolveConservationMomentumParams,
  resolveCollisionsParams,
  resolveMomentumImpulseParams,
  resolveAngularFrequency,
  resolveAngularMomentumParams,
  resolveRollingMotionParams,
  resolveProjectileParams,
  resolveReactionRateCollisionTheoryParams,
  resolveRotationalInertiaParams,
  resolveStaticEquilibriumCentreOfMassParams,
  resolveTorqueParams,
  resolveSpringConstant,
  resolveUcmParams,
  resolveVectorsComponentsParams,
  resolveVectors2DParams,
  resolveDotProductProjectionParams,
  sampleDotProductProjectionState,
  resolveStoichiometryRecipeParams,
  sampleStoichiometryRecipeState,
  sampleLensImagingState,
  sampleMirrorsState,
  sampleBeatsState,
  sampleSoundWavesLongitudinalState,
  sampleConservationMomentumState,
  sampleCollisionsState,
  sampleMomentumImpulseState,
  sampleWaveSpeedWavelengthState,
  sampleDopplerEffectState,
  sampleDampingState,
  sampleDerivativeSlopeState,
  resolveLimitsContinuityParams,
  sampleLimitsContinuityState,
  sampleDynamicEquilibriumState,
  sampleIntegralAccumulationState,
  sampleComplexNumbersPlaneState,
  sampleParametricCurvesMotionState,
  sampleSortingTradeoffsState,
  sampleBinarySearchHalvingState,
  sampleSolubilitySaturationState,
  sampleBuffersNeutralizationState,
  sampleConcentrationDilutionState,
  sampleAcidBasePhState,
  sampleAngularMomentumState,
  sampleRollingMotionState,
  sampleElectricFieldsState,
  sampleGravitationalFieldsState,
  sampleGravitationalPotentialState,
  sampleGraphTransformationsState,
  sampleCircularOrbitsState,
  sampleEscapeVelocityState,
  sampleElectricPotentialState,
  sampleCapacitanceElectricEnergyState,
  sampleElectromagneticInductionState,
  sampleElectromagneticWavesState,
  sampleLightSpectrumLinkageState,
  sampleDispersionRefractiveIndexColorState,
  samplePolarizationState,
  sampleDiffractionState,
  sampleOpticalResolutionState,
  sampleDoubleSlitInterferenceState,
  samplePhotoelectricEffectState,
  sampleAtomicSpectraState,
  sampleDeBroglieMatterWavesState,
  sampleBohrModelState,
  sampleRadioactivityHalfLifeState,
  sampleMagneticForceState,
  sampleMagneticFieldsState,
  sampleMaxwellEquationsSynthesisState,
  sampleProjectileState,
  sampleReactionRateCollisionTheoryState,
  sampleRotationalInertiaState,
  sampleStaticEquilibriumCentreOfMassState,
  sampleTorqueState,
  sampleRefractionSnellsLawState,
  sampleShmState,
  sampleAirColumnResonanceState,
  sampleStandingWavesState,
  resolveHeatTransferParams,
  resolveAirColumnResonanceParams,
  resolveSpecificHeatPhaseChangeParams,
  sampleHeatTransferState,
  sampleSpecificHeatPhaseChangeState,
  sampleTemperatureInternalEnergyState,
  sampleUcmState,
  sampleVectorsComponentsState,
  sampleVectors2DState,
  sampleWaveInterferenceState,
  resolveBeatsParams,
} from "@/lib/physics";

export type WorkedExampleTimeSource = "live" | "inspect" | "preview";
export type WorkedExampleInteractionMode = "explore" | "predict" | "compare";

export type LiveWorkedExampleState = {
  slug: ConceptSlug;
  params: Record<string, ControlValue>;
  time: number;
  timeSource: WorkedExampleTimeSource;
  activeGraphId: string | null;
  interactionMode: WorkedExampleInteractionMode;
  activeCompareTarget: "a" | "b" | null;
  activePresetId: string | null;
};

export type ResolvedWorkedExample = {
  prompt: string;
  steps: Array<{ id: string; label: string; content: string }>;
  resultLabel: string;
  resultContent: string;
  interpretation?: string;
  variableValues: Record<string, string>;
};

type WorkedExampleTokenMap = Record<string, string>;
type WorkedExampleBuilder = (
  state: LiveWorkedExampleState,
  locale?: AppLocale,
) => WorkedExampleTokenMap;
type WorkedExampleTemplateSource = {
  location: string;
  template: string;
};

const workedExampleTokenPattern = /\{\{([a-zA-Z0-9_-]+)\}\}/g;

function interpolateTemplate(template: string, tokens: WorkedExampleTokenMap) {
  return template.replace(/\{\{([a-zA-Z0-9_-]+)\}\}/g, (_, key: string) => tokens[key] ?? "—");
}

function getWorkedExampleTemplateSources(
  example: ConceptWorkedExample,
): WorkedExampleTemplateSource[] {
  const sources: WorkedExampleTemplateSource[] = [
    { location: "prompt", template: example.prompt },
    ...example.steps.map((step) => ({
      location: `step "${step.id}"`,
      template: step.template,
    })),
    { location: "result", template: example.resultTemplate },
  ];

  if (example.interpretationTemplate) {
    sources.push({
      location: "interpretation",
      template: example.interpretationTemplate,
    });
  }

  return sources;
}

function collectWorkedExampleTemplateTokens(template: string) {
  const tokens = new Set<string>();

  for (const match of template.matchAll(workedExampleTokenPattern)) {
    const token = match[1];

    if (token) {
      tokens.add(token);
    }
  }

  return [...tokens];
}

function isZhHkLocale(locale?: AppLocale) {
  return locale === "zh-HK";
}

function getWorkedExampleBuilder(
  slug: ConceptSlug,
  exampleId: string,
): WorkedExampleBuilder | null {
  return builders[slug]?.[exampleId] ?? null;
}

export function getWorkedExampleTokenValidationIssues(
  slug: ConceptSlug,
  example: ConceptWorkedExample,
  state: LiveWorkedExampleState,
): string[] {
  const builder = getWorkedExampleBuilder(slug, example.id);

  if (!builder) {
    return [`Missing live worked-example builder for "${slug}" / "${example.id}".`];
  }

  const tokens = builder(state);
  const tokenKeys = new Set(Object.keys(tokens));
  const issues = new Set<string>();

  for (const variable of example.variables) {
    if (!tokenKeys.has(variable.valueKey)) {
      issues.add(
        `Concept "${slug}" workedExamples item "${example.id}" references unknown valueKey "${variable.valueKey}".`,
      );
    }
  }

  for (const source of getWorkedExampleTemplateSources(example)) {
    for (const token of collectWorkedExampleTemplateTokens(source.template)) {
      if (!tokenKeys.has(token)) {
        issues.add(
          `Concept "${slug}" workedExamples item "${example.id}" ${source.location} references unknown token "${token}".`,
        );
      }
    }
  }

  return [...issues];
}

function toNumber(value: ControlValue | undefined, fallback: number) {
  return typeof value === "number" ? value : fallback;
}

function toOptionalNumber(value: ControlValue | undefined) {
  return typeof value === "number" ? value : undefined;
}

function resolveShmTokens(state: LiveWorkedExampleState) {
  const amplitude = toNumber(state.params.amplitude, 1);
  const angularFrequency = toOptionalNumber(
    typeof state.params.omega === "number" ? state.params.omega : state.params.angularFrequency,
  );
  const omega = resolveAngularFrequency({
    amplitude,
    angularFrequency,
    springConstant: toNumber(state.params.springConstant, 0),
    mass: toNumber(state.params.mass, 1),
    phase: toNumber(state.params.phase, 0),
    equilibriumShift: toNumber(state.params.equilibriumShift, 0),
    damping: toNumber(state.params.damping, 0),
  });
  const phase = toNumber(state.params.phase, 0);
  const time = state.time;
  const snapshot = sampleShmState(
    {
      amplitude,
      angularFrequency: omega,
      springConstant: toNumber(state.params.springConstant, 0),
      phase,
      mass: toNumber(state.params.mass, 1),
      equilibriumShift: toNumber(state.params.equilibriumShift, 0),
      damping: toNumber(state.params.damping, 0),
    },
    time,
  );
  const phaseAngle = omega * time + phase;
  const period = TAU / Math.max(omega, 0.001);

    return {
    timeValue: formatNumber(time),
    amplitudeValue: formatNumber(amplitude),
    omegaValue: formatNumber(omega),
    phaseValue: formatNumber(phase),
    phaseAngleValue: formatNumber(phaseAngle),
    displacementValue: formatNumber(snapshot.displacement),
    periodValue: formatNumber(period),
    displacementInterpretation:
      Math.abs(snapshot.displacement) < 0.05
        ? "The mass is near equilibrium right now, so the restoring pull is small and the velocity is near its largest magnitude."
        : snapshot.displacement > 0
          ? "The displacement is positive, so the oscillator is on the positive side of equilibrium and the restoring acceleration points back toward the center."
          : "The displacement is negative, so the oscillator is on the negative side of equilibrium and the restoring acceleration points back toward the center.",
    periodInterpretation:
      omega >= 2.4
        ? "The period is short, so the stage and graph cycle quickly through repeated peaks."
        : "The period is longer, so each oscillation takes more time before the pattern repeats.",
  } satisfies WorkedExampleTokenMap;
}

function resolveOscillationEnergyTokens(state: LiveWorkedExampleState) {
  const amplitude = toNumber(state.params.amplitude, 1.4);
  const mass = toNumber(state.params.mass, 1);
  const phase = toNumber(state.params.phase, 0);
  const springConstant = resolveSpringConstant({
    amplitude,
    angularFrequency: toOptionalNumber(
      typeof state.params.omega === "number" ? state.params.omega : state.params.angularFrequency,
    ),
    springConstant: toOptionalNumber(state.params.springConstant),
    mass,
    phase,
    equilibriumShift: toOptionalNumber(state.params.equilibriumShift),
    damping: toOptionalNumber(state.params.damping),
  });
  const omega = resolveAngularFrequency({
    amplitude,
    angularFrequency: toOptionalNumber(
      typeof state.params.omega === "number" ? state.params.omega : state.params.angularFrequency,
    ),
    springConstant,
    mass,
    phase,
    equilibriumShift: toNumber(state.params.equilibriumShift, 0),
    damping: toNumber(state.params.damping, 0),
  });
  const snapshot = sampleShmState(
    {
      amplitude,
      angularFrequency: toOptionalNumber(
        typeof state.params.omega === "number" ? state.params.omega : state.params.angularFrequency,
      ),
      springConstant,
      mass,
      phase,
      equilibriumShift: toNumber(state.params.equilibriumShift, 0),
      damping: toNumber(state.params.damping, 0),
    },
    state.time,
  );
  const normalizedDisplacement = Math.abs(snapshot.displacement) / Math.max(amplitude, 0.001);
  const totalEnergy = 0.5 * springConstant * amplitude * amplitude;
  const period = TAU / Math.max(omega, 0.001);

  return {
    timeValue: formatNumber(state.time),
    amplitudeValue: formatNumber(amplitude),
    massValue: formatNumber(mass),
    springConstantValue: formatNumber(springConstant),
    omegaValue: formatNumber(omega),
    periodValue: formatNumber(period),
    displacementValue: formatNumber(snapshot.displacement),
    velocityValue: formatNumber(snapshot.velocity),
    kineticValue: formatNumber(snapshot.energy.kinetic),
    potentialValue: formatNumber(snapshot.energy.potential),
    totalEnergyValue: formatNumber(totalEnergy),
    energySplitInterpretation:
      normalizedDisplacement >= 0.94
        ? "The mass is near a turning point, so nearly all of the stored energy is spring potential energy and the kinetic part has collapsed."
        : normalizedDisplacement <= 0.18
          ? "The mass is near equilibrium, so the spring stretch is small and most of the energy is kinetic."
          : snapshot.energy.kinetic > snapshot.energy.potential
            ? "Kinetic energy is larger here, so the mass is in the faster middle part of the swing rather than near an edge."
            : snapshot.energy.kinetic < snapshot.energy.potential
              ? "Potential energy is larger here, so the mass is closer to a turning point than to equilibrium."
              : "Kinetic and potential energy are comparable here, so the mass is partway between the center and the edge of the motion.",
    totalEnergyInterpretation:
      amplitude >= 1.8
        ? "Because total energy scales with A^2, this wider swing stores much more energy than a small-looking amplitude change might suggest."
        : springConstant >= 4.5
          ? "The stiffer spring raises the energy scale and shortens the period at the same time because the natural angular frequency depends on sqrt(k/m)."
          : "With amplitude and spring constant fixed, the total-energy line stays flat while the motion only trades energy between kinetic and potential forms.",
  } satisfies WorkedExampleTokenMap;
}

function resolveProjectileTokens(state: LiveWorkedExampleState, locale?: AppLocale) {
  const projectileParams = resolveProjectileParams({
    speed: toNumber(state.params.speed, 18),
    launchSpeed: toNumber(state.params.launchSpeed, 18),
    angle: toNumber(state.params.angle, 45),
    launchAngle: toNumber(state.params.launchAngle, 45),
    gravity: toNumber(state.params.gravity, 9.81),
    launchHeight: toNumber(state.params.launchHeight, 0),
  });
  const snapshot = sampleProjectileState(projectileParams, Math.min(state.time, sampleProjectileState(projectileParams, 0).timeOfFlight));
  const doubleAngleRadians = degToRad(projectileParams.launchAngle * 2);
  const zhHk = isZhHkLocale(locale);

  return {
    timeValue: formatNumber(Math.min(state.time, snapshot.timeOfFlight)),
    speedValue: formatNumber(projectileParams.launchSpeed),
    angleValue: formatNumber(projectileParams.launchAngle),
    gravityValue: formatNumber(projectileParams.gravity),
    sinDoubleAngleValue: formatNumber(Math.sin(doubleAngleRadians)),
    rangeValue: formatNumber(snapshot.range),
    vxValue: formatNumber(snapshot.vx),
    vyValue: formatNumber(snapshot.vy),
    rangeInterpretation:
      projectileParams.launchAngle > 55
        ? zhHk
          ? "這次較陡的發射把更多初速分配到向上方向，所以雖然留空時間較長，向外的射程增益未必最大。"
          : "This steeper launch spends more time climbing, but a lot of the launch speed points upward rather than outward."
        : projectileParams.launchAngle < 35
          ? zhHk
            ? "這次較淺的發射保留了較多水平速度，但留空時間較短，會限制拋體能飛行多遠。"
            : "This shallow launch preserves horizontal speed, but the shorter airtime limits how far the projectile can travel."
          : zhHk
            ? "這個角度在水平射程和滯空時間之間保持較均衡的分配，所以預測射程仍然相當理想。"
            : "This angle keeps a fairly balanced split between horizontal reach and airtime, so the predicted range stays strong.",
    velocityInterpretation:
      Math.abs(snapshot.vy) < 0.05
        ? zhHk
          ? "垂直分量幾乎為零，所以拋體非常接近最高點，而水平分量仍在帶動它向前。"
          : "The vertical component is nearly zero, so the projectile is very close to its apex while the horizontal component still carries it forward."
        : snapshot.vy > 0
          ? zhHk
            ? "垂直分量仍為正，表示拋體還在上升，只是重力已經開始削弱這個向上的速度。"
            : "The positive vertical component means the projectile is still rising even though gravity is already reducing that upward speed."
          : zhHk
            ? "垂直分量現在為負，所以拋體正在下降，而水平分量則保持不變。"
            : "The vertical component is negative now, so the projectile is descending while the horizontal component continues unchanged.",
  } satisfies WorkedExampleTokenMap;
}

function resolveMomentumImpulseTokens(state: LiveWorkedExampleState, locale?: AppLocale) {
  const zhHk = locale === "zh-HK";
  const params = resolveMomentumImpulseParams({
    mass: toNumber(state.params.mass, 1.5),
    initialVelocity: toNumber(state.params.initialVelocity, 0.5),
    force: toNumber(state.params.force, 3),
    pulseDuration: toNumber(state.params.pulseDuration, 0.4),
  });
  const snapshot = sampleMomentumImpulseState(params, state.time);
  const totalImpulse = snapshot.totalImpulse;

  return {
    timeValue: formatNumber(state.time),
    massValue: formatNumber(params.mass),
    initialVelocityValue: formatNumber(params.initialVelocity),
    velocityValue: formatNumber(snapshot.velocity),
    forceValue: formatNumber(params.force),
    pulseDurationValue: formatNumber(params.pulseDuration),
    momentumValue: formatNumber(snapshot.momentum),
    initialMomentumValue: formatNumber(snapshot.initialMomentum),
    impulseValue: formatNumber(totalImpulse),
    deltaMomentumValue: formatNumber(totalImpulse),
    finalMomentumValue: formatNumber(snapshot.finalMomentum),
    finalVelocityValue: formatNumber(snapshot.finalVelocity),
    momentumInterpretation:
      snapshot.forceActive
        ? zhHk
          ? "力脈衝正在作用，所以只要力保持開啟，動量仍會線性改變。"
          : "The pulse is active right now, so the momentum is still changing linearly while the force stays on."
        : snapshot.pulseElapsed <= 0
          ? zhHk
            ? "在脈衝開始前，小車保持初始速度，所以目前動量仍等於起始值。"
            : "Before the pulse starts, the cart keeps its initial velocity, so the current momentum still matches the starting value."
          : zhHk
            ? "脈衝結束後，合力回到零，小車會保持新的動量。"
            : "After the pulse ends, the cart keeps the new momentum because the net force has returned to zero.",
    impulseInterpretation:
      Math.abs(totalImpulse) < 0.05
        ? zhHk
          ? "衝量幾乎為零，表示這段脈衝窗口對小車動量幾乎沒有影響。"
          : "A nearly zero impulse means the pulse window does almost no work on the cart's momentum."
        : Math.abs(params.force) >= 2.4 && params.pulseDuration <= 0.45
          ? zhHk
            ? "這是短而有力的推動：力峰值很大，但脈衝寬度較窄，總衝量仍有限。"
            : "This is a short, strong push: the force spike is large, but the narrow pulse width keeps the total impulse bounded."
          : Math.abs(params.force) <= 1.8 && params.pulseDuration >= 0.75
            ? zhHk
              ? "這是較溫和但作用較久的推動：力較小，仍可因作用時間較長而傳遞相近衝量。"
              : "This is a gentler, longer push: the lower force can still deliver a similar impulse because the pulse lasts longer."
            : zhHk
              ? "總衝量就是帶符號的力-時間面積，而同一個帶符號數值會成為動量改變。"
              : "The total impulse is the signed force-time area, and that same signed value becomes the momentum change.",
  } satisfies WorkedExampleTokenMap;
}

function localizeResolvedMomentumImpulseExample(input: {
  example: ConceptWorkedExample;
  locale: AppLocale;
  resolved: ResolvedWorkedExample;
  tokens: WorkedExampleTokenMap;
}) {
  if (input.locale !== "zh-HK") {
    return input.resolved;
  }

  const { example, resolved, tokens } = input;

  if (example.id === "current-momentum") {
    return {
      ...resolved,
      steps: resolved.steps.map((step) => {
        if (step.id === "relation") {
          return {
            ...step,
            content: "在目前檢查的時刻，用 $p = mv$ 求小車動量。",
          };
        }

        if (step.id === "substitute") {
          return {
            ...step,
            content: String.raw`$p = ${tokens.massValue ?? "—"} \times ${
              tokens.velocityValue ?? "—"
            }$。`,
          };
        }

        if (step.id === "compute") {
          return {
            ...step,
            content: String.raw`所以 $p = ${
              tokens.momentumValue ?? "—"
            }\,\mathrm{kg\,m/s}$。`,
          };
        }

        return step;
      }),
      interpretation: tokens.momentumInterpretation,
    } satisfies ResolvedWorkedExample;
  }

  if (example.id === "pulse-impulse") {
    return {
      ...resolved,
      steps: resolved.steps.map((step) => {
        if (step.id === "relation") {
          return {
            ...step,
            content:
              String.raw`對這個恆定力脈衝，先用 $J = F\Delta t$，再用 ` +
              String.raw`$p_f = p_i + J$ 預測最終動量。`,
          };
        }

        if (step.id === "substitute") {
          return {
            ...step,
            content:
              String.raw`$J = ${tokens.forceValue ?? "—"} \times ${
                tokens.pulseDurationValue ?? "—"
              }$，` + String.raw`且 $p_f = ${tokens.initialMomentumValue ?? "—"} + J$。`,
          };
        }

        if (step.id === "compute") {
          return {
            ...step,
            content:
              String.raw`所以 $J = ${
                tokens.impulseValue ?? "—"
              }\,\mathrm{N\,s}$，` +
              String.raw`預測最終動量為 $p_f = ${
                tokens.finalMomentumValue ?? "—"
              }\,\mathrm{kg\,m/s}$。`,
          };
        }

        return step;
      }),
      interpretation: tokens.impulseInterpretation,
    } satisfies ResolvedWorkedExample;
  }

  return resolved;
}

function resolveTorqueTokens(state: LiveWorkedExampleState) {
  const params = resolveTorqueParams({
    forceMagnitude: toNumber(state.params.forceMagnitude, 2),
    forceAngle: toNumber(state.params.forceAngle, 90),
    applicationDistance: toNumber(state.params.applicationDistance, 1.6),
  });
  const snapshot = sampleTorqueState(params, state.time);

  return {
    timeValue: formatNumber(snapshot.displayTime),
    forceMagnitudeValue: formatNumber(params.forceMagnitude),
    forceAngleValue: formatNumber(params.forceAngle),
    applicationDistanceValue: formatNumber(params.applicationDistance),
    forceParallelValue: formatNumber(snapshot.forceParallel),
    forcePerpendicularValue: formatNumber(snapshot.forcePerpendicular),
    momentArmValue: formatNumber(snapshot.momentArm),
    torqueValue: formatNumber(snapshot.torque),
    angularAccelerationValue: formatNumber(snapshot.angularAcceleration),
    angularSpeedValue: formatNumber(snapshot.angularSpeed),
    rotationAngleValue: formatNumber(snapshot.rotationAngle),
    torqueInterpretation:
      snapshot.turningDirectionLabel === "balanced"
        ? "The force line is nearly aimed through the pivot, so the perpendicular part collapses and the bar barely picks up any turning effect."
        : snapshot.turningDirectionLabel === "counterclockwise"
          ? "The perpendicular part of the push is positive here, so the same force geometry builds a counterclockwise twist."
          : "The perpendicular part is negative here, so the same geometry now twists the bar clockwise instead.",
    turningInterpretation:
      Math.abs(snapshot.rotationAngle) < 0.08
        ? "Very little rotation has accumulated yet because either the torque is small, the time window is short, or both."
        : snapshot.turningDirectionLabel === "counterclockwise"
          ? "With a steady positive torque, angular speed grows linearly and the rotation angle curves upward as the bar swings counterclockwise."
          : "With a steady negative torque, angular speed grows in the clockwise direction and the rotation angle keeps moving more negative over time.",
  } satisfies WorkedExampleTokenMap;
}

function resolveStaticEquilibriumCentreOfMassTokens(state: LiveWorkedExampleState) {
  const params = resolveStaticEquilibriumCentreOfMassParams({
    cargoMass: toNumber(state.params.cargoMass, 3),
    cargoPosition: toNumber(state.params.cargoPosition, 0.8),
    supportCenter: toNumber(state.params.supportCenter, 0),
    supportWidth: toNumber(state.params.supportWidth, 1.4),
  });
  const snapshot = sampleStaticEquilibriumCentreOfMassState(params);
  const stable =
    snapshot.supportBalanceLabel === "stable" || snapshot.supportBalanceLabel === "balanced";
  const tippingRight = snapshot.supportBalanceLabel === "tips-right";

  return {
    cargoMassValue: formatNumber(params.cargoMass),
    cargoPositionValue: formatNumber(params.cargoPosition),
    plankMassValue: formatNumber(params.plankMass),
    totalMassValue: formatNumber(snapshot.totalMass),
    gravityValue: formatNumber(snapshot.gravity),
    centerOfMassXValue: formatNumber(snapshot.centerOfMassX),
    totalWeightValue: formatNumber(snapshot.totalWeight),
    supportCenterValue: formatNumber(params.supportCenter),
    supportWidthValue: formatNumber(params.supportWidth),
    supportLeftEdgeValue: formatNumber(snapshot.supportLeftEdge),
    supportRightEdgeValue: formatNumber(snapshot.supportRightEdge),
    requiredLeftReactionValue: formatNumber(snapshot.requiredLeftReaction),
    requiredRightReactionValue: formatNumber(snapshot.requiredRightReaction),
    actualLeftReactionValue: formatNumber(snapshot.actualLeftReaction),
    actualRightReactionValue: formatNumber(snapshot.actualRightReaction),
    stabilityMarginValue: formatNumber(snapshot.stabilityMargin),
    tipOverhangValue: formatNumber(snapshot.tipOverhang),
    supportFeasibilityValue: stable
      ? "Both required reactions are positive, so the plank can stay in static equilibrium."
      : tippingRight
        ? "The left support would have to pull downward to keep the plank flat, so the plank tips right instead."
        : "The right support would have to pull downward to keep the plank flat, so the plank tips left instead.",
    supportResultSummary: stable
      ? `R_L = ${formatNumber(snapshot.actualLeftReaction)} N, R_R = ${formatNumber(snapshot.actualRightReaction)} N, margin = ${formatNumber(snapshot.stabilityMargin)} m`
      : tippingRight
        ? `Would tip right: x_CM sits ${formatNumber(snapshot.tipOverhang)} m beyond x_R.`
        : `Would tip left: x_CM sits ${formatNumber(snapshot.tipOverhang)} m beyond x_L.`,
    centerOfMassInterpretation:
      params.cargoMass < 0.05
        ? "With no added cargo, the plank's own mass stays centered, so the combined centre of mass sits at the middle."
        : Math.abs(snapshot.centerOfMassX) < 0.08
          ? "The added cargo is not shifting the total centre of mass very far, so the combined weight still acts close to the plank midpoint."
          : snapshot.centerOfMassX > 0
            ? "The cargo shifts the combined centre of mass to the right, so the total weight now acts to the right of the plank midpoint."
            : "The cargo shifts the combined centre of mass to the left, so the total weight now acts to the left of the plank midpoint.",
    supportInterpretation: snapshot.supportBalanceLabel === "balanced"
      ? "The combined centre of mass sits directly above the support centre, so the support reactions match and the torque about the support centre is zero."
      : snapshot.supportBalanceLabel === "stable"
        ? "The combined centre of mass still lands inside the support region, so static equilibrium is still possible even though the reactions are no longer equal."
        : tippingRight
          ? "The combined centre of mass has crossed the right support edge, so the support region can no longer supply a physically possible pair of upward reactions."
          : "The combined centre of mass has crossed the left support edge, so the support region can no longer supply a physically possible pair of upward reactions.",
  } satisfies WorkedExampleTokenMap;
}

function resolveRotationalInertiaTokens(state: LiveWorkedExampleState) {
  const params = resolveRotationalInertiaParams({
    appliedTorque: toNumber(state.params.appliedTorque, 4),
    massRadius: toNumber(state.params.massRadius, 0.35),
  });
  const snapshot = sampleRotationalInertiaState(params, state.time);
  const ringContribution = params.totalMass * params.massRadius * params.massRadius;

  return {
    timeValue: formatNumber(snapshot.displayTime),
    massRadiusValue: formatNumber(params.massRadius),
    appliedTorqueValue: formatNumber(params.appliedTorque),
    totalMassValue: formatNumber(params.totalMass),
    hubInertiaValue: formatNumber(params.hubInertia),
    ringContributionValue: formatNumber(ringContribution),
    momentOfInertiaValue: formatNumber(snapshot.momentOfInertia),
    angularAccelerationValue: formatNumber(snapshot.angularAcceleration),
    angularSpeedValue: formatNumber(snapshot.angularSpeed),
    rotationAngleValue: formatNumber(snapshot.rotationAngle),
    inertiaInterpretation:
      snapshot.distributionLabel === "compact"
        ? "Most of the same mass stays close to the axis here, so the rotor keeps a relatively small moment of inertia and responds quickly to the torque."
        : snapshot.distributionLabel === "spread"
          ? "Most of the same mass sits far from the axis here, so the rotor carries a much larger moment of inertia and resists spin-up more strongly."
          : "This mid-radius layout sits between the compact and wide-rim extremes, so the inertia and spin-up stay moderate.",
    spinUpInterpretation:
      Math.abs(snapshot.rotationAngle) < 0.08
        ? "Very little rotation has accumulated yet because the clip has just started or the current layout is still resisting the torque strongly."
        : snapshot.distributionLabel === "compact"
          ? "Because the same mass stays close to the axis here, the rotor gains angular speed quickly and the accumulated angle grows fast."
          : snapshot.distributionLabel === "spread"
            ? "Because the same mass sits farther from the axis here, the larger moment of inertia keeps both angular speed and accumulated angle more modest."
            : "This setup is spinning up steadily, but the response stays between the compact and wide-rim extremes.",
  } satisfies WorkedExampleTokenMap;
}

function resolveRollingMotionTokens(state: LiveWorkedExampleState) {
  const params = resolveRollingMotionParams({
    slopeAngle: toNumber(state.params.slopeAngle, 12),
    radius: toNumber(state.params.radius, 0.22),
    inertiaFactor: toNumber(state.params.inertiaFactor, 0.5),
  });
  const snapshot = sampleRollingMotionState(params, state.time);

  return {
    timeValue: formatNumber(snapshot.displayTime),
    slopeAngleValue: formatNumber(params.slopeAngle),
    radiusValue: formatNumber(params.radius),
    inertiaFactorValue: formatNumber(params.inertiaFactor),
    gravityValue: formatNumber(params.gravity),
    trackLengthValue: formatNumber(params.trackLength),
    accelerationValue: formatNumber(snapshot.acceleration),
    travelTimeValue: formatNumber(snapshot.travelTime),
    linearSpeedValue: formatNumber(snapshot.linearSpeed),
    angularSpeedValue: formatNumber(snapshot.angularSpeed),
    rotationAngleValue: formatNumber(snapshot.rotationAngle),
    translationalEnergyValue: formatNumber(snapshot.translationalEnergy),
    rotationalEnergyValue: formatNumber(snapshot.rotationalEnergy),
    totalKineticEnergyValue: formatNumber(snapshot.totalKineticEnergy),
    staticFrictionValue: formatNumber(snapshot.staticFriction),
    shapeLabelValue: snapshot.shapeLabel,
    accelerationInterpretation:
      snapshot.shapeId === "sphere"
        ? "The solid sphere carries a small inertia factor, so gravity can accelerate the center more strongly and the trip down the ramp stays quick."
        : snapshot.shapeId === "hoop"
          ? "The hoop's rim-heavy mass distribution raises the inertia factor, so more of the same downhill pull builds spin and the trip takes longer."
          : snapshot.shapeId === "cylinder"
            ? "The solid cylinder sits between the sphere and hoop cases, so its acceleration and travel time stay in the middle as well."
            : snapshot.inertiaFactor < 0.62
              ? "This custom roller is still fairly center-loaded, so its acceleration stays closer to the sphere side than to the hoop side."
              : "This custom roller is more rim-loaded, so its rolling response stays closer to the slower hoop limit.",
    rollingStateInterpretation:
      snapshot.radius <= 0.18
        ? "The smaller radius barely changes the center-of-mass speed history here, but it does force a larger angular speed because the same v_cm must equal r omega."
        : snapshot.shapeId === "hoop"
          ? "The hoop keeps a large share of the kinetic energy in rotation, so the rotational bar and angular-speed readout stay prominent."
          : snapshot.shapeId === "sphere"
            ? "The sphere keeps more of the kinetic-energy budget in translation, so the center speed rises sooner even while the no-slip relation still holds exactly."
            : "This live state shows the same no-slip link and energy bookkeeping working together on one bounded incline.",
  } satisfies WorkedExampleTokenMap;
}

function resolveAngularMomentumTokens(state: LiveWorkedExampleState) {
  const params = resolveAngularMomentumParams({
    massRadius: toNumber(state.params.massRadius, 0.55),
    angularSpeed: toNumber(state.params.angularSpeed, 2.4),
  });
  const snapshot = sampleAngularMomentumState(params, state.time);
  const ringContribution = params.totalMass * params.massRadius * params.massRadius;

  return {
    timeValue: formatNumber(snapshot.displayTime),
    massRadiusValue: formatNumber(params.massRadius),
    angularSpeedValue: formatNumber(params.angularSpeed),
    totalMassValue: formatNumber(params.totalMass),
    hubInertiaValue: formatNumber(params.hubInertia),
    ringContributionValue: formatNumber(ringContribution),
    momentOfInertiaValue: formatNumber(snapshot.momentOfInertia),
    angularMomentumValue: formatNumber(snapshot.angularMomentum),
    tangentialSpeedValue: formatNumber(snapshot.tangentialSpeed),
    rotationAngleValue: formatNumber(snapshot.rotationAngle),
    compactReferenceRadiusValue: formatNumber(params.compactReferenceRadius),
    compactReferenceInertiaValue: formatNumber(params.compactReferenceInertia),
    referenceAngularSpeedValue: formatNumber(snapshot.referenceAngularSpeed),
    momentumInterpretation:
      snapshot.distributionLabel === "compact"
        ? "Packing the same mass close to the axis keeps the moment of inertia modest, so even a moderate angular speed can carry a noticeable angular momentum."
        : snapshot.distributionLabel === "spread"
          ? "This wide layout carries a large moment of inertia, so the same spin rate now stores much more angular momentum."
          : "This mid-radius layout carries angular momentum through a balanced mix of spin rate and mass distribution.",
    conservationInterpretation:
      snapshot.referenceAngularSpeed > snapshot.angularSpeed * 1.35
        ? "Holding the same angular momentum while packing the mass inward would force a much faster spin, which is the same conservation story figure skaters exploit."
        : snapshot.referenceAngularSpeed < snapshot.angularSpeed * 0.9
          ? "For this state, the compact reference would not need to speed up much because the current layout is already carrying the angular momentum with a relatively small moment of inertia."
          : "The compact-reference speed stays in the same ballpark here, so the current state is already fairly close to the low-inertia reference layout.",
  } satisfies WorkedExampleTokenMap;
}

function localizeResolvedAngularMomentumExample(input: {
  example: ConceptWorkedExample;
  locale: AppLocale;
  resolved: ResolvedWorkedExample;
  tokens: WorkedExampleTokenMap;
}) {
  if (input.locale !== "zh-HK") {
    return input.resolved;
  }

  const { example, resolved, tokens } = input;

  if (example.id === "current-angular-momentum") {
    return {
      ...resolved,
      steps: resolved.steps.map((step) => {
        if (step.id === "relation") {
          return {
            ...step,
            content:
              "這個有限轉子使用 $I = I_{\\mathrm{hub}} + Mr^2$。" +
              `其中 $I_{\\mathrm{hub}} = ${tokens.hubInertiaValue ?? "—"}` +
              `\\,\\mathrm{kg\\,m^2}$，移動質量為 $M = ${tokens.totalMassValue ?? "—"}` +
              "\\,\\mathrm{kg}$。",
          };
        }

        if (step.id === "substitute") {
          return {
            ...step,
            content:
              `當 $r = ${tokens.massRadiusValue ?? "—"}\\,\\mathrm{m}$ 時，` +
              `環形質量的貢獻為 $Mr^2 = ${tokens.ringContributionValue ?? "—"}` +
              `\\,\\mathrm{kg\\,m^2}$，所以總轉動慣量是 $I = ` +
              `${tokens.momentOfInertiaValue ?? "—"}\\,\\mathrm{kg\\,m^2}$。`,
          };
        }

        if (step.id === "compute") {
          return {
            ...step,
            content:
              `$L = I\\omega = ${tokens.momentOfInertiaValue ?? "—"} \\times ` +
              `${tokens.angularSpeedValue ?? "—"}$，因此角動量是 ` +
              `$${tokens.angularMomentumValue ?? "—"}\\,\\mathrm{kg\\,m^2/s}$。`,
          };
        }

        return step;
      }),
      interpretation:
        "轉動慣量會隨質量半徑改變；在同一轉速下，較大的轉動慣量會儲存更多角動量。",
    } satisfies ResolvedWorkedExample;
  }

  if (example.id === "compact-reference-spin") {
    return {
      ...resolved,
      steps: resolved.steps.map((step) => {
        if (step.id === "relation") {
          return {
            ...step,
            content:
              `使用目前的即時讀數 $L = ${tokens.angularMomentumValue ?? "—"}` +
              "\\,\\mathrm{kg\\,m^2/s}$，想像把同一個 $L$ 帶到緊湊參考佈局。",
          };
        }

        if (step.id === "substitute") {
          return {
            ...step,
            content:
              `在 $r_{\\mathrm{ref}} = ${tokens.compactReferenceRadiusValue ?? "—"}` +
              `\\,\\mathrm{m}$ 時，參考轉動慣量是 $I_{\\mathrm{ref}} = ` +
              `${tokens.compactReferenceInertiaValue ?? "—"}\\,\\mathrm{kg\\,m^2}$。`,
          };
        }

        if (step.id === "compute") {
          return {
            ...step,
            content:
              "由 $\\omega_{\\mathrm{same\\,L}} = L / I_{\\mathrm{ref}}$ 可知，" +
              `緊湊佈局需要 $${tokens.referenceAngularSpeedValue ?? "—"}\\,\\mathrm{rad/s}$。`,
          };
        }

        return step;
      }),
      interpretation:
        "若同一個角動量改由較小轉動慣量的緊湊參考佈局承擔，所需角速度會相應提高。",
    } satisfies ResolvedWorkedExample;
  }

  return resolved;
}

function resolveConservationMomentumTokens(state: LiveWorkedExampleState, locale?: AppLocale) {
  const zhHk = isZhHkLocale(locale);
  const params = resolveConservationMomentumParams({
    massA: toNumber(state.params.massA, 1.2),
    massB: toNumber(state.params.massB, 1.8),
    systemVelocity: toNumber(state.params.systemVelocity, 0),
    interactionForce: toNumber(state.params.interactionForce, 1.8),
    interactionDuration: toNumber(state.params.interactionDuration, 0.5),
  });
  const snapshot = sampleConservationMomentumState(params, state.time);

  return {
    timeValue: formatNumber(state.time),
    massAValue: formatNumber(params.massA),
    massBValue: formatNumber(params.massB),
    systemVelocityValue: formatNumber(params.systemVelocity),
    interactionForceValue: formatNumber(params.interactionForce),
    interactionDurationValue: formatNumber(params.interactionDuration),
    momentumAValue: formatNumber(snapshot.momentumA),
    momentumBValue: formatNumber(snapshot.momentumB),
    totalMomentumValue: formatNumber(snapshot.totalMomentum),
    initialMomentumAValue: formatNumber(snapshot.initialMomentumA),
    initialMomentumBValue: formatNumber(snapshot.initialMomentumB),
    deltaMomentumAValue: formatNumber(snapshot.finalMomentumA - snapshot.initialMomentumA),
    deltaMomentumBValue: formatNumber(snapshot.finalMomentumB - snapshot.initialMomentumB),
    finalMomentumAValue: formatNumber(snapshot.finalMomentumA),
    finalMomentumBValue: formatNumber(snapshot.finalMomentumB),
    finalVelocityAValue: formatNumber(snapshot.finalVelocityA),
    finalVelocityBValue: formatNumber(snapshot.finalVelocityB),
    centerOfMassVelocityValue: formatNumber(snapshot.centerOfMassVelocity),
    totalMomentumInterpretation:
      snapshot.interactionActive
        ? zhHk
          ? "兩部車此刻正在交換內力，但因為系統沒有外部衝量，總動量仍然保持不變。"
          : "The carts are exchanging internal forces right now, but the total momentum still stays fixed because the system has no external impulse."
        : Math.abs(snapshot.totalMomentum) < 0.05
          ? zhHk
            ? "這裡的總動量幾乎為零，所以即使兩部車分開，質心仍大致保持靜止。"
            : "The total momentum is essentially zero here, so the center of mass stays at rest even while the carts separate."
          : zhHk
            ? "這裡的總動量並非零，所以即使兩部車在內部交換動量，質心仍會繼續漂移。"
            : "The total momentum stays nonzero here, so the center of mass keeps drifting even while the carts trade momentum internally.",
    redistributionInterpretation:
      Math.abs(snapshot.finalMomentumA - snapshot.initialMomentumA) < 0.05
        ? zhHk
          ? "內部衝量幾乎為零，表示最終動量分佈會接近起始分佈。"
          : "A nearly zero internal impulse means the final momentum split stays close to the starting split."
        : params.massA < params.massB
          ? zhHk
            ? "車 A 較輕，所以同一份等量反向的動量變化會令 A 產生較大的速度變化。"
            : "Cart A is lighter, so the same equal-and-opposite momentum change produces the larger speed change for A."
          : params.massB < params.massA
            ? zhHk
              ? "車 B 較輕，所以同一份等量反向的動量變化會令 B 產生較大的速度變化。"
              : "Cart B is lighter, so the same equal-and-opposite momentum change produces the larger speed change for B."
            : zhHk
              ? "兩車質量相同時，等量反向的動量變化也會成為等量反向的速度變化。"
              : "With equal masses, equal-and-opposite momentum changes also produce equal-and-opposite speed changes.",
  } satisfies WorkedExampleTokenMap;
}

function resolveCollisionsTokens(state: LiveWorkedExampleState) {
  const params = resolveCollisionsParams({
    massA: toNumber(state.params.massA, 1.2),
    massB: toNumber(state.params.massB, 2.2),
    speedA: toNumber(state.params.speedA, 1.6),
    speedB: toNumber(state.params.speedB, 0.7),
    elasticity: toNumber(state.params.elasticity, 0.8),
  });
  const snapshot = sampleCollisionsState(params, state.time);

  return {
    timeValue: formatNumber(state.time),
    massAValue: formatNumber(params.massA),
    massBValue: formatNumber(params.massB),
    velocityAValue: formatNumber(snapshot.velocityA),
    velocityBValue: formatNumber(snapshot.velocityB),
    initialVelocityAValue: formatNumber(snapshot.initialVelocityA),
    initialVelocityBValue: formatNumber(snapshot.initialVelocityB),
    elasticityValue: formatNumber(params.elasticity),
    totalMomentumValue: formatNumber(snapshot.totalMomentum),
    finalVelocityAValue: formatNumber(snapshot.finalVelocityA),
    finalVelocityBValue: formatNumber(snapshot.finalVelocityB),
    totalMomentumInterpretation:
      !snapshot.collisionOccurred
        ? "Before contact, the system total is already fixed by the incoming masses and velocities, so the collision has not created a new total."
        : Math.abs(snapshot.totalMomentum) < 0.05
          ? "Even after contact, the system total stays essentially zero, so the center of mass remains nearly fixed."
          : "The collision has already happened, but the system total stays unchanged because the two-cart system is isolated.",
    outcomeInterpretation:
      snapshot.sticking
        ? "With e = 0, the carts leave together with one shared velocity. Momentum is conserved, but some kinetic energy has been converted into other forms."
        : snapshot.elasticity >= 0.95
          ? "With elasticity near one, most of the closing speed returns as rebound speed, so the collision is close to elastic."
          : params.massA < params.massB
            ? "Cart B is heavier, so it changes speed less while the lower elasticity reduces the rebound speed after contact."
            : params.massB < params.massA
              ? "Cart A is heavier, so it keeps more of its forward motion while the lighter cart changes speed more strongly."
              : "Equal masses keep the algebra symmetric, so the elasticity mostly decides how much rebound speed survives after contact.",
  } satisfies WorkedExampleTokenMap;
}

function resolveDampingTokens(state: LiveWorkedExampleState) {
  const naturalFrequency = toNumber(state.params.naturalFrequency, 2);
  const drivingFrequency = toNumber(state.params.driveFrequency ?? state.params.drivingFrequency, 1.85);
  const damping = toNumber(state.params.dampingRatio ?? state.params.damping, 0.12);
  const driveAmplitude = toNumber(state.params.driveAmplitude, 1);
  const responseMode = Boolean(state.params.responseMode ?? state.params.resonanceMode);
  const phase = toNumber(state.params.phase, 0);
  const time = state.time;
  const snapshot = sampleDampingState(
    {
      naturalFrequency,
      drivingFrequency,
      damping,
      driveAmplitude,
      resonanceMode: responseMode,
      phase,
    },
    time,
  );
  const peak = peakFrequency({
    naturalFrequency,
    drivingFrequency,
    damping,
    driveAmplitude,
    resonanceMode: true,
    phase,
  });

  const modeFormula = responseMode
    ? "x(t) = A(\\omega_d)\\cos(\\omega_d t - \\delta + \\phi)"
    : "x(t) = F_0 e^{-\\beta \\omega_0 t}\\cos(\\omega_d t + \\phi)";
  const substitutionFormula = responseMode
    ? `${formatNumber(snapshot.responseAmplitude)}\\cos(${formatNumber(drivingFrequency)}\\cdot ${formatNumber(time)} - ${formatNumber(snapshot.phaseLag)} + ${formatNumber(phase)})`
    : `${formatNumber(driveAmplitude)}e^{- ${formatNumber(damping)}\\cdot ${formatNumber(naturalFrequency)}\\cdot ${formatNumber(time)}}\\cos(${formatNumber(drivingFrequency)}\\cdot ${formatNumber(time)} + ${formatNumber(phase)})`;

  return {
    timeValue: formatNumber(time),
    dampingValue: formatNumber(damping),
    naturalFrequencyValue: formatNumber(naturalFrequency),
    driveFrequencyValue: formatNumber(drivingFrequency),
    driveAmplitudeValue: formatNumber(driveAmplitude),
    responseAmplitudeValue: formatNumber(snapshot.responseAmplitude),
    phaseLagValue: formatNumber(snapshot.phaseLag),
    phaseValue: formatNumber(phase),
    displacementValue: formatNumber(snapshot.displacement),
    modeLabel: responseMode ? "steady-state response mode" : "transient decay mode",
    modeFormula,
    substitutionFormula,
    responseInterpretation:
      Math.abs(drivingFrequency - peak) < 0.15
        ? "The drive is close to the peak-response frequency, so the denominator stays relatively small and the steady-state amplitude grows."
        : drivingFrequency < peak
          ? "The drive is below the peak-response frequency, so the system has not reached its strongest possible steady-state response yet."
          : "The drive is above the peak-response frequency, so the system responds less strongly than it would near the resonance peak.",
    displacementInterpretation: responseMode
      ? "The response view shows the steady-state driven motion, so this displacement comes from the long-term oscillation rather than a fading transient."
      : "The transient view includes the decaying envelope, so the same time relation gives smaller displacements as damping removes energy.",
  } satisfies WorkedExampleTokenMap;
}

function resolveUcmTokens(state: LiveWorkedExampleState, locale?: AppLocale) {
  const ucmParams = resolveUcmParams({
    radius: toNumber(state.params.radius, 1.2),
    omega: toNumber(state.params.omega ?? state.params.angularSpeed, 1.4),
    phase: toNumber(state.params.phase, 0),
  });
  const snapshot = sampleUcmState(ucmParams, state.time);
  const zhHk = isZhHkLocale(locale);

  return {
    timeValue: formatNumber(state.time),
    radiusValue: formatNumber(ucmParams.radius),
    omegaValue: formatNumber(ucmParams.angularSpeed),
    phaseValue: formatNumber(ucmParams.phase),
    angleValue: formatNumber(snapshot.wrappedAngle),
    xValue: formatNumber(snapshot.x),
    speedValue: formatNumber(snapshot.speed),
    periodValue: formatNumber(snapshot.period),
    centripetalAccelerationValue: formatNumber(snapshot.centripetalAcceleration),
    projectionInterpretation:
      Math.abs(snapshot.x) < 0.08
        ? zhHk
          ? "此刻 x 投影接近零，表示粒子正在穿過垂直軸，而 y 投影接近其中一個極值。"
          : "The x projection is near zero here, so the particle is crossing the vertical axis while the y projection is near one of its extremes."
        : snapshot.x > 0
          ? zhHk
            ? "正的 x 投影表示粒子位於軌道右側，與 x(t) 圖像的正值區域相符。"
            : "The positive x projection means the particle is on the right side of the orbit, which matches the positive part of the x(t) graph."
          : zhHk
            ? "負的 x 投影表示粒子位於軌道左側，與 x(t) 圖像的負值區域相符。"
            : "The negative x projection means the particle is on the left side of the orbit, which matches the negative part of the x(t) graph.",
    centripetalInterpretation:
      ucmParams.angularSpeed >= 2.6
        ? zhHk
          ? "向心加速度很大，因為運動轉向很快，速度向量每秒都要大幅改變方向。"
          : "The inward acceleration is large because the motion turns quickly, so the vector has to change direction sharply each second."
        : ucmParams.radius >= 1.5
          ? zhHk
            ? "較寬的軌道仍需要向內加速度；在相同角速度下，較大的半徑也會提高切向速率。"
            : "The wider orbit still needs inward acceleration, and the larger radius raises the speed for the same angular speed."
          : zhHk
            ? "這裡的向心加速度仍然適中，因為軌道大小和角速度都不算太大。"
            : "The inward acceleration stays modest here because both the orbit size and angular speed are moderate.",
  } satisfies WorkedExampleTokenMap;
}

function resolveCircularOrbitsTokens(state: LiveWorkedExampleState) {
  const params = resolveCircularOrbitsParams({
    sourceMass: toNumber(state.params.sourceMass, 4),
    orbitRadius: toNumber(state.params.orbitRadius, 1.6),
    speedFactor: toNumber(state.params.speedFactor, 1),
  });
  const snapshot = sampleCircularOrbitsState(params, state.time);
  const doubledRadius = params.orbitRadius * 2;
  const doubledRadiusSpeed = resolveCircularOrbitSpeed(params.sourceMass, doubledRadius);
  const doubledRadiusPeriod = resolveCircularOrbitPeriod(params.sourceMass, doubledRadius);
  const keplerRatio = resolveCircularOrbitKeplerRatio(params.sourceMass, params.orbitRadius);
  const trendInterpretation =
    Math.abs(params.speedFactor - 1) <= 0.015 && Math.abs(snapshot.radiusDeviation) <= 0.04
      ? "The chosen speed is very close to the circular-orbit condition, so gravity is supplying almost exactly the inward acceleration needed to hold the radius steady."
      : snapshot.balanceGap > 0
        ? "Gravity is stronger than the turning requirement set by the chosen speed, so the path bends inward from the reference circle."
        : "The turning requirement set by the chosen speed is larger than gravity can supply at that radius, so the path opens outward from the reference circle.";
  const periodInterpretation =
    params.orbitRadius >= 1.9
      ? "This wider circular orbit has both farther distance to travel and a lower circular speed, so the period grows quickly rather than just creeping upward."
      : params.sourceMass >= 5
        ? "At the same radius, the heavier source shortens the year because stronger gravity supports a faster circular speed."
        : "The period comes from the same live circular condition: one full orbit is the circumference divided by the allowed circular speed.";

  return {
    timeValue: formatNumber(state.time),
    sourceMassValue: formatNumber(params.sourceMass),
    orbitRadiusValue: formatNumber(params.orbitRadius),
    speedFactorValue: formatNumber(params.speedFactor),
    circularSpeedValue: formatNumber(snapshot.referenceCircularSpeed),
    actualSpeedValue: formatNumber(snapshot.speed),
    angularSpeedValue: formatNumber(snapshot.referenceAngularSpeed),
    periodValue: formatNumber(snapshot.referencePeriod),
    currentRadiusValue: formatNumber(snapshot.radius),
    gravityAccelerationValue: formatNumber(snapshot.gravityAcceleration),
    requiredCentripetalValue: formatNumber(snapshot.requiredCentripetalAcceleration),
    localCircularSpeedValue: formatNumber(snapshot.localCircularSpeed),
    balanceGapValue: formatNumber(snapshot.balanceGap),
    keplerRatioValue: formatNumber(keplerRatio),
    doubleRadiusValue: formatNumber(doubledRadius),
    doubleRadiusCircularSpeedValue: formatNumber(doubledRadiusSpeed),
    doubleRadiusPeriodValue: formatNumber(doubledRadiusPeriod),
    doubleRadiusSpeedRatioValue: formatNumber(doubledRadiusSpeed / Math.max(snapshot.referenceCircularSpeed, 1e-6)),
    doubleRadiusPeriodRatioValue: formatNumber(doubledRadiusPeriod / Math.max(snapshot.referencePeriod, 1e-6)),
    circularSpeedInterpretation:
      params.orbitRadius >= 1.9
        ? "The wider orbit lowers the circular speed because the same source mass can turn the motion more gently over a larger circle."
        : params.sourceMass >= 5
          ? "The heavier source mass raises the circular speed because stronger gravity can support a faster sideways motion at the same radius."
          : "The circular speed here comes from the shared gravity-and-turning balance rather than from a separate orbit rule.",
    periodInterpretation,
    radiusScalingInterpretation:
      "Doubling the radius makes the circular speed fall to about 0.71 of the original value while the period grows to about 2.83 times the original, so the longer year comes from both a bigger path and slower motion.",
    balanceInterpretation: trendInterpretation,
  } satisfies WorkedExampleTokenMap;
}

function resolveEscapeVelocityTokens(state: LiveWorkedExampleState) {
  const params = resolveEscapeVelocityParams({
    sourceMass: toNumber(state.params.sourceMass, 4),
    launchRadius: toNumber(state.params.launchRadius, 1.6),
    speedFactor: toNumber(state.params.speedFactor, 1),
  });
  const snapshot = sampleEscapeVelocityState(params, state.time);
  const turnaroundRadiusValue =
    snapshot.turnaroundRadius === null
      ? "no finite turnaround"
      : formatNumber(snapshot.turnaroundRadius);
  const turnaroundInterpretation =
    snapshot.turnaroundRadius === null
      ? "no finite turnaround radius because the total energy is zero or positive"
      : `a turnaround radius of ${formatNumber(snapshot.turnaroundRadius)} m`;
  const thresholdInterpretation =
    snapshot.totalEnergy > 0.02
      ? "The launch keeps positive total energy, so it escapes even though gravity keeps reducing the speed."
      : Math.abs(snapshot.totalEnergy) <= 0.02
        ? "The total energy sits near zero, so this is the escape-threshold case rather than a bound return."
        : snapshot.radialVelocity < -0.02
          ? "The launch already turned around because negative total energy kept it bound."
          : "The launch is still climbing, but the negative total energy means it is only a high bound trip."

  return {
    timeValue: formatNumber(state.time),
    sourceMassValue: formatNumber(params.sourceMass),
    launchRadiusValue: formatNumber(params.launchRadius),
    speedFactorValue: formatNumber(params.speedFactor),
    launchSpeedValue: formatNumber(snapshot.launchSpeed),
    launchEscapeSpeedValue: formatNumber(snapshot.launchEscapeSpeed),
    launchCircularSpeedValue: formatNumber(snapshot.launchCircularSpeed),
    currentRadiusValue: formatNumber(snapshot.radius),
    currentSpeedValue: formatNumber(snapshot.speed),
    radialVelocityValue: formatNumber(snapshot.radialVelocity),
    localEscapeSpeedValue: formatNumber(snapshot.localEscapeSpeed),
    kineticEnergyValue: formatNumber(snapshot.kineticEnergy),
    potentialEnergyValue: formatNumber(snapshot.potentialEnergy),
    totalEnergyValue: formatNumber(snapshot.totalEnergy),
    turnaroundRadiusValue,
    turnaroundInterpretation,
    escapeSpeedInterpretation:
      params.launchRadius >= 2
        ? "Launching farther from the source lowers the escape speed because the same source mass has less well depth to climb out of."
        : params.sourceMass >= 5
          ? "A heavier source mass deepens the well, so the threshold launch speed rises at the same starting radius."
          : "The escape threshold comes straight from setting the total energy to zero at the launch point.",
    energyInterpretation: thresholdInterpretation,
  } satisfies WorkedExampleTokenMap;
}

function resolveVectorsComponentsTokens(
  state: LiveWorkedExampleState,
  locale?: AppLocale,
) {
  const params = resolveVectorsComponentsParams({
    magnitude: toNumber(state.params.magnitude, 8),
    angle: toNumber(state.params.angle, 35),
  });
  const snapshot = sampleVectorsComponentsState(params, state.time);
  const zhHk = isZhHkLocale(locale);

  return {
    timeValue: formatNumber(state.time),
    magnitudeValue: formatNumber(params.magnitude),
    angleValue: formatNumber(params.angle),
    vxValue: formatNumber(snapshot.vx),
    vyValue: formatNumber(snapshot.vy),
    xValue: formatNumber(snapshot.x),
    yValue: formatNumber(snapshot.y),
    distanceValue: formatNumber(snapshot.distance),
    componentInterpretation:
      Math.abs(snapshot.vx) < 0.05
        ? zhHk
          ? "這個向量幾乎垂直，所以大小幾乎全部落在垂直分量上，而水平分量接近零。"
          : "The vector is almost vertical here, so nearly all of the magnitude sits in the vertical component while the horizontal component is close to zero."
        : Math.abs(snapshot.vy) < 0.05
          ? zhHk
            ? "這個向量幾乎水平，所以大小幾乎全部落在水平分量上，而垂直分量接近零。"
            : "The vector is almost horizontal here, so nearly all of the magnitude sits in the horizontal component while the vertical component is close to zero."
          : snapshot.vx > 0 && snapshot.vy > 0
            ? zhHk
              ? "兩個分量都為正，所以向量指向第一象限的右上方。"
              : "Both components are positive, so the vector points up and to the right in the first quadrant."
            : snapshot.vx < 0 && snapshot.vy > 0
              ? zhHk
                ? "水平分量為負而垂直分量為正，所以向量指向左上方。"
                : "The horizontal component is negative while the vertical component is positive, so the vector points up and to the left."
              : snapshot.vx < 0 && snapshot.vy < 0
                ? zhHk
                  ? "兩個分量都為負，所以向量指向左下方。"
                  : "Both components are negative, so the vector points down and to the left."
                : zhHk
                  ? "水平分量為正而垂直分量為負，所以向量指向右下方。"
                  : "The horizontal component is positive while the vertical component is negative, so the vector points down and to the right.",
    displacementInterpretation:
      Math.abs(snapshot.y) < 0.05
        ? zhHk
          ? "由於垂直分量接近零，這個點幾乎一直留在水平軸上。"
          : "The point stays almost on the horizontal axis because the vertical component is close to zero."
        : snapshot.y > 0
          ? zhHk
            ? "這個點位於水平軸上方，因為垂直分量為正，而且隨時間增加會沿著同一直線走得更遠。"
            : "The point sits above the axis because the vertical component is positive, and it keeps moving farther along the same straight path as time grows."
          : zhHk
            ? "這個點位於水平軸下方，因為垂直分量為負，而相同的分量符號會令位移隨時間繼續向下延伸。"
            : "The point sits below the axis because the vertical component is negative, and the same component sign keeps pulling the displacement downward over time.",
  } satisfies WorkedExampleTokenMap;
}

function resolveBasicCircuitsTokens(state: LiveWorkedExampleState) {
  const snapshot = sampleBasicCircuitsState({
    voltage: toNumber(state.params.voltage, 12),
    resistanceA: toNumber(state.params.resistanceA, 6),
    resistanceB: toNumber(state.params.resistanceB, 6),
    parallelMode: state.params.parallelMode === true,
  });
  const equivalentRuleValue = snapshot.parallelMode
    ? "R_{\\text{eq}} = \\dfrac{R_A R_B}{R_A + R_B}"
    : "R_{\\text{eq}} = R_A + R_B";
  const equivalentSubstitutionValue = snapshot.parallelMode
    ? `R_{\\text{eq}} = \\dfrac{${formatNumber(snapshot.resistanceA)} \\times ${formatNumber(snapshot.resistanceB)}}{${formatNumber(snapshot.resistanceA)} + ${formatNumber(snapshot.resistanceB)}}`
    : `R_{\\text{eq}} = ${formatNumber(snapshot.resistanceA)} + ${formatNumber(snapshot.resistanceB)}`;
  const branchCurrentRuleValue = snapshot.parallelMode
    ? "I_B = \\dfrac{V}{R_B}"
    : "I_B = I_{\\text{total}}";
  const branchCurrentSubstitutionValue = snapshot.parallelMode
    ? `I_B = \\dfrac{${formatNumber(snapshot.voltage)}}{${formatNumber(snapshot.resistanceB)}}`
    : `I_B = ${formatNumber(snapshot.totalCurrent)}`;
  const branchVoltageRuleValue = snapshot.parallelMode ? "V_B = V" : "V_B = I_B R_B";
  const branchVoltageSubstitutionValue = snapshot.parallelMode
    ? `V_B = ${formatNumber(snapshot.voltage)}`
    : `V_B = ${formatNumber(snapshot.branchB.current)} \\times ${formatNumber(snapshot.resistanceB)}`;

  return {
    topologyLabelValue: snapshot.parallelMode ? "parallel branches" : "series loop",
    voltageValue: formatNumber(snapshot.voltage),
    resistanceAValue: formatNumber(snapshot.resistanceA),
    resistanceBValue: formatNumber(snapshot.resistanceB),
    equivalentRuleValue,
    equivalentSubstitutionValue,
    equivalentResistanceValue: formatNumber(snapshot.equivalentResistance),
    totalCurrentValue: formatNumber(snapshot.totalCurrent),
    branchCurrentRuleValue,
    branchCurrentSubstitutionValue,
    branchBCurrentValue: formatNumber(snapshot.branchB.current),
    branchVoltageRuleValue,
    branchVoltageSubstitutionValue,
    branchBVoltageValue: formatNumber(snapshot.branchB.voltage),
    equivalentInterpretation: snapshot.parallelMode
      ? "Parallel branches lower the one-number load seen by the battery, so the same source voltage can drive a larger total current than the matching series case."
      : "Series resistances add directly, so each extra ohm raises the one-number load and reduces the same loop current everywhere.",
    branchBInterpretation: snapshot.parallelMode
      ? snapshot.branchB.current > snapshot.branchA.current
        ? "Branch B has the larger current because it has the lower branch resistance while still seeing the full battery voltage."
        : snapshot.branchB.current < snapshot.branchA.current
          ? "Branch B draws less current because both branches see the same battery voltage and Branch B has the larger resistance."
          : "Matching parallel branches see the same voltage and therefore draw the same current."
      : snapshot.branchB.voltage > snapshot.branchA.voltage
        ? "In series, the larger resistor takes the larger share of the source voltage because the same current flows through both resistors."
        : snapshot.branchB.voltage < snapshot.branchA.voltage
          ? "In series, the smaller resistor takes the smaller share of the source voltage because both resistors carry the same current."
          : "Matching series resistors split the source voltage evenly because the same current crosses equal resistances.",
  } satisfies WorkedExampleTokenMap;
}

function resolvePowerEnergyCircuitsTokens(state: LiveWorkedExampleState) {
  const snapshot = samplePowerEnergyCircuitsState(
    {
      voltage: toNumber(state.params.voltage, 12),
      loadResistance: toNumber(state.params.loadResistance, 8),
    },
    state.time,
  );

  return {
    voltageValue: formatNumber(snapshot.voltage),
    loadResistanceValue: formatNumber(snapshot.loadResistance),
    currentValue: formatNumber(snapshot.current),
    powerValue: formatNumber(snapshot.power),
    timeValue: formatNumber(snapshot.time),
    energyValue: formatNumber(snapshot.energy),
    powerInterpretation:
      snapshot.power >= 30
        ? "This setup is transferring energy quickly, so the load response is strong and the energy line will rise steeply."
        : snapshot.power <= 10
          ? "This setup transfers energy gently because the current is modest, so the load response and the energy slope both stay smaller."
          : "This is a moderate-power setup, so the load response is clear without pushing the circuit into the strongest settings.",
    energyInterpretation:
      snapshot.time <= 1
        ? "Only a short time has passed, so the total transferred energy is still small even though the power rate is already set."
        : snapshot.power >= 24
          ? "High power makes the energy total climb quickly because each second adds a large chunk of transfer."
          : "With power fixed, the energy total keeps growing linearly with time at the same slope.",
    } satisfies WorkedExampleTokenMap;
}

function resolveRcChargingDischargingTokens(state: LiveWorkedExampleState) {
  const snapshot = sampleRcChargingDischargingState(
    {
      sourceVoltage: toNumber(state.params.sourceVoltage, 8),
      resistance: toNumber(state.params.resistance, 2),
      capacitance: toNumber(state.params.capacitance, 1),
      charging: state.params.charging === true,
    },
    state.time,
  );
  const capacitorRuleValue = snapshot.charging
    ? "V_C = V_s \\left(1 - e^{-t/\\tau}\\right)"
    : "V_C = V_0 e^{-t/\\tau}";
  const capacitorSubstitutionValue = snapshot.charging
    ? `V_C = ${formatNumber(snapshot.sourceVoltage)} \\left(1 - e^{-${formatNumber(snapshot.time)} / ${formatNumber(snapshot.timeConstant)}}\\right)`
    : `V_C = ${formatNumber(snapshot.sourceVoltage)} e^{-${formatNumber(snapshot.time)} / ${formatNumber(snapshot.timeConstant)}}`;
  const currentRuleValue = snapshot.charging
    ? "I = \\dfrac{V_s}{R} e^{-t/\\tau}"
    : "I = -\\dfrac{V_0}{R} e^{-t/\\tau}";
  const currentSubstitutionValue = snapshot.charging
    ? `I = \\dfrac{${formatNumber(snapshot.sourceVoltage)}}{${formatNumber(snapshot.resistance)}} e^{-${formatNumber(snapshot.time)} / ${formatNumber(snapshot.timeConstant)}}`
    : `I = -\\dfrac{${formatNumber(snapshot.sourceVoltage)}}{${formatNumber(snapshot.resistance)}} e^{-${formatNumber(snapshot.time)} / ${formatNumber(snapshot.timeConstant)}}`;

  return {
    sourceVoltageValue: formatNumber(snapshot.sourceVoltage),
    resistanceValue: formatNumber(snapshot.resistance),
    capacitanceValue: formatNumber(snapshot.capacitance),
    timeValue: formatNumber(snapshot.time),
    timeConstantValue: formatNumber(snapshot.timeConstant),
    normalizedTimeValue: formatNumber(snapshot.normalizedTime),
    capacitorVoltageValue: formatNumber(snapshot.capacitorVoltage),
    resistorVoltageValue: formatNumber(snapshot.resistorVoltage),
    currentValue: formatNumber(snapshot.current),
    chargeStoredValue: formatNumber(snapshot.chargeStored),
    storedEnergyValue: formatNumber(snapshot.storedEnergy),
    capacitorRuleValue,
    capacitorSubstitutionValue,
    currentRuleValue,
    currentSubstitutionValue,
    modeLabelValue: snapshot.charging ? "charging" : "discharging",
    voltageInterpretation: snapshot.charging
      ? snapshot.normalizedTime < 1
        ? "The capacitor voltage is still climbing quickly because the first time constant has not finished yet."
        : "The capacitor voltage is already close to the source value, so the remaining rise is slower."
      : snapshot.normalizedTime < 1
        ? "The capacitor is still holding a lot of its starting voltage, but the drop is already visible."
        : "After a few time constants, the capacitor voltage is fading toward zero."
      ,
    energyInterpretation: snapshot.charging
      ? "Stored energy rises slowly at first, then more strongly as the capacitor voltage itself builds."
      : "Stored energy falls faster than charge fraction because energy depends on V_C squared.",
  } satisfies WorkedExampleTokenMap;
}

function resolveInternalResistanceTerminalVoltageTokens(state: LiveWorkedExampleState) {
  const snapshot = sampleInternalResistanceTerminalVoltageState({
    emf: toNumber(state.params.emf, 12),
    internalResistance: toNumber(state.params.internalResistance, 1),
    loadResistance: toNumber(state.params.loadResistance, 6),
  });

  return {
    emfValue: formatNumber(snapshot.emf),
    internalResistanceValue: formatNumber(snapshot.internalResistance),
    loadResistanceValue: formatNumber(snapshot.loadResistance),
    currentValue: formatNumber(snapshot.current),
    terminalVoltageValue: formatNumber(snapshot.terminalVoltage),
    internalDropValue: formatNumber(snapshot.internalDrop),
    loadPowerValue: formatNumber(snapshot.loadPower),
    internalPowerValue: formatNumber(snapshot.internalPower),
    efficiencyPercentValue: formatNumber(snapshot.efficiency * 100),
    terminalInterpretation:
      snapshot.internalResistance <= 0.3
        ? "This source is close to ideal here, so the terminal voltage stays close to the emf."
        : snapshot.loadResistance <= 2
          ? "The heavy load pulls a large current, so the internal drop becomes significant and the terminal voltage falls clearly below the emf."
          : "This setup still loses some voltage inside the source, but the terminal voltage remains easy to compare against the emf.",
    powerInterpretation:
      snapshot.internalPower > snapshot.loadPower
        ? "More power is being wasted inside the source than delivered to the load, so this is a very inefficient setup."
        : snapshot.internalPower < 1
          ? "The internal loss is small here, so most of the source power reaches the load."
          : "The source is delivering useful power to the load, but a visible share is still being lost inside the source itself.",
  } satisfies WorkedExampleTokenMap;
}

function resolveTemperatureInternalEnergyTokens(state: LiveWorkedExampleState) {
  const resolved = resolveTemperatureInternalEnergyParams({
    particleCount: state.params.particleCount,
    heaterPower: state.params.heaterPower,
    startingTemperature: state.params.startingTemperature,
    phasePlateauTemperature: state.params.phasePlateauTemperature,
    latentEnergyPerParticle: state.params.latentEnergyPerParticle,
    initialPhaseProgress: state.params.initialPhaseProgress,
    bondEnergyPerParticle: state.params.bondEnergyPerParticle,
  });
  const snapshot = sampleTemperatureInternalEnergyState(resolved, state.time);

  return {
    particleCountValue: formatNumber(snapshot.particleCount),
    heaterPowerValue: formatNumber(snapshot.heaterPower),
    startingTemperatureValue: formatNumber(snapshot.startingTemperature),
    timeValue: formatNumber(snapshot.time),
    temperatureValue: formatNumber(snapshot.temperature),
    averageKineticEnergyValue: formatNumber(snapshot.averageKineticEnergy),
    thermalKineticEnergyValue: formatNumber(snapshot.thermalKineticEnergy),
    bondEnergyValue: formatNumber(snapshot.bondEnergy),
    internalEnergyValue: formatNumber(snapshot.internalEnergy),
    internalEnergyPerParticleValue: formatNumber(snapshot.internalEnergyPerParticle),
    addedEnergyValue: formatNumber(snapshot.addedEnergy),
    temperatureRateValue: formatNumber(snapshot.temperatureRate),
    phaseProgressPercentValue: formatNumber(snapshot.phaseProgress * 100),
    amountInterpretation:
      snapshot.particleCount >= 28
        ? "The average particle motion only sets the per-particle temperature scale. Because there are many particles sharing that same average motion, the total internal energy is much larger."
        : "This smaller sample can still have the same temperature because temperature follows the average particle motion, not the total amount of energy stored across all particles.",
    heatingInterpretation:
      snapshot.stageLabel === "phase-change shelf"
        ? "The heater is still adding energy, but that energy is feeding bond and phase changes instead of making the average particle motion any faster."
        : snapshot.phaseProgress >= 1 &&
            Number(resolved.latentEnergyPerParticle ?? 0) > 0 &&
            snapshot.temperatureRate > 0
          ? "Once the shelf is filled, the same heater power goes back to raising the average kinetic energy per particle, so temperature starts climbing again."
          : "In this single-phase part of the model, heater power directly raises the average kinetic energy per particle, so temperature rises steadily.",
    } satisfies WorkedExampleTokenMap;
}

function resolveIdealGasLawKineticTheoryTokens(state: LiveWorkedExampleState) {
  const snapshot = sampleIdealGasLawKineticTheoryState({
    particleCount: state.params.particleCount,
    temperature: state.params.temperature,
    volume: state.params.volume,
  });
  const kineticStoryText =
    snapshot.speedLabel === "fast" && snapshot.densityLabel === "crowded"
      ? "fast and crowded"
      : snapshot.speedLabel === "fast"
        ? "fast but roomy"
        : snapshot.densityLabel === "crowded"
          ? "cooler but crowded"
          : "moderate and fairly balanced";

  return {
    particleCountValue: formatNumber(snapshot.particleCount),
    temperatureValue: formatNumber(snapshot.temperature),
    volumeValue: formatNumber(snapshot.volume),
    densityValue: formatNumber(snapshot.density),
    averageSpeedValue: formatNumber(snapshot.averageSpeed),
    collisionRateValue: formatNumber(snapshot.collisionRate),
    pressureValue: formatNumber(snapshot.pressure),
    densityLabelText: snapshot.densityLabel,
    pressureLabelText: snapshot.pressureLabel,
    speedLabelText: snapshot.speedLabel,
    kineticStoryText,
    pressureInterpretation:
      snapshot.volume <= 1.05
        ? "The pressure is large here mainly because the same gas has been squeezed into less room, so the walls are being struck much more often."
        : snapshot.temperature >= 4.3
          ? "The pressure is large here mainly because the particles are moving much faster, so each wall hit carries more momentum and the hit rate also rises."
          : snapshot.particleCount >= 34
            ? "The pressure is large here mainly because there are many particles available to hit the walls even though the average speed is not extreme."
            : "This is a middle-pressure state where no single factor is extreme, so the box size, speed scale, and particle count all matter together.",
    kineticInterpretation:
      snapshot.pressureLabel === "strong"
        ? "This state is pressure-heavy because the wall-hit story is doing real work: the gas is either crowded, fast, or both."
        : snapshot.pressureLabel === "gentle"
          ? "This state stays low-pressure because the walls are being hit less often or with smaller momentum changes."
          : "This state sits in the middle, so the particle motion and crowding cues both need to be read together rather than treated as separate formulas.",
    } satisfies WorkedExampleTokenMap;
}

function resolvePressureHydrostaticTokens(state: LiveWorkedExampleState) {
  const snapshot = samplePressureHydrostaticState({
    force: state.params.force,
    area: state.params.area,
    density: state.params.density,
    gravity: state.params.gravity,
    depth: state.params.depth,
  });
  const extraDepth = 1;
  const deeperState = samplePressureHydrostaticState(
    {
      force: state.params.force,
      area: state.params.area,
      density: state.params.density,
      gravity: state.params.gravity,
      depth: state.params.depth,
    },
    {
      depth: snapshot.depth + extraDepth,
    },
  );
  const areaInterpretationText =
    snapshot.area <= 0.14
      ? "a relatively narrow piston area"
      : snapshot.area >= 0.24
        ? "a fairly wide piston area"
        : "a moderate piston area";

  return {
    forceValue: formatNumber(snapshot.force),
    areaValue: formatNumber(snapshot.area),
    densityValue: formatNumber(snapshot.density),
    gravityValue: formatNumber(snapshot.gravity),
    depthValue: formatNumber(snapshot.depth),
    surfacePressureValue: formatNumber(snapshot.surfacePressure),
    hydrostaticPressureValue: formatNumber(snapshot.hydrostaticPressure),
    totalPressureValue: formatNumber(snapshot.totalPressure),
    pressureGradientValue: formatNumber(snapshot.pressureGradient),
    extraDepthValue: `${formatNumber(extraDepth)} m`,
    extraPressureValue: formatNumber(snapshot.pressureGradient * extraDepth),
    deeperHydrostaticPressureValue: formatNumber(deeperState.hydrostaticPressure),
    deeperTotalPressureValue: formatNumber(deeperState.totalPressure),
    areaInterpretationText,
    dominantContributionText:
      snapshot.dominantContribution === "hydrostatic"
        ? "hydrostatic"
        : snapshot.dominantContribution === "surface"
          ? "surface-pressure"
          : "balanced",
    currentPressureInterpretation:
      snapshot.dominantContribution === "hydrostatic"
        ? "The fluid column is doing most of the work here, so moving deeper or changing density would matter more than changing the same already-moderate surface load."
        : snapshot.dominantContribution === "surface"
          ? "The piston load is still the larger contributor here, but depth is already adding a real pressure offset on top of $F/A$."
          : "This state is useful because the surface-pressure and hydrostatic parts are both visible instead of one of them hiding the other.",
    deeperInterpretation:
      snapshot.pressureGradient >= 10
        ? "This fluid has a steep pressure gradient, so even one extra meter adds a large pressure change. That is exactly the kind of top-to-bottom difference that later drives buoyancy."
        : "The slope is gentler here, but the same rule still holds: every extra meter adds another $\\rho g$ of pressure without changing the surface term.",
  } satisfies WorkedExampleTokenMap;
}

function resolveContinuityEquationTokens(state: LiveWorkedExampleState) {
  const snapshot = sampleContinuityEquationState(
    {
      flowRate: state.params.flowRate,
      entryArea: state.params.entryArea,
      middleArea: state.params.middleArea,
    },
    state.time,
  );

  return {
    flowRateValue: formatNumber(snapshot.flowRate),
    entryAreaValue: formatNumber(snapshot.entryArea),
    middleAreaValue: formatNumber(snapshot.middleArea),
    entrySpeedValue: formatNumber(snapshot.entrySpeed),
    middleSpeedValue: formatNumber(snapshot.middleSpeed),
    speedRatioValue: formatNumber(snapshot.speedRatio),
    areaRatioValue: formatNumber(snapshot.entryArea / Math.max(snapshot.middleArea, 1e-6)),
    sliceDurationValue: `${formatNumber(CONTINUITY_EQUATION_SLICE_DURATION)} s`,
    entrySliceLengthValue: formatNumber(snapshot.entrySliceLength),
    middleSliceLengthValue: formatNumber(snapshot.middleSliceLength),
    geometryInterpretationText:
      snapshot.geometryLabel === "narrowing"
        ? "Because the middle area is smaller, the same flow rate must move faster there."
        : snapshot.geometryLabel === "widening"
          ? "Because the middle area is larger, the same flow rate can move more slowly there."
          : "The two areas are nearly matched, so continuity keeps the two speeds nearly matched too.",
    sliceInterpretation:
      snapshot.geometryLabel === "narrowing"
        ? "The narrow section needs a longer same-time slice because the fluid there is moving faster while carrying the same volume flow rate."
        : snapshot.geometryLabel === "widening"
          ? "The wider section needs a shorter same-time slice because the same flow rate can pass through with a smaller speed."
          : "With matched areas, the same-time slices stay nearly the same length because the speeds do too.",
  } satisfies WorkedExampleTokenMap;
}

function resolveBernoulliPrincipleTokens(state: LiveWorkedExampleState) {
  const snapshot = sampleBernoulliPrincipleState(
    {
      entryPressure: state.params.entryPressure,
      flowRate: state.params.flowRate,
      entryArea: state.params.entryArea,
      throatArea: state.params.throatArea,
      throatHeight: state.params.throatHeight,
    },
    state.time,
  );
  const levelState = sampleBernoulliPrincipleState({
    entryPressure: state.params.entryPressure,
    flowRate: state.params.flowRate,
    entryArea: state.params.entryArea,
    throatArea: state.params.throatArea,
    throatHeight: 0,
  });

  return {
    entryPressureValue: formatNumber(snapshot.entryPressure),
    flowRateValue: formatNumber(snapshot.flowRate),
    entryAreaValue: formatNumber(snapshot.entryArea),
    throatAreaValue: formatNumber(snapshot.throatArea),
    throatHeightValue: formatNumber(snapshot.throatHeight),
    entrySpeedValue: formatNumber(snapshot.entrySpeed),
    throatSpeedValue: formatNumber(snapshot.throatSpeed),
    speedRatioValue: formatNumber(snapshot.speedRatio),
    throatPressureValue: formatNumber(snapshot.throatPressure),
    pressureDropValue: formatNumber(snapshot.pressureDrop),
    dynamicPressureDropValue: formatNumber(snapshot.dynamicPressureDrop),
    heightPressureDropValue: formatNumber(snapshot.heightPressureDrop),
    totalEnergyValue: formatNumber(snapshot.totalEnergyLike),
    levelThroatPressureValue: formatNumber(levelState.throatPressure),
    pressureInterpretationText:
      snapshot.dominantPressureShift === "speed"
        ? "Most of the throat pressure drop here is being spent on extra speed through the narrower throat."
        : snapshot.dominantPressureShift === "height"
          ? "Most of the throat pressure drop here is being spent on lifting the same stream higher."
          : "Here the speed change and the height rise are both taking visible shares of the same Bernoulli budget.",
    heightInterpretationText:
      snapshot.throatHeight <= 0.02
        ? "This state is already nearly level, so almost the whole pressure change is coming from the speed term instead."
        : "The recovered pressure is exactly the share that had been spent on the throat's height term, while the speed term stays the same.",
  } satisfies WorkedExampleTokenMap;
}

function resolveBuoyancyArchimedesTokens(
  state: LiveWorkedExampleState,
  locale?: AppLocale,
) {
  const snapshot = sampleBuoyancyArchimedesState({
    objectDensity: state.params.objectDensity,
    fluidDensity: state.params.fluidDensity,
    gravity: state.params.gravity,
    bottomDepth: state.params.bottomDepth,
  });
  const shallowerState = sampleBuoyancyArchimedesState(
    {
      objectDensity: state.params.objectDensity,
      fluidDensity: state.params.fluidDensity,
      gravity: state.params.gravity,
      bottomDepth: state.params.bottomDepth,
    },
    {
      bottomDepth: Math.max(0.35, snapshot.bottomDepth - 0.2),
    },
  );
  const zhHk = isZhHkLocale(locale);

  return {
    objectDensityValue: formatNumber(snapshot.objectDensity),
    fluidDensityValue: formatNumber(snapshot.fluidDensity),
    gravityValue: formatNumber(snapshot.gravity),
    bottomDepthValue: formatNumber(snapshot.bottomDepth),
    submergedHeightValue: formatNumber(snapshot.submergedHeight),
    displacedVolumeValue: formatNumber(snapshot.displacedVolume),
    objectVolumeValue: formatNumber(snapshot.objectVolume),
    buoyantForceValue: formatNumber(snapshot.buoyantForce),
    weightValue: formatNumber(snapshot.weight),
    netForceValue: formatNumber(snapshot.netForce),
    topPressureValue: formatNumber(snapshot.topPressure),
    bottomPressureValue: formatNumber(snapshot.bottomPressure),
    pressureDifferenceValue: formatNumber(snapshot.pressureDifference),
    requiredSubmergedFractionValue: formatNumber(snapshot.requiredSubmergedFraction),
    equilibriumBottomDepthValue: formatNumber(snapshot.equilibriumBottomDepthClamped),
    shallowerBuoyantForceValue: formatNumber(shallowerState.buoyantForce),
    balanceInterpretation:
      snapshot.supportState === "balanced"
        ? zhHk
          ? "重量與浮力在這裡已經平衡，所以目前深度可以是真實的浮沉平衡位置，無須額外支撐。"
          : "Weight and buoyancy are already balanced here, so the current depth could be a real float position without extra support."
        : snapshot.supportState === "downward-hold"
          ? zhHk
            ? "在這個深度，被排開流體的重量已經大於木塊本身，因此必須有外力把木塊向下按住。"
            : "At this depth the displaced fluid weighs more than the block, so something would have to hold the block down."
          : zhHk
            ? "在這個深度，木塊重量仍大於被排開流體的重量，因此需要向上的支撐力。"
            : "At this depth the block still weighs more than the displaced fluid, so something would have to support it upward.",
    pressureInterpretation: snapshot.fullySubmerged
      ? zhHk
        ? "木塊已經完全浸沒，再往下移只會同時提高頂部和底部壓力，而不會改變兩者的壓力差，也不會改變浮力。"
        : "The block is fully submerged, so moving it deeper changes the top and bottom pressures together while leaving their difference and the buoyant force unchanged."
      : zhHk
        ? "木塊仍然只是部分浸沒，再把它壓深一些就會增加排開體積，從而增大浮力。"
        : "The block is only partly submerged, so pushing it deeper would increase the displaced volume and the buoyant force.",
  } satisfies WorkedExampleTokenMap;
}

function resolveDragTerminalVelocityTokens(state: LiveWorkedExampleState) {
  const snapshot = sampleDragTerminalVelocityState(
    {
      mass: state.params.mass,
      area: state.params.area,
      dragStrength: state.params.dragStrength,
    },
    state.time,
  );

  return {
    massValue: formatNumber(snapshot.mass),
    areaValue: formatNumber(snapshot.area),
    dragStrengthValue: formatNumber(snapshot.dragStrength),
    weightValue: formatNumber(snapshot.weightForce),
    terminalSpeedValue: formatNumber(snapshot.terminalSpeed),
    timeValue: formatNumber(snapshot.time),
    speedValue: formatNumber(snapshot.speed),
    dragForceValue: formatNumber(snapshot.dragForce),
    netForceValue: formatNumber(snapshot.netForce),
    accelerationValue: formatNumber(snapshot.acceleration),
    terminalSpeedInterpretation:
      snapshot.terminalSpeed >= 6
        ? "This setup reaches a relatively high terminal speed because the weight side of the balance stays large compared with the drag side."
        : snapshot.terminalSpeed <= 3
          ? "This setup settles into a low terminal speed because drag becomes strong enough to balance the weight at a modest speed."
          : "This setup sits in the middle, so the balance speed is neither especially low nor especially high.",
    balanceInterpretation:
      snapshot.balanceLabel === "near-terminal"
        ? "Drag is now almost matching the weight, so the object is still moving downward while the remaining acceleration is tiny."
        : snapshot.balanceLabel === "approaching-balance"
          ? "Drag already takes a large share of the weight here, so the fall is still speeding up but much more gently than at release."
          : "Early in the fall the speed is still too small for the quadratic drag term to rival the constant weight.",
  } satisfies WorkedExampleTokenMap;
}

function resolveHeatTransferTokens(state: LiveWorkedExampleState) {
  const resolved = resolveHeatTransferParams({
    hotTemperature: state.params.hotTemperature,
    ambientTemperature: state.params.ambientTemperature,
    materialConductivity: state.params.materialConductivity,
    contactQuality: state.params.contactQuality,
    surfaceArea: state.params.surfaceArea,
    airflow: state.params.airflow,
  });
  const snapshot = sampleHeatTransferState(resolved, state.time);

  return {
    timeValue: formatNumber(snapshot.time),
    hotTemperatureValue: formatNumber(snapshot.hotTemperature),
    ambientTemperatureValue: formatNumber(snapshot.ambientTemperature),
    temperatureContrastValue: formatNumber(snapshot.temperatureContrast),
    materialConductivityValue: formatNumber(snapshot.materialConductivity),
    contactQualityValue: formatNumber(snapshot.contactQuality),
    surfaceAreaValue: formatNumber(snapshot.surfaceArea),
    airflowValue: formatNumber(snapshot.airflow),
    conductionRateValue: formatNumber(snapshot.conductionRate),
    convectionRateValue: formatNumber(snapshot.convectionRate),
    radiationRateValue: formatNumber(snapshot.radiationRate),
    totalRateValue: formatNumber(snapshot.totalRate),
    totalEnergyTransferredValue: formatNumber(snapshot.totalEnergyTransferred),
    dominantPathwayInterpretation:
      snapshot.dominantPathway === "conduction"
        ? "Conduction is dominant here because the material-contact path is strong while the room stays cooler than the block."
        : snapshot.dominantPathway === "convection"
          ? "Convection is dominant here because the moving air is carrying energy away faster than the other visible paths."
          : snapshot.dominantPathway === "radiation"
            ? "Radiation is dominant here because the temperature contrast is large even though the contact and airflow paths are comparatively weak."
            : "No single path dominates here, so the total rate is being shared across conduction, convection, and radiation on the same bench.",
    coolingInterpretation:
      snapshot.directionLabel === "balanced"
        ? "The temperatures are nearly matched now, so the net rate is close to zero and the block is no longer changing quickly."
        : Math.abs(snapshot.temperatureContrast) <= 45
          ? "The block has already shed a lot of energy, so the smaller remaining temperature contrast makes every pathway weaker than it was at the start."
        : "The block is still much hotter than the room, so it still cools quickly; the total rate stays substantial, but it is already lower than the start because the contrast is shrinking.",
  } satisfies WorkedExampleTokenMap;
}

function resolveSpecificHeatPhaseChangeTokens(state: LiveWorkedExampleState) {
  const resolved = resolveSpecificHeatPhaseChangeParams({
    mass: state.params.mass,
    specificHeat: state.params.specificHeat,
    heaterPower: state.params.heaterPower,
    startingTemperature: state.params.startingTemperature,
    latentHeat: state.params.latentHeat,
    initialPhaseFraction: state.params.initialPhaseFraction,
    phaseChangeTemperature: state.params.phaseChangeTemperature,
  });
  const snapshot = sampleSpecificHeatPhaseChangeState(resolved, state.time);

  return {
    massValue: formatNumber(snapshot.mass),
    specificHeatValue: formatNumber(snapshot.specificHeat),
    powerValue: formatNumber(snapshot.heaterPower),
    timeValue: formatNumber(snapshot.time),
    startingTemperatureValue: formatNumber(snapshot.startingTemperature),
    temperatureValue: formatNumber(snapshot.temperature),
    temperatureChangeValue: formatNumber(snapshot.temperatureChange),
    thermalCapacityValue: formatNumber(snapshot.thermalCapacity),
    totalAddedEnergyValue: formatNumber(snapshot.totalAddedEnergy),
    sensibleEnergyChangeValue: formatNumber(snapshot.sensibleEnergyChange),
    latentEnergyChangeValue: formatNumber(snapshot.latentEnergyChange),
    phaseFractionPercentValue: formatNumber(snapshot.phaseFraction * 100),
    latentHeatValue: formatNumber(snapshot.latentHeat),
    phaseChangeEnergyValue: formatNumber(snapshot.phaseChangeEnergy),
    capacityInterpretation:
      snapshot.shelfActive
        ? "The sample has already reached the shelf, so only part of the transferred energy is changing temperature. The rest is feeding the latent-energy term instead."
        : snapshot.specificHeat >= 3.5
          ? "This high-c sample has a large m c, so the same pulse produces only a modest temperature change."
          : snapshot.specificHeat <= 1.2
            ? "This low-c sample has a small m c, so the same pulse drives a much larger temperature change."
            : "The temperature response is being set by m c: the sensible part of the energy divided by the thermal capacity gives the live delta T.",
    shelfInterpretation:
      snapshot.shelfActive
        ? "This is a real shelf state. The temperature stays near the phase-change temperature while the latent-energy term keeps changing the phase fraction."
        : snapshot.stageLabel === "liquid-like" && snapshot.heaterPower > 0
          ? "The shelf is already crossed, so the new energy is back to changing temperature on the upper sloped segment."
          : snapshot.stageLabel === "solid-like" && snapshot.heaterPower < 0
            ? "The shelf is already crossed in the cooling direction, so the sample is back on the lower sloped segment."
            : "If the sample is not actively on the shelf, the flat-temperature explanation no longer applies; the energy is mostly changing temperature again.",
  } satisfies WorkedExampleTokenMap;
}

function resolveSeriesParallelCircuitsTokens(state: LiveWorkedExampleState) {
  const snapshot = sampleSeriesParallelCircuitsState(
    {
      voltage: toNumber(state.params.voltage, 12),
      resistanceA: toNumber(state.params.resistanceA, 6),
      resistanceB: toNumber(state.params.resistanceB, 6),
      parallelMode: state.params.parallelMode === true,
    },
    state.time,
  );
  const equivalentRuleValue = snapshot.parallelMode
    ? "R_{\\text{eq}} = \\dfrac{R_A R_B}{R_A + R_B}"
    : "R_{\\text{eq}} = R_A + R_B";
  const equivalentSubstitutionValue = snapshot.parallelMode
    ? `R_{\\text{eq}} = \\dfrac{${formatNumber(snapshot.resistanceA)} \\times ${formatNumber(snapshot.resistanceB)}}{${formatNumber(snapshot.resistanceA)} + ${formatNumber(snapshot.resistanceB)}}`
    : `R_{\\text{eq}} = ${formatNumber(snapshot.resistanceA)} + ${formatNumber(snapshot.resistanceB)}`;
  const branchCurrentRuleValue = snapshot.parallelMode
    ? "I_B = \\dfrac{V}{R_B}"
    : "I_B = I_{\\text{total}}";
  const branchVoltageRuleValue = snapshot.parallelMode ? "V_B = V" : "V_B = I_B R_B";
  const branchCurrentSubstitutionValue = snapshot.parallelMode
    ? `I_B = \\dfrac{${formatNumber(snapshot.voltage)}}{${formatNumber(snapshot.resistanceB)}}`
    : `I_B = ${formatNumber(snapshot.totalCurrent)}`;
  const branchVoltageSubstitutionValue = snapshot.parallelMode
    ? `V_B = ${formatNumber(snapshot.voltage)}`
    : `V_B = ${formatNumber(snapshot.branchB.current)} \\times ${formatNumber(snapshot.resistanceB)}`;

  return {
    topologyLabelValue: snapshot.parallelMode ? "parallel branches" : "series loop",
    voltageValue: formatNumber(snapshot.voltage),
    resistanceAValue: formatNumber(snapshot.resistanceA),
    resistanceBValue: formatNumber(snapshot.resistanceB),
    equivalentRuleValue,
    equivalentSubstitutionValue,
    equivalentResistanceValue: formatNumber(snapshot.equivalentResistance),
    totalCurrentValue: formatNumber(snapshot.totalCurrent),
    arrangementInterpretation: snapshot.parallelMode
      ? "Parallel branches lower the one-number load seen by the battery, so the total current rises while each branch keeps the full battery voltage."
      : "Series adds the two loads into one path, so the equivalent resistance rises and the same loop current must pass through both loads.",
    timeValue: formatNumber(snapshot.time),
    branchCurrentRuleValue,
    branchVoltageRuleValue,
    branchCurrentSubstitutionValue,
    branchVoltageSubstitutionValue,
    branchBCurrentValue: formatNumber(snapshot.branchB.current),
    branchBVoltageValue: formatNumber(snapshot.branchB.voltage),
    branchBPowerValue: formatNumber(snapshot.branchB.power),
    branchBChargeValue: formatNumber(snapshot.branchB.charge),
    branchBBehaviorInterpretation: snapshot.parallelMode
      ? snapshot.branchB.current > snapshot.branchA.current
        ? "Load B is brighter because both branches see the same battery voltage, but Load B has the lower resistance and therefore takes more current, more power, and more charge each second."
        : snapshot.branchB.current < snapshot.branchA.current
          ? "Load B is dimmer because both branches see the same battery voltage, but Load B's larger resistance makes its current, power, and charge counter grow more slowly."
          : "Matching parallel branches keep the same branch voltage, so they also match in current, power, and accumulated charge at the same inspected time."
      : snapshot.branchB.power > snapshot.branchA.power
        ? "In series the same current crosses both loads, so the larger resistance takes more voltage and more power. Load B looks brighter even though both charge counters grow at the same rate."
        : snapshot.branchB.power < snapshot.branchA.power
          ? "In series the same current crosses both loads, so the smaller-resistance load takes less voltage and less power. Load B stays dimmer even though its charge counter grows at the same rate as Load A."
          : "Equal series loads share both the current and the power evenly, so they stay equally bright and their charge counters rise together.",
  } satisfies WorkedExampleTokenMap;
}

function resolveEquivalentResistanceTokens(state: LiveWorkedExampleState) {
  const snapshot = sampleEquivalentResistanceState(
    {
      voltage: toNumber(state.params.voltage, 12),
      resistance1: toNumber(state.params.resistance1, 4),
      resistance2: toNumber(state.params.resistance2, 6),
      resistance3: toNumber(state.params.resistance3, 6),
      groupParallel: state.params.groupParallel === true,
    },
    state.time,
  );
  const groupRuleValue = snapshot.groupParallel
    ? "R_{\\text{group}} = \\dfrac{R_2 R_3}{R_2 + R_3}"
    : "R_{\\text{group}} = R_2 + R_3";
  const groupSubstitutionValue = snapshot.groupParallel
    ? `R_{\\text{group}} = \\dfrac{${formatNumber(snapshot.resistance2)} \\times ${formatNumber(snapshot.resistance3)}}{${formatNumber(snapshot.resistance2)} + ${formatNumber(snapshot.resistance3)}}`
    : `R_{\\text{group}} = ${formatNumber(snapshot.resistance2)} + ${formatNumber(snapshot.resistance3)}`;
  const totalSubstitutionValue = `R_{\\text{eq}} = ${formatNumber(snapshot.resistance1)} + ${formatNumber(snapshot.groupEquivalentResistance)}`;
  const resistor3CurrentRuleValue = snapshot.groupParallel
    ? "I_3 = \\dfrac{V_{\\text{group}}}{R_3}"
    : "I_3 = I_{\\text{total}}";
  const resistor3CurrentSubstitutionValue = snapshot.groupParallel
    ? `I_3 = \\dfrac{${formatNumber(snapshot.groupVoltage)}}{${formatNumber(snapshot.resistance3)}}`
    : `I_3 = ${formatNumber(snapshot.totalCurrent)}`;
  const groupVoltageSubstitutionValue = `V_{\\text{group}} = ${formatNumber(snapshot.totalCurrent)} \\times ${formatNumber(snapshot.groupEquivalentResistance)}`;

  return {
    groupModeLabelValue: snapshot.groupParallel ? "parallel grouped pair" : "series grouped pair",
    voltageValue: formatNumber(snapshot.voltage),
    resistance1Value: formatNumber(snapshot.resistance1),
    resistance2Value: formatNumber(snapshot.resistance2),
    resistance3Value: formatNumber(snapshot.resistance3),
    groupRuleValue,
    groupSubstitutionValue,
    groupEquivalentResistanceValue: formatNumber(snapshot.groupEquivalentResistance),
    totalSubstitutionValue,
    equivalentResistanceValue: formatNumber(snapshot.equivalentResistance),
    totalCurrentValue: formatNumber(snapshot.totalCurrent),
    timeValue: formatNumber(snapshot.time),
    groupVoltageValue: formatNumber(snapshot.groupVoltage),
    groupVoltageSubstitutionValue,
    resistor3CurrentRuleValue,
    resistor3CurrentSubstitutionValue,
    resistor3CurrentValue: formatNumber(snapshot.resistor3.current),
    resistor3VoltageValue: formatNumber(snapshot.resistor3.voltage),
    resistor3ChargeValue: formatNumber(snapshot.resistor3.charge),
    reductionInterpretation: snapshot.groupParallel
      ? "The grouped pair reduces to a smaller resistance than either branch alone, so adding R1 after that still gives a noticeably lighter total load."
      : "The grouped pair reduces by direct addition first, so the total equivalent stays larger before the source current is found.",
    resistor3BehaviorInterpretation: snapshot.groupParallel
      ? snapshot.resistor3.current > snapshot.resistor2.current
        ? "R3 takes the larger grouped-branch current because both grouped branches share the same group voltage and R3 has the lower resistance."
        : snapshot.resistor3.current < snapshot.resistor2.current
          ? "R3 takes the smaller grouped-branch current because both grouped branches share the same group voltage and R3 has the larger resistance."
          : "Matching grouped branches keep the same group voltage, so they also match in current and accumulated charge at the same inspected time."
      : snapshot.resistor3.voltage > snapshot.resistor2.voltage
        ? "In the series grouped pair, the same current crosses both grouped resistors, so the larger resistance takes the larger share of the group voltage."
        : snapshot.resistor3.voltage < snapshot.resistor2.voltage
          ? "In the series grouped pair, the smaller resistance takes the smaller share of the group voltage even though the current stays the same."
          : "Equal grouped series resistors split the group voltage evenly because the same current crosses both.",
  } satisfies WorkedExampleTokenMap;
}

function resolveKirchhoffRulesTokens(state: LiveWorkedExampleState) {
  const snapshot = sampleEquivalentResistanceState(
    {
      voltage: toNumber(state.params.voltage, 12),
      resistance1: toNumber(state.params.resistance1, 4),
      resistance2: toNumber(state.params.resistance2, 6),
      resistance3: toNumber(state.params.resistance3, 12),
      groupParallel: state.params.groupParallel === true,
    },
    state.time,
  );
  const junctionRuleValue = snapshot.groupParallel
    ? "I_{\\text{total}} = I_2 + I_3"
    : "I_1 = I_2 = I_3";
  const junctionSubstitutionValue = snapshot.groupParallel
    ? `${formatNumber(snapshot.totalCurrent)} = ${formatNumber(snapshot.resistor2.current)} + ${formatNumber(snapshot.resistor3.current)}`
    : `${formatNumber(snapshot.totalCurrent)} = ${formatNumber(snapshot.resistor2.current)} = ${formatNumber(snapshot.resistor3.current)}`;
  const currentRuleIntroValue = snapshot.groupParallel
    ? "The highlighted group is parallel right now, so one source current reaches the split node and becomes two branch currents."
    : "The highlighted group is series right now, so there is no current split and the same current crosses every resistor in the full loop.";
  const loopDirectionValue = snapshot.groupParallel
    ? "Walk clockwise around the lower loop. Treat the battery as a positive rise and the resistor drops along the way as negative."
    : "Walk clockwise around the full loop. Treat the battery as a positive rise and each resistor drop as negative."
  const loopRuleValue = snapshot.groupParallel
    ? "+V - V_1 - V_3 = 0"
    : "+V - V_1 - V_2 - V_3 = 0";
  const loopBalance = snapshot.groupParallel
    ? snapshot.voltage - snapshot.resistor1.voltage - snapshot.resistor3.voltage
    : snapshot.voltage -
      snapshot.resistor1.voltage -
      snapshot.resistor2.voltage -
      snapshot.resistor3.voltage;
  const loopSubstitutionValue = snapshot.groupParallel
    ? `${formatNumber(snapshot.voltage)} - ${formatNumber(snapshot.resistor1.voltage)} - ${formatNumber(snapshot.resistor3.voltage)} = ${formatNumber(loopBalance)}`
    : `${formatNumber(snapshot.voltage)} - ${formatNumber(snapshot.resistor1.voltage)} - ${formatNumber(snapshot.resistor2.voltage)} - ${formatNumber(snapshot.resistor3.voltage)} = ${formatNumber(loopBalance)}`;

  return {
    voltageValue: formatNumber(snapshot.voltage),
    resistance1Value: formatNumber(snapshot.resistance1),
    resistance2Value: formatNumber(snapshot.resistance2),
    resistance3Value: formatNumber(snapshot.resistance3),
    timeValue: formatNumber(snapshot.time),
    totalCurrentValue: formatNumber(snapshot.totalCurrent),
    resistor1CurrentValue: formatNumber(snapshot.resistor1.current),
    resistor1VoltageValue: formatNumber(snapshot.resistor1.voltage),
    resistor2CurrentValue: formatNumber(snapshot.resistor2.current),
    resistor2VoltageValue: formatNumber(snapshot.resistor2.voltage),
    resistor3CurrentValue: formatNumber(snapshot.resistor3.current),
    resistor3VoltageValue: formatNumber(snapshot.resistor3.voltage),
    currentRuleIntroValue,
    junctionRuleValue,
    junctionSubstitutionValue,
    loopDirectionValue,
    loopRuleValue,
    loopSubstitutionValue,
    loopBalanceValue: formatNumber(loopBalance),
    junctionInterpretation: snapshot.groupParallel
      ? "At the split node, the total current is being conserved by becoming the two branch currents. The larger-resistance branch keeps the smaller current."
      : "There is no split node in the current series state, so Kirchhoff's current rule appears as the simpler same-current statement through the whole loop.",
    loopInterpretation: snapshot.groupParallel
      ? "The lower branch loop balances because the battery rise is matched by the R1 drop plus the R3 drop. The top branch loop would balance the same way with V_2 in place of V_3."
      : "In the single-loop case, every resistor drop belongs to the same closed path, so the full loop still balances on zero with one consistent sign convention.",
  } satisfies WorkedExampleTokenMap;
}

function resolveElectricFieldsTokens(state: LiveWorkedExampleState) {
  const params = resolveElectricFieldsParams({
    sourceChargeA: toNumber(state.params.sourceChargeA, 2),
    sourceChargeB: toNumber(state.params.sourceChargeB, -2),
    sourceSeparation: toNumber(state.params.sourceSeparation, 2.4),
    probeX: toNumber(state.params.probeX, 0),
    probeY: toNumber(state.params.probeY, 1),
    testCharge: toNumber(state.params.testCharge, 1),
  });
  const snapshot = sampleElectricFieldsState(params);

  return {
    sourceChargeAValue: formatNumber(snapshot.sourceChargeA),
    sourceChargeBValue: formatNumber(snapshot.sourceChargeB),
    sourceSeparationValue: formatNumber(snapshot.sourceSeparation),
    sourceAXValue: formatNumber(snapshot.sourceA.x),
    sourceBXValue: formatNumber(snapshot.sourceB.x),
    probeXValue: formatNumber(snapshot.probeX),
    probeYValue: formatNumber(snapshot.probeY),
    testChargeValue: formatNumber(snapshot.testCharge),
    rAxValue: formatNumber(snapshot.sourceA.dx),
    rAyValue: formatNumber(snapshot.sourceA.dy),
    rAValue: formatNumber(snapshot.sourceA.effectiveDistance),
    rBxValue: formatNumber(snapshot.sourceB.dx),
    rByValue: formatNumber(snapshot.sourceB.dy),
    rBValue: formatNumber(snapshot.sourceB.effectiveDistance),
    eAxValue: formatNumber(snapshot.sourceA.fieldX),
    eAyValue: formatNumber(snapshot.sourceA.fieldY),
    eBxValue: formatNumber(snapshot.sourceB.fieldX),
    eByValue: formatNumber(snapshot.sourceB.fieldY),
      fieldXValue: formatNumber(snapshot.fieldX),
      fieldYValue: formatNumber(snapshot.fieldY),
    fieldMagnitudeValue: formatNumber(snapshot.fieldMagnitude),
    fieldAngleValue: formatNumber(snapshot.fieldAngle),
    forceXValue: formatNumber(snapshot.forceX),
    forceYValue: formatNumber(snapshot.forceY),
    forceMagnitudeValue: formatNumber(snapshot.forceMagnitude),
      fieldInterpretation:
        snapshot.dominantSource === "a"
          ? "來源 A 在這裡提供較大的局部推動，因此淨電場會更明顯地沿著來源 A 的徑向方向偏轉。"
          : snapshot.dominantSource === "b"
            ? "來源 B 在這裡提供較大的局部拉動或推動，因此它會更強烈地改變淨電場方向。"
            : snapshot.dominantSource === "balanced"
              ? "這裡兩個來源的貢獻相當接近，因此淨電場必須靠仔細的向量疊加來判讀，而不是單靠其中一個來源主導。"
              : "這個探針位置的局部電場很小，因為兩個來源在這裡的貢獻都偏弱。",
      forceInterpretation:
        Math.abs(snapshot.testCharge) < 0.05
          ? "測試電荷為零時，電場本身保持不變，但受力會完全消失。"
          : snapshot.testCharge > 0
            ? "正測試電荷的受力方向與電場方向一致，因此力箭頭會跟隨電場。"
            : "負測試電荷會令受力方向反轉，即使電場本身並沒有改變。",
  } satisfies WorkedExampleTokenMap;
}

function resolveGravitationalFieldsTokens(state: LiveWorkedExampleState) {
  const params = resolveGravitationalFieldsParams({
    sourceMass: toNumber(state.params.sourceMass, 2),
    probeX: toNumber(state.params.probeX, 1.6),
    probeY: toNumber(state.params.probeY, 1.2),
    testMass: toNumber(state.params.testMass, 1),
  });
  const snapshot = sampleGravitationalFieldsState(params);
  const boundedNearSource = snapshot.distance + 0.01 < snapshot.effectiveDistance;

  return {
    sourceMassValue: formatNumber(snapshot.sourceMass),
    testMassValue: formatNumber(snapshot.testMass),
    probeXValue: formatNumber(snapshot.probeX),
    probeYValue: formatNumber(snapshot.probeY),
    distanceValue: formatNumber(snapshot.effectiveDistance),
    distanceSquaredValue: formatNumber(snapshot.effectiveDistance ** 2),
    distanceCubedValue: formatNumber(snapshot.effectiveDistance ** 3),
    fieldXValue: formatNumber(snapshot.fieldX),
    fieldYValue: formatNumber(snapshot.fieldY),
    fieldMagnitudeValue: formatNumber(snapshot.fieldMagnitude),
    forceXValue: formatNumber(snapshot.forceX),
    forceYValue: formatNumber(snapshot.forceY),
    forceMagnitudeValue: formatNumber(snapshot.forceMagnitude),
    fieldInterpretation: boundedNearSource
      ? "The probe is extremely close to the source mass, so the bounded lab uses its minimum sample radius while still preserving the inward field direction and rapid inverse-square growth trend."
      : Math.abs(snapshot.probeY) <= 0.05
        ? "On the horizontal axis the field is purely left-right, so the full gravitational pull points straight toward the source mass."
        : "Off the axis the inward pull splits into horizontal and vertical components, but the net field still points directly toward the source mass.",
    forceInterpretation:
      snapshot.testMass <= 0.01
        ? "A zero probe mass removes the force without changing the gravitational field at that location."
        : snapshot.testMass >= 2
          ? "The heavier probe mass scales the force up proportionally while the field itself stays fixed."
          : "Because the probe mass is positive in this bounded lab, the force stays aligned with the inward gravitational field.",
  } satisfies WorkedExampleTokenMap;
}

function resolveGravitationalPotentialTokens(state: LiveWorkedExampleState) {
  const params = resolveGravitationalPotentialParams({
    sourceMass: toNumber(state.params.sourceMass, 2),
    probeX: toNumber(state.params.probeX, 1.6),
    probeY: toNumber(state.params.probeY, 1.2),
    testMass: toNumber(state.params.testMass, 1),
  });
  const snapshot = sampleGravitationalPotentialState(params);
  const boundedNearSource = snapshot.distance + 0.01 < snapshot.effectiveDistance;

  return {
    sourceMassValue: formatNumber(snapshot.sourceMass),
    testMassValue: formatNumber(snapshot.testMass),
    probeXValue: formatNumber(snapshot.probeX),
    probeYValue: formatNumber(snapshot.probeY),
    distanceValue: formatNumber(snapshot.effectiveDistance),
    distanceSquaredValue: formatNumber(snapshot.effectiveDistance ** 2),
    potentialValue: formatNumber(snapshot.potential),
    potentialEnergyValue: formatNumber(snapshot.potentialEnergy),
    fieldXValue: formatNumber(snapshot.fieldX),
    fieldYValue: formatNumber(snapshot.fieldY),
    fieldMagnitudeValue: formatNumber(snapshot.fieldMagnitude),
    forceMagnitudeValue: formatNumber(snapshot.forceMagnitude),
    potentialInterpretation: boundedNearSource
      ? "The probe is extremely close to the source mass, so the bounded lab uses its minimum sample radius while still keeping the potential strongly negative."
      : snapshot.effectiveDistance >= 2
        ? "Farther from the source, the potential has risen closer to zero, but it stays negative because zero is defined at infinity in this model."
        : "At this intermediate distance, the potential is still negative because the probe remains inside the source mass's gravitational well.",
    potentialEnergyInterpretation:
      snapshot.testMass >= 2
        ? "A heavier positive probe mass keeps the same potential but makes the potential energy more negative because U = m_test phi."
        : "With a positive probe mass, the potential energy keeps the same negative sign as the gravitational potential.",
  } satisfies WorkedExampleTokenMap;
}

function resolveElectricPotentialTokens(state: LiveWorkedExampleState) {
  const params = resolveElectricPotentialParams({
    sourceChargeA: toNumber(state.params.sourceChargeA, 2),
    sourceChargeB: toNumber(state.params.sourceChargeB, -2),
    sourceSeparation: toNumber(state.params.sourceSeparation, 2.4),
    probeX: toNumber(state.params.probeX, 0),
    probeY: toNumber(state.params.probeY, 1),
    testCharge: toNumber(state.params.testCharge, 1),
  });
  const snapshot = sampleElectricPotentialState(params);

  return {
    sourceChargeAValue: formatNumber(snapshot.sourceChargeA),
    sourceChargeBValue: formatNumber(snapshot.sourceChargeB),
    sourceSeparationValue: formatNumber(snapshot.sourceSeparation),
    sourceAXValue: formatNumber(snapshot.sourceA.x),
    sourceBXValue: formatNumber(snapshot.sourceB.x),
    probeXValue: formatNumber(snapshot.probeX),
    probeYValue: formatNumber(snapshot.probeY),
    testChargeValue: formatNumber(snapshot.testCharge),
    rAValue: formatNumber(snapshot.sourceA.effectiveDistance),
    rBValue: formatNumber(snapshot.sourceB.effectiveDistance),
    potentialAValue: formatNumber(snapshot.sourceA.potential),
    potentialBValue: formatNumber(snapshot.sourceB.potential),
    potentialValue: formatNumber(snapshot.potential),
    potentialEnergyValue: formatNumber(snapshot.potentialEnergy),
    fieldXValue: formatNumber(snapshot.fieldX),
    fieldYValue: formatNumber(snapshot.fieldY),
    fieldMagnitudeValue: formatNumber(snapshot.fieldMagnitude),
    potentialInterpretation:
      snapshot.potentialSign === "positive"
        ? "The net potential is positive here because the positive contributions outweigh any negative contribution at this probe point."
        : snapshot.potentialSign === "negative"
          ? "The net potential is negative here because the negative contribution dominates this location."
          : "The positive and negative potential contributions nearly cancel here, so V is close to zero even though the field can still be nonzero.",
    potentialEnergyInterpretation:
      Math.abs(snapshot.testCharge) < 0.05
        ? "A zero test charge makes U vanish, but the potential itself is still set by the source charges."
        : snapshot.potentialEnergy > 0
          ? "The test charge and the local potential have the same sign here, so the potential energy is positive."
          : snapshot.potentialEnergy < 0
            ? "The test charge and the local potential have opposite signs here, so the potential energy is negative."
            : "The potential energy is near zero here because either the potential or the test charge is near zero.",
  } satisfies WorkedExampleTokenMap;
}

function resolveCapacitanceElectricEnergyTokens(state: LiveWorkedExampleState) {
  const params = resolveCapacitanceElectricEnergyParams({
    plateArea: toNumber(state.params.plateArea, 2.4),
    plateSeparation: toNumber(state.params.plateSeparation, 1.4),
    batteryVoltage: toNumber(state.params.batteryVoltage, 6),
  });
  const snapshot = sampleCapacitanceElectricEnergyState(params);

  return {
    plateAreaValue: formatNumber(snapshot.plateArea),
    plateSeparationValue: formatNumber(snapshot.plateSeparation),
    batteryVoltageValue: formatNumber(snapshot.batteryVoltage),
    capacitanceValue: formatNumber(snapshot.capacitance),
    chargeMagnitudeValue: formatNumber(snapshot.chargeMagnitude),
    fieldStrengthValue: formatNumber(snapshot.fieldStrength),
    storedEnergyValue: formatNumber(snapshot.storedEnergy),
    capacitanceInterpretation:
      snapshot.plateSeparation <= 1
        ? "The plates are close together here, so the same facing area gives a larger capacitance."
        : snapshot.plateArea >= 4
          ? "The larger facing plate area raises the capacitance, so the same battery can store more charge."
          : "This geometry gives a moderate capacitance, so the storage story stays easy to compare against voltage changes.",
    storedEnergyInterpretation:
      snapshot.batteryVoltage >= 8
        ? "At this higher voltage, the stored energy grows quickly because U depends on V squared."
        : snapshot.batteryVoltage <= 3
          ? "The capacitor still stores charge at low voltage, but the energy reservoir remains comparatively small."
          : "With this middle-voltage setup, the stored energy is visible without the quadratic V dependence dominating the whole bench.",
  } satisfies WorkedExampleTokenMap;
}

function resolveMagneticFieldsTokens(state: LiveWorkedExampleState) {
  const params = resolveMagneticFieldsParams({
    currentA: toNumber(state.params.currentA, 2),
    currentB: toNumber(state.params.currentB, -2),
    sourceSeparation: toNumber(state.params.sourceSeparation, 2.4),
    probeX: toNumber(state.params.probeX, 0),
    probeY: toNumber(state.params.probeY, 1),
  });
  const snapshot = sampleMagneticFieldsState(params);

  return {
    currentAValue: formatNumber(snapshot.currentA),
    currentBValue: formatNumber(snapshot.currentB),
    sourceSeparationValue: formatNumber(snapshot.sourceSeparation),
    sourceAXValue: formatNumber(snapshot.sourceA.x),
    sourceBXValue: formatNumber(snapshot.sourceB.x),
    probeXValue: formatNumber(snapshot.probeX),
    probeYValue: formatNumber(snapshot.probeY),
    rAxValue: formatNumber(snapshot.sourceA.dx),
    rAyValue: formatNumber(snapshot.sourceA.dy),
    rAValue: formatNumber(snapshot.sourceA.effectiveDistance),
    rBxValue: formatNumber(snapshot.sourceB.dx),
    rByValue: formatNumber(snapshot.sourceB.dy),
    rBValue: formatNumber(snapshot.sourceB.effectiveDistance),
    bAxValue: formatNumber(snapshot.sourceA.fieldX),
    bAyValue: formatNumber(snapshot.sourceA.fieldY),
    bBxValue: formatNumber(snapshot.sourceB.fieldX),
    bByValue: formatNumber(snapshot.sourceB.fieldY),
    fieldXValue: formatNumber(snapshot.fieldX),
    fieldYValue: formatNumber(snapshot.fieldY),
    fieldMagnitudeValue: formatNumber(snapshot.fieldMagnitude),
    fieldAngleValue: formatNumber(snapshot.fieldAngle),
    sourceAContributionMagnitudeValue: formatNumber(snapshot.sourceA.fieldMagnitude),
    sourceBContributionMagnitudeValue: formatNumber(snapshot.sourceB.fieldMagnitude),
    sourceADirectionValue: snapshot.sourceA.circulationSense,
    sourceBDirectionValue: snapshot.sourceB.circulationSense,
    fieldInterpretation:
      snapshot.dominantSource === "a"
        ? "Wire A is contributing the larger local swirl here, so the net field leans more strongly along Wire A's tangent direction."
        : snapshot.dominantSource === "b"
          ? "Wire B is contributing the larger local swirl here, so it bends the net field more strongly."
          : snapshot.dominantSource === "balanced"
            ? "The two wire contributions are closely balanced here, so the final direction has to be read from careful vector addition."
            : "The local magnetic field is very small here because both wire contributions are weak or cancel strongly at the probe.",
    circulationInterpretation:
      snapshot.netCirculation === "counterclockwise"
        ? "Matching out-of-page current would circulate the field counterclockwise around each wire, so the local tangent still comes from geometry plus superposition."
        : snapshot.netCirculation === "clockwise"
          ? "Matching into-page current would circulate the field clockwise around each wire, so flipping both currents would reverse every tangent direction."
          : "The two wire senses compete here, so the probe direction is a true superposition result instead of one shared circulation sense.",
  } satisfies WorkedExampleTokenMap;
}

function resolveElectromagneticInductionTokens(state: LiveWorkedExampleState) {
  const snapshot = sampleElectromagneticInductionState(
    {
      magnetStrength: toNumber(state.params.magnetStrength, 1.4),
      coilTurns: toNumber(state.params.coilTurns, 120),
      coilArea: toNumber(state.params.coilArea, 1),
      speed: toNumber(state.params.speed, 1.2),
      startOffset: toNumber(state.params.startOffset, 2.6),
      northFacingCoil: state.params.northFacingCoil !== false,
    },
    state.time,
  );
  const motionStateValue =
    snapshot.magnetPhase === "approaching"
      ? "approaching"
      : snapshot.magnetPhase === "leaving"
        ? "moving away from"
        : snapshot.magnetPhase === "crossing"
          ? "crossing"
          : "stationary at";

  return {
    magnetStrengthValue: formatNumber(snapshot.magnetStrength),
    coilTurnsValue: formatNumber(snapshot.coilTurns),
    coilAreaValue: formatNumber(snapshot.coilArea),
    speedValue: formatNumber(snapshot.speed),
    positionValue: formatNumber(snapshot.positionX),
    poleSignValue: snapshot.northFacingCoil ? "+1" : "-1",
    fieldValue: formatNumber(snapshot.fieldStrength),
    fluxLinkageValue: formatNumber(snapshot.fluxLinkage),
    fluxRateValue: formatNumber(snapshot.fluxChangeRate),
    emfValue: formatNumber(snapshot.emf),
    currentValue: formatNumber(snapshot.current),
    motionStateValue,
    fluxTrendValue: snapshot.fluxTrend,
    fieldInterpretation:
      Math.abs(snapshot.emf) < 0.03
        ? "The coil is still linking magnetic field here, but the response is near zero because the linked flux is almost flat at this instant."
        : snapshot.currentDirection === "counterclockwise"
          ? "The linked flux is changing enough to drive a counterclockwise current in the stage convention, which is the model's Lenz-law response to the present change."
          : snapshot.currentDirection === "clockwise"
            ? "The linked flux is changing enough to drive a clockwise current in the stage convention, which is the model's Lenz-law response to the present change."
            : "The response is very small because the linked flux is barely changing right now.",
    relativeChangeInterpretation:
      Math.abs(snapshot.fluxChangeRate) < 0.03
        ? "This is the key induction lesson: a large linked flux does not guarantee a large emf. The response follows the slope of the flux curve, not the height of the curve itself."
        : snapshot.fluxTrend === "increasing"
          ? "The linked flux is increasing, so the induced response takes the sign that opposes that increase rather than simply matching the field sign."
          : "The linked flux is decreasing, so the induced response takes the sign that opposes that decrease.",
  } satisfies WorkedExampleTokenMap;
}

function resolveMagneticForceTokens(state: LiveWorkedExampleState) {
  const params = resolveMagneticForceParams({
    fieldStrength: toNumber(state.params.fieldStrength, 1.6),
    speed: toNumber(state.params.speed, 4.5),
    directionAngle: toNumber(state.params.directionAngle, 0),
    negativeCharge: state.params.negativeCharge === true,
    current: toNumber(state.params.current, 2),
  });
  const snapshot = sampleMagneticForceState(params, state.time);
  const chargeForceDirection =
    snapshot.chargeForceMagnitude <= 0.02
      ? "neutral"
      : snapshot.chargeForceY > 0.08
        ? snapshot.chargeForceX > 0.08
          ? "up-right"
          : snapshot.chargeForceX < -0.08
            ? "up-left"
            : "up"
        : snapshot.chargeForceY < -0.08
          ? snapshot.chargeForceX > 0.08
            ? "down-right"
            : snapshot.chargeForceX < -0.08
              ? "down-left"
              : "down"
          : snapshot.chargeForceX > 0.08
            ? "right"
            : snapshot.chargeForceX < -0.08
              ? "left"
              : "neutral";
  const wireForceDirection =
    snapshot.wireForceMagnitude <= 0.02
      ? "neutral"
      : snapshot.wireForceY > 0.08
        ? snapshot.wireForceX > 0.08
          ? "up-right"
          : snapshot.wireForceX < -0.08
            ? "up-left"
            : "up"
        : snapshot.wireForceY < -0.08
          ? snapshot.wireForceX > 0.08
            ? "down-right"
            : snapshot.wireForceX < -0.08
              ? "down-left"
              : "down"
          : snapshot.wireForceX > 0.08
            ? "right"
            : snapshot.wireForceX < -0.08
              ? "left"
              : "neutral";
  const positiveChargeForceY =
    -Math.abs(snapshot.fieldStrength) *
    snapshot.speed *
    Math.cos(degToRad(snapshot.directionAngle));
  const positiveChargeForceX =
    Math.abs(snapshot.fieldStrength) *
    snapshot.speed *
    Math.sin(degToRad(snapshot.directionAngle));
  const positiveChargeDirection =
    Math.abs(snapshot.fieldStrength) <= 0.02
      ? "neutral"
      : positiveChargeForceY > 0.08
        ? positiveChargeForceX > 0.08
          ? "up-right"
          : positiveChargeForceX < -0.08
            ? "up-left"
            : "up"
        : positiveChargeForceY < -0.08
          ? positiveChargeForceX > 0.08
            ? "down-right"
            : positiveChargeForceX < -0.08
              ? "down-left"
              : "down"
          : positiveChargeForceX > 0.08
            ? "right"
            : positiveChargeForceX < -0.08
              ? "left"
              : "neutral";

  return {
    timeValue: formatNumber(snapshot.time),
    fieldStrengthValue: formatNumber(snapshot.fieldStrength),
    fieldStrengthAbsValue: formatNumber(Math.abs(snapshot.fieldStrength)),
    fieldOrientationValue: snapshot.fieldOrientation,
    speedValue: formatNumber(snapshot.speed),
    directionAngleValue: formatNumber(snapshot.directionAngle),
    chargeLabelValue: snapshot.chargeLabel,
    chargeSignValue: snapshot.negativeCharge ? "-1" : "+1",
    currentValue: formatNumber(snapshot.current),
    chargeForceXValue: formatNumber(snapshot.chargeForceX),
    chargeForceYValue: formatNumber(snapshot.chargeForceY),
    chargeForceMagnitudeValue: formatNumber(snapshot.chargeForceMagnitude),
    wireForceXValue: formatNumber(snapshot.wireForceX),
    wireForceYValue: formatNumber(snapshot.wireForceY),
    wireForceMagnitudeValue: formatNumber(snapshot.wireForceMagnitude),
    radiusValue:
      snapshot.radius === null ? "very large" : formatNumber(snapshot.radius),
    periodValue:
      snapshot.period === null ? "not set" : formatNumber(snapshot.period),
    orbitCenterXValue:
      snapshot.orbitCenterX === null ? "not defined" : formatNumber(snapshot.orbitCenterX),
    orbitCenterYValue:
      snapshot.orbitCenterY === null ? "not defined" : formatNumber(snapshot.orbitCenterY),
    curvatureSenseValue: snapshot.curvatureSense,
    chargeForceDirectionValue: chargeForceDirection,
    wireForceDirectionValue: wireForceDirection,
    positiveChargeDirectionValue: positiveChargeDirection,
    chargeDirectionStepValue:
      snapshot.fieldOrientation === "zero"
        ? "With B = 0, the cross product vanishes, so the charge feels no magnetic force and the path stays straight."
        : `The field is ${snapshot.fieldOrientation}, so a positive charge launched at ${formatNumber(snapshot.directionAngle)}^\\circ would feel a ${positiveChargeDirection} magnetic force. Because this charge is ${snapshot.chargeLabel}, the actual force points ${chargeForceDirection}.`,
    chargeMagnitudeStepValue:
      snapshot.fieldOrientation === "zero"
        ? "Here $|\\vec{F}_q| = 0$ because the field is zero."
        : `$|\\vec{F}_q| = |q|vB = ${formatNumber(snapshot.speed)} \\times ${formatNumber(Math.abs(snapshot.fieldStrength))} = ${formatNumber(snapshot.chargeForceMagnitude)}$ in the normalized live model.`,
    radiusStepValue:
      snapshot.radius === null
        ? "With no field, there is no finite magnetic radius, so the motion reduces to a straight line."
        : `$r = \\dfrac{v}{|B|} = \\dfrac{${formatNumber(snapshot.speed)}}{${formatNumber(Math.abs(snapshot.fieldStrength))}} = ${formatNumber(snapshot.radius)}\\,\\mathrm{m}$, so the path curves ${snapshot.curvatureSense}.`,
    chargeForceResultValue:
      snapshot.radius === null
        ? `$\\vec{F}_q = (0, 0)$ and the charge keeps a straight path.`
        : `$\\vec{F}_q = (${formatNumber(snapshot.chargeForceX)}, ${formatNumber(snapshot.chargeForceY)}), \\quad |\\vec{F}_q| = ${formatNumber(snapshot.chargeForceMagnitude)}, \\quad r = ${formatNumber(snapshot.radius)}\\,\\mathrm{m}$.`,
    chargeForceInterpretation:
      snapshot.negativeCharge
        ? "The negative charge reverses the force relative to the positive-charge right-hand-rule baseline, so the curve bends to the opposite side."
        : "Because the charge is positive, the actual bend follows the standard right-hand-rule direction for the live launch arrow and field sense.",
    wireDirectionStepValue:
      snapshot.fieldOrientation === "zero"
        ? "With B = 0, the current segment also feels no magnetic force."
        : `The 1 m wire segment points at ${formatNumber(snapshot.directionAngle)}^\\circ, so $\\vec{F}_{wire} = I\\vec{L} \\times \\vec{B}$ points ${wireForceDirection} in the same field.`,
    wireMagnitudeStepValue:
      snapshot.fieldOrientation === "zero"
        ? "Here $|\\vec{F}_{wire}| = 0$ because the field is zero."
        : `$|\\vec{F}_{wire}| = IBL = ${formatNumber(snapshot.current)} \\times ${formatNumber(Math.abs(snapshot.fieldStrength))} \\times 1 = ${formatNumber(snapshot.wireForceMagnitude)}$.`,
    wireComparisonStepValue:
      snapshot.fieldOrientation === "zero"
        ? "Both force arrows collapse because there is no magnetic field."
        : snapshot.negativeCharge
          ? "The wire segment still follows $I\\vec{L} \\times \\vec{B}$, so its force stays on the opposite side from the negative charge."
          : "Because this charge is positive and the segment points the same way, the charge-force and wire-force directions match.",
    wireForceResultValue:
      snapshot.fieldOrientation === "zero"
        ? `$\\vec{F}_{wire} = (0, 0)$.`
        : `$\\vec{F}_{wire} = (${formatNumber(snapshot.wireForceX)}, ${formatNumber(snapshot.wireForceY)}), \\quad |\\vec{F}_{wire}| = ${formatNumber(snapshot.wireForceMagnitude)}$.`,
    wireForceInterpretation:
      snapshot.fieldOrientation === "zero"
        ? "This is the clean zero-field check: no magnetic field means no magnetic force for either representation."
        : snapshot.negativeCharge
          ? "This is the bridge to current: flipping the sign of a single moving charge reverses only the charge force, not the current-segment rule."
          : "The positive charge and current segment line up here, so the two force arrows point to the same side of the field markers.",
  } satisfies WorkedExampleTokenMap;
}

function resolveRefractionSnellsLawTokens(state: LiveWorkedExampleState) {
  const params = resolveRefractionSnellsLawParams({
    incidentAngle: toNumber(state.params.incidentAngle, 50),
    n1: toNumber(state.params.n1, 1),
    n2: toNumber(state.params.n2, 1.5),
  });
  const snapshot = sampleRefractionSnellsLawState(params);

  return {
    incidentAngleValue: formatNumber(snapshot.incidentAngle),
    n1Value: formatNumber(snapshot.n1),
    n2Value: formatNumber(snapshot.n2),
    sineTargetValue: snapshot.totalInternalReflection
      ? formatNumber((snapshot.n1 / snapshot.n2) * snapshot.sinIncident)
      : formatNumber(snapshot.sinRefracted ?? 0),
    refractedAngleStep: snapshot.totalInternalReflection
      ? "The required sine is larger than 1, so there is no real transmitted angle for this setup."
      : `$\\theta_2 = \\sin^{-1}(${formatNumber(snapshot.sinRefracted ?? 0)}) = ${formatNumber(snapshot.refractedAngle ?? 0)}^\\circ$.`,
    refractedAngleValue:
      snapshot.refractedAngle === null
        ? "none"
        : formatNumber(snapshot.refractedAngle),
    refractedAngleResult: snapshot.totalInternalReflection
      ? "No real transmitted angle"
      : `$\\theta_2 = ${formatNumber(snapshot.refractedAngle ?? 0)}^\\circ$`,
    refractionInterpretation: snapshot.totalInternalReflection
      ? snapshot.criticalAngle === null
        ? "This setup has no real transmitted ray because the required sine exceeds one."
        : `This setup is beyond the critical angle of ${formatNumber(snapshot.criticalAngle)}^\\circ, so it is the clean bridge into total internal reflection.`
      : snapshot.bendDirection === "toward-normal"
        ? "The lower medium is slower, so the transmitted angle is smaller and the ray bends toward the normal."
        : snapshot.bendDirection === "away-from-normal"
          ? "The lower medium is faster, so the transmitted angle opens away from the normal."
          : "Normal incidence keeps both angles at zero even though the speed can still change across the boundary.",
    speedRatioValue: formatNumber(snapshot.speedRatio),
    speedRatioStep:
      snapshot.speedRatio < 1
        ? "Because the ratio is below 1, the lower medium is slower and the ray must bend toward the normal."
        : snapshot.speedRatio > 1
          ? "Because the ratio is above 1, the lower medium is faster and the ray opens away from the normal."
          : "A ratio of 1 means both media have the same speed, so the boundary would not bend the ray at all.",
    speedInterpretation:
      snapshot.speedRatio < 1
        ? "The transmitted medium slows the light, which is why the refracted ray tucks closer to the normal."
        : snapshot.speedRatio > 1
          ? "The transmitted medium is faster, so the refracted ray opens away from the normal."
          : "Equal indices would keep the speed and the direction the same across the boundary.",
    criticalAngleValue:
      snapshot.criticalAngle === null ? "none" : formatNumber(snapshot.criticalAngle),
    criticalAngleResult:
      snapshot.criticalAngle === null
        ? "No critical angle in this travel direction"
        : `$\\theta_c = ${formatNumber(snapshot.criticalAngle)}^\\circ$`,
    criticalAngleInterpretation:
      snapshot.criticalAngle === null
        ? "Because n_1 is not larger than n_2, this direction of travel never reaches a total-internal-reflection cutoff."
        : snapshot.totalInternalReflection
          ? `The current incident angle is ${formatNumber(snapshot.criticalOffset ?? 0)}^\\circ above the critical angle, so the refracted branch has already ended.`
          : `The current incident angle is ${formatNumber(Math.abs(snapshot.criticalOffset ?? 0))}^\\circ below the critical angle, so a real transmitted ray still exists.`,
    criticalOffsetValue:
      snapshot.criticalOffset === null ? "none" : formatNumber(snapshot.criticalOffset),
    criticalOffsetResult:
      snapshot.criticalOffset === null
        ? "No critical-angle comparison"
        : `$\\theta_1 - \\theta_c = ${formatNumber(snapshot.criticalOffset)}^\\circ$`,
    boundaryOutcomeStep:
      snapshot.criticalAngle === null
        ? "Because $n_1 \\le n_2$, this direction of travel has no critical-angle cutoff, so the boundary stays in ordinary refraction."
        : snapshot.totalInternalReflection
          ? `${formatNumber(snapshot.incidentAngle)}^\\circ > ${formatNumber(snapshot.criticalAngle)}^\\circ, so the transmitted-angle solution is no longer real and the ray reflects internally.`
          : `${formatNumber(snapshot.incidentAngle)}^\\circ < ${formatNumber(snapshot.criticalAngle)}^\\circ, so the boundary is still in ordinary refraction and $\\theta_2$ remains real.`,
    boundaryOutcomeResult:
      snapshot.criticalAngle === null
        ? "Ordinary refraction only"
        : snapshot.totalInternalReflection
          ? "Total internal reflection"
          : "Ordinary refraction",
    boundaryOutcomeInterpretation:
      snapshot.criticalAngle === null
        ? "TIR is impossible here because the light is not trying to leave a higher-index medium for a lower-index one."
        : snapshot.totalInternalReflection
          ? `The reflected ray stays in medium 1 at ${formatNumber(snapshot.reflectedAngle ?? snapshot.incidentAngle)}^\\circ from the normal, which is the local event behind fiber-style guidance.`
          : "The transmitted ray is still real, but it is stretching toward 90^\\circ as the setup approaches the critical angle.",
  } satisfies WorkedExampleTokenMap;
}

function resolveLensImagingTokens(state: LiveWorkedExampleState) {
  const params = resolveLensImagingParams({
    converging: state.params.converging !== false,
    focalLength: toNumber(state.params.focalLength, 0.8),
    objectDistance: toNumber(state.params.objectDistance, 2),
    objectHeight: toNumber(state.params.objectHeight, 1),
  });
  const snapshot = sampleLensImagingState(params);
  const reciprocalF = 1 / snapshot.signedFocalLength;
  const reciprocalObject = 1 / snapshot.objectDistance;
  const reciprocalImage = Number.isFinite(snapshot.imageDistance)
    ? 1 / snapshot.imageDistance
    : 0;

  return {
    lensFamilyValue: snapshot.lensFamily,
    signedFocalLengthValue: snapshot.converging
      ? formatNumber(snapshot.focalLength)
      : `-${formatNumber(snapshot.focalLength)}`,
    focalLengthValue: formatNumber(snapshot.focalLength),
    objectDistanceValue: formatNumber(snapshot.objectDistance),
    objectHeightValue: formatNumber(snapshot.objectHeight),
    reciprocalFValue: formatNumber(reciprocalF),
    reciprocalObjectValue: formatNumber(reciprocalObject),
    reciprocalImageValue: formatNumber(reciprocalImage),
    imageDistanceValue: Number.isFinite(snapshot.imageDistance)
      ? formatNumber(snapshot.imageDistance)
      : snapshot.imageDistance > 0
        ? "\\infty"
        : "-\\infty",
    imageHeightValue: Number.isFinite(snapshot.imageHeight)
      ? formatNumber(snapshot.imageHeight)
      : snapshot.imageHeight > 0
        ? "\\infty"
        : "-\\infty",
    magnificationValue: Number.isFinite(snapshot.magnification)
      ? formatNumber(snapshot.magnification)
      : snapshot.magnification > 0
        ? "\\infty"
        : "-\\infty",
    imageDistanceInterpretation: snapshot.imageType === "real"
      ? "The positive image distance means the refracted rays actually meet on the far side of the lens, so the image can be projected onto a screen."
      : "The negative image distance means the refracted rays diverge and only their backward extensions meet, so the image stays virtual on the object side.",
    imageHeightInterpretation:
      snapshot.orientation === "upright"
        ? snapshot.sizeRelation === "larger"
          ? "A positive magnification keeps the image upright, and the magnitude greater than one explains why the virtual image looks enlarged."
          : "A positive magnification keeps the image upright, while a magnitude below one makes the image smaller than the object."
        : snapshot.sizeRelation === "same-size"
          ? "A negative magnification flips the image, and a magnitude near one means the image height matches the object height."
          : snapshot.sizeRelation === "larger"
            ? "A negative magnification flips the image, and the large magnitude explains why the real image grows when the object moves between F and 2F."
            : "A negative magnification flips the image, while a magnitude below one explains the reduced real image you get when the object sits beyond 2F.",
  } satisfies WorkedExampleTokenMap;
}

function resolveMirrorsTokens(state: LiveWorkedExampleState) {
  const params = resolveMirrorsParams({
    curved: state.params.curved !== false,
    concave: state.params.concave !== false,
    focalLength: toNumber(state.params.focalLength, 0.8),
    objectDistance: toNumber(state.params.objectDistance, 2),
    objectHeight: toNumber(state.params.objectHeight, 1),
  });
  const snapshot = sampleMirrorsState(params);
  const reciprocalF = Number.isFinite(snapshot.signedFocalLength)
    ? 1 / snapshot.signedFocalLength
    : 0;
  const reciprocalObject = 1 / snapshot.objectDistance;
  const reciprocalImage = Number.isFinite(snapshot.imageDistance)
    ? 1 / snapshot.imageDistance
    : 0;

  return {
    mirrorFamilyValue: snapshot.mirrorFamily,
    signedFocalLengthValue: !snapshot.curved
      ? "\\infty"
      : snapshot.concave
        ? formatNumber(snapshot.focalLength)
        : `-${formatNumber(snapshot.focalLength)}`,
    focalLengthValue: snapshot.curved ? formatNumber(snapshot.focalLength) : "\\infty",
    objectDistanceValue: formatNumber(snapshot.objectDistance),
    objectHeightValue: formatNumber(snapshot.objectHeight),
    reciprocalFValue: formatNumber(reciprocalF),
    reciprocalObjectValue: formatNumber(reciprocalObject),
    reciprocalImageValue: formatNumber(reciprocalImage),
    imageDistanceValue: Number.isFinite(snapshot.imageDistance)
      ? formatNumber(snapshot.imageDistance)
      : snapshot.imageDistance > 0
        ? "\\infty"
        : "-\\infty",
    imageHeightValue: Number.isFinite(snapshot.imageHeight)
      ? formatNumber(snapshot.imageHeight)
      : snapshot.imageHeight > 0
        ? "\\infty"
        : "-\\infty",
    magnificationValue: Number.isFinite(snapshot.magnification)
      ? formatNumber(snapshot.magnification)
      : snapshot.magnification > 0
        ? "\\infty"
        : "-\\infty",
    imageDistanceInterpretation: snapshot.imageType === "real"
      ? "A positive image distance means the reflected rays really cross in front of the mirror, so the image can be caught on a screen."
      : "A negative image distance means the reflected rays only appear to meet behind the mirror, so the image stays virtual.",
    imageHeightInterpretation:
      snapshot.orientation === "upright"
        ? snapshot.sizeRelation === "larger"
          ? "A positive magnification keeps the image upright, and the magnitude above one explains the enlarged virtual image."
          : snapshot.sizeRelation === "same-size"
            ? "A positive magnification near one keeps the image upright and the same size, which is the plane-mirror result."
            : "A positive magnification keeps the image upright, while a magnitude below one makes the image reduced."
        : snapshot.sizeRelation === "same-size"
          ? "A negative magnification flips the image, and a magnitude near one means the image height matches the object height."
          : snapshot.sizeRelation === "larger"
            ? "A negative magnification flips the image, and the large magnitude explains the enlarged real image from a concave mirror between F and C."
            : "A negative magnification flips the image, while a magnitude below one explains the reduced real image beyond C.",
  } satisfies WorkedExampleTokenMap;
}

function resolveWaveInterferenceTokens(
  state: LiveWorkedExampleState,
  locale: AppLocale = "en",
) {
  const snapshot = sampleWaveInterferenceState(
    {
      amplitudeA: toNumber(state.params.amplitudeA, 1),
      amplitudeB: toNumber(state.params.amplitudeB, 1),
      wavelength: toNumber(state.params.wavelength, 1.6),
      phaseOffset: toNumber(state.params.phaseOffset, 0),
      probeY: toNumber(state.params.probeY, 0),
    },
    state.time,
  );
  const isZhHk = locale === "zh-HK";

  return {
    probeYValue: formatNumber(snapshot.probe.y),
    wavelengthValue: formatNumber(toNumber(state.params.wavelength, 1.6)),
    pathDifferenceValue: formatNumber(snapshot.pathDifference),
    pathDifferenceCyclesValue: formatNumber(snapshot.pathDifferenceInWavelengths),
    phaseOffsetValue: formatNumber(toNumber(state.params.phaseOffset, 0)),
    wrappedPhaseValue: formatNumber(snapshot.wrappedPhaseDifference),
    totalPhaseValue: formatNumber(snapshot.totalPhaseDifference),
    amplitudeAValue: formatNumber(toNumber(state.params.amplitudeA, 1)),
    amplitudeBValue: formatNumber(toNumber(state.params.amplitudeB, 1)),
    resultantAmplitudeValue: formatNumber(snapshot.resultantAmplitude),
    intensityValue: formatNumber(snapshot.normalizedIntensity),
    phaseInterpretation:
      snapshot.interferenceLabel === "constructive"
        ? isZhHk
          ? "相位差接近 2π 的整數倍，所以探針位於明亮區域，兩個到達波互相增強。"
          : "The phase difference is close to a whole-number multiple of 2pi, so the probe sits on a bright region where the two arrivals reinforce."
        : snapshot.interferenceLabel === "destructive"
          ? isZhHk
            ? "相位差接近 π 的奇數倍，所以探針位於暗區域，兩個到達波幾乎互相抵消。"
            : "The phase difference is close to an odd multiple of pi, so the probe sits on a dark region where the two arrivals nearly cancel."
          : isZhHk
            ? "相位差介乎明亮和暗淡極限之間，所以探針只顯示部分增強。"
            : "The phase difference is between the bright and dark limits, so the probe shows only partial reinforcement.",
    amplitudeInterpretation:
      snapshot.interferenceLabel === "destructive" && Math.abs(snapshot.resultantAmplitude) < 0.2
        ? isZhHk
          ? "這接近理想抵消，因為兩個源振幅相近，而且相位差接近 π。"
          : "This is close to ideal cancellation because the two source amplitudes are similar and the phase split is near pi."
        : Math.abs(toNumber(state.params.amplitudeA, 1) - toNumber(state.params.amplitudeB, 1)) > 0.2
          ? isZhHk
            ? "源振幅不相等時，即使相位接近破壞性，仍會留下部分運動。"
            : "Unequal source amplitudes keep some motion alive even when the phase split is close to destructive."
          : isZhHk
            ? "餘弦定律形式顯示，相位和振幅平衡會一起決定探針的最終包絡。"
            : "The law-of-cosines form shows how phase and amplitude balance together to set the final envelope at the probe.",
  } satisfies WorkedExampleTokenMap;
}

function resolveWaveSpeedWavelengthTokens(state: LiveWorkedExampleState) {
  const snapshot = sampleWaveSpeedWavelengthState(
    {
      amplitude: toNumber(state.params.amplitude, 1),
      waveSpeed: toNumber(state.params.waveSpeed, 2.4),
      wavelength: toNumber(state.params.wavelength, 1.6),
      probeX: toNumber(state.params.probeX, 2.4),
    },
    state.time,
  );

  return {
    timeValue: formatNumber(state.time),
    amplitudeValue: formatNumber(snapshot.amplitude),
    waveSpeedValue: formatNumber(snapshot.waveSpeed),
    wavelengthValue: formatNumber(snapshot.wavelength),
    frequencyValue: formatNumber(snapshot.frequency),
    periodValue: formatNumber(snapshot.period),
    probeXValue: formatNumber(snapshot.probeX),
    travelDelayValue: formatNumber(snapshot.travelDelay),
    phaseLagCyclesValue: formatNumber(snapshot.phaseLagCycles),
    phaseLagRadiansValue: formatNumber(snapshot.phaseLagRadians),
    sourceDisplacementValue: formatNumber(snapshot.sourceDisplacement),
    probeDisplacementValue: formatNumber(snapshot.probeDisplacement),
    relationInterpretation:
      snapshot.frequency >= 2
        ? "The wave cycles quickly because each wavelength is launched more often per second, so the period is short while the crest spacing stays fixed by lambda."
        : "The wave cycles more slowly here, so each point waits longer for the next full oscillation and the period stays noticeably longer.",
    delayInterpretation:
      snapshot.phaseAlignmentLabel === "in-phase"
        ? "The probe sits an integer number of wavelengths from the source, so it repeats the same phase after a full-number delay of cycles."
        : snapshot.phaseAlignmentLabel === "opposite-phase"
          ? "The probe is an odd half-number of wavelengths away, so the source and probe are out of phase even though they still share the same frequency."
          : "The probe sits between those simple cases, so it is delayed by a fractional cycle rather than lining up or inverting exactly.",
  } satisfies WorkedExampleTokenMap;
}

function resolveSoundWavesLongitudinalTokens(state: LiveWorkedExampleState) {
  const snapshot = sampleSoundWavesLongitudinalState(
    {
      amplitude: toNumber(state.params.amplitude, 0.12),
      waveSpeed: toNumber(state.params.waveSpeed, 2.4),
      wavelength: toNumber(state.params.wavelength, 1.8),
      probeX: toNumber(state.params.probeX, 2.8),
    },
    state.time,
  );

  return {
    timeValue: formatNumber(state.time),
    amplitudeValue: formatNumber(snapshot.amplitude),
    waveSpeedValue: formatNumber(snapshot.waveSpeed),
    wavelengthValue: formatNumber(snapshot.wavelength),
    frequencyValue: formatNumber(snapshot.frequency),
    periodValue: formatNumber(snapshot.period),
    probeXValue: formatNumber(snapshot.probeX),
    travelDelayValue: formatNumber(snapshot.travelDelay),
    phaseLagCyclesValue: formatNumber(snapshot.phaseLagCycles),
    probeDisplacementValue: formatNumber(snapshot.probeDisplacement),
    normalizedProbeCompressionValue: formatNumber(snapshot.normalizedProbeCompression),
    compressionStrengthValue: formatNumber(snapshot.compressionStrength),
    travelInterpretation:
      snapshot.phaseLagCycles >= 1.4
        ? "The probe sits well downstream, so the same oscillation pattern arrives noticeably later even though each parcel still only jiggles back and forth."
        : "The probe is close enough to the source that the travel delay is short, but the same right-moving disturbance still has to propagate through the medium before the parcel responds.",
    compressionInterpretation:
      snapshot.compressionLabel === "compression"
        ? "The probe parcel is inside a compression, so neighboring parcels are crowded more tightly than average even though each parcel is only displaced a limited distance."
        : snapshot.compressionLabel === "rarefaction"
          ? "The probe parcel is inside a rarefaction, so the local spacing is stretched out even while the disturbance itself keeps moving right."
          : "The probe is between a compression and a rarefaction, so the local spacing is close to the resting medium even though the parcels are still moving.",
  } satisfies WorkedExampleTokenMap;
}

function resolvePitchFrequencyLoudnessTokens(
  state: LiveWorkedExampleState,
  locale: AppLocale = "en",
) {
  const snapshot = sampleSoundWavesLongitudinalState(
    {
      amplitude: toNumber(state.params.amplitude, 0.1),
      waveSpeed: toNumber(state.params.waveSpeed, 2.4),
      frequency: toNumber(state.params.frequency, 1.1),
      probeX: toNumber(state.params.probeX, 2.2),
    },
    state.time,
  );

  const isZhHk = locale === "zh-HK";
  const pitchInterpretation = snapshot.frequency >= 1.45
    ? isZhHk
      ? "這裡的頻率較高，所以聲源循環較快、週期較短，壓縮間距也更緊密。"
      : "The frequency is relatively high here, so the source cycles quickly, the period is short, and the compression spacing is tighter."
    : snapshot.frequency <= 0.9
      ? isZhHk
        ? "這裡的頻率較低，所以每個週期較長，壓縮間距也較寬。"
        : "The frequency is relatively low here, so each cycle takes longer and the compression spacing is wider."
      : isZhHk
        ? "這裡的頻率位於中等範圍，所以音高提示適中，循環時間既不特別慢也不特別快。"
        : "The frequency sits in a middle range here, so the pitch cue is moderate and the cycle timing is neither especially slow nor especially fast.";
  const loudnessInterpretation = snapshot.amplitude >= 0.16
    ? isZhHk
      ? "這裡的振幅較大，所以有界的強度提示較強，聲音會被視為更響；音高仍來自頻率。"
      : "The amplitude is large, so the bounded intensity cue is strong and the sound would be treated as louder even though pitch still comes from frequency."
    : snapshot.amplitude <= 0.08
      ? isZhHk
        ? "這裡的振幅較小，所以即使音高不變，有界的強度提示仍然較弱。"
        : "The amplitude is small, so the bounded intensity cue stays modest even if the pitch is unchanged."
      : isZhHk
        ? "這裡的振幅適中，所以音量提示位於中間，而音高仍然由頻率設定決定。"
        : "The amplitude is moderate, so the loudness cue sits in the middle while pitch still comes from the frequency setting.";

  return {
    waveSpeedValue: formatNumber(snapshot.waveSpeed),
    frequencyValue: formatNumber(snapshot.frequency),
    wavelengthValue: formatNumber(snapshot.wavelength),
    periodValue: formatNumber(snapshot.period),
    amplitudeValue: formatNumber(snapshot.amplitude),
    intensityCueValue: formatNumber(snapshot.intensityCue),
    pitchInterpretation,
    loudnessInterpretation,
  } satisfies WorkedExampleTokenMap;
}

function resolveBeatsTokens(
  state: LiveWorkedExampleState,
  locale: AppLocale = "en",
) {
  const resolved = resolveBeatsParams({
    amplitude: toNumber(state.params.amplitude, 0.12),
    frequencyA: toNumber(state.params.frequencyA, 1),
    frequencyB: toNumber(state.params.frequencyB, 1.12),
  });
  const snapshot = sampleBeatsState(resolved, state.time);
  const isZhHk = locale === "zh-HK";
  const beatPeriodClause = Number.isFinite(snapshot.beatPeriod)
    ? isZhHk
      ? `每個強弱循環約需 ${formatNumber(snapshot.beatPeriod)} s`
      : `each loud-soft cycle takes ${formatNumber(snapshot.beatPeriod)} s`
    : isZhHk
      ? "沒有單獨的拍頻週期"
      : "there is no separate beat period";
  const beatInterpretation = snapshot.beatFrequency <= 0.001
    ? isZhHk
      ? "這裡兩個頻率幾乎相同，所以慢速包絡不再作為單獨拍頻起伏。"
      : "The two frequencies are essentially the same here, so the slow envelope no longer rises and falls as a separate beat."
    : snapshot.beatFrequency <= 0.2
      ? isZhHk
        ? "頻率差很小，所以載波會振盪許多次，慢速音量包絡才完成一個拍頻週期。"
        : "The frequency difference is small, so the carrier oscillates many times before the loudness envelope completes one slow beat cycle."
      : snapshot.beatFrequency >= 0.6
        ? isZhHk
          ? "這裡的頻率差較大，所以包絡脈動較快，簡單的一拍一聽圖像開始變得不那麼清晰。"
          : "The frequency split is larger here, so the envelope pulses quickly and the simple one-beat listening picture is starting to feel less clean."
        : isZhHk
          ? "這組來源足夠接近，可以形成清楚的拍頻包絡，同時仍保留底下較快的載波振盪。"
          : "The source pair is close enough to make a clear beat envelope while still keeping the faster carrier oscillation underneath it.";
  const loudnessInterpretation = snapshot.beatFrequency <= 0.001
    ? isZhHk
      ? "沒有明顯頻率差時，疊加保持穩定包絡，所以音量提示不會來回脈動。"
      : "With no meaningful frequency split, the superposition keeps a steady envelope, so the loudness cue does not pulse in and out."
    : snapshot.loudnessCue >= 0.72
      ? isZhHk
        ? "包絡接近強音脈衝，所以即使單一來源沒有改變振幅，疊加聲音也會暫時變強。"
        : "The envelope is near a loud pulse, so the superposed sound is momentarily strong even though neither single source changed amplitude."
      : snapshot.loudnessCue <= 0.1
        ? isZhHk
          ? "包絡接近安靜間隙，所以即使兩個來源音仍存在，疊加聲音也幾乎消失。"
          : "The envelope is near a quiet gap, so the superposed sound nearly disappears even though both source tones are still present."
        : isZhHk
          ? "包絡位於脈衝峰值和安靜間隙之間，所以音量提示正處於拍頻循環的中段。"
          : "The envelope is between a pulse peak and a quiet gap, so the loudness cue is partway through the beat cycle.";

  return {
    timeValue: formatNumber(state.time),
    amplitudeValue: formatNumber(snapshot.amplitude),
    frequencyAValue: formatNumber(snapshot.frequencyA),
    frequencyBValue: formatNumber(snapshot.frequencyB),
    averageFrequencyValue: formatNumber(snapshot.averageFrequency),
    frequencyDifferenceValue: formatNumber(snapshot.frequencyDifference),
    beatFrequencyValue: formatNumber(snapshot.beatFrequency),
    beatPeriodValue: Number.isFinite(snapshot.beatPeriod)
      ? formatNumber(snapshot.beatPeriod)
      : "steady",
    beatPeriodClause,
    envelopeAmplitudeValue: formatNumber(snapshot.envelopeAmplitude),
    envelopeRatioValue: formatNumber(snapshot.envelopeRatio),
    loudnessCueValue: formatNumber(snapshot.loudnessCue),
    beatInterpretation,
    loudnessInterpretation,
  } satisfies WorkedExampleTokenMap;
}

function resolveDopplerEffectTokens(
  state: LiveWorkedExampleState,
  locale?: AppLocale,
) {
  const snapshot = sampleDopplerEffectState(
    {
      sourceFrequency: toNumber(state.params.sourceFrequency, 1.1),
      sourceSpeed: toNumber(state.params.sourceSpeed, 0.45),
      observerSpeed: toNumber(state.params.observerSpeed, 0),
      observerAhead: state.params.observerAhead !== false,
    },
    state.time,
  );
  const spacingRelation = snapshot.observerAhead
    ? "\\lambda_{ahead} = \\dfrac{v_{wave} - v_s}{f_s}"
    : "\\lambda_{behind} = \\dfrac{v_{wave} + v_s}{f_s}";
  const observedRelation = snapshot.observerAhead
    ? "f_{obs} = f_s\\dfrac{v_{wave} + v_o}{v_{wave} - v_s}"
    : "f_{obs} = f_s\\dfrac{v_{wave} + v_o}{v_{wave} + v_s}";
  const zhHk = isZhHkLocale(locale);
  const sideLabelValue = zhHk
    ? snapshot.observerAhead
      ? "前方"
      : "後方"
    : snapshot.observerSideLabel;
  const selectedSpacingLabelValue = zhHk
    ? snapshot.observerAhead
      ? "前方間距"
      : "後方間距"
    : snapshot.selectedSpacingLabel;

  return {
    waveSpeedValue: formatNumber(snapshot.waveSpeed),
    sourceFrequencyValue: formatNumber(snapshot.sourceFrequency),
    sourceSpeedValue: formatNumber(snapshot.sourceSpeed),
    observerSpeedValue: formatNumber(snapshot.observerSpeed),
    sideLabelValue,
    sourcePeriodValue: formatNumber(snapshot.sourcePeriod),
    frontSpacingValue: formatNumber(snapshot.frontSpacing),
    backSpacingValue: formatNumber(snapshot.backSpacing),
    selectedSpacingValue: formatNumber(snapshot.selectedSpacing),
    selectedSpacingName: snapshot.observerAhead ? "\\lambda_{ahead}" : "\\lambda_{behind}",
    selectedSpacingLabelValue,
    spacingRelation,
    observedRelation,
    observedFrequencyValue: formatNumber(snapshot.observedFrequency),
    observedPeriodValue: formatNumber(snapshot.observedPeriod),
    pitchRatioValue: formatNumber(snapshot.pitchRatio),
    spacingInterpretation:
      snapshot.sourceSpeed <= 0.08
        ? zhHk
          ? "聲源幾乎靜止時，前方與後方間距都接近同一個靜止波長，設定會回到接近非多普勒的情況。"
          : "With the source almost stationary, the front and rear spacings stay close to the same rest wavelength and the setup collapses back toward the non-Doppler case."
        : zhHk
          ? "聲源在兩次發射之間向前移動，所以前方波前被壓縮，後方波前則被拉長。"
          : "The source moves forward between emissions, so the front wavefront spacing is compressed while the rear spacing stretches.",
    pitchInterpretation:
      snapshot.pitchShiftLabel === "higher"
        ? zhHk
          ? "觀察者遇到波峰的速度比聲源發射波峰更快，所以聽到的音高高於發射音。"
          : "The observer is meeting crests faster than the source emits them, so the heard pitch is higher than the emitted tone."
        : snapshot.pitchShiftLabel === "lower"
          ? zhHk
            ? "觀察者遇到波峰的頻率低於聲源發射波峰的頻率，所以聽到的音高會低於發射音。"
            : "The observer is encountering crests less often than the source emits them, so the heard pitch drops below the emitted tone."
          : zhHk
            ? "這裡的到達節奏接近發射節奏，所以聽到的音高接近原本的發射音。"
            : "The arrival timing is close to the emission timing here, so the heard pitch stays close to the emitted tone.",
  } satisfies WorkedExampleTokenMap;
}

function resolveElectromagneticWavesTokens(state: LiveWorkedExampleState) {
  const snapshot = sampleElectromagneticWavesState(
    {
      electricAmplitude: toNumber(state.params.electricAmplitude, 1.2),
      waveSpeed: toNumber(state.params.waveSpeed, 2.8),
      wavelength: toNumber(state.params.wavelength, 1.8),
      probeX: toNumber(state.params.probeX, 2.7),
    },
    state.time,
  );

  return {
    timeValue: formatNumber(state.time),
    electricAmplitudeValue: formatNumber(snapshot.electricAmplitude),
    waveSpeedValue: formatNumber(snapshot.waveSpeed),
    wavelengthValue: formatNumber(snapshot.wavelength),
    probeXValue: formatNumber(snapshot.probeX),
    frequencyValue: formatNumber(snapshot.frequency),
    periodValue: formatNumber(snapshot.period),
    travelDelayValue: formatNumber(snapshot.travelDelay),
    phaseLagCyclesValue: formatNumber(snapshot.phaseLagCycles),
    phaseCyclesValue: formatNumber(snapshot.phaseLagCycles),
    sourceElectricFieldValue: formatNumber(snapshot.sourceElectricField),
    electricFieldValue: formatNumber(snapshot.electricField),
    magneticFieldValue: formatNumber(snapshot.magneticField),
    electricDirectionText: snapshot.electricDirectionLabel,
    magneticDirectionText: snapshot.magneticDirectionLabel,
    fieldPairInterpretation:
      snapshot.electricDirectionLabel === "near zero"
        ? "The probe is near a local zero crossing, so both fields are small together rather than one lagging behind the other."
        : snapshot.electricDirectionLabel === "up"
          ? "The electric field is positive here, so the paired magnetic field is also positive and the local triad still points right."
          : "The electric field is negative here, so the paired magnetic field is negative too and the local triad still points right.",
    delayInterpretation:
      snapshot.phaseAlignmentLabel === "in-phase"
        ? "The probe sits an integer number of wavelengths from the source, so it repeats the same phase after a whole-number cycle delay."
        : snapshot.phaseAlignmentLabel === "opposite-phase"
          ? "The probe sits an odd half-number of wavelengths from the source, so the downstream field flips sign relative to the source at the same instant."
          : "The probe sits between those simple cases, so the source and probe stay related by a fractional cycle of lag rather than a full match or full inversion.",
  } satisfies WorkedExampleTokenMap;
}

function resolveMaxwellEquationsSynthesisTokens(state: LiveWorkedExampleState) {
  const snapshot = sampleMaxwellEquationsSynthesisState(
    {
      chargeSource: toNumber(state.params.chargeSource, 1.1),
      conductionCurrent: toNumber(state.params.conductionCurrent, 0.7),
      electricChangeRate: toNumber(state.params.electricChangeRate, 0.9),
      magneticChangeRate: toNumber(state.params.magneticChangeRate, 0.9),
      cycleRate: toNumber(state.params.cycleRate, 0.85),
    },
    state.time,
  );
  const electricFluxDirectionText =
    snapshot.electricFluxDirection === "outward"
      ? "outward"
      : snapshot.electricFluxDirection === "inward"
        ? "inward"
        : "balanced";
  const chargeSignText =
    snapshot.chargeSignLabel === "positive"
      ? "positive"
      : snapshot.chargeSignLabel === "negative"
        ? "negative"
        : "neutral";
  const ampereBalanceText = snapshot.ampereBalanceLabel.replace("-", " ");
  const waveCueLabelText =
    snapshot.waveStateLabel === "strong"
      ? "strong light cue"
      : snapshot.waveStateLabel === "partial"
        ? "partial light cue"
        : snapshot.waveStateLabel === "misaligned"
          ? "misaligned field cue"
          : "no light cue";
  const fieldAlignmentText = snapshot.alignedFieldPair ? "aligned" : "not aligned";

  return {
    timeValue: formatNumber(state.time),
    chargeSourceValue: formatNumber(snapshot.chargeSource),
    chargeSignText,
    electricFluxValue: formatNumber(snapshot.electricFlux),
    electricFluxDirectionText,
    magneticNetFluxValue: formatNumber(snapshot.magneticNetFlux),
    closedLoopStrengthValue: formatNumber(snapshot.closedLoopStrength),
    conductionCurrentValue: formatNumber(snapshot.bCurrentContribution),
    electricChangeInstantValue: formatNumber(snapshot.electricChangeInstant),
    magneticFluxChangeValue: formatNumber(snapshot.magneticFluxChange),
    bCirculationValue: formatNumber(snapshot.bCirculation),
    eCirculationValue: formatNumber(snapshot.eCirculation),
    cycleRateValue: formatNumber(snapshot.cycleRate),
    ampereBalanceText,
    waveCueValue: formatNumber(snapshot.waveCueMagnitude),
    waveCueLabelText,
    fieldAlignmentText,
    gaussInterpretation:
      snapshot.chargeSignLabel === "positive"
        ? "Positive enclosed charge sets an outward net electric source term, while the magnetic-flux law still stays at zero because magnetic lines close back on themselves."
        : snapshot.chargeSignLabel === "negative"
          ? "Negative enclosed charge sets an inward net electric source term, but the magnetic-flux law still stays at zero because the magnetic pattern remains closed."
          : "With no enclosed charge, the electric source term is neutral even though the magnetic pattern can still show strong local loops without creating net magnetic flux.",
    circulationInterpretation:
      snapshot.waveStateLabel === "strong"
        ? "Both changing-field terms are active and aligned, so the circulation laws reinforce a clear light-like bridge instead of acting like isolated local responses."
        : snapshot.waveStateLabel === "partial"
          ? "Both circulation laws are active, but one of the changing-field terms is still too modest to make the bridge feel fully developed."
          : snapshot.waveStateLabel === "misaligned"
            ? "The loop laws are still active, but the changing-field signs are no longer reinforcing each other, so the bridge cue weakens into a misaligned state."
            : "Without both changing-field terms active together, the loop laws remain local responses and the bridge cue collapses.",
  } satisfies WorkedExampleTokenMap;
}

function resolveLightSpectrumLinkageTokens(state: LiveWorkedExampleState) {
  const snapshot = sampleLightSpectrumLinkageState(
    {
      fieldAmplitude: toNumber(state.params.fieldAmplitude, 1.05),
      logWavelength: toNumber(state.params.logWavelength, -6.27),
      mediumIndex: toNumber(state.params.mediumIndex, 1),
      probeCycles: toNumber(state.params.probeCycles, 1),
    },
    state.time,
  );
  const lightLabel = snapshot.isVisible
    ? `${snapshot.visibleColorLabel} visible light`
    : snapshot.bandLabel.toLowerCase();

  return {
    logWavelengthValue: formatNumber(snapshot.logWavelength),
    vacuumWavelengthValue: formatSpectrumWavelength(snapshot.vacuumWavelengthMeters),
    bandLabelValue: snapshot.bandLabel,
    lightLabelValue: lightLabel,
    frequencyValue: formatSpectrumFrequency(snapshot.frequencyHz),
    mediumIndexValue: formatNumber(snapshot.mediumIndex),
    probeCyclesValue: formatNumber(snapshot.probeCycles),
    mediumWavelengthValue: formatSpectrumWavelength(snapshot.mediumWavelengthMeters),
    probeDistanceValue: formatSpectrumWavelength(snapshot.probeDistanceMeters),
    phaseVelocityValue: formatSpeedFractionOfC(snapshot.phaseVelocityFractionC),
    travelDelayValue: `${formatNumber(snapshot.travelDelaySeconds)} s`,
    spectrumInterpretation: snapshot.isVisible
      ? `The marker is inside the visible window, so this wavelength is ${snapshot.visibleColorLabel} light even though the underlying E and B pairing is the same electromagnetic-wave story.`
      : `The marker has moved into ${snapshot.bandLabel.toLowerCase()}, so the visible-color cue drops away while wavelength and frequency still describe the same traveling electromagnetic wave.`,
    mediumInterpretation:
      snapshot.mediumIndex > 1.05
        ? `The source frequency stays ${formatSpectrumFrequency(snapshot.frequencyHz)}, but the higher index lowers the speed to ${formatSpeedFractionOfC(snapshot.phaseVelocityFractionC)} and shortens the in-medium crest spacing to ${formatSpectrumWavelength(snapshot.mediumWavelengthMeters)}.`
        : `With n near 1, the medium wavelength stays close to the vacuum wavelength, so the probe delay mostly reads as a one-wave travel story rather than a strong compression effect.`,
  } satisfies WorkedExampleTokenMap;
}

function resolveDispersionRefractiveIndexColorTokens(state: LiveWorkedExampleState) {
  const params = resolveDispersionRefractiveIndexColorParams({
    wavelengthNm: toNumber(state.params.wavelengthNm, 550),
    referenceIndex: toNumber(state.params.referenceIndex, 1.52),
    dispersionStrength: toNumber(state.params.dispersionStrength, 0.02),
    prismAngle: toNumber(state.params.prismAngle, 18),
  });
  const snapshot = sampleDispersionRefractiveIndexColorState(params);
  const ratioTerm = (550 / Math.max(snapshot.wavelengthNm, 1e-6)) ** 2 - 1;

  return {
    wavelengthValue: formatNumber(snapshot.wavelengthNm),
    referenceIndexValue: formatNumber(snapshot.referenceIndex),
    dispersionStrengthValue: formatNumber(snapshot.dispersionStrength),
    ratioTermValue: formatNumber(ratioTerm),
    selectedIndexValue: formatNumber(snapshot.selectedIndex),
    selectedDeviationValue: formatNumber(snapshot.selectedDeviationAngle),
    prismAngleValue: formatNumber(snapshot.prismAngle),
    speedFractionValue: formatNumber(snapshot.speedFractionC),
    colorLabelValue: snapshot.selectedColorLabel,
    redIndexValue: formatNumber(snapshot.red.index),
    redDeviationValue: formatNumber(snapshot.red.deviationAngle),
    violetIndexValue: formatNumber(snapshot.violet.index),
    violetDeviationValue: formatNumber(snapshot.violet.deviationAngle),
    spreadValue: formatNumber(snapshot.spreadAngle),
    indexInterpretation:
      snapshot.dispersionStrength <= 0.0005
        ? "With D near zero, the selected refractive index stays almost locked to the reference value, so visible colors would share almost the same path."
        : `At ${formatNumber(snapshot.wavelengthNm)} nm, the current ${snapshot.selectedColorLabel} ray uses n(lambda) = ${formatNumber(snapshot.selectedIndex)}, so the thin-prism bend is larger than red but smaller than violet in the same material.`,
    spreadInterpretation:
      snapshot.dispersionStrength <= 0.0005
        ? "The red and violet deviations are almost identical here, so the outgoing fan collapses into one nearly single-color path even though the prism still bends the beam."
        : `The same prism sends violet out by about ${formatNumber(snapshot.spreadAngle)}^\\circ more than red, because shorter wavelengths use the larger refractive index in this bounded model.`,
  } satisfies WorkedExampleTokenMap;
}

function resolvePolarizationTokens(state: LiveWorkedExampleState) {
  const snapshot = samplePolarizationState(
    resolvePolarizationParams({
      inputAmplitude: toNumber(state.params.inputAmplitude, 1.1),
      inputAngle: toNumber(state.params.inputAngle, 20),
      polarizerAngle: toNumber(state.params.polarizerAngle, 50),
      unpolarized: state.params.unpolarized === true,
    }),
  );

  const transmittedPercentValue = `${formatNumber(
    snapshot.transmittedIntensityFraction * 100,
    1,
  )}%`;
  const blockedPercentValue = `${formatNumber(snapshot.blockedIntensityFraction * 100, 1)}%`;
  const outputAngleValue = formatMeasurement(snapshot.outputAngle, "deg");
  const blockedAngleValue = formatMeasurement(snapshot.blockedAngle, "deg");

  return {
    inputStateValue: snapshot.inputStateLabel,
    inputAngleValue: snapshot.unpolarized
      ? "mixed"
      : formatMeasurement(snapshot.inputAngle, "deg"),
    polarizerAngleValue: formatMeasurement(snapshot.polarizerAngle, "deg"),
    angleDifferenceValue: snapshot.unpolarized
      ? "not fixed"
      : formatMeasurement(snapshot.angleDifference, "deg"),
    transmittedFieldValue: formatMeasurement(snapshot.transmittedFieldAmplitude, "arb."),
    blockedFieldValue: formatMeasurement(snapshot.blockedFieldAmplitude, "arb."),
    transmittedIntensityValue: formatNumber(snapshot.transmittedIntensityFraction),
    blockedIntensityValue: formatNumber(snapshot.blockedIntensityFraction),
    transmittedIntensityPercentValue: transmittedPercentValue,
    blockedIntensityPercentValue: blockedPercentValue,
    outputAngleValue,
    blockedAngleValue,
    outputStateValue: snapshot.outputStateLabel,
    projectionStepText: snapshot.unpolarized
      ? "Because the incoming orientations are mixed, one ideal first polarizer still sends out light aligned with its own axis and averages the detector fraction to one half."
      : `The axis keeps only the cosine projection of the input, so the transmitted field follows the current ${snapshot.projectionLabel} case.`,
    blockedStepText: snapshot.unpolarized
      ? "The rest of the random orientations average into the blocked half of the intensity."
      : `The perpendicular component along ${blockedAngleValue} is rejected, so the blocked share is the part not aligned with the axis.`,
    outputInterpretation: snapshot.unpolarized
      ? `This is the bounded polarization signature of a transverse wave: one ideal polarizer turns a mixed input into linearly polarized light along ${outputAngleValue} while keeping the detector fraction near one half.`
      : snapshot.angleDifference >= 82
        ? `The input and axis are nearly crossed, so the detector is almost dark even though the small transmitted piece still leaves aligned with ${outputAngleValue}.`
        : snapshot.angleDifference <= 8
          ? `The input is already nearly aligned with the axis, so almost all of the incoming intensity survives and the output orientation barely needs to change.`
          : `The input is only partly aligned with the axis, so the detector reads a partial transmission and the output is reset to ${outputAngleValue}.`,
    blockedInterpretation: snapshot.unpolarized
      ? "Unpolarized light does not start with one preferred axis, so the filter creates that axis while discarding half the intensity on average."
      : snapshot.angleDifference >= 82
        ? "A nearly crossed axis removes almost the whole incoming field because a transverse oscillation can have almost no component along the polarizer direction."
        : `The blocked share stays tied to the transverse component perpendicular to the axis, so comparing ${transmittedPercentValue} transmitted with ${blockedPercentValue} blocked is an orientation story rather than a time-delay story.`,
  } satisfies WorkedExampleTokenMap;
}

function resolveDiffractionTokens(state: LiveWorkedExampleState) {
  const params = resolveDiffractionParams({
    wavelength: toNumber(state.params.wavelength, 1),
    slitWidth: toNumber(state.params.slitWidth, 2.4),
    probeY: toNumber(state.params.probeY, 0),
  });
  const snapshot = sampleDiffractionState(params, state.time);

  return {
    slitWidthValue: formatNumber(params.slitWidth),
    wavelengthValue: formatNumber(params.wavelength),
    wavelengthToSlitRatioValue: formatNumber(snapshot.wavelengthToSlitRatio),
    firstMinimumStep:
      snapshot.firstMinimumAngleDeg === null
        ? `Because lambda / a = ${formatNumber(snapshot.wavelengthToSlitRatio)} is at least 1, the first-minimum condition would require a sine larger than 1, so there is no finite first minimum in this bounded model.`
        : `$\\theta_1 = \\sin^{-1}(${formatNumber(snapshot.wavelengthToSlitRatio)}) = ${formatNumber(snapshot.firstMinimumAngleDeg)}^\\circ$.`,
    firstMinimumResult:
      snapshot.firstMinimumAngleDeg === null
        ? "No finite first minimum"
        : `$\\theta_1 = ${formatNumber(snapshot.firstMinimumAngleDeg)}^\\circ$`,
    spreadInterpretation:
      snapshot.firstMinimumAngleDeg === null
        ? "The opening is now comparable to the wavelength, so the central peak is extremely broad and a finite first dark point no longer appears."
        : `The first minimum sits about ${formatNumber(snapshot.firstMinimumAngleDeg)}^\\circ from the center, so the central peak spans roughly ${formatNumber(snapshot.centralPeakWidth ?? 0)} m on the screen.`,
    probeYValue: formatNumber(snapshot.probe.y),
    edgePathDifferenceValue: formatNumber(snapshot.edgePathDifference),
    betaValue: formatNumber(snapshot.beta),
    intensityValue: formatNumber(snapshot.normalizedIntensity),
    probeIntensityStep:
      snapshot.normalizedIntensity <= 0.08
        ? "This point is near a diffraction minimum, so the local envelope almost collapses."
        : snapshot.normalizedIntensity >= 0.75
          ? "This point still sits inside a bright part of the central peak, so the local envelope remains strong."
          : "This point sits between the central peak and a dark band, so the local intensity is only partial.",
    probeIntensityInterpretation:
      snapshot.normalizedIntensity <= 0.08
        ? `The edge-path split is about ${formatNumber(snapshot.edgePathDifferenceInWavelengths)} wavelengths, which is why this probe point is nearly dark.`
        : `The edge-path split is ${formatNumber(snapshot.edgePathDifferenceInWavelengths)} wavelengths, so the point is not yet at a full diffraction minimum.`,
  } satisfies WorkedExampleTokenMap;
}

function resolveOpticalResolutionTokens(state: LiveWorkedExampleState) {
  const params = resolveOpticalResolutionParams({
    wavelengthNm: toNumber(state.params.wavelengthNm, 550),
    apertureMm: toNumber(state.params.apertureMm, 2.4),
    separationMrad: toNumber(state.params.separationMrad, 0.32),
    probeYUm: toNumber(state.params.probeYUm, 0),
  });
  const snapshot = sampleOpticalResolutionState(params);

  return {
    wavelengthNmValue: formatMeasurement(snapshot.wavelengthNm, "nm"),
    apertureMmValue: formatMeasurement(snapshot.apertureMm, "mm"),
    rayleighLimitMradValue: formatMeasurement(snapshot.rayleighLimitMrad, "mrad"),
    airyRadiusUmValue: formatMeasurement(snapshot.airyRadiusUm, "um"),
    separationMradValue: formatMeasurement(snapshot.separationMrad, "mrad"),
    imageSeparationUmValue: formatMeasurement(snapshot.imageSeparationUm, "um"),
    separationRatioValue: formatNumber(snapshot.separationRatio),
    thresholdStepText: `\\theta_R \\approx 1.22 \\dfrac{${formatMeasurement(snapshot.wavelengthNm, "nm")}}{${formatMeasurement(snapshot.apertureMm, "mm")}} = ${formatMeasurement(snapshot.rayleighLimitMrad, "mrad")}.`,
    imagePlaneStepText: `With the fixed focal length, the same limit maps to an image-plane blur radius of ${formatMeasurement(snapshot.airyRadiusUm, "um")}.`,
    thresholdInterpretation:
      snapshot.rayleighResolvedFlag
        ? `The current pair is at or above the Rayleigh threshold, so the detector profile can sustain a visible dip between the peaks.`
        : `The current pair is still below the Rayleigh threshold, so the two point-spread patterns overlap enough to keep the detector profile mostly merged.`,
    ratioStepText: `The separation ratio is $\\Delta \\theta / \\theta_R = ${formatMeasurement(snapshot.separationMrad, "mrad")} / ${formatMeasurement(snapshot.rayleighLimitMrad, "mrad")} = ${formatNumber(snapshot.separationRatio)}$.`,
    dipStepText: `The combined profile keeps a center-to-peak ratio of ${formatNumber(snapshot.centerDipRatio)} in the current live state.`,
    ratioInterpretation:
      snapshot.resolutionLabel === "merged"
        ? "Because the ratio is still well below 1, the central saddle has mostly filled in and the pair reads as one broad blur."
        : snapshot.resolutionLabel === "threshold"
          ? "Because the ratio is close to 1, the pair is right at the imaging threshold where the dip is just beginning to appear."
          : "Because the ratio is safely above 1, the finite-aperture blur from one point no longer hides the second peak.",
  } satisfies WorkedExampleTokenMap;
}

function resolveDoubleSlitInterferenceTokens(state: LiveWorkedExampleState) {
  const params = resolveDoubleSlitInterferenceParams({
    wavelength: toNumber(state.params.wavelength, 0.78),
    slitSeparation: toNumber(state.params.slitSeparation, 2.6),
    screenDistance: toNumber(state.params.screenDistance, 5.4),
    probeY: toNumber(state.params.probeY, 0),
  });
  const snapshot = sampleDoubleSlitInterferenceState(params, state.time);

  return {
    wavelengthValue: formatNumber(params.wavelength),
    slitSeparationValue: formatNumber(params.slitSeparation),
    screenDistanceValue: formatNumber(params.screenDistance),
    probeYValue: formatNumber(snapshot.probe.y),
    pathDifferenceValue: formatNumber(Math.abs(snapshot.pathDifference)),
    pathDifferenceWavelengthsValue: formatNumber(snapshot.pathDifferenceInWavelengths),
    phaseDifferenceValue: formatNumber(Math.abs(snapshot.wrappedPhaseDifference)),
    fringeSpacingValue: formatNumber(snapshot.fringeSpacing),
    firstDarkValue: formatNumber(snapshot.firstDarkYApprox),
    normalizedIntensityValue: formatNumber(snapshot.normalizedIntensity),
    phaseInterpretation:
      snapshot.interferenceLabel === "bright"
        ? "The path difference is close to a whole wavelength count, so the two slit contributions reinforce and the probe sits on a bright fringe."
        : snapshot.interferenceLabel === "dark"
          ? "The path difference is close to half a wavelength, so the slit contributions arrive nearly opposite in phase and the probe sits on a dark fringe."
          : "The path difference is between the bright and dark conditions, so the probe sits on a partial fringe rather than an extreme.",
    spacingInterpretation:
      snapshot.spacingLabel === "wide"
        ? "The current geometry makes lambda L / d fairly large, so neighboring bright fringes sit far apart on the screen."
        : snapshot.spacingLabel === "tight"
          ? "The current geometry keeps lambda L / d small, so bright and dark fringes pack tightly together."
          : "The current geometry gives a moderate lambda L / d value, so the bright fringes are separated clearly without spreading to the screen edges.",
  } satisfies WorkedExampleTokenMap;
}

function resolvePhotoelectricEffectTokens(state: LiveWorkedExampleState) {
  const snapshot = samplePhotoelectricEffectState(
    {
      frequencyPHz: toNumber(state.params.frequencyPHz, 0.95),
      intensity: toNumber(state.params.intensity, 1),
      workFunctionEv: toNumber(state.params.workFunctionEv, 2.3),
      collectorVoltage: toNumber(state.params.collectorVoltage, 0.4),
    },
    state.time,
  );
  const emissionOutcome = snapshot.aboveThreshold
    ? "emission occurs"
    : "no emission occurs";

  return {
    frequencyValue: formatMeasurement(snapshot.frequencyPHz, "PHz"),
    wavelengthValue: formatMeasurement(snapshot.wavelengthNm, "nm"),
    workFunctionValue: formatMeasurement(snapshot.workFunctionEv, "eV"),
    photonEnergyValue: formatMeasurement(snapshot.photonEnergyEv, "eV"),
    thresholdFrequencyValue: formatMeasurement(snapshot.thresholdFrequencyPHz, "PHz"),
    maxKineticValue: formatMeasurement(snapshot.maxKineticEnergyEv, "eV"),
    emissionOutcome,
    collectorVoltageValue: formatMeasurement(snapshot.collectorVoltage, "V"),
    stoppingPotentialValue: formatMeasurement(snapshot.stoppingPotential, "V"),
    collectorAssistText: snapshot.collectorAssistLabel,
    saturationCurrentValue: formatMeasurement(snapshot.saturationCurrent, "arb."),
    collectorCurrentValue: formatMeasurement(snapshot.collectorCurrent, "arb."),
    energyInterpretation: snapshot.aboveThreshold
      ? `Because $hf = ${formatMeasurement(snapshot.photonEnergyEv, "eV")}$ exceeds the work function ${formatMeasurement(snapshot.workFunctionEv, "eV")}, electrons leave the surface with a maximum kinetic energy of ${formatMeasurement(snapshot.maxKineticEnergyEv, "eV")}.`
      : `Because $hf = ${formatMeasurement(snapshot.photonEnergyEv, "eV")}$ is still below the work function ${formatMeasurement(snapshot.workFunctionEv, "eV")}, the beam remains below threshold and no electrons are emitted.`,
    stoppingInterpretation: snapshot.aboveThreshold
      ? snapshot.collectorCurrent <= 0.02
        ? `The retarding field is essentially at the stopping point, so the collector current has been trimmed to almost zero while the surface energy budget still says $V_{stop} = ${formatMeasurement(snapshot.stoppingPotential, "V")}$.`
        : `The collector current is still nonzero because the applied bias ${formatMeasurement(snapshot.collectorVoltage, "V")} has not yet fully reached the stopping potential ${formatMeasurement(snapshot.stoppingPotential, "V")}.`
      : "With no emitted electrons, both the stopping potential and the collected current stay at zero in this bounded model.",
  } satisfies WorkedExampleTokenMap;
}

function resolveAtomicSpectraTokens(state: LiveWorkedExampleState) {
  const snapshot = sampleAtomicSpectraState(
    {
      gap12Ev: toNumber(state.params.gap12Ev, 1.9),
      gap23Ev: toNumber(state.params.gap23Ev, 2.6),
      gap34Ev: toNumber(state.params.gap34Ev, 2.7),
      absorptionMode: state.params.absorptionMode === true,
    },
    state.time,
  );
  const line21 = snapshot.transitions.find((transition) => transition.id === "2-1");
  const line32 = snapshot.transitions.find((transition) => transition.id === "3-2");
  const line41 = snapshot.transitions.find((transition) => transition.id === "4-1");

  return {
    gap21Value: formatMeasurement(snapshot.gap12Ev, "eV"),
    gap32Value: formatMeasurement(snapshot.gap23Ev, "eV"),
    gap43Value: formatMeasurement(snapshot.gap34Ev, "eV"),
    line21WavelengthValue: formatMeasurement(line21?.wavelengthNm ?? 0, "nm"),
    line32WavelengthValue: formatMeasurement(line32?.wavelengthNm ?? 0, "nm"),
    line41EnergyValue: formatMeasurement(line41?.energyEv ?? 0, "eV"),
    line41WavelengthValue: formatMeasurement(line41?.wavelengthNm ?? 0, "nm"),
    modeLabelValue: snapshot.modeLabel,
    appearanceLabelValue: snapshot.absorptionMode ? "a dark absorption notch" : "a bright emission line",
    visibleLineCountValue: formatNumber(snapshot.visibleLineCount),
    longestVisibleWavelengthValue:
      snapshot.longestVisibleWavelengthNm !== null
        ? formatMeasurement(snapshot.longestVisibleWavelengthNm, "nm")
        : "none",
    shortestVisibleWavelengthValue:
      snapshot.shortestVisibleWavelengthNm !== null
        ? formatMeasurement(snapshot.shortestVisibleWavelengthNm, "nm")
        : "none",
    visiblePatternInterpretation:
      snapshot.visibleLineCount >= 2
        ? `The current lower-level gaps create at least two visible lines, and the smaller gap ${formatMeasurement(snapshot.gap12Ev, "eV")} lands at the longer visible wavelength ${snapshot.longestVisibleWavelengthNm !== null ? formatMeasurement(snapshot.longestVisibleWavelengthNm, "nm") : "none"}.`
        : "Most of the current transitions have shifted out of the visible band, so the ladder is still discrete but fewer lines remain visible.",
    modeInterpretation: snapshot.absorptionMode
      ? `Switching to absorption keeps the same allowed wavelengths, so the ${formatMeasurement(line41?.wavelengthNm ?? 0, "nm")} line stays in the same place but appears as a missing slice in the continuum instead of a bright peak.`
      : `In emission mode the same level differences show up as bright lines, so ${formatMeasurement(line41?.wavelengthNm ?? 0, "nm")} appears because the full ${formatMeasurement(line41?.energyEv ?? 0, "eV")} gap can release one photon.`,
  } satisfies WorkedExampleTokenMap;
}

function resolveDeBroglieMatterWavesTokens(state: LiveWorkedExampleState) {
  const snapshot = sampleDeBroglieMatterWavesState({
    massMultiple: toNumber(state.params.massMultiple, 1),
    speedMms: toNumber(state.params.speedMms, 2.2),
  });

  return {
    massMultipleValue: formatNumber(snapshot.massMultiple),
    speedValue: formatNumber(snapshot.speedMms),
    momentumValue: formatNumber(snapshot.momentumScaled),
    wavelengthValue: formatNumber(snapshot.wavelengthNm),
    loopCircumferenceValue: formatNumber(snapshot.loopCircumferenceNm),
    fitCountValue: formatNumber(snapshot.fitCount),
    nearestFitValue: formatNumber(snapshot.nearestWholeFit),
    fitMismatchValue: formatNumber(snapshot.fitErrorAbs),
    wavelengthInterpretation:
      snapshot.momentumScaled >= 3.2
        ? "The momentum is fairly large here, so the wavelength has become short enough that multiple cycles can fit around a small loop."
        : "The momentum is still modest here, so the wavelength stays comparatively long and the local spacing remains easy to see on the strip.",
    fitInterpretation:
      snapshot.isNearWholeNumberFit
        ? `This setting is close to a whole-number fit, so about ${formatNumber(snapshot.nearestWholeFit)} wavelengths close the loop seam cleanly.`
        : snapshot.fitCount < 1
          ? "The wavelength is longer than the fixed loop, so the pattern cannot yet complete even one full cycle around the path."
          : "The loop count sits between whole numbers here, so the wrapped pattern misses a clean seam match even though the local wavelength is well defined.",
  } satisfies WorkedExampleTokenMap;
}

function resolveBohrModelTokens(state: LiveWorkedExampleState, locale?: AppLocale) {
  const snapshot = sampleBohrModelState(
    {
      upperLevel: toNumber(state.params.upperLevel, 3),
      lowerLevel: toNumber(state.params.lowerLevel, 2),
      excitationMode: state.params.excitationMode === true,
    },
    state.time,
  );
  const zhHk = isZhHkLocale(locale);
  const activeLabel = zhHk
    ? snapshot.excitationMode
      ? `n = ${formatNumber(snapshot.lowerLevel)} → ${formatNumber(snapshot.upperLevel)} 激發`
      : `n = ${formatNumber(snapshot.upperLevel)} → ${formatNumber(snapshot.lowerLevel)} 發射`
    : snapshot.excitationMode
      ? snapshot.activeTransition.excitationLabel
      : snapshot.activeTransition.emissionLabel;
  const visibleColorLabel = snapshot.activeTransition.visibleColorLabel;
  const localizedSeriesName = zhHk
    ? snapshot.lowerLevel === 1
      ? "Lyman"
      : snapshot.lowerLevel === 2
        ? "Balmer"
        : "Paschen"
    : snapshot.seriesName;
  const localizedBandLabel = zhHk
    ? snapshot.activeTransition.inVisibleBand
      ? "可見光"
      : snapshot.activeTransition.bandLabel.toLowerCase() === "ultraviolet"
        ? "紫外線"
        : snapshot.activeTransition.bandLabel.toLowerCase() === "infrared"
          ? "紅外線"
          : snapshot.activeTransition.bandLabel
    : snapshot.activeTransition.bandLabel;

  return {
    activeLabelValue: activeLabel,
    upperLevelValue: formatNumber(snapshot.upperLevel),
    lowerLevelValue: formatNumber(snapshot.lowerLevel),
    gapValue: formatMeasurement(snapshot.activeTransition.energyEv, "eV"),
    wavelengthValue: formatMeasurement(snapshot.activeTransition.wavelengthNm, "nm"),
    bandValue: localizedBandLabel,
    seriesNameValue: localizedSeriesName,
    seriesLimitValue: formatMeasurement(snapshot.seriesLimitWavelengthNm, "nm"),
    radiusRatioValue: formatNumber(snapshot.radiusRatio),
    transitionInterpretation: snapshot.activeTransition.inVisibleBand
      ? zhHk
        ? `這條 ${localizedSeriesName} 譜系躍遷落在可見光的${visibleColorLabel ?? "波段"}範圍內，所以譜線會落在圖表與光譜帶共同標示的同一個波長窗口。`
        : `This ${snapshot.seriesName} transition lands in visible ${visibleColorLabel ?? "light"}, so the line sits inside the same wavelength window the graph and strip highlight together.`
      : zhHk
        ? `這條 ${localizedSeriesName} 譜系躍遷落在${localizedBandLabel}範圍，所以活躍譜線會停留在可見窗口之外，但仍然由同一個量子化能級差誠實地決定。`
        : `This ${snapshot.seriesName} transition sits in the ${snapshot.activeTransition.bandLabel.toLowerCase()}, so the active line stays outside the visible window even though the same quantized-gap logic still sets it honestly.`,
    seriesInterpretation:
      snapshot.lowerLevel === 1
        ? zhHk
          ? `固定 n_f = 1 就會定義出 Lyman 譜系，因此譜線會留在紫外線範圍，並隨著更高的允許能級彼此靠近而向 ${formatMeasurement(snapshot.seriesLimitWavelengthNm, "nm")} 擠近。`
          : `Keeping n_f = 1 defines the Lyman family, so the lines stay in the ultraviolet and crowd toward ${formatMeasurement(snapshot.seriesLimitWavelengthNm, "nm")} as the upper allowed levels bunch together.`
        : snapshot.lowerLevel === 2
          ? zhHk
            ? `固定 n_f = 2 就會定義出 Balmer 譜系，因此譜線可以進入可見光範圍，並且隨著 n_i 升高而向 ${formatMeasurement(snapshot.seriesLimitWavelengthNm, "nm")} 這個譜系極限擠近。`
            : `Keeping n_f = 2 defines the Balmer family, so the lines can enter the visible band and still crowd toward ${formatMeasurement(snapshot.seriesLimitWavelengthNm, "nm")} as n_i rises.`
      : zhHk
        ? `固定 n_f = 3 就會定義出 Paschen 譜系，因此譜線會移到紅外線範圍，而更高的起始能級仍會向同一個譜系極限靠攏。`
        : `Keeping n_f = 3 defines the Paschen family, so the lines shift into the infrared while the higher starting levels still bunch toward the same series limit.`,
  } satisfies WorkedExampleTokenMap;
}

function resolveRadioactivityHalfLifeTokens(state: LiveWorkedExampleState) {
  const snapshot = sampleRadioactivityHalfLifeState(
    {
      sampleSize: toNumber(state.params.sampleSize, 64),
      halfLifeSeconds: toNumber(state.params.halfLifeSeconds, 2.4),
    },
    state.time,
  );
  const signedDeviation =
    snapshot.deviationCount >= 0
      ? `+${formatNumber(snapshot.deviationCount, 1)}`
      : formatNumber(snapshot.deviationCount, 1);

  return {
    sampleSizeValue: formatNumber(snapshot.sampleSize),
    halfLifeValue: formatMeasurement(snapshot.halfLifeSeconds, "s"),
    timeValue: formatMeasurement(snapshot.timeSeconds, "s"),
    elapsedHalfLivesValue: formatNumber(snapshot.elapsedHalfLives),
    expectedFractionPercentValue: `${formatNumber(snapshot.expectedFraction * 100, 1)}%`,
    expectedRemainingValue: formatNumber(snapshot.expectedRemainingCount, 1),
    actualRemainingValue: formatNumber(snapshot.actualRemainingCount),
    survivalProbabilityPercentValue: `${formatNumber(snapshot.survivalProbability * 100, 1)}%`,
    signedDeviationCountValue: signedDeviation,
    deviationFractionPercentValue: `${formatNumber(snapshot.deviationFraction * 100, 1)}%`,
    expectedInterpretation:
      Math.abs(snapshot.elapsedHalfLives - 1) <= 0.15
        ? "One half-life means the expected sample has been halved once. The stage can still show a nearby integer count because actual nuclei do not split."
        : snapshot.elapsedHalfLives >= 2.6
          ? "Several half-lives have passed, so the expectation has dropped to a small fraction of the starting sample and the curve is flattening toward zero without ever becoming negative."
          : "The expected count comes from repeating the same fractional halving law across equal half-life intervals rather than subtracting a fixed number each second.",
    spreadInterpretation:
      snapshot.sampleSize <= 16
        ? `This small sample still follows the same half-life law, but the live count can sit ${signedDeviation} nuclei away from the smooth expectation because each decay is a separate yes/no event.`
        : `This larger sample stays within ${formatNumber(snapshot.deviationFraction * 100, 1)}% of the expectation because many independent yes/no decays average together into a steadier curve.`,
  } satisfies WorkedExampleTokenMap;
}

function resolveStandingWavesTokens(
  state: LiveWorkedExampleState,
  locale: AppLocale = "en",
) {
  const snapshot = sampleStandingWavesState(
    {
      amplitude: toNumber(state.params.amplitude, 1.1),
      length: toNumber(state.params.length, 1.6),
      modeNumber: toNumber(state.params.modeNumber, 2),
      probeX: toNumber(state.params.probeX, 0.8),
    },
    state.time,
  );
  const isZhHk = locale === "zh-HK";

  return {
    timeValue: formatNumber(state.time),
    amplitudeValue: formatNumber(snapshot.amplitude),
    lengthValue: formatNumber(snapshot.length),
    modeNumberValue: formatNumber(snapshot.modeNumber),
    waveSpeedValue: formatNumber(1.2),
    wavelengthValue: formatNumber(snapshot.wavelength),
    frequencyValue: formatNumber(snapshot.frequency),
    nodeSpacingValue: formatNumber(snapshot.nodeSpacing),
    probeXValue: formatNumber(snapshot.probeX),
    probeShapeValue: formatNumber(snapshot.probeShapeValue),
    probeEnvelopeValue: formatNumber(snapshot.probeEnvelope),
    probeDisplacementValue: formatNumber(snapshot.probeDisplacement),
    harmonicInterpretation:
      snapshot.modeNumber === 1
        ? isZhHk
          ? "基頻只把半個波長放在整條弦上，所以只有兩個固定端節點和中央一個反節點。"
          : "The fundamental fits half a wavelength across the full string, so there are only the two fixed-end nodes and one antinode in the middle."
        : snapshot.modeNumber >= 4
          ? isZhHk
            ? "較高諧波會把較短的允許波長放進同一條弦，所以節點更密，振動頻率也升高。"
            : "Higher harmonics fit shorter allowed wavelengths onto the same string, so nodes crowd closer together and the oscillation frequency rises."
          : isZhHk
            ? "提高模式數會在同一條弦上多放入一個半波長段，因此多出一個波腹和一個內部節點。"
            : "Raising the mode number adds another half-wavelength segment to the same string, which creates one more loop and one more interior node.",
    probeInterpretation:
      snapshot.probeRegionLabel === "node"
        ? isZhHk
          ? "探針位於節點上，所以局部模式形狀因子幾乎為零；該點保持靜止，而附近位置仍在振動。"
          : "This probe sits on a node, so its local mode-shape factor is essentially zero and the point stays still while nearby points oscillate."
        : snapshot.probeRegionLabel === "antinode"
          ? isZhHk
            ? "探針位於反節點，所以會跟隨目前駐波允許的完整局部擺幅。"
            : "This probe sits at an antinode, so it follows the full local swing allowed by the current standing wave."
          : isZhHk
            ? "探針位於節點和反節點之間，所以只以反節點振幅的一部分振動；大小由局部模式形狀因子決定。"
            : "This probe sits between a node and an antinode, so it oscillates with only part of the antinode amplitude set by the local mode-shape factor.",
  } satisfies WorkedExampleTokenMap;
}

function resolveAirColumnResonanceTokens(state: LiveWorkedExampleState, locale?: AppLocale) {
  const isZhHk = isZhHkLocale(locale);
  const resolved = resolveAirColumnResonanceParams({
    amplitude: toNumber(state.params.amplitude, 0.12),
    length: toNumber(state.params.length, 1.2),
    resonanceOrder: toNumber(state.params.resonanceOrder, 2),
    probeX: toNumber(state.params.probeX, 0.6),
    closedEnd: state.params.closedEnd === true,
  });
  const snapshot = sampleAirColumnResonanceState(resolved, state.time);
  const wavelengthRelation = snapshot.closedEnd
    ? "\\lambda_m = \\dfrac{4L}{2m-1}"
    : "\\lambda_n = \\dfrac{2L}{n}";
  const frequencyRelation = snapshot.closedEnd
    ? "f_m = \\dfrac{(2m-1)v}{4L}"
    : "f_n = \\dfrac{nv}{2L}";
  const substitutionLine = snapshot.closedEnd
    ? `\\lambda = \\dfrac{4(${formatNumber(snapshot.length)})}{${formatNumber(snapshot.harmonicMultiple)}}`
    : `\\lambda = \\dfrac{2(${formatNumber(snapshot.length)})}{${formatNumber(snapshot.resonanceOrder)}}`;

  return {
    timeValue: formatNumber(state.time),
    amplitudeValue: formatNumber(snapshot.amplitude),
    lengthValue: formatNumber(snapshot.length),
    resonanceOrderValue: formatNumber(snapshot.resonanceOrder),
    harmonicMultipleValue: formatNumber(snapshot.harmonicMultiple),
    waveSpeedValue: formatNumber(34),
    wavelengthValue: formatNumber(snapshot.wavelength),
    frequencyValue: formatNumber(snapshot.frequency),
    probeXValue: formatNumber(snapshot.probeX),
    probeShapeValue: formatNumber(snapshot.probeShapeValue),
    probeEnvelopeValue: formatNumber(snapshot.probeEnvelope),
    probeDisplacementValue: formatNumber(snapshot.probeDisplacement),
    probePressureEnvelopeValue: formatNumber(snapshot.probePressureEnvelope),
    probePressureValue: formatNumber(snapshot.probePressureValue),
    probeRegionLabelValue: snapshot.probeRegionLabel,
    probePressureRegionLabelValue: snapshot.probePressureRegionLabel,
    boundaryLabelValue: snapshot.boundaryLabel === "closed-open"
      ? isZhHk
        ? "一端封閉、一端開口的管"
        : "closed-open tube"
      : isZhHk
        ? "兩端開口的管"
        : "open-open tube",
    resonanceLabelValue: snapshot.resonanceLabel,
    harmonicLabelValue: snapshot.harmonicLabel,
    wavelengthRelation,
    frequencyRelation,
    substitutionLine,
    harmonicSeriesValue: snapshot.closedEnd ? "odd harmonics only" : "all integer harmonics",
    resonanceInterpretation: snapshot.closedEnd
      ? snapshot.resonanceOrder === 1
        ? "Closing one end forces a displacement node there, so the fundamental stretches to a quarter-wave fit and the frequency drops below the open-pipe case at the same length."
        : "The closed-open tube keeps the same node-at-the-wall rule, so the next allowed pattern skips to the next odd harmonic instead of using every integer multiple."
      : snapshot.resonanceOrder === 1
        ? "An open-open tube lets both ends breathe as displacement antinodes, so the fundamental is a half-wave fit across the full length."
        : "Open-open tubes allow every integer harmonic, so each higher resonance adds one more half-wavelength segment across the same tube.",
    pressureInterpretation:
      snapshot.probeRegionLabel === "node"
        ? "The probe parcel sits on a displacement node, so its motion nearly disappears while the pressure cue is strongest there."
        : snapshot.probePressureRegionLabel === "node"
          ? "This probe sits at a pressure node near an open end, so the local pressure cue is weak even though the parcel motion can stay large."
          : "This probe sits between the pure node and antinode limits, so both parcel motion and pressure cues stay partial rather than extreme.",
  } satisfies WorkedExampleTokenMap;
}

function resolveGraphTransformationsTokens(state: LiveWorkedExampleState) {
  const snapshot = sampleGraphTransformationsState({
    horizontalShift: toNumber(state.params.horizontalShift, 0),
    verticalShift: toNumber(state.params.verticalShift, 0),
    verticalScale: toNumber(state.params.verticalScale, 1),
    mirrorY: state.params.mirrorY === true,
  });
  const reflectedBaseVertexX = snapshot.mirrorY
    ? -snapshot.baseVertexX
    : snapshot.baseVertexX;

  return {
    horizontalShiftValue: formatNumber(snapshot.horizontalShift),
    verticalShiftValue: formatNumber(snapshot.verticalShift),
    verticalScaleValue: formatNumber(snapshot.verticalScale),
    baseVertexXValue: formatNumber(snapshot.baseVertexX),
    baseVertexYValue: formatNumber(snapshot.baseVertexY),
    reflectedBaseVertexXValue: formatNumber(reflectedBaseVertexX),
    vertexXValue: formatNumber(snapshot.vertexX),
    vertexYValue: formatNumber(snapshot.vertexY),
    yInterceptValue: formatNumber(snapshot.yIntercept),
    vertexInterpretation: snapshot.mirrorY
      ? "The y-axis reflection flips the base vertex to the opposite side first, and then the horizontal shift moves that reflected point left or right."
      : "Without the y-axis reflection, the horizontal shift simply translates the base vertex left or right before the vertical change is applied.",
    scaleInterpretation:
      snapshot.verticalScale < 0
        ? "A negative vertical scale reflects the graph across the x-axis, and its magnitude still controls how stretched or compressed the result is."
        : Math.abs(snapshot.verticalScale) < 1
          ? "Because |a| is below one, the graph is vertically compressed before the k shift lifts or lowers it."
          : Math.abs(snapshot.verticalScale) > 1
            ? "Because |a| is above one, the graph is vertically stretched before the k shift lifts or lowers it."
            : "With a = 1, only the shifts and any y-axis reflection change the shape.",
  } satisfies WorkedExampleTokenMap;
}

function resolveDerivativeSlopeTokens(state: LiveWorkedExampleState) {
  const resolved = resolveDerivativeSlopeParams({
    pointX: toNumber(state.params.pointX, -1.2),
    deltaX: toNumber(state.params.deltaX, 0.8),
    showSecant: state.params.showSecant !== false,
  });
  const snapshot = sampleDerivativeSlopeState(resolved);
  const deltaY = snapshot.secantY - snapshot.pointY;

  return {
    pointXValue: formatNumber(snapshot.pointX),
    pointYValue: formatNumber(snapshot.pointY),
    slopeValue: formatNumber(snapshot.slope),
    deltaXValue: formatNumber(snapshot.deltaX),
    deltaYValue: formatNumber(deltaY),
    secantXValue: formatNumber(snapshot.secantX),
    secantYValue: formatNumber(snapshot.secantY),
    secantSlopeValue: formatNumber(snapshot.secantSlope),
    slopeInterpretation:
      Math.abs(snapshot.slope) <= 0.08
        ? "The tangent is nearly horizontal here, so the curve is at a locally flat turning point or very close to one."
        : snapshot.slope > 0
          ? "The positive derivative means the curve rises from left to right at this point."
          : "The negative derivative means the curve falls from left to right at this point.",
    secantInterpretation:
      Math.abs(snapshot.secantSlope - snapshot.slope) <= 0.08
        ? "With this small Δx, the secant slope already sits very close to the tangent slope."
        : "The secant slope still differs noticeably, which is the cue that Δx has not shrunk enough yet for the average rate to match the local one closely.",
  } satisfies WorkedExampleTokenMap;
}

function resolveReactionRateCollisionTheoryTokens(
  state: LiveWorkedExampleState,
  locale?: AppLocale,
) {
  const resolved = resolveReactionRateCollisionTheoryParams({
    temperature: toNumber(state.params.temperature, 3.1),
    concentration: toNumber(state.params.concentration, 1.4),
    activationEnergy: toNumber(state.params.activationEnergy, 2.8),
    catalyst: state.params.catalyst === true,
  });
  const snapshot = sampleReactionRateCollisionTheoryState(resolved);
  const zhHk = isZhHkLocale(locale);

  return {
    temperatureValue: formatNumber(snapshot.temperature),
    concentrationValue: formatNumber(snapshot.concentration),
    activationEnergyValue: formatNumber(snapshot.activationEnergy),
    effectiveActivationEnergyValue: formatNumber(snapshot.effectiveActivationEnergy),
    averageEnergyValue: formatNumber(snapshot.averageEnergy),
    attemptRateValue: formatNumber(snapshot.attemptRate),
    successFractionValue: formatNumber(snapshot.successFraction),
    successPercentValue: formatNumber(snapshot.successFraction * 100),
    successfulCollisionRateValue: formatNumber(snapshot.successfulCollisionRate),
    unsuccessfulCollisionRateValue: formatNumber(snapshot.unsuccessfulCollisionRate),
    catalystStateValue: zhHk
      ? snapshot.catalyst
        ? "開啟"
        : "關閉"
      : snapshot.catalyst
        ? "on"
        : "off",
    collisionInterpretation:
      snapshot.successFraction >= 0.5
        ? zhHk
          ? "現在已有相當大比例的碰撞能跨過能障，所以反應速率主要是由真正成功的碰撞決定，而不只是因為盒子裡很擠。"
          : "A large enough share of collisions now clear the barrier, so the rate is being set by genuinely successful collisions instead of crowding alone."
        : snapshot.attemptRate >= 18
          ? zhHk
            ? "盒子裡的碰撞已經很頻密，但大多數碰撞仍然過不了能障，所以總碰撞次數和成功碰撞率必須分開看。"
            : "The box is busy, but most hits still fail the barrier test, so all-collision count and successful-collision rate need to be kept separate."
          : zhHk
            ? "這個設定下，碰撞嘗試率和成功比例都算中等，所以目前不是單靠擁擠程度或粒子能量其中一方主導。"
            : "This setup keeps both the attempt rate and the successful fraction fairly modest, so neither crowding nor energy is dominating by itself.",
    catalystInterpretation: snapshot.catalyst
      ? zhHk
        ? "把催化劑打開後，等效能障會降低，但粒子本身並沒有變得更熱，所以成功比例上升的原因和單純加熱並不相同。"
        : "Turning the catalyst on lowers the effective barrier without making the particles hotter, so the successful fraction rises for a different reason than heating."
      : zhHk
        ? "沒有催化劑時，成功比例只能靠粒子變得更有能量，或是直接改變活化能門檻來提升。"
        : "With no catalyst, the successful fraction can only rise if the particles get more energetic or the activation barrier itself is changed.",
  } satisfies WorkedExampleTokenMap;
}

function resolveIntegralAccumulationTokens(state: LiveWorkedExampleState) {
  const resolved = resolveIntegralAccumulationParams({
    upperBound: toNumber(state.params.upperBound, 1.6),
  });
  const snapshot = sampleIntegralAccumulationState(resolved);

  return {
    upperBoundValue: formatNumber(snapshot.upperBound),
    sourceHeightValue: formatNumber(snapshot.sourceHeight),
    accumulatedValue: formatNumber(snapshot.accumulatedValue),
    accumulationSlopeValue: formatNumber(snapshot.accumulationSlope),
    accumulationInterpretation:
      Math.abs(snapshot.accumulatedValue) <= 0.08
        ? "The positive and negative signed contributions nearly cancel here, so the running total sits close to zero."
        : snapshot.accumulatedValue > 0
          ? "The signed area collected from 0 up to this bound is still net positive."
          : "The negative contributions now outweigh the earlier positive ones, so the running total has dropped below zero.",
    sourceVsAccumulationInterpretation:
      Math.abs(snapshot.sourceHeight - snapshot.accumulatedValue) <= 0.12
        ? "Here the local height and the running total happen to be similar in size, but they still mean different things: one is the current height and the other is everything accumulated so far."
        : Math.abs(snapshot.sourceHeight) <= 0.08
          ? "The source height is nearly zero here, so the accumulation graph is almost flat even though the running total can still be far from zero."
          : snapshot.sourceHeight > 0
            ? "The source height tells you how fast the total is increasing right now, while the accumulated value records everything gathered from 0 up to this bound."
            : "The source height is negative here, so the total is decreasing locally even if the running total may still be positive overall.",
  } satisfies WorkedExampleTokenMap;
}

function resolveLimitsContinuityTokens(state: LiveWorkedExampleState) {
  const resolved = resolveLimitsContinuityParams({
    caseIndex: toNumber(state.params.caseIndex, 0),
    approachDistance: toNumber(state.params.approachDistance, 0.6),
  });
  const snapshot = sampleLimitsContinuityState(resolved);
  const finiteLimitValue = snapshot.finiteLimitValue;
  const actualValue = snapshot.actualValue;
  const leftLimitValueText =
    snapshot.caseKey === "blow-up"
      ? "negative infinity"
      : snapshot.leftLimitValue !== null
        ? formatNumber(snapshot.leftLimitValue)
        : "no finite left-hand limit";
  const rightLimitValueText =
    snapshot.caseKey === "blow-up"
      ? "positive infinity"
      : snapshot.rightLimitValue !== null
        ? formatNumber(snapshot.rightLimitValue)
        : "no finite right-hand limit";
  const twoSidedLimitValueMath =
    finiteLimitValue !== null
      ? formatNumber(finiteLimitValue)
      : snapshot.caseKey === "jump"
        ? "\\text{no single finite limit}"
        : "\\text{no finite two-sided limit}";
  const twoSidedLimitSentence =
    finiteLimitValue !== null
      ? `the shared finite height ${formatNumber(finiteLimitValue)}`
      : snapshot.caseKey === "jump"
        ? "no single finite two-sided limit because the left-hand and right-hand sides settle toward different heights"
        : "no finite two-sided limit because the nearby values blow up with opposite signs instead of settling";
  const actualPointSentence =
    snapshot.actualDefined && actualValue !== null
      ? `a filled point at ${formatNumber(actualValue)}`
      : "no defined filled point";
  const actualPointValueMath =
    snapshot.actualDefined && actualValue !== null
      ? formatNumber(actualValue)
      : "\\text{undefined}";

  return {
    caseLabelValue: snapshot.caseLabel,
    continuityLabelValue: snapshot.continuityLabel,
    hValue: formatNumber(snapshot.approachDistance),
    leftValueValue: formatNumber(snapshot.leftValue),
    rightValueValue: formatNumber(snapshot.rightValue),
    leftLimitValueText,
    rightLimitValueText,
    twoSidedLimitValueMath,
    twoSidedLimitSentence,
    actualPointSentence,
    actualPointValueMath,
    twoSidedDecision:
      finiteLimitValue !== null
        ? `The one-sided traces are settling toward the same finite height, because the left-hand limit is ${leftLimitValueText} and the right-hand limit is ${rightLimitValueText}.`
        : snapshot.caseKey === "jump"
          ? `The one-sided traces disagree, because the left-hand limit is ${leftLimitValueText} while the right-hand limit is ${rightLimitValueText}, so there is no single two-sided limit.`
          : `The one-sided traces are blowing up in opposite directions, because the left-hand side heads toward ${leftLimitValueText} while the right-hand side heads toward ${rightLimitValueText}, so there is no finite two-sided limit.`,
    oneSidedInterpretation:
      finiteLimitValue !== null
        ? "The nearby values are agreeing on one shared height, so the graph supports a finite two-sided limit even before you check whether the actual point matches it."
        : snapshot.caseKey === "jump"
          ? "The nearby values keep separating toward different heights, so the graph does not support one shared two-sided limit."
          : "The nearby values are not settling at all; they grow without bound with opposite signs instead of landing on one honest finite number.",
    continuityDecisionSentence:
      snapshot.caseKey === "continuous"
        ? "So the graph is continuous at the target because the actual point matches the shared limiting value."
        : snapshot.caseKey === "removable-hole"
          ? "So the graph has a removable discontinuity: the limit exists, but the actual point misses it."
          : snapshot.caseKey === "jump"
            ? "So the graph has a jump discontinuity because there is no single two-sided limit for the actual point to match."
            : "So continuity fails because there is no finite two-sided limit and no defined function value at the target.",
    continuityInterpretation:
      snapshot.caseKey === "continuous"
        ? "The filled point lands exactly where both sides are approaching, so the limit and the actual function value agree."
        : snapshot.caseKey === "removable-hole"
          ? "This is the clean split between a finite limit and continuity: the nearby graph behaves well, but the actual filled point sits somewhere else."
          : snapshot.caseKey === "jump"
            ? "Because the one-sided values disagree, there is no single two-sided limit for the actual point to rescue."
            : "The graph does not settle toward a finite height at all, so neither a finite limit nor continuity is available there.",
  } satisfies WorkedExampleTokenMap;
}

function resolveDynamicEquilibriumTokens(state: LiveWorkedExampleState) {
  const resolved = resolveDynamicEquilibriumParams({
    reactantAmount: toNumber(state.params.reactantAmount, 14),
    productAmount: toNumber(state.params.productAmount, 4),
    productFavor: toNumber(state.params.productFavor, 1.12),
  });
  const snapshot = sampleDynamicEquilibriumState(resolved, state.time);

  return {
    timeValue: formatNumber(state.time),
    reactantAmountValue: formatNumber(snapshot.reactantAmount),
    productAmountValue: formatNumber(snapshot.productAmount),
    productFavorValue: formatNumber(snapshot.productFavor),
    currentReactantValue: formatNumber(snapshot.currentReactantAmount),
    currentProductValue: formatNumber(snapshot.currentProductAmount),
    currentProductShareValue: formatNumber(snapshot.currentProductShare * 100),
    equilibriumProductShareValue: formatNumber(snapshot.equilibriumProductShare * 100),
    forwardRateValue: formatNumber(snapshot.forwardRate),
    reverseRateValue: formatNumber(snapshot.reverseRate),
    netRateValue: formatNumber(snapshot.netRate),
    rateGapValue: formatNumber(snapshot.rateGap),
    balanceInterpretation:
      snapshot.rateGap <= 0.12
        ? "The forward and reverse changes are almost matched, but both rates are still non-zero. That is the visual cue for dynamic equilibrium rather than a stopped reaction."
        : snapshot.netRate > 0
          ? "Forward change is still winning, so the mixture is moving toward more products."
          : "Reverse change is still winning, so the mixture is being pulled back toward more reactants.",
    targetInterpretation:
      snapshot.productFavor >= 1.2
        ? "The current conditions favor products, so the settled mixture keeps a larger product share."
        : snapshot.productFavor <= 0.9
          ? "The current conditions favor reactants, so the settled mixture keeps a smaller product share."
          : "The current conditions only lean gently toward one side, so the settled mixture stays fairly mixed.",
  } satisfies WorkedExampleTokenMap;
}

function resolveDotProductProjectionTokens(state: LiveWorkedExampleState) {
  const resolved = resolveDotProductProjectionParams({
    ax: toNumber(state.params.ax, 4),
    ay: toNumber(state.params.ay, 1.5),
    bx: toNumber(state.params.bx, 3),
    by: toNumber(state.params.by, 2.5),
  });
  const snapshot = sampleDotProductProjectionState(resolved);
  const alignmentLabel =
    snapshot.alignmentLabel === "positive"
      ? "positive"
      : snapshot.alignmentLabel === "negative"
        ? "negative"
        : "orthogonal";
  const alignmentInterpretation =
    snapshot.alignmentLabel === "positive"
      ? "B still keeps an along-A part in A's direction."
      : snapshot.alignmentLabel === "negative"
        ? "B points partly against A, so the along-A part is negative."
        : "B has essentially no along-A part, so the dot product is near zero.";

  return {
    axValue: formatNumber(snapshot.ax),
    ayValue: formatNumber(snapshot.ay),
    bxValue: formatNumber(snapshot.bx),
    byValue: formatNumber(snapshot.by),
    magnitudeAValue: formatNumber(snapshot.magnitudeA),
    magnitudeBValue: formatNumber(snapshot.magnitudeB),
    angleBetweenValue: formatNumber(snapshot.angleBetween),
    dotProductValue: formatNumber(snapshot.dotProduct),
    projectionScalarValue: formatNumber(snapshot.projectionScalar),
    projectionMagnitudeValue: formatNumber(snapshot.projectionMagnitude),
    rejectionMagnitudeValue: formatNumber(snapshot.rejectionMagnitude),
    alignmentLabelValue: alignmentLabel,
    alignmentInterpretation,
  } satisfies WorkedExampleTokenMap;
}

function getStoichiometryLimitingLabel(limitingReagent: ReturnType<typeof sampleStoichiometryRecipeState>["limitingReagent"]) {
  switch (limitingReagent) {
    case "reactant-a":
      return "A";
    case "reactant-b":
      return "B";
    default:
      return "balanced";
  }
}

function resolveStoichiometricRatiosTokens(state: LiveWorkedExampleState) {
  const resolved = resolveStoichiometryRecipeParams({
    reactantAAmount: toNumber(state.params.reactantAAmount, 10),
    reactantBAmount: toNumber(state.params.reactantBAmount, 15),
    recipeA: toNumber(state.params.recipeA, 2),
    recipeB: toNumber(state.params.recipeB, 3),
    percentYield: 100,
  });
  const snapshot = sampleStoichiometryRecipeState(resolved);

  return {
    reactantAAmountValue: formatNumber(snapshot.reactantAAmount),
    reactantBAmountValue: formatNumber(snapshot.reactantBAmount),
    recipeAValue: formatNumber(snapshot.recipeA),
    recipeBValue: formatNumber(snapshot.recipeB),
    maxBatchesFromAValue: formatNumber(snapshot.maxBatchesFromA),
    maxBatchesFromBValue: formatNumber(snapshot.maxBatchesFromB),
    theoreticalBatchesValue: formatNumber(snapshot.theoreticalBatches),
    limitingReagentValue: getStoichiometryLimitingLabel(snapshot.limitingReagent),
    ratioInterpretation:
      snapshot.limitingReagent === "balanced"
        ? "The supply ratio matches the recipe closely, so both caps land on the same batch count."
        : `The current supplies do not match the recipe perfectly, so ${getStoichiometryLimitingLabel(snapshot.limitingReagent)} sets the tighter batch cap.`,
  } satisfies WorkedExampleTokenMap;
}

function resolveLimitingReagentTokens(state: LiveWorkedExampleState) {
  const resolved = resolveStoichiometryRecipeParams({
    reactantAAmount: toNumber(state.params.reactantAAmount, 8),
    reactantBAmount: toNumber(state.params.reactantBAmount, 15),
    recipeA: toNumber(state.params.recipeA, 2),
    recipeB: toNumber(state.params.recipeB, 3),
    percentYield: 100,
  });
  const snapshot = sampleStoichiometryRecipeState(resolved);
  const limitingLabel = getStoichiometryLimitingLabel(snapshot.limitingReagent);
  const excessLabel =
    snapshot.limitingReagent === "reactant-a"
      ? "B"
      : snapshot.limitingReagent === "reactant-b"
        ? "A"
        : "neither";
  const leftoverValue =
    snapshot.limitingReagent === "reactant-a"
      ? snapshot.theoreticalLeftoverB
      : snapshot.limitingReagent === "reactant-b"
        ? snapshot.theoreticalLeftoverA
        : 0;

  return {
    reactantAAmountValue: formatNumber(snapshot.reactantAAmount),
    reactantBAmountValue: formatNumber(snapshot.reactantBAmount),
    recipeAValue: formatNumber(snapshot.recipeA),
    recipeBValue: formatNumber(snapshot.recipeB),
    maxBatchesFromAValue: formatNumber(snapshot.maxBatchesFromA),
    maxBatchesFromBValue: formatNumber(snapshot.maxBatchesFromB),
    theoreticalBatchesValue: formatNumber(snapshot.theoreticalBatches),
    limitingReagentValue: limitingLabel,
    excessReagentValue: excessLabel,
    leftoverValue: formatNumber(leftoverValue),
    limitingInterpretation:
      limitingLabel === "balanced"
        ? "Both supplies support the same number of full batches, so neither side limits first."
        : `${limitingLabel} limits because it supports fewer full recipe batches than ${excessLabel}.`,
  } satisfies WorkedExampleTokenMap;
}

function resolvePercentYieldTokens(state: LiveWorkedExampleState) {
  const resolved = resolveStoichiometryRecipeParams({
    reactantAAmount: toNumber(state.params.reactantAAmount, 12),
    reactantBAmount: toNumber(state.params.reactantBAmount, 18),
    recipeA: toNumber(state.params.recipeA, 2),
    recipeB: toNumber(state.params.recipeB, 3),
    percentYield: toNumber(state.params.percentYield, 75),
  });
  const snapshot = sampleStoichiometryRecipeState(resolved);

  return {
    reactantAAmountValue: formatNumber(snapshot.reactantAAmount),
    reactantBAmountValue: formatNumber(snapshot.reactantBAmount),
    recipeAValue: formatNumber(snapshot.recipeA),
    recipeBValue: formatNumber(snapshot.recipeB),
    percentYieldValue: formatNumber(snapshot.percentYield),
    theoreticalBatchesValue: formatNumber(snapshot.theoreticalBatches),
    actualBatchesValue: formatNumber(snapshot.actualBatches),
    yieldGapValue: formatNumber(snapshot.yieldGap),
    reactionExtentValue: formatNumber(snapshot.reactionExtent),
    yieldInterpretation:
      snapshot.percentYield >= 100
        ? "The actual tray now reaches the full theoretical marker."
        : "The actual tray stops short of the theoretical marker because yield scales the same recipe cap down.",
  } satisfies WorkedExampleTokenMap;
}

function resolveComplexNumbersPlaneTokens(
  state: LiveWorkedExampleState,
  locale?: AppLocale,
) {
  const resolved = resolveComplexNumbersPlaneParams({
    realPart: toNumber(state.params.realPart, 2.2),
    imaginaryPart: toNumber(state.params.imaginaryPart, 1.6),
    operandReal: toNumber(state.params.operandReal, 1.1),
    operandImaginary: toNumber(state.params.operandImaginary, 1.8),
    multiplyMode: state.params.multiplyMode === true,
  });
  const snapshot = sampleComplexNumbersPlaneState(resolved);
  const zhHk = isZhHkLocale(locale);

  return {
    zValue: formatComplex(snapshot.realPart, snapshot.imaginaryPart),
    wValue: formatComplex(snapshot.operandReal, snapshot.operandImaginary),
    realPartValue: formatNumber(snapshot.realPart),
    imaginaryPartValue: formatNumber(snapshot.imaginaryPart),
    operandRealValue: formatNumber(snapshot.operandReal),
    operandImaginaryValue: formatNumber(snapshot.operandImaginary),
    magnitudeValue: formatNumber(snapshot.magnitude),
    argumentDegValue: formatNumber(snapshot.argumentDeg),
    operandMagnitudeValue: formatNumber(snapshot.operandMagnitude),
    operandArgumentDegValue: formatNumber(snapshot.operandArgumentDeg),
    sumValue: formatComplex(snapshot.sumReal, snapshot.sumImaginary),
    sumRealValue: formatNumber(snapshot.sumReal),
    sumImaginaryValue: formatNumber(snapshot.sumImaginary),
    sumMagnitudeValue: formatNumber(snapshot.sumMagnitude),
    sumArgumentDegValue: formatNumber(snapshot.sumArgumentDeg),
    productValue: formatComplex(snapshot.productReal, snapshot.productImaginary),
    productRealValue: formatNumber(snapshot.productReal),
    productImaginaryValue: formatNumber(snapshot.productImaginary),
    productMagnitudeValue: formatNumber(snapshot.productMagnitude),
    productArgumentDegValue: formatNumber(snapshot.productArgumentDeg),
    scaleFactorValue: formatNumber(snapshot.scaleFactor),
    rotationDegValue: formatNumber(snapshot.rotationDeg),
    additionInterpretation:
      snapshot.sumMagnitude <= Math.max(snapshot.magnitude, snapshot.operandMagnitude) * 0.72
        ? zhHk
          ? "兩個向量有一部分正在互相抵消，所以總和會比單看任何一支箭頭時想像的更短。"
          : "The vectors are partly canceling, so the sum stays shorter than either arrow might suggest on its own."
        : zhHk
          ? "首尾相接的移動讓兩支箭頭有足夠的疊加效果，所以總和會落在離原點更遠的位置。"
          : "The tip-to-tail move reinforces the two arrows enough that the sum lands farther from the origin.",
    multiplicationInterpretation:
      snapshot.scaleFactor <= 1.05
        ? zhHk
          ? "這個乘數的大小接近 1，所以它主要表現為旋轉，整體長度只會有很小的改變。"
          : "This multiplier acts mostly like a rotation because its magnitude is close to one, so the size changes only modestly."
        : snapshot.scaleFactor >= 1.5
          ? zhHk
            ? "這個乘數會在旋轉的同時明顯拉伸點的位置，因此乘法在同一個平面上會同時呈現縮放與轉向。"
            : "This multiplier stretches the point noticeably while also rotating it, so multiplication reads as scale plus turn on the same plane."
          : zhHk
            ? "這個乘數同時改變 z 的大小和方向，所以複數乘法在這裡保持幾何意義，而不只是符號操作。"
            : "This multiplier changes both the size and the direction of z, so multiplication stays geometric rather than symbolic.",
  } satisfies WorkedExampleTokenMap;
}

function resolveParametricCurvesMotionTokens(state: LiveWorkedExampleState) {
  const resolved = resolveParametricCurvesMotionParams({
    xAmplitude: toNumber(state.params.xAmplitude, 3.2),
    yAmplitude: toNumber(state.params.yAmplitude, 2.4),
    xFrequency: toNumber(state.params.xFrequency, 1),
    yFrequency: toNumber(state.params.yFrequency, 2),
    phaseShiftDeg: toNumber(state.params.phaseShiftDeg, 0),
  });
  const snapshot = sampleParametricCurvesMotionState(resolved, state.time);

  return {
    timeValue: formatNumber(state.time),
    xAmplitudeValue: formatNumber(snapshot.xAmplitude),
    yAmplitudeValue: formatNumber(snapshot.yAmplitude),
    xFrequencyValue: formatNumber(snapshot.xFrequency),
    yFrequencyValue: formatNumber(snapshot.yFrequency),
    phaseShiftDegValue: formatNumber(snapshot.phaseShiftDeg),
    xValue: formatNumber(snapshot.x),
    yValue: formatNumber(snapshot.y),
    vxValue: formatNumber(snapshot.vx),
    vyValue: formatNumber(snapshot.vy),
    speedValue: formatNumber(snapshot.speed),
    pathWidthValue: formatNumber(snapshot.pathWidth),
    pathHeightValue: formatNumber(snapshot.pathHeight),
    shapeInterpretation:
      Math.abs(snapshot.pathWidth - snapshot.pathHeight) <= 0.35
        ? "The path is close to square in its overall span, so neither coordinate dominates the shape."
        : snapshot.pathWidth > snapshot.pathHeight
          ? "The x-motion stretches farther than the y-motion, so the traced path reads wider than it is tall."
          : "The y-motion stretches farther than the x-motion, so the traced path reads taller than it is wide.",
    motionInterpretation:
      snapshot.speed >= 8
        ? "The point is moving quickly through this part of the curve, so the path shape and the time-progress along it should be kept separate."
        : snapshot.speed <= 3
          ? "The point is moving more slowly here even though the traced path itself has not changed."
          : "The point is moving at a moderate speed here, so the curve and the motion cue still feel tightly linked.",
  } satisfies WorkedExampleTokenMap;
}

function resolveConcentrationDilutionTokens(state: LiveWorkedExampleState) {
  const resolved = resolveConcentrationDilutionParams({
    soluteAmount: toNumber(state.params.soluteAmount, 8),
    solventVolume: toNumber(state.params.solventVolume, 1.4),
  });
  const snapshot = sampleConcentrationDilutionState(resolved);

  return {
    soluteAmountValue: formatNumber(snapshot.soluteAmount),
    solventVolumeValue: formatNumber(snapshot.solventVolume),
    concentrationValue: formatNumber(snapshot.concentration),
    particleCountValue: formatNumber(snapshot.particleCount),
    fillFractionValue: formatNumber(snapshot.fillFraction * 100),
    particleDensityValue: formatNumber(snapshot.particleDensity),
    dilutionInterpretation:
      snapshot.solventVolume >= 2.1
        ? "The same solute is now spread through more liquid, so the particle view looks sparser even though the solute amount has not changed."
        : "With less liquid in the beaker, the same solute occupies a tighter space and the concentration rises.",
    soluteInterpretation:
      snapshot.soluteAmount >= 11
        ? "Adding more solute raises the concentration because there are simply more dissolved particles in the same amount of liquid."
        : "At this lower solute amount, concentration depends strongly on how much liquid is present around the particles.",
  } satisfies WorkedExampleTokenMap;
}

function resolveSolubilitySaturationTokens(
  state: LiveWorkedExampleState,
  locale?: AppLocale,
) {
  const resolved = resolveSolubilitySaturationParams({
    soluteAmount: toNumber(state.params.soluteAmount, 8.4),
    solventVolume: toNumber(state.params.solventVolume, 1.4),
    solubilityLimit: toNumber(state.params.solubilityLimit, 5.6),
  });
  const snapshot = sampleSolubilitySaturationState(resolved);
  const zhHk = isZhHkLocale(locale);

  return {
    soluteAmountValue: formatNumber(snapshot.soluteAmount),
    solventVolumeValue: formatNumber(snapshot.solventVolume),
    solubilityLimitValue: formatNumber(snapshot.solubilityLimit),
    capacityValue: formatNumber(snapshot.capacity),
    dissolvedAmountValue: formatNumber(snapshot.dissolvedAmount),
    excessAmountValue: formatNumber(snapshot.excessAmount),
    concentrationValue: formatNumber(snapshot.concentration),
    saturationRatioValue: formatNumber(snapshot.saturationRatio),
    saturationInterpretation: snapshot.saturated
      ? zhHk
        ? "這個燒杯已經達到目前的溶解容量，所以多出的物質只能以未溶解固體的形式保留在外。"
        : "The beaker has reached the current dissolving capacity, so the extra material has to remain visible as excess solid."
      : zhHk
        ? "這個燒杯仍未達到目前容量上限，所以同一種溶質還可以再溶解更多，飽和才會出現。"
        : "The beaker is still below the current capacity, so more of the same solute could stay dissolved before saturation appears.",
  } satisfies WorkedExampleTokenMap;
}

function resolveAcidBasePhTokens(state: LiveWorkedExampleState) {
  const resolved = resolveAcidBasePhParams({
    acidAmount: toNumber(state.params.acidAmount, 4.2),
    baseAmount: toNumber(state.params.baseAmount, 3.1),
    waterVolume: toNumber(state.params.waterVolume, 1.4),
  });
  const snapshot = sampleAcidBasePhState(resolved);

  return {
    acidAmountValue: formatNumber(snapshot.acidAmount),
    baseAmountValue: formatNumber(snapshot.baseAmount),
    waterVolumeValue: formatNumber(snapshot.waterVolume),
    acidCharacterValue: formatNumber(snapshot.acidCharacter),
    baseCharacterValue: formatNumber(snapshot.baseCharacter),
    acidShareValue: formatNumber(snapshot.acidShare * 100),
    baseShareValue: formatNumber(snapshot.baseShare * 100),
    pHValue: formatNumber(snapshot.pH),
    hydroniumCountValue: formatNumber(snapshot.hydroniumCount),
    hydroxideCountValue: formatNumber(snapshot.hydroxideCount),
    acidityInterpretation:
      snapshot.pH < 6
        ? "The acid character is visibly stronger here, so the pH scale lands below neutral and the hydronium cue dominates."
        : snapshot.pH > 8
          ? "The base character is visibly stronger here, so the pH scale lands above neutral and the hydroxide cue dominates."
          : "The acid and base character are close here, so the pH scale stays near neutral rather than leaning sharply to one side.",
    dilutionInterpretation:
      snapshot.waterVolume >= 1.9
        ? "Adding more water softens both acid and base character, so the pH drifts back toward the middle of the scale."
        : "With less water present, the same acid and base additions feel more concentrated, so the pH can swing more strongly.",
  } satisfies WorkedExampleTokenMap;
}

function resolveBuffersNeutralizationTokens(state: LiveWorkedExampleState) {
  const resolved = resolveBuffersNeutralizationParams({
    acidAmount: toNumber(state.params.acidAmount, 5.8),
    baseAmount: toNumber(state.params.baseAmount, 4.6),
    bufferAmount: toNumber(state.params.bufferAmount, 2.4),
    waterVolume: toNumber(state.params.waterVolume, 1.4),
  });
  const snapshot = sampleBuffersNeutralizationState(resolved);

  return {
    acidAmountValue: formatNumber(snapshot.acidAmount),
    baseAmountValue: formatNumber(snapshot.baseAmount),
    bufferAmountValue: formatNumber(snapshot.bufferAmount),
    waterVolumeValue: formatNumber(snapshot.waterVolume),
    neutralizedAmountValue: formatNumber(snapshot.neutralizedAmount),
    bufferRemainingValue: formatNumber(snapshot.bufferRemaining),
    bufferUsedValue: formatNumber(snapshot.bufferUsed),
    pHValue: formatNumber(snapshot.pH),
    acidShareValue: formatNumber(snapshot.acidShare * 100),
    baseShareValue: formatNumber(snapshot.baseShare * 100),
    bufferInterpretation:
      snapshot.bufferRemaining > 0 && Math.abs(snapshot.pH - 7) < 0.9
        ? "The pH is staying near the middle because the buffer reserve is still absorbing the push. The chemistry is changing, but the reserve bar shows where that change is going."
        : snapshot.bufferRemaining <= 0
          ? "The reserve is spent, so the leftover acid-base mismatch is now free to move the pH farther from neutral."
          : "Some direct neutralization has happened, but the remaining buffer reserve is no longer keeping the pH tightly anchored.",
  } satisfies WorkedExampleTokenMap;
}

function resolveSortingTradeoffsTokens(state: LiveWorkedExampleState) {
  const resolved = resolveSortingTradeoffsParams({
    algorithmIndex: toNumber(state.params.algorithmIndex, 0),
    patternIndex: toNumber(state.params.patternIndex, 0),
    arraySize: toNumber(state.params.arraySize, 9),
  });
  const snapshot = sampleSortingTradeoffsState(resolved, state.time);

  return {
    algorithmLabelValue: snapshot.algorithmLabel,
    patternLabelValue: snapshot.patternLabel.toLowerCase(),
    arraySizeValue: formatNumber(snapshot.arraySize),
    comparisonsValue: formatNumber(snapshot.comparisons),
    writeCountValue: formatNumber(snapshot.writeCount),
    inversionsRemainingValue: formatNumber(snapshot.inversionsRemaining),
    sortedItemsValue: formatNumber(snapshot.settledIndices.length),
    statusLineValue: snapshot.statusLine,
    sortingInterpretation:
      snapshot.inversionsRemaining === 0
        ? "the list is already fully ordered."
        : snapshot.patternIndex === 1 && snapshot.algorithmIndex === 2
          ? "the algorithm is mostly cleaning up short local mistakes instead of rebuilding the whole list."
          : snapshot.patternIndex === 2 && snapshot.algorithmIndex === 0
            ? "large values still have to bubble across a long interval, so the work stays visible."
            : "the algorithm is still paying for the remaining disorder step by step.",
  } satisfies WorkedExampleTokenMap;
}

function resolveBinarySearchHalvingTokens(state: LiveWorkedExampleState) {
  const resolved = resolveBinarySearchHalvingParams({
    arraySize: toNumber(state.params.arraySize, 14),
    targetIndex: toNumber(state.params.targetIndex, 10),
    linearContrast: state.params.linearContrast !== false,
  });
  const snapshot = sampleBinarySearchHalvingState(resolved, state.time);
  const midValue = snapshot.values[snapshot.midIndex] ?? 0;

  return {
    arraySizeValue: formatNumber(snapshot.arraySize),
    targetIndexValue: formatNumber(snapshot.targetIndex),
    targetValueValue: formatNumber(snapshot.targetValue),
    lowIndexValue: formatNumber(snapshot.lowIndex),
    midIndexValue: formatNumber(snapshot.midIndex),
    highIndexValue: formatNumber(snapshot.highIndex),
    midValueValue: formatNumber(midValue),
    intervalWidthValue: formatNumber(snapshot.intervalWidth),
    comparisonsValue: formatNumber(snapshot.comparisons),
    linearNeedValue: formatNumber(snapshot.targetIndex + 1),
    binaryInterpretation: snapshot.found
      ? "The midpoint has already landed on the target, so the search is done without scanning through the whole list."
      : snapshot.targetValue > midValue
        ? "Because the target is larger than the midpoint value, the left half is already ruled out."
        : "Because the target is smaller than the midpoint value, the right half is already ruled out.",
  } satisfies WorkedExampleTokenMap;
}

function resolveVectors2DTokens(state: LiveWorkedExampleState) {
  const resolved = resolveVectors2DParams({
    ax: toNumber(state.params.ax, 3),
    ay: toNumber(state.params.ay, 2),
    bx: toNumber(state.params.bx, 1.5),
    by: toNumber(state.params.by, 3),
    scalar: toNumber(state.params.scalar, 1),
    subtractMode: state.params.subtractMode === true,
  });
  const snapshot = sampleVectors2DState(resolved);

  return {
    axValue: formatNumber(snapshot.ax),
    ayValue: formatNumber(snapshot.ay),
    bxValue: formatNumber(snapshot.bx),
    byValue: formatNumber(snapshot.by),
    scalarValue: formatNumber(snapshot.scalar),
    scaledAxValue: formatNumber(snapshot.scaledAx),
    scaledAyValue: formatNumber(snapshot.scaledAy),
    effectiveBxValue: formatNumber(snapshot.effectiveBx),
    effectiveByValue: formatNumber(snapshot.effectiveBy),
    resultXValue: formatNumber(snapshot.resultX),
    resultYValue: formatNumber(snapshot.resultY),
    resultMagnitudeValue: formatNumber(snapshot.resultMagnitude),
    resultAngleValue: formatNumber(snapshot.resultAngle),
    scaledMagnitudeValue: formatNumber(snapshot.scaledMagnitude),
    operationSymbol: snapshot.subtractMode ? "-" : "+",
    vectorInterpretation:
      snapshot.resultMagnitude <= 0.08
        ? "The two pieces almost cancel, so the resultant is very close to the zero vector."
        : snapshot.subtractMode
          ? "Subtraction is being shown as adding the opposite of B, so the tip-to-tail picture uses sA and -B on the same plane."
          : "Addition is being shown tip-to-tail, so the resultant runs from the origin to the final endpoint after sA and B are combined.",
    magnitudeInterpretation:
      snapshot.scalar < 0
        ? "A negative scalar flips vector A through the origin before changing its size."
        : Math.abs(snapshot.scalar) < 1
          ? "Because |s| is below one, the scaled version of A is compressed before it combines with B."
          : Math.abs(snapshot.scalar) > 1
            ? "Because |s| is above one, the scaled version of A stretches before it combines with B."
            : "With s = 1, the first vector keeps its original size before the combination step.",
  } satisfies WorkedExampleTokenMap;
}

const builders: Record<ConceptSlug, Record<string, WorkedExampleBuilder>> = {
  "reaction-rate-collision-theory": {
    "successful-versus-total-collisions": resolveReactionRateCollisionTheoryTokens,
    "lower-the-barrier-without-heating": resolveReactionRateCollisionTheoryTokens,
  },
  "dynamic-equilibrium-le-chateliers-principle": {
    "read-the-current-balance": resolveDynamicEquilibriumTokens,
    "read-the-new-settled-mix": resolveDynamicEquilibriumTokens,
  },
  "complex-numbers-on-the-plane": {
    "read-the-current-vector-sum": resolveComplexNumbersPlaneTokens,
    "read-complex-multiplication-geometrically": resolveComplexNumbersPlaneTokens,
  },
  "dot-product-angle-and-projection": {
    "current-dot-product": resolveDotProductProjectionTokens,
    "current-projection": resolveDotProductProjectionTokens,
  },
  "parametric-curves-motion-from-equations": {
    "read-the-current-parametric-point": resolveParametricCurvesMotionTokens,
    "separate-shape-from-traversal": resolveParametricCurvesMotionTokens,
  },
  "sorting-and-algorithmic-trade-offs": {
    "read-the-current-sorting-trace": resolveSortingTradeoffsTokens,
  },
  "binary-search-halving-the-search-space": {
    "read-the-current-search-interval": resolveBinarySearchHalvingTokens,
  },
  "solubility-and-saturation": {
    "read-the-current-capacity": resolveSolubilitySaturationTokens,
  },
  "buffers-and-neutralization": {
    "read-buffer-response": resolveBuffersNeutralizationTokens,
  },
  "concentration-and-dilution": {
    "read-the-current-concentration": resolveConcentrationDilutionTokens,
    "dilute-without-losing-solute": resolveConcentrationDilutionTokens,
  },
  "acid-base-ph-intuition": {
    "read-the-current-ph-balance": resolveAcidBasePhTokens,
    "track-how-water-softens-the-shift": resolveAcidBasePhTokens,
  },
  "stoichiometric-ratios-and-recipe-batches": {
    "count-full-batches-from-a-matched-recipe": resolveStoichiometricRatiosTokens,
  },
  "limiting-reagent-and-leftover-reactants": {
    "read-an-a-limiting-run": resolveLimitingReagentTokens,
  },
  "percent-yield-and-reaction-extent": {
    "read-a-seventy-five-percent-yield-run": resolvePercentYieldTokens,
  },
  "graph-transformations": {
    "track-the-vertex": resolveGraphTransformationsTokens,
    "scale-and-reflect-the-height": resolveGraphTransformationsTokens,
  },
  "derivative-as-slope-local-rate-of-change": {
    "secant-slope-from-two-points": resolveDerivativeSlopeTokens,
    "tangent-slope-from-the-derivative": resolveDerivativeSlopeTokens,
  },
  "limits-and-continuity-approaching-a-value": {
    "compare-the-one-sided-values": resolveLimitsContinuityTokens,
    "limit-versus-the-actual-point": resolveLimitsContinuityTokens,
  },
  "integral-as-accumulation-area": {
    "current-accumulated-amount": resolveIntegralAccumulationTokens,
    "height-versus-total": resolveIntegralAccumulationTokens,
  },
  "vectors-in-2d": {
    "current-resultant-components": resolveVectors2DTokens,
    "scaled-vector-before-combination": resolveVectors2DTokens,
  },
  "simple-harmonic-motion": {
    "current-displacement": resolveShmTokens,
    "current-period": resolveShmTokens,
  },
  "oscillation-energy": {
    "current-energy-split": resolveOscillationEnergyTokens,
    "total-energy-scale": resolveOscillationEnergyTokens,
  },
  "uniform-circular-motion": {
    "current-x-projection": resolveUcmTokens,
    "centripetal-acceleration": resolveUcmTokens,
  },
  "circular-orbits-orbital-speed": {
    "required-circular-speed": resolveCircularOrbitsTokens,
    "current-orbit-balance": resolveCircularOrbitsTokens,
  },
  "keplers-third-law-orbital-periods": {
    "current-circular-period": resolveCircularOrbitsTokens,
    "radius-doubling-ratio": resolveCircularOrbitsTokens,
  },
  "escape-velocity": {
    "required-escape-speed": resolveEscapeVelocityTokens,
    "current-energy-check": resolveEscapeVelocityTokens,
  },
  "projectile-motion": {
    "predicted-range": resolveProjectileTokens,
    "current-velocity-components": resolveProjectileTokens,
  },
  "momentum-impulse": {
    "current-momentum": resolveMomentumImpulseTokens,
    "pulse-impulse": resolveMomentumImpulseTokens,
  },
  torque: {
    "current-torque": resolveTorqueTokens,
    "current-turning-state": resolveTorqueTokens,
  },
  "static-equilibrium-centre-of-mass": {
    "current-centre-of-mass": resolveStaticEquilibriumCentreOfMassTokens,
    "current-support-check": resolveStaticEquilibriumCentreOfMassTokens,
  },
  "rotational-inertia": {
    "current-inertia-response": resolveRotationalInertiaTokens,
    "current-spin-up-state": resolveRotationalInertiaTokens,
  },
  "rolling-motion": {
    "current-rolling-acceleration": resolveRollingMotionTokens,
    "current-no-slip-state": resolveRollingMotionTokens,
  },
  "angular-momentum": {
    "current-angular-momentum": resolveAngularMomentumTokens,
    "compact-reference-spin": resolveAngularMomentumTokens,
  },
  "conservation-of-momentum": {
    "current-total-momentum": resolveConservationMomentumTokens,
    "final-momentum-split": resolveConservationMomentumTokens,
  },
  collisions: {
    "current-total-momentum": resolveCollisionsTokens,
    "final-velocity-split": resolveCollisionsTokens,
  },
  "damping-resonance": {
    "current-displacement": resolveDampingTokens,
    "response-amplitude": resolveDampingTokens,
  },
  "vectors-components": {
    "current-components": resolveVectorsComponentsTokens,
    "current-displacement": resolveVectorsComponentsTokens,
  },
  "basic-circuits": {
    "equivalent-resistance-and-current": resolveBasicCircuitsTokens,
    "branch-b-current-and-voltage": resolveBasicCircuitsTokens,
  },
  "power-energy-circuits": {
    "current-and-power": resolvePowerEnergyCircuitsTokens,
    "energy-over-time": resolvePowerEnergyCircuitsTokens,
  },
  "rc-charging-and-discharging": {
    "time-constant-and-capacitor-voltage": resolveRcChargingDischargingTokens,
    "current-and-stored-energy": resolveRcChargingDischargingTokens,
  },
  "internal-resistance-and-terminal-voltage": {
    "current-and-terminal-voltage": resolveInternalResistanceTerminalVoltageTokens,
    "power-delivered-vs-lost": resolveInternalResistanceTerminalVoltageTokens,
  },
  "temperature-and-internal-energy": {
    "same-temperature-different-total-energy": resolveTemperatureInternalEnergyTokens,
    "heating-through-the-shelf": resolveTemperatureInternalEnergyTokens,
  },
  "ideal-gas-law-and-kinetic-theory": {
    "current-pressure-state": resolveIdealGasLawKineticTheoryTokens,
    "current-kinetic-link": resolveIdealGasLawKineticTheoryTokens,
  },
  "pressure-and-hydrostatic-pressure": {
    "current-total-pressure": resolvePressureHydrostaticTokens,
    "one-meter-deeper": resolvePressureHydrostaticTokens,
  },
  "continuity-equation": {
    "current-section-speeds": resolveContinuityEquationTokens,
    "same-time-flow-slices": resolveContinuityEquationTokens,
  },
  "bernoullis-principle": {
    "current-throat-state": resolveBernoulliPrincipleTokens,
    "level-vs-raised-throat": resolveBernoulliPrincipleTokens,
  },
  "buoyancy-and-archimedes-principle": {
    "current-buoyant-force": resolveBuoyancyArchimedesTokens,
    "current-force-balance": resolveBuoyancyArchimedesTokens,
  },
  "drag-and-terminal-velocity": {
    "current-terminal-speed": resolveDragTerminalVelocityTokens,
    "current-force-balance": resolveDragTerminalVelocityTokens,
  },
  "heat-transfer": {
    "current-pathway-split": resolveHeatTransferTokens,
    "cooling-over-time": resolveHeatTransferTokens,
  },
  "specific-heat-and-phase-change": {
    "same-input-different-temperature-rise": resolveSpecificHeatPhaseChangeTokens,
    "reading-the-shelf": resolveSpecificHeatPhaseChangeTokens,
  },
  "series-parallel-circuits": {
    "total-current-from-arrangement": resolveSeriesParallelCircuitsTokens,
    "load-b-rate-and-brightness": resolveSeriesParallelCircuitsTokens,
  },
  "equivalent-resistance": {
    "group-then-total-equivalent": resolveEquivalentResistanceTokens,
    "group-voltage-and-r3-charge": resolveEquivalentResistanceTokens,
  },
  "kirchhoff-loop-and-junction-rules": {
    "junction-balance-current": resolveKirchhoffRulesTokens,
    "loop-balance-around-r3": resolveKirchhoffRulesTokens,
  },
  "electric-fields": {
    "current-net-field": resolveElectricFieldsTokens,
    "current-test-charge-force": resolveElectricFieldsTokens,
  },
  "gravitational-fields": {
    "current-gravity-field": resolveGravitationalFieldsTokens,
    "current-probe-force": resolveGravitationalFieldsTokens,
  },
  "gravitational-potential-energy": {
    "current-gravitational-potential": resolveGravitationalPotentialTokens,
    "current-gravitational-potential-energy": resolveGravitationalPotentialTokens,
  },
  "electric-potential": {
    "current-net-potential": resolveElectricPotentialTokens,
    "current-potential-energy": resolveElectricPotentialTokens,
  },
  "capacitance-and-stored-electric-energy": {
    "current-capacitance": resolveCapacitanceElectricEnergyTokens,
    "current-stored-energy": resolveCapacitanceElectricEnergyTokens,
  },
  "magnetic-fields": {
    "current-net-field": resolveMagneticFieldsTokens,
    "current-source-comparison": resolveMagneticFieldsTokens,
  },
  "electromagnetic-induction": {
    "current-flux-and-emf": resolveElectromagneticInductionTokens,
    "flux-peak-versus-emf": resolveElectromagneticInductionTokens,
  },
  "maxwells-equations-synthesis": {
    "current-source-laws": resolveMaxwellEquationsSynthesisTokens,
    "current-circulation-bridge": resolveMaxwellEquationsSynthesisTokens,
  },
  "electromagnetic-waves": {
    "local-field-pair": resolveElectromagneticWavesTokens,
    "source-probe-delay": resolveElectromagneticWavesTokens,
  },
  "light-spectrum-linkage": {
    "visible-band-frequency": resolveLightSpectrumLinkageTokens,
    "medium-wavelength-delay": resolveLightSpectrumLinkageTokens,
  },
  "dispersion-refractive-index-color": {
    "current-index-from-wavelength": resolveDispersionRefractiveIndexColorTokens,
    "red-violet-spread": resolveDispersionRefractiveIndexColorTokens,
  },
  polarization: {
    "current-output-state": resolvePolarizationTokens,
    "current-blocked-share": resolvePolarizationTokens,
  },
  diffraction: {
    "first-minimum-angle": resolveDiffractionTokens,
    "probe-intensity": resolveDiffractionTokens,
  },
  "optical-resolution-imaging-limits": {
    "rayleigh-limit-from-live-aperture": resolveOpticalResolutionTokens,
    "current-separation-versus-threshold": resolveOpticalResolutionTokens,
  },
  "double-slit-interference": {
    "path-difference-to-phase": resolveDoubleSlitInterferenceTokens,
    "fringe-spacing-geometry": resolveDoubleSlitInterferenceTokens,
  },
  "photoelectric-effect": {
    "current-energy-budget": resolvePhotoelectricEffectTokens,
    "current-stopping-potential": resolvePhotoelectricEffectTokens,
  },
  "atomic-spectra": {
    "current-visible-pair": resolveAtomicSpectraTokens,
    "current-mode-line": resolveAtomicSpectraTokens,
  },
  "de-broglie-matter-waves": {
    "current-wavelength-from-momentum": resolveDeBroglieMatterWavesTokens,
    "current-loop-fit": resolveDeBroglieMatterWavesTokens,
  },
  "bohr-model": {
    "active-transition-wavelength": resolveBohrModelTokens,
    "current-series-scale": resolveBohrModelTokens,
  },
  "radioactivity-half-life": {
    "current-expected-remaining": resolveRadioactivityHalfLifeTokens,
    "current-sample-spread": resolveRadioactivityHalfLifeTokens,
  },
  "magnetic-force-moving-charges-currents": {
    "current-charge-force": resolveMagneticForceTokens,
    "current-wire-force": resolveMagneticForceTokens,
  },
  "refraction-snells-law": {
    "solve-refracted-angle": resolveRefractionSnellsLawTokens,
    "compare-speed-ratio": resolveRefractionSnellsLawTokens,
  },
  "total-internal-reflection": {
    "solve-critical-angle": resolveRefractionSnellsLawTokens,
    "classify-boundary-state": resolveRefractionSnellsLawTokens,
  },
  mirrors: {
    "solve-image-distance": resolveMirrorsTokens,
    "solve-image-height": resolveMirrorsTokens,
  },
  "lens-imaging": {
    "solve-image-distance": resolveLensImagingTokens,
    "solve-image-height": resolveLensImagingTokens,
  },
  "wave-speed-wavelength": {
    "wave-relation": resolveWaveSpeedWavelengthTokens,
    "probe-delay": resolveWaveSpeedWavelengthTokens,
  },
  "sound-waves-longitudinal-motion": {
    "sound-travel-timing": resolveSoundWavesLongitudinalTokens,
    "local-compression-cue": resolveSoundWavesLongitudinalTokens,
  },
  "pitch-frequency-loudness-intensity": {
    "pitch-from-frequency": resolvePitchFrequencyLoudnessTokens,
    "loudness-from-amplitude": resolvePitchFrequencyLoudnessTokens,
  },
  beats: {
    "beat-rate-from-frequencies": resolveBeatsTokens,
    "current-envelope-strength": resolveBeatsTokens,
  },
  "doppler-effect": {
    "front-vs-rear-spacing": resolveDopplerEffectTokens,
    "heard-frequency-from-motion": resolveDopplerEffectTokens,
  },
  "wave-interference": {
    "path-to-phase": resolveWaveInterferenceTokens,
    "resultant-envelope": resolveWaveInterferenceTokens,
  },
  "standing-waves": {
    "allowed-wavelength": resolveStandingWavesTokens,
    "probe-displacement": resolveStandingWavesTokens,
  },
  "resonance-air-columns-open-closed-pipes": {
    "allowed-frequency": resolveAirColumnResonanceTokens,
    "probe-motion-vs-pressure": resolveAirColumnResonanceTokens,
  },
};

function localizeResolvedUcmExample(input: {
  example: ConceptWorkedExample;
  locale: AppLocale;
  resolved: ResolvedWorkedExample;
  tokens: WorkedExampleTokenMap;
}) {
  if (input.locale !== "zh-HK") {
    return input.resolved;
  }

  const { example, resolved, tokens } = input;

  if (example.id === "current-x-projection") {
    return {
      ...resolved,
      steps: resolved.steps.map((step) => {
        if (step.id === "relation") {
          return {
            ...step,
            content: "使用圓周運動的水平投影關係：$x(t) = R\\cos(\\omega t + \\phi)$。",
          };
        }

        if (step.id === "substitute") {
          return {
            ...step,
            content:
              `$x(${tokens.timeValue ?? "—"}) = ${tokens.radiusValue ?? "—"}` +
              `\\cos(${tokens.omegaValue ?? "—"}\\cdot ${tokens.timeValue ?? "—"} + ` +
              `${tokens.phaseValue ?? "—"})$。`,
          };
        }

        if (step.id === "compute") {
          return {
            ...step,
            content:
              `目前角度為 $\\theta = ${tokens.angleValue ?? "—"}$，` +
              `所以水平位置是 $x = ${tokens.xValue ?? "—"}\\,\\mathrm{m}$。`,
          };
        }

        return step;
      }),
    } satisfies ResolvedWorkedExample;
  }

  if (example.id === "centripetal-acceleration") {
    return {
      ...resolved,
      steps: resolved.steps.map((step) => {
        if (step.id === "relation") {
          return {
            ...step,
            content: "對於均速圓周運動，$a_c = \\omega^2 R$。",
          };
        }

        if (step.id === "substitute") {
          return {
            ...step,
            content: `$a_c = (${tokens.omegaValue ?? "—"})^2\\cdot ${tokens.radiusValue ?? "—"}$。`,
          };
        }

        if (step.id === "compute") {
          return {
            ...step,
            content: `所以 $a_c = ${tokens.centripetalAccelerationValue ?? "—"}\\,\\mathrm{m/s^2}$。`,
          };
        }

        return step;
      }),
    } satisfies ResolvedWorkedExample;
  }

  return resolved;
}

function localizeResolvedPitchFrequencyLoudnessExample(input: {
  example: ConceptWorkedExample;
  locale: AppLocale;
  resolved: ResolvedWorkedExample;
  tokens: WorkedExampleTokenMap;
}) {
  if (input.locale !== "zh-HK") {
    return input.resolved;
  }

  const { example, resolved, tokens } = input;

  if (example.id === "pitch-from-frequency") {
    return {
      ...resolved,
      steps: resolved.steps.map((step) => {
        if (step.id === "relation") {
          return {
            ...step,
            content: "使用 $\\lambda = \\dfrac{v_{wave}}{f}$ 和 $T = \\dfrac{1}{f}$。",
          };
        }

        if (step.id === "substitute") {
          return {
            ...step,
            content:
              `$\\lambda = \\dfrac{${tokens.waveSpeedValue ?? "—"}}{${tokens.frequencyValue ?? "—"}} = ` +
              `${tokens.wavelengthValue ?? "—"}\\,\\mathrm{m}$，且 ` +
              `$T = \\dfrac{1}{${tokens.frequencyValue ?? "—"}} = ` +
              `${tokens.periodValue ?? "—"}\\,\\mathrm{s}$。`,
          };
        }

        if (step.id === "compute") {
          return {
            ...step,
            content: `頻率 ${tokens.frequencyValue ?? "—"} Hz 設定聲源的重複速率，所以音高由時間節奏決定，而間距變為 ${tokens.wavelengthValue ?? "—"} m。`,
          };
        }

        return step;
      }),
    } satisfies ResolvedWorkedExample;
  }

  if (example.id === "loudness-from-amplitude") {
    return {
      ...resolved,
      steps: resolved.steps.map((step) => {
        if (step.id === "relation") {
          return {
            ...step,
            content: "這個工作台使用 $I_{cue} \\propto A^2$，所以振幅越大，音量提示就越強。",
          };
        }

        if (step.id === "substitute") {
          return {
            ...step,
            content:
              `$I_{cue} \\approx A^2 = (${tokens.amplitudeValue ?? "—"})^2 = ` +
              `${tokens.intensityCueValue ?? "—"}$，單位是任意的振幅平方單位。`,
          };
        }

        if (step.id === "compute") {
          return {
            ...step,
            content: "如果頻率保持固定，這個 $A$ 控制聲音有多響，而音高仍由頻率決定。",
          };
        }

        return step;
      }),
    } satisfies ResolvedWorkedExample;
  }

  return resolved;
}

function localizeResolvedBeatsExample(input: {
  example: ConceptWorkedExample;
  locale: AppLocale;
  resolved: ResolvedWorkedExample;
  tokens: WorkedExampleTokenMap;
}) {
  if (input.locale !== "zh-HK") {
    return input.resolved;
  }

  const { example, resolved, tokens } = input;

  if (example.id === "beat-rate-from-frequencies") {
    return {
      ...resolved,
      steps: resolved.steps.map((step) => {
        if (step.id === "relation") {
          return {
            ...step,
            content:
              "使用 $f_{beat} = |f_2 - f_1|$ 表示包絡速率，並用 " +
              "$f_{avg} = \\dfrac{f_1 + f_2}{2}$ 表示底下較快的載波。",
          };
        }

        if (step.id === "substitute") {
          return {
            ...step,
            content:
              `$f_{beat} = |${tokens.frequencyBValue ?? "—"} - ${tokens.frequencyAValue ?? "—"}| = ` +
              `${tokens.frequencyDifferenceValue ?? "—"}\\,\\mathrm{Hz}$，而 ` +
              `$f_{avg} = \\dfrac{ ${tokens.frequencyAValue ?? "—"} + ${tokens.frequencyBValue ?? "—"} }{2} = ` +
              `${tokens.averageFrequencyValue ?? "—"}\\,\\mathrm{Hz}$。`,
          };
        }

        if (step.id === "compute") {
          return {
            ...step,
            content:
              `所以包絡以 $${tokens.beatFrequencyValue ?? "—"}\\,\\mathrm{Hz}$ 重複，` +
              `${tokens.beatPeriodClause ?? "沒有單獨的拍頻週期"}，而較快振盪仍以 ` +
              `$${tokens.averageFrequencyValue ?? "—"}\\,\\mathrm{Hz}$ 為中心。`,
          };
        }

        return step;
      }),
    } satisfies ResolvedWorkedExample;
  }

  if (example.id === "current-envelope-strength") {
    return {
      ...resolved,
      steps: resolved.steps.map((step) => {
        if (step.id === "relation") {
          return {
            ...step,
            content:
              "對於相同來源振幅，這個實驗台使用 " +
              "$A_{env} = 2A\\left|\\cos\\!\\left(\\pi \\Delta f\\, t\\right)\\right|$，" +
              "並使用近似 $\\left(\\dfrac{A_{env}}{2A}\\right)^2$ 的正規化音量提示。",
          };
        }

        if (step.id === "substitute") {
          return {
            ...step,
            content:
              `$A_{env} = 2(${tokens.amplitudeValue ?? "—"})` +
              `\\left|\\cos\\!\\left(\\pi(${tokens.frequencyDifferenceValue ?? "—"})` +
              `(${tokens.timeValue ?? "—"})\\right)\\right| = ` +
              `${tokens.envelopeAmplitudeValue ?? "—"}\\,\\mathrm{m}$。`,
          };
        }

        if (step.id === "compute") {
          return {
            ...step,
            content:
              `這個包絡是此處最大可能值的 ${tokens.envelopeRatioValue ?? "—"}，` +
              `所以有界音量提示是 $${tokens.loudnessCueValue ?? "—"}$，` +
              "即使兩個來源振幅本身都沒有改變。",
          };
        }

        return step;
      }),
    } satisfies ResolvedWorkedExample;
  }

  return resolved;
}

function localizeResolvedDopplerEffectExample(input: {
  example: ConceptWorkedExample;
  locale: AppLocale;
  resolved: ResolvedWorkedExample;
  tokens: WorkedExampleTokenMap;
}) {
  if (input.locale !== "zh-HK") {
    return input.resolved;
  }

  const { example, resolved, tokens } = input;

  if (example.id === "front-vs-rear-spacing") {
    return {
      ...resolved,
      steps: resolved.steps.map((step) => {
        if (step.id === "relation") {
          return {
            ...step,
            content:
              "使用 $\\lambda_{\\text{前方}} = \\dfrac{v_{wave} - v_s}{f_s}$ 和 " +
              "$\\lambda_{\\text{後方}} = \\dfrac{v_{wave} + v_s}{f_s}$。",
          };
        }

        if (step.id === "substitute") {
          return {
            ...step,
            content:
              `$\\lambda_{\\text{前方}} = \\dfrac{ ${tokens.waveSpeedValue ?? "—"} - ${tokens.sourceSpeedValue ?? "—"} }{ ${tokens.sourceFrequencyValue ?? "—"} } = ` +
              `${tokens.frontSpacingValue ?? "—"}\\,\\mathrm{m}$，而 ` +
              `$\\lambda_{\\text{後方}} = \\dfrac{ ${tokens.waveSpeedValue ?? "—"} + ${tokens.sourceSpeedValue ?? "—"} }{ ${tokens.sourceFrequencyValue ?? "—"} } = ` +
              `${tokens.backSpacingValue ?? "—"}\\,\\mathrm{m}$。`,
          };
        }

        if (step.id === "compute") {
          return {
            ...step,
            content:
              `聲源在兩次發射之間向前移動，所以前方間距壓縮到 ${tokens.frontSpacingValue ?? "—"} m，` +
              `後方間距拉長到 ${tokens.backSpacingValue ?? "—"} m。`,
          };
        }

        return step;
      }),
    } satisfies ResolvedWorkedExample;
  }

  if (example.id === "heard-frequency-from-motion") {
    return {
      ...resolved,
      steps: resolved.steps.map((step) => {
        if (step.id === "relation") {
          return {
            ...step,
            content: `在所選側面使用 $${tokens.observedRelation ?? "—"}$。`,
          };
        }

        if (step.id === "substitute") {
          return {
            ...step,
            content:
              `$f_{obs} = ${tokens.observedFrequencyValue ?? "—"}\\,\\mathrm{Hz}$，` +
              `所以 $T_{obs} = ${tokens.observedPeriodValue ?? "—"}\\,\\mathrm{s}$。`,
          };
        }

        if (step.id === "compute") {
          return {
            ...step,
            content:
              `觀察者在${tokens.sideLabelValue ?? "—"}側聽到約為發射頻率 ` +
              `${tokens.pitchRatioValue ?? "—"} 倍的頻率。`,
          };
        }

        return step;
      }),
    } satisfies ResolvedWorkedExample;
  }

  return resolved;
}

function localizeResolvedWaveInterferenceExample(input: {
  example: ConceptWorkedExample;
  locale: AppLocale;
  resolved: ResolvedWorkedExample;
  tokens: WorkedExampleTokenMap;
}) {
  if (input.locale !== "zh-HK") {
    return input.resolved;
  }

  const { example, resolved, tokens } = input;

  if (example.id === "path-to-phase") {
    return {
      ...resolved,
      steps: resolved.steps.map((step) => {
        if (step.id === "relation") {
          return {
            ...step,
            content: "使用 $\\Delta \\phi = \\dfrac{2\\pi \\Delta r}{\\lambda} + \\phi_0$。",
          };
        }

        if (step.id === "substitute") {
          return {
            ...step,
            content:
              `$\\Delta \\phi = \\dfrac{2\\pi(${tokens.pathDifferenceValue ?? "—"})}{${tokens.wavelengthValue ?? "—"}} + ` +
              `${tokens.phaseOffsetValue ?? "—"}$。`,
          };
        }

        if (step.id === "compute") {
          return {
            ...step,
            content:
              `包裹後的相位差是 $${tokens.wrappedPhaseValue ?? "—"}\\,\\mathrm{rad}$；` +
              `加入源相位偏移前，額外路徑約為 ${tokens.pathDifferenceCyclesValue ?? "—"} 個波長。`,
          };
        }

        return step;
      }),
    } satisfies ResolvedWorkedExample;
  }

  if (example.id === "resultant-envelope") {
    return {
      ...resolved,
      steps: resolved.steps.map((step) => {
        if (step.id === "relation") {
          return {
            ...step,
            content:
              "使用 $A_{\\mathrm{res}} = " +
              "\\sqrt{A_1^2 + A_2^2 + 2A_1A_2\\cos(\\Delta \\phi)}$。",
          };
        }

        if (step.id === "substitute") {
          return {
            ...step,
            content:
              `$A_{\\mathrm{res}} = \\sqrt{${tokens.amplitudeAValue ?? "—"}^2 + ` +
              `${tokens.amplitudeBValue ?? "—"}^2 + 2(${tokens.amplitudeAValue ?? "—"})` +
              `(${tokens.amplitudeBValue ?? "—"})\\cos(${tokens.wrappedPhaseValue ?? "—"})}$。`,
          };
        }

        if (step.id === "compute") {
          return {
            ...step,
            content:
              `目前探針的結果振幅是 $A_{\\mathrm{res}} = ${tokens.resultantAmplitudeValue ?? "—"}` +
              `\\,\\mathrm{a.u.}$，相對螢幕強度為 ${tokens.intensityValue ?? "—"}。`,
          };
        }

        return step;
      }),
    } satisfies ResolvedWorkedExample;
  }

  return resolved;
}

function localizeResolvedStandingWavesExample(input: {
  example: ConceptWorkedExample;
  locale: AppLocale;
  resolved: ResolvedWorkedExample;
  tokens: WorkedExampleTokenMap;
}) {
  if (input.locale !== "zh-HK") {
    return input.resolved;
  }

  const { example, resolved, tokens } = input;

  if (example.id === "allowed-wavelength") {
    return {
      ...resolved,
      steps: resolved.steps.map((step) => {
        if (step.id === "relation") {
          return {
            ...step,
            content: "固定兩端的弦可用 $\\lambda_n = \\dfrac{2L}{n}$ 和 $f_n = \\dfrac{nv}{2L}$。",
          };
        }

        if (step.id === "substitute") {
          return {
            ...step,
            content:
              `$\\lambda_n = \\dfrac{2(${tokens.lengthValue ?? "—"})}{${tokens.modeNumberValue ?? "—"}}$，` +
              `$f_n = \\dfrac{(${tokens.modeNumberValue ?? "—"})(${tokens.waveSpeedValue ?? "—"})}{2(${tokens.lengthValue ?? "—"})}$。`,
          };
        }

        if (step.id === "compute") {
          return {
            ...step,
            content:
              `所以 $\\lambda_n = ${tokens.wavelengthValue ?? "—"}\\,\\mathrm{m}$，` +
              `$f_n = ${tokens.frequencyValue ?? "—"}\\,\\mathrm{Hz}$，` +
              `節點間距是 $${tokens.nodeSpacingValue ?? "—"}\\,\\mathrm{m}$。`,
          };
        }

        return step;
      }),
    } satisfies ResolvedWorkedExample;
  }

  if (example.id === "probe-displacement") {
    return {
      ...resolved,
      steps: resolved.steps.map((step) => {
        if (step.id === "relation") {
          return {
            ...step,
            content:
              "使用 $y(x,t) = A\\sin\\!\\left(\\dfrac{n\\pi x}{L}\\right)" +
              "\\cos(2\\pi f_n t)$。",
          };
        }

        if (step.id === "substitute") {
          return {
            ...step,
            content:
              `這裡 $\\sin\\!\\left(\\dfrac{n\\pi x_p}{L}\\right) = ` +
              `${tokens.probeShapeValue ?? "—"}$，所以局部包絡是 ` +
              `$A_p = ${tokens.probeEnvelopeValue ?? "—"}\\,\\mathrm{m}$。`,
          };
        }

        if (step.id === "compute") {
          return {
            ...step,
            content: `在這個時刻，探針位移是 $y = ${tokens.probeDisplacementValue ?? "—"}\\,\\mathrm{m}$。`,
          };
        }

        return step;
      }),
    } satisfies ResolvedWorkedExample;
  }

  return resolved;
}

function localizeResolvedConservationMomentumExample(input: {
  example: ConceptWorkedExample;
  locale: AppLocale;
  resolved: ResolvedWorkedExample;
  tokens: WorkedExampleTokenMap;
}) {
  if (input.locale !== "zh-HK") {
    return input.resolved;
  }

  const { example, resolved, tokens } = input;

  if (example.id === "current-total-momentum") {
    return {
      ...resolved,
      steps: resolved.steps.map((step) => {
        if (step.id === "relation") {
          return {
            ...step,
            content: "在同一個時刻，把兩部車的動量相加：$p_{\\mathrm{tot}} = p_A + p_B$。",
          };
        }

        if (step.id === "substitute") {
          return {
            ...step,
            content: `$p_{\\mathrm{tot}} = ${tokens.momentumAValue ?? "—"} + ${tokens.momentumBValue ?? "—"}$。`,
          };
        }

        if (step.id === "compute") {
          return {
            ...step,
            content: `所以 $p_{\\mathrm{tot}} = ${tokens.totalMomentumValue ?? "—"}\\,\\mathrm{kg\\,m/s}$。`,
          };
        }

        return step;
      }),
    } satisfies ResolvedWorkedExample;
  }

  if (example.id === "final-momentum-split") {
    return {
      ...resolved,
      steps: resolved.steps.map((step) => {
        if (step.id === "relation") {
          return {
            ...step,
            content:
              "對一次孤立的內部互動，$\\Delta p_A = -F_{\\mathrm{int}}\\Delta t$，" +
              "$\\Delta p_B = +F_{\\mathrm{int}}\\Delta t$。",
          };
        }

        if (step.id === "substitute") {
          return {
            ...step,
            content:
              `$p_{A,f} = ${tokens.initialMomentumAValue ?? "—"} + (${tokens.deltaMomentumAValue ?? "—"})$，` +
              `$p_{B,f} = ${tokens.initialMomentumBValue ?? "—"} + (${tokens.deltaMomentumBValue ?? "—"})$。`,
          };
        }

        if (step.id === "compute") {
          return {
            ...step,
            content:
              `所以 $p_{A,f} = ${tokens.finalMomentumAValue ?? "—"}\\,\\mathrm{kg\\,m/s}$，` +
              `$p_{B,f} = ${tokens.finalMomentumBValue ?? "—"}\\,\\mathrm{kg\\,m/s}$。`,
          };
        }

        return step;
      }),
    } satisfies ResolvedWorkedExample;
  }

  return resolved;
}

function localizeResolvedWorkedExample(input: {
  slug: ConceptSlug;
  example: ConceptWorkedExample;
  locale: AppLocale;
  resolved: ResolvedWorkedExample;
  tokens: WorkedExampleTokenMap;
}) {
  if (input.slug === "momentum-impulse") {
    return localizeResolvedMomentumImpulseExample(input);
  }

  if (input.slug === "angular-momentum") {
    return localizeResolvedAngularMomentumExample(input);
  }

  if (input.slug === "conservation-of-momentum") {
    return localizeResolvedConservationMomentumExample(input);
  }

  if (input.slug === "uniform-circular-motion") {
    return localizeResolvedUcmExample(input);
  }

  if (input.slug === "pitch-frequency-loudness-intensity") {
    return localizeResolvedPitchFrequencyLoudnessExample(input);
  }

  if (input.slug === "beats") {
    return localizeResolvedBeatsExample(input);
  }

  if (input.slug === "doppler-effect") {
    return localizeResolvedDopplerEffectExample(input);
  }

  if (input.slug === "wave-interference") {
    return localizeResolvedWaveInterferenceExample(input);
  }

  if (input.slug === "standing-waves") {
    return localizeResolvedStandingWavesExample(input);
  }

  return input.resolved;
}

export function resolveLiveWorkedExample(
  slug: ConceptSlug,
  example: ConceptWorkedExample,
  state: LiveWorkedExampleState,
  locale: AppLocale = "en",
): ResolvedWorkedExample {
  const builder = builders[slug]?.[example.id];

  if (!builder) {
    throw new Error(`Missing live worked-example builder for "${slug}" / "${example.id}".`);
  }

  const tokens = builder(state, locale);
  const resolved = {
    prompt: interpolateTemplate(example.prompt, tokens),
    steps: example.steps.map((step) => ({
      id: step.id,
      label: step.label,
      content: interpolateTemplate(step.template, tokens),
    })),
    resultLabel: example.resultLabel,
    resultContent: interpolateTemplate(example.resultTemplate, tokens),
    interpretation: example.interpretationTemplate
      ? interpolateTemplate(example.interpretationTemplate, tokens)
      : undefined,
    variableValues: example.variables.reduce<Record<string, string>>((accumulator, variable) => {
      accumulator[variable.id] = tokens[variable.valueKey] ?? "—";
      return accumulator;
    }, {}),
  };

  return localizeResolvedWorkedExample({
    slug,
    example,
    locale,
    resolved,
    tokens,
  });
}
