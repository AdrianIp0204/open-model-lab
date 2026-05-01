import { createClient } from "@supabase/supabase-js";
import type { EmailOtpType, User } from "@supabase/supabase-js";
import {
  type SavedContinueLearningState,
  deriveSavedContinueLearningState,
} from "@/lib/account/progress-sync";
import {
  createEmptyProgressSnapshot,
  normalizeProgressSnapshot,
  type ProgressSnapshot,
} from "@/lib/progress/model";
import {
  createEmptyProgressHistoryStore,
  normalizeProgressHistoryStore,
  updateProgressHistoryStore,
  type ProgressHistoryStore,
} from "@/lib/progress/history";
import {
  mergeProgressSnapshots,
  summarizeProgressMerge,
  type ProgressMergeSummary,
} from "@/lib/progress/sync";
import {
  getConceptSummaries,
  getStarterTracks,
  getSubjectDiscoverySummaries,
} from "@/lib/content";
import { buildSiteUrl, getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { NextResponse } from "next/server";
import {
  getStripeBillingPortalConfigDiagnostics,
  getStripeBillingConfig,
  getStripeCheckoutConfigDiagnostics,
  type StripeBillingConfigIssue,
} from "@/lib/billing/env";
import { getAccountBillingSummaryForUser } from "@/lib/billing/store";
import {
  deriveEntitlementTierFromBillingSummary,
  getDefaultAccountBillingSummary,
} from "@/lib/billing/model";
import {
  getDefaultSignedInAccountEntitlement,
  getStoredAccountEntitlementForUser,
  resolveAccountEntitlement,
} from "./entitlements";
import {
  getDevAccountHarnessStoredProgressForCookieHeader,
  mergeDevAccountHarnessStoredProgressForCookieHeader,
  resolveDevAccountHarnessSession,
  setDevAccountHarnessStateCookie,
} from "./dev-harness";
import type { AccountSession, AccountUserSummary } from "./model";

const SYNCED_PROGRESS_TABLE = "user_concept_progress_snapshots";

type StoredSyncedProgressRow = {
  snapshot: unknown;
  history: unknown;
  updated_at: string | null;
};

type StoredLegacySyncedProgressRow = {
  snapshot: unknown;
  updated_at: string | null;
};

type StoredProgressResult = {
  snapshot: ProgressSnapshot;
  history: ProgressHistoryStore;
  updatedAt: string;
  continueLearningState: SavedContinueLearningState | null;
};

type ProgressMergeResult = StoredProgressResult & {
  mergeSummary: ProgressMergeSummary;
};

let cachedProgressHistoryCatalog:
  | {
      concepts: ReturnType<typeof getConceptSummaries>;
      subjects: ReturnType<typeof getSubjectDiscoverySummaries>;
      starterTracks: ReturnType<typeof getStarterTracks>;
    }
  | null = null;

function getProgressHistoryCatalog() {
  if (cachedProgressHistoryCatalog) {
    return cachedProgressHistoryCatalog;
  }

  cachedProgressHistoryCatalog = {
    concepts: getConceptSummaries(),
    subjects: getSubjectDiscoverySummaries(),
    starterTracks: getStarterTracks(),
  };

  return cachedProgressHistoryCatalog;
}

export type OptionalAccountDependencyFailure = {
  kind:
    | "missing_relation"
    | "missing_column"
    | "not_configured"
    | "unexpected_runtime"
    | "query_failed";
  code: string | null;
  message: string | null;
  relationName: string | null;
  columnName?: string | null;
};

function readErrorCode(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && code ? code : null;
}

function readErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (!error || typeof error !== "object") {
    return null;
  }

  const message = (error as { message?: unknown }).message;
  return typeof message === "string" && message ? message : null;
}

function readErrorName(error: unknown) {
  if (error instanceof Error) {
    return error.name;
  }

  if (!error || typeof error !== "object") {
    return null;
  }

  const name = (error as { name?: unknown }).name;
  return typeof name === "string" && name ? name : null;
}

function extractMissingRelationName(message: string | null) {
  if (!message) {
    return null;
  }

  const relationMatch = message.match(/relation\s+"([^"]+)"/i);

  if (relationMatch?.[1]) {
    return relationMatch[1];
  }

  const tableMatch = message.match(/table\s+'([^']+)'/i);

  if (tableMatch?.[1]) {
    return tableMatch[1];
  }

  return null;
}

