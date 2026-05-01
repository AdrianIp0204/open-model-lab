"use client";

import { useSyncExternalStore } from "react";
import type { AccountBillingSummary } from "@/lib/billing/model";
import { getAnonymousAccountEntitlement, type ResolvedAccountEntitlement } from "./entitlements";
import type {
  AccountAuthMode,
  AccountSessionResponse,
  AccountSessionWarnings,
  AccountUserSummary,
} from "./model";

type AccountPendingAction =
  | "magic-link"
  | "password-sign-in"
  | "password-reset"
  | "password-update"
  | "logout"
  | null;

type AccountActionSuccessPayload = {
  ok?: boolean;
  message?: string;
};

type AccountActionFailurePayload = {
  code?: string;
  error?: string;
};

type AccountSessionState = {
  initialized: boolean;
  status: "signed-out" | "signed-in";
  user: AccountUserSummary | null;
  entitlement: ResolvedAccountEntitlement;
  billing: AccountBillingSummary | null;
  warnings: AccountSessionWarnings | null;
  authMode: AccountAuthMode;
  pendingAction: AccountPendingAction;
  errorCode: string | null;
  errorMessage: string | null;
  noticeMessage: string | null;
  magicLinkCooldownExpiresAt: number | null;
};

export const ACCOUNT_MAGIC_LINK_COOLDOWN_MS = 5 * 60 * 1000;
export const ACCOUNT_MAGIC_LINK_COOLDOWN_STORAGE_KEY =
  "open-model-lab.account.magic-link-cooldown.v1";

const defaultState: AccountSessionState = {
  initialized: false,
  status: "signed-out",
  user: null,
  entitlement: getAnonymousAccountEntitlement(),
  billing: null,
  warnings: null,
  authMode: "supabase",
  pendingAction: null,
  errorCode: null,
  errorMessage: null,
  noticeMessage: null,
  magicLinkCooldownExpiresAt: null,
};

function isBrowserEnvironment() {
  return typeof window !== "undefined";
}

function readMagicLinkCooldownExpiresAt() {
  if (!isBrowserEnvironment()) {
    return null;
  }

  const storedValue = window.localStorage.getItem(ACCOUNT_MAGIC_LINK_COOLDOWN_STORAGE_KEY);

  if (!storedValue) {
    return null;
  }

  const parsedValue = Number.parseInt(storedValue, 10);

  if (!Number.isFinite(parsedValue) || parsedValue <= Date.now()) {
    window.localStorage.removeItem(ACCOUNT_MAGIC_LINK_COOLDOWN_STORAGE_KEY);
    return null;
  }

  return parsedValue;
}

function persistMagicLinkCooldown(expiresAt: number | null) {
  if (!isBrowserEnvironment()) {
    return;
  }

  if (!expiresAt || expiresAt <= Date.now()) {
    window.localStorage.removeItem(ACCOUNT_MAGIC_LINK_COOLDOWN_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(
    ACCOUNT_MAGIC_LINK_COOLDOWN_STORAGE_KEY,
    String(expiresAt),
  );
}

function readActionErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "Account request failed.";
  }

  const error = (payload as AccountActionFailurePayload).error;
  return typeof error === "string" && error ? error : "Account request failed.";
}

function readActionErrorCode(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const code = (payload as AccountActionFailurePayload).code;
  return typeof code === "string" && code ? code : null;
}

function readActionNoticeMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const message = (payload as AccountActionSuccessPayload).message;
  return typeof message === "string" && message ? message : fallback;
}

class AccountSessionStore {
  private snapshot: AccountSessionState = defaultState;
  private listeners = new Set<() => void>();
  private initializeRequested = false;

  private emit() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private setSnapshot(nextSnapshot: AccountSessionState) {
    this.snapshot = nextSnapshot;
    this.emit();
  }

  private getMagicLinkCooldownExpiresAt() {
    return readMagicLinkCooldownExpiresAt();
  }

  private buildSnapshotFromPayload(
    payload: AccountSessionResponse,
    overrides: Partial<AccountSessionState> = {},
  ): AccountSessionState {
    return {
      initialized: true,
      status: payload.session?.user ? "signed-in" : "signed-out",
      user: payload.session?.user ?? null,
      entitlement: payload.entitlement ?? getAnonymousAccountEntitlement(),
      billing: payload.session?.billing ?? null,
      warnings: payload.session?.warnings ?? null,
      authMode: payload.authMode ?? "supabase",
      pendingAction: null,
      errorCode: null,
      errorMessage: null,
      noticeMessage: null,
      magicLinkCooldownExpiresAt: this.getMagicLinkCooldownExpiresAt(),
      ...overrides,
    };
  }

