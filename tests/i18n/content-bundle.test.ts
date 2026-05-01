// @vitest-environment node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

async function importScriptModule(relativePath: string) {
  return import(pathToFileURL(path.resolve(process.cwd(), relativePath)).href);
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeLegacyLocaleFixture(root: string) {
  writeJson(path.join(root, "content", "i18n", "zh-HK", "catalog.json"), {
    subjects: {
      physics: {
        title: "物理",
        description: "Legacy physics description",
      },
    },
    topics: {
      mechanics: {
        title: "力學",
        description: "Legacy mechanics description",
      },
    },
  });

  writeJson(path.join(root, "content", "i18n", "zh-HK", "concepts.json"), {
    "simple-harmonic-motion": {
      title: "Legacy simple harmonic motion",
      summary: "Legacy simple harmonic motion summary",
    },
    "uniform-circular-motion": {
      title: "Legacy uniform circular motion",
      summary: "Legacy uniform circular motion summary",
    },
  });
}

describe("i18n content bundle generation", () => {
  it("splits legacy monolith overlays into shard files and emits the generated bundle", async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "open-model-lab-i18n-bundle-"));

    try {
      writeLegacyLocaleFixture(tempRoot);

      const { generateI18nContentBundle } = await importScriptModule(
        "scripts/generate-i18n-content-bundle.mjs",
      );
      const result = generateI18nContentBundle(tempRoot);

      expect(result).toMatchObject({
        localeCount: 1,
        catalogShardCount: 2,
        conceptShardCount: 2,
      });
      expect(path.relative(tempRoot, result.outputFilePath)).toBe(
        path.normalize("lib/i18n/generated/content-bundle.ts"),
      );

      expect(
        JSON.parse(
          fs.readFileSync(
            path.join(tempRoot, "content", "i18n", "zh-HK", "catalog", "subjects.json"),
            "utf8",
          ),
        ),
      ).toEqual({
        physics: {
          title: "物理",
          description: "Legacy physics description",
        },
      });
      expect(
        JSON.parse(
          fs.readFileSync(
            path.join(tempRoot, "content", "i18n", "zh-HK", "concepts", "simple-harmonic-motion.json"),
            "utf8",
          ),
        ),
      ).toEqual({
        title: "Legacy simple harmonic motion",
        summary: "Legacy simple harmonic motion summary",
      });

      expect(
        JSON.parse(
          fs.readFileSync(path.join(tempRoot, "content", "i18n", "generated", "zh-HK.json"), "utf8"),
        ),
      ).toEqual({
        catalog: {
          subjects: {
            physics: {
              title: "物理",
              description: "Legacy physics description",
            },
          },
          topics: {
            mechanics: {
              title: "力學",
              description: "Legacy mechanics description",
            },
          },
        },
        concepts: {
          "simple-harmonic-motion": {
            title: "Legacy simple harmonic motion",
            summary: "Legacy simple harmonic motion summary",
          },
          "uniform-circular-motion": {
            title: "Legacy uniform circular motion",
            summary: "Legacy uniform circular motion summary",
          },
        },
      });

      const generatedBundle = fs.readFileSync(result.outputFilePath, "utf8");
      expect(generatedBundle).toContain(
        'import zh_HKContentBundle from "../../../content/i18n/generated/zh-HK.json";',
      );

      const runnerPath = path.join(tempRoot, "run-generate-i18n-bundle.mjs");
      fs.writeFileSync(
        runnerPath,
        [
          `import { generateI18nContentBundle } from ${JSON.stringify(
            pathToFileURL(path.resolve(process.cwd(), "scripts/generate-i18n-content-bundle.mjs")).href,
          )};`,
          `const result = generateI18nContentBundle(process.argv[2]);`,
          "process.stdout.write(JSON.stringify(result));",
        ].join("\n"),
        "utf8",
      );

      const stdout = execFileSync(process.execPath, [runnerPath, tempRoot], {
        encoding: "utf8",
      }).trim();

      expect(JSON.parse(stdout)).toEqual({
        outputFilePath: result.outputFilePath,
        localeCount: 1,
        catalogShardCount: 2,
        conceptShardCount: 2,
      });
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("rejects malformed legacy overlay JSON before generating a bundle", async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "open-model-lab-i18n-invalid-"));

    try {
      writeJson(path.join(tempRoot, "content", "i18n", "zh-HK", "catalog.json"), {
        subjects: {
          physics: {
            title: "物理",
          },
        },
      });
      fs.writeFileSync(
        path.join(tempRoot, "content", "i18n", "zh-HK", "concepts.json"),
        "{ this is not valid json",
        "utf8",
      );

      const { generateI18nContentBundle } = await importScriptModule(
        "scripts/generate-i18n-content-bundle.mjs",
      );

      expect(() => generateI18nContentBundle(tempRoot)).toThrow();
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
