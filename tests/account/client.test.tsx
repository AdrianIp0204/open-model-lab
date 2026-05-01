// @vitest-environment jsdom

import { useEffect } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";
import {
  ACCOUNT_MAGIC_LINK_COOLDOWN_MS,
  ACCOUNT_MAGIC_LINK_COOLDOWN_STORAGE_KEY,
  initializeAccountSession,
  requestMagicLink,
  requestPasswordReset,
  resetAccountSessionForTests,
  signInWithPassword,
  signOutAccount,
  updateAccountPassword,
  useAccountSession,
} from "@/lib/account/client";

function buildSignedOutPayload() {
  return {
    session: null,
    entitlement: resolveAccountEntitlement({
      tier: "free",
      source: "anonymous-default",
    }),
    authMode: "supabase" as const,
  };
}

function buildSignedInPayload() {
  return {
    session: {
      user: {
        id: "user-1",
        email: "student@example.com",
        displayName: "Lab Student",
        createdAt: "2026-03-29T00:00:00.000Z",
        lastSignedInAt: "2026-03-29T01:00:00.000Z",
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
    },
    entitlement: resolveAccountEntitlement({
      tier: "free",
      source: "stored",
      updatedAt: "2026-04-02T00:00:00.000Z",
    }),
    authMode: "supabase" as const,
  };
}

function SessionProbe() {
  const session = useAccountSession();

  useEffect(() => {
    initializeAccountSession();
  }, []);

  return (
    <div>
      <div data-testid="initialized">{session.initialized ? "yes" : "no"}</div>
      <div data-testid="status">{session.status}</div>
      <div data-testid="user-email">{session.user?.email ?? ""}</div>
      <div data-testid="auth-mode">{session.authMode}</div>
      <div data-testid="notice">{session.noticeMessage ?? ""}</div>
      <div data-testid="error-code">{session.errorCode ?? ""}</div>
      <div data-testid="error">{session.errorMessage ?? ""}</div>
      <div data-testid="pending-action">{session.pendingAction ?? ""}</div>
      <div data-testid="cooldown">
        {session.magicLinkCooldownExpiresAt ? String(session.magicLinkCooldownExpiresAt) : ""}
      </div>
      <button
        type="button"
        onClick={() => void signInWithPassword("student@example.com", "password-123")}
      >
        Sign in with password
      </button>
      <button type="button" onClick={() => void requestMagicLink("student@example.com")}>
        Request magic link
      </button>
      <button type="button" onClick={() => void requestPasswordReset("student@example.com")}>
        Request password reset
      </button>
      <button type="button" onClick={() => void updateAccountPassword("updated-password-123")}>
        Update password
      </button>
      <button type="button" onClick={() => void signOutAccount()}>
        Sign out
      </button>
    </div>
  );
}

describe("account client session store", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.useRealTimers();
    vi.stubGlobal("fetch", fetchMock);
    window.localStorage.clear();
    resetAccountSessionForTests();
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    window.localStorage.clear();
    resetAccountSessionForTests();
    vi.useRealTimers();
  });

  it("signs in with password and refreshes into the signed-in session", async () => {
    const user = userEvent.setup();

    fetchMock.mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input.url;

      if (url === "/api/account/session" && (!init || init.method === undefined)) {
        if (fetchMock.mock.calls.length <= 1) {
          return new Response(JSON.stringify(buildSignedOutPayload()), {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          });
        }

        return new Response(JSON.stringify(buildSignedInPayload()), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        });
      }

      if (url === "/api/account/session" && init?.method === "POST") {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    render(<SessionProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("initialized")).toHaveTextContent("yes");
      expect(screen.getByTestId("status")).toHaveTextContent("signed-out");
    });

    await user.click(screen.getByRole("button", { name: "Sign in with password" }));

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("signed-in");
      expect(screen.getByTestId("user-email")).toHaveTextContent("student@example.com");
    });
  });

  it("keeps a sane wrong-password error in the signed-out state", async () => {
    const user = userEvent.setup();

    fetchMock.mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input.url;

      if (url === "/api/account/session" && (!init || init.method === undefined)) {
        return new Response(JSON.stringify(buildSignedOutPayload()), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        });
      }

      if (url === "/api/account/session" && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            error: "Incorrect email or password",
          }),
          {
            status: 401,
            headers: {
              "content-type": "application/json",
            },
          },
        );
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    render(<SessionProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("initialized")).toHaveTextContent("yes");
    });

    await user.click(screen.getByRole("button", { name: "Sign in with password" }));

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("signed-out");
      expect(screen.getByTestId("error")).toHaveTextContent("Incorrect email or password");
    });
  });

  it("starts the cooldown only after a successful magic-link request", async () => {
    const fixedNow = new Date("2026-04-03T00:00:00.000Z").getTime();
    const dateNowMock = vi.spyOn(Date, "now").mockReturnValue(fixedNow);
    const user = userEvent.setup();

    fetchMock.mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input.url;

      if (url === "/api/account/session" && (!init || init.method === undefined)) {
        return new Response(JSON.stringify(buildSignedOutPayload()), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        });
      }

      if (url === "/api/account/session" && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            ok: true,
            message: "Check your email for a sign-in link.",
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        );
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    render(<SessionProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("initialized")).toHaveTextContent("yes");
    });

    await user.click(screen.getByRole("button", { name: "Request magic link" }));

    const expectedExpiresAt = fixedNow + ACCOUNT_MAGIC_LINK_COOLDOWN_MS;

    await waitFor(() => {
      expect(screen.getByTestId("notice")).toHaveTextContent(/check your email/i);
      expect(screen.getByTestId("cooldown")).toHaveTextContent(String(expectedExpiresAt));
    });
    expect(window.localStorage.getItem(ACCOUNT_MAGIC_LINK_COOLDOWN_STORAGE_KEY)).toBe(
      String(expectedExpiresAt),
    );

    dateNowMock.mockRestore();
  });

  it("restores the cooldown from localStorage after a reload in the same browser", async () => {
    const expiresAt = Date.now() + ACCOUNT_MAGIC_LINK_COOLDOWN_MS;

    window.localStorage.setItem(
      ACCOUNT_MAGIC_LINK_COOLDOWN_STORAGE_KEY,
      String(expiresAt),
    );

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(buildSignedOutPayload()), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    render(<SessionProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("cooldown")).toHaveTextContent(String(expiresAt));
    });
  });

  it("does not start the cooldown when the magic-link request fails", async () => {
    const user = userEvent.setup();

    fetchMock.mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input.url;

      if (url === "/api/account/session" && (!init || init.method === undefined)) {
        return new Response(JSON.stringify(buildSignedOutPayload()), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        });
      }

      if (url === "/api/account/session" && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            error: "Account request failed.",
          }),
          {
            status: 500,
            headers: {
              "content-type": "application/json",
            },
          },
        );
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    render(<SessionProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("initialized")).toHaveTextContent("yes");
    });

    await user.click(screen.getByRole("button", { name: "Request magic link" }));

    await waitFor(() => {
      expect(screen.getByTestId("error")).toHaveTextContent(/account request failed/i);
    });
    expect(screen.getByTestId("cooldown")).toHaveTextContent("");
    expect(window.localStorage.getItem(ACCOUNT_MAGIC_LINK_COOLDOWN_STORAGE_KEY)).toBeNull();
  });

  it("stores the password-reset notice without changing the signed-out session", async () => {
    const user = userEvent.setup();

    fetchMock.mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input.url;

      if (url === "/api/account/session" && (!init || init.method === undefined)) {
        return new Response(JSON.stringify(buildSignedOutPayload()), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        });
      }

      if (url === "/api/account/session" && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            ok: true,
            message:
              "If that email matches an existing account, a password-reset email has been sent. Check your inbox and spam for the link.",
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        );
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    render(<SessionProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("initialized")).toHaveTextContent("yes");
    });

    await user.click(screen.getByRole("button", { name: "Request password reset" }));

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("signed-out");
      expect(screen.getByTestId("notice")).toHaveTextContent(/password-reset email has been sent/i);
    });
  });

  it("posts an explicit password-reset continuation path when provided", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    await requestPasswordReset("student@example.com", "/zh-HK/account/reset-password");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/account/session",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          action: "password-reset",
          email: "student@example.com",
          next: "/zh-HK/account/reset-password",
        }),
      }),
    );
  });

  it("keeps the signed-in session while sending a password-reset email fallback", async () => {
    const user = userEvent.setup();

    fetchMock.mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input.url;

      if (url === "/api/account/session" && (!init || init.method === undefined)) {
        return new Response(JSON.stringify(buildSignedInPayload()), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        });
      }

      if (url === "/api/account/session" && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            ok: true,
            message:
              "If that email matches an existing account, a password-reset email has been sent. Check your inbox and spam for the link.",
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        );
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    render(<SessionProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("signed-in");
    });

    await user.click(screen.getByRole("button", { name: "Request password reset" }));

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("signed-in");
      expect(screen.getByTestId("user-email")).toHaveTextContent("student@example.com");
      expect(screen.getByTestId("notice")).toHaveTextContent(/password-reset email has been sent/i);
    });
  });

  it("updates the password for an already authenticated session", async () => {
    const user = userEvent.setup();

    fetchMock.mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input.url;

      if (url === "/api/account/session" && (!init || init.method === undefined)) {
        return new Response(JSON.stringify(buildSignedInPayload()), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        });
      }

      if (url === "/api/account/password" && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            ok: true,
            message: "Password updated. You can use it the next time you sign in on this site.",
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        );
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    render(<SessionProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("signed-in");
    });

    await user.click(screen.getByRole("button", { name: "Update password" }));

    await waitFor(() => {
      expect(screen.getByTestId("notice")).toHaveTextContent(/password updated/i);
      expect(screen.getByTestId("status")).toHaveTextContent("signed-in");
    });
  });

  it("stores the reauthentication error code for signed-in password-change fallbacks", async () => {
    const user = userEvent.setup();

    fetchMock.mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input.url;

      if (url === "/api/account/session" && (!init || init.method === undefined)) {
        return new Response(JSON.stringify(buildSignedInPayload()), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        });
      }

      if (url === "/api/account/password" && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            code: "reauthentication_needed",
            error:
              "This project currently requires recent authentication before password changes.",
          }),
          {
            status: 401,
            headers: {
              "content-type": "application/json",
            },
          },
        );
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    render(<SessionProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("signed-in");
    });

    await user.click(screen.getByRole("button", { name: "Update password" }));

    await waitFor(() => {
      expect(screen.getByTestId("error-code")).toHaveTextContent("reauthentication_needed");
      expect(screen.getByTestId("status")).toHaveTextContent("signed-in");
    });
  });

  it("returns to the signed-out state after sign out", async () => {
    const user = userEvent.setup();

    fetchMock.mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input.url;

      if (url === "/api/account/session" && (!init || init.method === undefined)) {
        return new Response(JSON.stringify(buildSignedInPayload()), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        });
      }

      if (url === "/api/account/session" && init?.method === "DELETE") {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    render(<SessionProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("signed-in");
      expect(screen.getByTestId("user-email")).toHaveTextContent("student@example.com");
    });

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("signed-out");
      expect(screen.getByTestId("user-email")).toHaveTextContent("");
    });
  });
});
