"use client";

import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";

type SvgPointerLocation = {
  svgX: number;
  svgY: number;
};

type UseSvgPointerDragOptions<T> = {
  svgRef: RefObject<SVGSVGElement | null>;
  width: number;
  height: number;
  onDrag: (target: T, location: SvgPointerLocation) => void;
  onDragStart?: (target: T) => void;
  dragThreshold?: number;
};

export function useSvgPointerDrag<T>({
  svgRef,
  width,
  height,
  onDrag,
  onDragStart,
  dragThreshold = 0,
}: UseSvgPointerDragOptions<T>) {
  const [activePointerId, setActivePointerId] = useState<number | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const activeTargetRef = useRef<T | null>(null);
  const startClientPointRef = useRef<{ x: number; y: number } | null>(null);
  const hasExceededThresholdRef = useRef(false);
  const onDragRef = useRef(onDrag);
  const onDragStartRef = useRef(onDragStart);

  useEffect(() => {
    onDragRef.current = onDrag;
  }, [onDrag]);

  useEffect(() => {
    onDragStartRef.current = onDragStart;
  }, [onDragStart]);

  function beginDrag(target: T, clientX: number, clientY: number) {
    if (!hasExceededThresholdRef.current) {
      hasExceededThresholdRef.current = true;
      onDragStartRef.current?.(target);
    }
    emitDrag(target, clientX, clientY);
  }

  function emitDrag(target: T, clientX: number, clientY: number) {
    const svg = svgRef.current;

    if (!svg) {
      return;
    }

    const bounds = svg.getBoundingClientRect();
    onDragRef.current(target, {
      svgX: ((clientX - bounds.left) / Math.max(bounds.width, 1)) * width,
      svgY: ((clientY - bounds.top) / Math.max(bounds.height, 1)) * height,
    });
  }

  function clearDragState(pointerId?: number) {
    const svg = svgRef.current;

    if (
      svg &&
      pointerId !== undefined &&
      activePointerIdRef.current === pointerId &&
      svg.hasPointerCapture(pointerId)
    ) {
      svg.releasePointerCapture(pointerId);
    }

    activePointerIdRef.current = null;
    activeTargetRef.current = null;
    startClientPointRef.current = null;
    hasExceededThresholdRef.current = false;
    setActivePointerId(null);
  }

  function startDrag(pointerId: number, target: T, clientX: number, clientY: number) {
    const svg = svgRef.current;

    if (!svg) {
      return;
    }

    if (typeof svg.setPointerCapture === "function") {
      svg.setPointerCapture(pointerId);
    }
    activePointerIdRef.current = pointerId;
    activeTargetRef.current = target;
    startClientPointRef.current = { x: clientX, y: clientY };
    hasExceededThresholdRef.current = false;
    setActivePointerId(pointerId);
    if (dragThreshold <= 0) {
      beginDrag(target, clientX, clientY);
    }
  }

  function handlePointerMove(pointerId: number, clientX: number, clientY: number) {
    if (activePointerIdRef.current !== pointerId || activeTargetRef.current === null) {
      return;
    }

    if (!hasExceededThresholdRef.current) {
      const start = startClientPointRef.current;
      const distance = start ? Math.hypot(clientX - start.x, clientY - start.y) : 0;
      if (distance < dragThreshold) {
        return;
      }
    }

    beginDrag(activeTargetRef.current, clientX, clientY);
  }

  function handlePointerUp(pointerId: number) {
    if (activePointerIdRef.current === pointerId) {
      clearDragState(pointerId);
    }
  }

  function handlePointerCancel(pointerId: number) {
    handlePointerUp(pointerId);
  }

  function handleLostPointerCapture() {
    clearDragState();
  }

  return {
    activePointerId,
    startDrag,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleLostPointerCapture,
    hasExceededThreshold: (pointerId?: number) =>
      (pointerId === undefined || activePointerIdRef.current === pointerId) &&
      hasExceededThresholdRef.current,
  };
}
