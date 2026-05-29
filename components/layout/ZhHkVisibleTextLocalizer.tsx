"use client";

import { useEffect } from "react";
import type { AppLocale } from "@/i18n/routing";
import { localizeZhHkVisibleText } from "@/lib/i18n/zh-hk-visible-text";

type ZhHkVisibleTextLocalizerProps = {
  locale: AppLocale;
};

const ignoredParentSelector = [
  "script",
  "style",
  "noscript",
  "template",
  "textarea",
  "input",
  "code",
  "pre",
  "[data-zh-hk-localizer-ignore]",
].join(",");

function localizeTextNode(node: Text) {
  const parent = node.parentElement;

  if (!parent || parent.closest(ignoredParentSelector)) {
    return;
  }

  const current = node.nodeValue;

  if (!current || !/[A-Za-z]/u.test(current)) {
    return;
  }

  const next = localizeZhHkVisibleText(current);

  if (next !== current) {
    node.nodeValue = next;
  }
}

function localizeVisibleText(root: ParentNode) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  while (walker.nextNode()) {
    localizeTextNode(walker.currentNode as Text);
  }
}

export function ZhHkVisibleTextLocalizer({ locale }: ZhHkVisibleTextLocalizerProps) {
  useEffect(() => {
    if (locale !== "zh-HK") {
      return;
    }

    localizeVisibleText(document.body);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          localizeTextNode(mutation.target as Text);
          continue;
        }

        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.TEXT_NODE) {
            localizeTextNode(node as Text);
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            localizeVisibleText(node as Element);
          }
        }
      }
    });

    observer.observe(document.body, {
      characterData: true,
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [locale]);

  return null;
}
