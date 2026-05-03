"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import type { AppLocale } from "@/i18n/routing";
import type {
  ConceptQuickTestShowMeAction,
  ConceptWorkedExampleAction,
  ReadNextRecommendation,
} from "@/lib/content";
import type { ConceptLearningPhaseId } from "@/lib/content/concept-learning-phases";
import type { SavedCompareSetupRecord } from "@/lib/account/compare-setups";
import { ChallengeModePanel } from "@/components/concepts/ChallengeModePanel";
import { RichMathText } from "@/components/concepts/MathFormula";
import { getCompareSetupLabel } from "@/lib/i18n/copy-text";
import { resolveNoticePrompts } from "@/lib/learning/noticePrompts";
import type { LiveWorkedExampleState } from "@/lib/learning/liveWorkedExamples";
import {
  recordCompareModeUsed,
  recordConceptInteraction,
  recordPredictionModeUsed,
} from "@/lib/progress";
import type { ProgressSnapshot } from "@/lib/progress";
import {
  buildConceptSimulationStateHref,
  conceptShareAnchorIds,
  DEFAULT_COMPARE_SETUP_LABELS,
  resolveConceptSimulationState,
  type ResolvedConceptSimulationState,
  type ShareableConceptCompareState,
  type ShareableConceptSimulationState,
} from "@/lib/share-links";
import {
  buildDerivativeSlopeSeries,
  buildDynamicEquilibriumSeries,
  buildGraphTransformationsSeries,
  buildRationalFunctionsSeries,
  buildMatrixTransformationsSeries,
  buildExponentialChangeSeries,
  buildIntegralAccumulationSeries,
  buildLimitsContinuitySeries,
  buildOptimizationConstraintsSeries,
  buildComplexNumbersPlaneSeries,
  buildUnitCircleRotationSeries,
  buildPolarCoordinatesSeries,
  buildParametricCurvesMotionSeries,
  buildSortingTradeoffsSeries,
  buildBinarySearchHalvingSeries,
  buildGraphTraversalSeries,
  buildSolubilitySaturationSeries,
  buildBuffersNeutralizationSeries,
  buildConcentrationDilutionSeries,
  buildStoichiometryRecipeSeries,
  buildAcidBasePhSeries,
  buildReactionRateCollisionTheorySeries,
  BEATS_MAX_AMPLITUDE,
  BASIC_CIRCUITS_MAX_RESISTANCE,
  BASIC_CIRCUITS_MAX_VOLTAGE,
  BASIC_CIRCUITS_MIN_RESISTANCE,
  buildBasicCircuitsSeries,
  buildBeatsSeries,
  buildDampingSeries,
  buildElectricFieldsSeries,
  buildGravitationalFieldsSeries,
  buildGravitationalPotentialSeries,
  buildCircularOrbitsSeries,
  buildEscapeVelocitySeries,
  buildElectricPotentialSeries,
  buildCapacitanceElectricEnergySeries,
  buildElectromagneticInductionSeries,
  buildMaxwellEquationsSynthesisSeries,
  buildElectromagneticWavesSeries,
  buildLightSpectrumLinkageSeries,
  buildDispersionRefractiveIndexColorSeries,
  buildPolarizationSeries,
  buildDiffractionSeries,
  buildOpticalResolutionSeries,
  buildDoubleSlitInterferenceSeries,
  buildPhotoelectricEffectSeries,
  buildAtomicSpectraSeries,
  buildDeBroglieMatterWavesSeries,
  buildBohrModelSeries,
  buildRadioactivityHalfLifeSeries,
  buildMagneticForceSeries,
  buildMagneticFieldsSeries,
  buildLensImagingSeries,
  buildCollisionsSeries,
  buildConservationMomentumSeries,
  buildDopplerEffectSeries,
  buildEquivalentResistanceSeries,
  buildInternalResistanceTerminalVoltageSeries,
  buildMomentumImpulseSeries,
  buildMirrorsSeries,
  buildRcChargingDischargingSeries,
  buildSoundWavesLongitudinalSeries,
  buildPowerEnergyCircuitsSeries,
  buildIdealGasLawKineticTheorySeries,
  buildPressureHydrostaticSeries,
  buildContinuityEquationSeries,
  buildBernoulliPrincipleSeries,
  buildBuoyancyArchimedesSeries,
  buildDragTerminalVelocitySeries,
  buildTemperatureInternalEnergySeries,
  buildHeatTransferSeries,
  buildSpecificHeatPhaseChangeSeries,
  buildProjectileSeries,
  buildRefractionSnellsLawSeries,
  buildRollingMotionSeries,
  buildSeriesParallelCircuitsSeries,
  buildShmSeries,
  buildAngularMomentumSeries,
  buildRotationalInertiaSeries,
  buildStaticEquilibriumCentreOfMassSeries,
  buildStandingWavesSeries,
  buildTorqueSeries,
  buildUcmSeries,
  buildVectorsComponentsSeries,
  buildDotProductProjectionSeries,
  buildVectors2DSeries,
  buildWaveSpeedWavelengthSeries,
  buildWaveInterferenceSeries,
  clampProjectileTime,
  clampVectorsComponentsTime,
  type ConceptSimulationSource,
  type ControlValue,
  describeBasicCircuitsState,
  describeBeatsState,
  describeDampingState,
  describeElectricFieldsState,
  describeGravitationalFieldsState,
  describeGravitationalPotentialState,
  describeGraphTransformationsState,
  describeRationalFunctionsState,
  describeMatrixTransformationsState,
  describeExponentialChangeState,
  describeLimitsContinuityState,
  describeOptimizationConstraintsState,
  describeCircularOrbitsState,
  describeEscapeVelocityState,
  describeElectricPotentialState,
  describeCapacitanceElectricEnergyState,
  describeElectromagneticInductionState,
  describeMaxwellEquationsSynthesisState,
  describeElectromagneticWavesState,
  describeLightSpectrumLinkageState,
  describeDispersionRefractiveIndexColorState,
  describePolarizationState,
  describeDiffractionState,
  describeOpticalResolutionState,
  describeDoubleSlitInterferenceState,
  describePhotoelectricEffectState,
  describeAtomicSpectraState,
  describeDeBroglieMatterWavesState,
  describeBohrModelState,
  describeRadioactivityHalfLifeState,
  describeMagneticForceState,
  describeMagneticFieldsState,
  describeLensImagingState,
  describeCollisionsState,
  describeConservationMomentumState,
  describeDopplerEffectState,
  describeDerivativeSlopeState,
  describeDynamicEquilibriumState,
  describeIntegralAccumulationState,
  describeComplexNumbersPlaneState,
  describeUnitCircleRotationState,
  describePolarCoordinatesState,
  describeParametricCurvesMotionState,
  describeSortingTradeoffsState,
  describeBinarySearchHalvingState,
  describeGraphTraversalState,
  describeSolubilitySaturationState,
  describeBuffersNeutralizationState,
  describeConcentrationDilutionState,
  describeStoichiometryRecipeState,
  describeAcidBasePhState,
  describeEquivalentResistanceState,
  describeInternalResistanceTerminalVoltageState,
  describeMomentumImpulseState,
  describeMirrorsState,
  describeRcChargingDischargingState,
  describeSoundWavesLongitudinalState,
  describePowerEnergyCircuitsState,
  describeIdealGasLawKineticTheoryState,
  describePressureHydrostaticState,
  describeContinuityEquationState,
  describeBernoulliPrincipleState,
  describeBuoyancyArchimedesState,
  describeDragTerminalVelocityState,
  describeTemperatureInternalEnergyState,
  describeHeatTransferState,
  describeSpecificHeatPhaseChangeState,
  describeProjectileState,
  describeReactionRateCollisionTheoryState,
  describeRefractionSnellsLawState,
  describeRollingMotionState,
  describeSeriesParallelCircuitsState,
  describeShmState,
  describeAngularMomentumState,
  describeRotationalInertiaState,
  describeStaticEquilibriumCentreOfMassState,
  describeStandingWavesState,
  describeTorqueState,
  describeAirColumnResonanceState,
  describeUcmState,
  describeVectorsComponentsState,
  describeDotProductProjectionState,
  describeVectors2DState,
  describeWaveSpeedWavelengthState,
  describeWaveInterferenceState,
  formatDisplayText,
  formatNumber,
  type GraphPreviewSample,
  type GraphSeriesSetupId,
  type GraphStagePreview,
  type GraphSeries,
  type GraphSeriesMap,
  type PredictionModeApi,
  DOPPLER_EFFECT_MAX_OBSERVER_SPEED,
  DOPPLER_EFFECT_MAX_SOURCE_SPEED,
  DOPPLER_EFFECT_MIN_OBSERVER_SPEED,
  DOPPLER_EFFECT_MIN_SOURCE_FREQUENCY,
  DOPPLER_EFFECT_WAVE_SPEED,
  DERIVATIVE_SLOPE_DELTA_MAX,
  DERIVATIVE_SLOPE_DELTA_MIN,
  DERIVATIVE_SLOPE_DOMAIN_MAX,
  RATIONAL_FUNCTIONS_DISTANCE_MAX,
  RATIONAL_FUNCTIONS_DISTANCE_MIN,
  OPTIMIZATION_CONSTRAINTS_WIDTH_MAX,
  OPTIMIZATION_CONSTRAINTS_WIDTH_MIN,
  LIMITS_CONTINUITY_DISTANCE_MAX,
  LIMITS_CONTINUITY_DISTANCE_MIN,
  DYNAMIC_EQUILIBRIUM_PRODUCT_FAVOR_MAX,
  DYNAMIC_EQUILIBRIUM_PRODUCT_FAVOR_MIN,
  DYNAMIC_EQUILIBRIUM_TOTAL_TIME,
  INTEGRAL_ACCUMULATION_DOMAIN_MAX,
  INTEGRAL_ACCUMULATION_DOMAIN_MIN,
  ELECTRIC_FIELDS_STAGE_MAX_X,
  ELECTRIC_FIELDS_STAGE_MIN_X,
  GRAVITATIONAL_FIELDS_STAGE_MAX_X,
  GRAVITATIONAL_FIELDS_STAGE_MIN_X,
  GRAVITATIONAL_POTENTIAL_STAGE_MAX_X,
  GRAVITATIONAL_POTENTIAL_STAGE_MIN_X,
  ELECTRIC_POTENTIAL_STAGE_MAX_X,
  ELECTRIC_POTENTIAL_STAGE_MIN_X,
  CAPACITANCE_ELECTRIC_ENERGY_MAX_VOLTAGE,
  CAPACITANCE_ELECTRIC_ENERGY_MIN_VOLTAGE,
  ELECTROMAGNETIC_INDUCTION_TOTAL_TIME,
  ELECTROMAGNETIC_WAVES_MAGNETIC_DISPLAY_SCALE,
  ELECTROMAGNETIC_WAVES_STAGE_LENGTH,
  DISPERSION_MAX_WAVELENGTH_NM,
  DISPERSION_MIN_WAVELENGTH_NM,
  LIGHT_SPECTRUM_MAGNETIC_DISPLAY_SCALE,
  LIGHT_SPECTRUM_STAGE_WINDOW,
  POLARIZATION_MAX_ANGLE,
  DIFFRACTION_SCREEN_HALF_HEIGHT,
  COMPLEX_NUMBERS_PLANE_COMPONENT_MAX,
  COMPLEX_NUMBERS_PLANE_COMPONENT_MIN,
  EXPONENTIAL_CHANGE_TIME_MAX,
  resolveExponentialChangeViewport,
  UNIT_CIRCLE_ROTATION_TIME_MAX,
  POLAR_COORDINATES_ANGLE_MAX,
  POLAR_COORDINATES_ANGLE_MIN,
  resolveSortingTradeoffsDuration,
  resolveBinarySearchHalvingDuration,
  resolveGraphTraversalDuration,
  SOLUBILITY_SATURATION_SOLUTE_MAX,
  SOLUBILITY_SATURATION_SOLUTE_MIN,
  SOLUBILITY_SATURATION_VOLUME_MAX,
  SOLUBILITY_SATURATION_VOLUME_MIN,
  SOLUBILITY_SATURATION_LIMIT_MAX,
  SOLUBILITY_SATURATION_LIMIT_MIN,
  BUFFERS_NEUTRALIZATION_AMOUNT_MAX,
  BUFFERS_NEUTRALIZATION_AMOUNT_MIN,
  BUFFERS_NEUTRALIZATION_BUFFER_MAX,
  BUFFERS_NEUTRALIZATION_BUFFER_MIN,
  CONCENTRATION_DILUTION_SOLUTE_MAX,
  CONCENTRATION_DILUTION_SOLUTE_MIN,
  CONCENTRATION_DILUTION_VOLUME_MAX,
  CONCENTRATION_DILUTION_VOLUME_MIN,
  STOICHIOMETRY_RECIPE_AMOUNT_MAX,
  STOICHIOMETRY_RECIPE_AMOUNT_MIN,
  STOICHIOMETRY_RECIPE_YIELD_PERCENT_MAX,
  STOICHIOMETRY_RECIPE_YIELD_PERCENT_MIN,
  OPTICAL_RESOLUTION_IMAGE_HALF_HEIGHT_UM,
  DOUBLE_SLIT_INTERFERENCE_SCREEN_HALF_HEIGHT,
  ATOMIC_SPECTRA_SPECTRUM_MAX_NM,
  ATOMIC_SPECTRA_SPECTRUM_MIN_NM,
  ATOMIC_SPECTRA_TIME_WINDOW,
  BOHR_MODEL_SPECTRUM_MAX_NM,
  BOHR_MODEL_SPECTRUM_MIN_NM,
  BOHR_MODEL_TIME_WINDOW,
  resolveRadioactivityHalfLifeMaxTime,
  DE_BROGLIE_MAX_FIT_COUNT,
  DE_BROGLIE_MAX_MOMENTUM_SCALED,
  DE_BROGLIE_MIN_MOMENTUM_SCALED,
  PHOTOELECTRIC_EFFECT_MAX_COLLECTOR_VOLTAGE,
  PHOTOELECTRIC_EFFECT_MAX_FREQUENCY_PHz,
  PHOTOELECTRIC_EFFECT_MAX_INTENSITY,
  PHOTOELECTRIC_EFFECT_MIN_COLLECTOR_VOLTAGE,
  PHOTOELECTRIC_EFFECT_MIN_FREQUENCY_PHz,
  PHOTOELECTRIC_EFFECT_TIME_WINDOW,
  resolveMagneticForceDuration,
  resolveMagneticForceViewport,
  MAGNETIC_FIELDS_STAGE_MAX_X,
  MAGNETIC_FIELDS_STAGE_MIN_X,
  LENS_IMAGING_IMAGE_DISTANCE_PLOT_LIMIT,
  LENS_IMAGING_MAGNIFICATION_PLOT_LIMIT,
  LENS_IMAGING_MAX_OBJECT_DISTANCE,
  LENS_IMAGING_MIN_OBJECT_DISTANCE,
  CONSERVATION_MOMENTUM_TOTAL_TIME,
  COLLISIONS_TOTAL_TIME,
  EQUIVALENT_RESISTANCE_MAX_RESISTANCE,
  EQUIVALENT_RESISTANCE_MAX_TIME,
  EQUIVALENT_RESISTANCE_MIN_RESISTANCE,
  INTERNAL_SOURCE_MAX_LOAD_RESISTANCE,
  INTERNAL_SOURCE_MIN_LOAD_RESISTANCE,
  RC_CHARGING_MAX_TIME,
  resolveRcChargingDischargingDuration,
  MIRRORS_IMAGE_DISTANCE_PLOT_LIMIT,
  MIRRORS_MAGNIFICATION_PLOT_LIMIT,
  MIRRORS_MAX_OBJECT_DISTANCE,
  MIRRORS_MIN_OBJECT_DISTANCE,
  MOMENTUM_IMPULSE_TOTAL_TIME,
  POWER_ENERGY_CIRCUITS_MAX_RESISTANCE,
  POWER_ENERGY_CIRCUITS_MAX_TIME,
  POWER_ENERGY_CIRCUITS_MAX_VOLTAGE,
  POWER_ENERGY_CIRCUITS_MIN_RESISTANCE,
  IDEAL_GAS_KINETIC_MAX_PARTICLE_COUNT,
  IDEAL_GAS_KINETIC_MAX_TEMPERATURE,
  IDEAL_GAS_KINETIC_MAX_VOLUME,
  IDEAL_GAS_KINETIC_MIN_PARTICLE_COUNT,
  IDEAL_GAS_KINETIC_MIN_TEMPERATURE,
  IDEAL_GAS_KINETIC_MIN_VOLUME,
  PARAMETRIC_CURVES_TIME_MAX,
  ACID_BASE_AMOUNT_MAX,
  ACID_BASE_AMOUNT_MIN,
  PRESSURE_HYDROSTATIC_MAX_AREA,
  PRESSURE_HYDROSTATIC_MAX_DEPTH,
  PRESSURE_HYDROSTATIC_MAX_DENSITY,
  PRESSURE_HYDROSTATIC_MAX_FORCE,
  PRESSURE_HYDROSTATIC_MIN_AREA,
  PRESSURE_HYDROSTATIC_MIN_DEPTH,
  PRESSURE_HYDROSTATIC_MIN_DENSITY,
  PRESSURE_HYDROSTATIC_MIN_FORCE,
  REACTION_RATE_CONCENTRATION_MAX,
  REACTION_RATE_CONCENTRATION_MIN,
  REACTION_RATE_TEMPERATURE_MAX,
  REACTION_RATE_TEMPERATURE_MIN,
  REACTION_RATE_TOTAL_TIME,
  CONTINUITY_EQUATION_MAX_FLOW_RATE,
  CONTINUITY_EQUATION_MAX_TIME,
  CONTINUITY_EQUATION_MIN_ENTRY_AREA,
  CONTINUITY_EQUATION_MIN_FLOW_RATE,
  CONTINUITY_EQUATION_MIN_MIDDLE_AREA,
  CONTINUITY_EQUATION_MAX_ENTRY_AREA,
  CONTINUITY_EQUATION_MAX_MIDDLE_AREA,
  BERNOULLI_PRINCIPLE_MAX_FLOW_RATE,
  BERNOULLI_PRINCIPLE_MAX_THROAT_AREA,
  BERNOULLI_PRINCIPLE_MAX_THROAT_HEIGHT,
  BERNOULLI_PRINCIPLE_MAX_TIME,
  BERNOULLI_PRINCIPLE_MIN_FLOW_RATE,
  BERNOULLI_PRINCIPLE_MIN_THROAT_AREA,
  BERNOULLI_PRINCIPLE_MIN_THROAT_HEIGHT,
  BUOYANCY_ARCHIMEDES_MAX_BOTTOM_DEPTH,
  BUOYANCY_ARCHIMEDES_MAX_FLUID_DENSITY,
  BUOYANCY_ARCHIMEDES_MAX_OBJECT_DENSITY,
  BUOYANCY_ARCHIMEDES_MIN_BOTTOM_DEPTH,
  BUOYANCY_ARCHIMEDES_MIN_FLUID_DENSITY,
  BUOYANCY_ARCHIMEDES_MIN_OBJECT_DENSITY,
  DRAG_TERMINAL_VELOCITY_MAX_AREA,
  DRAG_TERMINAL_VELOCITY_MAX_DRAG_STRENGTH,
  DRAG_TERMINAL_VELOCITY_MAX_MASS,
  DRAG_TERMINAL_VELOCITY_MAX_TIME,
  DRAG_TERMINAL_VELOCITY_MIN_AREA,
  DRAG_TERMINAL_VELOCITY_MIN_DRAG_STRENGTH,
  DRAG_TERMINAL_VELOCITY_MIN_MASS,
  TEMPERATURE_INTERNAL_ENERGY_MAX_PARTICLE_COUNT,
  TEMPERATURE_INTERNAL_ENERGY_MAX_TIME,
  TEMPERATURE_INTERNAL_ENERGY_MIN_PARTICLE_COUNT,
  ANGULAR_MOMENTUM_TOTAL_TIME,
  ROTATIONAL_INERTIA_TOTAL_TIME,
  STATIC_EQUILIBRIUM_MAX_CARGO_POSITION,
  STATIC_EQUILIBRIUM_MAX_SUPPORT_CENTER,
  STATIC_EQUILIBRIUM_MIN_CARGO_POSITION,
  STATIC_EQUILIBRIUM_MIN_SUPPORT_CENTER,
  TORQUE_TOTAL_TIME,
  resolveRollingMotionDuration,
  HEAT_TRANSFER_MAX_CONTACT_QUALITY,
  HEAT_TRANSFER_MAX_TIME,
  HEAT_TRANSFER_MIN_CONTACT_QUALITY,
  SPECIFIC_HEAT_PHASE_CHANGE_MAX_LATENT_HEAT,
  SPECIFIC_HEAT_PHASE_CHANGE_MAX_SPECIFIC_HEAT,
  SPECIFIC_HEAT_PHASE_CHANGE_MAX_TIME,
  SPECIFIC_HEAT_PHASE_CHANGE_MIN_LATENT_HEAT,
  SPECIFIC_HEAT_PHASE_CHANGE_MIN_SPECIFIC_HEAT,
  REFRACTION_MAX_INCIDENT_ANGLE,
  SERIES_PARALLEL_CIRCUITS_MAX_RESISTANCE,
  SERIES_PARALLEL_CIRCUITS_MAX_TIME,
  SERIES_PARALLEL_CIRCUITS_MIN_RESISTANCE,
  resolveConservationMomentumExtents,
  resolveCollisionsExtents,
  resolveMomentumImpulseExtents,
  resolveProjectileParams,
  resolveProjectileViewport,
  resolveAngularFrequency,
  resolveSpringConstant,
  resolveVectorsComponentsViewport,
  sampleProjectileState,
  sampleShmState,
  sampleVectorsComponentsState,
  resolveSimulationUiHints,
  buildAirColumnResonanceSeries,
  AIR_COLUMN_MAX_LENGTH,
  AIR_COLUMN_MAX_RESONANCE_ORDER,
  AIR_COLUMN_MIN_LENGTH,
  STANDING_WAVES_MIN_LENGTH,
  STANDING_WAVES_MAX_LENGTH,
  SOUND_WAVES_LONGITUDINAL_MAX_AMPLITUDE,
  SOUND_WAVES_LONGITUDINAL_MIN_AMPLITUDE,
  type SimulationKind,
  DOT_PRODUCT_PROJECTION_RESPONSE_MAX_ANGLE,
  DOT_PRODUCT_PROJECTION_RESPONSE_MIN_ANGLE,
  MATRIX_TRANSFORMATIONS_BLEND_MAX,
  MATRIX_TRANSFORMATIONS_BLEND_MIN,
  VECTORS_COMPONENTS_DURATION,
  VECTORS_2D_SCALAR_MAX,
  VECTORS_2D_SCALAR_MIN,
  WAVE_SPEED_WAVELENGTH_MIN_WAVELENGTH,
  WAVE_SPEED_WAVELENGTH_STAGE_LENGTH,
  WAVE_INTERFERENCE_SCREEN_HALF_HEIGHT,
} from "@/lib/physics";
import { useAnimationClock } from "@/hooks/useAnimationClock";
import { useSimulationControls } from "@/hooks/useSimulationControls";
import { CompactModeTabs } from "@/components/concepts/CompactModeTabs";
import { EquationBenchStrip, EquationDetails, EquationPanel } from "@/components/concepts/EquationPanel";
import { GuidedOverlayPanel } from "@/components/concepts/GuidedOverlayPanel";
import { PredictionModePanel } from "@/components/concepts/PredictionModePanel";
import { SavedCompareSetupsCard } from "@/components/concepts/SavedCompareSetupsCard";
import {
  getConceptPageBenchSupportTargetId,
  useConceptPagePhase,
} from "@/components/concepts/ConceptPagePhaseContext";
import { WhatToNoticePanel } from "@/components/concepts/WhatToNoticePanel";
import { useConceptAchievementTracker } from "@/components/concepts/ConceptAchievementTracker";
import { useConceptLearningBridge } from "@/components/concepts/ConceptLearningBridge";
import { GraphTabs, LineGraph, type LineGraphLinkedMarker } from "@/components/graphs";
import { ControlPanel } from "./ControlPanel";
import { SimulationShell } from "./SimulationShell";
import { TimeControlRail } from "./TimeControlRail";

type ConceptRuntimeTranslator = (
  key: string,
  values?: Record<string, unknown>,
) => string;

const BasicCircuitsSimulation = dynamic(() =>
  import("./BasicCircuitsSimulation").then((module) => module.BasicCircuitsSimulation),
);

const BeatsSimulation = dynamic(() =>
  import("./BeatsSimulation").then((module) => module.BeatsSimulation),
);

const DampingResonanceSimulation = dynamic(() =>
  import("./DampingResonanceSimulation").then((module) => module.DampingResonanceSimulation),
);

const DerivativeSlopeSimulation = dynamic(() =>
  import("./DerivativeSlopeSimulation").then((module) => module.DerivativeSlopeSimulation),
);

const DynamicEquilibriumSimulation = dynamic(() =>
  import("./DynamicEquilibriumSimulation").then((module) => module.DynamicEquilibriumSimulation),
);

const OptimizationConstraintsSimulation = dynamic(() =>
  import("./OptimizationConstraintsSimulation").then((module) => module.OptimizationConstraintsSimulation),
);

const ElectricFieldsSimulation = dynamic(() =>
  import("./ElectricFieldsSimulation").then((module) => module.ElectricFieldsSimulation),
);

const GravitationalFieldsSimulation = dynamic(() =>
  import("./GravitationalFieldsSimulation").then((module) => module.GravitationalFieldsSimulation),
);

const GravitationalPotentialSimulation = dynamic(() =>
  import("./GravitationalPotentialSimulation").then((module) => module.GravitationalPotentialSimulation),
);

const GraphTransformationsSimulation = dynamic(() =>
  import("./GraphTransformationsSimulation").then((module) => module.GraphTransformationsSimulation),
);

const RationalFunctionsSimulation = dynamic(() =>
  import("./RationalFunctionsSimulation").then((module) => module.RationalFunctionsSimulation),
);

const ExponentialChangeSimulation = dynamic(() =>
  import("./ExponentialChangeSimulation").then((module) => module.ExponentialChangeSimulation),
);

const IntegralAccumulationSimulation = dynamic(() =>
  import("./IntegralAccumulationSimulation").then((module) => module.IntegralAccumulationSimulation),
);

const LimitsContinuitySimulation = dynamic(() =>
  import("./LimitsContinuitySimulation").then((module) => module.LimitsContinuitySimulation),
);

const ComplexNumbersPlaneSimulation = dynamic(() =>
  import("./ComplexNumbersPlaneSimulation").then((module) => module.ComplexNumbersPlaneSimulation),
);

const UnitCircleRotationSimulation = dynamic(() =>
  import("./UnitCircleRotationSimulation").then((module) => module.UnitCircleRotationSimulation),
);

const PolarCoordinatesSimulation = dynamic(() =>
  import("./PolarCoordinatesSimulation").then((module) => module.PolarCoordinatesSimulation),
);

const ParametricCurvesMotionSimulation = dynamic(() =>
  import("./ParametricCurvesMotionSimulation").then((module) => module.ParametricCurvesMotionSimulation),
);

const SortingTradeoffsSimulation = dynamic(() =>
  import("./SortingTradeoffsSimulation").then((module) => module.SortingTradeoffsSimulation),
);

const BinarySearchHalvingSimulation = dynamic(() =>
  import("./BinarySearchHalvingSimulation").then((module) => module.BinarySearchHalvingSimulation),
);

const GraphTraversalSimulation = dynamic(() =>
  import("./GraphTraversalSimulation").then((module) => module.GraphTraversalSimulation),
);

const SolubilitySaturationSimulation = dynamic(() =>
  import("./SolubilitySaturationSimulation").then((module) => module.SolubilitySaturationSimulation),
);

const BuffersNeutralizationSimulation = dynamic(() =>
  import("./BuffersNeutralizationSimulation").then((module) => module.BuffersNeutralizationSimulation),
);

const ConcentrationDilutionSimulation = dynamic(() =>
  import("./ConcentrationDilutionSimulation").then((module) => module.ConcentrationDilutionSimulation),
);

const StoichiometryRecipeSimulation = dynamic(() =>
  import("./StoichiometryRecipeSimulation").then((module) => module.StoichiometryRecipeSimulation),
);

const AcidBasePhSimulation = dynamic(() =>
  import("./AcidBasePhSimulation").then((module) => module.AcidBasePhSimulation),
);

const CircularOrbitsSimulation = dynamic(() =>
  import("./CircularOrbitsSimulation").then((module) => module.CircularOrbitsSimulation),
);

const EscapeVelocitySimulation = dynamic(() =>
  import("./EscapeVelocitySimulation").then((module) => module.EscapeVelocitySimulation),
);

const ElectricPotentialSimulation = dynamic(() =>
  import("./ElectricPotentialSimulation").then((module) => module.ElectricPotentialSimulation),
);

const CapacitanceElectricEnergySimulation = dynamic(() =>
  import("./CapacitanceElectricEnergySimulation").then(
    (module) => module.CapacitanceElectricEnergySimulation,
  ),
);

const RcChargingDischargingSimulation = dynamic(() =>
  import("./RcChargingDischargingSimulation").then(
    (module) => module.RcChargingDischargingSimulation,
  ),
);

const InternalResistanceTerminalVoltageSimulation = dynamic(() =>
  import("./InternalResistanceTerminalVoltageSimulation").then(
    (module) => module.InternalResistanceTerminalVoltageSimulation,
  ),
);

const ElectromagneticInductionSimulation = dynamic(() =>
  import("./ElectromagneticInductionSimulation").then((module) => module.ElectromagneticInductionSimulation),
);

const MaxwellEquationsSynthesisSimulation = dynamic(() =>
  import("./MaxwellEquationsSynthesisSimulation").then((module) => module.MaxwellEquationsSynthesisSimulation),
);

const ElectromagneticWavesSimulation = dynamic(() =>
  import("./ElectromagneticWavesSimulation").then((module) => module.ElectromagneticWavesSimulation),
);

const LightSpectrumLinkageSimulation = dynamic(() =>
  import("./LightSpectrumLinkageSimulation").then((module) => module.LightSpectrumLinkageSimulation),
);

const DispersionRefractiveIndexColorSimulation = dynamic(() =>
  import("./DispersionRefractiveIndexColorSimulation").then((module) => module.DispersionRefractiveIndexColorSimulation),
);

const PolarizationSimulation = dynamic(() =>
  import("./PolarizationSimulation").then((module) => module.PolarizationSimulation),
);

const DiffractionSimulation = dynamic(() =>
  import("./DiffractionSimulation").then((module) => module.DiffractionSimulation),
);

const OpticalResolutionSimulation = dynamic(() =>
  import("./OpticalResolutionSimulation").then((module) => module.OpticalResolutionSimulation),
);

const DoubleSlitInterferenceSimulation = dynamic(() =>
  import("./DoubleSlitInterferenceSimulation").then((module) => module.DoubleSlitInterferenceSimulation),
);

const PhotoelectricEffectSimulation = dynamic(() =>
  import("./PhotoelectricEffectSimulation").then((module) => module.PhotoelectricEffectSimulation),
);

const AtomicSpectraSimulation = dynamic(() =>
  import("./AtomicSpectraSimulation").then((module) => module.AtomicSpectraSimulation),
);

const DeBroglieMatterWavesSimulation = dynamic(() =>
  import("./DeBroglieMatterWavesSimulation").then((module) => module.DeBroglieMatterWavesSimulation),
);

const BohrModelSimulation = dynamic(() =>
  import("./BohrModelSimulation").then((module) => module.BohrModelSimulation),
);

const RadioactivityHalfLifeSimulation = dynamic(() =>
  import("./RadioactivityHalfLifeSimulation").then((module) => module.RadioactivityHalfLifeSimulation),
);

const MagneticForceSimulation = dynamic(() =>
  import("./MagneticForceSimulation").then((module) => module.MagneticForceSimulation),
);

const MagneticFieldsSimulation = dynamic(() =>
  import("./MagneticFieldsSimulation").then((module) => module.MagneticFieldsSimulation),
);

const EquivalentResistanceSimulation = dynamic(() =>
  import("./EquivalentResistanceSimulation").then((module) => module.EquivalentResistanceSimulation),
);

const CollisionsSimulation = dynamic(() =>
  import("./CollisionsSimulation").then((module) => module.CollisionsSimulation),
);

const ConservationMomentumSimulation = dynamic(() =>
  import("./ConservationMomentumSimulation").then((module) => module.ConservationMomentumSimulation),
);

const DopplerEffectSimulation = dynamic(() =>
  import("./DopplerEffectSimulation").then((module) => module.DopplerEffectSimulation),
);

const LensImagingSimulation = dynamic(() =>
  import("./LensImagingSimulation").then((module) => module.LensImagingSimulation),
);

const MomentumImpulseSimulation = dynamic(() =>
  import("./MomentumImpulseSimulation").then((module) => module.MomentumImpulseSimulation),
);

const MirrorsSimulation = dynamic(() =>
  import("./MirrorsSimulation").then((module) => module.MirrorsSimulation),
);

const PowerEnergyCircuitsSimulation = dynamic(() =>
  import("./PowerEnergyCircuitsSimulation").then((module) => module.PowerEnergyCircuitsSimulation),
);

const ProjectileSimulation = dynamic(() =>
  import("./ProjectileSimulation").then((module) => module.ProjectileSimulation),
);

const ReactionRateCollisionTheorySimulation = dynamic(() =>
  import("./ReactionRateCollisionTheorySimulation").then((module) => module.ReactionRateCollisionTheorySimulation),
);

const RefractionSnellsLawSimulation = dynamic(() =>
  import("./RefractionSnellsLawSimulation").then((module) => module.RefractionSnellsLawSimulation),
);

const SeriesParallelCircuitsSimulation = dynamic(() =>
  import("./SeriesParallelCircuitsSimulation").then((module) => module.SeriesParallelCircuitsSimulation),
);

const SHMSimulation = dynamic(() =>
  import("./SHMSimulation").then((module) => module.SHMSimulation),
);

const SoundWavesLongitudinalSimulation = dynamic(() =>
  import("./SoundWavesLongitudinalSimulation").then((module) => module.SoundWavesLongitudinalSimulation),
);

const StandingWavesSimulation = dynamic(() =>
  import("./StandingWavesSimulation").then((module) => module.StandingWavesSimulation),
);

const AirColumnResonanceSimulation = dynamic(() =>
  import("./AirColumnResonanceSimulation").then((module) => module.AirColumnResonanceSimulation),
);

const IdealGasLawKineticTheorySimulation = dynamic(() =>
  import("./IdealGasLawKineticTheorySimulation").then((module) => module.IdealGasLawKineticTheorySimulation),
);

const PressureHydrostaticSimulation = dynamic(() =>
  import("./PressureHydrostaticSimulation").then((module) => module.PressureHydrostaticSimulation),
);

const ContinuityEquationSimulation = dynamic(() =>
  import("./ContinuityEquationSimulation").then((module) => module.ContinuityEquationSimulation),
);

const BernoulliPrincipleSimulation = dynamic(() =>
  import("./BernoulliPrincipleSimulation").then((module) => module.BernoulliPrincipleSimulation),
);

