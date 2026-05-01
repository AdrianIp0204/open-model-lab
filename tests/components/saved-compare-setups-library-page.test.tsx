// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SavedCompareSetupsLibraryPage } from "@/components/account/SavedCompareSetupsLibraryPage";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";
import {
  localSavedCompareSetupsStore,
  saveSavedCompareSetup,
} from "@/lib/saved-compare-setups-store";
import zhHkMessages from "@/messages/zh-HK.json";

const useAccountSessionMock = vi.fn();

vi.mock("@/lib/account/client", () => ({
  useAccountSession: () => useAccountSessionMock(),
}));

describe("SavedCompareSetupsLibraryPage", () => {
  const concepts = [
    {
      id: "concept-projectile-motion",
      slug: "projectile-motion",
      title: "Projectile Motion",
      subject: "Physics",
      topic: "Mechanics",
    },
  ];

  beforeEach(() => {
    window.localStorage.clear();
    localSavedCompareSetupsStore.resetForTests();
    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-in",
      user: {
        id: "user-1",
      },
      entitlement: resolveAccountEntitlement({
        tier: "premium",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
    });
  });

  afterEach(() => {
    localSavedCompareSetupsStore.resetForTests();
    window.localStorage.clear();
    useAccountSessionMock.mockReset();
  });

  it("shows an empty compare-library state with recovery paths", () => {
    render(<SavedCompareSetupsLibraryPage concepts={concepts} />);

    expect(screen.getByText("Sync status")).toBeInTheDocument();
    expect(screen.getByText("Local-only")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sync now" })).toBeInTheDocument();
    expect(screen.getByText("No saved compare setups yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start here" })).toHaveAttribute("href", "/start");
    expect(screen.getByRole("link", { name: "Browse concepts" })).toHaveAttribute(
      "href",
      "/concepts",
    );
    expect(screen.getByRole("link", { name: "Search the library" })).toHaveAttribute(
      "href",
      "/search",
    );
  });

  it("renames and deletes compare setups from the local library", async () => {
    const user = userEvent.setup();

    saveSavedCompareSetup({
      conceptId: "concept-projectile-motion",
      conceptSlug: "projectile-motion",
      conceptTitle: "Projectile Motion",
      title: "Earth vs moon arc",
      stateParam: "v1.earth-vs-moon",
      publicExperimentParam: "v1.earth-vs-moon-card",
      setupALabel: "Earth shot",
      setupBLabel: "Moon hop",
      sourceType: "imported-from-link",
    });

    render(<SavedCompareSetupsLibraryPage concepts={concepts} />);

    expect(screen.getByText("Earth vs moon arc")).toBeInTheDocument();
    expect(screen.getByText("Earth shot vs Moon hop")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open" })).toHaveAttribute(
      "href",
      "/concepts/projectile-motion?state=v1.earth-vs-moon&experiment=v1.earth-vs-moon-card#live-bench",
    );

    await user.click(screen.getByRole("button", { name: "Rename" }));
    await user.clear(screen.getByLabelText("Compare setup name"));
    await user.type(
      screen.getByLabelText("Compare setup name"),
      "Earth vs moon arc review",
    );
    await user.click(screen.getByRole("button", { name: "Save name" }));

    expect(
      screen.getByText('Renamed "Earth vs moon arc review".'),
    ).toBeInTheDocument();
    expect(screen.getByText("Earth vs moon arc review")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(
      screen.getByText(
        'Removed "Earth vs moon arc review" from the compare library. Account sync will carry the change across supported browsers next.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("No saved compare setups yet.")).toBeInTheDocument();
  });

  it("shows the premium notice for free accounts", () => {
    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-in",
      user: {
        id: "user-1",
      },
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
    });

    render(<SavedCompareSetupsLibraryPage concepts={concepts} />);

    expect(screen.getByText("Saved compare setups")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View Supporter plan" })).toHaveAttribute(
      "href",
      "/pricing#compare",
    );
    expect(screen.getByRole("link", { name: "Start here" })).toHaveAttribute("href", "/start");
  });

  it("renders the compare-library shell in zh-HK", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    render(<SavedCompareSetupsLibraryPage concepts={concepts} />);

    expect(
      screen.getByText(zhHkMessages.SavedCompareSetupsLibraryPage.sync.statusLabel),
    ).toBeInTheDocument();
    expect(
      screen.getByText(zhHkMessages.SavedCompareSetupsLibraryPage.empty.title),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: zhHkMessages.SavedCompareSetupsLibraryPage.empty.actions.searchLibrary,
      }),
    ).toHaveAttribute("href", "/search");
  });

  it("preserves the active locale in saved compare links", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    saveSavedCompareSetup({
      conceptId: "concept-projectile-motion",
      conceptSlug: "projectile-motion",
      conceptTitle: "Projectile Motion",
      title: "Earth vs moon arc",
      stateParam: "v1.earth-vs-moon",
      publicExperimentParam: "v1.earth-vs-moon-card",
      setupALabel: "Earth shot",
      setupBLabel: "Moon hop",
      sourceType: "imported-from-link",
    });

    render(<SavedCompareSetupsLibraryPage concepts={concepts} />);

    expect(
      screen.getByRole("link", {
        name: zhHkMessages.SavedCompareSetupsLibraryPage.card.actions.open,
      }),
    ).toHaveAttribute(
      "href",
      "/zh-HK/concepts/projectile-motion?state=v1.earth-vs-moon&experiment=v1.earth-vs-moon-card#live-bench",
    );
  });
});
