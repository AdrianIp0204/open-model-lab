"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import {
  clamp,
  formatMeasurement,
  formatNumber,
  type ConceptSimulationSource,
  type GraphSeriesSetupId,
  type GraphStagePreview,
  REFRACTION_MAX_INCIDENT_ANGLE,
  REFRACTION_MIN_INCIDENT_ANGLE,
  resolveRefractionSnellsLawParams,
  sampleRefractionSnellsLawState,
} from "@/lib/physics";
import type { AppLocale } from "@/i18n/routing";
import { copyText, getCompareSetupLabel } from "@/lib/i18n/copy-text";
import { SimulationReadoutCard } from "./SimulationReadoutCard";

type SimulationParams = Record<string, number | boolean | string>;

type CompareMode = {
  activeTarget: GraphSeriesSetupId;
  setupA: SimulationParams;
  setupB: SimulationParams;
  labelA?: string;
  labelB?: string;
};

type RefractionSnellsLawSimulationProps = {
  concept: ConceptSimulationSource;
  params: SimulationParams;
  time: number;
  setParam: (param: string, value: number | boolean | string) => void;
  overlayValues?: Record<string, boolean>;
  focusedOverlayId?: string | null;
  compare?: CompareMode;
  graphPreview?: GraphStagePreview | null;
};

type RefractionFrame = {
  params: ReturnType<typeof resolveRefractionSnellsLawParams>;
  snapshot: ReturnType<typeof sampleRefractionSnellsLawState>;
};

const WIDTH = 820;
const HEIGHT = 332;
const CENTER_X = 324;
const CENTER_Y = 164;
const RAY_LENGTH = 150;
const CARD_WIDTH = 244;
const CARD_X = WIDTH - CARD_WIDTH - 18;
const CARD_Y = 18;

function buildFrame(source: SimulationParams, incidentAngleOverride?: number): RefractionFrame {
  const params = resolveRefractionSnellsLawParams({
    ...source,
    incidentAngle:
      incidentAngleOverride === undefined ? source.incidentAngle : incidentAngleOverride,
  });

  return {
    params,
    snapshot: sampleRefractionSnellsLawState(params),
  };
}

function pointForAngle(
  incidentAngle: number,
  quadrant: "incoming" | "transmitted" | "reflected",
  length = RAY_LENGTH,
) {
  const radians = (incidentAngle * Math.PI) / 180;
  const horizontal = Math.sin(radians) * length;
  const vertical = Math.cos(radians) * length;

  switch (quadrant) {
    case "incoming":
      return {
        x: CENTER_X - horizontal,
        y: CENTER_Y - vertical,
      };
    case "transmitted":
      return {
        x: CENTER_X + horizontal,
        y: CENTER_Y + vertical,
      };
    case "reflected":
      return {
        x: CENTER_X + horizontal,
        y: CENTER_Y - vertical,
      };
  }
}

function overlayWeight(focusedOverlayId: string | null | undefined, overlayId: string) {
  if (!focusedOverlayId) {
    return 1;
  }

  return focusedOverlayId === overlayId ? 1 : 0.38;
}

function formatSpeed(speed: number) {
  return `${formatNumber(speed)} c`;
}

function formatAngle(value: number | null, locale: AppLocale) {
  return value === null ? copyText(locale, "none", "無") : formatMeasurement(value, "deg");
}

