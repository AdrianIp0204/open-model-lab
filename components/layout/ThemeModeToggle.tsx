"use client";

import { useSyncExternalStore } from "react";

type ThemeMode = "dark-lab" | "paper-lab";

type ThemeModeToggleProps = {
  darkLabel: string;
  lightLabel: string;
  switchToDarkLabel: string;
  switchToLightLabel: string;
  labelClassName?: string;
};

const STORAGE_KEY = "oml-theme-mode";
const CHANGE_EVENT = "oml-theme-modechange";

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "dark-lab" || value === "paper-lab";
}

function applyThemeMode(mode: ThemeMode) {
  const root = document.documentElement;
  root.dataset.theme = mode;
  root.style.colorScheme = mode === "dark-lab" ? "dark" : "light";
}

function resolveThemeModeSnapshot(): ThemeMode {
  if (typeof window === "undefined") {
    return "dark-lab";
  }

  const savedMode = window.localStorage.getItem(STORAGE_KEY);
  const currentDocumentMode = document.documentElement.dataset.theme ?? null;

  return isThemeMode(savedMode)
    ? savedMode
    : isThemeMode(currentDocumentMode)
      ? currentDocumentMode
      : "dark-lab";
}

function subscribeThemeMode(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      onStoreChange();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
}

function getServerThemeModeSnapshot(): ThemeMode {
  return "dark-lab";
}

export function ThemeModeToggle({
  darkLabel,
  lightLabel,
  switchToDarkLabel,
  switchToLightLabel,
  labelClassName = "hidden sm:inline",
}: ThemeModeToggleProps) {
  const mode = useSyncExternalStore(
    subscribeThemeMode,
    resolveThemeModeSnapshot,
    getServerThemeModeSnapshot,
  );

  const nextMode: ThemeMode = mode === "dark-lab" ? "paper-lab" : "dark-lab";
  const visibleLabel = mode === "dark-lab" ? darkLabel : lightLabel;
  const actionLabel = nextMode === "dark-lab" ? switchToDarkLabel : switchToLightLabel;

  return (
    <button
      type="button"
      aria-label={actionLabel}
      data-testid="theme-mode-toggle"
      onClick={() => {
        applyThemeMode(nextMode);
        window.localStorage.setItem(STORAGE_KEY, nextMode);
        window.dispatchEvent(new Event(CHANGE_EVENT));
      }}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-paper-strong px-3 py-2 text-sm font-semibold text-ink-950 transition hover:border-teal-500/35 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
    >
      <span
        aria-hidden="true"
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-line bg-paper text-xs font-semibold text-ink-700"
      >
        {mode === "dark-lab" ? "☾" : "☼"}
      </span>
      <span className={labelClassName}>{visibleLabel}</span>
    </button>
  );
}
