"use client";

import { LineGraph } from "@/components/graphs/LineGraph";
import { formatMeasurement } from "@/lib/physics/math";
import { useEffect, useRef } from "react";
import {
  buildCircuitContextNote,
  buildCircuitInspectorGraph,
  buildCircuitInspectorReadouts,
  circuitBuilderCopyEn,
  componentSupportsReset,
  formatCircuitComponentDisplayLabel,
  formatCircuitIssue,
  formatCircuitWireDisplayLabel,
  getCircuitComponentById,
  getLocalizedCircuitInspectorFields,
  getCircuitWireById,
  type CircuitBuilderCopy,
  type CircuitDocument,
  type CircuitScalar,
  type CircuitSolveResult,
} from "@/lib/circuit-builder";

type CircuitInspectorProps = {
  document: CircuitDocument;
  solveResult: CircuitSolveResult;
  selection: { kind: "component" | "wire"; id: string } | null;
  activeTool: "select" | "wire";
  pendingWireStart: { componentId: string; terminal: "a" | "b" } | null;
  onUpdateProperty: (componentId: string, key: string, value: CircuitScalar) => void;
  onRotateComponent: (componentId: string) => void;
  onDeleteComponent: (componentId: string) => void;
  onDeleteWire: (wireId: string) => void;
  onResetFuse: (componentId: string) => void;
  onCancelWire: () => void;
  onMoveComponent: (componentId: string, x: number, y: number) => void;
  copy?: CircuitBuilderCopy;
  className?: string;
};

