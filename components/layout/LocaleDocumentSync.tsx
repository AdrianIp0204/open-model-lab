"use client";

import { useLayoutEffect } from "react";

export function LocaleDocumentSync({ locale }: { locale: string }) {
  useLayoutEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
