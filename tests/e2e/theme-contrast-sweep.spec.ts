import fs from "node:fs";
import path from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import {
  gotoAndExpectOk,
  installBrowserGuards,
  setHarnessSession,
} from "./helpers";

test.setTimeout(900_000);

type ThemeMode = "paper-lab" | "dark-lab";
type HarnessState = "signed-in-free" | "signed-in-premium" | "signed-out";

type SweepRoute = {
  name: string;
  path: string;
  harnessState?: HarnessState;
  ready?: string;
  themes?: ThemeMode[];
  viewports: string[];
};

type SweepViewport = {
  name: string;
  width: number;
  height: number;
  mobile: boolean;
};

type SweepIssue = {
  kind:
    | "LOW_TEXT_CONTRAST"
    | "LOW_SVG_TEXT_CONTRAST"
    | "LOW_CONTROL_CONTRAST"
    | "PAPER_MODE_DARK_SURFACE"
    | "DARK_MODE_LIGHT_SURFACE"
    | "FIRST_VIEWPORT_TEXT_OVERLAP";
  route: string;
  theme: ThemeMode;
  viewport: string;
  sample: string;
  ratio?: number;
  threshold?: number;
  detail: Record<string, unknown>;
};

const artifactDir = path.join(
  process.cwd(),
  "output",
  "qa-oml-qa-035-theme-contrast-sweep",
);
const screenshotsDir = path.join(artifactDir, "screenshots");

const themes: ThemeMode[] = ["paper-lab", "dark-lab"];

const viewports: SweepViewport[] = [
  { name: "desktop-1440x900", width: 1440, height: 900, mobile: false },
  { name: "tablet-1024x768", width: 1024, height: 768, mobile: false },
  { name: "phone-390x844", width: 390, height: 844, mobile: true },
];

