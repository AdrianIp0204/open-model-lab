"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  clamp,
  mapRange,
  resolveAngularFrequency,
  sampleShmState,
  TAU,
  type ShmParams,
} from "@/lib/physics";

const PREVIEW_PARAMS = {
  amplitude: 1.05,
  angularFrequency: TAU / 5.2,
  phase: Math.PI / 5,
  mass: 1,
} satisfies ShmParams;

const OMEGA = resolveAngularFrequency(PREVIEW_PARAMS);
const LOOP_PERIOD = TAU / OMEGA;
const INITIAL_TIME = LOOP_PERIOD * 0.18;
const STAGE_SWING_PX = 42;
const GRAPH_SAMPLE_COUNT = 84;
const GRAPH_WINDOW_SECONDS = LOOP_PERIOD * 1.9;
const IDLE_GUIDE_FRACTION = 0.7;
const GUIDE_FOLLOW_RANGE = 0.22;
const GUIDE_FRACTION_MIN = 0.48;
const GUIDE_FRACTION_MAX = 0.86;
const GRAPH_WIDTH = 1000;
const GRAPH_HEIGHT = 220;
const GRAPH_LEFT = 36;
const GRAPH_RIGHT = 964;
const GRAPH_DISPLACEMENT_BASELINE = 74;
const GRAPH_VELOCITY_BASELINE = 158;
const GRAPH_DISPLACEMENT_SCALE = 46;
const GRAPH_VELOCITY_SCALE = 34;
const MAX_VELOCITY = Math.max(PREVIEW_PARAMS.amplitude * OMEGA, 0.001);
const MAX_ACCELERATION = Math.max(PREVIEW_PARAMS.amplitude * OMEGA * OMEGA, 0.001);
const HOVER_EASING = 0.14;
const GUIDE_EASING = 0.16;

type PreviewCue = "amplitude" | "velocity" | "acceleration";

type PreviewInteractionState = {
  activeCue: PreviewCue;
  guideFraction: number;
  guideTarget: number;
  hoverStrength: number;
  hoverTarget: number;
};

type PreviewFrame = {
  objectTransform: string;
  velocityCueTransform: string;
  velocityCueOpacity: string;
  accelerationCueTransform: string;
  accelerationCueOpacity: string;
  displacementPath: string;
  velocityPath: string;
  displacementPathOpacity: string;
  velocityPathOpacity: string;
  displacementPathWidth: string;
  velocityPathWidth: string;
  guideX: string;
  guideOpacity: string;
  displacementMarkerY: string;
  velocityMarkerY: string;
  displacementMarkerRadius: string;
  velocityMarkerRadius: string;
  displacementMarkerHaloRadius: string;
  velocityMarkerHaloRadius: string;
  displacementMarkerHaloOpacity: string;
  velocityMarkerHaloOpacity: string;
};

const PREVIEW_CUES: ReadonlyArray<{
  cue: PreviewCue;
  positionClass: string;
  activeClass: string;
  dotClass: string;
}> = [
  {
    cue: "amplitude",
    positionClass: "left-6 top-6",
    activeClass:
      "border-amber-500/45 bg-amber-100/75 text-ink-950 shadow-[0_12px_30px_rgba(240,171,60,0.12)]",
    dotClass: "bg-amber-500",
  },
  {
    cue: "velocity",
    positionClass: "right-6 top-6",
    activeClass:
      "border-teal-500/45 bg-teal-100/80 text-ink-950 shadow-[0_12px_30px_rgba(30,166,162,0.14)]",
    dotClass: "bg-teal-500",
  },
  {
    cue: "acceleration",
    positionClass: "bottom-6 left-6",
    activeClass:
      "border-coral-500/45 bg-coral-100/80 text-ink-950 shadow-[0_12px_30px_rgba(241,102,89,0.14)]",
    dotClass: "bg-coral-500",
  },
] as const;

const INITIAL_INTERACTION_STATE: PreviewInteractionState = {
  activeCue: "amplitude",
  guideFraction: IDLE_GUIDE_FRACTION,
  guideTarget: IDLE_GUIDE_FRACTION,
  hoverStrength: 0,
  hoverTarget: 0,
};

function wrapLoopTime(time: number) {
  const loopedTime = time % LOOP_PERIOD;
  return loopedTime >= 0 ? loopedTime : loopedTime + LOOP_PERIOD;
}

