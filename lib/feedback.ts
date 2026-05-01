import { z } from "zod";

export const feedbackCategoryIds = [
  "clarity",
  "accuracy",
  "bug",
  "controls",
  "request",
] as const;

export type FeedbackCategoryId = (typeof feedbackCategoryIds)[number];

export const feedbackCategories = [
  {
    id: "clarity",
    label: "Concept clarity",
    hint: "What explanation, graph, or example should be clearer?",
  },
  {
    id: "accuracy",
    label: "Physics or content issue",
    hint: "What explanation, value, graph, or worked example seems incorrect or misleading?",
  },
  {
    id: "bug",
    label: "Bug report",
    hint: "What broke, and what were you trying to do when it happened?",
  },
  {
    id: "controls",
    label: "Controls or interaction",
    hint: "Which control, label, or mode felt hard to read, use, or predict?",
  },
  {
    id: "request",
    label: "Feature or concept request",
    hint: "What concept, workflow, or small improvement should come next?",
  },
] as const satisfies ReadonlyArray<{
  id: FeedbackCategoryId;
  label: string;
  hint: string;
}>;

export const feedbackPageTypes = [
  "home",
  "challenge",
  "concepts",
  "concept",
  "topic",
  "track",
  "about",
  "pricing",
  "contact",
  "other",
] as const;

export type FeedbackPageType = (typeof feedbackPageTypes)[number];

export const feedbackSurfaces = ["widget", "page"] as const;

export type FeedbackSurface = (typeof feedbackSurfaces)[number];

export const feedbackRelayTimeoutMs = 8000;
export const feedbackRelaySource = "open-model-lab-public-preview";
export const feedbackRelayUserAgent = "OpenModelLabFeedbackRelay/1.0";
export const feedbackHoneypotFieldName = "website";

export const previewFeedbackEmail =
  process.env.NEXT_PUBLIC_FEEDBACK_EMAIL?.trim() || "hello@openmodellab.example";

export const feedbackContextSchema = z.object({
  pageType: z.enum(feedbackPageTypes),
  pagePath: z.string().trim().min(1).max(240),
  pageTitle: z.string().trim().min(1).max(160).optional(),
  conceptId: z.string().trim().min(1).max(160).optional(),
  conceptSlug: z.string().trim().min(1).max(160).optional(),
  conceptTitle: z.string().trim().min(1).max(160).optional(),
  topicSlug: z.string().trim().min(1).max(160).optional(),
  topicTitle: z.string().trim().min(1).max(160).optional(),
  trackSlug: z.string().trim().min(1).max(160).optional(),
  trackTitle: z.string().trim().min(1).max(160).optional(),
});

export const feedbackRuntimeContextSchema = z.object({
  surface: z.enum(feedbackSurfaces).optional(),
  pageHref: z.string().trim().url().max(400).optional(),
  pageTitle: z.string().trim().min(1).max(160).optional(),
  referrer: z.string().trim().max(400).optional(),
  viewportWidth: z.number().int().min(0).max(10000).optional(),
  viewportHeight: z.number().int().min(0).max(10000).optional(),
});

export const feedbackSubmissionSchema = z.object({
  category: z.enum(feedbackCategoryIds),
  message: z.string().trim().min(12).max(1500),
  contact: z.string().trim().max(160).optional().default(""),
  context: feedbackContextSchema,
  runtime: feedbackRuntimeContextSchema.optional(),
});

export const feedbackSubmissionEnvelopeSchema = feedbackSubmissionSchema.extend({
  [feedbackHoneypotFieldName]: z.string().trim().max(200).optional().default(""),
});

export type FeedbackContext = z.infer<typeof feedbackContextSchema>;
export type FeedbackRuntimeContext = z.infer<typeof feedbackRuntimeContextSchema>;
export type FeedbackSubmission = z.infer<typeof feedbackSubmissionSchema>;
export type FeedbackSubmissionEnvelope = z.infer<typeof feedbackSubmissionEnvelopeSchema>;
export type FeedbackDraft = Pick<FeedbackSubmission, "category" | "context"> & {
  message: string;
  contact?: string;
  runtime?: Partial<FeedbackRuntimeContext>;
};

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

  if (!remainder) {
    return undefined;
  }

  const [slug] = remainder.split("/", 1);
  const normalizedSlug = slug?.trim();

  return normalizedSlug || undefined;
}

function buildFeedbackPathScope(path: string) {
  if (path === "/") {
    return "home";
  }

  return path
    .replace(/^\/+/, "")
    .replace(/\/+/g, "__");
}

export function resolveFeedbackPageType(
  pagePath: string,
  pageType?: FeedbackPageType,
): FeedbackPageType {
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

  if (pageType && (feedbackPageTypes as readonly string[]).includes(pageType)) {
    return pageType;
  }

  return "other";
}

