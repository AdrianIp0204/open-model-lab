"use client";

import { useTranslations } from "next-intl";
import { useId, useMemo, type MouseEvent } from "react";
import {
  dispatchPageSectionNavigationIntent,
  getGroupedPageSectionNavItems,
  getPageSectionRailBadgeLabel,
  replacePageSectionLocationHash,
  scrollToPageSection,
  type PageSectionNavConfig,
  type PageSectionSidebarMode,
} from "./page-section-nav";

type PageSectionNavProps = {
  config: PageSectionNavConfig;
  activeId: string | null;
  activeGroupId: string | null;
  mode: PageSectionSidebarMode;
  onModeChange: (mode: PageSectionSidebarMode) => void;
};

function handleNavigate(event: MouseEvent<HTMLAnchorElement>, id: string) {
  event.preventDefault();
  dispatchPageSectionNavigationIntent(id);

  if (!scrollToPageSection(id)) {
    replacePageSectionLocationHash(id);
  }
}

function handleGroupNavigate(event: MouseEvent<HTMLAnchorElement>, id: string) {
  event.preventDefault();
  dispatchPageSectionNavigationIntent(id);

  if (!scrollToPageSection(id)) {
    replacePageSectionLocationHash(id);
  }
}

export function PageSectionNav({
  config,
  activeId,
  activeGroupId,
  mode,
  onModeChange,
}: PageSectionNavProps) {
  const t = useTranslations("PageSectionNav");
  const panelId = useId();
  const isExpanded = mode === "expanded";
  const groupedItems = useMemo(
    () =>
      getGroupedPageSectionNavItems({
        items: config.items,
        groups: config.groups,
      }),
    [config.groups, config.items],
  );

  return (
    <div className="h-full">
      <div
        data-page-sidebar=""
        data-page-section-sidebar=""
        data-sidebar-state={isExpanded ? "expanded" : "collapsed"}
        className="sticky top-24 max-h-[calc(100svh-6rem)] overflow-y-auto"
      >
        <nav
          aria-label={config.label ?? t("label")}
          data-sidebar-state={isExpanded ? "expanded" : "collapsed"}
          className={[
            "flex min-h-full w-full flex-col",
            isExpanded ? "gap-4 py-1" : "items-center gap-3 py-1",
          ].join(" ")}
        >
          <div
            className={[
              "border-line",
              isExpanded ? "border-b pb-4" : "pb-1",
            ].join(" ")}
          >
            <div
              className={[
                "flex gap-3",
                isExpanded ? "items-start justify-between" : "flex-col items-center",
              ].join(" ")}
            >
              <div className={isExpanded ? "min-w-0" : "sr-only"}>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-ink-500">
                  {config.title ?? t("title")}
                </p>
                <p className="mt-2 max-w-[14rem] text-sm leading-6 text-ink-600">{t("description")}</p>
              </div>

              <button
                type="button"
                aria-expanded={isExpanded}
                aria-controls={panelId}
                aria-label={
                  isExpanded ? t("collapseAriaLabel") : t("expandAriaLabel")
                }
                onClick={() => onModeChange(isExpanded ? "collapsed" : "expanded")}
                className={[
                  "inline-flex items-center justify-center border border-line bg-white/92 font-semibold text-ink-900 shadow-sm transition hover:border-ink-950/20 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
                  isExpanded
                    ? "rounded-[16px] px-3.5 py-2 text-[0.68rem] uppercase tracking-[0.18em]"
                    : "h-11 w-11 rounded-[18px] text-base",
                ].join(" ")}
              >
                {isExpanded ? t("collapse") : <span aria-hidden="true">+</span>}
              </button>
            </div>
          </div>

          {isExpanded ? (
            <div id={panelId} className="mt-1 space-y-4">
              {groupedItems.standaloneItems.length ? (
                <ol className="flex flex-col gap-1.5">
                  {groupedItems.standaloneItems.map((item) => {
                    const isActive = activeId === item.id;

                    return (
                      <li key={item.id}>
                        <a
                          href={`#${item.id}`}
                          aria-label={item.label}
                          aria-current={isActive ? "location" : undefined}
                          onClick={(event) => handleNavigate(event, item.id)}
                          title={item.label}
                          className={[
                            "group flex w-full items-start gap-3 rounded-[18px] px-3.5 py-2.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
                            isActive
                              ? "border-ink-950 bg-ink-950 text-paper-strong shadow-sm"
                              : "border-transparent bg-white/42 text-ink-700 hover:bg-white/80 hover:text-ink-950",
                          ].join(" ")}
                        >
                          <span
                            aria-hidden="true"
                            className={[
                              "mt-1 h-2.5 w-2.5 shrink-0 rounded-full border transition",
                              isActive
                                ? "border-paper-strong bg-paper-strong"
                                : "border-line bg-transparent group-hover:border-ink-950/20 group-hover:bg-ink-950/10",
                            ].join(" ")}
                          />
                          <span className="leading-5">{item.label}</span>
                        </a>
                      </li>
                    );
                  })}
                </ol>
              ) : null}

              {groupedItems.groups.map((group) => {
                const isActiveGroup = activeGroupId === group.id;

                return (
                  <section
                    key={group.id}
                    data-page-section-nav-group={group.id}
                    className={[
                      "rounded-[20px] border px-3 py-3",
                      isActiveGroup
                        ? "border-ink-950/14 bg-ink-950/4 shadow-[0_8px_18px_rgba(15,23,42,0.05)]"
                        : "border-line/80 bg-white/38",
                    ].join(" ")}
                  >
                    {group.targetId ? (
                      <a
                        href={`#${group.targetId}`}
                        aria-current={isActiveGroup ? "step" : undefined}
                        onClick={(event) => handleGroupNavigate(event, group.targetId!)}
                        className={[
                          "inline-flex items-center rounded-full border px-3 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.16em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
                          isActiveGroup
                            ? "border-ink-950 bg-ink-950 text-paper-strong"
                            : "border-line bg-paper-strong text-ink-700 hover:border-ink-950/20 hover:bg-white hover:text-ink-950",
                        ].join(" ")}
                      >
                        {group.label}
                      </a>
                    ) : (
                      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-ink-600">
                        {group.label}
                      </p>
                    )}

                    <ol className="mt-2 flex flex-col gap-1.5 border-l border-line/80 pl-3">
                      {group.items.map((item) => {
                        const isActive = activeId === item.id;

                        return (
                          <li key={item.id}>
                            <a
                              href={`#${item.id}`}
                              aria-label={item.label}
                              aria-current={isActive ? "location" : undefined}
                              onClick={(event) => handleNavigate(event, item.id)}
                              title={item.label}
                              className={[
                            "group flex w-full items-start gap-3 rounded-[16px] px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
                                isActive
                                  ? "border-ink-950 bg-ink-950 text-paper-strong shadow-sm"
                                  : "border-transparent bg-white/52 text-ink-700 hover:bg-white hover:text-ink-950",
                              ].join(" ")}
                            >
                              <span
                                aria-hidden="true"
                                className={[
                                  "mt-1 h-2.5 w-2.5 shrink-0 rounded-full border transition",
                                  isActive
                                    ? "border-paper-strong bg-paper-strong"
                                    : "border-line bg-transparent group-hover:border-ink-950/20 group-hover:bg-ink-950/10",
                                ].join(" ")}
                              />
                              <span className="leading-5">{item.label}</span>
                            </a>
                          </li>
                        );
                      })}
                    </ol>
                  </section>
                );
              })}
            </div>
          ) : (
            <ol
              id={panelId}
              className="mt-1 flex flex-col items-center gap-2"
            >
              {config.items.map((item, index) => {
                const isActive = activeId === item.id;
                const badgeLabel = getPageSectionRailBadgeLabel(item, index);

                return (
                  <li key={item.id} className="w-full">
                    <a
                      href={`#${item.id}`}
                      aria-label={item.label}
                      aria-current={isActive ? "location" : undefined}
                      onClick={(event) => handleNavigate(event, item.id)}
                      title={item.label}
                      className={[
                        "group mx-auto flex h-12 w-12 items-center justify-center rounded-[18px] border text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
                        isActive
                          ? "border-ink-950 bg-ink-950 text-paper-strong shadow-sm"
                          : "border-line/80 bg-white/75 text-ink-700 hover:border-ink-950/20 hover:bg-white hover:text-ink-950",
                      ].join(" ")}
                    >
                      <span aria-hidden="true">{badgeLabel}</span>
                      <span className="sr-only">{item.label}</span>
                    </a>
                  </li>
                );
              })}
            </ol>
          )}
        </nav>
      </div>
    </div>
  );
}