function extractMissingColumnDetails(message: string | null) {
  if (!message) {
    return {
      relationName: null,
      columnName: null,
    };
  }

  const schemaCacheMatch = message.match(
    /could not find the ['"]([^'"]+)['"] column of ['"]([^'"]+)['"] in the schema cache/i,
  );

  if (schemaCacheMatch?.[1] && schemaCacheMatch?.[2]) {
    return {
      relationName: schemaCacheMatch[2],
      columnName: schemaCacheMatch[1],
    };
  }

  const relationColumnMatch = message.match(
    /column\s+(?:"?([^".\s]+)"?\.)?"?([^".\s]+)"?\s+does not exist/i,
  );

  if (relationColumnMatch?.[2]) {
    return {
      relationName: relationColumnMatch[1] ?? null,
      columnName: relationColumnMatch[2],
    };
  }

  return {
    relationName: null,
    columnName: null,
  };
}

export function describeOptionalAccountDependencyFailure(
  error: unknown,
  relationName?: string,
): OptionalAccountDependencyFailure {
  const code = readErrorCode(error);
  const message = readErrorMessage(error);
  const errorName = readErrorName(error);
  const normalizedMessage = message?.toLowerCase() ?? "";
  const normalizedRelationName = relationName?.toLowerCase() ?? null;
  const parsedRelationName = extractMissingRelationName(message);
  const missingColumnDetails = extractMissingColumnDetails(message);
  const mentionsRelation =
    normalizedRelationName !== null &&
    (normalizedMessage.includes(normalizedRelationName) ||
      parsedRelationName?.toLowerCase() === normalizedRelationName);

  if (
    code === "42703" ||
    code === "PGRST204" ||
    missingColumnDetails.columnName !== null
  ) {
    return {
      kind: "missing_column",
      code,
      message,
      relationName:
        missingColumnDetails.relationName ?? parsedRelationName ?? relationName ?? null,
      columnName: missingColumnDetails.columnName,
    };
  }

  if (
    code === "42P01" ||
    code === "PGRST205" ||
    parsedRelationName !== null ||
    (mentionsRelation &&
      (normalizedMessage.includes("does not exist") ||
        normalizedMessage.includes("could not find") ||
        normalizedMessage.includes("schema cache") ||
        normalizedMessage.includes("not found")))
  ) {
    return {
      kind: "missing_relation",
      code,
      message,
      relationName: parsedRelationName ?? relationName ?? null,
    };
  }

  if (
    normalizedMessage.includes("not configured") ||
    normalizedMessage.includes("not set") ||
    normalizedMessage.includes("invalid api key") ||
    normalizedMessage.includes("no api key found in request")
  ) {
    return {
      kind: "not_configured",
      code,
      message,
      relationName: null,
    };
  }

  if (
    errorName === "TypeError" &&
    (normalizedMessage.includes("undefined") ||
      normalizedMessage.includes("null") ||
      normalizedMessage.includes("cannot read"))
  ) {
    return {
      kind: "unexpected_runtime",
      code,
      message,
      relationName: null,
    };
  }

  return {
    kind: "query_failed",
    code,
    message,
    relationName: null,
  };
}

export function shouldLogOptionalAccountDependencyFailureAsError(
  failure: OptionalAccountDependencyFailure,
) {
  return failure.kind === "query_failed" || failure.kind === "unexpected_runtime";
}

function isMissingSyncedProgressHistoryColumnFailure(error: unknown) {
  const failure = describeOptionalAccountDependencyFailure(error, SYNCED_PROGRESS_TABLE);

  return (
    failure.kind === "missing_column" &&
    failure.columnName === "history" &&
    (!failure.relationName || failure.relationName === SYNCED_PROGRESS_TABLE)
  );
}

type AccountSessionResolutionStage =
  | "start"
  | "auth_user_resolution"
  | "entitlement_lookup"
  | "billing_summary_lookup"
  | "billing_config_evaluation"
  | "session_construction";

function readCookiePresence(cookieHeader: string | null) {
  return Boolean(cookieHeader?.trim());
}

function toAccountUserSummary(user: User): AccountUserSummary {
  const email = user.email ?? "";
  const rawDisplayName =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : email.split("@")[0] ?? "Learner";

  return {
    id: user.id,
    email,
    displayName: rawDisplayName || "Learner",
    createdAt: user.created_at,
    lastSignedInAt: user.last_sign_in_at ?? null,
  };
}

async function getAuthenticatedUser(cookieHeader: string | null) {
  const supabase = createSupabaseServerClient({ cookieHeader });
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    if (
      error.message === "Auth session missing!" ||
      error.name === "AuthSessionMissingError"
    ) {
      return null;
    }

    throw error;
  }

  return user ?? null;
}

