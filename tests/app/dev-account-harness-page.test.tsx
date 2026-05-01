// @vitest-environment jsdom

import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  getLocaleMock: vi.fn(async () => "en"),
  notFoundMock: vi.fn(() => {
    throw new Error("not_found");
  }),
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookiesMock,
}));

vi.mock("next-intl/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next-intl/server")>();

  return {
    ...actual,
    getLocale: mocks.getLocaleMock,
  };
});

vi.mock("next/navigation", () => ({
  notFound: mocks.notFoundMock,
  useSearchParams: () => new URLSearchParams(globalThis.__TEST_SEARCH_PARAMS__ ?? ""),
}));

vi.mock("@/components/layout/PageShell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/layout/SectionHeading", () => ({
  SectionHeading: ({
    eyebrow,
    title,
    description,
  }: {
    eyebrow: string;
    title: string;
    description: string;
  }) => (
    <div>
      <p>{eyebrow}</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
}));

import DevAccountHarnessPage from "@/app/dev/account-harness/page";

describe("DevAccountHarnessPage", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    mocks.cookiesMock.mockReset();
    mocks.getLocaleMock.mockReset();
    mocks.getLocaleMock.mockResolvedValue("en");
    mocks.notFoundMock.mockClear();
  });

  it("renders the fixture switcher when the harness is enabled", async () => {
    vi.stubEnv("ENABLE_DEV_ACCOUNT_HARNESS", "true");
    mocks.cookiesMock.mockResolvedValue({
      toString: () => "open-model-lab-dev-account=signed-in-free",
    });

    render(await DevAccountHarnessPage());

    expect(screen.getByText("Local account harness")).toBeInTheDocument();
    expect(screen.getByText("Signed-in free fixture")).toBeInTheDocument();
    expect(screen.getByText("Seed achievements and reward")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Switch" })).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Clear override" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Projectile motion" })).toHaveAttribute(
      "href",
      "/concepts/projectile-motion",
    );
  });

  it("preserves the active locale in QA links and return paths", async () => {
    vi.stubEnv("ENABLE_DEV_ACCOUNT_HARNESS", "true");
    mocks.getLocaleMock.mockResolvedValue("zh-HK");
    mocks.cookiesMock.mockResolvedValue({
      toString: () => "open-model-lab-dev-account=signed-in-premium",
    });

    const { container } = render(await DevAccountHarnessPage());

    expect(screen.getByRole("link", { name: "Projectile motion" })).toHaveAttribute(
      "href",
      "/zh-HK/concepts/projectile-motion",
    );

    const returnToValues = Array.from(
      container.querySelectorAll('input[name="returnTo"]'),
      (input) => input.getAttribute("value"),
    );

    expect(returnToValues).toHaveLength(6);
    expect(returnToValues.every((value) => value === "/zh-HK/dev/account-harness")).toBe(true);
  });

  it("stays unavailable when the harness flag is off", async () => {
    mocks.cookiesMock.mockResolvedValue({
      toString: () => "",
    });

    await expect(DevAccountHarnessPage()).rejects.toThrow("not_found");
    expect(mocks.notFoundMock).toHaveBeenCalledOnce();
  });
});
