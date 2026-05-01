#!/usr/bin/env node

import { EventEmitter } from "node:events";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const childProcess = require("node:child_process");
const originalExec = childProcess.exec.bind(childProcess);

childProcess.exec = function patchedExec(command, options, callback) {
  let resolvedOptions = options;
  let resolvedCallback = callback;

  if (typeof resolvedOptions === "function") {
    resolvedCallback = resolvedOptions;
    resolvedOptions = undefined;
  }

  if (String(command).trim().toLowerCase() === "net use") {
    const processStub = new EventEmitter();
    processStub.stdout = new EventEmitter();
    processStub.stderr = new EventEmitter();
    processStub.kill = () => true;

    queueMicrotask(() => {
      resolvedCallback?.(new Error("net use unavailable in this environment"), "", "");
      processStub.emit("close", 1);
      processStub.emit("exit", 1);
    });

    return processStub;
  }

  return originalExec(command, resolvedOptions, resolvedCallback);
};

const cliArgs = process.argv.slice(2);

if (!cliArgs.includes("--pool")) {
  cliArgs.push("--pool", "threads");
}

if (!cliArgs.includes("--configLoader")) {
  cliArgs.push("--configLoader", "runner");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.argv = [
  process.argv[0],
  path.resolve(__dirname, "../node_modules/vitest/vitest.mjs"),
  ...cliArgs,
];

await import("../node_modules/vitest/vitest.mjs");