async function getStoredSnapshotForUser(
  userId: string,
  cookieHeader: string | null,
) {
  const supabase = createSupabaseServerClient({ cookieHeader });

  try {
    const { data, error } = await supabase
      .from(SYNCED_PROGRESS_TABLE)
      .select("snapshot, history, updated_at")
      .eq("user_id", userId)
      .maybeSingle<StoredSyncedProgressRow>();

    if (error) {
      throw error;
    }

    return {
      snapshot: normalizeProgressSnapshot(data?.snapshot),
      history: normalizeProgressHistoryStore(data?.history),
      updatedAt:
        typeof data?.updated_at === "string" && data.updated_at
          ? data.updated_at
          : null,
    };
  } catch (error) {
    if (!isMissingSyncedProgressHistoryColumnFailure(error)) {
      throw error;
    }

    console.warn("[account] synced progress history column unavailable during read", {
      userId,
      relationName: SYNCED_PROGRESS_TABLE,
      columnName: "history",
      fallback: "snapshot_only_progress_read",
    });

    const { data, error: legacyError } = await supabase
      .from(SYNCED_PROGRESS_TABLE)
      .select("snapshot, updated_at")
      .eq("user_id", userId)
      .maybeSingle<StoredLegacySyncedProgressRow>();

    if (legacyError) {
      throw legacyError;
    }

    return {
      snapshot: normalizeProgressSnapshot(data?.snapshot),
      history: createEmptyProgressHistoryStore(),
      updatedAt:
        typeof data?.updated_at === "string" && data.updated_at
          ? data.updated_at
          : null,
    };
  }
}

function createStatelessSupabaseAuthClient() {
  return createClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

function sanitizeAuthRedirectNextPath(
  nextPath: string | null | undefined,
  fallbackPath: string,
) {
  return nextPath && nextPath.startsWith("/") ? nextPath : fallbackPath;
}

export async function sendMagicLink(email: string, nextPath?: string | null) {
  const supabase = createStatelessSupabaseAuthClient();
  const continuePath = sanitizeAuthRedirectNextPath(nextPath, "/dashboard");
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: buildSiteUrl(
        `/auth/confirm?next=${encodeURIComponent(continuePath)}`,
      ),
    },
  });

  if (error) {
    throw error;
  }
}

export async function signInWithAccountPassword(
  input: {
    cookieHeader: string | null;
    response: NextResponse;
    email: string;
    password: string;
  },
) {
  const supabase = createSupabaseServerClient({
    cookieHeader: input.cookieHeader,
    response: input.response,
  });
  const { error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error) {
    throw error;
  }
}

export async function sendPasswordResetEmail(email: string, nextPath?: string | null) {
  const supabase = createStatelessSupabaseAuthClient();
  const continuePath = sanitizeAuthRedirectNextPath(nextPath, "/account/reset-password");
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: buildSiteUrl(`/auth/confirm?next=${encodeURIComponent(continuePath)}`),
  });

  if (error) {
    throw error;
  }
}

export async function exchangeAuthCode(
  input: {
    cookieHeader: string | null;
    response: NextResponse;
    code: string;
  },
) {
  const supabase = createSupabaseServerClient({
    cookieHeader: input.cookieHeader,
    response: input.response,
  });
  const { data, error } = await supabase.auth.exchangeCodeForSession(input.code);

  if (error) {
    throw error;
  }

  return data.user ?? data.session?.user ?? null;
}

