// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/auth/confirm/route";

const mocks = vi.hoisted(() => ({
  exchangeAuthCodeMock: vi.fn(),
  verifyMagicLinkMock: vi.fn(),
}));

vi.mock("@/lib/account/supabase", () => ({
  exchangeAuthCode: mocks.exchangeAuthCodeMock,
  verifyMagicLink: mocks.verifyMagicLinkMock,
}));

describe("auth confirm route", () => {
  afterEach(() => {
    mocks.exchangeAuthCodeMock.mockReset();
    mocks.verifyMagicLinkMock.mockReset();
  });

  it("exchanges auth codes and redirects to the signed-in dashboard by default", async () => {
    const response = await GET(
      new Request("http://localhost/auth/confirm?code=exchange-code-123", {
        headers: {
          cookie: "sb-auth-token=1",
        },
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/dashboard");
    expect(mocks.exchangeAuthCodeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "exchange-code-123",
        cookieHeader: "sb-auth-token=1",
      }),
    );
    expect(mocks.verifyMagicLinkMock).not.toHaveBeenCalled();
  });

  it("routes signup confirmations through the optional password-setup step", async () => {
    const response = await GET(
      new Request(
        "http://localhost/auth/confirm?token_hash=token-123&type=signup&next=%2Fdashboard",
        {
          headers: {
            cookie: "sb-auth-token=1",
          },
        },
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/account/create-password?next=%2Fdashboard",
    );
    expect(mocks.verifyMagicLinkMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cookieHeader: "sb-auth-token=1",
        tokenHash: "token-123",
        type: "signup",
      }),
    );
  });

  it("preserves the request locale in default success redirects", async () => {
    const response = await GET(
      new Request("http://localhost/zh-HK/auth/confirm?code=exchange-code-123", {
        headers: {
          cookie: "sb-auth-token=1",
        },
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/zh-HK/dashboard");
  });

  it("routes a first code-based confirmation through the optional password-setup step", async () => {
    mocks.exchangeAuthCodeMock.mockResolvedValueOnce({
      id: "user-1",
      created_at: "2026-04-07T00:00:00.000Z",
      last_sign_in_at: "2026-04-07T00:00:20.000Z",
    });

    const response = await GET(
      new Request("http://localhost/auth/confirm?code=exchange-code-123&next=%2Fdashboard", {
        headers: {
          cookie: "sb-auth-token=1",
        },
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/account/create-password?next=%2Fdashboard",
    );
    expect(mocks.exchangeAuthCodeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "exchange-code-123",
        cookieHeader: "sb-auth-token=1",
      }),
    );
  });

  it("accepts email confirmation types for magic-link sign-in", async () => {
    const response = await GET(
      new Request(
        "http://localhost/auth/confirm?token_hash=token-123&type=email&next=%2Fdashboard",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/dashboard");
    expect(mocks.verifyMagicLinkMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenHash: "token-123",
        type: "email",
      }),
    );
  });

  it("routes first-time OTP confirmations through the optional password-setup step", async () => {
    mocks.verifyMagicLinkMock.mockResolvedValueOnce({
      id: "user-1",
      created_at: "2026-04-07T10:00:00.000Z",
      last_sign_in_at: "2026-04-07T10:00:20.000Z",
    });

    const response = await GET(
      new Request(
        "http://localhost/auth/confirm?token_hash=token-123&type=email&next=%2Fconcepts%2Fprojectile-motion",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/account/create-password?next=%2Fconcepts%2Fprojectile-motion",
    );
  });

  it("accepts magiclink confirmation types for returning email-link sign-in", async () => {
    const response = await GET(
      new Request(
        "http://localhost/auth/confirm?token_hash=token-123&type=magiclink&next=%2Fdashboard",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/dashboard");
    expect(mocks.verifyMagicLinkMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenHash: "token-123",
        type: "magiclink",
      }),
    );
  });

  it("routes recovery links into the in-browser reset-password page", async () => {
    const response = await GET(
      new Request(
        "http://localhost/auth/confirm?token_hash=token-123&type=recovery&next=%2Faccount%2Freset-password",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/account/reset-password",
    );
    expect(mocks.verifyMagicLinkMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenHash: "token-123",
        type: "recovery",
      }),
    );
  });

  it("routes recovery verification failures back to the reset-password page", async () => {
    mocks.verifyMagicLinkMock.mockRejectedValueOnce(new Error("otp_expired"));

    const response = await GET(
      new Request(
        "http://localhost/auth/confirm?token_hash=token-123&type=recovery&next=%2Faccount%2Freset-password",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/account/reset-password?auth=expired",
    );
  });

  it("preserves the request locale in recovery failure redirects", async () => {
    mocks.verifyMagicLinkMock.mockRejectedValueOnce(new Error("otp_expired"));

    const response = await GET(
      new Request(
        "http://localhost/zh-HK/auth/confirm?token_hash=token-123&type=recovery",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/zh-HK/account/reset-password?auth=expired",
    );
  });

  it("marks already-used recovery links explicitly on the reset-password page", async () => {
    mocks.verifyMagicLinkMock.mockRejectedValueOnce(new Error("Recovery token already used"));

    const response = await GET(
      new Request(
        "http://localhost/auth/confirm?token_hash=token-123&type=recovery&next=%2Faccount%2Freset-password",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/account/reset-password?auth=used",
    );
  });

  it("marks malformed recovery callbacks as missing instead of using a generic failure", async () => {
    const response = await GET(
      new Request("http://localhost/auth/confirm?next=%2Faccount%2Freset-password"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/account/reset-password?auth=missing",
    );
  });

  it("redirects to the account error page for unsupported types", async () => {
    const response = await GET(
      new Request(
        "http://localhost/auth/confirm?token_hash=token-123&type=unknown&next=%2Faccount",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/account?auth=invalid");
    expect(mocks.verifyMagicLinkMock).not.toHaveBeenCalled();
  });

  it("marks missing Supabase auth config as unavailable on account-facing auth returns", async () => {
    mocks.exchangeAuthCodeMock.mockRejectedValueOnce(
      new Error("NEXT_PUBLIC_SUPABASE_URL is not set"),
    );

    const response = await GET(
      new Request("http://localhost/auth/confirm?code=exchange-code-123&next=%2Faccount"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/account?auth=unavailable",
    );
  });
});
