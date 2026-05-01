import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const LABELS_PATH = path.join(process.cwd(), ".github", "labels.yml");

function unquote(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function parseLabelsYaml(filePath = LABELS_PATH) {
  const source = fs.readFileSync(filePath, "utf8");
  const labels = [];
  let current = null;

  for (const rawLine of source.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const itemMatch = /^-\s+name:\s*(.+)$/u.exec(line);
    if (itemMatch) {
      if (current) {
        labels.push(current);
      }
      current = { name: unquote(itemMatch[1]) };
      continue;
    }

    const fieldMatch = /^(color|description):\s*(.+)$/u.exec(line);
    if (!fieldMatch || !current) {
      throw new Error(`Unsupported labels.yml line: ${rawLine}`);
    }

    current[fieldMatch[1]] = unquote(fieldMatch[2]);
  }

  if (current) {
    labels.push(current);
  }

  for (const label of labels) {
    if (!label.name || !label.color || !label.description) {
      throw new Error(`Label entry is incomplete: ${JSON.stringify(label)}`);
    }

    if (!/^[0-9a-fA-F]{6}$/u.test(label.color)) {
      throw new Error(`Label "${label.name}" has an invalid color "${label.color}".`);
    }
  }

  return labels;
}

function quoteForShell(value) {
  return `"${value.replaceAll('"', '\\"')}"`;
}

function printPlan(labels) {
  console.log(`Loaded ${labels.length} labels from .github/labels.yml.`);
  for (const label of labels) {
    console.log(`- ${label.name} (#${label.color}): ${label.description}`);
  }
}

function printGhCommands(labels) {
  console.log("# Review before running. These commands create or update labels with gh.");
  for (const label of labels) {
    const name = quoteForShell(label.name);
    const color = quoteForShell(label.color);
    const description = quoteForShell(label.description);
    console.log(`gh label create ${name} --color ${color} --description ${description} --force`);
  }
}

function applyLabels(labels) {
  for (const label of labels) {
    const result = spawnSync(
      "gh",
      [
        "label",
        "create",
        label.name,
        "--color",
        label.color,
        "--description",
        label.description,
        "--force",
      ],
      {
        encoding: "utf8",
        windowsHide: true,
      },
    );

    if (result.status !== 0) {
      const message = result.stderr.trim() || result.stdout.trim() || "gh label create failed";
      throw new Error(`Could not create or update "${label.name}": ${message}`);
    }

    console.log(`Synced label: ${label.name}`);
  }
}

const args = new Set(process.argv.slice(2));
const labels = parseLabelsYaml();

if (args.has("--apply")) {
  console.log("Applying labels from .github/labels.yml with gh label create --force.");
  applyLabels(labels);
  console.log(`Synced ${labels.length} labels.`);
} else if (args.has("--emit-gh-commands")) {
  printGhCommands(labels);
} else {
  printPlan(labels);
  console.log("Use --emit-gh-commands to print optional gh label create commands.");
  console.log("Use --apply to create or update labels with gh after owner approval.");
}
