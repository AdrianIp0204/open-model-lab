import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import { getDeploymentId } from "@opennextjs/cloudflare";
import createNextIntlPlugin from "next-intl/plugin";

// Pin Next's repo root to this config file's directory so parent lockfiles
// and varying launch cwd values cannot leak resolution outside the repo.
const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    root: repoRoot,
  },
  outputFileTracingRoot: repoRoot,
  deploymentId: getDeploymentId(),
  experimental: {
    cpus: 1,
    workerThreads: true,
    webpackBuildWorker: false,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default withNextIntl(nextConfig);

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