function formatSignedAngle(value: number | null, locale: AppLocale) {
  if (value === null) {
    return copyText(locale, "none", "無");
  }

  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatMeasurement(value, "deg")}`;
}

function formatIndexPair(frame: RefractionFrame, locale: AppLocale) {
  return locale === "zh-HK"
    ? `n1 ${formatNumber(frame.snapshot.n1)} → n2 ${formatNumber(frame.snapshot.n2)}`
    : `n1 ${formatNumber(frame.snapshot.n1)} -> n2 ${formatNumber(frame.snapshot.n2)}`;
}

function describeBend(frame: RefractionFrame, locale: AppLocale) {
  if (frame.snapshot.totalInternalReflection) {
    return copyText(locale, "TIR threshold crossed", "已越過全內反射門檻");
  }

  if (frame.snapshot.bendDirection === "toward-normal") {
    return locale === "zh-HK"
      ? `朝向法線 ${formatMeasurement(frame.snapshot.bendAngle ?? 0, "deg")}`
      : `toward ${formatMeasurement(frame.snapshot.bendAngle ?? 0, "deg")}`;
  }

  if (frame.snapshot.bendDirection === "away-from-normal") {
    return locale === "zh-HK"
      ? `遠離法線 ${formatMeasurement(Math.abs(frame.snapshot.bendAngle ?? 0), "deg")}`
      : `away ${formatMeasurement(Math.abs(frame.snapshot.bendAngle ?? 0), "deg")}`;
  }

  return copyText(locale, "none", "無");
}

function polarPoint(radius: number, angleDegrees: number) {
  const radians = (angleDegrees * Math.PI) / 180;

  return {
    x: CENTER_X + radius * Math.cos(radians),
    y: CENTER_Y + radius * Math.sin(radians),
  };
}

function arcPath(radius: number, startAngle: number, endAngle: number) {
  const start = polarPoint(radius, startAngle);
  const end = polarPoint(radius, endAngle);
  const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
  const sweep = endAngle > startAngle ? 1 : 0;

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`;
}

function renderMediumLabel(options: {
  title: string;
  x: number;
  y: number;
  fill: string;
  frame: RefractionFrame;
  showSpeed: boolean;
  speedValue: string;
  medium: "n1" | "n2";
}) {
  return (
    <g transform={`translate(${options.x} ${options.y})`} pointerEvents="none">
      <rect width="172" height={options.showSpeed ? "54" : "38"} rx="16" fill={options.fill} />
      <text x="12" y="18" className="fill-ink-600 text-[10px] font-semibold uppercase tracking-[0.16em]">
        {options.title}
      </text>
      <text x="12" y="34" className="fill-ink-950 text-[13px] font-semibold">
        n = {formatNumber(options.medium === "n1" ? options.frame.snapshot.n1 : options.frame.snapshot.n2)}
      </text>
      {options.showSpeed ? (
        <text x="12" y="48" className="fill-ink-600 text-[11px]">
          v = {options.speedValue}
        </text>
      ) : null}
    </g>
  );
}

function renderAngleGuide(
  frame: RefractionFrame,
  locale: AppLocale,
  focusedOverlayId?: string | null,
) {
  const opacity = overlayWeight(focusedOverlayId, "normalGuide");
  const incidentArc = arcPath(36, -90, -90 - frame.snapshot.incidentAngle);
  const transmittedArc =
    frame.snapshot.refractedAngle === null
      ? null
      : arcPath(42, 90, 90 - frame.snapshot.refractedAngle);

  return (
    <g opacity={opacity} pointerEvents="none">
      <line
        x1={CENTER_X}
        x2={CENTER_X}
        y1="34"
        y2={HEIGHT - 34}
        stroke="rgba(15,28,36,0.28)"
        strokeWidth="2.5"
        strokeDasharray="7 7"
      />
      <path d={incidentArc} fill="none" stroke="rgba(15,28,36,0.35)" strokeWidth="2" />
      <text x={CENTER_X - 52} y={CENTER_Y - 30} className="fill-ink-600 text-[11px] font-semibold">
        theta_1
      </text>
      {transmittedArc ? (
        <>
          <path d={transmittedArc} fill="none" stroke="rgba(15,28,36,0.35)" strokeWidth="2" />
          <text x={CENTER_X + 36} y={CENTER_Y + 52} className="fill-ink-600 text-[11px] font-semibold">
            theta_2
          </text>
        </>
      ) : null}
      <text
        x={CENTER_X + 8}
        y="28"
        className="fill-ink-500 text-[10px] font-semibold uppercase tracking-[0.16em]"
      >
        {copyText(locale, "normal", "法線")}
      </text>
    </g>
  );
}

function renderCriticalGuide(frame: RefractionFrame, focusedOverlayId?: string | null) {
  if (!frame.snapshot.criticalAngle) {
    return null;
  }

  const opacity = overlayWeight(focusedOverlayId, "criticalGuide");
  const guideStart = pointForAngle(frame.snapshot.criticalAngle, "incoming", RAY_LENGTH - 8);

  return (
    <g opacity={opacity} pointerEvents="none">
      <line
        x1={guideStart.x}
        x2={CENTER_X}
        y1={guideStart.y}
        y2={CENTER_Y}
        stroke="rgba(240,171,60,0.7)"
        strokeWidth="2.2"
        strokeDasharray="6 6"
      />
      <line
        x1={CENTER_X}
        x2={CENTER_X + RAY_LENGTH - 10}
        y1={CENTER_Y}
        y2={CENTER_Y}
        stroke="rgba(240,171,60,0.7)"
        strokeWidth="2.2"
        strokeDasharray="6 6"
      />
      <text x={CENTER_X + 10} y={CENTER_Y - 12} className="fill-amber-700 text-[11px] font-semibold">
        theta_c = {formatMeasurement(frame.snapshot.criticalAngle, "deg")}
      </text>
    </g>
  );
}