export async function getAccountSessionForCookieHeader(cookieHeader: string | null) {
  console.info("[account] session resolution started", {
    hasCookieHeader: readCookiePresence(cookieHeader),
  });

  const devHarnessResolution = resolveDevAccountHarnessSession(cookieHeader);

  if (devHarnessResolution.active) {
    console.info("[account] session resolution satisfied by dev harness", {
      signedIn: Boolean(devHarnessResolution.session?.user),
      entitlementTier: devHarnessResolution.session?.entitlement.tier ?? null,
    });

    return devHarnessResolution.session;
  }

  let stage: AccountSessionResolutionStage = "auth_user_resolution";
  let userId: string | null = null;

  try {
    const user = await getAuthenticatedUser(cookieHeader);

    if (!user) {
      console.info("[account] session resolution completed signed out", {
        hasCookieHeader: readCookiePresence(cookieHeader),
      });

      return null;
    }

    userId = user.id;
    console.info("[account] auth user resolved during session resolution", {
      userId: user.id,
    });

    stage = "entitlement_lookup";

    let entitlement = getDefaultSignedInAccountEntitlement();
    let entitlementUnavailable = false;

    try {
      entitlement = await getStoredAccountEntitlementForUser(user.id, cookieHeader);
      console.info("[account] entitlement resolved during session resolution", {
        userId: user.id,
        entitlementTier: entitlement.tier,
        entitlementSource: entitlement.source,
      });
    } catch (error) {
      const failure = describeOptionalAccountDependencyFailure(
        error,
        "user_entitlements",
      );

      const log = shouldLogOptionalAccountDependencyFailureAsError(failure)
        ? console.error
        : console.warn;

      log("[account] entitlement unavailable during session resolution", {
        userId: user.id,
        failureKind: failure.kind,
        relationName: failure.relationName,
        code: failure.code,
        message: failure.message,
        fallback: "default_signed_in_entitlement",
      });

      entitlementUnavailable = true;
    }

    stage = "billing_summary_lookup";

    let billing = getDefaultAccountBillingSummary(entitlement);
    let billingUnavailable = false;

    try {
      billing = await getAccountBillingSummaryForUser(user.id, entitlement, cookieHeader);
      console.info("[account] billing summary resolved during session resolution", {
        userId: user.id,
        billingSource: billing.source,
        billingStatus: billing.status,
      });

      const billingManagedEntitlementTier = deriveEntitlementTierFromBillingSummary(
        billing,
      );

      if (billingManagedEntitlementTier && billingManagedEntitlementTier !== entitlement.tier) {
        entitlement = resolveAccountEntitlement({
          tier: billingManagedEntitlementTier,
          source: "billing-profile",
          updatedAt: entitlement.updatedAt,
        });

        console.info(
          "[account] entitlement reconciled from billing summary during session resolution",
          {
            userId: user.id,
            entitlementTier: entitlement.tier,
            entitlementSource: entitlement.source,
            billingSource: billing.source,
            billingStatus: billing.status,
          },
        );
      }
    } catch (error) {
      const failure = describeOptionalAccountDependencyFailure(
        error,
        "user_billing_profiles",
      );
      const log = shouldLogOptionalAccountDependencyFailureAsError(failure)
        ? console.error
        : console.warn;

      log("[account] billing summary unavailable during session resolution", {
        userId: user.id,
        failureKind: failure.kind,
        relationName: failure.relationName,
        code: failure.code,
        message: failure.message,
        fallback: "default_account_billing_summary",
      });

      billingUnavailable = true;
    }

    stage = "billing_config_evaluation";

    let billingNotConfigured = false;
    let billingConfigIssues: StripeBillingConfigIssue[] | undefined;

    try {
      const stripeBillingConfig = getStripeBillingConfig();
      const checkoutConfigDiagnostics = billing.canStartCheckout
        ? getStripeCheckoutConfigDiagnostics(stripeBillingConfig)
        : null;
      const portalConfigDiagnostics = billing.canManageSubscription
        ? getStripeBillingPortalConfigDiagnostics(stripeBillingConfig)
        : null;

      billingNotConfigured =
        !(
          checkoutConfigDiagnostics?.configured ??
          !billing.canStartCheckout
        ) ||
        !(
          portalConfigDiagnostics?.configured ??
          !billing.canManageSubscription
        );
      billingConfigIssues = Array.from(
        new Set([
          ...(checkoutConfigDiagnostics?.issues ?? []),
          ...(portalConfigDiagnostics?.issues ?? []),
        ]),
      );

      console.info("[account] billing config evaluated during session resolution", {
        userId: user.id,
        billingNotConfigured,
        requiresCheckoutConfig: billing.canStartCheckout,
        requiresPortalConfig: billing.canManageSubscription,
        checkoutConfigIssues: checkoutConfigDiagnostics?.issues ?? [],
        portalConfigIssues: portalConfigDiagnostics?.issues ?? [],
      });
    } catch (error) {
      const failure = describeOptionalAccountDependencyFailure(error);
      const log = shouldLogOptionalAccountDependencyFailureAsError(failure)
        ? console.error
        : console.warn;

      log("[account] billing config unavailable during session resolution", {
        userId: user.id,
        failureKind: failure.kind,
        relationName: failure.relationName,
        code: failure.code,
        message: failure.message,
        fallback: "billing_actions_disabled",
      });

      billingUnavailable = true;
    }

    stage = "session_construction";

    const warnings =
      entitlementUnavailable || billingUnavailable || billingNotConfigured
        ? {
            ...(entitlementUnavailable
              ? {
                  entitlementUnavailable: true,
                }
              : {}),
            ...(billingUnavailable
              ? {
                  billingUnavailable: true,
                }
              : {}),
            ...(billingNotConfigured
              ? {
                  billingNotConfigured: true,
                  ...(billingConfigIssues && billingConfigIssues.length > 0
                    ? {
                        billingConfigIssues,
                      }
                    : {}),
                }
              : {}),
          }
        : undefined;

    const session = {
      user: toAccountUserSummary(user),
      entitlement,
      billing,
      ...(warnings
        ? {
            warnings,
          }
        : {}),
    } satisfies AccountSession;

    console.info("[account] session resolution completed signed in", {
      userId: user.id,
      entitlementTier: session.entitlement.tier,
      entitlementSource: session.entitlement.source,
      billingStatus: session.billing.status,
      warningKeys: Object.keys(session.warnings ?? {}),
    });

    return session;
  } catch (error) {
    console.error("[account] session resolution failed", {
      stage,
      userId,
      code: readErrorCode(error),
      message: readErrorMessage(error),
      name: readErrorName(error),
    });

    throw error;
  }
}

