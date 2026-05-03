import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  ConceptPageV2EquationSnapshotCard,
  ConceptPageV2LessonRail,
  ConceptPageV2LessonSupport,
  ConceptPageV2SecondarySection,
  ConceptPageV2StartHere,
  ConceptPageV2WrapUp,
} from "@/components/concepts/ConceptPageV2Panels";
import type {
  ConceptPageV2StepViewModel,
  ConceptPageV2WrapUpViewModel,
} from "@/components/concepts/ConceptPageV2Panels";

const copy = {
  lessonFlowLabel: "Lesson path",
  currentStepLabel: "Current step",
  upcomingStepLabel: "Up next",
  actLabel: "Do this",
  observeLabel: "What to notice",
  explainLabel: "Why it happens",
  nowAvailableLabel: "Now available",
  revealOverflowLabel: ({ count }: { count: number }) =>
    `${count} more available item${count === 1 ? "" : "s"}`,
  quickCheckLabel: "Quick check",
  previousStep: "Previous step",
  nextStep: "Next step",
  lessonCompleteLabel: "Ready to wrap up",
  lessonCompleteDescription:
    "Use the wrap-up to lock in what changed, then choose a practice path or read-next concept.",
  wrapUpLabel: "Wrap-up",
  revealKinds: {
    control: "Control",
    graph: "Graph",
    overlay: "Overlay",
    tool: "Tool",
    section: "Section",
  },
};

const steps: ConceptPageV2StepViewModel[] = [
  {
    id: "setup",
    label: "Set up the pattern",
    summary: "Make the first deliberate change.",
    goal: "Build the first picture.",
    doThis: "Move one control.",
    notice: "Watch the graph respond.",
    explain: "Connect the motion to the graph.",
    revealItems: [],
    inlineCheck: {
      eyebrow: "Self-check",
      title: "Which trace moved first?",
      prompt: "Pick the trace that changed when the control moved.",
      supportingText: "Use the first changed trace as your clue.",
      choices: ["Left trace", "Right trace"],
    },
  },
  {
    id: "compare",
    label: "Compare two outputs",
    summary: "Read the relationship.",
    goal: "Compare two traces.",
    doThis: "Change the second setup.",
    notice: "Look for the offset.",
    explain: "Say why the offset appears.",
    revealItems: [
      {
        id: "compare-graph",
        kind: "graph",
        label: "Comparison graph",
        tone: "new",
      },
      {
        id: "compare-overlay",
        kind: "overlay",
        label: "Difference overlay",
      },
      {
        id: "compare-control",
        kind: "control",
        label: "Second setup control",
      },
      {
        id: "compare-tool",
        kind: "tool",
        label: "Measurement tool",
      },
      {
        id: "compare-section",
        kind: "section",
        label: "Evidence section",
      },
    ],
  },
  {
    id: "explain",
    label: "Explain the rule",
    summary: "Turn the pattern into a rule.",
    goal: "Explain the rule.",
    doThis: "Use the evidence.",
    notice: "Check the final graph.",
    explain: "Name the relationship.",
    revealItems: [],
    inlineCheck: {
      eyebrow: "Transfer check",
      title: "Which rule predicts the next setup?",
      prompt: "Choose the rule that still matches the final graph.",
      choices: ["Same rule", "New rule"],
    },
  },
];

const wrapUpCopy = {
  wrapUpLabel: "Wrap-up",
  conceptTestLabel: "Open concept test",
  conceptTestDescription: "Check whether the idea transfers without the lab open.",
  reviewBenchLabel: "Review on the bench",
  reviewBenchDescription: "Replay the setup that made the pattern visible.",
  nextConceptsLabel: "Read next",
  nextConceptsDescription: "Keep the sequence moving with the next related concept.",
  practiceActionsLabel: "Practice path",
  practiceActionsDescription: "Choose a focused way to use the concept next.",
  practiceOptionLabel: "Practice option",
  morePracticeOptionsLabel: "More practice options",
  moreReadNextOptionsLabel: "More read-next options",
  showMoreOptionsLabel: "Show options",
  hideMoreOptionsLabel: "Hide options",
  recommendedActionLabel: "Recommended next",
  freePlayLabel: "Free play on the bench",
  freePlayDescription: "Experiment freely with the same controls.",
  challengeLabel: "Try a challenge",
  challengeDescription: "Push the pattern one step further.",
  workedExamplesLabel: "Worked examples",
  workedExamplesDescription: "Study a solved version before retrying.",
  wrapUpTitle: "Lock in the pattern",
  keyTakeawayLabel: "Key takeaway",
  commonMisconceptionLabel: "Common misconception",
};

const wrapUp: ConceptPageV2WrapUpViewModel = {
  learned: [
    "The control changes the first trace.",
    "The graph shows the size of the change.",
    "The same rule predicts the next setup.",
  ],
  misconception: {
    myth: "Only the final graph matters.",
    correction: "The control move explains why the graph changed.",
  },
  testHref: "/tests/concepts/sample",
  reviewHref: "/concepts/sample#bench",
  nextConcepts: [
    {
      slug: "next-force-concept",
      title: "Next force concept",
      reasonLabel: "Builds on this pattern",
    },
  ],
  freePlayHref: "/concepts/sample#lab",
  challengeHref: "/concepts/sample#challenge",
  workedExamplesHref: "/concepts/sample#worked-examples",
};

describe("ConceptPageV2EquationSnapshotCard", () => {
  it("shows a shared note and readable formula text when authored", () => {
    render(
      <ConceptPageV2EquationSnapshotCard
        equations={[
          {
            id: "phase",
            label: "Phase difference",
            latex: "\\Delta \\phi = 2\\pi \\Delta r / \\lambda",
            readAloud:
              "phase difference equals two pi times path difference divided by wavelength",
            meaning: "Compares extra distance against one wavelength.",
          },
        ]}
        note="Read the geometry first, then compare the phase."
        copy={{
          equationSnapshotLabel: "Equation snapshot",
          equationReadAloudLabel: "Read as",
          equationCountLabel: ({ count }: { count: number }) =>
            `${count} equation${count === 1 ? "" : "s"}`,
          equationDisclosureLabel: "Show",
        }}
      />,
    );

    const snapshot = screen.getByRole("region", { name: "Equation snapshot" });
    expect(snapshot).toHaveAttribute("data-testid", "concept-v2-equation-snapshot");
    expect(snapshot).toHaveAttribute(
      "aria-labelledby",
      within(snapshot).getByText("Equation snapshot").id,
    );
    expect(snapshot).toHaveAccessibleDescription(
      "Read the geometry first, then compare the phase.",
    );
    expect(snapshot).toHaveTextContent("Read the geometry first");
    expect(snapshot).toHaveTextContent("Read as: phase difference equals");
    expect(snapshot).toHaveTextContent("Compares extra distance");
    const equationList = within(snapshot).getByRole("list", { name: "Equation snapshot" });
    expect(equationList).toHaveClass("mt-3", "grid", "gap-3");
    expect(within(equationList).getAllByRole("listitem")).toHaveLength(1);
    expect(within(equationList).getByText("Phase difference").closest("li"))
      .toHaveClass("rounded-[18px]", "shadow-sm");
    const formula = within(snapshot).getByRole("img", {
      name: /Phase difference: phase difference equals two pi times path difference/i,
    });
    expect(formula).toBeVisible();
    expect(formula).toHaveAttribute("tabindex", "0");
    expect(formula).toHaveClass(
      "overflow-x-auto",
      "whitespace-nowrap",
      "focus-visible:ring-2",
    );
  });

  it("labels the compact disclosure with a readable formula count and state", async () => {
    const user = userEvent.setup();

    render(
      <ConceptPageV2EquationSnapshotCard
        compact
        note="Check the component formulas before using the vector."
        equations={[
          {
            id: "components-x",
            label: "Horizontal component",
            latex: "v_x = v \\cos(\\theta)",
            meaning: "Projects the vector onto the horizontal axis.",
          },
          {
            id: "components-y",
            label: "Vertical component",
            latex: "v_y = v \\sin(\\theta)",
            meaning: "Projects the vector onto the vertical axis.",
          },
        ]}
        copy={{
          equationSnapshotLabel: "Equation snapshot",
          equationReadAloudLabel: "Read as",
          equationCountLabel: ({ count }: { count: number }) =>
            `${count} equation${count === 1 ? "" : "s"}`,
          equationDisclosureLabel: "Show",
        }}
      />,
    );

    const snapshot = screen.getByRole("region", { name: "Equation snapshot" });
    expect(snapshot).toHaveAttribute("data-testid", "concept-v2-equation-snapshot");
    expect(snapshot).toHaveAttribute(
      "aria-labelledby",
      within(snapshot).getByText("Equation snapshot").id,
    );
    expect(snapshot).toHaveAccessibleDescription(
      "Check the component formulas before using the vector.",
    );
    const summary = snapshot.querySelector("summary");
    expect(summary).not.toBeNull();
    expect(summary!).toHaveTextContent("Equation snapshot");
    expect(summary!).toHaveTextContent("Horizontal component · Vertical component");
    expect(summary!).toHaveAccessibleName(
      "Show 2 equations: Equation snapshot — Horizontal component · Vertical component",
    );
    expect(summary!).toHaveAccessibleDescription(
      "Check the component formulas before using the vector.",
    );
    expect(within(summary as HTMLElement).getByText("Show 2 equations")).toBeVisible();
    expect(within(summary as HTMLElement).getByText("↓")).toHaveClass(
      "motion-reduce:transition-none",
    );
    expect(
      within(summary as HTMLElement).getByText(
        "Horizontal component · Vertical component",
      ),
    ).toHaveClass("line-clamp-2", "break-words");
    expect(summary!).toHaveAttribute("aria-expanded", "false");
    expect(summary!).toHaveAttribute("aria-controls");
    const snapshotRegion = snapshot.querySelector('[role="region"]');
    expect(snapshotRegion).not.toBeNull();
    expect(snapshotRegion!).toHaveAttribute("aria-labelledby", summary!.id);
    expect(snapshotRegion!).toHaveAccessibleDescription(
      "Check the component formulas before using the vector.",
    );

    summary!.focus();
    await user.keyboard("{Enter}");
    expect(summary!).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(summary!, { key: " " });
    expect(summary!).toHaveAttribute("aria-expanded", "false");
    fireEvent.keyDown(summary!, { key: " " });
    expect(summary!).toHaveAttribute("aria-expanded", "true");
    expect(snapshotRegion).toHaveTextContent(
      "Check the component formulas before using the vector.",
    );
    expect(snapshotRegion).toHaveTextContent("Projects the vector onto the horizontal axis.");
    const compactEquationList = within(snapshotRegion as HTMLElement).getByRole("list", {
      name: "Equation snapshot",
    });
    expect(compactEquationList).toHaveClass("mt-2", "grid", "gap-2");
    expect(within(compactEquationList).getAllByRole("listitem")).toHaveLength(2);
    expect(within(compactEquationList).getByText("Horizontal component").closest("li"))
      .toHaveClass("rounded-[14px]", "bg-paper-strong/82");
    expect(
      within(snapshot).getByRole("img", {
        name: /Horizontal component: v_x = v \\cos\(\\theta\)/,
      }),
    ).toBeVisible();
  });
});

