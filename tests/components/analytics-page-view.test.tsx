// @vitest-environment jsdom

import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AnalyticsPageView } from "@/components/analytics/AnalyticsPageView";
import {
  setAnalyticsTransportForTests,
  type AnalyticsSubmission,
} from "@/lib/analytics";

describe("AnalyticsPageView", () => {
  afterEach(() => {
    setAnalyticsTransportForTests(null);
  });

  it("emits page_discovery for the current public page context", async () => {
    const events: AnalyticsSubmission[] = [];

    setAnalyticsTransportForTests((event) => {
      events.push(event);
    });

    render(
      <AnalyticsPageView
        context={{
          pagePath: "/concepts",
          pageTitle: "Concepts",
          pageType: "concepts",
        }}
      />,
    );

    await waitFor(() => {
      expect(events).toContainEqual(
        expect.objectContaining({
          name: "page_discovery",
          payload: expect.objectContaining({
            pagePath: "/concepts",
            pageKind: "concepts",
          }),
        }),
      );
    });
  });
});
