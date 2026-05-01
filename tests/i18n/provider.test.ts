// @vitest-environment node

import { spawn, spawnSync } from "node:child_process";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const python =
  process.env.PYTHON ??
  process.env.PYTHON3 ??
  (process.platform === "win32" ? "python" : "python3");

function runPython(code: string, env: Record<string, string | undefined> = {}) {
  const nextEnv = { ...process.env };
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete nextEnv[key];
    } else {
      nextEnv[key] = value;
    }
  }

  const result = spawnSync(python, ["-X", "utf8", "-c", code], {
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

function runPythonAsync(code: string, env: Record<string, string | undefined> = {}) {
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
    const child = spawn(python, ["-X", "utf8", "-c", code], {
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

describe("i18n provider", () => {
  it("defaults real selection to ollama with local defaults", () => {
    const result = runPython(
      `
import json
from tools.i18n.provider import select_provider
provider = select_provider("zh-HK")
print(json.dumps({
  "kind": provider.kind,
  "className": provider.__class__.__name__,
  "baseUrl": getattr(provider, "base_url", None),
  "model": getattr(provider, "model", None),
  "timeoutMs": getattr(provider, "timeout_ms", None),
  "retries": getattr(provider, "retries", None),
}, ensure_ascii=False))
      `,
      {
        OPEN_MODEL_LAB_I18N_PROVIDER: undefined,
        OPEN_MODEL_LAB_I18N_OLLAMA_BASE_URL: undefined,
        OPEN_MODEL_LAB_I18N_OLLAMA_MODEL: undefined,
        OPEN_MODEL_LAB_I18N_OLLAMA_TIMEOUT_MS: undefined,
        OPEN_MODEL_LAB_I18N_OLLAMA_RETRIES: undefined,
      },
    );

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      kind: "ollama",
      className: "OllamaProvider",
      baseUrl: "http://127.0.0.1:11434/v1",
      model: "qwen2.5:7b",
      timeoutMs: 120000,
      retries: 2,
    });
  });

  it("lets an explicit mock provider override the environment", () => {
    const result = runPython(
      `
import json
from tools.i18n.provider import select_provider
provider = select_provider("zh-HK", kind="mock")
print(json.dumps({"kind": provider.kind, "className": provider.__class__.__name__}, ensure_ascii=False))
      `,
      {
        OPEN_MODEL_LAB_I18N_PROVIDER: "ollama",
        OPEN_MODEL_LAB_I18N_OLLAMA_MODEL: "wrong-model",
      },
    );

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      kind: "mock",
      className: "MockTranslationProvider",
    });
  });

  it("pings ollama through the OpenAI-compatible local endpoints", async () => {
    const server = await startMockOllamaServer();

    try {
      const result = await runPythonAsync(
        `
import json
from tools.i18n.provider import ping_provider, ProviderOptions
report = ping_provider(
  "zh-HK",
  kind="ollama",
  options=ProviderOptions(base_url="${server.baseUrl}", model="qwen2.5:7b"),
)
print(json.dumps(report, ensure_ascii=False))
        `,
      );

      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout)).toMatchObject({
        status: "ok",
        kind: "ollama",
        model: "qwen2.5:7b",
      });
      expect(server.requests.some((request) => request.method === "GET" && request.url === "/v1/models")).toBe(true);
      expect(
        server.requests.some(
          (request) => request.method === "POST" && request.url === "/v1/chat/completions",
        ),
      ).toBe(true);
    } finally {
      await server.close();
    }
  });

  it("uses the TranslateGemma single-user prompt contract for plain-text single-field translations", async () => {
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

    try {
      const result = await runPythonAsync(
        `
import json
from tools.i18n.provider import ProviderOptions, TranslationJob, select_provider
provider = select_provider(
  "zh-HK",
  kind="ollama",
  options=ProviderOptions(base_url="${server.baseUrl}", model="translategemma:12b", retries=0),
)
payload = provider.translate(
  TranslationJob(
    locale="zh-HK",
    item_kind="concept",
    item_id="simple-harmonic-motion",
    source_title="Simple Harmonic Motion",
    fields={"f0001": "Hello world"},
    context={},
  )
)
print(json.dumps(payload, ensure_ascii=False))
        `,
      );

      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout)).toMatchObject({ f0001: "ZH: Hello world" });

      const request = server.requests.find(
        (item) => item.method === "POST" && item.url === "/v1/chat/completions",
      );
      expect(request).toBeDefined();
      expect(request!.body.response_format).toBeUndefined();
      expect(request!.body.messages).toHaveLength(1);
      expect(request!.body.messages?.[0]).toMatchObject({ role: "user" });

      const prompt = getMessageContent(request!.body, 0);
      expect(prompt).toContain(
        "You are a professional English (en) to Traditional Chinese (Hong Kong) (zh-HK) translator.",
      );
      expect(prompt).toContain(
        "Produce only the Traditional Chinese (Hong Kong) translation, without any additional explanations or commentary.",
      );
      expect(prompt).toContain("\n\n\nHello world");
    } finally {
      await server.close();
    }
  });

  it("retries malformed local output and succeeds on the next response", async () => {
    const server = await startMockOllamaServer({
      chatReplies: [
        { content: "not json" },
        { content: JSON.stringify({ f0001: "ZH: corrected" }) },
      ],
    });

    try {
      const result = await runPythonAsync(
        `
import json
from tools.i18n.provider import ProviderOptions, TranslationJob, select_provider
provider = select_provider(
  "zh-HK",
  kind="ollama",
  options=ProviderOptions(base_url="${server.baseUrl}", model="qwen2.5:7b", retries=1),
)
payload = provider.translate(
  TranslationJob(
    locale="zh-HK",
    item_kind="concept",
    item_id="simple-harmonic-motion",
    source_title="Simple Harmonic Motion",
    fields={"f0001": "Hello"},
    field_hints={"f0001": "title"},
    context={},
  )
)
print(json.dumps(payload, ensure_ascii=False))
        `,
      );

      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout)).toMatchObject({ f0001: "ZH: corrected" });
      expect(
        server.requests.filter(
          (request) => request.method === "POST" && request.url === "/v1/chat/completions",
        ).length,
      ).toBe(2);
    } finally {
      await server.close();
    }
  });

  it("ignores known wrapper metadata before alias validation", async () => {
    const server = await startMockOllamaServer({
      chatReplies: [
        {
          content: JSON.stringify({
            translations: {
              itemId: "concept:simple-harmonic-motion",
              itemKind: "concept",
              sourceTitle: "Simple Harmonic Motion",
              context: { chunk: { index: 1, total: 1, fieldCount: 1, charCount: 5 } },
              f0001: "ZH: wrapped",
            },
          }),
        },
      ],
    });

    try {
      const result = await runPythonAsync(
        `
import json
from tools.i18n.provider import ProviderOptions, TranslationJob, select_provider
provider = select_provider(
  "zh-HK",
  kind="ollama",
  options=ProviderOptions(base_url="${server.baseUrl}", model="qwen2.5:7b", retries=0),
)
payload = provider.translate(
  TranslationJob(
    locale="zh-HK",
    item_kind="concept",
    item_id="simple-harmonic-motion",
    source_title="Simple Harmonic Motion",
    fields={"f0001": "Hello"},
    context={"note": "wrapper drift"},
  )
)
print(json.dumps(payload, ensure_ascii=False))
        `,
      );

      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout)).toMatchObject({ f0001: "ZH: wrapped" });
      expect(
        server.requests.filter(
          (request) => request.method === "POST" && request.url === "/v1/chat/completions",
        ).length,
      ).toBe(1);
    } finally {
      await server.close();
    }
  });

  it("rejects unexpected alias drift and succeeds on retry", async () => {
    const server = await startMockOllamaServer({
      chatReplies: [
        { content: JSON.stringify({ id: "bad", label: "bad", template: "bad" }) },
        { content: JSON.stringify({ f0001: "ZH: repaired" }) },
      ],
    });

    try {
      const result = await runPythonAsync(
        `
import json
from tools.i18n.provider import ProviderOptions, TranslationJob, select_provider
provider = select_provider(
  "zh-HK",
  kind="ollama",
  options=ProviderOptions(base_url="${server.baseUrl}", model="qwen2.5:7b", retries=1),
)
payload = provider.translate(
  TranslationJob(
    locale="zh-HK",
    item_kind="concept",
    item_id="simple-harmonic-motion",
    source_title="Simple Harmonic Motion",
    fields={"f0001": "Hello"},
    field_hints={"f0001": "title"},
    context={},
  )
)
print(json.dumps(payload, ensure_ascii=False))
        `,
      );

      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout)).toMatchObject({ f0001: "ZH: repaired" });
      expect(
        server.requests.filter(
          (request) => request.method === "POST" && request.url === "/v1/chat/completions",
        ).length,
      ).toBe(2);
    } finally {
      await server.close();
    }
  });

  it("treats reordered protected tokens as preserved but still reports missing tokens", async () => {
    const result = await runPythonAsync(
      `
import json
from tools.i18n.tokens import format_token_mismatch, tokens_preserved
source = "Track $v = f\\\\lambda$, " + chr(96) + "code" + chr(96) + ", and {{placeholder}} exactly."
reordered = "Exactly " + chr(96) + "code" + chr(96) + ", then {{placeholder}} and $v = f\\\\lambda$."
missing = "Exactly " + chr(96) + "code" + chr(96) + " and $v = f\\\\lambda$."
print(json.dumps({
  "reordered": tokens_preserved(source, reordered),
  "missing": tokens_preserved(source, missing),
  "mismatch": format_token_mismatch(source, missing),
}, ensure_ascii=False))
      `,
    );

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.reordered).toBe(true);
    expect(payload.missing).toBe(false);
    expect(payload.mismatch).toContain("missing:");
  });

  it("fails clearly when the Ollama server is unreachable", async () => {
    const result = await runPythonAsync(`
from tools.i18n.provider import ProviderOptions, TranslationJob, select_provider
provider = select_provider(
  "zh-HK",
  kind="ollama",
  options=ProviderOptions(base_url="http://127.0.0.1:65534/v1", model="qwen2.5:7b", timeout_ms=250),
)
provider.translate(
  TranslationJob(
    locale="zh-HK",
    item_kind="concept",
    item_id="simple-harmonic-motion",
    source_title="Simple Harmonic Motion",
    fields={"field": "Hello"},
    context={},
  )
)
    `);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("connection error");
  });

  it("fails clearly when the requested local model is unavailable", async () => {
    const server = await startMockOllamaServer({ models: ["some-other-model"] });

    try {
      const result = await runPythonAsync(
        `
from tools.i18n.provider import ProviderOptions, TranslationJob, select_provider
provider = select_provider(
  "zh-HK",
  kind="ollama",
  options=ProviderOptions(base_url="${server.baseUrl}", model="qwen2.5:7b"),
)
provider.translate(
  TranslationJob(
    locale="zh-HK",
    item_kind="concept",
    item_id="simple-harmonic-motion",
    source_title="Simple Harmonic Motion",
    fields={"field": "Hello"},
    context={},
  )
)
        `,
      );

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("model unavailable");
    } finally {
      await server.close();
    }
  });

  it("preserves protected tokens through the ollama provider path", async () => {
    const server = await startMockOllamaServer({
      chatReplies: [
        (body: MockRequestBody) => {
          const payload = JSON.parse(getMessageContent(body, 1)) as {
            fields: Record<string, string>;
          };
          return { content: JSON.stringify({ field: `[zhHK] ${payload.fields.field}` }) };
        },
      ],
    });

    try {
      const result = await runPythonAsync(
        `
import json
from tools.i18n.provider import ProviderOptions, TranslationJob, select_provider
from tools.i18n.tokens import protect_text, tokens_preserved

source = "Track $v = f\\\\lambda$, " + chr(96) + "code" + chr(96) + ", and {{placeholder}} exactly."
protected = protect_text(source)
provider = select_provider(
  "zh-HK",
  kind="ollama",
  options=ProviderOptions(base_url="${server.baseUrl}", model="qwen2.5:7b"),
)
translated = provider.translate(
  TranslationJob(
    locale="zh-HK",
    item_kind="concept",
    item_id="simple-harmonic-motion",
    source_title="Simple Harmonic Motion",
    fields={"field": protected.masked},
    context={},
  )
)
restored = protected.restore(translated["field"])
print(json.dumps({
  "preserved": tokens_preserved(source, restored),
  "text": restored,
}, ensure_ascii=False))
        `,
      );

      expect(result.status).toBe(0);
      const payload = JSON.parse(result.stdout);
      expect(payload.preserved).toBe(true);
      expect(payload.text).toContain("$v = f\\lambda$");
      expect(payload.text).toContain("`code`");
      expect(payload.text).toContain("{{placeholder}}");
    } finally {
      await server.close();
    }
  });

  it("describes compact marker contracts consistently in prompt and payload", () => {
    const result = runPython(`
import json
from tools.i18n.provider import TranslationJob, _build_request_messages
system, user = _build_request_messages(
  job=TranslationJob(
    locale="zh-HK",
    item_kind="concept",
    item_id="bohr-model",
    source_title="Bohr Model",
    fields={"f0001": "Explain [[I0]] and [[M1]] with [[P2]]."},
    context={"chunk": {"mode": "token-focused-single-field-repair", "singleField": True}},
    repair_instructions="Copy markers exactly once.",
    required_markers={"[[I0]]": "n_i", "[[M1]]": "$F$", "[[P2]]": "{{value}}"},
  ),
  glossary={},
  previous_error="token mismatch",
)
print(json.dumps({"system": system, "user": json.loads(user)}, ensure_ascii=False))
    `);

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout) as {
      system: string;
      user: {
        fields: Record<string, string>;
        requiredMarkers: string[];
        requiredMarkerMap: Record<string, string>;
        repairInstructions: string;
      };
    };

    expect(payload.system).toContain("[[M0]]");
    expect(payload.system).toContain("Copy every protected marker exactly once");
    expect(payload.system).toContain("Required markers for this field: [[I0]], [[M1]], [[P2]].");
    expect(payload.user.requiredMarkers).toEqual(["[[I0]]", "[[M1]]", "[[P2]]"]);
    expect(payload.user.requiredMarkerMap).toEqual({
      "[[I0]]": "n_i",
      "[[M1]]": "$F$",
      "[[P2]]": "{{value}}",
    });
    expect(payload.user.repairInstructions).toContain("Copy markers exactly once.");
  }, 15_000);
});
