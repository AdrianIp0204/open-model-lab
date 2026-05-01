import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ConceptPage from "@/app/concepts/[slug]/page";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";

const mocks = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  notFoundMock: vi.fn(),
  redirectMock: vi.fn(),
  getOptionalStoredProgressForCookieHeaderMock: vi.fn(),
  getAccountSessionForCookieHeaderMock: vi.fn(),
  useAccountSessionMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookiesMock,
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFoundMock,
  redirect: mocks.redirectMock,
  usePathname: () => "/concepts/projectile-motion",
  useSearchParams: () => new URLSearchParams(globalThis.__TEST_SEARCH_PARAMS__ ?? ""),
}));

vi.mock("@/lib/account/server-store", () => ({
  getOptionalStoredProgressForCookieHeader: mocks.getOptionalStoredProgressForCookieHeaderMock,
}));

vi.mock("@/lib/account/supabase", () => ({
  getAccountSessionForCookieHeader: mocks.getAccountSessionForCookieHeaderMock,
}));

vi.mock("@/lib/account/client", () => ({
  useAccountSession: () => mocks.useAccountSessionMock(),
}));

describe("concept worked example access on the concept route", () => {
  afterEach(() => {
    mocks.cookiesMock.mockReset();
    mocks.notFoundMock.mockReset();
    mocks.redirectMock.mockReset();
    mocks.getOptionalStoredProgressForCookieHeaderMock.mockReset();
    mocks.getAccountSessionForCookieHeaderMock.mockReset();
    mocks.useAccountSessionMock.mockReset();
  });

  it("renders the frozen walkthrough for free sessions", async () => {
    mocks.cookiesMock.mockResolvedValue({
      toString: () => "sb-auth-token=1",
    });
    mocks.getOptionalStoredProgressForCookieHeaderMock.mockResolvedValue({
      storedProgress: null,
      unavailable: false,
    });
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue({
      user: { id: "user-free" },
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "stored",
        updatedAt: "2026-04-04T00:00:00.000Z",
      }),
    });
    mocks.useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-in",
      user: { id: "user-free" },
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "stored",
        updatedAt: "2026-04-04T00:00:00.000Z",
      }),
    });

    render(
      await ConceptPage({
        params: Promise.resolve({ slug: "projectile-motion" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(mocks.getAccountSessionForCookieHeaderMock).toHaveBeenCalledWith("sb-auth-token=1");
    expect(screen.getAllByText(/^Frozen walkthrough$/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Supporter unlocks saved study tools, exact-state sharing/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Frozen values/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Live$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /try earth shot/i })).not.toBeInTheDocument();
  });

  it("renders the live worked example for premium sessions", async () => {
    mocks.cookiesMock.mockResolvedValue({
      toString: () => "sb-auth-token=1",
    });
    mocks.getOptionalStoredProgressForCookieHeaderMock.mockResolvedValue({
      storedProgress: null,
      unavailable: false,
    });
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue({
      user: { id: "user-premium" },
      entitlement: resolveAccountEntitlement({
        tier: "premium",
        source: "stored",
        updatedAt: "2026-04-04T00:00:00.000Z",
      }),
    });
    mocks.useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-in",
      user: { id: "user-premium" },
      entitlement: resolveAccountEntitlement({
        tier: "premium",
        source: "stored",
        updatedAt: "2026-04-04T00:00:00.000Z",
      }),
    });

    render(
      await ConceptPage({
        params: Promise.resolve({ slug: "projectile-motion" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByRole("button", { name: /^Live$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Frozen/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try earth shot/i })).toBeInTheDocument();
    expect(screen.getByText(/Live values/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/Live worked examples are available on Premium/i),
    ).not.toBeInTheDocument();
  });

  it("falls back to anonymous worked examples when the optional account session is unavailable", async () => {
    mocks.cookiesMock.mockResolvedValue({
      toString: () => "",
    });
    mocks.getOptionalStoredProgressForCookieHeaderMock.mockResolvedValue({
      storedProgress: null,
      unavailable: true,
    });
    mocks.getAccountSessionForCookieHeaderMock.mockRejectedValue(
      new Error("NEXT_PUBLIC_SUPABASE_URL is not set."),
    );
    mocks.useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-out",
      user: null,
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "anonymous-default",
        updatedAt: "2026-04-04T00:00:00.000Z",
      }),
    });

    render(
      await ConceptPage({
        params: Promise.resolve({ slug: "projectile-motion" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(mocks.getAccountSessionForCookieHeaderMock).toHaveBeenCalledWith("");
    expect(screen.getAllByText(/^Frozen walkthrough$/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /^Live$/i })).not.toBeInTheDocument();
  });
});
