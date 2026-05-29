import { expect, test, type Page } from "@playwright/test";
import {
  gotoAndExpectOk,
  installBrowserGuards,
  type BrowserGuard,
} from "./helpers";

type InternalLinkCandidate = {
  domIndex: number;
  href: string;
  pathname: string;
  search: string;
  hash: string;
  text: string;
};

const zhHkAnchorAuditRoutes = [
  "/zh-HK",
  "/zh-HK/concepts",
  "/zh-HK/start",
  "/zh-HK/search?q=force&subject=physics#search-results",
  "/zh-HK/pricing",
  "/zh-HK/concepts/simple-harmonic-motion?mode=challenge#quick-test",
] as const;

const localeSwitchCases = [
  {
    from: "/en",
    option: "zh-HK",
    expectedPath: "/zh-HK",
    expectedSearch: "",
    expectedHash: "",
  },
  {
    from: "/en/concepts/simple-harmonic-motion?mode=challenge#quick-test",
    option: "zh-HK",
    expectedPath: "/zh-HK/concepts/simple-harmonic-motion",
    expectedSearch: "?mode=challenge",
    expectedHash: "#quick-test",
  },
  {
    from: "/zh-HK/search?q=force&subject=physics#search-results",
    option: "en",
    expectedPath: "/en/search",
    expectedSearch: "?q=force&subject=physics",
    expectedHash: "#search-results",
  },
] as const;

const clickSampleRoutes = [
  "/zh-HK",
  "/zh-HK/concepts",
  "/zh-HK/start",
  "/zh-HK/search?q=force&subject=physics#search-results",
  "/zh-HK/pricing",
  "/zh-HK/concepts/simple-harmonic-motion?mode=challenge#quick-test",
] as const;

let browserGuard: BrowserGuard;

function describeLink(link: InternalLinkCandidate) {
  return `${link.href} (${link.text || "no text"})`;
}

async function getVisibleInternalLinks(page: Page): Promise<InternalLinkCandidate[]> {
  return page.locator("a[href]").evaluateAll((anchors) => {
    const staticFilePathPattern =
      /\.(?:avif|css|gif|ico|jpeg|jpg|js|json|map|mp3|mp4|pdf|png|svg|txt|webmanifest|webp|xml)(?:$|[?#])/i;
    const localePrefixPattern = /^\/(?:en|zh-HK)(?=\/|$)/;
    const sameOrigin = window.location.origin;
    const currentUrl = new URL(window.location.href);

    function isVisible(anchor: Element) {
      if (!(anchor instanceof HTMLElement)) {
        return false;
      }

      for (let current: HTMLElement | null = anchor; current; current = current.parentElement) {
        if (current.hidden) {
          return false;
        }

        if (
          current instanceof HTMLDetailsElement &&
          !current.open &&
          !anchor.closest("summary")
        ) {
          return false;
        }

        const currentStyle = window.getComputedStyle(current);

        if (currentStyle.display === "none" || currentStyle.visibility === "hidden") {
          return false;
        }
      }

      return Array.from(anchor.getClientRects()).some(
        (rect) => rect.width > 0 && rect.height > 0,
      );
    }

    function isIgnored(rawHref: string, url: URL) {
      const normalizedRawHref = rawHref.trim();
      const protocol = url.protocol.toLowerCase();

      if (
        !normalizedRawHref ||
        normalizedRawHref.startsWith("#") ||
        protocol === "mailto:" ||
        protocol === "tel:" ||
        protocol === "javascript:" ||
        protocol === "data:" ||
        url.origin !== sameOrigin
      ) {
        return true;
      }

      if (
        url.hash &&
        url.pathname === currentUrl.pathname &&
        url.search === currentUrl.search
      ) {
        return true;
      }

      const unprefixedPathname = url.pathname.replace(localePrefixPattern, "") || "/";

      return (
        unprefixedPathname.startsWith("/api/") ||
        unprefixedPathname === "/api" ||
        unprefixedPathname.startsWith("/_next/") ||
        staticFilePathPattern.test(unprefixedPathname)
      );
    }

    return anchors.flatMap((anchor, domIndex) => {
      if (!(anchor instanceof HTMLAnchorElement) || !isVisible(anchor)) {
        return [];
      }

      const rawHref = anchor.getAttribute("href") ?? "";
      const url = new URL(rawHref, window.location.href);

      if (isIgnored(rawHref, url)) {
        return [];
      }

      return [
        {
          domIndex,
          href: rawHref,
          pathname: url.pathname,
          search: url.search,
          hash: url.hash,
          text: (anchor.innerText || anchor.getAttribute("aria-label") || "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 120),
        },
      ];
    });
  });
}

function expectZhHkUrl(url: URL, context: string) {
  expect(
    url.pathname === "/zh-HK" || url.pathname.startsWith("/zh-HK/"),
    `${context} landed on ${url.pathname}${url.search}${url.hash}`,
  ).toBe(true);
}

async function switchLocaleAndExpectUrl(
  page: Page,
  option: "en" | "zh-HK",
  expected: {
    pathname: string;
    search?: string;
    hash?: string;
  },
) {
  const switcher = page.getByRole("combobox", { name: /change language|切換語言/i });
  let lastError: unknown = null;

  await expect(switcher).toBeVisible();
  await expect(switcher).toBeEnabled();
  await page.waitForFunction(() => document.readyState === "complete");
  await page.waitForTimeout(500);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const navigation = page.waitForURL(
      (url) =>
        url.pathname === expected.pathname &&
        url.search === (expected.search ?? "") &&
        url.hash === (expected.hash ?? ""),
      { timeout: 15_000 },
    );

    await switcher.selectOption(option);

    try {
      await navigation;
      return;
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(250);
    }
  }

  throw lastError;
}

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  browserGuard = await installBrowserGuards(page);
  await page.setViewportSize({ width: 1440, height: 900 });
});

