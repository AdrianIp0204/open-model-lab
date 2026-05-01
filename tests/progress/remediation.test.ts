import { describe, expect, it } from "vitest";
import {
  mergeSavedCompareSetupRemediationSuggestions,
  type ReviewRemediationSuggestion,
} from "@/lib/progress";

describe("saved compare setup remediation", () => {
  it("inserts a saved compare recovery action after prerequisite review for missed checks", () => {
    const suggestions = [
      {
        id: "prerequisite-vectors",
        kind: "prerequisite-concept",
        title: "Review Vectors",
        note: "Refresh vectors first.",
        action: {
          href: "/concepts/vectors-components",
          label: "Review Vectors",
          kind: "concept",
          note: "Vectors first.",
        },
      },
      {
        id: "track-recap-projectile",
        kind: "track-recap",
        title: "Use Motion recap",
        note: "Return through the recap.",
        action: {
          href: "/tracks/motion-and-circular-motion?mode=recap",
          label: "Open recap",
          kind: "track-recap",
          note: "Return through the recap.",
        },
      },
    ] satisfies ReviewRemediationSuggestion[];

    const merged = mergeSavedCompareSetupRemediationSuggestions(
      suggestions,
      {
        concept: {
          slug: "projectile-motion",
          title: "Projectile Motion",
        },
        reasonKind: "missed-checks",
        primaryAction: {
          href: "/concepts/projectile-motion#quick-test",
          label: "Retry quick test",
          kind: "quick-test",
          note: null,
        },
        secondaryAction: null,
      },
      [
        {
          id: "saved-compare-1",
          conceptSlug: "projectile-motion",
          name: "Fast arc vs high arc",
          updatedAt: "2026-03-29T00:05:00.000Z",
          setupALabel: "Fast arc",
          setupBLabel: "High arc",
          href: "/concepts/projectile-motion?state=v1.saved#live-bench",
        },
      ],
    );

    expect(merged).toHaveLength(2);
    expect(merged[0]?.kind).toBe("prerequisite-concept");
    expect(merged[1]).toMatchObject({
      kind: "saved-compare-setup",
      title: "Reopen Fast arc vs high arc",
      action: {
        href: "/concepts/projectile-motion?state=v1.saved#live-bench",
        label: "Open saved setup",
      },
    });
  });

  it("leaves stale remediation suggestions unchanged even when a saved compare bench exists", () => {
    const suggestions = [
      {
        id: "track-recap-projectile",
        kind: "track-recap",
        title: "Use Motion recap",
        note: "Return through the recap.",
        action: {
          href: "/tracks/motion-and-circular-motion?mode=recap",
          label: "Open recap",
          kind: "track-recap",
          note: "Return through the recap.",
        },
      },
    ] satisfies ReviewRemediationSuggestion[];

    const merged = mergeSavedCompareSetupRemediationSuggestions(
      suggestions,
      {
        concept: {
          slug: "projectile-motion",
          title: "Projectile Motion",
        },
        reasonKind: "stale",
        primaryAction: {
          href: "/tracks/motion-and-circular-motion?mode=recap",
          label: "Open recap",
          kind: "track-recap",
          note: "Return through the recap.",
        },
        secondaryAction: {
          href: "/concepts/projectile-motion",
          label: "Review concept",
          kind: "concept",
          note: null,
        },
      },
      [
        {
          id: "saved-compare-1",
          conceptSlug: "projectile-motion",
          name: "Fast arc vs high arc",
          updatedAt: "2026-03-29T00:05:00.000Z",
          setupALabel: "Fast arc",
          setupBLabel: "High arc",
          href: "/concepts/projectile-motion?state=v1.saved#live-bench",
        },
      ],
    );

    expect(merged).toEqual(suggestions);
  });
});
