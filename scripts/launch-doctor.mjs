import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_RESEND_API_BASE_URL = "https://api.resend.com";
const DEFAULT_STRIPE_API_BASE_URL = "https://api.stripe.com";

const AUTH_ROUTE_FILES = [
  "app/auth/confirm/route.ts",
  "app/auth/callback/page.tsx",
  "app/api/account/session/route.ts",
  "app/api/account/password/route.ts",
  "app/account/page.tsx",
  "app/account/reset-password/page.tsx",
];

const BILLING_ROUTE_FILES = [
  "app/pricing/page.tsx",
  "app/billing/page.tsx",
  "app/api/billing/checkout/route.ts",
  "app/api/billing/portal/route.ts",
  "app/api/billing/webhook/route.ts",
];

const FEEDBACK_ROUTE_FILES = [
  "app/contact/page.tsx",
  "app/api/feedback/route.ts",
];

const SITE_URL_ENV_NAMES = [
  "NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL",
  "OPEN_MODEL_LAB_SITE_URL",
  "NEXT_PUBLIC_SITE_URL",
  "SITE_URL",
];
const OPEN_MODEL_LAB_APEX_HOST = "openmodellab.com";
const OPEN_MODEL_LAB_WWW_HOST = `www.${OPEN_MODEL_LAB_APEX_HOST}`;

function parseEnvFile(contents) {
  const parsed = {};
  const lines = contents.split(/\r?\n/u);

  for (const rawLine of lines) {
    const trimmedLine = rawLine.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const normalizedLine = trimmedLine.startsWith("export ")
      ? trimmedLine.slice("export ".length)
      : trimmedLine;
    const separatorIndex = normalizedLine.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = normalizedLine.slice(0, separatorIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(key)) {
      continue;
    }

    const rawValue = normalizedLine.slice(separatorIndex + 1).trim();
    const quote = rawValue[0];
    let value = rawValue;

    if ((quote === '"' || quote === "'") && rawValue.endsWith(quote)) {
      value = rawValue.slice(1, -1);
    } else {
      value = rawValue.replace(/\s+#.*$/u, "").trim();
    }

    parsed[key] = value;
  }

  return parsed;
}

function getEnvFileCandidates(mode) {
  const normalizedMode = normalizeText(mode) ?? "development";
  const candidates = [`.env.${normalizedMode}.local`];

  if (normalizedMode !== "test") {
    candidates.push(".env.local");
  }

  candidates.push(`.env.${normalizedMode}`);
  candidates.push(".env");

  return candidates;
}

function readEnvFileIfPresent(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return parseEnvFile(fs.readFileSync(filePath, "utf8"));
}

function stripFullLineJsonComments(contents) {
  return contents
    .split(/\r?\n/u)
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n");
}

function readWranglerConfig(repoRoot) {
  const wranglerPath = path.join(repoRoot, "wrangler.jsonc");
  if (!fs.existsSync(wranglerPath)) {
    return null;
  }

  try {
    return JSON.parse(stripFullLineJsonComments(fs.readFileSync(wranglerPath, "utf8")));
  } catch {
    return null;
  }
}

function loadLaunchDoctorEnv(repoRoot, baseEnv = process.env) {
  const mergedEnv = { ...baseEnv };
  const mode = normalizeText(baseEnv.NODE_ENV) ?? "development";

  for (const relativePath of getEnvFileCandidates(mode)) {
    const absolutePath = path.join(repoRoot, relativePath);
    if (!fs.existsSync(absolutePath)) {
      continue;
    }

    const parsedEnv = parseEnvFile(fs.readFileSync(absolutePath, "utf8"));
    for (const [key, value] of Object.entries(parsedEnv)) {
      if (mergedEnv[key] == null) {
        mergedEnv[key] = value;
      }
    }
  }

  return mergedEnv;
}

function parseCliArgs(argv) {
  const parsed = {
    json: false,
    failOnWarnings: false,
    root: process.cwd(),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    switch (token) {
      case "--json":
        parsed.json = true;
        break;
      case "--fail-on-warnings":
        parsed.failOnWarnings = true;
        break;
      case "--root": {
        const value = argv[index + 1];
        if (!value || value.startsWith("--")) {
          throw new Error('Missing value for "--root".');
        }
        parsed.root = path.resolve(value);
        index += 1;
        break;
      }
      case "--help":
        parsed.help = true;
        break;
      default:
        throw new Error(`Unknown argument "${token}".`);
    }
  }

  return parsed;
}

function buildUsageText() {
  return `Usage:

  node scripts/launch-doctor.mjs
  node scripts/launch-doctor.mjs --json
  node scripts/launch-doctor.mjs --fail-on-warnings

Options:

  --json              Print the full report as JSON.
  --fail-on-warnings  Exit with code 1 when warnings are present.
  --root <path>       Run the doctor against a different repo root.
  --help              Show this message.
`;
}

function normalizeText(value) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isTruthyFlag(value) {
  return /^(1|true|yes|on)$/iu.test(value?.trim() ?? "");
}

function normalizeUrl(value) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function isLocalHostname(hostname) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname.endsWith(".local")
  );
}

function parseUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function looksLikePlaceholder(value) {
  return /(your-|example|placeholder|changeme|todo|\.\.\.)/i.test(value);
}

function readFirstEnv(env, names) {
  for (const name of names) {
    const value = normalizeText(env[name]);
    if (value) {
      return {
        name,
        value,
      };
    }
  }

  return null;
}

function readAllEnvValues(env, names) {
  return names
    .map((name) => ({
      name,
      value: normalizeText(env[name]),
    }))
    .filter((entry) => Boolean(entry.value));
}

function addFinding(report, severity, code, message, details) {
  report.findings[severity].push({
    code,
    message,
    ...(details ? { details } : {}),
  });
}

function readDistinctNormalizedValues(values) {
  return [...new Set(values.map((entry) => normalizeUrl(entry.value)))];
}

function evaluateRequiredRoutes(repoRoot, report) {
  for (const [group, files] of [
    ["auth", AUTH_ROUTE_FILES],
    ["billing", BILLING_ROUTE_FILES],
    ["feedback", FEEDBACK_ROUTE_FILES],
  ]) {
    for (const relativePath of files) {
      const absolutePath = path.join(repoRoot, relativePath);

      if (!fs.existsSync(absolutePath)) {
        addFinding(
          report,
          "errors",
          "missing_required_route",
          `The ${group} launch seam expects "${relativePath}" to exist.`,
          relativePath,
        );
      }
    }
  }
}

function evaluateSiteConfig(env, report) {
  const siteUrlEntries = readAllEnvValues(env, SITE_URL_ENV_NAMES);
  const selectedSiteUrl = readFirstEnv(env, SITE_URL_ENV_NAMES);

  if (!selectedSiteUrl) {
    addFinding(
      report,
      "errors",
      "missing_site_url",
      "Set NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL before staging auth, billing, or feedback flows.",
    );
    return {
      url: null,
      source: null,
    };
  }

  const distinctSiteValues = readDistinctNormalizedValues(siteUrlEntries);
  if (distinctSiteValues.length > 1) {
    addFinding(
      report,
      "warnings",
      "conflicting_site_url_envs",
      "Multiple site URL env vars are set to different origins. Auth emails, Stripe returns, and metadata should point at one canonical host.",
      siteUrlEntries.map((entry) => entry.name).join(", "),
    );
  }

  if (
    selectedSiteUrl.name === "NEXT_PUBLIC_SITE_URL" ||
    selectedSiteUrl.name === "SITE_URL"
  ) {
    addFinding(
      report,
      "warnings",
      "legacy_site_url_env_in_use",
      "The deployment is relying on legacy SITE_URL env names. Prefer NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL for current auth and metadata seams.",
      selectedSiteUrl.name,
    );
  }

  const parsedSiteUrl = parseUrl(selectedSiteUrl.value);
  if (!parsedSiteUrl) {
    addFinding(
      report,
      "errors",
      "invalid_site_url",
      "The canonical site URL must be a valid http or https origin.",
      selectedSiteUrl.name,
    );
    return {
      url: null,
      source: selectedSiteUrl.name,
    };
  }

  if (looksLikePlaceholder(parsedSiteUrl.host)) {
    addFinding(
      report,
      "warnings",
      "placeholder_site_url",
      "The canonical site URL still looks like placeholder launch copy.",
      parsedSiteUrl.host,
    );
  }

  if (parsedSiteUrl.hostname === OPEN_MODEL_LAB_WWW_HOST) {
    addFinding(
      report,
      "warnings",
      "site_url_uses_www_canonical",
      "The canonical site URL is using www.openmodellab.com. Public metadata should point at the apex host https://openmodellab.com.",
      selectedSiteUrl.name,
    );
  }

  if (parsedSiteUrl.protocol !== "https:" && !isLocalHostname(parsedSiteUrl.hostname)) {
    addFinding(
      report,
      "warnings",
      "insecure_site_url",
      "The canonical site URL is not https. Real auth and hosted billing should use HTTPS outside local development.",
      parsedSiteUrl.origin,
    );
  }

  if (
    env.NODE_ENV === "production" &&
    isLocalHostname(parsedSiteUrl.hostname)
  ) {
    addFinding(
      report,
      "errors",
      "localhost_site_url_in_production",
      "NODE_ENV=production cannot use a localhost site URL for auth or Stripe return flows.",
      parsedSiteUrl.origin,
    );
  }

  report.summary.siteUrl = parsedSiteUrl.origin;
  report.summary.siteUrlSource = selectedSiteUrl.name;

  return {
    url: parsedSiteUrl,
    source: selectedSiteUrl.name,
  };
}

