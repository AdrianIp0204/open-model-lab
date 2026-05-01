import { getWorkedExampleTokenValidationIssues } from "../learning/liveWorkedExamples";
import { getSupplementalWorkedExampleTokenValidationIssues } from "../learning/supplementalWorkedExamples";
import { resolveSimulationUiHints } from "../physics";
import { buildConceptQuizSession, resolveConceptQuizDefinition } from "../quiz";
import { normalizeChallengeModeAuthoring } from "./challenges";
import {
  getCatalogData,
  getCatalogFilePath,
  getConceptContentData,
  getConceptContentFilePath,
  getConceptContentLastModified,
  listConceptContentFileKeys,
} from "./content-registry";
import {
  conceptCatalogSchema,
  conceptRecordSchema,
  conceptRichContentSchema,
  type ConceptContent,
  type ConceptContentFile,
  type ConceptId,
  type ConceptMetadata,
  type ConceptRichContent,
  type ConceptSlug,
  type ConceptSummary,
  type ConceptWorkedExample,
} from "./schema";
import { conceptPageGuidanceToolHintIds } from "./concept-page-guidance";

export type ConceptRegistry = {
  all: ConceptMetadata[];
  published: ConceptMetadata[];
  byId: Map<ConceptId, ConceptMetadata>;
  bySlug: Map<ConceptSlug, ConceptMetadata>;
  aliasToSlug: Map<ConceptSlug, ConceptSlug>;
  bySubject: Map<string, ConceptMetadata[]>;
  byTopic: Map<string, ConceptMetadata[]>;
  bySubtopic: Map<string, ConceptMetadata[]>;
  subjects: string[];
  topics: string[];
};

let cachedRegistry: ConceptRegistry | null = null;
let cachedConceptRecords: ConceptContent[] | null = null;
let cachedConceptMap: Map<ConceptSlug, ConceptContent> | null = null;
let cachedConceptIdMap: Map<ConceptId, ConceptContent> | null = null;

const workedExampleTokenPattern = /\{\{[a-zA-Z0-9_-]+\}\}/;

function getWorkedExampleTemplates(example: ConceptWorkedExample) {
  return [
    example.prompt,
    ...example.steps.map((step) => step.template),
    example.resultTemplate,
    example.interpretationTemplate,
  ].filter((template): template is string => Boolean(template));
}

function isStaticWorkedExample(example: ConceptWorkedExample) {
  return getWorkedExampleTemplates(example).every(
    (template) => !workedExampleTokenPattern.test(template),
  );
}

function isMissingWorkedExampleBuilderIssue(issue: string) {
  return issue.startsWith("Missing live worked-example builder");
}

const challengeMetricsBySimulationKind: Record<
  ConceptContent["simulation"]["kind"],
  Set<string>
