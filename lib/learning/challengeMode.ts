import type { ConceptChallengeItem } from "@/lib/content";
import {
  type ConceptSimulationSource,
  formatMeasurement,
  resolveReactionRateCollisionTheoryParams,
  resolveDynamicEquilibriumParams,
  resolveBasicCircuitsParams,
  resolveEquivalentResistanceParams,
  resolveElectricFieldsParams,
  resolveGravitationalFieldsParams,
  resolveGravitationalPotentialParams,
  resolveGraphTransformationsParams,
  resolveDerivativeSlopeParams,
  resolveIntegralAccumulationParams,
  resolveComplexNumbersPlaneParams,
  resolveParametricCurvesMotionParams,
  resolveSortingTradeoffsParams,
  resolveBinarySearchHalvingParams,
  resolveSolubilitySaturationParams,
  resolveBuffersNeutralizationParams,
  resolveConcentrationDilutionParams,
  resolveAcidBasePhParams,
  resolveCircularOrbitsParams,
  resolveEscapeVelocityParams,
  resolveElectricPotentialParams,
  resolveCapacitanceElectricEnergyParams,
  resolveInternalResistanceTerminalVoltageParams,
  resolveDopplerEffectParams,
  resolveElectromagneticInductionParams,
  resolveLightSpectrumLinkageParams,
  resolveDispersionRefractiveIndexColorParams,
  resolvePolarizationParams,
  resolveDiffractionParams,
  resolveOpticalResolutionParams,
  resolveDoubleSlitInterferenceParams,
  resolvePhotoelectricEffectParams,
  resolveAtomicSpectraParams,
  resolveDeBroglieMatterWavesParams,
  resolveBohrModelParams,
  resolveRadioactivityHalfLifeParams,
  resolveMagneticForceParams,
  resolveMagneticFieldsParams,
  resolveMirrorsParams,
  resolveBeatsParams,
  resolveSoundWavesLongitudinalParams,
  resolveAirColumnResonanceParams,
  peakFrequency,
  resolveLensImagingParams,
  resolveAngularFrequency,
  resolvePowerEnergyCircuitsParams,
  resolveRcChargingDischargingParams,
  resolveHeatTransferParams,
  resolveIdealGasLawKineticTheoryParams,
  samplePressureHydrostaticState,
  sampleContinuityEquationState,
  sampleBernoulliPrincipleState,
  sampleBuoyancyArchimedesState,
  sampleDragTerminalVelocityState,
  resolveSpecificHeatPhaseChangeParams,
  resolveTemperatureInternalEnergyParams,
  resolveAngularMomentumParams,
  resolveRollingMotionParams,
  resolveRotationalInertiaParams,
  resolveStaticEquilibriumCentreOfMassParams,
  resolveTorqueParams,
  resolveProjectileParams,
  resolveRefractionSnellsLawParams,
  resolveSeriesParallelCircuitsParams,
  resolveSpringConstant,
  resolveUcmParams,
  resolveVectors2DParams,
  resolveVectorsComponentsParams,
  resolveWaveSpeedWavelengthParams,
  resolveWaveInterferenceParams,
  resolveStandingWavesParams,
  sampleBasicCircuitsState,
  sampleDampingState,
  sampleEquivalentResistanceState,
  sampleReactionRateCollisionTheoryState,
  sampleDynamicEquilibriumState,
  sampleElectricFieldsState,
  sampleGravitationalFieldsState,
  sampleGravitationalPotentialState,
  sampleGraphTransformationsState,
  sampleDerivativeSlopeState,
  sampleIntegralAccumulationState,
  sampleComplexNumbersPlaneState,
  sampleParametricCurvesMotionState,
  sampleSortingTradeoffsState,
  sampleBinarySearchHalvingState,
  sampleSolubilitySaturationState,
  sampleBuffersNeutralizationState,
  sampleConcentrationDilutionState,
  sampleAcidBasePhState,
  sampleCircularOrbitsState,
  sampleEscapeVelocityState,
  sampleElectricPotentialState,
  sampleCapacitanceElectricEnergyState,
  sampleInternalResistanceTerminalVoltageState,
  sampleDopplerEffectState,
  sampleElectromagneticInductionState,
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
  sampleMirrorsState,
  sampleBeatsState,
  sampleSoundWavesLongitudinalState,
  sampleLensImagingState,
  samplePowerEnergyCircuitsState,
  sampleRcChargingDischargingState,
  sampleHeatTransferState,
  sampleIdealGasLawKineticTheoryState,
  sampleSpecificHeatPhaseChangeState,
  sampleTemperatureInternalEnergyState,
  sampleAngularMomentumState,
  sampleRollingMotionState,
  sampleRotationalInertiaState,
  sampleStaticEquilibriumCentreOfMassState,
  sampleTorqueState,
  sampleProjectileState,
  sampleRefractionSnellsLawState,
  sampleSeriesParallelCircuitsState,
  sampleShmState,
  sampleAirColumnResonanceState,
  sampleStandingWavesState,
  sampleUcmState,
  sampleVectors2DState,
  sampleVectorsComponentsState,
  sampleWaveSpeedWavelengthState,
  sampleWaveInterferenceState,
  type ControlValue,
} from "@/lib/physics";

export type ChallengeCompareRuntime = {
  activeTarget: "a" | "b";
  setupA: Record<string, ControlValue>;
  setupB: Record<string, ControlValue>;
} | null;

export type ChallengeRuntimeState = {
  params: Record<string, ControlValue>;
  activeGraphId: string | null;
  overlayValues: Record<string, boolean>;
  time: number;
  timeSource: "live" | "inspect" | "preview";
  compare: ChallengeCompareRuntime;
};

export type ChallengeCheckEvaluation = {
  label: string;
  passed: boolean;
  currentValue?: string;
};

export type ChallengeEvaluation = {
  completed: boolean;
  matchedCount: number;
  totalCount: number;
  checks: ChallengeCheckEvaluation[];
};

export const challengeStyleLabels: Record<ConceptChallengeItem["style"], string> = {
  "target-setting": "Target",
  "parameter-match": "Match",
  maximize: "Maximize",
  minimize: "Minimize",
  "visible-condition": "Condition",
};

function readNumericValue(
  source: Record<string, ControlValue>,
  ...keys: string[]
) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function isWithinRange(value: number | null, min?: number, max?: number) {
  if (value === null || !Number.isFinite(value)) {
    return false;
  }

  if (min !== undefined && value < min) {
    return false;
  }

  if (max !== undefined && value > max) {
    return false;
  }

  return true;
}

function formatValue(value: number | null, unit?: string) {
  if (value === null || !Number.isFinite(value)) {
    return undefined;
  }

  return formatMeasurement(value, unit);
}