function renderReflectionGuide(
  frame: RefractionFrame,
  locale: AppLocale,
  focusedOverlayId?: string | null,
) {
  if (!frame.snapshot.totalInternalReflection) {
    return null;
  }

  const opacity = overlayWeight(focusedOverlayId, "reflectionGuide");
  const reflectedArc = arcPath(48, -90, -90 + frame.snapshot.incidentAngle);

  return (
    <g opacity={opacity} pointerEvents="none">
      <path d={reflectedArc} fill="none" stroke="rgba(240,171,60,0.75)" strokeWidth="2.2" />
      <text x={CENTER_X + 34} y={CENTER_Y - 26} className="fill-amber-700 text-[11px] font-semibold">
        theta_r = theta_1
      </text>
      <text x={CENTER_X + 14} y={CENTER_Y - 44} className="fill-amber-700 text-[10px] font-semibold uppercase tracking-[0.14em]">
        {copyText(locale, "internal reflection", "內反射")}
      </text>
    </g>
  );
}

function renderSetup(
  frame: RefractionFrame,
  options: {
    label: string;
    interactive?: boolean;
    overlayValues?: Record<string, boolean>;
    focusedOverlayId?: string | null;
    dashed?: boolean;
    muted?: boolean;
    activePointerId: number | null;
    setActivePointerId: (pointerId: number | null) => void;
    onAdjustIncidentAngle?: (incidentAngle: number) => void;
    locale: AppLocale;
  },
) {
  const incoming = pointForAngle(frame.snapshot.incidentAngle, "incoming");
  const outgoing =
    frame.snapshot.refractedAngle === null
      ? pointForAngle(frame.snapshot.incidentAngle, "reflected")
      : pointForAngle(frame.snapshot.refractedAngle, "transmitted");
  const strokeDasharray = options.dashed ? "10 8" : undefined;
  const opacity = options.muted ? 0.58 : 1;

  return (
    <g opacity={opacity}>
      <line
        x1={incoming.x}
        x2={CENTER_X}
        y1={incoming.y}
        y2={CENTER_Y}
        stroke="#f0ab3c"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={strokeDasharray}
      />
      <line
        x1={CENTER_X}
        x2={outgoing.x}
        y1={CENTER_Y}
        y2={outgoing.y}
        stroke="#f16659"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={strokeDasharray}
      />
      <circle cx={CENTER_X} cy={CENTER_Y} r="5" fill="#0f1c24" />
      <circle cx={incoming.x} cy={incoming.y} r="5" fill="#f0ab3c" />
      <text
        x={incoming.x - 6}
        y={incoming.y - 12}
        textAnchor="end"
        className="fill-amber-700 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        {options.label}
      </text>
      <text
        x={outgoing.x + 10}
        y={outgoing.y + (frame.snapshot.refractedAngle === null ? -8 : 12)}
        className="fill-coral-700 text-[10px] font-semibold uppercase tracking-[0.14em]"
      >
        {frame.snapshot.refractedAngle === null
          ? copyText(options.locale, "reflected path", "反射路徑")
          : copyText(options.locale, "transmitted ray", "透射光線")}
      </text>
      {options.overlayValues?.normalGuide ?? true
        ? renderAngleGuide(frame, options.locale, options.focusedOverlayId)
        : null}
      {options.overlayValues?.criticalGuide ?? false
        ? renderCriticalGuide(frame, options.focusedOverlayId)
        : null}
      {options.overlayValues?.reflectionGuide ?? false
        ? renderReflectionGuide(frame, options.locale, options.focusedOverlayId)
        : null}
      {frame.snapshot.refractedAngle === null ? (
        <text x={CENTER_X + 12} y={CENTER_Y + 20} className="fill-coral-700 text-[11px] font-semibold">
          {copyText(options.locale, "no real transmitted angle", "沒有實數透射角")}
        </text>
      ) : null}
      {options.interactive ? (
        <g
          tabIndex={0}
          role="button"
          aria-label={copyText(
            options.locale,
            `Move incident angle, current ${formatNumber(frame.snapshot.incidentAngle)} degrees`,
            `調整入射角，目前 ${formatNumber(frame.snapshot.incidentAngle)} 度`,
          )}
          style={{ cursor: options.activePointerId === null ? "grab" : "grabbing" }}
          onPointerDown={(event) => {
            const svg = event.currentTarget.ownerSVGElement;
            if (!svg || !options.onAdjustIncidentAngle) {
              return;
            }

            event.currentTarget.setPointerCapture(event.pointerId);
            options.setActivePointerId(event.pointerId);
            const bounds = svg.getBoundingClientRect();
            const svgX = ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * WIDTH;
            const svgY = ((event.clientY - bounds.top) / Math.max(bounds.height, 1)) * HEIGHT;
            const dx = CENTER_X - svgX;
            const dy = CENTER_Y - svgY;
            const nextAngle = (Math.atan2(Math.max(0, dx), Math.max(1, dy)) * 180) / Math.PI;
            options.onAdjustIncidentAngle(nextAngle);
          }}
          onPointerMove={(event) => {
            if (options.activePointerId !== event.pointerId || !options.onAdjustIncidentAngle) {
              return;
            }

            const svg = event.currentTarget.ownerSVGElement;
            if (!svg) {
              return;
            }

            const bounds = svg.getBoundingClientRect();
            const svgX = ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * WIDTH;
            const svgY = ((event.clientY - bounds.top) / Math.max(bounds.height, 1)) * HEIGHT;
            const dx = CENTER_X - svgX;
            const dy = CENTER_Y - svgY;
            const nextAngle = (Math.atan2(Math.max(0, dx), Math.max(1, dy)) * 180) / Math.PI;
            options.onAdjustIncidentAngle(nextAngle);
          }}
          onPointerUp={(event) => {
            if (options.activePointerId === event.pointerId) {
              event.currentTarget.releasePointerCapture(event.pointerId);
              options.setActivePointerId(null);
            }
          }}
          onPointerCancel={(event) => {
            if (options.activePointerId === event.pointerId) {
              event.currentTarget.releasePointerCapture(event.pointerId);
              options.setActivePointerId(null);
            }
          }}
          onLostPointerCapture={() => options.setActivePointerId(null)}
          onKeyDown={(event) => {
            if (!options.onAdjustIncidentAngle) {
              return;
            }

            if (event.key === "ArrowLeft") {
              event.preventDefault();
              options.onAdjustIncidentAngle(frame.snapshot.incidentAngle + 1);
            } else if (event.key === "ArrowRight") {
              event.preventDefault();
              options.onAdjustIncidentAngle(frame.snapshot.incidentAngle - 1);
            } else if (event.key === "Home") {
              event.preventDefault();
              options.onAdjustIncidentAngle(REFRACTION_MIN_INCIDENT_ANGLE);
            } else if (event.key === "End") {
              event.preventDefault();
              options.onAdjustIncidentAngle(REFRACTION_MAX_INCIDENT_ANGLE);
            }
          }}
        >
          <circle cx={incoming.x} cy={incoming.y} r="20" fill="transparent" />
        </g>
      ) : null}
    </g>
  );
}

