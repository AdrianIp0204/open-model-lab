/**
 * Single source of truth for non-concept learning tools.
 * Keep ids and hrefs stable, and keep localized copy in
 * `ToolsDirectoryPage.tools[messageKey]` aligned with every registry entry.
 */

export type LearningToolMessageKey = "circuitBuilder" | "chemistryReactionMindMap";
export type LearningToolAccent = "sky" | "teal";

export type LearningToolDefinition = {
  id: string;
  href: string;
  messageKey: LearningToolMessageKey;
  accent: LearningToolAccent;
  navMatchPrefixes: readonly [string, ...string[]];
};

export const learningToolRequiredCopyFields = [
  "title",
  "description",
  "cta",
  "badge",
] as const;

export const learningToolsHubPath = "/tools";

export const learningToolDefinitions = [
  {
    id: "circuit-builder",
    href: "/circuit-builder",
    messageKey: "circuitBuilder",
    accent: "sky",
    navMatchPrefixes: ["/circuit-builder"],
  },
  {
    id: "chemistry-reaction-mind-map",
    href: "/tools/chemistry-reaction-mind-map",
    messageKey: "chemistryReactionMindMap",
    accent: "teal",
    navMatchPrefixes: ["/tools/chemistry-reaction-mind-map"],
  },
] as const satisfies readonly LearningToolDefinition[];

export type LearningToolId = (typeof learningToolDefinitions)[number]["id"];
export type LearningToolHref = (typeof learningToolDefinitions)[number]["href"];

export const learningToolsNavMatchPrefixes = [
  learningToolsHubPath,
  ...new Set(learningToolDefinitions.flatMap((tool) => tool.navMatchPrefixes)),
] as const;

export const learningToolSitemapPaths = [
  learningToolsHubPath,
  ...learningToolDefinitions.map((tool) => tool.href),
] as const;
