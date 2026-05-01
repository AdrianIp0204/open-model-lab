// @vitest-environment jsdom

import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ads/AdsProviderScript", () => ({
  AdsProviderScript: () => <div data-testid="layout-ads-provider-script" />,
}));

vi.mock("@/components/account/AccountSyncProvider", () => ({
  AccountSyncProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import RootLayout from "@/app/layout";

describe("root layout ad bootstrap mounting", () => {
  it("mounts a single shared ad bootstrap path in the layout", async () => {
    render(
      await RootLayout({
        children: <main>Child content</main>,
      }),
    );

    expect(screen.getAllByTestId("layout-ads-provider-script")).toHaveLength(1);
  });
});
