"use client";

type CircuitEnvironmentControlProps = {
  temperatureC: number;
  lightLevelPercent: number;
  onTemperatureChange: (value: number) => void;
  onLightChange: (value: number) => void;
  onTemperatureBegin: () => void;
  onLightBegin: () => void;
  onCommit: () => void;
  mode: "desktop" | "mobile";
};

function ThermometerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M10 4a2 2 0 1 1 4 0v8.1a4.5 4.5 0 1 1-4 0Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 8v7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M9 18h6M10 21h4M8.6 14.4a6 6 0 1 1 6.8 0c-.8.5-1.4 1.6-1.4 2.6H10c0-1-.6-2.1-1.4-2.6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const sliderKeyCommitKeys = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown",
]);

export function CircuitEnvironmentControl({
  temperatureC,
  lightLevelPercent,
  onTemperatureChange,
  onLightChange,
  onTemperatureBegin,
  onLightBegin,
  onCommit,
  mode,
}: CircuitEnvironmentControlProps) {
  const isDesktop = mode === "desktop";

  return (
    <details
      data-circuit-environment-control={mode}
      className={[
        "group rounded-[20px] border border-line bg-paper/95 shadow-surface",
        isDesktop
          ? "w-[18rem] backdrop-blur-sm"
          : "w-full bg-paper",
      ].join(" ")}
    >
      <summary
        className={[
          "flex cursor-pointer list-none items-center justify-between gap-3 p-3 [&::-webkit-details-marker]:hidden",
          isDesktop ? "rounded-[20px]" : "",
        ].join(" ")}
      >
        <div className="min-w-0 space-y-1">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
            Environment
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-700">
            <span className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-2 py-1">
              <ThermometerIcon />
              {Math.round(temperatureC)} C
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-2 py-1">
              <LightIcon />
              {Math.round(lightLevelPercent)}%
            </span>
          </div>
        </div>
        <span
          aria-hidden="true"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-paper text-sm font-semibold text-ink-500 transition-transform group-open:rotate-90"
        >
          &gt;
        </span>
      </summary>

      <div className="space-y-3 border-t border-line px-3 pb-3 pt-3">
        <p className="text-xs leading-5 text-ink-600">
          Ambient-linked thermistors follow temperature and ambient-linked LDRs follow light intensity. Manual mode ignores these sliders.
        </p>

        <label className="block rounded-[16px] border border-line bg-paper px-3 py-2 text-sm text-ink-800">
          <span className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 font-semibold text-ink-950">
              <ThermometerIcon />
              Temperature
            </span>
            <span className="text-xs font-semibold text-ink-600">{Math.round(temperatureC)} C</span>
          </span>
          <input
            type="range"
            aria-label="Ambient temperature"
            min={0}
            max={100}
            step={1}
            value={temperatureC}
            onChange={(event) => onTemperatureChange(Number(event.target.value))}
            onPointerDown={onTemperatureBegin}
            onPointerUp={onCommit}
            onBlur={onCommit}
            onKeyDown={(event) => {
              if (sliderKeyCommitKeys.has(event.key)) {
                onTemperatureBegin();
              }
            }}
            onKeyUp={(event) => {
              if (sliderKeyCommitKeys.has(event.key)) {
                onCommit();
              }
            }}
            className="mt-2 w-full accent-teal-500"
          />
        </label>

        <label className="block rounded-[16px] border border-line bg-paper px-3 py-2 text-sm text-ink-800">
          <span className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 font-semibold text-ink-950">
              <LightIcon />
              Light intensity
            </span>
            <span className="text-xs font-semibold text-ink-600">{Math.round(lightLevelPercent)}%</span>
          </span>
          <input
            type="range"
            aria-label="Light intensity"
            min={0}
            max={100}
            step={1}
            value={lightLevelPercent}
            onChange={(event) => onLightChange(Number(event.target.value))}
            onPointerDown={onLightBegin}
            onPointerUp={onCommit}
            onBlur={onCommit}
            onKeyDown={(event) => {
              if (sliderKeyCommitKeys.has(event.key)) {
                onLightBegin();
              }
            }}
            onKeyUp={(event) => {
              if (sliderKeyCommitKeys.has(event.key)) {
                onCommit();
              }
            }}
            className="mt-2 w-full accent-sky-500"
          />
        </label>
      </div>
    </details>
  );
}
