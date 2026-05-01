import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

const root = process.cwd();
const shouldAutostartSweepServer =
  process.argv.includes("--autostart") ||
  /^(1|true|yes|on)$/i.test(process.env.OPEN_MODEL_LAB_SWEEP_AUTOSTART ?? "");
const managedBaseUrl = "http://127.0.0.1:3100";
let publicBaseUrl = process.env.OPEN_MODEL_LAB_BASE_URL ?? "http://127.0.0.1:3000";
let devBaseUrl = process.env.OPEN_MODEL_LAB_DEV_BASE_URL ?? "http://127.0.0.1:3100";
const outputPath = path.join(root, "output", "browser-zhhk-site-sweep.json");
const managedServerLogPath = path.join(root, "output", "browser-zhhk-site-sweep.server.log");
const managedServerErrorLogPath = path.join(
  root,
  "output",
  "browser-zhhk-site-sweep.server.err.log",
);

const conceptsCatalog = JSON.parse(
  fs.readFileSync(path.join(root, "content", "catalog", "concepts.json"), "utf8"),
);
const guidedCollectionsCatalog = JSON.parse(
  fs.readFileSync(path.join(root, "content", "catalog", "guided-collections.json"), "utf8"),
);
const starterTracksCatalog = JSON.parse(
  fs.readFileSync(path.join(root, "content", "catalog", "starter-tracks.json"), "utf8"),
);

const publishedConceptRoutes = conceptsCatalog
  .filter((concept) => concept.status === "published")
  .map((concept) => `/zh-HK/concepts/${concept.slug}`);

const guidedRoutes = guidedCollectionsCatalog.map(
  (collection) => `/zh-HK/guided/${collection.slug}`,
);
const trackRoutes = starterTracksCatalog.map((track) => `/zh-HK/tracks/${track.slug}`);

const publicRoutes = [
  "/zh-HK",
  "/zh-HK/about",
  "/zh-HK/pricing",
  "/zh-HK/billing",
  "/zh-HK/ads",
  "/zh-HK/contact",
  "/zh-HK/start",
  "/zh-HK/guided",
  "/zh-HK/challenges",
  "/zh-HK/concepts",
  "/zh-HK/search",
  "/zh-HK/privacy",
  "/zh-HK/terms",
  ...guidedRoutes,
  ...trackRoutes,
  ...publishedConceptRoutes,
];

const signedInFreeRoutes = ["/account", "/zh-HK/account", "/dashboard", "/zh-HK/dashboard"];

const signedInPremiumRoutes = [
  "/account/setups",
  "/zh-HK/account/setups",
  "/account/compare-setups",
  "/zh-HK/account/compare-setups",
  "/account/study-plans",
  "/zh-HK/account/study-plans",
  "/dashboard/analytics",
  "/zh-HK/dashboard/analytics",
];

const DISALLOWED_PATTERNS = [
  { kind: "QUESTION_MARK_GARBAGE", pattern: /\?{2,}|ï¿½/u },
  {
    kind: "SIMPLIFIED_CHAR",
    pattern: /[为这设读图点线术层触样压观际动让页发总时数条颗级测并运应觉气温关闭]/u,
  },
  { kind: "MAINLAND_TERM", pattern: /工作台|绑定/u },
];

const VISIBLE_ERROR_PATTERNS = [
  /This page couldn't load/i,
  /Application error/i,
  /Something went wrong/i,
  /Unhandled Runtime Error/i,
  /Hydration failed/i,
  /ReferenceError/i,
];

const ALLOWED_ENGLISH_PHRASES = [
  /\bOpen Model Lab\b/giu,
  /\bOPEN MODEL LAB\b/giu,
  /\bBuy Me a Coffee\b/giu,
  /\bGoogle AdSense\b/giu,
  /\bSupabase\b/giu,
  /\bStripe\b/giu,
  /\bPremium\b/giu,
  /\bEnglish\b/giu,
];
const EMAIL_PATTERN = /\b\S+@\S+\b/gu;
const URL_PATTERN = /\bhttps?:\/\/\S+\b/gu;
const INLINE_MATH_TOKEN_PATTERN =
  /\{\{[^}]+\}\}|\$[^$]+\$|\b[a-zA-Z]+(?:_[a-zA-Z0-9]+)+\b|\b[a-zA-Z]+(?:\/[a-zA-Z0-9]+)+\b/gu;
