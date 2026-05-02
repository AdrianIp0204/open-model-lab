import fs from "node:fs";
import path from "node:path";

const DEFAULT_OUTPUT_PATH = path.join(process.cwd(), "wrangler.jsonc");

function parseArgs(argv) {
  const parsed = {
    checkOnly: false,
    allowMissing: false,
    outputPath: process.env.OPEN_MODEL_LAB_WRANGLER_JSONC_OUTPUT || DEFAULT_OUTPUT_PATH,
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

function readWranglerConfigContent(env = process.env) {
  const directContent = env.OPEN_MODEL_LAB_WRANGLER_JSONC_CONTENT?.trim();
  const sourcePath = env.OPEN_MODEL_LAB_WRANGLER_JSONC_SOURCE?.trim();

  if (directContent && sourcePath) {
    throw new Error(
      "Set only one of OPEN_MODEL_LAB_WRANGLER_JSONC_CONTENT or OPEN_MODEL_LAB_WRANGLER_JSONC_SOURCE.",
    );
  }

  if (directContent) {
    return {
      content: directContent.replaceAll("\\n", "\n"),
      source: "OPEN_MODEL_LAB_WRANGLER_JSONC_CONTENT",
    };
  }

  if (sourcePath) {
    const absoluteSourcePath = path.resolve(sourcePath);
    if (!fs.existsSync(absoluteSourcePath)) {
      throw new Error("OPEN_MODEL_LAB_WRANGLER_JSONC_SOURCE points to a missing file.");
    }

    return {
      content: fs.readFileSync(absoluteSourcePath, "utf8"),
      source: "OPEN_MODEL_LAB_WRANGLER_JSONC_SOURCE",
    };
  }

  return null;
}

function stripJsoncComments(input) {
  let output = "";
  let inString = false;
  let escapeNext = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const nextChar = input[index + 1];

    if (inLineComment) {
      if (char === "\n" || char === "\r") {
        inLineComment = false;
        output += char;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && nextChar === "/") {
        inBlockComment = false;
        index += 1;
        continue;
      }

      if (char === "\n" || char === "\r") {
        output += char;
      }
      continue;
    }

    if (inString) {
      output += char;

      if (escapeNext) {
        escapeNext = false;
      } else if (char === "\\") {
        escapeNext = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      output += char;
      continue;
    }

    if (char === "/" && nextChar === "/") {
      inLineComment = true;
      index += 1;
      continue;
    }

    if (char === "/" && nextChar === "*") {
      inBlockComment = true;
      index += 1;
      continue;
    }

    output += char;
  }

  return output;
}

function parseJsoncObject(content) {
  const withoutBom = content.replace(/^\uFEFF/u, "");
  const withoutComments = stripJsoncComments(withoutBom);
  const withoutTrailingCommas = withoutComments.replace(/,\s*([}\]])/gu, "$1");
  const parsed = JSON.parse(withoutTrailingCommas);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Wrangler config must parse to an object.");
  }

  return parsed;
}

function requireString(config, pathSegments) {
  let value = config;
  for (const segment of pathSegments) {
    if (!value || typeof value !== "object") {
      throw new Error(`Wrangler config is missing ${pathSegments.join(".")}.`);
    }
    value = value[segment];
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Wrangler config is missing ${pathSegments.join(".")}.`);
  }

  return value;
}

function validateWranglerConfigContent(content) {
  if (!content.trim()) {
    throw new Error("Wrangler config content is empty.");
  }

  let config;
  try {
    config = parseJsoncObject(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Wrangler config is not valid JSON/JSONC: ${message}`);
  }

  const main = requireString(config, ["main"]);
  const workerName = requireString(config, ["name"]);
  const compatibilityDate = requireString(config, ["compatibility_date"]);
  const assetDirectory = requireString(config, ["assets", "directory"]);
  requireString(config, ["assets", "binding"]);

  if (!main.includes(".open-next/worker.js")) {
    throw new Error("Wrangler config main must point at the OpenNext worker output.");
  }

  if (!assetDirectory.includes(".open-next/assets")) {
    throw new Error("Wrangler config assets.directory must point at the OpenNext assets output.");
  }

  if (config.keep_vars !== true) {
    throw new Error("Wrangler config must set keep_vars to true so dashboard-managed vars are preserved.");
  }

  if (!Array.isArray(config.compatibility_flags) || !config.compatibility_flags.includes("nodejs_compat")) {
    throw new Error("Wrangler config must include the nodejs_compat compatibility flag.");
  }

  return {
    workerName,
    compatibilityDate,
  };
}

function normalizeWranglerConfigContent(content) {
  return `${content.trim()}\n`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const resolved = readWranglerConfigContent();

  if (!resolved) {
    if (options.allowMissing) {
      console.log("Wrangler config content was not provided; skipping because --allow-missing is set.");
      return;
    }

    throw new Error(
      "Missing Wrangler config content. Set OPEN_MODEL_LAB_WRANGLER_JSONC_CONTENT or OPEN_MODEL_LAB_WRANGLER_JSONC_SOURCE.",
    );
  }

  validateWranglerConfigContent(resolved.content);

  if (options.checkOnly) {
    console.log(`Wrangler config from ${resolved.source} passed validation.`);
    return;
  }

  fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
  fs.writeFileSync(options.outputPath, normalizeWranglerConfigContent(resolved.content), "utf8");
  console.log(`Wrote private Wrangler config to ${path.relative(process.cwd(), options.outputPath) || options.outputPath}.`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Wrangler config setup failed: ${message}`);
  process.exitCode = 1;
}
