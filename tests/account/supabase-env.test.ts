// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import { buildSiteUrl, getSiteUrl } from "@/lib/supabase/env";

describe("supabase env helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefers the Open Model Lab site URL env names for auth redirect building", () => {
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL", "https://openmodellab.com");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://legacy.example");

    expect(getSiteUrl()).toBe("https://openmodellab.com");
    expect(buildSiteUrl("/auth/confirm?next=/dashboard")).toBe(
      "https://openmodellab.com/auth/confirm?next=/dashboard",
    );
  });

  it("falls back to the legacy public site URL env when needed", () => {
    vi.stubEnv("NEXT_PUBLIC_OPEN_MODEL_LAB_SITE_URL", "");
    vi.stubEnv("OPEN_MODEL_LAB_SITE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://legacy.example");

    expect(getSiteUrl()).toBe("https://legacy.example");
  });
});