  private buildSignedOutSnapshot(
    overrides: Partial<AccountSessionState> = {},
  ): AccountSessionState {
    return {
      initialized: true,
      status: "signed-out",
      user: null,
      entitlement: getAnonymousAccountEntitlement(),
      billing: null,
      warnings: null,
      authMode: this.snapshot.authMode,
      pendingAction: null,
      errorCode: null,
      errorMessage: null,
      noticeMessage: null,
      magicLinkCooldownExpiresAt: this.getMagicLinkCooldownExpiresAt(),
      ...overrides,
    };
  }

  private setPendingAction(action: AccountPendingAction) {
    this.setSnapshot({
      ...this.snapshot,
      initialized: true,
      pendingAction: action,
      errorCode: null,
      errorMessage: null,
      noticeMessage: null,
      magicLinkCooldownExpiresAt: this.getMagicLinkCooldownExpiresAt(),
    });
  }

  private setCurrentSnapshotMessages(input: {
    errorCode: string | null;
    errorMessage: string | null;
    noticeMessage: string | null;
  }) {
    this.setSnapshot({
      ...this.snapshot,
      initialized: true,
      pendingAction: null,
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
      noticeMessage: input.noticeMessage,
      magicLinkCooldownExpiresAt: this.getMagicLinkCooldownExpiresAt(),
    });
  }

  private async postSessionAction(body: Record<string, unknown>) {
    const response = await fetch("/api/account/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as
      | AccountActionSuccessPayload
      | AccountActionFailurePayload;

    return {
      response,
      payload,
    };
  }

  getSnapshot = () => this.snapshot;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  };

  async initialize() {
    if (this.initializeRequested) {
      return;
    }

    this.initializeRequested = true;
    await this.refresh();
  }

  async refresh() {
    try {
      const response = await fetch("/api/account/session", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("session_load_failed");
      }

      const payload = (await response.json()) as AccountSessionResponse;

      this.setSnapshot(this.buildSnapshotFromPayload(payload));
    } catch {
      this.setSnapshot({
        ...this.snapshot,
        initialized: true,
        status: this.snapshot.user ? "signed-in" : "signed-out",
        entitlement: this.snapshot.user
          ? this.snapshot.entitlement
          : getAnonymousAccountEntitlement(),
        billing: this.snapshot.user ? this.snapshot.billing : null,
        warnings: this.snapshot.user ? this.snapshot.warnings : null,
        authMode: this.snapshot.authMode,
        pendingAction: null,
        errorCode: "account_session_failed",
        errorMessage: "Account session could not be loaded.",
        noticeMessage: null,
        magicLinkCooldownExpiresAt: this.getMagicLinkCooldownExpiresAt(),
      });
    }
  }

  async signInWithPassword(email: string, password: string, nextPath?: string | null) {
    this.setPendingAction("password-sign-in");

    const { response, payload } = await this.postSessionAction({
      action: "password-sign-in",
      email,
      password,
      ...(nextPath
        ? {
            next: nextPath,
          }
        : {}),
    });

    if (!response.ok || !("ok" in payload) || payload.ok !== true) {
      this.setSnapshot(
        this.buildSignedOutSnapshot({
          errorCode: readActionErrorCode(payload),
          errorMessage: readActionErrorMessage(payload),
        }),
      );

      return {
        ok: false as const,
      };
    }

    await this.refresh();

    return {
      ok: true as const,
    };
  }

  async requestMagicLink(email: string, nextPath?: string | null) {
    this.setPendingAction("magic-link");

    const { response, payload } = await this.postSessionAction({
      action: "magic-link",
      email,
      ...(nextPath
        ? {
            next: nextPath,
          }
        : {}),
    });

    if (!response.ok || !("ok" in payload) || payload.ok !== true) {
      const errorCode = readActionErrorCode(payload);
      const errorMessage = readActionErrorMessage(payload);

      this.setSnapshot(
        this.buildSignedOutSnapshot({
          errorCode,
          errorMessage,
        }),
      );

      return {
        ok: false as const,
        code: errorCode,
        message: errorMessage,
      };
    }

    const noticeMessage = readActionNoticeMessage(
      payload,
      "Check your email for a sign-in link.",
    );
    const magicLinkCooldownExpiresAt = Date.now() + ACCOUNT_MAGIC_LINK_COOLDOWN_MS;
    persistMagicLinkCooldown(magicLinkCooldownExpiresAt);

    this.setSnapshot(
      this.buildSignedOutSnapshot({
        noticeMessage,
        magicLinkCooldownExpiresAt,
      }),
    );

    return {
      ok: true as const,
      message: noticeMessage,
    };
  }