> = {
  "reaction-rate-collision-theory": new Set([
    "temperature",
    "concentration",
    "activationEnergy",
    "effectiveActivationEnergy",
    "averageEnergy",
    "attemptRate",
    "successFraction",
    "successfulCollisionRate",
    "unsuccessfulCollisionRate",
  ]),
  "dynamic-equilibrium": new Set([
    "reactantsCurrent",
    "productsCurrent",
    "productFavor",
    "productShare",
    "equilibriumProductShare",
    "forwardRate",
    "reverseRate",
    "netRate",
    "rateGap",
  ]),
  "graph-transformations": new Set([
    "horizontalShift",
    "verticalShift",
    "verticalScale",
    "vertexX",
    "vertexY",
    "probeY",
  ]),
  "rational-functions": new Set([
    "asymptoteX",
    "horizontalAsymptoteY",
    "branchScale",
    "sampleDistance",
    "leftProbeValue",
    "rightProbeValue",
    "xIntercept",
    "yIntercept",
    "holeValue",
    "farLeftValue",
    "farRightValue",
  ]),
  "matrix-transformations": new Set([
    "m11",
    "m12",
    "m21",
    "m22",
    "basis1X",
    "basis1Y",
    "basis2X",
    "basis2Y",
    "basis1Length",
    "basis2Length",
    "probeX",
    "probeY",
    "unitSquareTopRightX",
    "unitSquareTopRightY",
    "orientationSign",
  ]),
  "exponential-change": new Set([
    "initialValue",
    "rate",
    "targetValue",
    "targetRatio",
    "targetLogRatio",
    "targetTime",
    "pairedTargetTime",
    "doublingTime",
    "halfLife",
    "currentAtWindowEnd",
    "pairedAtWindowEnd",
  ]),
  "derivative-as-slope": new Set([
    "xPosition",
    "deltaX",
    "deltaY",
    "tangentSlope",
    "secantSlope",
    "yPosition",
  ]),
  "optimization-constraints": new Set([
    "width",
    "height",
    "area",
    "areaSlope",
    "optimumWidth",
    "optimumHeight",
    "optimumArea",
    "areaGap",
    "areaFraction",
    "widthGap",
    "heightGap",
  ]),
  "integral-accumulation": new Set([
    "upperBound",
    "sourceHeight",
    "accumulatedValue",
    "accumulationSlope",
  ]),
  "limits-continuity": new Set([
    "caseIndex",
    "approachDistance",
    "leftValue",
    "rightValue",
    "leftLimitValue",
    "rightLimitValue",
    "finiteLimitValue",
    "actualValue",
    "oneSidedGap",
    "limitActualGap",
  ]),
  "complex-numbers-plane": new Set([
    "realPart",
    "imaginaryPart",
    "operandReal",
    "operandImaginary",
    "magnitude",
    "argumentDeg",
    "operandMagnitude",
    "operandArgumentDeg",
    "sumReal",
    "sumImaginary",
    "sumMagnitude",
    "sumArgumentDeg",
    "productReal",
    "productImaginary",
    "productMagnitude",
    "productArgumentDeg",
    "scaleFactor",
    "rotationDeg",
  ]),
  "unit-circle-rotation": new Set([
    "angularSpeed",
    "phase",
    "x",
    "y",
    "period",
    "angle",
    "angleDeg",
    "referenceAngleDeg",
  ]),
  "polar-coordinates": new Set([
    "radius",
    "angleDeg",
    "wrappedAngleDeg",
    "x",
    "y",
    "cosTheta",
    "sinTheta",
    "radiusSquared",
    "referenceAngleDeg",
  ]),
  "parametric-curves-motion": new Set([
    "xAmplitude",
    "yAmplitude",
    "xFrequency",
    "yFrequency",
    "phaseShiftDeg",
    "x",
    "y",
    "vx",
    "vy",
    "speed",
    "pathWidth",
    "pathHeight",
  ]),
  "sorting-algorithmic-trade-offs": new Set([
    "algorithmIndex",
    "patternIndex",
    "arraySize",
    "comparisons",
    "swapCount",
    "writeCount",
    "inversionsRemaining",
    "sortedFraction",
    "disorderFraction",
    "completed",
  ]),
  "binary-search-halving": new Set([
    "arraySize",
    "targetIndex",
    "targetValue",
    "comparisons",
    "linearComparisons",
    "intervalWidth",
    "lowIndex",
    "midIndex",
    "highIndex",
    "binaryLead",
    "found",
    "completed",
  ]),
  "graph-traversal": new Set([
    "graphIndex",
    "startNodeIndex",
    "targetNodeIndex",
    "traversalMode",
    "visitedCount",
    "frontierSize",
    "seenCount",
    "neighborChecks",
    "repeatSkips",
    "newDiscoveries",
    "currentDepth",
    "maxDepthReached",
    "foundTarget",
    "completed",
  ]),
  "solubility-saturation": new Set([
    "soluteAmount",
    "solventVolume",
    "solubilityLimit",
    "capacity",
    "dissolvedAmount",
    "excessAmount",
    "concentration",
    "saturationRatio",
    "dissolvedFraction",
    "dissolvedParticleCount",
    "excessParticleCount",
    "fillFraction",
    "saturationMargin",
  ]),
  "buffers-neutralization": new Set([
    "acidAmount",
    "baseAmount",
    "bufferAmount",
    "waterVolume",
    "neutralizedAmount",
    "activeExcess",
    "bufferUsed",
    "bufferRemaining",
    "acidCharacter",
    "baseCharacter",
    "acidShare",
    "baseShare",
    "pH",
    "hydroniumCount",
    "hydroxideCount",
  ]),
  "concentration-dilution": new Set([
    "soluteAmount",
    "solventVolume",
    "concentration",
    "particleCount",
    "fillFraction",
    "particleDensity",
  ]),
  "stoichiometry-recipe": new Set([
    "reactantAAmount",
    "reactantBAmount",
    "recipeA",
    "recipeB",
    "percentYield",
    "maxBatchesFromA",
    "maxBatchesFromB",
    "theoreticalBatches",
    "actualBatches",
    "reactionExtent",
    "actualProductAmount",
    "theoreticalProductAmount",
    "yieldGap",
    "usedReactantA",
    "usedReactantB",
    "leftoverReactantA",
    "leftoverReactantB",
  ]),
  "acid-base-ph": new Set([
    "acidAmount",
    "baseAmount",
    "waterVolume",
    "acidCharacter",
    "baseCharacter",
    "acidShare",
    "baseShare",
    "pH",
    "hydroniumCount",
    "hydroxideCount",
  ]),
  shm: new Set([
    "acceleration",
    "amplitude",
    "displacement",
    "energyGap",
    "kineticEnergy",
    "mass",
    "omega",
    "period",
    "phase",
    "potentialEnergy",
    "springConstant",
    "totalEnergy",
    "velocity",
  ]),
  ucm: new Set([
    "angle",
    "angularSpeed",
    "centripetalAcceleration",
    "period",
    "phase",
    "radius",
    "speed",
    "x",
    "y",
  ]),
  "damping-resonance": new Set([
    "amplitude",
    "dampingRatio",
    "displacement",
    "driveAmplitude",
    "driveFrequency",
    "naturalFrequency",
    "peakFrequency",
    "phaseLag",
    "resonanceOffset",
    "responseAmplitude",
  ]),
  projectile: new Set([
    "flightTime",
    "gravity",
    "launchAngle",
    "launchHeight",
    "launchSpeed",
    "maxHeight",
    "range",
    "speed",
    "vx",
    "vy",
    "x",
    "y",
  ]),
  "vectors-components": new Set([
    "angle",
    "componentDifference",
    "distance",
    "magnitude",
    "vx",
    "vy",
    "x",
    "y",
  ]),
  "dot-product-projection": new Set([
    "angleBetween",
    "dotProduct",
    "magnitudeA",
    "magnitudeB",
    "projectionMagnitude",
    "projectionScalar",
    "rejectionMagnitude",
  ]),
  "vectors-2d": new Set([
    "ax",
    "ay",
    "bx",
    "by",
    "scalar",
    "scaledAx",
    "scaledAy",
    "effectiveBx",
    "effectiveBy",
    "resultX",
    "resultY",
    "resultMagnitude",
    "scaledMagnitude",
  ]),
  torque: new Set([
    "applicationDistance",
    "forceAngle",
    "forceMagnitude",
    "forceParallel",
    "forcePerpendicular",
    "momentArm",
    "torque",
    "angularAcceleration",
    "angularSpeed",
    "rotationAngle",
  ]),
  "static-equilibrium-centre-of-mass": new Set([
    "cargoMass",
    "cargoPosition",
    "supportCenter",
    "supportWidth",
    "centerOfMassX",
    "totalMass",
    "totalWeight",
    "supportLeftEdge",
    "supportRightEdge",
    "torqueAboutSupportCenter",
    "leftReaction",
    "rightReaction",
    "requiredLeftReaction",
    "requiredRightReaction",
    "stabilityMargin",
    "tipOverhang",
  ]),
  "rotational-inertia": new Set([
    "appliedTorque",
    "massRadius",
    "momentOfInertia",
    "angularAcceleration",
    "angularSpeed",
    "rotationAngle",
  ]),
  "rolling-motion": new Set([
    "slopeAngle",
    "radius",
    "inertiaFactor",
    "acceleration",
    "angularAcceleration",
    "travelTime",
    "distance",
    "linearSpeed",
    "angularSpeed",
    "rotationAngle",
    "translationalEnergy",
    "rotationalEnergy",
    "totalKineticEnergy",
    "staticFriction",
  ]),
  "angular-momentum": new Set([
    "massRadius",
    "angularSpeed",
    "momentOfInertia",
    "angularMomentum",
    "tangentialSpeed",
    "rotationAngle",
    "referenceAngularSpeed",
  ]),
  "momentum-impulse": new Set([
    "mass",
    "initialVelocity",
    "force",
    "pulseDuration",
    "position",
    "velocity",
    "momentum",
    "initialMomentum",
    "finalMomentum",
    "impulse",
    "deltaMomentum",
  ]),
  "conservation-of-momentum": new Set([
    "massA",
    "massB",
    "systemVelocity",
    "interactionForce",
    "interactionDuration",
    "positionA",
    "positionB",
    "velocityA",
    "velocityB",
    "momentumA",
    "momentumB",
    "totalMomentum",
    "centerOfMassPosition",
    "centerOfMassVelocity",
  ]),
  collisions: new Set([
    "massA",
    "massB",
    "speedA",
    "speedB",
    "elasticity",
    "positionA",
    "positionB",
    "velocityA",
    "velocityB",
    "momentumA",
    "momentumB",
    "totalMomentum",
    "kineticEnergyA",
    "kineticEnergyB",
    "totalKineticEnergy",
    "finalVelocityA",
    "finalVelocityB",
    "relativeSpeedBefore",
    "relativeSpeedAfter",
    "energyLoss",
    "centerOfMassPosition",
    "centerOfMassVelocity",
  ]),
  "basic-circuits": new Set([
    "branchACurrent",
    "branchAVoltage",
    "branchBCurrent",
    "branchBVoltage",
    "equivalentResistance",
    "resistanceA",
    "resistanceB",
    "totalCurrent",
    "totalPower",
    "voltage",
  ]),
  "series-parallel-circuits": new Set([
    "branchACharge",
    "branchACurrent",
    "branchAPower",
    "branchAVoltage",
    "branchBCharge",
    "branchBCurrent",
    "branchBPower",
    "branchBVoltage",
    "equivalentResistance",
    "resistanceA",
    "resistanceB",
    "totalCharge",
    "totalCurrent",
    "totalPower",
    "voltage",
  ]),
  "equivalent-resistance": new Set([
    "voltage",
    "resistance1",
    "resistance2",
    "resistance3",
    "groupEquivalentResistance",
    "equivalentResistance",
    "groupVoltage",
    "totalCurrent",
    "totalCharge",
    "totalPower",
    "resistor1Current",
    "resistor1Voltage",
    "resistor1Power",
    "resistor2Current",
    "resistor2Voltage",
    "resistor2Power",
    "resistor2Charge",
    "resistor3Current",
    "resistor3Voltage",
    "resistor3Power",
    "resistor3Charge",
  ]),
  "power-energy-circuits": new Set([
    "voltage",
    "loadResistance",
    "current",
    "power",
    "energy",
    "chargeTransferred",
  ]),
  "rc-charging-discharging": new Set([
    "sourceVoltage",
    "resistance",
    "capacitance",
    "timeConstant",
    "normalizedTime",
    "capacitorVoltage",
    "resistorVoltage",
    "current",
    "currentMagnitude",
    "currentFraction",
    "chargeStored",
    "chargeFraction",
    "storedEnergy",
    "energyFraction",
  ]),
  "internal-resistance-terminal-voltage": new Set([
    "emf",
    "internalResistance",
    "loadResistance",
    "current",
    "terminalVoltage",
    "internalDrop",
    "loadPower",
    "internalPower",
    "sourcePower",
    "efficiency",
  ]),
  "temperature-internal-energy": new Set([
    "particleCount",
    "heaterPower",
    "startingTemperature",
    "temperature",
    "averageKineticEnergy",
    "thermalKineticEnergy",
    "bondEnergy",
    "internalEnergy",
    "internalEnergyPerParticle",
    "addedEnergy",
    "temperatureRate",
    "phaseProgress",
  ]),
  "ideal-gas-kinetic-theory": new Set([
    "particleCount",
    "temperature",
    "volume",
    "density",
    "averageSpeed",
    "collisionRate",
    "pressure",
  ]),
  "pressure-hydrostatic": new Set([
    "force",
    "area",
    "density",
    "gravity",
    "depth",
    "surfacePressure",
    "hydrostaticPressure",
    "totalPressure",
    "pressureGradient",
  ]),
  "continuity-equation": new Set([
    "flowRate",
    "entryArea",
    "middleArea",
    "entrySpeed",
    "middleSpeed",
    "speedRatio",
    "areaRatio",
    "entryVolumeFlow",
    "middleVolumeFlow",
    "entrySliceLength",
    "middleSliceLength",
  ]),
  "bernoulli-principle": new Set([
    "entryPressure",
    "flowRate",
    "entryArea",
    "throatArea",
    "throatHeight",
    "entrySpeed",
    "throatSpeed",
    "speedRatio",
    "areaRatio",
    "entryVolumeFlow",
    "throatVolumeFlow",
    "entrySliceLength",
    "throatSliceLength",
    "throatPressure",
    "pressureDrop",
    "dynamicPressureDrop",
    "heightPressureDrop",
    "entryDynamicPressure",
    "throatDynamicPressure",
    "throatHeightPressure",
    "totalEnergyLike",
    "throatTotalEnergyLike",
  ]),
  "buoyancy-archimedes": new Set([
    "objectDensity",
    "fluidDensity",
    "gravity",
    "bottomDepth",
    "submergedHeight",
    "submergedFraction",
    "displacedVolume",
    "weight",
    "buoyantForce",
    "netForce",
    "supportForce",
    "requiredSubmergedFraction",
    "topPressure",
    "bottomPressure",
    "pressureDifference",
  ]),
  "drag-terminal-velocity": new Set([
    "mass",
    "area",
    "dragStrength",
    "weight",
    "dragForce",
    "netForce",
    "speed",
    "position",
    "terminalSpeed",
    "acceleration",
    "terminalGap",
  ]),
  "heat-transfer": new Set([
    "hotTemperature",
    "ambientTemperature",
    "materialConductivity",
    "contactQuality",
    "surfaceArea",
    "airflow",
    "temperatureContrast",
    "contactPathStrength",
    "conductionRate",
    "convectionRate",
    "radiationRate",
    "totalRate",
    "conductionEnergyTransferred",
    "convectionEnergyTransferred",
    "radiationEnergyTransferred",
    "totalEnergyTransferred",
  ]),
  "specific-heat-phase-change": new Set([
    "mass",
    "specificHeat",
    "heaterPower",
    "startingTemperature",
    "latentHeat",
    "phaseChangeTemperature",
    "temperature",
    "temperatureChange",
    "thermalCapacity",
    "totalAddedEnergy",
    "sensibleEnergyChange",
    "latentEnergyChange",
    "phaseFraction",
    "phaseChangeEnergy",
    "temperatureRate",
  ]),
  "electric-fields": new Set([
    "sourceChargeA",
    "sourceChargeB",
    "sourceSeparation",
    "probeX",
    "probeY",
    "testCharge",
    "fieldX",
    "fieldY",
    "fieldMagnitude",
    "forceX",
    "forceY",
    "forceMagnitude",
  ]),
  "gravitational-fields": new Set([
    "sourceMass",
    "probeX",
    "probeY",
    "testMass",
    "distance",
    "fieldX",
    "fieldY",
    "fieldMagnitude",
    "forceX",
    "forceY",
    "forceMagnitude",
  ]),
  "gravitational-potential": new Set([
    "sourceMass",
    "probeX",
    "probeY",
    "testMass",
    "distance",
    "potential",
    "potentialEnergy",
    "fieldX",
    "fieldY",
    "fieldMagnitude",
    "forceX",
    "forceY",
    "forceMagnitude",
  ]),
  "circular-orbits": new Set([
    "sourceMass",
    "orbitRadius",
    "speedFactor",
    "currentRadius",
    "radiusDeviation",
    "circularSpeed",
    "localCircularSpeed",
    "actualSpeed",
    "angularSpeed",
    "period",
    "gravityAcceleration",
    "requiredCentripetalAcceleration",
    "x",
    "y",
  ]),
  "escape-velocity": new Set([
    "sourceMass",
    "launchRadius",
    "speedFactor",
    "launchSpeed",
    "launchEscapeSpeed",
    "launchCircularSpeed",
    "currentRadius",
    "radialVelocity",
    "actualSpeed",
    "gravityAcceleration",
    "localEscapeSpeed",
    "localCircularSpeed",
    "kineticEnergy",
    "potentialEnergy",
    "totalEnergy",
    "turnaroundRadius",
  ]),
  "electric-potential": new Set([
    "sourceChargeA",
    "sourceChargeB",
    "sourceSeparation",
    "probeX",
    "probeY",
    "testCharge",
    "potential",
    "potentialEnergy",
    "fieldX",
    "fieldY",
    "fieldMagnitude",
  ]),
  "capacitance-electric-energy": new Set([
    "plateArea",
    "plateSeparation",
    "batteryVoltage",
    "capacitance",
    "chargeMagnitude",
    "fieldStrength",
    "storedEnergy",
    "energyDensity",
  ]),
  "magnetic-fields": new Set([
    "currentA",
    "currentB",
    "sourceSeparation",
    "probeX",
    "probeY",
    "fieldX",
    "fieldY",
    "fieldMagnitude",
  ]),
  "electromagnetic-induction": new Set([
    "positionX",
    "fieldStrength",
    "fluxLinkage",
    "fluxChangeRate",
    "emf",
    "current",
    "magnetStrength",
    "coilTurns",
    "coilArea",
    "speed",
    "startOffset",
  ]),
  "maxwell-equations-synthesis": new Set([
    "chargeSource",
    "conductionCurrent",
    "electricChangeRate",
    "magneticChangeRate",
    "cycleRate",
    "period",
    "electricFlux",
    "magneticNetFlux",
    "electricChangeInstant",
    "magneticFluxChange",
    "bCurrentContribution",
    "bDisplacementContribution",
    "bCirculation",
    "eCirculation",
    "closedLoopStrength",
    "waveCueMagnitude",
    "waveSignedCue",
  ]),
  "electromagnetic-waves": new Set([
    "electricAmplitude",
    "magneticAmplitude",
    "waveSpeed",
    "wavelength",
    "probeX",
    "frequency",
    "period",
    "travelDelay",
    "phaseLagCycles",
    "electricField",
    "magneticField",
    "displayMagneticField",
    "sourceElectricField",
    "sourceMagneticField",
  ]),
  "light-spectrum-linkage": new Set([
    "fieldAmplitude",
    "logWavelength",
    "vacuumWavelength",
    "mediumIndex",
    "mediumWavelength",
    "frequency",
    "period",
    "phaseVelocity",
    "phaseVelocityFractionC",
    "probeCycles",
    "probeDistance",
    "travelDelay",
    "electricField",
    "magneticField",
    "sourceElectricField",
    "sourceMagneticField",
  ]),
  "dispersion-refractive-index-color": new Set([
    "wavelengthNm",
    "referenceIndex",
    "dispersionStrength",
    "prismAngle",
    "selectedIndex",
    "selectedDeviation",
    "speedFractionC",
    "redIndex",
    "greenIndex",
    "violetIndex",
    "redDeviation",
    "greenDeviation",
    "violetDeviation",
    "spreadAngle",
  ]),
  polarization: new Set([
    "inputAmplitude",
    "inputAngle",
    "polarizerAngle",
    "angleDifference",
    "unpolarizedFlag",
    "transmittedFieldAmplitude",
    "blockedFieldAmplitude",
    "transmittedIntensityFraction",
    "blockedIntensityFraction",
    "detectorBrightness",
  ]),
  diffraction: new Set([
    "wavelength",
    "slitWidth",
    "probeY",
    "edgePathDifference",
    "edgePathDifferenceInWavelengths",
    "normalizedIntensity",
    "envelopeAmplitude",
    "probeDisplacement",
    "wavelengthToSlitRatio",
    "firstMinimumAngleDeg",
    "centralPeakWidth",
  ]),
  "optical-resolution": new Set([
    "wavelengthNm",
    "apertureMm",
    "separationMrad",
    "probeYUm",
    "rayleighLimitMrad",
    "airyRadiusUm",
    "imageSeparationUm",
    "separationRatio",
    "pointACenterUm",
    "pointBCenterUm",
    "probePointAExposure",
    "probePointBExposure",
    "probeExposure",
    "peakExposure",
    "centerExposure",
    "centerDipRatio",
    "rayleighResolvedFlag",
  ]),
  "double-slit-interference": new Set([
    "wavelength",
    "slitSeparation",
    "screenDistance",
    "probeY",
    "pathDifference",
    "pathDifferenceInWavelengths",
    "phaseDifference",
    "resultantAmplitude",
    "resultantDisplacement",
    "normalizedIntensity",
    "fringeSpacing",
  ]),
  "photoelectric-effect": new Set([
    "frequencyPHz",
    "intensity",
    "workFunctionEv",
    "collectorVoltage",
    "wavelengthNm",
    "photonEnergyEv",
    "thresholdFrequencyPHz",
    "thresholdWavelengthNm",
    "thresholdMarginEv",
    "maxKineticEnergyEv",
    "stoppingPotential",
    "saturationCurrent",
    "collectorCurrent",
    "currentFraction",
  ]),
  "atomic-spectra": new Set([
    "gap12Ev",
    "gap23Ev",
    "gap34Ev",
    "modeFlag",
    "visibleLineCount",
    "shortestWavelengthNm",
    "longestWavelengthNm",
    "shortestVisibleWavelengthNm",
    "longestVisibleWavelengthNm",
    "strongestVisibleWavelengthNm",
    "minVisibleSeparationNm",
    "activeTransitionEnergyEv",
    "activeTransitionWavelengthNm",
  ]),
  "de-broglie-matter-waves": new Set([
    "massMultiple",
    "speedMms",
    "momentumScaled",
    "wavelengthNm",
    "loopCircumferenceNm",
    "fitCount",
    "nearestWholeFit",
    "fitErrorAbs",
    "wholeNumberFitFlag",
    "speedFractionC",
  ]),
  "bohr-model": new Set([
    "upperLevel",
    "lowerLevel",
    "excitationFlag",
    "photonEnergyEv",
    "wavelengthNm",
    "seriesLimitWavelengthNm",
    "upperRadiusA0",
    "lowerRadiusA0",
    "radiusRatio",
    "activeVisibleFlag",
    "seriesVisibleLineCount",
  ]),
  "radioactivity-half-life": new Set([
    "sampleSize",
    "halfLifeSeconds",
    "elapsedHalfLives",
    "expectedRemainingCount",
    "actualRemainingCount",
    "expectedFraction",
    "actualFraction",
    "deviationCount",
    "deviationFraction",
    "decayedCount",
    "survivalProbability",
    "recentDecayCount",
  ]),
  "magnetic-force": new Set([
    "fieldStrength",
    "speed",
    "directionAngle",
    "current",
    "chargeX",
    "chargeY",
    "velocityX",
    "velocityY",
    "chargeForceX",
    "chargeForceY",
    "chargeForceMagnitude",
    "wireForceX",
    "wireForceY",
    "wireForceMagnitude",
    "radius",
    "period",
  ]),
  "refraction-snells-law": new Set([
    "bendAngle",
    "criticalAngle",
    "criticalOffset",
    "incidentAngle",
    "n1",
    "n2",
    "refractedAngle",
    "speedRatio",
  ]),
  mirrors: new Set([
    "focalLength",
    "objectDistance",
    "objectHeight",
    "imageDistance",
    "imageHeight",
    "magnification",
    "signedFocalLength",
  ]),
  "lens-imaging": new Set([
    "focalLength",
    "objectDistance",
    "objectHeight",
    "imageDistance",
    "imageHeight",
    "magnification",
    "signedFocalLength",
  ]),
  beats: new Set([
    "amplitude",
    "frequencyA",
    "frequencyB",
    "averageFrequency",
    "frequencyDifference",
    "beatFrequency",
    "beatPeriod",
    "carrierFrequency",
    "sourceADisplacement",
    "sourceBDisplacement",
    "resultantDisplacement",
    "envelopeAmplitude",
    "envelopeRatio",
    "loudnessCue",
  ]),
  "sound-waves-longitudinal": new Set([
    "amplitude",
    "waveSpeed",
    "wavelength",
    "probeX",
    "frequency",
    "period",
    "travelDelay",
    "phaseLagCycles",
    "phaseLagRadians",
    "probeDisplacement",
    "probeCompression",
    "normalizedProbeCompression",
    "intensityCue",
  ]),
  "doppler-effect": new Set([
    "sourceFrequency",
    "sourceSpeed",
    "observerSpeed",
    "frontSpacing",
    "backSpacing",
    "selectedSpacing",
    "oppositeSpacing",
    "observedFrequency",
    "observedPeriod",
    "pitchRatio",
    "travelDelay",
    "currentSeparation",
  ]),
  "wave-speed-wavelength": new Set([
    "amplitude",
    "frequency",
    "period",
    "phaseLagCycles",
    "phaseLagRadians",
    "probeDisplacement",
    "probeX",
    "travelDelay",
    "waveSpeed",
    "wavelength",
  ]),
  "wave-interference": new Set([
    "amplitudeA",
    "amplitudeB",
    "normalizedIntensity",
    "pathDifference",
    "phaseDifference",
    "probeY",
    "resultantAmplitude",
    "resultantDisplacement",
    "wavelength",
  ]),
  "standing-waves": new Set([
    "amplitude",
    "length",
    "modeNumber",
    "nodeSpacing",
    "probeDisplacement",
    "probeEnvelope",
    "probeX",
    "wavelength",
  ]),
  "air-column-resonance": new Set([
    "amplitude",
    "length",
    "resonanceOrder",
    "harmonicMultiple",
    "probeX",
    "wavelength",
    "frequency",
    "probeEnvelope",
    "probeDisplacement",
    "probePressureEnvelope",
    "probePressureValue",
  ]),
};

