import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";

const useAccountSessionMock = vi.fn();
const useProgressSyncStateMock = vi.fn();
const useProgressSnapshotMock = vi.fn();

vi.mock("@/lib/account/client", () => ({
  useAccountSession: () => useAccountSessionMock(),
}));

vi.mock("@/lib/progress", () => ({
  useProgressSyncState: () => useProgressSyncStateMock(),
  useProgressSnapshot: () => useProgressSnapshotMock(),
}));

describe("SiteHeader", () => {
  afterEach(() => {
    globalThis.__TEST_PATHNAME__ = undefined;
    globalThis.__TEST_LOCALE__ = undefined;
    useAccountSessionMock.mockReset();
    useProgressSyncStateMock.mockReset();
    useProgressSnapshotMock.mockReset();
  });

  it("focuses the first mobile link and closes the menu on escape", async () => {
    const user = userEvent.setup();

    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-out",
      user: null,
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "anonymous-default",
      }),
    });
    useProgressSyncStateMock.mockReturnValue({
      mode: "local",
    });
    useProgressSnapshotMock.mockReturnValue({
      concepts: {},
    });
    globalThis.__TEST_PATHNAME__ = "/";

    render(<SiteHeader />);

    const brandLink = screen.getByRole("link", { name: /^open model lab$/i });
    const brandIcon = brandLink.querySelector("img");

    expect(brandLink).toHaveAttribute("href", "/");
    expect(within(brandLink).getByText(/open model lab/i)).toBeInTheDocument();
    expect(brandIcon).not.toBeNull();
    expect(brandIcon).toHaveAttribute("src", "/branding/open-model-lab-mark.svg");
    expect(brandIcon).toHaveAttribute("width", "32");
    expect(brandIcon).toHaveAttribute("height", "32");
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute(
      "href",
      "/account",
    );
    expect(screen.getByRole("link", { name: /tools/i })).toHaveAttribute("href", "/tools");
    expect(screen.getByRole("link", { name: /practice/i })).toHaveAttribute(
      "href",
      "/tests",
    );
    expect(
      screen.getByRole("button", { name: /open help \/ tutorial/i }),
    ).toBeInTheDocument();

    const menuButton = screen.getByRole("button", {
      name: /open navigation menu/i,
    });

    await user.click(menuButton);

    const mobileNav = screen.getByRole("navigation", { name: /mobile primary/i });
    const mobileNavPanel = document.getElementById("mobile-primary-nav");
    const firstNavLink = within(mobileNav).getByRole("link", { name: /start/i });

    expect(mobileNavPanel).toHaveClass("overflow-y-auto", "overscroll-contain");
    expect(mobileNavPanel?.className).toContain("max-h-[calc(100dvh-4.25rem)]");

    await waitFor(() => {
      expect(firstNavLink).toHaveFocus();
    });

    expect(
      within(mobileNav).getByText(/get a recommended first step or resume where you left off/i),
    ).toBeInTheDocument();

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(
        screen.queryByRole("navigation", { name: /mobile primary/i }),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: /open navigation menu/i }),
    ).toHaveFocus();
  });

  it("shows a free-tier account indicator when the user is signed in", () => {
    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-in",
      user: {
        id: "user-1",
        email: "student@example.com",
        displayName: "Lab Student",
      },
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "stored",
      }),
    });
    useProgressSyncStateMock.mockReturnValue({
      mode: "local",
    });
    useProgressSnapshotMock.mockReturnValue({
      concepts: {},
    });
    globalThis.__TEST_PATHNAME__ = "/";

    render(<SiteHeader />);

    const accountLink = screen.getByRole("link", { name: /lab student/i });

    expect(accountLink).toHaveAttribute("href", "/dashboard");
    expect(accountLink).toHaveTextContent(/free tier/i);
    expect(screen.getByRole("link", { name: /^open model lab$/i })).toBeInTheDocument();
  });

  it("shows a Supporter account indicator when the user is signed in", () => {
    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-in",
      user: {
        id: "user-1",
        email: "student@example.com",
        displayName: "Lab Student",
      },
      entitlement: resolveAccountEntitlement({
        tier: "premium",
        source: "stored",
      }),
    });
    useProgressSyncStateMock.mockReturnValue({
      mode: "synced",
    });
    useProgressSnapshotMock.mockReturnValue({
      concepts: {},
    });
    globalThis.__TEST_PATHNAME__ = "/";

    render(<SiteHeader />);

    const accountLink = screen.getByRole("link", { name: /lab student/i });

    expect(accountLink).toHaveAttribute("href", "/dashboard");
    expect(accountLink).toHaveTextContent(/supporter/i);
  });

  it("renders zh-HK navigation labels from the active locale context", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";
    globalThis.__TEST_PATHNAME__ = "/challenges";
    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-out",
      user: null,
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "anonymous-default",
      }),
    });
    useProgressSyncStateMock.mockReturnValue({
      mode: "local",
    });
    useProgressSnapshotMock.mockReturnValue({
      concepts: {},
    });

    render(<SiteHeader />);

    expect(screen.getAllByText("挑戰").length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("link").some((link) => link.getAttribute("href") === "/tests"),
    ).toBe(true);
    expect(screen.getByRole("link", { name: "模擬" })).toHaveAttribute(
      "href",
      "/concepts",
    );
    expect(screen.getByRole("link", { name: "引導" })).toHaveAttribute(
      "href",
      "/guided",
    );
  });

  it("localizes known fixture account names in zh-HK", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";
    globalThis.__TEST_PATHNAME__ = "/";
    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-in",
      user: {
        id: "user-1",
        email: "student@example.com",
        displayName: "Free learner",
      },
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "stored",
      }),
    });
    useProgressSyncStateMock.mockReturnValue({
      mode: "local",
    });
    useProgressSnapshotMock.mockReturnValue({
      concepts: {},
    });

    render(<SiteHeader />);

    const accountLink = screen.getByRole("link", { name: /免費學習者/i });
    expect(accountLink).toHaveAttribute("href", "/dashboard");
    expect(accountLink).not.toHaveTextContent("Free learner");
  });
});
