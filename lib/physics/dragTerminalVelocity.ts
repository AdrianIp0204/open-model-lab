import { clamp, formatMeasurement, formatNumber, safeNumber, sampleRange } from "./math";
import { buildSeries, sampleTimeSeries } from "./series";
import type { ControlValue, GraphSeriesMap } from "./types";

export type DragTerminalVelocityParams = {
  mass?: ControlValue;
  area?: ControlValue;
  dragStrength?: ControlValue;
};

export type DragTerminalVelocitySnapshot = {
  time: number;
  mass: number;
  area: number;
  dragStrength: number;
  gravity: number;
  speed: number;
  position: number;
  acceleration: number;
  weightForce: number;
  dragForce: number;
  netForce: number;
  terminalSpeed: number;
  terminalGap: number;
  massRatio: number;
  areaRatio: number;
  dragStrengthRatio: number;
  speedRatio: number;
  positionRatio: number;
  dragFraction: number;
  balanceLabel: "accelerating" | "approaching-balance" | "near-terminal";
};

export const DRAG_TERMINAL_VELOCITY_MIN_MASS = 0.6;
export const DRAG_TERMINAL_VELOCITY_MAX_MASS = 4;
export const DRAG_TERMINAL_VELOCITY_MIN_AREA = 0.03;
export const DRAG_TERMINAL_VELOCITY_MAX_AREA = 0.14;
export const DRAG_TERMINAL_VELOCITY_MIN_DRAG_STRENGTH = 8;
export const DRAG_TERMINAL_VELOCITY_MAX_DRAG_STRENGTH = 22;
export const DRAG_TERMINAL_VELOCITY_GRAVITY = 9.8;
export const DRAG_TERMINAL_VELOCITY_MAX_TIME = 4;
export const DRAG_TERMINAL_VELOCITY_MAX_POSITION = 42;

const GRAPH_SAMPLES = 161;
const RESPONSE_SAMPLES = 91;

function resolveMass(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    DRAG_TERMINAL_VELOCITY_MIN_MASS,
    DRAG_TERMINAL_VELOCITY_MAX_MASS,
  );
}

function resolveArea(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    DRAG_TERMINAL_VELOCITY_MIN_AREA,
    DRAG_TERMINAL_VELOCITY_MAX_AREA,
  );
}

function resolveDragStrength(value: ControlValue | undefined, fallback: number) {
  return clamp(
    safeNumber(value, fallback),
    DRAG_TERMINAL_VELOCITY_MIN_DRAG_STRENGTH,
    DRAG_TERMINAL_VELOCITY_MAX_DRAG_STRENGTH,
  );
}

function resolveDisplayTime(value: number | undefined, fallback = 0) {
  return clamp(safeNumber(value, fallback), 0, DRAG_TERMINAL_VELOCITY_MAX_TIME);
}

function computeTerminalSpeed(
  mass: number,
  area: number,
  dragStrength: number,
  gravity: number,
) {
  return Math.sqrt((mass * gravity) / Math.max(dragStrength * area, 1e-6));
}

function buildResponseSeries(
  id: string,
  label: string,
  values: Array<{ x: number; y: number }>,
  color: string,
) {
  return buildSeries(id, label, values, color);
}

function resolveBalanceLabel(dragFraction: number): DragTerminalVelocitySnapshot["balanceLabel"] {
  if (dragFraction >= 0.94) {
    return "near-terminal";
  }

  if (dragFraction >= 0.65) {
    return "approaching-balance";
  }

  return "accelerating";
}

export function resolveDragTerminalVelocityParams(params: DragTerminalVelocityParams) {
  return {
    mass: resolveMass(params.mass, 2),
    area: resolveArea(params.area, 0.05),
    dragStrength: resolveDragStrength(params.dragStrength, 12),
    gravity: DRAG_TERMINAL_VELOCITY_GRAVITY,
  };
}