export function RefractionSnellsLawSimulation({
  concept,
  params,
  setParam,
  overlayValues,
  focusedOverlayId,
  compare,
  graphPreview,
}: RefractionSnellsLawSimulationProps) {
  const locale = useLocale() as AppLocale;
  const [activePointerId, setActivePointerId] = useState<number | null>(null);
  const previewIncidentAngle =
    graphPreview?.kind === "response"
      ? clamp(
          graphPreview.point.x,
          REFRACTION_MIN_INCIDENT_ANGLE,
          REFRACTION_MAX_INCIDENT_ANGLE,
        )
      : undefined;
  const compareEnabled = Boolean(compare);
  const previewedSetup = compare ? graphPreview?.setup ?? compare.activeTarget : null;
  const activeFrame = buildFrame(params, previewIncidentAngle);
  const frameA = compare
    ? buildFrame(compare.setupA, previewedSetup === "a" ? previewIncidentAngle : undefined)
    : null;
  const frameB = compare
    ? buildFrame(compare.setupB, previewedSetup === "b" ? previewIncidentAngle : undefined)
    : null;
  const primaryFrame = compare
    ? previewedSetup === "a"
      ? frameA!
      : frameB!
    : activeFrame;
  const secondaryFrame = compare
    ? previewedSetup === "a"
      ? frameB!
      : frameA!
    : null;
  const primaryLabel = compare
    ? previewedSetup === "a"
      ? compare?.labelA ?? getCompareSetupLabel(locale, "a")
      : compare?.labelB ?? getCompareSetupLabel(locale, "b")
    : copyText(locale, "incoming ray", "入射光線");
  const secondaryLabel = compare
    ? previewedSetup === "a"
      ? compare?.labelB ?? getCompareSetupLabel(locale, "b")
      : compare?.labelA ?? getCompareSetupLabel(locale, "a")
    : null;
  const canEditPrimary = !compare || !graphPreview || previewedSetup === compare.activeTarget;

  function handleAdjustIncidentAngle(nextAngle: number) {
    setParam(
      "incidentAngle",
      Math.round(
        clamp(nextAngle, REFRACTION_MIN_INCIDENT_ANGLE, REFRACTION_MAX_INCIDENT_ANGLE),
      ),
    );
  }

  const previewBadge = graphPreview?.kind === "response" ? (
    <span className="rounded-full border border-coral-500/30 bg-coral-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-coral-700">
      {copyText(locale, "preview theta_1 =", "預覽 θ₁ =")} {formatMeasurement(previewIncidentAngle ?? 0, "deg")}
    </span>
  ) : null;
  const compareLegend = compareEnabled ? (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-700">
      <span className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-ink-600">
        <span className="h-0 w-5 border-t-2 border-solid border-ink-900" />
        {primaryLabel}
      </span>
      <span className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-ink-600">
        <span className="h-0 w-5 border-t-2 border-dashed border-ink-900/70" />
        {secondaryLabel}
      </span>
    </div>
  ) : null;
  const compareBadges = compareEnabled ? (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-700">
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelA ?? getCompareSetupLabel(locale, "a"))}: {formatIndexPair(frameA!, locale)}
      </span>
      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700">
        {(compare?.labelB ?? getCompareSetupLabel(locale, "b"))}: {formatIndexPair(frameB!, locale)}
      </span>
    </div>
  ) : null;

  const metricRows = [
    { label: "n1", value: formatNumber(primaryFrame.snapshot.n1) },
    { label: "n2", value: formatNumber(primaryFrame.snapshot.n2) },
    { label: "theta_1", value: formatMeasurement(primaryFrame.snapshot.incidentAngle, "deg") },
    { label: "theta_2", value: formatAngle(primaryFrame.snapshot.refractedAngle, locale) },
    {
      label: "theta_c",
      value: formatAngle(primaryFrame.snapshot.criticalAngle, locale),
    },
    {
      label: "theta_1 - theta_c",
      value: formatSignedAngle(primaryFrame.snapshot.criticalOffset, locale),
      valueClassName:
        primaryFrame.snapshot.criticalOffset === null
          ? "fill-ink-500 text-[11px] font-semibold"
          : primaryFrame.snapshot.criticalOffset > 0
            ? "fill-coral-700 text-[12px] font-semibold"
            : "fill-teal-700 text-[12px] font-semibold",
    },
    { label: "v2/v1", value: formatNumber(primaryFrame.snapshot.speedRatio) },
    {
      label: "state",
      value: primaryFrame.snapshot.totalInternalReflection
        ? copyText(locale, "total internal reflection", "全內反射")
        : describeBend(primaryFrame, locale),
      valueClassName: primaryFrame.snapshot.totalInternalReflection
        ? "fill-coral-700 text-[12px] font-semibold"
        : undefined,
    },
  ];
  const noteLines = [
    primaryFrame.snapshot.totalInternalReflection
      ? copyText(locale, "theta_1 has crossed above theta_c, so the ray stays in medium 1 and reflects at the same angle.", "θ₁ 已超過 θc，所以光線留在介質 1 中並以相同角度反射。")
      : primaryFrame.snapshot.criticalOffset !== null && primaryFrame.snapshot.criticalOffset > -2
        ? copyText(locale, "The setup is just below theta_c, so the transmitted ray is flattening along the boundary.", "這個設定已非常接近 θc，所以透射光線正沿著介面變得更平。")
        : primaryFrame.snapshot.bendDirection === "toward-normal"
          ? copyText(locale, "Medium 2 is slower, so the ray bends toward the normal.", "介質 2 較慢，所以光線向法線偏折。")
          : primaryFrame.snapshot.bendDirection === "away-from-normal"
            ? copyText(locale, "Medium 2 is faster, so the ray bends away from the normal.", "介質 2 較快，所以光線遠離法線偏折。")
            : copyText(locale, "The ray keeps its direction while the speed can still change.", "光線方向維持不變，但速度仍然可以改變。"),
    primaryFrame.snapshot.totalInternalReflection
      ? copyText(locale, "This is the same local event used to guide light inside a higher-index core.", "這正是較高折射率纖芯內部導引光線的局部機制。")
      : "",
    primaryFrame.snapshot.criticalAngle !== null
      ? locale === "zh-HK"
        ? `臨界角 ${formatMeasurement(primaryFrame.snapshot.criticalAngle, "deg")}`
        : `critical angle ${formatMeasurement(primaryFrame.snapshot.criticalAngle, "deg")}`
      : "",
  ].filter(Boolean);

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className="border-b border-line bg-[linear-gradient(135deg,rgba(78,166,223,0.1),rgba(30,166,162,0.08))] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{concept.title}</p>
            <p className="mt-1 text-xs text-ink-700">
              {copyText(
                locale,
                "Drag the incoming ray or use the sliders. The boundary diagram, critical-angle readouts, and response graphs stay on the same Snell-law model.",
                "拖動入射光線或使用滑桿。介面圖、臨界角讀數和響應圖都保持在同一個斯涅耳定律模型上。",
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {compareLegend}
            {compareBadges}
            {previewBadge}
          </div>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={concept.accessibility?.simulationDescription ?? concept.summary}
      >
        <rect width={WIDTH} height={HEIGHT} fill="rgba(255,255,255,0.5)" />
        <rect x="28" y="22" width={WIDTH - 56} height="140" rx="24" fill="rgba(240,171,60,0.12)" />
        <rect x="28" y="164" width={WIDTH - 56} height="146" rx="24" fill="rgba(30,166,162,0.12)" />
        <line x1="38" x2={WIDTH - 38} y1={CENTER_Y} y2={CENTER_Y} stroke="rgba(15,28,36,0.18)" strokeWidth="3" />
        {renderMediumLabel({
          title: copyText(locale, "Medium 1", "介質 1"),
          x: 42,
          y: 34,
          fill: "rgba(255,253,247,0.84)",
          frame: primaryFrame,
          showSpeed: overlayValues?.speedGuide ?? true,
          speedValue: formatSpeed(primaryFrame.snapshot.speedInMedium1),
          medium: "n1",
        })}
        {renderMediumLabel({
          title: copyText(locale, "Medium 2", "介質 2"),
          x: 42,
          y: 214,
          fill: "rgba(255,253,247,0.84)",
          frame: primaryFrame,
          showSpeed: overlayValues?.speedGuide ?? true,
          speedValue: formatSpeed(primaryFrame.snapshot.speedInMedium2),
          medium: "n2",
        })}
        {secondaryFrame
          ? renderSetup(secondaryFrame, {
              label: secondaryLabel ?? getCompareSetupLabel(locale, "b"),
              overlayValues,
              focusedOverlayId,
              dashed: true,
              muted: true,
              activePointerId,
              setActivePointerId,
              locale,
            })
          : null}
        {renderSetup(primaryFrame, {
          label: primaryLabel,
          interactive: canEditPrimary,
          overlayValues,
          focusedOverlayId,
          activePointerId,
          setActivePointerId,
          onAdjustIncidentAngle: handleAdjustIncidentAngle,
          locale,
        })}
        <SimulationReadoutCard
          x={CARD_X}
          y={CARD_Y}
          width={CARD_WIDTH}
          title={compareEnabled ? `${primaryLabel} ${copyText(locale, "state", "狀態")}` : copyText(locale, "Boundary state", "介面狀態")}
          rows={metricRows}
          noteLines={noteLines}
        />
      </svg>
    </section>
  );
}
