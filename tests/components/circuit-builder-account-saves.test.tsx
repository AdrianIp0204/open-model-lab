// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CircuitBuilderPage } from "@/components/circuit-builder/CircuitBuilderPage";
import { resolveAccountEntitlement } from "@/lib/account/entitlements";
import { localSavedCircuitsStore } from "@/lib/circuit-builder";

const useAccountSessionMock = vi.fn();

vi.mock("@/lib/account/client", () => ({
  useAccountSession: () => useAccountSessionMock(),
}));

async function openSaveActions(user: ReturnType<typeof userEvent.setup>) {
  const button = screen.getByRole("button", { name: "Saves" });
  if (button.getAttribute("aria-expanded") === "true") {
    return;
  }
  await user.click(button);
}

describe("CircuitBuilderPage account saves", () => {
  beforeEach(() => {
    window.localStorage.clear();
    localSavedCircuitsStore.resetForTests();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    window.localStorage.clear();
    localSavedCircuitsStore.resetForTests();
    useAccountSessionMock.mockReset();
  });

  it("keeps local save tools working while signed-out users see a sign-in/premium notice for account saves", async () => {
    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-out",
      user: null,
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "anonymous-default",
      }),
    });

    render(<CircuitBuilderPage />);

    const user = userEvent.setup();
    await openSaveActions(user);
    expect(screen.getByRole("button", { name: "Save locally" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save to account" })).toBeDisabled();
    expect(screen.getAllByRole("link", { name: /sign in/i })[0]).toHaveAttribute(
      "href",
      "/account",
    );
  });

  it("shows the locked premium notice for signed-in free users", async () => {
    useAccountSessionMock.mockReturnValue({
      initialized: true,
      status: "signed-in",
      user: {
        id: "user-1",
      },
      entitlement: resolveAccountEntitlement({
        tier: "free",
        source: "stored",
        updatedAt: "2026-04-02T00:00:00.000Z",
      }),
    });

    render(<CircuitBuilderPage />);

    const user = userEvent.setup();
    await openSaveActions(user);
    expect(screen.getByRole("button", { name: "Save to account" })).toBeDisabled();
    expect(screen.getAllByRole("link", { name: "View Supporter plan" })[0]).toHaveAttribute(
      "href",
      "/pricing#compare",
    );
  });

  it("lets eligible users save, update, open, rename, and delete account-backed circuits", async () => {
    const user = userEvent.setup();
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

    const accountItems: Array<{
      id: string;
      title: string;
      createdAt: string;
      updatedAt: string;
      document: unknown;
    }> = [];
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input, init) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (url !== "/api/account/circuit-saves") {
          throw new Error(`Unexpected fetch ${url}`);
        }

        const method = init?.method ?? "GET";
        if (method === "GET") {
          return new Response(JSON.stringify({ items: accountItems }), { status: 200 });
        }

        const payload = init?.body ? JSON.parse(String(init.body)) : {};
        if (method === "POST") {
          const existingIndex =
            typeof payload.id === "string"
              ? accountItems.findIndex((item) => item.id === payload.id)
              : -1;
          const now = "2026-04-15T12:00:00.000Z";
          const next =
            existingIndex >= 0
              ? {
                  ...accountItems[existingIndex],
                  title: payload.title,
                  updatedAt: now,
                  document: payload.document,
                }
              : {
                  id: crypto.randomUUID(),
                  title: payload.title,
                  createdAt: now,
                  updatedAt: now,
                  document: payload.document,
                };
          if (existingIndex >= 0) {
            accountItems.splice(existingIndex, 1, next);
          } else {
            accountItems.unshift(next);
          }
          return new Response(
            JSON.stringify({
              savedCircuit: next,
              replacedExisting: existingIndex >= 0,
              items: accountItems,
            }),
            { status: 200 },
          );
        }

        if (method === "PATCH") {
          const index = accountItems.findIndex((item) => item.id === payload.id);
          const renamed = {
            ...accountItems[index],
            title: payload.title,
            updatedAt: "2026-04-15T12:30:00.000Z",
          };
          accountItems.splice(index, 1, renamed);
          return new Response(
            JSON.stringify({
              savedCircuit: renamed,
              replacedExisting: true,
              items: accountItems,
            }),
            { status: 200 },
          );
        }

        if (method === "DELETE") {
          const nextItems = accountItems.filter((item) => item.id !== payload.id);
          accountItems.splice(0, accountItems.length, ...nextItems);
          return new Response(JSON.stringify({ items: accountItems }), { status: 200 });
        }

        throw new Error(`Unexpected method ${method}`);
      });

    render(<CircuitBuilderPage />);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    await user.click(screen.getByRole("button", { name: "LDR light explorer" }));
    await openSaveActions(user);
    await user.click(screen.getByRole("button", { name: "Save to account" }));
    await user.clear(screen.getByRole("textbox", { name: "Account save name" }));
    await user.type(screen.getByRole("textbox", { name: "Account save name" }), "Cloud save");
    await user.click(screen.getByRole("button", { name: "Save to account" }));

    await waitFor(() => {
      expect(accountItems).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/account/circuit-saves",
        expect.objectContaining({ method: "POST" }),
      );
    });
    await openSaveActions(user);
    expect(screen.getByRole("button", { name: "Update account save" })).toBeEnabled();

    fireEvent.change(screen.getAllByLabelText("Light intensity")[0]!, {
      target: { value: "100" },
    });
    await openSaveActions(user);
    await user.click(screen.getByRole("button", { name: "Update account save" }));

    await user.click(screen.getByRole("button", { name: "Thermistor temperature explorer" }));
    expect(screen.queryByRole("button", { name: "Light-dependent resistor 1" })).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open account save Cloud save" })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Open account save Cloud save" }));
    expect(screen.getAllByRole("button", { name: "Light-dependent resistor 1" }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/100%/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Rename account save Cloud save" }));
    await user.clear(screen.getByRole("textbox", { name: "Rename account save" }));
    await user.type(screen.getByRole("textbox", { name: "Rename account save" }), "Renamed cloud save");
    await user.click(screen.getByRole("button", { name: "Save name" }));
    expect(screen.getByText("Renamed cloud save")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete account save Renamed cloud save" }));
    expect(screen.queryByText("Renamed cloud save")).not.toBeInTheDocument();
  }, 15_000);
});