test.afterEach(() => {
  browserGuard.assertNoActionableIssues();
});

test("switches locales on representative routes while preserving path, query, and hash", async ({
  page,
}) => {
  for (const switchCase of localeSwitchCases) {
    await test.step(`${switchCase.from} -> ${switchCase.option}`, async () => {
      await gotoAndExpectOk(page, switchCase.from);

      await switchLocaleAndExpectUrl(page, switchCase.option, {
        pathname: switchCase.expectedPath,
        search: switchCase.expectedSearch,
        hash: switchCase.expectedHash,
      });
    });
  }
});

test("keeps visible zh-HK internal anchors under the active locale", async ({ page }) => {
  test.setTimeout(60_000);

  for (const route of zhHkAnchorAuditRoutes) {
    await test.step(route, async () => {
      await gotoAndExpectOk(page, route);

      const links = await getVisibleInternalLinks(page);
      const localeDropFailures = links.filter(
        (link) => link.pathname !== "/zh-HK" && !link.pathname.startsWith("/zh-HK/"),
      );

      expect(
        localeDropFailures.map(describeLink),
        `Visible internal links on ${route} should preserve the zh-HK locale.`,
      ).toEqual([]);
    });
  }
});

test("keeps representative zh-HK CTA and link clicks under the active locale", async ({
  page,
}) => {
  test.setTimeout(90_000);

  for (const route of clickSampleRoutes) {
    await test.step(route, async () => {
      await gotoAndExpectOk(page, route);

      const currentUrl = new URL(page.url());
      const links = await getVisibleInternalLinks(page);
      const candidate = links.find(
        (link) =>
          (link.pathname === "/zh-HK" || link.pathname.startsWith("/zh-HK/")) &&
          (link.pathname !== currentUrl.pathname || link.search !== currentUrl.search),
      );

      expect(
        candidate,
        `Expected at least one visible internal CTA/link candidate on ${route}.`,
      ).toBeTruthy();

      const link = page.locator("a[href]").nth(candidate!.domIndex);
      await link.scrollIntoViewIfNeeded();
      await expect(link).toBeVisible();
      await link.click();

      await page.waitForLoadState("domcontentloaded");
      expectZhHkUrl(new URL(page.url()), `Clicking ${describeLink(candidate!)} from ${route}`);
    });
  }
});
