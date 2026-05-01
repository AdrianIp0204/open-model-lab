export type PageSectionNavItem = {
  id: string;
  label: string;
  compactLabel?: string;
  groupId?: string;
};

export type PageSectionNavGroup = {
  id: string;
  label: string;
  targetId?: string;
};

export type RenderablePageSectionNavGroup = PageSectionNavGroup & {
  items: PageSectionNavItem[];
};

export type PageSectionNavVariant = "default" | "compact";
export type PageSectionSidebarMode = "expanded" | "collapsed";
export type PageSectionDesktopBehavior = "rail" | "hidden";

export type PageSectionNavConfig = {
  items: readonly PageSectionNavItem[];
  groups?: readonly PageSectionNavGroup[];
  activeGroupParam?: string;
  label?: string;
  title?: string;
  mobileLabel?: string;
  variant?: PageSectionNavVariant;
  desktopBehavior?: PageSectionDesktopBehavior;
};

export const pageSectionAnchorClassName = "scroll-mt-24";
export const pageSectionNavMinItems = 2;
export const pageSectionRailStorageKey =
  "open-model-lab.page-section-nav.desktop-state.v1";
export const pageSectionNavigationIntentEvent =
  "open-model-lab:page-section-navigation-intent";
export const pageSectionLocationChangeEvent =
  "open-model-lab:page-section-location-change";
export const pageSectionSidebarWidths: Record<
  PageSectionNavVariant,
  Record<PageSectionSidebarMode, string>
> = {
  default: {
    expanded: "15rem",
    collapsed: "4rem",
  },
  compact: {
    expanded: "13.5rem",
    collapsed: "3.75rem",
  },
};

export function getRenderablePageSectionNavItems(items: readonly PageSectionNavItem[]) {
  const seenIds = new Set<string>();

  return items.filter((item) => {
    const id = item.id.trim();
    const label = item.label.trim();

    if (!id || !label || seenIds.has(id)) {
      return false;
    }

    seenIds.add(id);
    return true;
  });
}

export function getRenderablePageSectionNavGroups(groups: readonly PageSectionNavGroup[] = []) {
  const seenIds = new Set<string>();

  return groups.filter((group) => {
    const id = group.id.trim();
    const label = group.label.trim();

    if (!id || !label || seenIds.has(id)) {
      return false;
    }

    seenIds.add(id);
    return true;
  });
}

export function getGroupedPageSectionNavItems(input: {
  items: readonly PageSectionNavItem[];
  groups?: readonly PageSectionNavGroup[];
}) {
  const renderableGroups = getRenderablePageSectionNavGroups(input.groups ?? []);

  if (!renderableGroups.length) {
    return {
      standaloneItems: [...input.items],
      groups: [] as RenderablePageSectionNavGroup[],
    };
  }

  const groupedItems = new Map<string, PageSectionNavItem[]>(
    renderableGroups.map((group) => [group.id, []]),
  );
  const standaloneItems: PageSectionNavItem[] = [];

  for (const item of input.items) {
    const normalizedGroupId = item.groupId?.trim();

    if (normalizedGroupId && groupedItems.has(normalizedGroupId)) {
      groupedItems.get(normalizedGroupId)?.push(item);
      continue;
    }

    standaloneItems.push(item);
  }

  return {
    standaloneItems,
    groups: renderableGroups.flatMap((group) => {
      const items = groupedItems.get(group.id) ?? [];

      if (!items.length) {
        return [];
      }

      return [
        {
          ...group,
          items,
        },
      ];
    }),
  };
}

export function shouldRenderPageSectionNav(items: readonly PageSectionNavItem[]) {
  return getRenderablePageSectionNavItems(items).length >= pageSectionNavMinItems;
}

export function getPageSectionSidebarWidth(
  variant: PageSectionNavVariant = "default",
  mode: PageSectionSidebarMode = "expanded",
) {
  return pageSectionSidebarWidths[variant][mode];
}

export function getPageSectionRailBadgeLabel(
  _item: PageSectionNavItem,
  index: number,
) {
  return `${index + 1}`;
}

export function readPageSectionNavActiveGroupId(
  activeGroupParam?: string,
) {
  if (typeof window === "undefined" || !activeGroupParam?.trim()) {
    return null;
  }

  const url = new URL(window.location.href);
  const requestedGroupId = url.searchParams.get(activeGroupParam.trim());
  return requestedGroupId?.trim() || null;
}

export function resolvePageSectionNavActiveGroupId(input: {
  activeId: string | null;
  groups: readonly RenderablePageSectionNavGroup[];
  requestedGroupId?: string | null;
}) {
  const activeItemGroupId =
    input.activeId
      ? input.groups.find((group) => group.items.some((item) => item.id === input.activeId))?.id
      : null;

  if (activeItemGroupId) {
    return activeItemGroupId;
  }

  if (input.requestedGroupId) {
    const matchedGroup = input.groups.find((group) => group.id === input.requestedGroupId);

    if (matchedGroup) {
      return matchedGroup.id;
    }
  }

  return input.groups[0]?.id ?? null;
}

export function readStoredPageSectionRailMode(): PageSectionSidebarMode | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedValue = window.localStorage.getItem(pageSectionRailStorageKey);

    if (storedValue === "expanded" || storedValue === "collapsed") {
      return storedValue;
    }
  } catch {
    return null;
  }

  return null;
}

export function writeStoredPageSectionRailMode(mode: PageSectionSidebarMode) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(pageSectionRailStorageKey, mode);
  } catch {
    // Ignore storage failures; the rail still works for the current session.
  }
}

export function dispatchPageSectionNavigationIntent(id: string) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedId = id.trim();

  if (!normalizedId) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(pageSectionNavigationIntentEvent, {
      detail: { id: normalizedId },
    }),
  );
}

export function addPageSectionNavigationIntentListener(
  listener: (id: string) => void,
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleEvent = (event: Event) => {
    const detail =
      event instanceof CustomEvent && event.detail && typeof event.detail === "object"
        ? (event.detail as { id?: unknown })
        : null;
    const id = typeof detail?.id === "string" ? detail.id.trim() : "";

    if (!id) {
      return;
    }

    listener(id);
  };

  window.addEventListener(pageSectionNavigationIntentEvent, handleEvent);

  return () => {
    window.removeEventListener(pageSectionNavigationIntentEvent, handleEvent);
  };
}

export function emitPageSectionLocationChange() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(pageSectionLocationChangeEvent));
}

export function replacePageSectionLocationHash(id: string) {
  if (typeof window === "undefined") {
    return false;
  }

  const normalizedId = id.trim();

  if (!normalizedId) {
    return false;
  }

  const url = new URL(window.location.href);
  url.hash = normalizedId;
  window.history.replaceState(window.history.state, "", url);
  emitPageSectionLocationChange();

  return true;
}

export function addPageSectionLocationChangeListener(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener(pageSectionLocationChangeEvent, listener);

  return () => {
    window.removeEventListener(pageSectionLocationChangeEvent, listener);
  };
}

export function scrollToPageSection(id: string) {
  if (typeof document === "undefined") {
    return false;
  }

  const element = document.getElementById(id);

  if (!element) {
    return false;
  }

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  element.scrollIntoView({
    behavior: prefersReducedMotion ? "auto" : "smooth",
    block: "start",
  });

  replacePageSectionLocationHash(id);

  return true;
}
