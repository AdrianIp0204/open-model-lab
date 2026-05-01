// @vitest-environment jsdom

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomeHeroLivePreview } from "@/components/home/HomeHeroLivePreview";

function mockPreviewBounds(target: HTMLElement) {
  Object.defineProperty(target, "getBoundingClientRect", {
    configurable: true,
    value: () => ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 400,
      bottom: 320,
      width: 400,
      height: 320,
      toJSON: () => "",
    }),
  });
}

describe("HomeHeroLivePreview", () => {
  const originalMatchMedia = window.matchMedia;
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;
  const originalVisibilityDescriptor = Object.getOwnPropertyDescriptor(
    document,
    "visibilityState",
  );
  let reducedMotion = false;
  let visibilityState: DocumentVisibilityState = "visible";

  beforeEach(() => {
    vi.useFakeTimers();

    reducedMotion = false;
    visibilityState = "visible";

    let frameTime = performance.now();
    window.matchMedia = vi.fn().mockImplementation(() => ({
      get matches() {
        return reducedMotion;
      },
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
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
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    if (originalVisibilityDescriptor) {
      Object.defineProperty(document, "visibilityState", originalVisibilityDescriptor);
    }
    window.matchMedia = originalMatchMedia;
    window.requestAnimationFrame = originalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
  });

  it("autoplays continuously on mount and lets hover shift the tracking guide", () => {
    render(<HomeHeroLivePreview />);

    const preview = screen.getByRole("group", {
      name: /live preview of simple harmonic motion/i,
    });
    mockPreviewBounds(preview);

    const stageObject = preview.querySelector('[data-preview-stage-object="true"]');
    const guideLine = preview.querySelector('[data-preview-guide="true"]');

    expect(stageObject).not.toBeNull();
    expect(guideLine).not.toBeNull();

    const initialTransform = (stageObject as HTMLDivElement).style.transform;
    const initialGuideX = Number((guideLine as SVGLineElement).getAttribute("x1"));

    act(() => {
      vi.advanceTimersByTime(80);
    });

    const firstAutoplayTransform = (stageObject as HTMLDivElement).style.transform;
    expect(firstAutoplayTransform).not.toBe(initialTransform);

    act(() => {
      vi.advanceTimersByTime(96);
    });

    expect((stageObject as HTMLDivElement).style.transform).not.toBe(firstAutoplayTransform);

    act(() => {
      fireEvent.pointerEnter(preview, { pointerType: "mouse" });
      fireEvent.pointerMove(preview, {
        clientX: 360,
        clientY: 144,
        pointerType: "mouse",
      });
      vi.advanceTimersByTime(96);
    });

    const shiftedGuideX = Number((guideLine as SVGLineElement).getAttribute("x1"));
    expect(shiftedGuideX).toBeGreaterThan(initialGuideX);
  });

  it("pauses while hidden and resumes autoplay automatically when visible again", () => {
    render(<HomeHeroLivePreview />);

    const stageObject = document.querySelector('[data-preview-stage-object="true"]');

    expect(stageObject).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(64);
    });

    const visibleTransform = (stageObject as HTMLDivElement).style.transform;

    act(() => {
      visibilityState = "hidden";
      document.dispatchEvent(new Event("visibilitychange"));
      vi.advanceTimersByTime(160);
    });

    expect((stageObject as HTMLDivElement).style.transform).toBe(visibleTransform);

    act(() => {
      visibilityState = "visible";
      document.dispatchEvent(new Event("visibilitychange"));
      vi.advanceTimersByTime(64);
    });

    expect((stageObject as HTMLDivElement).style.transform).not.toBe(visibleTransform);
  });

  it("stays static under reduced motion", () => {
    reducedMotion = true;

    render(<HomeHeroLivePreview />);

    const stageObject = document.querySelector('[data-preview-stage-object="true"]');

    expect(stageObject).not.toBeNull();

    const initialTransform = (stageObject as HTMLDivElement).style.transform;

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect((stageObject as HTMLDivElement).style.transform).toBe(initialTransform);
  });

  it("lets the cue chips bias the preview emphasis", () => {
    render(<HomeHeroLivePreview />);

    const preview = screen.getByRole("group", {
      name: /live preview of simple harmonic motion/i,
    });
    const accelerationButton = screen.getByRole("button", { name: /acceleration/i });

    expect(accelerationButton).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(accelerationButton);

    expect(accelerationButton).toHaveAttribute("aria-pressed", "true");
    expect(preview).toHaveAttribute("data-preview-active-cue", "acceleration");
  });
});
