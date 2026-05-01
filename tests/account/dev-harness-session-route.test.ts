// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DELETE,
  GET,
} from "@/app/api/account/session/route";
import { DEV_ACCOUNT_HARNESS_COOKIE } from "@/lib/account/dev-harness";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClientMock,
}));

function buildHarnessCookie(value: string) {
  return `${DEV_ACCOUNT_HARNESS_COOKIE}=${encodeURIComponent(value)}`;
}

describe("account session route with dev account harness", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    mocks.createSupabaseServerClientMock.mockReset();
  });

  it("returns the free fixture session without consulting Supabase", async () => {
    vi.stubEnv("ENABLE_DEV_ACCOUNT_HARNESS", "true");

    const response = await GET(
      new Request("http://localhost/api/account/session", {
        headers: {
          cookie: buildHarnessCookie("signed-in-free"),
        },
      }),
    );
    const payload = (await response.json()) as {
      session: {
        user: {
          displayName: string;
        };
        entitlement: {
          capabilities: {
            canSyncProgress: boolean;
          };
        };
        billing?: {
          canManageSubscription: boolean;
        };
      } | null;
      entitlement: {
        tier: string;
      };
    };

    expect(response.status).toBe(200);
    expect(payload.session?.user.displayName).toBe("Free learner");
    expect(payload.session?.entitlement.capabilities.canSyncProgress).toBe(true);
    expect(payload.entitlement.tier).toBe("free");
    expect(mocks.createSupabaseServerClientMock).not.toHaveBeenCalled();
  });

  it("marks fixture billing as not configured when Stripe env is absent", async () => {
    vi.stubEnv("ENABLE_DEV_ACCOUNT_HARNESS", "true");
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    vi.stubEnv("STRIPE_PREMIUM_PRICE_ID", "");

    const response = await GET(
      new Request("http://localhost/api/account/session", {
        headers: {
          cookie: buildHarnessCookie("signed-in-free"),
        },
      }),
    );
    const payload = (await response.json()) as {
      session: {
        warnings?: {
          billingNotConfigured?: boolean;
          billingConfigIssues?: string[];
        };
      } | null;
    };

    expect(response.status).toBe(200);
    expect(payload.session?.warnings?.billingNotConfigured).toBe(true);
    expect(payload.session?.warnings?.billingConfigIssues).toEqual([
      "missing_secret_key",
      "missing_webhook_secret",
      "missing_price_id",
    ]);
    expect(mocks.createSupabaseServerClientMock).not.toHaveBeenCalled();
  });

  it("returns the premium fixture session without consulting Supabase", async () => {
    vi.stubEnv("ENABLE_DEV_ACCOUNT_HARNESS", "true");

    const response = await GET(
      new Request("http://localhost/api/account/session", {
        headers: {
          cookie: buildHarnessCookie("signed-in-premium"),
        },
      }),
    );
    const payload = (await response.json()) as {
      session: {
        user: {
          displayName: string;
        };
        billing?: {
          canManageSubscription: boolean;
        };
      } | null;
      entitlement: {
        tier: string;
      };
    };

    expect(response.status).toBe(200);
    expect(payload.session?.user.displayName).toBe("Supporter learner");
    expect(payload.session?.billing?.canManageSubscription).toBe(true);
    expect(payload.entitlement.tier).toBe("premium");
    expect(mocks.createSupabaseServerClientMock).not.toHaveBeenCalled();
  });

  it("returns a signed-out free entitlement for the signed-out fixture", async () => {
    vi.stubEnv("ENABLE_DEV_ACCOUNT_HARNESS", "true");

    const response = await GET(
      new Request("http://localhost/api/account/session", {
        headers: {
          cookie: buildHarnessCookie("signed-out"),
        },
      }),
    );
    const payload = (await response.json()) as {
      session: null;
      entitlement: {
        tier: string;
      };
    };

    expect(response.status).toBe(200);
    expect(payload.session).toBeNull();
    expect(payload.entitlement.tier).toBe("free");
    expect(mocks.createSupabaseServerClientMock).not.toHaveBeenCalled();
  });

  it("signs out by moving the harness into the signed-out fixture", async () => {
    vi.stubEnv("ENABLE_DEV_ACCOUNT_HARNESS", "true");

    const response = await DELETE(
      new Request("http://localhost/api/account/session", {
        method: "DELETE",
        headers: {
          cookie: buildHarnessCookie("signed-in-premium"),
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain(
      `${DEV_ACCOUNT_HARNESS_COOKIE}=signed-out`,
    );
    expect(mocks.createSupabaseServerClientMock).not.toHaveBeenCalled();
  });
});
