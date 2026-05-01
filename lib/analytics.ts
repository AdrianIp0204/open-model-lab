import { z } from "zod";
import {
  feedbackCategoryIds,
  feedbackSurfaces,
  type FeedbackCategoryId,
  type FeedbackSurface,
} from "./feedback";

export const analyticsEventNames = [
  "page_discovery",
  "concept_started",
  "challenge_started",
  "challenge_completed",
  "track_started",
  "track_continued",
  "feedback_submitted",
] as const;

export const analyticsPageKinds = [
  "home",
  "challenge",
  "concepts",
  "concept",
  "track",
  "topic",
  "about",
  "pricing",
  "contact",
  "other",
] as const;

export const analyticsTrackStatuses = [
  "not-started",
  "in-progress",
  "completed",
] as const;

export const analyticsTrackActions = ["start", "continue", "review"] as const;

export const analyticsEnabled =
  process.env.NEXT_PUBLIC_ANALYTICS_ENABLED?.trim() === "true";

export const analyticsRelaySource = "open-model-lab-learning-signals";
export const analyticsRelayTimeoutMs = 5000;
export const analyticsRelayUserAgent = "OpenModelLabAnalyticsRelay/1.0";

const analyticsEventNameSchema = z.enum(analyticsEventNames);
const analyticsPageKindSchema = z.enum(analyticsPageKinds);
const analyticsTrackStatusSchema = z.enum(analyticsTrackStatuses);
const analyticsTrackActionSchema = z.enum(analyticsTrackActions);

export const analyticsPayloadSchema = z
  .object({
    pagePath: z.string().trim().min(1).max(240),
    pageTitle: z.string().trim().min(1).max(160).optional(),
    pageKind: analyticsPageKindSchema,
    conceptId: z.string().trim().min(1).max(160).optional(),
    conceptSlug: z.string().trim().min(1).max(160).optional(),
    conceptTitle: z.string().trim().min(1).max(160).optional(),
    trackSlug: z.string().trim().min(1).max(160).optional(),
    trackTitle: z.string().trim().min(1).max(160).optional(),
    topicSlug: z.string().trim().min(1).max(160).optional(),
    challengeId: z.string().trim().min(1).max(160).optional(),
    feedbackCategory: z.enum(feedbackCategoryIds).optional(),
    surface: z.enum(feedbackSurfaces).optional(),
    action: analyticsTrackActionSchema.optional(),
    status: analyticsTrackStatusSchema.optional(),
    source: z.string().trim().min(1).max(80).optional(),
    targetConceptSlug: z.string().trim().min(1).max(160).optional(),
  })
  .strip();

export const analyticsSubmissionSchema = z
  .object({
    name: analyticsEventNameSchema,
    payload: analyticsPayloadSchema,
  })
  .strip();

export type AnalyticsEventName = (typeof analyticsEventNames)[number];
export type AnalyticsPageKind = (typeof analyticsPageKinds)[number];
export type AnalyticsTrackStatus = (typeof analyticsTrackStatuses)[number];
export type AnalyticsTrackAction = (typeof analyticsTrackActions)[number];
export type AnalyticsPayload = z.infer<typeof analyticsPayloadSchema>;
export type AnalyticsSubmission = z.infer<typeof analyticsSubmissionSchema>;

export type AnalyticsContextInput = {
  pagePath: string;
  pageTitle?: string;
  pageKind?: AnalyticsPageKind;
  pageType?: string;
  conceptId?: string;
  conceptSlug?: string;
  conceptTitle?: string;
  trackSlug?: string;
  trackTitle?: string;
  topicSlug?: string;
};

export type AnalyticsPayloadInput = AnalyticsContextInput & {
  challengeId?: string;
  feedbackCategory?: FeedbackCategoryId;
  surface?: FeedbackSurface;
  action?: AnalyticsTrackAction;
  status?: AnalyticsTrackStatus;
  source?: string;
  targetConceptSlug?: string;
};

type AnalyticsTransport = (event: AnalyticsSubmission) => void;

let analyticsTransportOverride: AnalyticsTransport | null = null;

function clipOptionalText(value: string | undefined, maxLength: number) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  return trimmed.slice(0, maxLength);
}