function buildConceptKey(topic: string, subtopic?: string) {
  return subtopic ? `${topic}::${subtopic}` : topic;
}

function orderMetadata(entries: ConceptMetadata[]): ConceptMetadata[] {
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((left, right) => {
      const leftSequence = left.entry.sequence ?? Number.MAX_SAFE_INTEGER;
      const rightSequence = right.entry.sequence ?? Number.MAX_SAFE_INTEGER;

      if (leftSequence !== rightSequence) {
        return leftSequence - rightSequence;
      }

      return left.index - right.index;
    })
    .map(({ entry }) => entry);
}

function buildMetadataMap<K extends ConceptId | ConceptSlug>(
  entries: ConceptMetadata[],
  selector: (entry: ConceptMetadata) => K,
): Map<K, ConceptMetadata> {
  return new Map(entries.map((entry) => [selector(entry), entry]));
}

function buildGroupedMap(
  entries: ConceptMetadata[],
  selector: (entry: ConceptMetadata) => string,
): Map<string, ConceptMetadata[]> {
  const grouped = new Map<string, ConceptMetadata[]>();

  for (const entry of entries) {
    const key = selector(entry);
    const current = grouped.get(key);

    if (current) {
      current.push(entry);
      continue;
    }

    grouped.set(key, [entry]);
  }

  return grouped;
}

