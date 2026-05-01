"use client";

import { useCallback, useEffect, useState } from "react";
import { getPathLocale } from "@/i18n/routing";
import { useAccountSession } from "@/lib/account/client";
import type {
  AccountAchievementEvent,
  AccountAchievementEventResponse,
  AccountAchievementOverview,
} from "./types";

type AccountAchievementState = {
  initialized: boolean;
  loading: boolean;
  overview: AccountAchievementOverview | null;
  errorMessage: string | null;
};

type AchievementErrorPayload = {
  code?: string;
  error?: string;
};

const defaultState: AccountAchievementState = {
  initialized: false,
  loading: false,
  overview: null,
  errorMessage: null,
};

function buildAchievementRequestHeaders(
  baseHeaders?: Record<string, string>,
) {
  const headers = new Headers(baseHeaders);

  if (typeof window !== "undefined") {
    const routeLocale = getPathLocale(window.location.pathname);

    if (routeLocale) {
      headers.set("x-open-model-lab-locale", routeLocale);
    }
  }

  return headers;
}

export class AccountAchievementRequestError extends Error {
  code: string | null;
  eventType: AccountAchievementEvent["type"] | null;
  status: number;

  constructor(input: {
    message: string;
    code?: string | null;
    eventType?: AccountAchievementEvent["type"] | null;
    status: number;
  }) {
    super(input.message);
    this.name = "AccountAchievementRequestError";
    this.code = input.code ?? null;
    this.eventType = input.eventType ?? null;
    this.status = input.status;
  }
}

function readAchievementErrorMessage(
  payload: AchievementErrorPayload | null,
  fallback: string,
) {
  return payload?.error?.trim() || fallback;
}

function toAchievementRequestError(input: {
  payload: AchievementErrorPayload | null;
  fallbackMessage: string;
  eventType?: AccountAchievementEvent["type"] | null;
  status: number;
}) {
  return new AccountAchievementRequestError({
    message: readAchievementErrorMessage(input.payload, input.fallbackMessage),
    code: input.payload?.code ?? null,
    eventType: input.eventType ?? null,
    status: input.status,
  });
}

export function describeAccountAchievementRequestError(error: unknown) {
  if (error instanceof AccountAchievementRequestError) {
    return {
      message: error.message,
      code: error.code,
      eventType: error.eventType,
      status: error.status,
    };
  }

  return {
    message: error instanceof Error ? error.message : null,
    code: null,
    eventType: null,
    status: null,
  };
}

export async function fetchAccountAchievementOverview() {
  const response = await fetch("/api/account/achievements", {
    cache: "no-store",
    headers: buildAchievementRequestHeaders(),
  });
  const payload = (await response.json().catch(() => null)) as
    | {
        overview?: AccountAchievementOverview;
        code?: string;
        error?: string;
      }
    | null;

  if (!response.ok || !payload?.overview) {
    throw toAchievementRequestError({
      payload,
      fallbackMessage: "Account achievements could not be loaded.",
      status: response.status,
    });
  }

  return payload.overview;
}

export async function submitAccountAchievementEvent(event: AccountAchievementEvent) {
  return sendAccountAchievementEvent(event);
}

export async function sendAccountAchievementEvent(
  event: AccountAchievementEvent,
  options: {
    keepalive?: boolean;
  } = {},
) {
  const response = await fetch("/api/account/achievements", {
    method: "POST",
    headers: buildAchievementRequestHeaders({
      "content-type": "application/json",
    }),
    body: JSON.stringify(event),
    cache: "no-store",
    keepalive: options.keepalive ?? false,
  });
  const payload = (await response.json().catch(() => null)) as
    | AccountAchievementEventResponse
    | AchievementErrorPayload
    | null;

  if (!response.ok || !payload || !("ok" in payload) || payload.ok !== true) {
    throw toAchievementRequestError({
      payload: payload && "ok" in payload ? null : payload,
      fallbackMessage: "Achievement event failed.",
      eventType: event.type,
      status: response.status,
    });
  }

  return payload;
}

export function sendAccountAchievementEventBeacon(event: AccountAchievementEvent) {
  if (typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function") {
    return false;
  }

  try {
    return navigator.sendBeacon(
      "/api/account/achievements",
      new Blob([JSON.stringify(event)], { type: "application/json" }),
    );
  } catch {
    return false;
  }
}

export function useAccountAchievementOverview(options: { enabled?: boolean } = {}) {
  const session = useAccountSession();
  const [state, setState] = useState<AccountAchievementState>(defaultState);
  const enabled = options.enabled ?? true;
  const sessionReady = session.initialized;
  const signedIn = sessionReady && session.status === "signed-in" && Boolean(session.user);
  const shouldLoad = enabled && signedIn;

  const refresh = useCallback(async () => {
    if (!shouldLoad) {
      return null;
    }

    setState((current) => ({
      ...current,
      loading: true,
      errorMessage: null,
    }));

    try {
      const overview = await fetchAccountAchievementOverview();

      setState({
        initialized: true,
        loading: false,
        overview,
        errorMessage: null,
      });

      return overview;
    } catch (error) {
      setState({
        initialized: true,
        loading: false,
        overview: null,
        errorMessage:
        error instanceof Error ? error.message : "Account achievements could not be loaded.",
      });
      return null;
    }
  }, [shouldLoad]);

  useEffect(() => {
    if (!shouldLoad) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const overview = await fetchAccountAchievementOverview();

        if (!cancelled) {
          setState({
            initialized: true,
            loading: false,
            overview,
            errorMessage: null,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            initialized: true,
            loading: false,
            overview: null,
            errorMessage:
              error instanceof Error
                ? error.message
                : "Account achievements could not be loaded.",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [shouldLoad]);

  if (enabled && !sessionReady) {
    return {
      initialized: false,
      loading: true,
      overview: null,
      errorMessage: null,
      refresh,
    };
  }

  if (!shouldLoad) {
    return {
      initialized: true,
      loading: false,
      overview: null,
      errorMessage: null,
      refresh,
    };
  }

  return {
    ...state,
    refresh,
  };
}
