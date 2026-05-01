// @vitest-environment node

import { isValidElement, type ReactElement } from "react";
import { describe, expect, it } from "vitest";
import RootLayout from "@/app/layout";

describe("root layout locale", () => {
  it("uses the request locale for the server html lang attribute", async () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    const element = await RootLayout({
      children: <main>Child content</main>,
    });

    expect(isValidElement(element)).toBe(true);

    if (!isValidElement(element)) {
      return;
    }

    const htmlElement = element as ReactElement<{ lang: string }>;

    expect(element.type).toBe("html");
    expect(htmlElement.props.lang).toBe("zh-HK");
  });
});
