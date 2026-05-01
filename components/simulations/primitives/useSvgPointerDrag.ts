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
};

export function useSvgPointerDrag<T>({
  svgRef,
  width,
  height,
  onDrag,
}: UseSvgPointerDragOptions<T>) {
  const [activePointerId, setActivePointerId] = useState<number | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const activeTargetRef = useRef<T | null>(null);
  const onDragRef = useRef(onDrag);

  useEffect(() => {
    onDragRef.current = onDrag;
  }, [onDrag]);

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
    setActivePointerId(null);
  }

  function startDrag(pointerId: number, target: T, clientX: number, clientY: number) {
    const svg = svgRef.current;

    if (!svg) {
      return;
    }

    svg.setPointerCapture(pointerId);
    activePointerIdRef.current = pointerId;
    activeTargetRef.current = target;
    setActivePointerId(pointerId);
    emitDrag(target, clientX, clientY);
  }

  function handlePointerMove(pointerId: number, clientX: number, clientY: number) {
    if (activePointerIdRef.current !== pointerId || activeTargetRef.current === null) {
      return;
    }

    emitDrag(activeTargetRef.current, clientX, clientY);
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
  };
}
