"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import type { AppLocale } from "@/i18n/routing";
import { updateAccountPassword, useAccountSession } from "@/lib/account/client";
import { ACCOUNT_PASSWORD_MIN_LENGTH } from "@/lib/account/model";
import { localizeShareHref } from "@/lib/share-links";

function resolveContinuePath(nextPath: string | null) {
  if (nextPath && nextPath.startsWith("/")) {
    return nextPath;
  }

  return "/dashboard";
}

export function PostConfirmationPasswordSetupPanel() {
  const t = useTranslations("PostConfirmationPasswordSetupPanel");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useAccountSession();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const passwordRequirementMessage = t("passwordRequirement", {
    count: ACCOUNT_PASSWORD_MIN_LENGTH,
  });
  const passwordTooShort = password.length > 0 && password.length < ACCOUNT_PASSWORD_MIN_LENGTH;
  const confirmPasswordTooShort =
    confirmPassword.length > 0 && confirmPassword.length < ACCOUNT_PASSWORD_MIN_LENGTH;
  const continuePath = useMemo(
    () => resolveContinuePath(searchParams.get("next")),
    [searchParams],
  );
  const skipLabel =
    continuePath === "/dashboard" ? t("actions.skipToDashboard") : t("actions.skipForNow");

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
      setLocalError(t("errors.passwordMismatch"));
      return;
    }

    setLocalError(null);
    const result = await updateAccountPassword(password);

    if (result.ok) {
      router.push(localizeShareHref(continuePath, locale));
    }
  }

  if (!session.initialized) {
    return (
      <section className="lab-panel p-6">
        <p className="lab-label">{t("loading.label")}</p>
        <p className="mt-3 text-sm leading-6 text-ink-700">{t("loading.description")}</p>
      </section>
    );
  }

  if (session.status !== "signed-in" || !session.user) {
    return (
      <section className="lab-panel p-6">
        <p className="lab-label">{t("signedOut.label")}</p>
        <h2 className="mt-3 text-3xl font-semibold text-ink-950">{t("signedOut.title")}</h2>
        <p className="mt-3 text-sm leading-6 text-ink-700">{t("signedOut.description")}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={localizeShareHref("/account", locale)}
            className="inline-flex items-center rounded-full bg-ink-950 px-5 py-3 text-sm font-semibold transition hover:opacity-90"
            style={{ color: "var(--paper-strong)" }}
          >
            {t("actions.backToAccount")}
          </Link>
        </div>
      </section>
    );
  }

  if (session.authMode === "dev-harness") {
    return (
      <section className="lab-panel p-6">
        <p className="lab-label">{t("devHarness.label")}</p>
        <h2 className="mt-3 text-3xl font-semibold text-ink-950">{t("devHarness.title")}</h2>
        <p className="mt-3 text-sm leading-6 text-ink-700">{t("devHarness.description")}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={localizeShareHref("/dev/account-harness", locale)}
            className="inline-flex items-center rounded-full bg-ink-950 px-5 py-3 text-sm font-semibold transition hover:opacity-90"
            style={{ color: "var(--paper-strong)" }}
          >
            {t("actions.openDevHarness")}
          </Link>
          <Link
            href={localizeShareHref(continuePath, locale)}
            className="inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
          >
            {t("actions.continueWithoutChangingAuth")}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="lab-panel p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="lab-label">{t("form.label")}</span>
        <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
          {t("form.badge")}
        </span>
      </div>

      <h2 className="mt-3 text-3xl font-semibold text-ink-950">{t("form.title")}</h2>
      <p className="mt-3 text-sm leading-6 text-ink-700">{t("form.description")}</p>
      <p className="mt-3 text-sm leading-6 text-ink-700">{t("form.secondaryDescription")}</p>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-ink-900">{t("fields.newPassword")}</span>
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
            <span className="text-sm font-medium text-ink-900">{t("fields.confirmPassword")}</span>
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

        <div className="flex flex-wrap gap-3">
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
              ? t("actions.savingPassword")
              : t("actions.savePasswordAndContinue")}
          </button>
          <Link
            href={localizeShareHref(continuePath, locale)}
            className="inline-flex items-center rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
          >
            {skipLabel}
          </Link>
        </div>
      </form>

      {localError ? <p className="mt-4 text-sm text-coral-700">{localError}</p> : null}
      {session.errorMessage ? <p className="mt-4 text-sm text-coral-700">{session.errorMessage}</p> : null}
      {session.noticeMessage ? <p className="mt-4 text-sm text-teal-700">{session.noticeMessage}</p> : null}
    </section>
  );
}
