import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import {
  analyzeZhHkSemanticEntries,
  buildZhHkSemanticReport,
} from "./zhhk-semantic-audit.mjs";

const runtimeErrorPatterns = [
  /This page couldn't load/i,
  /Application error/i,
  /Something went wrong/i,
  /Unhandled Runtime Error/i,
  /Hydration failed/i,
  /ReferenceError/i,
  /TypeError: Cannot/i,
  /Internal Server Error/i,
];

const headRoutes = [
  "/",
  "/en",
  "/zh-HK",
  "/zh-HK/concepts",
  "/zh-HK/start",
  "/zh-HK/search?q=force",
  "/zh-HK/concepts/derivative-as-slope-local-rate-of-change",
];

const browserCases = [
  {
    name: "zhhk-home-desktop",
    path: "/zh-HK",
    viewport: { name: "desktop-1440x900", width: 1440, height: 900, mobile: false },
    readySelector: "#content",
  },
  {
    name: "zhhk-concepts-desktop",
    path: "/zh-HK/concepts",
    viewport: { name: "desktop-1440x900", width: 1440, height: 900, mobile: false },
    readySelector: "#content",
  },
  {
    name: "zhhk-derivative-tablet",
    path: "/zh-HK/concepts/derivative-as-slope-local-rate-of-change",
    viewport: { name: "tablet-1024x768", width: 1024, height: 768, mobile: false },
    readySelector: '[data-testid="concept-live-lab"]',
  },
  {
    name: "zhhk-start-phone",
    path: "/zh-HK/start",
    viewport: { name: "phone-390x844", width: 390, height: 844, mobile: true },
    readySelector: "#content",
  },
];

const themes = ["paper-lab", "dark-lab"];

function printUsage() {
  console.log(`Open Model Lab deployed release verification

Usage:
  pnpm release:verify:deployed -- --base-url https://openmodellab.com --expected-commit $(git rev-parse HEAD)

Options:
  --base-url <url>          Production or Cloudflare preview URL.
  --expected-commit <sha>   Commit expected from /api/deployment. Defaults to git HEAD.
  --artifact-dir <path>     Output directory. Defaults to output/deployed-release-verification/<timestamp>.
  --no-expected-commit      Require a public marker, but do not compare it with git HEAD.
  --help                    Show this help.

Environment equivalents:
  OPEN_MODEL_LAB_RELEASE_BASE_URL
  OPEN_MODEL_LAB_EXPECTED_COMMIT
  OPEN_MODEL_LAB_RELEASE_ARTIFACT_DIR`);
}

function parseArgs(argv) {
  const options = {
    baseUrl: process.env.OPEN_MODEL_LAB_RELEASE_BASE_URL ?? "https://openmodellab.com",
    expectedCommit: process.env.OPEN_MODEL_LAB_EXPECTED_COMMIT ?? null,
    artifactDir: process.env.OPEN_MODEL_LAB_RELEASE_ARTIFACT_DIR ?? null,
    inferExpectedCommit: true,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--") {
      continue;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--base-url") {
      options.baseUrl = argv[++index];
    } else if (arg === "--expected-commit") {
      options.expectedCommit = argv[++index];
    } else if (arg === "--artifact-dir") {
      options.artifactDir = argv[++index];
    } else if (arg === "--no-expected-commit") {
      options.expectedCommit = null;
      options.inferExpectedCommit = false;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.baseUrl) {
    throw new Error("Missing --base-url.");
  }

  return options;
}

function normalizeBaseUrl(value) {
  const url = new URL(value);
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/u, "");
}

function normalizeCommit(value) {
  const normalized = value?.trim().toLowerCase() ?? "";
  return /^[a-f0-9]{7,64}$/u.test(normalized) ? normalized : null;
}

function inferGitHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function resolveExpectedCommit(options) {
  const explicit = normalizeCommit(options.expectedCommit);

  if (explicit || !options.inferExpectedCommit) {
    return explicit;
  }

  return normalizeCommit(inferGitHead());
}

function makeArtifactDir(input) {
  if (input) {
    return path.resolve(input);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/gu, "-");
  return path.join(process.cwd(), "output", "deployed-release-verification", timestamp);
}

