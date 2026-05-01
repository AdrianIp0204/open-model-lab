import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TopicDiscoveryCard } from "@/components/concepts/TopicDiscoveryCard";
import type { TopicDiscoverySummary } from "@/lib/content";

const topic: TopicDiscoverySummary = {
  subject: "Physics",
  slug: "mechanics",
  title: "Mechanics",
  description: "Mechanics overview.",
  introduction: "Mechanics overview.",
  accent: "sky",
  conceptCount: 2,
  estimatedStudyMinutes: 32,
  sourceTopics: ["Mechanics"],
  subtopics: ["Vector foundations", "Two-dimensional motion"],
  concepts: [
    {
      id: "concept-vectors-components",
      slug: "vectors-components",
      title: "Vectors and Components",
      shortTitle: "Vectors",
      subject: "Physics",
      topic: "Mechanics",
      subtopic: "Vector foundations",
      difficulty: "Intro",
      sequence: 25,
      summary: "Read one vector and its components.",
      accent: "sky",
      highlights: ["Components"],
      estimatedStudyMinutes: 16,
    },
    {
      id: "concept-projectile-motion",
      slug: "projectile-motion",
      title: "Projectile Motion",
      shortTitle: "Projectile",
      subject: "Physics",
      topic: "Mechanics",
      subtopic: "Two-dimensional motion",
      difficulty: "Intro",
      sequence: 30,
      summary: "Follow one launch through space.",
      accent: "coral",
      highlights: ["Trajectory"],
      estimatedStudyMinutes: 16,
    },
  ],
  featuredConcepts: [
    {
      id: "concept-vectors-components",
      slug: "vectors-components",
      title: "Vectors and Components",
      shortTitle: "Vectors",
      subject: "Physics",
      topic: "Mechanics",
      subtopic: "Vector foundations",
      difficulty: "Intro",
      sequence: 25,
      summary: "Read one vector and its components.",
      accent: "sky",
      highlights: ["Components"],
      estimatedStudyMinutes: 16,
    },
    {
      id: "concept-projectile-motion",
      slug: "projectile-motion",
      title: "Projectile Motion",
      shortTitle: "Projectile",
      subject: "Physics",
      topic: "Mechanics",
      subtopic: "Two-dimensional motion",
      difficulty: "Intro",
      sequence: 30,
      summary: "Follow one launch through space.",
      accent: "coral",
      highlights: ["Trajectory"],
      estimatedStudyMinutes: 16,
    },
  ],
  starterTracks: [],
  recommendedStarterTracks: [],
  relatedTopics: [],
  groups: [
    {
      id: "motion-language",
      title: "Motion language and trajectories",
      concepts: [],
      conceptCount: 2,
      estimatedStudyMinutes: 32,
    },
  ],
};

describe("TopicDiscoveryCard", () => {
  it("localizes subject and subtopic chips in zh-HK", () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    render(<TopicDiscoveryCard topic={topic} />);

    expect(screen.getByText("力學")).toBeInTheDocument();
    expect(screen.getByText("物理")).toBeInTheDocument();
    expect(screen.getByText("向量基礎")).toBeInTheDocument();
    expect(screen.getByText("二維運動")).toBeInTheDocument();
  });
});
