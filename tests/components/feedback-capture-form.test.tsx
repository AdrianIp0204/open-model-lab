// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeedbackCaptureForm } from "@/components/feedback/FeedbackCaptureForm";
import {
  setAnalyticsTransportForTests,
  type AnalyticsSubmission,
} from "@/lib/analytics";

describe("FeedbackCaptureForm", () => {
  afterEach(() => {
    setAnalyticsTransportForTests(null);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("emits feedback_submitted without sending message content into analytics", async () => {
    const user = userEvent.setup();
    const events: AnalyticsSubmission[] = [];

    setAnalyticsTransportForTests((event) => {
      events.push(event);
    });

    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (!init || init.method === "GET") {
        return new Response(
          JSON.stringify({
            deliveryEnabled: true,
            fallbackEmail: "preview@openmodellab.dev",
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        );
      }

      return new Response(
        JSON.stringify({
          ok: true,
          delivery: "email",
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    });

    vi.stubGlobal("fetch", fetchMock);

    render(
      <FeedbackCaptureForm
        context={{
          pageType: "concept",
          pagePath: "/concepts/projectile-motion",
          pageTitle: "Projectile Motion",
          conceptId: "concept-projectile-motion",
          conceptSlug: "projectile-motion",
          conceptTitle: "Projectile Motion",
        }}
        variant="page"
      />,
    );

    await user.type(
      screen.getByRole("textbox", { name: /what happened/i }),
      "The graph labels should explain the axes more clearly.",
    );
    await user.click(screen.getByRole("button", { name: /send feedback/i }));

    await waitFor(() =>
      expect(screen.getByText(/feedback sent for projectile motion/i)).toBeInTheDocument(),
    );

    expect(events).toContainEqual(
      expect.objectContaining({
        name: "feedback_submitted",
        payload: expect.objectContaining({
          pagePath: "/concepts/projectile-motion",
          pageKind: "concept",
          conceptSlug: "projectile-motion",
          feedbackCategory: "clarity",
          surface: "page",
        }),
      }),
    );

    const analyticsEvent = events.find((event) => event.name === "feedback_submitted");

    expect(analyticsEvent?.payload).not.toHaveProperty("message");
    expect(analyticsEvent?.payload).not.toHaveProperty("contact");
  });

  it("switches into explicit email fallback mode when direct delivery is unavailable", async () => {
    const user = userEvent.setup();
    const fallbackHref =
      "mailto:preview@openmodellab.dev?subject=Open%20Model%20Lab%20feedback";
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (!init || init.method === "GET") {
        return new Response(
          JSON.stringify({
            deliveryEnabled: true,
            fallbackEmail: "preview@openmodellab.dev",
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        );
      }

      return new Response(
        JSON.stringify({
          code: "delivery_not_configured",
          error: "Feedback delivery is not configured for this deployment.",
          fallbackEmail: "preview@openmodellab.dev",
          fallbackHref,
        }),
        {
          status: 503,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    });

    vi.stubGlobal("fetch", fetchMock);

    render(
      <FeedbackCaptureForm
        context={{
          pageType: "concept",
          pagePath: "/concepts/projectile-motion",
          pageTitle: "Projectile Motion",
          conceptId: "concept-projectile-motion",
          conceptSlug: "projectile-motion",
          conceptTitle: "Projectile Motion",
        }}
        variant="page"
      />,
    );

    await user.type(
      screen.getByRole("textbox", { name: /what happened/i }),
      "The fallback needs to stay clear when direct delivery is unavailable.",
    );
    await user.click(screen.getByRole("button", { name: /send feedback/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        /currently using the prefilled email fallback/i,
      ),
    );
    expect(
      screen.getByRole("link", { name: /open prefilled email draft/i }),
    ).toHaveAttribute("href", fallbackHref);
  });

  it("keeps direct delivery available after a retryable delivery timeout", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (!init || init.method === "GET") {
        return new Response(
          JSON.stringify({
            deliveryEnabled: true,
            fallbackEmail: "preview@openmodellab.dev",
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        );
      }

      return new Response(
        JSON.stringify({
          code: "delivery_timeout",
          error: "Feedback delivery timed out before the preview inbox confirmed receipt.",
          fallbackEmail: "preview@openmodellab.dev",
        }),
        {
          status: 504,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    });

    vi.stubGlobal("fetch", fetchMock);

    render(
      <FeedbackCaptureForm
        context={{
          pageType: "concept",
          pagePath: "/concepts/projectile-motion",
          pageTitle: "Projectile Motion",
          conceptId: "concept-projectile-motion",
          conceptSlug: "projectile-motion",
          conceptTitle: "Projectile Motion",
        }}
        variant="page"
      />,
    );

    await user.type(
      screen.getByRole("textbox", { name: /what happened/i }),
      "The delivery timeout should still let me retry this note directly from the form.",
    );
    await user.click(screen.getByRole("button", { name: /send feedback/i }));

    await waitFor(() =>
      expect(screen.getByText(/did not confirm this note in time/i)).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: /send feedback/i })).toBeEnabled();
    expect(screen.getByRole("link", { name: /email instead/i })).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:preview@openmodellab.dev"),
    );
    expect(screen.getByText(/direct delivery is available for this deployment/i)).toBeInTheDocument();
  });
});