function buildAliasMap(entries: ConceptMetadata[]) {
  const aliases = new Map<ConceptSlug, ConceptSlug>();

  for (const entry of entries) {
    for (const alias of entry.aliases ?? []) {
      aliases.set(alias, entry.slug);
    }
  }

  return aliases;
}

function buildConceptMaps(concepts: ConceptContent[]) {
  return {
    bySlug: new Map(concepts.map((concept) => [concept.slug, concept])),
    byId: new Map(concepts.map((concept) => [concept.id, concept])),
  };
}

function listContentFileKeys(): ConceptContentFile[] {
  return listConceptContentFileKeys();
}

function readConceptCatalog(): ConceptMetadata[] {
  return conceptCatalogSchema.parse(getCatalogData("concepts")) as ConceptMetadata[];
}

function readConceptContentFile(contentFile: ConceptContentFile): ConceptRichContent {
  return conceptRichContentSchema.parse(getConceptContentData(contentFile)) as ConceptRichContent;
}

function normalizeConceptRecord(
  metadata: ConceptMetadata,
  richContent: ConceptRichContent,
): ConceptContent {
  const challengeMode = normalizeChallengeModeAuthoring(richContent.challengeMode, {
    graphs: richContent.graphs,
    overlays: richContent.simulation.overlays,
    controls: richContent.simulation.controls,
    variableLinks: richContent.variableLinks,
  });

  return conceptRecordSchema.parse({
    ...metadata,
    ...richContent,
    challengeMode,
    simulation: {
      kind: metadata.simulationKind,
      ...richContent.simulation,
    },
  }) as ConceptContent;
}

function getRegistryEntryLabel(entry: ConceptMetadata) {
  return `Concept catalog entry "${entry.slug}"`;
}

function resolveCanonicalConceptSlug(registry: ConceptRegistry, slug: string) {
  if (registry.bySlug.has(slug as ConceptSlug)) {
    return slug as ConceptSlug;
  }

  return registry.aliasToSlug.get(slug as ConceptSlug) ?? null;
}

function ensureUnique<T>(
  values: T[],
  buildMessage: () => string,
) {
  if (new Set(values).size !== values.length) {
    throw new Error(buildMessage());
  }
}

function supportsChallengeMetric(
  kind: ConceptContent["simulation"]["kind"],
  metric: string,
) {
  return challengeMetricsBySimulationKind[kind]?.has(metric) ?? false;
}

function ensureUniqueStrings(
  values: string[],
  buildMessage: (duplicateValue: string) => string,
) {
  const seen = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      throw new Error(buildMessage(value));
    }

    seen.add(value);
  }
}

function validatePublishedRelationshipTarget(
  entry: ConceptMetadata,
  relationLabel: string,
  targetSlug: string,
  bySlug: Map<ConceptSlug, ConceptMetadata>,
) {
  const target = bySlug.get(targetSlug as ConceptSlug);

  if (entry.published && target && !target.published) {
    throw new Error(
      `${getRegistryEntryLabel(entry)} references unpublished ${relationLabel} "${targetSlug}".`,
    );
  }
}

function validatePrerequisiteGraph(metadataEntries: ConceptMetadata[]) {
  const bySlug = buildMetadataMap(metadataEntries, (entry) => entry.slug);
  const visitState = new Map<ConceptSlug, "visiting" | "visited">();
  const stack: ConceptSlug[] = [];

  function visit(slug: ConceptSlug) {
    const currentState = visitState.get(slug);

    if (currentState === "visiting") {
      const cycleStart = stack.indexOf(slug);
      const cycle = [...stack.slice(cycleStart), slug].join(" -> ");
      throw new Error(`Concept prerequisite cycle detected: ${cycle}.`);
    }

    if (currentState === "visited") {
      return;
    }

    visitState.set(slug, "visiting");
    stack.push(slug);

    for (const prerequisiteSlug of bySlug.get(slug)?.prerequisites ?? []) {
      visit(prerequisiteSlug);
    }

    stack.pop();
    visitState.set(slug, "visited");
  }

  for (const entry of metadataEntries) {
    visit(entry.slug);
  }
}

function buildWorkedExampleValidationState(concept: ConceptContent) {
  return {
    slug: concept.slug,
    params: { ...concept.simulation.defaults },
    time: 0,
    timeSource: "live" as const,
    activeGraphId: concept.graphs[0]?.id ?? null,
    interactionMode: "explore" as const,
    activeCompareTarget: null,
    activePresetId: concept.simulation.presets[0]?.id ?? null,
  };
}

export function validateConceptCatalogMetadata(
  metadataEntries: ConceptMetadata[],
): ConceptMetadata[] {
  const bySlug = buildMetadataMap(metadataEntries, (entry) => entry.slug);
  const byId = buildMetadataMap(metadataEntries, (entry) => entry.id);

  if (metadataEntries.length !== bySlug.size) {
    const seen = new Set<string>();

    for (const entry of metadataEntries) {
      if (seen.has(entry.slug)) {
        throw new Error(`Duplicate concept catalog slug found: ${entry.slug}`);
      }

      seen.add(entry.slug);
    }
  }

  if (metadataEntries.length !== byId.size) {
    const seen = new Set<string>();

    for (const entry of metadataEntries) {
      if (seen.has(entry.id)) {
        throw new Error(`Duplicate concept catalog id found: ${entry.id}`);
      }

      seen.add(entry.id);
    }
  }

  const slugOwners = new Map<string, string>();

  for (const entry of metadataEntries) {
    for (const knownSlug of [entry.slug, ...(entry.aliases ?? [])]) {
      const existingOwner = slugOwners.get(knownSlug);

      if (existingOwner) {
        throw new Error(
          `Duplicate concept alias or slug found: "${knownSlug}" is already owned by "${existingOwner}".`,
        );
      }

      slugOwners.set(knownSlug, entry.slug);
    }
  }

  ensureUnique(
    metadataEntries.map((entry) => entry.contentFile),
    () => "Duplicate concept catalog contentFile values are not allowed.",
  );

  for (const entry of metadataEntries) {
    const dedupeSets = [
      { label: "prerequisites", values: entry.prerequisites ?? [] },
      { label: "related", values: entry.related ?? [] },
      { label: "aliases", values: entry.aliases ?? [] },
      {
        label: "recommendedNext",
        values: (entry.recommendedNext ?? []).map((item) => item.slug),
      },
    ];

    for (const { label, values } of dedupeSets) {
      if (new Set(values).size !== values.length) {
        throw new Error(
          `${getRegistryEntryLabel(entry)} contains duplicate ${label} references.`,
        );
      }
    }

    for (const alias of entry.aliases ?? []) {
      if (alias === entry.slug) {
        throw new Error(`${getRegistryEntryLabel(entry)} cannot alias its own canonical slug.`);
      }
    }

    for (const prerequisiteSlug of entry.prerequisites ?? []) {
      if (prerequisiteSlug === entry.slug) {
        throw new Error(`${getRegistryEntryLabel(entry)} cannot require itself.`);
      }

      if (!bySlug.has(prerequisiteSlug)) {
        throw new Error(
          `${getRegistryEntryLabel(entry)} references missing prerequisite "${prerequisiteSlug}".`,
        );
      }

      validatePublishedRelationshipTarget(entry, "prerequisite", prerequisiteSlug, bySlug);

      const prerequisite = bySlug.get(prerequisiteSlug as ConceptSlug);

      if (
        prerequisite &&
        entry.sequence !== undefined &&
        prerequisite.sequence !== undefined &&
        prerequisite.sequence > entry.sequence
      ) {
        throw new Error(
          `${getRegistryEntryLabel(entry)} lists prerequisite "${prerequisiteSlug}" at sequence ${prerequisite.sequence}, which must not be later than ${entry.sequence}.`,
        );
      }
    }

    for (const relatedSlug of entry.related ?? []) {
      if (relatedSlug === entry.slug) {
        throw new Error(`${getRegistryEntryLabel(entry)} cannot relate to itself.`);
      }

      if (!bySlug.has(relatedSlug)) {
        throw new Error(
          `${getRegistryEntryLabel(entry)} references missing related concept "${relatedSlug}".`,
        );
      }

      validatePublishedRelationshipTarget(entry, "related concept", relatedSlug, bySlug);
    }

    for (const recommendation of entry.recommendedNext ?? []) {
      if (recommendation.slug === entry.slug) {
        throw new Error(
          `${getRegistryEntryLabel(entry)} cannot recommend itself as read next.`,
        );
      }

      if (!bySlug.has(recommendation.slug)) {
        throw new Error(
          `${getRegistryEntryLabel(entry)} references missing recommendedNext slug "${recommendation.slug}".`,
        );
      }

      validatePublishedRelationshipTarget(
        entry,
        "recommendedNext concept",
        recommendation.slug,
        bySlug,
      );
    }
  }

  validatePrerequisiteGraph(metadataEntries);

  const metadataContentFiles = new Set(metadataEntries.map((entry) => entry.contentFile));
  const contentFileKeys = listContentFileKeys();
  const availableContentFiles = new Set(contentFileKeys);

  for (const contentFile of contentFileKeys) {
    if (!metadataContentFiles.has(contentFile)) {
      throw new Error(
        `Concept content file "${contentFile}.json" is not registered in content/catalog/concepts.json.`,
      );
    }
  }

  for (const entry of metadataEntries) {
    if (!availableContentFiles.has(entry.contentFile)) {
      throw new Error(
        `${getRegistryEntryLabel(entry)} is missing its content file "${entry.contentFile}.json".`,
      );
    }
  }

  return orderMetadata(metadataEntries);
}

