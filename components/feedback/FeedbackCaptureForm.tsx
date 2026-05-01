"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { trackLearningEvent } from "@/lib/analytics";
import {
  buildFeedbackMailtoHref,
  feedbackCategories,
  feedbackHoneypotFieldName,
  formatFeedbackContextLabel,
  normalizeFeedbackContext,
  previewFeedbackEmail,
  type FeedbackCategoryId,
  type FeedbackContext,
  type FeedbackRuntimeContext,
  type FeedbackSurface,
} from "@/lib/feedback";

type FeedbackCaptureFormProps = {
  context: FeedbackContext;
  fallbackEmail?: string;
  variant?: "compact" | "page";
};

type SubmitState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

type DeliveryState = "checking" | "available" | "fallback" | "unknown";
type DeliveryReason = "configured" | "missing_config" | "invalid_config" | "unknown";

const initialSubmitState: SubmitState = { kind: "idle" };

type Translator = (key: string, values?: Record<string, unknown>) => string;

function getTranslatedFeedbackCategories(t: Translator) {
  return feedbackCategories.map((item) => ({
    ...item,
    label: t(`categories.${item.id}.label`),
    hint: t(`categories.${item.id}.hint`),
  }));
}

function clipOptionalText(value: string | undefined, maxLength: number) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  return trimmed.slice(0, maxLength);
}

function pickRuntimeUrl(value: string | undefined, maxLength = 400) {
  const trimmed = value?.trim();

  if (!trimmed || trimmed.length > maxLength) {
    return undefined;
  }

  return trimmed;
}

function collectRuntimeContext(
  surface: FeedbackSurface,
  context: FeedbackContext,
): Partial<FeedbackRuntimeContext> {
  if (typeof window === "undefined") {
    return { surface };
  }

  return {
    surface,
    pageHref: pickRuntimeUrl(window.location.href),
    pageTitle: clipOptionalText(document.title || context.pageTitle, 160),
    referrer: clipOptionalText(document.referrer, 400),
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  };
}

function getErrorState(
  code: string | undefined,
  fallbackEmail?: string,
  t?: Translator,
): { message: string; nextDeliveryState: DeliveryState } | null {
  const retryNote = fallbackEmail
    ? t?.("errors.retryWithFallbackEmail", { email: fallbackEmail }) ??
      ` Try sending again, or use the prefilled email fallback to ${fallbackEmail} instead.`
    : t?.("errors.retryWithoutFallbackEmail") ??
      " Try sending again, or use the prefilled email fallback instead.";
  const fallbackOnlyNote = fallbackEmail
    ? t?.("errors.openFallbackEmail", { email: fallbackEmail }) ??
      ` Open the prefilled email draft to ${fallbackEmail} instead, or recheck delivery if this just changed.`
    : t?.("errors.openFallbackNoEmail") ??
      " Open the prefilled email draft instead, or recheck delivery if this just changed.";

  switch (code) {
    case "delivery_not_configured":
    case "delivery_config_invalid":
      return {
        message:
          t?.("errors.prefilledFallbackInUse", { note: fallbackOnlyNote }) ??
          `This deployment is currently using the prefilled email fallback.${fallbackOnlyNote}`,
        nextDeliveryState: "fallback",
      };
    case "delivery_timeout":
      return {
        message:
          t?.("errors.deliveryTimeout", { note: retryNote }) ??
          `The feedback inbox did not confirm this note in time.${retryNote}`,
        nextDeliveryState: "available",
      };
    case "delivery_rejected":
      return {
        message:
          t?.("errors.deliveryRejected", { note: retryNote }) ??
          `The delivery provider rejected this note before it reached the inbox.${retryNote}`,
        nextDeliveryState: "available",
      };
    case "delivery_network_error":
      return {
        message:
          t?.("errors.deliveryNetworkError", { note: retryNote }) ??
          `The server could not reach the delivery provider for this note.${retryNote}`,
        nextDeliveryState: "available",
      };
    case "rate_limited":
      return {
        message:
          t?.("errors.rateLimited", { note: retryNote }) ??
          `Too many notes came from this browser or network recently.${retryNote}`,
        nextDeliveryState: "available",
      };
    default:
      return null;
  }
}

