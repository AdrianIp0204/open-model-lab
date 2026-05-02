export type OnboardingRouteKey =
  | "home"
  | "start"
  | "search"
  | "conceptLibrary"
  | "subject"
  | "topic"
  | "concept"
  | "guided"
  | "guidedDetail"
  | "challenges"
  | "tests"
  | "assessment"
  | "tools"
  | "chemistryTool"
  | "circuitBuilder"
  | "track"
  | "assignment"
  | "dashboard"
  | "analytics"
  | "account"
  | "trust"
  | "default";

export type OnboardingStepDefinition = {
  id: string;
  messageKey: string;
  target?: string;
};

const localeSegmentPattern = /^\/(?:en|zh-HK)(?=\/|$)/;

const automaticPromptExcludedPrefixes = [
  "/",
  "/account",
  "/auth",
  "/billing",
  "/pricing",
  "/privacy",
  "/terms",
  "/ads",
  "/contact",
  "/dev",
  "/debug",
  "/author-preview",
  "/concepts",
  "/tests/concepts",
  "/tests/topics",
  "/tests/packs",
  "/tools/chemistry-reaction-mind-map",
  "/circuit-builder",
] as const;

const routeStepDefinitions: Partial<Record<OnboardingRouteKey, OnboardingStepDefinition[]>> = {
  home: [
    { id: "home-actions", messageKey: "homeActions", target: "home-start-actions" },
  ],
  start: [
    { id: "start-chooser", messageKey: "startChooser", target: "start-chooser" },
    {
      id: "start-recommendations",
      messageKey: "startRecommendations",
      target: "start-recommendations",
    },
  ],
  search: [
    { id: "search-input", messageKey: "searchInput", target: "site-search" },
    { id: "search-filters", messageKey: "searchFilters", target: "search-filters" },
    { id: "search-results", messageKey: "searchResults", target: "search-results" },
  ],
  concept: [
    { id: "concept-live-lab", messageKey: "conceptLiveLab", target: "concept-live-lab" },
    { id: "concept-phase-rail", messageKey: "conceptPhaseRail", target: "concept-phase-rail" },
  ],
  tests: [
    { id: "test-hub-controls", messageKey: "testHubControls", target: "test-hub-controls" },
    { id: "test-hub-results", messageKey: "testHubResults", target: "test-hub-results" },
  ],
  tools: [
    { id: "tools-directory", messageKey: "toolsDirectory", target: "tools-directory" },
  ],
  chemistryTool: [
    { id: "chemistry-graph", messageKey: "chemistryGraph", target: "chemistry-graph" },
    {
      id: "chemistry-route-controls",
      messageKey: "chemistryRouteExplorer",
      target: "chemistry-route-controls",
    },
    {
      id: "chemistry-inspector",
      messageKey: "chemistryInspector",
      target: "chemistry-inspector",
    },
  ],
  circuitBuilder: [
    {
      id: "circuit-builder-workspace",
      messageKey: "circuitWorkspace",
      target: "circuit-builder-workspace",
    },
    {
      id: "circuit-builder-palette",
      messageKey: "circuitPalette",
      target: "circuit-component-library",
    },
    {
      id: "circuit-builder-inspector",
      messageKey: "circuitInspector",
      target: "circuit-inspector",
    },
  ],
};

const shellSteps: OnboardingStepDefinition[] = [
  { id: "page-overview", messageKey: "pageOverview", target: "page-content" },
  { id: "main-navigation", messageKey: "mainNavigation", target: "main-navigation" },
  {
    id: "continue-learning",
    messageKey: "continueLearning",
    target: "continue-learning",
  },
  { id: "account-sync", messageKey: "accountSync", target: "account-sync" },
  { id: "help-entry", messageKey: "helpEntry", target: "help-entry" },
];

export function normalizeOnboardingPath(pathname: string | null | undefined) {
  const rawPath = pathname?.split("?")[0]?.split("#")[0] || "/";
  const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  const withoutLocale = path.replace(localeSegmentPattern, "") || "/";
  return withoutLocale.endsWith("/") && withoutLocale !== "/"
    ? withoutLocale.slice(0, -1)
    : withoutLocale;
}

export function shouldSuppressAutomaticOnboarding(pathname: string | null | undefined) {
  const path = normalizeOnboardingPath(pathname);

  return automaticPromptExcludedPrefixes.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export function getOnboardingRouteKey(pathname: string | null | undefined): OnboardingRouteKey {
  const path = normalizeOnboardingPath(pathname);

  if (path === "/") return "home";
  if (path.startsWith("/start")) return "start";
  if (path.startsWith("/search")) return "search";
  if (path.startsWith("/concepts/subjects")) return "subject";
  if (path.startsWith("/concepts/topics")) return "topic";
  if (path.startsWith("/concepts/")) return "concept";
  if (path.startsWith("/concepts")) return "conceptLibrary";
  if (path.startsWith("/guided/")) return "guidedDetail";
  if (path.startsWith("/guided")) return "guided";
  if (path.startsWith("/challenges")) return "challenges";
  if (path.startsWith("/tests/concepts") || path.startsWith("/tests/topics") || path.startsWith("/tests/packs")) {
    return "assessment";
  }
  if (path.startsWith("/tests")) return "tests";
  if (path.startsWith("/tools/chemistry-reaction-mind-map")) return "chemistryTool";
  if (path.startsWith("/tools")) return "tools";
  if (path.startsWith("/circuit-builder")) return "circuitBuilder";
  if (path.startsWith("/tracks")) return "track";
  if (path.startsWith("/assignments")) return "assignment";
  if (path.startsWith("/dashboard/analytics")) return "analytics";
  if (path.startsWith("/dashboard")) return "dashboard";
  if (path.startsWith("/account")) return "account";
  if (
    path.startsWith("/about") ||
    path.startsWith("/pricing") ||
    path.startsWith("/billing") ||
    path.startsWith("/privacy") ||
    path.startsWith("/terms") ||
    path.startsWith("/ads") ||
    path.startsWith("/contact")
  ) {
    return "trust";
  }

  return "default";
}

export function getOnboardingStepDefinitions(
  pathname: string | null | undefined,
): OnboardingStepDefinition[] {
  const routeKey = getOnboardingRouteKey(pathname);
  const routeSteps = routeStepDefinitions[routeKey] ?? [];
  const [pageOverview, ...remainingShellSteps] = shellSteps;

  return [pageOverview, ...routeSteps, ...remainingShellSteps];
}
