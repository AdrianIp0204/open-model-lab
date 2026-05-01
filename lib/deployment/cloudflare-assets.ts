const cloudflareSkewProtectionRequiredEnvNames = [
  "CF_WORKER_NAME",
  "CF_PREVIEW_DOMAIN",
  "CF_WORKERS_SCRIPTS_API_TOKEN",
  "CF_ACCOUNT_ID",
] as const;

export type CloudflareSkewProtectionRequiredEnvName =
  (typeof cloudflareSkewProtectionRequiredEnvNames)[number];

export type CloudflareSkewProtectionState = {
  enabled: boolean;
  missingEnvNames: CloudflareSkewProtectionRequiredEnvName[];
};

function hasConfiguredEnvValue(value: string | undefined) {
  return Boolean(value?.trim());
}

export function getCloudflareSkewProtectionState(
  env: Record<string, string | undefined> = process.env,
): CloudflareSkewProtectionState {
  const missingEnvNames = cloudflareSkewProtectionRequiredEnvNames.filter(
    (name) => !hasConfiguredEnvValue(env[name]),
  );

  return {
    enabled: missingEnvNames.length === 0,
    missingEnvNames,
  };
}

export function getCloudflareSkewProtectionConfig(
  env: Record<string, string | undefined> = process.env,
) {
  const state = getCloudflareSkewProtectionState(env);

  if (!state.enabled) {
    return undefined;
  }

  return {
    enabled: true,
    maxNumberOfVersions: 20,
    maxVersionAgeDays: 7,
  } as const;
}
