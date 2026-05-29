"use client";

import { useLocale } from "next-intl";
import { getSimulationCopy, type SimulationCopyKey } from "@/lib/i18n/copy-text";

type SimulationCopyTextProps = {
  copyKey: SimulationCopyKey;
};

export function SimulationCopyText({ copyKey }: SimulationCopyTextProps) {
  const locale = useLocale();

  return <>{getSimulationCopy(locale, copyKey)}</>;
}