async function fetchWithTimeout(url, init = {}, timeoutMs = 30_000) {
  const signal = AbortSignal.timeout(timeoutMs);
  return fetch(url, {
    ...init,
    headers: {
      "cache-control": "no-cache",
      pragma: "no-cache",
      ...(init.headers ?? {}),
    },
    signal,
  });
}

async function checkHttpRoute(baseUrl, routePath) {
  const url = new URL(routePath, baseUrl).toString();
  const startedAt = Date.now();
  let response = await fetchWithTimeout(url, {
    method: "HEAD",
    redirect: "follow",
  });
  let method = "HEAD";

  if ([405, 501].includes(response.status)) {
    response = await fetchWithTimeout(url, {
      method: "GET",
      redirect: "follow",
    });
    method = "GET";
  }

  return {
    route: routePath,
    url,
    method,
    status: response.status,
    ok: response.ok,
    finalUrl: response.url,
    durationMs: Date.now() - startedAt,
  };
}

function commitMatches(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  return actual === expected || actual.startsWith(expected) || expected.startsWith(actual);
}

async function checkDeploymentIdentity(baseUrl, expectedCommit) {
  const url = new URL("/api/deployment", baseUrl).toString();
  const response = await fetchWithTimeout(url, {
    method: "GET",
    redirect: "follow",
    headers: {
      accept: "application/json",
    },
  });
  const text = await response.text();
  let payload = null;

  try {
    payload = JSON.parse(text);
  } catch {
    payload = null;
  }

  const identity = payload?.identity ?? {};
  const liveCommit = normalizeCommit(identity.commit);
  const markerPresent = Boolean(liveCommit || identity.deploymentId);
  const issues = [];

  if (!response.ok) {
    issues.push(`deployment marker returned HTTP ${response.status}`);
  }

  if (!payload || payload.ok !== true) {
    issues.push("deployment marker did not return the expected JSON shape");
  }

  if (!markerPresent) {
    issues.push("deployment marker is missing commit and deploymentId");
  }

  if (expectedCommit && !commitMatches(liveCommit, expectedCommit)) {
    issues.push(
      `live commit ${liveCommit ?? "missing"} does not match expected commit ${expectedCommit}`,
    );
  }

  return {
    url,
    status: response.status,
    ok: issues.length === 0,
    expectedCommit,
    identity,
    markerPresent,
    issues,
  };
}

function safeFileLabel(value) {
  return value.replace(/[^a-zA-Z0-9._-]/gu, "-").replace(/-+/gu, "-").slice(0, 120);
}