export const validateConceptRegistry = validateConceptCatalogMetadata;

export function buildConceptRegistry(metadataEntries: ConceptMetadata[]): ConceptRegistry {
  const all = orderMetadata(metadataEntries);
  const published = all.filter((entry) => entry.published);

  return {
    all,
    published,
    byId: buildMetadataMap(all, (entry) => entry.id),
    bySlug: buildMetadataMap(all, (entry) => entry.slug),
    aliasToSlug: buildAliasMap(all),
    bySubject: buildGroupedMap(published, (entry) => entry.subject),
    byTopic: buildGroupedMap(published, (entry) => entry.topic),
    bySubtopic: buildGroupedMap(
      published,
      (entry) => buildConceptKey(entry.topic, entry.subtopic),
    ),
    subjects: Array.from(new Set(published.map((entry) => entry.subject))),
    topics: Array.from(new Set(published.map((entry) => entry.topic))),
  };
}

export type ConceptBundleValidationOptions = {
  quizFallbackPolicy?: "published-only" | "all" | "off";
};

function loadRegistryFromSource(): ConceptRegistry {
  return buildConceptRegistry(validateConceptCatalogMetadata(readConceptCatalog()));
}

function getCachedRegistry(): ConceptRegistry {
  if (!cachedRegistry) {
    cachedRegistry = loadRegistryFromSource();
  }

  return cachedRegistry;
}

