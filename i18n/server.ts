import { IntlMessageFormat } from "intl-messageformat";
import { cookies, headers } from "next/headers";
import { getLocale } from "next-intl/server";
import type { AppLocale } from "./routing";
import { isAppLocale, localeCookieName } from "./routing";
import { loadMessages, resolveRequestLocale } from "./request";

type MessageTree = Record<string, unknown>;

function getMessageValue(messages: MessageTree, path: string) {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object" && key in current) {
      return (current as MessageTree)[key];
    }

    return undefined;
  }, messages);
}

export async function getLocaleMessages(locale: AppLocale) {
  return (await loadMessages(locale)) as MessageTree;
}

async function getRootLocaleParam(): Promise<AppLocale | null> {
  try {
    const rootParamsModule = (await import(
      "next/dist/server/request/root-params"
    )) as {
      getRootParam?: (paramName: string) => Promise<string | null | undefined>;
    };

    if (typeof rootParamsModule.getRootParam !== "function") {
      return null;
    }

    const rootLocale = (await rootParamsModule.getRootParam("locale")) ?? null;
    return isAppLocale(rootLocale) ? rootLocale : null;
  } catch {
    return null;
  }
}

export async function resolveServerLocaleFallback(): Promise<AppLocale> {
  const rootLocale = await getRootLocaleParam();

  if (rootLocale) {
    return rootLocale;
  }

  const requestLocale = await getLocale().catch(() => null);

  if (isAppLocale(requestLocale)) {
    return requestLocale;
  }

  try {
    const cookieStore = await cookies();
    const headerStore = await headers();

    return resolveRequestLocale({
      requestLocale,
      localeCookie: cookieStore.get(localeCookieName)?.value ?? null,
      acceptLanguage: headerStore.get("accept-language"),
    });
  } catch {
    return resolveRequestLocale({
      requestLocale,
    });
  }
}

export async function getScopedTranslator(locale: AppLocale, namespace?: string) {
  const messages = await getLocaleMessages(locale);

  return (key: string, values?: Record<string, unknown>) => {
    const path = namespace ? `${namespace}.${key}` : key;
    const message = getMessageValue(messages, path);

    if (typeof message !== "string") {
      return path;
    }

    return new IntlMessageFormat(message, locale).format(values) as string;
  };
}
