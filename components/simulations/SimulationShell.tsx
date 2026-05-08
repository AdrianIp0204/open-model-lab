"use client";

import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

type SimulationShellProps = {
  accessibilityDescription: string;
  stageTone?: "paper" | "focus";
  setupAnchorId?: string;
  setupAnchorLabel?: string;
  controlsAnchorId?: string;
  controlsAnchorLabel?: string;
  scene: ReactNode;
  equations: ReactNode;
  benchEquations?: ReactNode;
  controls: ReactNode;
  benchHeader?: ReactNode;
  notice?: ReactNode;
  transport: ReactNode;
  afterBench?: ReactNode;
  interactionRail?: ReactNode;
  supportDock?: ReactNode;
  graphs: ReactNode;
  equationDetails?: ReactNode;
  status: ReactNode;
  className?: string;
};

const TAILWIND_SM_QUERY = "(min-width: 640px)";

function subscribeToSmViewport(onStoreChange: () => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => undefined;
  }

  const mediaQuery = window.matchMedia(TAILWIND_SM_QUERY);
  mediaQuery.addEventListener("change", onStoreChange);

  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

function getSmViewportSnapshot() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(TAILWIND_SM_QUERY).matches
  );
}

function getServerSmViewportSnapshot() {
  return false;
}

function useIsSmViewportOrWider() {
  return useSyncExternalStore(
    subscribeToSmViewport,
    getSmViewportSnapshot,
    getServerSmViewportSnapshot,
  );
}

