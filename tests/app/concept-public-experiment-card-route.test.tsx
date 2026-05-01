import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ConceptPage from "@/app/concepts/[slug]/page";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";
import type { SavedCompareSetupRecord } from "@/lib/account/compare-setups";
import { buildSavedCompareSetupRecoveryAction } from "@/lib/account/compare-setup-recovery";
import { getConceptBySlug, type ConceptContent } from "@/lib/content";
import {
  encodeConceptSimulationState,
  encodePublicExperimentCard,
  type ConceptSimulationStateSource,
} from "@/lib/share-links";

const mocks = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  notFoundMock: vi.fn(),
  redirectMock: vi.fn(),
  getOptionalStoredProgressForCookieHeaderMock: vi.fn(),
  getAccountSessionForCookieHeaderMock: vi.fn(),
  useAccountSessionMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookiesMock,
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFoundMock,
  redirect: mocks.redirectMock,
  usePathname: () => "/concepts/projectile-motion",
  useSearchParams: () => new URLSearchParams(globalThis.__TEST_SEARCH_PARAMS__ ?? ""),
}));

vi.mock("@/lib/account/server-store", () => ({
  getOptionalStoredProgressForCookieHeader: mocks.getOptionalStoredProgressForCookieHeaderMock,
}));

vi.mock("@/lib/account/supabase", () => ({
  getAccountSessionForCookieHeader: mocks.getAccountSessionForCookieHeaderMock,
}));

vi.mock("@/lib/account/client", () => ({
  useAccountSession: () => mocks.useAccountSessionMock(),
}));

function buildSimulationSource(concept: ConceptContent): ConceptSimulationStateSource {
  return {
    slug: concept.slug,
    simulation: {
      defaults: concept.simulation.defaults,
      presets: concept.simulation.presets,
      overlays: concept.simulation.overlays,
      graphs: concept.graphs,
    },
  };
}

describe("concept public experiment card route", () => {
  afterEach(() => {
    mocks.cookiesMock.mockReset();
    mocks.notFoundMock.mockReset();
    mocks.redirectMock.mockReset();
    mocks.getOptionalStoredProgressForCookieHeaderMock.mockReset();
    mocks.getAccountSessionForCookieHeaderMock.mockReset();
    mocks.useAccountSessionMock.mockReset();
  });

  it("renders a saved compare setup-link card and reopens the live bench in compare mode", async () => {
    mocks.useAccountSessionMock.mockReturnValue({
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
    mocks.cookiesMock.mockResolvedValue({
      toString: () => "",
    });
    mocks.getOptionalStoredProgressForCookieHeaderMock.mockResolvedValue({
      storedProgress: null,
      unavailable: false,
    });
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue({
      user: { id: "user-1" },
      entitlement: resolveAccountEntitlement({
        tier: "premium",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
    });

    const concept = getConceptBySlug("projectile-motion");
    const simulationSource = buildSimulationSource(concept);
    const savedSetup: SavedCompareSetupRecord = {
      id: "8d685126-39d7-4553-ac96-6d5b17743ef5",
      conceptId: concept.id,
      conceptSlug: concept.slug,
      conceptTitle: concept.title,
      title: "Earth vs moon arc",
      stateParam:
        encodeConceptSimulationState(simulationSource, {
          params: {
            ...concept.simulation.defaults,
            angle: 45,
            gravity: 1.6,
          },
          activePresetId: "moon-hop",
          activeGraphId: "velocity",
          overlayValues: {
            rangeMarker: true,
            apexMarker: true,
          },
          focusedOverlayId: "rangeMarker",
          time: 0,
          timeSource: "live",
          compare: {
            activeTarget: "b",
            setupA: {
              label: "Earth shot",
              params: {
                ...concept.simulation.defaults,
                angle: 28,
              },
              activePresetId: "shallow-arc",
            },
            setupB: {
              label: "Moon hop",
              params: {
                ...concept.simulation.defaults,
                angle: 45,
                gravity: 1.6,
              },
              activePresetId: "moon-hop",
            },
          },
        }) ?? "",
      publicExperimentParam: encodePublicExperimentCard({
        conceptSlug: concept.slug,
        title: "Earth vs moon arc",
        prompt:
          "Open this saved compare bench and start testing Earth shot against Moon hop right away.",
        kind: "saved-compare",
      }),
      setupALabel: "Earth shot",
      setupBLabel: "Moon hop",
      sourceType: "manual",
      createdAt: "2026-03-29T00:00:00.000Z",
      updatedAt: "2026-03-29T00:05:00.000Z",
      lastOpenedAt: null,
    };
    const href = buildSavedCompareSetupRecoveryAction({ savedSetup }).href;
    const shareUrl = new URL(href, "http://localhost");

    render(
      await ConceptPage({
        params: Promise.resolve({ slug: concept.slug }),
        searchParams: Promise.resolve(
          Object.fromEntries(shareUrl.searchParams.entries()),
        ),
      }),
    );

    expect(screen.getByText(/^Setup link$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Saved compare setup$/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /^Earth vs moon arc$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Open this saved compare bench and start testing Earth shot against Moon hop right away\./i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /try this setup/i })).toHaveAttribute(
      "href",
      "#live-bench",
    );

    expect(
      screen.getAllByRole("button", { name: /copy compare setup link/i }).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/earth shot vs moon hop/i).length).toBeGreaterThan(0);
  });

  it("falls back safely when the requested setup state is invalid", async () => {
    mocks.useAccountSessionMock.mockReturnValue({
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
    mocks.cookiesMock.mockResolvedValue({
      toString: () => "",
    });
    mocks.getOptionalStoredProgressForCookieHeaderMock.mockResolvedValue({
      storedProgress: null,
      unavailable: false,
    });
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue({
      user: { id: "user-1" },
      entitlement: resolveAccountEntitlement({
        tier: "premium",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
    });

    render(
      await ConceptPage({
        params: Promise.resolve({ slug: "projectile-motion" }),
        searchParams: Promise.resolve({
          state: "v1.not-a-real-setup",
        }),
      }),
    );

    expect(
      screen.getAllByText(
        /this setup link could not be restored cleanly, so the concept page opened on the safest default bench instead\./i,
      ).length,
    ).toBeGreaterThan(0);
    expect(
      screen
        .getAllByRole("link", { name: /open default bench/i })
        .some((link) => link.getAttribute("href") === "/concepts/projectile-motion#interactive-lab"),
    ).toBe(true);
    expect(screen.queryByText(/^Setup link$/i)).not.toBeInTheDocument();
  });
});
