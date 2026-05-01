import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateContentVariantBundle } from "./generate-content-variant-bundle.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultRepoRoot = path.resolve(__dirname, "..");

export function buildContentVariantStatusReport(repoRoot = defaultRepoRoot) {
  const { manifest } = generateContentVariantBundle(repoRoot, { writeFiles: false });
  const errors = [...manifest.problems];
  const warnings = [];

  for (const entry of Object.values(manifest.concepts)) {
    if (entry.optimized.exists && !entry.optimized.valid) {
      errors.push(
        `optimized:${entry.slug}: ${entry.optimized.issues[0] ?? "Optimized overlay is invalid."}`,
      );
    }

    if (entry.optimized.stale) {
      warnings.push(`optimized:${entry.slug}: derived content is stale.`);
    }

    for (const [locale, candidate] of Object.entries(entry.locales)) {
      if (candidate.exists && !candidate.valid) {
        errors.push(
          `${locale}:${entry.slug}: ${candidate.issues[0] ?? "Localized overlay is invalid."}`,
        );
      }

      if (candidate.stale) {
        warnings.push(`${locale}:${entry.slug}: derived content is stale.`);
      }

      if (candidate.usesFallbackFields) {
        const samplePaths =
          candidate.fallbackFieldPaths.length > 0
            ? ` (${candidate.fallbackFieldPaths.slice(0, 3).join(", ")})`
            : "";
        warnings.push(
          `${locale}:${entry.slug}: localized overlay falls back to ${candidate.fallbackBaseVariant ?? "original"} for ${candidate.fallbackFieldCount} field(s)${samplePaths}.`,
        );
      }
    }
  }

  return {
    manifest,
    errors,
    warnings,
  };
}

export function formatContentVariantStatusReport(report) {
  const lines = [
    `Canonical concepts: ${report.manifest.summary.canonicalConceptCount}`,
    `Optimized English: detected=${report.manifest.summary.optimized.detected}, usable=${report.manifest.summary.optimized.usable}, invalid=${report.manifest.summary.optimized.invalid}, stale=${report.manifest.summary.optimized.stale}, missing=${report.manifest.summary.optimized.missing}`,
  ];

  for (const locale of report.manifest.locales) {
    const summary = report.manifest.summary.locales[locale];
    lines.push(
      `${locale}: detected=${summary.detected}, usable=${summary.usable}, invalid=${summary.invalid}, stale=${summary.stale}, withFallback=${summary.withFallback}, missing=${summary.missing}`,
    );
  }

  if (report.errors.length > 0) {
    lines.push("");
    lines.push("Errors:");
    lines.push(...report.errors.map((error) => `- ${error}`));
  }

  if (report.warnings.length > 0) {
    lines.push("");
    lines.push("Warnings:");
    lines.push(...report.warnings.map((warning) => `- ${warning}`));
  }

  return lines.join("\n");
}

if (process.argv[1] === __filename) {
  const args = process.argv.slice(2);
  const repoRoot = args.find((argument) => !argument.startsWith("--")) ?? defaultRepoRoot;
  const validateOnly = args.includes("--validate");
  const json = args.includes("--json");
  const report = buildContentVariantStatusReport(repoRoot);

  if (json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    console.log(formatContentVariantStatusReport(report));
  }

  if (validateOnly && report.errors.length > 0) {
    process.exitCode = 1;
  }
}