export async function signOutAccountSession(
  cookieHeader: string | null,
  response: NextResponse,
) {
  const devHarnessResolution = resolveDevAccountHarnessSession(cookieHeader);

  if (devHarnessResolution.active) {
    setDevAccountHarnessStateCookie(response, "signed-out");
    return;
  }

  const supabase = createSupabaseServerClient({
    cookieHeader,
    response,
  });
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function verifyMagicLink(
  input: {
    cookieHeader: string | null;
    response: NextResponse;
    tokenHash: string;
    type: EmailOtpType;
  },
) {
  const supabase = createSupabaseServerClient({
    cookieHeader: input.cookieHeader,
    response: input.response,
  });
  const {
    data: { user, session },
    error,
  } = await supabase.auth.verifyOtp({
    token_hash: input.tokenHash,
    type: input.type,
  });

  if (error) {
    throw error;
  }

  return user ?? session?.user ?? null;
}

export async function updateAccountPassword(
  input: {
    cookieHeader: string | null;
    response: NextResponse;
    password: string;
  },
) {
  const supabase = createSupabaseServerClient({
    cookieHeader: input.cookieHeader,
    response: input.response,
  });
  const { error } = await supabase.auth.updateUser({
    password: input.password,
  });

  if (error) {
    throw error;
  }
}

export async function getStoredProgressForCookieHeader(cookieHeader: string | null) {
  const devHarnessProgress = await getDevAccountHarnessStoredProgressForCookieHeader(
    cookieHeader,
  );

  if (devHarnessProgress !== undefined) {
    return devHarnessProgress;
  }

  const user = await getAuthenticatedUser(cookieHeader);

  if (!user) {
    return null;
  }

  const storedProgress = await getStoredSnapshotForUser(user.id, cookieHeader);
  const updatedAt = storedProgress.updatedAt ?? new Date().toISOString();

  return {
    snapshot: storedProgress.snapshot,
    history: storedProgress.history,
    updatedAt,
    continueLearningState: deriveSavedContinueLearningState(
      storedProgress.snapshot,
      updatedAt,
    ),
  } satisfies StoredProgressResult;
}

export async function mergeStoredProgressForCookieHeader(
  cookieHeader: string | null,
  incomingSnapshot: ProgressSnapshot,
) {
  const devHarnessProgress = await mergeDevAccountHarnessStoredProgressForCookieHeader(
    cookieHeader,
    incomingSnapshot,
  );

  if (devHarnessProgress !== undefined) {
    return devHarnessProgress;
  }

  const user = await getAuthenticatedUser(cookieHeader);

  if (!user) {
    return null;
  }

  const storedProgress = await getStoredSnapshotForUser(user.id, cookieHeader);
  const mergedSnapshot = mergeProgressSnapshots(
    storedProgress.snapshot,
    incomingSnapshot,
  );
  const historyCatalog = getProgressHistoryCatalog();
  const mergeSummary = summarizeProgressMerge(
    storedProgress.snapshot,
    incomingSnapshot,
    mergedSnapshot,
  );
  const updatedAt = new Date().toISOString();
  const mergedHistory = updateProgressHistoryStore({
    previousSnapshot: storedProgress.snapshot,
    nextSnapshot: mergedSnapshot,
    previousHistory: storedProgress.history,
    concepts: historyCatalog.concepts,
    subjects: historyCatalog.subjects,
    starterTracks: historyCatalog.starterTracks,
    recordedAt: updatedAt,
  });
  const supabase = createSupabaseServerClient({ cookieHeader });

  try {
    const { data, error } = await supabase
      .from(SYNCED_PROGRESS_TABLE)
      .upsert({
        user_id: user.id,
        snapshot: mergedSnapshot,
        history: mergedHistory,
        updated_at: updatedAt,
      })
      .select("snapshot, history, updated_at")
      .single<StoredSyncedProgressRow>();

    if (error) {
      throw error;
    }

    const normalizedSnapshot = normalizeProgressSnapshot(
      data?.snapshot ?? createEmptyProgressSnapshot(),
    );
    const normalizedHistory = normalizeProgressHistoryStore(
      data?.history ?? createEmptyProgressHistoryStore(),
    );
    const storedUpdatedAt =
      typeof data?.updated_at === "string" && data.updated_at ? data.updated_at : updatedAt;

    return {
      snapshot: normalizedSnapshot,
      history: normalizedHistory,
      updatedAt: storedUpdatedAt,
      mergeSummary,
      continueLearningState: deriveSavedContinueLearningState(
        normalizedSnapshot,
        storedUpdatedAt,
      ),
    } satisfies ProgressMergeResult;
  } catch (error) {
    if (!isMissingSyncedProgressHistoryColumnFailure(error)) {
      throw error;
    }

    console.warn("[account] synced progress history column unavailable during write", {
      userId: user.id,
      relationName: SYNCED_PROGRESS_TABLE,
      columnName: "history",
      fallback: "snapshot_only_progress_write",
    });

    const { data, error: legacyError } = await supabase
      .from(SYNCED_PROGRESS_TABLE)
      .upsert({
        user_id: user.id,
        snapshot: mergedSnapshot,
        updated_at: updatedAt,
      })
      .select("snapshot, updated_at")
      .single<StoredLegacySyncedProgressRow>();

    if (legacyError) {
      throw legacyError;
    }

    const normalizedSnapshot = normalizeProgressSnapshot(
      data?.snapshot ?? createEmptyProgressSnapshot(),
    );
    const storedUpdatedAt =
      typeof data?.updated_at === "string" && data.updated_at ? data.updated_at : updatedAt;

    return {
      snapshot: normalizedSnapshot,
      history: mergedHistory,
      updatedAt: storedUpdatedAt,
      mergeSummary,
      continueLearningState: deriveSavedContinueLearningState(
        normalizedSnapshot,
        storedUpdatedAt,
      ),
    } satisfies ProgressMergeResult;
  }
}

export type { ProgressMergeSummary };
