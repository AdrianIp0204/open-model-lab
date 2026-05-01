import { z } from "zod";
import type { AccountBillingSummary } from "@/lib/billing/model";
import type { StripeBillingConfigIssue } from "@/lib/billing/env";
import type { ResolvedAccountEntitlement } from "./entitlements";

const emailSchema = z.string().trim().email().max(320).transform((value) => value.toLowerCase());
export const ACCOUNT_PASSWORD_MIN_LENGTH = 8;
export const ACCOUNT_PASSWORD_MAX_LENGTH = 128;

const passwordSchema = z
  .string()
  .min(ACCOUNT_PASSWORD_MIN_LENGTH, {
    message: `Password must be at least ${ACCOUNT_PASSWORD_MIN_LENGTH} characters.`,
  })
  .max(ACCOUNT_PASSWORD_MAX_LENGTH, {
    message: `Password must be at most ${ACCOUNT_PASSWORD_MAX_LENGTH} characters.`,
  });

export const accountMagicLinkRequestSchema = z.object({
  email: emailSchema,
});

export const accountPasswordSignInRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const accountPasswordResetRequestSchema = z.object({
  email: emailSchema,
});

export const accountPasswordUpdateRequestSchema = z.object({
  password: passwordSchema,
});

export const accountSessionActionRequestSchema = z.union([
  z
    .object({
      action: z.literal("magic-link").optional(),
      email: emailSchema,
      next: z.string().trim().optional(),
    })
    .transform((value) => ({
      action: "magic-link" as const,
      email: value.email,
      next: value.next,
    })),
  z.object({
    action: z.literal("password-sign-in"),
    email: emailSchema,
    password: passwordSchema,
    next: z.string().trim().optional(),
  }),
  z.object({
    action: z.literal("password-reset"),
    email: emailSchema,
    next: z.string().trim().optional(),
  }),
]);

export const accountProgressRequestSchema = z.object({
  snapshot: z.unknown().refine((value) => value !== undefined, {
    message: "Snapshot is required.",
  }),
});

export const accountSavedSetupsRequestSchema = z.object({
  snapshot: z.unknown().refine((value) => value !== undefined, {
    message: "Snapshot is required.",
  }),
});

export const accountSavedCompareSetupsRequestSchema = z.object({
  snapshot: z.unknown().refine((value) => value !== undefined, {
    message: "Snapshot is required.",
  }),
});

export type AccountUserSummary = {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  lastSignedInAt: string | null;
};

export type AccountSessionWarnings = {
  entitlementUnavailable?: boolean;
  billingUnavailable?: boolean;
  billingNotConfigured?: boolean;
  billingConfigIssues?: StripeBillingConfigIssue[];
};

export type AccountSession = {
  user: AccountUserSummary;
  entitlement: ResolvedAccountEntitlement;
  billing: AccountBillingSummary;
  warnings?: AccountSessionWarnings;
};

export type AccountAuthMode = "supabase" | "dev-harness";

export type AccountSessionResponse = {
  session: AccountSession | null;
  entitlement: ResolvedAccountEntitlement;
  authMode: AccountAuthMode;
};
