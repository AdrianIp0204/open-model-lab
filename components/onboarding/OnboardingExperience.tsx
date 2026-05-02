"use client";

import type { CSSProperties } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import {
  OPEN_ONBOARDING_HELP_EVENT,
  isOpenOnboardingHelpEvent,
} from "@/lib/onboarding/events";
import {
  defaultOnboardingPreferences,
  readOnboardingPreferences,
  writeOnboardingPreferences,
  type OnboardingPreferences,
} from "@/lib/onboarding/preferences";
import {
  getOnboardingRouteKey,
  getOnboardingStepDefinitions,
  shouldSuppressAutomaticOnboarding,
  type OnboardingStepDefinition,
} from "@/lib/onboarding/help-content";

type AnchorBox = {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
};

const AUTO_PROMPT_DELAY_MS = 900;
const PANEL_MARGIN = 16;
const ESTIMATED_TOUR_PANEL_HEIGHT = 250;
const TOUR_PANEL_WIDTH = 380;

function getStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (value && typeof value === "object") {
    return Object.values(value).filter((item): item is string => typeof item === "string");
  }

  return [];
}

function hasBlockingDialog() {
  if (typeof document === "undefined") {
    return false;
  }

  return Boolean(
    document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]'),
  );
}

function getTargetElement(target: string) {
  if (typeof document === "undefined") {
    return null;
  }

  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(`[data-onboarding-target="${target}"]`),
  );

  return candidates.find((element) => {
    if (element.hidden || element.closest("[hidden]")) {
      return false;
    }

    const style = window.getComputedStyle(element);

    if (style.display === "none" || style.visibility === "hidden") {
      return false;
    }

    const rect = element.getBoundingClientRect();
    return rect.width > 0 || rect.height > 0 || process.env.NODE_ENV === "test";
  }) ?? null;
}

function resolveVisibleSteps(pathname: string | null | undefined) {
  const definitions = getOnboardingStepDefinitions(pathname);
  const visibleSteps = definitions.filter((step) => {
    if (!step.target) {
      return true;
    }

    return Boolean(getTargetElement(step.target));
  });

  return visibleSteps.length ? visibleSteps : definitions.slice(0, 1);
}

