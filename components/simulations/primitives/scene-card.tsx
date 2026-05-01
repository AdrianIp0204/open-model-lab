"use client";

import type { ReactNode } from "react";
import { useLocale } from "next-intl";
import { localizeKnownSimulationText } from "@/lib/i18n/copy-text";

type SimulationSceneCardProps = {
  title: string;
  description: ReactNode;
  headerClassName: string;
  headerAside?: ReactNode;
  children: ReactNode;
};

export function SimulationSceneCard({
  title,
  description,
  headerClassName,
  headerAside,
  children,
}: SimulationSceneCardProps) {
  const locale = useLocale();
  const localizedTitle = localizeKnownSimulationText(locale, title);

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-paper-strong">
      <div className={["border-b border-line px-3 py-2", headerClassName].join(" ")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{localizedTitle}</p>
            <p className="mt-1 text-xs text-ink-700">{description}</p>
          </div>
          {headerAside ? <div className="flex flex-wrap items-center gap-3">{headerAside}</div> : null}
        </div>
      </div>
      {children}
    </section>
  );
}
