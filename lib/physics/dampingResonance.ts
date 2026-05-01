import { clamp, formatMeasurement, formatNumber, safeNumber } from "./math";
import { sampleFrequencySeries, sampleTimeSeries } from "./series";
import type { GraphSeriesMap } from "./types";

export type DampingResonanceParams = {
  naturalFrequency: number;
  drivingFrequency: number;
  damping: number;
  driveAmplitude: number;
  resonanceMode?: boolean;
  phase?: number;
};

export type DampingSnapshot = {
  displacement: number;
  amplitude: number;
  responseAmplitude: number;
  phaseLag: number;
};

function resolveResponseAmplitude(params: DampingResonanceParams) {
  const omega0 = Math.max(0.001, safeNumber(params.naturalFrequency, 1));
  const omega = Math.max(0.001, safeNumber(params.drivingFrequency, omega0));
  const damping = Math.max(0, safeNumber(params.damping, 0));
  const driveAmplitude = Math.max(0, safeNumber(params.driveAmplitude, 1));
  const denominator = Math.sqrt(
    Math.pow(omega0 * omega0 - omega * omega, 2) + Math.pow(2 * damping * omega, 2),
  );
  return driveAmplitude / Math.max(0.001, denominator);
}

export function sampleDampingState(params: DampingResonanceParams, time: number): DampingSnapshot {
  const omega0 = Math.max(0.001, safeNumber(params.naturalFrequency, 1));
  const omega = Math.max(0.001, safeNumber(params.drivingFrequency, omega0));
  const damping = Math.max(0, safeNumber(params.damping, 0));
  const driveAmplitude = Math.max(0, safeNumber(params.driveAmplitude, 1));
  const phase = safeNumber(params.phase, 0);
  const resonanceMode = Boolean(params.resonanceMode);
  const responseAmplitude = resolveResponseAmplitude(params);
  const phaseLag = Math.atan2(2 * damping * omega, omega0 * omega0 - omega * omega);

  if (resonanceMode) {
    const displacement = responseAmplitude * Math.cos(omega * time - phaseLag + phase);
    return {
      displacement,
      amplitude: Math.abs(displacement),
      responseAmplitude,
      phaseLag,
    };
  }

  const envelope = Math.exp(-damping * omega0 * time);
  const displacement = driveAmplitude * envelope * Math.cos(omega * time + phase);
  return {
    displacement,
    amplitude: Math.abs(displacement),
    responseAmplitude,
    phaseLag,
  };
}

export function buildDampingSeries(params: DampingResonanceParams): GraphSeriesMap {
  const omega0 = Math.max(0.001, safeNumber(params.naturalFrequency, 1));
  const duration = 10;
  const sampleCount = 240;

  const transient = sampleTimeSeries(
    "transient",
    "Transient displacement",
    0,
    duration,
    sampleCount,
    (time) => sampleDampingState({ ...params, resonanceMode: false }, time).displacement,
    "#1ea6a2",
  );

  const resonance = sampleFrequencySeries(
    "response",
    "Response amplitude",
    Math.max(0.1, omega0 * 0.3),
    omega0 * 2.4,
    sampleCount,
    (frequency) =>
      resolveResponseAmplitude({
        ...params,
        drivingFrequency: frequency,
        resonanceMode: true,
      }),
    "#f0ab3c",
  );

  const envelope = sampleTimeSeries(
    "envelope",
    "Envelope",
    0,
    duration,
    sampleCount,
    (time) =>
      Math.abs(
        Math.exp(-Math.max(0, safeNumber(params.damping, 0)) * omega0 * time) *
          safeNumber(params.driveAmplitude, 1),
      ),
    "#f16659",
  );

  return {
    transient: [transient, envelope],
    response: [resonance],
  };
}

export function describeDampingState(params: DampingResonanceParams, time: number) {
  const omega0 = Math.max(0.001, safeNumber(params.naturalFrequency, 1));
  const omega = Math.max(0.001, safeNumber(params.drivingFrequency, omega0));
  const responseAmplitude = resolveResponseAmplitude(params);
  const state = sampleDampingState(params, time);
  const ratio = omega / omega0;
  const mode = params.resonanceMode ? "resonance response" : "transient decay";

  return `The system is in ${mode}. The driving frequency is ${formatNumber(ratio)} times the natural frequency. At t = ${formatMeasurement(time, "s")} the relative displacement is ${formatMeasurement(state.displacement, "a.u.")}, and the predicted steady-state response amplitude is ${formatMeasurement(responseAmplitude, "a.u.")}.`;
}

export function peakFrequency(params: DampingResonanceParams) {
  const omega0 = Math.max(0.001, safeNumber(params.naturalFrequency, 1));
  const damping = Math.max(0, safeNumber(params.damping, 0));
  const candidate = Math.sqrt(Math.max(0, omega0 * omega0 - 2 * damping * damping));
  return clamp(candidate, omega0 * 0.25, omega0 * 2);
}
