"use client";

import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { addPageSectionLocationChangeListener } from "@/components/layout/page-section-nav";

type UseActiveSectionOptions = {
  offsetPx?: number;
};

const DEFAULT_OFFSET_PX = 120;
const ACTIVATION_TOLERANCE_PX = 64;
const MIN_VISIBLE_HEIGHT_PX = 40;

export function useActiveSection(
  ids: string[],
  options: UseActiveSectionOptions = {},
) {
  const stableIds = useMemo(
    () =>
      Array.from(
        new Set(ids.map((id) => id.trim()).filter(Boolean)),
      ),
    [ids],
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const offsetPx = options.offsetPx ?? DEFAULT_OFFSET_PX;
  const resolvedActiveId =
    activeId && stableIds.includes(activeId) ? activeId : (stableIds[0] ?? null);

  const updateActiveSection = useEffectEvent(() => {
    if (
      !stableIds.length ||
      typeof document === "undefined" ||
      typeof window === "undefined"
    ) {
      setActiveId(null);
      return;
    }

    const sections = stableIds
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => section instanceof HTMLElement);

    if (!sections.length) {
      setActiveId(null);
      return;
    }

    const activationLine = offsetPx + ACTIVATION_TOLERANCE_PX;
    const visibleFloor = Math.min(offsetPx * 0.35, MIN_VISIBLE_HEIGHT_PX);
    let nextActiveId = sections[0].id;

    for (const section of sections) {
      const rect = section.getBoundingClientRect();

      if (rect.top <= activationLine && rect.bottom > visibleFloor) {
        nextActiveId = section.id;
        continue;
      }

      if (rect.top > activationLine) {
        break;
      }
    }

    const hashId = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    if (hashId && stableIds.includes(hashId)) {
      const hashedSection = sections.find((section) => section.id === hashId);

      if (hashedSection) {
        const rect = hashedSection.getBoundingClientRect();

        if (rect.top <= window.innerHeight * 0.7 && rect.bottom > 0) {
          nextActiveId = hashId;
        }
      }
    }

    setActiveId((current) => (current === nextActiveId ? current : nextActiveId));
  });

  useEffect(() => {
    if (!stableIds.length || typeof window === "undefined") {
      return undefined;
    }

    let frameId = 0;

    const requestUpdate = () => {
      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        updateActiveSection();
      });
    };

    const handleHashChange = () => {
      const nextHash = decodeURIComponent(window.location.hash.replace(/^#/, ""));

      if (nextHash && stableIds.includes(nextHash)) {
        setActiveId(nextHash);
      }

      requestUpdate();
    };

    requestUpdate();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("popstate", requestUpdate);
    const removeLocationChangeListener = addPageSectionLocationChangeListener(requestUpdate);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("popstate", requestUpdate);
      removeLocationChangeListener();
    };
  }, [stableIds]);

  return resolvedActiveId;
}
