"use client";

import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { startTransition, useEffect, useState, useSyncExternalStore } from "react";
import type { ConceptSimulationRendererProps } from "./ConceptSimulationRenderer";

const DeferredRenderer = dynamic(
  () =>
    import("./ConceptSimulationRenderer").then(
      (module) => module.ConceptSimulationRenderer,
    ),
  {
    ssr: false,
    loading: () => <ConceptSimulationLoadingState />,
  },
);

type IdleWindow = Window & {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout?: number },
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

type MobileWebKitEnvironment = {
  maxTouchPoints: number;
  screenHeight: number;
  screenWidth: number;
  userAgent: string;
  viewportHeight: number;
  viewportWidth: number;
};

export function shouldUseManualBootForMobileWebKit(
  environment: MobileWebKitEnvironment,
) {
  const {
    maxTouchPoints,
    screenHeight,
    screenWidth,
    userAgent,
    viewportHeight,
    viewportWidth,
  } = environment;
  const isIOSDevice =
    /iP(?:hone|ad|od)/i.test(userAgent) ||
    (userAgent.includes("Macintosh") && maxTouchPoints > 1);
  const isWebKitEngine = /AppleWebKit/i.test(userAgent);
  const narrowestViewport = Math.min(
    screenWidth,
    screenHeight,
    viewportWidth,
    viewportHeight,
  );
  const phoneViewport = narrowestViewport <= 430;

  return isIOSDevice && isWebKitEngine && phoneViewport;
}

function ConceptSimulationLoadingState() {
  const t = useTranslations("DeferredConceptSimulationRenderer.loading");

  return (
    <section
      className="lab-panel overflow-hidden p-2 sm:p-2.5 md:p-3"
      aria-live="polite"
    >
      <div className="rounded-[22px] border border-line bg-paper-strong/70 p-4 sm:p-5">
        <p className="lab-label">{t("label")}</p>
        <p className="mt-2 text-sm leading-6 text-ink-700">
          {t("body")}
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(18.25rem,21rem)]">
          <div className="min-h-[18rem] rounded-[22px] border border-dashed border-line bg-paper/70" />
          <div className="min-h-[18rem] rounded-[22px] border border-dashed border-line bg-paper/70" />
        </div>
      </div>
    </section>
  );
}

function ConceptSimulationManualLoadState({
  onLoad,
}: {
  onLoad: () => void;
}) {
  const t = useTranslations("DeferredConceptSimulationRenderer.manual");

  return (
    <section className="lab-panel overflow-hidden p-2 sm:p-2.5 md:p-3">
      <div className="rounded-[22px] border border-line bg-paper-strong/70 p-4 sm:p-5">
        <p className="lab-label">{t("label")}</p>
        <p className="mt-2 text-sm leading-6 text-ink-700">
          {t("body")}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onLoad}
            className="inline-flex items-center justify-center rounded-full bg-ink-950 px-4 py-2 text-sm font-semibold text-paper-strong transition hover:opacity-90"
          >
            {t("action")}
          </button>
          <p className="text-xs leading-5 text-ink-600">
            {t("note")}
          </p>
        </div>
      </div>
    </section>
  );
}

export function DeferredConceptSimulationRenderer(
  props: ConceptSimulationRendererProps,
) {
  const requiresManualBoot = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") {
        return () => undefined;
      }

      window.addEventListener("resize", onStoreChange);
      return () => {
        window.removeEventListener("resize", onStoreChange);
      };
    },
    () => {
      if (typeof window === "undefined") {
        return false;
      }

      return shouldUseManualBootForMobileWebKit({
        maxTouchPoints: window.navigator.maxTouchPoints ?? 0,
        screenHeight: window.screen.height,
        screenWidth: window.screen.width,
        userAgent: window.navigator.userAgent,
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
      });
    },
    () => false,
  );
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (requiresManualBoot) {
      return undefined;
    }

    const idleWindow = window as IdleWindow;
    let timeoutHandle: number | null = null;
    let idleHandle: number | null = null;

    const enableRenderer = () => {
      startTransition(() => {
        setShouldRender(true);
      });
    };

    if (typeof idleWindow.requestIdleCallback === "function") {
      idleHandle = idleWindow.requestIdleCallback(enableRenderer, { timeout: 400 });
    } else {
      timeoutHandle = window.setTimeout(enableRenderer, 120);
    }

    return () => {
      if (idleHandle !== null) {
        idleWindow.cancelIdleCallback?.(idleHandle);
      }

      if (timeoutHandle !== null) {
        window.clearTimeout(timeoutHandle);
      }
    };
  }, [requiresManualBoot]);

  if (shouldRender) {
    return <DeferredRenderer {...props} />;
  }

  if (requiresManualBoot) {
    return (
      <ConceptSimulationManualLoadState
        onLoad={() => {
          startTransition(() => {
            setShouldRender(true);
          });
        }}
      />
    );
  }

  return <ConceptSimulationLoadingState />;
}
