// @vitest-environment node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const publicAdsTxtPath = path.join(process.cwd(), "public", "ads.txt");
const publicAdsExampleTxtPath = path.join(process.cwd(), "public", "ads.example.txt");
const legacyRoutePath = path.join(process.cwd(), "app", "ads.txt", "route.ts");
const legacyRepoRootAdsTxtPath = path.join(process.cwd(), "ads.txt");

function gitLsFiles(relativePath: string) {
  const result = spawnSync("git", ["ls-files", "--", relativePath], {
    cwd: process.cwd(),
    encoding: "utf8",
    windowsHide: true,
  });

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ls-files failed for ${relativePath}`);
  }

  return result.stdout
    .split(/\r?\n/u)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

describe("ads.txt static asset", () => {
  it("keeps only the placeholder ads.txt source tracked", () => {
    expect(gitLsFiles("public/ads.txt")).toEqual([]);
    expect(gitLsFiles("public/ads.example.txt")).toEqual(["public/ads.example.txt"]);
    expect(fs.existsSync(publicAdsExampleTxtPath)).toBe(true);
    expect(fs.readFileSync(publicAdsExampleTxtPath, "utf8")).toContain(
      "pub-your-publisher-id",
    );
  });

  it("does not leave a dynamic route or duplicate repo-root source behind", () => {
    expect(fs.existsSync(legacyRoutePath)).toBe(false);
    expect(fs.existsSync(legacyRepoRootAdsTxtPath)).toBe(false);
    expect(gitLsFiles("ads.txt")).toEqual([]);
  });

  it("allows a private materialized public/ads.txt without tracking it", () => {
    if (!fs.existsSync(publicAdsTxtPath)) {
      return;
    }

    expect(gitLsFiles("public/ads.txt")).toEqual([]);
  });
});
