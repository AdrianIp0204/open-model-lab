"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

type SimulationShellProps = {
  accessibilityDescription: string;
  setupAnchorId?: string;
  setupAnchorLabel?: string;
  scene: ReactNode;
  equations: ReactNode;
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

export function SimulationShell({
  accessibilityDescription,
  setupAnchorId,
  setupAnchorLabel,
  transport,
  scene,
  equations,
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

  return (
    <section className={["page-hero-surface overflow-hidden p-1.5 sm:p-2.5 md:p-3", className ?? ""].join(" ")}>
      <div className="relative overflow-hidden rounded-[26px] border border-line bg-paper-strong/85 p-3">
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
          <div className="border-b border-line/80 pb-2">
            <p className="lab-label">{t("title")}</p>
            <p className="mt-1 hidden text-sm leading-6 text-ink-600 xl:block">
              {t("description")}
            </p>
          </div>
        </div>
        <div className="mt-2.5 space-y-2.5 md:space-y-3">
          {transport ? (
            <div
              data-testid="simulation-shell-transport"
              className="min-w-0"
            >
              {transport}
            </div>
          ) : null}
          <div className="grid gap-2.5 md:gap-3 xl:grid-cols-[minmax(0,1.18fr)_minmax(18rem,20.5rem)] 2xl:grid-cols-[minmax(0,1.24fr)_minmax(19rem,22rem)] xl:items-start">
            {benchHeader ? (
              <div
                data-testid="simulation-shell-bench-header"
                className="order-2 min-w-0 xl:order-1 xl:col-span-2"
              >
                {benchHeader}
              </div>
            ) : null}
            <div
              className={[
                "contents xl:block xl:min-w-0 xl:space-y-3 xl:col-start-1",
                benchHeader ? "order-1 xl:order-2" : "order-1",
              ].join(" ")}
            >
              <div
                data-testid="simulation-shell-scene"
                className={benchHeader ? "order-1 min-w-0" : "order-1 min-w-0"}
              >
                {scene}
              </div>
              <div
                data-testid="simulation-shell-graphs"
                className={benchHeader ? "order-4 min-w-0" : "order-3 min-w-0"}
              >
                {graphs}
              </div>
            </div>
            <div
              data-testid="simulation-shell-controls"
              className={[
                "min-w-0 xl:col-start-2 xl:row-span-2",
                benchHeader ? "order-3 xl:order-3" : "order-2",
              ].join(" ")}
            >
              <div className="space-y-3 xl:sticky xl:top-5">
                {controls}
                {interactionRail ? (
                  <div data-testid="simulation-shell-first-action">
                    {interactionRail}
                  </div>
                ) : null}
              </div>
            </div>
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
          <div className="mt-2.5 grid gap-2.5">
            <div>{equations}</div>
            {supportDock ? <div>{supportDock}</div> : null}
          </div>
        ) : null}
        <div className="mt-2.5">
          <div className="rounded-[18px] border border-line bg-white/70 px-4 py-3 text-sm leading-6 text-ink-700">
            {status}
          </div>
        </div>
      </div>
      {equationDetails ? <div className="mt-3">{equationDetails}</div> : null}
    </section>
  );
}