function resolveMetricValue(
  concept: ConceptSimulationSource,
  runtime: ChallengeRuntimeState,
  metric: string,
) {
  const params = runtime.params;

  switch (concept.simulation.kind) {
    case "projectile": {
      const resolved = resolveProjectileParams(params);
      const snapshot = sampleProjectileState(resolved, runtime.time);

      switch (metric) {
        case "launchSpeed":
          return resolved.launchSpeed;
        case "launchAngle":
          return resolved.launchAngle;
        case "gravity":
          return resolved.gravity;
        case "launchHeight":
          return resolved.launchHeight;
        case "x":
          return snapshot.x;
        case "y":
          return snapshot.y;
        case "vx":
          return snapshot.vx;
        case "vy":
          return snapshot.vy;
        case "speed":
          return Math.hypot(snapshot.vx, snapshot.vy);
        case "range":
          return snapshot.range;
        case "maxHeight":
          return snapshot.maxHeight;
        case "flightTime":
          return snapshot.timeOfFlight;
        default:
          return null;
      }
    }
    case "ucm": {
      const resolved = resolveUcmParams(params);
      const snapshot = sampleUcmState(resolved, runtime.time);

      switch (metric) {
        case "radius":
          return resolved.radius;
        case "angularSpeed":
          return resolved.angularSpeed;
        case "phase":
          return resolved.phase;
        case "x":
          return snapshot.x;
        case "y":
          return snapshot.y;
        case "speed":
          return snapshot.speed;
        case "centripetalAcceleration":
          return snapshot.centripetalAcceleration;
        case "period":
          return snapshot.period;
        case "angle":
          return snapshot.wrappedAngle;
        default:
          return null;
      }
    }
    case "shm": {
      const amplitude = readNumericValue(params, "amplitude") ?? 0;
      const springConstant = readNumericValue(params, "springConstant") ?? undefined;
      const mass = readNumericValue(params, "mass") ?? undefined;
      const phase = readNumericValue(params, "phase") ?? 0;
      const angularFrequency = readNumericValue(params, "omega", "angularFrequency") ?? undefined;
      const damping = readNumericValue(params, "damping") ?? undefined;
      const equilibriumShift = readNumericValue(params, "equilibriumShift") ?? undefined;
      const resolved = {
        amplitude,
        springConstant,
        mass,
        phase,
        angularFrequency,
        damping,
        equilibriumShift,
      };
      const snapshot = sampleShmState(resolved, runtime.time);
      const omega = resolveAngularFrequency(resolved);

      switch (metric) {
        case "amplitude":
          return amplitude;
        case "springConstant":
          return resolveSpringConstant(resolved);
        case "mass":
          return mass ?? 1;
        case "phase":
          return phase;
        case "omega":
          return omega;
        case "displacement":
          return snapshot.displacement;
        case "velocity":
          return snapshot.velocity;
        case "acceleration":
          return snapshot.acceleration;
        case "kineticEnergy":
          return snapshot.energy.kinetic;
        case "potentialEnergy":
          return snapshot.energy.potential;
        case "totalEnergy":
          return snapshot.energy.total;
        case "energyGap":
          return Math.abs(snapshot.energy.kinetic - snapshot.energy.potential);
        case "period":
          return (2 * Math.PI) / Math.max(omega, 0.001);
        default:
          return null;
      }
    }
    case "damping-resonance": {
      const resolved = {
        naturalFrequency: readNumericValue(params, "naturalFrequency") ?? 1,
        drivingFrequency:
          readNumericValue(params, "driveFrequency", "drivingFrequency") ?? 1,
        damping: readNumericValue(params, "dampingRatio", "damping") ?? 0,
        driveAmplitude: readNumericValue(params, "driveAmplitude") ?? 1,
        resonanceMode: Boolean(params.responseMode ?? params.resonanceMode),
        phase: readNumericValue(params, "phase") ?? 0,
      };
      const snapshot = sampleDampingState(resolved, runtime.time);
      const resonancePeak = peakFrequency(resolved);

      switch (metric) {
        case "naturalFrequency":
          return resolved.naturalFrequency;
        case "driveFrequency":
          return resolved.drivingFrequency;
        case "dampingRatio":
          return resolved.damping;
        case "driveAmplitude":
          return resolved.driveAmplitude;
        case "displacement":
          return snapshot.displacement;
        case "amplitude":
          return snapshot.amplitude;
        case "responseAmplitude":
          return snapshot.responseAmplitude;
        case "phaseLag":
          return snapshot.phaseLag;
        case "peakFrequency":
          return resonancePeak;
        case "resonanceOffset":
          return Math.abs(resolved.drivingFrequency - resonancePeak);
        default:
          return null;
      }
    }
    case "reaction-rate-collision-theory": {
      const resolved = resolveReactionRateCollisionTheoryParams(params);
      const snapshot = sampleReactionRateCollisionTheoryState(resolved);

      switch (metric) {
        case "temperature":
          return resolved.temperature;
        case "concentration":
          return resolved.concentration;
        case "activationEnergy":
          return resolved.activationEnergy;
        case "effectiveActivationEnergy":
          return snapshot.effectiveActivationEnergy;
        case "averageEnergy":
          return snapshot.averageEnergy;
        case "attemptRate":
          return snapshot.attemptRate;
        case "successFraction":
          return snapshot.successFraction;
        case "successfulCollisionRate":
          return snapshot.successfulCollisionRate;
        case "unsuccessfulCollisionRate":
          return snapshot.unsuccessfulCollisionRate;
        default:
          return null;
      }
    }
    case "dynamic-equilibrium": {
      const resolved = resolveDynamicEquilibriumParams(params);
      const snapshot = sampleDynamicEquilibriumState(resolved, runtime.time);

      switch (metric) {
        case "productFavor":
          return resolved.productFavor;
        case "reactantsCurrent":
          return snapshot.currentReactantAmount;
        case "productsCurrent":
          return snapshot.currentProductAmount;
        case "productShare":
          return snapshot.currentProductShare;
        case "equilibriumProductShare":
          return snapshot.equilibriumProductShare;
        case "forwardRate":
          return snapshot.forwardRate;
        case "reverseRate":
          return snapshot.reverseRate;
        case "netRate":
          return snapshot.netRate;
        case "rateGap":
          return snapshot.rateGap;
        default:
          return null;
      }
    }
    case "graph-transformations": {
      const resolved = resolveGraphTransformationsParams(params);
      const snapshot = sampleGraphTransformationsState(resolved);

      switch (metric) {
        case "horizontalShift":
          return resolved.horizontalShift;
        case "verticalShift":
          return resolved.verticalShift;
        case "verticalScale":
          return resolved.verticalScale;
        case "vertexX":
          return snapshot.vertexX;
        case "vertexY":
          return snapshot.vertexY;
        case "probeY":
          return snapshot.yIntercept;
        default:
          return null;
      }
    }
    case "derivative-as-slope": {
      const resolved = resolveDerivativeSlopeParams(params);
      const snapshot = sampleDerivativeSlopeState(resolved);

      switch (metric) {
        case "xPosition":
          return snapshot.pointX;
        case "yPosition":
          return snapshot.pointY;
        case "deltaX":
          return snapshot.deltaX;
        case "deltaY":
          return snapshot.secantY - snapshot.pointY;
        case "tangentSlope":
          return snapshot.slope;
        case "secantSlope":
          return snapshot.secantSlope;
        default:
          return null;
      }
    }
    case "integral-accumulation": {
      const resolved = resolveIntegralAccumulationParams(params);
      const snapshot = sampleIntegralAccumulationState(resolved);

      switch (metric) {
        case "upperBound":
          return snapshot.upperBound;
        case "sourceHeight":
          return snapshot.sourceHeight;
        case "accumulatedValue":
          return snapshot.accumulatedValue;
        case "accumulationSlope":
          return snapshot.accumulationSlope;
        default:
          return null;
      }
    }
    case "complex-numbers-plane": {
      const resolved = resolveComplexNumbersPlaneParams(params);
      const snapshot = sampleComplexNumbersPlaneState(resolved);

      switch (metric) {
        case "realPart":
          return resolved.realPart;
        case "imaginaryPart":
          return resolved.imaginaryPart;
        case "operandReal":
          return resolved.operandReal;
        case "operandImaginary":
          return resolved.operandImaginary;
        case "magnitude":
          return snapshot.magnitude;
        case "argumentDeg":
          return snapshot.argumentDeg;
        case "operandMagnitude":
          return snapshot.operandMagnitude;
        case "operandArgumentDeg":
          return snapshot.operandArgumentDeg;
        case "sumReal":
          return snapshot.sumReal;
        case "sumImaginary":
          return snapshot.sumImaginary;
        case "sumMagnitude":
          return snapshot.sumMagnitude;
        case "sumArgumentDeg":
          return snapshot.sumArgumentDeg;
        case "productReal":
          return snapshot.productReal;
        case "productImaginary":
          return snapshot.productImaginary;
        case "productMagnitude":
          return snapshot.productMagnitude;
        case "productArgumentDeg":
          return snapshot.productArgumentDeg;
        case "scaleFactor":
          return snapshot.scaleFactor;
        case "rotationDeg":
          return snapshot.rotationDeg;
        default:
          return null;
      }
    }
    case "parametric-curves-motion": {
      const resolved = resolveParametricCurvesMotionParams(params);
      const snapshot = sampleParametricCurvesMotionState(resolved, runtime.time);

      switch (metric) {
        case "xAmplitude":
          return resolved.xAmplitude;
        case "yAmplitude":
          return resolved.yAmplitude;
        case "xFrequency":
          return resolved.xFrequency;
        case "yFrequency":
          return resolved.yFrequency;
        case "phaseShiftDeg":
          return resolved.phaseShiftDeg;
        case "x":
          return snapshot.x;
        case "y":
          return snapshot.y;
        case "vx":
          return snapshot.vx;
        case "vy":
          return snapshot.vy;
        case "speed":
          return snapshot.speed;
        case "pathWidth":
          return snapshot.pathWidth;
        case "pathHeight":
          return snapshot.pathHeight;
        default:
          return null;
      }
    }
    case "sorting-algorithmic-trade-offs": {
      const resolved = resolveSortingTradeoffsParams(params);
      const snapshot = sampleSortingTradeoffsState(resolved, runtime.time);

      switch (metric) {
        case "algorithmIndex":
          return resolved.algorithmIndex;
        case "patternIndex":
          return resolved.patternIndex;
        case "arraySize":
          return resolved.arraySize;
        case "comparisons":
          return snapshot.comparisons;
        case "swapCount":
          return snapshot.swapCount;
        case "writeCount":
          return snapshot.writeCount;
        case "inversionsRemaining":
          return snapshot.inversionsRemaining;
        case "sortedFraction":
          return snapshot.sortedFraction;
        case "disorderFraction":
          return snapshot.disorderFraction;
        case "completed":
          return snapshot.completed ? 1 : 0;
        default:
          return null;
      }
    }
    case "binary-search-halving": {
      const resolved = resolveBinarySearchHalvingParams(params);
      const snapshot = sampleBinarySearchHalvingState(resolved, runtime.time);

      switch (metric) {
        case "arraySize":
          return resolved.arraySize;
        case "targetIndex":
          return snapshot.targetIndex;
        case "targetValue":
          return snapshot.targetValue;
        case "comparisons":
          return snapshot.comparisons;
        case "linearComparisons":
          return snapshot.linearComparisons;
        case "intervalWidth":
          return snapshot.intervalWidth;
        case "lowIndex":
          return snapshot.lowIndex;
        case "midIndex":
          return snapshot.midIndex;
        case "highIndex":
          return snapshot.highIndex;
        case "binaryLead":
          return snapshot.binaryLead;
        case "found":
          return snapshot.found ? 1 : 0;
        case "completed":
          return snapshot.completed ? 1 : 0;
        default:
          return null;
      }
    }
    case "solubility-saturation": {
      const resolved = resolveSolubilitySaturationParams(params);
      const snapshot = sampleSolubilitySaturationState(resolved);

      switch (metric) {
        case "soluteAmount":
          return resolved.soluteAmount;
        case "solventVolume":
          return resolved.solventVolume;
        case "solubilityLimit":
          return resolved.solubilityLimit;
        case "capacity":
          return snapshot.capacity;
        case "dissolvedAmount":
          return snapshot.dissolvedAmount;
        case "excessAmount":
          return snapshot.excessAmount;
        case "concentration":
          return snapshot.concentration;
        case "saturationRatio":
          return snapshot.saturationRatio;
        case "dissolvedFraction":
          return snapshot.dissolvedFraction;
        case "dissolvedParticleCount":
          return snapshot.dissolvedParticleCount;
        case "excessParticleCount":
          return snapshot.excessParticleCount;
        case "fillFraction":
          return snapshot.fillFraction;
        case "saturationMargin":
          return snapshot.saturationMargin;
        default:
          return null;
      }
    }
    case "buffers-neutralization": {
      const resolved = resolveBuffersNeutralizationParams(params);
      const snapshot = sampleBuffersNeutralizationState(resolved);

      switch (metric) {
        case "acidAmount":
          return resolved.acidAmount;
        case "baseAmount":
          return resolved.baseAmount;
        case "bufferAmount":
          return resolved.bufferAmount;
        case "waterVolume":
          return resolved.waterVolume;
        case "neutralizedAmount":
          return snapshot.neutralizedAmount;
        case "activeExcess":
          return snapshot.activeExcess;
        case "bufferUsed":
          return snapshot.bufferUsed;
        case "bufferRemaining":
          return snapshot.bufferRemaining;
        case "acidCharacter":
          return snapshot.acidCharacter;
        case "baseCharacter":
          return snapshot.baseCharacter;
        case "acidShare":
          return snapshot.acidShare;
        case "baseShare":
          return snapshot.baseShare;
        case "pH":
          return snapshot.pH;
        case "hydroniumCount":
          return snapshot.hydroniumCount;
        case "hydroxideCount":
          return snapshot.hydroxideCount;
        default:
          return null;
      }
    }
    case "concentration-dilution": {
      const resolved = resolveConcentrationDilutionParams(params);
      const snapshot = sampleConcentrationDilutionState(resolved);

      switch (metric) {
        case "soluteAmount":
          return resolved.soluteAmount;
        case "solventVolume":
          return resolved.solventVolume;
        case "concentration":
          return snapshot.concentration;
        case "particleCount":
          return snapshot.particleCount;
        case "fillFraction":
          return snapshot.fillFraction;
        case "particleDensity":
          return snapshot.particleDensity;
        default:
          return null;
      }
    }
    case "acid-base-ph": {
      const resolved = resolveAcidBasePhParams(params);
      const snapshot = sampleAcidBasePhState(resolved);

      switch (metric) {
        case "acidAmount":
          return resolved.acidAmount;
        case "baseAmount":
          return resolved.baseAmount;
        case "waterVolume":
          return resolved.waterVolume;
        case "acidCharacter":
          return snapshot.acidCharacter;
        case "baseCharacter":
          return snapshot.baseCharacter;
        case "acidShare":
          return snapshot.acidShare;
        case "baseShare":
          return snapshot.baseShare;
        case "pH":
          return snapshot.pH;
        case "hydroniumCount":
          return snapshot.hydroniumCount;
        case "hydroxideCount":
          return snapshot.hydroxideCount;
        default:
          return null;
      }
    }
    case "vectors-2d": {
      const resolved = resolveVectors2DParams(params);
      const snapshot = sampleVectors2DState(resolved);

      switch (metric) {
        case "ax":
          return resolved.ax;
        case "ay":
          return resolved.ay;
        case "bx":
          return resolved.bx;
        case "by":
          return resolved.by;
        case "scalar":
          return resolved.scalar;
        case "scaledAx":
          return snapshot.scaledAx;
        case "scaledAy":
          return snapshot.scaledAy;
        case "effectiveBx":
          return snapshot.effectiveBx;
        case "effectiveBy":
          return snapshot.effectiveBy;
        case "resultX":
          return snapshot.resultX;
        case "resultY":
          return snapshot.resultY;
        case "resultMagnitude":
          return snapshot.resultMagnitude;
        case "scaledMagnitude":
          return snapshot.scaledMagnitude;
        default:
          return null;
      }
    }
    case "vectors-components": {
      const resolved = resolveVectorsComponentsParams(params);
      const snapshot = sampleVectorsComponentsState(resolved, runtime.time);

      switch (metric) {
        case "magnitude":
          return snapshot.magnitude;
        case "angle":
          return snapshot.angle;
        case "vx":
          return snapshot.vx;
        case "vy":
          return snapshot.vy;
        case "x":
          return snapshot.x;
        case "y":
          return snapshot.y;
        case "distance":
          return snapshot.distance;
        case "componentDifference":
          return Math.abs(Math.abs(snapshot.vx) - Math.abs(snapshot.vy));
        default:
          return null;
      }
    }
    case "torque": {
      const resolved = resolveTorqueParams(params);
      const snapshot = sampleTorqueState(resolved, runtime.time);

      switch (metric) {
        case "forceMagnitude":
          return resolved.forceMagnitude;
        case "forceAngle":
          return resolved.forceAngle;
        case "applicationDistance":
          return resolved.applicationDistance;
        case "forceParallel":
          return snapshot.forceParallel;
        case "forcePerpendicular":
          return snapshot.forcePerpendicular;
        case "momentArm":
          return snapshot.momentArm;
        case "torque":
          return snapshot.torque;
        case "angularAcceleration":
          return snapshot.angularAcceleration;
        case "angularSpeed":
          return snapshot.angularSpeed;
        case "rotationAngle":
          return snapshot.rotationAngle;
        default:
          return null;
      }
    }
    case "static-equilibrium-centre-of-mass": {
      const resolved = resolveStaticEquilibriumCentreOfMassParams(params);
      const snapshot = sampleStaticEquilibriumCentreOfMassState(resolved);

      switch (metric) {
        case "cargoMass":
          return resolved.cargoMass;
        case "cargoPosition":
          return resolved.cargoPosition;
        case "supportCenter":
          return resolved.supportCenter;
        case "supportWidth":
          return resolved.supportWidth;
        case "centerOfMassX":
          return snapshot.centerOfMassX;
        case "totalMass":
          return snapshot.totalMass;
        case "totalWeight":
          return snapshot.totalWeight;
        case "supportLeftEdge":
          return snapshot.supportLeftEdge;
        case "supportRightEdge":
          return snapshot.supportRightEdge;
        case "torqueAboutSupportCenter":
          return snapshot.torqueAboutSupportCenter;
        case "leftReaction":
          return snapshot.actualLeftReaction;
        case "rightReaction":
          return snapshot.actualRightReaction;
        case "requiredLeftReaction":
          return snapshot.requiredLeftReaction;
        case "requiredRightReaction":
          return snapshot.requiredRightReaction;
        case "stabilityMargin":
          return snapshot.stabilityMargin;
        case "tipOverhang":
          return snapshot.tipOverhang;
        default:
          return null;
      }
    }
    case "rotational-inertia": {
      const resolved = resolveRotationalInertiaParams(params);
      const snapshot = sampleRotationalInertiaState(resolved, runtime.time);

      switch (metric) {
        case "appliedTorque":
          return resolved.appliedTorque;
        case "massRadius":
          return resolved.massRadius;
        case "momentOfInertia":
          return snapshot.momentOfInertia;
        case "angularAcceleration":
          return snapshot.angularAcceleration;
        case "angularSpeed":
          return snapshot.angularSpeed;
        case "rotationAngle":
          return snapshot.rotationAngle;
        default:
          return null;
      }
    }
    case "rolling-motion": {
      const resolved = resolveRollingMotionParams(params);
      const snapshot = sampleRollingMotionState(resolved, runtime.time);

      switch (metric) {
        case "slopeAngle":
          return resolved.slopeAngle;
        case "radius":
          return resolved.radius;
        case "inertiaFactor":
          return resolved.inertiaFactor;
        case "acceleration":
          return snapshot.acceleration;
        case "angularAcceleration":
          return snapshot.angularAcceleration;
        case "travelTime":
          return snapshot.travelTime;
        case "distance":
          return snapshot.distance;
        case "linearSpeed":
          return snapshot.linearSpeed;
        case "angularSpeed":
          return snapshot.angularSpeed;
        case "rotationAngle":
          return snapshot.rotationAngle;
        case "translationalEnergy":
          return snapshot.translationalEnergy;
        case "rotationalEnergy":
          return snapshot.rotationalEnergy;
        case "totalKineticEnergy":
          return snapshot.totalKineticEnergy;
        case "staticFriction":
          return snapshot.staticFriction;
        default:
          return null;
      }
    }
    case "angular-momentum": {
      const resolved = resolveAngularMomentumParams(params);
      const snapshot = sampleAngularMomentumState(resolved, runtime.time);

      switch (metric) {
        case "massRadius":
          return resolved.massRadius;
        case "angularSpeed":
          return resolved.angularSpeed;
        case "momentOfInertia":
          return snapshot.momentOfInertia;
        case "angularMomentum":
          return snapshot.angularMomentum;
        case "tangentialSpeed":
          return snapshot.tangentialSpeed;
        case "rotationAngle":
          return snapshot.rotationAngle;
        case "referenceAngularSpeed":
          return snapshot.referenceAngularSpeed;
        default:
          return null;
      }
    }
    case "basic-circuits": {
      const resolved = resolveBasicCircuitsParams(params);
      const snapshot = sampleBasicCircuitsState(resolved);

      switch (metric) {
        case "voltage":
          return snapshot.voltage;
        case "resistanceA":
          return snapshot.resistanceA;
        case "resistanceB":
          return snapshot.resistanceB;
        case "equivalentResistance":
          return snapshot.equivalentResistance;
        case "totalCurrent":
          return snapshot.totalCurrent;
        case "totalPower":
          return snapshot.totalPower;
        case "branchACurrent":
          return snapshot.branchA.current;
        case "branchAVoltage":
          return snapshot.branchA.voltage;
        case "branchBCurrent":
          return snapshot.branchB.current;
        case "branchBVoltage":
          return snapshot.branchB.voltage;
        default:
          return null;
      }
    }
    case "series-parallel-circuits": {
      const resolved = resolveSeriesParallelCircuitsParams(params);
      const snapshot = sampleSeriesParallelCircuitsState(resolved, runtime.time);

      switch (metric) {
        case "voltage":
          return snapshot.voltage;
        case "resistanceA":
          return snapshot.resistanceA;
        case "resistanceB":
          return snapshot.resistanceB;
        case "equivalentResistance":
          return snapshot.equivalentResistance;
        case "totalCurrent":
          return snapshot.totalCurrent;
        case "totalPower":
          return snapshot.totalPower;
        case "totalCharge":
          return snapshot.totalCharge;
        case "branchACurrent":
          return snapshot.branchA.current;
        case "branchAVoltage":
          return snapshot.branchA.voltage;
        case "branchAPower":
          return snapshot.branchA.power;
        case "branchACharge":
          return snapshot.branchA.charge;
        case "branchBCurrent":
          return snapshot.branchB.current;
        case "branchBVoltage":
          return snapshot.branchB.voltage;
        case "branchBPower":
          return snapshot.branchB.power;
        case "branchBCharge":
          return snapshot.branchB.charge;
        default:
          return null;
      }
    }
    case "equivalent-resistance": {
      const resolved = resolveEquivalentResistanceParams(params);
      const snapshot = sampleEquivalentResistanceState(resolved, runtime.time);

      switch (metric) {
        case "voltage":
          return snapshot.voltage;
        case "resistance1":
          return snapshot.resistance1;
        case "resistance2":
          return snapshot.resistance2;
        case "resistance3":
          return snapshot.resistance3;
        case "groupEquivalentResistance":
          return snapshot.groupEquivalentResistance;
        case "equivalentResistance":
          return snapshot.equivalentResistance;
        case "groupVoltage":
          return snapshot.groupVoltage;
        case "totalCurrent":
          return snapshot.totalCurrent;
        case "totalPower":
          return snapshot.totalPower;
        case "totalCharge":
          return snapshot.totalCharge;
        case "resistor1Current":
          return snapshot.resistor1.current;
        case "resistor1Voltage":
          return snapshot.resistor1.voltage;
        case "resistor1Power":
          return snapshot.resistor1.power;
        case "resistor2Current":
          return snapshot.resistor2.current;
        case "resistor2Voltage":
          return snapshot.resistor2.voltage;
        case "resistor2Power":
          return snapshot.resistor2.power;
        case "resistor2Charge":
          return snapshot.resistor2.charge;
        case "resistor3Current":
          return snapshot.resistor3.current;
        case "resistor3Voltage":
          return snapshot.resistor3.voltage;
        case "resistor3Power":
          return snapshot.resistor3.power;
        case "resistor3Charge":
          return snapshot.resistor3.charge;
        default:
          return null;
      }
    }
    case "power-energy-circuits": {
      const resolved = resolvePowerEnergyCircuitsParams(params);
      const snapshot = samplePowerEnergyCircuitsState(resolved, runtime.time);

      switch (metric) {
        case "voltage":
          return snapshot.voltage;
        case "loadResistance":
          return snapshot.loadResistance;
        case "current":
          return snapshot.current;
        case "power":
          return snapshot.power;
        case "energy":
          return snapshot.energy;
        case "chargeTransferred":
          return snapshot.chargeTransferred;
        default:
          return null;
      }
    }
    case "rc-charging-discharging": {
      const resolved = resolveRcChargingDischargingParams(params);
      const snapshot = sampleRcChargingDischargingState(resolved, runtime.time);

      switch (metric) {
        case "sourceVoltage":
          return resolved.sourceVoltage;
        case "resistance":
          return resolved.resistance;
        case "capacitance":
          return resolved.capacitance;
        case "timeConstant":
          return snapshot.timeConstant;
        case "normalizedTime":
          return snapshot.normalizedTime;
        case "capacitorVoltage":
          return snapshot.capacitorVoltage;
        case "resistorVoltage":
          return snapshot.resistorVoltage;
        case "current":
          return snapshot.current;
        case "currentMagnitude":
          return snapshot.currentMagnitude;
        case "currentFraction":
          return snapshot.currentFraction;
        case "chargeStored":
          return snapshot.chargeStored;
        case "chargeFraction":
          return snapshot.chargeFraction;
        case "storedEnergy":
          return snapshot.storedEnergy;
        case "energyFraction":
          return snapshot.energyFraction;
        default:
          return null;
      }
    }
    case "internal-resistance-terminal-voltage": {
      const resolved = resolveInternalResistanceTerminalVoltageParams(params);
      const snapshot = sampleInternalResistanceTerminalVoltageState(resolved);

      switch (metric) {
        case "emf":
          return resolved.emf;
        case "internalResistance":
          return resolved.internalResistance;
        case "loadResistance":
          return resolved.loadResistance;
        case "current":
          return snapshot.current;
        case "terminalVoltage":
          return snapshot.terminalVoltage;
        case "internalDrop":
          return snapshot.internalDrop;
        case "loadPower":
          return snapshot.loadPower;
        case "internalPower":
          return snapshot.internalPower;
        case "sourcePower":
          return snapshot.sourcePower;
        case "efficiency":
          return snapshot.efficiency;
        default:
          return null;
      }
    }
    case "temperature-internal-energy": {
      const resolved = resolveTemperatureInternalEnergyParams(params);
      const snapshot = sampleTemperatureInternalEnergyState(resolved, runtime.time);

      switch (metric) {
        case "particleCount":
          return snapshot.particleCount;
        case "heaterPower":
          return snapshot.heaterPower;
        case "startingTemperature":
          return snapshot.startingTemperature;
        case "temperature":
          return snapshot.temperature;
        case "averageKineticEnergy":
          return snapshot.averageKineticEnergy;
        case "thermalKineticEnergy":
          return snapshot.thermalKineticEnergy;
        case "bondEnergy":
          return snapshot.bondEnergy;
        case "internalEnergy":
          return snapshot.internalEnergy;
        case "internalEnergyPerParticle":
          return snapshot.internalEnergyPerParticle;
        case "addedEnergy":
          return snapshot.addedEnergy;
        case "temperatureRate":
          return snapshot.temperatureRate;
        case "phaseProgress":
          return snapshot.phaseProgress;
        default:
          return null;
      }
    }
    case "ideal-gas-kinetic-theory": {
      const resolved = resolveIdealGasLawKineticTheoryParams(params);
      const snapshot = sampleIdealGasLawKineticTheoryState(resolved);

      switch (metric) {
        case "particleCount":
          return snapshot.particleCount;
        case "temperature":
          return snapshot.temperature;
        case "volume":
          return snapshot.volume;
        case "density":
          return snapshot.density;
        case "averageSpeed":
          return snapshot.averageSpeed;
        case "collisionRate":
          return snapshot.collisionRate;
        case "pressure":
          return snapshot.pressure;
        default:
          return null;
      }
    }
    case "pressure-hydrostatic": {
      const snapshot = samplePressureHydrostaticState(params);

      switch (metric) {
        case "force":
          return snapshot.force;
        case "area":
          return snapshot.area;
        case "density":
          return snapshot.density;
        case "gravity":
          return snapshot.gravity;
        case "depth":
          return snapshot.depth;
        case "surfacePressure":
          return snapshot.surfacePressure;
        case "hydrostaticPressure":
          return snapshot.hydrostaticPressure;
        case "totalPressure":
          return snapshot.totalPressure;
        case "pressureGradient":
          return snapshot.pressureGradient;
        default:
          return null;
      }
    }
    case "continuity-equation": {
      const snapshot = sampleContinuityEquationState(params, runtime.time);

      switch (metric) {
        case "flowRate":
          return snapshot.flowRate;
        case "entryArea":
          return snapshot.entryArea;
        case "middleArea":
          return snapshot.middleArea;
        case "entrySpeed":
          return snapshot.entrySpeed;
        case "middleSpeed":
          return snapshot.middleSpeed;
        case "speedRatio":
          return snapshot.speedRatio;
        case "areaRatio":
          return snapshot.areaRatio;
        case "entryVolumeFlow":
          return snapshot.entryVolumeFlow;
        case "middleVolumeFlow":
          return snapshot.middleVolumeFlow;
        case "entrySliceLength":
          return snapshot.entrySliceLength;
        case "middleSliceLength":
          return snapshot.middleSliceLength;
        default:
          return null;
      }
    }
    case "bernoulli-principle": {
      const snapshot = sampleBernoulliPrincipleState(params, runtime.time);

      switch (metric) {
        case "entryPressure":
          return snapshot.entryPressure;
        case "flowRate":
          return snapshot.flowRate;
        case "entryArea":
          return snapshot.entryArea;
        case "throatArea":
          return snapshot.throatArea;
        case "throatHeight":
          return snapshot.throatHeight;
        case "entrySpeed":
          return snapshot.entrySpeed;
        case "throatSpeed":
          return snapshot.throatSpeed;
        case "speedRatio":
          return snapshot.speedRatio;
        case "areaRatio":
          return snapshot.areaRatio;
        case "entryVolumeFlow":
          return snapshot.entryVolumeFlow;
        case "throatVolumeFlow":
          return snapshot.throatVolumeFlow;
        case "entrySliceLength":
          return snapshot.entrySliceLength;
        case "throatSliceLength":
          return snapshot.throatSliceLength;
        case "throatPressure":
          return snapshot.throatPressure;
        case "pressureDrop":
          return snapshot.pressureDrop;
        case "dynamicPressureDrop":
          return snapshot.dynamicPressureDrop;
        case "heightPressureDrop":
          return snapshot.heightPressureDrop;
        case "entryDynamicPressure":
          return snapshot.entryDynamicPressure;
        case "throatDynamicPressure":
          return snapshot.throatDynamicPressure;
        case "throatHeightPressure":
          return snapshot.throatHeightPressure;
        case "totalEnergyLike":
          return snapshot.totalEnergyLike;
        case "throatTotalEnergyLike":
          return snapshot.throatTotalEnergyLike;
        default:
          return null;
      }
    }
    case "buoyancy-archimedes": {
      const snapshot = sampleBuoyancyArchimedesState(params);

      switch (metric) {
        case "objectDensity":
          return snapshot.objectDensity;
        case "fluidDensity":
          return snapshot.fluidDensity;
        case "gravity":
          return snapshot.gravity;
        case "bottomDepth":
          return snapshot.bottomDepth;
        case "submergedHeight":
          return snapshot.submergedHeight;
        case "submergedFraction":
          return snapshot.submergedFraction;
        case "displacedVolume":
          return snapshot.displacedVolume;
        case "weight":
          return snapshot.weight;
        case "buoyantForce":
          return snapshot.buoyantForce;
        case "netForce":
          return snapshot.netForce;
        case "supportForce":
          return snapshot.supportForce;
        case "requiredSubmergedFraction":
          return snapshot.requiredSubmergedFraction;
        case "topPressure":
          return snapshot.topPressure;
        case "bottomPressure":
          return snapshot.bottomPressure;
        case "pressureDifference":
          return snapshot.pressureDifference;
        default:
          return null;
      }
    }
    case "drag-terminal-velocity": {
      const snapshot = sampleDragTerminalVelocityState(params, runtime.time);

      switch (metric) {
        case "mass":
          return snapshot.mass;
        case "area":
          return snapshot.area;
        case "dragStrength":
          return snapshot.dragStrength;
        case "weight":
          return snapshot.weightForce;
        case "dragForce":
          return snapshot.dragForce;
        case "netForce":
          return snapshot.netForce;
        case "speed":
          return snapshot.speed;
        case "position":
          return snapshot.position;
        case "terminalSpeed":
          return snapshot.terminalSpeed;
        case "acceleration":
          return snapshot.acceleration;
        case "terminalGap":
          return snapshot.terminalGap;
        default:
          return null;
      }
    }
    case "heat-transfer": {
      const resolved = resolveHeatTransferParams(params);
      const snapshot = sampleHeatTransferState(resolved, runtime.time);

      switch (metric) {
        case "hotTemperature":
          return snapshot.hotTemperature;
        case "ambientTemperature":
          return snapshot.ambientTemperature;
        case "materialConductivity":
          return snapshot.materialConductivity;
        case "contactQuality":
          return snapshot.contactQuality;
        case "surfaceArea":
          return snapshot.surfaceArea;
        case "airflow":
          return snapshot.airflow;
        case "temperatureContrast":
          return snapshot.temperatureContrast;
        case "contactPathStrength":
          return snapshot.contactPathStrength;
        case "conductionRate":
          return snapshot.conductionRate;
        case "convectionRate":
          return snapshot.convectionRate;
        case "radiationRate":
          return snapshot.radiationRate;
        case "totalRate":
          return snapshot.totalRate;
        case "conductionEnergyTransferred":
          return snapshot.conductionEnergyTransferred;
        case "convectionEnergyTransferred":
          return snapshot.convectionEnergyTransferred;
        case "radiationEnergyTransferred":
          return snapshot.radiationEnergyTransferred;
        case "totalEnergyTransferred":
          return snapshot.totalEnergyTransferred;
        default:
          return null;
      }
    }
    case "specific-heat-phase-change": {
      const resolved = resolveSpecificHeatPhaseChangeParams(params);
      const snapshot = sampleSpecificHeatPhaseChangeState(resolved, runtime.time);

      switch (metric) {
        case "mass":
          return snapshot.mass;
        case "specificHeat":
          return snapshot.specificHeat;
        case "heaterPower":
          return snapshot.heaterPower;
        case "startingTemperature":
          return snapshot.startingTemperature;
        case "latentHeat":
          return snapshot.latentHeat;
        case "phaseChangeTemperature":
          return snapshot.phaseChangeTemperature;
        case "temperature":
          return snapshot.temperature;
        case "temperatureChange":
          return snapshot.temperatureChange;
        case "thermalCapacity":
          return snapshot.thermalCapacity;
        case "totalAddedEnergy":
          return snapshot.totalAddedEnergy;
        case "sensibleEnergyChange":
          return snapshot.sensibleEnergyChange;
        case "latentEnergyChange":
          return snapshot.latentEnergyChange;
        case "phaseFraction":
          return snapshot.phaseFraction;
        case "phaseChangeEnergy":
          return snapshot.phaseChangeEnergy;
        case "temperatureRate":
          return snapshot.temperatureRate;
        default:
          return null;
      }
    }
    case "electric-fields": {
      const resolved = resolveElectricFieldsParams(params);
      const snapshot = sampleElectricFieldsState(resolved);

      switch (metric) {
        case "sourceChargeA":
          return resolved.sourceChargeA;
        case "sourceChargeB":
          return resolved.sourceChargeB;
        case "sourceSeparation":
          return resolved.sourceSeparation;
        case "probeX":
          return resolved.probeX;
        case "probeY":
          return resolved.probeY;
        case "testCharge":
          return resolved.testCharge;
        case "fieldX":
          return snapshot.fieldX;
        case "fieldY":
          return snapshot.fieldY;
        case "fieldMagnitude":
          return snapshot.fieldMagnitude;
        case "forceX":
          return snapshot.forceX;
        case "forceY":
          return snapshot.forceY;
        case "forceMagnitude":
          return snapshot.forceMagnitude;
        default:
          return null;
      }
    }
    case "gravitational-fields": {
      const resolved = resolveGravitationalFieldsParams(params);
      const snapshot = sampleGravitationalFieldsState(resolved);

      switch (metric) {
        case "sourceMass":
          return resolved.sourceMass;
        case "probeX":
          return resolved.probeX;
        case "probeY":
          return resolved.probeY;
        case "testMass":
          return resolved.testMass;
        case "distance":
          return snapshot.effectiveDistance;
        case "fieldX":
          return snapshot.fieldX;
        case "fieldY":
          return snapshot.fieldY;
        case "fieldMagnitude":
          return snapshot.fieldMagnitude;
        case "forceX":
          return snapshot.forceX;
        case "forceY":
          return snapshot.forceY;
        case "forceMagnitude":
          return snapshot.forceMagnitude;
        default:
          return null;
      }
    }
    case "gravitational-potential": {
      const resolved = resolveGravitationalPotentialParams(params);
      const snapshot = sampleGravitationalPotentialState(resolved);

      switch (metric) {
        case "sourceMass":
          return resolved.sourceMass;
        case "probeX":
          return resolved.probeX;
        case "probeY":
          return resolved.probeY;
        case "testMass":
          return resolved.testMass;
        case "distance":
          return snapshot.effectiveDistance;
        case "potential":
          return snapshot.potential;
        case "potentialEnergy":
          return snapshot.potentialEnergy;
        case "fieldX":
          return snapshot.fieldX;
        case "fieldY":
          return snapshot.fieldY;
        case "fieldMagnitude":
          return snapshot.fieldMagnitude;
        case "forceX":
          return snapshot.forceX;
        case "forceY":
          return snapshot.forceY;
        case "forceMagnitude":
          return snapshot.forceMagnitude;
        default:
          return null;
      }
    }
    case "circular-orbits": {
      const resolved = resolveCircularOrbitsParams(params);
      const snapshot = sampleCircularOrbitsState(resolved, runtime.time);

      switch (metric) {
        case "sourceMass":
          return resolved.sourceMass;
        case "orbitRadius":
          return resolved.orbitRadius;
        case "speedFactor":
          return resolved.speedFactor;
        case "currentRadius":
          return snapshot.radius;
        case "radiusDeviation":
          return Math.abs(snapshot.radiusDeviation);
        case "circularSpeed":
          return snapshot.referenceCircularSpeed;
        case "localCircularSpeed":
          return snapshot.localCircularSpeed;
        case "actualSpeed":
          return snapshot.speed;
        case "angularSpeed":
          return snapshot.referenceAngularSpeed;
        case "period":
          return snapshot.referencePeriod;
        case "gravityAcceleration":
          return snapshot.gravityAcceleration;
        case "requiredCentripetalAcceleration":
          return snapshot.requiredCentripetalAcceleration;
        case "x":
          return snapshot.x;
        case "y":
          return snapshot.y;
        default:
          return null;
      }
    }
    case "escape-velocity": {
      const resolved = resolveEscapeVelocityParams(params);
      const snapshot = sampleEscapeVelocityState(resolved, runtime.time);

      switch (metric) {
        case "sourceMass":
          return resolved.sourceMass;
        case "launchRadius":
          return resolved.launchRadius;
        case "speedFactor":
          return resolved.speedFactor;
        case "launchSpeed":
          return snapshot.launchSpeed;
        case "launchEscapeSpeed":
          return snapshot.launchEscapeSpeed;
        case "launchCircularSpeed":
          return snapshot.launchCircularSpeed;
        case "currentRadius":
          return snapshot.radius;
        case "radialVelocity":
          return snapshot.radialVelocity;
        case "actualSpeed":
          return snapshot.speed;
        case "gravityAcceleration":
          return snapshot.gravityAcceleration;
        case "localEscapeSpeed":
          return snapshot.localEscapeSpeed;
        case "localCircularSpeed":
          return snapshot.localCircularSpeed;
        case "kineticEnergy":
          return snapshot.kineticEnergy;
        case "potentialEnergy":
          return snapshot.potentialEnergy;
        case "totalEnergy":
          return snapshot.totalEnergy;
        case "turnaroundRadius":
          return snapshot.turnaroundRadius;
        default:
          return null;
      }
    }
    case "electric-potential": {
      const resolved = resolveElectricPotentialParams(params);
      const snapshot = sampleElectricPotentialState(resolved);

      switch (metric) {
        case "sourceChargeA":
          return resolved.sourceChargeA;
        case "sourceChargeB":
          return resolved.sourceChargeB;
        case "sourceSeparation":
          return resolved.sourceSeparation;
        case "probeX":
          return resolved.probeX;
        case "probeY":
          return resolved.probeY;
        case "testCharge":
          return resolved.testCharge;
        case "potential":
          return snapshot.potential;
        case "potentialEnergy":
          return snapshot.potentialEnergy;
        case "fieldX":
          return snapshot.fieldX;
        case "fieldY":
          return snapshot.fieldY;
        case "fieldMagnitude":
          return snapshot.fieldMagnitude;
        default:
          return null;
      }
    }
    case "capacitance-electric-energy": {
      const resolved = resolveCapacitanceElectricEnergyParams(params);
      const snapshot = sampleCapacitanceElectricEnergyState(resolved);

      switch (metric) {
        case "plateArea":
          return resolved.plateArea;
        case "plateSeparation":
          return resolved.plateSeparation;
        case "batteryVoltage":
          return resolved.batteryVoltage;
        case "capacitance":
          return snapshot.capacitance;
        case "chargeMagnitude":
          return snapshot.chargeMagnitude;
        case "fieldStrength":
          return snapshot.fieldStrength;
        case "storedEnergy":
          return snapshot.storedEnergy;
        case "energyDensity":
          return snapshot.energyDensity;
        default:
          return null;
      }
    }
    case "magnetic-fields": {
      const resolved = resolveMagneticFieldsParams(params);
      const snapshot = sampleMagneticFieldsState(resolved);

      switch (metric) {
        case "currentA":
          return resolved.currentA;
        case "currentB":
          return resolved.currentB;
        case "sourceSeparation":
          return resolved.sourceSeparation;
        case "probeX":
          return resolved.probeX;
        case "probeY":
          return resolved.probeY;
        case "fieldX":
          return snapshot.fieldX;
        case "fieldY":
          return snapshot.fieldY;
        case "fieldMagnitude":
          return snapshot.fieldMagnitude;
        default:
          return null;
      }
    }
    case "electromagnetic-induction": {
      const resolved = resolveElectromagneticInductionParams(params);
      const snapshot = sampleElectromagneticInductionState(resolved, runtime.time);

      switch (metric) {
        case "magnetStrength":
          return resolved.magnetStrength;
        case "coilTurns":
          return resolved.coilTurns;
        case "coilArea":
          return resolved.coilArea;
        case "speed":
          return resolved.speed;
        case "startOffset":
          return resolved.startOffset;
        case "positionX":
          return snapshot.positionX;
        case "fieldStrength":
          return snapshot.fieldStrength;
        case "fluxLinkage":
          return snapshot.fluxLinkage;
        case "fluxChangeRate":
          return snapshot.fluxChangeRate;
        case "emf":
          return snapshot.emf;
        case "current":
          return snapshot.current;
        default:
          return null;
      }
    }
    case "light-spectrum-linkage": {
      const resolved = resolveLightSpectrumLinkageParams(params);
      const snapshot = sampleLightSpectrumLinkageState(resolved, runtime.time);

      switch (metric) {
        case "fieldAmplitude":
          return resolved.fieldAmplitude;
        case "logWavelength":
          return resolved.logWavelength;
        case "vacuumWavelength":
          return snapshot.vacuumWavelengthMeters;
        case "mediumIndex":
          return resolved.mediumIndex;
        case "mediumWavelength":
          return snapshot.mediumWavelengthMeters;
        case "frequency":
          return snapshot.frequencyHz;
        case "period":
          return snapshot.periodSeconds;
        case "phaseVelocity":
          return snapshot.phaseVelocityMetersPerSecond;
        case "phaseVelocityFractionC":
          return snapshot.phaseVelocityFractionC;
        case "probeCycles":
          return snapshot.probeCycles;
        case "probeDistance":
          return snapshot.probeDistanceMeters;
        case "travelDelay":
          return snapshot.travelDelaySeconds;
        case "electricField":
          return snapshot.electricField;
        case "magneticField":
          return snapshot.magneticField;
        case "sourceElectricField":
          return snapshot.sourceElectricField;
        case "sourceMagneticField":
          return snapshot.sourceMagneticField;
          default:
            return null;
        }
      }
    case "dispersion-refractive-index-color": {
      const resolved = resolveDispersionRefractiveIndexColorParams(params);
      const snapshot = sampleDispersionRefractiveIndexColorState(resolved);

      switch (metric) {
        case "wavelengthNm":
          return resolved.wavelengthNm;
        case "referenceIndex":
          return resolved.referenceIndex;
        case "dispersionStrength":
          return resolved.dispersionStrength;
        case "prismAngle":
          return resolved.prismAngle;
        case "selectedIndex":
          return snapshot.selectedIndex;
        case "selectedDeviation":
          return snapshot.selectedDeviationAngle;
        case "speedFractionC":
          return snapshot.speedFractionC;
        case "redIndex":
          return snapshot.red.index;
        case "greenIndex":
          return snapshot.green.index;
        case "violetIndex":
          return snapshot.violet.index;
        case "redDeviation":
          return snapshot.red.deviationAngle;
        case "greenDeviation":
          return snapshot.green.deviationAngle;
        case "violetDeviation":
          return snapshot.violet.deviationAngle;
        case "spreadAngle":
          return snapshot.spreadAngle;
        default:
          return null;
      }
    }
    case "polarization": {
      const resolved = resolvePolarizationParams(params);
      const snapshot = samplePolarizationState(resolved);

      switch (metric) {
        case "inputAmplitude":
          return resolved.inputAmplitude;
        case "inputAngle":
          return resolved.inputAngle;
        case "polarizerAngle":
          return resolved.polarizerAngle;
        case "angleDifference":
          return snapshot.angleDifference;
        case "unpolarizedFlag":
          return resolved.unpolarized ? 1 : 0;
        case "transmittedFieldAmplitude":
          return snapshot.transmittedFieldAmplitude;
        case "blockedFieldAmplitude":
          return snapshot.blockedFieldAmplitude;
        case "transmittedIntensityFraction":
          return snapshot.transmittedIntensityFraction;
        case "blockedIntensityFraction":
          return snapshot.blockedIntensityFraction;
        case "detectorBrightness":
          return snapshot.detectorBrightness;
        default:
          return null;
      }
    }
    case "diffraction": {
      const resolved = resolveDiffractionParams(params);
      const snapshot = sampleDiffractionState(resolved, runtime.time);

      switch (metric) {
        case "wavelength":
          return resolved.wavelength;
        case "slitWidth":
          return resolved.slitWidth;
        case "probeY":
          return resolved.probeY;
        case "edgePathDifference":
          return snapshot.edgePathDifference;
        case "edgePathDifferenceInWavelengths":
          return snapshot.edgePathDifferenceInWavelengths;
        case "normalizedIntensity":
          return snapshot.normalizedIntensity;
        case "envelopeAmplitude":
          return snapshot.envelopeAmplitude;
        case "probeDisplacement":
          return snapshot.probeDisplacement;
        case "wavelengthToSlitRatio":
          return snapshot.wavelengthToSlitRatio;
        case "firstMinimumAngleDeg":
          return snapshot.firstMinimumAngleDeg;
        case "centralPeakWidth":
          return snapshot.centralPeakWidth;
        default:
          return null;
      }
    }
    case "optical-resolution": {
      const resolved = resolveOpticalResolutionParams(params);
      const snapshot = sampleOpticalResolutionState(resolved);

      switch (metric) {
        case "wavelengthNm":
          return resolved.wavelengthNm;
        case "apertureMm":
          return resolved.apertureMm;
        case "separationMrad":
          return resolved.separationMrad;
        case "probeYUm":
          return resolved.probeYUm;
        case "rayleighLimitMrad":
          return snapshot.rayleighLimitMrad;
        case "airyRadiusUm":
          return snapshot.airyRadiusUm;
        case "imageSeparationUm":
          return snapshot.imageSeparationUm;
        case "separationRatio":
          return snapshot.separationRatio;
        case "pointACenterUm":
          return snapshot.pointACenterUm;
        case "pointBCenterUm":
          return snapshot.pointBCenterUm;
        case "probePointAExposure":
          return snapshot.probePointAExposure;
        case "probePointBExposure":
          return snapshot.probePointBExposure;
        case "probeExposure":
          return snapshot.probeExposure;
        case "peakExposure":
          return snapshot.peakExposure;
        case "centerExposure":
          return snapshot.centerExposure;
        case "centerDipRatio":
          return snapshot.centerDipRatio;
        case "rayleighResolvedFlag":
          return snapshot.rayleighResolvedFlag ? 1 : 0;
        default:
          return null;
      }
    }
    case "double-slit-interference": {
      const resolved = resolveDoubleSlitInterferenceParams(params);
      const snapshot = sampleDoubleSlitInterferenceState(resolved, runtime.time);

      switch (metric) {
        case "wavelength":
          return resolved.wavelength;
        case "slitSeparation":
          return resolved.slitSeparation;
        case "screenDistance":
          return resolved.screenDistance;
        case "probeY":
          return resolved.probeY;
        case "pathDifference":
          return Math.abs(snapshot.pathDifference);
        case "pathDifferenceInWavelengths":
          return snapshot.pathDifferenceInWavelengths;
        case "phaseDifference":
          return Math.abs(snapshot.wrappedPhaseDifference);
        case "resultantAmplitude":
          return snapshot.resultantAmplitude;
        case "resultantDisplacement":
          return snapshot.resultantDisplacement;
        case "normalizedIntensity":
          return snapshot.normalizedIntensity;
        case "fringeSpacing":
          return snapshot.fringeSpacing;
        default:
          return null;
      }
    }
    case "photoelectric-effect": {
      const resolved = resolvePhotoelectricEffectParams(params);
      const snapshot = samplePhotoelectricEffectState(resolved, runtime.time);

      switch (metric) {
        case "frequencyPHz":
          return resolved.frequencyPHz;
        case "intensity":
          return resolved.intensity;
        case "workFunctionEv":
          return resolved.workFunctionEv;
        case "collectorVoltage":
          return resolved.collectorVoltage;
        case "wavelengthNm":
          return snapshot.wavelengthNm;
        case "photonEnergyEv":
          return snapshot.photonEnergyEv;
        case "thresholdFrequencyPHz":
          return snapshot.thresholdFrequencyPHz;
        case "thresholdWavelengthNm":
          return snapshot.thresholdWavelengthNm;
        case "thresholdMarginEv":
          return snapshot.thresholdMarginEv;
        case "maxKineticEnergyEv":
          return snapshot.maxKineticEnergyEv;
        case "stoppingPotential":
          return snapshot.stoppingPotential;
        case "saturationCurrent":
          return snapshot.saturationCurrent;
        case "collectorCurrent":
          return snapshot.collectorCurrent;
        case "currentFraction":
          return snapshot.currentFraction;
        default:
          return null;
      }
    }
    case "atomic-spectra": {
      const resolved = resolveAtomicSpectraParams(params);
      const snapshot = sampleAtomicSpectraState(resolved, runtime.time);

      switch (metric) {
        case "gap12Ev":
          return resolved.gap12Ev;
        case "gap23Ev":
          return resolved.gap23Ev;
        case "gap34Ev":
          return resolved.gap34Ev;
        case "modeFlag":
          return resolved.absorptionMode ? 1 : 0;
        case "visibleLineCount":
          return snapshot.visibleLineCount;
        case "shortestWavelengthNm":
          return snapshot.shortestWavelengthNm;
        case "longestWavelengthNm":
          return snapshot.longestWavelengthNm;
        case "shortestVisibleWavelengthNm":
          return snapshot.shortestVisibleWavelengthNm;
        case "longestVisibleWavelengthNm":
          return snapshot.longestVisibleWavelengthNm;
        case "strongestVisibleWavelengthNm":
          return snapshot.strongestVisibleWavelengthNm;
        case "minVisibleSeparationNm":
          return snapshot.minVisibleSeparationNm;
        case "activeTransitionEnergyEv":
          return snapshot.activeTransition.energyEv;
        case "activeTransitionWavelengthNm":
          return snapshot.activeTransition.wavelengthNm;
        default:
          return null;
      }
    }
    case "de-broglie-matter-waves": {
      const resolved = resolveDeBroglieMatterWavesParams(params);
      const snapshot = sampleDeBroglieMatterWavesState(resolved);

      switch (metric) {
        case "massMultiple":
          return resolved.massMultiple;
        case "speedMms":
          return resolved.speedMms;
        case "momentumScaled":
          return snapshot.momentumScaled;
        case "wavelengthNm":
          return snapshot.wavelengthNm;
        case "loopCircumferenceNm":
          return snapshot.loopCircumferenceNm;
        case "fitCount":
          return snapshot.fitCount;
        case "nearestWholeFit":
          return snapshot.nearestWholeFit;
        case "fitErrorAbs":
          return snapshot.fitErrorAbs;
        case "wholeNumberFitFlag":
          return snapshot.isNearWholeNumberFit ? 1 : 0;
        case "speedFractionC":
          return snapshot.speedFractionC;
        default:
          return null;
      }
    }
    case "bohr-model": {
      const resolved = resolveBohrModelParams(params);
      const snapshot = sampleBohrModelState(resolved, runtime.time);

      switch (metric) {
        case "upperLevel":
          return resolved.upperLevel;
        case "lowerLevel":
          return resolved.lowerLevel;
        case "excitationFlag":
          return resolved.excitationMode ? 1 : 0;
        case "photonEnergyEv":
          return snapshot.activeTransition.energyEv;
        case "wavelengthNm":
          return snapshot.activeTransition.wavelengthNm;
        case "seriesLimitWavelengthNm":
          return snapshot.seriesLimitWavelengthNm;
        case "upperRadiusA0":
          return snapshot.upperRadiusA0;
        case "lowerRadiusA0":
          return snapshot.lowerRadiusA0;
        case "radiusRatio":
          return snapshot.radiusRatio;
        case "activeVisibleFlag":
          return snapshot.activeTransition.inVisibleBand ? 1 : 0;
        case "seriesVisibleLineCount":
          return snapshot.visibleLineCount;
        default:
          return null;
      }
    }
    case "radioactivity-half-life": {
      const resolved = resolveRadioactivityHalfLifeParams(params);
      const snapshot = sampleRadioactivityHalfLifeState(resolved, runtime.time);

      switch (metric) {
        case "sampleSize":
          return resolved.sampleSize;
        case "halfLifeSeconds":
          return resolved.halfLifeSeconds;
        case "elapsedHalfLives":
          return snapshot.elapsedHalfLives;
        case "expectedRemainingCount":
          return snapshot.expectedRemainingCount;
        case "actualRemainingCount":
          return snapshot.actualRemainingCount;
        case "expectedFraction":
          return snapshot.expectedFraction;
        case "actualFraction":
          return snapshot.actualFraction;
        case "deviationCount":
          return snapshot.deviationCount;
        case "deviationFraction":
          return snapshot.deviationFraction;
        case "decayedCount":
          return snapshot.decayedCount;
        case "survivalProbability":
          return snapshot.survivalProbability;
        case "recentDecayCount":
          return snapshot.recentDecayCount;
        default:
          return null;
      }
    }
    case "magnetic-force": {
      const resolved = resolveMagneticForceParams(params);
      const snapshot = sampleMagneticForceState(resolved, runtime.time);

      switch (metric) {
        case "fieldStrength":
          return resolved.fieldStrength;
        case "speed":
          return resolved.speed;
        case "directionAngle":
          return resolved.directionAngle;
        case "current":
          return resolved.current;
        case "chargeX":
          return snapshot.positionX;
        case "chargeY":
          return snapshot.positionY;
        case "velocityX":
          return snapshot.velocityX;
        case "velocityY":
          return snapshot.velocityY;
        case "chargeForceX":
          return snapshot.chargeForceX;
        case "chargeForceY":
          return snapshot.chargeForceY;
        case "chargeForceMagnitude":
          return snapshot.chargeForceMagnitude;
        case "wireForceX":
          return snapshot.wireForceX;
        case "wireForceY":
          return snapshot.wireForceY;
        case "wireForceMagnitude":
          return snapshot.wireForceMagnitude;
        case "radius":
          return snapshot.radius;
        case "period":
          return snapshot.period;
        default:
          return null;
      }
    }
    case "refraction-snells-law": {
      const resolved = resolveRefractionSnellsLawParams(params);
      const snapshot = sampleRefractionSnellsLawState(resolved);

      switch (metric) {
        case "incidentAngle":
          return resolved.incidentAngle;
        case "n1":
          return resolved.n1;
        case "n2":
          return resolved.n2;
        case "refractedAngle":
          return snapshot.refractedAngle;
        case "bendAngle":
          return snapshot.bendAngle;
        case "speedRatio":
          return snapshot.speedRatio;
        case "criticalAngle":
          return snapshot.criticalAngle;
        case "criticalOffset":
          return snapshot.criticalOffset;
        default:
          return null;
      }
    }
    case "mirrors": {
      const resolved = resolveMirrorsParams(params);
      const snapshot = sampleMirrorsState(resolved);

      switch (metric) {
        case "focalLength":
          return resolved.focalLength;
        case "signedFocalLength":
          return snapshot.signedFocalLength;
        case "objectDistance":
          return resolved.objectDistance;
        case "objectHeight":
          return resolved.objectHeight;
        case "imageDistance":
          return snapshot.imageDistance;
        case "imageHeight":
          return snapshot.imageHeight;
        case "magnification":
          return snapshot.magnification;
        default:
          return null;
      }
    }
    case "lens-imaging": {
      const resolved = resolveLensImagingParams(params);
      const snapshot = sampleLensImagingState(resolved);

      switch (metric) {
        case "focalLength":
          return resolved.focalLength;
        case "signedFocalLength":
          return snapshot.signedFocalLength;
        case "objectDistance":
          return resolved.objectDistance;
        case "objectHeight":
          return resolved.objectHeight;
        case "imageDistance":
          return snapshot.imageDistance;
        case "imageHeight":
          return snapshot.imageHeight;
        case "magnification":
          return snapshot.magnification;
        default:
          return null;
      }
    }
    case "beats": {
      const resolved = resolveBeatsParams(params);
      const snapshot = sampleBeatsState(resolved, runtime.time);

      switch (metric) {
        case "amplitude":
          return resolved.amplitude;
        case "frequencyA":
          return resolved.frequencyA;
        case "frequencyB":
          return resolved.frequencyB;
        case "averageFrequency":
          return snapshot.averageFrequency;
        case "frequencyDifference":
          return snapshot.frequencyDifference;
        case "beatFrequency":
          return snapshot.beatFrequency;
        case "beatPeriod":
          return Number.isFinite(snapshot.beatPeriod) ? snapshot.beatPeriod : null;
        case "carrierFrequency":
          return snapshot.carrierFrequency;
        case "sourceADisplacement":
          return snapshot.sourceADisplacement;
        case "sourceBDisplacement":
          return snapshot.sourceBDisplacement;
        case "resultantDisplacement":
          return snapshot.resultantDisplacement;
        case "envelopeAmplitude":
          return snapshot.envelopeAmplitude;
        case "envelopeRatio":
          return snapshot.envelopeRatio;
        case "loudnessCue":
          return snapshot.loudnessCue;
        default:
          return null;
      }
    }
    case "sound-waves-longitudinal": {
      const resolved = resolveSoundWavesLongitudinalParams(params);
      const snapshot = sampleSoundWavesLongitudinalState(resolved, runtime.time);

      switch (metric) {
        case "amplitude":
          return resolved.amplitude;
        case "waveSpeed":
          return resolved.waveSpeed;
        case "wavelength":
          return resolved.wavelength;
        case "probeX":
          return resolved.probeX;
        case "frequency":
          return snapshot.frequency;
        case "period":
          return snapshot.period;
        case "travelDelay":
          return snapshot.travelDelay;
        case "phaseLagCycles":
          return snapshot.phaseLagCycles;
        case "phaseLagRadians":
          return Math.abs(snapshot.wrappedPhaseLag);
        case "probeDisplacement":
          return snapshot.probeDisplacement;
        case "probeCompression":
          return snapshot.probeCompression;
        case "normalizedProbeCompression":
          return snapshot.normalizedProbeCompression;
        case "intensityCue":
          return snapshot.intensityCue;
        default:
          return null;
      }
    }
    case "doppler-effect": {
      const resolved = resolveDopplerEffectParams(params);
      const snapshot = sampleDopplerEffectState(resolved, runtime.time);

      switch (metric) {
        case "sourceFrequency":
          return resolved.sourceFrequency;
        case "sourceSpeed":
          return resolved.sourceSpeed;
        case "observerSpeed":
          return resolved.observerSpeed;
        case "frontSpacing":
          return snapshot.frontSpacing;
        case "backSpacing":
          return snapshot.backSpacing;
        case "selectedSpacing":
          return snapshot.selectedSpacing;
        case "oppositeSpacing":
          return snapshot.oppositeSpacing;
        case "observedFrequency":
          return snapshot.observedFrequency;
        case "observedPeriod":
          return snapshot.observedPeriod;
        case "pitchRatio":
          return snapshot.pitchRatio;
        case "travelDelay":
          return snapshot.travelDelay;
        case "currentSeparation":
          return snapshot.currentSeparation;
        default:
          return null;
      }
    }
    case "wave-speed-wavelength": {
      const resolved = resolveWaveSpeedWavelengthParams(params);
      const snapshot = sampleWaveSpeedWavelengthState(resolved, runtime.time);

      switch (metric) {
        case "amplitude":
          return resolved.amplitude;
        case "waveSpeed":
          return resolved.waveSpeed;
        case "wavelength":
          return resolved.wavelength;
        case "probeX":
          return resolved.probeX;
        case "frequency":
          return snapshot.frequency;
        case "period":
          return snapshot.period;
        case "travelDelay":
          return snapshot.travelDelay;
        case "phaseLagCycles":
          return snapshot.phaseLagCycles;
        case "phaseLagRadians":
          return Math.abs(snapshot.wrappedPhaseLag);
        case "probeDisplacement":
          return snapshot.probeDisplacement;
        default:
          return null;
      }
    }
    case "wave-interference": {
      const resolved = resolveWaveInterferenceParams(params);
      const snapshot = sampleWaveInterferenceState(resolved, runtime.time);

      switch (metric) {
        case "amplitudeA":
          return resolved.amplitudeA;
        case "amplitudeB":
          return resolved.amplitudeB;
        case "wavelength":
          return resolved.wavelength;
        case "phaseOffset":
          return resolved.phaseOffset;
        case "probeY":
          return resolved.probeY;
        case "pathDifference":
          return Math.abs(snapshot.pathDifference);
        case "phaseDifference":
          return Math.abs(snapshot.wrappedPhaseDifference);
        case "resultantAmplitude":
          return snapshot.resultantAmplitude;
        case "resultantDisplacement":
          return snapshot.resultantDisplacement;
        case "normalizedIntensity":
          return snapshot.normalizedIntensity;
        default:
          return null;
      }
    }
    case "standing-waves": {
      const resolved = resolveStandingWavesParams(params);
      const snapshot = sampleStandingWavesState(resolved, runtime.time);

      switch (metric) {
        case "amplitude":
          return resolved.amplitude;
        case "length":
          return resolved.length;
        case "modeNumber":
          return resolved.modeNumber;
        case "probeX":
          return resolved.probeX;
        case "wavelength":
          return snapshot.wavelength;
        case "nodeSpacing":
          return snapshot.nodeSpacing;
        case "probeEnvelope":
          return snapshot.probeEnvelope;
        case "probeDisplacement":
          return snapshot.probeDisplacement;
        default:
          return null;
      }
    }
    case "air-column-resonance": {
      const resolved = resolveAirColumnResonanceParams(params);
      const snapshot = sampleAirColumnResonanceState(resolved, runtime.time);

      switch (metric) {
        case "amplitude":
          return resolved.amplitude;
        case "length":
          return resolved.length;
        case "resonanceOrder":
          return resolved.resonanceOrder;
        case "harmonicMultiple":
          return snapshot.harmonicMultiple;
        case "probeX":
          return resolved.probeX;
        case "wavelength":
          return snapshot.wavelength;
        case "frequency":
          return snapshot.frequency;
        case "probeEnvelope":
          return snapshot.probeEnvelope;
        case "probeDisplacement":
          return snapshot.probeDisplacement;
        case "probePressureEnvelope":
          return snapshot.probePressureEnvelope;
        case "probePressureValue":
          return snapshot.probePressureValue;
        default:
          return null;
      }
    }
    default:
      return null;
  }
}

