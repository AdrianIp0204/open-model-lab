// @vitest-environment node

import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const python =
  process.env.PYTHON ??
  process.env.PYTHON3 ??
  (process.platform === "win32" ? "python" : "python3");

function runPython(code: string) {
  const result = spawnSync(python, ["-X", "utf8", "-c", code], {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env,
  });

  return {
    status: result.status ?? 1,
    stdout: String(result.stdout ?? "").trim(),
    stderr: String(result.stderr ?? "").trim(),
  };
}

describe("i18n token protection", () => {
  it("allows reordered protected tokens when the same tokens and counts are preserved", () => {
    const result = runPython(`
import json
from tools.i18n.tokens import format_token_mismatch, token_sequence, token_mismatch_details, tokens_preserved
source = "The model keeps $T_c$, $M$, and $r$ visible."
translated = "The translated sentence keeps $r$, $M$, and $T_c$ visible."
print(json.dumps({
  "tokens": token_sequence(source),
  "preserved": tokens_preserved(source, translated),
  "details": token_mismatch_details(source, translated),
  "message": format_token_mismatch(source, translated),
}, ensure_ascii=False))
    `);

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      tokens: ["$T_c$", "$M$", "$r$"],
      preserved: true,
      details: null,
      message: "tokens preserved",
    });
  });

  it("fails when a protected token is genuinely missing", () => {
    const result = runPython(`
import json
from tools.i18n.tokens import format_token_mismatch, token_mismatch_details, tokens_preserved
source = "The model keeps $T_c$, $M$, and $r$ visible."
translated = "The translated sentence keeps $r$ and $M$ visible."
print(json.dumps({
  "preserved": tokens_preserved(source, translated),
  "details": token_mismatch_details(source, translated),
  "message": format_token_mismatch(source, translated),
}, ensure_ascii=False))
    `);

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout) as {
      preserved: boolean;
      details: {
        sourceTokens: string[];
        translatedTokens: string[];
        missingTokens: string[];
        unexpectedTokens: string[];
      } | null;
      message: string;
    };

    expect(payload.preserved).toBe(false);
    expect(payload.details?.missingTokens).toEqual(["$T_c$"]);
    expect(payload.details?.unexpectedTokens).toEqual([]);
    expect(payload.message).toContain("missing:");
    expect(payload.message).toContain("$T_c$");
    expect(payload.message).toContain("source tokens:");
    expect(payload.message).toContain("translated tokens:");
  });

  it("fails when a protected token is unexpectedly invented", () => {
    const result = runPython(`
import json
from tools.i18n.tokens import format_token_mismatch, token_mismatch_details, tokens_preserved
source = "The model keeps $T_c$ and $M$ visible."
translated = "The translated sentence keeps $T_c$, $M$, and $r$ visible."
print(json.dumps({
  "preserved": tokens_preserved(source, translated),
  "details": token_mismatch_details(source, translated),
  "message": format_token_mismatch(source, translated),
}, ensure_ascii=False))
    `);

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout) as {
      preserved: boolean;
      details: {
        sourceTokens: string[];
        translatedTokens: string[];
        missingTokens: string[];
        unexpectedTokens: string[];
      } | null;
      message: string;
    };

    expect(payload.preserved).toBe(false);
    expect(payload.details?.missingTokens).toEqual([]);
    expect(payload.details?.unexpectedTokens).toEqual(["$r$"]);
    expect(payload.message).toContain("unexpected:");
    expect(payload.message).toContain("$r$");
  });

  it("does not falsely protect ordinary prose compounds like straight-line and time-based", () => {
    const result = runPython(`
import json
from tools.i18n.tokens import token_sequence, tokens_preserved
source = "The straight-line and time-based explanations remain ordinary prose."
translated = "The rewritten sentence keeps the same meaning without protected tokens."
print(json.dumps({
  "tokens": token_sequence(source),
  "preserved": tokens_preserved(source, translated),
}, ensure_ascii=False))
    `);

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      tokens: [],
      preserved: true,
    });
  });

  it("still protects standalone slug-like identifiers when they are actual ids", () => {
    const result = runPython(`
import json
from tools.i18n.tokens import token_sequence, tokens_preserved
source = "simple-harmonic-motion"
print(json.dumps({
  "tokens": token_sequence(source),
  "sameSlug": tokens_preserved(source, "simple-harmonic-motion"),
  "translatedSlug": tokens_preserved(source, "translated title"),
}, ensure_ascii=False))
    `);

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      tokens: ["simple-harmonic-motion"],
      sameSlug: true,
      translatedSlug: false,
    });
  });

  it("still protects formulas, placeholders, code spans, routes, and urls", () => {
    const result = runPython(`
import json
from tools.i18n.tokens import token_sequence, tokens_preserved
source = "Track $x(t)$ with {{value}}, " + chr(96) + "code" + chr(96) + ", /concepts/simple-harmonic-motion, and https://openmodellab.com/start."
translated = "The reordered sentence keeps https://openmodellab.com/start, /concepts/simple-harmonic-motion, " + chr(96) + "code" + chr(96) + ", {{value}}, and $x(t)$."
print(json.dumps({
  "tokens": sorted(token_sequence(source)),
  "preserved": tokens_preserved(source, translated),
}, ensure_ascii=False))
    `);

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout) as {
      tokens: string[];
      preserved: boolean;
    };
    expect(payload.preserved).toBe(true);
    expect(payload.tokens).toEqual([
      "$x(t)$",
      "/concepts/simple-harmonic-motion",
      "`code`",
      "https://openmodellab.com/start",
      "{{value}}",
    ]);
  });

  it("uses compact protected markers and exposes required marker metadata", () => {
    const result = runPython(`
import json
from tools.i18n.tokens import protect_text
protected = protect_text("Track n_i, $F$, {{value}}, and /concepts/simple-harmonic-motion exactly.")
print(json.dumps({
  "masked": protected.masked,
  "requiredMarkers": protected.required_markers(),
  "requiredMarkerMap": protected.required_marker_map(),
  "descriptors": protected.marker_descriptors(),
}, ensure_ascii=False))
    `);

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout) as {
      masked: string;
      requiredMarkers: string[];
      requiredMarkerMap: Record<string, string>;
      descriptors: Array<{ kind: string; marker: string; original: string }>;
    };

    expect(payload.masked).toContain("[[M0]]");
    expect(payload.requiredMarkers.every((marker) => /^\[\[[A-Z]\d+\]\]$/.test(marker))).toBe(true);
    expect(Object.values(payload.requiredMarkerMap)).toEqual(
      expect.arrayContaining(["$F$", "{{value}}", "n_i", "/concepts/simple-harmonic-motion"]),
    );
    expect(payload.descriptors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "math", original: "$F$" }),
        expect.objectContaining({ kind: "placeholder", original: "{{value}}" }),
        expect.objectContaining({ kind: "identifier", original: "n_i" }),
        expect.objectContaining({ kind: "route", original: "/concepts/simple-harmonic-motion" }),
      ]),
    );
  });
});