const BuoyancyArchimedesSimulation = dynamic(() =>
  import("./BuoyancyArchimedesSimulation").then((module) => module.BuoyancyArchimedesSimulation),
);

const DragTerminalVelocitySimulation = dynamic(() =>
  import("./DragTerminalVelocitySimulation").then((module) => module.DragTerminalVelocitySimulation),
);

const TemperatureInternalEnergySimulation = dynamic(() =>
  import("./TemperatureInternalEnergySimulation").then((module) => module.TemperatureInternalEnergySimulation),
);

const HeatTransferSimulation = dynamic(() =>
  import("./HeatTransferSimulation").then((module) => module.HeatTransferSimulation),
);

const SpecificHeatPhaseChangeSimulation = dynamic(() =>
  import("./SpecificHeatPhaseChangeSimulation").then((module) => module.SpecificHeatPhaseChangeSimulation),
);

const AngularMomentumSimulation = dynamic(() =>
  import("./AngularMomentumSimulation").then((module) => module.AngularMomentumSimulation),
);

const RollingMotionSimulation = dynamic(() =>
  import("./RollingMotionSimulation").then((module) => module.RollingMotionSimulation),
);

const RotationalInertiaSimulation = dynamic(() =>
  import("./RotationalInertiaSimulation").then((module) => module.RotationalInertiaSimulation),
);

const StaticEquilibriumCentreOfMassSimulation = dynamic(() =>
  import("./StaticEquilibriumCentreOfMassSimulation").then((module) => module.StaticEquilibriumCentreOfMassSimulation),
);

const TorqueSimulation = dynamic(() =>
  import("./TorqueSimulation").then((module) => module.TorqueSimulation),
);

const UCMSimulation = dynamic(() =>
  import("./UCMSimulation").then((module) => module.UCMSimulation),
);

const VectorsComponentsSimulation = dynamic(() =>
  import("./VectorsComponentsSimulation").then((module) => module.VectorsComponentsSimulation),
);

const DotProductProjectionSimulation = dynamic(() =>
  import("./DotProductProjectionSimulation").then((module) => module.DotProductProjectionSimulation),
);

const MatrixTransformationsSimulation = dynamic(() =>
  import("./MatrixTransformationsSimulation").then((module) => module.MatrixTransformationsSimulation),
);

const Vectors2DSimulation = dynamic(() =>
  import("./Vectors2DSimulation").then((module) => module.Vectors2DSimulation),
);

const WaveSpeedWavelengthSimulation = dynamic(() =>
  import("./WaveSpeedWavelengthSimulation").then((module) => module.WaveSpeedWavelengthSimulation),
);

const WaveInterferenceSimulation = dynamic(() =>
  import("./WaveInterferenceSimulation").then((module) => module.WaveInterferenceSimulation),
);


export type ConceptSimulationRendererProps = {
  concept: ConceptSimulationSource;
  readNext?: ReadNextRecommendation[];
  className?: string;
  initialSyncedSnapshot?: ProgressSnapshot | null;
  initialChallengeItemId?: string | null;
  initialSimulationState?: ResolvedConceptSimulationState | null;
  starterGuidePlacement?: "inline" | "external";
  afterBench?: ReactNode;
};

type InteractionMode = "explore" | "compare";
type CompareTarget = "a" | "b";
type SimulationParams = Record<string, ControlValue>;

type CompareSetup = {
  label: string;
  params: SimulationParams;
  activePresetId: string | null;
};

type CompareState = {
  activeTarget: CompareTarget;
  setupA: CompareSetup;
  setupB: CompareSetup;
};

type CompareSceneState = {
  activeTarget: CompareTarget;
  setupA: SimulationParams;
  setupB: SimulationParams;
  labelA?: string;
  labelB?: string;
};

type TimeDomain = {
  max: number;
  step: number;
};

type QuickTestFocusState = {
  actionLabel?: string;
  highlightedControlIds: string[];
  highlightedGraphIds: string[];
  highlightedOverlayIds: string[];
};

type GraphInteractionKind = "time" | "trajectory" | "response";
type GraphBoundsConfig = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  xTicks?: number;
  yTicks?: number;
};

const SCALE_BUCKETS = [0.5, 1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];

type ModuleRuntime = {
  buildSeries: (params: SimulationParams, locale?: AppLocale) => GraphSeriesMap;
  describeState: (params: SimulationParams, time: number, locale?: AppLocale) => string;
  renderScene: (props: {
    concept: ConceptSimulationSource;
    params: SimulationParams;
    time: number;
    setParam: (param: string, value: number | boolean | string) => void;
    overlayValues?: Record<string, boolean>;
    focusedOverlayId?: string | null;
    compare?: CompareSceneState;
    graphPreview?: GraphStagePreview | null;
  }) => ReactNode;
};

const modules: Record<SimulationKind, ModuleRuntime> = {
  "reaction-rate-collision-theory": {
    buildSeries: (params, locale) =>
      buildReactionRateCollisionTheorySeries({
        temperature: Number(params.temperature ?? 3.1),
        concentration: Number(params.concentration ?? 1.4),
        activationEnergy: Number(params.activationEnergy ?? 2.8),
        catalyst: params.catalyst === true,
      }, locale),
    describeState: (params, _time, locale) =>
      describeReactionRateCollisionTheoryState({
        temperature: Number(params.temperature ?? 3.1),
        concentration: Number(params.concentration ?? 1.4),
        activationEnergy: Number(params.activationEnergy ?? 2.8),
        catalyst: params.catalyst === true,
      }, locale),
    renderScene: (props) => <ReactionRateCollisionTheorySimulation {...props} />,
  },
  "dynamic-equilibrium": {
    buildSeries: (params, locale) =>
      buildDynamicEquilibriumSeries({
        reactantAmount: Number(params.reactantAmount ?? 14),
        productAmount: Number(params.productAmount ?? 4),
        productFavor: Number(params.productFavor ?? 1.12),
      }, locale),
    describeState: (params, time, locale) =>
      describeDynamicEquilibriumState(
        {
          reactantAmount: Number(params.reactantAmount ?? 14),
          productAmount: Number(params.productAmount ?? 4),
          productFavor: Number(params.productFavor ?? 1.12),
        },
        time,
        locale,
      ),
    renderScene: (props) => <DynamicEquilibriumSimulation {...props} />,
  },
  "graph-transformations": {
    buildSeries: (params) =>
      buildGraphTransformationsSeries({
        horizontalShift: Number(params.horizontalShift ?? 0),
        verticalShift: Number(params.verticalShift ?? 0),
        verticalScale: Number(params.verticalScale ?? 1),
        mirrorY: params.mirrorY === true,
      }),
    describeState: (params) =>
      describeGraphTransformationsState({
        horizontalShift: Number(params.horizontalShift ?? 0),
        verticalShift: Number(params.verticalShift ?? 0),
        verticalScale: Number(params.verticalScale ?? 1),
        mirrorY: params.mirrorY === true,
      }),
    renderScene: (props) => <GraphTransformationsSimulation {...props} />,
  },
  "rational-functions": {
    buildSeries: (params) =>
      buildRationalFunctionsSeries({
        asymptoteX: Number(params.asymptoteX ?? 1),
        horizontalAsymptoteY: Number(params.horizontalAsymptoteY ?? -1),
        branchScale: Number(params.branchScale ?? 2),
        sampleDistance: Number(params.sampleDistance ?? 0.65),
        showHole: params.showHole === true,
        holeX: Number(params.holeX ?? -1.2),
      }),
    describeState: (params) =>
      describeRationalFunctionsState({
        asymptoteX: Number(params.asymptoteX ?? 1),
        horizontalAsymptoteY: Number(params.horizontalAsymptoteY ?? -1),
        branchScale: Number(params.branchScale ?? 2),
        sampleDistance: Number(params.sampleDistance ?? 0.65),
        showHole: params.showHole === true,
        holeX: Number(params.holeX ?? -1.2),
      }),
    renderScene: (props) => <RationalFunctionsSimulation {...props} />,
  },
  "matrix-transformations": {
    buildSeries: (params) =>
      buildMatrixTransformationsSeries({
        m11: Number(params.m11 ?? 1.2),
        m12: Number(params.m12 ?? 0.4),
        m21: Number(params.m21 ?? 0),
        m22: Number(params.m22 ?? 1),
      }),
    describeState: (params) =>
      describeMatrixTransformationsState({
        m11: Number(params.m11 ?? 1.2),
        m12: Number(params.m12 ?? 0.4),
        m21: Number(params.m21 ?? 0),
        m22: Number(params.m22 ?? 1),
      }),
    renderScene: (props) => <MatrixTransformationsSimulation {...props} />,
  },
  "exponential-change": {
    buildSeries: (params) =>
      buildExponentialChangeSeries({
        initialValue: Number(params.initialValue ?? 3),
        rate: Number(params.rate ?? 0.25),
        targetValue: Number(params.targetValue ?? 12),
      }),
    describeState: (params) =>
      describeExponentialChangeState({
        initialValue: Number(params.initialValue ?? 3),
        rate: Number(params.rate ?? 0.25),
        targetValue: Number(params.targetValue ?? 12),
      }),
    renderScene: (props) => <ExponentialChangeSimulation {...props} />,
  },
  "derivative-as-slope": {
    buildSeries: (params) =>
      buildDerivativeSlopeSeries({
        pointX: Number(params.pointX ?? -1.2),
        deltaX: Number(params.deltaX ?? 0.8),
        showSecant: params.showSecant !== false,
      }),
    describeState: (params) =>
      describeDerivativeSlopeState({
        pointX: Number(params.pointX ?? -1.2),
        deltaX: Number(params.deltaX ?? 0.8),
        showSecant: params.showSecant !== false,
    }),
    renderScene: (props) => <DerivativeSlopeSimulation {...props} />,
  },
  "optimization-constraints": {
    buildSeries: (params) =>
      buildOptimizationConstraintsSeries({
        width: Number(params.width ?? 3.4),
      }),
    describeState: (params) =>
      describeOptimizationConstraintsState({
        width: Number(params.width ?? 3.4),
      }),
    renderScene: (props) => <OptimizationConstraintsSimulation {...props} />,
  },
  "limits-continuity": {
    buildSeries: (params) =>
      buildLimitsContinuitySeries({
        caseIndex: Number(params.caseIndex ?? 0),
        approachDistance: Number(params.approachDistance ?? 0.6),
      }),
    describeState: (params) =>
      describeLimitsContinuityState({
        caseIndex: Number(params.caseIndex ?? 0),
        approachDistance: Number(params.approachDistance ?? 0.6),
      }),
    renderScene: (props) => <LimitsContinuitySimulation {...props} />,
  },
  "integral-accumulation": {
    buildSeries: (params) =>
      buildIntegralAccumulationSeries({
        upperBound: Number(params.upperBound ?? 1.6),
      }),
    describeState: (params) =>
      describeIntegralAccumulationState({
        upperBound: Number(params.upperBound ?? 1.6),
      }),
    renderScene: (props) => <IntegralAccumulationSimulation {...props} />,
  },
  "complex-numbers-plane": {
    buildSeries: (params) =>
      buildComplexNumbersPlaneSeries({
        realPart: Number(params.realPart ?? 2.2),
        imaginaryPart: Number(params.imaginaryPart ?? 1.6),
        operandReal: Number(params.operandReal ?? 1.1),
        operandImaginary: Number(params.operandImaginary ?? 1.8),
        multiplyMode: params.multiplyMode === true,
      }),
    describeState: (params, _time, locale) =>
      describeComplexNumbersPlaneState({
        realPart: Number(params.realPart ?? 2.2),
        imaginaryPart: Number(params.imaginaryPart ?? 1.6),
        operandReal: Number(params.operandReal ?? 1.1),
        operandImaginary: Number(params.operandImaginary ?? 1.8),
        multiplyMode: params.multiplyMode === true,
      }, locale),
    renderScene: (props) => <ComplexNumbersPlaneSimulation {...props} />,
  },
  "unit-circle-rotation": {
    buildSeries: (params) =>
      buildUnitCircleRotationSeries({
        angularSpeed: Number(params.angularSpeed ?? params.omega ?? 1),
        omega: Number(params.omega ?? params.angularSpeed ?? 1),
        phase: Number(params.phase ?? 0.18),
      }),
    describeState: (params, time) =>
      describeUnitCircleRotationState(
        {
          angularSpeed: Number(params.angularSpeed ?? params.omega ?? 1),
          omega: Number(params.omega ?? params.angularSpeed ?? 1),
          phase: Number(params.phase ?? 0.18),
        },
        time,
      ),
    renderScene: (props) => <UnitCircleRotationSimulation {...props} />,
  },
  "polar-coordinates": {
    buildSeries: (params, locale) =>
      buildPolarCoordinatesSeries({
        radius: Number(params.radius ?? 3.2),
        angleDeg: Number(params.angleDeg ?? 55),
      }, locale),
    describeState: (params, _time, locale) =>
      describePolarCoordinatesState({
        radius: Number(params.radius ?? 3.2),
        angleDeg: Number(params.angleDeg ?? 55),
      }, locale),
    renderScene: (props) => <PolarCoordinatesSimulation {...props} />,
  },
  "parametric-curves-motion": {
    buildSeries: (params) =>
      buildParametricCurvesMotionSeries({
        xAmplitude: Number(params.xAmplitude ?? 3.2),
        yAmplitude: Number(params.yAmplitude ?? 2.4),
        xFrequency: Number(params.xFrequency ?? 1),
        yFrequency: Number(params.yFrequency ?? 2),
        phaseShiftDeg: Number(params.phaseShiftDeg ?? 0),
      }),
    describeState: (params, time) =>
      describeParametricCurvesMotionState(
        {
          xAmplitude: Number(params.xAmplitude ?? 3.2),
          yAmplitude: Number(params.yAmplitude ?? 2.4),
          xFrequency: Number(params.xFrequency ?? 1),
          yFrequency: Number(params.yFrequency ?? 2),
          phaseShiftDeg: Number(params.phaseShiftDeg ?? 0),
        },
        time,
    ),
    renderScene: (props) => <ParametricCurvesMotionSimulation {...props} />,
  },
  "sorting-algorithmic-trade-offs": {
    buildSeries: (params) =>
      buildSortingTradeoffsSeries({
        algorithmIndex: Number(params.algorithmIndex ?? 0),
        patternIndex: Number(params.patternIndex ?? 0),
        arraySize: Number(params.arraySize ?? 9),
      }),
    describeState: (params, time) =>
      describeSortingTradeoffsState(
        {
          algorithmIndex: Number(params.algorithmIndex ?? 0),
          patternIndex: Number(params.patternIndex ?? 0),
          arraySize: Number(params.arraySize ?? 9),
        },
        time,
      ),
    renderScene: (props) => <SortingTradeoffsSimulation {...props} />,
  },
  "binary-search-halving": {
    buildSeries: (params) =>
      buildBinarySearchHalvingSeries({
        arraySize: Number(params.arraySize ?? 14),
        targetIndex: Number(params.targetIndex ?? 7),
        linearContrast: params.linearContrast !== false,
      }),
    describeState: (params, time) =>
      describeBinarySearchHalvingState(
        {
          arraySize: Number(params.arraySize ?? 14),
          targetIndex: Number(params.targetIndex ?? 7),
          linearContrast: params.linearContrast !== false,
        },
        time,
    ),
    renderScene: (props) => <BinarySearchHalvingSimulation {...props} />,
  },
  "graph-traversal": {
    buildSeries: (params, locale) =>
      buildGraphTraversalSeries({
        graphIndex: Number(params.graphIndex ?? 0),
        startNodeIndex: Number(params.startNodeIndex ?? 0),
        targetNodeIndex: Number(params.targetNodeIndex ?? 7),
        traversalMode: Number(params.traversalMode ?? 0),
      }, locale),
    describeState: (params, time, locale) =>
      describeGraphTraversalState(
        {
          graphIndex: Number(params.graphIndex ?? 0),
          startNodeIndex: Number(params.startNodeIndex ?? 0),
          targetNodeIndex: Number(params.targetNodeIndex ?? 7),
          traversalMode: Number(params.traversalMode ?? 0),
        },
        time,
        locale,
      ),
    renderScene: (props) => <GraphTraversalSimulation {...props} />,
  },
  "solubility-saturation": {
    buildSeries: (params, locale) =>
      buildSolubilitySaturationSeries({
        soluteAmount: Number(params.soluteAmount ?? 8.4),
        solventVolume: Number(params.solventVolume ?? 1.4),
        solubilityLimit: Number(params.solubilityLimit ?? 5.6),
      }, locale),
    describeState: (params, _time, locale) =>
      describeSolubilitySaturationState({
        soluteAmount: Number(params.soluteAmount ?? 8.4),
        solventVolume: Number(params.solventVolume ?? 1.4),
        solubilityLimit: Number(params.solubilityLimit ?? 5.6),
      }, locale),
    renderScene: (props) => <SolubilitySaturationSimulation {...props} />,
  },
  "buffers-neutralization": {
    buildSeries: (params) =>
      buildBuffersNeutralizationSeries({
        acidAmount: Number(params.acidAmount ?? 5.8),
        baseAmount: Number(params.baseAmount ?? 4.6),
        bufferAmount: Number(params.bufferAmount ?? 2.4),
        waterVolume: Number(params.waterVolume ?? 1.4),
      }),
    describeState: (params) =>
      describeBuffersNeutralizationState({
        acidAmount: Number(params.acidAmount ?? 5.8),
        baseAmount: Number(params.baseAmount ?? 4.6),
        bufferAmount: Number(params.bufferAmount ?? 2.4),
        waterVolume: Number(params.waterVolume ?? 1.4),
      }),
    renderScene: (props) => <BuffersNeutralizationSimulation {...props} />,
  },
  "concentration-dilution": {
    buildSeries: (params) =>
      buildConcentrationDilutionSeries({
        soluteAmount: Number(params.soluteAmount ?? 8),
        solventVolume: Number(params.solventVolume ?? 1.4),
      }),
    describeState: (params) =>
      describeConcentrationDilutionState({
        soluteAmount: Number(params.soluteAmount ?? 8),
        solventVolume: Number(params.solventVolume ?? 1.4),
      }),
    renderScene: (props) => <ConcentrationDilutionSimulation {...props} />,
  },
  "stoichiometry-recipe": {
    buildSeries: (params, locale) =>
      buildStoichiometryRecipeSeries({
        reactantAAmount: Number(params.reactantAAmount ?? 10),
        reactantBAmount: Number(params.reactantBAmount ?? 15),
        recipeA: Number(params.recipeA ?? 2),
        recipeB: Number(params.recipeB ?? 3),
        percentYield: Number(params.percentYield ?? 100),
      }, locale),
    describeState: (params, _time, locale) =>
      describeStoichiometryRecipeState({
        reactantAAmount: Number(params.reactantAAmount ?? 10),
        reactantBAmount: Number(params.reactantBAmount ?? 15),
        recipeA: Number(params.recipeA ?? 2),
        recipeB: Number(params.recipeB ?? 3),
        percentYield: Number(params.percentYield ?? 100),
      }, locale),
    renderScene: (props) => <StoichiometryRecipeSimulation {...props} />,
  },
  "acid-base-ph": {
    buildSeries: (params) =>
      buildAcidBasePhSeries({
        acidAmount: Number(params.acidAmount ?? 4.2),
        baseAmount: Number(params.baseAmount ?? 3.1),
        waterVolume: Number(params.waterVolume ?? 1.4),
      }),
    describeState: (params, _time, locale) =>
      describeAcidBasePhState({
        acidAmount: Number(params.acidAmount ?? 4.2),
        baseAmount: Number(params.baseAmount ?? 3.1),
        waterVolume: Number(params.waterVolume ?? 1.4),
      }, locale),
    renderScene: (props) => <AcidBasePhSimulation {...props} />,
  },
  shm: {
    buildSeries: (params) => {
      const angularFrequency = readNumericParam(params, "omega", "angularFrequency");

      return buildShmSeries({
        amplitude: Number(params.amplitude ?? 1),
        angularFrequency,
        springConstant: Number(params.springConstant ?? 0),
        mass: Number(params.mass ?? 1),
        phase: Number(params.phase ?? 0),
        equilibriumShift: Number(params.equilibriumShift ?? 0),
        damping: Number(params.damping ?? 0),
      });
    },
    describeState: (params, time) => {
      const angularFrequency = readNumericParam(params, "omega", "angularFrequency");

      return describeShmState(
        {
          amplitude: Number(params.amplitude ?? 1),
          angularFrequency,
          springConstant: Number(params.springConstant ?? 0),
          mass: Number(params.mass ?? 1),
          phase: Number(params.phase ?? 0),
          equilibriumShift: Number(params.equilibriumShift ?? 0),
          damping: Number(params.damping ?? 0),
        },
        time,
      );
    },
    renderScene: (props) => <SHMSimulation {...props} />,
  },
  ucm: {
    buildSeries: (params) =>
      buildUcmSeries({
        radius: Number(params.radius ?? 1),
        omega: Number(params.omega ?? params.angularSpeed ?? 1),
        phase: Number(params.phase ?? 0),
      }),
    describeState: (params, time) =>
      describeUcmState(
        {
          radius: Number(params.radius ?? 1),
          omega: Number(params.omega ?? params.angularSpeed ?? 1),
          phase: Number(params.phase ?? 0),
        },
        time,
      ),
    renderScene: (props) => <UCMSimulation {...props} />,
  },
  "damping-resonance": {
    buildSeries: (params) =>
      buildDampingSeries({
        naturalFrequency: Number(params.naturalFrequency ?? 1),
        drivingFrequency: Number(params.driveFrequency ?? params.drivingFrequency ?? 1),
        damping: Number(params.dampingRatio ?? params.damping ?? 0.2),
        driveAmplitude: Number(params.driveAmplitude ?? 1),
        resonanceMode: Boolean(params.responseMode ?? params.resonanceMode),
        phase: Number(params.phase ?? 0),
      }),
    describeState: (params, time) =>
      describeDampingState(
        {
          naturalFrequency: Number(params.naturalFrequency ?? 1),
          drivingFrequency: Number(params.driveFrequency ?? params.drivingFrequency ?? 1),
          damping: Number(params.dampingRatio ?? params.damping ?? 0.2),
          driveAmplitude: Number(params.driveAmplitude ?? 1),
          resonanceMode: Boolean(params.responseMode ?? params.resonanceMode),
          phase: Number(params.phase ?? 0),
        },
        time,
      ),
    renderScene: (props) => <DampingResonanceSimulation {...props} />,
  },
  projectile: {
    buildSeries: (params) =>
      buildProjectileSeries({
        launchSpeed: Number(params.speed ?? params.launchSpeed ?? 12),
        launchAngle: Number(params.angle ?? params.launchAngle ?? 45),
        gravity: Number(params.gravity ?? 9.81),
        launchHeight: Number(params.launchHeight ?? 0),
      }),
    describeState: (params, time) =>
      describeProjectileState(
        {
          launchSpeed: Number(params.speed ?? params.launchSpeed ?? 12),
          launchAngle: Number(params.angle ?? params.launchAngle ?? 45),
          gravity: Number(params.gravity ?? 9.81),
          launchHeight: Number(params.launchHeight ?? 0),
        },
        time,
      ),
    renderScene: (props) => <ProjectileSimulation {...props} />,
  },
  "vectors-components": {
    buildSeries: (params) =>
      buildVectorsComponentsSeries({
        magnitude: Number(params.magnitude ?? 8),
        angle: Number(params.angle ?? 35),
      }),
    describeState: (params, time) =>
      describeVectorsComponentsState(
        {
          magnitude: Number(params.magnitude ?? 8),
          angle: Number(params.angle ?? 35),
        },
        time,
      ),
      renderScene: (props) => <VectorsComponentsSimulation {...props} />,
    },
  "dot-product-projection": {
      buildSeries: (params) =>
        buildDotProductProjectionSeries({
          ax: Number(params.ax ?? 4),
          ay: Number(params.ay ?? 1.5),
          bx: Number(params.bx ?? 3),
          by: Number(params.by ?? 2.5),
        }),
      describeState: (params) =>
        describeDotProductProjectionState({
          ax: Number(params.ax ?? 4),
          ay: Number(params.ay ?? 1.5),
          bx: Number(params.bx ?? 3),
          by: Number(params.by ?? 2.5),
        }),
      renderScene: (props) => <DotProductProjectionSimulation {...props} />,
    },
  "vectors-2d": {
    buildSeries: (params) =>
      buildVectors2DSeries({
        ax: Number(params.ax ?? 3),
        ay: Number(params.ay ?? 2),
        bx: Number(params.bx ?? 1.5),
        by: Number(params.by ?? 3),
        scalar: Number(params.scalar ?? 1),
        subtractMode: params.subtractMode === true,
      }),
    describeState: (params) =>
      describeVectors2DState({
        ax: Number(params.ax ?? 3),
        ay: Number(params.ay ?? 2),
        bx: Number(params.bx ?? 1.5),
        by: Number(params.by ?? 3),
        scalar: Number(params.scalar ?? 1),
        subtractMode: params.subtractMode === true,
      }),
    renderScene: (props) => <Vectors2DSimulation {...props} />,
  },
  torque: {
    buildSeries: (params) =>
      buildTorqueSeries({
        forceMagnitude: Number(params.forceMagnitude ?? 2),
        forceAngle: Number(params.forceAngle ?? 90),
        applicationDistance: Number(params.applicationDistance ?? 1.6),
      }),
    describeState: (params, time) =>
      describeTorqueState(
        {
          forceMagnitude: Number(params.forceMagnitude ?? 2),
          forceAngle: Number(params.forceAngle ?? 90),
          applicationDistance: Number(params.applicationDistance ?? 1.6),
        },
        time,
      ),
    renderScene: (props) => <TorqueSimulation {...props} />,
  },
  "static-equilibrium-centre-of-mass": {
    buildSeries: (params) =>
      buildStaticEquilibriumCentreOfMassSeries({
        cargoMass: Number(params.cargoMass ?? 3),
        cargoPosition: Number(params.cargoPosition ?? 0.8),
        supportCenter: Number(params.supportCenter ?? 0),
        supportWidth: Number(params.supportWidth ?? 1.4),
      }),
    describeState: (params) =>
      describeStaticEquilibriumCentreOfMassState({
        cargoMass: Number(params.cargoMass ?? 3),
        cargoPosition: Number(params.cargoPosition ?? 0.8),
        supportCenter: Number(params.supportCenter ?? 0),
        supportWidth: Number(params.supportWidth ?? 1.4),
      }),
    renderScene: (props) => <StaticEquilibriumCentreOfMassSimulation {...props} />,
  },
  "rotational-inertia": {
    buildSeries: (params) =>
      buildRotationalInertiaSeries({
        appliedTorque: Number(params.appliedTorque ?? 4),
        massRadius: Number(params.massRadius ?? 0.35),
      }),
    describeState: (params, time) =>
      describeRotationalInertiaState(
        {
          appliedTorque: Number(params.appliedTorque ?? 4),
          massRadius: Number(params.massRadius ?? 0.35),
        },
        time,
      ),
    renderScene: (props) => <RotationalInertiaSimulation {...props} />,
  },
  "rolling-motion": {
    buildSeries: (params) =>
      buildRollingMotionSeries({
        slopeAngle: Number(params.slopeAngle ?? 12),
        radius: Number(params.radius ?? 0.22),
        inertiaFactor: Number(params.inertiaFactor ?? 0.5),
      }),
    describeState: (params, time) =>
      describeRollingMotionState(
        {
          slopeAngle: Number(params.slopeAngle ?? 12),
          radius: Number(params.radius ?? 0.22),
          inertiaFactor: Number(params.inertiaFactor ?? 0.5),
        },
        time,
      ),
    renderScene: (props) => <RollingMotionSimulation {...props} />,
  },
  "angular-momentum": {
    buildSeries: (params) =>
      buildAngularMomentumSeries({
        massRadius: Number(params.massRadius ?? 0.55),
        angularSpeed: Number(params.angularSpeed ?? 2.4),
      }),
    describeState: (params, time) =>
      describeAngularMomentumState(
        {
          massRadius: Number(params.massRadius ?? 0.55),
          angularSpeed: Number(params.angularSpeed ?? 2.4),
        },
        time,
      ),
    renderScene: (props) => <AngularMomentumSimulation {...props} />,
  },
  "momentum-impulse": {
    buildSeries: (params, locale) =>
      buildMomentumImpulseSeries({
        mass: Number(params.mass ?? 1.5),
        initialVelocity: Number(params.initialVelocity ?? 0.5),
        force: Number(params.force ?? 3),
        pulseDuration: Number(params.pulseDuration ?? 0.4),
      }, locale),
    describeState: (params, time, locale) =>
      describeMomentumImpulseState(
        {
          mass: Number(params.mass ?? 1.5),
          initialVelocity: Number(params.initialVelocity ?? 0.5),
          force: Number(params.force ?? 3),
          pulseDuration: Number(params.pulseDuration ?? 0.4),
        },
        time,
        locale,
      ),
    renderScene: (props) => <MomentumImpulseSimulation {...props} />,
  },
  "conservation-of-momentum": {
    buildSeries: (params, locale) =>
      buildConservationMomentumSeries({
        massA: Number(params.massA ?? 1.2),
        massB: Number(params.massB ?? 1.8),
        systemVelocity: Number(params.systemVelocity ?? 0),
        interactionForce: Number(params.interactionForce ?? 1.8),
        interactionDuration: Number(params.interactionDuration ?? 0.5),
      }, locale),
    describeState: (params, time, locale) =>
      describeConservationMomentumState(
        {
          massA: Number(params.massA ?? 1.2),
          massB: Number(params.massB ?? 1.8),
          systemVelocity: Number(params.systemVelocity ?? 0),
          interactionForce: Number(params.interactionForce ?? 1.8),
          interactionDuration: Number(params.interactionDuration ?? 0.5),
        },
        time,
        locale,
      ),
    renderScene: (props) => <ConservationMomentumSimulation {...props} />,
  },
  collisions: {
    buildSeries: (params, locale) =>
      buildCollisionsSeries({
        massA: Number(params.massA ?? 1.2),
        massB: Number(params.massB ?? 2.2),
        speedA: Number(params.speedA ?? 1.6),
        speedB: Number(params.speedB ?? 0.7),
        elasticity: Number(params.elasticity ?? 0.8),
      }, locale),
    describeState: (params, time, locale) =>
      describeCollisionsState(
        {
          massA: Number(params.massA ?? 1.2),
          massB: Number(params.massB ?? 2.2),
          speedA: Number(params.speedA ?? 1.6),
          speedB: Number(params.speedB ?? 0.7),
          elasticity: Number(params.elasticity ?? 0.8),
        },
        time,
        locale,
      ),
    renderScene: (props) => <CollisionsSimulation {...props} />,
  },
  "basic-circuits": {
    buildSeries: (params) =>
      buildBasicCircuitsSeries({
        voltage: Number(params.voltage ?? 12),
        resistanceA: Number(params.resistanceA ?? 6),
        resistanceB: Number(params.resistanceB ?? 6),
        parallelMode: params.parallelMode === true,
      }),
    describeState: (params) =>
      describeBasicCircuitsState({
        voltage: Number(params.voltage ?? 12),
        resistanceA: Number(params.resistanceA ?? 6),
        resistanceB: Number(params.resistanceB ?? 6),
        parallelMode: params.parallelMode === true,
      }),
    renderScene: (props) => <BasicCircuitsSimulation {...props} />,
  },
  "series-parallel-circuits": {
    buildSeries: (params, locale) =>
      buildSeriesParallelCircuitsSeries({
        voltage: Number(params.voltage ?? 12),
        resistanceA: Number(params.resistanceA ?? 6),
        resistanceB: Number(params.resistanceB ?? 6),
        parallelMode: params.parallelMode === true,
      }, locale),
    describeState: (params, time, locale) =>
      describeSeriesParallelCircuitsState(
        {
          voltage: Number(params.voltage ?? 12),
          resistanceA: Number(params.resistanceA ?? 6),
          resistanceB: Number(params.resistanceB ?? 6),
          parallelMode: params.parallelMode === true,
        },
        time,
        locale,
      ),
    renderScene: (props) => <SeriesParallelCircuitsSimulation {...props} />,
  },
  "equivalent-resistance": {
    buildSeries: (params, locale) =>
      buildEquivalentResistanceSeries({
        voltage: Number(params.voltage ?? 12),
        resistance1: Number(params.resistance1 ?? 4),
        resistance2: Number(params.resistance2 ?? 6),
        resistance3: Number(params.resistance3 ?? 6),
        groupParallel: params.groupParallel === true,
      }, locale),
    describeState: (params, time, locale) =>
      describeEquivalentResistanceState(
        {
          voltage: Number(params.voltage ?? 12),
          resistance1: Number(params.resistance1 ?? 4),
          resistance2: Number(params.resistance2 ?? 6),
          resistance3: Number(params.resistance3 ?? 6),
          groupParallel: params.groupParallel === true,
        },
        time,
        locale,
      ),
    renderScene: (props) => <EquivalentResistanceSimulation {...props} />,
  },
  "power-energy-circuits": {
    buildSeries: (params) =>
      buildPowerEnergyCircuitsSeries({
        voltage: Number(params.voltage ?? 12),
        loadResistance: Number(params.loadResistance ?? 8),
      }),
    describeState: (params, time) =>
      describePowerEnergyCircuitsState(
        {
          voltage: Number(params.voltage ?? 12),
          loadResistance: Number(params.loadResistance ?? 8),
        },
        time,
      ),
    renderScene: (props) => <PowerEnergyCircuitsSimulation {...props} />,
  },
  "rc-charging-discharging": {
    buildSeries: (params) =>
      buildRcChargingDischargingSeries({
        sourceVoltage: Number(params.sourceVoltage ?? 8),
        resistance: Number(params.resistance ?? 2),
        capacitance: Number(params.capacitance ?? 1),
        charging: params.charging === true,
      }),
    describeState: (params, time) =>
      describeRcChargingDischargingState(
        {
          sourceVoltage: Number(params.sourceVoltage ?? 8),
          resistance: Number(params.resistance ?? 2),
          capacitance: Number(params.capacitance ?? 1),
          charging: params.charging === true,
        },
        time,
      ),
    renderScene: (props) => <RcChargingDischargingSimulation {...props} />,
  },
  "internal-resistance-terminal-voltage": {
    buildSeries: (params) =>
      buildInternalResistanceTerminalVoltageSeries({
        emf: Number(params.emf ?? 12),
        internalResistance: Number(params.internalResistance ?? 1),
        loadResistance: Number(params.loadResistance ?? 6),
      }),
    describeState: (params) =>
      describeInternalResistanceTerminalVoltageState({
        emf: Number(params.emf ?? 12),
        internalResistance: Number(params.internalResistance ?? 1),
        loadResistance: Number(params.loadResistance ?? 6),
      }),
    renderScene: (props) => <InternalResistanceTerminalVoltageSimulation {...props} />,
  },
  "temperature-internal-energy": {
    buildSeries: (params) =>
      buildTemperatureInternalEnergySeries({
        particleCount: params.particleCount,
        heaterPower: params.heaterPower,
        startingTemperature: params.startingTemperature,
        phasePlateauTemperature: params.phasePlateauTemperature,
        latentEnergyPerParticle: params.latentEnergyPerParticle,
        initialPhaseProgress: params.initialPhaseProgress,
        bondEnergyPerParticle: params.bondEnergyPerParticle,
      }),
    describeState: (params, time) =>
      describeTemperatureInternalEnergyState(
        {
          particleCount: params.particleCount,
          heaterPower: params.heaterPower,
          startingTemperature: params.startingTemperature,
          phasePlateauTemperature: params.phasePlateauTemperature,
          latentEnergyPerParticle: params.latentEnergyPerParticle,
          initialPhaseProgress: params.initialPhaseProgress,
          bondEnergyPerParticle: params.bondEnergyPerParticle,
        },
        time,
      ),
    renderScene: (props) => <TemperatureInternalEnergySimulation {...props} />,
  },
  "ideal-gas-kinetic-theory": {
    buildSeries: (params) =>
      buildIdealGasLawKineticTheorySeries({
        particleCount: params.particleCount,
        temperature: params.temperature,
        volume: params.volume,
      }),
    describeState: (params) =>
      describeIdealGasLawKineticTheoryState({
        particleCount: params.particleCount,
        temperature: params.temperature,
        volume: params.volume,
      }),
    renderScene: (props) => <IdealGasLawKineticTheorySimulation {...props} />,
  },
  "pressure-hydrostatic": {
    buildSeries: (params) =>
      buildPressureHydrostaticSeries({
        force: params.force,
        area: params.area,
        density: params.density,
        gravity: params.gravity,
        depth: params.depth,
      }),
    describeState: (params) =>
      describePressureHydrostaticState({
        force: params.force,
        area: params.area,
        density: params.density,
        gravity: params.gravity,
        depth: params.depth,
      }),
    renderScene: (props) => <PressureHydrostaticSimulation {...props} />,
  },
  "continuity-equation": {
    buildSeries: (params) =>
      buildContinuityEquationSeries({
        flowRate: params.flowRate,
        entryArea: params.entryArea,
        middleArea: params.middleArea,
      }),
    describeState: (params, time) =>
      describeContinuityEquationState(
        {
          flowRate: params.flowRate,
          entryArea: params.entryArea,
          middleArea: params.middleArea,
        },
        time,
      ),
    renderScene: (props) => <ContinuityEquationSimulation {...props} />,
  },
  "bernoulli-principle": {
    buildSeries: (params) =>
      buildBernoulliPrincipleSeries({
        entryPressure: params.entryPressure,
        flowRate: params.flowRate,
        entryArea: params.entryArea,
        throatArea: params.throatArea,
        throatHeight: params.throatHeight,
      }),
    describeState: (params, time) =>
      describeBernoulliPrincipleState(
        {
          entryPressure: params.entryPressure,
          flowRate: params.flowRate,
          entryArea: params.entryArea,
          throatArea: params.throatArea,
          throatHeight: params.throatHeight,
        },
        time,
      ),
    renderScene: (props) => <BernoulliPrincipleSimulation {...props} />,
  },
  "buoyancy-archimedes": {
    buildSeries: (params, locale) =>
      buildBuoyancyArchimedesSeries({
        objectDensity: params.objectDensity,
        fluidDensity: params.fluidDensity,
        gravity: params.gravity,
        bottomDepth: params.bottomDepth,
      }, locale),
    describeState: (params, _time, locale) =>
      describeBuoyancyArchimedesState({
        objectDensity: params.objectDensity,
        fluidDensity: params.fluidDensity,
        gravity: params.gravity,
        bottomDepth: params.bottomDepth,
      }, locale),
    renderScene: (props) => <BuoyancyArchimedesSimulation {...props} />,
  },
  "drag-terminal-velocity": {
    buildSeries: (params) =>
      buildDragTerminalVelocitySeries({
        mass: params.mass,
        area: params.area,
        dragStrength: params.dragStrength,
      }),
    describeState: (params, time) =>
      describeDragTerminalVelocityState(
        {
          mass: params.mass,
          area: params.area,
          dragStrength: params.dragStrength,
        },
        time,
      ),
    renderScene: (props) => <DragTerminalVelocitySimulation {...props} />,
  },
  "heat-transfer": {
    buildSeries: (params) =>
      buildHeatTransferSeries({
        hotTemperature: params.hotTemperature,
        ambientTemperature: params.ambientTemperature,
        materialConductivity: params.materialConductivity,
        contactQuality: params.contactQuality,
        surfaceArea: params.surfaceArea,
        airflow: params.airflow,
      }),
    describeState: (params, time) =>
      describeHeatTransferState(
        {
          hotTemperature: params.hotTemperature,
          ambientTemperature: params.ambientTemperature,
          materialConductivity: params.materialConductivity,
          contactQuality: params.contactQuality,
          surfaceArea: params.surfaceArea,
          airflow: params.airflow,
        },
        time,
      ),
    renderScene: (props) => <HeatTransferSimulation {...props} />,
  },
  "specific-heat-phase-change": {
    buildSeries: (params) =>
      buildSpecificHeatPhaseChangeSeries({
        mass: params.mass,
        specificHeat: params.specificHeat,
        heaterPower: params.heaterPower,
        startingTemperature: params.startingTemperature,
        latentHeat: params.latentHeat,
        initialPhaseFraction: params.initialPhaseFraction,
        phaseChangeTemperature: params.phaseChangeTemperature,
      }),
    describeState: (params, time) =>
      describeSpecificHeatPhaseChangeState(
        {
          mass: params.mass,
          specificHeat: params.specificHeat,
          heaterPower: params.heaterPower,
          startingTemperature: params.startingTemperature,
          latentHeat: params.latentHeat,
          initialPhaseFraction: params.initialPhaseFraction,
          phaseChangeTemperature: params.phaseChangeTemperature,
        },
        time,
      ),
    renderScene: (props) => <SpecificHeatPhaseChangeSimulation {...props} />,
  },
  "electric-fields": {
    buildSeries: (params, locale) =>
      buildElectricFieldsSeries({
        sourceChargeA: Number(params.sourceChargeA ?? 2),
        sourceChargeB: Number(params.sourceChargeB ?? -2),
        sourceSeparation: Number(params.sourceSeparation ?? 2.4),
        probeX: Number(params.probeX ?? 0),
        probeY: Number(params.probeY ?? 1),
        testCharge: Number(params.testCharge ?? 1),
      }, locale),
    describeState: (params, _time, locale) =>
      describeElectricFieldsState({
        sourceChargeA: Number(params.sourceChargeA ?? 2),
        sourceChargeB: Number(params.sourceChargeB ?? -2),
        sourceSeparation: Number(params.sourceSeparation ?? 2.4),
        probeX: Number(params.probeX ?? 0),
        probeY: Number(params.probeY ?? 1),
        testCharge: Number(params.testCharge ?? 1),
      }, locale),
    renderScene: (props) => <ElectricFieldsSimulation {...props} />,
  },
  "gravitational-fields": {
    buildSeries: (params) =>
      buildGravitationalFieldsSeries({
        sourceMass: Number(params.sourceMass ?? 2),
        probeX: Number(params.probeX ?? 1.6),
        probeY: Number(params.probeY ?? 1.2),
        testMass: Number(params.testMass ?? 1),
      }),
    describeState: (params) =>
      describeGravitationalFieldsState({
        sourceMass: Number(params.sourceMass ?? 2),
        probeX: Number(params.probeX ?? 1.6),
        probeY: Number(params.probeY ?? 1.2),
        testMass: Number(params.testMass ?? 1),
      }),
    renderScene: (props) => <GravitationalFieldsSimulation {...props} />,
  },
  "gravitational-potential": {
    buildSeries: (params) =>
      buildGravitationalPotentialSeries({
        sourceMass: Number(params.sourceMass ?? 2),
        probeX: Number(params.probeX ?? 1.6),
        probeY: Number(params.probeY ?? 1.2),
        testMass: Number(params.testMass ?? 1),
      }),
    describeState: (params) =>
      describeGravitationalPotentialState({
        sourceMass: Number(params.sourceMass ?? 2),
        probeX: Number(params.probeX ?? 1.6),
        probeY: Number(params.probeY ?? 1.2),
        testMass: Number(params.testMass ?? 1),
      }),
    renderScene: (props) => <GravitationalPotentialSimulation {...props} />,
  },
  "circular-orbits": {
    buildSeries: (params, locale) =>
      buildCircularOrbitsSeries({
        sourceMass: Number(params.sourceMass ?? 4),
        orbitRadius: Number(params.orbitRadius ?? 1.6),
        speedFactor: Number(params.speedFactor ?? 1),
      }, locale),
    describeState: (params, time, locale) =>
      describeCircularOrbitsState(
        {
          sourceMass: Number(params.sourceMass ?? 4),
          orbitRadius: Number(params.orbitRadius ?? 1.6),
          speedFactor: Number(params.speedFactor ?? 1),
        },
        time,
        locale,
      ),
    renderScene: (props) => <CircularOrbitsSimulation {...props} />,
  },
  "escape-velocity": {
    buildSeries: (params) =>
      buildEscapeVelocitySeries({
        sourceMass: Number(params.sourceMass ?? 4),
        launchRadius: Number(params.launchRadius ?? 1.6),
        speedFactor: Number(params.speedFactor ?? 1),
      }),
    describeState: (params, time) =>
      describeEscapeVelocityState(
        {
          sourceMass: Number(params.sourceMass ?? 4),
          launchRadius: Number(params.launchRadius ?? 1.6),
          speedFactor: Number(params.speedFactor ?? 1),
        },
        time,
      ),
    renderScene: (props) => <EscapeVelocitySimulation {...props} />,
  },
  "electric-potential": {
    buildSeries: (params) =>
      buildElectricPotentialSeries({
        sourceChargeA: Number(params.sourceChargeA ?? 2),
        sourceChargeB: Number(params.sourceChargeB ?? -2),
        sourceSeparation: Number(params.sourceSeparation ?? 2.4),
        probeX: Number(params.probeX ?? 0),
        probeY: Number(params.probeY ?? 1),
        testCharge: Number(params.testCharge ?? 1),
      }),
    describeState: (params) =>
      describeElectricPotentialState({
        sourceChargeA: Number(params.sourceChargeA ?? 2),
        sourceChargeB: Number(params.sourceChargeB ?? -2),
        sourceSeparation: Number(params.sourceSeparation ?? 2.4),
        probeX: Number(params.probeX ?? 0),
        probeY: Number(params.probeY ?? 1),
        testCharge: Number(params.testCharge ?? 1),
      }),
    renderScene: (props) => <ElectricPotentialSimulation {...props} />,
  },
  "capacitance-electric-energy": {
    buildSeries: (params) =>
      buildCapacitanceElectricEnergySeries({
        plateArea: Number(params.plateArea ?? 2.4),
        plateSeparation: Number(params.plateSeparation ?? 1.4),
        batteryVoltage: Number(params.batteryVoltage ?? 6),
      }),
    describeState: (params) =>
      describeCapacitanceElectricEnergyState({
        plateArea: Number(params.plateArea ?? 2.4),
        plateSeparation: Number(params.plateSeparation ?? 1.4),
        batteryVoltage: Number(params.batteryVoltage ?? 6),
      }),
    renderScene: (props) => <CapacitanceElectricEnergySimulation {...props} />,
  },
  "magnetic-fields": {
    buildSeries: (params) =>
      buildMagneticFieldsSeries({
        currentA: Number(params.currentA ?? 2),
        currentB: Number(params.currentB ?? -2),
        sourceSeparation: Number(params.sourceSeparation ?? 2.4),
        probeX: Number(params.probeX ?? 0),
        probeY: Number(params.probeY ?? 1),
      }),
    describeState: (params) =>
      describeMagneticFieldsState({
        currentA: Number(params.currentA ?? 2),
        currentB: Number(params.currentB ?? -2),
        sourceSeparation: Number(params.sourceSeparation ?? 2.4),
        probeX: Number(params.probeX ?? 0),
        probeY: Number(params.probeY ?? 1),
      }),
    renderScene: (props) => <MagneticFieldsSimulation {...props} />,
  },
  "electromagnetic-induction": {
    buildSeries: (params) =>
      buildElectromagneticInductionSeries({
        magnetStrength: Number(params.magnetStrength ?? 1.4),
        coilTurns: Number(params.coilTurns ?? 120),
        coilArea: Number(params.coilArea ?? 1),
        speed: Number(params.speed ?? 1.2),
        startOffset: Number(params.startOffset ?? 2.6),
        northFacingCoil: params.northFacingCoil !== false,
      }),
    describeState: (params, time) =>
      describeElectromagneticInductionState(
        {
          magnetStrength: Number(params.magnetStrength ?? 1.4),
          coilTurns: Number(params.coilTurns ?? 120),
          coilArea: Number(params.coilArea ?? 1),
          speed: Number(params.speed ?? 1.2),
          startOffset: Number(params.startOffset ?? 2.6),
          northFacingCoil: params.northFacingCoil !== false,
        },
        time,
      ),
    renderScene: (props) => <ElectromagneticInductionSimulation {...props} />,
  },
  "maxwell-equations-synthesis": {
    buildSeries: (params) =>
      buildMaxwellEquationsSynthesisSeries({
        chargeSource: Number(params.chargeSource ?? 1.1),
        conductionCurrent: Number(params.conductionCurrent ?? 0.7),
        electricChangeRate: Number(params.electricChangeRate ?? 0.9),
        magneticChangeRate: Number(params.magneticChangeRate ?? 0.9),
        cycleRate: Number(params.cycleRate ?? 0.85),
      }),
    describeState: (params, time) =>
      describeMaxwellEquationsSynthesisState(
        {
          chargeSource: Number(params.chargeSource ?? 1.1),
          conductionCurrent: Number(params.conductionCurrent ?? 0.7),
          electricChangeRate: Number(params.electricChangeRate ?? 0.9),
          magneticChangeRate: Number(params.magneticChangeRate ?? 0.9),
          cycleRate: Number(params.cycleRate ?? 0.85),
        },
        time,
      ),
    renderScene: (props) => <MaxwellEquationsSynthesisSimulation {...props} />,
  },
  "electromagnetic-waves": {
    buildSeries: (params) =>
      buildElectromagneticWavesSeries({
        electricAmplitude: Number(params.electricAmplitude ?? 1.2),
        waveSpeed: Number(params.waveSpeed ?? 2.8),
        wavelength: Number(params.wavelength ?? 1.8),
        probeX: Number(params.probeX ?? 2.7),
      }),
    describeState: (params, time) =>
      describeElectromagneticWavesState(
        {
          electricAmplitude: Number(params.electricAmplitude ?? 1.2),
          waveSpeed: Number(params.waveSpeed ?? 2.8),
          wavelength: Number(params.wavelength ?? 1.8),
          probeX: Number(params.probeX ?? 2.7),
        },
        time,
      ),
    renderScene: (props) => <ElectromagneticWavesSimulation {...props} />,
  },
  "light-spectrum-linkage": {
    buildSeries: (params) =>
      buildLightSpectrumLinkageSeries({
        fieldAmplitude: Number(params.fieldAmplitude ?? 1.05),
        logWavelength: Number(params.logWavelength ?? -6.27),
        mediumIndex: Number(params.mediumIndex ?? 1),
        probeCycles: Number(params.probeCycles ?? 1),
      }),
    describeState: (params, time) =>
      describeLightSpectrumLinkageState(
        {
          fieldAmplitude: Number(params.fieldAmplitude ?? 1.05),
          logWavelength: Number(params.logWavelength ?? -6.27),
          mediumIndex: Number(params.mediumIndex ?? 1),
          probeCycles: Number(params.probeCycles ?? 1),
        },
        time,
      ),
    renderScene: (props) => <LightSpectrumLinkageSimulation {...props} />,
  },
  "dispersion-refractive-index-color": {
    buildSeries: (params) =>
      buildDispersionRefractiveIndexColorSeries({
        wavelengthNm: Number(params.wavelengthNm ?? 550),
        referenceIndex: Number(params.referenceIndex ?? 1.52),
        dispersionStrength: Number(params.dispersionStrength ?? 0.02),
        prismAngle: Number(params.prismAngle ?? 18),
      }),
    describeState: (params) =>
      describeDispersionRefractiveIndexColorState({
        wavelengthNm: Number(params.wavelengthNm ?? 550),
        referenceIndex: Number(params.referenceIndex ?? 1.52),
        dispersionStrength: Number(params.dispersionStrength ?? 0.02),
        prismAngle: Number(params.prismAngle ?? 18),
      }),
    renderScene: (props) => <DispersionRefractiveIndexColorSimulation {...props} />,
  },
  polarization: {
    buildSeries: (params) =>
      buildPolarizationSeries({
        inputAmplitude: Number(params.inputAmplitude ?? 1.1),
        inputAngle: Number(params.inputAngle ?? 30),
        polarizerAngle: Number(params.polarizerAngle ?? 30),
        unpolarized: params.unpolarized === true,
      }),
    describeState: (params) =>
      describePolarizationState({
        inputAmplitude: Number(params.inputAmplitude ?? 1.1),
        inputAngle: Number(params.inputAngle ?? 30),
        polarizerAngle: Number(params.polarizerAngle ?? 30),
        unpolarized: params.unpolarized === true,
      }),
    renderScene: (props) => <PolarizationSimulation {...props} />,
  },
  diffraction: {
    buildSeries: (params) =>
      buildDiffractionSeries({
        wavelength: Number(params.wavelength ?? 1),
        slitWidth: Number(params.slitWidth ?? 2.4),
        probeY: Number(params.probeY ?? 0),
      }),
    describeState: (params, time) =>
      describeDiffractionState(
        {
          wavelength: Number(params.wavelength ?? 1),
          slitWidth: Number(params.slitWidth ?? 2.4),
          probeY: Number(params.probeY ?? 0),
        },
        time,
      ),
    renderScene: (props) => <DiffractionSimulation {...props} />,
  },
  "optical-resolution": {
    buildSeries: (params) =>
      buildOpticalResolutionSeries({
        wavelengthNm: Number(params.wavelengthNm ?? 550),
        apertureMm: Number(params.apertureMm ?? 2.4),
        separationMrad: Number(params.separationMrad ?? 0.32),
        probeYUm: Number(params.probeYUm ?? 0),
      }),
    describeState: (params) =>
      describeOpticalResolutionState({
        wavelengthNm: Number(params.wavelengthNm ?? 550),
        apertureMm: Number(params.apertureMm ?? 2.4),
        separationMrad: Number(params.separationMrad ?? 0.32),
        probeYUm: Number(params.probeYUm ?? 0),
      }),
    renderScene: (props) => <OpticalResolutionSimulation {...props} />,
  },
  "double-slit-interference": {
    buildSeries: (params) =>
      buildDoubleSlitInterferenceSeries({
        wavelength: Number(params.wavelength ?? 0.78),
        slitSeparation: Number(params.slitSeparation ?? 2.6),
        screenDistance: Number(params.screenDistance ?? 5.4),
        probeY: Number(params.probeY ?? 0),
      }),
    describeState: (params, time) =>
      describeDoubleSlitInterferenceState(
        {
          wavelength: Number(params.wavelength ?? 0.78),
          slitSeparation: Number(params.slitSeparation ?? 2.6),
          screenDistance: Number(params.screenDistance ?? 5.4),
          probeY: Number(params.probeY ?? 0),
        },
        time,
      ),
    renderScene: (props) => <DoubleSlitInterferenceSimulation {...props} />,
  },
  "photoelectric-effect": {
    buildSeries: (params) =>
      buildPhotoelectricEffectSeries({
        frequencyPHz: Number(params.frequencyPHz ?? 0.95),
        intensity: Number(params.intensity ?? 1),
        workFunctionEv: Number(params.workFunctionEv ?? 2.3),
        collectorVoltage: Number(params.collectorVoltage ?? 0.4),
      }),
    describeState: (params, time) =>
      describePhotoelectricEffectState(
        {
          frequencyPHz: Number(params.frequencyPHz ?? 0.95),
          intensity: Number(params.intensity ?? 1),
          workFunctionEv: Number(params.workFunctionEv ?? 2.3),
          collectorVoltage: Number(params.collectorVoltage ?? 0.4),
        },
        time,
      ),
    renderScene: (props) => <PhotoelectricEffectSimulation {...props} />,
  },
  "atomic-spectra": {
    buildSeries: (params) =>
      buildAtomicSpectraSeries({
        gap12Ev: Number(params.gap12Ev ?? 1.9),
        gap23Ev: Number(params.gap23Ev ?? 2.6),
        gap34Ev: Number(params.gap34Ev ?? 2.7),
        absorptionMode: params.absorptionMode === true,
      }),
    describeState: (params, time) =>
      describeAtomicSpectraState(
        {
          gap12Ev: Number(params.gap12Ev ?? 1.9),
          gap23Ev: Number(params.gap23Ev ?? 2.6),
          gap34Ev: Number(params.gap34Ev ?? 2.7),
          absorptionMode: params.absorptionMode === true,
        },
        time,
      ),
    renderScene: (props) => <AtomicSpectraSimulation {...props} />,
  },
  "de-broglie-matter-waves": {
    buildSeries: () => buildDeBroglieMatterWavesSeries(),
    describeState: (params) =>
      describeDeBroglieMatterWavesState({
        massMultiple: Number(params.massMultiple ?? 1),
        speedMms: Number(params.speedMms ?? 2.2),
      }),
    renderScene: (props) => <DeBroglieMatterWavesSimulation {...props} />,
  },
  "bohr-model": {
    buildSeries: (params) =>
      buildBohrModelSeries({
        upperLevel: Number(params.upperLevel ?? 3),
        lowerLevel: Number(params.lowerLevel ?? 2),
        excitationMode: params.excitationMode === true,
      }),
    describeState: (params, time, locale) =>
      describeBohrModelState(
        {
          upperLevel: Number(params.upperLevel ?? 3),
          lowerLevel: Number(params.lowerLevel ?? 2),
          excitationMode: params.excitationMode === true,
        },
        time,
        locale,
      ),
    renderScene: (props) => <BohrModelSimulation {...props} />,
  },
  "radioactivity-half-life": {
    buildSeries: (params) =>
      buildRadioactivityHalfLifeSeries({
        sampleSize: Number(params.sampleSize ?? 64),
        halfLifeSeconds: Number(params.halfLifeSeconds ?? 2.4),
      }),
    describeState: (params, time) =>
      describeRadioactivityHalfLifeState(
        {
          sampleSize: Number(params.sampleSize ?? 64),
          halfLifeSeconds: Number(params.halfLifeSeconds ?? 2.4),
        },
        time,
      ),
    renderScene: (props) => <RadioactivityHalfLifeSimulation {...props} />,
  },
  "magnetic-force": {
    buildSeries: (params) =>
      buildMagneticForceSeries({
        fieldStrength: Number(params.fieldStrength ?? 1.6),
        speed: Number(params.speed ?? 4.5),
        directionAngle: Number(params.directionAngle ?? 0),
        negativeCharge: params.negativeCharge === true,
        current: Number(params.current ?? 2),
      }),
    describeState: (params, time) =>
      describeMagneticForceState(
        {
          fieldStrength: Number(params.fieldStrength ?? 1.6),
          speed: Number(params.speed ?? 4.5),
          directionAngle: Number(params.directionAngle ?? 0),
          negativeCharge: params.negativeCharge === true,
          current: Number(params.current ?? 2),
        },
        time,
      ),
    renderScene: (props) => <MagneticForceSimulation {...props} />,
  },
  "refraction-snells-law": {
    buildSeries: (params, locale) =>
      buildRefractionSnellsLawSeries({
        incidentAngle: Number(params.incidentAngle ?? 50),
        n1: Number(params.n1 ?? 1),
        n2: Number(params.n2 ?? 1.5),
      }, locale),
    describeState: (params, _time, locale) =>
      describeRefractionSnellsLawState({
        incidentAngle: Number(params.incidentAngle ?? 50),
        n1: Number(params.n1 ?? 1),
        n2: Number(params.n2 ?? 1.5),
      }, locale),
    renderScene: (props) => <RefractionSnellsLawSimulation {...props} />,
  },
  mirrors: {
    buildSeries: (params) =>
      buildMirrorsSeries({
        curved: params.curved !== false,
        concave: params.concave !== false,
        focalLength: Number(params.focalLength ?? 0.8),
        objectDistance: Number(params.objectDistance ?? 2),
        objectHeight: Number(params.objectHeight ?? 1),
      }),
    describeState: (params) =>
      describeMirrorsState({
        curved: params.curved !== false,
        concave: params.concave !== false,
        focalLength: Number(params.focalLength ?? 0.8),
        objectDistance: Number(params.objectDistance ?? 2),
        objectHeight: Number(params.objectHeight ?? 1),
      }),
    renderScene: (props) => <MirrorsSimulation {...props} />,
  },
  "lens-imaging": {
    buildSeries: (params) =>
      buildLensImagingSeries({
        converging: params.converging !== false,
        focalLength: Number(params.focalLength ?? 0.8),
        objectDistance: Number(params.objectDistance ?? 2),
        objectHeight: Number(params.objectHeight ?? 1),
      }),
    describeState: (params) =>
      describeLensImagingState({
        converging: params.converging !== false,
        focalLength: Number(params.focalLength ?? 0.8),
        objectDistance: Number(params.objectDistance ?? 2),
        objectHeight: Number(params.objectHeight ?? 1),
      }),
    renderScene: (props) => <LensImagingSimulation {...props} />,
  },
  beats: {
    buildSeries: (params) => buildBeatsSeries(params),
    describeState: (params, time) => describeBeatsState(params, time),
    renderScene: (props) => <BeatsSimulation {...props} />,
  },
  "sound-waves-longitudinal": {
    buildSeries: (params, locale) => buildSoundWavesLongitudinalSeries(params, locale),
    describeState: (params, time, locale) =>
      describeSoundWavesLongitudinalState(params, time, locale),
    renderScene: (props) => <SoundWavesLongitudinalSimulation {...props} />,
  },
  "doppler-effect": {
    buildSeries: (params) => buildDopplerEffectSeries(params),
    describeState: (params, time) => describeDopplerEffectState(params, time),
    renderScene: (props) => <DopplerEffectSimulation {...props} />,
  },
  "wave-speed-wavelength": {
    buildSeries: (params) =>
      buildWaveSpeedWavelengthSeries({
        amplitude: Number(params.amplitude ?? 1),
        waveSpeed: Number(params.waveSpeed ?? 2.4),
        wavelength: Number(params.wavelength ?? 1.6),
        probeX: Number(params.probeX ?? 2.4),
      }),
    describeState: (params, time) =>
      describeWaveSpeedWavelengthState(
        {
          amplitude: Number(params.amplitude ?? 1),
          waveSpeed: Number(params.waveSpeed ?? 2.4),
          wavelength: Number(params.wavelength ?? 1.6),
          probeX: Number(params.probeX ?? 2.4),
        },
        time,
      ),
    renderScene: (props) => <WaveSpeedWavelengthSimulation {...props} />,
  },
  "wave-interference": {
    buildSeries: (params) =>
      buildWaveInterferenceSeries({
        amplitudeA: Number(params.amplitudeA ?? 1),
        amplitudeB: Number(params.amplitudeB ?? 1),
        wavelength: Number(params.wavelength ?? 1.6),
        phaseOffset: Number(params.phaseOffset ?? 0),
        probeY: Number(params.probeY ?? 0),
      }),
    describeState: (params, time) =>
      describeWaveInterferenceState(
        {
          amplitudeA: Number(params.amplitudeA ?? 1),
          amplitudeB: Number(params.amplitudeB ?? 1),
          wavelength: Number(params.wavelength ?? 1.6),
          phaseOffset: Number(params.phaseOffset ?? 0),
          probeY: Number(params.probeY ?? 0),
        },
        time,
      ),
    renderScene: (props) => <WaveInterferenceSimulation {...props} />,
  },
  "standing-waves": {
    buildSeries: (params, locale) =>
      buildStandingWavesSeries({
        amplitude: Number(params.amplitude ?? 1.1),
        length: Number(params.length ?? 1.6),
        modeNumber: Number(params.modeNumber ?? 2),
        probeX: Number(params.probeX ?? 0.8),
      }, locale),
    describeState: (params, time, locale) =>
      describeStandingWavesState(
        {
          amplitude: Number(params.amplitude ?? 1.1),
          length: Number(params.length ?? 1.6),
          modeNumber: Number(params.modeNumber ?? 2),
          probeX: Number(params.probeX ?? 0.8),
        },
        time,
        locale,
      ),
    renderScene: (props) => <StandingWavesSimulation {...props} />,
  },
  "air-column-resonance": {
    buildSeries: (params) => buildAirColumnResonanceSeries(params),
    describeState: (params, time) => describeAirColumnResonanceState(params, time),
    renderScene: (props) => <AirColumnResonanceSimulation {...props} />,
  },
};