export function evaluateChallengeItem(
  concept: ConceptSimulationSource,
  item: ConceptChallengeItem,
  runtime: ChallengeRuntimeState,
): ChallengeEvaluation {
  const checks = item.checks.map<ChallengeCheckEvaluation>((check) => {
    switch (check.type) {
      case "param-range": {
        const value = readNumericValue(runtime.params, check.param);

        return {
          label: check.label,
          passed: isWithinRange(value, check.min, check.max),
          currentValue: formatValue(value, check.displayUnit),
        };
      }
      case "metric-range": {
        const value = resolveMetricValue(concept, runtime, check.metric);

        return {
          label: check.label,
          passed: isWithinRange(value, check.min, check.max),
          currentValue: formatValue(value, check.displayUnit),
        };
      }
      case "graph-active":
        return {
          label: check.label,
          passed: runtime.activeGraphId === check.graphId,
          currentValue:
            concept.simulation.graphs.find((graph) => graph.id === runtime.activeGraphId)?.label ??
            undefined,
        };
      case "overlay-active":
        return {
          label: check.label,
          passed: (runtime.overlayValues[check.overlayId] ?? false) === (check.value ?? true),
          currentValue: runtime.overlayValues[check.overlayId] ? "On" : "Off",
        };
      case "time-source":
        return {
          label: check.label,
          passed: runtime.timeSource === check.source,
          currentValue: runtime.timeSource,
        };
      case "time-range":
        return {
          label: check.label,
          passed: isWithinRange(runtime.time, check.min, check.max),
          currentValue: formatValue(runtime.time, check.displayUnit),
        };
      case "compare-active":
        return {
          label: check.label,
          passed:
            runtime.compare !== null &&
            (check.target ? runtime.compare.activeTarget === check.target : true),
          currentValue:
            runtime.compare === null
              ? "Explore"
              : `Setup ${runtime.compare.activeTarget.toUpperCase()}`,
        };
      case "compare-param-range": {
        const source =
          check.setup === "a" ? runtime.compare?.setupA ?? null : runtime.compare?.setupB ?? null;
        const value = source ? readNumericValue(source, check.param) : null;

        return {
          label: check.label,
          passed: runtime.compare !== null && isWithinRange(value, check.min, check.max),
          currentValue: formatValue(value, check.displayUnit),
        };
      }
      case "compare-metric-range": {
        const source =
          check.setup === "a" ? runtime.compare?.setupA ?? null : runtime.compare?.setupB ?? null;
        const value = source
          ? resolveMetricValue(concept, { ...runtime, params: source }, check.metric)
          : null;

        return {
          label: check.label,
          passed: runtime.compare !== null && isWithinRange(value, check.min, check.max),
          currentValue: formatValue(value, check.displayUnit),
        };
      }
    }

    const exhaustiveCheck: never = check;
    throw new Error(`Unsupported challenge check: ${JSON.stringify(exhaustiveCheck)}`);
  });

  const matchedCount = checks.filter((check) => check.passed).length;

  return {
    completed: matchedCount === checks.length,
    matchedCount,
    totalCount: checks.length,
    checks,
  };
}
