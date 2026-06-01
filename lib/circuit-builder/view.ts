import { createDefaultCircuitView } from "./model";
import {
  CIRCUIT_CANVAS_HEIGHT,
  CIRCUIT_CANVAS_WIDTH,
  type CircuitDocument,
} from "./types";

export type CircuitCanvasFrame = {
  width: number;
  height: number;
};

export const CIRCUIT_COMPACT_CANVAS_MEDIA_QUERY = "(max-width: 767px)";
export const CIRCUIT_DESKTOP_CANVAS_FRAME: CircuitCanvasFrame = {
  width: CIRCUIT_CANVAS_WIDTH,
  height: CIRCUIT_CANVAS_HEIGHT,
};
export const CIRCUIT_COMPACT_CANVAS_FRAME: CircuitCanvasFrame = {
  width: 720,
  height: 640,
};
export const MINIMUM_CIRCUIT_WORKSPACE_ZOOM = 0.45;
export const MAXIMUM_CIRCUIT_WORKSPACE_ZOOM = 2.4;
export const MAXIMUM_FIT_CIRCUIT_WORKSPACE_ZOOM = 2.25;

const fitViewPadding = 80;
const componentFitRadius = {
  x: 128,
  y: 132,
};

export function buildFittedCircuitView(
  document: CircuitDocument,
  canvasFrame: CircuitCanvasFrame = CIRCUIT_DESKTOP_CANVAS_FRAME,
) {
  if (document.components.length === 0) {
    return createDefaultCircuitView();
  }

  const bounds = document.components.reduce(
    (current, component) => ({
      minX: Math.min(current.minX, component.x - componentFitRadius.x),
      maxX: Math.max(current.maxX, component.x + componentFitRadius.x),
      minY: Math.min(current.minY, component.y - componentFitRadius.y),
      maxY: Math.max(current.maxY, component.y + componentFitRadius.y),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );

  const availableWidth = Math.max(canvasFrame.width - fitViewPadding * 2, 1);
  const availableHeight = Math.max(canvasFrame.height - fitViewPadding * 2, 1);
  const boundsWidth = Math.max(bounds.maxX - bounds.minX, componentFitRadius.x * 2);
  const boundsHeight = Math.max(bounds.maxY - bounds.minY, componentFitRadius.y * 2);
  const zoom = Math.max(
    MINIMUM_CIRCUIT_WORKSPACE_ZOOM,
    Math.min(
      MAXIMUM_FIT_CIRCUIT_WORKSPACE_ZOOM,
      Math.min(availableWidth / boundsWidth, availableHeight / boundsHeight),
    ),
  );
  const center = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };

  return {
    zoom,
    offsetX: canvasFrame.width / 2 - center.x * zoom,
    offsetY: canvasFrame.height / 2 - center.y * zoom,
  } satisfies CircuitDocument["view"];
}
