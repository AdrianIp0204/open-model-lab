import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  conceptCatalogSchema,
  conceptRichContentSchema,
  guidedCollectionCatalogSchema,
  starterTrackCatalogSchema,
  subjectCatalogSchema,
} from "@/lib/content";
import { listConceptContentFileKeys } from "@/lib/content/content-registry";

const conceptContentDirectory = path.join(process.cwd(), "content", "concepts");
const conceptCatalogPath = path.join(
  process.cwd(),
  "content",
  "catalog",
  "concepts.json",
);
const starterTrackCatalogPath = path.join(
  process.cwd(),
  "content",
  "catalog",
  "starter-tracks.json",
);
const guidedCollectionCatalogPath = path.join(
  process.cwd(),
  "content",
  "catalog",
  "guided-collections.json",
);
const subjectCatalogPath = path.join(
  process.cwd(),
  "content",
  "catalog",
  "subjects.json",
);

describe("concept content schemas", () => {
  it("accepts the shipped rich content files and canonical catalog file", () => {
    const contentFiles = fs
      .readdirSync(conceptContentDirectory)
      .filter((file) => file.endsWith(".json"));

    expect(contentFiles.length).toBeGreaterThan(90);
    expect(listConceptContentFileKeys().sort()).toEqual(
      contentFiles.map((file) => file.replace(/\.json$/u, "")).sort(),
    );

    for (const file of contentFiles) {
      const raw = fs.readFileSync(path.join(conceptContentDirectory, file), "utf8");
      const parsed = JSON.parse(raw);
      expect(() => conceptRichContentSchema.parse(parsed)).not.toThrow();
    }

    const catalogRaw = fs.readFileSync(conceptCatalogPath, "utf8");
    const catalog = JSON.parse(catalogRaw);
    expect(() => conceptCatalogSchema.parse(catalog)).not.toThrow();

    const starterTrackRaw = fs.readFileSync(starterTrackCatalogPath, "utf8");
    const starterTrackCatalog = JSON.parse(starterTrackRaw);
    expect(() => starterTrackCatalogSchema.parse(starterTrackCatalog)).not.toThrow();

    const guidedCollectionRaw = fs.readFileSync(guidedCollectionCatalogPath, "utf8");
    const guidedCollectionCatalog = JSON.parse(guidedCollectionRaw);
    expect(() => guidedCollectionCatalogSchema.parse(guidedCollectionCatalog)).not.toThrow();

    const subjectCatalogRaw = fs.readFileSync(subjectCatalogPath, "utf8");
    const subjectCatalog = JSON.parse(subjectCatalogRaw);
    expect(() => subjectCatalogSchema.parse(subjectCatalog)).not.toThrow();
  });

  it("rejects rich content files that try to smuggle canonical metadata back in", () => {
    const raw = fs.readFileSync(
      path.join(conceptContentDirectory, "simple-harmonic-motion.json"),
      "utf8",
    );
    const richContent = JSON.parse(raw);

    expect(
      conceptRichContentSchema.safeParse({
        ...richContent,
        slug: "simple-harmonic-motion",
      }).success,
    ).toBe(false);
  });

  it("rejects duplicate page-framework overrides and stale lower-page notice keys", () => {
    const raw = fs.readFileSync(
      path.join(conceptContentDirectory, "simple-harmonic-motion.json"),
      "utf8",
    );
    const richContent = JSON.parse(raw);

    expect(
      conceptRichContentSchema.safeParse({
        ...richContent,
        pageFramework: {
          sections: [{ id: "keyIdeas" }, { id: "keyIdeas" }],
        },
      }).success,
    ).toBe(false);

    expect(
      conceptRichContentSchema.safeParse({
        ...richContent,
        sections: {
          ...richContent.sections,
          whatToNotice: richContent.sections.keyIdeas,
        },
      }).success,
    ).toBe(false);
  });

  it("rejects duplicate challenge ids inside challenge mode", () => {
    const raw = fs.readFileSync(
      path.join(conceptContentDirectory, "simple-harmonic-motion.json"),
      "utf8",
    );
    const richContent = JSON.parse(raw);

    expect(
      conceptRichContentSchema.safeParse({
        ...richContent,
        challengeMode: {
          ...richContent.challengeMode,
          items: [
            richContent.challengeMode.items[0],
            {
              ...richContent.challengeMode.items[0],
            },
          ],
        },
      }).success,
    ).toBe(false);
  });

  it("accepts compact challenge requirements and targets without manual checks", () => {
    const raw = fs.readFileSync(
      path.join(conceptContentDirectory, "simple-harmonic-motion.json"),
      "utf8",
    );
    const richContent = JSON.parse(raw);

    expect(
      conceptRichContentSchema.safeParse({
        ...richContent,
        challengeMode: {
          title: "Challenge mode",
          items: [
            {
              id: "compact-target",
              title: "Compact target",
              style: "target-setting",
              prompt: "Tune the timing.",
              successMessage: "Solved.",
              requirements: {
                graphId: "displacement",
              },
              targets: [
                {
                  metric: "period",
                  min: 1.9,
                  max: 2.1,
                  displayUnit: "s",
                },
              ],
            },
          ],
        },
      }).success,
    ).toBe(true);
  });

  it("rejects malformed compact challenge targets", () => {
    const raw = fs.readFileSync(
      path.join(conceptContentDirectory, "simple-harmonic-motion.json"),
      "utf8",
    );
    const richContent = JSON.parse(raw);

    expect(
      conceptRichContentSchema.safeParse({
        ...richContent,
        challengeMode: {
          title: "Challenge mode",
          items: [
            {
              id: "broken-target",
              title: "Broken target",
              style: "target-setting",
              prompt: "Broken.",
              successMessage: "Nope.",
              targets: [
                {
                  param: "amplitude",
                  metric: "period",
                  min: 1,
                  max: 2,
                },
              ],
            },
          ],
        },
      }).success,
    ).toBe(false);
  });
});
