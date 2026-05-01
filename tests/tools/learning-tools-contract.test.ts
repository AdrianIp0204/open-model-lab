import { describe, expect, it } from "vitest";
import enMessages from "@/messages/en.json";
import zhHkMessages from "@/messages/zh-HK.json";
import {
  learningToolDefinitions,
  learningToolRequiredCopyFields,
} from "@/lib/tools/learning-tools";

describe("learning tools registry contract", () => {
  it("keeps stable unique ids and hrefs", () => {
    const ids = learningToolDefinitions.map((tool) => tool.id);
    const hrefs = learningToolDefinitions.map((tool) => tool.href);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(hrefs).size).toBe(hrefs.length);

    for (const tool of learningToolDefinitions) {
      expect(tool.id.trim().length).toBeGreaterThan(0);
      expect(tool.href.startsWith("/")).toBe(true);
      expect(tool.navMatchPrefixes.length).toBeGreaterThan(0);
      expect(tool.navMatchPrefixes.every((prefix) => prefix.startsWith("/"))).toBe(true);
    }
  });

  it("keeps required localized copy fields for every registry entry", () => {
    const bundles = [enMessages, zhHkMessages];

    for (const bundle of bundles) {
      for (const tool of learningToolDefinitions) {
        const localizedEntry = bundle.ToolsDirectoryPage.tools[tool.messageKey];

        expect(localizedEntry).toBeDefined();

        for (const field of learningToolRequiredCopyFields) {
          expect(localizedEntry[field].trim().length).toBeGreaterThan(0);
        }
      }
    }
  });
});
