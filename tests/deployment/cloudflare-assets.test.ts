// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  getCloudflareSkewProtectionConfig,
  getCloudflareSkewProtectionState,
} from "@/lib/deployment/cloudflare-assets";

describe("cloudflare asset deployment helpers", () => {
  it("reports skew protection as ready when every required Cloudflare env is present", () => {
    const state = getCloudflareSkewProtectionState({
      CF_WORKER_NAME: "openmodellab",
      CF_PREVIEW_DOMAIN: "preview-domain",
      CF_WORKERS_SCRIPTS_API_TOKEN: "token",
      CF_ACCOUNT_ID: "account-id",
    });

    expect(state).toEqual({
      enabled: true,
      missingEnvNames: [],
    });
    expect(
      getCloudflareSkewProtectionConfig({
        CF_WORKER_NAME: "openmodellab",
        CF_PREVIEW_DOMAIN: "preview-domain",
        CF_WORKERS_SCRIPTS_API_TOKEN: "token",
        CF_ACCOUNT_ID: "account-id",
      }),
    ).toEqual({
      enabled: true,
      maxNumberOfVersions: 20,
      maxVersionAgeDays: 7,
    });
  });

  it("keeps skew protection disabled until the required Cloudflare deploy envs exist", () => {
    const state = getCloudflareSkewProtectionState({
      CF_WORKER_NAME: "openmodellab",
      CF_PREVIEW_DOMAIN: "",
      CF_WORKERS_SCRIPTS_API_TOKEN: undefined,
      CF_ACCOUNT_ID: "account-id",
    });

    expect(state).toEqual({
      enabled: false,
      missingEnvNames: [
        "CF_PREVIEW_DOMAIN",
        "CF_WORKERS_SCRIPTS_API_TOKEN",
      ],
    });
    expect(
      getCloudflareSkewProtectionConfig({
        CF_WORKER_NAME: "openmodellab",
        CF_PREVIEW_DOMAIN: "",
        CF_WORKERS_SCRIPTS_API_TOKEN: undefined,
        CF_ACCOUNT_ID: "account-id",
      }),
    ).toBeUndefined();
  });
});

