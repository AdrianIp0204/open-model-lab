"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { ControlValue, SimulationControlSpec, SimulationPreset } from "@/lib/physics";
import {
  formatDisplayUnit,
  formatMeasurement,
  type SimulationVariableLink,
} from "@/lib/physics";
import { InlineFormula } from "@/components/concepts/MathFormula";
import { getVariableTone } from "@/components/concepts/variable-tones";

type ControlPanelProps = {
  title?: string;
  description?: string;
  contextBadge?: string;
  resetLabel?: string;
  controls: SimulationControlSpec[];
  presets: SimulationPreset[];
  defaultValues?: Record<string, ControlValue>;
  primaryControlIds?: string[];
  primaryPresetIds?: string[];
  variableLinks?: SimulationVariableLink[];
  values: Record<string, ControlValue>;
  activePresetId?: string | null;
  activeVariableId?: string | null;
  highlightedControlIds?: string[];
  autoRevealControlIds?: string[];
  highlightedPresetIds?: string[];
  supplementaryTools?: ReactNode;
  forceMoreToolsOpen?: boolean;
  onChange: (param: string, value: ControlValue) => void;
  onPreset?: (presetId: string) => void;
  onReset?: () => void;
  onVariableFocus?: (variableId: string) => void;
};

function resolveDisplayValueLabel(
  value: ControlValue,
  labels?: SimulationControlSpec["displayValueLabels"],
) {
  if (!labels?.length) {
    return null;
  }

  return labels.find((entry) => entry.value === value)?.label ?? null;
}

function valueLabel(
  value: ControlValue,
  unit?: string,
  labels?: SimulationControlSpec["displayValueLabels"],
  booleanLabels?: {
    on: string;
    off: string;
  },
) {
  const displayLabel = resolveDisplayValueLabel(value, labels);

  if (displayLabel) {
    return displayLabel;
  }

  if (typeof value === "number") {
    return formatMeasurement(value, unit, value >= 10 || Number.isInteger(value) ? 1 : 2);
  }
  if (typeof value === "boolean") {
    return value ? booleanLabels?.on ?? "On" : booleanLabels?.off ?? "Off";
  }
  const displayUnit = formatDisplayUnit(unit);
  return displayUnit ? `${value} ${displayUnit}` : `${value}`;
}

function splitVisibleItems<T extends { id: string }>(
  items: T[],
  visibleCount: number,
  pinnedId?: string | null,
  preferredIds?: string[],
) {
  const primary =
    preferredIds !== undefined
      ? preferredIds
          .map((id) => items.find((item) => item.id === id))
          .filter((item): item is T => Boolean(item))
      : items.slice(0, visibleCount);

  if (pinnedId && !primary.some((item) => item.id === pinnedId)) {
    const pinnedItem = items.find((item) => item.id === pinnedId);
    if (pinnedItem) {
      primary.push(pinnedItem);
    }
  }

  const primaryIds = new Set(primary.map((item) => item.id));

  return {
    primary,
    secondary: items.filter((item) => !primaryIds.has(item.id)),
  };
}

