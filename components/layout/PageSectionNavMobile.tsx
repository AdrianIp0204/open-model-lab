"use client";

import { useTranslations } from "next-intl";
import { useId, useMemo, useState, type MouseEvent } from "react";
import {
  dispatchPageSectionNavigationIntent,
  getGroupedPageSectionNavItems,
  replacePageSectionLocationHash,
  scrollToPageSection,
  type PageSectionNavConfig,
} from "./page-section-nav";

type PageSectionNavMobileProps = {
  config: PageSectionNavConfig;
  activeId: string | null;
  activeGroupId: string | null;
};

function handleNavigate(event: MouseEvent<HTMLAnchorElement>, id: string) {
  event.preventDefault();
  dispatchPageSectionNavigationIntent(id);

  if (!scrollToPageSection(id)) {
    replacePageSectionLocationHash(id);
  }
}

export function PageSectionNavMobile({
  config,
  activeId,
  activeGroupId,
}: PageSectionNavMobileProps) {
  const t = useTranslations("PageSectionNav");
  const panelId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const groupedItems = useMemo(
    () =>
      getGroupedPageSectionNavItems({
        items: config.items,
        groups: config.groups,
      }),
    [config.groups, config.items],
  );
  const activeItem =
    config.items.find((item) => item.id === activeId) ?? config.items[0] ?? null;
  const activeGroup =
    groupedItems.groups.find((group) => group.id === activeGroupId) ??
    groupedItems.groups[0] ??
    null;
  const visibleItems = activeGroup
    ? [...groupedItems.standaloneItems, ...activeGroup.items]
    : config.items;

  function handleItemNavigate(event: MouseEvent<HTMLAnchorElement>, id: string) {
    setMenuOpen(false);
    handleNavigate(event, id);
  }

  function handleGroupNavigate(event: MouseEvent<HTMLAnchorElement>, id: string) {
    setMenuOpen(false);
    handleNavigate(event, id);
  }

  return (
    <div className="sticky top-[4.2rem] z-30 mb-4 lg:hidden">
      <div className="page-band px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="lab-label">{config.mobileLabel ?? t("mobileTitle")}</p>
            <div className="mt-1 flex min-w-0 items-center gap-2">
              {activeGroup ? (
                <span className="rounded-full border border-line bg-paper px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-600">
                  {activeGroup.label}
                </span>
              ) : null}
              <p className="truncate text-sm font-semibold text-ink-950">
                {activeItem?.label ?? t("currentSection")}
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="page-section-mobile-toggle"
            aria-expanded={menuOpen}
            aria-controls={panelId}
            aria-label={menuOpen ? t("closeMenu") : t("openButton")}
            onClick={() => setMenuOpen((current) => !current)}
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border border-line bg-paper px-3.5 py-2 text-sm font-semibold text-ink-950 transition hover:border-ink-950/20 hover:bg-paper-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            {menuOpen ? t("closeButton") : t("openButton")}
          </button>
        </div>

        {menuOpen ? (
          <div id={panelId} data-testid="page-section-mobile-panel" className="mt-3 space-y-3">
            {groupedItems.groups.length ? (
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {groupedItems.groups.map((group) => {
                  const active = activeGroupId === group.id;
                  const targetId = group.targetId ?? group.items[0]?.id;

                  return (
                    <a
                      key={group.id}
                      href={`#${targetId}`}
                      aria-current={active ? "step" : undefined}
                      onClick={(event) =>
                        targetId ? handleGroupNavigate(event, targetId) : undefined
                      }
                      className={[
                        "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                        active
                          ? "border-ink-950 bg-ink-950 text-paper-strong"
                          : "border-line bg-paper text-ink-700",
                      ].join(" ")}
                    >
                      {group.label}
                    </a>
                  );
                })}
              </div>
            ) : null}

            <div className="grid gap-2 sm:grid-cols-2">
              {visibleItems.map((item) => {
                const active = activeId === item.id;

                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    aria-current={active ? "location" : undefined}
                    onClick={(event) => handleItemNavigate(event, item.id)}
                    className={[
                      "rounded-[16px] border px-3 py-2.5 text-sm font-medium transition",
                      active
                        ? "border-ink-950 bg-ink-950 text-paper-strong"
                        : "border-line bg-paper-strong text-ink-700",
                    ].join(" ")}
                  >
                    {item.label}
                  </a>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