function normalizePagePath(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "/";
  }

  const [pathWithoutHash] = trimmed.split("#", 1);
  const [pathWithoutQuery] = pathWithoutHash.split("?", 1);
  return pathWithoutQuery || "/";
}

function extractSlugFromPath(path: string, prefix: string) {
  if (!path.startsWith(prefix)) {
    return undefined;
  }

  const remainder = path.slice(prefix.length).trim();

  if (!remainder || remainder.includes("/")) {
    return undefined;
  }

  return remainder;
}

export function resolveAnalyticsPageKind(
  pagePath: string,
  pageType?: string,
): AnalyticsPageKind {
  const normalizedPath = normalizePagePath(pagePath);

  if (normalizedPath === "/") {
    return "home";
  }

  if (normalizedPath === "/concepts") {
    return "concepts";
  }

  if (normalizedPath === "/challenges") {
    return "challenge";
  }

  if (normalizedPath === "/concepts/topics") {
    return "topic";
  }

  if (normalizedPath.startsWith("/concepts/topics/")) {
    return "topic";
  }

  if (normalizedPath.startsWith("/concepts/")) {
    return "concept";
  }

  if (normalizedPath.startsWith("/tracks/")) {
    return "track";
  }

  if (normalizedPath === "/about") {
    return "about";
  }

  if (normalizedPath === "/pricing") {
    return "pricing";
  }

  if (normalizedPath === "/contact") {
    return "contact";
  }

  if (
    pageType &&
    (analyticsPageKinds as readonly string[]).includes(pageType)
  ) {
    return pageType as AnalyticsPageKind;
  }

  return "other";
}

function buildAnalyticsPayload(input: AnalyticsPayloadInput) {
  const pagePath = normalizePagePath(input.pagePath);
  const pageKind = input.pageKind ?? resolveAnalyticsPageKind(pagePath, input.pageType);

  const parsed = analyticsPayloadSchema.safeParse({
    pagePath,
    pageTitle: clipOptionalText(input.pageTitle, 160),
    pageKind,
    conceptId: clipOptionalText(input.conceptId, 160),
    conceptSlug:
      clipOptionalText(input.conceptSlug, 160) ??
      extractSlugFromPath(pagePath, "/concepts/"),
    conceptTitle: clipOptionalText(input.conceptTitle, 160),
    trackSlug:
      clipOptionalText(input.trackSlug, 160) ??
      extractSlugFromPath(pagePath, "/tracks/"),
    trackTitle: clipOptionalText(input.trackTitle, 160),
    topicSlug:
      clipOptionalText(input.topicSlug, 160) ??
      extractSlugFromPath(pagePath, "/concepts/topics/"),
    challengeId: clipOptionalText(input.challengeId, 160),
    feedbackCategory: input.feedbackCategory,
    surface: input.surface,
    action: input.action,
    status: input.status,
    source: clipOptionalText(input.source, 80),
    targetConceptSlug: clipOptionalText(input.targetConceptSlug, 160),
  });

  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}

function dispatchAnalyticsEvent(event: AnalyticsSubmission) {
  if (analyticsTransportOverride) {
    analyticsTransportOverride(event);
    return;
  }

  if (!analyticsEnabled || typeof window === "undefined") {
    return;
  }

  void fetch("/api/analytics", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(event),
    cache: "no-store",
    credentials: "omit",
    keepalive: true,
  }).catch(() => {
    // Analytics is best-effort and must never block the learning flow.
  });
}

export function setAnalyticsTransportForTests(transport: AnalyticsTransport | null) {
  analyticsTransportOverride = transport;
}

export function trackLearningEvent(
  name: AnalyticsEventName,
  input: AnalyticsPayloadInput,
) {
  const payload = buildAnalyticsPayload(input);

  if (!payload) {
    return false;
  }

  dispatchAnalyticsEvent({
    name,
    payload,
  });
  return true;
}

export function trackPageDiscovery(input: AnalyticsContextInput) {
  return trackLearningEvent("page_discovery", input);
}

export function trackPageView(path: string) {
  return trackPageDiscovery({ pagePath: path });
}

export function trackEvent(name: string, payload?: AnalyticsPayloadInput) {
  if (!payload) {
    return false;
  }

  if (!(analyticsEventNames as readonly string[]).includes(name)) {
    return false;
  }

  return trackLearningEvent(name as AnalyticsEventName, payload);
}