const routes: SweepRoute[] = [
  { name: "home", path: "/", ready: "#content", viewports: ["desktop-1440x900"] },
  {
    name: "home-zh-hk",
    path: "/zh-HK",
    ready: "#content",
    themes: ["paper-lab"],
    viewports: ["desktop-1440x900", "phone-390x844"],
  },
  {
    name: "concepts-index",
    path: "/concepts",
    ready: "#content",
    viewports: ["desktop-1440x900"],
  },
  {
    name: "physics-subject",
    path: "/concepts/subjects/physics",
    ready: "#content",
    viewports: ["desktop-1440x900"],
  },
  {
    name: "subjects-index",
    path: "/concepts/subjects",
    ready: "#content",
    themes: ["paper-lab"],
    viewports: ["desktop-1440x900", "phone-390x844"],
  },
  {
    name: "subjects-index-zh-hk",
    path: "/zh-HK/concepts/subjects",
    ready: "#content",
    themes: ["paper-lab"],
    viewports: ["desktop-1440x900", "phone-390x844"],
  },
  {
    name: "modern-physics-topic",
    path: "/concepts/topics/modern-physics",
    ready: "#content",
    viewports: ["desktop-1440x900"],
  },
  {
    name: "topics-index",
    path: "/concepts/topics",
    ready: "#content",
    themes: ["paper-lab"],
    viewports: ["desktop-1440x900", "phone-390x844"],
  },
  {
    name: "topics-index-zh-hk",
    path: "/zh-HK/concepts/topics",
    ready: "#content",
    themes: ["paper-lab"],
    viewports: ["desktop-1440x900", "phone-390x844"],
  },
  { name: "search", path: "/search", ready: "#content", viewports: ["desktop-1440x900"] },
  {
    name: "start",
    path: "/start",
    ready: '[data-testid="start-primary-cta"]',
    viewports: ["desktop-1440x900"],
  },
  {
    name: "start-zh-hk",
    path: "/zh-HK/start",
    ready: '[data-testid="start-primary-cta"]',
    themes: ["paper-lab"],
    viewports: ["desktop-1440x900", "phone-390x844"],
  },
  {
    name: "pricing",
    path: "/pricing",
    ready: '[data-testid="pricing-primary-cta"]',
    viewports: ["desktop-1440x900"],
  },
  { name: "tests", path: "/tests", ready: "#content", viewports: ["desktop-1440x900"] },
  {
    name: "tests-zh-hk",
    path: "/zh-HK/tests",
    ready: "#content",
    themes: ["paper-lab"],
    viewports: ["desktop-1440x900", "phone-390x844"],
  },
  { name: "tools", path: "/tools", ready: "#content", viewports: ["desktop-1440x900"] },
  {
    name: "chemistry-mind-map",
    path: "/tools/chemistry-reaction-mind-map",
    ready: "#content",
    viewports: ["desktop-1440x900"],
  },
  {
    name: "circuit-builder",
    path: "/circuit-builder",
    ready: "#content",
    viewports: ["desktop-1440x900"],
  },
  {
    name: "dashboard-free",
    path: "/dashboard",
    harnessState: "signed-in-free",
    ready: "#content",
    viewports: ["desktop-1440x900"],
  },
  {
    name: "dashboard-free-zh-hk",
    path: "/zh-HK/dashboard",
    harnessState: "signed-in-free",
    ready: "#content",
    themes: ["paper-lab"],
    viewports: ["desktop-1440x900", "phone-390x844"],
  },
  {
    name: "account-supporter",
    path: "/account",
    harnessState: "signed-in-premium",
    ready: "#account-overview",
    viewports: ["desktop-1440x900"],
  },
  {
    name: "account-supporter-zh-hk",
    path: "/zh-HK/account",
    harnessState: "signed-in-premium",
    ready: "#account-overview",
    themes: ["paper-lab"],
    viewports: ["desktop-1440x900", "phone-390x844"],
  },
  {
    name: "concept-shm",
    path: "/concepts/simple-harmonic-motion",
    ready: '[data-testid="concept-live-lab"]',
    viewports: ["phone-390x844"],
  },
  {
    name: "concept-derivative",
    path: "/concepts/derivative-as-slope-local-rate-of-change",
    ready: '[data-testid="concept-live-lab"]',
    viewports: ["tablet-1024x768"],
  },
  {
    name: "concept-electric-fields",
    path: "/concepts/electric-fields",
    ready: '[data-testid="concept-live-lab"]',
    viewports: ["tablet-1024x768"],
  },
  {
    name: "concept-reaction-rate",
    path: "/concepts/reaction-rate-collision-theory",
    ready: '[data-testid="concept-live-lab"]',
    viewports: ["tablet-1024x768"],
  },
  {
    name: "concept-unit-circle",
    path: "/concepts/unit-circle-sine-cosine-from-rotation",
    ready: '[data-testid="concept-live-lab"]',
    viewports: ["phone-390x844"],
  },
  {
    name: "concept-graph-frontier",
    path: "/concepts/frontier-and-visited-state-on-graphs",
    ready: '[data-testid="concept-live-lab"]',
    viewports: ["phone-390x844"],
  },
];

const sweepCases = viewports.flatMap((viewport) =>
  themes.flatMap((theme) =>
    routes
      .filter((route) => route.viewports.includes(viewport.name) && (route.themes ?? themes).includes(theme))
      .map((route) => ({ route, theme, viewport })),
  ),
);

function safeFileLabel(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 120);
}

async function prepareThemeContext(context: BrowserContext, theme: ThemeMode) {
  await context.addInitScript((mode) => {
    window.localStorage.setItem("oml-theme-mode", mode);
    if (document.documentElement) {
      document.documentElement.dataset.theme = mode;
      document.documentElement.style.colorScheme = mode === "dark-lab" ? "dark" : "light";
    }
  }, theme);
}

async function openSweepPage(
  context: BrowserContext,
  route: SweepRoute,
  theme: ThemeMode,
) {
  const page = await context.newPage();
  const guard = await installBrowserGuards(page);
  guard.allowIssue(/caret-color/i);

  if (route.harnessState) {
    await setHarnessSession(page, route.harnessState);
  }

  await gotoAndExpectOk(page, route.path);
  await page.evaluate((mode) => {
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode === "dark-lab" ? "dark" : "light";
  }, theme);
  await expect(page.locator("#content")).toBeVisible();

  if (route.ready) {
    await expect(page.locator(route.ready).first()).toBeVisible();
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);

  return { guard, page };
}

