"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

type TimeControlRailProps = {
  currentTime: number;
  maxTime: number;
  isPlaying: boolean;
  canPlay?: boolean;
  canStep?: boolean;
  canScrub?: boolean;
  onTogglePlay: () => void;
  onStepBackward: () => void;
  onStepForward: () => void;
  onScrub: (time: number) => void;
  onReset?: () => void;
  note?: ReactNode;
  className?: string;
};

function formatTime(value: number) {
  if (!Number.isFinite(value)) {
    return "0.00 s";
  }

  if (Math.abs(value) >= 10) {
    return `${value.toFixed(1)} s`;
  }

  return `${value.toFixed(2)} s`;
}

function clampTime(value: number, maxTime: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(Math.max(value, 0), Math.max(maxTime, 0));
}

export function TimeControlRail({
  currentTime,
  maxTime,
  isPlaying,
  canPlay = true,
  canStep = true,
  canScrub = true,
  onTogglePlay,
  onStepBackward,
  onStepForward,
  onScrub,
  onReset,
  note,
  className,
}: TimeControlRailProps) {
  const t = useTranslations("TimeControlRail");
  const safeMaxTime = Math.max(maxTime, 0);
  const safeCurrentTime = clampTime(currentTime, safeMaxTime);
  const scrubStep = safeMaxTime > 0 ? Math.max(safeMaxTime / 200, 0.01) : 0.01;

  return (
    <section
      className={[
        "rounded-[18px] border border-line bg-paper-strong/85 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]",
        className ?? "",
      ].join(" ")}
      aria-label={t("aria.controls")}
    >
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="lab-label">{t("labels.time")}</p>
          <span className="rounded-full border border-line bg-white/85 px-2.5 py-1 font-mono text-[0.72rem] text-ink-700">
            {formatTime(safeCurrentTime)} / {formatTime(safeMaxTime)}
          </span>
          <span className="rounded-full border border-line bg-paper px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600">
            {isPlaying ? t("labels.live") : t("labels.paused")}
          </span>
          {note ? <span className="max-w-[15rem] text-xs leading-5 text-ink-700">{note}</span> : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            className="rounded-full border border-line bg-paper-strong px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-700 transition hover:border-teal-500 hover:text-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-strong disabled:cursor-not-allowed disabled:opacity-45"
            aria-label={isPlaying ? t("aria.pauseSimulation") : t("aria.playSimulation")}
            disabled={!canPlay}
            onClick={onTogglePlay}
          >
            {isPlaying ? t("actions.pause") : t("actions.play")}
          </button>
          <button
            type="button"
            className="rounded-full border border-line bg-paper-strong px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-700 transition hover:border-amber-500 hover:text-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-strong disabled:cursor-not-allowed disabled:opacity-45"
            aria-label={t("aria.stepBackward")}
            disabled={!canStep}
            onClick={onStepBackward}
          >
            {t("actions.back")}
          </button>
          <button
            type="button"
            className="rounded-full border border-line bg-paper-strong px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-700 transition hover:border-coral-500 hover:text-coral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-strong disabled:cursor-not-allowed disabled:opacity-45"
            aria-label={t("aria.stepForward")}
            disabled={!canStep}
            onClick={onStepForward}
          >
            {t("actions.step")}
          </button>
          {onReset ? (
            <button
              type="button"
              className="rounded-full border border-line bg-paper-strong px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-700 transition hover:border-ink-950/25 hover:text-ink-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-strong"
              aria-label={t("aria.resetTime")}
              onClick={onReset}
            >
              {t("actions.reset")}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-1.5">
        <label htmlFor="time-scrubber" className="sr-only">
          {t("aria.timeScrubber")}
        </label>
        <input
          id="time-scrubber"
          type="range"
          min={0}
          max={safeMaxTime}
          step={scrubStep}
          value={safeCurrentTime}
          disabled={!canScrub}
          aria-label={t("aria.scrubThroughTime")}
          aria-valuetext={t("aria.scrubValue", {
            current: formatTime(safeCurrentTime),
            max: formatTime(safeMaxTime),
          })}
          className="control-accent w-full disabled:cursor-not-allowed disabled:opacity-50"
          onChange={(event) => onScrub(Number(event.target.value))}
        />
        <div className="mt-1 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-ink-500">
          <span>0.00 s</span>
          <span>{formatTime(safeMaxTime)}</span>
        </div>
      </div>
    </section>
  );
}
