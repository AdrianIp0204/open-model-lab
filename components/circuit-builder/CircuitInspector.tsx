"use client";

import { LineGraph } from "@/components/graphs/LineGraph";
import { formatMeasurement } from "@/lib/physics/math";
import {
  buildCircuitContextNote,
  buildCircuitInspectorGraph,
  buildCircuitInspectorReadouts,
  getCircuitInspectorFields,
  buildCircuitStaticEducation,
  componentSupportsReset,
  getCircuitComponentById,
  getCircuitWireDisplayLabel,
  getCircuitWireById,
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
  className = "",
}: CircuitInspectorProps) {
  const panelClassName = [
    "lab-panel h-full min-h-0 overflow-y-auto p-3 sm:p-3.5",
    className,
  ]
    .join(" ")
    .trim();
  const selectionActionsLocked = activeTool === "wire" || Boolean(pendingWireStart);
  const inspectorActionClassName =
    "rounded-full border border-line bg-paper px-3 py-2 text-sm font-semibold text-ink-950 disabled:cursor-not-allowed disabled:opacity-50";
  const inspectorDangerActionClassName =
    "rounded-full border border-coral-500/30 bg-coral-500/10 px-3 py-2 text-sm font-semibold text-coral-700 disabled:cursor-not-allowed disabled:border-line disabled:bg-paper disabled:text-ink-500";

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
        className={panelClassName}
        aria-label="Circuit inspector"
        data-circuit-inspector-panel=""
        data-onboarding-target="circuit-inspector"
      >
        <p className="lab-label">Wire inspector</p>
        <h2 className="mt-2 text-xl font-semibold text-ink-950">Selected connection</h2>
        <p className="mt-2 text-sm leading-6 text-ink-700">
          {wire
            ? `${getCircuitWireDisplayLabel(document, wire)}.`
            : "The selected wire no longer exists."}
        </p>
        {wire ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[20px] border border-line bg-paper px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
                Shared node voltage
              </p>
              <p className="mt-2 text-lg font-semibold text-ink-950">
                {sharedNode?.voltage !== null && sharedNode?.voltage !== undefined
                  ? formatMeasurement(sharedNode.voltage, "V")
                  : "floating"}
              </p>
            </div>
            <div className="rounded-[20px] border border-line bg-paper px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
                Model
              </p>
              <p className="mt-2 text-sm font-semibold text-ink-950">
                Ideal connection
              </p>
              <p className="mt-1 text-sm text-ink-700">
                Voltage drop is treated as negligible and current is not tracked per individual wire.
              </p>
            </div>
          </div>
        ) : null}
        {wire ? (
          <div className="mt-4 space-y-3 rounded-[24px] border border-line bg-paper p-4 text-sm leading-6 text-ink-700">
            <div>
              <p className="lab-label">What the wire does</p>
              <p className="mt-1">
                In this builder a wire is an ideal conductor that collapses both ends into the same electrical node.
              </p>
            </div>
            <div>
              <p className="lab-label">What to notice</p>
              <p className="mt-1">
                Removing this wire can split one shared node into separate nodes, which may create open circuits or change branch currents immediately.
              </p>
            </div>
            {sharedNode ? (
              <div>
                <p className="lab-label">Current circuit context</p>
                <p className="mt-1">
                  This wire belongs to a node with {sharedNode.terminalRefs.length} attached terminal{sharedNode.terminalRefs.length === 1 ? "" : "s"} and
                  {sharedNode.sourceConnected ? " is on an active source path." : " is not connected to an active source path."}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
        {wire && selectionActionsLocked ? (
          <div className="mt-4 rounded-[22px] border border-teal-500/25 bg-teal-500/8 px-4 py-3 text-sm leading-6 text-ink-700">
            <p className="font-semibold text-ink-950">Connection edits are locked while wiring</p>
            <p className="mt-1">
              {pendingWireStart
                ? "Finish this loose wire or cancel it before deleting the selected connection."
                : "Leave the wire tool before deleting the selected connection."}
            </p>
            {pendingWireStart ? (
              <button
                type="button"
                className="mt-3 rounded-full border border-line bg-paper px-3 py-2 text-sm font-semibold text-ink-950"
                onClick={onCancelWire}
              >
                Cancel wire
              </button>
            ) : null}
          </div>
        ) : null}
        {wire ? (
          <button
            type="button"
            aria-label="Delete selected wire"
            disabled={selectionActionsLocked}
            className="mt-4 rounded-full border border-coral-500/30 bg-coral-500/10 px-4 py-2 text-sm font-semibold text-coral-700 disabled:cursor-not-allowed disabled:border-line disabled:bg-paper disabled:text-ink-500"
            title={selectionActionsLocked ? "Finish or cancel wiring before deleting this wire." : undefined}
            onClick={() => onDeleteWire(wire.id)}
          >
            Delete wire
          </button>
        ) : null}
      </div>
    );
  }

  if (selection?.kind !== "component") {
    return (
      <div
        className={panelClassName}
        aria-label="Circuit inspector"
        data-circuit-inspector-panel=""
        data-onboarding-target="circuit-inspector"
      >
        <p className="lab-label">Inspector</p>
        <h2 className="mt-2 text-xl font-semibold text-ink-950">Select a part to inspect it</h2>
        <p className="mt-2 text-sm leading-6 text-ink-700">
          The inspector explains what each symbol means, which properties you can edit,
          and how the part is behaving inside the current circuit.
        </p>

        <div className="mt-4 space-y-3 rounded-[24px] border border-line bg-paper p-4 text-sm leading-6 text-ink-700">
          <p>
            1. Add a source and at least one load.
          </p>
          <p>
            2. Use the wire tool to connect two terminals at a time.
          </p>
          <p>
            3. Click any component to edit it and read the live explanation.
          </p>
        </div>

        {activeTool === "wire" || pendingWireStart ? (
          <div className="mt-4 rounded-[22px] border border-teal-500/30 bg-teal-500/8 p-4 text-sm leading-6 text-ink-700">
            <p className="font-semibold text-ink-950">Wire tool active</p>
            <p className="mt-1">
              {pendingWireStart
                ? "One terminal is already selected. Click a second terminal to finish the wire, or cancel the current wire."
                : "Click any terminal to start a wire, then click a second terminal to complete the connection."}
            </p>
            {pendingWireStart ? (
              <button
                type="button"
                className="mt-3 rounded-full border border-line bg-paper px-3 py-2 text-sm font-semibold text-ink-950"
                onClick={onCancelWire}
              >
                Cancel wire
              </button>
            ) : null}
          </div>
        ) : null}

        {solveResult.issues.length > 0 ? (
          <div className="mt-4 space-y-3">
            <p className="lab-label">Warnings and errors</p>
            {solveResult.issues.slice(0, 4).map((issue) => (
              <div
                key={issue.id}
                className="rounded-[22px] border border-line bg-paper px-4 py-3 text-sm leading-6 text-ink-700"
              >
                <p className="font-semibold text-ink-950">{issue.title}</p>
                <p className="mt-1">{issue.detail}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-[22px] border border-teal-500/20 bg-teal-500/6 p-4 text-sm leading-6 text-ink-700">
            The current circuit solves cleanly. Select a component to see its local
            explanation and computed values.
          </div>
        )}
      </div>
    );
  }

  const component = getCircuitComponentById(document, selection.id);
  if (!component) {
    return null;
  }

  const definition = buildCircuitStaticEducation(component.id, document);
  const inspectorFields = getCircuitInspectorFields(component);
  const readouts = buildCircuitInspectorReadouts(document, solveResult, component.id);
  const contextNote = buildCircuitContextNote(document, solveResult, component.id);
  const graph = buildCircuitInspectorGraph({
    document,
    componentId: component.id,
    solveResult,
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
      className={panelClassName}
      aria-label="Circuit inspector"
      data-circuit-inspector-panel=""
      data-onboarding-target="circuit-inspector"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="lab-label">Component inspector</p>
          <h2 className="mt-2 text-xl font-semibold text-ink-950">{component.label}</h2>
          <p className="mt-1 text-sm leading-6 text-ink-700">{definition?.summary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-label={`Rotate ${component.label}`}
            disabled={selectionActionsLocked}
            className={inspectorActionClassName}
            title={selectionActionsLocked ? "Finish or cancel wiring before rotating this component." : undefined}
            onClick={() => onRotateComponent(component.id)}
          >
            Rotate
          </button>
          <button
            type="button"
            aria-label={`Delete ${component.label}`}
            disabled={selectionActionsLocked}
            className={inspectorDangerActionClassName}
            title={selectionActionsLocked ? "Finish or cancel wiring before deleting this component." : undefined}
            onClick={() => onDeleteComponent(component.id)}
          >
            Delete
          </button>
        </div>
      </div>

      {selectionActionsLocked ? (
        <div className="mt-4 rounded-[22px] border border-teal-500/25 bg-teal-500/8 px-4 py-3 text-sm leading-6 text-ink-700">
          Finish or cancel wiring before editing, moving, rotating, or deleting this selected part.
        </div>
      ) : null}

      {inspectorFields.length ? (
        <div className="mt-5 space-y-3">
          <p className="lab-label">Editable properties</p>
          <div className="grid gap-3">
            {inspectorFields.map((field) => {
              const fieldValue = component.properties[field.key];
              if (field.type === "boolean") {
                return (
                  <label
                    key={field.key}
                    className="flex items-center justify-between rounded-[20px] border border-line bg-paper px-4 py-3 text-sm text-ink-800"
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
                  className="rounded-[20px] border border-line bg-paper px-4 py-3 text-sm text-ink-800"
                >
                  <span className="block font-semibold text-ink-950">{field.label}</span>
                  {field.help ? <span className="mt-1 block text-xs text-ink-600">{field.help}</span> : null}
                  <div className="mt-2 flex items-center gap-2">
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
                      className="w-full rounded-xl border border-line bg-paper-strong px-3 py-2 text-sm text-ink-950 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    {field.suffix ? (
                      <span className="rounded-full border border-line bg-paper-strong px-2 py-1 text-xs font-semibold text-ink-600">
                        {field.suffix}
                      </span>
                    ) : null}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        <p className="lab-label">Placement</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="rounded-[20px] border border-line bg-paper px-4 py-3 text-sm text-ink-800">
            <span className="block font-semibold text-ink-950">Position X</span>
            <input
              type="number"
              aria-label="Position X"
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
              className="mt-2 w-full rounded-xl border border-line bg-paper-strong px-3 py-2 text-sm text-ink-950 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
          <label className="rounded-[20px] border border-line bg-paper px-4 py-3 text-sm text-ink-800">
            <span className="block font-semibold text-ink-950">Position Y</span>
            <input
              type="number"
              aria-label="Position Y"
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
              className="mt-2 w-full rounded-xl border border-line bg-paper-strong px-3 py-2 text-sm text-ink-950 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={selectionActionsLocked}
            className={inspectorActionClassName}
            aria-label="Nudge left"
            onClick={() => onMoveComponent(component.id, component.x - 32, component.y)}
          >
            Nudge left
          </button>
          <button
            type="button"
            disabled={selectionActionsLocked}
            className={inspectorActionClassName}
            aria-label="Nudge right"
            onClick={() => onMoveComponent(component.id, component.x + 32, component.y)}
          >
            Nudge right
          </button>
          <button
            type="button"
            disabled={selectionActionsLocked}
            className={inspectorActionClassName}
            aria-label="Nudge up"
            onClick={() => onMoveComponent(component.id, component.x, component.y - 32)}
          >
            Nudge up
          </button>
          <button
            type="button"
            disabled={selectionActionsLocked}
            className={inspectorActionClassName}
            aria-label="Nudge down"
            onClick={() => onMoveComponent(component.id, component.x, component.y + 32)}
          >
            Nudge down
          </button>
        </div>
      </div>

      {readouts.length > 0 ? (
        <div className="mt-5">
          <p className="lab-label">Computed values</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {readouts.map((readout) => (
              <div
                key={readout.label}
                className="rounded-[20px] border border-line bg-paper px-4 py-3"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
                  {readout.label}
                </p>
                <p className="mt-2 text-lg font-semibold text-ink-950">{readout.value}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {componentSupportsReset(component) && component.properties.blown ? (
        <button
          type="button"
          disabled={selectionActionsLocked}
          className="mt-4 rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink-950 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => onResetFuse(component.id)}
        >
          Reset fuse
        </button>
      ) : null}

      {issues.length > 0 ? (
        <div className="mt-5 space-y-3">
          <p className="lab-label">Component warnings</p>
          {issues.map((issue) => (
            <div
              key={issue.id}
              className="rounded-[20px] border border-coral-500/20 bg-coral-500/6 px-4 py-3 text-sm leading-6 text-ink-700"
            >
              <p className="font-semibold text-ink-950">{issue.title}</p>
              <p className="mt-1">{issue.detail}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-5 space-y-3 rounded-[24px] border border-line bg-paper p-4 text-sm leading-6 text-ink-700">
        <div>
          <p className="lab-label">What the symbol means</p>
          <p className="mt-1">{definition?.symbolMeaning}</p>
        </div>
        <div>
          <p className="lab-label">Model and behavior</p>
          <p className="mt-1">{definition?.behavior}</p>
          <p className="mt-2 text-xs text-ink-600">{definition?.simplification}</p>
        </div>
        <div>
          <p className="lab-label">Current circuit context</p>
          <p className="mt-1">{contextNote}</p>
        </div>
        <div>
          <p className="lab-label">What to notice</p>
          <p className="mt-1">{definition?.notice}</p>
        </div>
      </div>

      {graph ? (
        <div className="mt-5">
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
