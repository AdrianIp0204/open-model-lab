// @vitest-environment node

import { describe, expect, it } from "vitest";
import { metadata as authCallbackMetadata } from "@/app/auth/callback/page";
import { metadata as debugMetadata } from "@/app/debug/page";
import { metadata as devAccountHarnessMetadata } from "@/app/dev/account-harness/page";

describe("private route metadata", () => {
  it("keeps HTML-only auth and dev routes out of search indexes", () => {
    expect(authCallbackMetadata.robots).toEqual({
      index: false,
      follow: false,
    });
    expect(devAccountHarnessMetadata.robots).toEqual({
      index: false,
      follow: false,
    });
    expect(debugMetadata.robots).toEqual({
      index: false,
      follow: false,
    });
  });
});
