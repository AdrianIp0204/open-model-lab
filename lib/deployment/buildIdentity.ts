type EnvMap = Record<string, string | undefined>;

export type DeploymentIdentity = {
  commit: string | null;
  commitSource: string | null;
  deploymentId: string | null;
  deploymentIdSource: string | null;
  builtAt: string | null;
  builtAtSource: string | null;
};

const commitEnvNames = [
  "NEXT_PUBLIC_OPEN_MODEL_LAB_COMMIT_SHA",
  "OPEN_MODEL_LAB_COMMIT_SHA",
  "CF_PAGES_COMMIT_SHA",
  "VERCEL_GIT_COMMIT_SHA",
  "GITHUB_SHA",
  "COMMIT_SHA",
] as const;

const deploymentIdEnvNames = [
  "NEXT_PUBLIC_OPEN_MODEL_LAB_DEPLOYMENT_ID",
  "OPEN_MODEL_LAB_DEPLOYMENT_ID",
  "CF_VERSION_METADATA_ID",
  "VERCEL_DEPLOYMENT_ID",
] as const;

const builtAtEnvNames = [
  "NEXT_PUBLIC_OPEN_MODEL_LAB_BUILT_AT",
  "OPEN_MODEL_LAB_BUILT_AT",
] as const;

function readEnvValue(env: EnvMap, names: readonly string[]) {
  for (const name of names) {
    const value = env[name]?.trim();

    if (value) {
      return { name, value };
    }
  }

  return null;
}

export function normalizeCommitSha(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "";

  if (!/^[a-f0-9]{7,64}$/u.test(normalized)) {
    return null;
  }

  return normalized;
}

function normalizePublicMarker(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";

  if (!normalized || normalized.length > 160 || /[\r\n<>]/u.test(normalized)) {
    return null;
  }

  return normalized;
}

function normalizeTimestamp(value: string | null | undefined) {
  const normalized = normalizePublicMarker(value);

  if (!normalized) {
    return null;
  }

  const parsed = Date.parse(normalized);

  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

export function resolveDeploymentIdentity(env: EnvMap = process.env): DeploymentIdentity {
  const commitCandidate = readEnvValue(env, commitEnvNames);
  const deploymentIdCandidate = readEnvValue(env, deploymentIdEnvNames);
  const builtAtCandidate = readEnvValue(env, builtAtEnvNames);
  const commit = normalizeCommitSha(commitCandidate?.value);
  const deploymentId = normalizePublicMarker(deploymentIdCandidate?.value);
  const builtAt = normalizeTimestamp(builtAtCandidate?.value);

  return {
    commit,
    commitSource: commit ? (commitCandidate?.name ?? null) : null,
    deploymentId,
    deploymentIdSource: deploymentId ? (deploymentIdCandidate?.name ?? null) : null,
    builtAt,
    builtAtSource: builtAt ? (builtAtCandidate?.name ?? null) : null,
  };
}
