import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";

describe("LocaleSwitcher", () => {
  it("switches locales on the current route without a refresh and stays in sync with the active locale", async () => {
    const user = userEvent.setup();
    const replace = vi.fn();

    globalThis.__TEST_LOCALE__ = "en";
    globalThis.__TEST_PATHNAME__ = "/challenges";
    globalThis.__TEST_SEARCH_PARAMS__ = "topic=mechanics&progress=started";
    globalThis.__TEST_ROUTER_REPLACE__ = replace;
    window.location.hash = "#challenge-browser";

    const { rerender } = render(<LocaleSwitcher />);
    const switcher = screen.getByRole("combobox", { name: /change language/i });

    expect(switcher).toHaveValue("en");

    await user.selectOptions(switcher, "zh-HK");

    expect(replace).toHaveBeenCalledWith(
      "/challenges?topic=mechanics&progress=started#challenge-browser",
      {
        locale: "zh-HK",
        scroll: false,
      },
    );

    globalThis.__TEST_LOCALE__ = "zh-HK";
    rerender(<LocaleSwitcher />);

    await waitFor(() => expect(switcher).toHaveValue("zh-HK"));

    await user.selectOptions(switcher, "en");

    expect(replace).toHaveBeenLastCalledWith(
      "/challenges?topic=mechanics&progress=started#challenge-browser",
      {
        locale: "en",
        scroll: false,
      },
    );

    globalThis.__TEST_LOCALE__ = "en";
    rerender(<LocaleSwitcher />);

    await waitFor(() => expect(switcher).toHaveValue("en"));
  });
});
