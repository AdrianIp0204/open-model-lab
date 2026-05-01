import fs from "node:fs";
import path from "node:path";

const DEFAULT_OUTPUT_PATH = path.join(process.cwd(), "public", "ads.txt");

function parseArgs(argv) {
  const parsed = {
    checkOnly: false,
    allowMissing: false,
    outputPath: process.env.OPEN_MODEL_LAB_ADS_TXT_OUTPUT || DEFAULT_OUTPUT_PATH,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--check") {
      parsed.checkOnly = true;
      continue;
    }

    if (token === "--allow-missing") {
      parsed.allowMissing = true;
      continue;
    }

    if (token === "--output") {
      const nextToken = argv[index + 1];
      if (!nextToken) {
        throw new Error("--output requires a file path.");
      }
      parsed.outputPath = path.resolve(nextToken);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  return parsed;
}

function readAdsTxtContent(env = process.env) {
  const directContent = env.OPEN_MODEL_LAB_ADS_TXT_CONTENT?.trim();
  const sourcePath = env.OPEN_MODEL_LAB_ADS_TXT_SOURCE?.trim();

  if (directContent && sourcePath) {
    throw new Error(
      "Set only one of OPEN_MODEL_LAB_ADS_TXT_CONTENT or OPEN_MODEL_LAB_ADS_TXT_SOURCE.",
    );
  }

  if (directContent) {
    return {
      content: directContent.replaceAll("\\n", "\n"),
      source: "OPEN_MODEL_LAB_ADS_TXT_CONTENT",
    };
  }

  if (sourcePath) {
    const absoluteSourcePath = path.resolve(sourcePath);
    if (!fs.existsSync(absoluteSourcePath)) {
      throw new Error("OPEN_MODEL_LAB_ADS_TXT_SOURCE points to a missing file.");
    }

    return {
      content: fs.readFileSync(absoluteSourcePath, "utf8"),
      source: "OPEN_MODEL_LAB_ADS_TXT_SOURCE",
    };
  }

  return null;
}

function getActiveAdsTxtLines(content) {
  return content
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

function validateAdsTxtContent(content) {
  const lines = getActiveAdsTxtLines(content);

  if (lines.length === 0) {
    throw new Error("ads.txt content has no active seller lines.");
  }

  for (const [index, line] of lines.entries()) {
    const fields = line.split(",").map((field) => field.trim());
    const [domain, sellerId, relationship] = fields;

    if (fields.length < 3 || fields.length > 4) {
      throw new Error(`ads.txt line ${index + 1} must have three or four comma-separated fields.`);
    }

    if (!domain || domain.includes("://") || !domain.includes(".")) {
      throw new Error(`ads.txt line ${index + 1} has an invalid ad-system domain.`);
    }

    if (!sellerId) {
      throw new Error(`ads.txt line ${index + 1} has an empty seller account id.`);
    }

    if (!["DIRECT", "RESELLER"].includes(relationship?.toUpperCase())) {
      throw new Error(`ads.txt line ${index + 1} must use DIRECT or RESELLER.`);
    }
  }

  return lines.length;
}

function normalizeAdsTxtContent(content) {
  return `${content.trim()}\n`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const resolved = readAdsTxtContent();

  if (!resolved) {
    if (options.allowMissing) {
      console.log("ads.txt content was not provided; skipping because --allow-missing is set.");
      return;
    }

    throw new Error(
      "Missing ads.txt content. Set OPEN_MODEL_LAB_ADS_TXT_CONTENT or OPEN_MODEL_LAB_ADS_TXT_SOURCE.",
    );
  }

  const lineCount = validateAdsTxtContent(resolved.content);

  if (options.checkOnly) {
    console.log(`ads.txt content from ${resolved.source} passed validation (${lineCount} active line(s)).`);
    return;
  }

  fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
  fs.writeFileSync(options.outputPath, normalizeAdsTxtContent(resolved.content), "utf8");
  console.log(`Wrote ads.txt to ${path.relative(process.cwd(), options.outputPath) || options.outputPath}.`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`ads.txt setup failed: ${message}`);
  process.exitCode = 1;
}