export function normalizeFeedbackContext(context: FeedbackContext): FeedbackContext {
  const pagePath = normalizePagePath(context.pagePath);
  const pageType = resolveFeedbackPageType(pagePath, context.pageType);
  const pageTitle = normalizeOptionalText(context.pageTitle);
  const conceptId = normalizeOptionalText(context.conceptId);
  const conceptSlug =
    normalizeOptionalText(context.conceptSlug) ??
    (pageType === "concept" ? extractSlugFromPath(pagePath, "/concepts/") : undefined);
  const conceptTitle = normalizeOptionalText(context.conceptTitle);
  const topicSlug =
    normalizeOptionalText(context.topicSlug) ??
    (pageType === "topic"
      ? extractSlugFromPath(pagePath, "/concepts/topics/")
      : undefined);
  const topicTitle = normalizeOptionalText(context.topicTitle);
  const trackSlug =
    normalizeOptionalText(context.trackSlug) ??
    (pageType === "track" ? extractSlugFromPath(pagePath, "/tracks/") : undefined);
  const trackTitle = normalizeOptionalText(context.trackTitle);

  return {
    pageType,
    pagePath,
    ...(pageTitle ? { pageTitle } : {}),
    ...(conceptId ? { conceptId } : {}),
    ...(conceptSlug ? { conceptSlug } : {}),
    ...(conceptTitle ? { conceptTitle } : {}),
    ...(topicSlug ? { topicSlug } : {}),
    ...(topicTitle ? { topicTitle } : {}),
    ...(trackSlug ? { trackSlug } : {}),
    ...(trackTitle ? { trackTitle } : {}),
  };
}

export function getFeedbackCategory(categoryId: FeedbackCategoryId) {
  return feedbackCategories.find((category) => category.id === categoryId) ?? feedbackCategories[0];
}

export function formatFeedbackContextLabel(context: FeedbackContext) {
  const normalizedContext = normalizeFeedbackContext(context);

  if (normalizedContext.conceptTitle) {
    return normalizedContext.conceptTitle;
  }

  if (normalizedContext.trackTitle) {
    return normalizedContext.trackTitle;
  }

  if (normalizedContext.topicTitle) {
    return normalizedContext.topicTitle;
  }

  if (normalizedContext.pageTitle) {
    return normalizedContext.pageTitle;
  }

  return normalizedContext.pagePath;
}

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : undefined;
}

export function resolveFeedbackRuntimeContext(
  runtime?: Partial<FeedbackRuntimeContext> | null,
  fallback?: {
    surface?: FeedbackSurface;
    pageHref?: string | null;
    pageTitle?: string | null;
  },
) {
  const surface = runtime?.surface ?? fallback?.surface;
  const pageHref = normalizeOptionalText(runtime?.pageHref ?? fallback?.pageHref);
  const pageTitle = normalizeOptionalText(runtime?.pageTitle ?? fallback?.pageTitle);
  const referrer = normalizeOptionalText(runtime?.referrer);
  const viewportWidth = Number.isFinite(runtime?.viewportWidth)
    ? runtime?.viewportWidth
    : undefined;
  const viewportHeight = Number.isFinite(runtime?.viewportHeight)
    ? runtime?.viewportHeight
    : undefined;

  if (
    !surface &&
    !pageHref &&
    !pageTitle &&
    !referrer &&
    viewportWidth === undefined &&
    viewportHeight === undefined
  ) {
    return null;
  }

  return {
    ...(surface ? { surface } : {}),
    ...(pageHref ? { pageHref } : {}),
    ...(pageTitle ? { pageTitle } : {}),
    ...(referrer ? { referrer } : {}),
    ...(viewportWidth !== undefined ? { viewportWidth } : {}),
    ...(viewportHeight !== undefined ? { viewportHeight } : {}),
  } satisfies Partial<FeedbackRuntimeContext>;
}

export function buildFeedbackTriageTags(
  categoryId: FeedbackCategoryId,
  context: FeedbackContext,
  runtime?: Partial<FeedbackRuntimeContext> | null,
) {
  const normalizedContext = normalizeFeedbackContext(context);
  const resolvedRuntime = resolveFeedbackRuntimeContext(runtime);
  const tags = [`category:${categoryId}`, `page:${normalizedContext.pageType}`];

  if (normalizedContext.conceptSlug) {
    tags.push(`concept:${normalizedContext.conceptSlug}`);
  }

  if (normalizedContext.topicSlug) {
    tags.push(`topic:${normalizedContext.topicSlug}`);
  }

  if (normalizedContext.trackSlug) {
    tags.push(`track:${normalizedContext.trackSlug}`);
  }

  if (resolvedRuntime?.surface) {
    tags.push(`surface:${resolvedRuntime.surface}`);
  }

  return tags;
}