function evaluateSupabaseConfig(env, report) {
  const supabaseUrl = normalizeText(env.NEXT_PUBLIC_SUPABASE_URL);
  const publishableKey = normalizeText(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const serviceRoleKey = normalizeText(env.SUPABASE_SERVICE_ROLE_KEY);

  if (!supabaseUrl) {
    addFinding(
      report,
      "errors",
      "missing_supabase_url",
      "NEXT_PUBLIC_SUPABASE_URL is required for real sign-in, sync, and entitlement reads.",
    );
  } else {
    const parsedSupabaseUrl = parseUrl(supabaseUrl);
    if (!parsedSupabaseUrl) {
      addFinding(
        report,
        "errors",
        "invalid_supabase_url",
        "NEXT_PUBLIC_SUPABASE_URL must be a valid http or https URL.",
      );
    } else if (looksLikePlaceholder(parsedSupabaseUrl.host)) {
      addFinding(
        report,
        "warnings",
        "placeholder_supabase_url",
        "NEXT_PUBLIC_SUPABASE_URL still looks like placeholder launch copy.",
        parsedSupabaseUrl.host,
      );
    }
  }

  if (!publishableKey) {
    addFinding(
      report,
      "errors",
      "missing_supabase_publishable_key",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required for real browser auth and account refresh.",
    );
  } else if (looksLikePlaceholder(publishableKey)) {
    addFinding(
      report,
      "warnings",
      "placeholder_supabase_publishable_key",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY still looks like placeholder launch copy.",
    );
  }

  if (!serviceRoleKey) {
    addFinding(
      report,
      "errors",
      "missing_supabase_service_role_key",
      "SUPABASE_SERVICE_ROLE_KEY is required for server-side sync, billing profile reads, and webhook-backed account updates.",
    );
  } else if (looksLikePlaceholder(serviceRoleKey)) {
    addFinding(
      report,
      "warnings",
      "placeholder_supabase_service_role_key",
      "SUPABASE_SERVICE_ROLE_KEY still looks like placeholder launch copy.",
    );
  }

  report.summary.supabaseReady = Boolean(
    supabaseUrl && publishableKey && serviceRoleKey,
  );
}

function getStripeMode(secretKey) {
  if (!secretKey) {
    return "missing";
  }

  if (secretKey.startsWith("sk_test_")) {
    return "test";
  }

  if (secretKey.startsWith("sk_live_")) {
    return "live";
  }

  return "unknown";
}

function evaluateStripeConfig(env, report) {
  const secretKey = normalizeText(env.STRIPE_SECRET_KEY);
  const priceId = normalizeText(env.STRIPE_PREMIUM_PRICE_ID);
  const webhookSecret = normalizeText(env.STRIPE_WEBHOOK_SECRET);
  const couponId = normalizeText(env.STRIPE_PREMIUM_ACHIEVEMENT_COUPON_ID);
  const apiBaseUrl = normalizeText(env.STRIPE_API_BASE_URL) ?? DEFAULT_STRIPE_API_BASE_URL;
  const stripeMode = getStripeMode(secretKey);
  const anyStripeEnvSet = Boolean(
    secretKey || priceId || webhookSecret || couponId,
  );

  report.summary.stripeMode = stripeMode;

  if (!anyStripeEnvSet) {
    addFinding(
      report,
      "warnings",
      "stripe_not_configured",
      "Stripe is not configured. Pricing and account upgrade surfaces will stay unavailable until test-mode envs are set.",
    );
    report.summary.stripeCheckoutReady = false;
    report.summary.stripePortalReady = false;
    report.summary.stripeWebhookReady = false;
    return;
  }

  if (!secretKey) {
    addFinding(
      report,
      "errors",
      "missing_stripe_secret_key",
      "STRIPE_SECRET_KEY is required for Checkout, Billing Portal, and webhook verification.",
    );
  } else if (stripeMode === "unknown") {
    addFinding(
      report,
      "warnings",
      "unrecognized_stripe_secret_key",
      "STRIPE_SECRET_KEY does not look like a standard Stripe test or live secret key.",
    );
  } else if (stripeMode === "live" && env.NODE_ENV !== "production") {
    addFinding(
      report,
      "warnings",
      "live_stripe_key_outside_production",
      "A live Stripe secret key is set outside a production runtime. Keep staging on test mode until the prelaunch checklist is complete.",
    );
  }

  if (!priceId) {
    addFinding(
      report,
      "errors",
      "missing_stripe_price_id",
      "STRIPE_PREMIUM_PRICE_ID is required before hosted checkout can sell Premium.",
    );
  } else if (looksLikePlaceholder(priceId)) {
    addFinding(
      report,
      "warnings",
      "placeholder_stripe_price_id",
      "STRIPE_PREMIUM_PRICE_ID still looks like placeholder launch copy.",
    );
  }

  if (!webhookSecret) {
    addFinding(
      report,
      "errors",
      "missing_stripe_webhook_secret",
      "STRIPE_WEBHOOK_SECRET is required before checkout returns can reliably turn Premium on.",
    );
  } else if (!webhookSecret.startsWith("whsec_")) {
    addFinding(
      report,
      "warnings",
      "unrecognized_stripe_webhook_secret",
      "STRIPE_WEBHOOK_SECRET does not look like a standard Stripe webhook signing secret.",
    );
  }

  if (couponId && looksLikePlaceholder(couponId)) {
    addFinding(
      report,
      "warnings",
      "placeholder_stripe_coupon_id",
      "STRIPE_PREMIUM_ACHIEVEMENT_COUPON_ID still looks like placeholder launch copy.",
    );
  }

  if (apiBaseUrl !== DEFAULT_STRIPE_API_BASE_URL) {
    addFinding(
      report,
      "warnings",
      "stripe_api_base_override",
      "STRIPE_API_BASE_URL is overriding the default Stripe API host. Keep that only for local mocks or explicit test infrastructure.",
      apiBaseUrl,
    );
  }

  report.summary.stripeCheckoutReady = Boolean(secretKey && priceId);
  report.summary.stripePortalReady = Boolean(secretKey);
  report.summary.stripeWebhookReady = Boolean(secretKey && webhookSecret);
}

function isSimpleEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
}

