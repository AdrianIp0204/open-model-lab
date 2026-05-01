import { renderHook, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAnimationClock } from "@/hooks/useAnimationClock";

describe("useAnimationClock", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("clamps seek and supports directional stepping for inspection mode", () => {
    const { result } = renderHook(() =>
      useAnimationClock({
        autoStart: false,
        initialTime: 2,
        stepSeconds: 0.5,
        minTime: 0,
        maxTime: 3,
      }),
    );

    expect(result.current.time).toBe(2);

    act(() => {
      result.current.seek(10);
    });
    expect(result.current.time).toBe(3);

    act(() => {
      result.current.stepForward();
    });
    expect(result.current.time).toBe(3);

    act(() => {
      result.current.stepBackward();
    });
    expect(result.current.time).toBe(2.5);

    act(() => {
      result.current.stepBy(-10);
    });
    expect(result.current.time).toBe(0);

    act(() => {
      result.current.reset(1.25);
    });
    expect(result.current.time).toBe(1.25);

    act(() => {
      result.current.setTime(-4);
    });
    expect(result.current.time).toBe(0);
  });

  it("keeps clamping stable when bounds are reversed or step input is invalid", () => {
    const { result } = renderHook(() =>
      useAnimationClock({
        autoStart: false,
        initialTime: 1,
        stepSeconds: 0.25,
        minTime: 4,
        maxTime: -2,
      }),
    );

    expect(result.current.time).toBe(1);

    act(() => {
      result.current.seek(Number.NaN);
    });
    expect(result.current.time).toBe(1);

    act(() => {
      result.current.stepBy(Number.NaN);
    });
    expect(result.current.time).toBe(1.25);

    act(() => {
      result.current.stepForward(Number.NaN);
    });
    expect(result.current.time).toBe(1.5);

    act(() => {
      result.current.stepBackward(Number.NaN);
    });
    expect(result.current.time).toBe(1.25);
  });

  it("starts paused for reduced motion but still allows manual playback", () => {
    vi.useFakeTimers();

    const originalMatchMedia = window.matchMedia;
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const originalCancelAnimationFrame = window.cancelAnimationFrame;
    try {
      let frameTime = performance.now();
      window.matchMedia = vi.fn().mockReturnValue({
        matches: true,
        media: "(prefers-reduced-motion: reduce)",
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });
      window.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) =>
        window.setTimeout(() => {
          frameTime += 16;
          callback(frameTime);
        }, 16),
      );
      window.cancelAnimationFrame = vi.fn((handle: number) => window.clearTimeout(handle));

      const { result } = renderHook(() =>
        useAnimationClock({
          autoStart: true,
          initialTime: 0,
        }),
      );

      expect(result.current.isReducedMotion).toBe(true);
      expect(result.current.isPlaying).toBe(false);

      act(() => {
        result.current.play();
      });

      act(() => {
        vi.advanceTimersByTime(80);
      });

      expect(result.current.isPlaying).toBe(true);
      expect(result.current.time).toBeGreaterThan(0);
    } finally {
      window.matchMedia = originalMatchMedia;
      window.requestAnimationFrame = originalRequestAnimationFrame;
      window.cancelAnimationFrame = originalCancelAnimationFrame;
    }
  });

  it("keeps advancing while playing without requiring interaction", () => {
    vi.useFakeTimers();

    const originalMatchMedia = window.matchMedia;
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const originalCancelAnimationFrame = window.cancelAnimationFrame;

    try {
      let frameTime = performance.now();
      window.matchMedia = vi.fn().mockReturnValue({
        matches: false,
        media: "(prefers-reduced-motion: reduce)",
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });
      window.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) =>
        window.setTimeout(() => {
          frameTime += 16;
          callback(frameTime);
        }, 16),
      );
      window.cancelAnimationFrame = vi.fn((handle: number) => window.clearTimeout(handle));

      const { result } = renderHook(() =>
        useAnimationClock({
          autoStart: true,
          initialTime: 0,
        }),
      );

      expect(result.current.time).toBe(0);

      act(() => {
        vi.advanceTimersByTime(32);
      });
      const firstAdvance = result.current.time;

      act(() => {
        vi.advanceTimersByTime(64);
      });

      expect(firstAdvance).toBeGreaterThan(0);
      expect(result.current.time).toBeGreaterThan(firstAdvance);
    } finally {
      window.matchMedia = originalMatchMedia;
      window.requestAnimationFrame = originalRequestAnimationFrame;
      window.cancelAnimationFrame = originalCancelAnimationFrame;
    }
  });

  it("recovers playback after the document becomes visible again", () => {
    vi.useFakeTimers();

    const originalMatchMedia = window.matchMedia;
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const originalCancelAnimationFrame = window.cancelAnimationFrame;
    const originalVisibilityDescriptor = Object.getOwnPropertyDescriptor(document, "visibilityState");

    try {
      let frameTime = performance.now();
      let visibilityState: DocumentVisibilityState = "visible";

      window.matchMedia = vi.fn().mockReturnValue({
        matches: false,
        media: "(prefers-reduced-motion: reduce)",
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });
      window.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) =>
        window.setTimeout(() => {
          frameTime += 16;
          callback(frameTime);
        }, 16),
      );
      window.cancelAnimationFrame = vi.fn((handle: number) => window.clearTimeout(handle));
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => visibilityState,
      });

      const { result } = renderHook(() =>
        useAnimationClock({
          autoStart: true,
          initialTime: 0,
        }),
      );

      act(() => {
        vi.advanceTimersByTime(48);
      });
      const visibleTime = result.current.time;

      act(() => {
        visibilityState = "hidden";
        document.dispatchEvent(new Event("visibilitychange"));
        vi.advanceTimersByTime(160);
      });

      expect(result.current.time).toBe(visibleTime);

      act(() => {
        visibilityState = "visible";
        document.dispatchEvent(new Event("visibilitychange"));
        vi.advanceTimersByTime(48);
      });

      expect(result.current.time).toBeGreaterThan(visibleTime);
    } finally {
      if (originalVisibilityDescriptor) {
        Object.defineProperty(document, "visibilityState", originalVisibilityDescriptor);
      }
      window.matchMedia = originalMatchMedia;
      window.requestAnimationFrame = originalRequestAnimationFrame;
      window.cancelAnimationFrame = originalCancelAnimationFrame;
    }
  });
});
