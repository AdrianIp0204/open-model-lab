"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useActiveSection } from "@/hooks/useActiveSection";
import { PageSectionNav } from "./PageSectionNav";
import { PageSectionNavMobile } from "./PageSectionNavMobile";
import {
  addPageSectionLocationChangeListener,
  getGroupedPageSectionNavItems,
  getPageSectionSidebarWidth,
  readPageSectionNavActiveGroupId,
  getRenderablePageSectionNavItems,
  resolvePageSectionNavActiveGroupId,
  readStoredPageSectionRailMode,
  writeStoredPageSectionRailMode,
  type PageSectionNavConfig,
  type PageSectionSidebarMode,
} from "./page-section-nav";

type PageSectionFrameProps = {
  children: ReactNode;
  sectionNav?: PageSectionNavConfig | null;
  className?: string;
  contentClassName?: string;
};

export function PageSectionFrame({
  children,
  sectionNav = null,
  className = "",
  contentClassName = "",
}: PageSectionFrameProps) {
  const items = useMemo(
    () => getRenderablePageSectionNavItems(sectionNav?.items ?? []),
    [sectionNav?.items],
  );
  const canRenderNavControls = Boolean(sectionNav) && items.length >= 2;
  const [desktopMode, setDesktopMode] = useState<PageSectionSidebarMode>(
    () => readStoredPageSectionRailMode() ?? "expanded",
  );
  const requestedActiveGroupId = useSyncExternalStore(
    (onStoreChange) => {
      if (!sectionNav?.activeGroupParam || typeof window === "undefined") {
        return () => undefined;
      }

      window.addEventListener("hashchange", onStoreChange);
      window.addEventListener("popstate", onStoreChange);
      const removeLocationChangeListener = addPageSectionLocationChangeListener(onStoreChange);

      return () => {
        window.removeEventListener("hashchange", onStoreChange);
        window.removeEventListener("popstate", onStoreChange);
        removeLocationChangeListener();
      };
    },
    () => readPageSectionNavActiveGroupId(sectionNav?.activeGroupParam),
    () => null,
  );
  const activeId = useActiveSection(
    canRenderNavControls ? items.map((item) => item.id) : [],
  );
  const groupedItems = useMemo(
    () =>
      getGroupedPageSectionNavItems({
        items,
        groups: sectionNav?.groups,
      }),
    [items, sectionNav?.groups],
  );
  const activeGroupId = useMemo(
    () =>
      resolvePageSectionNavActiveGroupId({
        activeId,
        groups: groupedItems.groups,
        requestedGroupId: requestedActiveGroupId,
      }),
    [activeId, groupedItems.groups, requestedActiveGroupId],
  );

  useEffect(() => {
    writeStoredPageSectionRailMode(desktopMode);
  }, [desktopMode]);

  if (!sectionNav) {
    return <>{children}</>;
  }

  const variant = sectionNav.variant ?? "default";
  const desktopBehavior = sectionNav.desktopBehavior ?? "rail";
  const showsDesktopRail = desktopBehavior === "rail" && canRenderNavControls;
  const bodyShellClassName = showsDesktopRail
    ? "lg:grid lg:min-w-0 lg:min-h-[calc(100svh-6rem)] lg:items-stretch lg:gap-0"
    : "min-w-0";
  const sidebarColumnClassName = "hidden min-w-0 self-stretch lg:block";
  const sidebarSurfaceClassName =
    variant === "compact"
      ? [
          "h-full min-h-full border-r border-line/80 bg-[linear-gradient(180deg,rgba(251,248,241,0.985)_0%,rgba(246,241,232,0.97)_100%)] shadow-[inset_-1px_0_0_rgba(117,96,72,0.08)]",
          desktopMode === "collapsed" ? "lg:px-2 lg:py-4" : "lg:px-3 lg:py-5 xl:px-4",
        ].join(" ")
      : [
          "h-full min-h-full border-r border-line/80 bg-[linear-gradient(180deg,rgba(251,248,241,0.985)_0%,rgba(246,241,232,0.97)_100%)] shadow-[inset_-1px_0_0_rgba(117,96,72,0.08)]",
          desktopMode === "collapsed" ? "lg:px-2.5 lg:py-4" : "lg:px-4 lg:py-5 xl:px-5",
        ].join(" ");
  const contentContainerClassName =
    showsDesktopRail
      ? variant === "compact"
        ? "min-w-0 w-full px-4 pb-6 pt-4 sm:px-6 sm:pt-5 lg:px-6 lg:pb-10 lg:pt-8 xl:px-8 xl:pt-10 2xl:px-10"
        : "min-w-0 w-full px-4 pb-6 pt-4 sm:px-6 sm:pt-5 lg:px-8 lg:pb-10 lg:pt-8 xl:px-10 xl:pt-10 2xl:px-12"
      : variant === "compact"
        ? "mx-auto min-w-0 w-full max-w-[84rem] px-4 pb-6 pt-4 sm:px-6 sm:pt-5 lg:px-8 lg:pb-10 lg:pt-8 xl:px-10 xl:pt-10"
        : "mx-auto min-w-0 w-full max-w-[88rem] px-4 pb-6 pt-4 sm:px-6 sm:pt-5 lg:px-8 lg:pb-10 lg:pt-8 xl:px-10 xl:pt-10";
  const desktopLayoutStyle = showsDesktopRail
    ? ({
        gridTemplateColumns: `${getPageSectionSidebarWidth(variant, desktopMode)} minmax(0, 1fr)`,
      } satisfies CSSProperties)
    : undefined;
  const normalizedConfig = {
    ...sectionNav,
    items,
  };

  return (
    <div
      data-route-shell=""
      data-page-body-shell=""
      data-page-section-frame=""
      data-sidebar-state={desktopMode}
      data-sidebar-variant={variant}
      className={["min-w-0", className].join(" ").trim()}
    >
      {canRenderNavControls ? (
        <PageSectionNavMobile
          config={normalizedConfig}
          activeId={activeId}
          activeGroupId={activeGroupId}
        />
      ) : null}

      <div
        data-page-body-layout=""
        data-page-section-layout=""
        className={bodyShellClassName}
        style={desktopLayoutStyle}
      >
        {showsDesktopRail ? (
          <aside
            data-page-sidebar-column=""
            data-page-section-sidebar-column=""
            className={sidebarColumnClassName}
          >
            <div
              data-page-sidebar-surface=""
              data-sidebar-state={desktopMode}
              className={sidebarSurfaceClassName}
            >
              <PageSectionNav
                config={normalizedConfig}
                activeId={activeId}
                activeGroupId={activeGroupId}
                mode={desktopMode}
                onModeChange={setDesktopMode}
              />
            </div>
          </aside>
        ) : null}
        <main
          data-page-main=""
          data-page-section-content=""
          className="min-w-0"
        >
          <div
            data-page-content-container=""
            className={[contentContainerClassName, contentClassName].join(" ").trim()}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