export function buildFeedbackTriageBucketKey(
  categoryId: FeedbackCategoryId,
  context: FeedbackContext,
) {
  const normalizedContext = normalizeFeedbackContext(context);
  const scope =
    normalizedContext.conceptSlug ??
    normalizedContext.trackSlug ??
    normalizedContext.topicSlug ??
    buildFeedbackPathScope(normalizedContext.pagePath);

  return `${categoryId}:${normalizedContext.pageType}:${scope}`;
}

function buildFeedbackLines(submission: FeedbackDraft) {
  const category = getFeedbackCategory(submission.category);
  const context = normalizeFeedbackContext(submission.context);
  const runtime = resolveFeedbackRuntimeContext(submission.runtime, {
    pageTitle: context.pageTitle,
  });
  const triageBucketKey = buildFeedbackTriageBucketKey(submission.category, context);
  const triageTags = buildFeedbackTriageTags(submission.category, context, runtime);
  const lines = [
    `Category: ${category.label}`,
    `Triage bucket: ${triageBucketKey}`,
    `Triage tags: ${triageTags.join(", ")}`,
    `Page: ${formatFeedbackContextLabel(context)}`,
    `Page type: ${context.pageType}`,
    `Path: ${context.pagePath}`,
  ];

  if (context.topicTitle || context.topicSlug) {
    lines.push(`Topic: ${context.topicTitle ?? context.topicSlug}`);
  }

  if (context.trackTitle || context.trackSlug) {
    lines.push(`Track: ${context.trackTitle ?? context.trackSlug}`);
  }

  if (context.conceptTitle || context.conceptSlug) {
    lines.push(`Concept: ${context.conceptTitle ?? context.conceptSlug}`);
  }

  if (context.conceptSlug) {
    lines.push(`Concept slug: ${context.conceptSlug}`);
  }

  if (context.conceptId) {
    lines.push(`Concept id: ${context.conceptId}`);
  }

  if (runtime?.surface) {
    lines.push(`Surface: ${runtime.surface}`);
  }

  if (runtime?.pageHref) {
    lines.push(`Page URL: ${runtime.pageHref}`);
  }

  if (runtime?.referrer) {
    lines.push(`Referrer: ${runtime.referrer}`);
  }

  if (runtime?.viewportWidth !== undefined && runtime?.viewportHeight !== undefined) {
    lines.push(`Viewport: ${runtime.viewportWidth} x ${runtime.viewportHeight}`);
  }

  lines.push(`Reply contact: ${submission.contact?.trim() || "Not provided"}`);
  lines.push("");
  lines.push(submission.message.trim() || "No message provided.");

  return lines.join("\n");
}

export function buildFeedbackMailtoHref(
  submission: FeedbackDraft,
  recipientEmail = previewFeedbackEmail,
) {
  const category = getFeedbackCategory(submission.category);
  const subject = `Open Model Lab feedback: ${category.label}`;
  const body = buildFeedbackLines(submission);

  return `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function formatFeedbackWebhookPayload(
  submission: FeedbackSubmission,
  options: {
    requestId: string;
    relayPath: string;
    pageHref?: string | null;
    pageTitle?: string | null;
    requestHost?: string | null;
    requestOrigin?: string | null;
    userAgent?: string | null;
  },
) {
  const category = getFeedbackCategory(submission.category);
  const context = normalizeFeedbackContext(submission.context);
  const runtime = resolveFeedbackRuntimeContext(submission.runtime, {
    pageHref: options.pageHref,
    pageTitle: options.pageTitle ?? context.pageTitle,
  });
  const triageBucketKey = buildFeedbackTriageBucketKey(submission.category, context);
  const triageTags = buildFeedbackTriageTags(submission.category, context, runtime);
  const pageTitle =
    context.pageTitle ??
    context.conceptTitle ??
    context.topicTitle ??
    context.trackTitle ??
    null;

  return {
    requestId: options.requestId,
    source: feedbackRelaySource,
    schemaVersion: "feedback-public-preview-v2",
    submittedAt: new Date().toISOString(),
    category: submission.category,
    categoryLabel: category.label,
    pageLabel: formatFeedbackContextLabel(context),
    page: {
      label: formatFeedbackContextLabel(context),
      type: context.pageType,
      path: context.pagePath,
      title: pageTitle,
      href: runtime?.pageHref ?? null,
    },
    triage: {
      bucketKey: triageBucketKey,
      tags: triageTags,
      hasReplyContact: Boolean(submission.contact?.trim()),
    },
    context,
    runtime,
    contact: submission.contact || null,
    message: submission.message,
    relay: {
      path: options.relayPath,
      fallbackEmail: previewFeedbackEmail,
    },
    request: {
      userAgent: normalizeOptionalText(options.userAgent) ?? null,
      host: normalizeOptionalText(options.requestHost) ?? null,
      origin: normalizeOptionalText(options.requestOrigin) ?? null,
    },
  };
}
