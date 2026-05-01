"use client";

import { useTranslations } from "next-intl";
import type { ShareLinkTarget } from "@/lib/share-links";
import { ShareLinkButton } from "./ShareLinkButton";

type ShareLinksPanelProps = {
  items: ShareLinkTarget[];
  pageTitle: string;
  title?: string;
  description?: string;
  variant?: "default" | "compact";
  className?: string;
};

export function ShareLinksPanel({
  items,
  pageTitle,
  title,
  description,
  variant = "default",
  className,
}: ShareLinksPanelProps) {
  const t = useTranslations("ShareLinksPanel");

  if (!items.length) {
    return null;
  }

  const resolvedTitle = title ?? t("title");
  const resolvedDescription = description ?? t("description");
  const [primaryItem, ...secondaryItems] = items;
  const compact = variant === "compact";

  return (
    <section
      className={[
        compact ? "rounded-[20px] border border-line bg-paper-strong/90 p-4" : "lab-panel p-4 sm:p-5",
        className ?? "",
      ].join(" ")}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="lab-label">{resolvedTitle}</p>
          <p className={compact ? "max-w-2xl text-sm leading-5 text-ink-700" : "max-w-2xl text-sm leading-6 text-ink-700"}>
            {resolvedDescription}
          </p>
        </div>
        <ShareLinkButton
          href={primaryItem.href}
          label={primaryItem.buttonLabel ?? t("actions.copyPageLink")}
          shareLabel={primaryItem.shareLabel ?? t("actions.sharePage")}
          shareTitle={primaryItem.shareTitle ?? pageTitle}
          preferWebShare={primaryItem.preferWebShare ?? true}
          copiedText={primaryItem.copiedText ?? t("status.copiedPageLink")}
          sharedText={primaryItem.sharedText ?? t("status.sharedPage")}
          ariaLabel={primaryItem.ariaLabel ?? t("aria.copyPageLink")}
          className={
            compact
              ? "inline-flex items-center justify-center rounded-full border border-line bg-paper px-3.5 py-2 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
              : "inline-flex items-center justify-center rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
          }
        />
      </div>

      {secondaryItems.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {secondaryItems.map((item) => (
            <ShareLinkButton
              key={item.id}
              href={item.href}
              label={item.label}
              copiedText={t("status.copied")}
              ariaLabel={item.ariaLabel ?? t("aria.copyNamedLink", { label: item.label })}
              className={
                compact
                  ? "inline-flex items-center justify-center rounded-full border border-line bg-paper-strong px-3 py-1.5 text-xs font-semibold text-ink-700 transition hover:border-teal-500/35 hover:bg-white/90"
                  : "inline-flex items-center justify-center rounded-full border border-line bg-paper-strong px-3 py-1.5 text-sm font-semibold text-ink-700 transition hover:border-teal-500/35 hover:bg-white/90"
              }
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
