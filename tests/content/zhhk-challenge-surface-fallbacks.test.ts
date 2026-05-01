import { describe, expect, it } from "vitest";
import {
  getGuidedCollectionBySlug,
  getStarterTrackBySlug,
} from "@/lib/content";
import { getLocalizedChallengeDiscoveryIndex } from "@/lib/i18n/challenge-discovery";
import {
  localizeGuidedCollection,
  localizeStarterTrack,
  resolveLocalizedChallengeDisplayCopy,
} from "@/lib/i18n/content";

describe("zh-HK challenge surface fallbacks", () => {
  it("replaces untranslated challenge discovery card copy with zh-HK fallback copy", () => {
    const index = getLocalizedChallengeDiscoveryIndex("zh-HK");
    const entry = index.entries.find(
      (item) => item.id === "secm-ch-balance-heavy-right-load",
    );

    expect(entry).toBeDefined();
    expect(entry?.title).toContain("挑戰");
    expect(entry?.title).not.toBe("Balance the heavy right load");
    expect(entry?.prompt).toBe("打開這個挑戰以查看完整任務要求與目標。");
  });

  it("keeps starter-track checkpoints and entry diagnostics out of raw English when challenge overlays are missing", () => {
    const baseTrack = getStarterTrackBySlug("rotational-mechanics");
    const track = localizeStarterTrack(baseTrack, "zh-HK");
    const checkpoint = track.checkpoints.find(
      (item) => item.id === "rotational-balance-checkpoint",
    );
    const diagnosticProbe = track.entryDiagnostic?.probes.find(
      (item) => item.id === "rotational-mechanics-balance-checkpoint-probe",
    );
    const baseDiagnosticProbe = baseTrack.entryDiagnostic?.probes.find(
      (item) => item.id === "rotational-mechanics-balance-checkpoint-probe",
    );

    expect(checkpoint).toBeDefined();
    expect(checkpoint?.title).toContain("挑戰");
    expect(checkpoint?.title).not.toBe("Balance the heavy right load");
    expect(checkpoint?.summary).toBe("打開這個挑戰以查看完整任務要求與目標。");
    expect(diagnosticProbe?.title).not.toBe(baseDiagnosticProbe?.title);
    expect(diagnosticProbe?.title).toMatch(/[\u3400-\u9fff]/u);
    expect(diagnosticProbe?.summary).not.toBe(baseDiagnosticProbe?.summary);
    expect(diagnosticProbe?.summary).toMatch(/[\u3400-\u9fff]/u);
  });

  it("applies the same zh-HK fallback copy to guided-collection challenge probes and quick-test probes", () => {
    const baseCollection = getGuidedCollectionBySlug("waves-evidence-loop");
    const collection = localizeGuidedCollection(baseCollection, "zh-HK");
    const quickTestProbe = collection.entryDiagnostic?.probes.find(
      (item) => item.id === "waves-collection-shm-quick-test",
    );
    const challengeProbe = collection.entryDiagnostic?.probes.find(
      (item) => item.id === "waves-collection-dark-band-probe",
    );
    const baseQuickTestProbe = baseCollection.entryDiagnostic?.probes.find(
      (item) => item.id === "waves-collection-shm-quick-test",
    );
    const baseChallengeProbe = baseCollection.entryDiagnostic?.probes.find(
      (item) => item.id === "waves-collection-dark-band-probe",
    );

    expect(quickTestProbe?.title).toContain("快速測驗");
    expect(quickTestProbe?.summary).not.toBe(baseQuickTestProbe?.summary);
    expect(quickTestProbe?.summary).toMatch(/[\u3400-\u9fff]/u);
    expect(challengeProbe?.title).toContain("挑戰");
    expect(challengeProbe?.summary).not.toBe(baseChallengeProbe?.summary);
    expect(challengeProbe?.summary).toMatch(/[\u3400-\u9fff]/u);
  });

  it("falls back to safe zh-HK copy when localized challenge strings are placeholders or optimized English", () => {
    const placeholderCopy = resolveLocalizedChallengeDisplayCopy("zh-HK", {
      concept: { title: "Dynamic Equilibrium", shortTitle: "Dynamic Equilibrium" },
      fallbackTitle: "Create a shift, then let it rebalance",
      fallbackPrompt: "Move the system, then wait for it to settle again.",
      translatedTitle: "[\"challengeMode\",\"items\",\"id:de-ch-disturb-then-rebalance\",\"title\"]",
      translatedPrompt: "[\"challengeMode\",\"items\",\"id:de-ch-disturb-then-rebalance\",\"prompt\"]",
      challengeNumber: 1,
    });
    const englishCopy = resolveLocalizedChallengeDisplayCopy("zh-HK", {
      concept: { title: "Oscillation Energy", shortTitle: "Oscillation Energy" },
      fallbackTitle: "Build five joules",
      fallbackPrompt: "Raise the stored energy to about 5 J.",
      translatedTitle: "Build five joules",
      translatedPrompt: "Raise the stored energy to about 5 J.",
      challengeNumber: 2,
    });

    expect(placeholderCopy.title).toContain("挑戰");
    expect(placeholderCopy.title).not.toContain("[\"");
    expect(placeholderCopy.prompt).toBe("打開這個挑戰以查看完整任務要求與目標。");

    expect(englishCopy.title).toContain("挑戰");
    expect(englishCopy.title).not.toBe("Build five joules");
    expect(englishCopy.prompt).toBe("打開這個挑戰以查看完整任務要求與目標。");
  });
});