async function auditThemeContrast(
  page: Page,
  route: SweepRoute,
  theme: ThemeMode,
  viewport: SweepViewport,
): Promise<SweepIssue[]> {
  return page.evaluate(
    ({ routeName, routePath, themeMode, viewportName }) => {
      type Rgb = { r: number; g: number; b: number; a: number };
      type BrowserIssue = SweepIssue;

      const ignoredTextSelector = [
        "script",
        "style",
        "noscript",
        "[hidden]",
        "[aria-hidden='true']",
        ".sr-only",
        "[data-theme-contrast-ignore='true']",
      ].join(",");
      const elementName = (element: Element) => element.tagName.toLowerCase();
      const baseBackground =
        themeMode === "paper-lab"
          ? { r: 255, g: 247, b: 232, a: 1 }
          : { r: 6, g: 16, b: 24, a: 1 };

      function parseColor(value: string | null | undefined): Rgb | null {
        if (!value || value === "transparent") {
          return null;
        }

        const rgbMatch = value.match(
          /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)$/i,
        );

        if (rgbMatch) {
          return {
            r: Number(rgbMatch[1]),
            g: Number(rgbMatch[2]),
            b: Number(rgbMatch[3]),
            a: rgbMatch[4] === undefined ? 1 : Number(rgbMatch[4]),
          };
        }

        const hexMatch = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);

        if (!hexMatch) {
          return null;
        }

        const hex = hexMatch[1];
        const normalized =
          hex.length === 3
            ? hex
                .split("")
                .map((digit) => `${digit}${digit}`)
                .join("")
            : hex;

        return {
          r: Number.parseInt(normalized.slice(0, 2), 16),
          g: Number.parseInt(normalized.slice(2, 4), 16),
          b: Number.parseInt(normalized.slice(4, 6), 16),
          a: 1,
        };
      }

      function composite(foreground: Rgb, background: Rgb): Rgb {
        const alpha = Math.min(Math.max(foreground.a, 0), 1);

        return {
          r: foreground.r * alpha + background.r * (1 - alpha),
          g: foreground.g * alpha + background.g * (1 - alpha),
          b: foreground.b * alpha + background.b * (1 - alpha),
          a: 1,
        };
      }

      function relativeLuminance(color: Rgb) {
        const channels = [color.r, color.g, color.b].map((channel) => {
          const normalized = channel / 255;

          return normalized <= 0.03928
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
        });

        return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
      }

      function contrastRatio(foreground: Rgb, background: Rgb) {
        const foregroundLuminance = relativeLuminance(foreground);
        const backgroundLuminance = relativeLuminance(background);
        const lighter = Math.max(foregroundLuminance, backgroundLuminance);
        const darker = Math.min(foregroundLuminance, backgroundLuminance);

        return (lighter + 0.05) / (darker + 0.05);
      }

      function effectiveBackground(element: Element | null) {
        let background = baseBackground;
        const stack: Element[] = [];

        for (let current = element; current; current = current.parentElement) {
          stack.unshift(current);
        }

        for (const current of stack) {
          const style = getComputedStyle(current);
          const color = parseColor(style.backgroundColor);

          if (color && color.a > 0) {
            background = composite(color, background);
          }
        }

        return background;
      }

      function isVisibleElement(element: Element) {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();

        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          Number(style.opacity) === 0 ||
          style.clipPath === "inset(50%)" ||
          style.clip === "rect(0px, 0px, 0px, 0px)" ||
          rect.width < 2 ||
          rect.height < 2 ||
          element.closest(ignoredTextSelector)
        ) {
          return false;
        }

        return true;
      }

      function issueBase(kind: BrowserIssue["kind"], sample: string, detail: Record<string, unknown>) {
        return {
          kind,
          route: routePath,
          theme: themeMode,
          viewport: viewportName,
          sample: sample.trim().replace(/\s+/g, " ").slice(0, 140),
          detail: {
            routeName,
            ...detail,
          },
        };
      }

      function textThreshold(style: CSSStyleDeclaration) {
        const fontSize = Number.parseFloat(style.fontSize);
        const fontWeight =
          style.fontWeight === "bold" ? 700 : Number.parseInt(style.fontWeight, 10) || 400;
        const isLarge = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);

        return isLarge ? 3 : 4.5;
      }

      function selectorFor(element: Element) {
        const tag = elementName(element);
        const testId = element.getAttribute("data-testid");

        if (testId) {
          return `${tag}[data-testid="${testId}"]`;
        }

        if (element.id) {
          return `${tag}#${element.id}`;
        }

        const className =
          typeof (element as HTMLElement).className === "string"
            ? (element as HTMLElement).className
            : "";

        return `${tag}${className ? `.${className.split(/\s+/).slice(0, 4).join(".")}` : ""}`;
      }

      const issues: BrowserIssue[] = [];
      const textBoxes: Array<{
        text: string;
        rect: DOMRect;
        element: Element;
      }> = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const text = node.textContent?.replace(/\s+/g, " ").trim() ?? "";
          const parent = node.parentElement;

          if (!text || !parent || !isVisibleElement(parent)) {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        },
      });
      const seenTextChecks = new Set<string>();

      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const parent = node.parentElement;

        if (!parent) {
          continue;
        }

          const range = document.createRange();
          range.selectNodeContents(node);
          const parentBox = parent.getBoundingClientRect();

          if (parentBox.width < 4 || parentBox.height < 8) {
            continue;
          }

          for (const rect of Array.from(range.getClientRects())) {
            const text = node.textContent?.replace(/\s+/g, " ").trim() ?? "";

          if (
            rect.width < 2 ||
            rect.height < 8 ||
            rect.width > window.innerWidth * 1.25 ||
            !text
          ) {
            continue;
          }

          const style = getComputedStyle(parent);
          const foregroundRaw = parseColor(style.color);

          if (!foregroundRaw) {
            continue;
          }

          const foreground = composite(foregroundRaw, effectiveBackground(parent.parentElement));
          const background = effectiveBackground(parent);
          const ratio = contrastRatio(foreground, background);
          const threshold = textThreshold(style);
          const checkKey = `${selectorFor(parent)}:${text}:${Math.round(rect.x)}:${Math.round(rect.y)}`;

          if (!seenTextChecks.has(checkKey)) {
            seenTextChecks.add(checkKey);
            textBoxes.push({ text, rect, element: parent });
          }

          if (ratio + 0.01 < threshold) {
            issues.push({
              ...issueBase("LOW_TEXT_CONTRAST", text, {
                element: elementName(parent),
                selector: selectorFor(parent),
                className:
                  typeof (parent as HTMLElement).className === "string"
                    ? (parent as HTMLElement).className
                    : "",
                color: style.color,
                background: `rgb(${Math.round(background.r)}, ${Math.round(background.g)}, ${Math.round(
                  background.b,
                )})`,
                rect: {
                  x: Math.round(rect.x),
                  y: Math.round(rect.y),
                  width: Math.round(rect.width),
                  height: Math.round(rect.height),
                },
              }),
              ratio: Number(ratio.toFixed(2)),
              threshold,
            });
          }
        }
      }

      for (const svgText of Array.from(document.querySelectorAll("svg text"))) {
        if (!isVisibleElement(svgText)) {
          continue;
        }

        const text = svgText.textContent?.replace(/\s+/g, " ").trim() ?? "";

        if (!text) {
          continue;
        }

        const rect = svgText.getBoundingClientRect();
        const style = getComputedStyle(svgText);
        const fill = parseColor(style.fill === "none" ? style.color : style.fill);

        if (!fill || rect.width < 2 || rect.height < 6) {
          continue;
        }

        const background = effectiveBackground(svgText);
        const svgSurface = svgText.closest("svg")?.querySelector("rect");
        const svgSurfaceColor = svgSurface
          ? parseColor(getComputedStyle(svgSurface).fill) ??
            parseColor(svgSurface.getAttribute("fill"))
          : null;
        const resolvedBackground = svgSurfaceColor
          ? composite(svgSurfaceColor, background)
          : background;
        const foreground = composite(fill, resolvedBackground);
        const ratio = contrastRatio(foreground, resolvedBackground);

        if (ratio + 0.01 < 4.5) {
          issues.push({
            ...issueBase("LOW_SVG_TEXT_CONTRAST", text, {
              element: "svg text",
              selector: selectorFor(svgText),
              fill: style.fill,
              background: `rgb(${Math.round(resolvedBackground.r)}, ${Math.round(resolvedBackground.g)}, ${Math.round(
                resolvedBackground.b,
              )})`,
              rect: {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
              },
            }),
            ratio: Number(ratio.toFixed(2)),
            threshold: 4.5,
          });
        }
      }

      const controls = Array.from(
        document.querySelectorAll(
          "button, summary, [role='button'], [role='tab']",
        ),
      );

      for (const control of controls) {
        if (!isVisibleElement(control)) {
          continue;
        }

        const rect = control.getBoundingClientRect();

        if (rect.width * rect.height < 280 || (control.textContent ?? "").trim()) {
          continue;
        }

        const style = getComputedStyle(control);
        const backgroundColor = parseColor(style.backgroundColor);
        const borderColor = parseColor(style.borderTopColor);
        const ancestorBackground = effectiveBackground(control.parentElement);
        const backgroundRatio = backgroundColor
          ? contrastRatio(composite(backgroundColor, ancestorBackground), ancestorBackground)
          : 1;
        const borderRatio = borderColor
          ? contrastRatio(composite(borderColor, ancestorBackground), ancestorBackground)
          : 1;

        if (Math.max(backgroundRatio, borderRatio) + 0.01 < 3) {
          issues.push({
            ...issueBase("LOW_CONTROL_CONTRAST", control.getAttribute("aria-label") ?? "control", {
              element: elementName(control),
              selector: selectorFor(control),
              backgroundColor: style.backgroundColor,
              borderColor: style.borderTopColor,
              ancestorBackground: `rgb(${Math.round(ancestorBackground.r)}, ${Math.round(
                ancestorBackground.g,
              )}, ${Math.round(ancestorBackground.b)})`,
              rect: {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
              },
            }),
            ratio: Number(Math.max(backgroundRatio, borderRatio).toFixed(2)),
            threshold: 3,
          });
        }
      }

      const largeSurfaceElements = Array.from(
        document.body.querySelectorAll("main, section, article, aside, div, figure"),
      );

      for (const element of largeSurfaceElements) {
        if (!isVisibleElement(element) || element.closest("[data-theme-contrast-ignore='true']")) {
          continue;
        }

        const rect = element.getBoundingClientRect();
        const area = rect.width * rect.height;

        if (area < 70_000) {
          continue;
        }

        const style = getComputedStyle(element);
        const color = parseColor(style.backgroundColor);

        if (!color || color.a < 0.55) {
          continue;
        }

        const surface = composite(color, effectiveBackground(element.parentElement));
        const luminance = relativeLuminance(surface);
        const context = element.textContent?.replace(/\s+/g, " ").trim() ?? "";
        const detail = {
          element: elementName(element),
          selector: selectorFor(element),
          className:
            typeof (element as HTMLElement).className === "string"
              ? (element as HTMLElement).className
              : "",
          background: style.backgroundColor,
          luminance: Number(luminance.toFixed(3)),
          area: Math.round(area),
          rect: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
        };

        if (themeMode === "paper-lab" && luminance < 0.08) {
          issues.push(issueBase("PAPER_MODE_DARK_SURFACE", context, detail));
        }

        if (themeMode === "dark-lab" && luminance > 0.86) {
          issues.push(issueBase("DARK_MODE_LIGHT_SURFACE", context, detail));
        }
      }

      const firstViewportTextBoxes = textBoxes.filter(
        ({ rect, text, element }) =>
          routePath !== "/tools/chemistry-reaction-mind-map" &&
          rect.top >= 0 &&
          rect.top < window.innerHeight &&
          rect.width >= 24 &&
          rect.height >= 10 &&
          text.length >= 2 &&
          !element.closest("[data-testid='chemistry-graph-viewport']"),
      );

      for (let leftIndex = 0; leftIndex < firstViewportTextBoxes.length; leftIndex += 1) {
        const left = firstViewportTextBoxes[leftIndex];

        for (
          let rightIndex = leftIndex + 1;
          rightIndex < firstViewportTextBoxes.length;
          rightIndex += 1
        ) {
          const right = firstViewportTextBoxes[rightIndex];

        if (
          left.element === right.element ||
          left.element.contains(right.element) ||
          right.element.contains(left.element) ||
          left.element.closest("[id$='description'], [id$='help']") ||
          right.element.closest("[id$='description'], [id$='help']") ||
          left.text === right.text
        ) {
            continue;
          }

          const overlapWidth = Math.max(
            0,
            Math.min(left.rect.right, right.rect.right) - Math.max(left.rect.left, right.rect.left),
          );
          const overlapHeight = Math.max(
            0,
            Math.min(left.rect.bottom, right.rect.bottom) -
              Math.max(left.rect.top, right.rect.top),
          );
          const overlapArea = overlapWidth * overlapHeight;

          if (overlapArea < 80) {
            continue;
          }

          const smallerArea = Math.min(
            left.rect.width * left.rect.height,
            right.rect.width * right.rect.height,
          );

          if (
            selectorFor(left.element) !== selectorFor(right.element) &&
            overlapArea / smallerArea > 0.85
          ) {
            issues.push(
              issueBase("FIRST_VIEWPORT_TEXT_OVERLAP", `${left.text} / ${right.text}`, {
                left: {
                  text: left.text.slice(0, 80),
                  selector: selectorFor(left.element),
                  rect: {
                    x: Math.round(left.rect.x),
                    y: Math.round(left.rect.y),
                    width: Math.round(left.rect.width),
                    height: Math.round(left.rect.height),
                  },
                },
                right: {
                  text: right.text.slice(0, 80),
                  selector: selectorFor(right.element),
                  rect: {
                    x: Math.round(right.rect.x),
                    y: Math.round(right.rect.y),
                    width: Math.round(right.rect.width),
                    height: Math.round(right.rect.height),
                  },
                },
                overlapArea: Math.round(overlapArea),
              }),
            );
          }
        }
      }

      return issues;
    },
    {
      routeName: route.name,
      routePath: route.path,
      themeMode: theme,
      viewportName: viewport.name,
    },
  );
}

