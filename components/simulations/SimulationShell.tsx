"use client";

import type { ReactNode } from "react";
import { useRef, useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useExactZhHkRuntimeDomLocalization } from "@/lib/i18n/zh-hk-exact-runtime-copy";

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
  benchCue?: ReactNode;
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
const TAILWIND_LG_QUERY = "(min-width: 1024px)";

function subscribeToViewportQuery(query: string, onStoreChange: () => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => undefined;
  }

  const mediaQuery = window.matchMedia(query);
  mediaQuery.addEventListener("change", onStoreChange);

  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

function getViewportQuerySnapshot(query: string) {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(query).matches
  );
}

function getServerSmViewportSnapshot() {
  return false;
}

function useIsSmViewportOrWider() {
  return useSyncExternalStore(
    (onStoreChange) => subscribeToViewportQuery(TAILWIND_SM_QUERY, onStoreChange),
    () => getViewportQuerySnapshot(TAILWIND_SM_QUERY),
    getServerSmViewportSnapshot,
  );
}

function useIsLgViewportOrWider() {
  return useSyncExternalStore(
    (onStoreChange) => subscribeToViewportQuery(TAILWIND_LG_QUERY, onStoreChange),
    () => getViewportQuerySnapshot(TAILWIND_LG_QUERY),
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
  benchCue,
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
  const locale = useLocale();
  const sceneRef = useRef<HTMLDivElement | null>(null);
  useExactZhHkRuntimeDomLocalization(locale, sceneRef);
  const guideStack = [notice].filter(Boolean);
  const hasLowerDock = Boolean(equations || supportDock);
  const isSmViewportOrWider = useIsSmViewportOrWider();
  const isLgViewportOrWider = useIsLgViewportOrWider();
  const isFocusStage = stageTone === "focus";
  const shellClassName = [
    "page-hero-surface overflow-hidden p-1 sm:p-1.5 md:p-2",
    isFocusStage ? "simulation-shell--focus-stage" : "",
    className ?? "",
  ].join(" ");
  const innerFrameClassName = isFocusStage
    ? "simulation-shell__inner-frame relative overflow-hidden rounded-[22px] border p-2.5 sm:p-3"
    : "relative overflow-hidden rounded-[22px] border border-line bg-paper-strong/85 p-2.5 sm:p-3";
  const setupDividerClassName = isFocusStage
    ? "sr-only"
    : "border-b border-line/80 pb-1.5";
  const setupLabelClassName = isFocusStage
    ? "simulation-shell__setup-label lab-label"
    : "lab-label";
  const focusSurfaceClassName = isFocusStage
    ? "simulation-shell__focus-surface rounded-[24px] p-1"
    : "";
  const statusClassName = isFocusStage
    ? "simulation-shell__status rounded-[16px] border px-3 py-2 text-sm leading-6"
    : "rounded-[16px] border border-line bg-white/70 px-3 py-2 text-sm leading-6 text-ink-700";
  const usesPhoneVisualPriority = isFocusStage && !isSmViewportOrWider;
  const showBenchEquationsInScene = Boolean(benchEquations && !usesPhoneVisualPriority);

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
  const benchCueSlot = benchCue ? (
    <div
      key="bench-cue"
      data-testid="simulation-shell-bench-cue"
      data-focus-surface="bench-cue"
      className={isSmViewportOrWider ? "order-2 min-w-0" : "min-w-0"}
    >
      {benchCue}
    </div>
  ) : null;
  const sceneSlot = (
    <div
      key="scene"
      ref={sceneRef}
      data-testid="simulation-shell-scene"
      data-focus-surface="scene"
      data-has-bench-equations={showBenchEquationsInScene ? "true" : undefined}
      className={[
        isSmViewportOrWider ? "relative order-1 min-w-0" : "relative min-w-0",
        focusSurfaceClassName,
      ].join(" ")}
    >
      {scene}
      {showBenchEquationsInScene ? (
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
  const benchEquationsSlot = benchEquations && usesPhoneVisualPriority ? (
    <div
      key="bench-equations"
      data-testid="simulation-shell-bench-equations"
      data-focus-surface="equations"
      className={["min-w-0", focusSurfaceClassName].join(" ")}
    >
      {benchEquations}
    </div>
  ) : null;
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
        {benchCue && isLgViewportOrWider ? benchCueSlot : null}
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
          ? "simulation-shell__visual-stage contents lg:grid lg:min-w-0 lg:gap-2.5 lg:rounded-[28px] lg:border lg:p-1.5 lg:col-start-1"
          : "contents lg:block lg:min-w-0 lg:space-y-3 lg:col-start-1",
        benchHeader ? "order-1 lg:order-1 lg:row-start-1" : "order-1",
      ].join(" ")}
    >
      {sceneSlot}
      {benchCue && isSmViewportOrWider && !isLgViewportOrWider ? benchCueSlot : null}
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
                  {benchCueSlot}
                  {firstActionSlot}
                  {controlsSlot}
                  {graphsSlot}
                  {benchEquationsSlot}
                  {transportSlot}
                  {benchHeaderSlot}
                </>
              ) : (
                <>
                  {sceneSlot}
                  {benchCueSlot}
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
