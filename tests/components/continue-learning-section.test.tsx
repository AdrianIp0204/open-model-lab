// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ContinueLearningSection } from "@/components/progress/ContinueLearningSection";
import zhHkMessages from "@/messages/zh-HK.json";
import {
  localConceptProgressStore,
  recordConceptVisit,
  recordQuickTestCompleted,
} from "@/lib/progress";
import type { ConceptSummary } from "@/lib/content";

const concepts: ConceptSummary[] = [
  {
    id: "concept-shm",
    slug: "simple-harmonic-motion",
    title: "Simple Harmonic Motion",
    shortTitle: "SHM",
    summary: "See one repeating system.",
    subject: "Physics",
    topic: "Oscillations",
    subtopic: "Foundations",
    difficulty: "Intro",
    sequence: 10,
    status: "published",
    estimatedStudyMinutes: 25,
    heroConcept: true,
    accent: "teal",
    highlights: ["Amplitude"],
  },
  {
    id: "concept-projectile-motion",
    slug: "projectile-motion",
    title: "Projectile Motion",
    shortTitle: "Projectile",
    summary: "Follow a launch through space.",
    subject: "Physics",
    topic: "Mechanics",
    subtopic: "Two-dimensional motion",
    difficulty: "Intro",
    sequence: 30,
    status: "published",
    estimatedStudyMinutes: 25,
    heroConcept: true,
    accent: "coral",
    highlights: ["Trajectory"],
  },
];

describe("ContinueLearningSection", () => {
  afterEach(() => {
    globalThis.__TEST_LOCALE__ = undefined;
    window.localStorage.clear();
    localConceptProgressStore.resetForTests();
  });

  it("surfaces the most recently active unfinished concept", () => {
    recordConceptVisit({
      id: "concept-shm",
      slug: "simple-harmonic-motion",
      title: "Simple Harmonic Motion",
    });
    recordQuickTestCompleted({
      id: "concept-projectile-motion",
      slug: "projectile-motion",
      title: "Projectile Motion",
    });

    render(<ContinueLearningSection concepts={concepts} />);

    expect(
      screen.getByRole("heading", {
        name: /resume the concepts that already have momentum/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Projectile Motion")[0]).toBeInTheDocument();
    expect(screen.getByText("Shaky")).toBeInTheDocument();
    expect(screen.getByText(/one stronger check is saved so far/i)).toBeInTheDocument();
    expect(screen.getByTestId("continue-learning-test-cta-projectile-motion")).toHaveTextContent(
      "Retake test",
    );
    expect(screen.getByTestId("continue-learning-test-cta-projectile-motion")).toHaveAttribute(
      "href",
      "/tests/concepts/projectile-motion",
    );
  });

  it("flags the current concept as worth revisiting when quick-test misses are still active", () => {
    recordQuickTestCompleted(
      {
        id: "concept-projectile-motion",
        slug: "projectile-motion",
        title: "Projectile Motion",
      },
      {
        incorrectAnswers: 2,
        totalQuestions: 4,
      },
    );
    recordQuickTestCompleted(
      {
        id: "concept-projectile-motion",
        slug: "projectile-motion",
        title: "Projectile Motion",
      },
      {
        incorrectAnswers: 2,
        totalQuestions: 4,
      },
    );

    render(<ContinueLearningSection concepts={concepts} />);

    expect(screen.getByText(/revisit/i)).toBeInTheDocument();
    expect(screen.getByText(/missed questions 2 times in a row/i)).toBeInTheDocument();
    expect(
      screen.getByTestId("continue-learning-test-cta-projectile-motion"),
    ).toHaveTextContent("Retake test");
  });

  it("keeps the concept page as the primary action and adds a secondary standalone test CTA", () => {
    recordConceptVisit({
      id: "concept-shm",
      slug: "simple-harmonic-motion",
      title: "Simple Harmonic Motion",
    });

    render(<ContinueLearningSection concepts={concepts} />);

    expect(screen.getByRole("link", { name: /continue concept/i })).toHaveAttribute(
      "href",
      "/concepts/simple-harmonic-motion",
    );
    expect(screen.getByTestId("continue-learning-test-cta-simple-harmonic-motion")).toHaveTextContent(
      "Take test",
    );
    expect(screen.getByTestId("continue-learning-test-cta-simple-harmonic-motion")).toHaveAttribute(
      "href",
      "/tests/concepts/simple-harmonic-motion",
    );
  });

  it("localizes primary continue-learning links in zh-HK", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    recordConceptVisit({
      id: "concept-shm",
      slug: "simple-harmonic-motion",
      title: "Simple Harmonic Motion",
    });

    render(<ContinueLearningSection concepts={concepts} />);

    expect(screen.getByRole("link", { name: /繼續概念/i })).toHaveAttribute(
      "href",
      "/zh-HK/concepts/simple-harmonic-motion",
    );
    expect(screen.getByRole("link", { name: /瀏覽概念庫/i })).toHaveAttribute(
      "href",
      "/zh-HK/concepts",
    );
    expect(screen.getByTestId("continue-learning-test-cta-simple-harmonic-motion")).toHaveAttribute(
      "href",
      "/tests/concepts/simple-harmonic-motion",
    );
  });

  it("renders zh-HK progress copy without leaking English revisit prose", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    recordQuickTestCompleted(
      {
        id: "concept-projectile-motion",
        slug: "projectile-motion",
        title: "Projectile Motion",
      },
      {
        incorrectAnswers: 2,
        totalQuestions: 4,
      },
    );
    recordQuickTestCompleted(
      {
        id: "concept-projectile-motion",
        slug: "projectile-motion",
        title: "Projectile Motion",
      },
      {
        incorrectAnswers: 2,
        totalQuestions: 4,
      },
    );

    render(<ContinueLearningSection concepts={concepts} />);

    expect(
      screen.getByRole("heading", {
        name: zhHkMessages.ContinueLearningSection.heading.title,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, node) =>
        node?.tagName === "P" &&
        (node.textContent?.includes(zhHkMessages.ProgressCopy.descriptions.recentReview) ?? false),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("continue-learning-test-cta-projectile-motion"),
    ).toHaveTextContent("重做測驗");
    expect(screen.queryByText(/quick test has ended with missed questions/i)).not.toBeInTheDocument();
  });
});
