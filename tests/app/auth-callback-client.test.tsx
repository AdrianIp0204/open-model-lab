// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSupabaseBrowserClientMock: vi.fn(),
  refreshAccountSessionMock: vi.fn(),
  classifyAccountAuthFailureMock: vi.fn(() => "expired"),
  routerReplaceMock: vi.fn(),
}));

vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();

  return {
    ...actual,
    useRouter: () => ({
      replace: mocks.routerReplaceMock,
    }),
  };
});

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: mocks.getSupabaseBrowserClientMock,
}));

vi.mock("@/lib/account/client", () => ({
  refreshAccountSession: mocks.refreshAccountSessionMock,
}));

vi.mock("@/lib/account/auth-return", () => ({
  classifyAccountAuthFailure: mocks.classifyAccountAuthFailureMock,
}));

import { AuthCallbackClient } from "@/app/auth/callback/AuthCallbackClient";

describe("AuthCallbackClient", () => {
  it("preserves the active locale in bounded recovery failures", async () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";
    mocks.getSupabaseBrowserClientMock.mockReturnValue({
      auth: {
        onAuthStateChange: () => ({
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        }),
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
          error: null,
        }),
      },
    });

    render(<AuthCallbackClient nextPath="/account/reset-password" />);

    expect(screen.getByText("帳戶")).toBeInTheDocument();
    expect(screen.getByText("正在完成登入")).toBeInTheDocument();
    expect(
      screen.getByText("Open Model Lab 正在完成魔法連結登入，並恢復你的同步概念進度。"),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(mocks.routerReplaceMock).toHaveBeenCalledWith(
        "/zh-HK/account/reset-password?auth=expired",
      );
    });
  });
});
