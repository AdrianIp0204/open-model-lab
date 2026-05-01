import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  conceptCatalogEntrySchema,
  conceptRichContentSchema,
  getConceptBySlug,
} from "@/lib/content";
import {
  buildConceptScaffold,
  writeConceptScaffold,
} from "../../scripts/scaffold-concept.mjs";

describe("concept scaffold tooling", () => {
  it("builds a blank scaffold that matches the canonical metadata and content shapes", () => {
    const scaffold = buildConceptScaffold({
      slug: "template-check",
      title: "Template Check",
      topic: "Mechanics",
      simulationKind: "projectile",
      blank: true,
    });

    expect(scaffold.template).toBeNull();
    expect(() => conceptCatalogEntrySchema.parse(scaffold.metadataEntry)).not.toThrow();
    expect(() => conceptRichContentSchema.parse(scaffold.content)).not.toThrow();
    expect(scaffold.metadataEntry.recommendedNext).toEqual([]);
    const challengeItem = scaffold.content.challengeMode?.items[0] as
      | { targets?: Array<{ param?: string }> }
      | undefined;
    expect(challengeItem?.targets?.[0]?.param).toBe("primaryValue");
    expect(scaffold.files.readme).toContain("lib/learning/liveWorkedExamples.ts");
  });

  it("auto-seeds from an existing concept when the simulation kind already exists", () => {
    const projectile = getConceptBySlug("projectile-motion", { includeUnpublished: true });
    const scaffold = buildConceptScaffold({
      slug: "projectile-lab-notes",
      title: "Projectile Lab Notes",
      topic: "Mechanics",
      simulationKind: "projectile",
    });

    expect(scaffold.template?.metadata.slug).toBe("projectile-motion");
    expect(scaffold.content.simulation.controls).toEqual(projectile.simulation.controls);
    expect(scaffold.content.graphs).toEqual(projectile.graphs);
    expect(scaffold.files.readme).toContain("projectile-motion");
  });

  it("writes scaffold files and protects existing output unless force is set", () => {
    const scaffold = buildConceptScaffold({
      slug: "written-template",
      title: "Written Template",
      topic: "Mechanics",
      simulationKind: "projectile",
      blank: true,
    });

    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "concept-scaffold-"));

    try {
      const result = writeConceptScaffold(scaffold, tempDirectory);

      expect(result.files).toHaveLength(3);
      expect(fs.readFileSync(path.join(tempDirectory, "catalog-entry.json"), "utf8")).toContain(
        '"slug": "written-template"',
      );
      expect(fs.readFileSync(path.join(tempDirectory, "concept-content.json"), "utf8")).toContain(
        '"sections"',
      );
      expect(fs.readFileSync(path.join(tempDirectory, "README.md"), "utf8")).toContain(
        "Recommended workflow",
      );

      expect(() => writeConceptScaffold(scaffold, tempDirectory)).toThrow(
        /overwrite existing scaffold file/i,
      );

      expect(() =>
        writeConceptScaffold(scaffold, tempDirectory, {
          force: true,
        }),
      ).not.toThrow();
    } finally {
      fs.rmSync(tempDirectory, { recursive: true, force: true });
    }
  });
});
