// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConceptShareLinksPanel } from "@/components/share/ConceptShareLinksPanel";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";
import enMessages from "@/messages/en.json";
import zhHkMessages from "@/messages/zh-HK.json";

const useAccountSessionMock = vi.fn();
const useConceptPageRuntimeSnapshotMock = vi.fn();
const useSavedSetupsMock = vi.fn();
const useSavedSetupsSyncStateMock = vi.fn();
const saveSavedSetupMock = vi.fn();
const renameSavedSetupMock = vi.fn();
const deleteSavedSetupMock = vi.fn();

vi.mock("@/lib/account/client", () => ({
  useAccountSession: () => useAccountSessionMock(),
}));

vi.mock("@/components/concepts/ConceptLearningBridge", () => ({
  useConceptPageRuntimeSnapshot: () => useConceptPageRuntimeSnapshotMock(),
}));

vi.mock("@/lib/saved-setups-store", () => ({
  useSavedSetups: () => useSavedSetupsMock(),
  useSavedSetupsSyncState: () => useSavedSetupsSyncStateMock(),
  saveSavedSetup: (...args: unknown[]) => saveSavedSetupMock(...args),
  renameSavedSetup: (...args: unknown[]) => renameSavedSetupMock(...args),
  deleteSavedSetup: (...args: unknown[]) => deleteSavedSetupMock(...args),
}));

const simulationSource = {
  slug: "projectile-motion",
  simulation: {
    defaults: {
      speed: 18,
      angle: 45,
      gravity: 9.81,
    },
    presets: [
      {
        id: "earth-shot",
        label: "Earth shot",
        values: {
          speed: 18,
          angle: 45,
          gravity: 9.81,
        },
      },
    ],
    overlays: [
      {
        id: "rangeMarker",
        label: "Range marker",
        shortDescription: "Marks the landing range.",
        whatToNotice: ["Range changes with launch conditions."],
        defaultOn: true,
      },
    ],
    graphs: [
      {
        id: "trajectory",
        label: "Trajectory",
        xLabel: "x",
        yLabel: "y",
        series: ["trajectory"],
      },
    ],
  },
};

const stableItems = [
  {
    id: "concept-page",
    label: "Concept page",
    href: "/concepts/projectile-motion",
  },
  {
    id: "interactive-lab",
    label: "Interactive lab",
    href: "/concepts/projectile-motion#interactive-lab",
  },
];

const localizedStableItems = [
  ...stableItems,
  {
    id: "challenge-mode",
    label: "Challenge mode",
    href: "/concepts/projectile-motion#challenge-mode",
  },
  {
    id: "workedExamples",
    label: "Worked examples",
    href: "/concepts/projectile-motion#worked-examples",
  },
  {
    id: "quickTest",
    label: "Quick test",
    href: "/concepts/projectile-motion#quick-test",
  },
  {
    id: "readNext",
    label: "Read next",
    href: "/concepts/projectile-motion#read-next",
  },
];

const featuredSetups = [
  {
    id: "earth-shot-trajectory",
    label: "Earth shot",
    description: "Open the standard Earth launch with the trajectory view already active.",
    setup: {
      presetId: "earth-shot",
      graphId: "trajectory",
    },
  },
];

