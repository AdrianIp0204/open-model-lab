// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

const { permanentRedirectMock } = vi.hoisted(() => ({
  permanentRedirectMock: vi.fn((target: string) => {
    throw new Error(`permanentRedirect:${target}`);
  }),
}));

vi.mock("next/navigation", () => ({
  permanentRedirect: permanentRedirectMock,
}));

describe("root homepage redirect", () => {
  afterEach(() => {
    permanentRedirectMock.mockClear();
    vi.resetModules();
  });

  it("uses a stable permanent redirect to the exam-rescue homepage", async () => {
    const { default: RootLocaleRedirectPage } = await import("@/app/page");

    await expect(
      RootLocaleRedirectPage({
        searchParams: Promise.resolve({
          q: "model lab",
          filter: ["physics", "chemistry"],
        }),
      }),
    ).rejects.toThrow(
      "permanentRedirect:/rescue/edexcel-ial-physics-unit-5?q=model+lab&filter=physics&filter=chemistry",
    );

    expect(permanentRedirectMock).toHaveBeenCalledWith(
      "/rescue/edexcel-ial-physics-unit-5?q=model+lab&filter=physics&filter=chemistry",
    );
  });
});
