import "@testing-library/jest-dom/vitest";
import { IntlMessageFormat } from "intl-messageformat";
import React from "react";
import { beforeEach, vi } from "vitest";
import enMessages from "@/messages/en.json";
import zhHkMessages from "@/messages/zh-HK.json";

declare global {
  var __TEST_LOCALE__: "en" | "zh-HK" | undefined;
  var __TEST_PATHNAME__: string | undefined;
  var __TEST_SEARCH_PARAMS__: string | undefined;
  var __TEST_ROUTER_REPLACE__: ReturnType<typeof vi.fn> | undefined;
  var __TEST_ROUTER_PUSH__: ReturnType<typeof vi.fn> | undefined;
}

function getCurrentLocale() {
  return globalThis.__TEST_LOCALE__ ?? "en";
}

beforeEach(() => {
  globalThis.__TEST_LOCALE__ = undefined;
  globalThis.__TEST_PATHNAME__ = undefined;
  globalThis.__TEST_SEARCH_PARAMS__ = undefined;
  globalThis.__TEST_ROUTER_REPLACE__ = undefined;
  globalThis.__TEST_ROUTER_PUSH__ = undefined;
  globalThis.scrollTo = vi.fn();
});

function mergeMessages(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(override)) {
    const baseValue = merged[key];

    if (
      baseValue &&
      typeof baseValue === "object" &&
      !Array.isArray(baseValue) &&
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      merged[key] = mergeMessages(
        baseValue as Record<string, unknown>,
        value as Record<string, unknown>,
      );
      continue;
    }

    merged[key] = value;
  }

  return merged;
}

function getCurrentMessages() {
  if (getCurrentLocale() === "zh-HK") {
    return mergeMessages(
      enMessages as Record<string, unknown>,
      zhHkMessages as Record<string, unknown>,
    );
  }

  return enMessages as Record<string, unknown>;
}

function getMessageValue(path: string) {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object" && key in current) {
      return (current as Record<string, unknown>)[key];
    }

    return undefined;
  }, getCurrentMessages());
}

function translate(path: string, values?: Record<string, unknown>) {
  const message = getMessageValue(path);

  if (typeof message !== "string") {
    return path;
  }

  return new IntlMessageFormat(message, getCurrentLocale()).format(values) as string;
}

function translateRich(path: string, values?: Record<string, unknown>) {
  const message = getMessageValue(path);

  if (typeof message !== "string") {
    return path;
  }

  return new IntlMessageFormat(message, getCurrentLocale()).format(values);
}

function createMockTranslator(namespace?: string) {
  const resolvePath = (key: string) => (namespace ? `${namespace}.${key}` : key);
  const translator = ((key: string, values?: Record<string, unknown>) =>
    translate(resolvePath(key), values)) as ((key: string, values?: Record<string, unknown>) => string) & {
    rich: (key: string, values?: Record<string, unknown>) => unknown;
    raw: (key: string) => unknown;
    has: (key: string) => boolean;
  };

  translator.rich = (key: string, values?: Record<string, unknown>) =>
    translateRich(resolvePath(key), values);
  translator.raw = (key: string) => getMessageValue(resolvePath(key));
  translator.has = (key: string) => getMessageValue(resolvePath(key)) !== undefined;

  return translator;
}

vi.mock("next/link", () => {
  const MockNextLink = React.forwardRef<
    HTMLAnchorElement,
    {
      href: string;
      children: React.ReactNode;
    } & React.AnchorHTMLAttributes<HTMLAnchorElement>
  >(({ href, children, ...props }, ref) =>
    React.createElement("a", { href, ref, ...props }, children),
  );

  MockNextLink.displayName = "MockNextLink";

  return {
    default: MockNextLink,
  };
});

vi.mock("@/i18n/navigation", () => {
  const MockIntlLink = React.forwardRef<
    HTMLAnchorElement,
    {
      href: string;
      children: React.ReactNode;
    } & React.AnchorHTMLAttributes<HTMLAnchorElement>
  >(({ href, children, ...props }, ref) =>
    React.createElement("a", { href, ref, ...props }, children),
  );

  MockIntlLink.displayName = "MockIntlLink";

  return {
    Link: MockIntlLink,
    getPathname: ({ href }: { href: string }) => href,
    usePathname: () => globalThis.__TEST_PATHNAME__ ?? "/",
    useRouter: () => ({
      replace: globalThis.__TEST_ROUTER_REPLACE__ ?? vi.fn(),
      push: globalThis.__TEST_ROUTER_PUSH__ ?? vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    }),
    redirect: vi.fn(),
  };
});

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>(
    "next/navigation",
  );

  return {
    ...actual,
    useSearchParams: () =>
      new URLSearchParams(globalThis.__TEST_SEARCH_PARAMS__ ?? ""),
    notFound: () => {
      throw new Error("NEXT_NOT_FOUND");
    },
  };
});

vi.mock("next-intl", () => ({
  useLocale: () => getCurrentLocale(),
  useTranslations: (namespace?: string) => createMockTranslator(namespace),
  NextIntlClientProvider: ({
    children,
  }: {
    children: React.ReactNode;
  }) => children,
}));

vi.mock("next-intl/server", () => ({
  getRequestConfig:
    <T>(factory: T) =>
    factory,
  getLocale: async () => getCurrentLocale(),
  getMessages: async () => getCurrentMessages(),
  getTranslations: async (namespace?: string) => createMockTranslator(namespace),
}));
