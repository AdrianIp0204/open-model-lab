import { z } from "zod";
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/lib/supabase/server";

const USER_ENTITLEMENTS_TABLE = "user_entitlements";

export const accountEntitlementTierSchema = z.enum(["free", "premium"]);

export type AccountEntitlementTier = z.infer<typeof accountEntitlementTierSchema>;

export type AccountEntitlementCapabilities = {
  shouldShowAds: boolean;
  canSyncProgress: boolean;
  canSaveCompareSetups: boolean;
  canShareStateLinks: boolean;
  canUseAdvancedStudyTools: boolean;
};

export type WorkedExampleAccessMode = "frozen" | "live";

export type ResolvedAccountEntitlement = {
  tier: AccountEntitlementTier;
  source: "anonymous-default" | "account-default" | "stored" | "billing-profile";
  updatedAt: string | null;
  capabilities: AccountEntitlementCapabilities;
};

type StoredAccountEntitlementRow = {
  tier: string | null;
  updated_at: string | null;
};

const FREE_ANONYMOUS_CAPABILITIES: AccountEntitlementCapabilities = {
  shouldShowAds: true,
  canSyncProgress: false,
  canSaveCompareSetups: false,
  canShareStateLinks: false,
  canUseAdvancedStudyTools: false,
};

const FREE_SIGNED_IN_CAPABILITIES: AccountEntitlementCapabilities = {
  ...FREE_ANONYMOUS_CAPABILITIES,
  canSyncProgress: true,
};

const PREMIUM_CAPABILITIES: AccountEntitlementCapabilities = {
  shouldShowAds: false,
  canSyncProgress: true,
  canSaveCompareSetups: true,
  canShareStateLinks: true,
  canUseAdvancedStudyTools: true,
};

export function getAccountEntitlementCapabilities(
  input: {
    tier: AccountEntitlementTier;
    source: ResolvedAccountEntitlement["source"];
  },
): AccountEntitlementCapabilities {
  if (input.tier === "premium") {
    return { ...PREMIUM_CAPABILITIES };
  }

  return input.source === "anonymous-default"
    ? { ...FREE_ANONYMOUS_CAPABILITIES }
    : { ...FREE_SIGNED_IN_CAPABILITIES };
}

export function resolveAccountEntitlement(input: {
  tier: AccountEntitlementTier;
  source: ResolvedAccountEntitlement["source"];
  updatedAt?: string | null;
}): ResolvedAccountEntitlement {
  return {
    tier: input.tier,
    source: input.source,
    updatedAt: input.updatedAt ?? null,
    capabilities: getAccountEntitlementCapabilities({
      tier: input.tier,
      source: input.source,
    }),
  };
}

export function getAnonymousAccountEntitlement() {
  return resolveAccountEntitlement({
    tier: "free",
    source: "anonymous-default",
  });
}

export function getDefaultSignedInAccountEntitlement() {
  return resolveAccountEntitlement({
    tier: "free",
    source: "account-default",
  });
}

export function hasAccountEntitlementCapability(
  entitlement: ResolvedAccountEntitlement,
  capability: keyof AccountEntitlementCapabilities,
) {
  return entitlement.capabilities[capability];
}

export function resolveWorkedExampleAccessMode(
  entitlement: Pick<ResolvedAccountEntitlement, "capabilities"> | null | undefined,
): WorkedExampleAccessMode {
  return entitlement?.capabilities.canUseAdvancedStudyTools ? "live" : "frozen";
}

export async function getStoredAccountEntitlementForUser(
  userId: string,
  cookieHeader: string | null,
) {
  const supabase = createSupabaseServerClient({ cookieHeader });
  const { data, error } = await supabase
    .from(USER_ENTITLEMENTS_TABLE)
    .select("tier, updated_at")
    .eq("user_id", userId)
    .maybeSingle<StoredAccountEntitlementRow>();

  if (error) {
    throw error;
  }

  const parsedTier = accountEntitlementTierSchema.safeParse(data?.tier);

  if (!parsedTier.success) {
    return getDefaultSignedInAccountEntitlement();
  }

  return resolveAccountEntitlement({
    tier: parsedTier.data,
    source: "stored",
    updatedAt:
      typeof data?.updated_at === "string" && data.updated_at ? data.updated_at : null,
  });
}

export async function setStoredAccountEntitlementForUser(
  userId: string,
  tier: AccountEntitlementTier,
) {
  const supabase = createSupabaseServiceRoleClient();
  const updatedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from(USER_ENTITLEMENTS_TABLE)
    .upsert({
      user_id: userId,
      tier,
      updated_at: updatedAt,
    })
    .select("tier, updated_at")
    .single<StoredAccountEntitlementRow>();

  if (error) {
    throw error;
  }

  return resolveAccountEntitlement({
    tier,
    source: "stored",
    updatedAt:
      typeof data?.updated_at === "string" && data.updated_at ? data.updated_at : updatedAt,
  });
}
