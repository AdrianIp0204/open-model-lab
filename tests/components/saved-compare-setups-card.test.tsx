// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SavedCompareSetupsCard } from "@/components/concepts/SavedCompareSetupsCard";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";
import {
  localSavedCompareSetupsStore,
  saveSavedCompareSetup,
} from "@/lib/saved-compare-setups-store";
import { buildConceptSimulationStateLinkPayload } from "@/lib/share-links";

const useAccountSessionMock = vi.fn();

vi.mock("@/lib/account/client", () => ({
  useAccountSession: () => useAccountSessionMock(),
}));

describe("SavedCompareSetupsCard", () => {
  const concept = {
    id: "concept-projectile-motion",
    slug: "projectile-motion",
    title: "Projectile Motion",
  };
  const simulationSource = {
    slug: "projectile-motion",
    simulation: {
      defaults: {
        speed: 18,
        angle: 45,
        gravity: 9.81,
      },
      presets: [],
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
  const compare = {
    activeTarget: "b" as const,
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
  };

  function buildCurrentComparePayload() {
    return buildConceptSimulationStateLinkPayload({
      source: simulationSource,
      conceptSlug: concept.slug,
      hash: "live-bench",
      state: {
        params: compare.setupB.params,
        activePresetId: compare.setupB.activePresetId,
        activeGraphId: "trajectory",
        overlayValues: {
          rangeMarker: true,
        },
        focusedOverlayId: "rangeMarker",
        time: 0,
        timeSource: "live",
        compare,
      },
      publicExperimentCard: {
        conceptSlug: concept.slug,
        title: "Fast arc vs high arc",
        prompt:
          "Open this saved compare bench and start testing Fast arc against High arc right away.",
        kind: "saved-compare",
      },
    });
  }

  function renderCard(options: { onRestore?: (setup: unknown) => void } = {}) {
    return render(
      <SavedCompareSetupsCard
        concept={concept}
        simulationSource={simulationSource}
        compare={compare}
        activeGraphId="trajectory"
        overlayValues={{
          rangeMarker: true,
        }}
        onRestore={options.onRestore ?? (() => undefined)}
      />,
    );
  }

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
    window.localStorage.clear();
    localSavedCompareSetupsStore.resetForTests();
    useAccountSessionMock.mockReset();
  });

  it("saves the current compare bench into the compare library", async () => {
    const user = userEvent.setup();

    renderCard();

    await user.type(screen.getByLabelText("Compare setup name"), "Fast arc vs high arc");
    await user.click(screen.getByRole("button", { name: "Save compare setup" }));

    expect(
      screen.getByText(
        'Saved "Fast arc vs high arc" locally. Account sync will carry it to the compare library next.',
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Fast arc vs high arc").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Open compare library" })).toHaveAttribute(
      "href",
      "/en/account/compare-setups",
    );
  });

  it("restores an already-saved compare scene from the local library", async () => {
    const user = userEvent.setup();
    const onRestore = vi.fn();
    const payload = buildCurrentComparePayload();
    const saved = saveSavedCompareSetup({
      conceptId: concept.id,
      conceptSlug: concept.slug,
      conceptTitle: concept.title,
      title: "Fast arc vs high arc",
      stateParam: payload.stateParam!,
      publicExperimentParam: payload.publicExperimentParam,
      setupALabel: compare.setupA.label,
      setupBLabel: compare.setupB.label,
      sourceType: "manual",
    }).savedSetup;

    renderCard({ onRestore });

    expect(
      screen.getByText("This exact A/B scene is already in your synced compare library."),
    ).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Restore" })[0]!);

    expect(onRestore).toHaveBeenCalledWith(saved);
    expect(screen.getByText('Restored "Fast arc vs high arc".')).toBeInTheDocument();
  });

  it("keeps signed-out compare mode live while compare saves stay premium", () => {
    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-out",
      user: null,
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "anonymous-default",
      }),
    });

    renderCard();

    expect(
      screen.getByText(/compare mode still works live while you are signed out/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View Supporter plan" })).toHaveAttribute(
      "href",
      "/pricing#compare",
    );
    expect(screen.getByRole("link", { name: /sign in for sync/i })).toHaveAttribute(
      "href",
      "/account",
    );
  });

  it("preserves the active locale in compare setup links", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";
    const payload = buildCurrentComparePayload();

    saveSavedCompareSetup({
      conceptId: concept.id,
      conceptSlug: concept.slug,
      conceptTitle: concept.title,
      title: "Fast arc vs high arc",
      stateParam: payload.stateParam!,
      publicExperimentParam: payload.publicExperimentParam,
      setupALabel: compare.setupA.label,
      setupBLabel: compare.setupB.label,
      sourceType: "manual",
    });

    renderCard();

    expect(screen.getByRole("link", { name: "Open compare library" })).toHaveAttribute(
      "href",
      "/zh-HK/account/compare-setups",
    );
    expect(screen.getByRole("link", { name: "Open" })).toHaveAttribute(
      "href",
      `/zh-HK/concepts/projectile-motion?state=${payload.stateParam}&experiment=${payload.publicExperimentParam}#live-bench`,
    );
  });
});