function coerceValue(value: number | boolean | string) {
  return value;
}

function cloneParams(params: SimulationParams): SimulationParams {
  return { ...params };
}

function buildDefaultCompareSetupLabels(locale: AppLocale) {
  return {
    a: getCompareSetupLabel(locale, "a"),
    b: getCompareSetupLabel(locale, "b"),
  } as const;
}

function cloneSetup(setup: CompareSetup): CompareSetup {
  return {
    ...setup,
    params: cloneParams(setup.params),
  };
}

function normalizeCompareLabel(
  label: string,
  fallback: string,
) {
  const normalized = label.replace(/\s+/g, " ").trim().slice(0, 48);
  return normalized || fallback;
}

function restoreInitialCompareState(
  compare: ShareableConceptCompareState | null,
  defaultLabels: { a: string; b: string },
): CompareState | null {
  if (!compare) {
    return null;
  }

  const resolveLabel = (
    label: string,
    englishFallback: string,
    localizedFallback: string,
  ) => {
    const normalized = normalizeCompareLabel(label, englishFallback);
    return normalized === englishFallback ? localizedFallback : normalized;
  };

  return {
    activeTarget: compare.activeTarget,
    setupA: {
      label: resolveLabel(
        compare.setupA.label,
        DEFAULT_COMPARE_SETUP_LABELS.a,
        defaultLabels.a,
      ),
      params: cloneParams(compare.setupA.params),
      activePresetId: compare.setupA.activePresetId,
    },
    setupB: {
      label: resolveLabel(
        compare.setupB.label,
        DEFAULT_COMPARE_SETUP_LABELS.b,
        defaultLabels.b,
      ),
      params: cloneParams(compare.setupB.params),
      activePresetId: compare.setupB.activePresetId,
    },
  };
}

function buildShareableCompareState(
  compareState: CompareState | null,
): ShareableConceptCompareState | null {
  if (!compareState) {
    return null;
  }

  return {
    activeTarget: compareState.activeTarget,
    setupA: {
      label: compareState.setupA.label,
      params: cloneParams(compareState.setupA.params),
      activePresetId: compareState.setupA.activePresetId,
    },
    setupB: {
      label: compareState.setupB.label,
      params: cloneParams(compareState.setupB.params),
      activePresetId: compareState.setupB.activePresetId,
    },
  };
}

function getActiveCompareSetup(compareState: CompareState) {
  return compareState.activeTarget === "a" ? compareState.setupA : compareState.setupB;
}

function getCompareSetupById(compareState: CompareState, setup: GraphSeriesSetupId) {
  return setup === "a" ? compareState.setupA : compareState.setupB;
}