async function collectSemanticEntries(page) {
  return page.evaluate(() => {
    const skipSelectors = [
      ".sr-only",
      "[aria-hidden='true']",
      "[hidden]",
      "script",
      "style",
      "noscript",
      "template",
    ];

    function normalizeText(text) {
      return String(text ?? "").replace(/\s+/gu, " ").trim();
    }

    function isVisibleElement(element) {
      const style = window.getComputedStyle(element);
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.opacity !== "0" &&
        element.getClientRects().length > 0
      );
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

      if (tagName === "button" || tagName === "summary") {
        return "button";
      }

      if (tagName === "input") {
        return element.getAttribute("type") === "range" ? "slider" : "textbox";
      }

      if (tagName === "main") {
        return "main";
      }

      if (tagName === "nav") {
        return "navigation";
      }

      return null;
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

    function getSnippets(element) {
      const container =
        element.closest("section, article, form, nav, aside, header, footer, main, [role]") ??
        element.parentElement ??
        element;
      return normalizeText(container.innerText ?? container.textContent ?? "")
        .split(/(?<=[。.!?])\s+/u)
        .filter(Boolean)
        .slice(0, 4);
    }

    function getReferencedText(element, attributeName) {
      return normalizeText(
        normalizeText(element.getAttribute(attributeName) ?? "")
          .split(/\s+/u)
          .filter(Boolean)
          .map((id) => document.getElementById(id)?.innerText ?? document.getElementById(id)?.textContent ?? "")
          .join(" "),
      );
    }

    function getControlLabel(element) {
      const ariaLabel = normalizeText(element.getAttribute("aria-label") ?? "");

      if (ariaLabel) {
        return ariaLabel;
      }

      const labelledBy = getReferencedText(element, "aria-labelledby");

      if (labelledBy) {
        return labelledBy;
      }

      return normalizeText(element.innerText ?? element.textContent ?? "");
    }

    const entries = [];
    const seen = new Set();

    function pushEntry(entry) {
      if (!entry.text) {
        return;
      }

      const key = [
        entry.text,
        entry.nearestHeading ?? "",
        entry.landmark ?? "",
        entry.elementTag,
        entry.elementRole ?? "",
        entry.sourceType,
      ].join("\u0000");

      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      entries.push(entry);
    }

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const parent = node.parentElement;

      if (!parent || skipSelectors.some((selector) => parent.closest(selector)) || !isVisibleElement(parent)) {
        continue;
      }

      pushEntry({
        text: normalizeText(node.textContent ?? ""),
        nearestHeading: getNearestHeading(parent),
        landmark: parent.closest("main, nav, header, footer, aside, section, article")?.tagName.toLowerCase() ?? null,
        elementTag: parent.tagName.toLowerCase(),
        elementRole: inferElementRole(parent),
        sourceType: "visible text",
        isAccessibilityLabel: false,
        isControlLabel: false,
        snippets: getSnippets(parent),
      });
    }

    for (const element of document.querySelectorAll("a, button, input, select, textarea, [role]")) {
      if (!(element instanceof HTMLElement) || !isVisibleElement(element)) {
        continue;
      }

      const label = getControlLabel(element);

      pushEntry({
        text: label,
        nearestHeading: getNearestHeading(element),
        landmark: element.closest("main, nav, header, footer, aside, section, article")?.tagName.toLowerCase() ?? null,
        elementTag: element.tagName.toLowerCase(),
        elementRole: inferElementRole(element),
        sourceType: "accessible name",
        isAccessibilityLabel: true,
        isControlLabel: true,
        snippets: getSnippets(element),
      });
    }

    return entries;
  });
}

async function auditContrast(page, theme, routePath, viewportName) {
  return page.evaluate(
    ({ themeMode, checkedRoutePath, checkedViewportName }) => {
      const issues = [];
      const baseBackground =
        themeMode === "dark-lab"
          ? { r: 6, g: 16, b: 24, a: 1 }
          : { r: 255, g: 247, b: 232, a: 1 };

      function parseColor(value) {
        const match = String(value ?? "").match(
          /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)$/iu,
        );

        if (!match) {
          return null;
        }

        return {
          r: Number(match[1]),
          g: Number(match[2]),
          b: Number(match[3]),
          a: match[4] === undefined ? 1 : Number(match[4]),
        };
      }

      function luminance(color) {
        const channel = (value) => {
          const normalized = value / 255;
          return normalized <= 0.03928
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
        };

        return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
      }

      function contrastRatio(foreground, background) {
        const foregroundLum = luminance(foreground);
        const backgroundLum = luminance(background);
        const lighter = Math.max(foregroundLum, backgroundLum);
        const darker = Math.min(foregroundLum, backgroundLum);
        return (lighter + 0.05) / (darker + 0.05);
      }

      function blend(foreground, background) {
        const alpha = foreground.a;
        return {
          r: foreground.r * alpha + background.r * (1 - alpha),
          g: foreground.g * alpha + background.g * (1 - alpha),
          b: foreground.b * alpha + background.b * (1 - alpha),
          a: 1,
        };
      }

      function effectiveBackground(element) {
        let current = element;
        let background = baseBackground;

        while (current && current instanceof Element) {
          const color = parseColor(window.getComputedStyle(current).backgroundColor);

          if (color && color.a > 0) {
            background = color.a >= 1 ? color : blend(color, background);

            if (color.a >= 0.98) {
              return background;
            }
          }

          current = current.parentElement;
        }

        return background;
      }

      function directText(element) {
        return [...element.childNodes]
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent ?? "")
          .join(" ")
          .replace(/\s+/gu, " ")
          .trim();
      }

      function isVisible(element) {
        const style = window.getComputedStyle(element);
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          style.opacity !== "0" &&
          element.getClientRects().length > 0
        );
      }

      for (const element of document.querySelectorAll("body *")) {
        if (!(element instanceof HTMLElement) || !isVisible(element)) {
          continue;
        }

        const text = directText(element);

        if (!text || text.length < 2) {
          continue;
        }

        const style = window.getComputedStyle(element);
        const color = parseColor(style.color);

        if (!color || color.a < 0.5) {
          continue;
        }

        const fontSize = Number.parseFloat(style.fontSize || "16");
        const fontWeight = Number.parseInt(style.fontWeight || "400", 10);
        const threshold = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700) ? 3 : 4.5;
        const ratio = contrastRatio(blend(color, effectiveBackground(element)), effectiveBackground(element));

        if (ratio < threshold) {
          issues.push({
            kind: "LOW_TEXT_CONTRAST",
            route: checkedRoutePath,
            theme: themeMode,
            viewport: checkedViewportName,
            sample: text.slice(0, 120),
            ratio: Number(ratio.toFixed(2)),
            threshold,
          });

          if (issues.length >= 25) {
            break;
          }
        }
      }

      return issues;
    },
    { themeMode: theme, checkedRoutePath: routePath, checkedViewportName: viewportName },
  );
}