  async requestPasswordReset(email: string, nextPath?: string | null) {
    this.setPendingAction("password-reset");

    const { response, payload } = await this.postSessionAction({
      action: "password-reset",
      email,
      ...(nextPath
        ? {
            next: nextPath,
          }
        : {}),
    });

    if (!response.ok || !("ok" in payload) || payload.ok !== true) {
      const errorCode = readActionErrorCode(payload);
      const errorMessage = readActionErrorMessage(payload);

      if (this.snapshot.status === "signed-in" && this.snapshot.user) {
        this.setCurrentSnapshotMessages({
          errorCode,
          errorMessage,
          noticeMessage: null,
        });
      } else {
        this.setSnapshot(
          this.buildSignedOutSnapshot({
            errorCode,
            errorMessage,
          }),
        );
      }

      return {
        ok: false as const,
        code: errorCode,
        message: errorMessage,
      };
    }

    const noticeMessage = readActionNoticeMessage(
      payload,
      "If that email matches an existing account, a password-reset email has been sent. Check your inbox and spam for the link.",
    );

    if (this.snapshot.status === "signed-in" && this.snapshot.user) {
      this.setCurrentSnapshotMessages({
        errorCode: null,
        errorMessage: null,
        noticeMessage,
      });
    } else {
      this.setSnapshot(
        this.buildSignedOutSnapshot({
          noticeMessage,
        }),
      );
    }

    return {
      ok: true as const,
      message: noticeMessage,
    };
  }

  async updatePassword(password: string) {
    this.setPendingAction("password-update");

    const response = await fetch("/api/account/password", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        password,
      }),
    });
    const payload = (await response.json()) as
      | AccountActionSuccessPayload
      | AccountActionFailurePayload;

    if (!response.ok || !("ok" in payload) || payload.ok !== true) {
      this.setCurrentSnapshotMessages({
        errorCode: readActionErrorCode(payload),
        errorMessage: readActionErrorMessage(payload),
        noticeMessage: null,
      });

      return {
        ok: false as const,
      };
    }

    this.setCurrentSnapshotMessages({
      errorCode: null,
      errorMessage: null,
      noticeMessage: readActionNoticeMessage(
        payload,
        "Password updated. You can use it the next time you sign in on this site.",
      ),
    });

    return {
      ok: true as const,
    };
  }

  async logout() {
    this.setPendingAction("logout");

    try {
      await fetch("/api/account/session", {
        method: "DELETE",
      });
    } finally {
      this.setSnapshot(this.buildSignedOutSnapshot());
    }
  }

  resetForTests() {
    this.snapshot = defaultState;
    this.initializeRequested = false;
    this.listeners.clear();
  }
}

const accountSessionStore = new AccountSessionStore();

export function initializeAccountSession() {
  void accountSessionStore.initialize();
}

export function useAccountSession() {
  return useSyncExternalStore(
    accountSessionStore.subscribe,
    accountSessionStore.getSnapshot,
    () => defaultState,
  );
}

export function signInWithPassword(
  email: string,
  password: string,
  nextPath?: string | null,
) {
  return accountSessionStore.signInWithPassword(email, password, nextPath);
}

export function requestMagicLink(email: string, nextPath?: string | null) {
  return accountSessionStore.requestMagicLink(email, nextPath);
}

export function requestPasswordReset(email: string, nextPath?: string | null) {
  return accountSessionStore.requestPasswordReset(email, nextPath);
}

export function updateAccountPassword(password: string) {
  return accountSessionStore.updatePassword(password);
}

export function signOutAccount() {
  return accountSessionStore.logout();
}

export function refreshAccountSession() {
  return accountSessionStore.refresh();
}

export function resetAccountSessionForTests() {
  accountSessionStore.resetForTests();
}
