import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { PredictionModePanel } from "@/components/concepts/PredictionModePanel";
import type { PredictionModeApi, PredictionModeItem } from "@/lib/physics";

describe("PredictionModePanel", () => {
  const items: PredictionModeItem[] = [
    {
      id: "shm-1",
      prompt: "If angular frequency increases while amplitude stays fixed, what happens?",
      changeLabel: "Increase angular frequency",
      observationHint: "Watch the cycles tighten while the turning points stay put.",
      explanation:
        "A higher angular frequency makes the motion repeat faster, but it does not change amplitude.",
      choices: [
        { id: "a", label: "It cycles faster without changing amplitude." },
        { id: "b", label: "The amplitude becomes larger." },
        { id: "c", label: "The equilibrium point moves." },
      ],
      correctChoiceId: "a",
      scenario: {
        id: "shm-1",
        label: "Simple Harmonic Motion",
        patch: { omega: 2.8 },
        highlightedControlIds: ["omega"],
        highlightedGraphIds: ["displacement", "velocity"],
      },
    },
    {
      id: "shm-2",
      prompt: "If phase changes, what is the most direct effect?",
      changeLabel: "Shift phase",
      observationHint: "The cycle starts from a different point, but the shape is unchanged.",
      explanation:
        "Phase shifts the starting position in the cycle rather than changing the size of the motion.",
      choices: [
        { id: "a", label: "It shifts the starting point in the cycle." },
        { id: "b", label: "It doubles the amplitude." },
        { id: "c", label: "It removes the oscillation." },
      ],
      correctChoiceId: "a",
      scenario: {
        id: "shm-2",
        label: "Simple Harmonic Motion",
        patch: { phase: 1.2 },
        highlightedControlIds: ["phase"],
        highlightedGraphIds: ["displacement"],
      },
    },
  ];

  function PredictionHarness({
    onTestIt = () => {},
  }: {
    onTestIt?: (item: PredictionModeItem) => void;
  }) {
    const [mode, setMode] = useState<"explore" | "predict">("explore");
    const [activeItemId, setActiveItemId] = useState<string | null>(
      items[0]?.id ?? null,
    );
    const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
    const [answered, setAnswered] = useState(false);
    const [tested, setTested] = useState(false);
    const [completed, setCompleted] = useState(false);
    const activeItem = items.find((item) => item.id === activeItemId) ?? null;
    const isCorrect =
      selectedChoiceId && activeItem
        ? selectedChoiceId === activeItem.correctChoiceId
        : null;

    const api: PredictionModeApi = {
      mode,
      activeItemId,
      activeItem,
      selectedChoiceId,
      answered,
      tested,
      completed,
      isCorrect,
      highlightedControlIds: activeItem?.scenario.highlightedControlIds ?? [],
      highlightedGraphIds: activeItem?.scenario.highlightedGraphIds ?? [],
      highlightedOverlayIds: activeItem?.scenario.highlightedOverlayIds ?? [],
      setMode: (nextMode) => {
        setMode(nextMode);
        if (nextMode === "explore") {
          setActiveItemId(items[0]?.id ?? null);
          setSelectedChoiceId(null);
          setAnswered(false);
          setTested(false);
          setCompleted(false);
        }
      },
      setActiveItemId: (itemId) => {
        setMode("predict");
        setActiveItemId(itemId);
        setSelectedChoiceId(null);
        setAnswered(false);
        setTested(false);
        setCompleted(false);
      },
      selectChoice: (choiceId) => {
        if (answered) {
          return;
        }

        setSelectedChoiceId(choiceId);
        setAnswered(true);
        setTested(false);
      },
      testScenario: () => {
        if (!activeItem || !answered) {
          return;
        }

        onTestIt(activeItem);
        setTested(true);
      },
      nextItem: () => {
        const currentIndex = items.findIndex((item) => item.id === activeItemId);
        if (currentIndex >= items.length - 1) {
          setCompleted(true);
          return;
        }

        const nextItem = items[currentIndex + 1];
        setActiveItemId(nextItem.id);
        setSelectedChoiceId(null);
        setAnswered(false);
        setTested(false);
        setCompleted(false);
      },
      restart: () => {
        setMode("predict");
        setActiveItemId(items[0]?.id ?? null);
        setSelectedChoiceId(null);
        setAnswered(false);
        setTested(false);
        setCompleted(false);
      },
      exit: () => {
        setMode("explore");
        setActiveItemId(items[0]?.id ?? null);
        setSelectedChoiceId(null);
        setAnswered(false);
        setTested(false);
        setCompleted(false);
      },
    };

    return (
      <PredictionModePanel
        title="Predict"
        intro="Start here"
        items={items}
        api={api}
      />
    );
  }

  it("shows explore mode first and opens a single prediction prompt", async () => {
    const user = userEvent.setup();
    const onTestIt = vi.fn();

    render(<PredictionHarness onTestIt={onTestIt} />);

    expect(screen.getByText("Start here")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /Predict/i }));

    expect(screen.getByText("Prompt 1 of 2")).toBeInTheDocument();
    expect(screen.getByText(/angular frequency increases/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/a higher angular frequency makes the motion repeat faster/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("prediction-answer-status")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Test prediction" })).toBeDisabled();
  });

  it("reveals feedback only after a choice and can test and advance", async () => {
    const user = userEvent.setup();
    const onTestIt = vi.fn();

    render(<PredictionHarness onTestIt={onTestIt} />);
    await user.click(screen.getByRole("tab", { name: /Predict/i }));

    const correctChoice = screen.getByRole("button", {
      name: /it cycles faster without changing amplitude/i,
    });
    const incorrectChoice = screen.getByRole("button", {
      name: /the amplitude becomes larger/i,
    });

    expect(correctChoice).toHaveAttribute("aria-pressed", "false");
    expect(incorrectChoice).toHaveAttribute("aria-pressed", "false");

    await user.click(correctChoice);
    expect(correctChoice).toHaveAttribute("aria-pressed", "true");
    expect(incorrectChoice).toHaveAttribute("aria-pressed", "false");
    expect(screen.getAllByText("Correct").length).toBeGreaterThan(1);
    expect(screen.getByTestId("prediction-answer-status")).toHaveTextContent("Correct");
    expect(screen.getByText(/watch the cycles tighten/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Test prediction" }));
    expect(onTestIt).toHaveBeenCalledWith(expect.objectContaining({ id: "shm-1" }));
    expect(screen.getByTestId("prediction-simulation-status")).toHaveTextContent(
      "Applied to the live simulation",
    );
    expect(screen.getAllByText("Applied to the live simulation").length).toBeGreaterThan(1);

    await user.click(screen.getByRole("button", { name: "Next prompt" }));
    expect(screen.getByText(/phase changes/i)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /it shifts the starting point/i }),
    );
    await user.click(screen.getByRole("button", { name: "Finish prediction mode" }));

    expect(screen.getByText("Prediction set complete")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Restart prediction mode" }));
    expect(screen.getByText(/angular frequency increases/i)).toBeInTheDocument();
  });

  it("exits back to explore mode", async () => {
    const user = userEvent.setup();

    render(<PredictionHarness />);
    await user.click(screen.getByRole("tab", { name: /Predict/i }));
    await user.click(screen.getByRole("tab", { name: /Explore/i }));

    expect(screen.getByText("Start here")).toBeInTheDocument();
  });
});
