// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CIRCUIT_DRAFT_STORAGE_KEY,
  localSavedCircuitsStore,
} from "@/lib/circuit-builder";
import { CircuitBuilderPage } from "@/components/circuit-builder/CircuitBuilderPage";

const requiredPaletteButtons = [
  "Activate wire tool",
  "Add Ammeter",
  "Add Voltmeter",
  "Add Resistor",
  "Add Switch",
  "Add Light bulb",
  "Add Diode",
  "Add Battery",
  "Add Capacitor",
  "Add Thermistor",
  "Add Light-dependent resistor",
  "Add Fuse",
];

function getPaletteButton(name: string | RegExp) {
  return screen.getAllByRole("button", { name })[0]!;
}

async function openToolbarMenu(
  user: ReturnType<typeof userEvent.setup>,
  name: "Saves" | "File",
) {
  const button = screen.getByRole("button", { name });
  if (button.getAttribute("aria-expanded") === "true") {
    return;
  }
  await user.click(button);
}

describe("CircuitBuilderPage", () => {
  afterEach(() => {
    window.localStorage.clear();
    localSavedCircuitsStore.resetForTests();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("exposes the full required palette with stable visible and accessible names", () => {
    const { container } = render(<CircuitBuilderPage />);
    const desktopPalette = within(
      container.querySelector('[data-circuit-palette-panel="desktop"]') as HTMLElement,
    );

    expect(screen.getAllByRole("complementary", { name: "Component library" }).length).toBeGreaterThan(0);
    for (const label of requiredPaletteButtons) {
      expect(screen.getAllByRole("button", { name: label }).length).toBeGreaterThan(0);
    }

    expect(desktopPalette.getByRole("button", { name: "Add Battery" })).toHaveAccessibleDescription(
      /Click to add Battery near the current workspace center, or drag it directly onto the workspace/i,
    );
    expect(desktopPalette.getByRole("button", { name: "Activate wire tool" })).toHaveAccessibleDescription(
      /Toggle wire mode, then choose two terminals/i,
    );

    expect(screen.getAllByText("Ammeter").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Voltmeter").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Thermistor").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Light-dependent resistor").length).toBeGreaterThan(0);
  });

  it("filters the desktop component library by search text and aliases, shows no-results, and clears cleanly", async () => {
    const user = userEvent.setup();
    const { container } = render(<CircuitBuilderPage />);
    const desktopPalette = within(
      container.querySelector('[data-circuit-palette-panel="desktop"]') as HTMLElement,
    );
    const searchInput = desktopPalette.getByLabelText("Search components");

    expect(desktopPalette.getByText(/tools and components available/i)).toBeVisible();
    expect(searchInput).toHaveAccessibleDescription(/Press Esc while searching to clear/i);

    await user.type(searchInput, "ldr");
    expect(desktopPalette.getByRole("button", { name: "Add Light-dependent resistor" })).toBeVisible();
    expect(desktopPalette.queryByRole("button", { name: "Add Battery" })).not.toBeInTheDocument();
    expect(desktopPalette.getByText(/match(?:es)? for “ldr”/i)).toBeVisible();

    await user.clear(searchInput);
    await user.type(searchInput, "power");
    expect(desktopPalette.getByRole("button", { name: "Add Battery" })).toBeVisible();

    await user.clear(searchInput);
    await user.type(searchInput, "bulb");
    expect(desktopPalette.getByRole("button", { name: "Add Light bulb" })).toBeVisible();

    await user.clear(searchInput);
    await user.type(searchInput, "light resistor");
    expect(desktopPalette.getByRole("button", { name: "Add Light-dependent resistor" })).toBeVisible();
    expect(desktopPalette.queryByRole("button", { name: "Add Light bulb" })).not.toBeInTheDocument();
    expect(desktopPalette.queryByRole("button", { name: "Add Resistor" })).not.toBeInTheDocument();
    expect(desktopPalette.getByText(/1 match for “light resistor”/i)).toBeVisible();

    await user.clear(searchInput);
    await user.type(searchInput, "zzz");
    expect(desktopPalette.getByText(/No components match that search/i)).toBeVisible();
    expect(desktopPalette.getByText(/Try “battery”, “bulb”, “ldr”/i)).toBeVisible();
    expect(desktopPalette.getByText(/0 matches for “zzz”/i)).toBeVisible();
    expect(desktopPalette.getByRole("button", { name: "Clear component search" })).toHaveAccessibleDescription(
      /keep focus in the search field/i,
    );
    expect(desktopPalette.getByRole("button", { name: "Clear component search" })).toHaveAttribute(
      "aria-keyshortcuts",
      "Escape",
    );

    await user.click(desktopPalette.getByRole("button", { name: "Show all components" }));
    expect(desktopPalette.getByRole("button", { name: "Add Fuse" })).toBeVisible();
    expect(desktopPalette.getByText(/tools and components available/i)).toBeVisible();
    expect(searchInput).toHaveFocus();

    await user.type(searchInput, "zzz");
    await user.keyboard("{Escape}");
    expect(desktopPalette.getByRole("button", { name: "Add Fuse" })).toBeVisible();
    expect(searchInput).toHaveFocus();

    await user.type(searchInput, "fuse");
    await user.click(desktopPalette.getByRole("button", { name: "Clear component search" }));
    expect(desktopPalette.getByRole("button", { name: "Add Battery" })).toBeVisible();
    expect(desktopPalette.getByText(/tools and components available/i)).toBeVisible();
    expect(searchInput).toHaveFocus();
  });

  it("renders a workspace-first builder row with an internally scrollable palette and compact environment controls", () => {
    const { container } = render(<CircuitBuilderPage />);

    const builderRow = container.querySelector("[data-circuit-builder-row]");
    const palettePanel = container.querySelector('[data-circuit-palette-panel="desktop"]');
    const desktopPalette = within(palettePanel as HTMLElement);
    const paletteScroll = container.querySelector('[data-circuit-palette-scroll="desktop"]');
    const workspacePanel = container.querySelector("[data-circuit-workspace-panel]");
    const desktopEnvironment = container.querySelector(
      '[data-circuit-environment-control="desktop"]',
    );
    const mobileEnvironment = container.querySelector(
      '[data-circuit-environment-control="mobile"]',
    );

    expect(builderRow).not.toBeNull();
    expect(builderRow?.getAttribute("class")).toContain("xl:h-[min(82svh,58rem)]");
    expect(builderRow?.getAttribute("class")).toContain("xl:grid-cols-[14rem_minmax(0,1fr)_18rem]");
    expect(palettePanel?.getAttribute("class")).toContain("h-full");
    expect(palettePanel?.getAttribute("class")).toContain("min-h-0");
    expect(paletteScroll?.getAttribute("class")).toContain("overflow-y-auto");
    expect(desktopPalette.getByRole("button", { name: "Add Battery" }).getAttribute("class")).toContain("py-2");
    expect(workspacePanel?.getAttribute("class")).toContain("h-full");
    expect(container.querySelector("[data-circuit-workspace-canvas]")?.getAttribute("class")).toContain("touch-none");
    expect(desktopEnvironment).not.toBeNull();
    expect(mobileEnvironment).not.toBeNull();
  });

  it("lets desktop side panels collapse so the workspace can take priority", async () => {
    const user = userEvent.setup();
    const { container } = render(<CircuitBuilderPage />);

    const builderRow = container.querySelector("[data-circuit-builder-row]");
    await user.click(screen.getByRole("button", { name: "Collapse component library" }));
    expect(container.querySelector("[data-circuit-palette-collapsed]")).not.toBeNull();
    expect(builderRow?.getAttribute("class")).toContain("xl:grid-cols-[3.25rem_minmax(0,1fr)_18rem]");
    await user.click(screen.getByRole("button", { name: "Expand component library" }));
    expect(container.querySelector("[data-circuit-palette-collapsed]")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Collapse inspector" }));
    expect(container.querySelector("[data-circuit-inspector-collapsed]")).not.toBeNull();
    expect(builderRow?.getAttribute("class")).toContain("xl:grid-cols-[14rem_minmax(0,1fr)_3.25rem]");
    await user.click(screen.getByRole("button", { name: "Expand inspector" }));
    expect(container.querySelector("[data-circuit-inspector-collapsed]")).toBeNull();
  });

  it("allows a deeper, clearly clamped workspace zoom range", async () => {
    const user = userEvent.setup();
    const { container } = render(<CircuitBuilderPage />);
    const workspaceControls = within(
      container.querySelector("[data-circuit-workspace-controls]") as HTMLElement,
    );

    for (let index = 0; index < 14; index += 1) {
      await user.click(workspaceControls.getByRole("button", { name: "Zoom +" }));
    }

    expect(container.querySelector("[data-circuit-workspace-view-status]")).toHaveTextContent("240% zoom");
    expect(workspaceControls.getByRole("button", { name: "Zoom +" })).toBeDisabled();
    expect(workspaceControls.getByRole("button", { name: "Zoom +" })).toHaveAccessibleDescription(
      /maximum 240% zoom/i,
    );
  });

  it("keeps only one toolbar popover open at a time", async () => {
    const user = userEvent.setup();
    render(<CircuitBuilderPage />);

    const savesButton = screen.getByRole("button", { name: "Saves" });
    const fileButton = screen.getByRole("button", { name: "File" });

    await user.click(savesButton);
    expect(savesButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Save locally" })).toBeVisible();

    await user.click(fileButton);
    expect(fileButton).toHaveAttribute("aria-expanded", "true");
    expect(savesButton).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Save locally" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download JSON" })).toBeVisible();

    await user.click(savesButton);
    expect(savesButton).toHaveAttribute("aria-expanded", "true");
    expect(fileButton).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Download JSON" })).not.toBeInTheDocument();
  });

  it("clamps dragged palette drops to the reachable workspace bounds", () => {
    const { container } = render(<CircuitBuilderPage />);
    const canvas = container.querySelector(
      "[data-circuit-workspace-canvas]",
    ) as SVGSVGElement;

    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      x: 100,
      y: 20,
      left: 100,
      top: 20,
      right: 500,
      bottom: 320,
      width: 400,
      height: 300,
      toJSON: () => ({}),
    } as DOMRect);

    const dropEvent = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(dropEvent, "clientX", { value: 900 });
    Object.defineProperty(dropEvent, "clientY", { value: 620 });
    Object.defineProperty(dropEvent, "dataTransfer", {
      value: {
        getData: (type: string) => (
          type === "application/open-model-lab-circuit-part" ? "battery" : ""
        ),
      },
    });

    fireEvent(canvas, dropEvent);

    expect(screen.getAllByRole("button", { name: "Battery 1" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Battery 1 dropped at 1536, 896 and selected.",
    );
    expect(screen.getAllByRole("spinbutton", { name: "Position X" })[0]).toHaveValue(1536);
    expect(screen.getAllByRole("spinbutton", { name: "Position Y" })[0]).toHaveValue(896);
  });

  it("shows a clear drop target only for draggable palette parts", () => {
    const { container } = render(<CircuitBuilderPage />);
    const canvas = container.querySelector(
      "[data-circuit-workspace-canvas]",
    ) as SVGSVGElement;

    const unrelatedDrag = new Event("dragenter", { bubbles: true, cancelable: true });
    Object.defineProperty(unrelatedDrag, "dataTransfer", {
      value: { types: ["text/plain"], dropEffect: "none" },
    });
    fireEvent(canvas, unrelatedDrag);
    expect(container.querySelector("[data-circuit-workspace-drop-hint]")).toBeNull();

    const invalidPartDrag = new Event("dragenter", { bubbles: true, cancelable: true });
    Object.defineProperty(invalidPartDrag, "dataTransfer", {
      value: {
        types: ["application/open-model-lab-circuit-part"],
        dropEffect: "none",
        getData: (type: string) => (
          type === "application/open-model-lab-circuit-part" ? "wire" : ""
        ),
      },
    });
    fireEvent(canvas, invalidPartDrag);
    expect(container.querySelector("[data-circuit-workspace-drop-hint]")).toBeNull();

    const paletteDrag = new Event("dragenter", { bubbles: true, cancelable: true });
    Object.defineProperty(paletteDrag, "dataTransfer", {
      value: {
        types: ["application/open-model-lab-circuit-part"],
        dropEffect: "none",
      },
    });
    fireEvent(canvas, paletteDrag);

    expect(container.querySelector("[data-circuit-workspace-drop-hint]")).not.toBeNull();
    expect(screen.getByText("Drop the part on the 32 px snap grid")).toBeVisible();

    const batteryDrag = new Event("dragover", { bubbles: true, cancelable: true });
    Object.defineProperty(batteryDrag, "dataTransfer", {
      value: {
        types: ["application/open-model-lab-circuit-part"],
        dropEffect: "none",
        getData: (type: string) => (
          type === "application/open-model-lab-circuit-part" ? "battery" : ""
        ),
      },
    });
    fireEvent(canvas, batteryDrag);
    expect(screen.getByText("Drop Battery on the 32 px snap grid")).toBeVisible();

    const dragLeave = new Event("dragleave", { bubbles: true, cancelable: true });
    Object.defineProperty(dragLeave, "relatedTarget", { value: null });
    Object.defineProperty(dragLeave, "dataTransfer", {
      value: {
        types: ["application/open-model-lab-circuit-part"],
        dropEffect: "copy",
      },
    });
    fireEvent(canvas, dragLeave);

    expect(container.querySelector("[data-circuit-workspace-drop-hint]")).toBeNull();
  });

  it("ignores invalid palette drop payloads without changing the workspace", () => {
    const { container } = render(<CircuitBuilderPage />);
    const canvas = container.querySelector(
      "[data-circuit-workspace-canvas]",
    ) as SVGSVGElement;

    const dropEvent = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(dropEvent, "clientX", { value: 160 });
    Object.defineProperty(dropEvent, "clientY", { value: 160 });
    Object.defineProperty(dropEvent, "dataTransfer", {
      value: {
        getData: (type: string) => (
          type === "application/open-model-lab-circuit-part" ? "wire" : ""
        ),
      },
    });

    expect(() => fireEvent(canvas, dropEvent)).not.toThrow();
    expect(screen.queryByRole("button", { name: "Wire 1" })).not.toBeInTheDocument();
    expect(screen.getByText("0 parts")).toBeVisible();
    expect(screen.getByText("Empty workspace")).toBeVisible();
  });

  it("keeps the toolbar compact by grouping save and file actions into explicit menus", async () => {
    const user = userEvent.setup();
    const { container } = render(<CircuitBuilderPage />);

    expect(container.querySelector("[data-circuit-toolbar]")).not.toBeNull();
    expect(container.querySelector('[data-circuit-toolbar-group="history"]')).not.toBeNull();
    expect(container.querySelector('[data-circuit-toolbar-group="selection"]')).not.toBeNull();
    expect(container.querySelector('[data-circuit-toolbar-menu="saves"]')).not.toBeNull();
    expect(container.querySelector('[data-circuit-toolbar-menu="file"]')).not.toBeNull();

    expect(screen.queryByRole("button", { name: "Save locally" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Download JSON" })).not.toBeInTheDocument();

    await openToolbarMenu(user, "Saves");
    expect(screen.getByRole("button", { name: "Save locally" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Update saved" })).toBeDisabled();

    await openToolbarMenu(user, "File");
    const fileMenu = within(
      container.querySelector('[data-circuit-toolbar-menu="file"]') as HTMLElement,
    );
    expect(fileMenu.getByRole("button", { name: "Download JSON" })).toBeVisible();
    expect(fileMenu.getByRole("button", { name: "Load JSON" })).toBeVisible();
    expect(fileMenu.getByRole("button", { name: "Copy JSON state" })).toBeVisible();
    expect(fileMenu.queryByRole("button", { name: "Clear workspace" })).not.toBeInTheDocument();
  });

  it("closes toolbar menus with Escape without clearing the active workspace selection", async () => {
    const user = userEvent.setup();

    render(<CircuitBuilderPage />);

    await user.click(getPaletteButton("Add Battery"));
    expect(screen.getByText(/Battery 1 selected\. Drag it/i)).toBeVisible();

    await openToolbarMenu(user, "Saves");
    const savesTrigger = screen.getByRole("button", { name: "Saves" });
    const savesDialog = screen.getByRole("dialog", { name: "Save and reopen circuits" });
    expect(savesDialog).toBeVisible();
    expect(savesDialog).toHaveAttribute("aria-keyshortcuts", "Escape");
    await waitFor(() => expect(savesDialog).toHaveFocus());
    expect(screen.getByRole("button", { name: "Save locally" })).toBeVisible();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("button", { name: "Save locally" })).not.toBeInTheDocument();
    expect(screen.getByText(/Battery 1 selected\. Drag it/i)).toBeVisible();
    expect(screen.getByRole("button", { name: "Rotate selected" })).toBeEnabled();
    expect(savesTrigger).toHaveFocus();
  });

  it("lets users add parts, wire a loop, and edit component values with immediate recompute", async () => {
    const user = userEvent.setup();

    render(<CircuitBuilderPage />);

    await user.click(getPaletteButton("Add Battery"));
    await user.click(getPaletteButton("Add Resistor"));

    fireEvent.change(screen.getAllByRole("spinbutton", { name: /^Resistance/i })[0], {
      target: { value: "18" },
    });

    await user.click(getPaletteButton("Activate wire tool"));
    fireEvent.click(screen.getByLabelText("Battery 1 positive terminal"));
    fireEvent.click(screen.getByLabelText("Resistor 1 terminal A"));
    fireEvent.click(screen.getByLabelText("Resistor 1 terminal B"));
    fireEvent.click(screen.getByLabelText("Battery 1 negative terminal"));

    expect(screen.getAllByText(/0\.5 A/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/9 V/).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Rotate selected" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Delete selected" })).toBeEnabled();
  });

  it("keeps direct workspace selection stable when switching between components", async () => {
    const user = userEvent.setup();

    render(<CircuitBuilderPage />);

    await user.click(getPaletteButton("Add Battery"));
    await user.click(getPaletteButton("Add Resistor"));

    fireEvent.click(screen.getAllByRole("button", { name: "Battery 1" })[0]!);
    expect(screen.getAllByRole("heading", { name: "Battery 1" }).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("button", { name: "Resistor 1" })[0]!);
    expect(screen.getAllByRole("heading", { name: "Resistor 1" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Rotate selected" })).toBeEnabled();
    expect(screen.queryByText("Nothing selected")).not.toBeInTheDocument();
  });

  it("summarizes workspace zoom, circuit counts, and current interaction guidance in the workspace header", async () => {
    const user = userEvent.setup();
    const { container } = render(<CircuitBuilderPage />);
    const viewStatus = within(
      container.querySelector("[data-circuit-workspace-view-status]") as HTMLElement,
    );

    expect(viewStatus.getByText("78% zoom")).toBeVisible();
    expect(viewStatus.getByText("0 parts")).toBeVisible();
    expect(viewStatus.getByText("0 wires")).toBeVisible();
    expect(viewStatus.getByText("32 px snap grid")).toBeVisible();
    expect(
      screen.getByRole("img", { name: /Interactive circuit workspace.*32 px snap grid/i }),
    ).toBeVisible();
    expect(
      screen.getByText(/Drag parts, rotate them in the inspector/i),
    ).toBeVisible();

    await user.click(getPaletteButton("Add Battery"));
    expect(
      screen.getByText(/Battery 1 selected\. Drag it, use arrow keys to nudge/i),
    ).toBeVisible();

    await user.click(getPaletteButton("Add Resistor"));
    await user.click(getPaletteButton("Activate wire tool"));
    fireEvent.click(screen.getByLabelText("Battery 1 positive terminal"));
    expect(
      screen.getByText(/Wiring from Battery 1 positive terminal/i),
    ).toBeVisible();
    expect(viewStatus.getByText("Choose wire end")).toBeVisible();
    expect(
      screen.getByRole("img", { name: /Interactive circuit workspace.*Choose wire end/i }),
    ).toBeVisible();
    fireEvent.click(screen.getByLabelText("Resistor 1 terminal A"));

    expect(viewStatus.getByText("2 parts")).toBeVisible();
    expect(viewStatus.getByText("1 wire")).toBeVisible();

    fireEvent.keyDown(window, { key: "+" });
    await waitFor(() => {
      expect(viewStatus.getByText("90% zoom")).toBeVisible();
    });
  });

  it("surfaces keyboard shortcuts for selection and wire-tool workflows", async () => {
    const user = userEvent.setup();

    const { container } = render(<CircuitBuilderPage />);
    const historyState = container.querySelector("[data-circuit-history-state]") as HTMLElement;

    expect(historyState).toHaveTextContent("No history yet");
    expect(historyState).toHaveAttribute("title", "Make a circuit change to enable undo history.");
    expect(screen.getByText(/Shortcuts: W starts wiring/i)).toBeVisible();
    expect(screen.getByText("Select mode")).toBeVisible();
    expect(screen.getByText(/Select mode is active/i)).toBeVisible();
    expect(screen.getByRole("button", { name: "Undo" })).toHaveAccessibleDescription(/Ctrl or Command plus Z/i);
    expect(screen.getByRole("button", { name: "Undo" })).toHaveAttribute(
      "aria-keyshortcuts",
      "Control+Z Meta+Z",
    );
    expect(screen.getByRole("button", { name: "Redo" })).toHaveAccessibleDescription(/Ctrl or Command plus Y/i);
    expect(screen.getByRole("button", { name: "Redo" })).toHaveAttribute(
      "aria-keyshortcuts",
      "Control+Y Meta+Y Control+Shift+Z Meta+Shift+Z",
    );
    expect(screen.getByRole("button", { name: "Rotate selected" })).toHaveAccessibleDescription(/Select a component before rotating/i);
    expect(screen.getByRole("button", { name: "Rotate selected" })).toHaveAttribute(
      "aria-keyshortcuts",
      "R",
    );
    expect(screen.getByRole("button", { name: "Delete selected" })).toHaveAccessibleDescription(/Select a component or wire before deleting/i);
    expect(screen.getByRole("button", { name: "Delete selected" })).toHaveAttribute(
      "aria-keyshortcuts",
      "Delete Backspace",
    );
    expect(screen.getAllByRole("button", { name: "Activate wire tool" })[0]).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    await user.click(getPaletteButton("Add Battery"));
    expect(historyState).toHaveTextContent("Undo add Battery 1");
    expect(historyState).toHaveAttribute("title", "Next undo: add Battery 1.");
    expect(screen.getByRole("button", { name: "Undo" })).toHaveAccessibleDescription(/Undo add Battery 1/i);
    expect(screen.getByRole("button", { name: "Rotate selected" })).toHaveAccessibleDescription(/Rotate the selected component/i);
    expect(screen.getByRole("button", { name: "Delete selected" })).toHaveAccessibleDescription(/Delete the selected component or wire/i);
    expect(screen.getByText(/R rotates the selected part/i)).toBeVisible();
    expect(screen.getByText(/Arrow keys move it/i)).toBeVisible();

    await user.keyboard("r");
    expect(screen.getByRole("status")).toHaveTextContent(/Battery 1 rotated/i);

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("status")).toHaveTextContent(/Battery 1 moved to/i);

    fireEvent.keyDown(window, { key: "ArrowDown", shiftKey: true });
    expect(screen.getByRole("status")).toHaveTextContent(/Use Shift\+arrow for larger steps/i);

    await user.keyboard("{Escape}");
    expect(screen.getByRole("status")).toHaveTextContent("Selection cleared.");

    await user.keyboard("w");
    expect(screen.getByRole("status")).toHaveTextContent("Wire tool active");
    expect(screen.getByText(/W or Esc leaves the wire tool/i)).toBeVisible();
    expect(screen.getByText("Wire mode")).toBeVisible();
    expect(screen.getByText(/Click any terminal to start a connection/i)).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Activate wire tool" })[0]).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getAllByRole("button", { name: "Activate wire tool" })[0]).toHaveAccessibleDescription(
      /Wire tool is active\. Press to return to select mode/i,
    );

    fireEvent.click(screen.getByLabelText("Battery 1 positive terminal"));
    expect(screen.getByText("Wire: choose end")).toBeVisible();
    expect(screen.getByText(/One terminal is selected/i)).toBeVisible();

    await user.keyboard("{Escape}");
    expect(screen.getByRole("status")).toHaveTextContent(/Wire cancelled/i);
    await user.keyboard("{Escape}");
    expect(screen.getByRole("status")).toHaveTextContent("Wire tool turned off.");

    fireEvent.click(screen.getAllByRole("button", { name: "Battery 1" })[0]!);
    await user.keyboard("{Delete}");

    expect(screen.getByRole("status")).toHaveTextContent("Battery 1 deleted.");
    expect(screen.queryAllByRole("button", { name: "Battery 1" })).toHaveLength(0);
  });

  it("describes component body keyboard actions and wiring lock states", async () => {
    const user = userEvent.setup();

    render(<CircuitBuilderPage />);

    await user.click(getPaletteButton("Add Battery"));
    const selectedBatteryBody = screen.getByRole("button", { name: "Battery 1" });
    expect(selectedBatteryBody).toHaveAccessibleDescription(/Battery 1 is selected/i);
    expect(selectedBatteryBody).toHaveAccessibleDescription(/arrow keys to nudge/i);
    expect(selectedBatteryBody).toHaveAttribute("aria-current", "true");

    await user.click(getPaletteButton("Activate wire tool"));
    const lockedBatteryBody = screen.getByRole("button", { name: "Battery 1" });
    expect(lockedBatteryBody).toHaveAccessibleDescription(/body is locked while wiring/i);
    expect(lockedBatteryBody).toHaveAccessibleDescription(/terminals to start a wire/i);
    expect(lockedBatteryBody).toHaveAttribute("aria-current", "true");

    fireEvent.click(screen.getByLabelText("Battery 1 positive terminal"));
    expect(screen.getByRole("button", { name: "Battery 1" })).toHaveAccessibleDescription(
      /body is locked while a wire is pending/i,
    );
    expect(screen.getByRole("button", { name: "Battery 1" })).toHaveAccessibleDescription(
      /finish the wire/i,
    );
  });

  it("locks stale selection actions when wiring starts so delete shortcuts stay safe", async () => {
    const user = userEvent.setup();

    render(<CircuitBuilderPage />);

    await user.click(getPaletteButton("Add Battery"));
    await user.click(getPaletteButton("Add Resistor"));
    expect(screen.getByRole("button", { name: "Delete selected" })).toBeEnabled();
    expect(screen.getByText(/Resistor 1 selected/i)).toBeVisible();

    await user.click(getPaletteButton("Activate wire tool"));
    expect(screen.getAllByRole("heading", { name: "Resistor 1" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Delete selected" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete selected" })).toHaveAccessibleDescription(/Finish or cancel wiring/i);
    for (const button of screen.getAllByRole("button", { name: "Rotate Resistor 1" })) {
      expect(button).toBeDisabled();
    }
    for (const button of screen.getAllByRole("button", { name: "Delete Resistor 1" })) {
      expect(button).toBeDisabled();
    }
    for (const button of screen.getAllByRole("button", { name: "Nudge right" })) {
      expect(button).toBeDisabled();
    }
    expect(screen.getAllByText(/Finish or cancel wiring before editing/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByLabelText("Battery 1 positive terminal"));
    expect(screen.getByText("Wire: choose end")).toBeVisible();
    expect(screen.getByRole("button", { name: "Delete selected" })).toBeDisabled();

    await user.keyboard("{Delete}");
    expect(screen.getByRole("status")).toHaveTextContent(/Finish or cancel wiring before deleting/i);
    expect(screen.getAllByRole("button", { name: "Battery 1" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Resistor 1" }).length).toBeGreaterThan(0);
  });

  it("supports keyboard, wheel, and workspace-control zoom/reset with live feedback", async () => {
    const user = userEvent.setup();

    const { container } = render(<CircuitBuilderPage />);
    const viewStatus = within(
      container.querySelector("[data-circuit-workspace-view-status]") as HTMLElement,
    );
    const canvas = container.querySelector("[data-circuit-workspace-canvas]") as SVGSVGElement;
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      x: 100,
      y: 20,
      left: 100,
      top: 20,
      right: 500,
      bottom: 320,
      width: 400,
      height: 300,
      toJSON: () => ({}),
    } as DOMRect);

    expect(screen.getByText(/\+\/- zooms, F fits, 0 resets view/i)).toBeVisible();

    const zoomInButton = screen.getByRole("button", { name: "Zoom +" });
    const zoomOutButton = screen.getByRole("button", { name: "Zoom -" });
    const resetViewButton = screen.getByRole("button", { name: "Reset view" });

    expect(zoomInButton).toHaveAccessibleDescription(/Shortcut: plus/i);
    expect(zoomInButton).toHaveAttribute("aria-keyshortcuts", "+");
    expect(zoomOutButton).toHaveAccessibleDescription(/Shortcut: minus/i);
    expect(zoomOutButton).toHaveAttribute("aria-keyshortcuts", "-");
    expect(resetViewButton).toBeDisabled();
    expect(resetViewButton).toHaveAccessibleDescription(/already at the default zoom and pan/i);
    expect(resetViewButton).toHaveAttribute("aria-keyshortcuts", "0");

    fireEvent.keyDown(window, { key: "0" });
    expect(screen.getByRole("status")).toHaveTextContent(/already at the default zoom and pan/i);

    fireEvent.keyDown(window, { key: "+" });
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/Workspace zoom 90%/i);
    });
    expect(resetViewButton).toBeEnabled();
    expect(resetViewButton).toHaveAccessibleDescription(/Reset the workspace to the default zoom and pan/i);

    fireEvent.keyDown(window, { key: "-" });
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/Workspace zoom 78%/i);
    });
    expect(resetViewButton).toBeDisabled();

    await user.click(zoomInButton);
    expect(screen.getByRole("status")).toHaveTextContent(/Workspace zoom 90%/i);

    await user.click(resetViewButton);
    expect(screen.getByRole("status")).toHaveTextContent(/Workspace view reset/i);
    expect(viewStatus.getByText("78% zoom")).toBeVisible();
    expect(resetViewButton).toBeDisabled();

    await user.click(zoomOutButton);
    expect(screen.getByRole("status")).toHaveTextContent(/Workspace zoom 66%/i);

    await user.click(resetViewButton);
    expect(screen.getByRole("status")).toHaveTextContent(/Workspace view reset/i);

    fireEvent.wheel(canvas, { deltaY: -80, clientX: 300, clientY: 160 });
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/Workspace zoom 86%/i);
    });
    expect(screen.getByRole("status")).toHaveTextContent(/pointer as its anchor/i);
    expect(viewStatus.getByText("86% zoom")).toBeVisible();

    fireEvent.wheel(canvas, { deltaY: 80, clientX: 300, clientY: 160 });
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/Workspace zoom 78%/i);
    });
    expect(viewStatus.getByText("78% zoom")).toBeVisible();
  });

  it("fits the workspace view to the current circuit from controls and keyboard", async () => {
    const user = userEvent.setup();
    const { container } = render(<CircuitBuilderPage />);
    const workspaceControls = within(
      container.querySelector("[data-circuit-workspace-controls]") as HTMLElement,
    );
    const viewStatus = within(
      container.querySelector("[data-circuit-workspace-view-status]") as HTMLElement,
    );

    const fitCircuitButton = workspaceControls.getByRole("button", { name: "Fit circuit" });
    expect(fitCircuitButton).toBeDisabled();
    expect(fitCircuitButton).toHaveAccessibleDescription(/Add at least one component/i);
    expect(fitCircuitButton).toHaveAttribute("aria-keyshortcuts", "F");

    await user.click(getPaletteButton("Add Battery"));
    expect(fitCircuitButton).toHaveAccessibleDescription(/Shortcut: F/i);
    await user.click(fitCircuitButton);

    expect(screen.getByRole("status")).toHaveTextContent(/Fitted view to 1 part at 165% zoom/i);
    expect(viewStatus.getByText("165% zoom")).toBeVisible();
    expect(workspaceControls.getByRole("button", { name: "Zoom +" })).toBeEnabled();

    fireEvent.keyDown(window, { key: "+" });
    expect(screen.getByRole("status")).toHaveTextContent(/Workspace zoom 177%/i);

    fireEvent.keyDown(window, { key: "0" });
    expect(viewStatus.getByText("78% zoom")).toBeVisible();

    fireEvent.keyDown(window, { key: "f" });
    expect(screen.getByRole("status")).toHaveTextContent(/Fitted view to 1 part at 165% zoom/i);
    expect(viewStatus.getByText("165% zoom")).toBeVisible();
  });

  it("keeps canvas panning state clear while dragging and after pointer release", () => {
    const { container } = render(<CircuitBuilderPage />);
    const viewStatus = within(
      container.querySelector("[data-circuit-workspace-view-status]") as HTMLElement,
    );
    const canvas = container.querySelector("[data-circuit-workspace-canvas]") as SVGSVGElement;
    const background = container.querySelector("[data-circuit-workspace-background]") as SVGRectElement;

    fireEvent.pointerDown(background, { pointerId: 11, clientX: 160, clientY: 180 });

    expect(viewStatus.getByText("Panning canvas")).toBeVisible();
    expect(viewStatus.getByText("Dragging view")).toBeVisible();

    fireEvent.pointerMove(canvas, { pointerId: 11, clientX: 220, clientY: 230 });
    expect(viewStatus.getByText("Dragging view")).toBeVisible();

    fireEvent.pointerUp(canvas, { pointerId: 11, clientX: 220, clientY: 230 });
    expect(viewStatus.getByText("32 px snap grid")).toBeVisible();
    expect(viewStatus.queryByText("Dragging view")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Workspace panned. Drag empty canvas again to keep navigating.",
    );
  });

  it("maps empty-canvas pan distance through the rendered SVG size", () => {
    const { container } = render(<CircuitBuilderPage />);
    const canvas = container.querySelector("[data-circuit-workspace-canvas]") as SVGSVGElement;
    const background = container.querySelector("[data-circuit-workspace-background]") as SVGRectElement;
    const worldLayer = container.querySelector(
      "[data-circuit-workspace-world-layer]",
    ) as SVGGElement;
    const initialTransform = worldLayer.getAttribute("transform") ?? "";
    const initialTranslate = initialTransform.match(/translate\((-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)\)/);

    expect(initialTranslate).not.toBeNull();
    const initialX = Number(initialTranslate?.[1]);
    const initialY = Number(initialTranslate?.[2]);

    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      x: 100,
      y: 20,
      left: 100,
      top: 20,
      right: 500,
      bottom: 250,
      width: 400,
      height: 230,
      toJSON: () => ({}),
    } as DOMRect);

    fireEvent.pointerDown(background, { pointerId: 15, clientX: 140, clientY: 100 });
    fireEvent.pointerMove(canvas, { pointerId: 15, clientX: 180, clientY: 100 });

    expect(worldLayer).toHaveAttribute(
      "transform",
      `translate(${initialX + 160} ${initialY}) scale(0.78)`,
    );
  });

  it("lets Escape cancel an in-progress canvas pan and restores the starting view", () => {
    const { container } = render(<CircuitBuilderPage />);
    const viewStatus = within(
      container.querySelector("[data-circuit-workspace-view-status]") as HTMLElement,
    );
    const workspaceControls = within(
      container.querySelector("[data-circuit-workspace-controls]") as HTMLElement,
    );
    const canvas = container.querySelector("[data-circuit-workspace-canvas]") as SVGSVGElement;
    const background = container.querySelector("[data-circuit-workspace-background]") as SVGRectElement;
    const resetViewButton = workspaceControls.getByRole("button", { name: "Reset view" });

    expect(resetViewButton).toBeDisabled();

    fireEvent.pointerDown(background, { pointerId: 31, clientX: 160, clientY: 180 });
    fireEvent.pointerMove(canvas, { pointerId: 31, clientX: 240, clientY: 230 });

    expect(viewStatus.getByText("Panning canvas")).toBeVisible();
    expect(resetViewButton).toBeEnabled();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Workspace pan cancelled. View returned to where it started.",
    );
    expect(viewStatus.getByText("32 px snap grid")).toBeVisible();
    expect(viewStatus.queryByText("Dragging view")).not.toBeInTheDocument();
    expect(resetViewButton).toBeDisabled();
  });

  it("restores the starting view when an active canvas pan is interrupted", () => {
    const { container } = render(<CircuitBuilderPage />);
    const viewStatus = within(
      container.querySelector("[data-circuit-workspace-view-status]") as HTMLElement,
    );
    const workspaceControls = within(
      container.querySelector("[data-circuit-workspace-controls]") as HTMLElement,
    );
    const canvas = container.querySelector("[data-circuit-workspace-canvas]") as SVGSVGElement;
    const background = container.querySelector("[data-circuit-workspace-background]") as SVGRectElement;
    const resetViewButton = workspaceControls.getByRole("button", { name: "Reset view" });

    fireEvent.pointerDown(background, { pointerId: 32, clientX: 160, clientY: 180 });
    fireEvent.pointerMove(canvas, { pointerId: 32, clientX: 240, clientY: 230 });

    expect(viewStatus.getByText("Panning canvas")).toBeVisible();
    expect(resetViewButton).toBeEnabled();

    fireEvent.pointerCancel(canvas, { pointerId: 32 });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Workspace pan interrupted. View returned to where it started.",
    );
    expect(viewStatus.getByText("32 px snap grid")).toBeVisible();
    expect(viewStatus.queryByText("Dragging view")).not.toBeInTheDocument();
    expect(resetViewButton).toBeDisabled();
  });

  it("restores the starting view if canvas pan capture is lost", () => {
    const { container } = render(<CircuitBuilderPage />);
    const viewStatus = within(
      container.querySelector("[data-circuit-workspace-view-status]") as HTMLElement,
    );
    const workspaceControls = within(
      container.querySelector("[data-circuit-workspace-controls]") as HTMLElement,
    );
    const canvas = container.querySelector("[data-circuit-workspace-canvas]") as SVGSVGElement;
    const background = container.querySelector("[data-circuit-workspace-background]") as SVGRectElement;
    const resetViewButton = workspaceControls.getByRole("button", { name: "Reset view" });

    fireEvent.pointerDown(background, { pointerId: 33, clientX: 160, clientY: 180 });
    fireEvent.pointerMove(canvas, { pointerId: 33, clientX: 240, clientY: 230 });

    expect(viewStatus.getByText("Panning canvas")).toBeVisible();
    expect(resetViewButton).toBeEnabled();

    fireEvent.lostPointerCapture(canvas, { pointerId: 33 });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Workspace pan interrupted. View returned to where it started.",
    );
    expect(viewStatus.getByText("32 px snap grid")).toBeVisible();
    expect(viewStatus.queryByText("Dragging view")).not.toBeInTheDocument();
    expect(resetViewButton).toBeDisabled();
  });

  it("announces when empty-canvas panning clears the current selection", async () => {
    const user = userEvent.setup();
    const { container } = render(<CircuitBuilderPage />);
    const canvas = container.querySelector("[data-circuit-workspace-canvas]") as SVGSVGElement;
    const background = container.querySelector("[data-circuit-workspace-background]") as SVGRectElement;

    await user.click(getPaletteButton("Add Battery"));
    expect(screen.getAllByRole("heading", { name: "Battery 1" }).length).toBeGreaterThan(0);

    fireEvent.pointerDown(background, { pointerId: 21, clientX: 180, clientY: 210 });

    expect(screen.getByRole("status")).toHaveTextContent("Selection cleared.");
    expect(screen.getByText("Nothing selected")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Battery 1" })).not.toBeInTheDocument();

    fireEvent.pointerUp(canvas, { pointerId: 21, clientX: 180, clientY: 210 });

    await user.click(getPaletteButton("Add Resistor"));
    await user.click(getPaletteButton("Activate wire tool"));
    fireEvent.click(screen.getByLabelText("Battery 1 positive terminal"));
    fireEvent.click(screen.getByLabelText("Resistor 1 terminal A"));
    await user.click(
      within(screen.getByRole("region", { name: "Connections" })).getByRole("button", {
        name: /Wire linking Battery 1 positive terminal to Resistor 1 terminal A/i,
      }),
    );
    expect(screen.getByText(/Delete removes the selected wire/i)).toBeVisible();

    fireEvent.pointerDown(background, { pointerId: 22, clientX: 200, clientY: 220 });

    expect(screen.getByRole("status")).toHaveTextContent("Selection cleared.");
    expect(screen.getByText("Nothing selected")).toBeVisible();
    expect(screen.queryByText(/Delete removes the selected wire/i)).not.toBeInTheDocument();
  });

  it("ignores secondary pointer presses on the canvas so context-menu attempts do not pan or clear selection", async () => {
    const user = userEvent.setup();
    const { container } = render(<CircuitBuilderPage />);
    const viewStatus = within(
      container.querySelector("[data-circuit-workspace-view-status]") as HTMLElement,
    );
    const background = container.querySelector("[data-circuit-workspace-background]") as SVGRectElement;

    await user.click(getPaletteButton("Add Battery"));
    expect(screen.getByText(/Battery 1 selected\. Drag it/i)).toBeVisible();

    fireEvent.pointerDown(background, {
      pointerId: 12,
      button: 2,
      buttons: 2,
      clientX: 180,
      clientY: 210,
    });

    expect(viewStatus.getByText("32 px snap grid")).toBeVisible();
    expect(viewStatus.queryByText("Panning canvas")).not.toBeInTheDocument();
    expect(viewStatus.queryByText("Dragging view")).not.toBeInTheDocument();
    expect(screen.getByText(/Battery 1 selected\. Drag it/i)).toBeVisible();
  });

  it("ignores secondary pointer presses on wires so context-menu attempts keep the current selection", async () => {
    const user = userEvent.setup();

    render(<CircuitBuilderPage />);

    await user.click(getPaletteButton("Add Battery"));
    await user.click(getPaletteButton("Add Resistor"));
    await user.click(getPaletteButton("Activate wire tool"));
    fireEvent.click(screen.getByLabelText("Battery 1 positive terminal"));
    fireEvent.click(screen.getByLabelText("Resistor 1 terminal A"));

    expect(screen.getByText(/Resistor 1 selected\. Drag it/i)).toBeVisible();

    fireEvent.pointerDown(
      screen.getByRole("button", {
        name: /Select Wire linking Battery 1 positive terminal to Resistor 1 terminal A/i,
      }),
      {
        pointerId: 13,
        button: 2,
        buttons: 2,
        clientX: 180,
        clientY: 210,
      },
    );

    expect(screen.getByText(/Resistor 1 selected\. Drag it/i)).toBeVisible();
    expect(screen.queryByText(/Use Delete to remove it, or pick another connection/i)).not.toBeInTheDocument();
  });

  it("ignores secondary terminal clicks so context-menu attempts do not start or complete wires", async () => {
    const user = userEvent.setup();
    const { container } = render(<CircuitBuilderPage />);
    const viewStatus = within(
      container.querySelector("[data-circuit-workspace-view-status]") as HTMLElement,
    );

    await user.click(getPaletteButton("Add Battery"));
    await user.click(getPaletteButton("Add Resistor"));

    fireEvent.click(screen.getByLabelText("Battery 1 positive terminal"), { button: 2 });
    expect(screen.queryByText(/Wiring from Battery 1 positive terminal/i)).not.toBeInTheDocument();
    expect(viewStatus.getByText("32 px snap grid")).toBeVisible();
    expect(screen.getByText(/Resistor 1 selected\. Drag it/i)).toBeVisible();

    await user.click(getPaletteButton("Activate wire tool"));
    fireEvent.click(screen.getByLabelText("Battery 1 positive terminal"));
    expect(screen.getByRole("status")).toHaveTextContent(/Battery 1 positive terminal selected/i);

    fireEvent.click(screen.getByLabelText("Resistor 1 terminal A"), { button: 2 });
    expect(screen.getByText(/Wiring from Battery 1 positive terminal/i)).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent(/Battery 1 positive terminal selected/i);
    expect(viewStatus.getByText("Choose wire end")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Wire linking Battery 1 positive terminal to Resistor 1 terminal A/i })).not.toBeInTheDocument();
  });

  it("clears a pending wire when adding a new component so loose wire state cannot attach unexpectedly", async () => {
    const user = userEvent.setup();
    const { container } = render(<CircuitBuilderPage />);
    const viewStatus = within(
      container.querySelector("[data-circuit-workspace-view-status]") as HTMLElement,
    );

    await user.click(getPaletteButton("Add Battery"));
    await user.click(getPaletteButton("Add Resistor"));
    await user.click(getPaletteButton("Activate wire tool"));
    fireEvent.click(screen.getByLabelText("Battery 1 positive terminal"));

    expect(screen.getByText("Wire: choose end")).toBeVisible();
    expect(viewStatus.getByText("Choose wire end")).toBeVisible();

    await user.click(getPaletteButton("Add Capacitor"));

    expect(screen.getByRole("status")).toHaveTextContent(
      /Capacitor added\. Wire mode cleared/i,
    );
    expect(screen.getByText("Select mode")).toBeVisible();
    expect(screen.queryByText("Wire: choose end")).not.toBeInTheDocument();
    expect(screen.queryByText(/Wiring from Battery 1 positive terminal/i)).not.toBeInTheDocument();
    expect(viewStatus.getByText("0 wires")).toBeVisible();
    expect(screen.getAllByRole("heading", { name: "Capacitor 1" }).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByLabelText("Resistor 1 terminal A"));

    expect(screen.getByRole("status")).toHaveTextContent(/Resistor 1 terminal A selected/i);
    expect(viewStatus.getByText("0 wires")).toBeVisible();
    expect(screen.queryByRole("region", { name: "Connections" })).not.toBeInTheDocument();
  });

  it("keeps component body activation from changing selection while the wire tool is active", async () => {
    const user = userEvent.setup();

    render(<CircuitBuilderPage />);

    await user.click(getPaletteButton("Add Battery"));
    await user.click(getPaletteButton("Add Resistor"));
    expect(screen.getAllByRole("heading", { name: "Resistor 1" }).length).toBeGreaterThan(0);

    await user.click(getPaletteButton("Activate wire tool"));
    fireEvent.click(screen.getAllByRole("button", { name: "Battery 1" })[0]!);

    expect(screen.getAllByRole("heading", { name: "Resistor 1" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: "Battery 1" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/Wire tool active/i);
  });

  it("starts terminal wiring with keyboard activation without bubbling to component selection", async () => {
    const user = userEvent.setup();

    render(<CircuitBuilderPage />);

    await user.click(getPaletteButton("Add Battery"));
    await user.click(getPaletteButton("Add Resistor"));
    expect(screen.getAllByRole("heading", { name: "Resistor 1" }).length).toBeGreaterThan(0);

    fireEvent.focus(screen.getByLabelText("Battery 1 positive terminal"));
    fireEvent.keyDown(screen.getByLabelText("Battery 1 positive terminal"), { key: "Enter" });

    expect(screen.getByRole("status")).toHaveTextContent(/Battery 1 positive terminal selected/i);
    expect(screen.getAllByRole("heading", { name: "Resistor 1" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: "Battery 1" })).not.toBeInTheDocument();
    expect(screen.getByText("Wire: choose end")).toBeVisible();

    await user.keyboard("{Escape}");
    fireEvent.focus(screen.getByLabelText("Resistor 1 terminal A"));
    fireEvent.keyDown(screen.getByLabelText("Resistor 1 terminal A"), { key: " " });

    expect(screen.getByRole("status")).toHaveTextContent(/Resistor 1 terminal A selected/i);
    expect(screen.getAllByRole("heading", { name: "Resistor 1" }).length).toBeGreaterThan(0);
    expect(screen.getByText("Wire: choose end")).toBeVisible();
  });

  it("cancels a pending wire and leaves wire mode when the W shortcut is pressed", async () => {
    const user = userEvent.setup();

    render(<CircuitBuilderPage />);

    await user.click(getPaletteButton("Add Battery"));
    await user.click(getPaletteButton("Activate wire tool"));
    fireEvent.click(screen.getByLabelText("Battery 1 positive terminal"));

    expect(screen.getByText("Wire: choose end")).toBeVisible();
    expect(screen.getByText(/One terminal is selected/i)).toBeVisible();

    await user.keyboard("w");

    expect(screen.getByRole("status")).toHaveTextContent(
      "Wire cancelled and wire tool turned off.",
    );
    expect(screen.getByText("Select mode")).toBeVisible();
    expect(screen.queryByText("Wire: choose end")).not.toBeInTheDocument();
    expect(screen.getByText(/Battery 1 selected\. Drag it/i)).toBeVisible();
  });

  it("announces wire terminal progress and duplicate connection attempts", async () => {
    const user = userEvent.setup();

    const { container } = render(<CircuitBuilderPage />);

    await user.click(getPaletteButton("Add Battery"));
    await user.click(getPaletteButton("Add Resistor"));

    const batteryPositiveTerminal = screen.getByLabelText("Battery 1 positive terminal");
    fireEvent.focus(batteryPositiveTerminal);
    expect(batteryPositiveTerminal).toHaveAccessibleDescription(
      "Press Enter or Space to start a wire from Battery 1 positive terminal.",
    );
    expect(batteryPositiveTerminal).toHaveAttribute("aria-keyshortcuts", "Enter Space");
    expect(
      screen.getByText(
        "Battery 1 positive terminal. Click or press Enter/Space to start a wire from this terminal.",
      ),
    ).toBeVisible();
    expect(screen.getByText("Enter/Space to wire")).toBeVisible();

    await user.click(getPaletteButton("Activate wire tool"));
    expect(screen.getByLabelText("Battery 1 positive terminal")).toHaveAccessibleDescription(
      "Start a wire from Battery 1 positive terminal.",
    );
    expect(screen.getByText("Start wire from Battery 1 positive terminal.")).toBeVisible();
    expect(screen.getByText("Start here")).toBeVisible();

    fireEvent.click(screen.getByLabelText("Battery 1 positive terminal"));
    expect(screen.getByLabelText("Battery 1 positive terminal")).toHaveAccessibleDescription(
      /This terminal is already selected/i,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      /Battery 1 positive terminal selected/i,
    );

    const resistorTerminalA = screen.getByLabelText("Resistor 1 terminal A");
    fireEvent.focus(resistorTerminalA);
    expect(resistorTerminalA).toHaveAccessibleDescription(
      "Connect the pending wire to Resistor 1 terminal A.",
    );
    expect(screen.getByText("Connect to Resistor 1 terminal A to finish the wire.")).toBeVisible();
    expect(screen.getByText("Connect here")).toBeVisible();
    expect(container.querySelector("[data-circuit-pending-wire-preview]")).not.toBeNull();

    fireEvent.click(screen.getByLabelText("Resistor 1 terminal A"));
    expect(screen.getByRole("status")).toHaveTextContent(
      /Connected Battery 1 positive terminal to Resistor 1 terminal A/i,
    );
    expect(
      within(screen.getByRole("region", { name: "Connections" })).getAllByRole(
        "button",
        { name: /Wire linking/i },
      ),
    ).toHaveLength(1);

    await user.click(getPaletteButton("Activate wire tool"));
    fireEvent.click(screen.getByLabelText("Battery 1 positive terminal"));
    fireEvent.click(screen.getByLabelText("Resistor 1 terminal A"));

    expect(screen.getByRole("status")).toHaveTextContent(/already connects/i);
    expect(screen.getByRole("status")).toHaveTextContent(/existing wire is selected instead/i);
    expect(screen.getByText("Select mode")).toBeVisible();
    expect(screen.queryByText("Wire: choose end")).not.toBeInTheDocument();
    expect(screen.getByText(/Delete removes the selected wire/i)).toBeVisible();
    expect(screen.getByRole("button", { name: "Rotate selected" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete selected" })).toBeEnabled();
    expect(
      within(screen.getByRole("region", { name: "Connections" })).getAllByRole(
        "button",
        { name: /Wire linking/i },
      ),
    ).toHaveLength(1);

    await user.click(getPaletteButton("Activate wire tool"));
    fireEvent.click(screen.getByLabelText("Battery 1 positive terminal"));
    fireEvent.click(screen.getByLabelText("Battery 1 positive terminal"));

    expect(screen.getByRole("status")).toHaveTextContent(/Starting terminal cleared/i);
  });

  it("uses wire-specific selection summaries, shortcuts, and delete behavior", async () => {
    const user = userEvent.setup();

    render(<CircuitBuilderPage />);

    await user.click(getPaletteButton("Add Battery"));
    await user.click(getPaletteButton("Add Resistor"));
    await user.click(getPaletteButton("Activate wire tool"));
    fireEvent.click(screen.getByLabelText("Battery 1 positive terminal"));
    fireEvent.click(screen.getByLabelText("Resistor 1 terminal A"));

    const connections = within(screen.getByRole("region", { name: "Connections" }));
    await user.click(getPaletteButton("Activate wire tool"));
    fireEvent.click(screen.getByLabelText("Battery 1 negative terminal"));
    expect(screen.getByText("Wire: choose end")).toBeVisible();

    await user.click(
      connections.getByRole("button", {
        name: /Wire linking Battery 1 positive terminal to Resistor 1 terminal A/i,
      }),
    );

    expect(screen.getByText("Select mode")).toBeVisible();
    expect(screen.queryByText("Wire: choose end")).not.toBeInTheDocument();
    expect(screen.queryByText(/Battery 1 negative terminal selected/i)).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      /Loose wire cancelled\. Wire linking Battery 1 positive terminal to Resistor 1 terminal A selected/i,
    );
    expect(
      screen.getAllByText(/Wire linking Battery 1 positive terminal to Resistor 1 terminal A/).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/Delete removes the selected wire/i)).toBeVisible();
    expect(screen.getByRole("button", { name: "Rotate selected" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete selected" })).toBeEnabled();

    fireEvent.keyDown(window, { key: "Delete" });

    expect(screen.getByRole("status")).toHaveTextContent("Selected wire deleted.");
    expect(screen.queryByRole("region", { name: "Connections" })).not.toBeInTheDocument();
  });

  it("explains locked wire inspector actions while a selected connection is in wiring mode", async () => {
    const user = userEvent.setup();

    render(<CircuitBuilderPage />);

    await user.click(getPaletteButton("Add Battery"));
    await user.click(getPaletteButton("Add Resistor"));
    await user.click(getPaletteButton("Activate wire tool"));
    fireEvent.click(screen.getByLabelText("Battery 1 positive terminal"));
    fireEvent.click(screen.getByLabelText("Resistor 1 terminal A"));

    const connections = within(screen.getByRole("region", { name: "Connections" }));
    await user.click(
      connections.getByRole("button", {
        name: /Wire linking Battery 1 positive terminal to Resistor 1 terminal A/i,
      }),
    );
    await user.click(getPaletteButton("Activate wire tool"));
    fireEvent.click(screen.getByLabelText("Battery 1 negative terminal"));

    expect(screen.getByText("Wire: choose end")).toBeVisible();
    expect(
      screen.getAllByText("Connection edits are locked while wiring").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Finish this loose wire or cancel it before deleting the selected connection/i)
        .length,
    ).toBeGreaterThan(0);
    for (const button of screen.getAllByRole("button", { name: "Delete selected wire" })) {
      expect(button).toBeDisabled();
    }

    await user.click(screen.getAllByRole("button", { name: "Cancel wire" })[0]!);

    expect(screen.getByRole("status")).toHaveTextContent(/Wire cancelled/i);
    expect(screen.queryByText("Wire: choose end")).not.toBeInTheDocument();
    expect(screen.getAllByText(/Leave the wire tool before deleting the selected connection/i).length)
      .toBeGreaterThan(0);
  });

  it("lets users cancel a pending wire by clicking empty canvas", async () => {
    const user = userEvent.setup();
    const { container } = render(<CircuitBuilderPage />);

    await user.click(getPaletteButton("Add Battery"));
    await user.click(getPaletteButton("Add Resistor"));
    await user.click(getPaletteButton("Activate wire tool"));

    expect(
      screen.getByText(/click empty canvas \/ press W\/Esc to leave/i),
    ).toBeVisible();

    fireEvent.pointerDown(
      container.querySelector("[data-circuit-workspace-background]") as SVGRectElement,
      { pointerId: 6, clientX: 120, clientY: 120 },
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Wire tool turned off. Empty canvas returned to select mode.",
    );
    expect(screen.getByText("Select mode")).toBeVisible();
    expect(screen.getByText(/Drag parts, rotate them in the inspector/i)).toBeVisible();

    await user.click(getPaletteButton("Activate wire tool"));
    fireEvent.click(screen.getByLabelText("Battery 1 positive terminal"));

    expect(
      screen.getByText(/click empty canvas, or press Esc to cancel/i),
    ).toBeVisible();

    fireEvent.pointerDown(
      container.querySelector("[data-circuit-workspace-background]") as SVGRectElement,
      { pointerId: 7, clientX: 120, clientY: 120 },
    );

    expect(screen.getByRole("status")).toHaveTextContent(/Wire cancelled/i);
    expect(screen.getByText(/Wire tool active\. Click a terminal to begin/i)).toBeVisible();
  });

  it("clears loose wire state before arming workspace clear", async () => {
    const user = userEvent.setup();
    const { container } = render(<CircuitBuilderPage />);
    const workspaceControls = within(
      container.querySelector("[data-circuit-workspace-controls]") as HTMLElement,
    );

    await user.click(getPaletteButton("Add Battery"));
    await user.click(getPaletteButton("Add Resistor"));
    await user.click(getPaletteButton("Activate wire tool"));
    fireEvent.click(screen.getByLabelText("Battery 1 positive terminal"));

    expect(screen.getByText("Wire: choose end")).toBeVisible();

    await user.click(workspaceControls.getByRole("button", { name: "Clear workspace" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      /Loose wire cancelled\. Clear workspace ready: 2 parts and 0 wires will be removed/i,
    );
    expect(screen.getByText("Select mode")).toBeVisible();
    expect(screen.queryByText("Wire: choose end")).not.toBeInTheDocument();
    expect(workspaceControls.getByRole("button", { name: "Confirm clear" })).toHaveAccessibleDescription(
      /Clear workspace is ready/i,
    );

    await user.click(workspaceControls.getByRole("button", { name: "Confirm clear" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Workspace cleared. Press Undo to restore the cleared circuit.",
    );
    expect(screen.getByText("0 parts")).toBeVisible();
    expect(screen.getByText("0 wires")).toBeVisible();
  });

  it("announces cancelled wiring when a preset replaces the current workspace", async () => {
    const user = userEvent.setup();

    render(<CircuitBuilderPage />);

    await user.click(getPaletteButton("Add Battery"));
    await user.click(getPaletteButton("Add Resistor"));
    await user.click(getPaletteButton("Activate wire tool"));
    fireEvent.click(screen.getByLabelText("Battery 1 positive terminal"));

    expect(screen.getByText("Wire: choose end")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "LDR light explorer" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loose wire cancelled. LDR light explorer loaded with 4 parts. Press Undo to restore the previous workspace.",
    );
    expect(screen.getByText("Select mode")).toBeVisible();
    expect(screen.queryByText("Wire: choose end")).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Light-dependent resistor 1" }).length,
    ).toBeGreaterThan(0);
  });

  it("shows editable properties, computed values, explanation, and a relevant graph for a selected capacitor", async () => {
    const user = userEvent.setup();

    render(<CircuitBuilderPage />);

    await user.click(getPaletteButton("Add Battery"));
    await user.click(getPaletteButton("Add Resistor"));
    await user.click(getPaletteButton("Add Capacitor"));
    await user.click(getPaletteButton("Activate wire tool"));
    fireEvent.click(screen.getByLabelText("Battery 1 positive terminal"));
    fireEvent.click(screen.getByLabelText("Resistor 1 terminal A"));
    fireEvent.click(screen.getByLabelText("Resistor 1 terminal B"));
    fireEvent.click(screen.getByLabelText("Capacitor 1 plate A"));
    fireEvent.click(screen.getByLabelText("Capacitor 1 plate B"));
    fireEvent.click(screen.getByLabelText("Battery 1 negative terminal"));

    expect(screen.getAllByRole("spinbutton", { name: /^Capacitance$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Steady-state voltage/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/open circuit/i).length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("img", { name: /Simple RC charging estimate/i }).length,
    ).toBeGreaterThan(0);
  });

  it("lets thermistors switch between ambient-linked and manual behavior with matching readouts and explanation", async () => {
    const user = userEvent.setup();

    render(<CircuitBuilderPage />);

    await user.click(getPaletteButton("Add Battery"));
    await user.click(getPaletteButton("Add Thermistor"));
    await user.click(getPaletteButton("Activate wire tool"));
    fireEvent.click(screen.getByLabelText("Battery 1 positive terminal"));
    fireEvent.click(screen.getByLabelText("Thermistor 1 terminal A"));
    fireEvent.click(screen.getByLabelText("Thermistor 1 terminal B"));
    fireEvent.click(screen.getByLabelText("Battery 1 negative terminal"));
    fireEvent.click(screen.getAllByRole("button", { name: "Thermistor 1" })[0]!);

    fireEvent.change(screen.getAllByLabelText("Ambient temperature")[0]!, {
      target: { value: "60" },
    });

    expect(screen.getAllByText("Ambient-linked").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Ambient temperature/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/60 C/i).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/current ambient temperature of 60 C/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("img", { name: /Thermistor response/i }).length,
    ).toBeGreaterThan(0);

    await user.click(screen.getAllByRole("checkbox", { name: "Ambient-linked" })[0]!);
    fireEvent.change(screen.getAllByRole("spinbutton", { name: "Manual resistance" })[0], {
      target: { value: "330" },
    });
    fireEvent.change(screen.getAllByLabelText("Ambient temperature")[0]!, {
      target: { value: "90" },
    });

    expect(screen.getAllByText("Manual").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/330 ohm/i).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/page temperature control is not changing this branch right now/i).length,
    ).toBeGreaterThan(0);
  });

  it("gives LDRs the same ambient-linked and manual inspector experience, including the onboarding preset", async () => {
    const user = userEvent.setup();

    render(<CircuitBuilderPage />);

    await user.click(screen.getByRole("button", { name: "LDR light explorer" }));
    fireEvent.click(
      screen.getAllByRole("button", { name: "Light-dependent resistor 1" })[0]!,
    );

    const effectiveResistanceLabel = screen.getAllByText("Effective resistance")[0]!;
    const beforeLightChange = effectiveResistanceLabel.parentElement?.textContent ?? "";

    expect(screen.getAllByText("Ambient-linked").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Ambient light intensity/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/20%/i).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/current light intensity of 20%/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("img", { name: /LDR response/i }).length,
    ).toBeGreaterThan(0);

    fireEvent.change(screen.getAllByLabelText("Light intensity")[0]!, {
      target: { value: "80" },
    });

    const afterLightChange = effectiveResistanceLabel.parentElement?.textContent ?? "";
    expect(afterLightChange).not.toBe(beforeLightChange);
    expect(
      screen.getAllByText(/current light intensity of 80%/i).length,
    ).toBeGreaterThan(0);

    await user.click(screen.getAllByRole("checkbox", { name: "Ambient-linked" })[0]!);
    fireEvent.change(screen.getAllByRole("spinbutton", { name: "Manual resistance" })[0], {
      target: { value: "480" },
    });

    const beforeManualLightChange = effectiveResistanceLabel.parentElement?.textContent ?? "";
    fireEvent.change(screen.getAllByLabelText("Light intensity")[0]!, {
      target: { value: "100" },
    });
    const afterManualLightChange = effectiveResistanceLabel.parentElement?.textContent ?? "";

    expect(screen.getAllByText("Manual").length).toBeGreaterThan(0);
    expect(afterManualLightChange).toBe(beforeManualLightChange);
    expect(
      screen.getAllByText(/page light control is not changing this branch right now/i).length,
    ).toBeGreaterThan(0);
  });

  it("shows a warning instead of silently failing for an incomplete circuit", async () => {
    const user = userEvent.setup();

    render(<CircuitBuilderPage />);

    await user.click(getPaletteButton("Add Battery"));

    expect(screen.getAllByText(/unconnected terminal/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/not wired into the circuit/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/2 circuit issues/i)).toBeVisible();

    await user.keyboard("{Escape}");
    expect(screen.getByText("Nothing selected")).toBeInTheDocument();

    await user.click(getPaletteButton("Activate wire tool"));
    fireEvent.click(screen.getByLabelText("Battery 1 positive terminal"));
    expect(screen.getByText("Wire: choose end")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Inspect Battery 1" }));
    expect(screen.getByText("Select mode")).toBeVisible();
    expect(screen.queryByText("Wire: choose end")).not.toBeInTheDocument();
    expect(screen.getByText(/Battery 1 selected\. Drag it/i)).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent(/Wire tool turned off/i);
  });

  it("disables export and delete actions when nothing relevant is available", async () => {
    const user = userEvent.setup();
    const { container } = render(<CircuitBuilderPage />);

    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Redo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Download SVG" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Rotate selected" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete selected" })).toBeDisabled();
    const workspaceControls = within(
      container.querySelector("[data-circuit-workspace-controls]") as HTMLElement,
    );
    const fitCircuitButton = workspaceControls.getByRole("button", { name: "Fit circuit" });
    const resetViewButton = workspaceControls.getByRole("button", { name: "Reset view" });
    const clearWorkspaceButton = workspaceControls.getByRole("button", { name: "Clear workspace" });
    expect(fitCircuitButton).toBeDisabled();
    expect(fitCircuitButton).toHaveAccessibleDescription(/Add at least one component before fitting/i);
    expect(resetViewButton).toBeDisabled();
    expect(resetViewButton).toHaveAccessibleDescription(/already at the default zoom and pan/i);
    expect(clearWorkspaceButton).toBeDisabled();
    expect(clearWorkspaceButton).toHaveAccessibleDescription(/Add at least one component before clearing/i);
    await openToolbarMenu(user, "Saves");
    expect(screen.getByRole("button", { name: "Save locally" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Update saved" })).toBeDisabled();
    expect(screen.getByText("Nothing selected")).toBeInTheDocument();
    expect(screen.getByText("Solver ready")).toBeInTheDocument();
    expect(
      screen.getByText(/diagram export stays disabled until the workspace contains at least one component/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/^Component library$/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^Inspector$/).length).toBeGreaterThan(0);
    expect(screen.getByRole("region", { name: "Circuit workspace" })).toBeInTheDocument();
  });

  it("downloads the current circuit as json with ambient state and mode flags intact", async () => {
    const user = userEvent.setup();
    let exportedBlob: Blob | null = null;

    vi.spyOn(URL, "createObjectURL").mockImplementation((blob: Blob | MediaSource) => {
      exportedBlob = blob as Blob;
      return "blob:json";
    });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const { container } = render(<CircuitBuilderPage />);
    const desktopPalette = within(
      container.querySelector('[data-circuit-palette-panel="desktop"]') as HTMLElement,
    );

    await user.click(screen.getByRole("button", { name: "LDR light explorer" }));
    await user.type(desktopPalette.getByLabelText("Search components"), "bulb");
    fireEvent.change(screen.getAllByLabelText("Light intensity")[0]!, {
      target: { value: "80" },
    });

    await openToolbarMenu(user, "File");
    await user.click(screen.getByRole("button", { name: "Download JSON" }));

    const payload = JSON.parse(await exportedBlob!.text()) as Record<string, unknown> & {
      environment: { lightLevelPercent: number };
      components: Array<{ type: string; properties: Record<string, unknown> }>;
    };

    expect(payload.environment.lightLevelPercent).toBe(80);
    expect(payload.components.some((component) => component.type === "ldr")).toBe(true);
    expect(
      payload.components.find((component) => component.type === "ldr")?.properties.useAmbientLight,
    ).toBe(true);
    expect("query" in payload).toBe(false);
    expect("search" in payload).toBe(false);
    expect("past" in payload).toBe(false);
    expect("future" in payload).toBe(false);
    expect("historySession" in payload).toBe(false);
    expect(screen.getByRole("status")).toHaveTextContent(/json downloaded/i);
  });

  it("shows a clear status message for invalid json imports", async () => {
    const user = userEvent.setup();

    render(<CircuitBuilderPage />);

    const fileInput = screen.getByLabelText("Load circuit JSON file");
    await user.upload(
      fileInput,
      new File(["{not valid json"], "broken-circuit.json", { type: "application/json" }),
    );

    expect(screen.getByRole("status")).toHaveTextContent(/not valid JSON/i);
  });

  it("loads a saved circuit json, replaces the current build, and clears transient selection", async () => {
    const user = userEvent.setup();

    render(<CircuitBuilderPage />);

    await user.click(getPaletteButton("Add Battery"));
    expect(screen.getByRole("button", { name: "Rotate selected" })).toBeEnabled();

    const fileInput = screen.getByLabelText("Load circuit JSON file");
    await user.upload(
      fileInput,
      new File(
        [
          JSON.stringify(
            {
              components: [
                {
                  id: "battery-1",
                  label: "Battery 1",
                  type: "battery",
                  x: 240,
                  y: 320,
                  rotation: 90,
                  properties: { voltage: 9 },
                },
                {
                  id: "ldr-1",
                  label: "Light-dependent resistor 1",
                  type: "ldr",
                  x: 620,
                  y: 224,
                  rotation: 90,
                  properties: {
                    baseResistance: 900,
                    manualResistance: 420,
                    useAmbientLight: false,
                  },
                },
              ],
              wires: [
                {
                  id: "w1",
                  from: { componentId: "battery-1", terminal: "a" },
                  to: { componentId: "ldr-1", terminal: "a" },
                },
                {
                  id: "w2",
                  from: { componentId: "ldr-1", terminal: "b" },
                  to: { componentId: "battery-1", terminal: "b" },
                },
              ],
              environment: {
                temperatureC: 40,
                lightLevelPercent: 90,
              },
            },
            null,
            2,
          ),
        ],
        "saved-circuit.json",
        { type: "application/json" },
      ),
    );

    expect(screen.getByRole("status")).toHaveTextContent(/loaded saved-circuit\.json/i);
    expect(screen.getByText("Nothing selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rotate selected" })).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Light-dependent resistor 1" }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/90%/i).length).toBeGreaterThan(0);
  });

  it("autosaves the meaningful circuit document to local storage without UI-only history state", async () => {
    vi.useFakeTimers();

    render(<CircuitBuilderPage />);

    fireEvent.click(screen.getByRole("button", { name: "LDR light explorer" }));
    fireEvent.change(screen.getAllByLabelText("Light intensity")[0]!, {
      target: { value: "80" },
    });
    vi.advanceTimersByTime(600);

    const raw = JSON.parse(
      window.localStorage.getItem(CIRCUIT_DRAFT_STORAGE_KEY) ?? "{}",
    ) as Record<string, unknown>;
    const document = raw.document as Record<string, unknown>;

    expect(raw.version).toBe(1);
    expect(typeof raw.savedAt).toBe("string");
    expect((document.environment as { lightLevelPercent: number }).lightLevelPercent).toBe(80);
    expect("selection" in document).toBe(false);
    expect("past" in document).toBe(false);
    expect("future" in document).toBe(false);
    expect("historySession" in document).toBe(false);
  });

  it("supports intentional local save, update, reopen, rename, delete, and keeps named saves separate from autosave", { timeout: 20_000 }, async () => {
    const user = userEvent.setup();

    render(<CircuitBuilderPage />);

    await user.click(screen.getByRole("button", { name: "LDR light explorer" }));
    await openToolbarMenu(user, "Saves");
    await user.click(screen.getByRole("button", { name: "Save locally" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Saved circuit name" }), {
      target: { value: "Lab save" },
    });
    await user.click(screen.getByRole("button", { name: "Save circuit" }));

    expect(screen.getByText("Lab save")).toBeInTheDocument();
    expect(screen.getByText("Lab save is up to date")).toBeInTheDocument();
    await openToolbarMenu(user, "Saves");
    expect(screen.getByRole("button", { name: "Update saved" })).toBeEnabled();
    expect(screen.getByText("Current local save is up to date.")).toBeInTheDocument();

    fireEvent.change(screen.getAllByLabelText("Light intensity")[0]!, {
      target: { value: "100" },
    });
    expect(screen.getByText("Unsaved changes to Lab save")).toBeInTheDocument();
    await openToolbarMenu(user, "Saves");
    expect(screen.getByRole("button", { name: "Update saved" })).toBeEnabled();
    expect(screen.getByText(/Use Update saved when you are ready/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Update saved" }));
    expect(screen.getByText("Lab save is up to date")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Thermistor temperature explorer" }));
    expect(screen.queryByRole("button", { name: "Light-dependent resistor 1" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open saved circuit Lab save" }));
    expect(screen.getAllByRole("button", { name: "Light-dependent resistor 1" }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/100%/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Rename saved circuit Lab save" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Rename saved circuit" }), {
      target: { value: "Renamed save" },
    });
    await user.click(screen.getByRole("button", { name: "Save name" }));
    expect(screen.getByText("Renamed save")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete saved circuit Renamed save" }));
    expect(screen.queryByText("Renamed save")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(window.localStorage.getItem(CIRCUIT_DRAFT_STORAGE_KEY)).not.toBeNull();
    });
    expect(window.localStorage.getItem("open-model-lab.circuit-builder.saved-circuits.v1")).not.toBeNull();
  });

  it("adds a filtered component and clears the bench from the workspace controls with undo recovery", { timeout: 20_000 }, async () => {
    const user = userEvent.setup();
    const { container } = render(<CircuitBuilderPage />);
    const desktopPalette = within(
      container.querySelector('[data-circuit-palette-panel="desktop"]') as HTMLElement,
    );
    const workspaceControls = within(
      container.querySelector("[data-circuit-workspace-controls]") as HTMLElement,
    );

    await user.type(desktopPalette.getByLabelText("Search components"), "fuse");
    await user.click(desktopPalette.getByRole("button", { name: "Add Fuse" }));
    expect(screen.getAllByRole("button", { name: "Fuse 1" }).length).toBeGreaterThan(0);
    const clearWorkspaceButton = workspaceControls.getByRole("button", { name: "Clear workspace" });
    expect(clearWorkspaceButton).toHaveAccessibleDescription(/second click confirms/i);
    expect(clearWorkspaceButton).toHaveAccessibleDescription(/Undo can restore/i);

    await user.click(clearWorkspaceButton);
    expect(screen.getAllByRole("button", { name: "Fuse 1" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("status")).toHaveTextContent(
      /Clear workspace ready: 1 part and 0 wires will be removed/i,
    );
    expect(workspaceControls.getByRole("button", { name: "Confirm clear" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(workspaceControls.getByRole("button", { name: "Confirm clear" })).toHaveAccessibleDescription(
      /press Escape to cancel/i,
    );
    expect(screen.getByText(/Esc cancels the clear confirmation/i)).toBeVisible();

    await user.keyboard("{Escape}");
    expect(screen.getByRole("status")).toHaveTextContent(
      /Clear workspace cancelled\. Nothing was removed\./i,
    );
    expect(screen.getAllByRole("button", { name: "Fuse 1" }).length).toBeGreaterThan(0);
    expect(workspaceControls.getByRole("button", { name: "Clear workspace" })).not.toHaveAttribute(
      "aria-pressed",
    );

    await user.click(workspaceControls.getByRole("button", { name: "Clear workspace" }));
    await user.click(workspaceControls.getByRole("button", { name: "Confirm clear" }));
    expect(screen.queryByRole("button", { name: "Fuse 1" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download SVG" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      /Workspace cleared\. Press Undo to restore the cleared circuit\./,
    );

    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getAllByRole("button", { name: "Fuse 1" }).length).toBeGreaterThan(0);
  });

  it("drops an armed clear confirmation when the workspace changes", async () => {
    const user = userEvent.setup();
    const { container } = render(<CircuitBuilderPage />);
    const desktopPalette = within(
      container.querySelector('[data-circuit-palette-panel="desktop"]') as HTMLElement,
    );
    const workspaceControls = within(
      container.querySelector("[data-circuit-workspace-controls]") as HTMLElement,
    );

    await user.click(desktopPalette.getByRole("button", { name: "Add Fuse" }));
    await user.click(workspaceControls.getByRole("button", { name: "Clear workspace" }));
    expect(workspaceControls.getByRole("button", { name: "Confirm clear" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(desktopPalette.getByRole("button", { name: "Add Battery" }));

    await waitFor(() => {
      expect(workspaceControls.getByRole("button", { name: "Clear workspace" })).not.toHaveAttribute(
        "aria-pressed",
      );
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      /Clear workspace confirmation reset because the workspace changed\./i,
    );
    expect(screen.getAllByRole("button", { name: "Fuse 1" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Battery 1" }).length).toBeGreaterThan(0);

    await user.click(workspaceControls.getByRole("button", { name: "Clear workspace" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      /Clear workspace ready: 2 parts and 0 wires will be removed/i,
    );
  });

  it("cancels an armed clear confirmation when users resume editing instead of confirming", async () => {
    const user = userEvent.setup();
    const { container } = render(<CircuitBuilderPage />);
    const workspaceControls = within(
      container.querySelector("[data-circuit-workspace-controls]") as HTMLElement,
    );

    await user.click(getPaletteButton("Add Fuse"));
    await user.click(workspaceControls.getByRole("button", { name: "Clear workspace" }));
    expect(workspaceControls.getByRole("button", { name: "Confirm clear" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Fuse 1" })[0]!);

    expect(screen.getByRole("status")).toHaveTextContent(
      /Clear workspace confirmation cancelled because a component was selected/i,
    );
    expect(screen.getAllByRole("button", { name: "Fuse 1" }).length).toBeGreaterThan(0);
    expect(workspaceControls.getByRole("button", { name: "Clear workspace" })).not.toHaveAttribute(
      "aria-pressed",
    );

    await user.click(workspaceControls.getByRole("button", { name: "Clear workspace" }));
    await user.keyboard("r");

    expect(screen.getByRole("status")).toHaveTextContent(/Fuse 1 rotated/i);
    expect(screen.getByRole("status")).toHaveTextContent(
      /confirmation was cancelled before this edit/i,
    );
    expect(workspaceControls.getByRole("button", { name: "Clear workspace" })).not.toHaveAttribute(
      "aria-pressed",
    );

    await user.click(workspaceControls.getByRole("button", { name: "Clear workspace" }));
    await user.keyboard("w");

    expect(screen.getByRole("status")).toHaveTextContent(/Wire tool active/i);
    expect(screen.getByRole("status")).toHaveTextContent(/confirmation was cancelled/i);
    expect(screen.getByText("Wire mode")).toBeVisible();
    expect(workspaceControls.getByRole("button", { name: "Clear workspace" })).not.toHaveAttribute(
      "aria-pressed",
    );
    expect(screen.getAllByRole("button", { name: "Fuse 1" }).length).toBeGreaterThan(0);
  });

  it("cancels an armed clear confirmation when users navigate the workspace view", async () => {
    const user = userEvent.setup();
    const { container } = render(<CircuitBuilderPage />);
    const workspaceControls = within(
      container.querySelector("[data-circuit-workspace-controls]") as HTMLElement,
    );

    await user.click(getPaletteButton("Add Fuse"));
    await user.click(workspaceControls.getByRole("button", { name: "Clear workspace" }));
    expect(workspaceControls.getByRole("button", { name: "Confirm clear" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(workspaceControls.getByRole("button", { name: "Zoom +" }));

    expect(screen.getByRole("status")).toHaveTextContent(/Workspace zoom 90%/i);
    expect(screen.getByRole("status")).toHaveTextContent(
      /confirmation was cancelled before changing the view/i,
    );
    expect(workspaceControls.getByRole("button", { name: "Clear workspace" })).not.toHaveAttribute(
      "aria-pressed",
    );
    expect(screen.getAllByRole("button", { name: "Fuse 1" }).length).toBeGreaterThan(0);

    await user.click(workspaceControls.getByRole("button", { name: "Clear workspace" }));
    await user.click(workspaceControls.getByRole("button", { name: "Fit circuit" }));

    expect(screen.getByRole("status")).toHaveTextContent(/Fitted view to 1 part/i);
    expect(screen.getByRole("status")).toHaveTextContent(
      /confirmation was cancelled before changing the view/i,
    );
    expect(workspaceControls.getByRole("button", { name: "Clear workspace" })).not.toHaveAttribute(
      "aria-pressed",
    );
    expect(screen.getAllByRole("button", { name: "Fuse 1" }).length).toBeGreaterThan(0);
  });

  it("shows a restore prompt for a saved local draft and makes restore undoable", async () => {
    const user = userEvent.setup();

    window.localStorage.setItem(
      CIRCUIT_DRAFT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        savedAt: "2026-04-15T10:00:00.000Z",
        document: {
          version: 1,
          view: { zoom: 0.78, offsetX: 120, offsetY: 82 },
          environment: { temperatureC: 40, lightLevelPercent: 90 },
          components: [
            {
              id: "battery-1",
              label: "Battery 1",
              type: "battery",
              x: 240,
              y: 320,
              rotation: 90,
              properties: { voltage: 9 },
            },
            {
              id: "ldr-1",
              label: "Light-dependent resistor 1",
              type: "ldr",
              x: 620,
              y: 224,
              rotation: 0,
              properties: {
                baseResistance: 900,
                manualResistance: 420,
                useAmbientLight: true,
              },
            },
          ],
          wires: [],
        },
      }),
    );

    render(<CircuitBuilderPage />);

    expect(screen.getByRole("region", { name: "Local draft recovery" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Restore draft" }));

    expect(screen.getByRole("status")).toHaveTextContent(/Restored local draft/i);
    expect(screen.getAllByRole("button", { name: "Light-dependent resistor 1" }).length).toBeGreaterThan(0);
    expect(screen.getByText("Nothing selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undo" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.queryByRole("button", { name: "Light-dependent resistor 1" })).not.toBeInTheDocument();
  });

  it("supports dismissing or discarding a saved draft without silently restoring it", async () => {
    const user = userEvent.setup();

    window.localStorage.setItem(
      CIRCUIT_DRAFT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        savedAt: "2026-04-15T10:00:00.000Z",
        document: {
          version: 1,
          view: { zoom: 0.78, offsetX: 120, offsetY: 82 },
          environment: { temperatureC: 25, lightLevelPercent: 35 },
          components: [
            {
              id: "battery-1",
              label: "Battery 1",
              type: "battery",
              x: 240,
              y: 320,
              rotation: 90,
              properties: { voltage: 9 },
            },
          ],
          wires: [],
        },
      }),
    );

    const { unmount } = render(<CircuitBuilderPage />);

    await user.click(screen.getByRole("button", { name: "Dismiss for now" }));
    expect(screen.queryByRole("region", { name: "Local draft recovery" })).not.toBeInTheDocument();
    expect(window.localStorage.getItem(CIRCUIT_DRAFT_STORAGE_KEY)).not.toBeNull();
    unmount();

    render(<CircuitBuilderPage />);
    await user.click(screen.getByRole("button", { name: "Discard saved draft" }));
    expect(screen.queryByRole("region", { name: "Local draft recovery" })).not.toBeInTheDocument();
    expect(window.localStorage.getItem(CIRCUIT_DRAFT_STORAGE_KEY)).toBeNull();
  });

  it("cleans up corrupt local drafts safely", async () => {
    window.localStorage.setItem(CIRCUIT_DRAFT_STORAGE_KEY, "{not valid json");

    render(<CircuitBuilderPage />);

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/discarded/i);
    });
    expect(screen.queryByRole("region", { name: "Local draft recovery" })).not.toBeInTheDocument();
    expect(window.localStorage.getItem(CIRCUIT_DRAFT_STORAGE_KEY)).toBeNull();
  });

  it("tracks add, connect, delete, undo, and redo without treating no-op ambient gestures as history", { timeout: 20_000 }, async () => {
    const user = userEvent.setup();

    render(<CircuitBuilderPage />);

    fireEvent.pointerDown(screen.getAllByLabelText("Ambient temperature")[0]!);
    fireEvent.pointerUp(screen.getAllByLabelText("Ambient temperature")[0]!);
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(screen.getByRole("status")).toHaveTextContent("Nothing to undo yet. Make a circuit change first.");
    fireEvent.keyDown(window, { key: "y", ctrlKey: true });
    expect(screen.getByRole("status")).toHaveTextContent("Nothing to redo yet. Undo a change before using redo.");

    await user.click(getPaletteButton("Add Battery"));
    await user.click(getPaletteButton("Add Resistor"));
    await user.click(getPaletteButton("Activate wire tool"));
    fireEvent.click(screen.getByLabelText("Battery 1 positive terminal"));
    fireEvent.click(screen.getByLabelText("Resistor 1 terminal A"));

    expect(screen.getByRole("button", { name: "Undo" })).toBeEnabled();
    expect(screen.getByRole("region", { name: "Connections" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.queryByRole("region", { name: "Connections" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Redo" })).toBeEnabled();
    expect(screen.getByText("Undo add Resistor 1 · Redo connect wire")).toBeVisible();
    expect(screen.getByRole("button", { name: "Redo" })).toHaveAccessibleDescription(/Redo connect wire/i);

    await user.click(screen.getByRole("button", { name: "Redo" }));
    expect(screen.getByRole("region", { name: "Connections" })).toBeInTheDocument();
    expect(screen.getByText("Undo connect wire")).toBeVisible();

    fireEvent.click(screen.getAllByRole("button", { name: "Battery 1" })[0]!);
    await user.click(screen.getByRole("button", { name: "Delete selected" }));
    expect(screen.queryByRole("button", { name: "Battery 1" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getAllByRole("button", { name: "Battery 1" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("region", { name: "Connections" })).toBeInTheDocument();
  });

  it("tracks move, rotate, component property edits, and ambient control edits through undo and redo", async () => {
    const user = userEvent.setup();
    let exportedBlob: Blob | null = null;

    vi.spyOn(URL, "createObjectURL").mockImplementation((blob: Blob | MediaSource) => {
      exportedBlob = blob as Blob;
      return "blob:diagram";
    });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<CircuitBuilderPage />);

    await user.click(getPaletteButton("Add Battery"));
    await user.click(getPaletteButton("Add Resistor"));

    fireEvent.change(screen.getAllByRole("spinbutton", { name: /^Resistance/i })[0], {
      target: { value: "18" },
    });
    expect(screen.getAllByRole("spinbutton", { name: /^Resistance/i })[0]).toHaveValue(18);
    await user.click(screen.getByRole("button", { name: "Undo" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Resistor 1" })[0]!);
    expect(screen.getAllByRole("spinbutton", { name: /^Resistance/i })[0]).toHaveValue(12);
    await user.click(screen.getByRole("button", { name: "Redo" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Resistor 1" })[0]!);
    expect(screen.getAllByRole("spinbutton", { name: /^Resistance/i })[0]).toHaveValue(18);

    fireEvent.change(screen.getAllByRole("spinbutton", { name: "Position X" })[0], {
      target: { value: "1056" },
    });
    expect(screen.getAllByRole("spinbutton", { name: "Position X" })[0]).toHaveValue(1056);
    await user.click(screen.getByRole("button", { name: "Undo" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Resistor 1" })[0]!);
    expect(screen.getAllByRole("spinbutton", { name: "Position X" })[0]).not.toHaveValue(1056);
    await user.click(screen.getByRole("button", { name: "Redo" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Resistor 1" })[0]!);
    expect(screen.getAllByRole("spinbutton", { name: "Position X" })[0]).toHaveValue(1056);

    await user.click(screen.getByRole("button", { name: "Rotate selected" }));
    await user.click(screen.getByRole("button", { name: "Undo" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Resistor 1" })[0]!);
    await user.click(screen.getByRole("button", { name: "Download SVG" }));
    expect(await exportedBlob!.text()).toContain("translate(1056");

    fireEvent.change(screen.getAllByLabelText("Ambient temperature")[0]!, {
      target: { value: "60" },
    });
    expect(screen.getAllByText(/60 C/i).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Undo" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Resistor 1" })[0]!);
    expect(screen.getAllByText(/25 C/i).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Redo" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Resistor 1" })[0]!);
    expect(screen.getAllByText(/60 C/i).length).toBeGreaterThan(0);
  }, 15_000);

  it("undoes and redoes preset loads and json imports as recoverable replacements", async () => {
    const user = userEvent.setup();

    render(<CircuitBuilderPage />);

    await user.click(getPaletteButton("Add Battery"));
    expect(screen.getAllByRole("button", { name: "Battery 1" }).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "LDR light explorer" }));
    expect(
      screen.getAllByRole("button", { name: "Light-dependent resistor 1" }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole("status")).toHaveTextContent(
      "LDR light explorer loaded with 4 parts. Press Undo to restore the previous workspace.",
    );
    await waitFor(() => {
      expect(screen.getByLabelText("Circuit workspace")).toHaveFocus();
    });

    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.queryByRole("button", { name: "Light-dependent resistor 1" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Battery 1" }).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Redo" }));
    expect(
      screen.getAllByRole("button", { name: "Light-dependent resistor 1" }).length,
    ).toBeGreaterThan(0);

    const fileInput = screen.getByLabelText("Load circuit JSON file");
    await user.upload(
      fileInput,
      new File(
        [
          JSON.stringify(
            {
              components: [
                {
                  id: "battery-1",
                  label: "Battery 1",
                  type: "battery",
                  x: 240,
                  y: 320,
                  rotation: 90,
                  properties: { voltage: 9 },
                },
                {
                  id: "thermistor-1",
                  label: "Thermistor 1",
                  type: "thermistor",
                  x: 620,
                  y: 224,
                  rotation: 0,
                  properties: {
                    baseResistance: 220,
                    manualResistance: 220,
                    useAmbientTemperature: true,
                  },
                },
              ],
              wires: [],
              environment: {
                temperatureC: 75,
                lightLevelPercent: 35,
              },
            },
            null,
            2,
          ),
        ],
        "round-trip.json",
        { type: "application/json" },
      ),
    );

    expect(screen.getAllByRole("button", { name: "Thermistor 1" }).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.queryByRole("button", { name: "Thermistor 1" })).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Light-dependent resistor 1" }).length,
    ).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Redo" }));
    expect(screen.getAllByRole("button", { name: "Thermistor 1" }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/75 C/i).length).toBeGreaterThan(0);
  }, 15_000);

  it("exports a rotated schematic after rotating the selected component through the toolbar", async () => {
    const user = userEvent.setup();
    let exportedBlob: Blob | null = null;

    vi.spyOn(URL, "createObjectURL").mockImplementation((blob: Blob | MediaSource) => {
      exportedBlob = blob as Blob;
      return "blob:diagram";
    });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<CircuitBuilderPage />);

    await user.click(getPaletteButton("Add Battery"));
    await user.click(getPaletteButton("Add Resistor"));
    await user.click(screen.getByRole("button", { name: "Rotate selected" }));
    await user.click(screen.getByRole("button", { name: "Download SVG" }));

    const svg = await exportedBlob!.text();
    expect(svg).toContain("rotate(90)");
    expect(svg).toContain("Resistor 1");
    expect(screen.getByRole("status")).toHaveTextContent(/rotated|downloaded/i);
  });

  it("moves the selected component through inspector position controls and export reflects the updated position", async () => {
    const user = userEvent.setup();
    let exportedBlob: Blob | null = null;

    vi.spyOn(URL, "createObjectURL").mockImplementation((blob: Blob | MediaSource) => {
      exportedBlob = blob as Blob;
      return "blob:diagram";
    });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<CircuitBuilderPage />);

    await user.click(getPaletteButton("Add Battery"));
    await user.click(getPaletteButton("Add Resistor"));

    fireEvent.change(screen.getAllByRole("spinbutton", { name: "Position X" })[0], {
      target: { value: "1056" },
    });
    fireEvent.change(screen.getAllByRole("spinbutton", { name: "Position Y" })[0], {
      target: { value: "544" },
    });
    await user.click(screen.getByRole("button", { name: "Download SVG" }));

    const svg = await exportedBlob!.text();
    expect(svg).toContain("translate(1056 544) rotate(0)");
  });

  it("ignores incomplete inspector number edits instead of corrupting component state", async () => {
    const user = userEvent.setup();
    let exportedBlob: Blob | null = null;

    vi.spyOn(URL, "createObjectURL").mockImplementation((blob: Blob | MediaSource) => {
      exportedBlob = blob as Blob;
      return "blob:diagram";
    });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<CircuitBuilderPage />);

    await user.click(getPaletteButton("Add Battery"));
    await user.click(getPaletteButton("Add Resistor"));

    const resistanceInput = screen.getAllByRole("spinbutton", { name: /^Resistance/i })[0]!;
    const positionXInput = screen.getAllByRole("spinbutton", { name: "Position X" })[0]!;
    const positionYInput = screen.getAllByRole("spinbutton", { name: "Position Y" })[0]!;

    expect(resistanceInput).toHaveValue(12);
    fireEvent.change(resistanceInput, { target: { value: "" } });
    expect(screen.getAllByRole("spinbutton", { name: /^Resistance/i })[0]).toHaveValue(12);

    fireEvent.change(positionXInput, { target: { value: "1056" } });
    fireEvent.change(positionYInput, { target: { value: "544" } });
    expect(screen.getAllByRole("spinbutton", { name: "Position X" })[0]).toHaveValue(1056);
    expect(screen.getAllByRole("spinbutton", { name: "Position Y" })[0]).toHaveValue(544);

    fireEvent.change(screen.getAllByRole("spinbutton", { name: "Position X" })[0], {
      target: { value: "" },
    });
    fireEvent.change(screen.getAllByRole("spinbutton", { name: "Position Y" })[0], {
      target: { value: "not-a-number" },
    });

    expect(screen.getAllByRole("spinbutton", { name: "Position X" })[0]).toHaveValue(1056);
    expect(screen.getAllByRole("spinbutton", { name: "Position Y" })[0]).toHaveValue(544);

    await user.click(screen.getByRole("button", { name: "Download SVG" }));

    const svg = await exportedBlob!.text();
    expect(svg).toContain("translate(1056 544) rotate(0)");
    expect(svg).not.toContain("NaN");
  });

  it("deletes a selected component, clears inspector state, and returns focus to the workspace region", async () => {
    const user = userEvent.setup();

    render(<CircuitBuilderPage />);

    await user.click(getPaletteButton("Add Battery"));
    await user.click(getPaletteButton("Add Resistor"));
    await user.click(getPaletteButton("Activate wire tool"));
    fireEvent.click(screen.getByLabelText("Battery 1 positive terminal"));
    fireEvent.click(screen.getByLabelText("Resistor 1 terminal A"));
    fireEvent.click(screen.getByLabelText("Resistor 1 terminal B"));
    fireEvent.click(screen.getByLabelText("Battery 1 negative terminal"));

    await user.click(screen.getByRole("button", { name: "Delete selected" }));

    expect(screen.queryByRole("button", { name: "Resistor 1" })).not.toBeInTheDocument();
    expect(screen.getByText("Nothing selected")).toBeInTheDocument();
    expect(screen.getAllByText("Select a part to inspect it").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Delete selected" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Rotate selected" })).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByRole("region", { name: "Circuit workspace" })).toHaveFocus();
    });
  });

  it("lets users select a wire, inspect it, and delete it with coherent toolbar state", async () => {
    const user = userEvent.setup();

    render(<CircuitBuilderPage />);

    await user.click(getPaletteButton("Add Battery"));
    await user.click(getPaletteButton("Add Resistor"));
    await user.click(getPaletteButton("Activate wire tool"));
    fireEvent.click(screen.getByLabelText("Battery 1 positive terminal"));
    fireEvent.click(screen.getByLabelText("Resistor 1 terminal A"));
    fireEvent.click(screen.getByLabelText("Resistor 1 terminal B"));
    fireEvent.click(screen.getByLabelText("Battery 1 negative terminal"));

    const connectionsRegion = screen.getByRole("region", { name: "Connections" });
    fireEvent.click(
      within(connectionsRegion).getAllByRole("button", { name: /Wire linking/i })[0]!,
    );

    expect(screen.getAllByText(/Wire linking/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Rotate selected" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete selected" })).toBeEnabled();
    expect(screen.getAllByText(/Selected connection/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ideal conductor/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/shared node voltage/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Delete selected" }));

    expect(
      within(connectionsRegion).queryAllByRole("button", { name: /Wire linking/i }),
    ).toHaveLength(1);
    expect(screen.getByText("Nothing selected")).toBeInTheDocument();
    expect(
      screen.queryAllByText(/open circuits or change branch currents immediately/i),
    ).toHaveLength(0);
    expect(screen.getAllByText(/unconnected terminal/i).length).toBeGreaterThan(0);
  });

  it("removes attached wires when deleting a component and export reflects the reduced circuit", async () => {
    const user = userEvent.setup();
    let exportedBlob: Blob | null = null;

    vi.spyOn(URL, "createObjectURL").mockImplementation((blob: Blob | MediaSource) => {
      exportedBlob = blob as Blob;
      return "blob:diagram";
    });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<CircuitBuilderPage />);

    await user.click(getPaletteButton("Add Battery"));
    await user.click(getPaletteButton("Add Resistor"));
    await user.click(getPaletteButton("Activate wire tool"));
    fireEvent.click(screen.getByLabelText("Battery 1 positive terminal"));
    fireEvent.click(screen.getByLabelText("Resistor 1 terminal A"));
    fireEvent.click(screen.getByLabelText("Resistor 1 terminal B"));
    fireEvent.click(screen.getByLabelText("Battery 1 negative terminal"));

    const connectionsRegion = screen.getByRole("region", { name: "Connections" });
    expect(
      within(connectionsRegion).getAllByRole("button", { name: /Wire linking/i }),
    ).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Delete selected" }));

    expect(screen.queryByRole("button", { name: "Resistor 1" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Connections" })).not.toBeInTheDocument();
    expect(screen.getAllByText(/unconnected terminal/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Download SVG" }));
    const svg = await exportedBlob!.text();
    expect((svg.match(/class="circuit-wire"/g) ?? []).length).toBe(0);
  });
});