describe("ConceptShareLinksPanel", () => {
  beforeEach(() => {
    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-out",
      user: null,
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "anonymous-default",
      }),
    });
    useConceptPageRuntimeSnapshotMock.mockReturnValue({
      params: {
        speed: 18,
        angle: 45,
        gravity: 9.81,
      },
      activePresetId: null,
      activeGraphId: "trajectory",
      overlayValues: {
        rangeMarker: true,
      },
      focusedOverlayId: null,
      time: 0.75,
      timeSource: "live",
      compare: null,
    });
    useSavedSetupsMock.mockReturnValue([]);
    useSavedSetupsSyncStateMock.mockReturnValue({
      mode: "local",
      accountUser: null,
      lastSyncedAt: null,
      lastMergeSummary: null,
      errorMessage: null,
    });
    saveSavedSetupMock.mockReset();
    renameSavedSetupMock.mockReset();
    deleteSavedSetupMock.mockReset();
  });

  afterEach(() => {
    useAccountSessionMock.mockReset();
    useConceptPageRuntimeSnapshotMock.mockReset();
    useSavedSetupsSyncStateMock.mockReset();
  });

  function renderPanel() {
    return render(
      <ConceptShareLinksPanel
        conceptTitle="Projectile Motion"
        conceptId="concept-projectile-motion"
        conceptSlug="projectile-motion"
        simulationSource={simulationSource}
        featuredSetups={featuredSetups}
        items={stableItems}
        variant="compact"
      />,
    );
  }

  it("keeps stable links available while giving signed-out users sign-in and pricing paths", () => {
    renderPanel();

    expect(screen.getByRole("link", { name: /Earth shot/i })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/concepts\/projectile-motion\?state=v1\.[A-Za-z0-9_-]+&experiment=v1\.[A-Za-z0-9_-]+#interactive-lab$/),
    );
    expect(
      screen.getByText(enMessages.ConceptShareLinksPanel.premium.savedSetupsAndExactLinksTitle),
    ).toBeInTheDocument();
    expect(
      screen.getByText(enMessages.PremiumFeatureNotice.audience.signedOut),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: enMessages.PremiumFeatureNotice.actions.viewPlans }),
    ).toHaveAttribute(
      "href",
      "/pricing#compare",
    );
    expect(
      screen.getByRole("link", { name: enMessages.PremiumFeatureNotice.actions.signIn }),
    ).toHaveAttribute("href", "/account");
    expect(screen.queryByRole("link", { name: /^sign in$/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy concept page link" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy interactive lab link" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /copy current setup link/i })).not.toBeInTheDocument();
  });

  it("keeps stable links available while sending signed-in free users to pricing", () => {
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

    renderPanel();

    expect(screen.getByText(enMessages.PremiumFeatureNotice.audience.signedInFree)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: enMessages.PremiumFeatureNotice.actions.viewPlans }),
    ).toHaveAttribute(
      "href",
      "/pricing#compare",
    );
    expect(
      screen.queryByRole("link", { name: enMessages.PremiumFeatureNotice.actions.signIn }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^sign in$/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy concept page link" })).toBeInTheDocument();
  });

  it("shows exact-state sharing for premium users without a lock notice", () => {
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

    renderPanel();

    expect(screen.queryByText("Exact-state setup sharing")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy default setup link/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save setup" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open saved setups" })).toHaveAttribute(
      "href",
      "/account/setups",
    );
    expect(screen.queryByText("Current bench")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy concept page link" })).toBeInTheDocument();
  });

  it("shows the current saved setup when the exact bench already exists in the local library", () => {
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
    useSavedSetupsMock.mockReturnValue([
      {
        id: "a40f6f79-3248-44f4-a658-b6c9cf2f50e3",
        conceptId: "concept-projectile-motion",
        conceptSlug: "projectile-motion",
        conceptTitle: "Projectile Motion",
        title: "Default live bench",
        stateParam: null,
        publicExperimentParam: "v1.card",
        sourceType: "manual",
        createdAt: "2026-04-05T08:00:00.000Z",
        updatedAt: "2026-04-05T08:00:00.000Z",
        lastOpenedAt: null,
      },
    ]);

    renderPanel();

    expect(screen.getByText("Saved locally first")).toBeInTheDocument();
    expect(screen.getByText("Default live bench")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rename" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save setup" })).not.toBeInTheDocument();
  });

  it("shows the synced account label when saved setups are already synced", () => {
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
    useSavedSetupsMock.mockReturnValue([
      {
        id: "d7b67be2-f784-406a-95a6-9ec5f05f5612",
        conceptId: "concept-projectile-motion",
        conceptSlug: "projectile-motion",
        conceptTitle: "Projectile Motion",
        title: "Default live bench",
        stateParam: null,
        publicExperimentParam: "v1.card",
        sourceType: "manual",
        createdAt: "2026-04-05T08:00:00.000Z",
        updatedAt: "2026-04-05T08:00:00.000Z",
        lastOpenedAt: null,
      },
    ]);
    useSavedSetupsSyncStateMock.mockReturnValue({
      mode: "synced",
      accountUser: {
        id: "user-1",
      },
      lastSyncedAt: "2026-04-05T08:10:00.000Z",
      lastMergeSummary: null,
      errorMessage: null,
    });

    renderPanel();

    expect(
      screen.getByText(enMessages.ConceptShareLinksPanel.savedSetups.accountSaved),
    ).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(enMessages.ConceptShareLinksPanel.savedSetups.syncedToAccount, "i")),
    ).toBeInTheDocument();
  });

  it("routes compare scenes toward the compare library instead of the single saved-setup flow", () => {
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
    useConceptPageRuntimeSnapshotMock.mockReturnValue({
      params: {
        speed: 12,
        angle: 55,
        gravity: 9.81,
      },
      activePresetId: null,
      activeGraphId: "trajectory",
      overlayValues: {
        rangeMarker: true,
      },
      focusedOverlayId: "rangeMarker",
      time: 0,
      timeSource: "live",
      compare: {
        activeTarget: "b",
        setupA: {
          label: "Fast arc",
          params: {
            speed: 18,
            angle: 25,
            gravity: 9.81,
          },
          activePresetId: null,
        },
        setupB: {
          label: "High arc",
          params: {
            speed: 12,
            angle: 55,
            gravity: 9.81,
          },
          activePresetId: null,
        },
      },
    });

    renderPanel();

    expect(screen.getByText("Saved compare setups")).toBeInTheDocument();
    expect(
      screen.getByText(enMessages.ConceptShareLinksPanel.compare.description),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open compare library" })).toHaveAttribute(
      "href",
      "/account/compare-setups",
    );
    expect(screen.getByRole("link", { name: "Open saved setups" })).toHaveAttribute(
      "href",
      "/account/setups",
    );
    expect(screen.queryByRole("button", { name: "Save setup" })).not.toBeInTheDocument();
  });

  it("localizes stable section links in zh-HK instead of showing the canonical English labels", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    render(
      <ConceptShareLinksPanel
        conceptTitle="Projectile Motion"
        conceptId="concept-projectile-motion"
        conceptSlug="projectile-motion"
        simulationSource={simulationSource}
        featuredSetups={featuredSetups}
        items={localizedStableItems}
        variant="compact"
      />,
    );

    expect(
      screen.getByRole("button", { name: zhHkMessages.ConceptShareLinksPanel.aria.copyConceptPageLink }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: zhHkMessages.ConceptShareLinksPanel.aria.copyInteractiveLabLink }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: zhHkMessages.ConceptShareLinksPanel.aria.copyChallengeModeLink }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: zhHkMessages.ConceptShareLinksPanel.aria.copyWorkedExamplesLink }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: zhHkMessages.ConceptShareLinksPanel.aria.copyQuickTestLink }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: zhHkMessages.ConceptShareLinksPanel.aria.copyReadNextLink }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: zhHkMessages.PremiumFeatureNotice.actions.viewPlans }),
    ).toHaveAttribute("href", "/pricing#compare");
    expect(
      screen.getByRole("link", { name: zhHkMessages.PremiumFeatureNotice.actions.signIn }),
    ).toHaveAttribute("href", "/account");
    expect(screen.getByText(zhHkMessages.ConceptShareLinksPanel.links.challengeMode)).toBeInTheDocument();
    expect(screen.getByText(zhHkMessages.ConceptShareLinksPanel.links.workedExamples)).toBeInTheDocument();
    expect(screen.getByText(zhHkMessages.ConceptShareLinksPanel.links.quickTest)).toBeInTheDocument();
    expect(screen.getByText(zhHkMessages.ConceptShareLinksPanel.links.readNext)).toBeInTheDocument();
    expect(screen.queryByText("Challenge mode")).not.toBeInTheDocument();
    expect(screen.queryByText("Worked examples")).not.toBeInTheDocument();
    expect(screen.queryByText("Quick test")).not.toBeInTheDocument();
    expect(screen.queryByText("Read next")).not.toBeInTheDocument();
  });

  it("preserves the active locale in the reset-to-default bench link", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";
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
    useConceptPageRuntimeSnapshotMock.mockReturnValue({
      params: {
        speed: 24,
        angle: 52,
        gravity: 9.81,
      },
      activePresetId: null,
      activeGraphId: "trajectory",
      overlayValues: {
        rangeMarker: true,
      },
      focusedOverlayId: null,
      time: 0.75,
      timeSource: "live",
      compare: null,
    });

    renderPanel();

    expect(
      screen.getByRole("link", {
        name: zhHkMessages.ConceptShareLinksPanel.actions.openDefaultBench,
      }),
    ).toHaveAttribute("href", "/zh-HK/concepts/projectile-motion#interactive-lab");
  });
});
