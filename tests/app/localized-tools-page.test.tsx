// @vitest-environment jsdom

import { isValidElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/layout/PageShell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import LocalizedToolsDirectoryPage from "@/app/[locale]/tools/page";

describe("localized tools directory route", () => {
  it("renders through the locale wrapper route", async () => {
    const element = await LocalizedToolsDirectoryPage({
      params: Promise.resolve({ locale: "en" }),
    });

    expect(isValidElement(element)).toBe(true);
    expect(element.props.localeOverride).toBe("en");
  });
});
