// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirectMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    mocks.redirectMock(path);
    throw new Error(`redirect:${path}`);
  },
  useSearchParams: () => new URLSearchParams(globalThis.__TEST_SEARCH_PARAMS__ ?? ""),
}));

vi.mock("@/app/auth/callback/AuthCallbackClient", () => ({
  AuthCallbackClient: ({ nextPath }: { nextPath: string }) => (
    <div>Auth callback client: {nextPath}</div>
  ),
}));

import AuthCallbackPage from "@/app/auth/callback/page";

describe("AuthCallbackPage", () => {
  afterEach(() => {
    mocks.redirectMock.mockReset();
  });

  it("redirects code-based auth returns through the confirm route", async () => {
    await expect(
      AuthCallbackPage({
        searchParams: Promise.resolve({
          code: "exchange-code-123",
        }),
      }),
    ).rejects.toThrow("redirect:/auth/confirm?next=%2Fdashboard&code=exchange-code-123");

    expect(mocks.redirectMock).toHaveBeenCalledWith(
      "/auth/confirm?next=%2Fdashboard&code=exchange-code-123",
    );
  });

  it("redirects token-hash returns through the confirm route", async () => {
    await expect(
      AuthCallbackPage({
        searchParams: Promise.resolve({
          token_hash: "token-123",
          type: "email",
          next: "/dashboard",
        }),
      }),
    ).rejects.toThrow(
      "redirect:/auth/confirm?next=%2Fdashboard&token_hash=token-123&type=email",
    );

    expect(mocks.redirectMock).toHaveBeenCalledWith(
      "/auth/confirm?next=%2Fdashboard&token_hash=token-123&type=email",
    );
  });

  it("preserves the active locale in confirm redirects and client fallback paths", async () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    await expect(
      AuthCallbackPage({
        searchParams: Promise.resolve({
          code: "exchange-code-123",
          next: "/concepts/projectile-motion",
        }),
      }),
    ).rejects.toThrow(
      "redirect:/zh-HK/auth/confirm?next=%2Fzh-HK%2Fconcepts%2Fprojectile-motion&code=exchange-code-123",
    );

    expect(mocks.redirectMock).toHaveBeenCalledWith(
      "/zh-HK/auth/confirm?next=%2Fzh-HK%2Fconcepts%2Fprojectile-motion&code=exchange-code-123",
    );

    const page = await AuthCallbackPage({
      searchParams: Promise.resolve({}),
    });

    render(page);

    expect(screen.getByText("Auth callback client: /zh-HK/dashboard")).toBeInTheDocument();
  });

  it("falls back to the client callback helper when no server auth params exist", async () => {
    const page = await AuthCallbackPage({
      searchParams: Promise.resolve({}),
    });

    render(page);

    expect(screen.getByText("Auth callback client: /dashboard")).toBeInTheDocument();
  });

  it("redirects provider callback failures into bounded account auth states", async () => {
    await expect(
      AuthCallbackPage({
        searchParams: Promise.resolve({
          error_code: "otp_expired",
          error_description: "The link has expired",
        }),
      }),
    ).rejects.toThrow("redirect:/account?auth=expired");

    expect(mocks.redirectMock).toHaveBeenCalledWith("/account?auth=expired");
  });

  it("routes recovery callback failures back to reset-password with a bounded state", async () => {
    await expect(
      AuthCallbackPage({
        searchParams: Promise.resolve({
          type: "recovery",
          next: "/account/reset-password",
          error: "access_denied",
          error_description: "NEXT_PUBLIC_SUPABASE_URL is not set",
        }),
      }),
    ).rejects.toThrow("redirect:/account/reset-password?auth=unavailable");

    expect(mocks.redirectMock).toHaveBeenCalledWith(
      "/account/reset-password?auth=unavailable",
    );
  });

  it("preserves the active locale in provider failure redirects", async () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    await expect(
      AuthCallbackPage({
        searchParams: Promise.resolve({
          error_code: "otp_expired",
          error_description: "The link has expired",
        }),
      }),
    ).rejects.toThrow("redirect:/zh-HK/account?auth=expired");

    expect(mocks.redirectMock).toHaveBeenCalledWith("/zh-HK/account?auth=expired");
  });
});
