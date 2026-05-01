import { describe, expect, it } from "vitest";
import { getConceptBySlug } from "@/lib/content";
import { resolveNoticePrompts } from "@/lib/learning/noticePrompts";

describe("notice prompt selection", () => {
  it("prefers graph-specific prompts over the generic fallback", () => {
    const concept = getConceptBySlug("simple-harmonic-motion");
    const prompts = resolveNoticePrompts(concept.noticePrompts, {
      params: {
        amplitude: 1.4,
        omega: 1.8,
        phase: 0,
      },
      activeGraphId: "velocity",
      activeGraphLabel: "Velocity over time",
      interactionMode: "explore",
      activeCompareTarget: null,
      focusedOverlayId: null,
      visibleOverlayIds: ["equilibriumLine", "motionTrail", "velocityVector"],
      timeSource: "live",
      time: 0.8,
      lastChangedParam: null,
    });

    expect(prompts[0]?.id).toBe("shm-notice-velocity-graph");
  });

  it("surfaces compare prompts when compare mode is active", () => {
    const concept = getConceptBySlug("projectile-motion");
    const prompts = resolveNoticePrompts(concept.noticePrompts, {
      params: {
        speed: 18,
        angle: 45,
        gravity: 9.8,
      },
      activeGraphId: "trajectory",
      activeGraphLabel: "Trajectory",
      interactionMode: "compare",
      activeCompareTarget: "b",
      focusedOverlayId: "rangeMarker",
      visibleOverlayIds: ["velocityVector", "apexMarker", "rangeMarker"],
      timeSource: "live",
      time: 0.4,
      lastChangedParam: "angle",
    });

    expect(prompts[0]?.id).toBe("pm-notice-compare");
    expect(prompts[0]?.contextBadges).toContain("Setup B is active");
  });

  it("matches inspected-time prompts in transient damping mode", () => {
    const concept = getConceptBySlug("damping-resonance");
    const prompts = resolveNoticePrompts(concept.noticePrompts, {
      params: {
        dampingRatio: 0.18,
        naturalFrequency: 2,
        driveFrequency: 1.6,
        driveAmplitude: 1,
        responseMode: false,
      },
      activeGraphId: "transient",
      activeGraphLabel: "Damped motion",
      interactionMode: "explore",
      activeCompareTarget: null,
      focusedOverlayId: "responseEnvelope",
      visibleOverlayIds: ["forcingArrow", "responseEnvelope"],
      timeSource: "inspect",
      time: 2.4,
      lastChangedParam: null,
    });

    expect(prompts[0]?.id).toBe("dr-notice-inspect");
    expect(prompts[0]?.contextBadges).toContain("Paused at t = 2.40 s");
  });
});