export function SimulationShell({
  accessibilityDescription,
  stageTone = "paper",
  setupAnchorId,
  setupAnchorLabel,
  controlsAnchorId,
  controlsAnchorLabel,
  transport,
  scene,
  equations,
  benchEquations,
  controls,
  benchHeader,
  notice,
  interactionRail,
  afterBench,
  supportDock,
  graphs,
  equationDetails,
  status,
  className,
}: SimulationShellProps) {
  const t = useTranslations("SimulationShell");
  const guideStack = [notice].filter(Boolean);
  const hasLowerDock = Boolean(equations || supportDock);
  const isSmViewportOrWider = useIsSmViewportOrWider();
  const isFocusStage = stageTone === "focus";
  const shellClassName = [
    "page-hero-surface overflow-hidden p-1 sm:p-1.5 md:p-2",
    isFocusStage ? "simulation-shell--focus-stage" : "",
    className ?? "",
  ].join(" ");
  const innerFrameClassName = isFocusStage
    ? "relative overflow-hidden rounded-[22px] border border-white/10 bg-[radial-gradient(circle_at_18%_0%,rgba(30,166,162,0.20),transparent_34%),radial-gradient(circle_at_88%_18%,rgba(240,171,60,0.16),transparent_28%),linear-gradient(135deg,#07131c,#101e2a_56%,#152330)] p-2.5 text-paper-strong shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-3"
    : "relative overflow-hidden rounded-[22px] border border-line bg-paper-strong/85 p-2.5 sm:p-3";
  const setupDividerClassName = isFocusStage
    ? "sr-only"
    : "border-b border-line/80 pb-1.5";
  const setupLabelClassName = isFocusStage
    ? "lab-label text-teal-100/75"
    : "lab-label";
  const focusSurfaceClassName = isFocusStage
    ? "rounded-[24px] bg-white/[0.045] p-1 ring-1 ring-white/10 shadow-[0_18px_50px_rgba(0,0,0,0.20)]"
    : "";
  const statusClassName = isFocusStage
    ? "rounded-[16px] border border-white/10 bg-white/[0.07] px-3 py-2 text-sm leading-6 text-teal-50/88"
    : "rounded-[16px] border border-line bg-white/70 px-3 py-2 text-sm leading-6 text-ink-700";
  const usesPhoneVisualPriority = isFocusStage && !isSmViewportOrWider;

  const benchHeaderSlot = benchHeader ? (
    <div
      key="bench-header"
      data-testid="simulation-shell-bench-header"
      data-focus-surface="bench-header"
      className={isSmViewportOrWider ? "order-2 min-w-0 lg:order-3 lg:col-start-1 lg:row-start-2" : "min-w-0"}
    >
      {benchHeader}
    </div>
  ) : null;
  const sceneSlot = (
    <div
      key="scene"
      data-testid="simulation-shell-scene"
      data-focus-surface="scene"
      className={[
        isSmViewportOrWider ? "relative order-1 min-w-0" : "relative min-w-0",
        focusSurfaceClassName,
      ].join(" ")}
    >
      {scene}
      {benchEquations ? (
        <div
          data-testid="simulation-shell-bench-equations"
          className={
            isSmViewportOrWider
              ? "pointer-events-none absolute left-1.5 top-1.5 z-20 max-w-[min(17rem,calc(100%-0.75rem))] sm:left-2 sm:top-2"
              : "pointer-events-none mt-2 max-w-full"
          }
        >
          {benchEquations}
        </div>
      ) : null}
    </div>
  );
  const firstActionSlot = interactionRail ? (
    <div
      key="first-action"
      data-testid="simulation-shell-first-action"
      data-focus-surface="rail"
      className="min-w-0"
    >
      {interactionRail}
    </div>
  ) : null;
  const controlsSlot = (
    <div
      key="controls"
      data-testid="simulation-shell-controls"
      className={[
        "min-w-0",
        isSmViewportOrWider
          ? [
              "lg:col-start-2 lg:row-span-2",
              benchHeader ? "lg:row-start-1" : "",
              benchHeader ? "order-3 lg:order-3" : "order-2",
            ].join(" ")
          : "",
      ].join(" ")}
    >
      <div className="space-y-2.5 lg:sticky lg:top-4">
        {interactionRail && !usesPhoneVisualPriority ? firstActionSlot : null}
        <div
          id={controlsAnchorId}
          data-testid="simulation-shell-control-panel"
          className={controlsAnchorId ? "scroll-mt-24" : undefined}
          role={controlsAnchorId ? "region" : undefined}
          aria-label={controlsAnchorLabel}
          tabIndex={controlsAnchorId ? -1 : undefined}
        >
          {controls}
        </div>
      </div>
    </div>
  );
  const transportSlot = transport ? (
    <div
      key="transport"
      data-testid="simulation-shell-transport"
      className="min-w-0"
    >
      {transport}
    </div>
  ) : null;
  const graphsSlot = (
    <div
      key="graphs"
      data-testid="simulation-shell-graphs"
      data-focus-surface="graphs"
      className={
        [
          isSmViewportOrWider
            ? benchHeader
              ? "order-3 min-w-0"
              : "order-2 min-w-0"
            : "min-w-0",
          focusSurfaceClassName,
        ].join(" ")
      }
    >
      {graphs}
    </div>
  );
  const wideBenchStack = (
    <div
      key="bench-stack"
      data-testid={isFocusStage ? "simulation-shell-visual-stage" : undefined}
      data-focus-surface={isFocusStage ? "visual-stage" : undefined}
      className={[
        isFocusStage
          ? "contents lg:grid lg:min-w-0 lg:gap-2.5 lg:rounded-[28px] lg:border lg:border-white/10 lg:bg-white/[0.035] lg:p-1.5 lg:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_24px_64px_rgba(0,0,0,0.20)] lg:col-start-1"
          : "contents lg:block lg:min-w-0 lg:space-y-3 lg:col-start-1",
        benchHeader ? "order-1 lg:order-1 lg:row-start-1" : "order-1",
      ].join(" ")}
    >
      {sceneSlot}
      {graphsSlot}
    </div>
  );

  return (
    <section
      data-simulation-shell-breakpoint={isSmViewportOrWider ? "sm" : "phone"}
      data-stage-tone={stageTone}
      className={shellClassName}
    >
      <div className={innerFrameClassName}>
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1ea6a2,#f0ab3c,#f16659)]" />
        <p className="sr-only" aria-live="polite">
          {accessibilityDescription}
        </p>
        <div
          id={setupAnchorId}
          className={setupAnchorId ? "scroll-mt-24 focus:outline-none" : undefined}
          role={setupAnchorId ? "region" : undefined}
          aria-label={setupAnchorLabel}
          tabIndex={setupAnchorId ? -1 : undefined}
        >
          <div className={setupDividerClassName}>
            <p className={setupLabelClassName}>{t("title")}</p>
            <p className="sr-only">
              {t("description")}
            </p>
          </div>
        </div>
        <div className="mt-2 space-y-2 md:space-y-2.5">
          {/* Keep responsive visual order and keyboard order aligned without duplicating live bench controls. */}
          {isSmViewportOrWider ? transportSlot : null}
          <div className="grid gap-2 md:gap-2.5 lg:grid-cols-[minmax(0,1fr)_minmax(17.5rem,19.25rem)] xl:grid-cols-[minmax(0,1fr)_minmax(18rem,20rem)] 2xl:grid-cols-[minmax(0,1fr)_minmax(18.5rem,20.5rem)] lg:items-start">
            {isSmViewportOrWider ? (
              <>
                {benchHeaderSlot}
                {wideBenchStack}
                {controlsSlot}
              </>
            ) : (
              usesPhoneVisualPriority ? (
                <>
                  {sceneSlot}
                  {firstActionSlot}
                  {controlsSlot}
                  {graphsSlot}
                  {transportSlot}
                  {benchHeaderSlot}
                </>
              ) : (
                <>
                  {sceneSlot}
                  {controlsSlot}
                  {transportSlot}
                  {graphsSlot}
                  {benchHeaderSlot}
                </>
              )
            )}
          </div>
          {afterBench ? (
            <div
              data-testid="simulation-shell-after-bench"
              className="min-w-0"
            >
              {afterBench}
            </div>
          ) : null}
          {guideStack.length ? (
            <div
              data-testid="simulation-shell-guides"
              className={[
                "grid min-w-0 gap-3",
                guideStack.length > 1 ? "lg:grid-cols-2" : "",
              ].join(" ")}
            >
              {guideStack.map((panel, index) => (
                <div
                  key={index}
                  className={
                    guideStack.length === 2
                      ? index === 0
                        ? "order-2 lg:order-1"
                        : "order-1 lg:order-2"
                      : undefined
                  }
                >
                  {panel}
                </div>
              ))}
            </div>
          ) : null}
        </div>
        {hasLowerDock ? (
          <div className="mt-2 grid gap-2.5">
            <div>{equations}</div>
            {supportDock ? <div>{supportDock}</div> : null}
          </div>
        ) : null}
        <div className="mt-2">
          <div className={statusClassName}>
            {status}
          </div>
        </div>
      </div>
      {equationDetails ? <div className="mt-3">{equationDetails}</div> : null}
    </section>
  );
}