function blend(current: number, target: number, easing: number) {
  return current + (target - current) * easing;
}

function buildCueTransform(
  axis: "x" | "y",
  normalizedValue: number,
  positiveAngle: number,
  emphasis = 1,
) {
  const magnitude = (0.16 + Math.abs(clamp(normalizedValue, -1, 1)) * 0.84) * emphasis;
  const direction = normalizedValue >= 0 ? positiveAngle : positiveAngle + 180;
  const scale = magnitude.toFixed(3);

  return axis === "y"
    ? `rotate(${direction}deg) scaleY(${scale})`
    : `rotate(${direction}deg) scaleX(${scale})`;
}

function buildTracePath(
  currentTime: number,
  sampleAtTime: (time: number) => number,
  baseline: number,
  amplitude: number,
  markerFraction: number,
) {
  const startTime = currentTime - GRAPH_WINDOW_SECONDS * markerFraction;
  const endTime = startTime + GRAPH_WINDOW_SECONDS;

  return Array.from({ length: GRAPH_SAMPLE_COUNT }, (_, index) => {
    const ratio = index / (GRAPH_SAMPLE_COUNT - 1);
    const sampleTime = startTime + (endTime - startTime) * ratio;
    const normalizedValue = clamp(sampleAtTime(wrapLoopTime(sampleTime)), -1.08, 1.08);
    const x = mapRange(ratio, 0, 1, GRAPH_LEFT, GRAPH_RIGHT);
    const y = baseline - normalizedValue * amplitude;

    return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ");
}

function buildPreviewFrame(time: number, interaction: PreviewInteractionState): PreviewFrame {
  const loopTime = wrapLoopTime(time);
  const snapshot = sampleShmState(PREVIEW_PARAMS, loopTime);
  const displacementNormalized = snapshot.displacement / Math.max(PREVIEW_PARAMS.amplitude, 0.001);
  const velocityNormalized = snapshot.velocity / MAX_VELOCITY;
  const accelerationNormalized = snapshot.acceleration / MAX_ACCELERATION;
  const amplitudeFocus = interaction.activeCue === "amplitude" ? 1 : 0;
  const velocityFocus = interaction.activeCue === "velocity" ? 1 : 0;
  const accelerationFocus = interaction.activeCue === "acceleration" ? 1 : 0;
  const hoverLift = interaction.hoverStrength;
  const guideX = mapRange(interaction.guideFraction, 0, 1, GRAPH_LEFT, GRAPH_RIGHT);
  const stageTravel = STAGE_SWING_PX + amplitudeFocus * 3 + hoverLift * 2;
  const stageScale = 1 + amplitudeFocus * 0.035 + hoverLift * 0.018;
  const velocityCueEmphasis = 0.94 + velocityFocus * 0.16 + hoverLift * 0.05;
  const accelerationCueEmphasis = 0.94 + accelerationFocus * 0.18 + hoverLift * 0.05;
  const displacementPathOpacity = clamp(0.76 + amplitudeFocus * 0.18 + hoverLift * 0.08, 0, 1);
  const velocityPathOpacity = clamp(0.62 + velocityFocus * 0.24 + hoverLift * 0.08, 0, 1);
  const displacementPathWidth = 9.4 + amplitudeFocus * 1.2 + hoverLift * 0.6;
  const velocityPathWidth = 7.2 + velocityFocus * 1.25 + hoverLift * 0.5;

  return {
    objectTransform: `translate3d(${(displacementNormalized * stageTravel).toFixed(2)}px, 0, 0) scale(${stageScale.toFixed(3)})`,
    velocityCueTransform: buildCueTransform("y", velocityNormalized, 16, velocityCueEmphasis),
    velocityCueOpacity: `${clamp(
      0.28 + Math.abs(clamp(velocityNormalized, -1, 1)) * 0.64 + velocityFocus * 0.12 + hoverLift * 0.08,
      0.24,
      1,
    ).toFixed(3)}`,
    accelerationCueTransform: buildCueTransform(
      "x",
      accelerationNormalized,
      18,
      accelerationCueEmphasis,
    ),
    accelerationCueOpacity: `${clamp(
      0.28 +
        Math.abs(clamp(accelerationNormalized, -1, 1)) * 0.64 +
        accelerationFocus * 0.14 +
        hoverLift * 0.08,
      0.24,
      1,
    ).toFixed(3)}`,
    displacementPath: buildTracePath(
      loopTime,
      (sampleTime) => sampleShmState(PREVIEW_PARAMS, sampleTime).displacement / PREVIEW_PARAMS.amplitude,
      GRAPH_DISPLACEMENT_BASELINE,
      GRAPH_DISPLACEMENT_SCALE,
      interaction.guideFraction,
    ),
    velocityPath: buildTracePath(
      loopTime,
      (sampleTime) => sampleShmState(PREVIEW_PARAMS, sampleTime).velocity / MAX_VELOCITY,
      GRAPH_VELOCITY_BASELINE,
      GRAPH_VELOCITY_SCALE,
      interaction.guideFraction,
    ),
    displacementPathOpacity: displacementPathOpacity.toFixed(3),
    velocityPathOpacity: velocityPathOpacity.toFixed(3),
    displacementPathWidth: displacementPathWidth.toFixed(2),
    velocityPathWidth: velocityPathWidth.toFixed(2),
    guideX: guideX.toFixed(2),
    guideOpacity: `${(0.14 + hoverLift * 0.12).toFixed(3)}`,
    displacementMarkerY: (
      GRAPH_DISPLACEMENT_BASELINE - displacementNormalized * GRAPH_DISPLACEMENT_SCALE
    ).toFixed(2),
    velocityMarkerY: (
      GRAPH_VELOCITY_BASELINE - velocityNormalized * GRAPH_VELOCITY_SCALE
    ).toFixed(2),
    displacementMarkerRadius: (7 + amplitudeFocus * 1.35 + hoverLift * 0.35).toFixed(2),
    velocityMarkerRadius: (6.5 + velocityFocus * 1.35 + hoverLift * 0.35).toFixed(2),
    displacementMarkerHaloRadius: (12 + amplitudeFocus * 1.8 + hoverLift * 1.1).toFixed(2),
    velocityMarkerHaloRadius: (11 + velocityFocus * 1.8 + hoverLift * 1.1).toFixed(2),
    displacementMarkerHaloOpacity: `${(0.12 + amplitudeFocus * 0.08 + hoverLift * 0.06).toFixed(3)}`,
    velocityMarkerHaloOpacity: `${(0.12 + velocityFocus * 0.08 + hoverLift * 0.06).toFixed(3)}`,
  };
}

const INITIAL_FRAME = buildPreviewFrame(INITIAL_TIME, INITIAL_INTERACTION_STATE);

function setAttribute(
  node: SVGPathElement | SVGCircleElement | SVGLineElement | null,
  attribute: string,
  value: string,
) {
  node?.setAttribute(attribute, value);
}

export function HomeHeroLivePreview() {
  const t = useTranslations("HomeHeroLivePreview");
  const [activeCue, setActiveCue] = useState<PreviewCue>(INITIAL_INTERACTION_STATE.activeCue);
  const objectRef = useRef<HTMLDivElement | null>(null);
  const velocityCueRef = useRef<HTMLDivElement | null>(null);
  const accelerationCueRef = useRef<HTMLDivElement | null>(null);
  const displacementPathRef = useRef<SVGPathElement | null>(null);
  const velocityPathRef = useRef<SVGPathElement | null>(null);
  const guideLineRef = useRef<SVGLineElement | null>(null);
  const displacementMarkerHaloRef = useRef<SVGCircleElement | null>(null);
  const displacementMarkerRef = useRef<SVGCircleElement | null>(null);
  const velocityMarkerHaloRef = useRef<SVGCircleElement | null>(null);
  const velocityMarkerRef = useRef<SVGCircleElement | null>(null);
  const currentTimeRef = useRef(INITIAL_TIME);
  const autoplayFrameRef = useRef<number | null>(null);
  const autoplayOriginRef = useRef<number | null>(null);
  const autoplayRunningRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const applyCurrentFrameRef = useRef<(() => void) | null>(null);
  const interactionRef = useRef<PreviewInteractionState>({
    ...INITIAL_INTERACTION_STATE,
  });
  const initialFrame = INITIAL_FRAME;

  const syncPausedInteractionFrame = () => {
    if (autoplayRunningRef.current) {
      return;
    }

    interactionRef.current.hoverStrength = interactionRef.current.hoverTarget;
    interactionRef.current.guideFraction = interactionRef.current.guideTarget;
    applyCurrentFrameRef.current?.();
  };

  const updateActiveCue = (cue: PreviewCue) => {
    interactionRef.current.activeCue = cue;
    setActiveCue(cue);
    syncPausedInteractionFrame();
  };

  const updatePointerGuide = (clientX: number, width: number, left: number) => {
    const pointerRatio = clamp((clientX - left) / Math.max(width, 1), 0, 1);
    interactionRef.current.guideTarget = clamp(
      IDLE_GUIDE_FRACTION + (pointerRatio - 0.5) * GUIDE_FOLLOW_RANGE,
      GUIDE_FRACTION_MIN,
      GUIDE_FRACTION_MAX,
    );
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;

    const applyFrame = (frame: PreviewFrame) => {
      if (objectRef.current) {
        objectRef.current.style.transform = frame.objectTransform;
      }

      if (velocityCueRef.current) {
        velocityCueRef.current.style.transform = frame.velocityCueTransform;
        velocityCueRef.current.style.opacity = frame.velocityCueOpacity;
      }

      if (accelerationCueRef.current) {
        accelerationCueRef.current.style.transform = frame.accelerationCueTransform;
        accelerationCueRef.current.style.opacity = frame.accelerationCueOpacity;
      }

      setAttribute(guideLineRef.current, "x1", frame.guideX);
      setAttribute(guideLineRef.current, "x2", frame.guideX);
      setAttribute(guideLineRef.current, "stroke-opacity", frame.guideOpacity);
      setAttribute(displacementPathRef.current, "d", frame.displacementPath);
      setAttribute(displacementPathRef.current, "stroke-width", frame.displacementPathWidth);
      setAttribute(displacementPathRef.current, "stroke-opacity", frame.displacementPathOpacity);
      setAttribute(velocityPathRef.current, "d", frame.velocityPath);
      setAttribute(velocityPathRef.current, "stroke-width", frame.velocityPathWidth);
      setAttribute(velocityPathRef.current, "stroke-opacity", frame.velocityPathOpacity);
      setAttribute(displacementMarkerHaloRef.current, "cx", frame.guideX);
      setAttribute(displacementMarkerHaloRef.current, "cy", frame.displacementMarkerY);
      setAttribute(displacementMarkerHaloRef.current, "r", frame.displacementMarkerHaloRadius);
      setAttribute(
        displacementMarkerHaloRef.current,
        "fill-opacity",
        frame.displacementMarkerHaloOpacity,
      );
      setAttribute(displacementMarkerRef.current, "cx", frame.guideX);
      setAttribute(displacementMarkerRef.current, "cy", frame.displacementMarkerY);
      setAttribute(displacementMarkerRef.current, "r", frame.displacementMarkerRadius);
      setAttribute(velocityMarkerHaloRef.current, "cx", frame.guideX);
      setAttribute(velocityMarkerHaloRef.current, "cy", frame.velocityMarkerY);
      setAttribute(velocityMarkerHaloRef.current, "r", frame.velocityMarkerHaloRadius);
      setAttribute(velocityMarkerHaloRef.current, "fill-opacity", frame.velocityMarkerHaloOpacity);
      setAttribute(velocityMarkerRef.current, "cx", frame.guideX);
      setAttribute(velocityMarkerRef.current, "cy", frame.velocityMarkerY);
      setAttribute(velocityMarkerRef.current, "r", frame.velocityMarkerRadius);
    };

    const renderCurrentFrame = () => {
      applyFrame(buildPreviewFrame(currentTimeRef.current, interactionRef.current));
    };

    applyCurrentFrameRef.current = renderCurrentFrame;

    const stopAutoplayLoop = () => {
      if (autoplayFrameRef.current !== null) {
        window.cancelAnimationFrame(autoplayFrameRef.current);
        autoplayFrameRef.current = null;
      }

      autoplayOriginRef.current = null;
      autoplayRunningRef.current = false;
    };

    const tick = (now: number) => {
      if (reducedMotionRef.current) {
        stopAutoplayLoop();
        return;
      }

      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        stopAutoplayLoop();
        return;
      }

      const autoplayOrigin =
        autoplayOriginRef.current ?? now - currentTimeRef.current * 1000;

      autoplayOriginRef.current = autoplayOrigin;
      currentTimeRef.current = wrapLoopTime((now - autoplayOrigin) / 1000);
      interactionRef.current.hoverStrength = blend(
        interactionRef.current.hoverStrength,
        interactionRef.current.hoverTarget,
        HOVER_EASING,
      );
      interactionRef.current.guideFraction = blend(
        interactionRef.current.guideFraction,
        interactionRef.current.guideTarget,
        GUIDE_EASING,
      );
      renderCurrentFrame();
      autoplayFrameRef.current = window.requestAnimationFrame(tick);
    };

    const startAutoplayLoop = () => {
      if (autoplayRunningRef.current || reducedMotionRef.current) {
        return;
      }

      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }

      autoplayOriginRef.current = window.performance.now() - currentTimeRef.current * 1000;
      autoplayRunningRef.current = true;
      renderCurrentFrame();
      autoplayFrameRef.current = window.requestAnimationFrame(tick);
    };

    const syncMotionPreference = () => {
      stopAutoplayLoop();
      reducedMotionRef.current = mediaQuery?.matches ?? false;

      if (reducedMotionRef.current) {
        interactionRef.current.hoverStrength = interactionRef.current.hoverTarget;
        interactionRef.current.guideFraction = interactionRef.current.guideTarget;
        renderCurrentFrame();
        return;
      }

      startAutoplayLoop();
    };

    syncMotionPreference();

    const handleChange = () => syncMotionPreference();
    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        stopAutoplayLoop();
        renderCurrentFrame();
        return;
      }

      if (!reducedMotionRef.current) {
        startAutoplayLoop();
      }
    };

    if (mediaQuery && typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
    } else {
      mediaQuery?.addListener(handleChange);
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopAutoplayLoop();
      applyCurrentFrameRef.current = null;

      if (mediaQuery && typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", handleChange);
      } else {
        mediaQuery?.removeListener(handleChange);
      }

      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    interactionRef.current.activeCue = activeCue;
    if (!autoplayRunningRef.current) {
      interactionRef.current.hoverStrength = interactionRef.current.hoverTarget;
      interactionRef.current.guideFraction = interactionRef.current.guideTarget;
      applyCurrentFrameRef.current?.();
    }
  }, [activeCue]);

  return (
    <div
      className="lab-grid relative min-h-[280px] overflow-hidden rounded-[22px] border border-line bg-[#f7f5ef] sm:min-h-[330px] lg:min-h-[360px]"
      role="group"
      aria-label={t("ariaLabel")}
      data-home-live-preview="true"
      data-preview-active-cue={activeCue}
      onPointerEnter={() => {
        interactionRef.current.hoverTarget = 1;
        syncPausedInteractionFrame();
      }}
      onPointerLeave={() => {
        interactionRef.current.hoverTarget = 0;
        interactionRef.current.guideTarget = IDLE_GUIDE_FRACTION;
        syncPausedInteractionFrame();
      }}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        interactionRef.current.hoverTarget = 1;
        updatePointerGuide(event.clientX, rect.width, rect.left);
        syncPausedInteractionFrame();
      }}
      onPointerDown={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        interactionRef.current.hoverTarget = 0.72;
        updatePointerGuide(event.clientX, rect.width, rect.left);
        syncPausedInteractionFrame();
      }}
    >
      {PREVIEW_CUES.map((item) => {
        const active = item.cue === activeCue;

        return (
          <button
            key={item.cue}
            type="button"
            aria-pressed={active}
            className={[
              "absolute z-10 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold text-ink-700 transition-[transform,border-color,background-color,box-shadow,color] duration-300 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-950/25 active:translate-y-0",
              item.positionClass,
              active
                ? item.activeClass
                : "border-line bg-white/90 hover:-translate-y-0.5 hover:border-ink-950/15 hover:bg-white",
            ].join(" ")}
            onPointerEnter={() => updateActiveCue(item.cue)}
            onFocus={() => updateActiveCue(item.cue)}
            onClick={() => updateActiveCue(item.cue)}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${item.dotClass}`} />
            {t(`cues.${item.cue}`)}
          </button>
        );
      })}

      <div className="absolute inset-x-8 top-1/2 h-px bg-line" />
      <div className="absolute left-8 top-12 h-[calc(100%-6rem)] w-px bg-line" />

      <div
        ref={objectRef}
        data-preview-stage-object="true"
        className="absolute left-[18%] top-[56%] h-24 w-24 rounded-full border border-ink-950/10 bg-gradient-to-br from-amber-500/90 to-coral-500/85 shadow-[0_0_0_18px_rgba(240,171,60,0.12)]"
        style={{
          transform: initialFrame.objectTransform,
          willChange: "transform",
        }}
      />

      <div
        ref={velocityCueRef}
        data-preview-velocity-cue="true"
        className="absolute left-[40%] top-[34%] h-[160px] w-[2px] origin-bottom bg-teal-500 shadow-[0_0_14px_rgba(30,166,162,0.2)]"
        style={{
          transform: initialFrame.velocityCueTransform,
          opacity: initialFrame.velocityCueOpacity,
          willChange: "transform, opacity",
        }}
      />

      <div
        ref={accelerationCueRef}
        data-preview-acceleration-cue="true"
        className="absolute left-[40%] top-[34%] h-[2px] w-[140px] origin-left bg-coral-500 shadow-[0_0_14px_rgba(241,102,89,0.2)]"
        style={{
          transform: initialFrame.accelerationCueTransform,
          opacity: initialFrame.accelerationCueOpacity,
          willChange: "transform, opacity",
        }}
      />

      <div className="absolute inset-x-10 bottom-12 h-[138px] rounded-[24px] border border-line bg-white/55">
        <svg
          viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
          className="h-full w-full"
          role="presentation"
          focusable="false"
        >
          <line
            x1={GRAPH_LEFT}
            x2={GRAPH_RIGHT}
            y1={GRAPH_DISPLACEMENT_BASELINE}
            y2={GRAPH_DISPLACEMENT_BASELINE}
            stroke="rgba(15, 28, 36, 0.08)"
            strokeWidth="2"
          />
          <line
            x1={GRAPH_LEFT}
            x2={GRAPH_RIGHT}
            y1={GRAPH_VELOCITY_BASELINE}
            y2={GRAPH_VELOCITY_BASELINE}
            stroke="rgba(15, 28, 36, 0.08)"
            strokeWidth="2"
          />
          <line
            ref={guideLineRef}
            data-preview-guide="true"
            x1={initialFrame.guideX}
            x2={initialFrame.guideX}
            y1="18"
            y2="202"
            stroke="rgba(15, 28, 36, 0.14)"
            strokeWidth="3"
            strokeDasharray="8 10"
          />
          <path
            ref={displacementPathRef}
            data-preview-displacement-path="true"
            d={initialFrame.displacementPath}
            fill="none"
            stroke="rgba(30,166,162,0.95)"
            strokeWidth={initialFrame.displacementPathWidth}
            strokeOpacity={initialFrame.displacementPathOpacity}
            strokeLinecap="round"
          />
          <path
            ref={velocityPathRef}
            data-preview-velocity-path="true"
            d={initialFrame.velocityPath}
            fill="none"
            stroke="rgba(241,102,89,0.82)"
            strokeWidth={initialFrame.velocityPathWidth}
            strokeOpacity={initialFrame.velocityPathOpacity}
            strokeLinecap="round"
          />
          <circle
            ref={displacementMarkerHaloRef}
            cx={initialFrame.guideX}
            cy={initialFrame.displacementMarkerY}
            r={initialFrame.displacementMarkerHaloRadius}
            fill="rgba(30,166,162,0.14)"
            fillOpacity={initialFrame.displacementMarkerHaloOpacity}
          />
          <circle
            ref={displacementMarkerRef}
            cx={initialFrame.guideX}
            cy={initialFrame.displacementMarkerY}
            r={initialFrame.displacementMarkerRadius}
            fill="rgba(30,166,162,0.96)"
            stroke="rgba(255,253,247,0.95)"
            strokeWidth="3"
          />
          <circle
            ref={velocityMarkerHaloRef}
            cx={initialFrame.guideX}
            cy={initialFrame.velocityMarkerY}
            r={initialFrame.velocityMarkerHaloRadius}
            fill="rgba(241,102,89,0.14)"
            fillOpacity={initialFrame.velocityMarkerHaloOpacity}
          />
          <circle
            ref={velocityMarkerRef}
            cx={initialFrame.guideX}
            cy={initialFrame.velocityMarkerY}
            r={initialFrame.velocityMarkerRadius}
            fill="rgba(241,102,89,0.9)"
            stroke="rgba(255,253,247,0.95)"
            strokeWidth="3"
          />
        </svg>
      </div>
    </div>
  );
}
