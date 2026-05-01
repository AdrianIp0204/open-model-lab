// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SavedSetupsLibraryPage } from "@/components/account/SavedSetupsLibraryPage";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";
import { localSavedSetupsStore, saveSavedSetup } from "@/lib/saved-setups-store";
import zhHkMessages from "@/messages/zh-HK.json";

const useAccountSessionMock = vi.fn();

vi.mock("@/lib/account/client", () => ({
  useAccountSession: () => useAccountSessionMock(),
}));

describe("SavedSetupsLibraryPage", () => {
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
    localSavedSetupsStore.resetForTests();
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
    localSavedSetupsStore.resetForTests();
    window.localStorage.clear();
    useAccountSessionMock.mockReset();
  });

  it("shows an empty state with discovery paths when nothing is saved yet", () => {
    render(<SavedSetupsLibraryPage concepts={concepts} />);

    expect(screen.getByText("Sync status")).toBeInTheDocument();
    expect(screen.getByText("Local-only")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sync now" })).toBeInTheDocument();
    expect(screen.getByText("No saved setups yet.")).toBeInTheDocument();
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

  it("renames and deletes saved setups from the local library", async () => {
    const user = userEvent.setup();

    saveSavedSetup({
      conceptId: "concept-projectile-motion",
      conceptSlug: "projectile-motion",
      conceptTitle: "Projectile Motion",
      title: "Earth shot",
      stateParam: "v1.earth-state",
      publicExperimentParam: "v1.earth-card",
      sourceType: "imported-from-link",
    });

    render(<SavedSetupsLibraryPage concepts={concepts} />);

    expect(screen.getByText("Earth shot")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open" })).toHaveAttribute(
      "href",
      "/concepts/projectile-motion?state=v1.earth-state&experiment=v1.earth-card#interactive-lab",
    );

    await user.click(screen.getByRole("button", { name: "Rename" }));
    await user.clear(screen.getByLabelText("Saved setup name"));
    await user.type(screen.getByLabelText("Saved setup name"), "Earth shot review");
    await user.click(screen.getByRole("button", { name: "Save name" }));

    expect(screen.getByText('Renamed "Earth shot review".')).toBeInTheDocument();
    expect(screen.getByText("Earth shot review")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(
      screen.getByText(
        'Removed "Earth shot review" from the saved setups library. Account sync will carry the change across supported browsers next.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("No saved setups yet.")).toBeInTheDocument();
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

    render(<SavedSetupsLibraryPage concepts={concepts} />);

    expect(screen.getByText("Saved setups library")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View Supporter plan" })).toHaveAttribute(
      "href",
      "/pricing#compare",
    );
  });

  it("renders the empty-state shell in zh-HK", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    render(<SavedSetupsLibraryPage concepts={concepts} />);

    expect(
      screen.getByText(zhHkMessages.SavedSetupsLibraryPage.sync.statusLabel),
    ).toBeInTheDocument();
    expect(
      screen.getByText(zhHkMessages.SavedSetupsLibraryPage.empty.title),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: zhHkMessages.SavedSetupsLibraryPage.empty.actions.searchLibrary,
      }),
    ).toHaveAttribute("href", "/search");
  });

  it("preserves the active locale in saved setup links", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    saveSavedSetup({
      conceptId: "concept-projectile-motion",
      conceptSlug: "projectile-motion",
      conceptTitle: "Projectile Motion",
      title: "Earth shot",
      stateParam: "v1.earth-state",
      publicExperimentParam: "v1.earth-card",
      sourceType: "imported-from-link",
    });

    render(<SavedSetupsLibraryPage concepts={concepts} />);

    expect(
      screen.getByRole("link", { name: zhHkMessages.SavedSetupsLibraryPage.card.actions.open }),
    ).toHaveAttribute(
      "href",
      "/zh-HK/concepts/projectile-motion?state=v1.earth-state&experiment=v1.earth-card#interactive-lab",
    );
  });
});
