// @vitest-environment node

import { spawn, spawnSync } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const python =
  process.env.PYTHON ??
  process.env.PYTHON3 ??
  (process.platform === "win32" ? "python" : "python3");

function runPython(args: string[], env: Record<string, string | undefined> = {}) {
  const nextEnv = { ...process.env };
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete nextEnv[key];
    } else {
      nextEnv[key] = value;
    }
  }

  const result = spawnSync(python, ["-X", "utf8", ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    env: nextEnv,
  });

  return {
    status: result.status ?? 1,
    stdout: String(result.stdout ?? "").trim(),
    stderr: String(result.stderr ?? "").trim(),
  };
}

function runPythonAsync(args: string[], env: Record<string, string | undefined> = {}) {
  const nextEnv = { ...process.env };
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete nextEnv[key];
    } else {
      nextEnv[key] = value;
    }
  }

  return new Promise<{
    status: number;
    stdout: string;
    stderr: string;
  }>((resolve, reject) => {
    const child = spawn(python, ["-X", "utf8", ...args], {
      cwd: repoRoot,
      env: nextEnv,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (status) => {
      resolve({
        status: status ?? 1,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
}

type ChatReply = {
  content?: string;
  status?: number;
  response?: Record<string, unknown>;
};

type MockChatMessage = {
  content?: string;
  role?: string;
} & Record<string, unknown>;

type MockRequestBody = {
  messages?: MockChatMessage[];
  raw?: string;
  response_format?: unknown;
} & Record<string, unknown>;

type MockRequest = {
  method: string;
  url: string;
  body: MockRequestBody;
};

type ChatReplyHandler = (body: MockRequestBody, index: number) => ChatReply;

function getMessageContent(body: MockRequestBody, index: number): string {
  const content = body.messages?.[index]?.content;
  return typeof content === "string" ? content : "";
}

function parseRequestBody(rawBody: string): MockRequestBody {
  if (!rawBody) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawBody) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as MockRequestBody;
    }
  } catch {
    return { raw: rawBody };
  }

  return { raw: rawBody };
}

const aliasPattern = /^f\d{4}$/;

type TranslationChunkPayload = {
  fields: Record<string, string>;
  context: {
    chunk: {
      attempt?: number;
      charCount: number;
      fieldCount: number;
      index: number;
      mode?: string;
      splitDepth?: number;
      total: number;
    };
  };
  itemId?: string;
  itemKind?: string;
  sourceTitle?: string;
};

function parseTranslationChunkPayload(body: MockRequestBody): TranslationChunkPayload {
  return JSON.parse(getMessageContent(body, 1)) as TranslationChunkPayload;
}

function buildAliasTranslations(
  payload: TranslationChunkPayload,
  prefix: string,
  mutate?: (alias: string, text: string) => string,
) {
  return Object.fromEntries(
    Object.entries(payload.fields).map(([alias, text]) => [alias, mutate ? mutate(alias, text) : `${prefix}: ${text}`]),
  );
}

function buildTranslationReply(
  payload: TranslationChunkPayload,
  translations: Record<string, string>,
  wrappers: Record<string, unknown> = {},
): ChatReply {
  return {
    content: JSON.stringify({
      itemId: payload.itemId ?? "concept:simple-harmonic-motion",
      itemKind: payload.itemKind ?? "concept",
      sourceTitle: payload.sourceTitle ?? "Simple Harmonic Motion",
      context: payload.context,
      ...wrappers,
      translations,
    }),
  };
}

async function startMockOllamaServer(options?: {
  models?: string[];
  chatReplies?: Array<ChatReply | ChatReplyHandler>;
}) {
  const requests: MockRequest[] = [];
  const models = options?.models ?? ["qwen2.5:7b"];
  const chatReplies = options?.chatReplies ?? [
    (body: MockRequestBody) => {
      const payload = JSON.parse(getMessageContent(body, 1)) as {
        fields: Record<string, string>;
      };
      const translations = Object.fromEntries(
        Object.entries(payload.fields).map(([field, text]) => [field, `ZH: ${text}`]),
      );
      return { content: JSON.stringify(translations) };
    },
  ];
  let chatIndex = 0;

  const server = http.createServer(async (req, res) => {
    const method = req.method ?? "GET";
    const url = req.url ?? "/";
    let rawBody = "";
    for await (const chunk of req) {
      rawBody += chunk;
    }

    const body = parseRequestBody(rawBody);
    requests.push({ method, url, body });

    if (method === "GET" && url === "/v1/models") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          object: "list",
          data: models.map((model) => ({ id: model, object: "model" })),
        }),
      );
      return;
    }

    if (method === "POST" && url === "/v1/chat/completions") {
      const replyFactory = chatReplies[Math.min(chatIndex, chatReplies.length - 1)];
      chatIndex += 1;
      const reply: ChatReply =
        typeof replyFactory === "function" ? replyFactory(body, chatIndex - 1) : replyFactory;
      res.writeHead(reply.status ?? 200, { "Content-Type": "application/json" });
      if (reply.response) {
        res.end(JSON.stringify(reply.response));
        return;
      }
      res.end(
        JSON.stringify({
          choices: [
            {
              message: {
                content: reply.content ?? "",
              },
            },
          ],
        }),
      );
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address() as AddressInfo | null;
  if (!address || typeof address === "string") {
    throw new Error("failed to start mock Ollama server");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}/v1`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      }),
    requests,
  };
}

describe("translation tooling", () => {
  it("resume retries failed and stale items while skipping current and untracked items", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "open-model-lab-i18n-resume-"));
    const overlayRoot = path.join(tempRoot, "content", "i18n");

    try {
      for (const concept of [
        "simple-harmonic-motion",
        "graph-transformations",
        "projectile-motion",
      ]) {
        const initialRun = runPython([
          "tools/i18n/translate_content.py",
          path.join(repoRoot, "content", "concepts", `${concept}.json`),
          "--locale",
          "zh-HK",
          "--overlay-root",
          overlayRoot,
          "--provider",
          "mock",
        ]);
        expect(initialRun.status).toBe(0);
      }

      const manifestPath = path.join(overlayRoot, "zh-HK", "manifest.json");
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      manifest.entries["concept:simple-harmonic-motion"].status = "failed";
      manifest.entries["concept:simple-harmonic-motion"].lastError = "provider failed";
      manifest.entries["concept:graph-transformations"].sourceHash = "stale-source-hash";
      fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

      const resumeRun = runPython([
        "tools/i18n/translate_content.py",
        path.join(repoRoot, "content", "concepts"),
        "--locale",
        "zh-HK",
        "--overlay-root",
        overlayRoot,
        "--provider",
        "mock",
        "--resume",
        "--dry-run",
        "--concept",
        "simple-harmonic-motion",
        "--concept",
        "graph-transformations",
        "--concept",
        "projectile-motion",
        "--concept",
        "vectors-components",
      ]);

      expect(resumeRun.status).toBe(0);
      const report = JSON.parse(resumeRun.stdout);
      const byId = Object.fromEntries(
        report.items.map((item: { itemId: string }) => [item.itemId, item]),
      ) as Record<string, { status: string; reason: string }>;

      expect(report.skipped).toBe(2);
      expect(report.translated).toBe(0);
      expect(byId["concept:simple-harmonic-motion"]).toMatchObject({
        status: "planned",
        reason: "resume-pending",
      });
      expect(byId["concept:graph-transformations"]).toMatchObject({
        status: "planned",
        reason: "resume-pending",
      });
      expect(byId["concept:projectile-motion"]).toMatchObject({
        status: "skipped",
        reason: "resume-current",
      });
      expect(byId["concept:vectors-components"]).toMatchObject({
        status: "skipped",
        reason: "resume-untracked",
      });
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("keeps changed-only as the default and lets --all or --force override current-item skipping", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "open-model-lab-i18n-selection-"));
    const overlayRoot = path.join(tempRoot, "content", "i18n");

    try {
      const initialRun = runPython([
        "tools/i18n/translate_content.py",
        path.join(repoRoot, "content", "concepts", "simple-harmonic-motion.json"),
        "--locale",
        "zh-HK",
        "--overlay-root",
        overlayRoot,
        "--provider",
        "mock",
      ]);
      expect(initialRun.status).toBe(0);

      const changedOnlyRun = runPython([
        "tools/i18n/translate_content.py",
        path.join(repoRoot, "content", "concepts"),
        "--locale",
        "zh-HK",
        "--overlay-root",
        overlayRoot,
        "--provider",
        "mock",
        "--dry-run",
        "--concept",
        "simple-harmonic-motion",
        "--concept",
        "vectors-components",
      ]);
      expect(changedOnlyRun.status).toBe(0);
      const changedOnlyReport = JSON.parse(changedOnlyRun.stdout);
      const changedOnlyById = Object.fromEntries(
        changedOnlyReport.items.map((item: { itemId: string }) => [item.itemId, item]),
      ) as Record<string, { status: string; reason: string }>;
      expect(changedOnlyById["concept:simple-harmonic-motion"]).toMatchObject({
        status: "skipped",
        reason: "current",
      });
      expect(changedOnlyById["concept:vectors-components"]).toMatchObject({
        status: "planned",
        reason: "changed",
      });

      const allRun = runPython([
        "tools/i18n/translate_content.py",
        path.join(repoRoot, "content", "concepts", "simple-harmonic-motion.json"),
        "--locale",
        "zh-HK",
        "--overlay-root",
        overlayRoot,
        "--provider",
        "mock",
        "--dry-run",
        "--all",
      ]);
      expect(allRun.status).toBe(0);
      expect(JSON.parse(allRun.stdout).items[0]).toMatchObject({
        status: "planned",
        reason: "selected-all",
      });

      const forceRun = runPython([
        "tools/i18n/translate_content.py",
        path.join(repoRoot, "content", "concepts", "simple-harmonic-motion.json"),
        "--locale",
        "zh-HK",
        "--overlay-root",
        overlayRoot,
        "--provider",
        "mock",
        "--dry-run",
        "--force",
      ]);
      expect(forceRun.status).toBe(0);
      expect(JSON.parse(forceRun.stdout).items[0]).toMatchObject({
        status: "planned",
        reason: "selected-all",
      });
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("writes concept and catalog overlay shards with manifest and translation memory via mock", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "open-model-lab-i18n-tool-"));
    const overlayRoot = path.join(tempRoot, "content", "i18n");

    try {
      const conceptRun = runPython([
        "tools/i18n/translate_content.py",
        path.join(repoRoot, "content", "concepts", "simple-harmonic-motion.json"),
        "--locale",
        "zh-HK",
        "--overlay-root",
        overlayRoot,
        "--provider",
        "mock",
      ]);

      expect(conceptRun.status).toBe(0);
      const conceptReport = JSON.parse(conceptRun.stdout);
      expect(conceptReport.translated).toBe(1);

      const conceptOverlayPath = path.join(
        overlayRoot,
        "zh-HK",
        "concepts",
        "simple-harmonic-motion.json",
      );
      expect(JSON.parse(fs.readFileSync(conceptOverlayPath, "utf8"))).toMatchObject({
        title: expect.stringContaining("[zhHK]"),
        summary: expect.stringContaining("[zhHK]"),
      });

      const catalogRun = runPython([
        "tools/i18n/translate_content.py",
        path.join(repoRoot, "content", "catalog", "subjects.json"),
        "--locale",
        "zh-HK",
        "--overlay-root",
        overlayRoot,
        "--provider",
        "mock",
      ]);

      expect(catalogRun.status).toBe(0);
      const catalogOverlayPath = path.join(overlayRoot, "zh-HK", "catalog", "subjects.json");
      expect(JSON.parse(fs.readFileSync(catalogOverlayPath, "utf8"))).toMatchObject({
        physics: {
          title: expect.stringContaining("[zhHK]"),
        },
      });

      const manifest = JSON.parse(
        fs.readFileSync(path.join(overlayRoot, "zh-HK", "manifest.json"), "utf8"),
      );
      expect(manifest.entries["concept:simple-harmonic-motion"]).toMatchObject({ status: "done" });
      expect(manifest.entries["catalog:subjects"]).toMatchObject({ status: "done" });

      const memory = JSON.parse(
        fs.readFileSync(path.join(overlayRoot, "zh-HK", ".translation-memory.json"), "utf8"),
      );
      expect(Object.keys(memory.entries).length).toBeGreaterThan(0);

      const changedOnlyRun = runPython([
        "tools/i18n/translate_content.py",
        path.join(repoRoot, "content", "concepts", "simple-harmonic-motion.json"),
        "--locale",
        "zh-HK",
        "--overlay-root",
        overlayRoot,
        "--provider",
        "mock",
        "--dry-run",
        "--changed-only",
      ]);

      expect(changedOnlyRun.status).toBe(0);
      const changedOnlyReport = JSON.parse(changedOnlyRun.stdout);
      expect(changedOnlyReport.skipped).toBe(1);
      expect(changedOnlyReport.translated).toBe(0);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("defaults real translation runs to ollama and writes overlays from a local server", async () => {
    const server = await startMockOllamaServer();
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "open-model-lab-i18n-ollama-"));
    const overlayRoot = path.join(tempRoot, "content", "i18n");

    try {
      const result = await runPythonAsync(
        [
          "tools/i18n/translate_content.py",
          path.join(repoRoot, "content", "concepts", "simple-harmonic-motion.json"),
          "--locale",
          "zh-HK",
          "--overlay-root",
          overlayRoot,
        ],
        {
          OPEN_MODEL_LAB_I18N_OLLAMA_BASE_URL: server.baseUrl,
          OPEN_MODEL_LAB_I18N_OLLAMA_MODEL: "qwen2.5:7b",
        },
      );

      expect(result.status).toBe(0);
      const report = JSON.parse(result.stdout);
      expect(report.translated).toBe(1);

      const manifest = JSON.parse(
        fs.readFileSync(path.join(overlayRoot, "zh-HK", "manifest.json"), "utf8"),
      );
      expect(manifest.entries["concept:simple-harmonic-motion"].provider).toBe("ollama");

      const overlay = JSON.parse(
        fs.readFileSync(
          path.join(overlayRoot, "zh-HK", "concepts", "simple-harmonic-motion.json"),
          "utf8",
        ),
      );
      expect(JSON.stringify(overlay)).toContain("ZH:");
      const conceptRequest = server.requests.find(
        (request) => request.method === "POST" && request.url === "/v1/chat/completions",
      );
      expect(conceptRequest).toBeDefined();
      const conceptPayload = JSON.parse(getMessageContent(conceptRequest!.body, 1)) as {
        sourceTitle: string;
        context: Record<string, unknown>;
        fields: Record<string, string>;
      };
      expect(conceptPayload.sourceTitle).toBe("Simple Harmonic Motion");
      expect(conceptPayload.context).toMatchObject({
        canonicalTitle: "Simple Harmonic Motion",
        slug: "simple-harmonic-motion",
      });
      expect(Object.keys(conceptPayload.fields).length).toBeGreaterThan(0);
      expect(Object.keys(conceptPayload.fields).every((key) => aliasPattern.test(key))).toBe(true);
      expect(server.requests.some((request) => request.method === "GET" && request.url === "/v1/models")).toBe(true);
      expect(
        server.requests.some(
          (request) => request.method === "POST" && request.url === "/v1/chat/completions",
        ),
      ).toBe(true);
    } finally {
      await server.close();
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("forces one-field plain-text requests when the TranslateGemma model is selected", async () => {
    const server = await startMockOllamaServer({
      models: ["translategemma:12b"],
      chatReplies: [
        (body: MockRequestBody) => {
          const prompt = getMessageContent(body, 0);
          const sourceText = prompt.split("\n\n\n")[1] ?? "";
          return { content: `ZH: ${sourceText}` };
        },
      ],
    });
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "open-model-lab-i18n-translategemma-"));
    const overlayRoot = path.join(tempRoot, "content", "i18n");

    try {
      const result = await runPythonAsync(
        [
          "tools/i18n/translate_content.py",
          path.join(repoRoot, "content", "concepts", "simple-harmonic-motion.json"),
          "--locale",
          "zh-HK",
          "--overlay-root",
          overlayRoot,
          "--provider",
          "ollama",
          "--base-url",
          server.baseUrl,
          "--model",
          "translategemma:12b",
          "--max-fields-per-request",
          "24",
          "--max-chars-per-request",
          "2400",
        ],
      );

      expect(result.status).toBe(0);
      const report = JSON.parse(result.stdout);
      expect(report.translated).toBe(1);

      const chatRequests = server.requests.filter(
        (request) => request.method === "POST" && request.url === "/v1/chat/completions",
      );
      expect(chatRequests.length).toBeGreaterThan(1);
      expect(chatRequests.every((request) => request.body.messages?.length === 1)).toBe(true);
      expect(chatRequests.every((request) => request.body.response_format === undefined)).toBe(true);

      const firstPrompt = getMessageContent(chatRequests[0]!.body, 0);
      expect(firstPrompt).toContain(
        "You are a professional English (en) to Traditional Chinese (Hong Kong) (zh-HK) translator.",
      );
      expect(firstPrompt).toContain("\n\n\n");

      const overlay = JSON.parse(
        fs.readFileSync(
          path.join(overlayRoot, "zh-HK", "concepts", "simple-harmonic-motion.json"),
          "utf8",
        ),
      );
      expect(JSON.stringify(overlay)).toContain("ZH:");
    } finally {
      await server.close();
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  }, 30000);

  it("retries sloppy real-model keys and succeeds after the provider repair prompt", async () => {
    const server = await startMockOllamaServer({
      chatReplies: [
        { content: JSON.stringify({ id: "bad", label: "bad", template: "bad" }) },
        (body: MockRequestBody) => {
          const payload = JSON.parse(getMessageContent(body, 1)) as {
            fields: Record<string, string>;
          };
          const translations = Object.fromEntries(
            Object.entries(payload.fields).map(([field, text]) => [field, `ZH repaired: ${text}`]),
          );
          return { content: JSON.stringify(translations) };
        },
      ],
    });
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "open-model-lab-i18n-repair-"));
    const overlayRoot = path.join(tempRoot, "content", "i18n");

    try {
      const result = await runPythonAsync(
        [
          "tools/i18n/translate_content.py",
          path.join(repoRoot, "content", "concepts", "simple-harmonic-motion.json"),
          "--locale",
          "zh-HK",
          "--overlay-root",
          overlayRoot,
          "--provider",
          "ollama",
          "--base-url",
          server.baseUrl,
          "--model",
          "qwen2.5:7b",
          "--retries",
          "1",
          "--max-fields-per-request",
          "1000",
          "--max-chars-per-request",
          "100000",
        ],
      );

      expect(result.status).toBe(0);
      const chatRequests = server.requests.filter(
        (request) => request.method === "POST" && request.url === "/v1/chat/completions",
      );
      expect(chatRequests.length).toBe(2);
      const repairedRequest = JSON.parse(getMessageContent(chatRequests[1]!.body, 1)) as {
        fields: Record<string, string>;
      };
      expect(Object.keys(repairedRequest.fields).every((key) => aliasPattern.test(key))).toBe(true);
      const overlay = JSON.parse(
        fs.readFileSync(
          path.join(overlayRoot, "zh-HK", "concepts", "simple-harmonic-motion.json"),
          "utf8",
        ),
      );
      expect(JSON.stringify(overlay)).toContain("ZH repaired:");
    } finally {
      await server.close();
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("recovers omitted aliases by splitting the failing chunk while preserving successful chunks", async () => {
    const server = await startMockOllamaServer({
      chatReplies: [
        (body: MockRequestBody) => {
          const payload = parseTranslationChunkPayload(body);
          const translations = buildAliasTranslations(payload, payload.context.chunk.index === 1 ? "chunk1" : "split");
          if (payload.context.chunk.index === 2 && payload.context.chunk.splitDepth === 0) {
            const [firstAlias] = Object.keys(payload.fields);
            return buildTranslationReply(
              payload,
              {
                [firstAlias]: `retry-missing: ${payload.fields[firstAlias]}`,
              },
              {},
            );
          }
          return buildTranslationReply(payload, translations);
        },
      ],
    });
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "open-model-lab-i18n-omitted-alias-"));
    const overlayRoot = path.join(tempRoot, "content", "i18n");

    try {
      const result = await runPythonAsync(
        [
          "tools/i18n/translate_content.py",
          path.join(repoRoot, "content", "concepts", "simple-harmonic-motion.json"),
          "--locale",
          "zh-HK",
          "--overlay-root",
          overlayRoot,
          "--provider",
          "ollama",
          "--base-url",
          server.baseUrl,
          "--model",
          "qwen2.5:7b",
          "--max-fields-per-request",
          "12",
          "--max-chars-per-request",
          "600",
        ],
      );

      expect(result.status).toBe(0);
      const chatRequests = server.requests.filter(
        (request) => request.method === "POST" && request.url === "/v1/chat/completions",
      );
      expect(chatRequests.length).toBeGreaterThan(2);

      const overlay = JSON.parse(
        fs.readFileSync(
          path.join(overlayRoot, "zh-HK", "concepts", "simple-harmonic-motion.json"),
          "utf8",
        ),
      );
      const overlayText = JSON.stringify(overlay);
      expect(overlayText).toContain("chunk1:");
      expect(overlayText).toContain("split:");
    } finally {
      await server.close();
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("recovers unexpected aliases by splitting the failing chunk while preserving successful chunks", async () => {
    let injectedUnexpectedAlias = false;
    const server = await startMockOllamaServer({
      chatReplies: [
        (body: MockRequestBody) => {
          const payload = parseTranslationChunkPayload(body);
          const translations = buildAliasTranslations(payload, payload.context.chunk.index === 1 ? "chunk1" : "split");
          if (
            !injectedUnexpectedAlias &&
            payload.context.chunk.fieldCount > 1 &&
            (payload.context.chunk.splitDepth ?? 0) === 0
          ) {
            injectedUnexpectedAlias = true;
            return {
              content: JSON.stringify({
                ...translations,
                f9999: "unexpected alias",
              }),
            };
          }
          return buildTranslationReply(payload, translations);
        },
      ],
    });
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "open-model-lab-i18n-unexpected-alias-"));
    const overlayRoot = path.join(tempRoot, "content", "i18n");

    try {
      const result = await runPythonAsync(
        [
          "tools/i18n/translate_content.py",
          path.join(repoRoot, "content", "concepts", "simple-harmonic-motion.json"),
          "--locale",
          "zh-HK",
          "--overlay-root",
          overlayRoot,
          "--provider",
          "ollama",
          "--base-url",
          server.baseUrl,
          "--model",
          "qwen2.5:7b",
          "--max-fields-per-request",
          "12",
          "--max-chars-per-request",
          "600",
        ],
      );

      expect(result.status).toBe(0);
      const chatRequests = server.requests.filter(
        (request) => request.method === "POST" && request.url === "/v1/chat/completions",
      );
      expect(chatRequests.length).toBeGreaterThan(2);

      const overlay = JSON.parse(
        fs.readFileSync(
          path.join(overlayRoot, "zh-HK", "concepts", "simple-harmonic-motion.json"),
          "utf8",
        ),
      );
      const overlayText = JSON.stringify(overlay);
      expect(overlayText).toContain("chunk1:");
      expect(overlayText).toContain("split:");
    } finally {
      await server.close();
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("recovers token mismatches by splitting the failing chunk while preserving successful chunks", async () => {
    const result = await runPythonAsync(
      [
        "-c",
        `
import json
import re
from tools.i18n.translate_content import _translate_chunk_with_fallback
from tools.i18n.tokens import protect_text


class FakeProvider:
  kind = "mock"

  def translate(self, job):
    aliases = list(job.fields.keys())
    if len(aliases) > 1 and job.context["chunk"]["index"] == 1 and job.context["chunk"]["splitDepth"] == 0:
      broken_alias = aliases[0]
      broken_text = re.sub(r"\\[\\[[A-Z]\\d+\\]\\]", "", job.fields[broken_alias], count=1)
      return {
        alias: (broken_text if alias == broken_alias else f"ok: {text}")
        for alias, text in job.fields.items()
      }
    return {alias: f"ok: {text}" for alias, text in job.fields.items()}


provider = FakeProvider()
raw_fields = {
  "field1": "Simple harmonic motion has $x = 0$ and {{placeholder}}.",
  "field2": "A time-based straight-line sketch.",
}
protected_fields = {path: protect_text(text) for path, text in raw_fields.items()}
source_fields = {path: protected.masked for path, protected in protected_fields.items()}
result = _translate_chunk_with_fallback(
  locale="zh-HK",
  provider=provider,
  task_kind="concept",
  task_key="demo",
  task_source_title="Demo",
  task_source_context={},
  encoded_pending_fields=source_fields,
  protected_fields=protected_fields,
  alias_by_path={"field1": "f0001", "field2": "f0002"},
  path_by_alias={"f0001": "field1", "f0002": "field2"},
  chunk_paths=["field1", "field2"],
  chunk_index=0,
  chunk_total=1,
  split_depth=0,
)
print(json.dumps(result, ensure_ascii=False))
        `,
      ],
    );

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout) as Record<string, string>;
    expect(payload.field1).toContain("ok:");
    expect(payload.field2).toContain("ok:");
    expect(payload.field1).toContain("$x = 0$");
    expect(payload.field1).toContain("{{placeholder}}");
  });

  it("uses a token-focused single-field repair with required markers for identifier-heavy fields", async () => {
    const result = await runPythonAsync([
      "-c",
      `
import json
from tools.i18n.translate_content import _translate_chunk_with_fallback
from tools.i18n.tokens import protect_text

attempts = []

class FakeProvider:
  kind = "mock"

  def translate(self, job):
    alias = next(iter(job.fields))
    text = job.fields[alias]
    attempts.append({
      "mode": job.context["chunk"]["mode"],
      "requiredMarkers": list((job.required_markers or {}).keys()),
      "requiredMarkerMap": job.required_markers or {},
      "repairInstructions": job.repair_instructions,
    })
    if job.context["chunk"]["mode"] == "initial":
      return {alias: text.replace("[[I0]]", "")}
    if job.context["chunk"]["mode"] == "single-field-repair":
      return {alias: text.replace("[[I0]]", "v_esc")}
    return {alias: "保留 [[I0]]、[[I1]] 與 [[I2]]，再翻譯其餘說明。"}


provider = FakeProvider()
raw_fields = {"field1": "The state compares n_i, E_x, and R_eq in one explanation."}
protected_fields = {path: protect_text(text) for path, text in raw_fields.items()}
source_fields = {path: protected.masked for path, protected in protected_fields.items()}
result = _translate_chunk_with_fallback(
  locale="zh-HK",
  provider=provider,
  task_kind="concept",
  task_key="demo",
  task_source_title="Demo",
  task_source_context={},
  encoded_pending_fields=source_fields,
  protected_fields=protected_fields,
  alias_by_path={"field1": "f0001"},
  path_by_alias={"f0001": "field1"},
  chunk_paths=["field1"],
  chunk_index=0,
  chunk_total=1,
  split_depth=0,
)
print(json.dumps({"result": result, "attempts": attempts}, ensure_ascii=False))
      `,
    ]);

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout) as {
      result: Record<string, string>;
      attempts: Array<{
        mode: string;
        requiredMarkers: string[];
        requiredMarkerMap: Record<string, string>;
        repairInstructions: string | null;
      }>;
    };
    expect(payload.result.field1).toContain("n_i");
    expect(payload.result.field1).toContain("E_x");
    expect(payload.result.field1).toContain("R_eq");
    expect(payload.attempts.map((attempt) => attempt.mode)).toEqual([
      "initial",
      "single-field-repair",
      "token-focused-single-field-repair",
    ]);
    expect(payload.attempts[1]?.requiredMarkers.length).toBeGreaterThan(0);
    expect(Object.values(payload.attempts[1]?.requiredMarkerMap ?? {})).toEqual(
      expect.arrayContaining(["n_i", "E_x", "R_eq"]),
    );
    expect(payload.attempts[2]?.repairInstructions).toContain("token-focused single-field repair");
  });

  it("retries a placeholder swallowed into a larger math fragment and recovers on the token-focused attempt", async () => {
    const result = await runPythonAsync([
      "-c",
      `
import json
from tools.i18n.translate_content import _translate_chunk_with_fallback
from tools.i18n.tokens import protect_text

attempts = []

class FakeProvider:
  kind = "mock"

  def translate(self, job):
    alias = next(iter(job.fields))
    text = job.fields[alias]
    attempts.append({
      "mode": job.context["chunk"]["mode"],
      "requiredMarkers": list((job.required_markers or {}).keys()),
      "repairInstructions": job.repair_instructions,
    })
    if job.context["chunk"]["mode"] in {"initial", "single-field-repair"}:
      return {alias: "將 [[P1]] 放進新的數學片段 $[[P1]]$，並保留 [[M0]]。"}
    return {alias: "比較 [[P1]]，並觀察 [[M0]]。"}


provider = FakeProvider()
raw_fields = {"field1": "Compare $x = 0$ with {{lensFamilyValue}} before deciding."}
protected_fields = {path: protect_text(text) for path, text in raw_fields.items()}
source_fields = {path: protected.masked for path, protected in protected_fields.items()}
result = _translate_chunk_with_fallback(
  locale="zh-HK",
  provider=provider,
  task_kind="concept",
  task_key="demo",
  task_source_title="Demo",
  task_source_context={},
  encoded_pending_fields=source_fields,
  protected_fields=protected_fields,
  alias_by_path={"field1": "f0001"},
  path_by_alias={"f0001": "field1"},
  chunk_paths=["field1"],
  chunk_index=0,
  chunk_total=1,
  split_depth=0,
)
print(json.dumps({"result": result, "attempts": attempts}, ensure_ascii=False))
      `,
    ]);

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout) as {
      result: Record<string, string>;
      attempts: Array<{ mode: string; repairInstructions: string | null }>;
    };
    expect(payload.result.field1).toContain("$x = 0$");
    expect(payload.result.field1).toContain("{{lensFamilyValue}}");
    expect(payload.attempts.at(-1)?.mode).toBe("token-focused-single-field-repair");
  });

  it("keeps single-field token failures explicit when even the final token-focused repair cannot recover", async () => {
    const result = await runPythonAsync([
      "-c",
      `
import json
from tools.i18n.translate_content import _translate_chunk_with_fallback
from tools.i18n.tokens import protect_text

attempts = []

class FakeProvider:
  kind = "mock"

  def translate(self, job):
    alias = next(iter(job.fields))
    attempts.append({
      "mode": job.context["chunk"]["mode"],
      "requiredMarkers": list((job.required_markers or {}).keys()),
      "repairInstructions": job.repair_instructions,
    })
    return {alias: "The model rewrites the symbol as v_esc instead of the required marker."}


provider = FakeProvider()
raw_fields = {"field1": "The escape condition depends on v_c at the boundary."}
protected_fields = {path: protect_text(text) for path, text in raw_fields.items()}
source_fields = {path: protected.masked for path, protected in protected_fields.items()}
try:
  _translate_chunk_with_fallback(
    locale="zh-HK",
    provider=provider,
    task_kind="concept",
    task_key="demo",
    task_source_title="Demo",
    task_source_context={},
    encoded_pending_fields=source_fields,
    protected_fields=protected_fields,
    alias_by_path={"field1": "f0001"},
    path_by_alias={"f0001": "field1"},
    chunk_paths=["field1"],
    chunk_index=0,
    chunk_total=1,
    split_depth=0,
  )
except Exception as exc:
  print(json.dumps({"error": str(exc), "attempts": attempts}, ensure_ascii=False))
      `,
    ]);

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout) as {
      error: string;
      attempts: Array<{ mode: string }>;
    };
    expect(payload.error).toContain("single-field hard failure");
    expect(payload.error).toContain("token mismatch");
    expect(payload.attempts.map((attempt) => attempt.mode)).toEqual([
      "initial",
      "single-field-repair",
      "token-focused-single-field-repair",
    ]);
  });

  it("rejects nested drifted key responses and succeeds on retry", async () => {
    const server = await startMockOllamaServer({
      chatReplies: [
        {
          content: JSON.stringify({
            translations: {
              nested: {
                id: "bad",
              },
            },
          }),
        },
        (body: MockRequestBody) => {
          const payload = JSON.parse(getMessageContent(body, 1)) as {
            fields: Record<string, string>;
          };
          return {
            content: JSON.stringify(
              Object.fromEntries(
                Object.entries(payload.fields).map(([field, text]) => [field, `ZH nested fix: ${text}`]),
              ),
            ),
          };
        },
      ],
    });
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "open-model-lab-i18n-nested-repair-"));
    const overlayRoot = path.join(tempRoot, "content", "i18n");

    try {
      const result = await runPythonAsync(
        [
          "tools/i18n/translate_content.py",
          path.join(repoRoot, "content", "catalog", "subjects.json"),
          "--locale",
          "zh-HK",
          "--overlay-root",
          overlayRoot,
          "--provider",
          "ollama",
          "--base-url",
          server.baseUrl,
          "--model",
          "qwen2.5:7b",
          "--retries",
          "1",
        ],
      );

      expect(result.status).toBe(0);
      expect(
        server.requests.filter(
          (request) => request.method === "POST" && request.url === "/v1/chat/completions",
        ).length,
      ).toBe(2);
    } finally {
      await server.close();
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("chunks larger concept translations and merges chunk responses into one overlay", async () => {
    const server = await startMockOllamaServer({
      chatReplies: [
        (body: MockRequestBody, index: number) => {
          const payload = JSON.parse(getMessageContent(body, 1)) as {
            fields: Record<string, string>;
            context: { chunk: { index: number; total: number; fieldCount: number; charCount: number } };
          };
          const translations = Object.fromEntries(
            Object.entries(payload.fields).map(([field, text]) => [field, `chunk${index + 1}: ${text}`]),
          );
          return { content: JSON.stringify(translations) };
        },
      ],
    });
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "open-model-lab-i18n-chunks-"));
    const overlayRoot = path.join(tempRoot, "content", "i18n");

    try {
      const result = await runPythonAsync(
        [
          "tools/i18n/translate_content.py",
          path.join(repoRoot, "content", "concepts", "simple-harmonic-motion.json"),
          "--locale",
          "zh-HK",
          "--overlay-root",
          overlayRoot,
          "--provider",
          "ollama",
          "--base-url",
          server.baseUrl,
          "--model",
          "qwen2.5:7b",
          "--max-fields-per-request",
          "12",
          "--max-chars-per-request",
          "600",
        ],
      );

      expect(result.status).toBe(0);
      const chunkRequests = server.requests.filter(
        (request) => request.method === "POST" && request.url === "/v1/chat/completions",
      );
      expect(chunkRequests.length).toBeGreaterThan(1);

      for (const request of chunkRequests) {
        const payload = JSON.parse(getMessageContent(request.body, 1)) as {
          fields: Record<string, string>;
          context: { chunk: { fieldCount: number; charCount: number } };
        };
        expect(Object.keys(payload.fields).every((key) => aliasPattern.test(key))).toBe(true);
        expect(Object.keys(payload.fields).length).toBeLessThanOrEqual(12);
        const totalChars = Object.values(payload.fields).reduce((sum, text) => sum + text.length, 0);
        expect(totalChars).toBeLessThanOrEqual(600);
        expect(payload.context.chunk.fieldCount).toBe(Object.keys(payload.fields).length);
        expect(payload.context.chunk.charCount).toBe(totalChars);
      }

      const overlay = JSON.parse(
        fs.readFileSync(
          path.join(overlayRoot, "zh-HK", "concepts", "simple-harmonic-motion.json"),
          "utf8",
        ),
      );
      expect(JSON.stringify(overlay)).toContain("chunk");
    } finally {
      await server.close();
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("passes human-readable catalog context to the provider", async () => {
    const server = await startMockOllamaServer();
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "open-model-lab-i18n-catalog-context-"));
    const overlayRoot = path.join(tempRoot, "content", "i18n");

    try {
      const result = await runPythonAsync(
        [
          "tools/i18n/translate_content.py",
          path.join(repoRoot, "content", "catalog", "subjects.json"),
          "--locale",
          "zh-HK",
          "--overlay-root",
          overlayRoot,
          "--provider",
          "ollama",
          "--base-url",
          server.baseUrl,
          "--model",
          "qwen2.5:7b",
        ],
      );

      expect(result.status).toBe(0);
      const request = server.requests.find(
        (item) => item.method === "POST" && item.url === "/v1/chat/completions",
      );
      expect(request).toBeDefined();
      const payload = JSON.parse(getMessageContent(request!.body, 1)) as {
        sourceTitle: string;
        context: Record<string, unknown>;
      };
      expect(payload.sourceTitle).toBe("Subjects catalog");
      expect(payload.context).toMatchObject({
        catalogKind: "subjects",
        catalogLabel: "Subjects catalog",
      });
      expect(typeof payload.context.entryCount).toBe("number");
    } finally {
      await server.close();
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("honors CLI overrides over environment defaults", async () => {
    const server = await startMockOllamaServer();
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "open-model-lab-i18n-precedence-"));
    const overlayRoot = path.join(tempRoot, "content", "i18n");

    try {
      const result = await runPythonAsync(
        [
          "tools/i18n/translate_content.py",
          path.join(repoRoot, "content", "concepts", "simple-harmonic-motion.json"),
          "--locale",
          "zh-HK",
          "--overlay-root",
          overlayRoot,
          "--provider",
          "ollama",
          "--base-url",
          server.baseUrl,
          "--model",
          "qwen2.5:7b",
        ],
        {
          OPEN_MODEL_LAB_I18N_PROVIDER: "mock",
          OPEN_MODEL_LAB_I18N_OLLAMA_BASE_URL: "http://127.0.0.1:65534/v1",
          OPEN_MODEL_LAB_I18N_OLLAMA_MODEL: "wrong-model",
        },
      );

      expect(result.status).toBe(0);
      expect(
        server.requests.some(
          (request) => request.method === "POST" && request.url === "/v1/chat/completions",
        ),
      ).toBe(true);
    } finally {
      await server.close();
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("supports --ping for ollama health checks", async () => {
    const server = await startMockOllamaServer();

    try {
      const result = await runPythonAsync([
        "tools/i18n/translate_content.py",
        "--ping",
        "--provider",
        "ollama",
        "--base-url",
        server.baseUrl,
        "--model",
        "qwen2.5:7b",
      ]);

      expect(result.status).toBe(0);
      const report = JSON.parse(result.stdout);
      expect(report).toMatchObject({
        ok: true,
        locale: "zh-HK",
        kind: "ollama",
        model: "qwen2.5:7b",
      });
    } finally {
      await server.close();
    }
  });

  it("returns a clear failure when the Ollama server is unreachable", async () => {
      const result = await runPythonAsync([
        "tools/i18n/translate_content.py",
        "--ping",
        "--provider",
        "ollama",
        "--base-url",
        "http://127.0.0.1:65534/v1",
        "--model",
        "qwen2.5:7b",
        "--timeout-ms",
        "250",
      ]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("connection error");
  });

  it("returns a clear failure when the requested model is missing", async () => {
    const server = await startMockOllamaServer({ models: ["some-other-model"] });

    try {
      const result = await runPythonAsync([
        "tools/i18n/translate_content.py",
        "--ping",
        "--provider",
        "ollama",
        "--base-url",
        server.baseUrl,
        "--model",
        "qwen2.5:7b",
        "--timeout-ms",
        "250",
      ]);

      expect(result.status).toBe(1);
      expect(result.stdout).toContain("model unavailable");
    } finally {
      await server.close();
    }
  });

  it("preserves protected formula and placeholder tokens under the ollama path", () => {
    const result = runPython([
      "-c",
      [
        "import json",
        "from tools.i18n.tokens import protect_text, tokens_preserved",
        "source = 'Track $v = f\\\\lambda$, `code`, and {{placeholder}} exactly.'",
        "protected = protect_text(source)",
        "translated = protected.restore('[zhHK] ' + protected.masked)",
        "print(json.dumps({'preserved': tokens_preserved(source, translated), 'text': translated}, ensure_ascii=False))",
      ].join("; "),
    ]);

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.preserved).toBe(true);
    expect(payload.text).toContain("$v = f\\lambda$");
    expect(payload.text).toContain("`code`");
    expect(payload.text).toContain("{{placeholder}}");
  });

  it("rejects invalid overlay keys during validation", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "open-model-lab-i18n-validate-"));
    const overlayRoot = path.join(tempRoot, "content", "i18n");

    try {
      const translateRun = runPython([
        "tools/i18n/translate_content.py",
        path.join(repoRoot, "content", "concepts", "simple-harmonic-motion.json"),
        "--locale",
        "zh-HK",
        "--overlay-root",
        overlayRoot,
        "--provider",
        "mock",
      ]);

      expect(translateRun.status).toBe(0);

      const overlayPath = path.join(
        overlayRoot,
        "zh-HK",
        "concepts",
        "simple-harmonic-motion.json",
      );
      const overlay = JSON.parse(fs.readFileSync(overlayPath, "utf8"));
      overlay.illegalKey = "should fail";
      fs.writeFileSync(overlayPath, `${JSON.stringify(overlay, null, 2)}\n`, "utf8");

      const validateRun = runPython([
        "tools/i18n/validate_overlays.py",
        "--locale",
        "zh-HK",
        "--overlay-root",
        overlayRoot,
      ]);

      expect(validateRun.status).toBe(1);
      const report = JSON.parse(validateRun.stdout);
      expect(report.valid).toBe(false);
      expect(report.problems).toEqual(
        expect.arrayContaining([expect.stringContaining("illegalKey")]),
      );
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