function parseFiniteNumberInput(value: string) {
  if (value.trim().length === 0) {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export function CircuitInspector({
  document,
  solveResult,
  selection,
  activeTool,
  pendingWireStart,
  onUpdateProperty,
  onRotateComponent,
  onDeleteComponent,
  onDeleteWire,
  onResetFuse,
  onCancelWire,
  onMoveComponent,
  copy = circuitBuilderCopyEn,
  className = "",
}: CircuitInspectorProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const selectionKey = selection ? `${selection.kind}:${selection.id}` : "empty";
  const panelClassName = [
    "lab-panel h-full min-h-0 overflow-y-auto p-2.5 sm:p-3",
    className,
  ]
    .join(" ")
    .trim();
  const selectionActionsLocked = activeTool === "wire" || Boolean(pendingWireStart);
  const inspectorActionClassName =
    "rounded-full border border-line bg-paper px-2.5 py-1.5 text-xs font-semibold text-ink-950 disabled:cursor-not-allowed disabled:opacity-50";
  const inspectorDangerActionClassName =
    "rounded-full border border-coral-500/30 bg-coral-500/10 px-2.5 py-1.5 text-xs font-semibold text-coral-700 disabled:cursor-not-allowed disabled:border-line disabled:bg-paper disabled:text-ink-500";
  const compactInputClassName =
    "min-w-0 w-full rounded-xl border border-line bg-paper-strong px-2.5 py-1.5 text-sm text-ink-950 disabled:cursor-not-allowed disabled:opacity-60";
  const compactRowClassName =
    "rounded-[16px] border border-line bg-paper px-3 py-2 text-sm text-ink-800";
  const readoutPillClassName =
    "rounded-xl border border-line bg-paper px-2.5 py-1.5";
  const detailsClassName =
    "rounded-xl border border-line bg-paper px-2.5 py-2 text-sm leading-5 text-ink-700";

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    if (typeof panel.scrollTo === "function") {
      panel.scrollTo({ top: 0 });
      return;
    }

    panel.scrollTop = 0;
  }, [selectionKey]);

  if (selection?.kind === "wire") {
    const wire = getCircuitWireById(document, selection.id);
    const fromComponent = wire
      ? getCircuitComponentById(document, wire.from.componentId)
      : null;
    const fromResult = fromComponent
      ? solveResult.componentResults[fromComponent.id]
      : null;
    const sharedNodeId =
      wire && fromResult ? fromResult.nodeIds[wire.from.terminal] : null;
    const sharedNode = sharedNodeId ? solveResult.nodeResults[sharedNodeId] : null;
    return (
      <div
        ref={panelRef}
        className={panelClassName}
        aria-label={copy.inspector.ariaLabel}
        data-circuit-inspector-panel=""
        data-onboarding-target="circuit-inspector"
      >
        <p className="lab-label">{copy.inspector.wireEyebrow}</p>
        <h2 className="mt-1 text-lg font-semibold text-ink-950">{copy.inspector.selectedConnection}</h2>
        <p className="mt-1 text-sm leading-5 text-ink-700">
          {wire
            ? `${formatCircuitWireDisplayLabel(document, wire, copy)}.`
            : copy.inspector.missingWire}
        </p>
        {wire ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className={readoutPillClassName}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
                {copy.inspector.sharedNodeVoltage}
              </p>
              <p className="mt-1 text-base font-semibold text-ink-950">
                {sharedNode?.voltage !== null && sharedNode?.voltage !== undefined
                  ? formatMeasurement(sharedNode.voltage, "V")
                  : copy.inspector.floating}
              </p>
            </div>
            <div className={readoutPillClassName}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
                {copy.inspector.model}
              </p>
              <p className="mt-1 text-sm font-semibold text-ink-950">
                {copy.inspector.idealConnection}
              </p>
              <p className="mt-0.5 text-xs text-ink-700">
                {copy.inspector.wireModelDescription}
              </p>
            </div>
          </div>
        ) : null}
        {wire ? (
          <details className={["mt-3", detailsClassName].join(" ")}>
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em] text-ink-600">
              {copy.inspector.wireDetails}
            </summary>
            <div className="mt-2 space-y-2">
              <p className="lab-label">{copy.inspector.whatWireDoes}</p>
              <p className="mt-1">
                {copy.inspector.wireDoesDescription}
              </p>
              <p className="lab-label">{copy.inspector.whatToNotice}</p>
              <p className="mt-1">
                {copy.inspector.wireNotice}
              </p>
              {sharedNode ? (
                <div>
                  <p className="lab-label">{copy.inspector.currentCircuitContext}</p>
                  <p className="mt-1">
                    {copy.locale === "zh-HK" ? "此導線所屬節點有 " : "This wire belongs to a node with "}
                    {sharedNode.terminalRefs.length}{" "}
                    {sharedNode.terminalRefs.length === 1
                      ? copy.inspector.nodeAttachedTerminalSingular
                      : copy.inspector.nodeAttachedTerminalPlural}{" "}
                    {copy.locale === "zh-HK" ? "，並且" : "and "}
                    {sharedNode.sourceConnected
                      ? copy.inspector.nodeSourceConnected
                      : copy.inspector.nodeSourceDisconnected}
                  </p>
                </div>
              ) : null}
            </div>
          </details>
        ) : null}
        {wire && selectionActionsLocked ? (
          <div className="mt-3 rounded-[16px] border border-teal-500/25 bg-teal-500/8 px-3 py-2 text-sm leading-5 text-ink-700">
            <p className="font-semibold text-ink-950">{copy.inspector.connectionLockedTitle}</p>
            <p className="mt-1">
              {pendingWireStart
                ? copy.inspector.connectionLockedPending
                : copy.inspector.connectionLockedTool}
            </p>
            {pendingWireStart ? (
              <button
                type="button"
                className="mt-2 rounded-full border border-line bg-paper px-2.5 py-1.5 text-xs font-semibold text-ink-950"
                onClick={onCancelWire}
              >
                {copy.inspector.cancelWire}
              </button>
            ) : null}
          </div>
        ) : null}
        {wire ? (
          <button
            type="button"
            aria-label={copy.inspector.deleteSelectedWireAria}
            disabled={selectionActionsLocked}
            className="mt-3 rounded-full border border-coral-500/30 bg-coral-500/10 px-3 py-1.5 text-xs font-semibold text-coral-700 disabled:cursor-not-allowed disabled:border-line disabled:bg-paper disabled:text-ink-500"
            title={selectionActionsLocked ? copy.inspector.deleteWireLockedTitle : undefined}
            onClick={() => onDeleteWire(wire.id)}
          >
            {copy.inspector.deleteWire}
          </button>
        ) : null}
      </div>
    );
  }

  if (selection?.kind !== "component") {
    return (
      <div
        ref={panelRef}
        className={panelClassName}
        aria-label={copy.inspector.ariaLabel}
        data-circuit-inspector-panel=""
        data-onboarding-target="circuit-inspector"
      >
        <p className="lab-label">{copy.inspector.eyebrow}</p>
        <h2 className="mt-1 text-lg font-semibold text-ink-950">{copy.inspector.emptyTitle}</h2>
        <p className="mt-1 text-sm leading-5 text-ink-700">
          {copy.inspector.emptyDescription}
        </p>

        <div className="mt-3 grid gap-1.5 text-sm leading-5 text-ink-700">
          {copy.inspector.emptySteps.map((step) => (
            <p key={step} className={compactRowClassName}>{step}</p>
          ))}
        </div>

        {activeTool === "wire" || pendingWireStart ? (
          <div className="mt-3 rounded-[16px] border border-teal-500/30 bg-teal-500/8 p-3 text-sm leading-5 text-ink-700">
            <p className="font-semibold text-ink-950">{copy.inspector.wireToolActiveTitle}</p>
            <p className="mt-1">
              {pendingWireStart
                ? copy.inspector.wireToolPendingDescription
                : copy.inspector.wireToolDescription}
            </p>
            {pendingWireStart ? (
              <button
                type="button"
                className="mt-2 rounded-full border border-line bg-paper px-2.5 py-1.5 text-xs font-semibold text-ink-950"
                onClick={onCancelWire}
              >
                {copy.inspector.cancelWire}
              </button>
            ) : null}
          </div>
        ) : null}

        {solveResult.issues.length > 0 ? (
          <div className="mt-3 space-y-2">
            <p className="lab-label">{copy.inspector.warningsAndErrors}</p>
            {solveResult.issues.slice(0, 4).map((issue) => {
              const localizedIssue = formatCircuitIssue(issue, document, copy);
              return (
              <div
                key={issue.id}
                className="rounded-[16px] border border-line bg-paper px-3 py-2 text-sm leading-5 text-ink-700"
              >
                <p className="font-semibold text-ink-950">{localizedIssue.title}</p>
                <p className="mt-1">{localizedIssue.detail}</p>
              </div>
            );
            })}
          </div>
        ) : (
          <div className="mt-3 rounded-[16px] border border-teal-500/20 bg-teal-500/6 p-3 text-sm leading-5 text-ink-700">
            {copy.inspector.cleanCircuit}
          </div>
        )}
      </div>
    );
  }

  const component = getCircuitComponentById(document, selection.id);
  if (!component) {
    return null;
  }

  const componentCopy = copy.components[component.type];
  const componentLabel = formatCircuitComponentDisplayLabel(component, copy);
  const inspectorFields = getLocalizedCircuitInspectorFields(component, copy);
  const readouts = buildCircuitInspectorReadouts(document, solveResult, component.id, copy);
  const contextNote = buildCircuitContextNote(document, solveResult, component.id, copy);
  const graph = buildCircuitInspectorGraph({
    document,
    componentId: component.id,
    solveResult,
    copy,
  });
  const linkedMarker =
    graph?.marker
      ? (() => {
          const series = graph.series.find((entry) => entry.id === graph.marker?.seriesId);
          if (!series) {
            return null;
          }
          const pointIndex = series.points.reduce((bestIndex, point, index, points) => {
            if (bestIndex < 0) {
              return index;
            }
            return Math.abs(point.x - graph.marker!.xValue) < Math.abs(points[bestIndex]!.x - graph.marker!.xValue)
              ? index
              : bestIndex;
          }, -1);

          return {
            mode: "inspect" as const,
            label: graph.marker.label,
            xValue: graph.marker.xValue,
            activeSeriesId: series.id,
            samples: [
              {
                seriesId: series.id,
                label: series.label,
                color: series.color,
                dashed: series.dashed,
                pointIndex: Math.max(pointIndex, 0),
                pointCount: series.points.length,
                point: graph.marker.point,
              },
            ],
          };
        })()
      : null;
  const issues = solveResult.issues.filter((issue) => issue.componentId === component.id);

  return (
    <div
      ref={panelRef}
      className={panelClassName}
      aria-label={copy.inspector.ariaLabel}
      data-circuit-inspector-panel=""
      data-onboarding-target="circuit-inspector"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="lab-label">{copy.inspector.componentEyebrow}</p>
          <h2 className="mt-1 text-lg font-semibold text-ink-950">{componentLabel}</h2>
          <p className="mt-1 text-sm leading-5 text-ink-700">{componentCopy.summary}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            aria-label={`${copy.inspector.rotate} ${componentLabel}`}
            disabled={selectionActionsLocked}
            className={inspectorActionClassName}
            title={selectionActionsLocked ? copy.inspector.rotateLockedTitle : undefined}
            onClick={() => onRotateComponent(component.id)}
          >
            {copy.inspector.rotate}
          </button>
          <button
            type="button"
            aria-label={`${copy.inspector.delete} ${componentLabel}`}
            disabled={selectionActionsLocked}
            className={inspectorDangerActionClassName}
            title={selectionActionsLocked ? copy.inspector.deleteLockedTitle : undefined}
            onClick={() => onDeleteComponent(component.id)}
          >
            {copy.inspector.delete}
          </button>
        </div>
      </div>

      {selectionActionsLocked ? (
        <div className="mt-3 rounded-[16px] border border-teal-500/25 bg-teal-500/8 px-3 py-2 text-sm leading-5 text-ink-700">
          {copy.inspector.editLocked}
        </div>
      ) : null}

      {inspectorFields.length ? (
        <div className="mt-3 space-y-2">
          <p className="lab-label">{copy.inspector.editableProperties}</p>
          <div className="grid gap-2">
            {inspectorFields.map((field) => {
              const fieldValue = component.properties[field.key];
              if (field.type === "boolean") {
                return (
                  <label
                    key={field.key}
                    className="flex items-center justify-between gap-3 rounded-[16px] border border-line bg-paper px-3 py-2 text-sm text-ink-800"
                  >
                    <span className="pr-4">
                      <span className="block font-semibold text-ink-950">{field.label}</span>
                      {field.help ? <span className="mt-1 block text-xs text-ink-600">{field.help}</span> : null}
                    </span>
                    <input
                      type="checkbox"
                      aria-label={field.label}
                      className="h-5 w-5 accent-teal-500"
                      checked={Boolean(fieldValue)}
                      disabled={selectionActionsLocked}
                      onChange={(event) =>
                        onUpdateProperty(component.id, field.key, event.target.checked)
                      }
                    />
                  </label>
                );
              }

              return (
                <label
                  key={field.key}
                  className="block rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink-800"
                >
                  <span className="block min-w-0">
                    <span className="block font-semibold text-ink-950">{field.label}</span>
                    {field.help ? (
                      <span className="mt-0.5 block break-normal text-xs leading-4 text-ink-600">
                        {field.help}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-2 flex min-w-0 items-center gap-2">
                    <input
                      type="number"
                      aria-label={field.label}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      value={Number(fieldValue ?? 0)}
                      disabled={selectionActionsLocked}
                      onChange={(event) => {
                        const nextValue = parseFiniteNumberInput(event.target.value);
                        if (nextValue === null) {
                          return;
                        }

                        onUpdateProperty(component.id, field.key, nextValue);
                      }}
                      className={compactInputClassName}
                    />
                    {field.suffix ? (
                      <span className="shrink-0 rounded-full border border-line bg-paper-strong px-2 py-1 text-xs font-semibold text-ink-600">
                        {field.suffix}
                      </span>
                    ) : null}
                    </span>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-3 space-y-2">
        <p className="lab-label">{copy.inspector.placement}</p>
        <div className="grid grid-cols-2 gap-1.5">
          <label className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-xl border border-line bg-paper px-2.5 py-1.5 text-sm text-ink-800">
            <span className="font-semibold text-ink-950">X</span>
            <input
              type="number"
              aria-label={copy.inspector.positionX}
              step={32}
              value={component.x}
              disabled={selectionActionsLocked}
              onChange={(event) => {
                const nextValue = parseFiniteNumberInput(event.target.value);
                if (nextValue === null) {
                  return;
                }

                onMoveComponent(component.id, nextValue, component.y);
              }}
              className={compactInputClassName}
            />
          </label>
          <label className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-xl border border-line bg-paper px-2.5 py-1.5 text-sm text-ink-800">
            <span className="font-semibold text-ink-950">Y</span>
            <input
              type="number"
              aria-label={copy.inspector.positionY}
              step={32}
              value={component.y}
              disabled={selectionActionsLocked}
              onChange={(event) => {
                const nextValue = parseFiniteNumberInput(event.target.value);
                if (nextValue === null) {
                  return;
                }

                onMoveComponent(component.id, component.x, nextValue);
              }}
              className={compactInputClassName}
            />
          </label>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          <button
            type="button"
            disabled={selectionActionsLocked}
            className={inspectorActionClassName}
            aria-label={copy.inspector.nudgeLeft}
            onClick={() => onMoveComponent(component.id, component.x - 32, component.y)}
          >
            {copy.inspector.nudgeLeft}
          </button>
          <button
            type="button"
            disabled={selectionActionsLocked}
            className={inspectorActionClassName}
            aria-label={copy.inspector.nudgeRight}
            onClick={() => onMoveComponent(component.id, component.x + 32, component.y)}
          >
            {copy.inspector.nudgeRight}
          </button>
          <button
            type="button"
            disabled={selectionActionsLocked}
            className={inspectorActionClassName}
            aria-label={copy.inspector.nudgeUp}
            onClick={() => onMoveComponent(component.id, component.x, component.y - 32)}
          >
            {copy.inspector.nudgeUp}
          </button>
          <button
            type="button"
            disabled={selectionActionsLocked}
            className={inspectorActionClassName}
            aria-label={copy.inspector.nudgeDown}
            onClick={() => onMoveComponent(component.id, component.x, component.y + 32)}
          >
            {copy.inspector.nudgeDown}
          </button>
        </div>
      </div>

      {readouts.length > 0 ? (
        <div className="mt-3">
          <p className="lab-label">{copy.inspector.computedValues}</p>
          <dl className="mt-2 grid gap-1.5">
            {readouts.map((readout) => (
              <div
                key={readout.label}
                className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-line bg-paper px-2.5 py-1.5 text-sm"
              >
                <dt className="min-w-0 text-xs font-semibold uppercase tracking-[0.12em] text-ink-500">
                  {readout.label}
                </dt>
                <dd className="shrink-0 font-semibold text-ink-950">{readout.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {componentSupportsReset(component) && component.properties.blown ? (
        <button
          type="button"
          disabled={selectionActionsLocked}
          className="mt-3 rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink-950 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => onResetFuse(component.id)}
        >
          {copy.inspector.resetFuse}
        </button>
      ) : null}

      {issues.length > 0 ? (
        <div className="mt-3 space-y-2">
          <p className="lab-label">{copy.inspector.componentWarnings}</p>
          {issues.map((issue) => {
            const localizedIssue = formatCircuitIssue(issue, document, copy);
            return (
            <div
              key={issue.id}
              className="rounded-[16px] border border-coral-500/20 bg-coral-500/6 px-3 py-2 text-sm leading-5 text-ink-700"
            >
              <p className="font-semibold text-ink-950">{localizedIssue.title}</p>
              <p className="mt-1">{localizedIssue.detail}</p>
            </div>
          );
          })}
        </div>
      ) : null}

      <details className={["mt-3", detailsClassName].join(" ")}>
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em] text-ink-600">
          {copy.inspector.detailsSummary}
        </summary>
        <div className="mt-2 space-y-2">
          <div>
            <p className="lab-label">{copy.inspector.symbolMeaning}</p>
            <p className="mt-1">{componentCopy.symbolMeaning}</p>
          </div>
          <div>
            <p className="lab-label">{copy.inspector.modelAndBehavior}</p>
            <p className="mt-1">{componentCopy.behavior}</p>
            <p className="mt-1 text-xs text-ink-600">{componentCopy.simplification}</p>
          </div>
          <div>
            <p className="lab-label">{copy.inspector.context}</p>
            <p className="mt-1">{contextNote}</p>
          </div>
          <div>
            <p className="lab-label">{copy.inspector.notice}</p>
            <p className="mt-1">{componentCopy.notice}</p>
          </div>
        </div>
      </details>

      {graph ? (
        <div className="mt-3">
          <LineGraph
            title={graph.title}
            xLabel={graph.xLabel}
            yLabel={graph.yLabel}
            summary={graph.summary}
            description={graph.description}
            previewEnabled={false}
            series={graph.series}
            linkedMarker={linkedMarker}
          />
        </div>
      ) : null}
    </div>
  );
}