async function checkBrowserCase(browser, baseUrl, checkCase, theme, artifactDir) {
  const context = await browser.newContext({
    viewport: {
      width: checkCase.viewport.width,
      height: checkCase.viewport.height,
    },
    isMobile: checkCase.viewport.mobile,
    hasTouch: checkCase.viewport.mobile,
    deviceScaleFactor: checkCase.viewport.mobile ? 3 : 1,
  });

  await context.addInitScript((themeMode) => {
    window.localStorage.setItem("oml-theme-mode", themeMode);
    document.documentElement.dataset.theme = themeMode;
    document.documentElement.style.colorScheme = themeMode === "dark-lab" ? "dark" : "light";
  }, theme);

  const page = await context.newPage();
  const url = new URL(checkCase.path, baseUrl).toString();
  const issues = [];
  let screenshot = null;
  let semanticFindings = [];

  try {
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    if (!response) {
      issues.push({ kind: "NO_DOCUMENT_RESPONSE", sample: "No document response returned." });
    } else if (!response.ok()) {
      issues.push({ kind: "HTTP_ERROR", sample: `${response.status()} ${response.statusText()}` });
    }

    await page.locator("body").waitFor({ state: "visible", timeout: 20_000 });

    if (checkCase.readySelector) {
      await page.locator(checkCase.readySelector).first().waitFor({ state: "visible", timeout: 20_000 });
    }

    await page.evaluate((themeMode) => {
      document.documentElement.dataset.theme = themeMode;
      document.documentElement.style.colorScheme = themeMode === "dark-lab" ? "dark" : "light";
      window.scrollTo(0, 0);
    }, theme);
    await page.waitForTimeout(500);

    const title = (await page.title()).trim();
    const bodyText = await page.locator("body").innerText({ timeout: 20_000 });
    const htmlLang = await page.locator("html").getAttribute("lang");

    for (const pattern of runtimeErrorPatterns) {
      if (pattern.test(`${title}\n${bodyText}`)) {
        issues.push({
          kind: "VISIBLE_RUNTIME_ERROR",
          sample: pattern.source,
        });
      }
    }

    if (checkCase.path.startsWith("/zh-HK") && htmlLang !== "zh-HK") {
      issues.push({
        kind: "LOCALE_LANG_MISMATCH",
        sample: `Expected html lang zh-HK, received ${htmlLang ?? "missing"}`,
      });
    }

    if (checkCase.path.startsWith("/zh-HK")) {
      semanticFindings = analyzeZhHkSemanticEntries(
        [
          ...(await collectSemanticEntries(page)),
          {
            text: title,
            nearestHeading: null,
            landmark: "document title",
            elementTag: "title",
            elementRole: null,
            sourceType: "title",
            isAccessibilityLabel: false,
            isControlLabel: false,
            snippets: [title],
          },
        ],
        checkCase.path,
        { category: "deployed-release" },
      );

      if (semanticFindings.length > 0) {
        issues.push({
          kind: "ZHHK_SEMANTIC_QUALITY",
          sample: semanticFindings[0].sample,
          findingCount: semanticFindings.length,
          sourceCategories: [...new Set(semanticFindings.map((finding) => finding.sourceCategory))],
        });
      }
    }

    const contrastIssues = await auditContrast(page, theme, checkCase.path, checkCase.viewport.name);
    issues.push(...contrastIssues);

    const screenshotPath = path.join(
      artifactDir,
      "screenshots",
      `${theme}-${checkCase.viewport.name}-${safeFileLabel(checkCase.name)}.png`,
    );
    fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
    await page.screenshot({
      path: screenshotPath,
      animations: "disabled",
      fullPage: false,
    });
    screenshot = path.relative(process.cwd(), screenshotPath);
  } catch (error) {
    issues.push({
      kind: "BROWSER_CHECK_FAILED",
      sample: error instanceof Error ? error.message : String(error),
    });
  } finally {
    await page.close();
    await context.close();
  }

  return {
    name: checkCase.name,
    route: checkCase.path,
    theme,
    viewport: checkCase.viewport.name,
    url,
    screenshot,
    ok: issues.length === 0,
    issueCount: issues.length,
    issues,
    semanticFindings,
  };
}