export function sampleDragTerminalVelocityState(
  params: DragTerminalVelocityParams,
  time = 0,
  override?: Partial<DragTerminalVelocityParams>,
): DragTerminalVelocitySnapshot {
  const resolved = resolveDragTerminalVelocityParams({
    ...params,
    ...override,
  });
  const displayTime = resolveDisplayTime(time);
  const terminalSpeed = computeTerminalSpeed(
    resolved.mass,
    resolved.area,
    resolved.dragStrength,
    resolved.gravity,
  );
  const scaledTime = (resolved.gravity * displayTime) / Math.max(terminalSpeed, 1e-6);
  const speed = terminalSpeed * Math.tanh(scaledTime);
  const position =
    ((terminalSpeed * terminalSpeed) / resolved.gravity) * Math.log(Math.cosh(scaledTime));
  const weightForce = resolved.mass * resolved.gravity;
  const dragForce = resolved.dragStrength * resolved.area * speed * speed;
  const netForce = weightForce - dragForce;
  const acceleration = netForce / resolved.mass;
  const terminalGap = Math.max(0, terminalSpeed - speed);
  const dragFraction = clamp(dragForce / Math.max(weightForce, 1e-6), 0, 1);

  return {
    time: displayTime,
    mass: resolved.mass,
    area: resolved.area,
    dragStrength: resolved.dragStrength,
    gravity: resolved.gravity,
    speed,
    position,
    acceleration,
    weightForce,
    dragForce,
    netForce,
    terminalSpeed,
    terminalGap,
    massRatio: clamp(
      (resolved.mass - DRAG_TERMINAL_VELOCITY_MIN_MASS) /
        (DRAG_TERMINAL_VELOCITY_MAX_MASS - DRAG_TERMINAL_VELOCITY_MIN_MASS),
      0,
      1,
    ),
    areaRatio: clamp(
      (resolved.area - DRAG_TERMINAL_VELOCITY_MIN_AREA) /
        (DRAG_TERMINAL_VELOCITY_MAX_AREA - DRAG_TERMINAL_VELOCITY_MIN_AREA),
      0,
      1,
    ),
    dragStrengthRatio: clamp(
      (resolved.dragStrength - DRAG_TERMINAL_VELOCITY_MIN_DRAG_STRENGTH) /
        (DRAG_TERMINAL_VELOCITY_MAX_DRAG_STRENGTH - DRAG_TERMINAL_VELOCITY_MIN_DRAG_STRENGTH),
      0,
      1,
    ),
    speedRatio: clamp(speed / Math.max(terminalSpeed, 1e-6), 0, 1),
    positionRatio: clamp(position / DRAG_TERMINAL_VELOCITY_MAX_POSITION, 0, 1),
    dragFraction,
    balanceLabel: resolveBalanceLabel(dragFraction),
  };
}

function buildTerminalSpeedSeries(
  id: string,
  label: string,
  xValues: number[],
  sampleTerminalSpeed: (x: number) => number,
  color: string,
) {
  return buildResponseSeries(
    id,
    label,
    xValues.map((x) => ({
      x,
      y: sampleTerminalSpeed(x),
    })),
    color,
  );
}