export function validateConceptBundle(
  concepts: ConceptContent[],
  metadataEntries: ConceptMetadata[] = getAllConceptMetadata(),
  options: ConceptBundleValidationOptions = {},
): ConceptContent[] {
  const metadataBySlug = buildMetadataMap(metadataEntries, (entry) => entry.slug);
  const conceptMaps = buildConceptMaps(concepts);

  if (concepts.length !== metadataEntries.length) {
    throw new Error(
      `Expected exactly ${metadataEntries.length} concepts, found ${concepts.length}.`,
    );
  }

  if (conceptMaps.bySlug.size !== concepts.length) {
    const seen = new Set<string>();

    for (const concept of concepts) {
      if (seen.has(concept.slug)) {
        throw new Error(`Duplicate concept slug found: ${concept.slug}`);
      }

      seen.add(concept.slug);
    }
  }

  if (conceptMaps.byId.size !== concepts.length) {
    const seen = new Set<string>();

    for (const concept of concepts) {
      if (seen.has(concept.id)) {
        throw new Error(`Duplicate concept id found: ${concept.id}`);
      }

      seen.add(concept.id);
    }
  }

  for (const metadata of metadataEntries) {
    if (!conceptMaps.bySlug.has(metadata.slug)) {
      throw new Error(`Missing required concept content for slug: ${metadata.slug}`);
    }
  }

  for (const concept of concepts) {
    const metadata = metadataBySlug.get(concept.slug);

    if (!metadata) {
      throw new Error(`Concept "${concept.slug}" is not registered in the concept catalog.`);
    }

    if (concept.id !== metadata.id) {
      throw new Error(`Concept "${concept.slug}" must keep metadata id "${metadata.id}".`);
    }

    if (concept.simulation.kind !== metadata.simulationKind) {
      throw new Error(
        `Concept "${concept.slug}" must use simulation kind "${metadata.simulationKind}".`,
      );
    }

    if (metadata.published) {
      const definition = concept.pageIntro?.definition?.trim();
      const keyTakeaway = concept.pageIntro?.keyTakeaway?.trim();

      if (!definition) {
        throw new Error(
          `Published concept "${concept.slug}" must author pageIntro.definition.`,
        );
      }

      if (!keyTakeaway) {
        throw new Error(
          `Published concept "${concept.slug}" must author pageIntro.keyTakeaway.`,
        );
      }
    }

    ensureUniqueStrings(
      concept.equations.map((equation) => equation.id),
      (duplicateValue) =>
        `Concept "${concept.slug}" contains duplicate equation id "${duplicateValue}".`,
    );
    ensureUniqueStrings(
      concept.simulation.controls.map((control) => control.id),
      (duplicateValue) =>
        `Concept "${concept.slug}" contains duplicate control id "${duplicateValue}".`,
    );
    ensureUniqueStrings(
      concept.simulation.controls.map((control) => control.param),
      (duplicateValue) =>
        `Concept "${concept.slug}" contains duplicate control param "${duplicateValue}".`,
    );
    ensureUniqueStrings(
      concept.simulation.presets.map((preset) => preset.id),
      (duplicateValue) =>
        `Concept "${concept.slug}" contains duplicate preset id "${duplicateValue}".`,
    );
    ensureUniqueStrings(
      concept.graphs.map((graph) => graph.id),
      (duplicateValue) =>
        `Concept "${concept.slug}" contains duplicate graph id "${duplicateValue}".`,
    );
    ensureUniqueStrings(
      (concept.simulation.overlays ?? []).map((overlay) => overlay.id),
      (duplicateValue) =>
        `Concept "${concept.slug}" contains duplicate overlay id "${duplicateValue}".`,
    );
    ensureUniqueStrings(
      concept.variableLinks.map((variableLink) => variableLink.id),
      (duplicateValue) =>
        `Concept "${concept.slug}" contains duplicate variableLink id "${duplicateValue}".`,
    );

    const equationIds = new Set(concept.equations.map((equation) => equation.id));
    const controlParams = new Set(concept.simulation.controls.map((control) => control.param));
    const controlIds = new Set(concept.simulation.controls.map((control) => control.id));
    const controlsByParam = new Map(
      concept.simulation.controls.map((control) => [control.param, control]),
    );
    const presetIds = new Set(concept.simulation.presets.map((preset) => preset.id));
    const graphIds = new Set(concept.graphs.map((graph) => graph.id));
    const overlayIds = new Set((concept.simulation.overlays ?? []).map((overlay) => overlay.id));
    const variableIds = new Set(concept.variableLinks.map((variableLink) => variableLink.id));
    const simulationUiHints = resolveSimulationUiHints({
      ...concept.simulation,
      graphs: concept.graphs,
    });
    const workedExampleValidationState = buildWorkedExampleValidationState(concept);
    const noticePromptIds = new Set<string>();
    const workedExampleIds = new Set<string>();
    const quickTestQuestionIds = new Set<string>();
    const predictionItemIds = new Set<string>();
    const challengeItemIds = new Set<string>();
    const workedExampleRefs = new Set(
      concept.sections.workedExamples.items.flatMap((item) => [item.id, item.title]),
    );

    for (const setup of concept.pageFramework?.featuredSetups ?? []) {
      if (setup.setup?.presetId && !presetIds.has(setup.setup.presetId)) {
        throw new Error(
          `Concept "${concept.slug}" featured setup "${setup.id}" references missing setup presetId "${setup.setup.presetId}".`,
        );
      }

      for (const patchKey of Object.keys(setup.setup?.patch ?? {})) {
        const control = controlsByParam.get(patchKey);

        if (!control) {
          throw new Error(
            `Concept "${concept.slug}" featured setup "${setup.id}" patches unknown setup control param "${patchKey}".`,
          );
        }

        const patchValue = setup.setup.patch?.[patchKey];

        if (control.kind === "toggle") {
          if (typeof patchValue !== "boolean") {
            throw new Error(
              `Concept "${concept.slug}" featured setup "${setup.id}" must patch toggle control "${patchKey}" with a boolean value.`,
            );
          }

          continue;
        }

        if (typeof patchValue !== "number" || !Number.isFinite(patchValue)) {
          throw new Error(
            `Concept "${concept.slug}" featured setup "${setup.id}" must patch slider control "${patchKey}" with a finite number value.`,
          );
        }

        if (patchValue < control.min || patchValue > control.max) {
          throw new Error(
            `Concept "${concept.slug}" featured setup "${setup.id}" patches control "${patchKey}" with ${patchValue}, outside ${control.min} to ${control.max}.`,
          );
        }
      }

      if (setup.setup?.graphId && !graphIds.has(setup.setup.graphId)) {
        throw new Error(
          `Concept "${concept.slug}" featured setup "${setup.id}" references unknown setup graph "${setup.setup.graphId}".`,
        );
      }

      for (const overlayId of setup.setup?.overlayIds ?? []) {
        if (!overlayIds.has(overlayId)) {
          throw new Error(
            `Concept "${concept.slug}" featured setup "${setup.id}" references unknown setup overlay "${overlayId}".`,
          );
        }
      }
    }

    for (const hint of concept.pageFramework?.entryGuidance?.hints ?? []) {
      if (
        hint.kind === "control" &&
        !controlsByParam.has(hint.id) &&
        !controlIds.has(hint.id)
      ) {
        throw new Error(
          `Concept "${concept.slug}" entry guidance hint "${hint.id}" references unknown control.`,
        );
      }

      if (hint.kind === "graph" && !graphIds.has(hint.id)) {
        throw new Error(
          `Concept "${concept.slug}" entry guidance hint "${hint.id}" references unknown graph.`,
        );
      }

      if (hint.kind === "overlay" && !overlayIds.has(hint.id)) {
        throw new Error(
          `Concept "${concept.slug}" entry guidance hint "${hint.id}" references unknown overlay.`,
        );
      }

      if (hint.kind === "preset" && !presetIds.has(hint.id)) {
        throw new Error(
          `Concept "${concept.slug}" entry guidance hint "${hint.id}" references unknown preset.`,
        );
      }

      if (
        hint.kind === "tool" &&
        !conceptPageGuidanceToolHintIds.includes(
          hint.id as (typeof conceptPageGuidanceToolHintIds)[number],
        )
      ) {
        throw new Error(
          `Concept "${concept.slug}" entry guidance hint "${hint.id}" references unknown tool.`,
        );
      }
    }

    if (concept.v2?.equationSnapshot) {
      for (const equationId of concept.v2.equationSnapshot.equationIds) {
        if (!equationIds.has(equationId)) {
          throw new Error(
            `Concept "${concept.slug}" V2 equation snapshot references unknown equation "${equationId}".`,
          );
        }
      }
    }

    for (const step of concept.v2?.guidedSteps ?? []) {
      for (const controlId of step.reveal?.controlIds ?? []) {
        if (!controlsByParam.has(controlId) && !controlIds.has(controlId)) {
          throw new Error(
            `Concept "${concept.slug}" V2 guided step "${step.id}" references unknown control "${controlId}".`,
          );
        }
      }

      for (const graphId of step.reveal?.graphIds ?? []) {
        if (!graphIds.has(graphId)) {
          throw new Error(
            `Concept "${concept.slug}" V2 guided step "${step.id}" references unknown graph "${graphId}".`,
          );
        }
      }

      for (const overlayId of step.reveal?.overlayIds ?? []) {
        if (!overlayIds.has(overlayId)) {
          throw new Error(
            `Concept "${concept.slug}" V2 guided step "${step.id}" references unknown overlay "${overlayId}".`,
          );
        }
      }

      for (const predictionId of step.inlineCheck?.predictionIds ?? []) {
        if (!concept.predictionMode.items.some((item) => item.id === predictionId)) {
          throw new Error(
            `Concept "${concept.slug}" V2 guided step "${step.id}" references unknown prediction item "${predictionId}".`,
          );
        }
      }

      for (const questionId of step.inlineCheck?.questionIds ?? []) {
        if (!concept.quickTest.questions.some((question) => question.id === questionId)) {
          throw new Error(
            `Concept "${concept.slug}" V2 guided step "${step.id}" references unknown quick-test question "${questionId}".`,
          );
        }
      }

      if (step.setup?.presetId && !presetIds.has(step.setup.presetId)) {
        throw new Error(
          `Concept "${concept.slug}" V2 guided step "${step.id}" references missing setup presetId "${step.setup.presetId}".`,
        );
      }

      for (const patchKey of Object.keys(step.setup?.patch ?? {})) {
        if (!controlsByParam.has(patchKey)) {
          throw new Error(
            `Concept "${concept.slug}" V2 guided step "${step.id}" patches unknown control "${patchKey}".`,
          );
        }
      }

      if (step.setup?.graphId && !graphIds.has(step.setup.graphId)) {
        throw new Error(
          `Concept "${concept.slug}" V2 guided step "${step.id}" references unknown graph "${step.setup.graphId}".`,
        );
      }

      for (const overlayId of step.setup?.overlayIds ?? []) {
        if (!overlayIds.has(overlayId)) {
          throw new Error(
            `Concept "${concept.slug}" V2 guided step "${step.id}" references unknown setup overlay "${overlayId}".`,
          );
        }
      }

    }

    for (const workedExampleRef of concept.v2?.wrapUp?.workedExampleRefs ?? []) {
      if (!workedExampleRefs.has(workedExampleRef)) {
        throw new Error(
          `Concept "${concept.slug}" V2 wrapUp references unknown worked example "${workedExampleRef}".`,
        );
      }
    }

    if (simulationUiHints.invalidInitialGraphId) {
      throw new Error(
        `Concept "${concept.slug}" simulation.ui.initialGraphId references unknown graph "${simulationUiHints.invalidInitialGraphId}".`,
      );
    }

    if (
      concept.simulation.ui?.initialGraphId &&
      simulationUiHints.primaryGraphIds?.length &&
      !simulationUiHints.primaryGraphIds.includes(concept.simulation.ui.initialGraphId)
    ) {
      throw new Error(
        `Concept "${concept.slug}" simulation.ui.initialGraphId must be included in simulation.ui.primaryGraphIds when primaryGraphIds are authored.`,
      );
    }

    for (const graphId of simulationUiHints.invalidPrimaryGraphIds) {
      throw new Error(
        `Concept "${concept.slug}" simulation.ui.primaryGraphIds references unknown graph "${graphId}".`,
      );
    }

    for (const controlId of simulationUiHints.invalidPrimaryControlIds) {
      throw new Error(
        `Concept "${concept.slug}" simulation.ui.primaryControlIds references unknown control "${controlId}".`,
      );
    }

    for (const presetId of simulationUiHints.invalidPrimaryPresetIds) {
      throw new Error(
        `Concept "${concept.slug}" simulation.ui.primaryPresetIds references unknown preset "${presetId}".`,
      );
    }

    for (const variableLink of concept.variableLinks) {
      if (!controlParams.has(variableLink.param)) {
        throw new Error(
          `Concept "${concept.slug}" maps variable "${variableLink.id}" to unknown control param "${variableLink.param}".`,
        );
      }

      for (const equationId of variableLink.equationIds) {
        if (!equationIds.has(equationId)) {
          throw new Error(
            `Concept "${concept.slug}" maps variable "${variableLink.id}" to unknown equation "${equationId}".`,
          );
        }
      }

      for (const graphId of variableLink.graphIds ?? []) {
        if (!graphIds.has(graphId)) {
          throw new Error(
            `Concept "${concept.slug}" maps variable "${variableLink.id}" to unknown graph "${graphId}".`,
          );
        }
      }

      for (const overlayId of variableLink.overlayIds ?? []) {
        if (!overlayIds.has(overlayId)) {
          throw new Error(
            `Concept "${concept.slug}" maps variable "${variableLink.id}" to unknown overlay "${overlayId}".`,
          );
        }
      }
    }

    for (const overlay of concept.simulation.overlays ?? []) {
      for (const controlParam of overlay.relatedControls ?? []) {
        if (!controlParams.has(controlParam)) {
          throw new Error(
            `Concept "${concept.slug}" overlay "${overlay.id}" references unknown related control "${controlParam}".`,
          );
        }
      }

      for (const graphId of overlay.relatedGraphTabs ?? []) {
        if (!graphIds.has(graphId)) {
          throw new Error(
            `Concept "${concept.slug}" overlay "${overlay.id}" references unknown related graph tab "${graphId}".`,
          );
        }
      }

      for (const variableId of overlay.relatedEquationVariables ?? []) {
        if (!variableIds.has(variableId)) {
          throw new Error(
            `Concept "${concept.slug}" overlay "${overlay.id}" references unknown related equation variable "${variableId}".`,
          );
        }
      }
    }

    for (const prompt of concept.noticePrompts.items) {
      if (noticePromptIds.has(prompt.id)) {
        throw new Error(
          `Concept "${concept.slug}" contains duplicate noticePrompts item id "${prompt.id}".`,
        );
      }

      noticePromptIds.add(prompt.id);

      for (const graphId of prompt.conditions?.graphTabs ?? []) {
        if (!graphIds.has(graphId)) {
          throw new Error(
            `Concept "${concept.slug}" noticePrompts item "${prompt.id}" references unknown graphTab "${graphId}".`,
          );
        }
      }

      for (const overlayId of prompt.conditions?.overlayIds ?? []) {
        if (!overlayIds.has(overlayId)) {
          throw new Error(
            `Concept "${concept.slug}" noticePrompts item "${prompt.id}" references unknown overlayId "${overlayId}".`,
          );
        }
      }

      for (const controlRange of prompt.conditions?.controlRanges ?? []) {
        if (!controlParams.has(controlRange.param)) {
          throw new Error(
            `Concept "${concept.slug}" noticePrompts item "${prompt.id}" references unknown controlRange param "${controlRange.param}".`,
          );
        }
      }

      for (const controlParam of prompt.conditions?.lastChangedControls ?? []) {
        if (!controlParams.has(controlParam)) {
          throw new Error(
            `Concept "${concept.slug}" noticePrompts item "${prompt.id}" references unknown lastChangedControls param "${controlParam}".`,
          );
        }
      }

      for (const controlParam of prompt.relatedControls ?? []) {
        if (!controlParams.has(controlParam)) {
          throw new Error(
            `Concept "${concept.slug}" noticePrompts item "${prompt.id}" references unknown related control "${controlParam}".`,
          );
        }
      }

      for (const graphId of prompt.relatedGraphTabs ?? []) {
        if (!graphIds.has(graphId)) {
          throw new Error(
            `Concept "${concept.slug}" noticePrompts item "${prompt.id}" references unknown related graph "${graphId}".`,
          );
        }
      }

      for (const overlayId of prompt.relatedOverlays ?? []) {
        if (!overlayIds.has(overlayId)) {
          throw new Error(
            `Concept "${concept.slug}" noticePrompts item "${prompt.id}" references unknown related overlay "${overlayId}".`,
          );
        }
      }

      for (const variableId of prompt.relatedEquationVariables ?? []) {
        if (!variableIds.has(variableId)) {
          throw new Error(
            `Concept "${concept.slug}" noticePrompts item "${prompt.id}" references unknown related equation variable "${variableId}".`,
          );
        }
      }
    }

    for (const workedExample of concept.sections.workedExamples.items) {
      if (workedExampleIds.has(workedExample.id)) {
        throw new Error(
          `Concept "${concept.slug}" contains duplicate workedExamples item id "${workedExample.id}".`,
        );
      }

      workedExampleIds.add(workedExample.id);

      ensureUniqueStrings(
        workedExample.variables.map((variable) => variable.id),
        (duplicateValue) =>
          `Concept "${concept.slug}" workedExamples item "${workedExample.id}" contains duplicate variable id "${duplicateValue}".`,
      );
      ensureUniqueStrings(
        workedExample.steps.map((step) => step.id),
        (duplicateValue) =>
          `Concept "${concept.slug}" workedExamples item "${workedExample.id}" contains duplicate step id "${duplicateValue}".`,
      );

      for (const variable of workedExample.variables) {
        if (variable.variableId && !variableIds.has(variable.variableId)) {
          throw new Error(
            `Concept "${concept.slug}" workedExamples item "${workedExample.id}" references unknown variableId "${variable.variableId}".`,
          );
        }
      }

      let workedExampleValidationIssues = getWorkedExampleTokenValidationIssues(
        concept.slug,
        workedExample,
        workedExampleValidationState,
      );

      if (
        workedExampleValidationIssues.length === 1 &&
        isMissingWorkedExampleBuilderIssue(workedExampleValidationIssues[0] ?? "")
      ) {
        const supplementalValidationIssues = getSupplementalWorkedExampleTokenValidationIssues(
          concept.slug,
          workedExample,
          workedExampleValidationState,
        );

        if (supplementalValidationIssues) {
          workedExampleValidationIssues = supplementalValidationIssues;
        }
      }

      const skipBuilderValidation =
        workedExampleValidationIssues.length === 1 &&
        isMissingWorkedExampleBuilderIssue(workedExampleValidationIssues[0] ?? "") &&
        isStaticWorkedExample(workedExample);

      for (const issue of skipBuilderValidation ? [] : workedExampleValidationIssues) {
        throw new Error(issue);
      }

      const applyAction = workedExample.applyAction;
      if (!applyAction) {
        continue;
      }

      if (applyAction.presetId && !presetIds.has(applyAction.presetId)) {
        throw new Error(
          `Concept "${concept.slug}" workedExamples item "${workedExample.id}" references missing applyAction presetId "${applyAction.presetId}".`,
        );
      }

      for (const patchKey of Object.keys(applyAction.patch ?? {})) {
        if (!controlParams.has(patchKey)) {
          throw new Error(
            `Concept "${concept.slug}" workedExamples item "${workedExample.id}" patches unknown applyAction control param "${patchKey}".`,
          );
        }
      }

      for (const controlParam of applyAction.highlightedControlIds ?? []) {
        if (!controlParams.has(controlParam)) {
          throw new Error(
            `Concept "${concept.slug}" workedExamples item "${workedExample.id}" highlights unknown applyAction control "${controlParam}".`,
          );
        }
      }

      for (const graphId of applyAction.highlightedGraphIds ?? []) {
        if (!graphIds.has(graphId)) {
          throw new Error(
            `Concept "${concept.slug}" workedExamples item "${workedExample.id}" highlights unknown applyAction graph "${graphId}".`,
          );
        }
      }

      for (const overlayId of applyAction.highlightedOverlayIds ?? []) {
        if (!overlayIds.has(overlayId)) {
          throw new Error(
            `Concept "${concept.slug}" workedExamples item "${workedExample.id}" highlights unknown applyAction overlay "${overlayId}".`,
          );
        }
      }
    }

    for (const question of concept.quickTest.questions) {
      if (quickTestQuestionIds.has(question.id)) {
        throw new Error(
          `Concept "${concept.slug}" contains duplicate quickTest question id "${question.id}".`,
        );
      }

      quickTestQuestionIds.add(question.id);

      ensureUniqueStrings(
        question.choices.map((choice) => choice.id),
        (duplicateValue) =>
          `Concept "${concept.slug}" quickTest question "${question.id}" contains duplicate choice id "${duplicateValue}".`,
      );

      const choiceIds = new Set(question.choices.map((choice) => choice.id));

      if (!choiceIds.has(question.correctChoiceId)) {
        throw new Error(
          `Concept "${concept.slug}" quickTest question "${question.id}" references missing correctChoiceId "${question.correctChoiceId}".`,
        );
      }

      for (const choiceId of Object.keys(question.selectedWrongExplanations ?? {})) {
        if (!choiceIds.has(choiceId)) {
          throw new Error(
            `Concept "${concept.slug}" quickTest question "${question.id}" references unknown selectedWrongExplanation choice "${choiceId}".`,
          );
        }

        if (choiceId === question.correctChoiceId) {
          throw new Error(
            `Concept "${concept.slug}" quickTest question "${question.id}" cannot assign selectedWrongExplanation to correct choice "${choiceId}".`,
          );
        }
      }

      const showMeAction = question.showMeAction;
      if (!showMeAction) {
        continue;
      }

      if (showMeAction.presetId && !presetIds.has(showMeAction.presetId)) {
        throw new Error(
          `Concept "${concept.slug}" quickTest question "${question.id}" references missing showMeAction presetId "${showMeAction.presetId}".`,
        );
      }

      for (const patchKey of Object.keys(showMeAction.patch ?? {})) {
        if (!controlParams.has(patchKey)) {
          throw new Error(
            `Concept "${concept.slug}" quickTest question "${question.id}" patches unknown showMeAction control param "${patchKey}".`,
          );
        }
      }

      for (const controlParam of showMeAction.highlightedControlIds ?? []) {
        if (!controlParams.has(controlParam)) {
          throw new Error(
            `Concept "${concept.slug}" quickTest question "${question.id}" highlights unknown showMeAction control "${controlParam}".`,
          );
        }
      }

      for (const graphId of showMeAction.highlightedGraphIds ?? []) {
        if (!graphIds.has(graphId)) {
          throw new Error(
            `Concept "${concept.slug}" quickTest question "${question.id}" highlights unknown showMeAction graph "${graphId}".`,
          );
        }
      }

      for (const overlayId of showMeAction.highlightedOverlayIds ?? []) {
        if (!overlayIds.has(overlayId)) {
          throw new Error(
            `Concept "${concept.slug}" quickTest question "${question.id}" highlights unknown showMeAction overlay "${overlayId}".`,
          );
        }
      }
    }

    for (const template of concept.quickTest.templates ?? []) {
      if (
        template.kind === "worked-example-result" &&
        !workedExampleIds.has(template.exampleId)
      ) {
        throw new Error(
          `Concept "${concept.slug}" quickTest template "${template.id}" references missing worked example "${template.exampleId}".`,
        );
      }
    }

    const quizDefinition = resolveConceptQuizDefinition(concept);

    if (
      quizDefinition.mode === "static" &&
      quizDefinition.staticQuestions.length < quizDefinition.questionCount
    ) {
      throw new Error(
        `Concept "${concept.slug}" quickTest mode "static" only authors ${quizDefinition.staticQuestions.length} questions, but ${quizDefinition.questionCount} are required.`,
      );
    }

    if (quizDefinition.mode !== "static" && quizDefinition.templates.length === 0) {
      throw new Error(
        `Concept "${concept.slug}" quickTest mode "${quizDefinition.mode}" requires at least one generated template.`,
      );
    }

    try {
      const quizSession = buildConceptQuizSession(concept, {
        seed: `validation:${concept.slug}`,
        locale: "en",
      });

      if (quizSession.questions.length < quizDefinition.questionCount) {
        throw new Error(
          `built ${quizSession.questions.length} questions instead of ${quizDefinition.questionCount}`,
        );
      }

      const fallbackQuestions = quizSession.questions.filter(
        (question) => question.generationSource === "fallback-misconception",
      );
      const quizFallbackPolicy = options.quizFallbackPolicy ?? "published-only";
      const shouldEnforceNoQuizFallback =
        quizFallbackPolicy === "all" ||
        (quizFallbackPolicy === "published-only" && concept.published);

      // Author-preview and other includeUnpublished flows share this validator.
      // Keep fallback as a hard error for shipped concepts while letting draft
      // content remain inspectable until authors replace fallback-backed slots.
      if (shouldEnforceNoQuizFallback && fallbackQuestions.length > 0) {
        throw new Error(
          `built ${fallbackQuestions.length} fallback-backed quiz question(s). Add concept-specific authored questions or templates instead of relying on fallback generation.`,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "unknown quiz generation failure";

      throw new Error(
        `Concept "${concept.slug}" quickTest cannot build a valid quiz session: ${message}.`,
      );
    }

    for (const item of concept.predictionMode.items) {
      if (predictionItemIds.has(item.id)) {
        throw new Error(
          `Concept "${concept.slug}" contains duplicate predictionMode item id "${item.id}".`,
        );
      }

      predictionItemIds.add(item.id);

      ensureUniqueStrings(
        item.choices.map((choice) => choice.id),
        (duplicateValue) =>
          `Concept "${concept.slug}" predictionMode item "${item.id}" contains duplicate choice id "${duplicateValue}".`,
      );

      const choiceIds = new Set(item.choices.map((choice) => choice.id));

      if (!choiceIds.has(item.correctChoiceId)) {
        throw new Error(
          `Concept "${concept.slug}" predictionMode item "${item.id}" references missing correctChoiceId "${item.correctChoiceId}".`,
        );
      }

      const appliedPresetId = item.apply.presetId ?? item.applyPresetId;
      const appliedPatch = item.apply.patch ?? item.applyPatch;

      if (appliedPresetId && !presetIds.has(appliedPresetId)) {
        throw new Error(
          `Concept "${concept.slug}" predictionMode item "${item.id}" references missing presetId "${appliedPresetId}".`,
        );
      }

      for (const patchKey of Object.keys(appliedPatch ?? {})) {
        if (!controlParams.has(patchKey)) {
          throw new Error(
            `Concept "${concept.slug}" predictionMode item "${item.id}" patches unknown control param "${patchKey}".`,
          );
        }
      }

      for (const controlParam of item.highlightedControls ?? []) {
        if (!controlParams.has(controlParam)) {
          throw new Error(
            `Concept "${concept.slug}" predictionMode item "${item.id}" highlights unknown control param "${controlParam}".`,
          );
        }
      }

      for (const graphId of item.highlightedGraphs ?? []) {
        if (!graphIds.has(graphId)) {
          throw new Error(
            `Concept "${concept.slug}" predictionMode item "${item.id}" highlights unknown graph "${graphId}".`,
          );
        }
      }

      for (const overlayId of item.highlightedOverlays ?? []) {
        if (!overlayIds.has(overlayId)) {
          throw new Error(
            `Concept "${concept.slug}" predictionMode item "${item.id}" highlights unknown overlay "${overlayId}".`,
          );
        }
      }
    }

    if (concept.challengeMode) {
      for (const item of concept.challengeMode.items) {
        if (challengeItemIds.has(item.id)) {
          throw new Error(
            `Concept "${concept.slug}" contains duplicate challengeMode item id "${item.id}".`,
          );
        }

        challengeItemIds.add(item.id);

        const setup = item.setup;

        if (setup?.presetId && !presetIds.has(setup.presetId)) {
          throw new Error(
            `Concept "${concept.slug}" challengeMode item "${item.id}" references missing setup presetId "${setup.presetId}".`,
          );
        }

        for (const patchKey of Object.keys(setup?.patch ?? {})) {
          if (!controlParams.has(patchKey)) {
            throw new Error(
              `Concept "${concept.slug}" challengeMode item "${item.id}" patches unknown setup control param "${patchKey}".`,
            );
          }
        }

        if (setup?.graphId && !graphIds.has(setup.graphId)) {
          throw new Error(
            `Concept "${concept.slug}" challengeMode item "${item.id}" references unknown setup graph "${setup.graphId}".`,
          );
        }

        for (const overlayId of setup?.overlayIds ?? []) {
          if (!overlayIds.has(overlayId)) {
            throw new Error(
              `Concept "${concept.slug}" challengeMode item "${item.id}" references unknown setup overlay "${overlayId}".`,
            );
          }
        }

        const usesCompareSpecificChecks = item.checks.some(
          (check) =>
            check.type === "compare-param-range" || check.type === "compare-metric-range",
        );
        const declaresCompareActivation =
          setup?.interactionMode === "compare" ||
          item.checks.some((check) => check.type === "compare-active");

        if (usesCompareSpecificChecks && !declaresCompareActivation) {
          throw new Error(
            `Concept "${concept.slug}" challengeMode item "${item.id}" uses compare-specific checks without entering compare mode through setup.interactionMode or a compare-active check.`,
          );
        }

        for (const check of item.checks) {
          switch (check.type) {
            case "param-range":
              if (!controlParams.has(check.param)) {
                throw new Error(
                  `Concept "${concept.slug}" challengeMode item "${item.id}" references unknown param-range control "${check.param}".`,
                );
              }
              break;
            case "metric-range":
              if (!supportsChallengeMetric(concept.simulation.kind, check.metric)) {
                throw new Error(
                  `Concept "${concept.slug}" challengeMode item "${item.id}" references unsupported metric "${check.metric}" for simulation kind "${concept.simulation.kind}".`,
                );
              }
              break;
            case "compare-metric-range":
              if (!supportsChallengeMetric(concept.simulation.kind, check.metric)) {
                throw new Error(
                  `Concept "${concept.slug}" challengeMode item "${item.id}" references unsupported compare metric "${check.metric}" for simulation kind "${concept.simulation.kind}".`,
                );
              }
              break;
            case "graph-active":
              if (!graphIds.has(check.graphId)) {
                throw new Error(
                  `Concept "${concept.slug}" challengeMode item "${item.id}" references unknown graph "${check.graphId}".`,
                );
              }
              break;
            case "overlay-active":
              if (!overlayIds.has(check.overlayId)) {
                throw new Error(
                  `Concept "${concept.slug}" challengeMode item "${item.id}" references unknown overlay "${check.overlayId}".`,
                );
              }
              break;
            case "compare-param-range":
              if (!controlParams.has(check.param)) {
                throw new Error(
                  `Concept "${concept.slug}" challengeMode item "${item.id}" references unknown compare control "${check.param}".`,
                );
              }
              break;
            case "time-source":
            case "time-range":
            case "compare-active":
              break;
            default:
              check satisfies never;
          }
        }
      }
    }
  }

  return metadataEntries.map((metadata) => conceptMaps.bySlug.get(metadata.slug) as ConceptContent);
}

function loadConceptsFromSource(): ConceptContent[] {
  const metadataEntries = getAllConceptMetadata();
  const concepts = metadataEntries.map((metadata) =>
    normalizeConceptRecord(metadata, readConceptContentFile(metadata.contentFile)),
  );

  return validateConceptBundle(concepts, metadataEntries);
}

function getCachedConceptRecords(): ConceptContent[] {
  if (!cachedConceptRecords || !cachedConceptMap || !cachedConceptIdMap) {
    cachedConceptRecords = loadConceptsFromSource();
    const maps = buildConceptMaps(cachedConceptRecords);
    cachedConceptMap = maps.bySlug;
    cachedConceptIdMap = maps.byId;
  }

  return cachedConceptRecords;
}

function getPublishedConceptRecords(): ConceptContent[] {
  const publishedSlugs = new Set(getPublishedConceptMetadata().map((entry) => entry.slug));
  return getCachedConceptRecords().filter((concept) => publishedSlugs.has(concept.slug));
}

export function getConceptRegistryIndex(): ConceptRegistry {
  return getCachedRegistry();
}

export function getConceptRegistry(): ConceptMetadata[] {
  return getCachedRegistry().all;
}

export function getPublishedConceptMetadata(): ConceptMetadata[] {
  return getCachedRegistry().published;
}

export function getAllConceptMetadata(): ConceptMetadata[] {
  return getConceptRegistry();
}

export function getConceptMetadataBySlug(
  slug: string,
  options?: { includeUnpublished?: boolean },
): ConceptMetadata {
  const registry = getCachedRegistry();
  const canonicalSlug = resolveCanonicalConceptSlug(registry, slug);
  const metadata = canonicalSlug ? registry.bySlug.get(canonicalSlug) : undefined;

  if (!metadata || (!options?.includeUnpublished && !metadata.published)) {
    throw new Error(`Unknown concept slug: ${slug}`);
  }

  return metadata;
}

export function getConceptMetadataById(
  id: string,
  options?: { includeUnpublished?: boolean },
): ConceptMetadata {
  const metadata = getCachedRegistry().byId.get(id as ConceptId);

  if (!metadata || (!options?.includeUnpublished && !metadata.published)) {
    throw new Error(`Unknown concept id: ${id}`);
  }

  return metadata;
}

export function getAllConcepts(options?: { includeUnpublished?: boolean }): ConceptContent[] {
  if (options?.includeUnpublished) {
    return getCachedConceptRecords();
  }

  return getPublishedConceptRecords();
}

export function getConceptBySlug(
  slug: string,
  options?: { includeUnpublished?: boolean },
): ConceptContent {
  const canonicalSlug = getConceptMetadataBySlug(slug, options).slug;
  const concept = (cachedConceptMap ?? buildConceptMaps(getCachedConceptRecords()).bySlug).get(
    canonicalSlug,
  );

  if (!concept || (!options?.includeUnpublished && !concept.published)) {
    throw new Error(`Unknown concept slug: ${slug}`);
  }

  return concept;
}

export function getConceptById(
  id: string,
  options?: { includeUnpublished?: boolean },
): ConceptContent {
  const concept = (cachedConceptIdMap ?? buildConceptMaps(getCachedConceptRecords()).byId).get(
    id as ConceptId,
  );

  if (!concept || (!options?.includeUnpublished && !concept.published)) {
    throw new Error(`Unknown concept id: ${id}`);
  }

  return concept;
}

export function getConceptsByTopic(
  topic: string,
  options?: { includeUnpublished?: boolean },
): ConceptMetadata[] {
  const registry = getCachedRegistry();

  if (options?.includeUnpublished) {
    return registry.all.filter((entry) => entry.topic === topic);
  }

  return registry.byTopic.get(topic) ?? [];
}

export function getConceptsBySubtopic(
  topic: string,
  subtopic: string,
  options?: { includeUnpublished?: boolean },
): ConceptMetadata[] {
  const key = buildConceptKey(topic, subtopic);
  const registry = getCachedRegistry();

  if (options?.includeUnpublished) {
    return registry.all.filter(
      (entry) => entry.topic === topic && entry.subtopic === subtopic,
    );
  }

  return registry.bySubtopic.get(key) ?? [];
}

export function getConceptTopics(options?: { includeUnpublished?: boolean }): string[] {
  const registry = getCachedRegistry();

  if (options?.includeUnpublished) {
    return Array.from(new Set(registry.all.map((entry) => entry.topic)));
  }

  return registry.topics;
}

export function getConceptSubjects(options?: { includeUnpublished?: boolean }): string[] {
  const registry = getCachedRegistry();

  if (options?.includeUnpublished) {
    return Array.from(new Set(registry.all.map((entry) => entry.subject)));
  }

  return registry.subjects;
}

export function getConceptSummaries(): ConceptSummary[] {
  return getPublishedConceptMetadata().map((metadata) => ({
    id: metadata.id,
    slug: metadata.slug,
    title: metadata.title,
    shortTitle: metadata.shortTitle,
    summary: metadata.summary,
    subject: metadata.subject,
    topic: metadata.topic,
    subtopic: metadata.subtopic,
    difficulty: metadata.difficulty,
    sequence: metadata.sequence,
    status: metadata.status,
    estimatedStudyMinutes: metadata.estimatedStudyMinutes,
    heroConcept: metadata.heroConcept,
    accent: metadata.accent,
    highlights: metadata.highlights,
  }));
}

export function getConceptSlugs(options?: { includeAliases?: boolean }): ConceptSlug[] {
  return getPublishedConceptMetadata().flatMap((entry) =>
    options?.includeAliases ? [entry.slug, ...(entry.aliases ?? [])] : [entry.slug],
  ) as ConceptSlug[];
}

export function getConceptCatalogMetrics() {
  const registry = getCachedRegistry();

  return {
    totalConcepts: registry.published.length,
    totalSubjects: registry.subjects.length,
    totalTopics: registry.topics.length,
    totalFeaturedConcepts: registry.published.filter((entry) => entry.heroConcept).length,
    estimatedStudyMinutes: registry.published.reduce(
      (sum, entry) => sum + (entry.estimatedStudyMinutes ?? 0),
      0,
    ),
  };
}

export function getConceptLastModified(slug: string): Date {
  const metadata = getConceptMetadataBySlug(slug, { includeUnpublished: true });
  return getConceptContentLastModified(metadata.contentFile);
}

export function getConceptFilePath(slug: string): string {
  const metadata = getConceptMetadataBySlug(slug, { includeUnpublished: true });
  return getConceptContentFilePath(metadata.contentFile);
}

export function getConceptCatalogFilePath(): string {
  return getCatalogFilePath("concepts");
}
