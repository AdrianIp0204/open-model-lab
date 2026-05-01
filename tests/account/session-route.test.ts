// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DELETE,
  GET,
  POST,
} from "@/app/api/account/session/route";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";

const mocks = vi.hoisted(() => ({
  getAccountSessionForCookieHeaderMock: vi.fn(),
  resolveDevAccountHarnessSessionMock: vi.fn(),
  sendMagicLinkMock: vi.fn(),
  sendPasswordResetEmailMock: vi.fn(),
  signInWithAccountPasswordMock: vi.fn(),
  signOutAccountSessionMock: vi.fn(),
}));

vi.mock("@/lib/account/supabase", () => ({
  getAccountSessionForCookieHeader: mocks.getAccountSessionForCookieHeaderMock,
  sendMagicLink: mocks.sendMagicLinkMock,
  sendPasswordResetEmail: mocks.sendPasswordResetEmailMock,
  signInWithAccountPassword: mocks.signInWithAccountPasswordMock,
  signOutAccountSession: mocks.signOutAccountSessionMock,
}));

vi.mock("@/lib/account/dev-harness", () => ({
  resolveDevAccountHarnessSession: mocks.resolveDevAccountHarnessSessionMock,
}));

describe("account session route", () => {
  afterEach(() => {
    mocks.getAccountSessionForCookieHeaderMock.mockReset();
    mocks.resolveDevAccountHarnessSessionMock.mockReset();
    mocks.sendMagicLinkMock.mockReset();
    mocks.sendPasswordResetEmailMock.mockReset();
    mocks.signInWithAccountPasswordMock.mockReset();
    mocks.signOutAccountSessionMock.mockReset();
    vi.restoreAllMocks();
  });

  it("returns the current Supabase-backed session when one is available", async () => {
    mocks.resolveDevAccountHarnessSessionMock.mockReturnValue({
      active: false,
      session: null,
    });
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue({
      user: {
        id: "user-1",
        email: "student@example.com",
        displayName: "student",
        createdAt: "2026-03-29T00:00:00.000Z",
        lastSignedInAt: "2026-03-29T01:00:00.000Z",
      },
      entitlement: resolveAccountEntitlement({
        tier: "premium",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
      billing: {
        source: "stripe",
        status: "active",
        canStartCheckout: false,
        canManageSubscription: true,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: "2026-05-02T00:00:00.000Z",
      },
    });

    const response = await GET(
      new Request("http://localhost/api/account/session", {
        headers: {
          cookie: "sb-auth-token=1",
        },
      }),
    );
    const payload = (await response.json()) as {
      session: {
        user: {
          email: string;
        };
        billing: {
          status: string;
        };
      } | null;
      entitlement: {
        tier: string;
      };
      authMode: string;
    };

    expect(response.status).toBe(200);
    expect(payload.session?.user.email).toBe("student@example.com");
    expect(payload.session?.billing.status).toBe("active");
    expect(payload.entitlement.tier).toBe("premium");
    expect(payload.authMode).toBe("supabase");
    expect(response.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0, must-revalidate",
    );
    expect(response.headers.get("vary")).toBe("cookie");
    expect(mocks.getAccountSessionForCookieHeaderMock).toHaveBeenCalledWith("sb-auth-token=1");
  });

  it("resolves signed-out requests to the free entitlement", async () => {
    mocks.resolveDevAccountHarnessSessionMock.mockReturnValue({
      active: false,
      session: null,
    });
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/account/session"),
    );
    const payload = (await response.json()) as {
      session: null;
      entitlement: {
        tier: string;
      };
      authMode: string;
    };

    expect(response.status).toBe(200);
    expect(payload.session).toBeNull();
    expect(payload.entitlement.tier).toBe("free");
    expect(payload.authMode).toBe("supabase");
  });

  it("returns signed-in session warnings without failing the route", async () => {
    mocks.resolveDevAccountHarnessSessionMock.mockReturnValue({
      active: false,
      session: null,
    });
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue({
      user: {
        id: "user-1",
        email: "student@example.com",
        displayName: "student",
        createdAt: "2026-03-29T00:00:00.000Z",
        lastSignedInAt: "2026-03-29T01:00:00.000Z",
      },
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "account-default",
      }),
      billing: {
        source: "none",
        status: "none",
        canStartCheckout: true,
        canManageSubscription: false,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      },
      warnings: {
        entitlementUnavailable: true,
        billingUnavailable: true,
      },
    });

    const response = await GET(
      new Request("http://localhost/api/account/session", {
        headers: {
          cookie: "sb-auth-token=1",
        },
      }),
    );
    const payload = (await response.json()) as {
      session: {
        warnings?: {
          entitlementUnavailable?: boolean;
          billingUnavailable?: boolean;
        };
      } | null;
    };

    expect(response.status).toBe(200);
    expect(payload.session?.warnings?.entitlementUnavailable).toBe(true);
    expect(payload.session?.warnings?.billingUnavailable).toBe(true);
  });

  it("returns a bounded 500 response when core session resolution fails", async () => {
    const consoleErrorMock = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.resolveDevAccountHarnessSessionMock.mockReturnValue({
      active: false,
      session: null,
    });

    mocks.getAccountSessionForCookieHeaderMock.mockRejectedValue(
      new Error("auth_backend_failed"),
    );

    const response = await GET(
      new Request("http://localhost/api/account/session", {
        headers: {
          cookie: "sb-auth-token=1",
        },
      }),
    );
    const payload = (await response.json()) as {
      code: string;
      error: string;
    };

    expect(response.status).toBe(500);
    expect(payload.code).toBe("account_session_failed");
    expect(payload.error).toMatch(/could not be loaded/i);
    expect(response.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0, must-revalidate",
    );
    expect(consoleErrorMock).toHaveBeenCalledWith(
      "[account] session route failed",
      expect.objectContaining({
        hasCookieHeader: true,
        message: "auth_backend_failed",
      }),
    );
  });

  it("sends a magic link for a valid email payload", async () => {
    mocks.resolveDevAccountHarnessSessionMock.mockReturnValue({
      active: false,
      session: null,
    });
    const response = await POST(
      new Request("http://localhost/api/account/session", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "student@example.com",
        }),
      }),
    );
    const payload = (await response.json()) as {
      ok: boolean;
      message: string;
    };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.message).toMatch(/inbox and spam/i);
    expect(mocks.sendMagicLinkMock).toHaveBeenCalledWith(
      "student@example.com",
      undefined,
    );
  });

  it("passes through a requested next path when sending a magic link", async () => {
    mocks.resolveDevAccountHarnessSessionMock.mockReturnValue({
      active: false,
      session: null,
    });

    const response = await POST(
      new Request("http://localhost/api/account/session", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "magic-link",
          email: "student@example.com",
          next: "/concepts/projectile-motion",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.sendMagicLinkMock).toHaveBeenCalledWith(
      "student@example.com",
      "/concepts/projectile-motion",
    );
  });

  it("returns a bounded auth-unavailable response when email sign-in is not configured", async () => {
    mocks.resolveDevAccountHarnessSessionMock.mockReturnValue({
      active: false,
      session: null,
    });
    mocks.sendMagicLinkMock.mockRejectedValue(
      new Error("NEXT_PUBLIC_SUPABASE_URL is not set."),
    );

    const response = await POST(
      new Request("http://localhost/api/account/session", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "student@example.com",
        }),
      }),
    );
    const payload = (await response.json()) as {
      code: string;
      error: string;
    };

    expect(response.status).toBe(503);
    expect(payload.code).toBe("auth_unavailable");
    expect(payload.error).toMatch(/email sign-in is not configured/i);
  });

  it("signs in with password for a valid returning-user payload", async () => {
    mocks.resolveDevAccountHarnessSessionMock.mockReturnValue({
      active: false,
      session: null,
    });
    const response = await POST(
      new Request("http://localhost/api/account/session", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: "sb-auth-token=1",
        },
        body: JSON.stringify({
          action: "password-sign-in",
          email: "student@example.com",
          password: "password-123",
        }),
      }),
    );
    const payload = (await response.json()) as {
      ok: boolean;
    };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(mocks.signInWithAccountPasswordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cookieHeader: "sb-auth-token=1",
        email: "student@example.com",
        password: "password-123",
      }),
    );
  });

  it("returns a sane wrong-password error for invalid password sign-in attempts", async () => {
    mocks.resolveDevAccountHarnessSessionMock.mockReturnValue({
      active: false,
      session: null,
    });
    mocks.signInWithAccountPasswordMock.mockRejectedValue({
      code: "invalid_credentials",
    });

    const response = await POST(
      new Request("http://localhost/api/account/session", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "password-sign-in",
          email: "student@example.com",
          password: "wrong-password",
        }),
      }),
    );
    const payload = (await response.json()) as {
      code: string;
      error: string;
    };

    expect(response.status).toBe(401);
    expect(payload.code).toBe("invalid_credentials");
    expect(payload.error).toBe("Incorrect email or password");
  });

  it("returns a clear email-not-registered error when Supabase exposes the account lookup failure", async () => {
    mocks.resolveDevAccountHarnessSessionMock.mockReturnValue({
      active: false,
      session: null,
    });
    mocks.signInWithAccountPasswordMock.mockRejectedValue({
      code: "user_not_found",
    });

    const response = await POST(
      new Request("http://localhost/api/account/session", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "password-sign-in",
          email: "student@example.com",
          password: "password-123",
        }),
      }),
    );
    const payload = (await response.json()) as {
      code: string;
      error: string;
    };

    expect(response.status).toBe(404);
    expect(payload.code).toBe("email_not_registered");
    expect(payload.error).toMatch(/no account was found/i);
  });

  it("returns a clear email-confirmation error when the account has not been confirmed yet", async () => {
    mocks.resolveDevAccountHarnessSessionMock.mockReturnValue({
      active: false,
      session: null,
    });
    mocks.signInWithAccountPasswordMock.mockRejectedValue({
      code: "email_not_confirmed",
    });

    const response = await POST(
      new Request("http://localhost/api/account/session", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "password-sign-in",
          email: "student@example.com",
          password: "password-123",
        }),
      }),
    );
    const payload = (await response.json()) as {
      code: string;
      error: string;
    };

    expect(response.status).toBe(403);
    expect(payload.code).toBe("email_not_confirmed");
    expect(payload.error).toMatch(/confirm the account/i);
  });

  it("returns a bounded auth-unavailable response when password sign-in is not configured", async () => {
    mocks.resolveDevAccountHarnessSessionMock.mockReturnValue({
      active: false,
      session: null,
    });
    mocks.signInWithAccountPasswordMock.mockRejectedValue(
      new Error("NEXT_PUBLIC_SUPABASE_URL is not set."),
    );

    const response = await POST(
      new Request("http://localhost/api/account/session", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "password-sign-in",
          email: "student@example.com",
          password: "password-123",
        }),
      }),
    );
    const payload = (await response.json()) as {
      code: string;
      error: string;
    };

    expect(response.status).toBe(503);
    expect(payload.code).toBe("auth_unavailable");
    expect(payload.error).toBe("Sign-in is unavailable right now.");
  });

  it("sends a password-reset email through the bounded reset flow", async () => {
    mocks.resolveDevAccountHarnessSessionMock.mockReturnValue({
      active: false,
      session: null,
    });
    const response = await POST(
      new Request("http://localhost/api/account/session", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "password-reset",
          email: "student@example.com",
        }),
      }),
    );
    const payload = (await response.json()) as {
      ok: boolean;
      message: string;
    };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.message).toMatch(/password-reset email has been sent/i);
    expect(mocks.sendPasswordResetEmailMock).toHaveBeenCalledWith(
      "student@example.com",
      null,
    );
  });

  it("passes through a requested next path when sending a password-reset email", async () => {
    mocks.resolveDevAccountHarnessSessionMock.mockReturnValue({
      active: false,
      session: null,
    });

    const response = await POST(
      new Request("http://localhost/api/account/session", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "password-reset",
          email: "student@example.com",
          next: "/zh-HK/account/reset-password",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.sendPasswordResetEmailMock).toHaveBeenCalledWith(
      "student@example.com",
      "/zh-HK/account/reset-password",
    );
  });

  it("returns a bounded auth-unavailable response when password-reset email is not configured", async () => {
    mocks.resolveDevAccountHarnessSessionMock.mockReturnValue({
      active: false,
      session: null,
    });
    mocks.sendPasswordResetEmailMock.mockRejectedValue(
      new Error("NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL is not set."),
    );

    const response = await POST(
      new Request("http://localhost/api/account/session", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "password-reset",
          email: "student@example.com",
        }),
      }),
    );
    const payload = (await response.json()) as {
      code: string;
      error: string;
    };

    expect(response.status).toBe(503);
    expect(payload.code).toBe("auth_unavailable");
    expect(payload.error).toMatch(/password-reset email is not configured/i);
  });

  it("surfaces redirect misconfiguration clearly when password-reset email cannot use the configured return URL", async () => {
    mocks.resolveDevAccountHarnessSessionMock.mockReturnValue({
      active: false,
      session: null,
    });
    mocks.sendPasswordResetEmailMock.mockRejectedValue(
      new Error("Redirect URL is not allowed"),
    );

    const response = await POST(
      new Request("http://localhost/api/account/session", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "password-reset",
          email: "student@example.com",
        }),
      }),
    );
    const payload = (await response.json()) as {
      code: string;
      error: string;
    };

    expect(response.status).toBe(503);
    expect(payload.code).toBe("auth_redirect_unavailable");
    expect(payload.error).toMatch(/supabase redirect settings/i);
    expect(payload.error).toMatch(/auth\/confirm/i);
  });

  it("rejects invalid auth payloads", async () => {
    mocks.resolveDevAccountHarnessSessionMock.mockReturnValue({
      active: false,
      session: null,
    });
    const response = await POST(
      new Request("http://localhost/api/account/session", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "password-sign-in",
          email: "not-an-email",
          password: "short",
        }),
      }),
    );
    const payload = (await response.json()) as {
      code: string;
    };

    expect(response.status).toBe(400);
    expect(payload.code).toBe("invalid_payload");
  });

  it("signs out through Supabase and returns ok", async () => {
    mocks.resolveDevAccountHarnessSessionMock.mockReturnValue({
      active: false,
      session: null,
    });
    const response = await DELETE(
      new Request("http://localhost/api/account/session", {
        method: "DELETE",
        headers: {
          cookie: "sb-auth-token=1",
        },
      }),
    );
    const payload = (await response.json()) as {
      ok: boolean;
    };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(mocks.signOutAccountSessionMock).toHaveBeenCalledOnce();
  });

  it("marks session responses as dev-harness sourced when the override is active", async () => {
    mocks.resolveDevAccountHarnessSessionMock.mockReturnValue({
      active: true,
      session: null,
    });
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/account/session"));
    const payload = (await response.json()) as {
      authMode: string;
    };

    expect(response.status).toBe(200);
    expect(payload.authMode).toBe("dev-harness");
  });

  it("blocks live auth actions while the dev harness override is active", async () => {
    mocks.resolveDevAccountHarnessSessionMock.mockReturnValue({
      active: true,
      session: null,
    });

    const response = await POST(
      new Request("http://localhost/api/account/session", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "password-sign-in",
          email: "student@example.com",
          password: "password-123",
        }),
      }),
    );
    const payload = (await response.json()) as {
      code: string;
      error: string;
    };

    expect(response.status).toBe(409);
    expect(payload.code).toBe("dev_harness_active");
    expect(payload.error).toMatch(/reset to real auth/i);
    expect(mocks.signInWithAccountPasswordMock).not.toHaveBeenCalled();
  });
});