const ENGLISH_PHRASE_PATTERN = /\b[A-Za-z][A-Za-z0-9'/-]{2,}(?:\s+[A-Za-z][A-Za-z0-9'/-]{1,})+\b/u;
const ENGLISH_SINGLE_WORD_PATTERN = /^[A-Za-z][A-Za-z0-9'/-]{3,}$/u;
const MESSAGE_KEY_PATTERN = /\b[A-Z][A-Za-z0-9]+(?:\.[A-Za-z0-9_-]+){2,}\b/u;
const ALLOWED_ENGLISH_SINGLE_WORDS = new Set(["premium", "stripe", "supabase", "english"]);

function sanitizeLineForEnglishAudit(line) {
  return line
    .replace(EMAIL_PATTERN, " ")
    .replace(URL_PATTERN, " ")
    .replace(INLINE_MATH_TOKEN_PATTERN, " ")
    .replace(/\\[A-Za-z]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function stripAllowedEnglish(line) {
  return ALLOWED_ENGLISH_PHRASES.reduce((current, pattern) => current.replace(pattern, " "), line);
}

function findEnglishLeakLine(text) {
  const lines = text
    .split(/\r?\n/gu)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const sanitized = sanitizeLineForEnglishAudit(stripAllowedEnglish(line));

    if (!sanitized) {
      continue;
    }

    if (ENGLISH_PHRASE_PATTERN.test(sanitized)) {
      return line;
    }

    if (
      ENGLISH_SINGLE_WORD_PATTERN.test(sanitized) &&
      !ALLOWED_ENGLISH_SINGLE_WORDS.has(sanitized.toLowerCase())
    ) {
      return line;
    }
  }

  return null;
}

function shouldAuditEnglishLeak(routePath) {
  return routePath.startsWith("/zh-HK");
}

async function waitForHttpOk(url, timeoutMs = 120_000) {
  const start = Date.now();
  let lastError = null;

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: "manual" });

      if (response.ok) {
        return;
      }

      lastError = new Error(`Received ${response.status} for ${url}`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(
    `Timed out waiting for ${url}. ${
      lastError instanceof Error ? lastError.message : String(lastError ?? "")
    }`,
  );
}

function startManagedSweepServer() {
  fs.mkdirSync(path.dirname(managedServerLogPath), { recursive: true });
  fs.writeFileSync(managedServerLogPath, "", "utf8");
  fs.writeFileSync(managedServerErrorLogPath, "", "utf8");

  const child =
    process.platform === "win32"
      ? spawn("cmd.exe", ["/d", "/s", "/c", "pnpm exec next dev --hostname 127.0.0.1 --port 3100"], {
          cwd: root,
          env: {
            ...process.env,
            ENABLE_DEV_ACCOUNT_HARNESS: "true",
            NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL: managedBaseUrl,
            STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? "sk_test_sweep",
            STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_sweep",
            STRIPE_PREMIUM_PRICE_ID: process.env.STRIPE_PREMIUM_PRICE_ID ?? "price_sweep",
            STRIPE_PREMIUM_ACHIEVEMENT_COUPON_ID:
              process.env.STRIPE_PREMIUM_ACHIEVEMENT_COUPON_ID ?? "coupon_sweep",
            OPEN_MODEL_LAB_DEV_ACCOUNT_HARNESS_STORE_PATH: path.join(
              root,
              "output",
              "browser-zhhk-site-sweep.dev-account-harness.json",
            ),
            NEXT_TELEMETRY_DISABLED: "1",
          },
          stdio: ["ignore", "pipe", "pipe"],
        })
      : spawn("pnpm", ["exec", "next", "dev", "--hostname", "127.0.0.1", "--port", "3100"], {
          cwd: root,
          env: {
            ...process.env,
            ENABLE_DEV_ACCOUNT_HARNESS: "true",
            NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL: managedBaseUrl,
            STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? "sk_test_sweep",
            STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_sweep",
            STRIPE_PREMIUM_PRICE_ID: process.env.STRIPE_PREMIUM_PRICE_ID ?? "price_sweep",
            STRIPE_PREMIUM_ACHIEVEMENT_COUPON_ID:
              process.env.STRIPE_PREMIUM_ACHIEVEMENT_COUPON_ID ?? "coupon_sweep",
            OPEN_MODEL_LAB_DEV_ACCOUNT_HARNESS_STORE_PATH: path.join(
              root,
              "output",
              "browser-zhhk-site-sweep.dev-account-harness.json",
            ),
            NEXT_TELEMETRY_DISABLED: "1",
          },
          stdio: ["ignore", "pipe", "pipe"],
        });

  child.stdout.on("data", (chunk) => {
    fs.appendFileSync(managedServerLogPath, chunk);
  });
  child.stderr.on("data", (chunk) => {
    fs.appendFileSync(managedServerErrorLogPath, chunk);
  });

  child.on("exit", (code, signal) => {
    if (code !== null && code !== 0) {
      fs.appendFileSync(
        managedServerErrorLogPath,
        `\n[next-dev exited] code=${code} signal=${signal ?? ""}\n`,
      );
    }
  });

  return child;
}

async function expectHarnessRedirect(response, action) {
  if (response.status() === 303) {
    return;
  }

  const payload = await response.text().catch(() => "");

  throw new Error(
    `Dev account harness ${action} failed with ${response.status()}. ` +
      `Make sure the harness-enabled dev server is running at ${devBaseUrl}. ` +
      (payload ? `Response: ${payload}` : ""),
  );
}

async function setHarnessSession(context, state) {
  const page = await context.newPage();

  try {
    const response = await page.context().request.post(`${devBaseUrl}/api/dev/account-harness`, {
      form: {
        action: "set-session",
        state,
        returnTo: "/dev/account-harness",
      },
      maxRedirects: 0,
    });

    await expectHarnessRedirect(response, `set-session(${state})`);
  } finally {
    await page.close();
  }
}

async function stubAds(context) {
  await context.route(
    /^https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/i,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: "",
      });
    },
  );
}

