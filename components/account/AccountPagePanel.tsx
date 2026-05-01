"use client";

import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  type AccountSession,
  type AccountAuthMode,
} from "@/lib/account/model";
import {
  initializeAccountSession,
  requestPasswordReset,
  requestMagicLink,
  signOutAccount,
  signInWithPassword,
  updateAccountPassword,
  useAccountSession,
} from "@/lib/account/client";
import { getAnonymousAccountEntitlement } from "@/lib/account/entitlements";
import {
  forceProgressSync,
  useProgressSnapshot,
  useProgressSyncState,
} from "@/lib/progress";
import {
  deriveBillingLifecycleStatus,
  type BillingLifecycleStatus,
  type BillingReturnQueryState,
} from "@/lib/billing/ui";
import { getLocalizedAccountDisplayName } from "@/lib/i18n/account";
import { ACCOUNT_PASSWORD_MIN_LENGTH } from "@/lib/account/model";
import { PageSection } from "@/components/layout/PageSection";
import { PageSectionFrame } from "@/components/layout/PageSectionFrame";
import { PremiumFeatureNotice } from "./PremiumFeatureNotice";
import { PremiumSubscriptionActions } from "./PremiumSubscriptionActions";
import { AchievementsSection } from "./AchievementsSection";
import { type AppLocale } from "@/i18n/routing";
import { Link, useRouter } from "@/i18n/navigation";
import { localizeShareHref } from "@/lib/share-links";

type TranslateFn = (key: string, values?: Record<string, unknown>) => string;

function formatDate(value: string | null, locale: string) {
  if (!value) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
    }).format(new Date(value));
  } catch {
    return null;
  }
}

function formatBillingDate(value: string | null, locale: string) {
  if (!value) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(value));
  } catch {
    return null;
  }
}

function getLocalizedBillingLifecycleLabel(
  status: BillingLifecycleStatus,
  currentPeriodEnd: string | null,
  locale: string,
  t: TranslateFn,
) {
  const formattedPeriodEnd = formatBillingDate(currentPeriodEnd, locale);

  switch (status) {
    case "active":
      return t("billingLifecycle.active");
    case "active_canceling_at_period_end":
      return formattedPeriodEnd
        ? t("billingLifecycle.activeCancelingAtPeriodEndWithDate", {
            date: formattedPeriodEnd,
          })
        : t("billingLifecycle.activeCancelingAtPeriodEnd");
    case "payment_issue":
      return t("billingLifecycle.paymentIssue");
    case "ended":
      return t("billingLifecycle.ended");
    case "manual_premium":
      return t("billingLifecycle.manualPremium");
    default:
      return t("billingLifecycle.notStarted");
  }
}

function formatCountdown(remainingMs: number) {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getSyncTone(mode: ReturnType<typeof useProgressSyncState>["mode"]) {
  switch (mode) {
    case "synced":
      return "border-teal-500/25 bg-teal-500/10 text-teal-700";
    case "syncing":
      return "border-amber-500/25 bg-amber-500/10 text-amber-700";
    case "error":
      return "border-coral-500/25 bg-coral-500/10 text-coral-700";
    default:
      return "border-line bg-paper text-ink-600";
  }
}

function getSyncLabel(
  mode: ReturnType<typeof useProgressSyncState>["mode"],
  t: TranslateFn,
) {
  switch (mode) {
    case "synced":
      return t("sync.label.synced");
    case "syncing":
      return t("sync.label.syncing");
    case "error":
      return t("sync.label.error");
    default:
      return t("sync.label.local");
  }
}

function getLastSyncStatusLabel(
  mode: ReturnType<typeof useProgressSyncState>["mode"],
  lastSyncedAtLabel: string | null,
  t: TranslateFn,
) {
  switch (mode) {
    case "synced":
      return lastSyncedAtLabel
        ? t("sync.status.lastConfirmed", { date: lastSyncedAtLabel })
        : t("sync.status.syncedJustNow");
    case "syncing":
      return lastSyncedAtLabel
        ? t("sync.status.refreshingSince", { date: lastSyncedAtLabel })
        : t("sync.status.syncing");
    case "error":
      return lastSyncedAtLabel
        ? t("sync.status.lastConfirmed", { date: lastSyncedAtLabel })
        : t("sync.status.retryNeeded");
    default:
      return lastSyncedAtLabel
        ? t("sync.status.lastConfirmed", { date: lastSyncedAtLabel })
        : t("sync.status.localFallback");
  }
}

function getMergeNote(
  summary: ReturnType<typeof useProgressSyncState>["lastMergeSummary"],
  t: TranslateFn,
) {
  if (!summary) {
    return t("merge.default");
  }

  if (summary.importedLocalConceptCount && summary.importedRemoteConceptCount) {
    return t("merge.both", {
      localCount: summary.importedLocalConceptCount,
      remoteCount: summary.importedRemoteConceptCount,
    });
  }

  if (summary.importedLocalConceptCount) {
    return t("merge.localOnly", {
      count: summary.importedLocalConceptCount,
    });
  }

  if (summary.importedRemoteConceptCount) {
    return t("merge.remoteOnly", {
      count: summary.importedRemoteConceptCount,
    });
  }

  return t("merge.alreadyAligned");
}

function getAccountAuthErrorNotice(authState: string | null, t: TranslateFn) {
  switch (authState) {
    case "expired":
      return t("authErrors.expired");
    case "used":
      return t("authErrors.used");
    case "missing":
      return t("authErrors.missing");
    case "unavailable":
      return t("authErrors.unavailable");
    case "invalid":
    case "error":
      return t("authErrors.invalid");
    default:
      return null;
  }
}

function isValidEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function getEmailFieldError(value: string, t: TranslateFn) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return t("validation.emailRequired");
  }

  if (!isValidEmailAddress(trimmedValue)) {
    return t("validation.emailInvalid");
  }

  return null;
}

function getPasswordFieldError(value: string, t: TranslateFn) {
  if (!value) {
    return t("validation.passwordRequired");
  }

  if (value.length < ACCOUNT_PASSWORD_MIN_LENGTH) {
    return t("validation.passwordMin", { count: ACCOUNT_PASSWORD_MIN_LENGTH });
  }

  return null;
}

function resolveContinuePath(nextPath: string | null, locale: AppLocale) {
  if (nextPath && nextPath.startsWith("/")) {
    return localizeShareHref(nextPath, locale);
  }

  return localizeShareHref("/dashboard", locale);
}

function resolvePasswordResetPath(locale: AppLocale) {
  return localizeShareHref("/account/reset-password", locale);
}

function isPasswordSignInErrorCode(errorCode: string | null) {
  return [
    "invalid_credentials",
    "email_not_registered",
    "email_not_confirmed",
    "auth_unavailable",
    "password_sign_in_failed",
  ].includes(errorCode ?? "");
}

