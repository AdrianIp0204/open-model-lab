// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  normalizeCommitSha,
  resolveDeploymentIdentity,
} from "@/lib/deployment/buildIdentity";

describe("deployment build identity", () => {
  it("normalizes public commit markers from the preferred OML env", () => {
    expect(
      resolveDeploymentIdentity({
        NEXT_PUBLIC_OPEN_MODEL_LAB_COMMIT_SHA: "ABCDEF1234567",
        OPEN_MODEL_LAB_DEPLOYMENT_ID: "cloudflare-version-42",
        OPEN_MODEL_LAB_BUILT_AT: "2026-05-30T04:15:00.000Z",
      }),
    ).toEqual({
      commit: "abcdef1234567",
      commitSource: "NEXT_PUBLIC_OPEN_MODEL_LAB_COMMIT_SHA",
      deploymentId: "cloudflare-version-42",
      deploymentIdSource: "OPEN_MODEL_LAB_DEPLOYMENT_ID",
      builtAt: "2026-05-30T04:15:00.000Z",
      builtAtSource: "OPEN_MODEL_LAB_BUILT_AT",
    });
  });

  it("rejects non-commit strings instead of exposing arbitrary env values", () => {
    expect(normalizeCommitSha("not a sha")).toBeNull();
    expect(
      resolveDeploymentIdentity({
        OPEN_MODEL_LAB_COMMIT_SHA: "not a sha",
        OPEN_MODEL_LAB_DEPLOYMENT_ID: "<bad>",
        OPEN_MODEL_LAB_BUILT_AT: "not a timestamp",
      }),
    ).toEqual({
      commit: null,
      commitSource: null,
      deploymentId: null,
      deploymentIdSource: null,
      builtAt: null,
      builtAtSource: null,
    });
  });

  it("falls back to provider commit envs when the OML marker is absent", () => {
    expect(
      resolveDeploymentIdentity({
        CF_PAGES_COMMIT_SHA: "1234567890abcdef",
      }),
    ).toMatchObject({
      commit: "1234567890abcdef",
      commitSource: "CF_PAGES_COMMIT_SHA",
    });
  });
});
