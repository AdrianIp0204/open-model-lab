// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PageSection } from "@/components/layout/PageSection";
import { PageSectionFrame } from "@/components/layout/PageSectionFrame";
import {
  pageSectionRailStorageKey,
  pageSectionSidebarWidths,
} from "@/components/layout/page-section-nav";

describe("PageSectionFrame", () => {
  const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
  const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;

  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
    window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    }) as typeof window.requestAnimationFrame;
    window.cancelAnimationFrame = vi.fn();
    window.localStorage.clear();
  });

  afterEach(() => {
    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    window.requestAnimationFrame = originalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
    document.body.innerHTML = "";
    window.history.replaceState(window.history.state, "", "/");
  });

  function renderFrame() {
    return render(
      <PageSectionFrame
        sectionNav={{
          label: "Example sections",
          title: "Jump within example",
          mobileLabel: "Example sections",
          items: [
            { id: "alpha", label: "Alpha" },
            { id: "beta", label: "Beta" },
          ],
        }}
      >
        <div className="space-y-8">
          <PageSection id="alpha" as="section">
            <h2>Alpha</h2>
          </PageSection>
          <PageSection id="beta" as="section">
            <h2>Beta</h2>
          </PageSection>
        </div>
      </PageSectionFrame>,
    );
  }

  function renderFrameWithHiddenDesktopRail() {
    return render(
      <PageSectionFrame
        sectionNav={{
          label: "Example sections",
          title: "Jump within example",
          mobileLabel: "Example sections",
          desktopBehavior: "hidden",
          items: [
            { id: "alpha", label: "Alpha" },
            { id: "beta", label: "Beta" },
          ],
        }}
      >
        <div className="space-y-8">
          <PageSection id="alpha" as="section">
            <h2>Alpha</h2>
          </PageSection>
          <PageSection id="beta" as="section">
            <h2>Beta</h2>
          </PageSection>
        </div>
      </PageSectionFrame>,
    );
  }

  function renderGroupedFrame() {
    return render(
      <PageSectionFrame
        sectionNav={{
          label: "Concept sections",
          title: "Jump within concept",
          mobileLabel: "Concept sections",
          activeGroupParam: "phase",
          groups: [
            { id: "explore", label: "Explore", targetId: "alpha" },
            { id: "understand", label: "Understand", targetId: "beta" },
          ],
          items: [
            { id: "interactive-lab", label: "Interactive lab", compactLabel: "Lab" },
            { id: "alpha", label: "Alpha", compactLabel: "Alpha", groupId: "explore" },
            { id: "beta", label: "Beta", compactLabel: "Beta", groupId: "understand" },
          ],
        }}
      >
        <div className="space-y-8">
          <PageSection id="interactive-lab" as="section">
            <h2>Interactive lab</h2>
          </PageSection>
          <PageSection id="alpha" as="section">
            <h2>Alpha</h2>
          </PageSection>
          <PageSection id="beta" as="section">
            <h2>Beta</h2>
          </PageSection>
        </div>
      </PageSectionFrame>,
    );
  }

  it("toggles the compact mobile menu and closes it after navigation", async () => {
    const user = userEvent.setup();

    renderFrame();

    const toggle = screen.getByRole("button", { name: /^Page sections/ });

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("page-section-mobile-panel")).not.toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("page-section-mobile-panel")).toBeInTheDocument();

    const panelId = toggle.getAttribute("aria-controls");
    expect(panelId).toBeTruthy();

    const panel = document.getElementById(panelId ?? "");
    expect(panel).not.toBeNull();

    await user.click(within(panel as HTMLElement).getByRole("link", { name: "Beta" }));

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("keeps non-grouped consumers flat on desktop and mobile", async () => {
    const user = userEvent.setup();

    renderFrame();

    const nav = screen.getByRole("navigation", { name: "Example sections" });
    expect(nav.querySelector("[data-page-section-nav-group]")).toBeNull();
    expect(within(nav).queryByText("Explore")).not.toBeInTheDocument();

    const toggle = screen.getByRole("button", { name: /^Page sections/ });
    await user.click(toggle);

    const panel = document.getElementById(toggle.getAttribute("aria-controls") ?? "");
    expect(panel).not.toBeNull();
    expect((panel as HTMLElement).querySelector("[data-page-section-nav-group]")).toBeNull();
    expect(within(panel as HTMLElement).queryByText("Explore")).not.toBeInTheDocument();
  });

  it("defaults to an expanded desktop rail and lets the user collapse it", async () => {
    const user = userEvent.setup();

    renderFrame();

    const nav = screen.getByRole("navigation", { name: "Example sections" });
    const layout = document.querySelector("[data-page-section-layout]");
    const routeShell = document.querySelector("[data-route-shell]");
    const pageBodyShell = document.querySelector("[data-page-body-shell]");
    const pageMain = document.querySelector("[data-page-main]");
    const pageContentContainer = document.querySelector("[data-page-content-container]");
    const pageSidebarColumn = document.querySelector("[data-page-sidebar-column]");
    const pageSidebarSurface = document.querySelector("[data-page-sidebar-surface]");
    const pageSidebar = document.querySelector("[data-page-sidebar]");

    await waitFor(() => {
      expect(nav).toHaveAttribute("data-sidebar-state", "expanded");
    });
    expect(routeShell).not.toBeNull();
    expect(pageBodyShell).not.toBeNull();
    expect(pageMain).not.toBeNull();
    expect(pageContentContainer).not.toBeNull();
    expect(pageSidebarColumn).not.toBeNull();
    expect(pageSidebarSurface).not.toBeNull();
    expect(pageSidebar).not.toBeNull();
    expect(layout).toHaveStyle({
      gridTemplateColumns: `${pageSectionSidebarWidths.default.expanded} minmax(0, 1fr)`,
    });

    const collapseButton = screen.getByRole("button", {
      name: "Collapse section navigation sidebar",
    });
    await user.click(collapseButton);

    expect(nav).toHaveAttribute("data-sidebar-state", "collapsed");
    expect(layout).toHaveStyle({
      gridTemplateColumns: `${pageSectionSidebarWidths.default.collapsed} minmax(0, 1fr)`,
    });

    const expandButton = screen.getByRole("button", {
      name: "Expand section navigation sidebar",
    });
    await user.click(expandButton);

    expect(nav).toHaveAttribute("data-sidebar-state", "expanded");
    expect(layout).toHaveStyle({
      gridTemplateColumns: `${pageSectionSidebarWidths.default.expanded} minmax(0, 1fr)`,
    });
  });

  it("restores a previously collapsed desktop rail from storage", async () => {
    window.localStorage.setItem(pageSectionRailStorageKey, "collapsed");

    renderFrame();

    const nav = screen.getByRole("navigation", { name: "Example sections" });

    await waitFor(() => {
      expect(nav).toHaveAttribute("data-sidebar-state", "collapsed");
    });

    expect(
      screen.getByRole("button", { name: "Expand section navigation sidebar" }),
    ).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Alpha" })).toHaveAttribute("href", "#alpha");
    expect(within(nav).getByRole("link", { name: "Alpha" })).toHaveTextContent("1");
  });

  it("keeps the collapsed rail flat and safe for grouped nav configs", async () => {
    const user = userEvent.setup();

    renderGroupedFrame();

    const nav = screen.getByRole("navigation", { name: "Concept sections" });
    await waitFor(() => {
      expect(nav).toHaveAttribute("data-sidebar-state", "expanded");
    });

    await user.click(
      screen.getByRole("button", {
        name: "Collapse section navigation sidebar",
      }),
    );

    expect(nav).toHaveAttribute("data-sidebar-state", "collapsed");
    expect(nav.querySelector("[data-page-section-nav-group]")).toBeNull();
    expect(within(nav).queryByText("Explore")).not.toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Interactive lab" })).toHaveTextContent("1");
    expect(within(nav).getByRole("link", { name: "Alpha" })).toHaveTextContent("2");
    expect(within(nav).getByRole("link", { name: "Beta" })).toHaveTextContent("3");

    window.location.hash = "#beta";
    window.dispatchEvent(new HashChangeEvent("hashchange"));

    await waitFor(() => {
      expect(within(nav).getByRole("link", { name: "Beta" })).toHaveAttribute(
        "aria-current",
        "location",
      );
    });
  });

  it("syncs the requested active group from the query param after mount", async () => {
    window.history.replaceState(window.history.state, "", "/concepts/example?phase=understand");

    renderGroupedFrame();

    const nav = screen.getByRole("navigation", { name: "Concept sections" });

    await waitFor(() => {
      expect(
        within(nav).getByRole("link", { name: "Understand" }),
      ).toHaveAttribute("aria-current", "step");
    });

    expect(within(nav).getByRole("link", { name: "Explore" })).not.toHaveAttribute(
      "aria-current",
      "step",
    );
  });

  it("can hide the desktop rail while keeping the section frame content wrapper", () => {
    renderFrameWithHiddenDesktopRail();

    expect(screen.queryByRole("navigation", { name: "Example sections" })).not.toBeInTheDocument();
    expect(document.querySelector("[data-page-sidebar-column]")).toBeNull();
    expect(document.querySelector("[data-page-sidebar-surface]")).toBeNull();
    expect(document.querySelector("[data-page-content-container]")).toBeInTheDocument();
  });

  it("updates the active item when the current section changes", async () => {
    const alphaRect = {
      top: 24,
      bottom: 320,
      left: 0,
      right: 0,
      width: 0,
      height: 296,
      x: 0,
      y: 24,
      toJSON: () => ({}),
    };
    const betaRect = {
      top: 360,
      bottom: 760,
      left: 0,
      right: 0,
      width: 0,
      height: 400,
      x: 0,
      y: 360,
      toJSON: () => ({}),
    };

    HTMLElement.prototype.getBoundingClientRect = function () {
      if ((this as HTMLElement).id === "alpha") {
        return alphaRect as DOMRect;
      }

      if ((this as HTMLElement).id === "beta") {
        return betaRect as DOMRect;
      }

      return originalGetBoundingClientRect.call(this);
    };

    renderFrame();

    fireEvent.scroll(window);

    const desktopNav = screen.getByRole("navigation", { name: "Example sections" });

    await waitFor(() => {
      expect(within(desktopNav).getByRole("link", { name: "Alpha" })).toHaveAttribute(
        "aria-current",
        "location",
      );
    });

    window.location.hash = "#beta";
    window.dispatchEvent(new HashChangeEvent("hashchange"));

    await waitFor(() => {
      expect(within(desktopNav).getByRole("link", { name: "Beta" })).toHaveAttribute(
        "aria-current",
        "location",
      );
    });
  });
});
