// @vitest-environment node

import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as GET_COMPARE_RECOVERY } from "@/app/api/account/compare-setups/recovery/route";
import { POST as POST_COMPARE_SETUP } from "@/app/api/account/compare-setups/route";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";
import { getConceptBySlug } from "@/lib/content";
import {
  resolveConceptSimulationState,
  resolvePublicExperimentCard,
  type ConceptSimulationStateSource,
} from "@/lib/share-links";

const mocks = vi.hoisted(() => ({
  getAccountSessionForCookieHeaderMock: vi.fn(),
}));

vi.mock("@/lib/account/supabase", () => ({
  getAccountSessionForCookieHeader: mocks.getAccountSessionForCookieHeaderMock,
  getStoredProgressForCookieHeader: vi.fn(),
  mergeStoredProgressForCookieHeader: vi.fn(),
}));

let accountStorePath: string | null = null;
const SESSION_COOKIE = "sb-auth-token=1";

function buildSimulationSource(
  concept: ReturnType<typeof getConceptBySlug>,
): ConceptSimulationStateSource {
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

async function useIsolatedAccountStore() {
  accountStorePath = path.join(
    process.cwd(),
    "output",
    `account-compare-setup-recovery-${crypto.randomUUID()}.json`,
  );
  vi.stubEnv("OPEN_MODEL_LAB_ACCOUNT_STORE_PATH", accountStorePath);
}

describe("account compare setup recovery route", () => {
  beforeEach(() => {
    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue({
      user: {
        id: "user-1",
        email: "student@example.com",
        displayName: "Lab Student",
        createdAt: "2026-03-29T00:00:00.000Z",
        lastSignedInAt: "2026-03-29T01:00:00.000Z",
      },
      entitlement: resolveAccountEntitlement({
        tier: "premium",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
    });
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    mocks.getAccountSessionForCookieHeaderMock.mockReset();

    if (accountStorePath) {
      await fs.rm(accountStorePath, { force: true }).catch(() => undefined);
      await fs.rm(`${accountStorePath}.tmp`, { force: true }).catch(() => undefined);
      accountStorePath = null;
    }
  });

  it("returns recovery actions that reopen the saved compare bench through the concept deep link", async () => {
    await useIsolatedAccountStore();

    const concept = getConceptBySlug("projectile-motion");
    const sessionCookie = SESSION_COOKIE;

    await POST_COMPARE_SETUP(
      new Request("http://localhost/api/account/compare-setups", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: sessionCookie,
        },
        body: JSON.stringify({
          conceptId: concept.id,
          conceptSlug: concept.slug,
          name: "Fast arc vs high arc",
          activeGraphId: "trajectory",
          overlayValues: {
            rangeMarker: true,
          },
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
        }),
      }),
    );

    const recoveryResponse = await GET_COMPARE_RECOVERY(
      new Request(
        `http://localhost/api/account/compare-setups/recovery?concept=${encodeURIComponent(concept.slug)}`,
        {
          headers: {
            cookie: sessionCookie,
          },
        },
      ),
    );
    const recoveryPayload = (await recoveryResponse.json()) as {
      items: Array<{
        href: string;
        setupALabel: string;
        setupBLabel: string;
      }>;
    };

    expect(recoveryResponse.status).toBe(200);
    expect(recoveryPayload.items).toHaveLength(1);

    const href = recoveryPayload.items[0]?.href ?? "";

    expect(recoveryPayload.items[0]).toMatchObject({
      setupALabel: "Fast arc",
      setupBLabel: "High arc",
    });
    expect(href).toContain("/concepts/projectile-motion");
    expect(href).toContain("state=");
    expect(href).toContain("experiment=");
    expect(href).toContain("#live-bench");

    const resolvedState = resolveConceptSimulationState(
      new URL(href, "http://localhost").searchParams.get("state") ?? undefined,
      buildSimulationSource(concept),
    );
    const experimentCard = resolvePublicExperimentCard(
      new URL(href, "http://localhost").searchParams.get("experiment") ?? undefined,
      concept.slug,
    );

    expect(resolvedState).toMatchObject({
      params: {
        speed: 12,
        angle: 55,
        gravity: 9.81,
      },
      activePresetId: null,
      activeGraphId: "trajectory",
      overlayValues: expect.objectContaining({
        rangeMarker: true,
      }),
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
    expect(experimentCard).toEqual({
      title: "Fast arc vs high arc",
      prompt: "Open this saved compare bench and start testing Fast arc against High arc right away.",
      kind: "saved-compare",
    });
  });

  it("preserves the requested locale in recovery deep links", async () => {
    await useIsolatedAccountStore();

    const concept = getConceptBySlug("projectile-motion");
    const sessionCookie = SESSION_COOKIE;

    await POST_COMPARE_SETUP(
      new Request("http://localhost/api/account/compare-setups", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: sessionCookie,
        },
        body: JSON.stringify({
          conceptId: concept.id,
          conceptSlug: concept.slug,
          name: "Fast arc vs high arc",
          activeGraphId: "trajectory",
          overlayValues: {
            rangeMarker: true,
          },
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
        }),
      }),
    );

    const recoveryResponse = await GET_COMPARE_RECOVERY(
      new Request(
        `http://localhost/api/account/compare-setups/recovery?concept=${encodeURIComponent(concept.slug)}&locale=zh-HK`,
        {
          headers: {
            cookie: sessionCookie,
          },
        },
      ),
    );
    const recoveryPayload = (await recoveryResponse.json()) as {
      items: Array<{
        href: string;
      }>;
    };

    expect(recoveryResponse.status).toBe(200);
    expect(recoveryPayload.items[0]?.href).toContain("/zh-HK/concepts/projectile-motion");
  });

  it("returns premium required when recovery is requested from a free account", async () => {
    await useIsolatedAccountStore();

    mocks.getAccountSessionForCookieHeaderMock.mockResolvedValue({
      user: {
        id: "user-1",
        email: "student@example.com",
        displayName: "Lab Student",
        createdAt: "2026-03-29T00:00:00.000Z",
        lastSignedInAt: "2026-03-29T01:00:00.000Z",
      },
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
    });

    const concept = getConceptBySlug("projectile-motion");
    const response = await GET_COMPARE_RECOVERY(
      new Request(
        `http://localhost/api/account/compare-setups/recovery?concept=${encodeURIComponent(concept.slug)}`,
        {
          headers: {
            cookie: SESSION_COOKIE,
          },
        },
      ),
    );
    const payload = (await response.json()) as {
      code: string;
    };

    expect(response.status).toBe(403);
    expect(payload.code).toBe("premium_required");
  });
});