async function runVerification(options) {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const expectedCommit = resolveExpectedCommit(options);
  const artifactDir = makeArtifactDir(options.artifactDir);
  fs.mkdirSync(artifactDir, { recursive: true });

  const identity = await checkDeploymentIdentity(baseUrl, expectedCommit);
  const httpChecks = [];

  for (const routePath of headRoutes) {
    httpChecks.push(await checkHttpRoute(baseUrl, routePath));
  }

  const browser = await chromium.launch({ headless: true });
  const browserChecks = [];

  try {
    for (const checkCase of browserCases) {
      for (const theme of themes) {
        browserChecks.push(await checkBrowserCase(browser, baseUrl, checkCase, theme, artifactDir));
      }
    }
  } finally {
    await browser.close();
  }

  const semanticFindings = browserChecks.flatMap((check) => check.semanticFindings);
  const semanticReport = buildZhHkSemanticReport(semanticFindings);
  const issues = [
    ...identity.issues.map((issue) => ({
      kind: "DEPLOYMENT_IDENTITY",
      route: "/api/deployment",
      sample: issue,
    })),
    ...httpChecks
      .filter((check) => !check.ok)
      .map((check) => ({
        kind: "HTTP_ROUTE_HEALTH",
        route: check.route,
        sample: `${check.method} ${check.status}`,
      })),
    ...browserChecks.flatMap((check) =>
      check.issues.map((issue) => ({
        ...issue,
        route: check.route,
        theme: check.theme,
        viewport: check.viewport,
      })),
    ),
  ];
  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    expectedCommit,
    ok: issues.length === 0,
    issueCount: issues.length,
    artifactDir: path.relative(process.cwd(), artifactDir),
    requiredFollowUps: issues.slice(0, 50),
    identity,
    httpChecks,
    browserChecks: browserChecks.map((check) => ({
      name: check.name,
      route: check.route,
      theme: check.theme,
      viewport: check.viewport,
      url: check.url,
      screenshot: check.screenshot,
      ok: check.ok,
      issueCount: check.issueCount,
      issues: check.issues,
    })),
    semanticZhHkIssueCount: semanticReport.issueCount,
    semanticZhHkDetails: semanticReport,
  };
  const outputPath = path.join(artifactDir, "summary.json");
  const semanticPath = path.join(artifactDir, "semantic-zhhk-details.json");

  fs.writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  fs.writeFileSync(semanticPath, `${JSON.stringify(semanticReport, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        ok: summary.ok,
        issueCount: summary.issueCount,
        baseUrl: summary.baseUrl,
        expectedCommit: summary.expectedCommit,
        liveCommit: summary.identity.identity?.commit ?? null,
        artifactPath: path.relative(process.cwd(), outputPath),
        semanticArtifactPath: path.relative(process.cwd(), semanticPath),
      },
      null,
      2,
    ),
  );

  if (!summary.ok) {
    process.exitCode = 1;
  }

  return summary;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMain) {
  try {
    const options = parseArgs(process.argv.slice(2));

    if (options.help) {
      printUsage();
    } else {
      await runVerification(options);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

export {
  checkDeploymentIdentity,
  commitMatches,
  normalizeBaseUrl,
  normalizeCommit,
  parseArgs,
  runVerification,
};
