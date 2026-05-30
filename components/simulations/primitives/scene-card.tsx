"use client";

import type { ReactNode } from "react";
import { useLocale } from "next-intl";
import { getSimulationCopy, type SimulationCopyKey } from "@/lib/i18n/copy-text";
import {
  localizeExactZhHkRuntimeCopy,
  localizeExactZhHkRuntimeNode,
} from "@/lib/i18n/zh-hk-exact-runtime-copy";

type SimulationSceneCardProps = {
  title: string;
  titleKey?: SimulationCopyKey;
  description: ReactNode;
  headerClassName: string;
  headerAside?: ReactNode;
  compactHeaderOnMobile?: boolean;
  children: ReactNode;
};

export function SimulationSceneCard({
  title,
  titleKey,
  description,
  headerClassName,
  headerAside,
  compactHeaderOnMobile = false,
  children,
}: SimulationSceneCardProps) {
  const locale = useLocale();
  const localizedTitle = titleKey
    ? getSimulationCopy(locale, titleKey)
    : localizeExactZhHkRuntimeCopy(locale, title);
  const localizedDescription = localizeExactZhHkRuntimeNode(locale, description);
  const localizedHeaderAside = localizeExactZhHkRuntimeNode(locale, headerAside);
  const localizedChildren = localizeExactZhHkRuntimeNode(locale, children);

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className={["border-b border-line px-3 py-2", headerClassName].join(" ")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{localizedTitle}</p>
            <p className={["mt-1 text-xs text-ink-700", compactHeaderOnMobile ? "max-sm:hidden" : ""].join(" ")}>
              {localizedDescription}
            </p>
          </div>
          {localizedHeaderAside ? (
            <div className="flex flex-wrap items-center gap-3">{localizedHeaderAside}</div>
          ) : null}
        </div>
      </div>
      {localizedChildren}
    </section>
  );
}