function getGraphInteractionKind(kind: SimulationKind, graphId: string): GraphInteractionKind {
  if (
    kind === "graph-transformations" &&
    (graphId === "function-graph" || graphId === "vertex-height-map")
  ) {
    return "response";
  }

  if (kind === "rational-functions" && graphId === "asymptote-response") {
    return "response";
  }

  if (
    kind === "matrix-transformations" &&
    (graphId === "probe-image-blend" || graphId === "basis-length-blend")
  ) {
    return "response";
  }

  if (
    kind === "exponential-change" &&
    (graphId === "change-curve" || graphId === "log-view")
  ) {
    return "response";
  }

  if (
    kind === "complex-numbers-plane" &&
    (graphId === "addition-sweep" || graphId === "multiplication-sweep")
  ) {
    return "response";
  }

  if (
    kind === "polar-coordinates" &&
    (graphId === "coordinate-sweep" || graphId === "angle-recovery")
  ) {
    return "response";
  }

  if (
    kind === "concentration-dilution" &&
    (graphId === "concentration-vs-solvent" || graphId === "concentration-vs-solute")
  ) {
    return "response";
  }

  if (
    kind === "stoichiometry-recipe" &&
    (graphId === "batches-vs-reactant-a" ||
      graphId === "batches-vs-reactant-b" ||
      graphId === "yield-vs-percent")
  ) {
    return "response";
  }

  if (
    kind === "solubility-saturation" &&
    (graphId === "dissolved-vs-solute" ||
      graphId === "excess-vs-solute" ||
      graphId === "capacity-vs-solvent" ||
      graphId === "saturation-vs-limit")
  ) {
    return "response";
  }

  if (kind === "acid-base-ph" && (graphId === "ph-vs-acid" || graphId === "ph-vs-base")) {
    return "response";
  }

  if (
    kind === "buffers-neutralization" &&
    (graphId === "ph-vs-acid" || graphId === "buffer-remaining-vs-acid")
  ) {
    return "response";
  }

  if (
    kind === "derivative-as-slope" &&
    (graphId === "slope-function" || graphId === "difference-quotient")
  ) {
    return "response";
  }

  if (
    kind === "optimization-constraints" &&
    (graphId === "area-vs-width" ||
      graphId === "area-slope" ||
      graphId === "height-vs-width")
  ) {
    return "response";
  }

  if (kind === "limits-continuity" && graphId === "one-sided-approach") {
    return "response";
  }

  if (
    kind === "integral-accumulation" &&
    (graphId === "source-function" || graphId === "accumulation-function")
  ) {
    return "response";
  }

  if (
    kind === "reaction-rate-collision-theory" &&
    (graphId === "rate-temperature" ||
      graphId === "rate-concentration" ||
      graphId === "success-temperature")
  ) {
    return "response";
  }

  if (kind === "dynamic-equilibrium" && graphId === "equilibrium-share") {
    return "response";
  }

  if (kind === "projectile" && graphId === "trajectory") {
    return "trajectory";
  }

  if (kind === "vectors-components" && graphId === "path") {
    return "trajectory";
  }

  if (
    kind === "dot-product-projection" &&
    (graphId === "dot-product-response" || graphId === "projection-response")
  ) {
    return "response";
  }

  if (
    kind === "vectors-2d" &&
    (graphId === "result-components" || graphId === "result-magnitude")
  ) {
    return "response";
  }

  if (
    kind === "basic-circuits" &&
    (graphId === "current-map" || graphId === "voltage-share")
  ) {
    return "response";
  }

  if (
    kind === "power-energy-circuits" &&
    (graphId === "current-voltage" ||
      graphId === "power-voltage" ||
      graphId === "power-resistance")
  ) {
    return "response";
  }

  if (
    kind === "internal-resistance-terminal-voltage" &&
    (graphId === "terminal-response" || graphId === "power-split")
  ) {
    return "response";
  }

  if (
    kind === "temperature-internal-energy" &&
    (graphId === "amount-internal-energy" || graphId === "amount-heating-rate")
  ) {
    return "response";
  }

  if (
    kind === "ideal-gas-kinetic-theory" &&
    (graphId === "pressure-volume" ||
      graphId === "pressure-temperature" ||
      graphId === "pressure-particle-count" ||
      graphId === "collision-temperature")
  ) {
    return "response";
  }

  if (
    kind === "pressure-hydrostatic" &&
    (graphId === "pressure-depth" ||
      graphId === "pressure-density" ||
      graphId === "pressure-force" ||
      graphId === "pressure-area")
  ) {
    return "response";
  }

  if (
    kind === "continuity-equation" &&
    (graphId === "speed-entry-area" ||
      graphId === "speed-middle-area" ||
      graphId === "speed-flow-rate" ||
      graphId === "flow-balance")
  ) {
    return "response";
  }

  if (
    kind === "bernoulli-principle" &&
    (graphId === "speed-throat-area" ||
      graphId === "pressure-throat-area" ||
      graphId === "pressure-flow-rate" ||
      graphId === "pressure-throat-height")
  ) {
    return "response";
  }

  if (
    kind === "buoyancy-archimedes" &&
    (graphId === "force-depth" ||
      graphId === "force-fluid-density" ||
      graphId === "required-fraction-object-density")
  ) {
    return "response";
  }

  if (
    kind === "polarization" &&
    (graphId === "power-split" || graphId === "field-projection")
  ) {
    return "response";
  }

  if (
    kind === "drag-terminal-velocity" &&
    (graphId === "terminal-speed-mass" ||
      graphId === "terminal-speed-area" ||
      graphId === "terminal-speed-drag-strength")
  ) {
    return "response";
  }

  if (
    kind === "heat-transfer" &&
    (graphId === "contact-response" || graphId === "contrast-response")
  ) {
    return "response";
  }

  if (
    kind === "specific-heat-phase-change" &&
    (graphId === "specific-heat-response" || graphId === "latent-response")
  ) {
    return "response";
  }

  if (
    kind === "series-parallel-circuits" &&
    (graphId === "branch-current" ||
      graphId === "branch-voltage" ||
      graphId === "load-power")
  ) {
    return "response";
  }

  if (
    kind === "equivalent-resistance" &&
    (graphId === "equivalent-map" ||
      graphId === "current-map" ||
      graphId === "voltage-share")
  ) {
    return "response";
  }

  if (
    kind === "electric-fields" &&
    (graphId === "field-scan" || graphId === "direction-scan")
  ) {
    return "response";
  }

  if (kind === "torque" && graphId === "direction-map") {
    return "response";
  }

  if (
    kind === "static-equilibrium-centre-of-mass" &&
    (graphId === "support-torque" ||
      graphId === "support-reactions" ||
      graphId === "cargo-stability")
  ) {
    return "response";
  }

  if (
    kind === "rotational-inertia" &&
    (graphId === "inertia-map" || graphId === "spin-up-map")
  ) {
    return "response";
  }

  if (kind === "rolling-motion" && graphId === "acceleration-map") {
    return "response";
  }

  if (
    kind === "angular-momentum" &&
    (graphId === "momentum-map" || graphId === "conserved-spin-map")
  ) {
    return "response";
  }

  if (
    kind === "gravitational-fields" &&
    (graphId === "field-components" || graphId === "strength-response")
  ) {
    return "response";
  }

  if (
    kind === "gravitational-potential" &&
    (graphId === "potential-energy-scan" || graphId === "field-link")
  ) {
    return "response";
  }

  if (
    kind === "electric-potential" &&
    (graphId === "potential-scan" || graphId === "field-link")
  ) {
    return "response";
  }

  if (kind === "capacitance-electric-energy" && graphId === "voltage-response") {
    return "response";
  }

  if (
    kind === "magnetic-fields" &&
    (graphId === "field-scan" || graphId === "direction-scan")
  ) {
    return "response";
  }

  if (
    kind === "refraction-snells-law" &&
    (graphId === "refraction-map" || graphId === "transition-map" || graphId === "bend-map")
  ) {
    return "response";
  }

  if (
    kind === "dispersion-refractive-index-color" &&
    (graphId === "index-curve" || graphId === "deviation-curve")
  ) {
    return "response";
  }

  if (kind === "mirrors" && (graphId === "image-map" || graphId === "magnification")) {
    return "response";
  }

  if (kind === "lens-imaging" && (graphId === "image-map" || graphId === "magnification")) {
    return "response";
  }

  if (kind === "damping-resonance" && graphId === "response") {
    return "response";
  }

  if (
    kind === "doppler-effect" &&
    (graphId === "source-spacing" || graphId === "observer-response")
  ) {
    return "response";
  }

  if (kind === "wave-speed-wavelength" && graphId === "phase-map") {
    return "response";
  }

  if (kind === "diffraction" && graphId === "pattern") {
    return "response";
  }

  if (kind === "optical-resolution" && graphId === "image-profile") {
    return "response";
  }

  if (kind === "double-slit-interference" && graphId === "pattern") {
    return "response";
  }

  if (kind === "wave-interference" && graphId === "pattern") {
    return "response";
  }

  if (kind === "standing-waves" && graphId === "shape") {
    return "response";
  }

  if (kind === "air-column-resonance" && (graphId === "shape" || graphId === "ladder")) {
    return "response";
  }

  if (kind === "sound-waves-longitudinal" && graphId === "intensity-response") {
    return "response";
  }

  if (
    kind === "photoelectric-effect" &&
    (graphId === "energy-balance" ||
      graphId === "collector-sweep" ||
      graphId === "intensity-sweep")
  ) {
    return "response";
  }

  if (kind === "atomic-spectra" && graphId === "spectrum-lines") {
    return "response";
  }

  if (
    kind === "de-broglie-matter-waves" &&
    (graphId === "wavelength-momentum" || graphId === "loop-fit")
  ) {
    return "response";
  }

  if (kind === "bohr-model" && graphId === "series-spectrum") {
    return "response";
  }

  return "time";
}

function pickScaleBucket(value: number, buckets = SCALE_BUCKETS) {
  const safeValue = Math.max(0, value);
  return buckets.find((bucket) => safeValue <= bucket) ?? buckets[buckets.length - 1] ?? safeValue;
}

function toProjectileInput(source: SimulationParams) {
  return {
    speed: typeof source.speed === "number" ? source.speed : undefined,
    launchSpeed: typeof source.launchSpeed === "number" ? source.launchSpeed : undefined,
    angle: typeof source.angle === "number" ? source.angle : undefined,
    launchAngle: typeof source.launchAngle === "number" ? source.launchAngle : undefined,
    gravity: typeof source.gravity === "number" ? source.gravity : undefined,
    launchHeight: typeof source.launchHeight === "number" ? source.launchHeight : undefined,
  };
}