export function buildDragTerminalVelocitySeries(
  params: DragTerminalVelocityParams,
): GraphSeriesMap {
  const resolved = resolveDragTerminalVelocityParams(params);
  const baseline = sampleDragTerminalVelocityState(resolved, 0);
  const massSamples = sampleRange(
    DRAG_TERMINAL_VELOCITY_MIN_MASS,
    DRAG_TERMINAL_VELOCITY_MAX_MASS,
    RESPONSE_SAMPLES,
  );
  const areaSamples = sampleRange(
    DRAG_TERMINAL_VELOCITY_MIN_AREA,
    DRAG_TERMINAL_VELOCITY_MAX_AREA,
    RESPONSE_SAMPLES,
  );
  const dragSamples = sampleRange(
    DRAG_TERMINAL_VELOCITY_MIN_DRAG_STRENGTH,
    DRAG_TERMINAL_VELOCITY_MAX_DRAG_STRENGTH,
    RESPONSE_SAMPLES,
  );

  return {
    "speed-history": [
      sampleTimeSeries(
        "speed",
        "Speed",
        0,
        DRAG_TERMINAL_VELOCITY_MAX_TIME,
        GRAPH_SAMPLES,
        (timeValue) => sampleDragTerminalVelocityState(resolved, timeValue).speed,
        "#1ea6a2",
      ),
      sampleTimeSeries(
        "terminal-speed",
        "Terminal speed",
        0,
        DRAG_TERMINAL_VELOCITY_MAX_TIME,
        GRAPH_SAMPLES,
        () => baseline.terminalSpeed,
        "#f16659",
      ),
    ],
    "force-balance": [
      sampleTimeSeries(
        "weight",
        "Weight",
        0,
        DRAG_TERMINAL_VELOCITY_MAX_TIME,
        GRAPH_SAMPLES,
        () => baseline.weightForce,
        "#f0ab3c",
      ),
      sampleTimeSeries(
        "drag-force",
        "Drag force",
        0,
        DRAG_TERMINAL_VELOCITY_MAX_TIME,
        GRAPH_SAMPLES,
        (timeValue) => sampleDragTerminalVelocityState(resolved, timeValue).dragForce,
        "#4ea6df",
      ),
      sampleTimeSeries(
        "net-force",
        "Net downward force",
        0,
        DRAG_TERMINAL_VELOCITY_MAX_TIME,
        GRAPH_SAMPLES,
        (timeValue) => sampleDragTerminalVelocityState(resolved, timeValue).netForce,
        "#111827",
      ),
    ],
    "terminal-speed-mass": [
      buildTerminalSpeedSeries(
        "terminal-speed-vs-mass",
        "Terminal speed",
        massSamples,
        (mass) =>
          computeTerminalSpeed(
            mass,
            resolved.area,
            resolved.dragStrength,
            resolved.gravity,
          ),
        "#1ea6a2",
      ),
    ],
    "terminal-speed-area": [
      buildTerminalSpeedSeries(
        "terminal-speed-vs-area",
        "Terminal speed",
        areaSamples,
        (area) =>
          computeTerminalSpeed(
            resolved.mass,
            area,
            resolved.dragStrength,
            resolved.gravity,
          ),
        "#f16659",
      ),
    ],
    "terminal-speed-drag-strength": [
      buildTerminalSpeedSeries(
        "terminal-speed-vs-drag-strength",
        "Terminal speed",
        dragSamples,
        (dragStrength) =>
          computeTerminalSpeed(
            resolved.mass,
            resolved.area,
            dragStrength,
            resolved.gravity,
          ),
        "#4ea6df",
      ),
    ],
  };
}

export function describeDragTerminalVelocityState(
  params: DragTerminalVelocityParams,
  time: number,
) {
  const snapshot = sampleDragTerminalVelocityState(params, time);
  const balanceText =
    snapshot.balanceLabel === "near-terminal"
      ? "Drag is now almost matching weight, so the speed is settling into a nearly constant terminal value."
      : snapshot.balanceLabel === "approaching-balance"
        ? "Drag has grown enough to take a large share of the weight, so the acceleration is shrinking."
        : "The object is still in the early part of the fall where drag is much smaller than weight.";

  return `At t = ${formatMeasurement(snapshot.time, "s")}, the object has fallen ${formatMeasurement(snapshot.position, "m")} and is moving at ${formatMeasurement(snapshot.speed, "m/s")}. Weight is ${formatMeasurement(snapshot.weightForce, "N")}, drag is ${formatMeasurement(snapshot.dragForce, "N")}, and the terminal speed for this setup is ${formatMeasurement(snapshot.terminalSpeed, "m/s")}. ${balanceText}`;
}

export function formatDragTerminalVelocitySummary(snapshot: DragTerminalVelocitySnapshot) {
  return `m = ${formatNumber(snapshot.mass)} kg, A = ${formatNumber(snapshot.area)} m^2, k = ${formatNumber(snapshot.dragStrength)}, v_t = ${formatNumber(snapshot.terminalSpeed)} m/s`;
}
