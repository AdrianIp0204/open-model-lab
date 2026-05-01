// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAnonymousAccountEntitlement,
  getStoredAccountEntitlementForUser,
  hasAccountEntitlementCapability,
  resolveAccountEntitlement,
  resolveWorkedExampleAccessMode,
} from "@/lib/account/entitlements";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClientMock,
}));

describe("account entitlements", () => {
  afterEach(() => {
    mocks.createSupabaseServerClientMock.mockReset();
  });

  it("resolves signed-out users to the free entitlement", () => {
    const entitlement = getAnonymousAccountEntitlement();

    expect(entitlement.tier).toBe("free");
    expect(hasAccountEntitlementCapability(entitlement, "shouldShowAds")).toBe(true);
    expect(hasAccountEntitlementCapability(entitlement, "canSyncProgress")).toBe(false);
  });

  it("derives premium capabilities from the tier", () => {
    const entitlement = resolveAccountEntitlement({
      tier: "premium",
      source: "stored",
      updatedAt: "2026-04-02T00:00:00.000Z",
    });

    expect(entitlement.tier).toBe("premium");
    expect(hasAccountEntitlementCapability(entitlement, "shouldShowAds")).toBe(false);
    expect(hasAccountEntitlementCapability(entitlement, "canSaveCompareSetups")).toBe(true);
    expect(hasAccountEntitlementCapability(entitlement, "canShareStateLinks")).toBe(true);
    expect(hasAccountEntitlementCapability(entitlement, "canUseAdvancedStudyTools")).toBe(true);
    expect(resolveWorkedExampleAccessMode(entitlement)).toBe("live");
  });

  it("maps free entitlements to frozen worked examples", () => {
    expect(resolveWorkedExampleAccessMode(getAnonymousAccountEntitlement())).toBe("frozen");
  });

  it("defaults signed-in users without a stored row to free", async () => {
    mocks.createSupabaseServerClientMock.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          })),
        })),
      })),
    });

    const entitlement = await getStoredAccountEntitlementForUser("user-1", "sb-auth-token=1");

    expect(entitlement.tier).toBe("free");
    expect(entitlement.source).toBe("account-default");
    expect(hasAccountEntitlementCapability(entitlement, "canSyncProgress")).toBe(true);
  });
});