test("OML-QA-035 light and dark theme contrast sweep passes representative site surfaces", async ({
  browser,
}) => {
  fs.mkdirSync(screenshotsDir, { recursive: true });
  const results: Array<{
    route: string;
    theme: ThemeMode;
    viewport: string;
    screenshot: string;
    issueCount: number;
  }> = [];
  const allIssues: SweepIssue[] = [];

  for (const viewport of viewports) {
    for (const theme of themes) {
      const activeRoutes = routes.filter(
        (route) => route.viewports.includes(viewport.name) && (route.themes ?? themes).includes(theme),
      );

      if (activeRoutes.length === 0) {
        continue;
      }

      const context = await browser.newContext({
        viewport: {
          width: viewport.width,
          height: viewport.height,
        },
        isMobile: viewport.mobile,
        hasTouch: viewport.mobile,
        deviceScaleFactor: viewport.mobile ? 3 : 1,
      });
      await prepareThemeContext(context, theme);

      try {
        for (const route of activeRoutes) {
          await test.step(`${theme} ${viewport.name} ${route.name}`, async () => {
            const { guard, page } = await openSweepPage(context, route, theme);
            const screenshot = path.join(
              screenshotsDir,
              `${theme}-${viewport.name}-${safeFileLabel(route.name)}.png`,
            );

            try {
              await page.screenshot({
                path: screenshot,
                animations: "disabled",
                fullPage: false,
              });

              const issues = await auditThemeContrast(page, route, theme, viewport);

              results.push({
                route: route.path,
                theme,
                viewport: viewport.name,
                screenshot: path.relative(process.cwd(), screenshot),
                issueCount: issues.length,
              });
              allIssues.push(...issues);
              guard.assertNoActionableIssues();
            } finally {
              await page.close();
            }
          });
        }
      } finally {
        await context.close();
      }
    }
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    routeCount: routes.length,
    caseCount: sweepCases.length,
    themes,
    viewports: viewports.map(({ name, width, height }) => ({ name, width, height })),
    issueCount: allIssues.length,
    issueCounts: allIssues.reduce<Record<string, number>>((counts, issue) => {
      counts[issue.kind] = (counts[issue.kind] ?? 0) + 1;

      return counts;
    }, {}),
    results,
    issues: allIssues,
  };

  fs.writeFileSync(
    path.join(artifactDir, "light-dark-contrast-sweep.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
  );

  expect(allIssues, JSON.stringify(allIssues.slice(0, 20), null, 2)).toEqual([]);
});
