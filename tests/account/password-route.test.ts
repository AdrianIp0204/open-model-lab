// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/account/password/route";

const mocks = vi.hoisted(() => ({
  resolveDevAccountHarnessSessionMock: vi.fn(),
  updateAccountPasswordMock: vi.fn(),
}));

vi.mock("@/lib/account/dev-harness", () => ({
  resolveDevAccountHarnessSession: mocks.resolveDevAccountHarnessSessionMock,
}));

vi.mock("@/lib/account/supabase", () => ({
  updateAccountPassword: mocks.updateAccountPasswordMock,
}));

describe("account password route", () => {
  afterEach(() => {
    mocks.resolveDevAccountHarnessSessionMock.mockReset();
    mocks.updateAccountPasswordMock.mockReset();
  });

  it("updates the password for an authenticated session", async () => {
    mocks.resolveDevAccountHarnessSessionMock.mockReturnValue({
      active: false,
      session: null,
    });
    const response = await POST(
      new Request("http://localhost/api/account/password", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: "sb-auth-token=1",
        },
        body: JSON.stringify({
          password: "updated-password-123",
        }),
      }),
    );
    const payload = (await response.json()) as {
      ok: boolean;
      message: string;
    };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.message).toMatch(/password updated/i);
    expect(mocks.updateAccountPasswordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cookieHeader: "sb-auth-token=1",
        password: "updated-password-123",
      }),
    );
  });

  it("returns a bounded authentication error when the recovery or signed-in session is missing", async () => {
    mocks.resolveDevAccountHarnessSessionMock.mockReturnValue({
      active: false,
      session: null,
    });
    mocks.updateAccountPasswordMock.mockRejectedValue(
      new Error("Auth session missing!"),
    );

    const response = await POST(
      new Request("http://localhost/api/account/password", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          password: "updated-password-123",
        }),
      }),
    );
    const payload = (await response.json()) as {
      code: string;
      error: string;
    };

    expect(response.status).toBe(401);
    expect(payload.code).toBe("not_authenticated");
    expect(payload.error).toMatch(/open the recovery link again/i);
  });

  it("returns a reauthentication-aware fallback when secure password changes require it", async () => {
    mocks.resolveDevAccountHarnessSessionMock.mockReturnValue({
      active: false,
      session: null,
    });
    mocks.updateAccountPasswordMock.mockRejectedValue({
      code: "reauthentication_needed",
    });

    const response = await POST(
      new Request("http://localhost/api/account/password", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: "sb-auth-token=1",
        },
        body: JSON.stringify({
          password: "updated-password-123",
        }),
      }),
    );
    const payload = (await response.json()) as {
      code: string;
      error: string;
    };

    expect(response.status).toBe(401);
    expect(payload.code).toBe("reauthentication_needed");
    expect(payload.error).toMatch(/password-reset email/i);
  });

  it("returns a bounded auth-unavailable response when password updates are not configured", async () => {
    mocks.resolveDevAccountHarnessSessionMock.mockReturnValue({
      active: false,
      session: null,
    });
    mocks.updateAccountPasswordMock.mockRejectedValue(
      new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set."),
    );

    const response = await POST(
      new Request("http://localhost/api/account/password", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: "sb-auth-token=1",
        },
        body: JSON.stringify({
          password: "updated-password-123",
        }),
      }),
    );
    const payload = (await response.json()) as {
      code: string;
      error: string;
    };

    expect(response.status).toBe(503);
    expect(payload.code).toBe("auth_unavailable");
    expect(payload.error).toMatch(/password updates are not configured/i);
  });

  it("blocks password updates while a dev harness fixture is active", async () => {
    mocks.resolveDevAccountHarnessSessionMock.mockReturnValue({
      active: true,
      session: null,
    });

    const response = await POST(
      new Request("http://localhost/api/account/password", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          password: "updated-password-123",
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
    expect(mocks.updateAccountPasswordMock).not.toHaveBeenCalled();
  });
});
