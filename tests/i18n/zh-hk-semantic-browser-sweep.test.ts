// @vitest-environment node

import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

async function importSemanticAudit() {
  return import(pathToFileURL(path.resolve(process.cwd(), "scripts/zhhk-semantic-audit.mjs")).href);
}

function visibleEntry(text: string, overrides: Record<string, unknown> = {}) {
  return {
    text,
    nearestHeading: "測試頁",
    landmark: "main: 測試頁",
    elementTag: "p",
    elementRole: null,
    sourceType: "visible text",
    isAccessibilityLabel: false,
    isControlLabel: false,
    snippets: [text],
    ...overrides,
  };
}

describe("zh-HK semantic browser sweep audit", () => {
  it("flags semantic zh-HK failures that simple English leak checks miss", async () => {
    const { analyzeZhHkSemanticEntries } = await importSemanticAudit();
    const findings = analyzeZhHkSemanticEntries(
      [
        visibleEntry("項目 項目 項目"),
        visibleEntry("項目 is 項目"),
        visibleEntry("項目@開啟模式項目.項目"),
        visibleEntry("这是设置页面"),
        visibleEntry("messages.help.openTutorial"),
        visibleEntry("Open Help / Tutorial", {
          elementTag: "button",
          elementRole: "button",
          sourceType: "aria-label",
          isAccessibilityLabel: true,
          isControlLabel: true,
        }),
      ],
      "/zh-HK/concepts/simple-harmonic-motion",
    );

    expect(findings.map((finding: { kind: string }) => finding.kind)).toEqual(
      expect.arrayContaining([
        "GENERIC_FILLER_REPEAT",
        "MIXED_ENGLISH_FUNCTION_WORD",
        "PROTECTED_TOKEN_CORRUPTION",
        "SIMPLIFIED_CHAR",
        "MESSAGE_KEY_LEAK",
        "UNTRANSLATED_ACCESSIBILITY_LABEL",
      ]),
    );
  });

  it("allows valid product names, math variables, units, and intentional English names", async () => {
    const { analyzeZhHkSemanticEntries } = await importSemanticAudit();
    const findings = analyzeZhHkSemanticEntries(
      [
        visibleEntry("Open Model Lab 會保留你的學習進度"),
        visibleEntry("用 v = u + at 比較兩段運動"),
        visibleEntry("重力場強度接近 9.8 m/s^2"),
        visibleEntry("Stripe Premium 訂閱狀態"),
        visibleEntry("Ada Lovelace 的演算法例子"),
        visibleEntry("pH shifts lower when acid character exceeds base character", {
          elementTag: "span",
          elementRole: "math",
          sourceType: "aria-label",
          isAccessibilityLabel: true,
        }),
        visibleEntry("pH平衡故事: \\text{pH shifts lower when acid character exceeds base character}"),
      ],
      "/zh-HK/concepts/projectile-motion",
    );

    expect(findings).toEqual([]);
  });

  it("groups findings by likely source category for the JSON artifact", async () => {
    const { analyzeZhHkSemanticEntries, buildZhHkSemanticReport } = await importSemanticAudit();
    const findings = analyzeZhHkSemanticEntries(
      [
        visibleEntry("項目@開啟模式項目.項目"),
        visibleEntry("Open Help / Tutorial", {
          elementTag: "button",
          elementRole: "button",
          sourceType: "aria-label",
          isAccessibilityLabel: true,
          isControlLabel: true,
        }),
      ],
      "/zh-HK/account",
    );
    const report = buildZhHkSemanticReport(findings);

    expect(report.issueCount).toBeGreaterThanOrEqual(2);
    expect(
      report.bySourceCategory.find(
        (group: { sourceCategory: string }) => group.sourceCategory === "protected-token corruption",
      )?.issueCount,
    ).toBeGreaterThan(0);
    expect(
      report.bySourceCategory.find(
        (group: { sourceCategory: string }) => group.sourceCategory === "accessibility label",
      )?.issueCount,
    ).toBeGreaterThan(0);
  });
});
