"use client";

import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react";

type UseAnimationClockOptions = {
  autoStart?: boolean;
  speed?: number;
  stepSeconds?: number;
  initialTime?: number;
  minTime?: number;
  maxTime?: number;
};

type MatchMediaWithListener = MediaQueryList & {
  addEventListener?: (type: "change", listener: (event: MediaQueryListEvent) => void) => void;
  removeEventListener?: (type: "change", listener: (event: MediaQueryListEvent) => void) => void;
};

function clampAnimationTime(value: number, minTime: number, maxTime: number, fallbackTime: number) {
  const lowerBound = Math.min(minTime, maxTime);
  const upperBound = Math.max(minTime, maxTime);
  const safeFallback = Number.isFinite(fallbackTime) ? fallbackTime : lowerBound;
  const safeValue = Number.isFinite(value) ? value : safeFallback;

  return Math.min(upperBound, Math.max(lowerBound, safeValue));
}

function normalizeDelta(delta: number, fallbackDelta: number) {
  if (!Number.isFinite(delta)) {
    return fallbackDelta;
  }

  return delta;
}

type AnimationClockStore = {
  time: number;
  speed: number;
  minTime: number;
  maxTime: number;
  initialTime: number;
  rafId: number | null;
  fallbackTimeoutId: number | null;
  lastFrameTime: number | null;
  listeners: Set<() => void>;
  emit: () => void;
  getSnapshot: () => number;
  subscribe: (listener: () => void) => () => void;
  setTime: (next: number | ((current: number) => number), fallbackTime?: number) => number;
  clearScheduled: () => void;
};

function createAnimationClockStore(
  initialTime: number,
  minTime: number,
  maxTime: number,
  speed: number,
): AnimationClockStore {
  const store: AnimationClockStore = {
    time: clampAnimationTime(initialTime, minTime, maxTime, initialTime),
    speed,
    minTime,
    maxTime,
    initialTime,
    rafId: null,
    fallbackTimeoutId: null,
    lastFrameTime: null,
    listeners: new Set(),
    emit: () => {
      for (const listener of store.listeners) {
        listener();
      }
    },
    getSnapshot: () => store.time,
    subscribe: (listener) => {
      store.listeners.add(listener);
      return () => {
        store.listeners.delete(listener);
      };
    },
    setTime: (next, fallbackTime = store.initialTime) => {
      const resolvedNext =
        typeof next === "function" ? next(store.time) : next;
      const clampedTime = clampAnimationTime(
        resolvedNext,
        store.minTime,
        store.maxTime,
        fallbackTime,
      );

      if (Object.is(clampedTime, store.time)) {
        return store.time;
      }

      store.time = clampedTime;
      store.emit();
      return store.time;
    },
    clearScheduled: () => {
      if (store.rafId !== null) {
        cancelAnimationFrame(store.rafId);
        store.rafId = null;
      }

      if (store.fallbackTimeoutId !== null) {
        window.clearTimeout(store.fallbackTimeoutId);
        store.fallbackTimeoutId = null;
      }
    },
  };

  return store;
}

export function useAnimationClock({
  autoStart = true,
  speed = 1,
  stepSeconds = 1 / 30,
  initialTime = 0,
  minTime = Number.NEGATIVE_INFINITY,
  maxTime = Number.POSITIVE_INFINITY,
}: UseAnimationClockOptions = {}) {
  const storeRef = useRef<AnimationClockStore | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createAnimationClockStore(initialTime, minTime, maxTime, speed);
  }

  const store = storeRef.current;
  store.speed = speed;
  store.minTime = minTime;
  store.maxTime = maxTime;
  store.initialTime = initialTime;

  const time = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [isPlaying, setIsPlaying] = useState(autoStart);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const isPlayingRef = useRef(isPlaying);

  isPlayingRef.current = isPlaying;

  const stopLoop = useEffectEvent(() => {
    store.clearScheduled();
    store.lastFrameTime = null;
  });

  const runTick = useEffectEvent((now: number) => {
    if (store.fallbackTimeoutId !== null) {
      window.clearTimeout(store.fallbackTimeoutId);
      store.fallbackTimeoutId = null;
    }
    store.rafId = null;

    if (!isPlayingRef.current) {
      store.lastFrameTime = null;
      return;
    }

    const previousFrameTime = store.lastFrameTime ?? now;
    const deltaSeconds = Math.min(0.05, Math.max(0, (now - previousFrameTime) / 1000)) * store.speed;
    store.lastFrameTime = now;

    if (deltaSeconds > 0) {
      store.setTime((current) => current + deltaSeconds, store.initialTime);
    }

    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      stopLoop();
      return;
    }

    store.rafId = requestAnimationFrame(runTick);
    store.fallbackTimeoutId = window.setTimeout(() => {
      if (store.rafId !== null) {
        cancelAnimationFrame(store.rafId);
        store.rafId = null;
      }

      runTick(performance.now());
    }, 80);
  });

  const startLoop = useEffectEvent(() => {
    stopLoop();

    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return;
    }

    store.lastFrameTime = performance.now();
    store.rafId = requestAnimationFrame(runTick);
    store.fallbackTimeoutId = window.setTimeout(() => {
      if (store.rafId !== null) {
        cancelAnimationFrame(store.rafId);
        store.rafId = null;
      }

      runTick(performance.now());
    }, 80);
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const media = window.matchMedia("(prefers-reduced-motion: reduce)") as MatchMediaWithListener;
    const update = () => setIsReducedMotion(media.matches);
    update();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update);
      return () => media.removeEventListener?.("change", update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  useEffect(() => {
    if (isReducedMotion) {
      setIsPlaying(false);
    }
  }, [isReducedMotion]);

  useEffect(() => {
    store.setTime((current) => current, initialTime);
  }, [initialTime, maxTime, minTime, store]);

  useEffect(() => {
    if (!isPlaying) {
      stopLoop();
      return stopLoop;
    }

    startLoop();
    return stopLoop;
  }, [isPlaying]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        stopLoop();
        return;
      }

      if (isPlayingRef.current) {
        startLoop();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  function play() {
    setIsPlaying(true);
  }

  function pause() {
    setIsPlaying(false);
  }

  function toggle() {
    setIsPlaying((current) => !current);
  }

  function seek(nextTime = time) {
    store.setTime(nextTime, time);
  }

  function reset(nextTime = 0) {
    seek(nextTime);
  }

  function stepBy(seconds = stepSeconds) {
    const delta = normalizeDelta(seconds, stepSeconds);
    store.setTime((current) => current + delta, time);
  }

  function stepForward(seconds = stepSeconds) {
    stepBy(Math.abs(normalizeDelta(seconds, stepSeconds)));
  }

  function stepBackward(seconds = stepSeconds) {
    stepBy(-Math.abs(normalizeDelta(seconds, stepSeconds)));
  }

  function step(seconds = stepSeconds) {
    stepBy(seconds);
  }

  return {
    time,
    isPlaying,
    isReducedMotion,
    play,
    pause,
    toggle,
    reset,
    seek,
    stepBy,
    stepForward,
    stepBackward,
    step,
    setTime: seek,
  };
}