function getPasswordSignInErrorNotice(
  errorCode: string | null,
  errorMessage: string | null,
  t: TranslateFn,
) {
  switch (errorCode) {
    case "invalid_credentials":
      return t("passwordSignIn.errors.invalidCredentials");
    case "email_not_registered":
      return t("passwordSignIn.errors.emailNotRegistered");
    case "email_not_confirmed":
      return t("passwordSignIn.errors.emailNotConfirmed");
    case "auth_unavailable":
      return t("passwordSignIn.errors.unavailable");
    case "password_sign_in_failed":
      return t("passwordSignIn.errors.failed");
    default:
      return errorMessage;
  }
}

type AuthStatusTone = "error" | "success" | "pending";

type AuthStatusMessage = {
  tone: AuthStatusTone;
  title: string;
  message: string;
};

function AuthStatusCallout({
  tone,
  title,
  message,
}: AuthStatusMessage) {
  const toneClasses =
    tone === "error"
      ? {
          container: "border-coral-500/25 bg-coral-500/10 text-coral-900",
          badge: "border-coral-600/25 bg-white/70 text-coral-700",
        }
      : tone === "success"
        ? {
            container: "border-teal-500/25 bg-teal-500/10 text-teal-900",
            badge: "border-teal-700/20 bg-white/70 text-teal-700",
          }
        : {
            container: "border-amber-500/25 bg-amber-500/10 text-amber-900",
            badge: "border-amber-700/20 bg-white/70 text-amber-700",
          };

  return (
    <div
      className={`min-w-0 rounded-[22px] border px-4 py-4 ${toneClasses.container}`}
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      aria-atomic="true"
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start">
        <span
          className={`inline-flex self-start rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] ${toneClasses.badge}`}
        >
          {title}
        </span>
        <p className="min-w-0 flex-1 break-words text-sm leading-6 text-pretty">{message}</p>
      </div>
    </div>
  );
}

function PasswordManagementCard({
  heading,
  description,
  email,
  errorCode,
  errorMessage,
  noticeMessage,
  t,
  passwordResetPath,
}: {
  heading: string;
  description: string;
  email: string;
  errorCode: string | null;
  errorMessage: string | null;
  noticeMessage: string | null;
  t: TranslateFn;
  passwordResetPath: string;
}) {
  const session = useAccountSession();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const passwordRequirementMessage = t("validation.passwordMin", {
    count: ACCOUNT_PASSWORD_MIN_LENGTH,
  });
  const passwordTooShort = password.length > 0 && password.length < ACCOUNT_PASSWORD_MIN_LENGTH;
  const confirmPasswordTooShort =
    confirmPassword.length > 0 && confirmPassword.length < ACCOUNT_PASSWORD_MIN_LENGTH;
  const shouldOfferRecoveryFallback =
    errorCode === "reauthentication_needed" || errorCode === "not_authenticated";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      password.length < ACCOUNT_PASSWORD_MIN_LENGTH ||
      confirmPassword.length < ACCOUNT_PASSWORD_MIN_LENGTH
    ) {
      setLocalError(passwordRequirementMessage);
      return;
    }

    if (password !== confirmPassword) {
      setLocalError(t("passwordManagement.errors.mismatch"));
      return;
    }

    setLocalError(null);
    const result = await updateAccountPassword(password);

    if (result.ok) {
      setPassword("");
      setConfirmPassword("");
    }
  }

  async function handleRecoveryFallback() {
    setLocalError(null);
    await requestPasswordReset(email, passwordResetPath);
  }

  return (
    <section className="lab-panel p-5">
      <p className="lab-label">{t("passwordManagement.label")}</p>
      <h3 className="mt-2 text-2xl font-semibold text-ink-950">{heading}</h3>
      <p className="mt-3 text-sm leading-6 text-ink-700">{description}</p>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="block space-y-2">
          <span className="text-sm font-medium text-ink-900">{t("passwordManagement.newPassword")}</span>
          <input
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setLocalError(null);
            }}
            required
            minLength={ACCOUNT_PASSWORD_MIN_LENGTH}
            autoComplete="new-password"
            className="w-full rounded-[18px] border border-line bg-paper px-4 py-3 text-sm text-ink-900 outline-none transition focus:border-teal-500"
          />
          </label>
          <p className={`text-xs ${passwordTooShort ? "text-coral-700" : "text-ink-600"}`}>
            {passwordRequirementMessage}
          </p>
        </div>

        <div className="space-y-2">
          <label className="block space-y-2">
          <span className="text-sm font-medium text-ink-900">{t("passwordManagement.confirmPassword")}</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              setLocalError(null);
            }}
            required
            minLength={ACCOUNT_PASSWORD_MIN_LENGTH}
            autoComplete="new-password"
            className="w-full rounded-[18px] border border-line bg-paper px-4 py-3 text-sm text-ink-900 outline-none transition focus:border-teal-500"
          />
          </label>
          <p className={`text-xs ${confirmPasswordTooShort ? "text-coral-700" : "text-ink-600"}`}>
            {passwordRequirementMessage}
          </p>
        </div>

        <button
          type="submit"
          disabled={
            Boolean(session.pendingAction) ||
            password.length < ACCOUNT_PASSWORD_MIN_LENGTH ||
            confirmPassword.length < ACCOUNT_PASSWORD_MIN_LENGTH
          }
          className="inline-flex items-center rounded-full bg-ink-950 px-5 py-3 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ color: "var(--paper-strong)" }}
        >
          {session.pendingAction === "password-update"
            ? t("passwordManagement.actions.saving")
            : t("passwordManagement.actions.save")}
        </button>
      </form>

      {localError ? (
        <p className="mt-3 text-sm text-coral-700">{localError}</p>
      ) : null}
      {errorMessage ? (
        <p className="mt-3 text-sm text-coral-700">{errorMessage}</p>
      ) : null}
      {noticeMessage ? (
        <p className="mt-3 text-sm text-teal-700">{noticeMessage}</p>
      ) : null}
      {shouldOfferRecoveryFallback ? (
        <div className="mt-4 rounded-[20px] border border-amber-500/25 bg-amber-500/10 p-4">
          <p className="text-sm font-semibold text-ink-950">{t("passwordManagement.recovery.title")}</p>
          <p className="mt-2 text-sm leading-6 text-ink-700">
            {t("passwordManagement.recovery.description", { email })}
          </p>
          <button
            type="button"
            onClick={() => void handleRecoveryFallback()}
            disabled={Boolean(session.pendingAction)}
            className="mt-4 inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {session.pendingAction === "password-reset"
              ? t("passwordManagement.recovery.actions.sending")
              : t("passwordManagement.recovery.actions.email")}
          </button>
        </div>
      ) : null}
    </section>
  );
}

function DevHarnessAuthCard({
  heading,
  description,
  t,
}: {
  heading: string;
  description: string;
  t: TranslateFn;
}) {
  return (
    <section className="lab-panel p-5">
      <p className="lab-label">{t("passwordManagement.label")}</p>
      <h3 className="mt-2 text-2xl font-semibold text-ink-950">{heading}</h3>
      <p className="mt-3 text-sm leading-6 text-ink-700">{description}</p>
      <div className="mt-4 rounded-[20px] border border-amber-500/25 bg-amber-500/10 p-4">
        <p className="text-sm font-semibold text-ink-950">{t("devHarness.title")}</p>
        <p className="mt-2 text-sm leading-6 text-ink-700">
          {t("devHarness.description")}
        </p>
        <Link
          href="/dev/account-harness"
          className="mt-4 inline-flex items-center rounded-full bg-ink-950 px-5 py-3 text-sm font-semibold transition hover:opacity-90"
          style={{ color: "var(--paper-strong)" }}
        >
          {t("devHarness.action")}
        </Link>
      </div>
    </section>
  );
}

