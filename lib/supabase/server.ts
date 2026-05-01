import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { NextResponse } from "next/server";
import {
  getSupabasePublishableKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "./env";

type ParsedCookie = {
  name: string;
  value: string;
};

type CreateSupabaseServerClientOptions = {
  cookieHeader?: string | null;
  response?: NextResponse;
};

function parseCookieHeader(cookieHeader: string | null | undefined): ParsedCookie[] {
  if (!cookieHeader) {
    return [];
  }

  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separatorIndex = part.indexOf("=");

      if (separatorIndex < 0) {
        return null;
      }

      return {
        name: decodeURIComponent(part.slice(0, separatorIndex)),
        value: decodeURIComponent(part.slice(separatorIndex + 1)),
      } satisfies ParsedCookie;
    })
    .filter((cookie): cookie is ParsedCookie => Boolean(cookie?.name));
}

function upsertCookie(
  cookies: ParsedCookie[],
  name: string,
  value: string,
) {
  const existingIndex = cookies.findIndex((cookie) => cookie.name === name);

  if (existingIndex >= 0) {
    cookies.splice(existingIndex, 1, { name, value });
    return;
  }

  cookies.push({ name, value });
}

export function createSupabaseServerClient(
  options: CreateSupabaseServerClientOptions = {},
) {
  const parsedCookies = parseCookieHeader(options.cookieHeader);

  return createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return parsedCookies;
        },
        setAll(cookiesToSet) {
          if (!options.response) {
            return;
          }

          for (const cookie of cookiesToSet) {
            upsertCookie(parsedCookies, cookie.name, cookie.value);
            options.response.cookies.set(cookie.name, cookie.value, cookie.options);
          }
        },
      },
    },
  );
}

export function createSupabaseServiceRoleClient() {
  return createClient(
    getSupabaseUrl(),
    getSupabaseServiceRoleKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
