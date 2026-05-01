// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getOptionalStoredProgressForCookieHeader,
  getStoredProgressForSession,
} from "@/lib/account/server-store";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";

const mocks = vi.hoisted(() => ({
  getAccountSessionForCookieHeaderMock: vi.fn(),
  getSupabaseStoredProgressForCookieHeaderMock: vi.fn(),
}));

vi.mock("@/lib/account/supabase", async () => {
  const actual = await vi.importActual<typeof import("@/lib/account/supabase")>(
    "@/lib/account/supabase",
  );

  return {
    ...actual,
    getAccountSessionForCookieHeader: (...args: unknown[]) =>
      mocks.getAccountSessionForCookieHeaderMock(...args),
    getStoredProgressForCookieHeader: (...args: unknown[]) =>
      mocks.getSupabaseStoredProgressForCookieHeaderMock(...args),
  };
});

describe("public optional stored progress helper", () => {
  afterEach(() => {
    mocks.getAccountSessionForCookieHeaderMock.mockReset();
    mocks.getSupabaseStoredProgressForCookieHeaderMock.mockReset();
    vi.restoreAllMocks();
  });

  it("degrades gracefully when the signed-in entitlement relation is missing", async () => {
    const consoleWarnMock = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    mocks.getAccountSessionForCookieHeaderMock.mockRejectedValue({
      code: "42P01",
      message: 'relation "user_entitlements" does not exist',
    });

    const result = await getOptionalStoredProgressForCookieHeader({
      cookieHeader: "sb-auth-token=1",
      routePath: "/concepts",
    });

    expect(result).toEqual({
      storedProgress: null,
      unavailable: true,
    });
    expect(mocks.getSupabaseStoredProgressForCookieHeaderMock).not.toHaveBeenCalled();
    expect(consoleWarnMock).toHaveBeenCalledWith(
      "[public-route] optional synced progress unavailable during render",
      expect.objectContaining({
        routePath: "/concepts",
        failureKind: "missing_relation",
        relationName: "user_entitlements",
        fallback: "local_progress_only",
      }),
    );
  });

  it("degrades gracefully when synced progress storage is unavailable", async () => {
    const consoleWarnMock = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue({
      user: {
        id: "premium-user",
        email: "premium@example.com",
        displayName: "Supporter learner",
        createdAt: "2026-04-02T00:00:00.000Z",
        lastSignedInAt: "2026-04-03T00:00:00.000Z",
      },
      entitlement: resolveAccountEntitlement({
        tier: "premium",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
      billing: {
        source: "manual",
        status: "active",
        canStartCheckout: false,
        canManageSubscription: false,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      },
    });
    mocks.getSupabaseStoredProgressForCookieHeaderMock.mockRejectedValue({
      code: "42P01",
      message: 'relation "user_concept_progress_snapshots" does not exist',
    });

    const result = await getOptionalStoredProgressForCookieHeader({
      cookieHeader: "sb-auth-token=1",
      routePath: "/challenges",
    });

    expect(result).toEqual({
      storedProgress: null,
      unavailable: true,
    });
    expect(consoleWarnMock).toHaveBeenCalledWith(
      "[public-route] optional synced progress unavailable during render",
      expect.objectContaining({
        routePath: "/challenges",
        failureKind: "missing_relation",
        relationName: "user_concept_progress_snapshots",
        fallback: "local_progress_only",
      }),
    );
  });

  it("marks missing Supabase config as a bounded optional failure on public routes", async () => {
    const consoleWarnMock = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    mocks.getAccountSessionForCookieHeaderMock.mockRejectedValue(
      new Error("NEXT_PUBLIC_SUPABASE_URL is not set."),
    );

    const result = await getOptionalStoredProgressForCookieHeader({
      cookieHeader: null,
      routePath: "/concepts/projectile-motion",
    });

    expect(result).toEqual({
      storedProgress: null,
      unavailable: true,
    });
    expect(consoleWarnMock).toHaveBeenCalledWith(
      "[public-route] optional synced progress unavailable during render",
      expect.objectContaining({
        routePath: "/concepts/projectile-motion",
        failureKind: "not_configured",
        relationName: null,
        fallback: "local_progress_only",
      }),
    );
  });

  it("lets signed-in free accounts reuse the account-backed progress helper", async () => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue({
      user: {
        id: "free-user",
        email: "free@example.com",
        displayName: "Free learner",
        createdAt: "2026-04-02T00:00:00.000Z",
        lastSignedInAt: "2026-04-03T00:00:00.000Z",
      },
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
      billing: {
        source: "none",
        status: "none",
        canStartCheckout: true,
        canManageSubscription: false,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      },
    });
    mocks.getSupabaseStoredProgressForCookieHeaderMock.mockResolvedValue({
      snapshot: {
        version: 1,
        concepts: {
          "projectile-motion": {
            conceptId: "concept-projectile-motion",
            slug: "projectile-motion",
          },
        },
      },
      history: {
        version: 1,
        events: [],
        masteryTimeline: [],
      },
      updatedAt: "2026-04-03T00:00:00.000Z",
      continueLearningState: null,
    });

    await expect(
      getStoredProgressForSession(
        new Request("http://localhost/api/account/progress", {
          headers: {
            cookie: "sb-auth-token=1",
          },
        }),
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        updatedAt: "2026-04-03T00:00:00.000Z",
      }),
    );

    await expect(
      getOptionalStoredProgressForCookieHeader({
        cookieHeader: "sb-auth-token=1",
        routePath: "/concepts",
      }),
    ).resolves.toEqual({
      storedProgress: expect.objectContaining({
        updatedAt: "2026-04-03T00:00:00.000Z",
      }),
      unavailable: false,
    });
    expect(mocks.getSupabaseStoredProgressForCookieHeaderMock).toHaveBeenCalledTimes(2);
  });
});
