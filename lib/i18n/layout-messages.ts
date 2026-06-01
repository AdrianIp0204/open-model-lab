import { IntlMessageFormat } from "intl-messageformat";
import type { AppLocale } from "@/i18n/routing";
import enMessages from "@/messages/en.json";
import zhHkMessages from "@/messages/zh-HK.json";

type MessageTree = Record<string, unknown>;

function isPlainMessageTree(value: unknown): value is MessageTree {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeMessageTrees(base: MessageTree, override: MessageTree): MessageTree {
  const merged: MessageTree = { ...base };

  for (const [key, value] of Object.entries(override)) {
    const baseValue = merged[key];

    if (isPlainMessageTree(baseValue) && isPlainMessageTree(value)) {
      merged[key] = mergeMessageTrees(baseValue, value);
      continue;
    }

    merged[key] = value;
  }

  return merged;
}

function getMessageValue(messages: MessageTree, path: string) {
  return path.split(".").reduce<unknown>((current, key) => {
    if (isPlainMessageTree(current) && key in current) {
      return current[key];
    }

    return undefined;
  }, messages);
}

const layoutMessagesByLocale: Record<AppLocale, MessageTree> = {
  en: (enMessages as MessageTree).Layout as MessageTree,
  "zh-HK": mergeMessageTrees(
    (enMessages as MessageTree).Layout as MessageTree,
    (zhHkMessages as MessageTree).Layout as MessageTree,
  ),
};

export function getLayoutMessageTemplate(locale: AppLocale, key: string) {
  const message = getMessageValue(layoutMessagesByLocale[locale], key);

  return typeof message === "string" ? message : null;
}

export function formatLayoutMessage(
  locale: AppLocale,
  key: string,
  values?: Record<string, unknown>,
) {
  const message = getLayoutMessageTemplate(locale, key);

  if (!message) {
    return key;
  }

  return new IntlMessageFormat(message, locale).format(values) as string;
}