export function AccountPagePanel({
  leadIn = null,
  authState = null,
  nextPath = null,
  billingReturnQueryState = null,
  initialSession = null,
  initialAuthMode = "supabase",
}: {
  leadIn?: ReactNode;
  authState?: string | null;
  nextPath?: string | null;
  billingReturnQueryState?: BillingReturnQueryState | null;
  initialSession?: AccountSession | null;
  initialAuthMode?: AccountAuthMode;
}) {
  const router = useRouter();
  const locale = useLocale() as AppLocale;
  const t = useTranslations("AccountPage.panel");
  const tAccountIdentity = useTranslations("AccountIdentity");
  const translate = t as unknown as TranslateFn;
  const liveSession = useAccountSession();
  const session = useMemo(
    () =>
      liveSession.initialized
        ? liveSession
        : {
            ...liveSession,
            initialized: true,
            status: initialSession?.user ? "signed-in" : "signed-out",
            user: initialSession?.user ?? null,
            entitlement: initialSession?.entitlement ?? getAnonymousAccountEntitlement(),
            billing: initialSession?.billing ?? null,
            warnings: initialSession?.warnings ?? null,
            authMode: initialAuthMode,
          },
    [initialAuthMode, initialSession, liveSession],
  );
  const localizedAccountDisplayName = session.user
    ? getLocalizedAccountDisplayName(session.user.displayName, tAccountIdentity)
    : null;
  const syncState = useProgressSyncState();
  const progressSnapshot = useProgressSnapshot();
  const [passwordEmail, setPasswordEmail] = useState("");
  const [emailLinkEmail, setEmailLinkEmail] = useState("");
  const [passwordResetEmail, setPasswordResetEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordEmailError, setPasswordEmailError] = useState<string | null>(null);
  const [emailLinkEmailError, setEmailLinkEmailError] = useState<string | null>(null);
  const [passwordResetEmailError, setPasswordResetEmailError] = useState<string | null>(null);
  const [passwordFieldError, setPasswordFieldError] = useState<string | null>(null);
  const [magicLinkStatusMessage, setMagicLinkStatusMessage] = useState<AuthStatusMessage | null>(
    null,
  );
  const [passwordResetStatusMessage, setPasswordResetStatusMessage] =
    useState<AuthStatusMessage | null>(null);
  const [dismissedPasswordSignInError, setDismissedPasswordSignInError] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [cooldownNow, setCooldownNow] = useState(() => Date.now());
  const entitlement = session.entitlement;
  const billing = session.billing;
  const entitlementUnavailable = Boolean(session.warnings?.entitlementUnavailable);
  const billingUnavailable = Boolean(session.warnings?.billingUnavailable);
  const billingNotConfigured = Boolean(session.warnings?.billingNotConfigured);
  const billingLifecycleStatus = deriveBillingLifecycleStatus({
    entitlement,
    billing,
  });
  const isPremium = entitlement.tier === "premium";
  const conceptCount = Object.keys(progressSnapshot.concepts).length;
  const savedContinueLearningState = syncState.savedContinueLearningState;
  const syncMessage = useMemo(
    () => getMergeNote(syncState.lastMergeSummary, translate),
    [syncState.lastMergeSummary, translate],
  );
  const magicLinkCooldownExpiresAt = session.magicLinkCooldownExpiresAt;
  const isMagicLinkCooldownActive =
    typeof magicLinkCooldownExpiresAt === "number" &&
    magicLinkCooldownExpiresAt > cooldownNow;
  const magicLinkCooldownRemainingMs = isMagicLinkCooldownActive
    ? magicLinkCooldownExpiresAt - cooldownNow
    : 0;
  const authQueryErrorNotice = getAccountAuthErrorNotice(authState, translate);
  const authActionsDisabled = session.authMode === "dev-harness";
  const passwordRequirementMessage = t("validation.passwordMin", {
    count: ACCOUNT_PASSWORD_MIN_LENGTH,
  });
  const passwordSignInErrorMessage =
    !dismissedPasswordSignInError && isPasswordSignInErrorCode(session.errorCode)
      ? getPasswordSignInErrorNotice(session.errorCode, session.errorMessage, translate)
      : null;
  const generalSessionErrorMessage =
    session.errorCode === "account_session_failed" ? session.errorMessage : null;
  const continuePath = useMemo(() => resolveContinuePath(nextPath, locale), [locale, nextPath]);
  const passwordResetPath = useMemo(() => resolvePasswordResetPath(locale), [locale]);

  useEffect(() => {
    initializeAccountSession();
  }, []);

  useEffect(() => {
    if (!isMagicLinkCooldownActive) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setCooldownNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isMagicLinkCooldownActive]);

  useEffect(() => {
    if (isPasswordSignInErrorCode(session.errorCode)) {
      setDismissedPasswordSignInError(false);
    }
  }, [session.errorCode, session.errorMessage]);

  async function handlePasswordSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextPasswordEmailError = getEmailFieldError(passwordEmail, translate);
    const nextPasswordFieldError = getPasswordFieldError(password, translate);

    setPasswordEmailError(nextPasswordEmailError);
    setPasswordFieldError(nextPasswordFieldError);
    setDismissedPasswordSignInError(false);

    if (nextPasswordEmailError || nextPasswordFieldError) {
      return;
    }

    const result = await signInWithPassword(passwordEmail.trim(), password, continuePath);

    if (result.ok) {
      router.push(continuePath);
    }
  }

  async function handleMagicLinkRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextEmailError = getEmailFieldError(emailLinkEmail, translate);
    setEmailLinkEmailError(nextEmailError);
    setMagicLinkStatusMessage(null);

    if (nextEmailError) {
      return;
    }

    const result = await requestMagicLink(emailLinkEmail.trim(), continuePath);

    setMagicLinkStatusMessage({
      tone: result.ok ? "success" : "error",
      title: result.ok ? t("emailLink.status.checkEmail") : t("emailLink.status.notSent"),
      message: result.message,
    });
  }

  async function handlePasswordResetRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextEmailError = getEmailFieldError(passwordResetEmail, translate);
    setPasswordResetEmailError(nextEmailError);
    setPasswordResetStatusMessage(null);

    if (nextEmailError) {
      return;
    }

    const result = await requestPasswordReset(passwordResetEmail.trim(), passwordResetPath);

    setPasswordResetStatusMessage({
      tone: result.ok ? "success" : "error",
      title: result.ok ? t("passwordReset.status.sent") : t("passwordReset.status.notSent"),
      message: result.message,
    });
  }

  async function handleManualSync() {
    setIsManualSyncing(true);

    try {
      await forceProgressSync();
    } finally {
      setIsManualSyncing(false);
    }
  }

  if (!session.initialized) {
    return (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <section className="lab-panel p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="lab-label">{t("loading.label")}</span>
            <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
              {t("loading.badge")}
            </span>
          </div>

          <h2 className="mt-3 text-3xl font-semibold text-ink-950">{t("loading.title")}</h2>
          <p className="mt-3 text-sm leading-6 text-ink-700">{t("loading.description")}</p>
        </section>

        <aside className="grid gap-4">
          <section className="lab-panel p-5">
            <p className="lab-label">{t("loading.next.label")}</p>
            <p className="mt-3 text-sm leading-6 text-ink-700">{t("loading.next.description")}</p>
          </section>
        </aside>
      </div>
    );
  }

  if (session.status === "signed-in" && session.user) {
    const createdAtLabel = formatDate(session.user.createdAt, locale);
    const signedInAtLabel = formatDate(session.user.lastSignedInAt, locale);
    const syncedAtLabel = formatDate(syncState.lastSyncedAt, locale);

    if (!isPremium) {
      const sectionNavItems = [
        {
          id: "account-overview",
          label: t("sectionNav.signedIn.overview.label"),
          compactLabel: t("sectionNav.signedIn.overview.compact"),
        },
        {
          id: "account-profile-details",
          label: t("sectionNav.signedIn.profileDetails.label"),
          compactLabel: t("sectionNav.signedIn.profileDetails.compact"),
        },
        {
          id: "account-password-settings",
          label: t("sectionNav.signedIn.passwordSettings.label"),
          compactLabel: t("sectionNav.signedIn.passwordSettings.compact"),
        },
        {
          id: "account-free-scope",
          label: t("sectionNav.signedIn.freeScope.label"),
          compactLabel: t("sectionNav.signedIn.freeScope.compact"),
        },
        ...(savedContinueLearningState
          ? [
              {
                id: "account-saved-home-state",
                label: t("sectionNav.signedIn.savedHomeState.label"),
                compactLabel: t("sectionNav.signedIn.savedHomeState.compact"),
              },
            ]
          : []),
        {
          id: "account-achievements",
          label: t("sectionNav.signedIn.achievements.label"),
          compactLabel: t("sectionNav.signedIn.achievements.compact"),
        },
      ];

      return (
        <PageSectionFrame
          sectionNav={{
            label: t("sectionNav.label"),
            title: t("sectionNav.title"),
            mobileLabel: t("sectionNav.mobileLabel"),
            items: sectionNavItems,
          }}
        >
        {leadIn ? <div className="mb-6 space-y-3 sm:mb-8">{leadIn}</div> : null}
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <PageSection id="account-overview" as="section" className="lab-panel p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="lab-label">{t("signedIn.label")}</span>
                <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600">
                  {t("signedIn.free.badges.freeTier")}
                </span>
                <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-amber-800">
                  {t("signedIn.free.badges.adsEligible")}
                </span>
              </div>

              <h2 className="mt-3 text-3xl font-semibold text-ink-950">
                {localizedAccountDisplayName}
              </h2>
              <p className="mt-2 text-sm leading-6 text-ink-700">
                {t("signedIn.free.description", { email: session.user.email })}
              </p>

            {entitlementUnavailable ? (
              <div className="mt-5 rounded-[24px] border border-amber-500/25 bg-amber-500/10 p-4">
                <p className="text-sm font-semibold text-ink-950">
                  {t("signedIn.entitlementUnavailable.title")}
                </p>
                <p className="mt-2 text-sm leading-6 text-ink-700">
                  {t("signedIn.free.entitlementUnavailable.body")}
                </p>
              </div>
            ) : null}

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-line bg-paper-strong p-4">
                <p className="text-lg font-semibold text-ink-950">{conceptCount}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-500">
                  {t("signedIn.free.stats.localConceptRecords")}
                </p>
              </div>
              <div className="rounded-[22px] border border-line bg-paper-strong p-4">
                <p className="text-lg font-semibold text-ink-950">
                  {getSyncLabel(syncState.mode, translate)}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-500">
                  {t("signedIn.free.stats.accountSync")}
                </p>
              </div>
              <div className="rounded-[22px] border border-line bg-paper-strong p-4">
                <p className="text-lg font-semibold text-ink-950">
                  {entitlement.capabilities.shouldShowAds
                    ? t("signedIn.free.stats.adsEligible")
                    : t("signedIn.free.stats.adsOff")}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-500">
                  {t("signedIn.free.stats.ads")}
                </p>
              </div>
            </div>

            <PremiumFeatureNotice
              className="mt-5"
              title={t("signedIn.free.premiumNotice.title")}
              freeDescription={t("signedIn.free.premiumNotice.freeDescription")}
              description={t("signedIn.free.premiumNotice.description")}
            />

            <PremiumSubscriptionActions
              className="mt-5"
              context="account"
              billingUnavailable={billingUnavailable}
              billingNotConfigured={billingNotConfigured}
            />

            <div className="mt-5 rounded-[24px] border border-line bg-paper-strong p-4">
              <p className="text-sm font-semibold text-ink-950">{t("signedIn.free.scope.title")}</p>
              <p className="mt-2 text-sm leading-6 text-ink-700">
                {t("signedIn.free.scope.description")}
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center rounded-full bg-ink-950 px-5 py-3 text-sm font-semibold transition hover:opacity-90"
                style={{ color: "var(--paper-strong)" }}
              >
                {t("signedIn.actions.openDashboard")}
              </Link>
              <Link
                href="/account/setups"
                className="inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
              >
                {t("signedIn.actions.savedSetups")}
              </Link>
              <Link
                href="/account/compare-setups"
                className="inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
              >
                {t("signedIn.actions.compareSetups")}
              </Link>
              <Link
                href="/account/study-plans"
                className="inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
              >
                {t("signedIn.actions.studyPlans")}
              </Link>
              <button
                type="button"
                onClick={handleManualSync}
                disabled={syncState.mode === "syncing" || isManualSyncing}
                className="inline-flex items-center rounded-full bg-ink-950 px-5 py-3 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ color: "var(--paper-strong)" }}
              >
                {syncState.mode === "syncing" || isManualSyncing
                  ? t("signedIn.actions.syncing")
                  : t("signedIn.actions.syncNow")}
              </button>
              <button
                type="button"
                onClick={() => void signOutAccount()}
                disabled={session.pendingAction === "logout"}
                className="inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {session.pendingAction === "logout"
                  ? t("signedIn.actions.signingOut")
                  : t("signedIn.actions.signOut")}
              </button>
            </div>

            {syncState.errorMessage ? (
              <p className="mt-4 text-sm text-coral-700">{syncState.errorMessage}</p>
            ) : null}

            </PageSection>

            <aside className="grid gap-4">
              <PageSection id="account-profile-details" as="section" className="lab-panel p-5">
                <p className="lab-label">{t("signedIn.details.label")}</p>
                <dl className="mt-4 space-y-3 text-sm text-ink-700">
                  <div className="rounded-[20px] border border-line bg-paper-strong px-4 py-3">
                    <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
                      {t("signedIn.details.accountCreated")}
                    </dt>
                    <dd className="mt-2">{createdAtLabel ?? t("signedIn.details.justNow")}</dd>
                  </div>
                  <div className="rounded-[20px] border border-line bg-paper-strong px-4 py-3">
                    <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
                      {t("signedIn.details.lastSignIn")}
                    </dt>
                    <dd className="mt-2">{signedInAtLabel ?? t("signedIn.details.thisSession")}</dd>
                </div>
                  <div className="rounded-[20px] border border-line bg-paper-strong px-4 py-3">
                    <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
                      {t("signedIn.details.syncStatus")}
                    </dt>
                    <dd className="mt-2">{getSyncLabel(syncState.mode, translate)}</dd>
                  </div>
                  <div className="rounded-[20px] border border-line bg-paper-strong px-4 py-3">
                    <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
                      {t("signedIn.details.lastSync")}
                    </dt>
                    <dd className="mt-2">
                      {getLastSyncStatusLabel(syncState.mode, syncedAtLabel, translate)}
                    </dd>
                  </div>
                  <div className="rounded-[20px] border border-line bg-paper-strong px-4 py-3">
                    <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
                      {t("signedIn.details.activeEntitlement")}
                    </dt>
                    <dd className="mt-2 capitalize">
                      {entitlement.tier === "premium"
                        ? t("signedIn.details.tier.premium")
                        : t("signedIn.details.tier.free")}
                    </dd>
                  </div>
                  <div className="rounded-[20px] border border-line bg-paper-strong px-4 py-3">
                    <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
                      {t("signedIn.details.billingStatus")}
                    </dt>
                    <dd className="mt-2">
                      {getLocalizedBillingLifecycleLabel(
                        billingLifecycleStatus,
                        billing?.currentPeriodEnd ?? null,
                        locale,
                        translate,
                      )}
                    </dd>
                  </div>
                </dl>
              </PageSection>

              <PageSection id="account-password-settings" as="div">
                {authActionsDisabled ? (
                  <DevHarnessAuthCard
                    heading={t("signedIn.free.password.heading")}
                    description={t("signedIn.free.password.devHarnessDescription")}
                    t={translate}
                  />
                ) : (
                  <PasswordManagementCard
                    heading={t("signedIn.free.password.heading")}
                    description={t("signedIn.free.password.description")}
                    email={session.user.email}
                    errorCode={session.errorCode}
                    errorMessage={session.errorMessage}
                    noticeMessage={session.noticeMessage}
                    t={translate}
                    passwordResetPath={passwordResetPath}
                  />
                )}
              </PageSection>

              <PageSection id="account-free-scope" as="section" className="lab-panel p-5">
                <p className="lab-label">{t("signedIn.free.scope.label")}</p>
                <div className="mt-4 grid gap-3">
                  {[
                    t("signedIn.free.scope.items.coreConcepts"),
                    t("signedIn.free.scope.items.tracksAndChallenges"),
                    t("signedIn.free.scope.items.progressSync"),
                    t("signedIn.free.scope.items.publicLinks"),
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-[20px] border border-line bg-paper-strong px-4 py-3 text-sm leading-6 text-ink-700"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </PageSection>

              {savedContinueLearningState ? (
                <PageSection
                  id="account-saved-home-state"
                  as="section"
                  className="lab-panel p-5"
                >
                  <p className="lab-label">{t("signedIn.savedHomeState.label")}</p>
                  <div className="mt-4 grid gap-3">
                    <div className="rounded-[20px] border border-line bg-paper-strong px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
                        {t("signedIn.savedHomeState.resumeConcept")}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-ink-950">
                        {savedContinueLearningState.primaryConcept?.title ??
                          t("signedIn.savedHomeState.none.resume")}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-ink-700">
                        {savedContinueLearningState.primaryConcept?.resumeReason ??
                          savedContinueLearningState.primaryConcept?.masteryNote ??
                          t("signedIn.savedHomeState.notes.resume")}
                      </p>
                    </div>
                    <div className="rounded-[20px] border border-line bg-paper-strong px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
                        {t("signedIn.savedHomeState.currentTrack")}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-ink-950">
                        {savedContinueLearningState.currentTrack?.title ??
                          t("signedIn.savedHomeState.none.track")}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-ink-700">
                        {savedContinueLearningState.currentTrack?.primaryAction?.note ??
                          t("signedIn.savedHomeState.notes.track")}
                      </p>
                    </div>
                    <div className="rounded-[20px] border border-line bg-paper-strong px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
                        {t("signedIn.savedHomeState.followUpCue")}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-ink-950">
                        {savedContinueLearningState.followUp?.title ??
                          savedContinueLearningState.nextRecommendation?.title ??
                          t("signedIn.savedHomeState.none.followUp")}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-ink-700">
                        {savedContinueLearningState.followUp?.reason ??
                          savedContinueLearningState.nextRecommendation?.note ??
                          t("signedIn.savedHomeState.notes.followUp")}
                      </p>
                    </div>
                  </div>
                </PageSection>
              ) : null}
            </aside>
          </div>
          <PageSection id="account-achievements" as="div">
            <AchievementsSection />
          </PageSection>
        </div>
        </PageSectionFrame>
      );
    }

    const sectionNavItems = [
      {
        id: "account-overview",
        label: t("sectionNav.signedIn.overview.label"),
        compactLabel: t("sectionNav.signedIn.overview.compact"),
      },
      {
        id: "account-profile-details",
        label: t("sectionNav.signedIn.profileDetails.label"),
        compactLabel: t("sectionNav.signedIn.profileDetails.compact"),
      },
      {
        id: "account-password-settings",
        label: t("sectionNav.signedIn.passwordSettings.label"),
        compactLabel: t("sectionNav.signedIn.passwordSettings.compact"),
      },
      {
        id: "account-premium-scope",
        label: t("sectionNav.signedIn.premiumScope.label"),
        compactLabel: t("sectionNav.signedIn.premiumScope.compact"),
      },
      ...(savedContinueLearningState
        ? [
            {
              id: "account-saved-home-state",
              label: t("sectionNav.signedIn.savedHomeState.label"),
              compactLabel: t("sectionNav.signedIn.savedHomeState.compact"),
            },
          ]
        : []),
      {
        id: "account-achievements",
        label: t("sectionNav.signedIn.achievements.label"),
        compactLabel: t("sectionNav.signedIn.achievements.compact"),
      },
    ];

    return (
      <PageSectionFrame
        sectionNav={{
          label: t("sectionNav.label"),
          title: t("sectionNav.title"),
          mobileLabel: t("sectionNav.mobileLabel"),
          items: sectionNavItems,
        }}
      >
        {leadIn ? <div className="mb-6 space-y-3 sm:mb-8">{leadIn}</div> : null}
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <PageSection id="account-overview" as="section" className="lab-panel p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="lab-label">{t("signedIn.label")}</span>
                <span className="rounded-full border border-teal-500/25 bg-teal-500/10 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-teal-700">
                  {t("signedIn.premium.badges.premium")}
                </span>
                <span
                  className={[
                    "rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
                    getSyncTone(syncState.mode),
                  ].join(" ")}
                >
                  {getSyncLabel(syncState.mode, translate)}
                </span>
              </div>

              <h2 className="mt-3 text-3xl font-semibold text-ink-950">
                {localizedAccountDisplayName}
              </h2>
              <p className="mt-2 text-sm leading-6 text-ink-700">
                {t("signedIn.premium.description", { email: session.user.email })}
              </p>

              {entitlementUnavailable ? (
                <div className="mt-5 rounded-[24px] border border-amber-500/25 bg-amber-500/10 p-4">
                  <p className="text-sm font-semibold text-ink-950">
                    {t("signedIn.entitlementUnavailable.title")}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink-700">
                    {t("signedIn.premium.entitlementUnavailable.body")}
                  </p>
                </div>
              ) : null}

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[22px] border border-line bg-paper-strong p-4">
                  <p className="text-lg font-semibold text-ink-950">{conceptCount}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-500">
                    {t("signedIn.premium.stats.conceptRecordsHere")}
                  </p>
                </div>
                <div className="rounded-[22px] border border-line bg-paper-strong p-4">
                  <p className="text-lg font-semibold text-ink-950">
                    {syncState.lastMergeSummary?.mergedConceptCount ?? conceptCount}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-500">
                    {t("signedIn.premium.stats.syncedConcepts")}
                  </p>
                </div>
                <div className="rounded-[22px] border border-line bg-paper-strong p-4">
                  <p className="text-lg font-semibold text-ink-950">
                    {syncState.lastMergeSummary?.importedLocalConceptCount ?? 0}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-500">
                    {t("signedIn.premium.stats.localImports")}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-[24px] border border-line bg-paper-strong p-4">
                <p className="text-sm font-semibold text-ink-950">
                  {t("signedIn.premium.merge.label")}
                </p>
                <p className="mt-2 text-sm leading-6 text-ink-700">{syncMessage}</p>
                <p className="mt-2 text-sm leading-6 text-ink-700">
                  {t("signedIn.premium.merge.description")}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
                >
                  {t("signedIn.actions.openDashboard")}
                </Link>
                <Link
                  href="/account/setups"
                  className="inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
                >
                  {t("signedIn.actions.savedSetups")}
                </Link>
                <Link
                  href="/account/compare-setups"
                  className="inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
                >
                  {t("signedIn.actions.compareSetups")}
                </Link>
                <Link
                  href="/account/study-plans"
                  className="inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
                >
                  {t("signedIn.actions.studyPlans")}
                </Link>
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={syncState.mode === "syncing" || isManualSyncing}
                  className="inline-flex items-center rounded-full bg-ink-950 px-5 py-3 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ color: "var(--paper-strong)" }}
                >
                  {syncState.mode === "syncing" || isManualSyncing
                    ? t("signedIn.actions.syncing")
                    : t("signedIn.actions.syncNow")}
                </button>
                <button
                  type="button"
                  onClick={() => void signOutAccount()}
                  disabled={session.pendingAction === "logout"}
                  className="inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {session.pendingAction === "logout"
                    ? t("signedIn.actions.signingOut")
                    : t("signedIn.actions.signOut")}
                </button>
              </div>

              <PremiumSubscriptionActions
                className="mt-5"
                context="account"
                billingUnavailable={billingUnavailable}
                billingNotConfigured={billingNotConfigured}
              />

              {syncState.errorMessage ? (
                <p className="mt-4 text-sm text-coral-700">{syncState.errorMessage}</p>
              ) : null}
            </PageSection>

            <aside className="grid gap-4">
              <PageSection id="account-profile-details" as="section" className="lab-panel p-5">
                <p className="lab-label">{t("signedIn.details.label")}</p>
                <dl className="mt-4 space-y-3 text-sm text-ink-700">
                  <div className="rounded-[20px] border border-line bg-paper-strong px-4 py-3">
                    <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
                      {t("signedIn.details.accountCreated")}
                    </dt>
                    <dd className="mt-2">{createdAtLabel ?? t("signedIn.details.justNow")}</dd>
                  </div>
                  <div className="rounded-[20px] border border-line bg-paper-strong px-4 py-3">
                    <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
                      {t("signedIn.details.lastSignIn")}
                    </dt>
                    <dd className="mt-2">{signedInAtLabel ?? t("signedIn.details.thisSession")}</dd>
                  </div>
                  <div className="rounded-[20px] border border-line bg-paper-strong px-4 py-3">
                    <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
                      {t("signedIn.details.lastSync")}
                    </dt>
                    <dd className="mt-2">
                      {getLastSyncStatusLabel(syncState.mode, syncedAtLabel, translate)}
                    </dd>
                  </div>
                  <div className="rounded-[20px] border border-line bg-paper-strong px-4 py-3">
                    <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
                      {t("signedIn.details.ads")}
                    </dt>
                    <dd className="mt-2">
                      {entitlement.capabilities.shouldShowAds
                        ? t("signedIn.details.adsEligible")
                        : t("signedIn.details.adFree")}
                    </dd>
                  </div>
                  <div className="rounded-[20px] border border-line bg-paper-strong px-4 py-3">
                    <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
                      {t("signedIn.details.billingStatus")}
                    </dt>
                    <dd className="mt-2">
                      {getLocalizedBillingLifecycleLabel(
                        billingLifecycleStatus,
                        billing?.currentPeriodEnd ?? null,
                        locale,
                        translate,
                      )}
                    </dd>
                  </div>
                </dl>
              </PageSection>

              <PageSection id="account-password-settings" as="div">
                {authActionsDisabled ? (
                  <DevHarnessAuthCard
                    heading={t("signedIn.premium.password.heading")}
                    description={t("signedIn.premium.password.devHarnessDescription")}
                    t={translate}
                  />
                ) : (
                  <PasswordManagementCard
                    heading={t("signedIn.premium.password.heading")}
                    description={t("signedIn.premium.password.description")}
                    email={session.user.email}
                    errorCode={session.errorCode}
                    errorMessage={session.errorMessage}
                    noticeMessage={session.noticeMessage}
                    t={translate}
                    passwordResetPath={passwordResetPath}
                  />
                )}
              </PageSection>

              <PageSection id="account-premium-scope" as="section" className="lab-panel p-5">
                <p className="lab-label">{t("signedIn.premium.scope.label")}</p>
                <p className="mt-3 text-sm leading-6 text-ink-700">
                  {t("signedIn.premium.scope.description")}
                </p>
              </PageSection>

              {savedContinueLearningState ? (
                <PageSection
                  id="account-saved-home-state"
                  as="section"
                  className="lab-panel p-5"
                >
                  <p className="lab-label">{t("signedIn.savedHomeState.label")}</p>
                  <div className="mt-4 grid gap-3">
                    <div className="rounded-[20px] border border-line bg-paper-strong px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
                        {t("signedIn.savedHomeState.resumeConcept")}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-ink-950">
                        {savedContinueLearningState.primaryConcept?.title ??
                          t("signedIn.savedHomeState.none.resume")}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-ink-700">
                        {savedContinueLearningState.primaryConcept?.resumeReason ??
                          savedContinueLearningState.primaryConcept?.masteryNote ??
                          t("signedIn.savedHomeState.notes.resume")}
                      </p>
                    </div>
                    <div className="rounded-[20px] border border-line bg-paper-strong px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
                        {t("signedIn.savedHomeState.currentTrack")}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-ink-950">
                        {savedContinueLearningState.currentTrack?.title ??
                          t("signedIn.savedHomeState.none.track")}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-ink-700">
                        {savedContinueLearningState.currentTrack?.primaryAction?.note ??
                          t("signedIn.savedHomeState.notes.track")}
                      </p>
                    </div>
                    <div className="rounded-[20px] border border-line bg-paper-strong px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
                        {t("signedIn.savedHomeState.followUpCue")}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-ink-950">
                        {savedContinueLearningState.followUp?.title ??
                          savedContinueLearningState.nextRecommendation?.title ??
                          t("signedIn.savedHomeState.none.followUp")}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-ink-700">
                        {savedContinueLearningState.followUp?.reason ??
                          savedContinueLearningState.nextRecommendation?.note ??
                          t("signedIn.savedHomeState.notes.followUp")}
                      </p>
                    </div>
                  </div>
                </PageSection>
              ) : null}
            </aside>
          </div>
          <PageSection id="account-achievements" as="div">
            <AchievementsSection />
          </PageSection>
        </div>
      </PageSectionFrame>
    );
  }

  const sectionNavItems = [
    {
      id: "account-overview",
      label: t("sectionNav.signedOut.overview.label"),
      compactLabel: t("sectionNav.signedOut.overview.compact"),
    },
    {
      id: "account-password-sign-in",
      label: t("sectionNav.signedOut.password.label"),
      compactLabel: t("sectionNav.signedOut.password.compact"),
    },
    {
      id: "account-email-link-sign-in",
      label: t("sectionNav.signedOut.emailLink.label"),
      compactLabel: t("sectionNav.signedOut.emailLink.compact"),
    },
    {
      id: "account-password-reset",
      label: t("sectionNav.signedOut.passwordReset.label"),
      compactLabel: t("sectionNav.signedOut.passwordReset.compact"),
    },
    {
      id: "account-premium-billing",
      label: t("sectionNav.signedOut.premium.label"),
      compactLabel: t("sectionNav.signedOut.premium.compact"),
    },
  ];

  return (
    <PageSectionFrame
      sectionNav={{
        label: t("sectionNav.label"),
        title: t("sectionNav.title"),
        mobileLabel: t("sectionNav.mobileLabel"),
        items: sectionNavItems,
      }}
    >
    {leadIn ? <div className="mb-6 space-y-3 sm:mb-8">{leadIn}</div> : null}
    <div className="space-y-4">
      <PageSection id="account-overview" as="section" className="lab-panel p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="lab-label">{t("signedOut.label")}</span>
          <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
            {t("signedOut.badge")}
          </span>
        </div>

        <div className="mt-3 max-w-4xl space-y-3">
          <h2 className="text-3xl font-semibold text-ink-950">{t("signedOut.title")}</h2>
          <p className="text-sm leading-6 text-ink-700">{t("signedOut.description")}</p>
        </div>
        {authActionsDisabled ? (
          <div className="mt-5 rounded-[24px] border border-amber-500/25 bg-amber-500/10 p-4">
            <p className="text-sm font-semibold text-ink-950">{t("devHarness.title")}</p>
            <p className="mt-2 text-sm leading-6 text-ink-700">{t("signedOut.devHarnessDescription")}</p>
            <Link
              href="/dev/account-harness"
              className="mt-4 inline-flex items-center rounded-full bg-ink-950 px-5 py-3 text-sm font-semibold transition hover:opacity-90"
              style={{ color: "var(--paper-strong)" }}
            >
              {t("devHarness.action")}
            </Link>
          </div>
        ) : null}
        {generalSessionErrorMessage ? (
          <div className="mt-5">
            <AuthStatusCallout
              tone="error"
              title={t("status.accountErrorTitle")}
              message={generalSessionErrorMessage}
            />
          </div>
        ) : null}
        {authQueryErrorNotice ? (
          <div className="mt-5">
            <AuthStatusCallout
              tone="error"
              title={t("status.emailLinkProblemTitle")}
              message={authQueryErrorNotice}
            />
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            {
              label: t("signedOut.cards.localFirst.label"),
              copy: t("signedOut.cards.localFirst.copy"),
            },
            {
              label: t("signedOut.cards.emailLinks.label"),
              copy: t("signedOut.cards.emailLinks.copy"),
            },
            {
              label: t("signedOut.cards.sync.label"),
              copy: t("signedOut.cards.sync.copy"),
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-[20px] border border-line bg-paper-strong px-4 py-4"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
                {item.label}
              </p>
              <p className="mt-2 text-sm leading-6 text-ink-700">{item.copy}</p>
            </div>
          ))}
        </div>

      </PageSection>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <PageSection
            id="account-password-sign-in"
            as="section"
            className="flex h-full min-w-0 flex-col rounded-[24px] border border-line bg-paper-strong p-5"
          >
            <p className="lab-label">{t("passwordSignIn.label")}</p>
            <h3 className="mt-2 text-2xl font-semibold text-ink-950">{t("passwordSignIn.title")}</h3>
            <p className="mt-3 text-sm leading-6 text-ink-700">{t("passwordSignIn.description")}</p>

            <form className="mt-4 space-y-4" onSubmit={handlePasswordSignIn} noValidate>
              <div className="space-y-2">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-ink-900">
                    {t("passwordSignIn.emailLabel")}
                  </span>
                  <input
                    type="email"
                    value={passwordEmail}
                    onChange={(event) => {
                      setPasswordEmail(event.target.value);
                      setDismissedPasswordSignInError(true);
                      if (passwordEmailError) {
                    setPasswordEmailError(getEmailFieldError(event.target.value, translate));
                      }
                    }}
                    disabled={authActionsDisabled}
                    required
                    autoComplete="email"
                    aria-invalid={passwordEmailError ? true : undefined}
                    className="w-full rounded-[18px] border border-line bg-paper px-4 py-3 text-sm text-ink-900 outline-none transition focus:border-teal-500"
                  />
                </label>
                {passwordEmailError ? (
                  <p className="text-sm text-coral-700" role="alert">
                    {passwordEmailError}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-ink-900">{t("passwordSignIn.passwordLabel")}</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setDismissedPasswordSignInError(true);
                      if (passwordFieldError) {
                    setPasswordFieldError(getPasswordFieldError(event.target.value, translate));
                      }
                    }}
                    disabled={authActionsDisabled}
                    required
                    minLength={ACCOUNT_PASSWORD_MIN_LENGTH}
                    autoComplete="current-password"
                    aria-invalid={passwordFieldError ? true : undefined}
                    className="w-full rounded-[18px] border border-line bg-paper px-4 py-3 text-sm text-ink-900 outline-none transition focus:border-teal-500"
                  />
                </label>
                <p className={`text-xs ${passwordFieldError ? "text-coral-700" : "text-ink-600"}`}>
                  {passwordFieldError ?? passwordRequirementMessage}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={authActionsDisabled || Boolean(session.pendingAction)}
                  className="inline-flex w-full items-center justify-center rounded-full bg-ink-950 px-5 py-3 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  style={{ color: "var(--paper-strong)" }}
                >
                  {session.pendingAction === "password-sign-in"
                    ? t("passwordSignIn.actions.signingIn")
                    : t("passwordSignIn.actions.submit")}
                </button>
              </div>
            </form>

            {session.pendingAction === "password-sign-in" ? (
              <div className="mt-4">
                <AuthStatusCallout
                  tone="pending"
                  title={t("passwordSignIn.status.pendingTitle")}
                  message={t("passwordSignIn.status.pendingMessage")}
                />
              </div>
            ) : null}
            {passwordSignInErrorMessage ? (
              <div className="mt-4">
                <AuthStatusCallout
                  tone="error"
                  title={t("passwordSignIn.status.errorTitle")}
                  message={passwordSignInErrorMessage}
                />
              </div>
            ) : null}
            <p className="mt-4 text-sm leading-6 text-ink-700">
              {t("passwordSignIn.note")}
            </p>
          </PageSection>

          <PageSection
            id="account-email-link-sign-in"
            as="section"
            className="flex h-full min-w-0 flex-col rounded-[24px] border border-line bg-paper-strong p-5"
          >
            <p className="lab-label">{t("emailLink.label")}</p>
            <h3 className="mt-2 text-2xl font-semibold text-ink-950">{t("emailLink.title")}</h3>
            <p className="mt-3 text-sm leading-6 text-ink-700">{t("emailLink.description")}</p>

            <form className="mt-4 space-y-4" onSubmit={handleMagicLinkRequest} noValidate>
              <div className="space-y-2">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-ink-900">{t("emailLink.emailLabel")}</span>
                  <input
                    type="email"
                    value={emailLinkEmail}
                    onChange={(event) => {
                      setEmailLinkEmail(event.target.value);
                      setMagicLinkStatusMessage(null);
                      if (emailLinkEmailError) {
                    setEmailLinkEmailError(getEmailFieldError(event.target.value, translate));
                      }
                    }}
                    disabled={authActionsDisabled}
                    required
                    autoComplete="email"
                    aria-invalid={emailLinkEmailError ? true : undefined}
                    className="w-full rounded-[18px] border border-line bg-paper px-4 py-3 text-sm text-ink-900 outline-none transition focus:border-teal-500"
                  />
                </label>
                {emailLinkEmailError ? (
                  <p className="text-sm text-coral-700" role="alert">
                    {emailLinkEmailError}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={
                    authActionsDisabled ||
                    Boolean(session.pendingAction) ||
                    !emailLinkEmail.trim() ||
                    isMagicLinkCooldownActive
                  }
                  className="inline-flex w-full items-center justify-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {session.pendingAction === "magic-link"
                    ? t("emailLink.actions.sending")
                    : isMagicLinkCooldownActive
                      ? t("emailLink.actions.wait")
                      : t("emailLink.actions.send")}
                </button>
              </div>
            </form>

            {session.pendingAction === "magic-link" ? (
              <div className="mt-4">
                <AuthStatusCallout
                  tone="pending"
                  title={t("emailLink.status.pendingTitle")}
                  message={t("emailLink.status.pendingMessage")}
                />
              </div>
            ) : null}
            {magicLinkStatusMessage ? (
              <div className="mt-4">
                <AuthStatusCallout {...magicLinkStatusMessage} />
              </div>
            ) : null}
            {isMagicLinkCooldownActive ? (
              <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-ink-500">
                {t("emailLink.cooldown", {
                  countdown: formatCountdown(magicLinkCooldownRemainingMs),
                })}
              </p>
            ) : null}
          </PageSection>

          <PageSection
            id="account-password-reset"
            as="section"
            className="flex h-full min-w-0 flex-col rounded-[24px] border border-line bg-paper-strong p-5 md:col-span-2 xl:col-span-1"
          >
            <p className="lab-label">{t("passwordReset.label")}</p>
            <h3 className="mt-2 text-2xl font-semibold text-ink-950">{t("passwordReset.title")}</h3>
            <p className="mt-3 text-sm leading-6 text-ink-700">{t("passwordReset.description")}</p>

            <form className="mt-4 space-y-4" onSubmit={handlePasswordResetRequest} noValidate>
              <div className="space-y-2">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-ink-900">
                    {t("passwordReset.emailLabel")}
                  </span>
                  <input
                    type="email"
                    value={passwordResetEmail}
                    onChange={(event) => {
                      setPasswordResetEmail(event.target.value);
                      setPasswordResetStatusMessage(null);
                      if (passwordResetEmailError) {
                    setPasswordResetEmailError(getEmailFieldError(event.target.value, translate));
                      }
                    }}
                    disabled={authActionsDisabled}
                    required
                    autoComplete="email"
                    aria-invalid={passwordResetEmailError ? true : undefined}
                    className="w-full rounded-[18px] border border-line bg-paper px-4 py-3 text-sm text-ink-900 outline-none transition focus:border-teal-500"
                  />
                </label>
                {passwordResetEmailError ? (
                  <p className="text-sm text-coral-700" role="alert">
                    {passwordResetEmailError}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={
                    authActionsDisabled ||
                    Boolean(session.pendingAction) ||
                    !passwordResetEmail.trim()
                  }
                  className="inline-flex w-full items-center justify-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {session.pendingAction === "password-reset"
                    ? t("passwordReset.actions.sending")
                    : t("passwordReset.actions.send")}
                </button>
              </div>
            </form>

            {session.pendingAction === "password-reset" ? (
              <div className="mt-4">
                <AuthStatusCallout
                  tone="pending"
                  title={t("passwordReset.status.pendingTitle")}
                  message={t("passwordReset.status.pendingMessage")}
                />
              </div>
            ) : null}
            {passwordResetStatusMessage ? (
              <div className="mt-4">
                <AuthStatusCallout {...passwordResetStatusMessage} />
              </div>
            ) : null}
          </PageSection>
      </div>

      <PageSection id="account-premium-billing" as="div" className="space-y-5">
        <PremiumFeatureNotice
          className="mt-6"
          title={t("signedOut.premiumNotice.title")}
          freeDescription={t("signedOut.premiumNotice.freeDescription")}
          description={t("signedOut.premiumNotice.description")}
          showSignInCta={false}
        />

        {billingReturnQueryState ? (
          <PremiumSubscriptionActions
            className="mt-5"
            context="account"
          />
        ) : null}

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/billing"
            className="inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
          >
            {t("signedOut.actions.billing")}
          </Link>
        </div>
      </PageSection>
    </div>
    </PageSectionFrame>
  );
}
