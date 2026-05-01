"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type ShareLinkButtonProps = {
  href: string;
  label: string;
  shareLabel?: string;
  shareTitle?: string;
  preferWebShare?: boolean;
  copiedText?: string;
  sharedText?: string;
  className?: string;
  ariaLabel?: string;
};

type ButtonStatus = "idle" | "copied" | "shared";

async function copyTextToClipboard(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.append(textarea);

  const selection = document.getSelection();
  const existingRange =
    selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (selection) {
    selection.removeAllRanges();
    if (existingRange) {
      selection.addRange(existingRange);
    }
  }

  if (!copied) {
    throw new Error("Clipboard is unavailable.");
  }
}

function isAbortError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}

export function ShareLinkButton({
  href,
  label,
  shareLabel,
  shareTitle,
  preferWebShare = false,
  copiedText = "Copied",
  sharedText = "Shared",
  className,
  ariaLabel,
}: ShareLinkButtonProps) {
  const [status, setStatus] = useState<ButtonStatus>("idle");
  const canUseWebShare = useSyncExternalStore(
    () => () => {},
    () =>
      preferWebShare &&
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function",
    () => false,
  );

  useEffect(() => {
    if (status === "idle") {
      return;
    }

    const timeoutId = window.setTimeout(() => setStatus("idle"), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [status]);

  async function handleClick() {
    const absoluteHref = new URL(href, window.location.origin).toString();

    if (canUseWebShare) {
      try {
        await navigator.share({
          title: shareTitle,
          url: absoluteHref,
        });
        setStatus("shared");
        return;
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
      }
    }

    await copyTextToClipboard(absoluteHref);
    setStatus("copied");
  }

  const idleLabel = canUseWebShare && shareLabel ? shareLabel : label;
  const buttonLabel =
    status === "shared"
      ? sharedText
      : status === "copied"
        ? copiedText
        : idleLabel;

  return (
    <button
      type="button"
      onClick={() => {
        void handleClick().catch(() => {
          setStatus("idle");
        });
      }}
      className={className}
      aria-label={ariaLabel}
    >
      {buttonLabel}
    </button>
  );
}
