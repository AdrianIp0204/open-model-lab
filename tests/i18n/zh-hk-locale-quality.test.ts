// @vitest-environment node

import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("zh-HK locale quality checker", () => {
  it("passes on the checked-in zh-HK locale assets", () => {
    const scriptPath = path.join(process.cwd(), "scripts", "check-zhhk-locale-quality.mjs");
    const stdout = execFileSync(process.execPath, [scriptPath], {
      cwd: process.cwd(),
      encoding: "utf8",
    });

    const result = JSON.parse(stdout.trim()) as {
      checkedFileCount: number;
      issueCount: number;
      outputPath: string;
    };

    expect(result.checkedFileCount).toBeGreaterThan(0);
    expect(result.issueCount).toBe(0);
  });
});