function readNumericParam(params: SimulationParams, ...keys: string[]) {
  for (const key of keys) {
    const value = params[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return undefined;
}

function resolveParamPatch(
  kind: SimulationKind,
  currentParams: SimulationParams,
  param: string,
  value: ControlValue,
): Record<string, ControlValue> {
  if (kind === "derivative-as-slope") {
    if (param === "pointX" && typeof value === "number") {
      const nextPointX = Math.min(DERIVATIVE_SLOPE_DOMAIN_MAX, Math.max(-DERIVATIVE_SLOPE_DOMAIN_MAX, value));
      const currentDeltaX = readNumericParam(currentParams, "deltaX") ?? 0.8;
      const maxDeltaX = Math.min(DERIVATIVE_SLOPE_DELTA_MAX, DERIVATIVE_SLOPE_DOMAIN_MAX - nextPointX);

      return {
        pointX: nextPointX,
        deltaX: Math.min(Math.max(currentDeltaX, DERIVATIVE_SLOPE_DELTA_MIN), Math.max(DERIVATIVE_SLOPE_DELTA_MIN, maxDeltaX)),
      };
    }

    if (param === "deltaX" && typeof value === "number") {
      const pointX = readNumericParam(currentParams, "pointX") ?? -1.2;
      const maxDeltaX = Math.min(DERIVATIVE_SLOPE_DELTA_MAX, DERIVATIVE_SLOPE_DOMAIN_MAX - pointX);

      return {
        deltaX: Math.min(Math.max(value, DERIVATIVE_SLOPE_DELTA_MIN), Math.max(DERIVATIVE_SLOPE_DELTA_MIN, maxDeltaX)),
      };
    }

    return { [param]: value };
  }

  if (kind !== "standing-waves" && kind !== "air-column-resonance") {
    return { [param]: value };
  }

  if (param === "length" && typeof value === "number") {
    const minLength = kind === "air-column-resonance" ? AIR_COLUMN_MIN_LENGTH : STANDING_WAVES_MIN_LENGTH;
    const maxLength = kind === "air-column-resonance" ? AIR_COLUMN_MAX_LENGTH : STANDING_WAVES_MAX_LENGTH;
    const nextLength = Math.min(maxLength, Math.max(minLength, value));
    const currentProbeX = readNumericParam(currentParams, "probeX") ?? nextLength / 2;

    return {
      length: nextLength,
      probeX: Math.min(currentProbeX, nextLength),
    };
  }

  if (param === "probeX" && typeof value === "number") {
    const currentLength =
      readNumericParam(currentParams, "length") ??
      (kind === "air-column-resonance" ? AIR_COLUMN_MAX_LENGTH : STANDING_WAVES_MAX_LENGTH);

    return {
      probeX: Math.min(Math.max(0, value), currentLength),
    };
  }

  return { [param]: value };
}

function getSeriesDuration(series?: GraphSeries) {
  if (!series?.points.length) {
    return 0;
  }

  return Math.max(0, series.points[series.points.length - 1]?.x ?? 0);
}

function getSeriesStep(series?: GraphSeries) {
  if (!series?.points.length || series.points.length < 2) {
    return 1 / 30;
  }

  const duration = getSeriesDuration(series);
  return duration > 0 ? duration / (series.points.length - 1) : 1 / 30;
}

function normalizeLoopingTime(time: number, maxTime: number) {
  if (!Number.isFinite(time) || maxTime <= 0 || !Number.isFinite(maxTime)) {
    return 0;
  }

  const wrapped = time % maxTime;
  return wrapped < 0 ? wrapped + maxTime : wrapped;
}

function clampTimeCursor(time: number, maxTime: number) {
  if (!Number.isFinite(time) || maxTime <= 0 || !Number.isFinite(maxTime)) {
    return 0;
  }

  return Math.min(maxTime, Math.max(0, time));
}

function resolveStableGraphBounds(
  concept: ConceptSimulationSource,
  params: SimulationParams,
  compareState: CompareState | null,
  graphId: string,
  graphSeries: GraphSeries[],
): GraphBoundsConfig | null {
  if (concept.simulation.kind === "reaction-rate-collision-theory") {
    if (graphId === "rate-temperature" || graphId === "success-temperature") {
      const maxY =
        graphId === "success-temperature"
          ? 1
          : Math.max(
              1,
              ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
            );

      return {
        minX: REACTION_RATE_TEMPERATURE_MIN,
        maxX: REACTION_RATE_TEMPERATURE_MAX,
        minY: 0,
        maxY:
          graphId === "success-temperature"
            ? 1
            : pickScaleBucket(maxY * 1.08),
      };
    }

    if (graphId === "rate-concentration") {
      const maxY = Math.max(
        1,
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
      );

      return {
        minX: REACTION_RATE_CONCENTRATION_MIN,
        maxX: REACTION_RATE_CONCENTRATION_MAX,
        minY: 0,
        maxY: pickScaleBucket(maxY * 1.08),
      };
    }
  }

  if (concept.simulation.kind === "dynamic-equilibrium") {
    if (graphId === "concentration-history") {
      const setups = compareState
        ? [compareState.setupA.params, compareState.setupB.params]
        : [params];
      const maxAmount = Math.max(
        1,
        ...setups.map(
          (setup) =>
            Number(setup.reactantAmount ?? 14) + Number(setup.productAmount ?? 4),
        ),
      );

      return {
        minX: 0,
        maxX: DYNAMIC_EQUILIBRIUM_TOTAL_TIME,
        minY: 0,
        maxY: pickScaleBucket(maxAmount * 1.08),
      };
    }

    if (graphId === "rate-balance") {
      const maxRate = Math.max(
        1,
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
      );

      return {
        minX: 0,
        maxX: DYNAMIC_EQUILIBRIUM_TOTAL_TIME,
        minY: 0,
        maxY: pickScaleBucket(maxRate * 1.08),
      };
    }

    if (graphId === "equilibrium-share") {
      return {
        minX: DYNAMIC_EQUILIBRIUM_PRODUCT_FAVOR_MIN,
        maxX: DYNAMIC_EQUILIBRIUM_PRODUCT_FAVOR_MAX,
        minY: 0,
        maxY: 1,
      };
    }
  }

  if (concept.simulation.kind === "integral-accumulation") {
    if (graphId === "source-function") {
      return {
        minX: INTEGRAL_ACCUMULATION_DOMAIN_MIN,
        maxX: INTEGRAL_ACCUMULATION_DOMAIN_MAX,
        minY: -2.8,
        maxY: 1.4,
      };
    }

    if (graphId === "accumulation-function") {
      return {
        minX: INTEGRAL_ACCUMULATION_DOMAIN_MIN,
        maxX: INTEGRAL_ACCUMULATION_DOMAIN_MAX,
        minY: -1.6,
        maxY: 1.6,
      };
    }
  }

  if (concept.simulation.kind === "optimization-constraints") {
    if (graphId === "area-vs-width") {
      return {
        minX: OPTIMIZATION_CONSTRAINTS_WIDTH_MIN,
        maxX: OPTIMIZATION_CONSTRAINTS_WIDTH_MAX,
        minY: 0,
        maxY: 40,
      };
    }

    if (graphId === "area-slope") {
      return {
        minX: OPTIMIZATION_CONSTRAINTS_WIDTH_MIN,
        maxX: OPTIMIZATION_CONSTRAINTS_WIDTH_MAX,
        minY: -12,
        maxY: 12,
      };
    }

    if (graphId === "height-vs-width") {
      return {
        minX: OPTIMIZATION_CONSTRAINTS_WIDTH_MIN,
        maxX: OPTIMIZATION_CONSTRAINTS_WIDTH_MAX,
        minY: 0,
        maxY: OPTIMIZATION_CONSTRAINTS_WIDTH_MAX,
      };
    }
  }

  if (concept.simulation.kind === "limits-continuity" && graphId === "one-sided-approach") {
    return {
      minX: LIMITS_CONTINUITY_DISTANCE_MIN,
      maxX: LIMITS_CONTINUITY_DISTANCE_MAX,
      minY: -6.4,
      maxY: 6.4,
    };
  }

  if (concept.simulation.kind === "rational-functions" && graphId === "asymptote-response") {
    return {
      minX: RATIONAL_FUNCTIONS_DISTANCE_MIN,
      maxX: RATIONAL_FUNCTIONS_DISTANCE_MAX,
      minY: -10,
      maxY: 10,
    };
  }

  if (concept.simulation.kind === "matrix-transformations") {
    const maxAbsValue = Math.max(
      ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => Math.abs(point.y))),
      1,
    );
    const bound = pickScaleBucket(maxAbsValue * 1.08);

    return {
      minX: MATRIX_TRANSFORMATIONS_BLEND_MIN,
      maxX: MATRIX_TRANSFORMATIONS_BLEND_MAX,
      minY: graphId === "basis-length-blend" ? 0 : -bound,
      maxY: graphId === "basis-length-blend" ? bound : bound,
    };
  }

  if (concept.simulation.kind === "exponential-change") {
    const setups = compareState
      ? [compareState.setupA.params, compareState.setupB.params]
      : [params];
    const viewport = resolveExponentialChangeViewport(setups);

    if (graphId === "change-curve") {
      return {
        minX: 0,
        maxX: EXPONENTIAL_CHANGE_TIME_MAX,
        minY: 0,
        maxY: pickScaleBucket(viewport.amountMax * 1.08),
      };
    }

    if (graphId === "log-view") {
      const bound = pickScaleBucket(viewport.logAbsMax * 1.12);

      return {
        minX: 0,
        maxX: EXPONENTIAL_CHANGE_TIME_MAX,
        minY: -bound,
        maxY: bound,
      };
    }
  }

  if (concept.simulation.kind === "dot-product-projection") {
    if (
      graphId === "dot-product-response" ||
      graphId === "projection-response"
    ) {
      const bound = Math.max(
        1,
        pickScaleBucket(
          Math.max(
            ...graphSeries.flatMap((seriesItem) =>
              seriesItem.points.map((point) => Math.abs(point.y)),
            ),
            1,
          ) * 1.08,
        ),
      );

      return {
        minX: DOT_PRODUCT_PROJECTION_RESPONSE_MIN_ANGLE,
        maxX: DOT_PRODUCT_PROJECTION_RESPONSE_MAX_ANGLE,
        minY: -bound,
        maxY: bound,
      };
    }
  }

  if (concept.simulation.kind === "vectors-2d") {
    if (graphId === "result-components") {
      const bound = Math.max(
        1,
        pickScaleBucket(
          Math.max(
            ...graphSeries.flatMap((seriesItem) =>
              seriesItem.points.map((point) => Math.abs(point.y)),
            ),
            1,
          ) * 1.08,
        ),
      );

      return {
        minX: VECTORS_2D_SCALAR_MIN,
        maxX: VECTORS_2D_SCALAR_MAX,
        minY: -bound,
        maxY: bound,
      };
    }

    if (graphId === "result-magnitude") {
      const maxMagnitude = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        1,
      );

      return {
        minX: VECTORS_2D_SCALAR_MIN,
        maxX: VECTORS_2D_SCALAR_MAX,
        minY: 0,
        maxY: pickScaleBucket(maxMagnitude * 1.08),
      };
    }
  }

  if (concept.simulation.kind === "complex-numbers-plane") {
    const maxAbsValue = Math.max(
      ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => Math.abs(point.y))),
      1,
    );
    const bound = pickScaleBucket(maxAbsValue * 1.12);

    return {
      minX: COMPLEX_NUMBERS_PLANE_COMPONENT_MIN,
      maxX: COMPLEX_NUMBERS_PLANE_COMPONENT_MAX,
      minY: -bound,
      maxY: bound,
    };
  }

  if (concept.simulation.kind === "unit-circle-rotation") {
    if (graphId === "projection-history") {
      return {
        minX: 0,
        maxX: UNIT_CIRCLE_ROTATION_TIME_MAX,
        minY: -1.15,
        maxY: 1.15,
      };
    }

    if (graphId === "angle-history") {
      const maxAngle = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        1,
      );

      return {
        minX: 0,
        maxX: UNIT_CIRCLE_ROTATION_TIME_MAX,
        minY: 0,
        maxY: pickScaleBucket(maxAngle * 1.08),
      };
    }

    if (graphId === "identity-balance") {
      return {
        minX: 0,
        maxX: UNIT_CIRCLE_ROTATION_TIME_MAX,
        minY: 0,
        maxY: 1.15,
      };
    }
  }

  if (concept.simulation.kind === "polar-coordinates") {
    if (graphId === "coordinate-sweep") {
      const maxAbsValue = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => Math.abs(point.y))),
        1,
      );
      const bound = pickScaleBucket(maxAbsValue * 1.08);

      return {
        minX: POLAR_COORDINATES_ANGLE_MIN,
        maxX: POLAR_COORDINATES_ANGLE_MAX,
        minY: -bound,
        maxY: bound,
      };
    }

    if (graphId === "angle-recovery") {
      return {
        minX: POLAR_COORDINATES_ANGLE_MIN,
        maxX: POLAR_COORDINATES_ANGLE_MAX,
        minY: -100,
        maxY: 370,
      };
    }
  }

  if (concept.simulation.kind === "parametric-curves-motion") {
    if (graphId === "coordinate-time") {
      const maxAbsValue = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => Math.abs(point.y))),
        1,
      );
      const bound = pickScaleBucket(maxAbsValue * 1.08);

      return {
        minX: 0,
        maxX: PARAMETRIC_CURVES_TIME_MAX,
        minY: -bound,
        maxY: bound,
      };
    }

    if (graphId === "speed-history") {
      const maxSpeed = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        1,
      );

      return {
        minX: 0,
        maxX: PARAMETRIC_CURVES_TIME_MAX,
        minY: 0,
        maxY: pickScaleBucket(maxSpeed * 1.08),
      };
    }
  }

  if (concept.simulation.kind === "concentration-dilution") {
    const maxConcentration = Math.max(
      ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
      1,
    );

    if (graphId === "concentration-vs-solvent") {
      return {
        minX: CONCENTRATION_DILUTION_VOLUME_MIN,
        maxX: CONCENTRATION_DILUTION_VOLUME_MAX,
        minY: 0,
        maxY: pickScaleBucket(maxConcentration * 1.08),
      };
    }

    if (graphId === "concentration-vs-solute") {
      return {
        minX: CONCENTRATION_DILUTION_SOLUTE_MIN,
        maxX: CONCENTRATION_DILUTION_SOLUTE_MAX,
        minY: 0,
        maxY: pickScaleBucket(maxConcentration * 1.08),
      };
    }
  }

  if (concept.simulation.kind === "stoichiometry-recipe") {
    if (graphId === "batches-vs-reactant-a" || graphId === "batches-vs-reactant-b") {
      const maxValue = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        1,
      );

      return {
        minX: STOICHIOMETRY_RECIPE_AMOUNT_MIN,
        maxX: STOICHIOMETRY_RECIPE_AMOUNT_MAX,
        minY: 0,
        maxY: pickScaleBucket(maxValue * 1.08),
      };
    }

    if (graphId === "yield-vs-percent") {
      const maxValue = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        1,
      );

      return {
        minX: STOICHIOMETRY_RECIPE_YIELD_PERCENT_MIN,
        maxX: STOICHIOMETRY_RECIPE_YIELD_PERCENT_MAX,
        minY: 0,
        maxY: pickScaleBucket(maxValue * 1.08),
      };
    }
  }

  if (concept.simulation.kind === "solubility-saturation") {
    if (graphId === "dissolved-vs-solute" || graphId === "excess-vs-solute") {
      const maxValue = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        1,
      );

      return {
        minX: SOLUBILITY_SATURATION_SOLUTE_MIN,
        maxX: SOLUBILITY_SATURATION_SOLUTE_MAX,
        minY: 0,
        maxY: pickScaleBucket(maxValue * 1.08),
      };
    }

    if (graphId === "capacity-vs-solvent") {
      const maxValue = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        1,
      );

      return {
        minX: SOLUBILITY_SATURATION_VOLUME_MIN,
        maxX: SOLUBILITY_SATURATION_VOLUME_MAX,
        minY: 0,
        maxY: pickScaleBucket(maxValue * 1.08),
      };
    }

    if (graphId === "saturation-vs-limit") {
      return {
        minX: SOLUBILITY_SATURATION_LIMIT_MIN,
        maxX: SOLUBILITY_SATURATION_LIMIT_MAX,
        minY: 0,
        maxY: 2.6,
      };
    }
  }

  if (concept.simulation.kind === "acid-base-ph") {
    if (graphId === "ph-vs-acid" || graphId === "ph-vs-base") {
      return {
        minX: ACID_BASE_AMOUNT_MIN,
        maxX: ACID_BASE_AMOUNT_MAX,
        minY: 0,
        maxY: 14,
      };
    }
  }

  if (concept.simulation.kind === "buffers-neutralization") {
    if (graphId === "ph-vs-acid") {
      return {
        minX: BUFFERS_NEUTRALIZATION_AMOUNT_MIN,
        maxX: BUFFERS_NEUTRALIZATION_AMOUNT_MAX,
        minY: 0,
        maxY: 14,
      };
    }

    if (graphId === "buffer-remaining-vs-acid") {
      return {
        minX: BUFFERS_NEUTRALIZATION_AMOUNT_MIN,
        maxX: BUFFERS_NEUTRALIZATION_AMOUNT_MAX,
        minY: BUFFERS_NEUTRALIZATION_BUFFER_MIN,
        maxY: BUFFERS_NEUTRALIZATION_BUFFER_MAX,
      };
    }
  }

  if (concept.simulation.kind === "shm") {
    switch (graphId) {
      case "displacement":
        return { minX: 0, maxX: 8, minY: -3.2, maxY: 3.2 };
      case "velocity":
        return { minX: 0, maxX: 8, minY: -12.5, maxY: 12.5 };
      case "acceleration":
        return { minX: 0, maxX: 8, minY: -50, maxY: 50 };
      case "energy": {
        const setups = compareState
          ? [compareState.setupA.params, compareState.setupB.params]
          : [params];
        const maxEnergy = Math.max(
          ...setups.map((setup) => {
            const amplitude = Math.abs(readNumericParam(setup, "amplitude") ?? 1);
            const mass = readNumericParam(setup, "mass") ?? 1;
            const phase = readNumericParam(setup, "phase") ?? 0;
            const springConstant = resolveSpringConstant({
              amplitude,
              angularFrequency: readNumericParam(setup, "omega", "angularFrequency"),
              springConstant: readNumericParam(setup, "springConstant"),
              mass,
              phase,
              equilibriumShift: readNumericParam(setup, "equilibriumShift"),
              damping: readNumericParam(setup, "damping"),
            });

            return 0.5 * springConstant * amplitude * amplitude;
          }),
          0.5,
        );

        return {
          minX: 0,
          maxX: 8,
          minY: 0,
          maxY: pickScaleBucket(maxEnergy * 1.12),
        };
      }
      default:
        return null;
    }
  }

  if (concept.simulation.kind === "ucm") {
    switch (graphId) {
      case "projections":
        return { minX: 0, maxX: 8, minY: -2.2, maxY: 2.2 };
      case "velocity":
        return { minX: 0, maxX: 8, minY: -6.8, maxY: 6.8 };
      case "angle":
        return { minX: 0, maxX: 8, minY: 0, maxY: 32 };
      default:
        return null;
    }
  }

  if (concept.simulation.kind === "torque") {
    const maxAbsValue = Math.max(
      ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => Math.abs(point.y))),
      0.5,
    );
    const yLimit = Math.max(1, pickScaleBucket(maxAbsValue * 1.14));

    switch (graphId) {
      case "torque":
        return { minX: 0, maxX: TORQUE_TOTAL_TIME, minY: -yLimit, maxY: yLimit };
      case "angular-speed":
        return { minX: 0, maxX: TORQUE_TOTAL_TIME, minY: -yLimit, maxY: yLimit };
      case "rotation-angle":
        return { minX: 0, maxX: TORQUE_TOTAL_TIME, minY: -yLimit, maxY: yLimit };
      case "direction-map":
        return {
          minX: -180,
          maxX: 180,
          minY: -yLimit,
          maxY: yLimit,
          xTicks: 8,
        };
      default:
        return null;
    }
  }

  if (concept.simulation.kind === "static-equilibrium-centre-of-mass") {
    const maxAbsValue = Math.max(
      ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => Math.abs(point.y))),
      0.25,
    );
    const yLimit = Math.max(0.5, pickScaleBucket(maxAbsValue * 1.1));

    switch (graphId) {
      case "support-torque":
      case "support-reactions":
        return {
          minX: STATIC_EQUILIBRIUM_MIN_SUPPORT_CENTER,
          maxX: STATIC_EQUILIBRIUM_MAX_SUPPORT_CENTER,
          minY: -yLimit,
          maxY: yLimit,
          xTicks: 7,
        };
      case "cargo-stability":
        return {
          minX: STATIC_EQUILIBRIUM_MIN_CARGO_POSITION,
          maxX: STATIC_EQUILIBRIUM_MAX_CARGO_POSITION,
          minY: -yLimit,
          maxY: yLimit,
          xTicks: 7,
        };
      default:
        return null;
    }
  }

  if (concept.simulation.kind === "rotational-inertia") {
    const maxAbsValue = Math.max(
      ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => Math.abs(point.y))),
      0.5,
    );
    const yLimit = Math.max(1, pickScaleBucket(maxAbsValue * 1.14));

    switch (graphId) {
      case "angular-speed":
        return { minX: 0, maxX: ROTATIONAL_INERTIA_TOTAL_TIME, minY: 0, maxY: yLimit };
      case "rotation-angle":
        return { minX: 0, maxX: ROTATIONAL_INERTIA_TOTAL_TIME, minY: 0, maxY: yLimit };
      case "inertia-map":
        return {
          minX: 0.18,
          maxX: 1.15,
          minY: 0,
          maxY: yLimit,
          xTicks: 6,
        };
      case "spin-up-map":
        return {
          minX: 0.18,
          maxX: 1.15,
          minY: 0,
          maxY: yLimit,
          xTicks: 6,
        };
      default:
        return null;
    }
  }

  if (concept.simulation.kind === "rolling-motion") {
    const maxAbsValue = Math.max(
      ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => Math.abs(point.y))),
      0.5,
    );
    const yLimit = Math.max(1, pickScaleBucket(maxAbsValue * 1.14));
    const duration = Math.max(...graphSeries.map((seriesItem) => getSeriesDuration(seriesItem)), 1.2);

    switch (graphId) {
      case "distance":
      case "speed-link":
      case "energy-split":
        return { minX: 0, maxX: duration, minY: 0, maxY: yLimit };
      case "acceleration-map":
        return {
          minX: 0.4,
          maxX: 1,
          minY: 0,
          maxY: yLimit,
          xTicks: 7,
        };
      default:
        return null;
    }
  }

  if (concept.simulation.kind === "angular-momentum") {
    const maxAbsValue = Math.max(
      ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => Math.abs(point.y))),
      0.5,
    );
    const yLimit = Math.max(1, pickScaleBucket(maxAbsValue * 1.14));

    switch (graphId) {
      case "rotation-angle":
        return { minX: 0, maxX: ANGULAR_MOMENTUM_TOTAL_TIME, minY: 0, maxY: yLimit };
      case "momentum-map":
        return {
          minX: 0.18,
          maxX: 1.15,
          minY: 0,
          maxY: yLimit,
          xTicks: 6,
        };
      case "conserved-spin-map":
        return {
          minX: 0.18,
          maxX: 1.15,
          minY: 0,
          maxY: yLimit,
          xTicks: 6,
        };
      default:
        return null;
    }
  }

  if (concept.simulation.kind === "circular-orbits") {
    const duration = Math.max(...graphSeries.map((seriesItem) => getSeriesDuration(seriesItem)), 0);

    if (graphId === "radius-history") {
      const maxRadius = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        1.2,
      );

      return {
        minX: 0,
        maxX: duration,
        minY: 0,
        maxY: Math.max(1.4, Math.ceil(maxRadius * 10) / 10),
      };
    }

    if (graphId === "speed-history") {
      const maxSpeed = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        1,
      );

      return {
        minX: 0,
        maxX: duration,
        minY: 0,
        maxY: Math.max(1.4, Math.ceil(maxSpeed * 4) / 4),
      };
    }

    if (graphId === "acceleration-balance") {
      const maxAcceleration = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        1,
      );

      return {
        minX: 0,
        maxX: duration,
        minY: 0,
        maxY: Math.max(1.4, Math.ceil(maxAcceleration * 2) / 2),
      };
    }

    return null;
  }

  if (concept.simulation.kind === "escape-velocity") {
    const duration = Math.max(...graphSeries.map((seriesItem) => getSeriesDuration(seriesItem)), 0);

    if (graphId === "radius-history") {
      const maxRadius = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        1.2,
      );

      return {
        minX: 0,
        maxX: duration,
        minY: 0,
        maxY: Math.max(2, Math.ceil(maxRadius)),
      };
    }

    if (graphId === "speed-thresholds") {
      const maxSpeed = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        1,
      );

      return {
        minX: 0,
        maxX: duration,
        minY: 0,
        maxY: Math.max(1.6, Math.ceil(maxSpeed * 2) / 2),
      };
    }

    if (graphId === "specific-energy") {
      const maxMagnitude = Math.max(
        ...graphSeries.flatMap((seriesItem) =>
          seriesItem.points.map((point) => Math.abs(point.y)),
        ),
        0.5,
      );
      const bound = pickScaleBucket(maxMagnitude * 1.12);

      return {
        minX: 0,
        maxX: duration,
        minY: -bound,
        maxY: bound,
      };
    }

    return null;
  }

  if (concept.simulation.kind === "damping-resonance") {
    if (graphId === "transient") {
      return { minX: 0, maxX: 10, minY: -2.2, maxY: 2.2 };
    }

    if (graphId === "response") {
      const maxResponse = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        0.5,
      );
      return {
        minX: 0,
        maxX: 4.2,
        minY: 0,
        maxY: pickScaleBucket(maxResponse * 1.08),
      };
    }

    return null;
  }

  if (concept.simulation.kind === "projectile") {
    const projectileInputs = compareState
      ? [toProjectileInput(compareState.setupA.params), toProjectileInput(compareState.setupB.params)]
      : [toProjectileInput(params)];
    const viewport = resolveProjectileViewport(projectileInputs);

    if (graphId === "trajectory") {
      return {
        minX: 0,
        maxX: viewport.maxRange,
        minY: 0,
        maxY: viewport.maxHeight,
      };
    }

    if (graphId === "components") {
      return {
        minX: 0,
        maxX: viewport.maxTime,
        minY: 0,
        maxY: viewport.maxRange,
      };
    }

    if (graphId === "velocity") {
      return {
        minX: 0,
        maxX: viewport.maxTime,
        minY: -32,
        maxY: 32,
      };
    }
  }

  if (concept.simulation.kind === "momentum-impulse") {
    const extents = resolveMomentumImpulseExtents(
      compareState
        ? [compareState.setupA.params, compareState.setupB.params]
        : [params],
    );
    const forceBound = pickScaleBucket(extents.maxAbsForce * 1.12);
    const momentumBound = pickScaleBucket(extents.maxAbsMomentum * 1.12);
    const impulseBound = pickScaleBucket(extents.maxAbsImpulse * 1.12);

    if (graphId === "force") {
      return {
        minX: 0,
        maxX: MOMENTUM_IMPULSE_TOTAL_TIME,
        minY: -forceBound,
        maxY: forceBound,
      };
    }

    if (graphId === "momentum") {
      return {
        minX: 0,
        maxX: MOMENTUM_IMPULSE_TOTAL_TIME,
        minY: -momentumBound,
        maxY: momentumBound,
      };
    }

    if (graphId === "impulse") {
      return {
        minX: 0,
        maxX: MOMENTUM_IMPULSE_TOTAL_TIME,
        minY: -impulseBound,
        maxY: impulseBound,
      };
    }
  }

  if (concept.simulation.kind === "conservation-of-momentum") {
    const extents = resolveConservationMomentumExtents(
      compareState
        ? [compareState.setupA.params, compareState.setupB.params]
        : [params],
    );
    const forceBound = pickScaleBucket(extents.maxAbsForce * 1.12);
    const momentumBound = pickScaleBucket(extents.maxAbsMomentum * 1.12);
    const velocityBound = pickScaleBucket(extents.maxAbsVelocity * 1.12);

    if (graphId === "forces") {
      return {
        minX: 0,
        maxX: CONSERVATION_MOMENTUM_TOTAL_TIME,
        minY: -forceBound,
        maxY: forceBound,
      };
    }

    if (graphId === "momenta") {
      return {
        minX: 0,
        maxX: CONSERVATION_MOMENTUM_TOTAL_TIME,
        minY: -momentumBound,
        maxY: momentumBound,
      };
    }

    if (graphId === "velocity") {
      return {
        minX: 0,
        maxX: CONSERVATION_MOMENTUM_TOTAL_TIME,
        minY: -velocityBound,
        maxY: velocityBound,
      };
    }
  }

  if (concept.simulation.kind === "collisions") {
    const extents = resolveCollisionsExtents(
      compareState
        ? [compareState.setupA.params, compareState.setupB.params]
        : [params],
    );
    const velocityBound = pickScaleBucket(extents.maxAbsVelocity * 1.12);
    const momentumBound = pickScaleBucket(extents.maxAbsMomentum * 1.12);
    const energyBound = pickScaleBucket(extents.maxEnergy * 1.12);

    if (graphId === "velocity") {
      return {
        minX: 0,
        maxX: COLLISIONS_TOTAL_TIME,
        minY: -velocityBound,
        maxY: velocityBound,
      };
    }

    if (graphId === "momentum") {
      return {
        minX: 0,
        maxX: COLLISIONS_TOTAL_TIME,
        minY: -momentumBound,
        maxY: momentumBound,
      };
    }

    if (graphId === "energy") {
      return {
        minX: 0,
        maxX: COLLISIONS_TOTAL_TIME,
        minY: 0,
        maxY: energyBound,
      };
    }
  }

  if (concept.simulation.kind === "vectors-components") {
    const viewport = resolveVectorsComponentsViewport(
      compareState
        ? [compareState.setupA.params, compareState.setupB.params]
        : [params],
    );

    if (graphId === "path") {
      return {
        minX: -viewport.maxAbsPosition,
        maxX: viewport.maxAbsPosition,
        minY: -viewport.maxAbsPosition,
        maxY: viewport.maxAbsPosition,
      };
    }

    if (graphId === "position") {
      return {
        minX: 0,
        maxX: viewport.duration,
        minY: -viewport.maxAbsPosition,
        maxY: viewport.maxAbsPosition,
      };
    }

    if (graphId === "components") {
      return {
        minX: 0,
        maxX: viewport.duration,
        minY: -viewport.maxAbsComponent,
        maxY: viewport.maxAbsComponent,
      };
    }
  }

  if (concept.simulation.kind === "basic-circuits") {
    if (graphId === "current-map") {
      const maxCurrent = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        0.5,
      );

      return {
        minX: 0,
        maxX: BASIC_CIRCUITS_MAX_VOLTAGE,
        minY: 0,
        maxY: pickScaleBucket(maxCurrent * 1.08),
      };
    }

    if (graphId === "voltage-share") {
      const maxVoltage = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        readNumericParam(params, "voltage") ?? 12,
        0.5,
      );

      return {
        minX: BASIC_CIRCUITS_MIN_RESISTANCE,
        maxX: BASIC_CIRCUITS_MAX_RESISTANCE,
        minY: 0,
        maxY: pickScaleBucket(maxVoltage * 1.04),
      };
    }
  }

  if (concept.simulation.kind === "power-energy-circuits") {
    if (graphId === "energy-transfer") {
      const maxEnergy = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        1,
      );

      return {
        minX: 0,
        maxX: POWER_ENERGY_CIRCUITS_MAX_TIME,
        minY: 0,
        maxY: pickScaleBucket(maxEnergy * 1.08),
      };
    }

    if (graphId === "current-voltage") {
      const maxCurrent = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        0.5,
      );

      return {
        minX: 0,
        maxX: POWER_ENERGY_CIRCUITS_MAX_VOLTAGE,
        minY: 0,
        maxY: pickScaleBucket(maxCurrent * 1.08),
      };
    }

    if (graphId === "power-voltage") {
      const maxPower = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        1,
      );

      return {
        minX: 0,
        maxX: POWER_ENERGY_CIRCUITS_MAX_VOLTAGE,
        minY: 0,
        maxY: pickScaleBucket(maxPower * 1.08),
      };
    }

    if (graphId === "power-resistance") {
      const maxPower = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        1,
      );

      return {
        minX: POWER_ENERGY_CIRCUITS_MIN_RESISTANCE,
        maxX: POWER_ENERGY_CIRCUITS_MAX_RESISTANCE,
        minY: 0,
        maxY: pickScaleBucket(maxPower * 1.08),
      };
    }
  }

  if (concept.simulation.kind === "rc-charging-discharging") {
    const duration = Math.max(
      ...(compareState
        ? [compareState.setupA.params, compareState.setupB.params]
        : [params]
      ).map((entry) => resolveRcChargingDischargingDuration(entry)),
      4,
    );

    if (graphId === "voltage-time") {
      const maxVoltage = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        1,
      );

      return {
        minX: 0,
        maxX: duration,
        minY: 0,
        maxY: pickScaleBucket(maxVoltage * 1.08),
      };
    }

    if (graphId === "normalized-response") {
      return {
        minX: 0,
        maxX: duration,
        minY: 0,
        maxY: 1.05,
      };
    }
  }

  if (concept.simulation.kind === "internal-resistance-terminal-voltage") {
    if (graphId === "terminal-response") {
      const maxVoltage = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        1,
      );

      return {
        minX: INTERNAL_SOURCE_MIN_LOAD_RESISTANCE,
        maxX: INTERNAL_SOURCE_MAX_LOAD_RESISTANCE,
        minY: 0,
        maxY: pickScaleBucket(maxVoltage * 1.08),
      };
    }

    if (graphId === "power-split") {
      const maxPower = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        0.5,
      );

      return {
        minX: INTERNAL_SOURCE_MIN_LOAD_RESISTANCE,
        maxX: INTERNAL_SOURCE_MAX_LOAD_RESISTANCE,
        minY: 0,
        maxY: pickScaleBucket(maxPower * 1.08),
      };
    }
  }

  if (concept.simulation.kind === "temperature-internal-energy") {
    if (graphId === "temperature-history") {
      const maxTemperature = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        1,
      );

      return {
        minX: 0,
        maxX: TEMPERATURE_INTERNAL_ENERGY_MAX_TIME,
        minY: 0,
        maxY: pickScaleBucket(maxTemperature * 1.08),
      };
    }

    if (graphId === "energy-breakdown") {
      const maxEnergy = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        1,
      );

      return {
        minX: 0,
        maxX: TEMPERATURE_INTERNAL_ENERGY_MAX_TIME,
        minY: 0,
        maxY: pickScaleBucket(maxEnergy * 1.08),
      };
    }

    if (
      graphId === "amount-internal-energy" ||
      graphId === "amount-heating-rate"
    ) {
      const maxResponse = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        0.25,
      );

      return {
        minX: TEMPERATURE_INTERNAL_ENERGY_MIN_PARTICLE_COUNT,
        maxX: TEMPERATURE_INTERNAL_ENERGY_MAX_PARTICLE_COUNT,
        minY: 0,
        maxY: pickScaleBucket(maxResponse * 1.08),
      };
    }
  }

  if (concept.simulation.kind === "ideal-gas-kinetic-theory") {
    const maxResponse = Math.max(
      ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
      0.25,
    );

    if (graphId === "pressure-volume") {
      return {
        minX: IDEAL_GAS_KINETIC_MIN_VOLUME,
        maxX: IDEAL_GAS_KINETIC_MAX_VOLUME,
        minY: 0,
        maxY: pickScaleBucket(maxResponse * 1.08),
      };
    }

    if (graphId === "pressure-temperature" || graphId === "collision-temperature") {
      return {
        minX: IDEAL_GAS_KINETIC_MIN_TEMPERATURE,
        maxX: IDEAL_GAS_KINETIC_MAX_TEMPERATURE,
        minY: 0,
        maxY: pickScaleBucket(maxResponse * 1.08),
      };
    }

    if (graphId === "pressure-particle-count") {
      return {
        minX: IDEAL_GAS_KINETIC_MIN_PARTICLE_COUNT,
        maxX: IDEAL_GAS_KINETIC_MAX_PARTICLE_COUNT,
        minY: 0,
        maxY: pickScaleBucket(maxResponse * 1.08),
      };
    }
  }

  if (concept.simulation.kind === "pressure-hydrostatic") {
    const maxResponse = Math.max(
      ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
      0.25,
    );

    if (graphId === "pressure-depth") {
      return {
        minX: PRESSURE_HYDROSTATIC_MIN_DEPTH,
        maxX: PRESSURE_HYDROSTATIC_MAX_DEPTH,
        minY: 0,
        maxY: pickScaleBucket(maxResponse * 1.08),
      };
    }

    if (graphId === "pressure-density") {
      return {
        minX: PRESSURE_HYDROSTATIC_MIN_DENSITY,
        maxX: PRESSURE_HYDROSTATIC_MAX_DENSITY,
        minY: 0,
        maxY: pickScaleBucket(maxResponse * 1.08),
      };
    }

    if (graphId === "pressure-force") {
      return {
        minX: PRESSURE_HYDROSTATIC_MIN_FORCE,
        maxX: PRESSURE_HYDROSTATIC_MAX_FORCE,
        minY: 0,
        maxY: pickScaleBucket(maxResponse * 1.08),
      };
    }

    if (graphId === "pressure-area") {
      return {
        minX: PRESSURE_HYDROSTATIC_MIN_AREA,
        maxX: PRESSURE_HYDROSTATIC_MAX_AREA,
        minY: 0,
        maxY: pickScaleBucket(maxResponse * 1.08),
      };
    }
  }

  if (concept.simulation.kind === "continuity-equation") {
    const maxResponse = Math.max(
      ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
      0.25,
    );

    if (graphId === "speed-entry-area") {
      return {
        minX: CONTINUITY_EQUATION_MIN_ENTRY_AREA,
        maxX: CONTINUITY_EQUATION_MAX_ENTRY_AREA,
        minY: 0,
        maxY: pickScaleBucket(maxResponse * 1.08),
      };
    }

    if (graphId === "speed-middle-area" || graphId === "flow-balance") {
      return {
        minX: CONTINUITY_EQUATION_MIN_MIDDLE_AREA,
        maxX: CONTINUITY_EQUATION_MAX_MIDDLE_AREA,
        minY: 0,
        maxY: pickScaleBucket(maxResponse * 1.08),
      };
    }

    if (graphId === "speed-flow-rate") {
      return {
        minX: CONTINUITY_EQUATION_MIN_FLOW_RATE,
        maxX: CONTINUITY_EQUATION_MAX_FLOW_RATE,
        minY: 0,
        maxY: pickScaleBucket(maxResponse * 1.08),
      };
    }
  }

  if (concept.simulation.kind === "bernoulli-principle") {
    const maxResponse = Math.max(
      ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
      0.25,
    );

    if (graphId === "speed-throat-area" || graphId === "pressure-throat-area") {
      return {
        minX: BERNOULLI_PRINCIPLE_MIN_THROAT_AREA,
        maxX: BERNOULLI_PRINCIPLE_MAX_THROAT_AREA,
        minY: 0,
        maxY: pickScaleBucket(maxResponse * 1.08),
      };
    }

    if (graphId === "pressure-flow-rate") {
      return {
        minX: BERNOULLI_PRINCIPLE_MIN_FLOW_RATE,
        maxX: BERNOULLI_PRINCIPLE_MAX_FLOW_RATE,
        minY: 0,
        maxY: pickScaleBucket(maxResponse * 1.08),
      };
    }

    if (graphId === "pressure-throat-height") {
      return {
        minX: BERNOULLI_PRINCIPLE_MIN_THROAT_HEIGHT,
        maxX: BERNOULLI_PRINCIPLE_MAX_THROAT_HEIGHT,
        minY: 0,
        maxY: pickScaleBucket(maxResponse * 1.08),
      };
    }
  }

  if (concept.simulation.kind === "buoyancy-archimedes") {
    const maxResponse = Math.max(
      ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
      0.25,
    );

    if (graphId === "force-depth") {
      return {
        minX: BUOYANCY_ARCHIMEDES_MIN_BOTTOM_DEPTH,
        maxX: BUOYANCY_ARCHIMEDES_MAX_BOTTOM_DEPTH,
        minY: 0,
        maxY: pickScaleBucket(maxResponse * 1.08),
      };
    }

    if (graphId === "force-fluid-density") {
      return {
        minX: BUOYANCY_ARCHIMEDES_MIN_FLUID_DENSITY,
        maxX: BUOYANCY_ARCHIMEDES_MAX_FLUID_DENSITY,
        minY: 0,
        maxY: pickScaleBucket(maxResponse * 1.08),
      };
    }

    if (graphId === "required-fraction-object-density") {
      return {
        minX: BUOYANCY_ARCHIMEDES_MIN_OBJECT_DENSITY,
        maxX: BUOYANCY_ARCHIMEDES_MAX_OBJECT_DENSITY,
        minY: 0,
        maxY: pickScaleBucket(maxResponse * 1.08),
      };
    }
  }

  if (concept.simulation.kind === "drag-terminal-velocity") {
    const maxResponse = Math.max(
      ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
      0.25,
    );

    if (graphId === "terminal-speed-mass") {
      return {
        minX: DRAG_TERMINAL_VELOCITY_MIN_MASS,
        maxX: DRAG_TERMINAL_VELOCITY_MAX_MASS,
        minY: 0,
        maxY: pickScaleBucket(maxResponse * 1.08),
      };
    }

    if (graphId === "terminal-speed-area") {
      return {
        minX: DRAG_TERMINAL_VELOCITY_MIN_AREA,
        maxX: DRAG_TERMINAL_VELOCITY_MAX_AREA,
        minY: 0,
        maxY: pickScaleBucket(maxResponse * 1.08),
      };
    }

    if (graphId === "terminal-speed-drag-strength") {
      return {
        minX: DRAG_TERMINAL_VELOCITY_MIN_DRAG_STRENGTH,
        maxX: DRAG_TERMINAL_VELOCITY_MAX_DRAG_STRENGTH,
        minY: 0,
        maxY: pickScaleBucket(maxResponse * 1.08),
      };
    }
  }

  if (concept.simulation.kind === "heat-transfer") {
    if (graphId === "temperature-history") {
      const values = graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y));
      const maxTemperature = Math.max(...values, 1);
      const minTemperature = Math.min(...values, 0);

      return {
        minX: 0,
        maxX: HEAT_TRANSFER_MAX_TIME,
        minY: Math.floor(minTemperature / 10) * 10,
        maxY: pickScaleBucket(maxTemperature * 1.08),
      };
    }

    if (graphId === "pathway-rates") {
      const maxRate = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        1,
      );
      const minRate = Math.min(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        0,
      );

      return {
        minX: 0,
        maxX: HEAT_TRANSFER_MAX_TIME,
        minY: Math.floor(minRate / 10) * 10,
        maxY: pickScaleBucket(maxRate * 1.08),
      };
    }

    if (graphId === "contact-response") {
      const maxRate = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        1,
      );
      const minRate = Math.min(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        0,
      );

      return {
        minX: HEAT_TRANSFER_MIN_CONTACT_QUALITY,
        maxX: HEAT_TRANSFER_MAX_CONTACT_QUALITY,
        minY: Math.floor(minRate / 10) * 10,
        maxY: pickScaleBucket(maxRate * 1.08),
      };
    }

    if (graphId === "contrast-response") {
      const maxRate = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        1,
      );
      const maxContrast = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.x)),
        1,
      );

      return {
        minX: 0,
        maxX: maxContrast,
        minY: 0,
        maxY: pickScaleBucket(maxRate * 1.08),
      };
    }
  }

  if (concept.simulation.kind === "specific-heat-phase-change") {
    if (graphId === "heating-curve") {
      const values = graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y));
      const maxTemperature = Math.max(...values, 1);
      const minTemperature = Math.min(...values, 0);

      return {
        minX: 0,
        maxX: SPECIFIC_HEAT_PHASE_CHANGE_MAX_TIME,
        minY: Math.floor(minTemperature / 10) * 10,
        maxY: Math.ceil(maxTemperature / 10) * 10,
      };
    }

    if (graphId === "energy-allocation") {
      const values = graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y));
      const maxEnergy = Math.max(...values, 10);
      const minEnergy = Math.min(...values, -10);
      const bound = pickScaleBucket(Math.max(Math.abs(minEnergy), Math.abs(maxEnergy)) * 1.08);

      return {
        minX: 0,
        maxX: SPECIFIC_HEAT_PHASE_CHANGE_MAX_TIME,
        minY: -bound,
        maxY: bound,
      };
    }

    if (graphId === "specific-heat-response") {
      const values = graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y));
      const maxValue = Math.max(...values, 2);
      const minValue = Math.min(...values, -2);
      const bound = pickScaleBucket(Math.max(Math.abs(minValue), Math.abs(maxValue)) * 1.08);

      return {
        minX: SPECIFIC_HEAT_PHASE_CHANGE_MIN_SPECIFIC_HEAT,
        maxX: SPECIFIC_HEAT_PHASE_CHANGE_MAX_SPECIFIC_HEAT,
        minY: -bound,
        maxY: bound,
      };
    }

    if (graphId === "latent-response") {
      const maxValue = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        10,
      );

      return {
        minX: SPECIFIC_HEAT_PHASE_CHANGE_MIN_LATENT_HEAT,
        maxX: SPECIFIC_HEAT_PHASE_CHANGE_MAX_LATENT_HEAT,
        minY: 0,
        maxY: pickScaleBucket(maxValue * 1.08),
      };
    }
  }

  if (concept.simulation.kind === "series-parallel-circuits") {
    if (graphId === "branch-current") {
      const maxCurrent = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        0.5,
      );

      return {
        minX: SERIES_PARALLEL_CIRCUITS_MIN_RESISTANCE,
        maxX: SERIES_PARALLEL_CIRCUITS_MAX_RESISTANCE,
        minY: 0,
        maxY: pickScaleBucket(maxCurrent * 1.08),
      };
    }

    if (graphId === "branch-voltage") {
      const maxVoltage = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        readNumericParam(params, "voltage") ?? 12,
        0.5,
      );

      return {
        minX: SERIES_PARALLEL_CIRCUITS_MIN_RESISTANCE,
        maxX: SERIES_PARALLEL_CIRCUITS_MAX_RESISTANCE,
        minY: 0,
        maxY: pickScaleBucket(maxVoltage * 1.04),
      };
    }

    if (graphId === "load-power") {
      const maxPower = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        1,
      );

      return {
        minX: SERIES_PARALLEL_CIRCUITS_MIN_RESISTANCE,
        maxX: SERIES_PARALLEL_CIRCUITS_MAX_RESISTANCE,
        minY: 0,
        maxY: pickScaleBucket(maxPower * 1.08),
      };
    }
  }

  if (concept.simulation.kind === "equivalent-resistance") {
    if (graphId === "equivalent-map") {
      const maxResistance = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        1,
      );

      return {
        minX: EQUIVALENT_RESISTANCE_MIN_RESISTANCE,
        maxX: EQUIVALENT_RESISTANCE_MAX_RESISTANCE,
        minY: 0,
        maxY: pickScaleBucket(maxResistance * 1.08),
      };
    }

    if (graphId === "current-map") {
      const maxCurrent = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        0.5,
      );

      return {
        minX: EQUIVALENT_RESISTANCE_MIN_RESISTANCE,
        maxX: EQUIVALENT_RESISTANCE_MAX_RESISTANCE,
        minY: 0,
        maxY: pickScaleBucket(maxCurrent * 1.08),
      };
    }

    if (graphId === "voltage-share") {
      const maxVoltage = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        readNumericParam(params, "voltage") ?? 12,
        0.5,
      );

      return {
        minX: EQUIVALENT_RESISTANCE_MIN_RESISTANCE,
        maxX: EQUIVALENT_RESISTANCE_MAX_RESISTANCE,
        minY: 0,
        maxY: pickScaleBucket(maxVoltage * 1.04),
      };
    }
  }

  if (concept.simulation.kind === "electric-fields") {
    if (graphId === "field-scan" || graphId === "direction-scan") {
      const maxField = Math.max(
        ...graphSeries.flatMap((seriesItem) =>
          seriesItem.points.map((point) => Math.abs(point.y)),
        ),
        0.5,
      );
      const bound = pickScaleBucket(maxField * 1.12);

      return {
        minX: ELECTRIC_FIELDS_STAGE_MIN_X,
        maxX: ELECTRIC_FIELDS_STAGE_MAX_X,
        minY: -bound,
        maxY: bound,
      };
    }
  }

  if (concept.simulation.kind === "gravitational-fields") {
    if (graphId === "field-components") {
      const maxField = Math.max(
        ...graphSeries.flatMap((seriesItem) =>
          seriesItem.points.map((point) => Math.abs(point.y)),
        ),
        0.5,
      );
      const bound = pickScaleBucket(maxField * 1.12);

      return {
        minX: GRAVITATIONAL_FIELDS_STAGE_MIN_X,
        maxX: GRAVITATIONAL_FIELDS_STAGE_MAX_X,
        minY: -bound,
        maxY: bound,
      };
    }

    if (graphId === "strength-response") {
      const maxField = Math.max(
        ...graphSeries.flatMap((seriesItem) =>
          seriesItem.points.map((point) => Math.abs(point.y)),
        ),
        0.5,
      );

      return {
        minX: GRAVITATIONAL_FIELDS_STAGE_MIN_X,
        maxX: GRAVITATIONAL_FIELDS_STAGE_MAX_X,
        minY: 0,
        maxY: pickScaleBucket(maxField * 1.12),
      };
    }
  }

  if (concept.simulation.kind === "gravitational-potential") {
    const maxMagnitude = Math.max(
      ...graphSeries.flatMap((seriesItem) =>
        seriesItem.points.map((point) => Math.abs(point.y)),
      ),
      0.5,
    );
    const bound = pickScaleBucket(maxMagnitude * 1.12);

    if (graphId === "potential-energy-scan" || graphId === "field-link") {
      return {
        minX: GRAVITATIONAL_POTENTIAL_STAGE_MIN_X,
        maxX: GRAVITATIONAL_POTENTIAL_STAGE_MAX_X,
        minY: -bound,
        maxY: bound,
      };
    }
  }

  if (concept.simulation.kind === "electric-potential") {
    const maxMagnitude = Math.max(
      ...graphSeries.flatMap((seriesItem) =>
        seriesItem.points.map((point) => Math.abs(point.y)),
      ),
      0.5,
    );
    const bound = pickScaleBucket(maxMagnitude * 1.12);

    if (graphId === "potential-scan") {
      return {
        minX: ELECTRIC_POTENTIAL_STAGE_MIN_X,
        maxX: ELECTRIC_POTENTIAL_STAGE_MAX_X,
        minY: -bound,
        maxY: bound,
      };
    }

    if (graphId === "field-link") {
      return {
        minX: ELECTRIC_POTENTIAL_STAGE_MIN_X,
        maxX: ELECTRIC_POTENTIAL_STAGE_MAX_X,
        minY: -bound,
        maxY: bound,
      };
    }
  }

  if (concept.simulation.kind === "capacitance-electric-energy") {
    if (graphId === "voltage-response") {
      const maxMagnitude = Math.max(
        ...graphSeries.flatMap((seriesItem) =>
          seriesItem.points.map((point) => Math.abs(point.y)),
        ),
        0.5,
      );

      return {
        minX: CAPACITANCE_ELECTRIC_ENERGY_MIN_VOLTAGE,
        maxX: CAPACITANCE_ELECTRIC_ENERGY_MAX_VOLTAGE,
        minY: 0,
        maxY: pickScaleBucket(maxMagnitude * 1.12),
      };
    }
  }

  if (concept.simulation.kind === "magnetic-fields") {
    if (graphId === "field-scan" || graphId === "direction-scan") {
      const maxField = Math.max(
        ...graphSeries.flatMap((seriesItem) =>
          seriesItem.points.map((point) => Math.abs(point.y)),
        ),
        0.5,
      );
      const bound = pickScaleBucket(maxField * 1.12);

      return {
        minX: MAGNETIC_FIELDS_STAGE_MIN_X,
        maxX: MAGNETIC_FIELDS_STAGE_MAX_X,
        minY: -bound,
        maxY: bound,
      };
    }
  }

  if (concept.simulation.kind === "electromagnetic-induction") {
    if (graphId === "field-flux" || graphId === "induced-response") {
      const maxResponse = Math.max(
        ...graphSeries.flatMap((seriesItem) =>
          seriesItem.points.map((point) => Math.abs(point.y)),
        ),
        0.5,
      );
      const bound = pickScaleBucket(maxResponse * 1.12);

      return {
        minX: 0,
        maxX: ELECTROMAGNETIC_INDUCTION_TOTAL_TIME,
        minY: -bound,
        maxY: bound,
      };
    }
  }

  if (concept.simulation.kind === "maxwell-equations-synthesis") {
    if (
      graphId === "flux-laws" ||
      graphId === "ampere-maxwell-link" ||
      graphId === "faraday-wave-link"
    ) {
      const maxResponse = Math.max(
        ...graphSeries.flatMap((seriesItem) =>
          seriesItem.points.map((point) => Math.abs(point.y)),
        ),
        0.5,
      );
      const maxTime = Math.max(
        ...graphSeries.map((seriesItem) => getSeriesDuration(seriesItem)),
        2.4,
      );
      const bound = pickScaleBucket(maxResponse * 1.12);

      return {
        minX: 0,
        maxX: maxTime,
        minY: -bound,
        maxY: bound,
      };
    }
  }

  if (concept.simulation.kind === "electromagnetic-waves") {
    const setups = compareState
      ? [compareState.setupA.params, compareState.setupB.params]
      : [params];
    const maxDisplayAmplitude = Math.max(
      ...setups.map((setup) => {
        const electricAmplitude = Math.abs(readNumericParam(setup, "electricAmplitude") ?? 1.2);
        const waveSpeed = Math.max(readNumericParam(setup, "waveSpeed") ?? 2.8, 0.4);
        const magneticAmplitude =
          (electricAmplitude / waveSpeed) * ELECTROMAGNETIC_WAVES_MAGNETIC_DISPLAY_SCALE;
        return Math.max(electricAmplitude, magneticAmplitude);
      }),
      0.5,
    );
    const bound = pickScaleBucket(maxDisplayAmplitude * 1.08);

    if (graphId === "probe-fields") {
      const maxTime = Math.max(
        ...graphSeries.map((seriesItem) => getSeriesDuration(seriesItem)),
        2.4,
      );

      return {
        minX: 0,
        maxX: maxTime,
        minY: -bound,
        maxY: bound,
      };
    }

    if (graphId === "source-probe") {
      const maxTime = Math.max(
        ...graphSeries.map((seriesItem) => getSeriesDuration(seriesItem)),
        2.4,
      );

      return {
        minX: 0,
        maxX: maxTime,
        minY: -bound,
        maxY: bound,
      };
    }

    if (graphId === "space-profile") {
      return {
        minX: 0,
        maxX: ELECTROMAGNETIC_WAVES_STAGE_LENGTH,
        minY: -bound,
        maxY: bound,
      };
    }
  }

  if (concept.simulation.kind === "light-spectrum-linkage") {
    const setups = compareState
      ? [compareState.setupA.params, compareState.setupB.params]
      : [params];
    const maxDisplayAmplitude = Math.max(
      ...setups.map((setup) => {
        const fieldAmplitude = Math.abs(readNumericParam(setup, "fieldAmplitude") ?? 1.05);
        const mediumIndex = Math.max(readNumericParam(setup, "mediumIndex") ?? 1, 1);
        const magneticAmplitude =
          fieldAmplitude * mediumIndex * LIGHT_SPECTRUM_MAGNETIC_DISPLAY_SCALE;
        return Math.max(fieldAmplitude, magneticAmplitude);
      }),
      0.5,
    );
    const bound = pickScaleBucket(maxDisplayAmplitude * 1.08);

    if (graphId === "probe-fields" || graphId === "source-probe") {
      const maxTime = Math.max(
        ...graphSeries.map((seriesItem) => getSeriesDuration(seriesItem)),
        5.6,
      );

      return {
        minX: 0,
        maxX: maxTime,
        minY: -bound,
        maxY: bound,
      };
    }

    if (graphId === "space-profile") {
      return {
        minX: 0,
        maxX: LIGHT_SPECTRUM_STAGE_WINDOW,
        minY: -bound,
        maxY: bound,
      };
    }
  }

  if (concept.simulation.kind === "polarization") {
    if (graphId === "power-split") {
      return {
        minX: 0,
        maxX: POLARIZATION_MAX_ANGLE,
        minY: 0,
        maxY: 1,
        xTicks: 6,
        yTicks: 5,
      };
    }

    if (graphId === "field-projection") {
      return {
        minX: 0,
        maxX: POLARIZATION_MAX_ANGLE,
        minY: 0,
        maxY: 1.05,
        xTicks: 6,
        yTicks: 5,
      };
    }
  }

  if (concept.simulation.kind === "photoelectric-effect") {
    if (graphId === "energy-balance") {
      const maxEnergy = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        1,
      );

      return {
        minX: PHOTOELECTRIC_EFFECT_MIN_FREQUENCY_PHz,
        maxX: PHOTOELECTRIC_EFFECT_MAX_FREQUENCY_PHz,
        minY: 0,
        maxY: pickScaleBucket(maxEnergy * 1.08),
        xTicks: 7,
      };
    }

    if (graphId === "collector-sweep") {
      const maxCurrent = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        0.25,
      );

      return {
        minX: PHOTOELECTRIC_EFFECT_MIN_COLLECTOR_VOLTAGE,
        maxX: PHOTOELECTRIC_EFFECT_MAX_COLLECTOR_VOLTAGE,
        minY: 0,
        maxY: pickScaleBucket(maxCurrent * 1.08),
        xTicks: 7,
      };
    }

    if (graphId === "intensity-sweep") {
      const maxCurrent = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        0.25,
      );

      return {
        minX: 0.2,
        maxX: PHOTOELECTRIC_EFFECT_MAX_INTENSITY,
        minY: 0,
        maxY: pickScaleBucket(maxCurrent * 1.08),
        xTicks: 7,
      };
    }
  }

  if (concept.simulation.kind === "atomic-spectra") {
    if (graphId === "spectrum-lines") {
      return {
        minX: ATOMIC_SPECTRA_SPECTRUM_MIN_NM,
        maxX: ATOMIC_SPECTRA_SPECTRUM_MAX_NM,
        minY: 0,
        maxY: 1.15,
        xTicks: 7,
      };
    }
  }

  if (concept.simulation.kind === "de-broglie-matter-waves") {
    if (graphId === "wavelength-momentum") {
      return {
        minX: DE_BROGLIE_MIN_MOMENTUM_SCALED,
        maxX: DE_BROGLIE_MAX_MOMENTUM_SCALED,
        minY: 0,
        maxY: 1,
        xTicks: 7,
      };
    }

    if (graphId === "loop-fit") {
      return {
        minX: DE_BROGLIE_MIN_MOMENTUM_SCALED,
        maxX: DE_BROGLIE_MAX_MOMENTUM_SCALED,
        minY: 0,
        maxY: pickScaleBucket(DE_BROGLIE_MAX_FIT_COUNT * 1.04),
        xTicks: 7,
      };
    }
  }

  if (concept.simulation.kind === "bohr-model") {
    if (graphId === "series-spectrum") {
      return {
        minX: BOHR_MODEL_SPECTRUM_MIN_NM,
        maxX: BOHR_MODEL_SPECTRUM_MAX_NM,
        minY: 0,
        maxY: 1.15,
        xTicks: 7,
      };
    }
  }

  if (concept.simulation.kind === "radioactivity-half-life") {
    const setupParams = compareState
      ? [compareState.setupA.params, compareState.setupB.params]
      : [params];
    const maxTime = Math.max(...setupParams.map((entry) => resolveRadioactivityHalfLifeMaxTime(entry)), 1);

    if (graphId === "remaining-count") {
      const maxCount = Math.max(
        ...setupParams.map((entry) => readNumericParam(entry, "sampleSize") ?? 64),
        1,
      );

      return {
        minX: 0,
        maxX: maxTime,
        minY: 0,
        maxY: pickScaleBucket(maxCount * 1.04),
        xTicks: 6,
      };
    }

    if (graphId === "remaining-fraction") {
      return {
        minX: 0,
        maxX: maxTime,
        minY: 0,
        maxY: 1.05,
        xTicks: 6,
      };
    }
  }

  if (concept.simulation.kind === "magnetic-force") {
    const setups = compareState
      ? [compareState.setupA.params, compareState.setupB.params]
      : [params];
    const viewport = resolveMagneticForceViewport(setups);

    if (graphId === "position") {
      return {
        minX: 0,
        maxX: viewport.maxDuration,
        minY: -viewport.extent,
        maxY: viewport.extent,
      };
    }

    if (graphId === "force") {
      const maxForce = Math.max(
        ...setups.map(
          (setup) =>
            Math.abs(readNumericParam(setup, "fieldStrength") ?? 1.6) *
            (readNumericParam(setup, "speed") ?? 4.5),
        ),
        0.5,
      );
      const bound = pickScaleBucket(maxForce * 1.12);

      return {
        minX: 0,
        maxX: viewport.maxDuration,
        minY: -bound,
        maxY: bound,
      };
    }
  }

  if (concept.simulation.kind === "refraction-snells-law") {
    if (graphId === "refraction-map") {
      return {
        minX: 0,
        maxX: REFRACTION_MAX_INCIDENT_ANGLE,
        minY: 0,
        maxY: 90,
      };
    }

    if (graphId === "transition-map") {
      return {
        minX: 0,
        maxX: REFRACTION_MAX_INCIDENT_ANGLE,
        minY: 0,
        maxY: 90,
      };
    }

    if (graphId === "bend-map") {
      const maxBend = Math.max(
        ...graphSeries.flatMap((seriesItem) =>
          seriesItem.points.map((point) => Math.abs(point.y)),
        ),
        1,
      );
      const bound = pickScaleBucket(maxBend * 1.12);

      return {
        minX: 0,
        maxX: REFRACTION_MAX_INCIDENT_ANGLE,
        minY: -bound,
        maxY: bound,
      };
    }
  }

  if (concept.simulation.kind === "dispersion-refractive-index-color") {
    if (graphId === "index-curve") {
      const minY = Math.min(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        1.2,
      );
      const maxY = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        1.35,
      );

      return {
        minX: DISPERSION_MIN_WAVELENGTH_NM,
        maxX: DISPERSION_MAX_WAVELENGTH_NM,
        minY: Math.max(1, Number((minY - 0.01).toFixed(2))),
        maxY: Number((maxY + 0.01).toFixed(2)),
      };
    }

    if (graphId === "deviation-curve") {
      const maxDeviation = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        4,
      );

      return {
        minX: DISPERSION_MIN_WAVELENGTH_NM,
        maxX: DISPERSION_MAX_WAVELENGTH_NM,
        minY: 0,
        maxY: pickScaleBucket(maxDeviation * 1.08),
      };
    }
  }

  if (concept.simulation.kind === "mirrors") {
    if (graphId === "image-map") {
      return {
        minX: MIRRORS_MIN_OBJECT_DISTANCE,
        maxX: MIRRORS_MAX_OBJECT_DISTANCE,
        minY: -MIRRORS_IMAGE_DISTANCE_PLOT_LIMIT,
        maxY: MIRRORS_IMAGE_DISTANCE_PLOT_LIMIT,
      };
    }

    if (graphId === "magnification") {
      return {
        minX: MIRRORS_MIN_OBJECT_DISTANCE,
        maxX: MIRRORS_MAX_OBJECT_DISTANCE,
        minY: -MIRRORS_MAGNIFICATION_PLOT_LIMIT,
        maxY: MIRRORS_MAGNIFICATION_PLOT_LIMIT,
      };
    }
  }

  if (concept.simulation.kind === "lens-imaging") {
    if (graphId === "image-map") {
      return {
        minX: LENS_IMAGING_MIN_OBJECT_DISTANCE,
        maxX: LENS_IMAGING_MAX_OBJECT_DISTANCE,
        minY: -LENS_IMAGING_IMAGE_DISTANCE_PLOT_LIMIT,
        maxY: LENS_IMAGING_IMAGE_DISTANCE_PLOT_LIMIT,
      };
    }

    if (graphId === "magnification") {
      return {
        minX: LENS_IMAGING_MIN_OBJECT_DISTANCE,
        maxX: LENS_IMAGING_MAX_OBJECT_DISTANCE,
        minY: -LENS_IMAGING_MAGNIFICATION_PLOT_LIMIT,
        maxY: LENS_IMAGING_MAGNIFICATION_PLOT_LIMIT,
      };
    }
  }

  if (concept.simulation.kind === "beats") {
    const setups = compareState
      ? [compareState.setupA.params, compareState.setupB.params]
      : [params];
    const amplitudeBound = Math.max(
      ...setups.map((setup) => Math.abs(readNumericParam(setup, "amplitude") ?? 0.12)),
      BEATS_MAX_AMPLITUDE * 0.3,
    );

    if (graphId === "displacement") {
      const maxTime = Math.max(
        ...graphSeries.map((seriesItem) => getSeriesDuration(seriesItem)),
        2.6,
      );
      const bound = pickScaleBucket(amplitudeBound * 2.08);

      return {
        minX: 0,
        maxX: maxTime,
        minY: -bound,
        maxY: bound,
      };
    }

    if (graphId === "envelope") {
      return {
        minX: 0,
        maxX: Math.max(...graphSeries.map((seriesItem) => getSeriesDuration(seriesItem)), 2.6),
        minY: 0,
        maxY: 1.05,
      };
    }
  }

  if (concept.simulation.kind === "wave-interference") {
    if (graphId === "displacement") {
      const setups = compareState
        ? [compareState.setupA.params, compareState.setupB.params]
        : [params];
      const maxDisplacement = Math.max(
        ...setups.map(
          (setup) =>
            Math.abs(readNumericParam(setup, "amplitudeA") ?? 1) +
            Math.abs(readNumericParam(setup, "amplitudeB") ?? 1),
        ),
        0.5,
      );
      const bound = pickScaleBucket(maxDisplacement * 1.05);

      return {
        minX: 0,
        maxX: 4,
        minY: -bound,
        maxY: bound,
      };
    }

    if (graphId === "pattern") {
      return {
        minX: -WAVE_INTERFERENCE_SCREEN_HALF_HEIGHT,
        maxX: WAVE_INTERFERENCE_SCREEN_HALF_HEIGHT,
        minY: 0,
        maxY: 1,
      };
    }
  }

  if (concept.simulation.kind === "diffraction") {
    if (graphId === "displacement") {
      return {
        minX: 0,
        maxX: Math.max(...graphSeries.map((seriesItem) => getSeriesDuration(seriesItem)), 2.4),
        minY: -1.05,
        maxY: 1.05,
      };
    }

    if (graphId === "pattern") {
      return {
        minX: -DIFFRACTION_SCREEN_HALF_HEIGHT,
        maxX: DIFFRACTION_SCREEN_HALF_HEIGHT,
        minY: 0,
        maxY: 1,
      };
    }
  }

  if (concept.simulation.kind === "optical-resolution") {
    if (graphId === "image-profile") {
      return {
        minX: -OPTICAL_RESOLUTION_IMAGE_HALF_HEIGHT_UM,
        maxX: OPTICAL_RESOLUTION_IMAGE_HALF_HEIGHT_UM,
        minY: 0,
        maxY: 1,
      };
    }
  }

  if (concept.simulation.kind === "double-slit-interference") {
    if (graphId === "displacement") {
      return {
        minX: 0,
        maxX: Math.max(...graphSeries.map((seriesItem) => getSeriesDuration(seriesItem)), 2.4),
        minY: -2.1,
        maxY: 2.1,
      };
    }

    if (graphId === "pattern") {
      return {
        minX: -DOUBLE_SLIT_INTERFERENCE_SCREEN_HALF_HEIGHT,
        maxX: DOUBLE_SLIT_INTERFERENCE_SCREEN_HALF_HEIGHT,
        minY: 0,
        maxY: 1,
      };
    }
  }

  if (concept.simulation.kind === "sound-waves-longitudinal") {
    const setups = compareState
      ? [compareState.setupA.params, compareState.setupB.params]
      : [params];
    const maxAmplitude = Math.max(
      ...setups.map((setup) => Math.abs(readNumericParam(setup, "amplitude") ?? 0.12)),
      0.05,
    );
    const displacementBound = pickScaleBucket(maxAmplitude * 1.12);

    if (graphId === "displacement") {
      const maxTime = Math.max(
        ...graphSeries.map((seriesItem) => getSeriesDuration(seriesItem)),
        2.4,
      );

      return {
        minX: 0,
        maxX: maxTime,
        minY: -displacementBound,
        maxY: displacementBound,
      };
    }

    if (graphId === "probe-pressure") {
      return {
        minX: 0,
        maxX: Math.max(...graphSeries.map((seriesItem) => getSeriesDuration(seriesItem)), 2.4),
        minY: -1.1,
        maxY: 1.1,
      };
    }

    if (graphId === "intensity-response") {
      return {
        minX: SOUND_WAVES_LONGITUDINAL_MIN_AMPLITUDE,
        maxX: SOUND_WAVES_LONGITUDINAL_MAX_AMPLITUDE,
        minY: 0,
        maxY: 0.065,
      };
    }
  }

  if (concept.simulation.kind === "doppler-effect") {
    if (graphId === "displacement") {
      const maxTime = Math.max(
        ...graphSeries.map((seriesItem) => getSeriesDuration(seriesItem)),
        2.4,
      );

      return {
        minX: 0,
        maxX: maxTime,
        minY: -1.1,
        maxY: 1.1,
      };
    }

    if (graphId === "source-spacing") {
      const setups = compareState
        ? [compareState.setupA.params, compareState.setupB.params]
        : [params];
      const maxSpacing = Math.max(
        ...setups.map((setup) => {
          const sourceFrequency = Math.max(
            readNumericParam(setup, "sourceFrequency") ?? 1.1,
            DOPPLER_EFFECT_MIN_SOURCE_FREQUENCY,
          );

          return (DOPPLER_EFFECT_MAX_SOURCE_SPEED + DOPPLER_EFFECT_WAVE_SPEED) / sourceFrequency;
        }),
        2,
      );

      return {
        minX: 0,
        maxX: DOPPLER_EFFECT_MAX_SOURCE_SPEED,
        minY: 0,
        maxY: pickScaleBucket(maxSpacing * 1.04),
      };
    }

    if (graphId === "observer-response") {
      const maxObservedFrequency = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        1,
      );

      return {
        minX: DOPPLER_EFFECT_MIN_OBSERVER_SPEED,
        maxX: DOPPLER_EFFECT_MAX_OBSERVER_SPEED,
        minY: 0,
        maxY: pickScaleBucket(maxObservedFrequency * 1.08),
      };
    }
  }

  if (concept.simulation.kind === "wave-speed-wavelength") {
    const setups = compareState
      ? [compareState.setupA.params, compareState.setupB.params]
      : [params];
    const maxAmplitude = Math.max(
      ...setups.map((setup) => Math.abs(readNumericParam(setup, "amplitude") ?? 1)),
      0.5,
    );
    const displacementBound = pickScaleBucket(maxAmplitude * 1.05);

    if (graphId === "displacement") {
      const maxTime = Math.max(
        ...graphSeries.map((seriesItem) => getSeriesDuration(seriesItem)),
        2.4,
      );

      return {
        minX: 0,
        maxX: maxTime,
        minY: -displacementBound,
        maxY: displacementBound,
      };
    }

    if (graphId === "phase-map") {
      const maxCycles = Math.max(
        ...setups.map((setup) => {
          const wavelength = Math.max(
            readNumericParam(setup, "wavelength") ?? 1.6,
            WAVE_SPEED_WAVELENGTH_MIN_WAVELENGTH,
          );
          return WAVE_SPEED_WAVELENGTH_STAGE_LENGTH / wavelength;
        }),
        1,
      );

      return {
        minX: 0,
        maxX: WAVE_SPEED_WAVELENGTH_STAGE_LENGTH,
        minY: 0,
        maxY: pickScaleBucket(maxCycles * 1.04),
      };
    }
  }

  if (concept.simulation.kind === "standing-waves") {
    const setups = compareState
      ? [compareState.setupA.params, compareState.setupB.params]
      : [params];
    const maxAmplitude = Math.max(
      ...setups.map((setup) => Math.abs(readNumericParam(setup, "amplitude") ?? 1.1)),
      0.5,
    );
    const bound = pickScaleBucket(maxAmplitude * 1.05);

    if (graphId === "shape") {
      const maxLength = Math.max(
        ...setups.map((setup) => readNumericParam(setup, "length") ?? 1.6),
        STANDING_WAVES_MAX_LENGTH,
      );

      return {
        minX: 0,
        maxX: maxLength,
        minY: -bound,
        maxY: bound,
      };
    }

    if (graphId === "displacement") {
      const maxTime = Math.max(
        ...graphSeries.map((seriesItem) => getSeriesDuration(seriesItem)),
        2.4,
      );

      return {
        minX: 0,
        maxX: maxTime,
        minY: -bound,
        maxY: bound,
      };
    }
  }

  if (concept.simulation.kind === "air-column-resonance") {
    const setups = compareState
      ? [compareState.setupA.params, compareState.setupB.params]
      : [params];
    const maxAmplitude = Math.max(
      ...setups.map((setup) => Math.abs(readNumericParam(setup, "amplitude") ?? 0.12)),
      0.08,
    );
    const bound = pickScaleBucket(maxAmplitude * 1.08);

    if (graphId === "shape") {
      const maxLength = Math.max(
        ...setups.map((setup) => readNumericParam(setup, "length") ?? 1.2),
        AIR_COLUMN_MAX_LENGTH,
      );

      return {
        minX: 0,
        maxX: maxLength,
        minY: -bound,
        maxY: bound,
      };
    }

    if (graphId === "displacement") {
      const maxTime = Math.max(
        ...graphSeries.map((seriesItem) => getSeriesDuration(seriesItem)),
        0.24,
      );

      return {
        minX: 0,
        maxX: maxTime,
        minY: -bound,
        maxY: bound,
      };
    }

    if (graphId === "ladder") {
      const maxFrequency = Math.max(
        ...graphSeries.flatMap((seriesItem) => seriesItem.points.map((point) => point.y)),
        60,
      );

      return {
        minX: 1,
        maxX: AIR_COLUMN_MAX_RESONANCE_ORDER,
        minY: 0,
        maxY: pickScaleBucket(maxFrequency * 1.08),
      };
    }
  }

  return null;
}

