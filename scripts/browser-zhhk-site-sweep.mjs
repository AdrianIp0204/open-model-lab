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
const detailedOutputPath = path.join(root, "output", "browser-zhhk-site-sweep.details.json");
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
const ENGLISH_SOURCE_CATEGORIES = [
  "message",
  "content overlay fallback",
  "simulation hard-code",
  "user fixture",
  "allowed product name",
];
const MAX_DETAIL_SNIPPETS = 6;
const MAX_DETAIL_TEXT_LENGTH = 220;
// These names are seeded by the dev account harness as user display names, not authored UI copy.
// Keep them out of the zh-HK mixed-language audit so signed-in fixture data does not mask product
// translation regressions.
const DEV_ACCOUNT_HARNESS_DISPLAY_NAMES = ["Free learner", "Supporter learner"];

function capText(text, maxLength = MAX_DETAIL_TEXT_LENGTH) {
  const normalized = text.replace(/\s+/gu, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

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

function stripDevAccountHarnessDisplayNames(line) {
  return DEV_ACCOUNT_HARNESS_DISPLAY_NAMES.reduce(
    (current, name) => current.replaceAll(name, " "),
    line,
  );
}

function hasAllowedEnglishPhrase(line) {
  return ALLOWED_ENGLISH_PHRASES.some((pattern) =>
    new RegExp(pattern.source, pattern.flags).test(line),
  );
}

function hasDevAccountHarnessDisplayName(line) {
  return DEV_ACCOUNT_HARNESS_DISPLAY_NAMES.some((name) => line.includes(name));
}

function hasSuspiciousEnglish(line) {
  const sanitized = sanitizeLineForEnglishAudit(stripAllowedEnglish(line));

  if (!sanitized) {
    return false;
  }

  if (ENGLISH_PHRASE_PATTERN.test(sanitized)) {
    return true;
  }

  return (
    ENGLISH_SINGLE_WORD_PATTERN.test(sanitized) &&
    !ALLOWED_ENGLISH_SINGLE_WORDS.has(sanitized.toLowerCase())
  );
}

function inferEnglishSourceCategory(
  line,
  routePath,
  entry,
  { stripDevAccountHarnessNames = false } = {},
) {
  if (stripDevAccountHarnessNames && hasDevAccountHarnessDisplayName(line)) {
    return "user fixture";
  }

  if (MESSAGE_KEY_PATTERN.test(line)) {
    return "message";
  }

  if (
    /\/(?:concepts|guided|tracks|challenges|tests)(?:\/|$)/u.test(routePath) &&
    !/(button|link|navigation|banner|contentinfo)/iu.test(
      `${entry.elementRole ?? ""} ${entry.landmark ?? ""}`,
    )
  ) {
    return "content overlay fallback";
  }

  if (
    /(?:simulation|sim|canvas|plot|graph|slider|voltage|velocity|amplitude|frequency|force|energy|charge|circuit|reaction|node|edge)/iu.test(
      `${line} ${entry.nearestHeading ?? ""} ${entry.landmark ?? ""}`,
    )
  ) {
    return "simulation hard-code";
  }

  return "message";
}

function analyzeEnglishLine(
  line,
  routePath,
  entry,
  { stripDevAccountHarnessNames = false } = {},
) {
  const hasAllowedProductName = hasAllowedEnglishPhrase(line);
  const hasFixtureName = stripDevAccountHarnessNames && hasDevAccountHarnessDisplayName(line);
  const lineWithoutFixtureNames = hasFixtureName ? stripDevAccountHarnessDisplayNames(line) : line;
  const suspiciousAfterApprovedStripping = hasSuspiciousEnglish(lineWithoutFixtureNames);

  if (!suspiciousAfterApprovedStripping) {
    if (hasFixtureName) {
      return {
        approved: true,
        sourceCategory: "user fixture",
      };
    }

    if (hasAllowedProductName) {
      return {
        approved: true,
        sourceCategory: "allowed product name",
      };
    }

    return null;
  }

  return {
    approved: false,
    sourceCategory: inferEnglishSourceCategory(line, routePath, entry, {
      stripDevAccountHarnessNames,
    }),
  };
}

function findEnglishLineFindings(
  entries,
  routePath,
  { stripDevAccountHarnessNames = false } = {},
) {
  const findings = [];
  const seen = new Set();

  for (const entry of entries) {
    const line = entry.text.trim();
    const analysis = analyzeEnglishLine(line, routePath, entry, {
      stripDevAccountHarnessNames,
    });

    if (!analysis) {
      continue;
    }

    const key = [
      analysis.approved ? "approved" : "unapproved",
      analysis.sourceCategory,
      line,
      entry.nearestHeading ?? "",
      entry.landmark ?? "",
      entry.elementTag ?? "",
      entry.elementRole ?? "",
    ].join("\u0000");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    findings.push({
      route: routePath,
      approved: analysis.approved,
      sourceCategory: analysis.sourceCategory,
      sample: capText(line),
      nearestHeading: entry.nearestHeading ? capText(entry.nearestHeading) : null,
      landmark: entry.landmark ? capText(entry.landmark) : null,
      elementTag: entry.elementTag,
      elementRole: entry.elementRole ?? null,
      snippets: entry.snippets.map((snippet) => capText(snippet)),
    });
  }

  return findings;
}

function findEnglishLeakLine(text, { stripDevAccountHarnessNames = false } = {}) {
  return (
    text
      .split(/\r?\n/gu)
      .map((line) => line.trim())
      .find((line) =>
        hasSuspiciousEnglish(
          stripDevAccountHarnessNames ? stripDevAccountHarnessDisplayNames(line) : line,
        ),
      ) ?? null
  );
}

function buildDetailedEnglishReport(allFindings) {
  const englishFindings = allFindings.filter((finding) => !finding.approved);
  const approvedFindings = allFindings.filter((finding) => finding.approved);
  const routeMap = new Map();
  const sourceCategoryMap = new Map(
    ENGLISH_SOURCE_CATEGORIES.map((sourceCategory) => [
      sourceCategory,
      {
        sourceCategory,
        unapprovedIssueCount: 0,
        approvedFindingCount: 0,
        findings: [],
      },
    ]),
  );

  for (const finding of allFindings) {
    if (!routeMap.has(finding.route)) {
      routeMap.set(finding.route, {
        route: finding.route,
        unapprovedIssueCount: 0,
        approvedFindingCount: 0,
        bySourceCategory: new Map(),
      });
    }

    const routeGroup = routeMap.get(finding.route);
    if (!routeGroup.bySourceCategory.has(finding.sourceCategory)) {
      routeGroup.bySourceCategory.set(finding.sourceCategory, {
        sourceCategory: finding.sourceCategory,
        unapprovedIssueCount: 0,
        approvedFindingCount: 0,
        findings: [],
      });
    }

    const routeSourceGroup = routeGroup.bySourceCategory.get(finding.sourceCategory);
    const globalSourceGroup = sourceCategoryMap.get(finding.sourceCategory);

    if (finding.approved) {
      routeGroup.approvedFindingCount += 1;
      routeSourceGroup.approvedFindingCount += 1;
      globalSourceGroup.approvedFindingCount += 1;
    } else {
      routeGroup.unapprovedIssueCount += 1;
      routeSourceGroup.unapprovedIssueCount += 1;
      globalSourceGroup.unapprovedIssueCount += 1;
    }

    routeSourceGroup.findings.push(finding);
    globalSourceGroup.findings.push(finding);
  }

  const routes = [...routeMap.values()].map((routeGroup) => ({
    ...routeGroup,
    bySourceCategory: [...routeGroup.bySourceCategory.values()].sort((a, b) =>
      a.sourceCategory.localeCompare(b.sourceCategory),
    ),
  }));

  return {
    unapprovedIssueCount: englishFindings.length,
    approvedFindingCount: approvedFindings.length,
    sourceCategories: ENGLISH_SOURCE_CATEGORIES,
    routes,
    bySourceCategory: [...sourceCategoryMap.values()],
  };
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
  const routeEnglishFindings = [];

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
      return { issues: routeIssues, englishFindings: routeEnglishFindings };
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
    const visibleTextEntries = await page.evaluate(
      ({ maxSnippets }) => {
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
          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            style.opacity !== "0" &&
            element.getClientRects().length > 0
          );
        }

      function normalizeText(text) {
        return text.replace(/\s+/gu, " ").trim();
      }

      function inferElementRole(element) {
        const explicitRole = element.getAttribute("role");

        if (explicitRole) {
          return explicitRole;
        }

        const tagName = element.tagName.toLowerCase();

        if (/^h[1-6]$/u.test(tagName)) {
          return "heading";
        }

        if (tagName === "a" && element.hasAttribute("href")) {
          return "link";
        }

        if (tagName === "button") {
          return "button";
        }

        if (tagName === "main") {
          return "main";
        }

        if (tagName === "nav") {
          return "navigation";
        }

        if (tagName === "header") {
          return "banner";
        }

        if (tagName === "footer") {
          return "contentinfo";
        }

        if (tagName === "aside") {
          return "complementary";
        }

        if (tagName === "form") {
          return "form";
        }

        return null;
      }

      function getElementLabel(element) {
        return normalizeText(
          element.getAttribute("aria-label") ??
            element.getAttribute("data-testid") ??
            element.getAttribute("id") ??
            "",
        );
      }

      function getNearestHeading(element) {
        const scopedContainer = element.closest("section, article, main, aside, nav, header, footer, form");
        const scopedHeading = scopedContainer?.querySelector("h1, h2, h3, h4, h5, h6");

        if (scopedHeading?.textContent) {
          return normalizeText(scopedHeading.textContent);
        }

        const headings = [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")];
        const previousHeading = headings
          .filter((heading) => heading.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING)
          .at(-1);

        return previousHeading?.textContent ? normalizeText(previousHeading.textContent) : null;
      }

      function getLandmark(element) {
        const landmark = element.closest(
          [
            "main",
            "nav",
            "header",
            "footer",
            "aside",
            "form",
            "section",
            "article",
            "[role='main']",
            "[role='navigation']",
            "[role='banner']",
            "[role='contentinfo']",
            "[role='complementary']",
            "[role='form']",
            "[role='region']",
          ].join(","),
        );

        if (!landmark) {
          return null;
        }

        const tagName = landmark.tagName.toLowerCase();
        const role = inferElementRole(landmark);
        const label = getElementLabel(landmark);
        const heading = landmark.querySelector("h1, h2, h3, h4, h5, h6")?.textContent;
        const parts = [role ?? tagName, label || normalizeText(heading ?? "")].filter(Boolean);

        return parts.join(": ");
      }

      function getSnippets(element) {
        const container =
          element.closest("section, article, form, nav, aside, header, footer, main, [role]") ??
          element.parentElement ??
          element;
        const snippets = [];
        const seenSnippets = new Set();
        const text = container.innerText ?? container.textContent ?? "";

        for (const line of text.split(/\r?\n/gu)) {
          const snippet = normalizeText(line);

          if (!snippet || seenSnippets.has(snippet)) {
            continue;
          }

          seenSnippets.add(snippet);
          snippets.push(snippet);

          if (snippets.length >= maxSnippets) {
            break;
          }
        }

        return snippets;
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

        const text = normalizeText(node.textContent ?? "");

        if (!text) {
          continue;
        }

        const nearestHeading = getNearestHeading(parent);
        const landmark = getLandmark(parent);
        const elementTag = parent.tagName.toLowerCase();
        const elementRole = inferElementRole(parent);
        const snippets = getSnippets(parent);
        const entryKey = [text, nearestHeading ?? "", landmark ?? "", elementTag, elementRole ?? ""].join(
          "\u0000",
        );

        if (seen.has(entryKey)) {
          continue;
        }

        seen.add(entryKey);
        lines.push({
          text,
          nearestHeading,
          landmark,
          elementTag,
          elementRole,
          snippets,
        });
      }

      return lines;
      },
      { maxSnippets: MAX_DETAIL_SNIPPETS },
    );
    const bodyText = visibleTextEntries.map((entry) => entry.text).join("\n");
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
      return { issues: routeIssues, englishFindings: routeEnglishFindings };
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

    const stripDevAccountHarnessNames =
      category === "signed-in-free" || category === "signed-in-premium";
    const englishFindings = shouldAuditEnglishLeak(routePath)
      ? findEnglishLineFindings(visibleTextEntries, routePath, { stripDevAccountHarnessNames })
      : [];
    routeEnglishFindings.push(...englishFindings);
    const unapprovedEnglishFindings = englishFindings.filter((finding) => !finding.approved);
    if (unapprovedEnglishFindings.length > 0) {
      routeIssues.push({
        route: routePath,
        category,
        kind: "ENGLISH_LEAK",
        sample: unapprovedEnglishFindings[0].sample,
        findingCount: unapprovedEnglishFindings.length,
        sourceCategories: [
          ...new Set(unapprovedEnglishFindings.map((finding) => finding.sourceCategory)),
        ],
        detailArtifact: path.relative(root, detailedOutputPath),
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

  return { issues: routeIssues, englishFindings: routeEnglishFindings };
}

async function scanRouteList(context, baseUrl, routes, category) {
  const page = await context.newPage();
  const issues = [];
  const englishFindings = [];

  for (const routePath of routes) {
    const routeResult = await scanRoute(page, baseUrl, routePath, category);
    const routeIssues = routeResult.issues;
    issues.push(...routeIssues);
    englishFindings.push(...routeResult.englishFindings);
  }

  await page.close();
  return { issues, englishFindings };
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
  const publicResult = await scanRouteList(publicContext, publicBaseUrl, publicRoutes, "public");
  await publicContext.close();

  const signedInFreeContext = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
  });
  await stubAds(signedInFreeContext);
  await setHarnessSession(signedInFreeContext, "signed-in-free");
  const signedInFreeResult = await scanRouteList(
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
  const signedInPremiumResult = await scanRouteList(
    signedInPremiumContext,
    devBaseUrl,
    signedInPremiumRoutes,
    "signed-in-premium",
  );
  await signedInPremiumContext.close();

  const issues = [
    ...publicResult.issues,
    ...signedInFreeResult.issues,
    ...signedInPremiumResult.issues,
  ];
  const englishFindings = [
    ...publicResult.englishFindings,
    ...signedInFreeResult.englishFindings,
    ...signedInPremiumResult.englishFindings,
  ];
  const detailedEnglishReport = buildDetailedEnglishReport(englishFindings);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(detailedOutputPath, JSON.stringify(detailedEnglishReport, null, 2), "utf8");
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        publicRouteCount: publicRoutes.length,
        signedInFreeRouteCount: signedInFreeRoutes.length,
        signedInPremiumRouteCount: signedInPremiumRoutes.length,
        issueCount: issues.length,
        englishLeakUnapprovedIssueCount: detailedEnglishReport.unapprovedIssueCount,
        approvedEnglishFindingCount: detailedEnglishReport.approvedFindingCount,
        detailedArtifact: path.relative(root, detailedOutputPath),
        englishLeakDetails: detailedEnglishReport,
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
        englishLeakUnapprovedIssueCount: detailedEnglishReport.unapprovedIssueCount,
        approvedEnglishFindingCount: detailedEnglishReport.approvedFindingCount,
        outputPath: path.relative(root, outputPath),
        detailedOutputPath: path.relative(root, detailedOutputPath),
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