export function ControlPanel({
  title,
  description,
  contextBadge,
  resetLabel,
  controls,
  presets,
  defaultValues,
  primaryControlIds,
  primaryPresetIds,
  variableLinks,
  values,
  activePresetId,
  activeVariableId,
  highlightedControlIds,
  autoRevealControlIds,
  highlightedPresetIds,
  supplementaryTools,
  forceMoreToolsOpen: forceMoreToolsOpenProp = false,
  onChange,
  onPreset,
  onReset,
  onVariableFocus,
}: ControlPanelProps) {
  const t = useTranslations("ControlPanel");
  const resolvedTitle = title ?? t("title");
  const resolvedDescription = description ?? t("description");
  const resolvedResetLabel = resetLabel ?? t("reset");
  const [moreToolsExpanded, setMoreToolsExpanded] = useState(false);
  const variableMap = useMemo(
    () => new Map((variableLinks ?? []).map((variableLink) => [variableLink.param, variableLink])),
    [variableLinks],
  );
  const highlightedControlSet = useMemo(
    () => new Set(highlightedControlIds ?? []),
    [highlightedControlIds],
  );
  const autoRevealControlSet = useMemo(
    () => new Set(autoRevealControlIds ?? []),
    [autoRevealControlIds],
  );
  const highlightedPresetSet = useMemo(
    () => new Set(highlightedPresetIds ?? []),
    [highlightedPresetIds],
  );
  const { primary: primaryControls, secondary: secondaryControls } = useMemo(
    () => splitVisibleItems(controls, 4, undefined, primaryControlIds),
    [controls, primaryControlIds],
  );
  const { primary: primaryPresets, secondary: secondaryPresets } = useMemo(
    () => splitVisibleItems(presets, 3, activePresetId ?? undefined, primaryPresetIds),
    [activePresetId, presets, primaryPresetIds],
  );
  const hasSecondaryControls = secondaryControls.length > 0;
  const hasSecondaryPresets = secondaryPresets.length > 0;
  const hasSupplementaryTools = Boolean(supplementaryTools);
  const shouldAutoOpenMoreTools = secondaryControls.some(
    (control) =>
      autoRevealControlSet.has(control.id) || autoRevealControlSet.has(control.param),
  ) || secondaryControls.some(
    (control) =>
      defaultValues !== undefined &&
      values[control.param] !== defaultValues[control.param],
  ) || secondaryPresets.some((preset) => highlightedPresetSet.has(preset.id) || preset.id === activePresetId);
  const moreToolsOpen =
    moreToolsExpanded || shouldAutoOpenMoreTools || forceMoreToolsOpenProp;

  function renderControl(control: SimulationControlSpec) {
    const currentValue = values[control.param];
    const inputId = `control-${control.param}`;
    const descriptionId = `${inputId}-description`;
    const variableLink = variableMap.get(control.param);
    const selected = variableLink?.id === activeVariableId;
    const highlighted = highlightedControlSet.has(control.id) || highlightedControlSet.has(control.param);
    const tone = variableLink ? getVariableTone(variableLink.tone) : null;

    if (control.kind === "toggle") {
      return (
        <label
          key={control.id}
          htmlFor={inputId}
          onMouseEnter={() => variableLink ? onVariableFocus?.(variableLink.id) : undefined}
          className={[
            "flex items-start justify-between gap-3 rounded-[20px] border bg-paper-strong px-3 py-2 transition sm:px-4 sm:py-3",
            selected && tone ? `${tone.border} ${tone.panel}` : "border-line hover:border-teal-500/40",
            highlighted ? "ring-1 ring-inset ring-coral-500/35" : "",
          ].join(" ")}
        >
          <span className="space-y-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="block text-sm font-semibold text-ink-800">{control.label}</span>
              {variableLink && tone ? (
                <span
                  className={[
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
                    tone.badge,
                    tone.softText,
                  ].join(" ")}
                >
                  <InlineFormula expression={variableLink.symbol} />
                </span>
              ) : null}
            </span>
            {control.description ? (
              <span
                id={descriptionId}
                className="hidden line-clamp-2 text-sm leading-6 text-ink-500 xl:block"
              >
                {control.description}
              </span>
            ) : null}
          </span>
          <input
            id={inputId}
            type="checkbox"
            className="mt-0.5 h-5 w-5 rounded border-line accent-teal-500"
            aria-label={control.ariaLabel ?? control.label}
            aria-describedby={control.description ? descriptionId : undefined}
            checked={Boolean(currentValue)}
            onFocus={() => variableLink ? onVariableFocus?.(variableLink.id) : undefined}
            onChange={(event) => onChange(control.param, event.target.checked)}
          />
        </label>
      );
    }

    const numericValue = typeof currentValue === "number" ? currentValue : Number(currentValue ?? control.min ?? 0);

    return (
      <div
        key={control.id}
        onMouseEnter={() => variableLink ? onVariableFocus?.(variableLink.id) : undefined}
        className={[
          "rounded-[20px] border bg-paper-strong px-3 py-2 transition sm:px-4 sm:py-3",
          selected && tone ? `${tone.border} ${tone.panel}` : "border-line",
          highlighted ? "ring-1 ring-inset ring-coral-500/35" : "",
        ].join(" ")}
      >
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor={inputId} className="text-sm font-semibold text-ink-800">
              {control.label}
            </label>
            {variableLink && tone ? (
              <span
                className={[
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
                  tone.badge,
                  tone.softText,
                ].join(" ")}
              >
                <InlineFormula expression={variableLink.symbol} />
              </span>
            ) : null}
          </div>
          <output className="font-mono text-sm text-ink-700">
            {valueLabel(numericValue, control.unit, control.displayValueLabels, {
              on: t("values.on"),
              off: t("values.off"),
            })}
          </output>
        </div>
        {control.description ? (
          <p
            id={descriptionId}
            className="hidden line-clamp-2 text-sm leading-6 text-ink-500 xl:mt-1.5 xl:block"
          >
            {control.description}
          </p>
        ) : null}
        <input
          id={inputId}
          type="range"
          min={control.min}
          max={control.max}
          step={control.step ?? 0.1}
          value={numericValue}
          aria-label={control.ariaLabel ?? control.label}
          aria-describedby={control.description ? descriptionId : undefined}
          aria-valuetext={valueLabel(
            numericValue,
            control.unit,
            control.displayValueLabels,
            {
              on: t("values.on"),
              off: t("values.off"),
            },
          )}
          className="control-accent mt-1.5 w-full"
          onFocus={() => variableLink ? onVariableFocus?.(variableLink.id) : undefined}
          onChange={(event) => onChange(control.param, Number(event.target.value))}
        />
      </div>
    );
  }

  function renderPreset(preset: SimulationPreset) {
    const selected = preset.id === activePresetId;
    const highlighted = highlightedPresetSet.has(preset.id);
    return (
      <button
        key={preset.id}
        type="button"
        aria-label={preset.description ? `${preset.label} ${preset.description}` : preset.label}
        onClick={() => onPreset?.(preset.id)}
        style={selected ? { color: "var(--paper-strong)" } : undefined}
        className={[
          "rounded-[20px] border px-4 py-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-strong",
          selected
            ? "border-coral-500 bg-coral-500 shadow-[0_10px_24px_rgba(241,102,89,0.16)]"
            : highlighted
              ? "border-coral-500/45 bg-coral-500/10 text-ink-700 hover:bg-coral-500/15"
              : "border-line bg-paper-strong text-ink-700 hover:border-coral-500/60 hover:bg-white",
        ].join(" ")}
      >
        <span className="block font-semibold">{preset.label}</span>
        {preset.description ? <span className="mt-1 block text-sm leading-6 opacity-80">{preset.description}</span> : null}
      </button>
    );
  }

  return (
    <section className="lab-panel h-full min-h-0 overflow-hidden p-1.5 sm:p-2.5">
      <div className="flex items-start justify-between gap-3 border-b border-line pb-1.5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="lab-label">{resolvedTitle}</p>
            {contextBadge ? (
              <span className="rounded-full border border-teal-500/25 bg-teal-500/10 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-teal-700">
                {contextBadge}
              </span>
            ) : null}
          </div>
          <p className="mt-1 hidden line-clamp-2 text-sm leading-6 text-ink-700 xl:block">
            {resolvedDescription}
          </p>
        </div>
        {onReset ? (
          <button
            type="button"
            onClick={() => {
              setMoreToolsExpanded(false);
              onReset();
            }}
            className="rounded-full border border-line bg-paper-strong px-3 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-ink-700 transition hover:border-coral-500 hover:text-coral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-strong"
          >
            {resolvedResetLabel}
          </button>
        ) : null}
      </div>

      <div className="mt-2 max-h-[min(38svh,20rem)] overflow-y-auto overscroll-contain pr-1 sm:max-h-[min(42svh,24rem)] lg:max-h-[min(68svh,38rem)] xl:max-h-none">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
          {primaryControls.map(renderControl)}
        </div>

        {primaryPresets.length > 0 ? (
          <div className="mt-3 border-t border-line pt-3">
            <p className="lab-label">{t("presets")}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {primaryPresets.map(renderPreset)}
            </div>
          </div>
        ) : null}

        {hasSecondaryControls || hasSecondaryPresets || hasSupplementaryTools ? (
          <div
            className="mt-3 rounded-[20px] border border-line bg-white/45 px-4 py-3"
            data-testid="control-panel-more-tools"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="lab-label">{t("moreTools.title")}</p>
                <p className="mt-1 text-sm leading-6 text-ink-600">
                  {t("moreTools.description")}
                </p>
              </div>
              <button
                type="button"
                aria-label={t("moreTools.title")}
                aria-expanded={moreToolsOpen}
                aria-controls="control-panel-advanced-tools"
                onClick={() => setMoreToolsExpanded((current) => !current)}
                className="rounded-full border border-line bg-paper-strong px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600 transition hover:border-coral-500/35 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-strong"
              >
                {moreToolsOpen ? t("moreTools.hide") : t("moreTools.show")}
              </button>
            </div>
            {moreToolsOpen ? (
              <div id="control-panel-advanced-tools">
            {hasSupplementaryTools ? (
              <div data-testid="control-panel-supplementary-tools" className="mt-3">
                {supplementaryTools}
              </div>
            ) : null}
            {hasSecondaryControls ? (
              <div
                className={[
                  "mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1",
                  hasSupplementaryTools ? "border-t border-line pt-3" : "",
                ].join(" ")}
              >
                {secondaryControls.map(renderControl)}
              </div>
            ) : null}
            {hasSecondaryPresets ? (
              <div className="mt-3 border-t border-line pt-3">
                <p className="lab-label">{t("morePresets")}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {secondaryPresets.map(renderPreset)}
                </div>
              </div>
            ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
