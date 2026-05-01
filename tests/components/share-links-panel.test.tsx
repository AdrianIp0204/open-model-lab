import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { ShareLinksPanel } from "@/components/share/ShareLinksPanel";

describe("ShareLinksPanel", () => {
  it("copies the selected deep link to the clipboard as an absolute url", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText,
      },
      configurable: true,
    });

    render(
      <ShareLinksPanel
        pageTitle="Projectile Motion"
        items={[
          {
            id: "concept-page",
            label: "Concept page",
            href: "/concepts/projectile-motion",
            ariaLabel: "Copy concept page link",
          },
          {
            id: "quick-test",
            label: "Quick test",
            href: "/concepts/projectile-motion#quick-test",
            ariaLabel: "Copy quick test link",
          },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /copy quick test link/i }));

    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/concepts/projectile-motion#quick-test`,
    );
  });
});
