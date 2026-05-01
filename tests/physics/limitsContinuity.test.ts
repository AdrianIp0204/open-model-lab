import { describe, expect, it } from "vitest";
import {
  buildLimitsContinuitySeries,
  describeLimitsContinuityState,
  sampleLimitsContinuityState,
} from "@/lib/physics";

describe("limits-continuity helpers", () => {
  it("samples removable-hole behavior with a shared finite limit and a different actual point", () => {
    const snapshot = sampleLimitsContinuityState({
      caseIndex: 1,
      approachDistance: 0.1,
    });

    expect(snapshot.caseKey).toBe("removable-hole");
    expect(snapshot.finiteLimitValue).toBeCloseTo(0.9, 6);
    expect(snapshot.actualValue).toBeCloseTo(2.4, 6);
    expect(snapshot.leftValue).toBeCloseTo(0.865, 6);
    expect(snapshot.rightValue).toBeCloseTo(0.935, 6);
  });

  it("keeps the jump and blow-up cases visually distinct in the sampled state", () => {
    const jump = sampleLimitsContinuityState({
      caseIndex: 2,
      approachDistance: 0.12,
    });
    const blowUp = sampleLimitsContinuityState({
      caseIndex: 3,
      approachDistance: 0.1,
    });

    expect(jump.caseKey).toBe("jump");
    expect(jump.leftLimitValue).toBeCloseTo(-1.1, 6);
    expect(jump.rightLimitValue).toBeCloseTo(1.3, 6);
    expect(jump.finiteLimitValue).toBeNull();

    expect(blowUp.caseKey).toBe("blow-up");
    expect(blowUp.actualDefined).toBe(false);
    expect(blowUp.leftValue).toBeLessThan(0);
    expect(blowUp.rightValue).toBeGreaterThan(0);
  });

  it("builds one-sided approach series and describes the current continuity story plainly", () => {
    const series = buildLimitsContinuitySeries({
      caseIndex: 0,
      approachDistance: 0.6,
    });
    const description = describeLimitsContinuityState({
      caseIndex: 0,
      approachDistance: 0.1,
    });

    expect(series["one-sided-approach"]).toHaveLength(4);
    expect(series["one-sided-approach"][0]?.id).toBe("left-approach");
    expect(series["one-sided-approach"][1]?.id).toBe("right-approach");
    expect(description).toContain("left-hand value");
    expect(description).toContain("continuous");
  });
});