function getAnchorBox(target: string | undefined): AnchorBox | null {
  if (!target) {
    return null;
  }

  const element = getTargetElement(target);

  if (!element) {
    return null;
  }

  const rect = element.getBoundingClientRect();

  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    bottom: rect.bottom,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getTourPanelStyle(anchor: AnchorBox | null): CSSProperties {
  if (typeof window === "undefined" || !anchor) {
    return {
      bottom: "max(1rem, env(safe-area-inset-bottom))",
      left: PANEL_MARGIN,
      right: PANEL_MARGIN,
    };
  }

  const width = Math.min(TOUR_PANEL_WIDTH, window.innerWidth - PANEL_MARGIN * 2);
  const fitsBelow =
    anchor.bottom + PANEL_MARGIN + ESTIMATED_TOUR_PANEL_HEIGHT < window.innerHeight;
  const top = fitsBelow
    ? anchor.bottom + 12
    : Math.max(PANEL_MARGIN, anchor.top - ESTIMATED_TOUR_PANEL_HEIGHT - 12);

  return {
    top,
    left: clamp(anchor.left, PANEL_MARGIN, window.innerWidth - width - PANEL_MARGIN),
    width,
  };
}

function getHighlightStyle(anchor: AnchorBox | null): CSSProperties | undefined {
  if (!anchor) {
    return undefined;
  }

  return {
    top: Math.max(0, anchor.top - 6),
    left: Math.max(0, anchor.left - 6),
    width: anchor.width + 12,
    height: anchor.height + 12,
  };
}

export function OnboardingExperience() {
  const pathname = usePathname();
  const routeKey = getOnboardingRouteKey(pathname);
  const t = useTranslations("OnboardingHelp");
  const translate = t as unknown as (
    key: string,
    values?: Record<string, unknown>,
  ) => string;
  const readMessageValue = t.raw as unknown as (key: string) => unknown;
  const promptTitleId = useId();
  const helpTitleId = useId();
  const helpPanelId = useId();
  const tourTitleId = useId();
  const hintsId = useId();
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const helpCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const tourExitButtonRef = useRef<HTMLButtonElement | null>(null);
  const hintsRef = useRef<HTMLDivElement | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [preferences, setPreferences] = useState<OnboardingPreferences>(
    defaultOnboardingPreferences,
  );
  const [promptOpen, setPromptOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [tourSteps, setTourSteps] = useState<OnboardingStepDefinition[]>([]);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const [anchorBox, setAnchorBox] = useState<AnchorBox | null>(null);
  const tourOpen = tourSteps.length > 0;
  const activeStep = tourOpen ? tourSteps[tourStepIndex] : null;
  const pageHints = getStringArray(readMessageValue(`pages.${routeKey}.hints`));

  function persistPreferences(nextPreferences: Partial<OnboardingPreferences>) {
    const written = writeOnboardingPreferences(nextPreferences);
    setPreferences(written);
    return written;
  }

  function closeHelpPanel() {
    setHelpOpen(false);
    restoreFocusRef.current?.focus();
  }

  function closeTour() {
    setTourSteps([]);
    setTourStepIndex(0);
    setAnchorBox(null);
    restoreFocusRef.current?.focus();
  }

  function startTour(options: { restoreFocusTo?: HTMLElement | null } = {}) {
    const steps = resolveVisibleSteps(pathname);
    const initialStep = preferences.completed
      ? 0
      : Math.min(preferences.lastStep, Math.max(0, steps.length - 1));

    restoreFocusRef.current = options.restoreFocusTo ?? restoreFocusRef.current;
    persistPreferences({
      promptDismissed: true,
      lastStep: initialStep,
    });
    setPromptOpen(false);
    setHelpOpen(false);
    setTourSteps(steps);
    setTourStepIndex(initialStep);
  }

  function completeTour() {
    persistPreferences({
      completed: true,
      promptDismissed: true,
      lastStep: Math.max(0, tourSteps.length - 1),
    });
    closeTour();
  }

  function moveTourStep(nextStep: number) {
    const clampedStep = clamp(nextStep, 0, Math.max(0, tourSteps.length - 1));
    writeOnboardingPreferences({ lastStep: clampedStep });
    setTourStepIndex(clampedStep);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPreferences(readOnboardingPreferences());
      setInitialized(true);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    function handleOpenHelp(event: Event) {
      if (!isOpenOnboardingHelpEvent(event)) {
        return;
      }

      restoreFocusRef.current = event.detail.restoreFocusTo ?? null;
      setPromptOpen(false);
      setTourSteps([]);
      setTourStepIndex(0);
      setHelpOpen(true);
    }

    window.addEventListener(OPEN_ONBOARDING_HELP_EVENT, handleOpenHelp);

    return () => {
      window.removeEventListener(OPEN_ONBOARDING_HELP_EVENT, handleOpenHelp);
    };
  }, []);

  useEffect(() => {
    if (
      !initialized ||
      preferences.promptDismissed ||
      preferences.disabled ||
      preferences.completed ||
      shouldSuppressAutomaticOnboarding(pathname) ||
      helpOpen ||
      tourOpen
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (!hasBlockingDialog()) {
        setPromptOpen(true);
      }
    }, AUTO_PROMPT_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [helpOpen, initialized, pathname, preferences, tourOpen]);

  useEffect(() => {
    if (!helpOpen) {
      return;
    }

    helpCloseButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      closeHelpPanel();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [helpOpen]);

  useEffect(() => {
    if (!tourOpen) {
      return;
    }

    const timer = window.setTimeout(() => {
      const nextSteps = resolveVisibleSteps(pathname);

      setTourSteps(nextSteps);
      setTourStepIndex((current) => Math.min(current, Math.max(0, nextSteps.length - 1)));
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [pathname, tourOpen]);

  useEffect(() => {
    if (!tourOpen) {
      return;
    }

    tourExitButtonRef.current?.focus();
  }, [tourOpen]);

  useEffect(() => {
    if (!activeStep) {
      return;
    }

    const activeTarget = activeStep.target;
    const target = activeTarget ? getTargetElement(activeTarget) : null;

    if (target && typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ block: "center", inline: "nearest" });
    }

    function updateAnchorBox() {
      setAnchorBox(getAnchorBox(activeTarget));
    }

    const frame = window.requestAnimationFrame(updateAnchorBox);
    window.addEventListener("resize", updateAnchorBox);
    window.addEventListener("scroll", updateAnchorBox, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateAnchorBox);
      window.removeEventListener("scroll", updateAnchorBox, true);
    };
  }, [activeStep]);

  useEffect(() => {
    if (!tourOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeTour();
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setTourStepIndex((current) => {
          const nextStep = current >= tourSteps.length - 1 ? current : current + 1;
          writeOnboardingPreferences({ lastStep: nextStep });
          return nextStep;
        });
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setTourStepIndex((current) => {
          const nextStep = current <= 0 ? current : current - 1;
          writeOnboardingPreferences({ lastStep: nextStep });
          return nextStep;
        });
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [tourOpen, tourSteps.length]);

  return (
    <>
      {promptOpen ? (
        <section
          role="dialog"
          aria-modal="false"
          aria-labelledby={promptTitleId}
          aria-live="polite"
          className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-3 right-3 z-[45] max-w-[calc(100vw-1.5rem)] lab-panel p-3 shadow-surface sm:bottom-auto sm:left-auto sm:right-4 sm:top-[4.75rem] sm:w-[21rem] sm:p-4"
        >
          <div className="space-y-1.5 sm:space-y-2">
            <p className="lab-label">{t("prompt.label")}</p>
            <h2 id={promptTitleId} className="text-base font-semibold text-ink-950 sm:text-lg">
              {t("prompt.title")}
            </h2>
            <p className="hidden text-sm leading-6 text-ink-700 sm:block">{t("prompt.description")}</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              aria-label={t("prompt.actions.startAria")}
              onClick={(event) =>
                startTour({ restoreFocusTo: event.currentTarget })
              }
              className="cta-primary min-h-10 px-4 py-2 text-xs"
            >
              {t("prompt.actions.start")}
            </button>
            <button
              type="button"
              aria-label={t("prompt.actions.skipAria")}
              onClick={() => {
                persistPreferences({ promptDismissed: true });
                setPromptOpen(false);
              }}
              className="rounded-full border border-line bg-paper-strong px-4 py-2 text-xs font-semibold text-ink-800 transition hover:border-ink-950/20"
            >
              {t("prompt.actions.skip")}
            </button>
            <button
              type="button"
              aria-label={t("prompt.actions.disableAria")}
              onClick={() => {
                persistPreferences({ promptDismissed: true, disabled: true });
                setPromptOpen(false);
              }}
              className="rounded-full border border-transparent px-3 py-2 text-xs font-semibold text-ink-600 transition hover:border-line hover:bg-paper"
            >
              {t("prompt.actions.disable")}
            </button>
          </div>
        </section>
      ) : null}

      {helpOpen ? (
        <section
          id={helpPanelId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={helpTitleId}
          className="fixed right-4 top-[4.75rem] z-[55] max-h-[calc(100svh-6rem)] w-[min(27rem,calc(100vw-2rem))] overflow-y-auto lab-panel p-4 sm:p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="lab-label">{t("panel.label")}</p>
              <h2 id={helpTitleId} className="text-lg font-semibold text-ink-950">
                {translate(`pages.${routeKey}.title`)}
              </h2>
            </div>
            <button
              ref={helpCloseButtonRef}
              type="button"
              aria-label={t("panel.closeAria")}
              onClick={closeHelpPanel}
              className="rounded-full border border-line bg-paper-strong px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-500 transition-colors hover:border-ink-950/20 hover:text-ink-700"
            >
              {t("panel.close")}
            </button>
          </div>

          <p className="mt-3 text-sm leading-6 text-ink-700">
            {translate(`pages.${routeKey}.description`)}
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              aria-label={t("panel.startTourAria")}
              onClick={(event) =>
                startTour({ restoreFocusTo: event.currentTarget })
              }
              className="cta-primary min-h-10 px-4 py-2 text-xs"
            >
              {t("panel.startTour")}
            </button>
            <button
              type="button"
              aria-label={t("panel.pageHintsAria")}
              onClick={() => hintsRef.current?.focus()}
              className="cta-secondary min-h-10 px-4 py-2 text-xs"
            >
              {t("panel.pageHints")}
            </button>
          </div>

          <div
            ref={hintsRef}
            id={hintsId}
            tabIndex={-1}
            className="mt-5 rounded-[22px] border border-line bg-paper px-4 py-4"
          >
            <p className="lab-label">{t("panel.hintsTitle")}</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-ink-700">
              {pageHints.map((hint) => (
                <li key={hint} className="flex gap-2">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                  <span>{hint}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {activeStep ? (
        <>
          {anchorBox ? (
            <div
              aria-hidden="true"
              className="pointer-events-none fixed z-[54] rounded-[24px] border-2 border-teal-500/70 bg-teal-500/5 shadow-[0_0_0_9999px_rgba(15,28,36,0.025)]"
              style={getHighlightStyle(anchorBox)}
            />
          ) : null}
          <section
            role="dialog"
            aria-modal="false"
            aria-labelledby={tourTitleId}
            className="fixed z-[56] lab-panel p-4 sm:p-5"
            style={getTourPanelStyle(anchorBox)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="lab-label">
                  {t("tour.progress", {
                    current: tourStepIndex + 1,
                    total: tourSteps.length,
                  })}
                </p>
                <h2 id={tourTitleId} className="text-lg font-semibold text-ink-950">
                  {translate(`steps.${activeStep.messageKey}.title`)}
                </h2>
              </div>
              <button
                ref={tourExitButtonRef}
                type="button"
                aria-label={t("tour.exitAria")}
                onClick={closeTour}
                className="rounded-full border border-line bg-paper-strong px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-500 transition-colors hover:border-ink-950/20 hover:text-ink-700"
              >
                {t("tour.exit")}
              </button>
            </div>
            <p className="mt-3 text-sm leading-6 text-ink-700">
              {translate(`steps.${activeStep.messageKey}.body`)}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                aria-label={t("tour.previousAria")}
                onClick={() => moveTourStep(tourStepIndex - 1)}
                disabled={tourStepIndex === 0}
                className="rounded-full border border-line bg-paper-strong px-4 py-2 text-xs font-semibold text-ink-800 transition hover:border-ink-950/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("tour.previous")}
              </button>
              {tourStepIndex >= tourSteps.length - 1 ? (
                <button
                  type="button"
                  aria-label={t("tour.finishAria")}
                  onClick={completeTour}
                  className="cta-primary min-h-10 px-4 py-2 text-xs"
                >
                  {t("tour.finish")}
                </button>
              ) : (
                <button
                  type="button"
                  aria-label={t("tour.nextAria")}
                  onClick={() => moveTourStep(tourStepIndex + 1)}
                  className="cta-primary min-h-10 px-4 py-2 text-xs"
                >
                  {t("tour.next")}
                </button>
              )}
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}