function interpolateSeriesAtX(points: GraphSeries["points"], x: number) {
  if (!points.length) {
    return null;
  }

  if (x <= points[0].x) {
    return {
      pointIndex: 0,
      pointCount: points.length,
      point: points[0],
    };
  }

  const lastIndex = points.length - 1;
  if (x >= points[lastIndex].x) {
    return {
      pointIndex: lastIndex,
      pointCount: points.length,
      point: points[lastIndex],
    };
  }

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];

    if (x >= start.x && x <= end.x) {
      const span = Math.max(end.x - start.x, Number.EPSILON);
      const ratio = (x - start.x) / span;
      return {
        pointIndex: ratio < 0.5 ? index : index + 1,
        pointCount: points.length,
        point: {
          x,
          y: start.y + (end.y - start.y) * ratio,
        },
      };
    }
  }

  return {
    pointIndex: lastIndex,
    pointCount: points.length,
    point: points[lastIndex],
  };
}

function resolveTimeDomain(
  kind: SimulationKind,
  params: SimulationParams,
  seriesMap: GraphSeriesMap,
  compareState: CompareState | null,
  compareSeriesMaps: { a: GraphSeriesMap; b: GraphSeriesMap } | null,
): TimeDomain {
  if (kind === "reaction-rate-collision-theory") {
    return {
      max: REACTION_RATE_TOTAL_TIME,
      step: REACTION_RATE_TOTAL_TIME / 239,
    };
  }

  if (kind === "dynamic-equilibrium") {
    return {
      max: DYNAMIC_EQUILIBRIUM_TOTAL_TIME,
      step: DYNAMIC_EQUILIBRIUM_TOTAL_TIME / 239,
    };
  }

  if (kind === "parametric-curves-motion") {
    return {
      max: PARAMETRIC_CURVES_TIME_MAX,
      step: PARAMETRIC_CURVES_TIME_MAX / 239,
    };
  }

  if (kind === "unit-circle-rotation") {
    return {
      max: UNIT_CIRCLE_ROTATION_TIME_MAX,
      step: UNIT_CIRCLE_ROTATION_TIME_MAX / 239,
    };
  }

  if (kind === "sorting-algorithmic-trade-offs") {
    const setupParams = compareState
      ? [compareState.setupA.params, compareState.setupB.params]
      : [params];
    const max = Math.max(...setupParams.map((entry) => resolveSortingTradeoffsDuration(entry)), 0);

    return {
      max,
      step: max > 0 ? max / 239 : 1 / 30,
    };
  }

  if (kind === "binary-search-halving") {
    const setupParams = compareState
      ? [compareState.setupA.params, compareState.setupB.params]
      : [params];
    const max = Math.max(...setupParams.map((entry) => resolveBinarySearchHalvingDuration(entry)), 0);

    return {
      max,
      step: max > 0 ? max / 239 : 1 / 30,
    };
  }

  if (kind === "graph-traversal") {
    const setupParams = compareState
      ? [compareState.setupA.params, compareState.setupB.params]
      : [params];
    const max = Math.max(...setupParams.map((entry) => resolveGraphTraversalDuration(entry)), 0);

    return {
      max,
      step: max > 0 ? max / 239 : 1 / 30,
    };
  }

  if (kind === "projectile") {
    const setupParams = compareState
      ? [compareState.setupA.params, compareState.setupB.params]
      : [params];
    const durations = setupParams.map((entry) =>
      sampleProjectileState(resolveProjectileParams(toProjectileInput(entry)), 0).timeOfFlight,
    );
    const max = Math.max(...durations, 0);

    return {
      max,
      step: max > 0 ? max / 219 : 1 / 30,
    };
  }

  if (kind === "vectors-components") {
    return {
      max: VECTORS_COMPONENTS_DURATION,
      step: VECTORS_COMPONENTS_DURATION / 219,
    };
  }

  if (kind === "torque") {
    return {
      max: TORQUE_TOTAL_TIME,
      step: TORQUE_TOTAL_TIME / 239,
    };
  }

  if (kind === "rotational-inertia") {
    return {
      max: ROTATIONAL_INERTIA_TOTAL_TIME,
      step: ROTATIONAL_INERTIA_TOTAL_TIME / 239,
    };
  }

  if (kind === "rolling-motion") {
    const setupParams = compareState
      ? [compareState.setupA.params, compareState.setupB.params]
      : [params];
    const max = Math.max(...setupParams.map((entry) => resolveRollingMotionDuration(entry)), 0.01);

    return {
      max,
      step: max / 239,
    };
  }

  if (kind === "angular-momentum") {
    return {
      max: ANGULAR_MOMENTUM_TOTAL_TIME,
      step: ANGULAR_MOMENTUM_TOTAL_TIME / 239,
    };
  }

  if (kind === "momentum-impulse") {
    return {
      max: MOMENTUM_IMPULSE_TOTAL_TIME,
      step: MOMENTUM_IMPULSE_TOTAL_TIME / 239,
    };
  }

  if (kind === "conservation-of-momentum") {
    return {
      max: CONSERVATION_MOMENTUM_TOTAL_TIME,
      step: CONSERVATION_MOMENTUM_TOTAL_TIME / 239,
    };
  }

  if (kind === "collisions") {
    return {
      max: COLLISIONS_TOTAL_TIME,
      step: COLLISIONS_TOTAL_TIME / 239,
    };
  }

  if (kind === "electromagnetic-induction") {
    return {
      max: ELECTROMAGNETIC_INDUCTION_TOTAL_TIME,
      step: ELECTROMAGNETIC_INDUCTION_TOTAL_TIME / 239,
    };
  }

  if (kind === "maxwell-equations-synthesis") {
    const timeSeries = compareSeriesMaps
      ? [compareSeriesMaps.a["flux-laws"]?.[0], compareSeriesMaps.b["flux-laws"]?.[0]]
      : [seriesMap["flux-laws"]?.[0]];
    const validSeries = timeSeries.filter(Boolean) as GraphSeries[];
    const max = validSeries.length
      ? Math.max(...validSeries.map((item) => getSeriesDuration(item)))
      : 0;
    const step = validSeries.length
      ? Math.min(...validSeries.map((item) => getSeriesStep(item)))
      : 1 / 30;

    return {
      max,
      step,
    };
  }

  if (kind === "electromagnetic-waves") {
    const timeSeries = compareSeriesMaps
      ? [compareSeriesMaps.a["probe-fields"]?.[0], compareSeriesMaps.b["probe-fields"]?.[0]]
      : [seriesMap["probe-fields"]?.[0]];
    const validSeries = timeSeries.filter(Boolean) as GraphSeries[];
    const max = validSeries.length
      ? Math.max(...validSeries.map((item) => getSeriesDuration(item)))
      : 0;
    const step = validSeries.length
      ? Math.min(...validSeries.map((item) => getSeriesStep(item)))
      : 1 / 30;

    return {
      max,
      step,
    };
  }

  if (kind === "light-spectrum-linkage") {
    const timeSeries = compareSeriesMaps
      ? [compareSeriesMaps.a["probe-fields"]?.[0], compareSeriesMaps.b["probe-fields"]?.[0]]
      : [seriesMap["probe-fields"]?.[0]];
    const validSeries = timeSeries.filter(Boolean) as GraphSeries[];
    const max = validSeries.length
      ? Math.max(...validSeries.map((item) => getSeriesDuration(item)))
      : 0;
    const step = validSeries.length
      ? Math.min(...validSeries.map((item) => getSeriesStep(item)))
      : 1 / 30;

    return {
      max,
      step,
    };
  }

  if (kind === "photoelectric-effect") {
    return {
      max: PHOTOELECTRIC_EFFECT_TIME_WINDOW,
      step: PHOTOELECTRIC_EFFECT_TIME_WINDOW / 239,
    };
  }

  if (kind === "atomic-spectra") {
    return {
      max: ATOMIC_SPECTRA_TIME_WINDOW,
      step: ATOMIC_SPECTRA_TIME_WINDOW / 239,
    };
  }

  if (kind === "de-broglie-matter-waves") {
    return {
      max: 0,
      step: 1 / 30,
    };
  }

  if (kind === "bohr-model") {
    return {
      max: BOHR_MODEL_TIME_WINDOW,
      step: BOHR_MODEL_TIME_WINDOW / 239,
    };
  }

  if (kind === "radioactivity-half-life") {
    const setupParams = compareState
      ? [compareState.setupA.params, compareState.setupB.params]
      : [params];
    const max = Math.max(...setupParams.map((entry) => resolveRadioactivityHalfLifeMaxTime(entry)), 0);

    return {
      max,
      step: max > 0 ? max / 239 : 1 / 30,
    };
  }

  if (kind === "magnetic-force") {
    const setupParams = compareState
      ? [compareState.setupA.params, compareState.setupB.params]
      : [params];
    const max = Math.max(...setupParams.map((entry) => resolveMagneticForceDuration(entry)), 0);

    return {
      max,
      step: max > 0 ? max / 239 : 1 / 30,
    };
  }

  if (kind === "power-energy-circuits") {
    return {
      max: POWER_ENERGY_CIRCUITS_MAX_TIME,
      step: POWER_ENERGY_CIRCUITS_MAX_TIME / 239,
    };
  }

  if (kind === "rc-charging-discharging") {
    const setupParams = compareState
      ? [compareState.setupA.params, compareState.setupB.params]
      : [params];
    const max = Math.max(...setupParams.map((entry) => resolveRcChargingDischargingDuration(entry)), 0);

    return {
      max,
      step: max > 0 ? max / 239 : RC_CHARGING_MAX_TIME / 239,
    };
  }

  if (kind === "temperature-internal-energy") {
    return {
      max: TEMPERATURE_INTERNAL_ENERGY_MAX_TIME,
      step: TEMPERATURE_INTERNAL_ENERGY_MAX_TIME / 239,
    };
  }

  if (kind === "heat-transfer") {
    return {
      max: HEAT_TRANSFER_MAX_TIME,
      step: HEAT_TRANSFER_MAX_TIME / 239,
    };
  }

  if (kind === "specific-heat-phase-change") {
    return {
      max: SPECIFIC_HEAT_PHASE_CHANGE_MAX_TIME,
      step: SPECIFIC_HEAT_PHASE_CHANGE_MAX_TIME / 239,
    };
  }

  if (kind === "series-parallel-circuits") {
    return {
      max: SERIES_PARALLEL_CIRCUITS_MAX_TIME,
      step: SERIES_PARALLEL_CIRCUITS_MAX_TIME / 239,
    };
  }

  if (kind === "equivalent-resistance") {
    return {
      max: EQUIVALENT_RESISTANCE_MAX_TIME,
      step: EQUIVALENT_RESISTANCE_MAX_TIME / 239,
    };
  }

  if (kind === "continuity-equation") {
    return {
      max: CONTINUITY_EQUATION_MAX_TIME,
      step: CONTINUITY_EQUATION_MAX_TIME / 239,
    };
  }

  if (kind === "bernoulli-principle") {
    return {
      max: BERNOULLI_PRINCIPLE_MAX_TIME,
      step: BERNOULLI_PRINCIPLE_MAX_TIME / 239,
    };
  }

  if (kind === "drag-terminal-velocity") {
    return {
      max: DRAG_TERMINAL_VELOCITY_MAX_TIME,
      step: DRAG_TERMINAL_VELOCITY_MAX_TIME / 239,
    };
  }

  if (
    kind === "graph-transformations" ||
    kind === "rational-functions" ||
    kind === "matrix-transformations" ||
    kind === "exponential-change" ||
    kind === "limits-continuity" ||
    kind === "complex-numbers-plane" ||
    kind === "polar-coordinates" ||
    kind === "solubility-saturation" ||
    kind === "buffers-neutralization" ||
    kind === "concentration-dilution" ||
    kind === "stoichiometry-recipe" ||
    kind === "acid-base-ph" ||
    kind === "derivative-as-slope" ||
    kind === "optimization-constraints" ||
    kind === "integral-accumulation" ||
    kind === "basic-circuits" ||
    kind === "ideal-gas-kinetic-theory" ||
    kind === "pressure-hydrostatic" ||
    kind === "buoyancy-archimedes" ||
    kind === "internal-resistance-terminal-voltage" ||
    kind === "electric-fields" ||
    kind === "gravitational-fields" ||
    kind === "gravitational-potential" ||
    kind === "electric-potential" ||
    kind === "capacitance-electric-energy" ||
    kind === "magnetic-fields" ||
    kind === "static-equilibrium-centre-of-mass" ||
    kind === "lens-imaging" ||
    kind === "optical-resolution" ||
    kind === "polarization" ||
      kind === "refraction-snells-law" ||
      kind === "mirrors" ||
      kind === "dot-product-projection" ||
      kind === "vectors-2d"
    ) {
    return {
      max: 0,
      step: 1 / 30,
    };
  }

  if (kind === "circular-orbits") {
    const timeSeries = compareSeriesMaps
      ? [compareSeriesMaps.a["radius-history"]?.[0], compareSeriesMaps.b["radius-history"]?.[0]]
      : [seriesMap["radius-history"]?.[0]];
    const validSeries = timeSeries.filter(Boolean) as GraphSeries[];
    const max = validSeries.length
      ? Math.max(...validSeries.map((item) => getSeriesDuration(item)))
      : 0;
    const step = validSeries.length
      ? Math.min(...validSeries.map((item) => getSeriesStep(item)))
      : 1 / 30;

    return {
      max,
      step,
    };
  }

  if (kind === "escape-velocity") {
    const timeSeries = compareSeriesMaps
      ? [compareSeriesMaps.a["radius-history"]?.[0], compareSeriesMaps.b["radius-history"]?.[0]]
      : [seriesMap["radius-history"]?.[0]];
    const validSeries = timeSeries.filter(Boolean) as GraphSeries[];
    const max = validSeries.length
      ? Math.max(...validSeries.map((item) => getSeriesDuration(item)))
      : 0;
    const step = validSeries.length
      ? Math.min(...validSeries.map((item) => getSeriesStep(item)))
      : 1 / 30;

    return {
      max,
      step,
    };
  }

  const candidateSeries = compareSeriesMaps
    ? kind === "damping-resonance"
      ? [compareSeriesMaps.a.transient?.[0], compareSeriesMaps.b.transient?.[0]]
      : kind === "ucm"
        ? [compareSeriesMaps.a.projections?.[0], compareSeriesMaps.b.projections?.[0]]
      : [compareSeriesMaps.a.displacement?.[0], compareSeriesMaps.b.displacement?.[0]]
    : [
        kind === "damping-resonance"
          ? seriesMap.transient?.[0]
          : kind === "ucm"
            ? seriesMap.projections?.[0]
            : seriesMap.displacement?.[0],
      ];
  const validSeries = candidateSeries.filter(Boolean) as GraphSeries[];
  const max = validSeries.length
    ? Math.max(...validSeries.map((item) => getSeriesDuration(item)))
    : 0;
  const step = validSeries.length
    ? Math.min(...validSeries.map((item) => getSeriesStep(item)))
    : 1 / 30;

  return {
    max,
    step,
  };
}

function buildInspectionMarker(
  concept: ConceptSimulationSource,
  graphId: string,
  graphSeries: GraphSeries[],
  time: number,
  params: SimulationParams,
  compareState: CompareState | null,
): LineGraphLinkedMarker | null {
  const graphKind = getGraphInteractionKind(concept.simulation.kind, graphId);

  if (graphKind === "response") {
    return null;
  }

  if (graphKind === "trajectory" && concept.simulation.kind === "projectile") {
    const samples = graphSeries
      .map((seriesItem) => {
        const previewParams = resolvePreviewParams(params, compareState, seriesItem.meta?.setup);
        const projectileParams = resolveProjectileParams(toProjectileInput(previewParams));
        const previewTime = clampProjectileTime(projectileParams, time);
        const snapshot = sampleProjectileState(projectileParams, previewTime);

        return {
          seriesId: seriesItem.id,
          label: seriesItem.label,
          color: seriesItem.color,
          dashed: seriesItem.dashed,
          setup: seriesItem.meta?.setup,
          pointIndex: 0,
          pointCount: seriesItem.points.length,
          point: {
            x: snapshot.x,
            y: Math.max(0, snapshot.y),
          },
        };
      })
      .filter((item) => Number.isFinite(item.point.x) && Number.isFinite(item.point.y));

    if (!samples.length) {
      return null;
    }

    return {
      mode: "inspect",
      label: `paused t = ${formatNumber(time)} s`,
      activeSeriesId:
        compareState
          ? samples.find((item) => item.setup === compareState.activeTarget)?.seriesId ?? null
          : samples[0]?.seriesId ?? null,
      samples,
    };
  }

  if (graphKind === "trajectory" && concept.simulation.kind === "vectors-components") {
    const samples = graphSeries
      .map((seriesItem) => {
        const previewParams = resolvePreviewParams(params, compareState, seriesItem.meta?.setup);
        const snapshot = sampleVectorsComponentsState(
          {
            magnitude: typeof previewParams.magnitude === "number" ? previewParams.magnitude : undefined,
            angle: typeof previewParams.angle === "number" ? previewParams.angle : undefined,
          },
          clampVectorsComponentsTime(time),
        );

        return {
          seriesId: seriesItem.id,
          label: seriesItem.label,
          color: seriesItem.color,
          dashed: seriesItem.dashed,
          setup: seriesItem.meta?.setup,
          pointIndex: 0,
          pointCount: seriesItem.points.length,
          point: {
            x: snapshot.x,
            y: snapshot.y,
          },
        };
      })
      .filter((item) => Number.isFinite(item.point.x) && Number.isFinite(item.point.y));

    if (!samples.length) {
      return null;
    }

    return {
      mode: "inspect",
      label: `paused t = ${formatNumber(time)} s`,
      activeSeriesId:
        compareState
          ? samples.find((item) => item.setup === compareState.activeTarget)?.seriesId ?? null
          : samples[0]?.seriesId ?? null,
      samples,
    };
  }

  const samples = graphSeries
    .map((seriesItem) => {
      const interpolated = interpolateSeriesAtX(seriesItem.points, time);
      if (!interpolated) {
        return null;
      }

      return {
        seriesId: seriesItem.id,
        label: seriesItem.label,
        color: seriesItem.color,
        dashed: seriesItem.dashed,
        setup: seriesItem.meta?.setup,
        pointIndex: interpolated.pointIndex,
        pointCount: interpolated.pointCount,
        point: interpolated.point,
      };
    })
    .filter(Boolean) as LineGraphLinkedMarker["samples"];

  if (!samples.length) {
    return null;
  }

  return {
    mode: "inspect",
    label: `paused t = ${formatNumber(time)} s`,
    xValue: time,
    activeSeriesId:
      compareState
        ? samples.find((item) => item.setup === compareState.activeTarget)?.seriesId ?? null
        : samples[0]?.seriesId ?? null,
    samples,
  };
}

function resolvePreviewParams(
  params: SimulationParams,
  compareState: CompareState | null,
  setup?: GraphSeriesSetupId,
) {
  if (!compareState || !setup) {
    return params;
  }

  return getCompareSetupById(compareState, setup).params;
}

function buildGraphPreview(
  concept: ConceptSimulationSource,
  graphId: string,
  params: SimulationParams,
  compareState: CompareState | null,
  sample: GraphPreviewSample | null,
): GraphStagePreview | null {
  if (!sample) {
    return null;
  }

  const graphKind = getGraphInteractionKind(concept.simulation.kind, graphId);

  if (graphKind === "trajectory" && concept.simulation.kind === "projectile") {
    const previewParams = resolvePreviewParams(params, compareState, sample.setup);
    const projectileParams = resolveProjectileParams(toProjectileInput(previewParams));
    const duration = sampleProjectileState(projectileParams, 0).timeOfFlight;
    const normalizedIndex =
      sample.pointCount > 1 ? sample.pointIndex / (sample.pointCount - 1) : 0;

    return {
      kind: "trajectory",
      graphId,
      time: duration * normalizedIndex,
      setup: sample.setup,
      seriesId: sample.seriesId,
      seriesLabel: sample.seriesLabel,
      point: sample.point,
      pointIndex: sample.pointIndex,
      pointCount: sample.pointCount,
    };
  }

  if (graphKind === "trajectory" && concept.simulation.kind === "vectors-components") {
    const normalizedIndex =
      sample.pointCount > 1 ? sample.pointIndex / (sample.pointCount - 1) : 0;

    return {
      kind: "trajectory",
      graphId,
      time: VECTORS_COMPONENTS_DURATION * normalizedIndex,
      setup: sample.setup,
      seriesId: sample.seriesId,
      seriesLabel: sample.seriesLabel,
      point: sample.point,
      pointIndex: sample.pointIndex,
      pointCount: sample.pointCount,
    };
  }

  if (graphKind === "response") {
    return {
      kind: "response",
      graphId,
      setup: sample.setup,
      seriesId: sample.seriesId,
      seriesLabel: sample.seriesLabel,
      point: sample.point,
      pointIndex: sample.pointIndex,
      pointCount: sample.pointCount,
    };
  }

  return {
    kind: "time",
    graphId,
    time: sample.point.x,
    setup: sample.setup,
    seriesId: sample.seriesId,
    seriesLabel: sample.seriesLabel,
    point: sample.point,
    pointIndex: sample.pointIndex,
    pointCount: sample.pointCount,
  };
}

function describeLocalizedGraphPreview(
  concept: ConceptSimulationSource,
  preview: GraphStagePreview,
  compareState: CompareState | null,
  t: ConceptRuntimeTranslator,
) {
  const graph = concept.simulation.graphs.find((item) => item.id === preview.graphId);
  const graphLabel = formatDisplayText(graph?.label ?? preview.graphId);
  const xLabel = formatDisplayText(graph?.xLabel ?? "x");
  const yLabel = formatDisplayText(graph?.yLabel ?? "y");
  const seriesLabel = formatDisplayText(preview.seriesLabel);
  const setupSuffix =
    preview.setup && compareState
      ? t("graphs.previewSetupSuffix", {
          label: getCompareSetupById(compareState, preview.setup).label,
        })
      : "";

  if (preview.kind === "time") {
    return t("graphs.previewTimePoint", {
      graph: graphLabel,
      series: seriesLabel,
      setupSuffix,
      time: formatNumber(preview.time),
      y: formatNumber(preview.point.y),
      yLabel,
    });
  }

  return t("graphs.previewPoint", {
    graph: graphLabel,
    series: seriesLabel,
    setupSuffix,
    x: formatNumber(preview.point.x),
    xLabel,
    y: formatNumber(preview.point.y),
    yLabel,
  });
}

function formatUnitValue(value: number, unit: string) {
  return `${formatNumber(value)} ${unit}`;
}

function resolveLocalizedStateDescription(
  concept: ConceptSimulationSource,
  params: SimulationParams,
  time: number,
  t: ConceptRuntimeTranslator,
) {
  if (concept.simulation.kind === "projectile") {
    const resolved = resolveProjectileParams(params);
    const displayTime = clampProjectileTime(resolved, time);
    const state = sampleProjectileState(resolved, displayTime);
    const speed = Math.hypot(state.vx, state.vy);

    return t("stateDescriptions.projectile", {
      time: formatUnitValue(displayTime, "s"),
      x: formatUnitValue(state.x, "m"),
      y: formatUnitValue(state.y, "m"),
      speed: formatUnitValue(speed, "m/s"),
      angle: formatUnitValue(resolved.launchAngle, "deg"),
      range: formatUnitValue(state.range, "m"),
      maxHeight: formatUnitValue(state.maxHeight, "m"),
    });
  }

  if (concept.simulation.kind === "vectors-components") {
    const snapshot = sampleVectorsComponentsState(params, time);
    const horizontalDirection =
      Math.abs(snapshot.vx) < 0.05
        ? t("stateDescriptions.vectorsComponents.directions.noneHorizontal")
        : snapshot.vx > 0
          ? t("stateDescriptions.vectorsComponents.directions.right")
          : t("stateDescriptions.vectorsComponents.directions.left");
    const verticalDirection =
      Math.abs(snapshot.vy) < 0.05
        ? t("stateDescriptions.vectorsComponents.directions.noneVertical")
        : snapshot.vy > 0
          ? t("stateDescriptions.vectorsComponents.directions.upward")
          : t("stateDescriptions.vectorsComponents.directions.downward");

    return t("stateDescriptions.vectorsComponents.text", {
      time: formatUnitValue(clampVectorsComponentsTime(time), "s"),
      x: formatUnitValue(snapshot.x, "m"),
      y: formatUnitValue(snapshot.y, "m"),
      magnitude: formatUnitValue(snapshot.magnitude, "m/s"),
      angle: formatUnitValue(snapshot.angle, "deg"),
      vx: formatUnitValue(snapshot.vx, "m/s"),
      vy: formatUnitValue(snapshot.vy, "m/s"),
      horizontalDirection,
      verticalDirection,
    });
  }

  if (concept.simulation.kind === "shm") {
    const resolved = {
      amplitude: Number(params.amplitude ?? 0),
      springConstant:
        typeof params.springConstant === "number" ? params.springConstant : undefined,
      mass: typeof params.mass === "number" ? params.mass : undefined,
      phase: Number(params.phase ?? 0),
      angularFrequency:
        typeof params.omega === "number"
          ? params.omega
          : typeof params.angularFrequency === "number"
            ? params.angularFrequency
            : undefined,
      damping: typeof params.damping === "number" ? params.damping : undefined,
      equilibriumShift:
        typeof params.equilibriumShift === "number" ? params.equilibriumShift : undefined,
    };
    const state = sampleShmState(resolved, time);
    const omega = resolveAngularFrequency(resolved);
    const period = (Math.PI * 2) / Math.max(omega, 0.001);
    const phaseAngle = omega * time + Number(params.phase ?? 0);

    return t("stateDescriptions.shm", {
      time: formatUnitValue(time, "s"),
      displacement: formatUnitValue(state.displacement, "m"),
      velocity: formatUnitValue(state.velocity, "m/s"),
      acceleration: formatUnitValue(state.acceleration, "m/s^2"),
      phaseAngle: formatUnitValue(phaseAngle, "rad"),
      period: formatUnitValue(period, "s"),
    });
  }

  return null;
}