async function scanRoute(page, baseUrl, routePath, category) {
  const url = new URL(routePath, baseUrl).toString();
  const routeIssues = [];

  try {
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    if (!response) {
      routeIssues.push({
        route: routePath,
        category,
        kind: "NO_DOCUMENT_RESPONSE",
        sample: "No document response returned.",
      });
      return routeIssues;
    }

    if (!response.ok()) {
      routeIssues.push({
        route: routePath,
        category,
        kind: "HTTP_ERROR",
        sample: `${response.status()} ${response.statusText()}`,
      });
    }

    await page.locator("body").waitFor({ state: "visible", timeout: 15_000 });
    await page.waitForTimeout(750);
    const pageTitle = (await page.title()).trim();
    const bodyText = await page.evaluate(() => {
      const skipSelectors = [
        ".sr-only",
        "[aria-hidden='true']",
        "[hidden]",
        "script",
        "style",
        "noscript",
        "template",
      ];

      function isVisibleElement(element) {
        const style = window.getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
      }

      const lines = [];
      const seen = new Set();
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);

      while (walker.nextNode()) {
        const node = walker.currentNode;
        const parent = node.parentElement;

        if (!parent) {
          continue;
        }

        if (skipSelectors.some((selector) => parent.closest(selector))) {
          continue;
        }

        if (!isVisibleElement(parent)) {
          continue;
        }

        const text = node.textContent?.replace(/\s+/gu, " ").trim();

        if (!text || seen.has(text)) {
          continue;
        }

        seen.add(text);
        lines.push(text);
      }

      return lines.join("\n");
    });
    const jsonLdText = (await page.locator("script[type='application/ld+json']").allTextContents())
      .join("\n")
      .trim();

    if (!bodyText.trim()) {
      routeIssues.push({
        route: routePath,
        category,
        kind: "EMPTY_BODY",
        sample: "No visible body text found.",
      });
      return routeIssues;
    }

    const visibleError = VISIBLE_ERROR_PATTERNS.find((pattern) => pattern.test(bodyText));
    if (visibleError) {
      routeIssues.push({
        route: routePath,
        category,
        kind: "VISIBLE_ERROR",
        sample: visibleError.source,
      });
    }

    for (const { kind, pattern } of DISALLOWED_PATTERNS) {
      if (kind === "MAINLAND_TERM") {
        continue;
      }

      const match = bodyText.match(pattern);
      if (match) {
        routeIssues.push({
          route: routePath,
          category,
          kind,
          sample: match[0],
        });
      }
    }

    for (const { kind, pattern } of DISALLOWED_PATTERNS) {
      if (kind === "MAINLAND_TERM") {
        continue;
      }

      const match = pageTitle.match(pattern);
      if (match) {
        routeIssues.push({
          route: routePath,
          category,
          kind: `TITLE_${kind}`,
          sample: pageTitle,
        });
      }
    }

    const englishLeak = shouldAuditEnglishLeak(routePath) ? findEnglishLeakLine(bodyText) : null;
    if (englishLeak) {
      routeIssues.push({
        route: routePath,
        category,
        kind: "ENGLISH_LEAK",
        sample: englishLeak,
      });
    }

    const titleEnglishLeak = shouldAuditEnglishLeak(routePath)
      ? findEnglishLeakLine(pageTitle)
      : null;
    if (titleEnglishLeak) {
      routeIssues.push({
        route: routePath,
        category,
        kind: "TITLE_ENGLISH_LEAK",
        sample: pageTitle,
      });
    }

    const messageKeyLeak = jsonLdText.match(MESSAGE_KEY_PATTERN);
    if (messageKeyLeak) {
      routeIssues.push({
        route: routePath,
        category,
        kind: "JSONLD_MESSAGE_KEY_LEAK",
        sample: messageKeyLeak[0],
      });
    }
  } catch (error) {
    routeIssues.push({
      route: routePath,
      category,
      kind: "NAVIGATION_FAILED",
      sample: error instanceof Error ? error.message : String(error),
    });
  }

  return routeIssues;
}

