// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountAwareReviewRemediationList } from "@/components/progress/AccountAwareReviewRemediationList";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";
import zhHkMessages from "@/messages/zh-HK.json";

const useAccountSessionMock = vi.fn();

vi.mock("@/lib/account/client", () => ({
  useAccountSession: () => useAccountSessionMock(),
}));

function createFetchResponse(items: Array<Record<string, string>>) {
  return {
    ok: true,
    json: async () => ({ items }),
  };
}

describe("AccountAwareReviewRemediationList", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-in",
      user: {
        id: "user-1",
      },
      entitlement: resolveAccountEntitlement({
        tier: "premium",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    globalThis.__TEST_LOCALE__ = undefined;
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    useAccountSessionMock.mockReset();
  });

  it("clears stale saved setup actions when the review concept changes before the next fetch resolves", async () => {
    fetchMock
      .mockResolvedValueOnce(
        createFetchResponse([
          {
            id: "saved-compare-1",
            conceptSlug: "compare-practice-a",
            name: "Baseline vs variant",
            updatedAt: "2026-03-29T00:05:00.000Z",
            setupALabel: "Baseline",
            setupBLabel: "Variant",
            href: "/concepts/compare-practice-a?state=v1.saved#live-bench",
          },
        ]),
      )
      .mockImplementationOnce(
        () =>
          new Promise(() => {
            // Leave the second request pending to verify the component clears
            // the previous concept's saved setup immediately on rerender.
          }),
      );

    const { rerender } = render(
      <AccountAwareReviewRemediationList
        concept={{
          slug: "compare-practice-a",
          title: "Compare Practice A",
        }}
        reasonKind="challenge"
        primaryAction={{
          href: "/concepts/compare-practice-a#challenge-mode",
          label: "Retry challenge",
          kind: "challenge",
          note: null,
        }}
        secondaryAction={null}
        suggestions={[]}
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByText(/saved compare setup/i).length).toBeGreaterThan(0);
    });

    rerender(
      <AccountAwareReviewRemediationList
        concept={{
          slug: "compare-practice-b",
          title: "Compare Practice B",
        }}
        reasonKind="challenge"
        primaryAction={{
          href: "/concepts/compare-practice-b#challenge-mode",
          label: "Retry challenge",
          kind: "challenge",
          note: null,
        }}
        secondaryAction={null}
        suggestions={[]}
      />,
    );

    await waitFor(() => {
      expect(screen.queryAllByText(/saved compare setup/i)).toHaveLength(0);
    });
  });

  it("renders zh-HK remediation chrome without leaking English saved-setup labels", async () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";
    fetchMock.mockResolvedValue(
      createFetchResponse([
        {
          id: "saved-compare-1",
          conceptSlug: "compare-practice-a",
          name: "Baseline vs variant",
          updatedAt: "2026-03-29T00:05:00.000Z",
          setupALabel: "Baseline",
          setupBLabel: "Variant",
          href: "/concepts/compare-practice-a?state=v1.saved#live-bench",
        },
      ]),
    );

    render(
      <AccountAwareReviewRemediationList
        concept={{
          slug: "compare-practice-a",
          title: "Compare Practice A",
        }}
        reasonKind="challenge"
        primaryAction={{
          href: "/concepts/compare-practice-a#challenge-mode",
          label: "Retry challenge",
          kind: "challenge",
          note: null,
        }}
        secondaryAction={null}
        suggestions={[]}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getAllByText(zhHkMessages.ProgressRemediation.kindLabels.savedCompareSetup).length,
      ).toBeGreaterThan(0);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/account/compare-setups/recovery?concept=compare-practice-a&locale=zh-HK",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
    expect(
      screen.getByText(zhHkMessages.ProgressRemediation.descriptions.savedCompareSetup),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: zhHkMessages.ProgressRemediation.actions.savedCompareSetup,
      }),
    ).toHaveAttribute("href", "/zh-HK/concepts/compare-practice-a?state=v1.saved#live-bench");
    expect(screen.queryByText(/saved compare setup/i)).not.toBeInTheDocument();
  });
});