function buildCompareGraphSeries(
  graphId: string,
  seriesMapA: GraphSeriesMap,
  seriesMapB: GraphSeriesMap,
  labelA: string,
  labelB: string,
): GraphSeries[] {
  const seriesA = seriesMapA[graphId] ?? [];
  const seriesB = seriesMapB[graphId] ?? [];
  const merged: GraphSeries[] = [];
  const seriesCount = Math.max(seriesA.length, seriesB.length);

  for (let index = 0; index < seriesCount; index += 1) {
    const seriesItemA = seriesA[index];
    const seriesItemB = seriesB[index];

    if (seriesItemA) {
      merged.push({
        ...seriesItemA,
        id: `setup-a-${graphId}-${seriesItemA.id}`,
        label: `${labelA} ${seriesItemA.label}`,
        dashed: false,
        meta: {
          ...(seriesItemA.meta ?? {}),
          setup: "a",
          sourceSeriesId: seriesItemA.id,
        },
      });
    }

    if (seriesItemB) {
      merged.push({
        ...seriesItemB,
        id: `setup-b-${graphId}-${seriesItemB.id}`,
        label: `${labelB} ${seriesItemB.label}`,
        color: seriesItemA?.color ?? seriesItemB.color,
        dashed: true,
        meta: {
          ...(seriesItemB.meta ?? {}),
          setup: "b",
          sourceSeriesId: seriesItemB.id,
        },
      });
    }
  }

  return merged;
}

function deriveOverlayState(source: ConceptSimulationSource) {
  return Object.fromEntries(
    (source.simulation.overlays ?? []).map((overlay) => [overlay.id, overlay.defaultOn]),
  );
}

const preferredBenchEquationIdsByConcept: Record<string, string[]> = {
  diffraction: ["edge-path-difference", "first-minimum"],
};

function selectBenchEquations(source: ConceptSimulationSource) {
  const preferredIds = preferredBenchEquationIdsByConcept[source.slug ?? ""];

  if (preferredIds?.length) {
    const equationById = new Map(source.equations.map((equation) => [equation.id, equation]));
    const selectedEquations = preferredIds
      .map((equationId) => equationById.get(equationId))
      .filter((equation): equation is ConceptSimulationSource["equations"][number] => Boolean(equation));

    if (selectedEquations.length) {
      return selectedEquations.slice(0, 2);
    }
  }

  return source.equations.slice(0, 2);
}

function resolveFocusedOverlayId(
  source: ConceptSimulationSource,
  overlayValues: Record<string, boolean>,
  currentId: string | null,
) {
  const overlays = source.simulation.overlays ?? [];
  if (!overlays.length) {
    return null;
  }

  if (currentId && overlays.some((overlay) => overlay.id === currentId)) {
    return currentId;
  }

  const enabledOverlay = overlays.find((overlay) => overlayValues[overlay.id]);
  return enabledOverlay?.id ?? overlays[0]?.id ?? null;
}

function mergeUniqueIds(...groups: Array<string[] | undefined>) {
  return Array.from(
    new Set(groups.flatMap((group) => group ?? []).filter((value): value is string => Boolean(value))),
  );
}

function shouldResetLiveClockOnSetupChange(kind: SimulationKind) {
  return (
    kind === "reaction-rate-collision-theory" ||
    kind === "dynamic-equilibrium" ||
    kind === "rc-charging-discharging"
  );
}