export function FeedbackCaptureForm({
  context,
  fallbackEmail: initialFallbackEmail = previewFeedbackEmail,
  variant = "page",
}: FeedbackCaptureFormProps) {
  const t = useTranslations("FeedbackCaptureForm");
  const tUnsafe = t as unknown as Translator;
  const locale = useLocale();
  const surface: FeedbackSurface = variant === "compact" ? "widget" : "page";
  const resolvedContext = normalizeFeedbackContext(context);
  const {
    conceptId,
    conceptSlug,
    conceptTitle,
    pagePath,
    pageTitle,
    pageType,
    topicSlug,
    topicTitle,
    trackSlug,
    trackTitle,
  } = resolvedContext;
  const emailLinkRef = useRef<HTMLAnchorElement | null>(null);
  const [category, setCategory] = useState<FeedbackCategoryId>(feedbackCategories[0].id);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [fallbackEmailOverride, setFallbackEmailOverride] = useState<string | null>(null);
  const [fallbackHrefOverride, setFallbackHrefOverride] = useState<string | null>(null);
  const [deliveryState, setDeliveryState] = useState<DeliveryState>("checking");
  const [deliveryReason, setDeliveryReason] = useState<DeliveryReason>("unknown");
  const [configRefreshKey, setConfigRefreshKey] = useState(0);
  const [configRefreshing, setConfigRefreshing] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>(initialSubmitState);
  const [runtimeContext, setRuntimeContext] = useState<Partial<FeedbackRuntimeContext>>({
    surface,
  });
  const fallbackEmail = fallbackEmailOverride ?? initialFallbackEmail;
  const translatedCategories = getTranslatedFeedbackCategories(tUnsafe);

  useEffect(() => {
    setRuntimeContext(
      collectRuntimeContext(surface, {
        conceptId,
        conceptSlug,
        conceptTitle,
        pagePath,
        pageTitle,
        pageType,
        topicSlug,
        topicTitle,
        trackSlug,
        trackTitle,
      }),
    );
  }, [
    conceptId,
    conceptSlug,
    conceptTitle,
    pagePath,
    pageTitle,
    pageType,
    surface,
    topicSlug,
    topicTitle,
    trackSlug,
    trackTitle,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function syncFeedbackConfig() {
      setConfigRefreshing(true);

      try {
        const response = await fetch("/api/feedback", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          if (!cancelled) {
            setDeliveryState("unknown");
          }
          return;
        }

        const payload = (await response.json().catch(() => null)) as
          | {
              deliveryEnabled?: boolean;
              deliveryReason?: DeliveryReason;
              fallbackEmail?: string;
            }
          | null;

        if (cancelled || !payload) {
          return;
        }

        if (payload.fallbackEmail) {
          setFallbackEmailOverride(payload.fallbackEmail);
        }

        if (typeof payload.deliveryEnabled === "boolean") {
          setDeliveryState(payload.deliveryEnabled ? "available" : "fallback");
          setDeliveryReason(
            payload.deliveryEnabled
              ? "configured"
              : payload.deliveryReason === "invalid_config"
                ? "invalid_config"
                : payload.deliveryReason === "missing_config"
                  ? "missing_config"
                  : "unknown",
          );
          return;
        }
      } catch {
        if (!cancelled) {
          setDeliveryState("unknown");
          setDeliveryReason("unknown");
        }
      } finally {
        if (!cancelled) {
          setConfigRefreshing(false);
        }
      }

      if (!cancelled) {
        setDeliveryState("unknown");
        setDeliveryReason("unknown");
      }
    }

    void syncFeedbackConfig();

    return () => {
      cancelled = true;
    };
  }, [configRefreshKey]);

  const selectedCategory =
    translatedCategories.find((item) => item.id === category) ?? translatedCategories[0];
  const messageLength = message.trim().length;
  const canSubmit = messageLength >= 12 && submitState.kind !== "sending";
  const sendDisabled = !canSubmit || deliveryState === "fallback";
  const remainingCharacters = Math.max(0, 12 - messageLength);
  const contextLabel = formatFeedbackContextLabel(resolvedContext);
  const formattedRemainingCharacters = new Intl.NumberFormat(locale).format(remainingCharacters);
  const emailHref =
    fallbackHrefOverride ??
    buildFeedbackMailtoHref(
      {
        category,
        contact,
        context: resolvedContext,
        message,
        runtime: runtimeContext,
      },
      fallbackEmail,
    );
  const submitLabel =
    submitState.kind === "sending"
      ? t("buttons.sendingFeedback")
      : deliveryState === "fallback"
        ? t("buttons.deliveryUnavailable")
        : t("buttons.sendFeedback");
  const emailActionLabel =
    deliveryState === "fallback"
      ? t("buttons.openPrefilledEmailDraft")
      : t("buttons.emailInstead");
  const deliveryStateMessage =
    deliveryState === "checking"
      ? t("delivery.checking")
      : deliveryState === "fallback"
        ? deliveryReason === "invalid_config"
          ? t("delivery.fallbackInvalid")
          : t("delivery.fallbackNotConfigured")
        : deliveryState === "unknown"
          ? t("delivery.unknown")
          : t("delivery.available");

  function focusEmailFallbackLink() {
    if (typeof window === "undefined") {
      return;
    }

    window.setTimeout(() => {
      emailLinkRef.current?.focus();
    }, 0);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      setSubmitState({
        kind: "error",
        message: t("errors.shortNote"),
      });
      return;
    }

    if (deliveryState === "fallback") {
      setSubmitState({
        kind: "error",
        message: fallbackEmail
          ? t("errors.fallbackWithEmail", { email: fallbackEmail })
          : t("errors.fallbackWithoutEmail"),
      });
      focusEmailFallbackLink();
      return;
    }

    setSubmitState({ kind: "sending" });
    setFallbackHrefOverride(null);

    const nextRuntimeContext = collectRuntimeContext(surface, resolvedContext);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          category,
          contact,
          context: resolvedContext,
          message,
          runtime: nextRuntimeContext,
          [feedbackHoneypotFieldName]: honeypot,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            code?: string;
            error?: string;
            fallbackEmail?: string;
            fallbackHref?: string;
          }
        | null;

      if (!response.ok) {
        const nextFallbackEmail = payload?.fallbackEmail || fallbackEmail;
        const nextErrorState = getErrorState(payload?.code, nextFallbackEmail, tUnsafe);
        setFallbackEmailOverride(nextFallbackEmail);
        setFallbackHrefOverride(
          typeof payload?.fallbackHref === "string" ? payload.fallbackHref : null,
        );

        if (nextErrorState) {
          setDeliveryState(nextErrorState.nextDeliveryState);
        } else {
          setDeliveryState("unknown");
        }
        setDeliveryReason(
          payload?.code === "delivery_config_invalid"
            ? "invalid_config"
            : payload?.code === "delivery_not_configured"
              ? "missing_config"
              : nextErrorState
                ? "configured"
                : "unknown",
        );

        setSubmitState({
          kind: "error",
          message:
            nextErrorState?.message ||
            (fallbackEmail
              ? t("errors.deliveryFailedWithEmail", { email: fallbackEmail })
              : t("errors.deliveryFailedWithoutEmail")),
        });
        focusEmailFallbackLink();
        return;
      }

      setMessage("");
      setContact("");
      setHoneypot("");
      setFallbackHrefOverride(null);
      setDeliveryState("available");
      setDeliveryReason("configured");
      trackLearningEvent("feedback_submitted", {
        pagePath: resolvedContext.pagePath,
        pageTitle: resolvedContext.pageTitle,
        pageType: resolvedContext.pageType,
        conceptId: resolvedContext.conceptId,
        conceptSlug: resolvedContext.conceptSlug,
        conceptTitle: resolvedContext.conceptTitle,
        topicSlug: resolvedContext.topicSlug,
        trackSlug: resolvedContext.trackSlug,
        trackTitle: resolvedContext.trackTitle,
        feedbackCategory: category,
        surface,
        source: "feedback-form",
      });
      setSubmitState({
        kind: "success",
        message: t("success.sentForContext", { context: contextLabel }),
      });
    } catch {
      setDeliveryState("unknown");
      setDeliveryReason("unknown");
      setSubmitState({
        kind: "error",
        message: fallbackEmail
          ? t("errors.deliveryFailedWithEmail", { email: fallbackEmail })
          : t("errors.deliveryFailedWithoutEmail"),
      });
      focusEmailFallbackLink();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={variant === "page" ? "lab-panel space-y-4 p-6" : "space-y-4"}
    >
      <div className="space-y-2">
        <p className="lab-label">
          {variant === "page" ? t("labels.page") : t("labels.sendFeedback")}
        </p>
        <p className="text-sm leading-6 text-ink-700">
          {t("intro")}
        </p>
      </div>

      <div className="rounded-3xl border border-line bg-paper-strong px-4 py-4">
        <p className="lab-label">{t("labels.currentPage")}</p>
        <p className="mt-2 text-sm font-semibold text-ink-950">{contextLabel}</p>
        <p className="mt-1 text-xs leading-5 text-ink-500">
          {resolvedContext.pagePath}
          {resolvedContext.conceptSlug ? ` | ${resolvedContext.conceptSlug}` : ""}
        </p>
      </div>

      <input
        tabIndex={-1}
        aria-hidden="true"
        autoComplete="off"
        name={feedbackHoneypotFieldName}
        value={honeypot}
        onChange={(event) => setHoneypot(event.currentTarget.value)}
        className="pointer-events-none absolute -left-[9999px] top-auto h-px w-px overflow-hidden opacity-0"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="lab-label">{t("labels.feedbackType")}</span>
          <select
            name="category"
            value={category}
            onChange={(event) => {
              setCategory(event.currentTarget.value as FeedbackCategoryId);
              setFallbackHrefOverride(null);
              if (submitState.kind !== "idle") {
                setSubmitState(initialSubmitState);
              }
            }}
            className="w-full rounded-2xl border border-line bg-paper-strong px-4 py-3 text-sm text-ink-950 outline-none transition-colors focus:border-teal-500"
          >
            {translatedCategories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="lab-label">{t("labels.replyEmailOrHandle")}</span>
          <input
            name="contact"
            value={contact}
            onChange={(event) => {
              setContact(event.currentTarget.value);
              setFallbackHrefOverride(null);
              if (submitState.kind !== "idle") {
                setSubmitState(initialSubmitState);
              }
            }}
            autoComplete="email"
            maxLength={160}
            className="w-full rounded-2xl border border-line bg-paper-strong px-4 py-3 text-sm text-ink-950 outline-none transition-colors focus:border-teal-500"
            placeholder={t("labels.optional")}
          />
        </label>
      </div>

      <label className="block space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="lab-label">{t("labels.whatHappened")}</span>
          <span className="text-xs text-ink-500">
            {remainingCharacters > 0
              ? t("status.moreChars", { count: formattedRemainingCharacters })
              : t("status.readyToSend")}
          </span>
        </div>
        <textarea
          name="message"
          rows={variant === "page" ? 6 : 5}
          value={message}
          onChange={(event) => {
            setMessage(event.currentTarget.value);
            setFallbackHrefOverride(null);
            if (submitState.kind !== "idle") {
              setSubmitState(initialSubmitState);
            }
          }}
          maxLength={1500}
          className="w-full rounded-3xl border border-line bg-paper-strong px-4 py-3 text-sm text-ink-950 outline-none transition-colors focus:border-teal-500"
          placeholder={selectedCategory.hint}
        />
      </label>

      <div
        aria-live="polite"
        className="rounded-3xl border border-dashed border-line bg-paper px-4 py-4 text-xs leading-6 text-ink-500"
      >
        <p>{deliveryStateMessage}</p>
        {deliveryState !== "available" ? (
          <button
            type="button"
            onClick={() => setConfigRefreshKey((current) => current + 1)}
            disabled={configRefreshing}
            className="mt-3 inline-flex items-center rounded-full border border-line bg-paper-strong px-3 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-ink-700 transition-colors hover:border-ink-950/20 hover:text-ink-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {configRefreshing ? t("delivery.checkingButton") : t("delivery.checkAgain")}
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={sendDisabled}
          className="inline-flex items-center rounded-full bg-ink-950 px-5 py-3 text-sm font-medium transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          style={{ color: "var(--paper-strong)" }}
        >
          {submitLabel}
        </button>
        <a
          ref={emailLinkRef}
          href={emailHref}
          className="rounded-full border border-line bg-paper-strong px-5 py-3 text-sm font-medium text-ink-950 transition-colors hover:border-ink-950/25"
        >
          {emailActionLabel}
        </a>
        <a
          href={`mailto:${fallbackEmail}`}
          className="text-xs font-medium text-ink-500 underline-offset-4 hover:text-ink-700 hover:underline"
        >
          {fallbackEmail}
        </a>
      </div>

      <div className="min-h-6">
        {submitState.kind === "success" || submitState.kind === "error" ? (
          <p
            aria-live="polite"
            role={submitState.kind === "error" ? "alert" : "status"}
            className={`rounded-2xl border px-4 py-3 text-sm ${
              submitState.kind === "error"
                ? "border-coral-200 bg-coral-50/80 text-coral-900"
                : "border-teal-200 bg-teal-50/80 text-teal-900"
            }`}
          >
            {submitState.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
