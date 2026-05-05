import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { AiTokenUsage } from "./types";

const AI_TOKEN_USAGE_TABLE = "user_ai_token_usage";
const DEFAULT_MONTHLY_TOKEN_LIMIT = 10_000_000;

type StoredAiTokenUsageRow = {
  user_id: string;
  period_yyyymm: string;
  total_tokens: number | string | null;
  prompt_tokens: number | string | null;
  completion_tokens: number | string | null;
  thoughts_tokens: number | string | null;
  request_count: number | string | null;
  updated_at: string | null;
};

export type AiMonthlyTokenUsage = {
  userId: string;
  periodYyyymm: string;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  thoughtsTokens: number;
  requestCount: number;
  updatedAt: string | null;
};

function readPositiveInteger(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readStoredCount(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function emptyAiMonthlyTokenUsage(
  userId: string,
  periodYyyymm: string,
): AiMonthlyTokenUsage {
  return {
    userId,
    periodYyyymm,
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    thoughtsTokens: 0,
    requestCount: 0,
    updatedAt: null,
  };
}

function normalizeAiMonthlyTokenUsageRow(
  row: StoredAiTokenUsageRow | null | undefined,
  userId: string,
  periodYyyymm: string,
): AiMonthlyTokenUsage {
  if (!row) {
    return emptyAiMonthlyTokenUsage(userId, periodYyyymm);
  }

  return {
    userId: row.user_id,
    periodYyyymm: row.period_yyyymm,
    totalTokens: readStoredCount(row.total_tokens),
    promptTokens: readStoredCount(row.prompt_tokens),
    completionTokens: readStoredCount(row.completion_tokens),
    thoughtsTokens: readStoredCount(row.thoughts_tokens),
    requestCount: readStoredCount(row.request_count),
    updatedAt: row.updated_at ?? null,
  };
}

function normalizeUsageForStorage(usage: AiTokenUsage) {
  return {
    promptTokens: Math.max(0, Math.trunc(usage.promptTokenCount)),
    completionTokens: Math.max(0, Math.trunc(usage.candidatesTokenCount)),
    thoughtsTokens: Math.max(0, Math.trunc(usage.thoughtsTokenCount)),
    totalTokens: Math.max(0, Math.trunc(usage.totalTokenCount)),
  };
}

export function getAiMonthlyTokenLimit() {
  return readPositiveInteger(process.env.AI_MONTHLY_TOKEN_LIMIT, DEFAULT_MONTHLY_TOKEN_LIMIT);
}

export function getCurrentAiUsagePeriod(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

export function getAiMonthlyQuotaResetAt(periodYyyymm = getCurrentAiUsagePeriod()) {
  const match = periodYyyymm.match(/^(\d{4})-(\d{2})$/u);
  const now = new Date();
  const year = match ? Number.parseInt(match[1] ?? "", 10) : now.getUTCFullYear();
  const month = match ? Number.parseInt(match[2] ?? "", 10) : now.getUTCMonth() + 1;
  const resetAt = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

  return resetAt.toISOString();
}

export async function getAiMonthlyTokenUsageForUser(
  userId: string,
  periodYyyymm = getCurrentAiUsagePeriod(),
) {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from(AI_TOKEN_USAGE_TABLE)
    .select(
      "user_id, period_yyyymm, total_tokens, prompt_tokens, completion_tokens, thoughts_tokens, request_count, updated_at",
    )
    .eq("user_id", userId)
    .eq("period_yyyymm", periodYyyymm)
    .maybeSingle<StoredAiTokenUsageRow>();

  if (error) {
    throw error;
  }

  return normalizeAiMonthlyTokenUsageRow(data, userId, periodYyyymm);
}

export async function incrementAiMonthlyTokenUsageForUser(input: {
  userId: string;
  periodYyyymm?: string;
  usage: AiTokenUsage;
}) {
  const periodYyyymm = input.periodYyyymm ?? getCurrentAiUsagePeriod();
  const usage = normalizeUsageForStorage(input.usage);
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase.rpc("increment_user_ai_token_usage", {
    p_user_id: input.userId,
    p_period_yyyymm: periodYyyymm,
    p_prompt_tokens: usage.promptTokens,
    p_completion_tokens: usage.completionTokens,
    p_thoughts_tokens: usage.thoughtsTokens,
    p_total_tokens: usage.totalTokens,
  });

  if (error) {
    throw error;
  }

  return normalizeAiMonthlyTokenUsageRow(
    data as StoredAiTokenUsageRow | null,
    input.userId,
    periodYyyymm,
  );
}
