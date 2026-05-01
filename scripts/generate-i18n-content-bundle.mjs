import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultRepoRoot = path.resolve(__dirname, "..");

const catalogShardFiles = {
  subjects: ["subjects.json"],
  topics: ["topics.json"],
  starterTracks: ["starterTracks.json", "starter-tracks.json"],
  guidedCollections: ["guidedCollections.json", "guided-collections.json"],
  recommendedGoalPaths: ["recommendedGoalPaths.json", "recommended-goal-paths.json"],
};

const preferredCatalogShardFiles = {
  subjects: "subjects.json",
  topics: "topics.json",
  starterTracks: "starterTracks.json",
  guidedCollections: "guidedCollections.json",
  recommendedGoalPaths: "recommendedGoalPaths.json",
};

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge(baseValue, overrideValue) {
  if (overrideValue === undefined) {
    return baseValue;
  }

  if (Array.isArray(baseValue) && Array.isArray(overrideValue)) {
    return overrideValue;
  }

  if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
    const merged = { ...baseValue };

    for (const [key, value] of Object.entries(overrideValue)) {
      merged[key] = deepMerge(baseValue[key], value);
    }

    return merged;
  }

  return overrideValue;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readJsonIfExists(filePath) {
  return fs.existsSync(filePath) ? readJson(filePath) : null;
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function getRepoPaths(repoRoot) {
  const i18nRoot = path.join(repoRoot, "content", "i18n");

  return {
    repoRoot,
    i18nRoot,
    generatedJsonRoot: path.join(i18nRoot, "generated"),
    generatedBundlePath: path.join(repoRoot, "lib", "i18n", "generated", "content-bundle.ts"),
  };
}

function getLocaleDirectories(i18nRoot) {
  if (!fs.existsSync(i18nRoot)) {
    return [];
  }

  return fs
    .readdirSync(i18nRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "generated")
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

function migrateLegacyCatalogShards(localeDirectoryPath, legacyCatalog) {
  const shardDirectoryPath = path.join(localeDirectoryPath, "catalog");
  let migratedShardCount = 0;

  for (const [catalogKey, value] of Object.entries(legacyCatalog)) {
    const preferredFileName = preferredCatalogShardFiles[catalogKey];

    if (!preferredFileName || !isPlainObject(value)) {
      continue;
    }

    const outputPath = path.join(shardDirectoryPath, preferredFileName);

    if (!fs.existsSync(outputPath)) {
      writeJson(outputPath, value);
      migratedShardCount += 1;
    }
  }

  return migratedShardCount;
}

function loadCatalogBundle(localeDirectoryPath) {
  const legacyCatalog = readJsonIfExists(path.join(localeDirectoryPath, "catalog.json")) ?? {};
  const shardDirectoryPath = path.join(localeDirectoryPath, "catalog");
  const shardCatalog = {};
  const migratedShardCount = migrateLegacyCatalogShards(localeDirectoryPath, legacyCatalog);

  for (const [catalogKey, fileNames] of Object.entries(catalogShardFiles)) {
    for (const fileName of fileNames) {
      const shardPath = path.join(shardDirectoryPath, fileName);

      if (fs.existsSync(shardPath)) {
        shardCatalog[catalogKey] = readJson(shardPath);
        break;
      }
    }
  }

  return {
    bundle: deepMerge(legacyCatalog, shardCatalog),
    shardCount: Object.keys(shardCatalog).length,
    migratedShardCount,
  };
}

function migrateLegacyConceptShards(localeDirectoryPath, legacyConcepts) {
  const conceptDirectoryPath = path.join(localeDirectoryPath, "concepts");
  let migratedShardCount = 0;

  for (const [slug, value] of Object.entries(legacyConcepts)) {
    if (!isPlainObject(value)) {
      continue;
    }

    const outputPath = path.join(conceptDirectoryPath, `${slug}.json`);

    if (!fs.existsSync(outputPath)) {
      writeJson(outputPath, value);
      migratedShardCount += 1;
    }
  }

  return migratedShardCount;
}

function loadConceptBundle(localeDirectoryPath) {
  const legacyConcepts =
    readJsonIfExists(path.join(localeDirectoryPath, "concepts.json")) ?? {};
  const conceptDirectoryPath = path.join(localeDirectoryPath, "concepts");
  const shardConcepts = {};
  const migratedShardCount = migrateLegacyConceptShards(localeDirectoryPath, legacyConcepts);

  if (fs.existsSync(conceptDirectoryPath)) {
    const conceptFiles = fs
      .readdirSync(conceptDirectoryPath, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));

    for (const fileName of conceptFiles) {
      const slug = fileName.replace(/\.json$/u, "");
      shardConcepts[slug] = readJson(path.join(conceptDirectoryPath, fileName));
    }
  }

  return {
    bundle: deepMerge(legacyConcepts, shardConcepts),
    shardCount: Object.keys(shardConcepts).length,
    migratedShardCount,
  };
}

function buildLocaleBundle(localeDirectoryPath) {
  const catalog = loadCatalogBundle(localeDirectoryPath);
  const concepts = loadConceptBundle(localeDirectoryPath);

  return {
    bundle: {
      catalog: catalog.bundle,
      concepts: concepts.bundle,
    },
    catalogShardCount: catalog.shardCount,
    conceptShardCount: concepts.shardCount,
    migratedCatalogShardCount: catalog.migratedShardCount,
    migratedConceptShardCount: concepts.migratedShardCount,
  };
}

function toImportName(locale) {
  return `${locale.replace(/[^a-zA-Z0-9]/g, "_")}ContentBundle`;
}

function writeGeneratedBundleIndex(generatedBundlePath, locales) {
  const lines = [
    "// This file is auto-generated by scripts/generate-i18n-content-bundle.mjs.",
    "// Do not edit it manually.",
    "",
  ];

  for (const locale of locales) {
    lines.push(
      `import ${toImportName(locale)} from "../../../content/i18n/generated/${locale}.json";`,
    );
  }

  lines.push("");
  lines.push("export const contentTranslationsByLocale = {");

  for (const locale of locales) {
    lines.push(`  ${JSON.stringify(locale)}: ${toImportName(locale)},`);
  }

  lines.push("} as const;");
  lines.push("");

  fs.mkdirSync(path.dirname(generatedBundlePath), { recursive: true });
  fs.writeFileSync(generatedBundlePath, `${lines.join("\n")}\n`, "utf8");
}

export function generateI18nContentBundle(repoRoot = defaultRepoRoot) {
  const paths = getRepoPaths(path.resolve(repoRoot));
  const locales = getLocaleDirectories(paths.i18nRoot);
  let catalogShardCount = 0;
  let conceptShardCount = 0;

  fs.mkdirSync(paths.generatedJsonRoot, { recursive: true });

  for (const locale of locales) {
    const localeDirectoryPath = path.join(paths.i18nRoot, locale);
    const result = buildLocaleBundle(localeDirectoryPath);

    catalogShardCount += result.catalogShardCount;
    conceptShardCount += result.conceptShardCount;

    writeJson(path.join(paths.generatedJsonRoot, `${locale}.json`), result.bundle);
  }

  writeGeneratedBundleIndex(paths.generatedBundlePath, locales);

  return {
    outputFilePath: paths.generatedBundlePath,
    localeCount: locales.length,
    catalogShardCount,
    conceptShardCount,
  };
}

if (process.argv[1] === __filename) {
  const result = generateI18nContentBundle(process.argv[2]);
  console.log(
    `Generated i18n content bundle for ${result.localeCount} locale${
      result.localeCount === 1 ? "" : "s"
    }.`,
  );
}
