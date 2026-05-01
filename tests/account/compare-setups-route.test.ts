// @vitest-environment node

import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DELETE,
  GET,
  PATCH,
  POST,
  PUT,
} from "@/app/api/account/compare-setups/route";
import { MAX_SAVED_COMPARE_SETUPS_PER_CONCEPT } from "@/lib/account/compare-setups";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";
import { getConceptBySlug } from "@/lib/content";
import { encodeConceptSimulationState, encodePublicExperimentCard } from "@/lib/share-links";

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

async function useIsolatedAccountStore() {
  accountStorePath = path.join(
    process.cwd(),
    "output",
    `account-compare-setups-${crypto.randomUUID()}.json`,
  );
  vi.stubEnv("OPEN_MODEL_LAB_ACCOUNT_STORE_PATH", accountStorePath);
}

function buildCanonicalCompareDraft(title = "Fast arc vs high arc") {
  const concept = getConceptBySlug("projectile-motion");
  const simulationSource = {
    slug: concept.slug,
    simulation: {
      defaults: concept.simulation.defaults,
      presets: concept.simulation.presets,
      overlays: concept.simulation.overlays,
      graphs: concept.graphs,
    },
  };
  const stateParam =
    encodeConceptSimulationState(simulationSource, {
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
    }) ?? "";

  return {
    concept,
    draft: {
      conceptId: concept.id,
      conceptSlug: concept.slug,
      conceptTitle: concept.title,
      title,
      stateParam,
      publicExperimentParam: encodePublicExperimentCard({
        conceptSlug: concept.slug,
        title,
        prompt:
          "Open this saved compare bench and start testing Fast arc against High arc right away.",
        kind: "saved-compare",
      }),
      setupALabel: "Fast arc",
      setupBLabel: "High arc",
      sourceType: "manual" as const,
    },
  };
}

describe("account compare setups route", () => {
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

  it("saves, renames, reads, and deletes concept-scoped compare setups", async () => {
    await useIsolatedAccountStore();

    const { concept, draft } = buildCanonicalCompareDraft();

    const createResponse = await POST(
      new Request("http://localhost/api/account/compare-setups", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: SESSION_COOKIE,
        },
        body: JSON.stringify(draft),
      }),
    );
    const createPayload = (await createResponse.json()) as {
      items: Array<{ id: string; title: string; stateParam: string }>;
      savedSetup: { id: string; title: string; stateParam: string };
    };

    expect(createResponse.status).toBe(200);
    expect(createPayload.savedSetup.title).toBe("Fast arc vs high arc");
    expect(createPayload.savedSetup.stateParam).toBe(draft.stateParam);
    expect(createPayload.items).toHaveLength(1);

    const renameResponse = await PATCH(
      new Request("http://localhost/api/account/compare-setups", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: SESSION_COOKIE,
        },
        body: JSON.stringify({
          conceptSlug: concept.slug,
          id: createPayload.savedSetup.id,
          title: "Baseline vs variant",
        }),
      }),
    );
    const renamePayload = (await renameResponse.json()) as {
      items: Array<{ id: string; title: string }>;
      savedSetup: { title: string };
    };

    expect(renameResponse.status).toBe(200);
    expect(renamePayload.savedSetup.title).toBe("Baseline vs variant");
    expect(renamePayload.items[0]?.title).toBe("Baseline vs variant");

    const readResponse = await GET(
      new Request(
        `http://localhost/api/account/compare-setups?concept=${encodeURIComponent(concept.slug)}`,
        {
          headers: {
            cookie: SESSION_COOKIE,
          },
        },
      ),
    );
    const readPayload = (await readResponse.json()) as {
      items: Array<{ id: string; title: string; setupALabel: string; setupBLabel: string }>;
    };

    expect(readResponse.status).toBe(200);
    expect(readPayload.items).toHaveLength(1);
    expect(readPayload.items[0]).toMatchObject({
      title: "Baseline vs variant",
      setupALabel: "Fast arc",
      setupBLabel: "High arc",
    });

    const deleteResponse = await DELETE(
      new Request("http://localhost/api/account/compare-setups", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
          cookie: SESSION_COOKIE,
        },
        body: JSON.stringify({
          conceptSlug: concept.slug,
          id: createPayload.savedSetup.id,
        }),
      }),
    );
    const deletePayload = (await deleteResponse.json()) as {
      items: unknown[];
    };

    expect(deleteResponse.status).toBe(200);
    expect(deletePayload.items).toEqual([]);
  });

  it("syncs the full compare snapshot for signed-in premium accounts", async () => {
    await useIsolatedAccountStore();

    const { draft } = buildCanonicalCompareDraft();

    const response = await PUT(
      new Request("http://localhost/api/account/compare-setups", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          cookie: SESSION_COOKIE,
        },
        body: JSON.stringify({
          snapshot: {
            version: "v1",
            items: [
              {
                id: crypto.randomUUID(),
                ...draft,
                createdAt: "2026-04-05T08:00:00.000Z",
                updatedAt: "2026-04-05T08:00:00.000Z",
                lastOpenedAt: null,
              },
            ],
            tombstones: [],
          },
        }),
      }),
    );
    const payload = (await response.json()) as {
      snapshot: { version: string; items: Array<{ title: string }> };
      mergeSummary: { mergedSetupCount: number };
    };

    expect(response.status).toBe(200);
    expect(payload.snapshot.version).toBe("v1");
    expect(payload.snapshot.items).toHaveLength(1);
    expect(payload.snapshot.items[0]?.title).toBe("Fast arc vs high arc");
    expect(payload.mergeSummary.mergedSetupCount).toBe(1);

    const readResponse = await GET(
      new Request("http://localhost/api/account/compare-setups", {
        headers: {
          cookie: SESSION_COOKIE,
        },
      }),
    );
    const readPayload = (await readResponse.json()) as {
      snapshot: { items: Array<{ title: string }> };
    };

    expect(readResponse.status).toBe(200);
    expect(readPayload.snapshot.items[0]?.title).toBe("Fast arc vs high arc");
  });

  it("enforces the per-concept compare library limit", async () => {
    await useIsolatedAccountStore();

    const { draft } = buildCanonicalCompareDraft();

    for (let index = 0; index < MAX_SAVED_COMPARE_SETUPS_PER_CONCEPT; index += 1) {
      const response = await POST(
        new Request("http://localhost/api/account/compare-setups", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            cookie: SESSION_COOKIE,
          },
          body: JSON.stringify({
            ...draft,
            title: `Compare setup ${index + 1}`,
            stateParam: `${draft.stateParam}.${index + 1}`,
          }),
        }),
      );

      expect(response.status).toBe(200);
    }

    const limitResponse = await POST(
      new Request("http://localhost/api/account/compare-setups", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: SESSION_COOKIE,
        },
        body: JSON.stringify({
          ...draft,
          title: "Overflow compare setup",
          stateParam: `${draft.stateParam}.overflow`,
        }),
      }),
    );
    const limitPayload = (await limitResponse.json()) as {
      code: string;
    };

    expect(limitResponse.status).toBe(409);
    expect(limitPayload.code).toBe("compare_setup_limit_reached");
  });
});
