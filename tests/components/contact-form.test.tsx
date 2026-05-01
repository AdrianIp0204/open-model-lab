import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContactForm } from "@/components/concepts/ContactForm";

describe("ContactForm", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts structured feedback and shows a delivery confirmation", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === "/api/feedback" && (!init?.method || init.method === "GET")) {
        return Promise.resolve(
          new Response(JSON.stringify({ deliveryEnabled: true, fallbackEmail: "hello@openmodellab.example" }), {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          }),
        );
      }

      return Promise.resolve(
        new Response(JSON.stringify({ ok: true, delivery: "email" }), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
      );
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<ContactForm />);

    await user.type(screen.getByLabelText(/reply email or handle/i), "ada@example.com");
    await user.type(
      screen.getByLabelText(/what happened/i),
      "The damping controls felt hard to read when I switched presets.",
    );
    await user.click(screen.getByRole("button", { name: /send feedback/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/feedback",
      expect.objectContaining({
        body: expect.stringContaining("\"pagePath\":\"/contact\""),
        method: "POST",
      }),
    );
    const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(String(postCall?.[1]?.body)).toContain("\"surface\":\"page\"");
    expect(screen.getByText(/feedback sent for contact/i)).toBeInTheDocument();
  });

  it("switches into fallback-only mode when delivery is unavailable", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === "/api/feedback" && (!init?.method || init.method === "GET")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              deliveryEnabled: false,
              fallbackEmail: "preview@openmodellab.dev",
            }),
            {
              status: 200,
              headers: {
                "content-type": "application/json",
              },
            },
          ),
        );
      }

      return Promise.resolve(
        new Response(
          JSON.stringify({
            code: "delivery_not_configured",
            error: "Feedback delivery is not configured for this deployment.",
            fallbackEmail: "preview@openmodellab.dev",
          }),
          {
            status: 503,
            headers: {
              "content-type": "application/json",
            },
          },
        ),
      );
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<ContactForm />);

    expect(
      await screen.findByText(/currently using the prefilled email fallback/i),
    ).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/feedback type/i), "request");
    await user.type(
      screen.getByLabelText(/what happened/i),
      "Please add a compact optics starter track after projectile motion.",
    );

    expect(screen.getByRole("button", { name: /delivery unavailable/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /check delivery again/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open prefilled email draft/i })).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:preview@openmodellab.dev"),
    );
    expect(screen.getByText("preview@openmodellab.dev")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