export function ConceptSimulationRenderer({
  concept,
  readNext = [],
  className,
  initialSyncedSnapshot = null,
  initialChallengeItemId = null,
  initialSimulationState = null,
  starterGuidePlacement = "inline",
  afterBench,
}: ConceptSimulationRendererProps) {
  const conceptPagePhase = useConceptPagePhase();
  const locale = useLocale() as AppLocale;
  const t = useTranslations("ConceptRuntime");
  const tCompare = useTranslations("CompareModePanel");
  const conceptRuntimeT = t as unknown as ConceptRuntimeTranslator;
  const tNotice = useTranslations("WhatToNoticePanel");
  const activeConceptPagePhaseId = conceptPagePhase?.activePhaseId ?? null;
  const guidedStepCard = conceptPagePhase?.guidedStepCard ?? null;
  const guidedReveal = conceptPagePhase?.guidedReveal ?? null;
  const isGuidedLessonMode = Boolean(guidedStepCard);
  const [activeLocationHash, setActiveLocationHash] = useState<string>(() =>
    typeof window === "undefined" ? "" : window.location.hash,
  );
  const simulationUiHints = useMemo(
    () => resolveSimulationUiHints(concept.simulation),
    [concept.simulation],
  );
  const defaultActiveGraphId = simulationUiHints.initialGraphId;
  const starterExploreTasks = simulationUiHints.starterExploreTasks;
  const defaultCompareSetupLabels = useMemo(
    () => buildDefaultCompareSetupLabels(locale),
    [locale],
  );
  const {
    publishRuntimeSnapshot,
    publishWorkedExampleSnapshot,
    registerQuickTestHandler,
    registerWorkedExampleHandler,
  } = useConceptLearningBridge();
  const { markMeaningfulInteraction } = useConceptAchievementTracker();
  const initialCompareState = restoreInitialCompareState(
    initialSimulationState?.compare ?? null,
    defaultCompareSetupLabels,
  );
  const initialActiveCompareSetup = initialCompareState
    ? getActiveCompareSetup(initialCompareState)
    : null;
  const initialOverlayValues = initialSimulationState?.overlayValues ?? deriveOverlayState(concept);
  const initialFocusedOverlayId =
    initialSimulationState?.focusedOverlayId ??
    resolveFocusedOverlayId(concept, initialOverlayValues, null);
  const progressIdentity = useMemo(
    () => ({
      id: concept.id,
      slug: concept.slug ?? "simple-harmonic-motion",
      title: concept.title,
    }),
    [concept.id, concept.slug, concept.title],
  );
  const recordMeaningfulConceptInteraction = useCallback(() => {
    markMeaningfulInteraction();
    recordConceptInteraction(progressIdentity);
  }, [markMeaningfulInteraction, progressIdentity]);
  const runtime = modules[concept.simulation.kind];
  const RuntimeScene = runtime.renderScene;
  const noticePromptConfig = concept.noticePrompts;
  const predictionConfig = concept.predictionMode;
  const challengeMode = concept.challengeMode;
  const [activeChallengeItemId, setActiveChallengeItemId] = useState<string | null>(
    initialChallengeItemId ?? challengeMode?.items[0]?.id ?? null,
  );
  const [isFullChallengePanelVisible, setIsFullChallengePanelVisible] = useState(true);
  const fullChallengePanelRef = useRef<HTMLDivElement | null>(null);
  const { params, setParam, applyValues, applyPreset, reset, activePresetId } =
    useSimulationControls(concept.simulation, {
      initialParams: initialActiveCompareSetup?.params ?? initialSimulationState?.params,
      initialActivePresetId:
        initialActiveCompareSetup?.activePresetId ?? initialSimulationState?.activePresetId,
    });
  const [overlays, setOverlays] = useState<Record<string, boolean>>(
    initialOverlayValues,
  );
  const [focusedOverlayId, setFocusedOverlayId] = useState<string | null>(
    initialFocusedOverlayId,
  );
  const [interactionMode, setInteractionMode] = useState<InteractionMode>(
    initialCompareState ? "compare" : "explore",
  );
  const [compareState, setCompareState] = useState<CompareState | null>(initialCompareState);
  const compareStateRef = useRef<CompareState | null>(initialCompareState);
  const [activeGraphId, setActiveGraphId] = useState(
    initialSimulationState?.activeGraphId ?? defaultActiveGraphId,
  );
  const [activeVariableId, setActiveVariableId] = useState<string | null>(
    concept.variableLinks[0]?.id ?? null,
  );
  const [activePredictionItemId, setActivePredictionItemId] = useState<string | null>(
    predictionConfig?.items[0]?.id ?? null,
  );
  const [selectedPredictionChoiceId, setSelectedPredictionChoiceId] = useState<string | null>(
    null,
  );
  const [predictionAnswered, setPredictionAnswered] = useState(false);
  const [predictionTested, setPredictionTested] = useState(false);
  const [predictionCompleted, setPredictionCompleted] = useState(false);
  const [isPredictionPanelOpen, setIsPredictionPanelOpen] = useState(false);
  const [phaseSupportDisclosureOpenByPhase, setPhaseSupportDisclosureOpenByPhase] = useState<
    Partial<Record<ConceptLearningPhaseId, boolean>>
  >({});
  const [lastChangedParam, setLastChangedParam] = useState<string | null>(null);
  const [noticePromptOffset, setNoticePromptOffset] = useState(0);
  const [noticePromptHidden, setNoticePromptHidden] = useState(true);
  const [quickTestFocus, setQuickTestFocus] = useState<QuickTestFocusState | null>(null);
  const [workedExampleFocus, setWorkedExampleFocus] = useState<QuickTestFocusState | null>(null);
  const [moreToolsExpanded, setMoreToolsExpanded] = useState(Boolean(initialChallengeItemId));
  const [graphPreview, setGraphPreview] = useState<GraphStagePreview | null>(null);
  const [inspectedTime, setInspectedTime] = useState<number | null>(
    initialSimulationState?.inspectTime ?? null,
  );
  const {
    time: liveClockTime,
    isPlaying,
    play,
    pause,
    seek,
    reset: resetClock,
  } =
    useAnimationClock({
      autoStart: initialSimulationState?.inspectTime == null,
      initialTime: initialSimulationState?.inspectTime ?? 0,
      stepSeconds: 1 / 30,
      speed: 1,
    });

  const compareEnabled = interactionMode === "compare" && compareState !== null;
  const activeCompareSetup = compareEnabled ? getActiveCompareSetup(compareState) : null;
  const compareSetupPairLabel = compareEnabled
    ? `${compareState.setupA.label} and ${compareState.setupB.label}`
    : null;
  const compareTargetLabel = compareEnabled
    ? compareState.activeTarget.toUpperCase()
    : null;
  const controlValues = activeCompareSetup?.params ?? params;
  const controlPresetId = activeCompareSetup?.activePresetId ?? activePresetId;
  const simulationOverlays = concept.simulation.overlays ?? [];
  const focusedOverlay =
    simulationOverlays.find((overlay) => overlay.id === focusedOverlayId) ??
    simulationOverlays[0] ??
    null;
  const activeGraph =
    concept.simulation.graphs.find((graph) => graph.id === activeGraphId) ??
    concept.simulation.graphs.find((graph) => graph.id === defaultActiveGraphId) ??
    concept.simulation.graphs[0];
  const seriesMap = runtime.buildSeries(controlValues, locale);
  const compareSeriesMaps = compareEnabled
    ? {
        a: runtime.buildSeries(compareState.setupA.params, locale),
        b: runtime.buildSeries(compareState.setupB.params, locale),
      }
    : null;
  const graphSeries = activeGraph
    ? compareSeriesMaps
      ? buildCompareGraphSeries(
          activeGraph.id,
          compareSeriesMaps.a,
          compareSeriesMaps.b,
          compareState!.setupA.label,
          compareState!.setupB.label,
        )
      : seriesMap[activeGraph.id] ?? []
    : [];
  const graphBounds = activeGraph
    ? resolveStableGraphBounds(concept, controlValues, compareState, activeGraph.id, graphSeries)
    : null;
  const timeDomain = resolveTimeDomain(
    concept.simulation.kind,
    controlValues,
    seriesMap,
    compareState,
    compareSeriesMaps,
  );
  const hasInteractiveTime = timeDomain.max > 0.0001;
  const liveDisplayTime = hasInteractiveTime
    ? normalizeLoopingTime(liveClockTime, timeDomain.max)
    : 0;
  const isInspecting = inspectedTime !== null;
  const graphPreviewTime =
    graphPreview && graphPreview.kind !== "response" ? graphPreview.time : null;
  const currentTime = hasInteractiveTime ? inspectedTime ?? liveDisplayTime : 0;
  const workedExampleTime = hasInteractiveTime
    ? inspectedTime ?? graphPreviewTime ?? liveDisplayTime
    : 0;
  const workedExampleTimeSource: LiveWorkedExampleState["timeSource"] = hasInteractiveTime
    ? inspectedTime !== null
      ? "inspect"
      : graphPreviewTime !== null
        ? "preview"
        : "live"
    : "live";
  const effectiveGraphPreview = isInspecting ? null : graphPreview;
  const stateDescription =
    resolveLocalizedStateDescription(concept, controlValues, currentTime, conceptRuntimeT) ??
    runtime.describeState(controlValues, currentTime, locale);
  const simulationDescription =
    concept.accessibility?.simulationDescription ??
    concept.simulation.accessibility.simulationDescription;
  const graphSummary =
    concept.accessibility?.graphSummary ??
    concept.simulation.accessibility.graphSummary;
  const predictionItems = useMemo(
    () => predictionConfig?.items ?? [],
    [predictionConfig?.items],
  );
  const activePredictionItem =
    predictionItems.find((item) => item.id === activePredictionItemId) ??
    predictionItems[0] ??
    null;
  const activePredictionScenario =
    isPredictionPanelOpen ? activePredictionItem?.scenario ?? null : null;
  const visibleOverlayIds = simulationOverlays
    .filter((overlay) => overlays[overlay.id])
    .map((overlay) => overlay.id);
  const resolvedNoticePrompts = useMemo(
    () =>
      resolveNoticePrompts(noticePromptConfig, {
        params: controlValues,
        activeGraphId: activeGraph?.id ?? null,
        activeGraphLabel: activeGraph?.label ?? null,
        interactionMode,
        activeCompareTarget: compareEnabled ? compareState.activeTarget : null,
        focusedOverlayId: focusedOverlay?.id ?? null,
        visibleOverlayIds,
        timeSource: workedExampleTimeSource,
        time: workedExampleTime,
        lastChangedParam,
        formatGraphBadge: (label) => tNotice("contextBadges.graph", { label }),
        formatPausedBadge: (timeValue) =>
          tNotice("contextBadges.pausedAt", {
            time: formatUnitValue(timeValue, "s"),
          }),
        formatPreviewBadge: (timeValue) =>
          tNotice("contextBadges.previewingAt", {
            time: formatUnitValue(timeValue, "s"),
          }),
        formatActiveSetupBadge: (target) =>
          tNotice("contextBadges.activeSetup", {
            label: target.toUpperCase(),
          }),
      }),
    [
      activeGraph?.id,
      activeGraph?.label,
      compareEnabled,
      compareState,
      controlValues,
      focusedOverlay?.id,
      interactionMode,
      lastChangedParam,
      noticePromptConfig,
      tNotice,
      visibleOverlayIds,
      workedExampleTime,
      workedExampleTimeSource,
    ],
  );
  const normalizedNoticePromptIndex = resolvedNoticePrompts.length
    ? noticePromptOffset % resolvedNoticePrompts.length
    : 0;
  const activeNoticePrompt =
    resolvedNoticePrompts[normalizedNoticePromptIndex] ?? null;
  const predictionHighlightedControlIds =
    activePredictionScenario?.highlightedControlIds ?? [];
  const predictionHighlightedGraphIds =
    activePredictionScenario?.highlightedGraphIds ?? [];
  const predictionHighlightedOverlayIds =
    activePredictionScenario?.highlightedOverlayIds ?? [];
  const quickTestHighlightedControlIds = quickTestFocus?.highlightedControlIds ?? [];
  const quickTestHighlightedGraphIds = quickTestFocus?.highlightedGraphIds ?? [];
  const quickTestHighlightedOverlayIds = quickTestFocus?.highlightedOverlayIds ?? [];
  const workedExampleHighlightedControlIds = workedExampleFocus?.highlightedControlIds ?? [];
  const workedExampleHighlightedGraphIds = workedExampleFocus?.highlightedGraphIds ?? [];
  const workedExampleHighlightedOverlayIds = workedExampleFocus?.highlightedOverlayIds ?? [];
  const noticePromptHighlightedControlIds =
    !noticePromptHidden ? activeNoticePrompt?.relatedControls ?? [] : [];
  const noticePromptHighlightedGraphIds =
    !noticePromptHidden ? activeNoticePrompt?.relatedGraphTabs ?? [] : [];
  const noticePromptHighlightedOverlayIds =
    !noticePromptHidden ? activeNoticePrompt?.relatedOverlays ?? [] : [];
  const highlightedControlIds = mergeUniqueIds(
    predictionHighlightedControlIds,
    quickTestHighlightedControlIds,
    workedExampleHighlightedControlIds,
    noticePromptHighlightedControlIds,
    guidedReveal?.controlIds,
    focusedOverlay?.relatedControls,
  );
  const autoRevealControlIds = mergeUniqueIds(
    predictionHighlightedControlIds,
    quickTestHighlightedControlIds,
    workedExampleHighlightedControlIds,
    guidedReveal?.controlIds,
  );
  const highlightedGraphIds = mergeUniqueIds(
    predictionHighlightedGraphIds,
    quickTestHighlightedGraphIds,
    workedExampleHighlightedGraphIds,
    noticePromptHighlightedGraphIds,
    guidedReveal?.graphIds,
    focusedOverlay?.relatedGraphTabs,
  );
  const autoRevealGraphIds = mergeUniqueIds(
    predictionHighlightedGraphIds,
    quickTestHighlightedGraphIds,
    workedExampleHighlightedGraphIds,
    guidedReveal?.graphIds,
  );
  const highlightedOverlayIds = mergeUniqueIds(
    predictionHighlightedOverlayIds,
    quickTestHighlightedOverlayIds,
    workedExampleHighlightedOverlayIds,
    noticePromptHighlightedOverlayIds,
    guidedReveal?.overlayIds,
    focusedOverlay ? [focusedOverlay.id] : [],
  );
  const effectivePrimaryControlIds =
    guidedReveal?.controlIds?.length ? guidedReveal.controlIds : simulationUiHints.primaryControlIds;
  const effectivePrimaryGraphIds =
    guidedReveal?.graphIds?.length ? guidedReveal.graphIds : simulationUiHints.primaryGraphIds;
  const guidedPrimaryGraphId = guidedReveal?.graphIds?.[0] ?? null;
  const guidedPrimaryOverlayId = guidedReveal?.overlayIds?.[0] ?? null;

  const previewDescription = effectiveGraphPreview
    ? describeLocalizedGraphPreview(
        concept,
        effectiveGraphPreview,
        compareState,
        conceptRuntimeT,
      )
    : null;
  const activeGraphKind = activeGraph
    ? getGraphInteractionKind(concept.simulation.kind, activeGraph.id)
    : "time";
  const inspectionMarker =
    isInspecting && activeGraph
      ? buildInspectionMarker(
          concept,
          activeGraph.id,
          graphSeries,
          currentTime,
          controlValues,
          compareState,
        )
      : null;
  const timeRailNote = !hasInteractiveTime
    ? t("timeRail.static")
    : activeGraphKind === "response"
      ? t("timeRail.parameterView")
      : isInspecting
        ? t("timeRail.inspecting", { time: formatNumber(currentTime) })
        : t("timeRail.default");

  useEffect(() => {
    if (!challengeMode?.items.length) {
      setActiveChallengeItemId(null);
      return;
    }

    setActiveChallengeItemId((current) => {
      if (current && challengeMode.items.some((item) => item.id === current)) {
        return current;
      }

      return initialChallengeItemId ?? challengeMode.items[0]?.id ?? null;
    });
  }, [challengeMode, initialChallengeItemId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const syncActiveHash = () => {
      setActiveLocationHash(window.location.hash);
    };

    syncActiveHash();
    window.addEventListener("hashchange", syncActiveHash);
    window.addEventListener("popstate", syncActiveHash);

    return () => {
      window.removeEventListener("hashchange", syncActiveHash);
      window.removeEventListener("popstate", syncActiveHash);
    };
  }, []);

  useEffect(() => {
    if (activeConceptPagePhaseId !== "check" || !challengeMode?.items.length) {
      setIsFullChallengePanelVisible(true);
      return;
    }

    const node = fullChallengePanelRef.current;

    if (!node || typeof IntersectionObserver === "undefined") {
      return;
    }

    if (window.location.hash === `#${conceptShareAnchorIds.challengeMode}`) {
      setIsFullChallengePanelVisible(true);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const viewportHeight =
          window.innerHeight || document.documentElement.clientHeight || 0;
        const hasViewportOverlap =
          entry.boundingClientRect.top < viewportHeight &&
          entry.boundingClientRect.bottom > 0;

        setIsFullChallengePanelVisible(
          entry.isIntersecting && hasViewportOverlap,
        );
      },
      {
        threshold: [0, 0.2, 0.35, 0.6, 1],
      },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [activeConceptPagePhaseId, challengeMode]);

  useEffect(() => {
    setGraphPreview(null);
  }, [activeGraphId, interactionMode, compareEnabled, isInspecting]);

  useEffect(() => {
    if (guidedPrimaryGraphId && guidedPrimaryGraphId !== activeGraphId) {
      setActiveGraphId(guidedPrimaryGraphId);
    }
  }, [activeGraphId, guidedPrimaryGraphId]);

  useEffect(() => {
    setFocusedOverlayId((current) => resolveFocusedOverlayId(concept, overlays, current));
  }, [concept, overlays]);

  useEffect(() => {
    if (!guidedPrimaryOverlayId) {
      return;
    }

    setFocusedOverlayId(guidedPrimaryOverlayId);
  }, [guidedPrimaryOverlayId]);

  useEffect(() => {
    if (inspectedTime === null) {
      return;
    }

    setInspectedTime((current) =>
      current === null ? current : clampTimeCursor(current, timeDomain.max),
    );
  }, [inspectedTime, timeDomain.max]);

  useEffect(() => {
    if (interactionMode === "explore") {
      return;
    }

    setQuickTestFocus(null);
  }, [interactionMode]);

  useEffect(() => {
    if (!resolvedNoticePrompts.length) {
      if (noticePromptOffset !== 0) {
        setNoticePromptOffset(0);
      }
      return;
    }

    if (noticePromptOffset >= resolvedNoticePrompts.length) {
      setNoticePromptOffset((current) => current % resolvedNoticePrompts.length);
    }
  }, [noticePromptOffset, resolvedNoticePrompts.length]);

  useEffect(() => {
    if (!predictionItems.length) {
      setIsPredictionPanelOpen(false);
      setActivePredictionItemId(null);
      return;
    }

    if (activePredictionItemId && predictionItems.some((item) => item.id === activePredictionItemId)) {
      return;
    }

    setActivePredictionItemId(predictionItems[0]?.id ?? null);
  }, [activePredictionItemId, predictionItems]);

  function resetPredictionSelection(
    nextItemId: string | null = activePredictionItem?.id ?? predictionItems[0]?.id ?? null,
  ) {
    setSelectedPredictionChoiceId(null);
    setPredictionAnswered(false);
    setPredictionTested(false);
    if (nextItemId) {
      setActivePredictionItemId(nextItemId);
    }
  }

  function resetPredictionWorkflow(
    nextItemId: string | null = predictionItems[0]?.id ?? null,
  ) {
    setIsPredictionPanelOpen(false);
    setPredictionCompleted(false);
    resetPredictionSelection(nextItemId);
  }

  function openPredictionWorkflow(
    nextItemId: string | null = activePredictionItem?.id ?? predictionItems[0]?.id ?? null,
  ) {
    if (!predictionItems.length) {
      return;
    }

    if (compareStateRef.current || interactionMode === "compare") {
      resetPredictionWorkflow(nextItemId);
      return;
    }

    if (interactionMode !== "explore") {
      setInteractionMode("explore");
    }

    recordPredictionModeUsed(progressIdentity);
    setPredictionCompleted(false);
    resetPredictionSelection(nextItemId);
    setIsPredictionPanelOpen(true);
  }

  function closePredictionWorkflow() {
    resetPredictionWorkflow();
  }

  function focusPredictionTargets(controlIds?: string[], graphIds?: string[]) {
    const nextGraphId = graphIds?.[0];
    if (nextGraphId) {
      setActiveGraphId(nextGraphId);
    }

    const linkedVariable = concept.variableLinks.find(
      (variableLink) =>
        (controlIds ?? []).includes(variableLink.param) ||
        (controlIds ?? []).includes(variableLink.id),
    );

    if (linkedVariable) {
      setActiveVariableId(linkedVariable.id);
    }
  }

  function focusOverlay(overlayId: string) {
    const nextOverlay =
      concept.simulation.overlays?.find((overlay) => overlay.id === overlayId) ?? null;
    setFocusedOverlayId(overlayId);

    const relatedVariableId = nextOverlay?.relatedEquationVariables?.[0];
    if (relatedVariableId) {
      setActiveVariableId(relatedVariableId);
    }
  }

  function toggleOverlay(overlayId: string, value: boolean) {
    recordMeaningfulConceptInteraction();
    setOverlays((current) => ({ ...current, [overlayId]: value }));
    focusOverlay(overlayId);
  }

  function applyLiveParamChange(param: string, value: ControlValue) {
    recordMeaningfulConceptInteraction();
    setLastChangedParam(param);

    if (compareEnabled) {
      applyCompareParam(param, value);
      return;
    }

    const patch = resolveParamPatch(concept.simulation.kind, controlValues, param, value);
    const patchEntries = Object.entries(patch);

    if (patchEntries.length === 1) {
      const [patchParam, patchValue] = patchEntries[0];
      setParam(patchParam, patchValue);
      if (shouldResetLiveClockOnSetupChange(concept.simulation.kind)) {
        setGraphPreview(null);
        setInspectedTime(null);
        resetClock(0);
        play();
      }
      return;
    }

    applyValues(patch, null);
    if (shouldResetLiveClockOnSetupChange(concept.simulation.kind)) {
      setGraphPreview(null);
      setInspectedTime(null);
      resetClock(0);
      play();
    }
  }

  function cycleNoticePrompt() {
    if (!resolvedNoticePrompts.length) {
      return;
    }

    setNoticePromptHidden(false);
    setNoticePromptOffset((current) => (current + 1) % resolvedNoticePrompts.length);
  }

  function restartNoticePrompts() {
    setNoticePromptHidden(false);
    setNoticePromptOffset(0);
  }

  function buildChallengeSetupParams(item: NonNullable<typeof challengeMode>["items"][number]) {
    const setup = item.setup;
    let nextParams = cloneParams(params);
    let nextPresetId: string | null = null;

    if (!setup) {
      return {
        nextParams,
        nextPresetId,
      };
    }

    if (setup.presetId) {
      const preset = concept.simulation.presets.find((entry) => entry.id === setup.presetId);

      if (preset) {
        nextParams = {
          ...nextParams,
          ...preset.values,
        };
        nextPresetId = preset.id;
      }
    }

    for (const [param, value] of Object.entries(setup.patch ?? {})) {
      nextParams = {
        ...nextParams,
        ...resolveParamPatch(concept.simulation.kind, nextParams, param, value),
      };
    }

    return {
      nextParams,
      nextPresetId,
    };
  }

  function applyChallengeSetup(item: NonNullable<typeof challengeMode>["items"][number]) {
    const setup = item.setup;

    if (!setup) {
      return;
    }

    setLastChangedParam(null);
    setGraphPreview(null);
    setQuickTestFocus(null);
    setWorkedExampleFocus(null);

    const { nextParams, nextPresetId } = buildChallengeSetupParams(item);
    const shouldCompare = setup.interactionMode === "compare";

    if (compareStateRef.current) {
      clearCompareState("explore");
    } else if (interactionMode !== "explore") {
      setInteractionMode("explore");
    }

    applyValues(nextParams, nextPresetId);

    if (setup.graphId) {
      setActiveGraphId(setup.graphId);
    }

    if (setup.overlayIds?.length) {
      setOverlays((current) => {
        const nextState = { ...current };

        for (const overlayId of setup.overlayIds ?? []) {
          nextState[overlayId] = true;
        }

        return nextState;
      });
      focusOverlay(setup.overlayIds[0]);
    }

    if (shouldCompare) {
      recordCompareModeUsed(progressIdentity);

      const nextState: CompareState = {
        activeTarget: "b",
        setupA: {
          label: defaultCompareSetupLabels.a,
          params: cloneParams(nextParams),
          activePresetId: nextPresetId,
        },
        setupB: {
          label: defaultCompareSetupLabels.b,
          params: cloneParams(nextParams),
          activePresetId: nextPresetId,
        },
      };

      compareStateRef.current = nextState;
      setCompareState(nextState);
      setInteractionMode("compare");
      syncLiveSetup(nextState.setupB);
    } else {
      seek(0);
      resetClock(0);
      setInteractionMode("explore");
    }

    if (setup.inspectTime !== undefined) {
      enterInspectionTime(setup.inspectTime);
      return;
    }

    setInspectedTime(null);
    play();
  }

  function enterInspectionTime(nextTime: number) {
    recordMeaningfulConceptInteraction();
    pause();
    setGraphPreview(null);
    setInspectedTime(clampTimeCursor(nextTime, timeDomain.max));
  }

  function resolveInspectionAnchorTime() {
    return clampTimeCursor(graphPreviewTime ?? currentTime, timeDomain.max);
  }

  function togglePlayback() {
    if (!hasInteractiveTime) {
      return;
    }

    if (isPlaying && !isInspecting) {
      enterInspectionTime(resolveInspectionAnchorTime());
      return;
    }

    const resumeTime = clampTimeCursor(inspectedTime ?? currentTime, timeDomain.max);
    setGraphPreview(null);
    setInspectedTime(null);
    seek(resumeTime);
    play();
  }

  function stepInspection(direction: -1 | 1) {
    if (!hasInteractiveTime) {
      return;
    }

    const anchorTime = inspectedTime ?? resolveInspectionAnchorTime();
    enterInspectionTime(anchorTime + timeDomain.step * direction);
  }

  function scrubInspection(nextTime: number) {
    if (!hasInteractiveTime) {
      return;
    }

    enterInspectionTime(nextTime);
  }

  function resetInspectionTime() {
    if (!hasInteractiveTime) {
      return;
    }

    enterInspectionTime(0);
    seek(0);
  }

  function syncLiveSetup(setup: CompareSetup) {
    applyValues(setup.params, setup.activePresetId);
    resetClock(0);
  }

  function createCompareStateFromCurrent(): CompareState {
    const baseline: CompareSetup = {
      label: defaultCompareSetupLabels.a,
      params: cloneParams(params),
      activePresetId: activePresetId ?? null,
    };

    return {
      activeTarget: "b",
      setupA: baseline,
      setupB: {
        label: defaultCompareSetupLabels.b,
        params: cloneParams(baseline.params),
        activePresetId: baseline.activePresetId,
      },
    };
  }

  function commitCompareState(
    nextState: CompareState,
    options: {
      syncLive?: boolean;
    } = {},
  ) {
    compareStateRef.current = nextState;
    setCompareState(nextState);

    if (options.syncLive !== false) {
      syncLiveSetup(getActiveCompareSetup(nextState));
    }
  }

  function clearCompareState(nextMode: Exclude<InteractionMode, "compare"> = "explore") {
    compareStateRef.current = null;
    setCompareState(null);
    setInteractionMode(nextMode);
  }

  function enterCompareMode() {
    resetPredictionWorkflow();
    recordCompareModeUsed(progressIdentity);
    const nextState = createCompareStateFromCurrent();
    compareStateRef.current = nextState;
    setCompareState(nextState);
    setInteractionMode("compare");
  }

  function setInteraction(nextMode: InteractionMode) {
    if (nextMode === interactionMode && !(nextMode === "compare" && !compareStateRef.current)) {
      return;
    }

    if (nextMode === "compare") {
      enterCompareMode();
      return;
    }

    if (compareStateRef.current) {
      clearCompareState(nextMode);
      return;
    }

    setInteractionMode(nextMode);
  }

  function updateCompareState(
    updater: (current: CompareState, targetKey: "setupA" | "setupB") => CompareState,
  ) {
    const current = compareStateRef.current;
    if (!current) {
      return;
    }

    const targetKey = current.activeTarget === "a" ? "setupA" : "setupB";
    commitCompareState(updater(current, targetKey));
  }

  function selectCompareTarget(target: CompareTarget) {
    const current = compareStateRef.current;
    if (!current) {
      return;
    }

    commitCompareState({
      ...current,
      activeTarget: target,
    });
  }

  function applyCompareParam(param: string, value: ControlValue) {
    updateCompareState((current, targetKey) => ({
      ...current,
      [targetKey]: {
        ...current[targetKey],
        params: {
          ...current[targetKey].params,
          ...resolveParamPatch(
            concept.simulation.kind,
            current[targetKey].params,
            param,
            value,
          ),
        },
        activePresetId: null,
      },
    }));
  }

  function applyComparePreset(presetId: string) {
    const preset = concept.simulation.presets.find((item) => item.id === presetId);
    if (!preset) {
      return;
    }

    updateCompareState((current, targetKey) => ({
      ...current,
      [targetKey]: {
        ...current[targetKey],
        params: {
          ...current[targetKey].params,
          ...preset.values,
        },
        activePresetId: presetId,
      },
    }));
  }

  function resetCompareActiveSetup() {
    updateCompareState((current, targetKey) => ({
      ...current,
      [targetKey]: {
        ...current[targetKey],
        params: cloneParams(concept.simulation.defaults),
        activePresetId: null,
      },
    }));
  }

  function resetCompareVariantToBaseline() {
    const current = compareStateRef.current;
    if (!current) {
      return;
    }

    commitCompareState({
      ...current,
      setupB: {
        ...cloneSetup(current.setupA),
        label: current.setupB.label,
      },
    });
  }

  function swapCompareSetups() {
    const current = compareStateRef.current;
    if (!current) {
      return;
    }

    commitCompareState({
      ...current,
      setupA: {
        ...cloneSetup(current.setupB),
        label: current.setupA.label,
      },
      setupB: {
        ...cloneSetup(current.setupA),
        label: current.setupB.label,
      },
    });
  }

  function restoreSavedCompareSetup(savedSetup: SavedCompareSetupRecord) {
    const resolvedState = resolveConceptSimulationState(
      savedSetup.stateParam,
      concept,
    );
    const nextCompareState = restoreInitialCompareState(
      resolvedState?.compare ?? null,
      defaultCompareSetupLabels,
    );

    if (!resolvedState || !nextCompareState) {
      return;
    }

    recordMeaningfulConceptInteraction();
    recordCompareModeUsed(progressIdentity);
    setLastChangedParam(null);
    setQuickTestFocus(null);
    setWorkedExampleFocus(null);
    setGraphPreview(null);
    setInspectedTime(null);
    setOverlays(resolvedState.overlayValues);
    setFocusedOverlayId(resolvedState.focusedOverlayId);
    setActiveGraphId(resolvedState.activeGraphId ?? defaultActiveGraphId);

    compareStateRef.current = nextCompareState;
    setCompareState(nextCompareState);
    setInteractionMode("compare");
    syncLiveSetup(getActiveCompareSetup(nextCompareState));
    play();
  }

  function applyPredictionScenario() {
    if (!activePredictionScenario) {
      return;
    }

    if (compareStateRef.current || interactionMode === "compare") {
      resetPredictionWorkflow();
      return;
    }

    recordMeaningfulConceptInteraction();

    if (activePredictionScenario.presetId) {
      applyPreset(activePredictionScenario.presetId);
    }

    if (activePredictionScenario.patch) {
      applyValues(
        activePredictionScenario.patch,
        activePredictionScenario.presetId ?? null,
      );
    }

    focusPredictionTargets(
      activePredictionScenario.highlightedControlIds,
      activePredictionScenario.highlightedGraphIds,
    );

    if (activePredictionScenario.highlightedOverlayIds?.length) {
      setOverlays((current) => {
        const nextState = { ...current };

        for (const overlayId of activePredictionScenario.highlightedOverlayIds ?? []) {
          nextState[overlayId] = true;
        }

        return nextState;
      });
      focusOverlay(activePredictionScenario.highlightedOverlayIds[0]);
    }

    setInspectedTime(null);
    resetClock(0);
    play();
    setPredictionTested(true);
  }

  const handleQuickTestAction = useEffectEvent((action: ConceptQuickTestShowMeAction) => {
    if (compareStateRef.current) {
      clearCompareState("explore");
    } else if (interactionMode !== "explore") {
      setInteractionMode("explore");
    }

    if (action.presetId) {
      applyPreset(action.presetId);
    }

    if (action.patch) {
      applyValues(action.patch, action.presetId ?? null);
    }

    focusPredictionTargets(action.highlightedControlIds, action.highlightedGraphIds);

    if (action.highlightedOverlayIds?.length) {
      setOverlays((current) => {
        const nextState = { ...current };

        for (const overlayId of action.highlightedOverlayIds ?? []) {
          nextState[overlayId] = true;
        }

        return nextState;
      });
      focusOverlay(action.highlightedOverlayIds[0]);
    }

    setQuickTestFocus({
      actionLabel: action.label,
      highlightedControlIds: action.highlightedControlIds ?? [],
      highlightedGraphIds: action.highlightedGraphIds ?? [],
      highlightedOverlayIds: action.highlightedOverlayIds ?? [],
    });

    if (action.presetId || action.patch) {
      setGraphPreview(null);
      setInspectedTime(null);
      resetClock(0);
      play();
    }
  });

  useEffect(() => {
    registerQuickTestHandler({
      applyAction: (action) => handleQuickTestAction(action),
      clearAction: () => setQuickTestFocus(null),
    });

    return () => registerQuickTestHandler(null);
  }, [registerQuickTestHandler]);

  const handleWorkedExampleAction = useEffectEvent((action: ConceptWorkedExampleAction) => {
    if (compareStateRef.current) {
      clearCompareState("explore");
    } else if (interactionMode !== "explore") {
      setInteractionMode("explore");
    }

    if (action.presetId) {
      applyPreset(action.presetId);
    }

    if (action.patch) {
      applyValues(action.patch, action.presetId ?? null);
    }

    focusPredictionTargets(action.highlightedControlIds, action.highlightedGraphIds);

    if (action.highlightedOverlayIds?.length) {
      setOverlays((current) => {
        const nextState = { ...current };

        for (const overlayId of action.highlightedOverlayIds ?? []) {
          nextState[overlayId] = true;
        }

        return nextState;
      });
      focusOverlay(action.highlightedOverlayIds[0]);
    }

    setWorkedExampleFocus({
      actionLabel: action.label,
      highlightedControlIds: action.highlightedControlIds ?? [],
      highlightedGraphIds: action.highlightedGraphIds ?? [],
      highlightedOverlayIds: action.highlightedOverlayIds ?? [],
    });

    if (action.presetId || action.patch) {
      setGraphPreview(null);
      setInspectedTime(null);
      resetClock(0);
      play();
    }
  });

  useEffect(() => {
    registerWorkedExampleHandler({
      applyAction: (action) => handleWorkedExampleAction(action),
      clearAction: () => setWorkedExampleFocus(null),
    });

    return () => registerWorkedExampleHandler(null);
  }, [registerWorkedExampleHandler]);

  const shareableCompareState = useMemo<ShareableConceptCompareState | null>(
    () => (compareEnabled ? buildShareableCompareState(compareState) : null),
    [compareEnabled, compareState],
  );
  const currentShareState = useMemo<ShareableConceptSimulationState>(
    () => ({
      params: cloneParams(controlValues),
      activePresetId: controlPresetId ?? null,
      activeGraphId: activeGraph?.id ?? null,
      overlayValues: { ...overlays },
      focusedOverlayId: focusedOverlay?.id ?? null,
      time: workedExampleTime,
      timeSource: workedExampleTimeSource,
      compare: shareableCompareState,
    }),
    [
      activeGraph?.id,
      controlPresetId,
      controlValues,
      focusedOverlay?.id,
      overlays,
      shareableCompareState,
      workedExampleTime,
      workedExampleTimeSource,
    ],
  );

  useEffect(() => {
    publishRuntimeSnapshot({
      slug: (concept.slug ?? "simple-harmonic-motion") as LiveWorkedExampleState["slug"],
      title: concept.title,
      topic: concept.topic ?? "Concept",
      params: currentShareState.params,
      time: currentShareState.time,
      timeSource: currentShareState.timeSource,
      activeGraphId: currentShareState.activeGraphId,
      interactionMode,
      activeCompareTarget: shareableCompareState?.activeTarget ?? null,
      activePresetId: currentShareState.activePresetId,
      overlayValues: currentShareState.overlayValues,
      focusedOverlayId: currentShareState.focusedOverlayId,
      compare: shareableCompareState,
      featureAvailability: {
        prediction: Boolean(predictionItems.length),
        compare: true,
        challenge: Boolean(challengeMode?.items.length),
        guidedOverlays: Boolean(simulationOverlays.length),
        noticePrompts: Boolean(noticePromptConfig?.items.length),
        workedExamples: concept.featureAvailability?.workedExamples ?? true,
        quickTest: concept.featureAvailability?.quickTest ?? true,
      },
    });
    publishWorkedExampleSnapshot({
      slug: (concept.slug ?? "simple-harmonic-motion") as LiveWorkedExampleState["slug"],
      params: currentShareState.params,
      time: currentShareState.time,
      timeSource: currentShareState.timeSource,
      activeGraphId: currentShareState.activeGraphId,
      interactionMode,
      activeCompareTarget: shareableCompareState?.activeTarget ?? null,
      activePresetId: currentShareState.activePresetId,
    });
  }, [
    challengeMode?.items.length,
    concept.slug,
    concept.title,
    concept.topic,
    concept.featureAvailability?.quickTest,
    concept.featureAvailability?.workedExamples,
    currentShareState,
    interactionMode,
    noticePromptConfig?.items.length,
    predictionItems.length,
    publishRuntimeSnapshot,
    publishWorkedExampleSnapshot,
    shareableCompareState,
    simulationOverlays.length,
  ]);

  useEffect(
    () => () => {
      publishRuntimeSnapshot(null);
      publishWorkedExampleSnapshot(null);
    },
    [publishRuntimeSnapshot, publishWorkedExampleSnapshot],
  );

  function handleGraphPreview(sample: GraphPreviewSample | null) {
    if (isInspecting) {
      return;
    }

    if (!activeGraph) {
      setGraphPreview(null);
      return;
    }

    setGraphPreview(
      buildGraphPreview(concept, activeGraph.id, controlValues, compareState, sample),
    );
  }

  const isPredictionCorrect = activePredictionItem && selectedPredictionChoiceId
    ? selectedPredictionChoiceId === activePredictionItem.correctChoiceId
    : null;
  const predictionApi: PredictionModeApi = {
    mode: isPredictionPanelOpen || predictionCompleted ? "predict" : "explore",
    activeItemId: activePredictionItem?.id ?? null,
    activeItem: activePredictionItem,
    selectedChoiceId: selectedPredictionChoiceId,
    answered: predictionAnswered,
    tested: predictionTested,
    completed: predictionCompleted,
    isCorrect: isPredictionCorrect,
    highlightedControlIds,
    highlightedGraphIds,
    highlightedOverlayIds,
    setMode: (nextMode) => {
      if (nextMode === "predict") {
        openPredictionWorkflow();
        return;
      }

      closePredictionWorkflow();
    },
    setActiveItemId: (itemId) => {
      openPredictionWorkflow(itemId);
    },
    selectChoice: (choiceId) => {
      if (predictionAnswered) {
        return;
      }

      setSelectedPredictionChoiceId(choiceId);
      setPredictionAnswered(true);
      setPredictionTested(false);
      setPredictionCompleted(false);
    },
    testScenario: applyPredictionScenario,
    nextItem: () => {
      if (!predictionItems.length) {
        return;
      }

      const currentIndex = predictionItems.findIndex(
        (item) => item.id === (activePredictionItem?.id ?? activePredictionItemId),
      );

      if (currentIndex >= predictionItems.length - 1) {
        setPredictionCompleted(true);
        setIsPredictionPanelOpen(true);
        return;
      }

      const nextItem = predictionItems[currentIndex + 1] ?? predictionItems[0];
      setPredictionCompleted(false);
      resetPredictionSelection(nextItem.id);
    },
    restart: () => {
      if (!predictionItems.length) {
        return;
      }

      openPredictionWorkflow(predictionItems[0].id);
    },
    exit: closePredictionWorkflow,
  };

  const modeTabs = (
    <CompactModeTabs
      items={[
        { id: "explore", label: t("tabs.explore") },
        { id: "compare", label: t("tabs.compare") },
      ]}
      activeId={interactionMode}
      onChange={(nextMode) => setInteraction(nextMode as InteractionMode)}
      ariaLabel={t("aria.interactionMode")}
    />
  );

  const compareBenchTools =
    interactionMode === "compare" && compareState ? (
      <section
        data-testid="control-panel-compare-tools"
        className="rounded-[18px] border border-line bg-paper-strong/88 px-3 py-3"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="lab-label">{tCompare("title")}</p>
            <p className="mt-1 text-sm leading-6 text-ink-700">
              {compareSetupPairLabel
                ? t("status.comparing", { label: compareSetupPairLabel })
                : tCompare("intro")}
            </p>
          </div>
          <a
            href={`#${conceptShareAnchorIds.liveBench}`}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-line bg-paper px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-700 transition hover:border-teal-500/35 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            {tCompare("actions.jumpToBench")}
          </a>
        </div>
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
            {tCompare("editing", {
              label: tCompare("labels.setup", {
                target: compareState.activeTarget === "a" ? "A" : "B",
              }),
            })}
          </p>
          <CompactModeTabs
            className="mt-2"
            items={[
              {
                id: "a",
                label: tCompare("labels.setup", { target: "A" }),
                note: compareState.setupA.label,
              },
              {
                id: "b",
                label: tCompare("labels.setup", { target: "B" }),
                note: compareState.setupB.label,
              },
            ]}
            activeId={compareState.activeTarget}
            onChange={(target) => selectCompareTarget(target as CompareTarget)}
            ariaLabel={tCompare("aria.activeSetup")}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={resetCompareVariantToBaseline}
            className="rounded-full border border-line bg-paper px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-700 transition hover:border-teal-500/35 hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            {tCompare("actions.resetVariant")}
          </button>
          <button
            type="button"
            onClick={swapCompareSetups}
            className="rounded-full border border-line bg-paper px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-700 transition hover:border-amber-500/35 hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            {tCompare("actions.swap")}
          </button>
          <button
            type="button"
            onClick={() => clearCompareState("explore")}
            className="rounded-full border border-line bg-paper px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-700 transition hover:border-coral-500/35 hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            {tCompare("actions.exit")}
          </button>
        </div>
      </section>
    ) : null;

  const explorePromptPanel = (
    <section className="rounded-[16px] border border-line bg-paper px-3 py-2.5">
      <p className="text-xs leading-5 text-ink-700">
        {t("explorePrompt")}
      </p>
    </section>
  );

  const interactionPanel =
    interactionMode === "compare" && compareState ? (
      <section
        data-testid="compare-support-panel"
        className="rounded-[20px] border border-line bg-paper px-3 py-3"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
          <div className="max-w-3xl">
            <p className="lab-label">{tCompare("title")}</p>
            <p className="mt-1 text-sm leading-6 text-ink-700">{tCompare("intro")}</p>
          </div>
          <a
            href={`#${conceptShareAnchorIds.liveBench}`}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-line bg-paper-strong px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-700 transition hover:border-teal-500/35 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            {tCompare("actions.jumpToBench")}
          </a>
        </div>
        <div className="mt-3">
          <SavedCompareSetupsCard
            concept={{
              id: concept.id ?? concept.slug ?? concept.title,
              slug: concept.slug ?? "simple-harmonic-motion",
              title: concept.title,
            }}
            simulationSource={concept}
            compare={{
              activeTarget: compareState.activeTarget,
              setupA: compareState.setupA,
              setupB: compareState.setupB,
            }}
            activeGraphId={activeGraph?.id ?? null}
            overlayValues={overlays}
            onRestore={restoreSavedCompareSetup}
          />
        </div>
      </section>
    ) : explorePromptPanel;
  const shouldShowSecondaryPredictionPanel =
    predictionItems.length > 0 && interactionMode !== "compare" && !compareState;
  const secondaryPredictionPanel = shouldShowSecondaryPredictionPanel ? (
    <details
      data-testid="concept-secondary-prediction-flow"
      className="rounded-[20px] border border-amber-500/20 bg-amber-500/8 px-3 py-3"
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
        <div>
          <p className="lab-label">{t("predictionPrompt.label")}</p>
          <p className="mt-1 text-xs leading-5 text-ink-600">
            {isPredictionPanelOpen || predictionCompleted
              ? t("predictionPrompt.activeDescription")
              : t("predictionPrompt.description")}
          </p>
        </div>
        <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600">
          {t("actions.show")}
        </span>
      </summary>
      <div className="mt-3">
        {isPredictionPanelOpen || predictionCompleted ? (
          <PredictionModePanel
            title={t("predictionPrompt.title")}
            intro={predictionConfig?.intro ?? t("predictionPrompt.description")}
            items={predictionItems}
            api={predictionApi}
            modeTabsNode={null}
            className="border-amber-500/20 bg-paper/75 p-3 shadow-none"
          />
        ) : (
          <button
            type="button"
            data-testid="concept-secondary-prediction-start"
            onClick={() => openPredictionWorkflow()}
            className="inline-flex items-center justify-center rounded-full border border-amber-500/25 bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            {t("predictionPrompt.action")}
          </button>
        )}
      </div>
    </details>
  ) : null;
  const whatToNoticePanel =
    noticePromptConfig && activeNoticePrompt ? (
      <WhatToNoticePanel
        title={noticePromptConfig.title}
        intro={noticePromptConfig.intro}
        prompts={resolvedNoticePrompts}
        activePrompt={activeNoticePrompt}
        activeIndex={normalizedNoticePromptIndex}
        controls={concept.simulation.controls}
        graphs={concept.simulation.graphs}
        overlays={simulationOverlays}
        variableLinks={concept.variableLinks}
        hidden={noticePromptHidden}
        onNext={cycleNoticePrompt}
        onDismiss={() => setNoticePromptHidden(true)}
        onShow={() => setNoticePromptHidden(false)}
        onRestart={restartNoticePrompts}
      />
    ) : null;
  const guidedOverlayPanel = simulationOverlays.length ? (
    <GuidedOverlayPanel
      overlays={simulationOverlays}
      values={overlays}
      focusedOverlayId={focusedOverlay?.id ?? null}
      highlightedOverlayIds={highlightedOverlayIds}
      controls={concept.simulation.controls}
      graphs={concept.simulation.graphs}
      variableLinks={concept.variableLinks}
      activeGraphId={activeGraph?.id ?? null}
      onFocusOverlay={focusOverlay}
      onToggleOverlay={toggleOverlay}
    />
  ) : null;
  const challengeRuntime = {
    params: controlValues,
    activeGraphId: activeGraph?.id ?? null,
    overlayValues: overlays,
    time: workedExampleTime,
    timeSource: workedExampleTimeSource,
    compare: compareEnabled
      ? {
          activeTarget: compareState.activeTarget,
          setupA: compareState.setupA.params,
          setupB: compareState.setupB.params,
        }
      : null,
  } as const;
  const buildChallengeShareHref = (challengeId: string) =>
    buildConceptSimulationStateHref({
      source: concept,
      conceptSlug: concept.slug ?? "simple-harmonic-motion",
      state: currentShareState,
      hash: conceptShareAnchorIds.challengeMode,
      challengeId,
    });
  const isQuickTestHashActive =
    activeLocationHash === `#${conceptShareAnchorIds.quickTest}`;
  const isChallengeHashActive =
    activeLocationHash === `#${conceptShareAnchorIds.challengeMode}`;
  const shouldShowFloatingChallengeReminder =
    !isGuidedLessonMode &&
    activeConceptPagePhaseId === "check" &&
    Boolean(challengeMode?.items.length) &&
    !isQuickTestHashActive &&
    !isFullChallengePanelVisible;
  const fullChallengePanel =
    challengeMode && challengeMode.items.length ? (
      <div
        id={conceptShareAnchorIds.challengeMode}
        ref={fullChallengePanelRef}
        data-testid="challenge-mode-full-panel"
        className="scroll-mt-24"
        tabIndex={-1}
      >
        <ChallengeModePanel
          concept={{
            id: concept.id,
            slug: concept.slug ?? "simple-harmonic-motion",
            title: concept.title,
          }}
          simulationSource={concept}
          challengeMode={challengeMode}
          runtime={challengeRuntime}
          readNext={readNext}
          initialSyncedSnapshot={initialSyncedSnapshot}
          onApplySetup={applyChallengeSetup}
          initialItemId={initialChallengeItemId}
          activeItemId={activeChallengeItemId}
          onActiveItemChange={setActiveChallengeItemId}
          buildShareHref={buildChallengeShareHref}
        />
      </div>
    ) : null;
  const floatingChallengeReminder =
    challengeMode && challengeMode.items.length && shouldShowFloatingChallengeReminder ? (
      <div
        data-testid="challenge-mode-floating-anchor"
        className="pointer-events-none fixed left-0 z-40 flex justify-start px-2 sm:px-4"
        style={{
          left: "max(env(safe-area-inset-left, 0px), calc((100vw - 88rem) / 2))",
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 4.75rem)",
        }}
      >
        <ChallengeModePanel
          concept={{
            id: concept.id,
            slug: concept.slug ?? "simple-harmonic-motion",
            title: concept.title,
          }}
          simulationSource={concept}
          challengeMode={challengeMode}
          runtime={challengeRuntime}
          readNext={readNext}
          initialSyncedSnapshot={initialSyncedSnapshot}
          onApplySetup={applyChallengeSetup}
          initialItemId={initialChallengeItemId}
          activeItemId={activeChallengeItemId}
          buildShareHref={buildChallengeShareHref}
          displayMode="floating-reminder"
        />
      </div>
    ) : null;
  const primaryGuidePanel = interactionPanel;
  const showExploreStarterGuide =
    starterGuidePlacement !== "external" &&
    starterExploreTasks.length > 0 &&
    (activeConceptPagePhaseId
      ? activeConceptPagePhaseId === "explore"
      : interactionMode === "explore");
  const exploreStarterGuide = showExploreStarterGuide ? (
    <section
      data-testid="concept-runtime-explore-starter-guide"
      className="rounded-[20px] border border-teal-500/20 bg-teal-500/8 px-3 py-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-teal-500/25 bg-white/80 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-teal-700">
          {t("starterGuide.badge")}
        </span>
        <p className="text-sm font-semibold text-ink-900">{t("starterGuide.title")}</p>
      </div>
      <p className="mt-1.5 text-xs leading-5 text-ink-700">
        {t("starterGuide.description")}
      </p>
      <ol className="mt-2.5 space-y-2">
        {starterExploreTasks.map((task, index) => (
          <li key={`${index}-${task}`} className="flex items-start gap-2.5 text-sm leading-5 text-ink-800">
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-teal-500/25 bg-white/80 px-1.5 text-[0.7rem] font-semibold text-teal-700">
              {index + 1}
            </span>
            <RichMathText as="div" content={task} className="min-w-0 flex-1" />
          </li>
        ))}
      </ol>
    </section>
  ) : null;
  const interactionRailPanel = activeConceptPagePhaseId ? interactionPanel : primaryGuidePanel;
  const phaseSupportPanels = activeConceptPagePhaseId
    ? {
        explore: whatToNoticePanel,
        understand: guidedOverlayPanel,
        check: isGuidedLessonMode && !isChallengeHashActive ? null : fullChallengePanel,
      }
    : null;
  const hasPhaseBenchSupport = Boolean(
    phaseSupportPanels &&
      Object.values(phaseSupportPanels).some((panel) => Boolean(panel)),
  );

  useEffect(() => {
    if (activeConceptPagePhaseId !== "check" || !isChallengeHashActive) {
      return;
    }

    setPhaseSupportDisclosureOpenByPhase((current) =>
      current.check ? current : { ...current, check: true },
    );
  }, [activeConceptPagePhaseId, isChallengeHashActive]);

  const secondaryToolSections = activeConceptPagePhaseId
    ? []
    : [whatToNoticePanel, guidedOverlayPanel, fullChallengePanel].filter(Boolean);
  const moreToolsOpen =
    moreToolsExpanded ||
    Boolean(highlightedOverlayIds.length || initialChallengeItemId) ||
    activeLocationHash === `#${conceptShareAnchorIds.challengeMode}`;
  const controlsAnchorId = "concept-live-controls";
  const interactionRail = (
    <section className="rounded-[20px] border border-line bg-white/55 px-3 py-2">
      <div className="mb-1.5 border-b border-line/80 pb-1.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="lab-label">{t("interactionRail.label")}</p>
            <p className="sr-only">
              {t("interactionRail.description")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`#${controlsAnchorId}`}
              data-testid="simulation-shell-controls-link"
              className="inline-flex min-h-9 items-center justify-center rounded-full border border-teal-500/25 bg-paper-strong px-3 py-1.5 text-xs font-semibold text-teal-800 transition hover:border-teal-500/45 hover:bg-white sm:hidden"
            >
              {t("controls.title")}
            </a>
            {modeTabs}
          </div>
        </div>
      </div>
      {exploreStarterGuide ? <div className="mb-2">{exploreStarterGuide}</div> : null}
      {interactionRailPanel}
    </section>
  );
  const supportDock = !activeConceptPagePhaseId && secondaryToolSections.length ? (
    <details
      className="rounded-[22px] border border-line bg-white/45 px-3 py-3"
      open={moreToolsOpen}
      onToggle={(event) => setMoreToolsExpanded((event.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
        <div>
          <p className="lab-label">{t("supportDock.label")}</p>
          <p className="mt-1 text-xs leading-5 text-ink-600">
            {t("supportDock.description")}
          </p>
        </div>
        <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600">
          {moreToolsOpen ? t("actions.hide") : t("actions.show")}
        </span>
      </summary>
      <div className="mt-3 grid gap-2.5">
        {secondaryToolSections.map((section, index) => (
          <div key={index}>{section}</div>
        ))}
      </div>
    </details>
  ) : null;

  const equationDetails = (
    <EquationDetails
      equations={concept.equations}
      variableLinks={concept.variableLinks}
      controls={concept.simulation.controls}
      values={{ ...controlValues }}
    />
  );
  const benchEquations = selectBenchEquations(concept);
  const mergedAfterBench =
    guidedStepCard || secondaryPredictionPanel || afterBench ? (
      <div className="grid gap-3">
        {guidedStepCard || secondaryPredictionPanel ? (
          <div className="grid gap-2.5">
            {guidedStepCard ? (
              <div data-testid="concept-v2-step-card-slot">{guidedStepCard}</div>
            ) : null}
            {secondaryPredictionPanel}
          </div>
        ) : null}
        {afterBench}
      </div>
    ) : null;

  useEffect(() => {
    if (!isChallengeHashActive || typeof window === "undefined") {
      return;
    }

    const prefersReducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame: number | null = null;
    let attempts = 0;
    let cancelled = false;

    const scrollToChallengePanel = () => {
      if (cancelled) {
        return;
      }

      const node = fullChallengePanelRef.current;
      const isRenderable =
        node &&
        node.getClientRects().length > 0 &&
        !node.closest("[hidden]");

      if (!isRenderable) {
        attempts += 1;

        if (attempts < 24) {
          frame = window.requestAnimationFrame(scrollToChallengePanel);
        }

        return;
      }

      node.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
      node.focus({ preventScroll: true });
    };

    frame = window.requestAnimationFrame(scrollToChallengePanel);

    return () => {
      cancelled = true;

      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [activeChallengeItemId, activeConceptPagePhaseId, isChallengeHashActive]);

  return (
    <div
      className="space-y-3"
      style={
        shouldShowFloatingChallengeReminder
          ? {
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 4.75rem)",
            }
          : undefined
      }
    >
      <SimulationShell
        className={className}
        accessibilityDescription={`${simulationDescription} ${stateDescription}`}
        setupAnchorId={conceptShareAnchorIds.liveBench}
        setupAnchorLabel={t("setupAnchorLabel", { title: concept.title })}
        controlsAnchorId={controlsAnchorId}
        controlsAnchorLabel={t("controls.title")}
        transport={
          hasInteractiveTime ? (
            <TimeControlRail
              currentTime={currentTime}
              maxTime={timeDomain.max}
              isPlaying={hasInteractiveTime && !isInspecting && isPlaying}
              canPlay={hasInteractiveTime}
              canStep={hasInteractiveTime && timeDomain.max > 0}
              canScrub={hasInteractiveTime && timeDomain.max > 0}
              note={timeRailNote}
              onTogglePlay={togglePlayback}
              onStepBackward={() => stepInspection(-1)}
              onStepForward={() => stepInspection(1)}
              onScrub={scrubInspection}
              onReset={resetInspectionTime}
            />
          ) : null
        }
        benchHeader={null}
        notice={null}
        scene={
          <RuntimeScene
            concept={concept}
            params={controlValues}
            time={currentTime}
            overlayValues={overlays}
            focusedOverlayId={focusedOverlay?.id ?? null}
            graphPreview={effectiveGraphPreview}
            compare={
              compareEnabled
                ? {
                    activeTarget: compareState.activeTarget,
                    setupA: compareState.setupA.params,
                    setupB: compareState.setupB.params,
                    labelA: compareState.setupA.label,
                    labelB: compareState.setupB.label,
                  }
                : undefined
            }
            setParam={(param, value) => {
              if (param in overlays) {
                recordMeaningfulConceptInteraction();
                setOverlays((current) => ({ ...current, [param]: Boolean(value) }));
                return;
              }

              applyLiveParamChange(param, coerceValue(value));
            }}
          />
        }
        benchEquations={<EquationBenchStrip equations={benchEquations} />}
        controls={
          <div className="space-y-3">
            <ControlPanel
              title={compareEnabled ? t("controls.title") : undefined}
              description={
                compareTargetLabel
                  ? t("controls.description", {
                      target: compareTargetLabel,
                    })
                  : undefined
              }
              contextBadge={
                compareTargetLabel
                  ? t("controls.contextBadge", {
                      target: compareTargetLabel,
                    })
                  : undefined
              }
              resetLabel={compareEnabled ? t("controls.resetLabel") : undefined}
              controls={concept.simulation.controls}
              presets={concept.simulation.presets}
              defaultValues={concept.simulation.defaults}
              primaryControlIds={effectivePrimaryControlIds}
              primaryPresetIds={simulationUiHints.primaryPresetIds}
              variableLinks={concept.variableLinks}
              values={{ ...controlValues }}
              activePresetId={controlPresetId}
              activeVariableId={activeVariableId}
              highlightedControlIds={highlightedControlIds}
              autoRevealControlIds={autoRevealControlIds}
              highlightedPresetIds={[]}
              supplementaryTools={compareEnabled ? compareBenchTools : null}
              supplementaryToolsPlacement={compareEnabled ? "inline" : "more-tools"}
              forceMoreToolsOpen={Boolean(guidedReveal?.controlIds?.length)}
              onChange={(param, value) => applyLiveParamChange(param, coerceValue(value))}
              onPreset={(presetId) => {
                setLastChangedParam(null);
                recordMeaningfulConceptInteraction();
                if (compareEnabled) {
                  applyComparePreset(presetId);
                  return;
                }

                applyPreset(presetId);
                if (shouldResetLiveClockOnSetupChange(concept.simulation.kind)) {
                  setGraphPreview(null);
                  setInspectedTime(null);
                  resetClock(0);
                  play();
                }
              }}
              onVariableFocus={setActiveVariableId}
              onReset={() => {
                setLastChangedParam(null);
                recordMeaningfulConceptInteraction();
                if (compareEnabled) {
                  resetCompareActiveSetup();
                  return;
                }

                const defaultOverlayValues = deriveOverlayState(concept);
                reset();
                setGraphPreview(null);
                setInspectedTime(null);
                setNoticePromptOffset(0);
                setNoticePromptHidden(true);
                closePredictionWorkflow();
                setMoreToolsExpanded(false);
                resetClock(0);
                setOverlays(defaultOverlayValues);
                setFocusedOverlayId(resolveFocusedOverlayId(concept, defaultOverlayValues, null));
                setActiveGraphId(defaultActiveGraphId);
              }}
            />
          </div>
        }
        afterBench={mergedAfterBench}
        interactionRail={interactionRail}
        supportDock={supportDock}
        equations={
          <details
            data-testid="concept-equation-map-disclosure"
            className="rounded-[22px] border border-line bg-white/45 px-3 py-3"
          >
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
              <div>
                <p className="lab-label">{t("equationMap.label")}</p>
                <p className="mt-1 text-xs leading-5 text-ink-600">
                  {t("equationMap.description")}
                </p>
              </div>
              <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600">
                {t("actions.show")}
              </span>
            </summary>
            <div className="mt-3">
              <EquationPanel
                equations={concept.equations}
                variableLinks={concept.variableLinks}
                controls={concept.simulation.controls}
                graphs={concept.simulation.graphs}
                overlays={simulationOverlays}
                values={{ ...controlValues }}
                activeVariableId={activeVariableId}
                onActiveVariableChange={setActiveVariableId}
              />
            </div>
          </details>
        }
        status={
          isInspecting ? (
            <span>
              {t("status.pausedAt", { time: formatNumber(currentTime) })}{" "}
              {compareSetupPairLabel
                ? `${t("status.comparing", { label: compareSetupPairLabel })} `
                : ""}
              {stateDescription}
            </span>
          ) : previewDescription ? (
            <span>
              {previewDescription} {t("status.leaveGraph")}
            </span>
          ) : compareEnabled ? (
            <span>
              {compareSetupPairLabel
                ? t("status.comparing", { label: compareSetupPairLabel })
                : null}{" "}
              {stateDescription}
            </span>
          ) : (
            <span>{stateDescription}</span>
          )
        }
        graphs={
          <section className="lab-panel p-3.5 md:p-4">
            <div className="flex flex-col gap-3 border-b border-line pb-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="lab-label">{t("graphs.label")}</p>
                <p className="mt-1 text-sm text-ink-700">
                  {t("graphs.description")}
                </p>
              </div>
              <GraphTabs
                tabs={concept.simulation.graphs}
                activeId={activeGraph?.id ?? ""}
                highlightedTabIds={highlightedGraphIds}
                autoRevealTabIds={autoRevealGraphIds}
                primaryTabIds={effectivePrimaryGraphIds}
                onChange={setActiveGraphId}
              />
            </div>
            {activeGraph ? (
              <div
                className="mt-4"
                id={`graph-panel-${activeGraph.id}`}
                role="tabpanel"
                aria-labelledby={`graph-tab-${activeGraph.id}`}
              >
                <LineGraph
                  key={`${activeGraph.id}-${isInspecting ? "inspect" : "live"}`}
                  title={activeGraph.label}
                  xLabel={activeGraph.xLabel}
                  yLabel={activeGraph.yLabel}
                  series={graphSeries}
                  boundsOverride={graphBounds ?? undefined}
                  tickCountX={graphBounds?.xTicks}
                  tickCountY={graphBounds?.yTicks}
                  previewEnabled={!isInspecting}
                  linkedMarker={inspectionMarker}
                  onPreviewChange={handleGraphPreview}
                  summary={
                    compareEnabled
                      ? t("graphs.compareSummary", {
                          description: activeGraph.description ?? graphSummary,
                          labelA: compareState.setupA.label,
                          labelB: compareState.setupB.label,
                        })
                      : activeGraph.description ?? graphSummary
                  }
                  description={activeGraph.description}
                />
              </div>
            ) : null}
          </section>
        }
        equationDetails={equationDetails}
      />
      {activeConceptPagePhaseId && hasPhaseBenchSupport ? (
        <section
          data-testid="concept-phase-bench-support"
          data-active-phase={activeConceptPagePhaseId}
          className="space-y-3 px-2 sm:px-2.5 md:px-3"
        >
          {(["explore", "understand", "check"] as const).map((phaseId) => {
            const panel = phaseSupportPanels?.[phaseId];

            if (!panel) {
              return null;
            }

            const isSupportDisclosureOpen =
              phaseSupportDisclosureOpenByPhase[phaseId] ??
              (phaseId === "check" && isChallengeHashActive);

            return (
              <div
                key={phaseId}
                id={
                  phaseId === "check"
                    ? undefined
                    : getConceptPageBenchSupportTargetId(phaseId)
                }
                hidden={phaseId !== activeConceptPagePhaseId}
                data-phase-owned-support={phaseId}
                data-testid={`concept-phase-bench-support-${phaseId}`}
              >
                <details
                  data-testid={`concept-phase-bench-support-disclosure-${phaseId}`}
                  className="rounded-[20px] border border-line bg-white/50 px-3 py-3"
                  open={isSupportDisclosureOpen}
                  onToggle={(event) => {
                    const isOpen = event.currentTarget.open;

                    setPhaseSupportDisclosureOpenByPhase((current) =>
                      current[phaseId] === isOpen
                        ? current
                        : { ...current, [phaseId]: isOpen },
                    );
                  }}
                >
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                    <div>
                      <p className="lab-label">{t("phaseSupport.label")}</p>
                      <p className="mt-1 text-xs leading-5 text-ink-600">
                        {t("phaseSupport.description")}
                      </p>
                    </div>
                    <span className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600">
                      {t("actions.show")}
                    </span>
                  </summary>
                  <div className="mt-3">{panel}</div>
                </details>
              </div>
            );
          })}
        </section>
      ) : null}
      {floatingChallengeReminder}
    </div>
  );
}