async function scanRouteList(context, baseUrl, routes, category) {
  const page = await context.newPage();
  const issues = [];

  for (const routePath of routes) {
    const routeIssues = await scanRoute(page, baseUrl, routePath, category);
    issues.push(...routeIssues);
  }

  await page.close();
  return issues;
}

let managedSweepServerProcess = null;

if (shouldAutostartSweepServer) {
  managedSweepServerProcess = startManagedSweepServer();
  publicBaseUrl = managedBaseUrl;
  devBaseUrl = managedBaseUrl;
  await waitForHttpOk(`${managedBaseUrl}/zh-HK`);
}

const browser = await chromium.launch({ headless: true });

try {
  const publicContext = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
  });
  await stubAds(publicContext);
  const publicIssues = await scanRouteList(publicContext, publicBaseUrl, publicRoutes, "public");
  await publicContext.close();

  const signedInFreeContext = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
  });
  await stubAds(signedInFreeContext);
  await setHarnessSession(signedInFreeContext, "signed-in-free");
  const signedInFreeIssues = await scanRouteList(
    signedInFreeContext,
    devBaseUrl,
    signedInFreeRoutes,
    "signed-in-free",
  );
  await signedInFreeContext.close();

  const signedInPremiumContext = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
  });
  await stubAds(signedInPremiumContext);
  await setHarnessSession(signedInPremiumContext, "signed-in-premium");
  const signedInPremiumIssues = await scanRouteList(
    signedInPremiumContext,
    devBaseUrl,
    signedInPremiumRoutes,
    "signed-in-premium",
  );
  await signedInPremiumContext.close();

  const issues = [...publicIssues, ...signedInFreeIssues, ...signedInPremiumIssues];

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        publicRouteCount: publicRoutes.length,
        signedInFreeRouteCount: signedInFreeRoutes.length,
        signedInPremiumRouteCount: signedInPremiumRoutes.length,
        issueCount: issues.length,
        issues,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        publicRouteCount: publicRoutes.length,
        signedInFreeRouteCount: signedInFreeRoutes.length,
        signedInPremiumRouteCount: signedInPremiumRoutes.length,
        issueCount: issues.length,
        outputPath: path.relative(root, outputPath),
      },
      null,
      2,
    ),
  );

  if (issues.length > 0) {
    process.exitCode = 1;
  }
} finally {
  await browser.close();

  if (managedSweepServerProcess && !managedSweepServerProcess.killed) {
    managedSweepServerProcess.kill("SIGTERM");
  }
}
