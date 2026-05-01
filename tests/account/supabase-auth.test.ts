// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  sendMagicLink,
  sendPasswordResetEmail,
  signInWithAccountPassword,
  updateAccountPassword,
} from "@/lib/account/supabase";

const mocks = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  createSupabaseServerClientMock: vi.fn(),
  signInWithOtpMock: vi.fn(),
  resetPasswordForEmailMock: vi.fn(),
  signInWithPasswordMock: vi.fn(),
  updateUserMock: vi.fn(),
}));

vi.mock("@supabase/supabase-js", async () => {
  const actual = await vi.importActual<typeof import("@supabase/supabase-js")>(
    "@supabase/supabase-js",
  );

  return {
    ...actual,
    createClient: mocks.createClientMock,
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClientMock,
}));

vi.mock("@/lib/supabase/env", () => ({
  buildSiteUrl: (pathname: string) => new URL(pathname, "https://openmodellab.test/").toString(),
  getSupabasePublishableKey: () => "public-anon-key",
  getSupabaseUrl: () => "https://supabase.openmodellab.test",
}));

describe("account supabase auth helpers", () => {
  afterEach(() => {
    mocks.createClientMock.mockReset();
    mocks.createSupabaseServerClientMock.mockReset();
    mocks.signInWithOtpMock.mockReset();
    mocks.resetPasswordForEmailMock.mockReset();
    mocks.signInWithPasswordMock.mockReset();
    mocks.updateUserMock.mockReset();
  });

  it("sends magic-link requests through the server confirm route", async () => {
    mocks.signInWithOtpMock.mockResolvedValue({
      error: null,
    });
    mocks.createClientMock.mockReturnValue({
      auth: {
        signInWithOtp: mocks.signInWithOtpMock,
      },
    });

    await sendMagicLink("student@example.com");

    expect(mocks.signInWithOtpMock).toHaveBeenCalledWith({
      email: "student@example.com",
      options: {
        shouldCreateUser: true,
        emailRedirectTo: "https://openmodellab.test/auth/confirm?next=%2Fdashboard",
      },
    });
  });

  it("preserves a requested next path in the magic-link return URL", async () => {
    mocks.signInWithOtpMock.mockResolvedValue({
      error: null,
    });
    mocks.createClientMock.mockReturnValue({
      auth: {
        signInWithOtp: mocks.signInWithOtpMock,
      },
    });

    await sendMagicLink("student@example.com", "/concepts/projectile-motion");

    expect(mocks.signInWithOtpMock).toHaveBeenCalledWith({
      email: "student@example.com",
      options: {
        shouldCreateUser: true,
        emailRedirectTo:
          "https://openmodellab.test/auth/confirm?next=%2Fconcepts%2Fprojectile-motion",
      },
    });
  });

  it("sends password-reset requests through the server confirm route", async () => {
    mocks.resetPasswordForEmailMock.mockResolvedValue({
      error: null,
    });
    mocks.createClientMock.mockReturnValue({
      auth: {
        resetPasswordForEmail: mocks.resetPasswordForEmailMock,
      },
    });

    await sendPasswordResetEmail("student@example.com");

    expect(mocks.resetPasswordForEmailMock).toHaveBeenCalledWith(
      "student@example.com",
      {
        redirectTo: "https://openmodellab.test/auth/confirm?next=%2Faccount%2Freset-password",
      },
    );
  });

  it("signs in with password through the SSR Supabase client", async () => {
    mocks.signInWithPasswordMock.mockResolvedValue({
      error: null,
    });
    mocks.createSupabaseServerClientMock.mockReturnValue({
      auth: {
        signInWithPassword: mocks.signInWithPasswordMock,
      },
    });

    const response = new Response();

    await signInWithAccountPassword({
      cookieHeader: "sb-auth-token=1",
      response: response as never,
      email: "student@example.com",
      password: "password-123",
    });

    expect(mocks.createSupabaseServerClientMock).toHaveBeenCalledWith({
      cookieHeader: "sb-auth-token=1",
      response,
    });
    expect(mocks.signInWithPasswordMock).toHaveBeenCalledWith({
      email: "student@example.com",
      password: "password-123",
    });
  });

  it("updates the account password through the SSR Supabase client", async () => {
    mocks.updateUserMock.mockResolvedValue({
      error: null,
    });
    mocks.createSupabaseServerClientMock.mockReturnValue({
      auth: {
        updateUser: mocks.updateUserMock,
      },
    });

    const response = new Response();

    await updateAccountPassword({
      cookieHeader: "sb-auth-token=1",
      response: response as never,
      password: "new-password-123",
    });

    expect(mocks.createSupabaseServerClientMock).toHaveBeenCalledWith({
      cookieHeader: "sb-auth-token=1",
      response,
    });
    expect(mocks.updateUserMock).toHaveBeenCalledWith({
      password: "new-password-123",
    });
  });
});