describe("ConceptPageV2StartHere", () => {
  it("pairs the full hero Start concept CTA with the first guided step", async () => {
    const user = userEvent.setup();
    const onStartLearning = vi.fn();

    render(
      <ConceptPageV2StartHere
        title="Sample concept"
        intuition="The lab starts with a visible pattern."
        whyItMatters="It keeps the first action concrete."
        estimatedTime="8 min"
        keyTakeaway="Move one control, then explain the graph."
        equations={[]}
        lessonSteps={steps}
        copy={{
          startHereLabel: "Start here",
          whyItMattersLabel: "Why it matters",
          estimatedTimeLabel: "Estimated time",
          prerequisitesLabel: "Prerequisites",
          noPrerequisites: "No prerequisites",
          simulationPreviewLabel: "Try this first",
          lessonPreviewDisclosureLabel: "Preview the lesson path",
          lessonPreviewDisclosureDescription:
            "Open this when you want the full step map before using the bench.",
          contextDisclosureLabel: "Show why it matters",
          contextDisclosureDescription:
            "Keep the extra context available without putting it before the first interaction.",
          equationSnapshotLabel: "Equation snapshot",
          equationReadAloudLabel: "Read as",
          equationCountLabel: ({ count }: { count: number }) =>
            `${count} equation${count === 1 ? "" : "s"}`,
          equationDisclosureLabel: "Show",
          keyTakeawayLabel: "Key takeaway",
          lessonFlowLabel: "Lesson path",
          lessonStepCountLabel: ({ count }: { count: number }) =>
            `${count} step${count === 1 ? "" : "s"}`,
          quickCheckLabel: "Quick check",
          startLearning: "Start concept",
          nextStep: "Next step",
          wrapUpLabel: "Wrap-up",
          lessonCompleteLabel: "Ready to wrap up",
        }}
        onStartLearning={onStartLearning}
      />,
    );

    const handoff = screen.getByTestId("concept-v2-start-handoff");
    expect(handoff).toHaveAccessibleName("Start here: Start concept");
    const startButton = within(handoff).getByRole("button", { name: /Start concept/ });
    const firstStepTeaser = screen.getByTestId("concept-v2-start-first-step-teaser");
    const startHereRegion = screen.getByRole("region", { name: "Start here" });
    expect(startHereRegion).toHaveAccessibleDescription(
      "The lab starts with a visible pattern.",
    );
    expect(screen.getByRole("heading", { name: "Sample concept" })).toHaveClass(
      "break-words",
    );
    const intuitionCopy = within(startHereRegion).getByText(
      "The lab starts with a visible pattern.",
    );
    expect(intuitionCopy.closest(".break-words")).not.toBeNull();
    const startHereDescriptionId = startHereRegion.getAttribute("aria-describedby");
    expect(startHereDescriptionId).toBeTruthy();
    expect(document.getElementById(startHereDescriptionId ?? "")).toHaveTextContent(
      "The lab starts with a visible pattern.",
    );
    const whyItMattersCard = screen.getByRole("group", { name: "Why it matters" });
    expect(whyItMattersCard).toHaveAccessibleName("Why it matters");
    expect(whyItMattersCard).toHaveAccessibleDescription(
      "It keeps the first action concrete.",
    );
    expect(whyItMattersCard).toHaveTextContent("It keeps the first action concrete.");
    expect(within(whyItMattersCard).getByText("Why it matters")).toHaveClass(
      "min-w-0",
      "break-words",
    );
    expect(
      within(whyItMattersCard)
        .getByText("It keeps the first action concrete.")
        .closest(".break-words"),
    ).not.toBeNull();
    const keyTakeawayCard = screen.getByRole("group", { name: "Key takeaway" });
    expect(keyTakeawayCard).toHaveAccessibleName("Key takeaway");
    expect(keyTakeawayCard).toHaveAccessibleDescription(
      "Move one control, then explain the graph.",
    );
    expect(keyTakeawayCard).toHaveTextContent("Move one control, then explain the graph.");
    expect(within(keyTakeawayCard).getByText("Key takeaway")).toHaveClass(
      "min-w-0",
      "break-words",
    );
    expect(
      within(keyTakeawayCard)
        .getByText("Move one control, then explain the graph.")
        .closest(".break-words"),
    ).not.toBeNull();
    expect(startButton).toHaveAccessibleDescription(
      "Estimated time: 8 min Prerequisites No prerequisites Start here: Lesson path: Set up the pattern. Make the first deliberate change.",
    );
    expect(within(startButton).getByText("→")).toHaveClass(
      "motion-reduce:transform-none",
      "motion-reduce:transition-none",
    );
    expect(handoff).toHaveTextContent("Start concept");
    expect(handoff).toHaveTextContent("Set up the pattern");
    expect(handoff).toHaveTextContent("Make the first deliberate change.");
    expect(firstStepTeaser).toHaveClass("min-w-0");
    expect(
      within(firstStepTeaser).getByTestId("concept-v2-start-first-step-badge"),
    ).toHaveTextContent("Start here");
    expect(
      within(firstStepTeaser).getByTestId("concept-v2-start-first-step-badge"),
    ).toHaveClass("max-w-full", "min-w-0", "break-words");
    expect(
      within(firstStepTeaser).getByText("Set up the pattern").closest(".break-words"),
    ).not.toBeNull();
    expect(
      within(firstStepTeaser)
        .getByText("Make the first deliberate change.")
        .closest(".break-words"),
    ).not.toBeNull();
    expect(
      startButton.compareDocumentPosition(firstStepTeaser) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    const preview = screen.getByTestId("concept-v2-start-lesson-preview");
    const prerequisites = screen.getByTestId("concept-v2-prerequisites");
    expect(
      startButton.compareDocumentPosition(prerequisites) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(prerequisites.parentElement).toHaveClass("grid", "gap-2");
    expect(prerequisites.parentElement).not.toHaveClass("md:grid-cols-2");
    expect(
      startButton.compareDocumentPosition(preview) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(within(preview).queryByText("Start concept")).not.toBeInTheDocument();
    const previewList = screen.getByTestId("concept-v2-start-lesson-preview-list");
    const firstPreviewStep = screen.getByTestId("concept-v2-start-lesson-preview-first");
    expect(previewList).toHaveAccessibleDescription("3 steps + Wrap-up");
    expect(firstPreviewStep).toHaveAttribute("aria-posinset", "1");
    expect(firstPreviewStep).toHaveAttribute("aria-setsize", "4");
    expect(previewList).toHaveClass(
      "grid",
      "grid-cols-1",
      "sm:grid-cols-2",
      "md:grid-cols-3",
      "2xl:grid-cols-4",
    );
    expect(previewList).not.toHaveClass("xl:grid-cols-4");
    expect(
      within(previewList).getByRole("listitem", {
        name: "Start here — Set up the pattern — Make the first deliberate change. — Quick check",
      }),
    ).toBeVisible();
    expect(
      within(previewList).getByRole("listitem", {
        name: "Compare two outputs — Read the relationship.",
      }),
    ).toBeVisible();
    expect(firstPreviewStep).toHaveClass("min-h-[4.35rem]", "rounded-[12px]");
    expect(
      within(firstPreviewStep).getByTestId("concept-v2-start-lesson-preview-first-badge"),
    ).toHaveTextContent("Start here");
    expect(
      within(firstPreviewStep)
        .getByText("Set up the pattern")
        .closest(".line-clamp-2.break-words"),
    ).not.toBeNull();
    expect(
      within(firstPreviewStep)
        .getByText("Make the first deliberate change.")
        .closest(".line-clamp-1.break-words"),
    ).not.toBeNull();
    const comparePreviewStep = within(previewList).getByText("Compare two outputs").closest("li");
    expect(comparePreviewStep).not.toBeNull();
    expect(comparePreviewStep!.querySelector(".mb-1.flex.flex-wrap.gap-1")).toBeNull();
    expect(preview).toHaveTextContent("Wrap-up");
    expect(preview).toHaveTextContent("Ready to wrap up");
    expect(within(preview).getByText("Lesson path")).toHaveClass("min-w-0", "break-words");
    expect(within(preview).getByText("3 steps + Wrap-up")).toHaveClass(
      "max-w-full",
      "min-w-0",
      "break-words",
    );
    const quickCheckPreviewBadge = within(firstPreviewStep).getByText("Quick check");
    const firstStepPreviewBadge = within(firstPreviewStep).getByText("Start here");
    expect(firstStepPreviewBadge).toHaveClass("max-w-full", "min-w-0", "break-words");
    expect(quickCheckPreviewBadge.parentElement).toHaveClass("min-w-0", "flex-wrap");
    expect(quickCheckPreviewBadge).toHaveClass("max-w-full", "min-w-0", "break-words");
    const wrapUpPreviewStep = within(previewList).getByRole("listitem", {
      name: "Next step: Wrap-up — Ready to wrap up",
    });
    expect(wrapUpPreviewStep).toHaveAttribute("aria-posinset", "4");
    expect(wrapUpPreviewStep).toHaveAttribute("aria-setsize", "4");
    expect(wrapUpPreviewStep).toHaveClass(
      "sm:col-span-2",
      "md:col-span-3",
      "2xl:col-span-1",
    );
    expect(wrapUpPreviewStep).toHaveTextContent("Ready to wrap up");
    expect(
      within(wrapUpPreviewStep).getByTestId(
        "concept-v2-start-lesson-preview-wrap-up-next-step-cue",
      ),
    ).toHaveTextContent("Next step");
    expect(within(wrapUpPreviewStep).getByText("Next step")).toHaveClass(
      "max-w-full",
      "min-w-0",
      "break-words",
    );
    expect(within(wrapUpPreviewStep).getByText("Wrap-up")).toHaveClass(
      "max-w-full",
      "min-w-0",
      "break-words",
    );
    expect(within(wrapUpPreviewStep).getByText("Ready to wrap up")).toHaveClass(
      "line-clamp-2",
      "break-words",
    );

    await user.click(within(handoff).getByRole("button", { name: /Start concept/ }));
    expect(onStartLearning).toHaveBeenCalledOnce();
  });

  it("keeps the compact hero CTA single-purpose before the lesson preview", async () => {
    const user = userEvent.setup();
    const onStartLearning = vi.fn();

    render(
      <ConceptPageV2StartHere
        title="Sample concept"
        intuition="The lab starts with a visible pattern."
        whyItMatters="It keeps the first action concrete."
        estimatedTime="8 min"
        keyTakeaway="Move one control, then explain the graph."
        equations={[]}
        lessonSteps={steps}
        copy={{
          startHereLabel: "Start here",
          whyItMattersLabel: "Why it matters",
          estimatedTimeLabel: "Estimated time",
          prerequisitesLabel: "Prerequisites",
          noPrerequisites: "No prerequisites",
          simulationPreviewLabel: "Try this first",
          lessonPreviewDisclosureLabel: "Preview the lesson path",
          lessonPreviewDisclosureDescription:
            "Open this when you want the full step map before using the bench.",
          contextDisclosureLabel: "Show why it matters",
          contextDisclosureDescription:
            "Keep the extra context available without putting it before the first interaction.",
          equationSnapshotLabel: "Equation snapshot",
          equationReadAloudLabel: "Read as",
          equationCountLabel: ({ count }: { count: number }) =>
            `${count} equation${count === 1 ? "" : "s"}`,
          equationDisclosureLabel: "Show",
          keyTakeawayLabel: "Key takeaway",
          lessonFlowLabel: "Lesson path",
          quickCheckLabel: "Quick check",
          startLearning: "Start concept",
          wrapUpLabel: "Wrap-up",
          lessonCompleteLabel: "Ready to wrap up",
        }}
        showTitle={false}
        showEquationSnapshot={false}
        onStartLearning={onStartLearning}
      />,
    );

    const handoff = screen.getByTestId("concept-v2-start-handoff");
    const startButton = within(handoff).getByRole("button", { name: /Start concept/ });
    const preview = screen.getByTestId("concept-v2-start-lesson-preview");
    const prerequisites = screen.getByTestId("concept-v2-prerequisites");
    expect(startButton).toHaveAccessibleDescription(
      "Estimated time: 8 min Prerequisites No prerequisites Start here: Lesson path: Set up the pattern. Make the first deliberate change.",
    );
    expect(handoff).toHaveTextContent("Start concept");
    expect(screen.getByRole("heading", { name: "Start here" })).toHaveAttribute(
      "id",
      screen.getByTestId("concept-v2-start-here").getAttribute("aria-labelledby"),
    );
    expect(screen.getByTestId("concept-v2-start-first-step-description")).toHaveClass(
      "sr-only",
    );
    expect(prerequisites).toHaveClass("inline-flex", "rounded-full");
    expect(prerequisites).toHaveTextContent("No prerequisites");
    expect(screen.queryByTestId("concept-v2-start-first-step-teaser")).not.toBeInTheDocument();
    expect(
      startButton.compareDocumentPosition(prerequisites) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      startButton.compareDocumentPosition(preview) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    const previewList = screen.getByTestId("concept-v2-start-lesson-preview-list");
    const firstPreviewStep = screen.getByTestId("concept-v2-start-lesson-preview-first");
    const wrapUpCard = screen.getByTestId("concept-v2-start-lesson-preview-wrap-up");
    expect(previewList).toHaveAccessibleDescription("3 + Wrap-up");
    expect(previewList).toHaveClass(
      "grid-cols-1",
      "sm:grid-cols-2",
      "md:grid-cols-3",
      "2xl:grid-cols-4",
    );
    expect(previewList).not.toHaveClass("xl:grid-cols-4");
    expect(firstPreviewStep).toHaveClass("min-h-[3.85rem]", "px-2", "py-1.5");
    expect(
      within(firstPreviewStep).getByTestId("concept-v2-start-lesson-preview-first-badge"),
    ).toHaveTextContent("Start here");
    expect(
      within(firstPreviewStep)
        .getByText("Set up the pattern")
        .closest(".line-clamp-2.break-words"),
    ).not.toBeNull();
    expect(wrapUpCard).toHaveClass("min-h-[3.85rem]", "2xl:col-span-1");
    expect(wrapUpCard).not.toHaveClass("sm:col-span-2");
    expect(wrapUpCard).toHaveTextContent("Wrap-up");
    expect(within(preview).queryByText("Start concept")).not.toBeInTheDocument();

    await user.click(within(handoff).getByRole("button", { name: /Start concept/ }));
    expect(onStartLearning).toHaveBeenCalledOnce();
  });

  it("names the Start here, prerequisites, and simulation preview regions for assistive tech", () => {
    render(
      <ConceptPageV2StartHere
        title="Sample concept"
        intuition="The lab starts with a visible pattern."
        whyItMatters={null}
        estimatedTime="8 min"
        keyTakeaway={null}
        simulationPreview={{
          title: "Sample concept",
          description: "You’ll interact with controls and compare the stage with graphs.",
        }}
        equations={[]}
        lessonSteps={steps}
        copy={{
          startHereLabel: "Start here",
          whyItMattersLabel: "Why it matters",
          estimatedTimeLabel: "Estimated time",
          prerequisitesLabel: "Prerequisites",
          noPrerequisites: "No prerequisites",
          simulationPreviewLabel: "Try this first",
          lessonPreviewDisclosureLabel: "Preview the lesson path",
          lessonPreviewDisclosureDescription:
            "Open this when you want the full step map before using the bench.",
          contextDisclosureLabel: "Show why it matters",
          contextDisclosureDescription:
            "Keep the extra context available without putting it before the first interaction.",
          equationSnapshotLabel: "Equation snapshot",
          equationReadAloudLabel: "Read as",
          equationCountLabel: ({ count }: { count: number }) =>
            `${count} equation${count === 1 ? "" : "s"}`,
          equationDisclosureLabel: "Show",
          keyTakeawayLabel: "Key takeaway",
          lessonFlowLabel: "Lesson path",
          quickCheckLabel: "Quick check",
          startLearning: "Start concept",
          wrapUpLabel: "Wrap-up",
          lessonCompleteLabel: "Ready to wrap up",
        }}
        showTitle={false}
        showEquationSnapshot={false}
        onStartLearning={vi.fn()}
      />,
    );

    const startHere = screen.getByRole("region", { name: "Start here" });
    expect(startHere).toHaveAttribute("data-testid", "concept-v2-start-here");
    expect(within(startHere).getByRole("heading", { name: "Start here" })).toHaveAttribute(
      "id",
      startHere.getAttribute("aria-labelledby"),
    );
    expect(startHere).toHaveAccessibleDescription("The lab starts with a visible pattern.");
    const startHereDescription = within(startHere).getByText(
      "The lab starts with a visible pattern.",
    );
    const startHereDescriptionId = startHere.getAttribute("aria-describedby");
    expect(startHereDescriptionId).toBeTruthy();
    expect(document.getElementById(startHereDescriptionId ?? "")).toContainElement(
      startHereDescription,
    );
    expect(startHere).toHaveTextContent("The lab starts with a visible pattern.");
    const startHandoff = within(startHere).getByRole("complementary", {
      name: "Start here: Start concept",
    });
    expect(startHandoff).toHaveAttribute("data-testid", "concept-v2-start-handoff");
    const prerequisites = screen.getByRole("region", { name: "Prerequisites" });
    expect(within(prerequisites).getByRole("heading", { name: "Prerequisites" })).toHaveAttribute(
      "id",
      prerequisites.getAttribute("aria-labelledby"),
    );
    expect(prerequisites).toHaveTextContent("No prerequisites");
    const preview = screen.getByRole("region", { name: "Try this first" });
    expect(within(preview).getByRole("heading", { name: "Try this first" })).toHaveAttribute(
      "id",
      preview.getAttribute("aria-labelledby"),
    );
    expect(preview).toHaveAccessibleDescription(
      "You’ll interact with controls and compare the stage with graphs.",
    );
    expect(preview).toHaveTextContent(
      "You’ll interact with controls and compare the stage with graphs.",
    );
    expect(within(preview).queryByText("Sample concept")).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId("concept-v2-start-handoff")).getByRole("button", {
        name: "Start concept",
      }),
    ).toHaveAccessibleDescription(
      "Estimated time: 8 min Prerequisites No prerequisites You’ll interact with controls and compare the stage with graphs. Start here: Lesson path: Set up the pattern. Make the first deliberate change.",
    );
  });

  it("keeps a distinct simulation preview title when it adds orientation", () => {
    render(
      <ConceptPageV2StartHere
        title="Sample concept"
        intuition="The lab starts with a visible pattern."
        whyItMatters={null}
        estimatedTime="8 min"
        keyTakeaway={null}
        simulationPreview={{
          title: "Live bench preview",
          description: "You’ll interact with controls and compare the stage with graphs.",
        }}
        equations={[]}
        lessonSteps={steps}
        copy={{
          startHereLabel: "Start here",
          whyItMattersLabel: "Why it matters",
          estimatedTimeLabel: "Estimated time",
          prerequisitesLabel: "Prerequisites",
          noPrerequisites: "No prerequisites",
          simulationPreviewLabel: "Try this first",
          lessonPreviewDisclosureLabel: "Preview the lesson path",
          lessonPreviewDisclosureDescription:
            "Open this when you want the full step map before using the bench.",
          contextDisclosureLabel: "Show why it matters",
          contextDisclosureDescription:
            "Keep the extra context available without putting it before the first interaction.",
          equationSnapshotLabel: "Equation snapshot",
          equationReadAloudLabel: "Read as",
          equationCountLabel: ({ count }: { count: number }) =>
            `${count} equation${count === 1 ? "" : "s"}`,
          equationDisclosureLabel: "Show",
          keyTakeawayLabel: "Key takeaway",
          lessonFlowLabel: "Lesson path",
          quickCheckLabel: "Quick check",
          startLearning: "Start concept",
          wrapUpLabel: "Wrap-up",
          lessonCompleteLabel: "Ready to wrap up",
        }}
        showEquationSnapshot={false}
        onStartLearning={vi.fn()}
      />,
    );

    const preview = screen.getByRole("region", { name: "Try this first" });
    expect(preview).toHaveAccessibleDescription(
      "You’ll interact with controls and compare the stage with graphs.",
    );
    expect(within(preview).getByText("Live bench preview")).toHaveClass("break-words");
    expect(
      within(preview)
        .getByText("You’ll interact with controls and compare the stage with graphs.")
        .closest(".break-words"),
    ).not.toBeNull();
  });

  it("keeps prerequisite links at the shared tap target floor", () => {
    render(
      <ConceptPageV2StartHere
        title="Sample concept"
        intuition="The lab starts with a visible pattern."
        whyItMatters={null}
        estimatedTime="8 min"
        keyTakeaway={null}
        prerequisites={[
          {
            slug: "starter-pattern",
            title: "Starter pattern",
          },
        ]}
        equations={[]}
        lessonSteps={steps}
        copy={{
          startHereLabel: "Start here",
          whyItMattersLabel: "Why it matters",
          estimatedTimeLabel: "Estimated time",
          prerequisitesLabel: "Prerequisites",
          noPrerequisites: "No prerequisites",
          simulationPreviewLabel: "Try this first",
          lessonPreviewDisclosureLabel: "Preview the lesson path",
          lessonPreviewDisclosureDescription:
            "Open this when you want the full step map before using the bench.",
          contextDisclosureLabel: "Show why it matters",
          contextDisclosureDescription:
            "Keep the extra context available without putting it before the first interaction.",
          equationSnapshotLabel: "Equation snapshot",
          equationReadAloudLabel: "Read as",
          equationCountLabel: ({ count }: { count: number }) =>
            `${count} equation${count === 1 ? "" : "s"}`,
          equationDisclosureLabel: "Show",
          keyTakeawayLabel: "Key takeaway",
          lessonFlowLabel: "Lesson path",
          quickCheckLabel: "Quick check",
          startLearning: "Start concept",
          wrapUpLabel: "Wrap-up",
          lessonCompleteLabel: "Ready to wrap up",
        }}
        showEquationSnapshot={false}
        onStartLearning={vi.fn()}
      />,
    );

    const prerequisites = screen.getByTestId("concept-v2-prerequisites");
    const prerequisiteList = within(prerequisites).getByRole("list", {
      name: "Prerequisites",
    });
    expect(within(prerequisiteList).getAllByRole("listitem")).toHaveLength(1);
    const prerequisiteLink = within(prerequisiteList).getByRole("link", {
      name: "Starter pattern",
    });
    expect(prerequisiteLink).toHaveClass("min-h-11", "max-w-full", "min-w-0");
    expect(prerequisiteLink).toHaveAccessibleDescription("Prerequisites");
    expect(within(prerequisiteLink).getByText("Starter pattern")).toHaveClass(
      "min-w-0",
      "break-words",
    );
    expect(
      within(screen.getByTestId("concept-v2-start-handoff")).getByRole("button", {
        name: "Start concept",
      }),
    ).toHaveAccessibleDescription(
      "Estimated time: 8 min Prerequisites Starter pattern Start here: Lesson path: Set up the pattern. Make the first deliberate change.",
    );
  });

  it("keeps the compact start handoff stable when no key takeaway exists", () => {
    render(
      <ConceptPageV2StartHere
        title="Sample concept"
        intuition="The lab starts with a visible pattern."
        whyItMatters="It keeps the first action concrete."
        estimatedTime="8 min"
        keyTakeaway={null}
        equations={[]}
        lessonSteps={steps}
        copy={{
          startHereLabel: "Start here",
          whyItMattersLabel: "Why it matters",
          estimatedTimeLabel: "Estimated time",
          prerequisitesLabel: "Prerequisites",
          noPrerequisites: "No prerequisites",
          simulationPreviewLabel: "Try this first",
          lessonPreviewDisclosureLabel: "Preview the lesson path",
          lessonPreviewDisclosureDescription:
            "Open this when you want the full step map before using the bench.",
          contextDisclosureLabel: "Show why it matters",
          contextDisclosureDescription:
            "Keep the extra context available without putting it before the first interaction.",
          equationSnapshotLabel: "Equation snapshot",
          equationReadAloudLabel: "Read as",
          equationCountLabel: ({ count }: { count: number }) =>
            `${count} equation${count === 1 ? "" : "s"}`,
          equationDisclosureLabel: "Show",
          keyTakeawayLabel: "Key takeaway",
          lessonFlowLabel: "Lesson path",
          quickCheckLabel: "Quick check",
          startLearning: "Start concept",
          wrapUpLabel: "Wrap-up",
          lessonCompleteLabel: "Ready to wrap up",
        }}
        showEquationSnapshot={false}
        onStartLearning={vi.fn()}
      />,
    );

    const handoff = screen.getByTestId("concept-v2-start-handoff");

    expect(screen.queryByText("Key takeaway")).not.toBeInTheDocument();
    const contextDisclosure = screen.getByTestId("concept-v2-start-context-disclosure");
    expect(contextDisclosure).not.toHaveAttribute("open");
    expect(within(contextDisclosure).getByText("Show why it matters")).toBeInTheDocument();
    const whyItMattersCard = within(contextDisclosure).getByRole("group", {
      hidden: true,
      name: "Why it matters",
    });
    const supportGrid = whyItMattersCard.closest("dl");
    expect(supportGrid).not.toBeNull();
    expect(supportGrid!).toHaveClass("grid", "gap-2");
    expect(supportGrid!).not.toHaveClass("md:grid-cols-2");
    expect(handoff.parentElement).toHaveClass("lg:col-start-2", "lg:row-span-2");
    expect(handoff.parentElement?.parentElement).toHaveClass("grid", "gap-4");
    expect(handoff).toHaveClass("rounded-[20px]", "border-ink-950/12");
    expect(screen.getByTestId("concept-v2-start-first-step-description")).toHaveClass(
      "sr-only",
    );
    expect(screen.getByTestId("concept-v2-start-lesson-preview-first")).toHaveTextContent(
      "Set up the pattern",
    );
  });
});

describe("ConceptPageV2LessonRail", () => {
  it("renders a status-aware guided step map with progress", async () => {
    const user = userEvent.setup();
    const onSelectStep = vi.fn();
    const onPreviousStep = vi.fn();
    const onNextStep = vi.fn();

    render(
      <ConceptPageV2LessonRail
        steps={steps}
        activeStepId="compare"
        copy={copy}
        onSelectStep={onSelectStep}
        onPreviousStep={onPreviousStep}
        onNextStep={onNextStep}
      />,
    );

    const progress = screen.getByRole("progressbar", { name: "Lesson path" });
    expect(progress.firstElementChild).toHaveClass("motion-reduce:transition-none");
    expect(progress).toHaveAttribute("aria-valuemin", "1");
    expect(progress).toHaveAttribute("aria-valuemax", "3");
    expect(progress).toHaveAttribute("aria-valuenow", "2");
    expect(progress).toHaveAttribute(
      "aria-valuetext",
      "Current step: 2 / 3 — Compare two outputs",
    );
    const stepMap = screen.getByTestId("concept-v2-step-map");
    expect(stepMap).toHaveClass(
      "overflow-x-auto",
      "scroll-px-1.5",
      "overscroll-x-contain",
      "[scrollbar-width:thin]",
    );
    expect(stepMap).not.toHaveClass(
      "[scrollbar-width:none]",
      "[&::-webkit-scrollbar]:hidden",
    );
    expect(stepMap).toHaveTextContent("✓");
    const previousStepMapButton = within(stepMap).getByRole("button", {
      name: "Set up the pattern — Previous step — Quick check",
    });
    expect(previousStepMapButton.closest("li")).toHaveAttribute("aria-posinset", "1");
    expect(previousStepMapButton.closest("li")).toHaveAttribute("aria-setsize", "4");
    expect(previousStepMapButton).toBeEnabled();
    expect(previousStepMapButton).toHaveClass("min-h-10");
    expect(previousStepMapButton).not.toHaveAccessibleDescription();
    const activeStepMapButton = within(stepMap).getByRole("button", {
      name: "Compare two outputs — Current step",
    });
    expect(activeStepMapButton).toHaveAttribute("aria-current", "step");
    expect(activeStepMapButton.closest("li")).toHaveAttribute("aria-posinset", "2");
    expect(activeStepMapButton.closest("li")).toHaveAttribute("aria-setsize", "4");
    expect(activeStepMapButton).toHaveClass("min-h-10");
    expect(activeStepMapButton).not.toHaveAccessibleDescription();
    const nextStepMapButton = within(stepMap).getByRole("button", {
      name: "Explain the rule — Up next — Quick check",
    });
    expect(nextStepMapButton).toBeEnabled();
    expect(nextStepMapButton).not.toHaveAccessibleDescription();
    const wrapUpDestination = screen.getByTestId("concept-v2-step-map-wrap-up");
    expect(wrapUpDestination.closest("li")).toHaveAttribute("aria-posinset", "4");
    expect(wrapUpDestination.closest("li")).toHaveAttribute("aria-setsize", "4");
    expect(wrapUpDestination).toHaveAccessibleName("Wrap-up — Ready to wrap up");
    expect(wrapUpDestination).toHaveClass("min-h-11");
    expect(wrapUpDestination).toHaveTextContent("Wrap-up");
    expect(wrapUpDestination).toHaveTextContent("Ready to wrap up");
    expect(within(stepMap).getByText("Compare two outputs").closest(".line-clamp-1"))
      .toHaveClass("min-w-0", "break-words");
    expect(within(stepMap).getByText("Explain the rule").closest(".line-clamp-1"))
      .toHaveClass("min-w-0", "break-words");

    const rail = screen.getByTestId("concept-v2-current-step-card");
    expect(rail).toHaveTextContent("Compare two traces.");
    const currentStepHeading = within(rail).getByRole("heading", {
      level: 2,
      name: "Compare two traces.",
    });
    expect(currentStepHeading).toHaveAttribute("id", "concept-v2-current-step-heading");
    expect(currentStepHeading).toHaveAttribute("tabindex", "-1");
    expect(currentStepHeading).toHaveClass("break-words");
    expect(rail.getAttribute("aria-labelledby")).toContain(
      "concept-v2-current-step-heading",
    );
    const railCurrentStepLabel = within(rail).getByText("Current step", {
      selector: "p",
    }).closest("p");
    expect(railCurrentStepLabel).toHaveAttribute("id");
    expect(rail.getAttribute("aria-labelledby")).toContain(
      railCurrentStepLabel?.getAttribute("id") ?? "",
    );
    expect(rail).toHaveAccessibleName("Current step: Compare two traces.");
    const railActionPath = screen.getByTestId("concept-v2-rail-action-path");
    expect(railActionPath).toHaveAccessibleName("Do this: Compare two traces.");
    expect(railActionPath).not.toHaveClass("xl:grid-cols-1", "2xl:grid-cols-3");
    expect(railActionPath).toHaveTextContent("Do this");
    expect(railActionPath).toHaveTextContent("Change the second setup.");
    expect(within(railActionPath).queryAllByRole("listitem")).toHaveLength(0);
    const secondaryGuidance = screen.getByTestId(
      "concept-v2-current-step-secondary-guidance",
    );
    expect(secondaryGuidance).not.toHaveAttribute("open");
    expect(secondaryGuidance).toHaveTextContent("What to notice / Why it happens");
    expect(within(secondaryGuidance).getByText("Look for the offset.")).not.toBeVisible();
    expect(
      within(secondaryGuidance).getByText("Say why the offset appears."),
    ).not.toBeVisible();
    fireEvent.click(within(secondaryGuidance).getByText("What to notice / Why it happens"));
    expect(within(railActionPath).getByText("Look for the offset.")).toBeVisible();
    expect(within(railActionPath).getByText("Say why the offset appears.")).toBeVisible();
    expect(
      within(railActionPath).getByText("Change the second setup.").closest("p"),
    ).toHaveClass(
      "break-words",
    );
    const railRevealStrip = screen.getByRole("region", {
      name: "Current step: Now available",
    });
    expect(railRevealStrip).toHaveAttribute("data-testid", "concept-v2-rail-reveal-strip");
    const railRevealLabel = within(railRevealStrip).getByText("Now available");
    expect(railRevealLabel).toHaveAttribute("id");
    expect(railRevealStrip.getAttribute("aria-labelledby")).toContain(
      railRevealLabel.id,
    );
    expect(railRevealStrip).toHaveTextContent("Graph: Comparison graph");
    const railRevealList = within(railRevealStrip).getByRole("list", {
      name: "Current step: Now available",
    });
    expect(railRevealList.getAttribute("aria-labelledby")).toContain(
      railRevealLabel.id,
    );
    expect(within(railRevealList).getAllByRole("listitem")).toHaveLength(5);
    const railRevealPreview = within(railRevealList).getByText("Graph: Comparison graph");
    expect(railRevealPreview.parentElement).toHaveClass("min-w-0", "line-clamp-1", "break-words");
    expect(railRevealPreview.parentElement?.parentElement).toHaveClass(
      "inline-flex",
      "max-w-full",
    );
    const revealOverflow = screen.getByTestId("concept-v2-rail-reveal-overflow");
    expect(revealOverflow).toHaveTextContent("+1");
    expect(revealOverflow).toHaveTextContent("1 more available item");
    expect(revealOverflow.querySelector(".sr-only")).toHaveTextContent(
      "1 more available item",
    );

    const previousButton = screen.getByRole("button", {
      name: /Previous step: Set up the pattern/,
    });
    const nextButton = screen.getByRole("button", {
      name: "Next step: Explain the rule",
    });
    expect(previousButton).toBeEnabled();
    expect(previousButton).toHaveClass("min-h-11");
    expect(within(previousButton).getByText("Set up the pattern").parentElement).toHaveClass(
      "min-w-0",
      "break-words",
      "line-clamp-1",
    );
    expect(nextButton).toBeEnabled();
    expect(nextButton).toHaveClass("min-h-11");
    expect(within(nextButton).getByText("Explain the rule").parentElement).toHaveClass(
      "min-w-0",
      "break-words",
      "line-clamp-1",
    );

    const nextCheckpoint = screen.getByRole("region", {
      name: "Up next: Explain the rule",
    });
    expect(nextCheckpoint).toHaveAttribute("data-testid", "concept-v2-next-checkpoint");
    expect(nextCheckpoint).toHaveClass("flex", "flex-col", "md:flex-row");
    expect(nextCheckpoint).not.toHaveClass("hidden");
    expect(nextCheckpoint).toHaveTextContent("Up next");
    const nextCheckpointDescription = within(nextCheckpoint)
      .getByText("Turn the pattern into a rule.")
      .closest("p[id]");
    expect(nextCheckpointDescription).not.toBeNull();
    expect(nextCheckpointDescription!).toHaveClass("break-words", "line-clamp-1");
    expect(nextCheckpoint).toHaveAttribute(
      "aria-describedby",
      nextCheckpointDescription!.id,
    );
    const nextCheckpointPreview = within(nextCheckpoint).getByRole("group", {
      name: "Next step: Explain the rule",
    });
    expect(nextCheckpointPreview).toHaveAttribute(
      "data-testid",
      "concept-v2-next-checkpoint-preview",
    );
    expect(nextCheckpointPreview).toHaveAccessibleDescription(
      "Turn the pattern into a rule.",
    );
    expect(nextCheckpointPreview).toContainElement(nextCheckpointDescription as HTMLElement);
    expect(within(nextCheckpointPreview).getByText("Explain the rule").parentElement).toHaveClass(
      "min-w-0",
      "line-clamp-2",
      "break-words",
    );
    expect(nextCheckpointDescription!).toHaveClass("mt-0.5");
    const nextCheckpointPreviewList = within(nextCheckpoint).getByRole("list", {
      name: "Up next: Now available",
    });
    const nextCheckpointQuickCheck = screen.getByTestId("concept-v2-next-step-quick-check");
    expect(nextCheckpointQuickCheck).toHaveTextContent("Quick check");
    expect(nextCheckpointQuickCheck).toHaveClass("border-amber-500/18", "bg-white/82");
    expect(within(nextCheckpointPreviewList).getAllByRole("listitem")).toHaveLength(1);
    expect(nextCheckpointPreviewList).toContainElement(nextCheckpointQuickCheck);
    expect(screen.queryByTestId("concept-v2-next-step-reveals")).not.toBeInTheDocument();
    expect(screen.queryByTestId("concept-v2-next-step-preview")).not.toBeInTheDocument();

    const nextCheckpointButton = within(nextCheckpoint).getByRole("button", {
      name: "Next step: Explain the rule — Up next",
    });
    expect(nextCheckpointButton).toHaveAccessibleDescription("Turn the pattern into a rule.");
    expect(nextCheckpointButton).toHaveClass("min-h-11", "min-w-0", "md:max-w-[16rem]");
    expect(within(nextCheckpointButton).getByText("Next step")).toHaveClass(
      "uppercase",
      "tracking-[0.14em]",
    );
    expect(within(nextCheckpointButton).getByText("Explain the rule").parentElement).toHaveClass(
      "min-w-0",
      "break-words",
      "line-clamp-1",
      "block",
    );
    expect(within(nextCheckpointButton).getByText("→")).toHaveClass(
      "motion-reduce:transform-none",
      "motion-reduce:transition-none",
    );
    await user.click(nextCheckpointButton);
    expect(onSelectStep).toHaveBeenCalledWith("explain");
  });

  it("keeps an actionable completion handoff visible on the final guided step", async () => {
    const user = userEvent.setup();
    const onCompleteLesson = vi.fn();

    render(
      <ConceptPageV2LessonRail
        steps={steps}
        activeStepId="explain"
        copy={copy}
        onSelectStep={vi.fn()}
        onPreviousStep={vi.fn()}
        onNextStep={vi.fn()}
        onCompleteLesson={onCompleteLesson}
      />,
    );

    expect(screen.queryByTestId("concept-v2-next-checkpoint")).not.toBeInTheDocument();
    const railNextButton = screen.getByTestId("concept-v2-rail-next-button");
    expect(railNextButton).toBeEnabled();
    expect(railNextButton).toHaveAccessibleName(
      "Next step: Wrap-up — Ready to wrap up",
    );
    expect(railNextButton).toHaveTextContent("Wrap-up");
    await user.click(railNextButton);
    expect(onCompleteLesson).toHaveBeenCalledOnce();

    expect(screen.getByTestId("concept-v2-step-map-wrap-up")).toHaveTextContent("✓");
    const stepMapWrapUpButton = within(screen.getByTestId("concept-v2-step-map")).getByRole(
      "button",
      {
        name: "Next step: Wrap-up — Ready to wrap up",
      },
    );
    expect(stepMapWrapUpButton).toHaveClass("min-h-11");
    const stepMapWrapUpCue = within(stepMapWrapUpButton).getByTestId(
      "concept-v2-step-map-wrap-up-next-step-cue",
    );
    expect(stepMapWrapUpCue).toHaveTextContent("Next step");
    expect(stepMapWrapUpCue).toHaveClass("max-w-full", "min-w-0", "break-words");
    await user.click(stepMapWrapUpButton);
    expect(onCompleteLesson).toHaveBeenCalledTimes(2);

    const completeCheckpoint = screen.getByRole("region", {
      name: "Next step: Wrap-up — Ready to wrap up",
    });
    expect(completeCheckpoint).toHaveAttribute("data-testid", "concept-v2-complete-checkpoint");
    expect(completeCheckpoint).toHaveTextContent("Ready to wrap up");
    expect(completeCheckpoint).toHaveTextContent("Wrap-up");
    const completeDescription = within(completeCheckpoint)
      .getByText(/choose a practice path/)
      .closest("p[id]");
    expect(completeDescription).not.toBeNull();
    expect(completeCheckpoint).toHaveAttribute("aria-describedby", completeDescription!.id);
    expect(completeDescription!).toHaveClass("break-words");

    const completeButton = within(completeCheckpoint).getByRole("button", {
      name: "Next step: Wrap-up — Ready to wrap up",
    });
    expect(completeButton).toHaveClass("min-h-11");
    const completeNextStepCue = within(completeButton).getByTestId(
      "concept-v2-complete-checkpoint-next-step-cue",
    );
    expect(completeNextStepCue).toHaveTextContent("Next step");
    expect(completeNextStepCue).toHaveClass("min-w-0", "break-words");
    expect(within(completeButton).getByText("Wrap-up")).toHaveClass(
      "min-w-0",
      "break-words",
    );
    expect(within(completeButton).getByText("↓")).toHaveClass(
      "motion-reduce:transform-none",
      "motion-reduce:transition-none",
    );
    expect(completeButton).toHaveAccessibleDescription(
      "Use the wrap-up to lock in what changed, then choose a practice path or read-next concept.",
    );
    await user.click(completeButton);
    expect(onCompleteLesson).toHaveBeenCalledTimes(3);
  });

  it("keeps the static final map wrap-up cue visible without a completion handler", () => {
    render(
      <ConceptPageV2LessonRail
        steps={steps}
        activeStepId="explain"
        copy={copy}
        onPreviousStep={vi.fn()}
        onNextStep={vi.fn()}
      />,
    );

    const stepMap = screen.getByTestId("concept-v2-step-map");
    const wrapUpCard = screen.getByTestId("concept-v2-step-map-wrap-up");
    expect(within(stepMap).queryByRole("button", { name: /Wrap-up/ })).not.toBeInTheDocument();
    expect(wrapUpCard).toHaveAccessibleName("Next step: Wrap-up — Ready to wrap up");
    expect(wrapUpCard).toHaveTextContent("Next step");
    expect(wrapUpCard).toHaveTextContent("Wrap-up");
    const wrapUpCue = within(wrapUpCard).getByTestId(
      "concept-v2-step-map-wrap-up-next-step-cue",
    );
    expect(wrapUpCue).toHaveTextContent("Next step");
    expect(wrapUpCue).toHaveClass("max-w-full", "min-w-0", "break-words");
  });

  it("surfaces the active inline quick check in the rail", () => {
    render(
      <ConceptPageV2LessonRail
        steps={steps}
        activeStepId="setup"
        copy={copy}
        onSelectStep={vi.fn()}
        onPreviousStep={vi.fn()}
        onNextStep={vi.fn()}
      />,
    );

    const setupStepMapButton = screen.getByRole("button", {
      name: "Set up the pattern — Current step — Quick check",
    });
    expect(setupStepMapButton).toHaveAttribute("aria-current", "step");

    const railInlineCheck = screen.getByTestId("concept-v2-rail-inline-check");
    expect(railInlineCheck).toHaveAccessibleName("Quick check: Which trace moved first?");
    expect(railInlineCheck).toHaveAccessibleDescription(
      "Pick the trace that changed when the control moved. Use the first changed trace as your clue.",
    );
    expect(railInlineCheck).toHaveTextContent("Quick check");
    expect(railInlineCheck).toHaveTextContent("Self-check");
    expect(within(railInlineCheck).getByText("Self-check").closest(".inline-flex")).toHaveClass(
      "max-w-full",
      "min-w-0",
    );
    expect(within(railInlineCheck).getByText("Self-check").parentElement).toHaveClass(
      "min-w-0",
      "break-words",
    );
    expect(railInlineCheck).toHaveTextContent("Which trace moved first?");
    expect(railInlineCheck).toHaveTextContent(
      "Pick the trace that changed when the control moved.",
    );
    expect(railInlineCheck).toHaveTextContent("Use the first changed trace as your clue.");
    expect(
      within(railInlineCheck)
        .getByText("Use the first changed trace as your clue.")
        .closest(".line-clamp-2"),
    ).toHaveClass("line-clamp-2", "text-ink-600");
    const railQuickCheckChoices = screen.getByTestId("concept-v2-rail-inline-check-choices");
    const railQuickCheckTitle = within(railInlineCheck)
      .getByText("Which trace moved first?")
      .closest("p");
    expect(railQuickCheckTitle).toHaveAttribute(
      "id",
      railQuickCheckChoices.getAttribute("aria-labelledby"),
    );
    const railQuickCheckLabel = within(railInlineCheck).getByText("Quick check").closest("p");
    expect(railQuickCheckLabel).toHaveAttribute("id");
    expect(railInlineCheck.getAttribute("aria-labelledby")).toBe(
      `${railQuickCheckLabel?.getAttribute("id")} ${railQuickCheckTitle?.getAttribute("id")}`,
    );
    expect(railQuickCheckChoices).toHaveAccessibleName("Which trace moved first?");
    expect(railQuickCheckChoices).toHaveAccessibleDescription(
      "Pick the trace that changed when the control moved. Use the first changed trace as your clue.",
    );
    expect(railQuickCheckChoices).toHaveTextContent("Left trace");
    expect(railQuickCheckChoices).toHaveTextContent("Right trace");
    expect(railQuickCheckChoices).toHaveClass(
      "sm:grid-cols-2",
      "xl:grid-cols-1",
      "2xl:grid-cols-2",
    );
    expect(within(railQuickCheckChoices).getAllByRole("listitem")).toHaveLength(2);
    expect(within(railQuickCheckChoices).getByText("Left trace").parentElement).toHaveClass(
      "min-w-0",
      "line-clamp-2",
      "break-words",
    );
    const nextCheckpoint = screen.getByTestId("concept-v2-next-checkpoint");
    expect(nextCheckpoint).toHaveClass("flex", "flex-col", "md:flex-row");
    expect(nextCheckpoint).not.toHaveClass("hidden");
    expect(nextCheckpoint).toHaveTextContent(
      "Compare two outputs",
    );
    expect(screen.queryByTestId("concept-v2-next-step-quick-check")).not.toBeInTheDocument();
    const nextRevealPreviewList = within(nextCheckpoint).getByRole("list", {
      name: "Up next: Now available",
    });
    expect(within(nextRevealPreviewList).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByTestId("concept-v2-next-step-reveals")).toHaveTextContent(
      "Now available",
    );
    expect(nextRevealPreviewList).toContainElement(screen.getByTestId("concept-v2-next-step-reveals"));
    const nextRevealPreview = screen.getByTestId("concept-v2-next-step-reveal-preview");
    expect(nextRevealPreview).toHaveTextContent(
      "Graph: Comparison graph",
    );
    expect(nextRevealPreview).toHaveClass("inline-flex", "max-w-full");
    const nextRevealPreviewText = within(nextRevealPreview).getByText(
      "Graph: Comparison graph",
    );
    expect(nextRevealPreviewText.parentElement).toHaveClass("min-w-0", "line-clamp-1", "break-words");
    const nextRevealOverflow = screen.getByTestId("concept-v2-next-step-reveal-overflow");
    expect(nextRevealOverflow).toHaveTextContent("+4");
    expect(nextRevealOverflow.querySelector(".sr-only")).toHaveTextContent(
      "4 more available items",
    );
  });

  it("falls back to the first guided step when the active step id is stale", () => {
    render(
      <ConceptPageV2LessonRail
        steps={steps}
        activeStepId="missing-step"
        copy={copy}
        onSelectStep={vi.fn()}
        onPreviousStep={vi.fn()}
        onNextStep={vi.fn()}
      />,
    );

    const progress = screen.getByRole("progressbar", { name: "Lesson path" });
    expect(progress).toHaveAttribute("aria-valuenow", "1");
    expect(progress).toHaveAttribute(
      "aria-valuetext",
      "Current step: 1 / 3 — Set up the pattern",
    );
    expect(screen.getByRole("button", { name: "Previous step" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next step: Compare two outputs" })).toBeEnabled();
    expect(screen.getByTestId("concept-v2-next-checkpoint")).toHaveTextContent(
      "Compare two outputs",
    );
    expect(screen.queryByTestId("concept-v2-complete-checkpoint")).not.toBeInTheDocument();
  });

  it("skips the guided step rail when no lesson steps are authored", () => {
    const { container } = render(
      <ConceptPageV2LessonRail
        steps={[]}
        activeStepId="missing-step"
        copy={copy}
        onSelectStep={vi.fn()}
        onPreviousStep={vi.fn()}
        onNextStep={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId("concept-v2-step-rail")).not.toBeInTheDocument();
  });

  it("does not expose no-op step selectors when guided selection is unavailable", () => {
    render(
      <ConceptPageV2LessonRail
        steps={steps}
        activeStepId="setup"
        copy={copy}
        onPreviousStep={vi.fn()}
        onNextStep={vi.fn()}
      />,
    );

    const stepMap = screen.getByTestId("concept-v2-step-map");
    const disabledActiveStep = within(stepMap).getByRole("button", {
      name: "Set up the pattern — Current step — Quick check",
    });
    expect(disabledActiveStep).toBeDisabled();
    expect(disabledActiveStep).not.toHaveAccessibleDescription();
    const disabledNextStep = within(stepMap).getByRole("button", {
      name: "Compare two outputs — Up next",
    });
    expect(disabledNextStep).toBeDisabled();
    expect(disabledNextStep).not.toHaveAccessibleDescription();

    const nextCheckpoint = screen.getByRole("region", {
      name: "Up next: Compare two outputs",
    });
    expect(nextCheckpoint).toHaveTextContent("Compare two outputs");
    const inertNextLabel = within(nextCheckpoint)
      .getAllByText("Compare two outputs")
      .map((label) => label.parentElement)
      .find((label) => label?.classList.contains("line-clamp-1"));
    expect(inertNextLabel).toHaveClass("min-w-0", "line-clamp-1", "break-words");
    expect(inertNextLabel?.parentElement).toHaveClass("max-w-full", "min-w-0");
    expect(
      within(nextCheckpoint).queryByRole("button", {
        name: "Next step: Compare two outputs — Up next",
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Next step: Compare two outputs/ })).toBeEnabled();
  });

  it("keeps the active support panel organized as act, observe, explain", async () => {
    const user = userEvent.setup();
    const onSelectStep = vi.fn();

    render(
      <ConceptPageV2LessonSupport
        steps={steps}
        activeStepId="setup"
        copy={copy}
        onSelectStep={onSelectStep}
      />,
    );

    const support = screen.getByTestId("concept-v2-step-support");
    const supportHeading = within(support).getByRole("heading", {
      level: 3,
      name: "Build the first picture.",
    });
    expect(supportHeading).toHaveClass("break-words");
    expect(support.getAttribute("aria-labelledby")).toContain(supportHeading.id);
    const supportCurrentStepLabel = within(support).getByText("Current step", {
      selector: "p",
    }).closest("p");
    expect(supportCurrentStepLabel).toHaveAttribute("id");
    expect(support.getAttribute("aria-labelledby")).toContain(
      supportCurrentStepLabel?.getAttribute("id") ?? "",
    );
    expect(support).toHaveAccessibleName("Current step: Build the first picture.");
    expect(support).toHaveAccessibleDescription("Make the first deliberate change.");
    const activeSummary = within(support).getByText("Make the first deliberate change.");
    expect(activeSummary.closest("p[id]")).toHaveAttribute(
      "id",
      support.getAttribute("aria-describedby"),
    );
    expect(activeSummary.closest("p[id]")).toHaveClass("break-words");
    expect(screen.getByTestId("concept-v2-step-support-position")).toHaveTextContent("1 / 3");
    const activeStepLabel = within(support).getByText("Set up the pattern").closest(".line-clamp-1");
    expect(activeStepLabel).not.toBeNull();
    expect(activeStepLabel!).toHaveClass("min-w-0", "line-clamp-1", "break-words");
    expect(activeStepLabel!.parentElement).toHaveClass("inline-flex", "max-w-full");
    expect(activeStepLabel!.parentElement!.parentElement).toHaveClass(
      "w-full",
      "justify-start",
      "sm:w-auto",
      "sm:justify-end",
    );
    const supportProgress = screen.getByRole("progressbar", { name: "Current step" });
    expect(supportProgress.firstElementChild).toHaveClass("motion-reduce:transition-none");
    expect(supportProgress).toHaveAttribute("aria-valuemin", "1");
    expect(supportProgress).toHaveAttribute("aria-valuemax", "3");
    expect(supportProgress).toHaveAttribute("aria-valuenow", "1");
    expect(supportProgress).toHaveAttribute(
      "aria-valuetext",
      "Current step: 1 / 3 — Set up the pattern",
    );
    const actionPath = screen.getByTestId("concept-v2-guided-action-path");
    expect(actionPath).toHaveAccessibleName("Current step: Build the first picture.");
    expect(actionPath).toHaveTextContent("Do this");
    expect(actionPath).toHaveTextContent("Move one control.");
    expect(actionPath).toHaveTextContent("What to notice");
    expect(actionPath).toHaveTextContent("Watch the graph respond.");
    expect(actionPath).toHaveTextContent("Why it happens");
    expect(actionPath).toHaveTextContent("Connect the motion to the graph.");
    const supportActionCards = within(actionPath).getAllByRole("listitem");
    expect(supportActionCards[0]).toHaveAccessibleName("Do this");
    expect(supportActionCards[0]).toHaveAccessibleDescription("Move one control.");
    expect(supportActionCards[1]).toHaveAccessibleName("What to notice");
    expect(supportActionCards[1]).toHaveAccessibleDescription("Watch the graph respond.");
    expect(supportActionCards[2]).toHaveAccessibleName("Why it happens");
    expect(supportActionCards[2]).toHaveAccessibleDescription(
      "Connect the motion to the graph.",
    );
    expect(within(actionPath).getByText("Move one control.").parentElement).toHaveClass(
      "min-w-0",
      "break-words",
    );
    expect(support).toContainElement(actionPath);

    const nextHandoff = screen.getByRole("region", {
      name: "Up next: Compare two outputs",
    });
    expect(nextHandoff).toHaveAttribute("data-testid", "concept-v2-step-support-next");
    const nextSupportDescription = within(nextHandoff)
      .getByText("Read the relationship.")
      .closest("span[id]");
    expect(nextSupportDescription).not.toBeNull();
    expect(nextSupportDescription!).toHaveClass("min-w-0", "break-words", "line-clamp-2");
    expect(nextHandoff).toHaveAttribute(
      "aria-describedby",
      nextSupportDescription!.id,
    );
    const nextSupportPreviewCard = within(nextHandoff).getByRole("group", {
      name: "Next step: Compare two outputs",
    });
    expect(nextSupportPreviewCard).toHaveAccessibleDescription("Read the relationship.");
    expect(nextSupportPreviewCard).toHaveClass("grid", "shadow-sm");
    expect(nextHandoff).toHaveTextContent("Up next");
    expect(nextHandoff).toHaveTextContent("Next step");
    expect(nextHandoff).toHaveTextContent("Compare two outputs");
    const nextSupportCue = screen.getByTestId("concept-v2-step-support-next-step-cue");
    expect(nextSupportCue).toHaveTextContent("Next step");
    expect(nextSupportCue).toHaveTextContent("→");
    expect(nextSupportCue).toHaveClass("max-w-full", "min-w-0");
    expect(within(nextSupportCue).getByText("Next step")).toHaveClass(
      "min-w-0",
      "break-words",
    );
    expect(within(nextSupportCue).getByText("→")).toHaveAttribute("aria-hidden", "true");
    expect(
      within(nextHandoff)
        .getAllByText("Compare two outputs")
        .some((node) => node.closest(".line-clamp-2")),
    ).toBe(true);
    expect(
      within(nextHandoff)
        .getAllByText("Compare two outputs")
        .some((node) => node.closest(".line-clamp-2.min-w-0.break-words")),
    ).toBe(true);
    expect(nextHandoff).toHaveTextContent("Read the relationship.");
    const nextSupportRevealList = within(nextHandoff).getByRole("list", {
      name: "Up next: Now available",
    });
    expect(within(nextSupportRevealList).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByTestId("concept-v2-step-support-next-reveals")).toHaveTextContent(
      "Now available",
    );
    expect(nextSupportRevealList).toContainElement(
      screen.getByTestId("concept-v2-step-support-next-reveals"),
    );
    expect(screen.getByTestId("concept-v2-step-support-next-reveal-preview")).toHaveTextContent(
      "Graph: Comparison graph",
    );
    expect(screen.getByTestId("concept-v2-step-support-next-reveal-preview")).toHaveClass(
      "inline-flex",
      "max-w-full",
    );
    const supportRevealPreviewText = within(
      screen.getByTestId("concept-v2-step-support-next-reveal-preview"),
    ).getByText("Graph: Comparison graph");
    expect(supportRevealPreviewText.parentElement).toHaveClass("min-w-0", "line-clamp-1", "break-words");
    const supportRevealOverflow = screen.getByTestId(
      "concept-v2-step-support-next-reveal-overflow",
    );
    expect(supportRevealOverflow).toHaveTextContent("+4");
    expect(supportRevealOverflow).toHaveTextContent("4 more available items");
    expect(supportRevealOverflow.querySelector(".sr-only")).toHaveTextContent(
      "4 more available items",
    );
    const nextStepButton = within(nextHandoff).getByRole("button", {
      name: "Next step: Compare two outputs — Up next",
    });
    expect(nextStepButton).toHaveAccessibleDescription("Read the relationship.");
    expect(nextStepButton).toHaveClass("min-h-11", "min-w-0", "sm:max-w-[20rem]");
    const nextStepButtonCue = within(nextStepButton).getByTestId(
      "concept-v2-step-support-next-button-cue",
    );
    expect(nextStepButtonCue).toHaveTextContent("Next step");
    expect(nextStepButtonCue).toHaveClass(
      "block",
      "min-w-0",
      "break-words",
      "uppercase",
      "tracking-[0.14em]",
    );
    expect(within(nextStepButton).getByText("Compare two outputs").parentElement).toHaveClass(
      "mt-0.5",
      "min-w-0",
      "break-words",
      "line-clamp-1",
      "block",
      "text-left",
    );
    await user.click(nextStepButton);
    expect(onSelectStep).toHaveBeenCalledWith("compare");

    const quickCheckChoices = screen.getByTestId("concept-v2-inline-check-choices");
    const supportInlineCheck = screen.getByTestId("concept-v2-inline-check");
    expect(supportInlineCheck).toHaveAccessibleName("Quick check: Which trace moved first?");
    expect(supportInlineCheck).toHaveAccessibleDescription(
      "Pick the trace that changed when the control moved. Use the first changed trace as your clue.",
    );
    expect(within(supportInlineCheck).getByText("Self-check").closest(".inline-flex")).toHaveClass(
      "max-w-full",
      "min-w-0",
    );
    expect(within(supportInlineCheck).getByText("Self-check").parentElement).toHaveClass(
      "min-w-0",
      "break-words",
    );
    expect(screen.getByText("Use the first changed trace as your clue.")).toBeVisible();
    const supportQuickCheckTitle = within(supportInlineCheck)
      .getByText("Which trace moved first?")
      .closest("p");
    expect(supportQuickCheckTitle).toHaveAttribute(
      "id",
      quickCheckChoices.getAttribute("aria-labelledby"),
    );
    const supportQuickCheckLabel = within(supportInlineCheck).getByText("Quick check").closest("p");
    expect(supportQuickCheckLabel).toHaveAttribute("id");
    expect(supportInlineCheck.getAttribute("aria-labelledby")).toBe(
      `${supportQuickCheckLabel?.getAttribute("id")} ${supportQuickCheckTitle?.getAttribute("id")}`,
    );
    expect(quickCheckChoices).toHaveAccessibleName("Which trace moved first?");
    expect(quickCheckChoices).toHaveAccessibleDescription(
      "Pick the trace that changed when the control moved. Use the first changed trace as your clue.",
    );
    expect(quickCheckChoices).toHaveClass("sm:grid-cols-2", "xl:grid-cols-3");
    expect(quickCheckChoices).toHaveTextContent("Left trace");
    expect(quickCheckChoices).toHaveTextContent("Right trace");
    expect(within(quickCheckChoices).getAllByRole("listitem")).toHaveLength(2);
    expect(within(quickCheckChoices).getByText("Left trace").parentElement).toHaveClass(
      "min-w-0",
      "line-clamp-2",
      "break-words",
    );
    expect(within(quickCheckChoices).getByText("Left trace").closest("li")).toHaveClass(
      "min-h-11",
    );
  });

  it("caps active support reveal chips with an accessible overflow count", () => {
    render(
      <ConceptPageV2LessonSupport
        steps={steps}
        activeStepId="compare"
        copy={copy}
        onSelectStep={vi.fn()}
      />,
    );

    const revealStrip = screen.getByRole("region", {
      name: "Current step: Now available",
    });
    expect(revealStrip).toHaveAttribute("data-testid", "concept-v2-step-support-reveal-strip");
    const revealStripLabel = within(revealStrip).getByText("Now available");
    expect(revealStripLabel).toHaveAttribute("id");
    expect(revealStrip.getAttribute("aria-labelledby")).toContain(
      revealStripLabel.id,
    );
    expect(revealStrip).toHaveTextContent("Now available");
    expect(revealStrip).toHaveTextContent("Graph: Comparison graph");
    expect(revealStrip).toHaveTextContent("Overlay: Difference overlay");
    expect(revealStrip).toHaveTextContent("Control: Second setup control");
    expect(revealStrip).toHaveTextContent("Tool: Measurement tool");
    expect(revealStrip).not.toHaveTextContent("Evidence section");
    const revealList = within(revealStrip).getByRole("list", {
      name: "Current step: Now available",
    });
    expect(revealList.getAttribute("aria-labelledby")).toContain(revealStripLabel.id);
    expect(within(revealList).getAllByRole("listitem")).toHaveLength(5);

    const revealOverflow = screen.getByTestId("concept-v2-step-support-reveal-overflow");
    expect(revealOverflow).toHaveTextContent("+1");
    expect(revealOverflow.querySelector(".sr-only")).toHaveTextContent(
      "1 more available item",
    );
  });

  it("turns the support panel into an actionable wrap-up handoff on the final step", async () => {
    const user = userEvent.setup();
    const onCompleteLesson = vi.fn();

    render(
      <ConceptPageV2LessonSupport
        steps={steps}
        activeStepId="explain"
        copy={copy}
        onCompleteLesson={onCompleteLesson}
      />,
    );

    expect(screen.queryByTestId("concept-v2-step-support-next")).not.toBeInTheDocument();
    const completeHandoff = screen.getByRole("region", {
      name: "Next step: Wrap-up — Ready to wrap up",
    });
    expect(completeHandoff).toHaveAttribute("data-testid", "concept-v2-step-support-complete");
    expect(completeHandoff).toHaveTextContent("Ready to wrap up");
    expect(completeHandoff).toHaveTextContent("Wrap-up");
    const completeDescription = within(completeHandoff)
      .getByText(/choose a practice path/)
      .closest("p[id]");
    expect(completeDescription).not.toBeNull();
    expect(completeHandoff).toHaveAttribute("aria-describedby", completeDescription!.id);
    expect(completeDescription!).toHaveClass("break-words");
    const completeButton = within(completeHandoff).getByRole("button", {
      name: "Next step: Wrap-up — Ready to wrap up",
    });
    expect(completeButton).toHaveClass("min-h-11");
    const completeNextStepCue = within(completeButton).getByTestId(
      "concept-v2-step-support-complete-next-step-cue",
    );
    expect(completeNextStepCue).toHaveTextContent("Next step");
    expect(completeNextStepCue).toHaveClass("min-w-0", "break-words");
    expect(within(completeButton).getByText("Wrap-up")).toHaveClass(
      "min-w-0",
      "break-words",
    );
    expect(completeButton).toHaveAccessibleDescription(
      "Use the wrap-up to lock in what changed, then choose a practice path or read-next concept.",
    );
    await user.click(completeButton);
    expect(onCompleteLesson).toHaveBeenCalledOnce();
  });

  it("skips the support panel when no lesson steps are authored", () => {
    const { container } = render(
      <ConceptPageV2LessonSupport
        steps={[]}
        activeStepId="missing-step"
        copy={copy}
        onSelectStep={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId("concept-v2-step-support")).not.toBeInTheDocument();
  });
});

describe("ConceptPageV2WrapUp", () => {
  it("opens with a completion runway that spotlights the recommended action", () => {
    render(<ConceptPageV2WrapUp wrapUp={wrapUp} copy={wrapUpCopy} />);

    const wrapUpRegion = screen.getByRole("region", { name: "Lock in the pattern" });
    expect(wrapUpRegion).toHaveAttribute("data-testid", "concept-v2-wrap-up");
    expect(wrapUpRegion).toHaveAttribute("tabindex", "-1");
    expect(wrapUpRegion).toHaveClass("scroll-mt-24", "focus-visible:ring-2");
    const wrapUpHeading = within(wrapUpRegion).getByRole("heading", {
      name: "Lock in the pattern",
    });
    expect(wrapUpHeading).toHaveAttribute("id", wrapUpRegion.getAttribute("aria-labelledby"));
    expect(wrapUpHeading).toHaveClass("break-words");

    const runway = screen.getByTestId("concept-v2-wrap-up-runway");
    expect(runway).toHaveTextContent("Lock in the pattern");
    expect(runway).not.toHaveTextContent("The control changes the first trace.");
    expect(runway.querySelector("dl")).toHaveClass("sm:grid-cols-2");
    expect(screen.getByText("Key takeaway")).toHaveClass("min-w-0", "break-words");
    const learnedList = screen.getByRole("list", { name: "Key takeaway" });
    expect(learnedList).toHaveAttribute("data-testid", "concept-v2-learned-list");
    expect(learnedList).toHaveAttribute("aria-labelledby", screen.getByText("Key takeaway").id);
    expect(learnedList).toHaveTextContent("The control changes the first trace.");
    expect(runway).toHaveTextContent("Recommended next");
    const runwayPracticeSummary = within(runway).getByRole("group", {
      name: "Recommended next",
    });
    const runwayPracticeSummaryLabel = within(runwayPracticeSummary).getByText(
      "Recommended next",
    );
    expect(runwayPracticeSummary).toHaveAttribute(
      "aria-labelledby",
      runwayPracticeSummaryLabel.id,
    );
    expect(runwayPracticeSummary).toHaveAccessibleDescription(
      "Check whether the idea transfers without the lab open.",
    );
    expect(runwayPracticeSummaryLabel.closest("dt")).toHaveClass(
      "min-w-0",
      "break-words",
    );
    expect(runwayPracticeSummary).toHaveTextContent("Open concept test");
    expect(runwayPracticeSummary).toHaveTextContent(
      "Check whether the idea transfers without the lab open.",
    );
    expect(runway).toHaveTextContent("Read next");
    const runwayReadNextSummary = within(runway).getByRole("group", {
      name: "Read next",
    });
    const runwayReadNextSummaryLabel = within(runwayReadNextSummary).getByText(
      "Read next",
    );
    expect(runwayReadNextSummary).toHaveAttribute(
      "aria-labelledby",
      runwayReadNextSummaryLabel.id,
    );
    expect(runwayReadNextSummary).toHaveAccessibleDescription("Builds on this pattern");
    expect(runwayReadNextSummaryLabel.closest("dt")).toHaveClass(
      "min-w-0",
      "break-words",
    );
    expect(runwayReadNextSummary).toHaveTextContent("Next force concept");
    expect(runwayReadNextSummary).toHaveTextContent("Builds on this pattern");
    expect(within(runway).getByText("Open concept test").closest(".line-clamp-2"))
      .toHaveClass("line-clamp-2", "break-words");
    expect(
      within(runway)
        .getByText("Check whether the idea transfers without the lab open.")
        .closest(".line-clamp-1"),
    ).toHaveClass("line-clamp-1", "break-words");
    expect(within(runway).getByText("Next force concept").closest(".line-clamp-2"))
      .toHaveClass("line-clamp-2", "break-words");
    expect(within(runway).getByText("Builds on this pattern").closest(".line-clamp-1"))
      .toHaveClass("line-clamp-1", "break-words");
    expect(
      within(learnedList).getByText("The control changes the first trace.").closest(".break-words"),
    ).toHaveClass("min-w-0", "break-words");
    const misconceptionRegion = within(wrapUpRegion).getByRole("region", {
      name: "Common misconception",
    });
    const misconceptionLabel = within(misconceptionRegion).getByText("Common misconception");
    expect(misconceptionRegion).toHaveAttribute("aria-labelledby", misconceptionLabel.id);
    expect(misconceptionRegion).toHaveAccessibleDescription(
      "Only the final graph matters. The control move explains why the graph changed.",
    );
    expect(misconceptionLabel).toHaveClass("min-w-0", "break-words");
    const misconceptionMyth = screen.getByText("Only the final graph matters.").closest("p");
    const misconceptionCorrection = screen
      .getByText("The control move explains why the graph changed.")
      .closest("p");
    expect(misconceptionRegion).toHaveAttribute(
      "aria-describedby",
      `${misconceptionMyth?.id} ${misconceptionCorrection?.id}`,
    );
    expect(misconceptionMyth).toHaveClass("break-words");
    expect(misconceptionCorrection).toHaveClass("break-words");

    const practiceActionsPanel = screen.getByTestId("concept-v2-practice-actions");
    const readNextPanel = screen.getByTestId("concept-v2-read-next");
    expect(practiceActionsPanel.compareDocumentPosition(readNextPanel)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(practiceActionsPanel).not.toHaveClass("order-1");
    expect(readNextPanel).not.toHaveClass("order-2");
    const practiceActionList = within(practiceActionsPanel).getByRole("list", {
      name: "Practice path",
    });
    expect(practiceActionList).toHaveAccessibleDescription(
      "Choose a focused way to use the concept next.",
    );
    expect(practiceActionList).toHaveClass("mt-3", "grid", "gap-3");
    expect(within(practiceActionList).getAllByRole("listitem")).toHaveLength(2);
    const readNextList = within(readNextPanel).getByRole("list", { name: "Read next" });
    expect(readNextList).toHaveAccessibleDescription(
      "Keep the sequence moving with the next related concept.",
    );
    expect(readNextList).toHaveClass("mt-3", "grid", "gap-2");
    expect(within(readNextList).getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByTestId("concept-v2-secondary-challenge")).toHaveTextContent(
      "Try a challenge",
    );

    const primaryPracticeAction = screen.getByTestId("concept-v2-primary-practice-action");
    expect(primaryPracticeAction).toHaveTextContent("Open concept test");
    expect(primaryPracticeAction).toHaveAccessibleName("Recommended next: Open concept test");
    expect(primaryPracticeAction).toHaveAccessibleDescription(
      "Check whether the idea transfers without the lab open.",
    );
    expect(primaryPracticeAction).toHaveAttribute("href", "/tests/concepts/sample");
    expect(primaryPracticeAction).toHaveClass(
      "group/action",
      "grid-cols-[auto_minmax(0,1fr)]",
      "sm:grid-cols-[auto_minmax(0,1fr)_auto]",
    );
    expect(primaryPracticeAction.lastElementChild).toHaveClass(
      "group-hover/action:translate-x-0.5",
      "motion-reduce:transform-none",
      "motion-reduce:transition-none",
    );
    expect(within(primaryPracticeAction).getByText("Recommended next").parentElement)
      .toHaveClass("max-w-full", "min-w-0");
    expect(within(primaryPracticeAction).getByText("Recommended next"))
      .toHaveClass("min-w-0", "break-words");
    expect(within(primaryPracticeAction).getByText("Open concept test").closest(".line-clamp-2"))
      .toHaveClass("line-clamp-2", "break-words");
    expect(
      within(primaryPracticeAction)
        .getByText("Check whether the idea transfers without the lab open.")
        .closest(".line-clamp-2"),
    ).toHaveClass("line-clamp-2", "break-words");
    expect(primaryPracticeAction.lastElementChild).toHaveClass("hidden", "sm:block");
    const featuredReadNextCard = screen.getByTestId("concept-v2-read-next-card");
    expect(featuredReadNextCard).toHaveAccessibleName("Read next: Next force concept");
    expect(featuredReadNextCard).toHaveAccessibleDescription("Builds on this pattern");
    expect(featuredReadNextCard).toHaveClass(
      "group/action",
      "min-h-16",
      "grid-cols-[auto_minmax(0,1fr)]",
      "sm:grid-cols-[auto_minmax(0,1fr)_auto]",
    );
    expect(featuredReadNextCard.lastElementChild).toHaveClass(
      "group-hover/action:translate-x-0.5",
      "motion-reduce:transform-none",
      "motion-reduce:transition-none",
    );
    const featuredReadNextCue = within(featuredReadNextCard)
      .getByText("Read next")
      .closest(".inline-flex");
    expect(featuredReadNextCue).toHaveClass("max-w-full", "border-teal-500/22", "text-teal-700");
    expect(within(featuredReadNextCard).getByText("Read next")).toHaveClass(
      "min-w-0",
      "break-words",
    );
    const featuredReasonBadge = within(featuredReadNextCard)
      .getByText("Builds on this pattern")
      .closest(".inline-flex");
    expect(featuredReasonBadge).toHaveClass("max-w-full");
    expect(within(featuredReadNextCard).getByText("Builds on this pattern").parentElement)
      .toHaveClass("min-w-0", "line-clamp-1", "break-words");
    expect(within(featuredReadNextCard).getByText("Next force concept").closest(".line-clamp-2"))
      .toHaveClass("mt-2", "line-clamp-2", "break-words");
    expect(featuredReadNextCard.lastElementChild).toHaveClass("hidden", "sm:block");
    const readNextRegion = within(wrapUpRegion).getByRole("region", { name: "Read next" });
    const practiceActionsRegion = within(wrapUpRegion).getByRole("region", {
      name: "Practice path",
    });
    expect(readNextRegion).toHaveAttribute("data-testid", "concept-v2-read-next");
    expect(practiceActionsRegion).toHaveAttribute(
      "data-testid",
      "concept-v2-practice-actions",
    );
    const readNextHeading = within(readNextRegion).getByRole("heading", { name: "Read next" });
    const practiceActionsHeading = within(practiceActionsRegion).getByRole("heading", {
      name: "Practice path",
    });
    expect(readNextHeading.tagName).toBe("H4");
    expect(readNextHeading).toHaveClass("min-w-0", "break-words");
    expect(practiceActionsHeading.tagName).toBe("H4");
    expect(practiceActionsHeading).toHaveClass("min-w-0", "break-words");
    expect(readNextRegion).toHaveAttribute("aria-labelledby", readNextHeading.id);
    const readNextDescription = within(readNextRegion).getByText(
      "Keep the sequence moving with the next related concept.",
    );
    expect(readNextDescription).toHaveClass("break-words");
    expect(readNextRegion).toHaveAttribute("aria-describedby", readNextDescription.id);
    expect(practiceActionsRegion).toHaveAttribute("aria-labelledby", practiceActionsHeading.id);
    const practiceActionsDescription = within(practiceActionsRegion).getByText(
      "Choose a focused way to use the concept next.",
    );
    expect(practiceActionsDescription).toHaveClass("break-words");
    expect(practiceActionsRegion).toHaveAttribute(
      "aria-describedby",
      practiceActionsDescription.id,
    );
    expect(screen.getByTestId("concept-v2-practice-actions")).toHaveTextContent(
      "Try a challenge",
    );
    const highlightedChallenge = screen.getByRole("link", {
      name: "Practice option: Try a challenge",
    });
    expect(highlightedChallenge).toHaveAccessibleDescription(
      "Push the pattern one step further.",
    );
    expect(highlightedChallenge).toHaveAttribute("href", "/concepts/sample#challenge");
    expect(highlightedChallenge).toHaveClass(
      "group/action",
      "grid-cols-[auto_minmax(0,1fr)]",
      "sm:grid-cols-[auto_minmax(0,1fr)_auto]",
    );
    expect(highlightedChallenge.lastElementChild).toHaveClass(
      "group-hover/action:translate-x-0.5",
      "motion-reduce:transform-none",
      "motion-reduce:transition-none",
    );
    const highlightedChallengeCue = within(highlightedChallenge)
      .getByText("Practice option")
      .closest(".inline-flex");
    expect(highlightedChallengeCue).toHaveClass(
      "max-w-full",
      "border-coral-500/20",
      "text-coral-700",
    );
    expect(within(highlightedChallenge).getByText("Practice option")).toHaveClass(
      "min-w-0",
      "break-words",
    );
    expect(within(highlightedChallenge).getByText("Try a challenge").closest(".line-clamp-2"))
      .toHaveClass("line-clamp-2", "break-words");
    expect(highlightedChallenge.lastElementChild).toHaveClass("hidden", "sm:block");
  });

  it("features the first available practice action when no concept test is authored", () => {
    const wrapUpWithoutTest: ConceptPageV2WrapUpViewModel = {
      ...wrapUp,
      testHref: null,
    };

    render(<ConceptPageV2WrapUp wrapUp={wrapUpWithoutTest} copy={wrapUpCopy} />);

    const runway = screen.getByTestId("concept-v2-wrap-up-runway");
    expect(runway).toHaveTextContent("Recommended next");
    expect(runway).toHaveTextContent("Review on the bench");

    const primaryPracticeAction = screen.getByTestId("concept-v2-primary-practice-action");
    expect(primaryPracticeAction).toHaveTextContent("Review on the bench");
    expect(primaryPracticeAction).toHaveAttribute("href", "/concepts/sample#bench");
    expect(screen.queryByRole("link", { name: /Open concept test/ })).not.toBeInTheDocument();

    const practiceDisclosure = screen.getByTestId("concept-v2-more-practice-options");
    expect(practiceDisclosure).not.toHaveTextContent("Review on the bench");
    expect(screen.getByTestId("concept-v2-secondary-challenge")).toHaveTextContent(
      "Try a challenge",
    );
    expect(practiceDisclosure).toHaveTextContent("Worked examples");
    expect(practiceDisclosure).toHaveTextContent("Practice option");
    expect(practiceDisclosure).not.toHaveTextContent("Try a challenge");
    expect(practiceDisclosure).toHaveTextContent("Free play on the bench");
  });

  it("does not render an empty read-next panel when no follow-up concept is authored", () => {
    const wrapUpWithoutReadNext: ConceptPageV2WrapUpViewModel = {
      ...wrapUp,
      nextConcepts: [],
    };

    render(<ConceptPageV2WrapUp wrapUp={wrapUpWithoutReadNext} copy={wrapUpCopy} />);

    expect(screen.queryByTestId("concept-v2-read-next")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Read next" })).not.toBeInTheDocument();
    const runway = screen.getByTestId("concept-v2-wrap-up-runway");
    expect(runway.querySelector("dl")).toHaveClass("sm:grid-cols-1");
    expect(runway.querySelector("dl")).not.toHaveClass("sm:grid-cols-2");
    expect(screen.getByTestId("concept-v2-practice-actions")).toHaveTextContent(
      "Open concept test",
    );
  });

  it("labels collapsed practice and read-next disclosures for keyboard and assistive tech", async () => {
    const user = userEvent.setup();
    const wrapUpWithMoreReadNext: ConceptPageV2WrapUpViewModel = {
      ...wrapUp,
      nextConcepts: [
        ...wrapUp.nextConcepts,
        {
          slug: "second-next-concept",
          title: "Second next concept",
          reasonLabel: "Optional bridge",
        },
      ],
    };

    render(<ConceptPageV2WrapUp wrapUp={wrapUpWithMoreReadNext} copy={wrapUpCopy} />);

    const practiceDisclosure = screen.getByTestId("concept-v2-more-practice-options");
    const practiceSummary = practiceDisclosure.querySelector("summary");
    expect(practiceSummary).not.toBeNull();
    expect(practiceSummary!).toHaveAccessibleName(
      "Show options: More practice options (3) — Review on the bench · Worked examples",
    );
    expect(practiceSummary!).toHaveTextContent("3");
    expect(practiceSummary!).toHaveClass("rounded-[14px]", "focus-visible:ring-2");
    expect(practiceSummary!).toHaveAttribute("aria-expanded", "false");
    expect(practiceSummary!).toHaveAttribute("aria-controls");
    expect(screen.getByTestId("concept-v2-secondary-challenge")).toHaveTextContent(
      "Try a challenge",
    );
    const practiceRegion = practiceDisclosure.querySelector('[role="region"]');
    expect(practiceRegion).not.toBeNull();
    expect(practiceRegion!).toHaveClass("mt-2");

    const practiceDisclosureLabel = screen.getByText("More practice options");
    expect(practiceRegion!).toHaveAttribute("aria-labelledby", practiceDisclosureLabel.id);
    expect(practiceRegion!).toHaveAccessibleName("More practice options");
    expect(practiceDisclosureLabel).toHaveClass("min-w-0", "break-words");
    const practiceDisclosureButton = practiceDisclosureLabel.parentElement;
    expect(practiceDisclosureButton).not.toBeNull();
    expect(practiceDisclosureButton!).toHaveClass(
      "min-h-11",
      "max-w-full",
      "flex-wrap",
    );
    expect(practiceDisclosureButton!.lastElementChild).toHaveTextContent(
      "Review on the bench · Worked examples",
    );
    expect(practiceDisclosureButton!.lastElementChild).toHaveClass(
      "line-clamp-1",
      "break-words",
    );
    practiceSummary!.focus();
    await user.keyboard("{Enter}");
    expect(practiceSummary!).toHaveAttribute("aria-expanded", "true");
    expect(practiceSummary!).toHaveAccessibleName(
      "Hide options: More practice options (3) — Review on the bench · Worked examples",
    );
    expect(practiceDisclosure).not.toHaveTextContent("Try a challenge");
    const practiceDrawerList = within(practiceRegion as HTMLElement).getByRole("list", {
      name: "More practice options",
    });
    expect(practiceDrawerList).toHaveClass("grid", "gap-2", "xl:grid-cols-1");
    expect(within(practiceDrawerList).getAllByRole("listitem")).toHaveLength(3);
    const practiceDrawerOption = within(practiceDisclosure).getByRole("link", {
      name: "Practice option: Review on the bench",
    });
    expect(practiceDrawerOption).toHaveAccessibleDescription(
      "Replay the setup that made the pattern visible.",
    );
    const practiceDrawerOptionCue = within(practiceDrawerOption)
      .getByText("Practice option")
      .closest(".inline-flex");
    expect(practiceDrawerOptionCue).toHaveClass(
      "max-w-full",
      "border-ink-950/10",
      "text-ink-600",
    );
    expect(within(practiceDrawerOption).getByText("Practice option")).toHaveClass(
      "min-w-0",
      "break-words",
    );

    const readNextPanel = screen.getByTestId("concept-v2-read-next");
    const readNextList = within(readNextPanel).getByRole("list", { name: "Read next" });
    expect(Array.from(readNextList.children)).toHaveLength(2);

    const readNextDisclosure = screen.getByTestId("concept-v2-more-read-next-options");
    const readNextSummary = readNextDisclosure.querySelector("summary");
    expect(readNextSummary).not.toBeNull();
    expect(readNextSummary!).toHaveAccessibleName(
      "Show options: More read-next options (1) — Second next concept",
    );
    expect(readNextSummary!).toHaveTextContent("1");
    expect(readNextSummary!).toHaveClass("rounded-[14px]", "focus-visible:ring-2");
    expect(readNextSummary!).toHaveAttribute("aria-expanded", "false");
    expect(readNextSummary!).toHaveAttribute("aria-controls");
    const readNextRegion = readNextDisclosure.querySelector('[role="region"]');
    expect(readNextRegion).not.toBeNull();
    expect(readNextRegion!).toHaveClass("mt-2");

    const readNextDisclosureLabel = screen.getByText("More read-next options");
    expect(readNextRegion!).toHaveAttribute("aria-labelledby", readNextDisclosureLabel.id);
    expect(readNextRegion!).toHaveAccessibleName("More read-next options");
    expect(readNextDisclosureLabel).toHaveClass("min-w-0", "break-words");
    const readNextDisclosureButton = readNextDisclosureLabel.parentElement;
    expect(readNextDisclosureButton).not.toBeNull();
    expect(readNextDisclosureButton!).toHaveClass(
      "min-h-11",
      "max-w-full",
      "flex-wrap",
    );
    expect(readNextDisclosureButton!.lastElementChild).toHaveTextContent(
      "Second next concept",
    );
    expect(readNextDisclosureButton!.lastElementChild).toHaveClass(
      "line-clamp-1",
      "break-words",
    );
    readNextSummary!.focus();
    await user.keyboard(" ");
    expect(readNextSummary!).toHaveAttribute("aria-expanded", "true");
    expect(readNextSummary!).toHaveAccessibleName(
      "Hide options: More read-next options (1) — Second next concept",
    );
    expect(readNextDisclosure).toHaveTextContent("Second next concept");
    const readNextDrawerList = within(readNextRegion as HTMLElement).getByRole("list", {
      name: "More read-next options",
    });
    expect(readNextDrawerList).toHaveClass("grid", "gap-2", "xl:grid-cols-1");
    expect(within(readNextDrawerList).getAllByRole("listitem")).toHaveLength(1);
    const additionalReadNext = within(readNextDisclosure).getByRole("link", {
      name: "Read next: Second next concept",
    });
    expect(additionalReadNext).toHaveAccessibleDescription("Optional bridge");
    expect(additionalReadNext).toHaveClass(
      "group/action",
      "min-h-12",
      "grid-cols-[auto_minmax(0,1fr)]",
      "sm:grid-cols-[auto_minmax(0,1fr)_auto]",
    );
    expect(additionalReadNext.lastElementChild).toHaveClass(
      "group-hover/action:translate-x-0.5",
      "motion-reduce:transform-none",
      "motion-reduce:transition-none",
    );
    const additionalReadNextCue = within(additionalReadNext)
      .getByText("Read next")
      .closest(".inline-flex");
    expect(additionalReadNextCue).toHaveClass(
      "max-w-full",
      "border-teal-500/22",
      "text-teal-700",
    );
    expect(within(additionalReadNext).getByText("Read next")).toHaveClass(
      "min-w-0",
      "break-words",
    );
    const additionalReasonBadge = within(additionalReadNext)
      .getByText("Optional bridge")
      .closest(".inline-flex");
    expect(additionalReasonBadge).toHaveClass("max-w-full");
    expect(within(additionalReadNext).getByText("Optional bridge").parentElement)
      .toHaveClass("min-w-0", "line-clamp-1", "break-words");
    expect(within(additionalReadNext).getByText("Second next concept").closest(".line-clamp-2"))
      .toHaveClass("mt-2", "line-clamp-2", "break-words");
    expect(additionalReadNext.lastElementChild).toHaveClass("hidden", "sm:block");
  });
});

describe("ConceptPageV2SecondarySection", () => {
  it("uses the disclosure action copy instead of repeating the section title", () => {
    render(
      <ConceptPageV2SecondarySection
        testId="secondary-section"
        eyebrow="Reference"
        title="Reference and support"
        description="A calmer place for fuller explanations."
        note="Return here when you want the slower reference pass."
        actionLabel="Open reference and support"
      >
        <p>Reference content</p>
      </ConceptPageV2SecondarySection>,
    );

    const section = screen.getByTestId("secondary-section");
    const summary = section.querySelector("summary");

    expect(summary).not.toBeNull();
    expect(summary!).toHaveTextContent("Reference and support");
    expect(summary!).toHaveTextContent("Open reference and support");
    expect(summary!).toHaveAccessibleName("Open reference and support");
    expect(summary!).toHaveAccessibleDescription(
      "Reference and support A calmer place for fuller explanations. Return here when you want the slower reference pass.",
    );
    expect(summary!).toHaveClass("min-w-0", "rounded-[18px]", "focus-visible:ring-2");
    expect(within(summary as HTMLElement).getByText("Reference")).toHaveClass(
      "min-w-0",
      "break-words",
    );
    expect(within(summary as HTMLElement).getByText("Reference and support")).toHaveClass(
      "break-words",
    );
    expect(
      within(summary as HTMLElement).getByText("A calmer place for fuller explanations."),
    ).toHaveClass("break-words");
    expect(
      within(summary as HTMLElement).getByText(
        "Return here when you want the slower reference pass.",
      ),
    ).toHaveClass("break-words", "uppercase", "text-teal-700/78");
    const secondaryDisclosureButton = screen.getByText("Open reference and support").parentElement;
    expect(secondaryDisclosureButton).not.toBeNull();
    expect(secondaryDisclosureButton!).toHaveClass("min-h-11", "max-w-full", "flex-wrap");
    expect(screen.getByText("Open reference and support")).toHaveClass(
      "min-w-0",
      "break-words",
      "text-left",
    );
    expect(secondaryDisclosureButton!.lastElementChild).toHaveClass("shrink-0");
    expect(secondaryDisclosureButton!.lastElementChild).toHaveClass(
      "motion-reduce:transition-none",
    );
    expect(summary!).not.toHaveTextContent(/Reference and support\s*Reference and support/);
  });

  it("exposes reference disclosure state and controlled content to assistive tech", async () => {
    const user = userEvent.setup();

    render(
      <ConceptPageV2SecondarySection
        testId="secondary-section"
        eyebrow="Reference"
        title="Reference and support"
        description="A calmer place for fuller explanations."
        note="Return here when you want the slower reference pass."
        actionLabel="Open reference and support"
      >
        <p>Reference content</p>
      </ConceptPageV2SecondarySection>,
    );

    const section = screen.getByTestId("secondary-section");
    const summary = section.querySelector("summary");
    expect(summary).not.toBeNull();
    expect(summary!).toHaveAccessibleName("Open reference and support");
    expect(summary!).toHaveAccessibleDescription(
      "Reference and support A calmer place for fuller explanations. Return here when you want the slower reference pass.",
    );
    expect(summary!).toHaveAttribute("aria-expanded", "false");
    expect(summary!).toHaveAttribute("aria-controls");
    expect(summary!).toHaveAttribute("aria-describedby");
    const region = section.querySelector('[role="region"]');
    expect(region).not.toBeNull();
    expect(region!).toHaveAttribute(
      "aria-labelledby",
      within(summary as HTMLElement).getByText("Reference and support").id,
    );
    expect(region!).toHaveAccessibleName("Reference and support");
    expect(region!).toHaveAccessibleDescription(
      "A calmer place for fuller explanations. Return here when you want the slower reference pass.",
    );
    expect(region!).toHaveClass("min-w-0");

    summary!.focus();
    await user.keyboard("{Enter}");
    expect(summary!).toHaveAttribute("aria-expanded", "true");
    expect(
      within(section).getByRole("region", { name: "Reference and support" }),
    ).toHaveTextContent("Reference content");
  });
});