function extractIdentityEmail(value) {
  const trimmed = value.trim();
  const match = trimmed.match(/<([^<>]+)>/u);
  const candidate = match ? match[1].trim() : trimmed;
  return isSimpleEmail(candidate);
}

function parseRecipientList(value) {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function evaluateFeedbackConfig(env, report) {
  const publicFeedbackEmail = normalizeText(env.NEXT_PUBLIC_FEEDBACK_EMAIL);
  const resendApiKey = normalizeText(env.RESEND_API_KEY);
  const fromEmail = normalizeText(env.FEEDBACK_FROM_EMAIL);
  const toEmails = parseRecipientList(env.FEEDBACK_TO_EMAIL);
  const resendApiBaseUrl =
    normalizeText(env.FEEDBACK_RESEND_API_BASE_URL) ?? DEFAULT_RESEND_API_BASE_URL;

  if (!publicFeedbackEmail) {
    addFinding(
      report,
      "warnings",
      "missing_public_feedback_email",
      "NEXT_PUBLIC_FEEDBACK_EMAIL is missing, so the public contact fallback still points at the placeholder preview inbox.",
    );
  } else if (!isSimpleEmail(publicFeedbackEmail)) {
    addFinding(
      report,
      "errors",
      "invalid_public_feedback_email",
      "NEXT_PUBLIC_FEEDBACK_EMAIL must be a valid public-facing support mailbox.",
    );
  } else if (looksLikePlaceholder(publicFeedbackEmail)) {
    addFinding(
      report,
      "warnings",
      "placeholder_public_feedback_email",
      "NEXT_PUBLIC_FEEDBACK_EMAIL still looks like placeholder launch copy.",
    );
  }

  const anyDirectDeliveryEnvSet = Boolean(
    resendApiKey || fromEmail || toEmails.length > 0,
  );

  if (!anyDirectDeliveryEnvSet) {
    addFinding(
      report,
      "warnings",
      "feedback_direct_delivery_not_configured",
      "Direct feedback email delivery is not configured. The contact form will keep falling back to the public mailto path.",
    );
    report.summary.feedbackDeliveryReady = false;
    return;
  }

  if (!resendApiKey) {
    addFinding(
      report,
      "errors",
      "missing_resend_api_key",
      "RESEND_API_KEY is required for direct feedback delivery.",
    );
  } else if (looksLikePlaceholder(resendApiKey)) {
    addFinding(
      report,
      "warnings",
      "placeholder_resend_api_key",
      "RESEND_API_KEY still looks like placeholder launch copy.",
    );
  }

  if (!fromEmail) {
    addFinding(
      report,
      "errors",
      "missing_feedback_from_email",
      "FEEDBACK_FROM_EMAIL is required for direct feedback delivery.",
    );
  } else if (!extractIdentityEmail(fromEmail)) {
    addFinding(
      report,
      "errors",
      "invalid_feedback_from_email",
      "FEEDBACK_FROM_EMAIL must be a valid mailbox or display-name identity.",
    );
  }

  if (!toEmails.length) {
    addFinding(
      report,
      "errors",
      "missing_feedback_to_email",
      "FEEDBACK_TO_EMAIL is required for direct feedback delivery.",
    );
  } else if (toEmails.some((email) => !isSimpleEmail(email))) {
    addFinding(
      report,
      "errors",
      "invalid_feedback_to_email",
      "FEEDBACK_TO_EMAIL must contain valid comma-separated email addresses.",
    );
  }

  const parsedResendApiBaseUrl = parseUrl(resendApiBaseUrl);
  if (!parsedResendApiBaseUrl) {
    addFinding(
      report,
      "errors",
      "invalid_feedback_resend_api_base_url",
      "FEEDBACK_RESEND_API_BASE_URL must be a valid http or https URL.",
    );
  } else if (resendApiBaseUrl !== DEFAULT_RESEND_API_BASE_URL) {
    addFinding(
      report,
      "warnings",
      "feedback_resend_api_base_override",
      "FEEDBACK_RESEND_API_BASE_URL is overriding the default Resend API host. Keep that only for local relay mocks or explicit staging infrastructure.",
      resendApiBaseUrl,
    );
  }

  report.summary.feedbackDeliveryReady = Boolean(
    resendApiKey &&
      fromEmail &&
      toEmails.length > 0 &&
      parsedResendApiBaseUrl &&
      extractIdentityEmail(fromEmail) &&
      toEmails.every((email) => isSimpleEmail(email)),
  );
}

function evaluateDevHarness(env, report) {
  const enabled = isTruthyFlag(env.ENABLE_DEV_ACCOUNT_HARNESS);
  report.summary.devHarnessEnabled = enabled;

  if (!enabled) {
    return;
  }

  addFinding(
    report,
    env.NODE_ENV === "production" ? "errors" : "warnings",
    "dev_account_harness_enabled",
    env.NODE_ENV === "production"
      ? "ENABLE_DEV_ACCOUNT_HARNESS=true is still enabled in a production runtime."
      : "ENABLE_DEV_ACCOUNT_HARNESS=true is active. Keep harness-only verification separate from real Supabase and Stripe staging checks.",
  );
}

function evaluateCloudflareCutoverParity(repoRoot, env, report) {
  const wranglerConfig = readWranglerConfig(repoRoot);
  const devVarsPath = path.join(repoRoot, ".dev.vars");
  const devVars = readEnvFileIfPresent(devVarsPath);

  report.summary.cloudflarePreviewParityReady = false;

  if (!wranglerConfig) {
    addFinding(
      report,
      "warnings",
      "missing_wrangler_config",
      'Cloudflare preview/deploy parity could not be checked because private "wrangler.jsonc" is missing or unreadable. Copy wrangler.example.jsonc to wrangler.jsonc for real preview/deploy checks.',
    );
    return;
  }

  const requiredSecrets = Array.isArray(wranglerConfig?.secrets?.required)
    ? wranglerConfig.secrets.required.filter((value) => typeof value === "string")
    : [];
  const wranglerSiteUrl = readFirstEnv(wranglerConfig?.vars ?? {}, SITE_URL_ENV_NAMES);
  const loadedSiteUrl = readFirstEnv(env, SITE_URL_ENV_NAMES);

  if (wranglerConfig.keep_vars !== true) {
    addFinding(
      report,
      "warnings",
      "wrangler_keep_vars_disabled",
      "wrangler.jsonc is not keeping dashboard-managed vars. Preview/deploy cutovers are safer with keep_vars=true so deploys do not wipe launch-critical bindings.",
    );
  }

  if (!devVars) {
    addFinding(
      report,
      "warnings",
      "missing_dev_vars_file",
      "Cloudflare preview parity is weaker because .dev.vars is missing. Mirror required runtime secrets there for local preview or use deployment-managed secrets in staging.",
      ".dev.vars",
    );
    return;
  }

  const missingSecretMirrors = requiredSecrets.filter(
    (name) => !normalizeText(devVars[name]),
  );

  if (missingSecretMirrors.length > 0) {
    addFinding(
      report,
      "warnings",
      "missing_dev_vars_secret_mirror",
      "Cloudflare preview parity is missing required runtime secrets from .dev.vars. Local Next env can still look healthy while preview auth, Stripe, or feedback flows fail.",
      missingSecretMirrors.join(", "),
    );
  }

  if (isTruthyFlag(devVars.ENABLE_DEV_ACCOUNT_HARNESS)) {
    addFinding(
      report,
      "warnings",
      "dev_harness_enabled_in_dev_vars",
      "ENABLE_DEV_ACCOUNT_HARNESS is enabled in .dev.vars. Keep the harness out of Cloudflare preview or staging environments that are meant to exercise real providers.",
      ".dev.vars",
    );
  }

  const devVarsSiteUrl = readFirstEnv(devVars, SITE_URL_ENV_NAMES);
  if (
    loadedSiteUrl &&
    devVarsSiteUrl &&
    normalizeUrl(devVarsSiteUrl.value) !== normalizeUrl(loadedSiteUrl.value)
  ) {
    addFinding(
      report,
      "warnings",
      "dev_vars_site_url_mismatch",
      "The canonical site URL in .dev.vars does not match the local Next env. Auth and Stripe return links can drift between Next dev and Cloudflare preview runs.",
      `${devVarsSiteUrl.name} vs ${loadedSiteUrl.name}`,
    );
  }

  if (
    loadedSiteUrl &&
    wranglerSiteUrl &&
    normalizeUrl(wranglerSiteUrl.value) !== normalizeUrl(loadedSiteUrl.value)
  ) {
    addFinding(
      report,
      "warnings",
      "wrangler_site_url_mismatch",
      "wrangler.jsonc and the active Next env disagree on the canonical site URL. Mirror the intended origin into Cloudflare build/runtime settings before trusting provider return links.",
      `${wranglerSiteUrl.name} vs ${loadedSiteUrl.name}`,
    );
  }

  report.summary.cloudflarePreviewParityReady =
    missingSecretMirrors.length === 0 && !isTruthyFlag(devVars.ENABLE_DEV_ACCOUNT_HARNESS);
}

function buildLaunchDoctorReport(repoRoot = process.cwd(), env = process.env) {
  const report = {
    generatedAt: new Date().toISOString(),
    repoRoot,
    summary: {
      siteUrl: null,
      siteUrlSource: null,
      supabaseReady: false,
      stripeMode: "missing",
      stripeCheckoutReady: false,
      stripePortalReady: false,
      stripeWebhookReady: false,
      feedbackDeliveryReady: false,
      devHarnessEnabled: false,
      cloudflarePreviewParityReady: false,
    },
    findings: {
      errors: [],
      warnings: [],
    },
  };

  evaluateRequiredRoutes(repoRoot, report);
  evaluateSiteConfig(env, report);
  evaluateSupabaseConfig(env, report);
  evaluateStripeConfig(env, report);
  evaluateFeedbackConfig(env, report);
  evaluateDevHarness(env, report);
  evaluateCloudflareCutoverParity(repoRoot, env, report);

  return report;
}

function formatFindings(findings) {
  return findings.map((finding) => {
    const suffix = finding.details ? ` (${finding.details})` : "";
    return `- [${finding.code}] ${finding.message}${suffix}`;
  });
}

function formatSummaryBoolean(value) {
  return value ? "ready" : "not ready";
}

function printLaunchDoctorReport(report) {
  const lines = [];

  lines.push("Open Model Lab launch doctor");
  lines.push("");
  lines.push(
    `Site URL: ${report.summary.siteUrl ?? "missing"}${report.summary.siteUrlSource ? ` (${report.summary.siteUrlSource})` : ""}`,
  );
  lines.push(`Supabase auth + sync: ${formatSummaryBoolean(report.summary.supabaseReady)}`);
  lines.push(
    `Stripe: ${report.summary.stripeMode} mode | checkout ${formatSummaryBoolean(report.summary.stripeCheckoutReady)} | portal ${formatSummaryBoolean(report.summary.stripePortalReady)} | webhook ${formatSummaryBoolean(report.summary.stripeWebhookReady)}`,
  );
  lines.push(
    `Feedback delivery: ${report.summary.feedbackDeliveryReady ? "direct email ready" : "fallback only"}`,
  );
  lines.push(
    `Dev harness: ${report.summary.devHarnessEnabled ? "enabled" : "disabled"}`,
  );
  lines.push(
    `Cloudflare preview parity: ${formatSummaryBoolean(report.summary.cloudflarePreviewParityReady)}`,
  );
  lines.push("");

  if (report.findings.errors.length) {
    lines.push("Errors");
    lines.push(...formatFindings(report.findings.errors));
    lines.push("");
  }

  if (report.findings.warnings.length) {
    lines.push("Warnings");
    lines.push(...formatFindings(report.findings.warnings));
    lines.push("");
  }

  if (!report.findings.errors.length && !report.findings.warnings.length) {
    lines.push("No launch doctor findings.");
  }

  return lines.join("\n");
}

export {
  buildLaunchDoctorReport,
  loadLaunchDoctorEnv,
  parseCliArgs,
  printLaunchDoctorReport,
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const options = parseCliArgs(process.argv.slice(2));

    if (options.help) {
      console.log(buildUsageText());
      process.exit(0);
    }

    const loadedEnv = loadLaunchDoctorEnv(options.root);
    const report = buildLaunchDoctorReport(options.root, loadedEnv);

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(printLaunchDoctorReport(report));
    }

    const hasWarnings = report.findings.warnings.length > 0;
    const hasErrors = report.findings.errors.length > 0;
    process.exit(hasErrors || (options.failOnWarnings && hasWarnings) ? 1 : 0);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
