// @vitest-environment jsdom

import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enableRemoteSyncMock: vi.fn(),
  disableRemoteSyncMock: vi.fn(),
  enableSavedSetupsRemoteSyncMock: vi.fn(),
  disableSavedSetupsRemoteSyncMock: vi.fn(),
  enableSavedCompareSetupsRemoteSyncMock: vi.fn(),
  disableSavedCompareSetupsRemoteSyncMock: vi.fn(),
  initializeAccountSessionMock: vi.fn(),
  refreshAccountSessionMock: vi.fn(),
  useAccountSessionMock: vi.fn(),
}));

let authStateChangeHandler:
  | ((event: string, session: unknown) => void)
  | null = null;

vi.mock("@/lib/account/client", () => ({
  initializeAccountSession: (...args: unknown[]) => mocks.initializeAccountSessionMock(...args),
  refreshAccountSession: (...args: unknown[]) => mocks.refreshAccountSessionMock(...args),
  useAccountSession: () => mocks.useAccountSessionMock(),
}));

vi.mock("@/lib/progress", () => ({
  localConceptProgressStore: {
    enableRemoteSync: (...args: unknown[]) => mocks.enableRemoteSyncMock(...args),
    disableRemoteSync: (...args: unknown[]) => mocks.disableRemoteSyncMock(...args),
  },
}));

vi.mock("@/lib/saved-setups-store", () => ({
  localSavedSetupsStore: {
    enableRemoteSync: (...args: unknown[]) =>
      mocks.enableSavedSetupsRemoteSyncMock(...args),
    disableRemoteSync: (...args: unknown[]) =>
      mocks.disableSavedSetupsRemoteSyncMock(...args),
  },
}));

vi.mock("@/lib/saved-compare-setups-store", () => ({
  localSavedCompareSetupsStore: {
    enableRemoteSync: (...args: unknown[]) =>
      mocks.enableSavedCompareSetupsRemoteSyncMock(...args),
    disableRemoteSync: (...args: unknown[]) =>
      mocks.disableSavedCompareSetupsRemoteSyncMock(...args),
  },
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({
    auth: {
      onAuthStateChange: (
        handler: (event: string, session: unknown) => void,
      ) => {
        authStateChangeHandler = handler;

        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        };
      },
    },
  }),
}));

import { resolveAccountEntitlement } from "@/lib/account/entitlements";
import { AccountSyncProvider } from "@/components/account/AccountSyncProvider";

describe("AccountSyncProvider", () => {
  const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalSupabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.openmodellab.test";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "public-key";
    mocks.useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-out",
      user: null,
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "anonymous-default",
      }),
    });
  });

  afterEach(() => {
    authStateChangeHandler = null;
    mocks.disableRemoteSyncMock.mockReset();
    mocks.enableRemoteSyncMock.mockReset();
    mocks.disableSavedSetupsRemoteSyncMock.mockReset();
    mocks.enableSavedSetupsRemoteSyncMock.mockReset();
    mocks.disableSavedCompareSetupsRemoteSyncMock.mockReset();
    mocks.enableSavedCompareSetupsRemoteSyncMock.mockReset();
    mocks.initializeAccountSessionMock.mockReset();
    mocks.refreshAccountSessionMock.mockReset();
    mocks.useAccountSessionMock.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalSupabasePublishableKey;
  });

  it("refreshes the account session when Supabase reports a sign-in", async () => {
    render(
      <AccountSyncProvider>
        <div>child</div>
      </AccountSyncProvider>,
    );

    expect(mocks.initializeAccountSessionMock).toHaveBeenCalledOnce();
    expect(authStateChangeHandler).not.toBeNull();

    authStateChangeHandler?.("SIGNED_IN", {});

    await waitFor(() => {
      expect(mocks.refreshAccountSessionMock).toHaveBeenCalledOnce();
    });
  });

  it("enables progress sync for signed-in free accounts without turning on saved-study sync", async () => {
    mocks.useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-in",
      user: {
        id: "user-1",
        email: "student@example.com",
        displayName: "Lab Student",
        createdAt: "2026-04-01T00:00:00.000Z",
        lastSignedInAt: "2026-04-05T08:00:00.000Z",
      },
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
    });

    render(
      <AccountSyncProvider>
        <div>child</div>
      </AccountSyncProvider>,
    );

    await waitFor(() => {
      expect(mocks.enableRemoteSyncMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: "user-1" }),
      );
    });
    expect(mocks.enableSavedSetupsRemoteSyncMock).not.toHaveBeenCalled();
    expect(mocks.enableSavedCompareSetupsRemoteSyncMock).not.toHaveBeenCalled();
  });

  it("enables progress sync, saved-setup sync, and compare-sync for signed-in premium accounts", async () => {
    mocks.useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-in",
      user: {
        id: "user-1",
        email: "student@example.com",
        displayName: "Lab Student",
        createdAt: "2026-04-01T00:00:00.000Z",
        lastSignedInAt: "2026-04-05T08:00:00.000Z",
      },
      entitlement: resolveAccountEntitlement({
        tier: "premium",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
    });

    render(
      <AccountSyncProvider>
        <div>child</div>
      </AccountSyncProvider>,
    );

    await waitFor(() => {
      expect(mocks.enableRemoteSyncMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: "user-1" }),
      );
      expect(mocks.enableSavedSetupsRemoteSyncMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: "user-1" }),
      );
      expect(mocks.enableSavedCompareSetupsRemoteSyncMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: "user-1" }),
      );
    });
  });

  it("disables progress sync, saved-setup sync, and compare-sync for signed-out sessions", async () => {
    render(
      <AccountSyncProvider>
        <div>child</div>
      </AccountSyncProvider>,
    );

    await waitFor(() => {
      expect(mocks.disableRemoteSyncMock).toHaveBeenCalledOnce();
      expect(mocks.disableSavedSetupsRemoteSyncMock).toHaveBeenCalledOnce();
      expect(mocks.disableSavedCompareSetupsRemoteSyncMock).toHaveBeenCalledOnce();
    });
  });
});
