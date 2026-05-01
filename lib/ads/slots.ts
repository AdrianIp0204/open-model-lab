export const adRouteGroups = [
  "home",
  "library",
  "topic-directory",
  "subject-directory",
  "topic-page",
  "subject-page",
  "guided",
  "search",
  "concept-page",
] as const;

export type AdRouteGroup = (typeof adRouteGroups)[number];

export const adPlacements = [
  "home.heroBelow",
  "home.discoveryMid",
  "home.footerMultiplex",
  "library.browserDisplay",
  "library.footerMultiplex",
  "topicDirectory.headerDisplay",
  "topicDirectory.footerMultiplex",
  "subjectDirectory.headerDisplay",
  "topic.headerDisplay",
  "topic.footerMultiplex",
  "subject.headerDisplay",
  "subject.footerMultiplex",
  "guided.headerDisplay",
  "guided.footerMultiplex",
  "search.resultsDisplay",
  "concept.bodyInArticle",
  "concept.postLabDisplay",
  "concept.footerMultiplex",
] as const;

export type AdPlacement = (typeof adPlacements)[number];
export type ManualAdUnitType = "display" | "in-feed" | "in-article" | "multiplex";

export type AdPlacementDefinition = {
  placement: AdPlacement;
  routeGroup: AdRouteGroup;
  unitType: ManualAdUnitType;
  label: string;
  minHeightClassName: string;
  slotEnvVar: string;
  layoutKeyEnvVar?: string;
  safePlacementNotes: string;
};

export type AdRoutePolicy = {
  group: AdRouteGroup;
  label: string;
  match: (pathname: string) => boolean;
};

const placementDefinitions: Record<AdPlacement, AdPlacementDefinition> = {
  "home.heroBelow": {
    placement: "home.heroBelow",
    routeGroup: "home",
    unitType: "display",
    label: "Homepage hero follow-up",
    minHeightClassName: "min-h-[15rem] sm:min-h-[17rem]",
    slotEnvVar: "NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_HOME_HERO_BELOW",
    safePlacementNotes: "Below the hero summary and above the deeper discovery sections.",
  },
  "home.discoveryMid": {
    placement: "home.discoveryMid",
    routeGroup: "home",
    unitType: "display",
    label: "Homepage discovery bridge",
    minHeightClassName: "min-h-[15rem] sm:min-h-[17rem]",
    slotEnvVar: "NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_HOME_DISCOVERY",
    safePlacementNotes: "Between discovery sections, never inside the live preview bench.",
  },
  "home.footerMultiplex": {
    placement: "home.footerMultiplex",
    routeGroup: "home",
    unitType: "multiplex",
    label: "Homepage footer recommendations",
    minHeightClassName: "min-h-[17rem] sm:min-h-[19rem]",
    slotEnvVar: "NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_HOME_FOOTER_MULTIPLEX",
    safePlacementNotes: "Lower-page recommendation zone only.",
  },
  "library.browserDisplay": {
    placement: "library.browserDisplay",
    routeGroup: "library",
    unitType: "display",
    label: "Concept library browser separator",
    minHeightClassName: "min-h-[15rem] sm:min-h-[17rem]",
    slotEnvVar: "NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_CONCEPT_LIBRARY_DISCOVERY",
    safePlacementNotes: "Below the browser surface, outside the filter controls.",
  },
  "library.footerMultiplex": {
    placement: "library.footerMultiplex",
    routeGroup: "library",
    unitType: "multiplex",
    label: "Concept library footer recommendations",
    minHeightClassName: "min-h-[17rem] sm:min-h-[19rem]",
    slotEnvVar: "NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_CONCEPT_LIBRARY_FOOTER_MULTIPLEX",
    safePlacementNotes: "Lower-page recommendation zone only.",
  },
  "topicDirectory.headerDisplay": {
    placement: "topicDirectory.headerDisplay",
    routeGroup: "topic-directory",
    unitType: "display",
    label: "Topic directory entry separator",
    minHeightClassName: "min-h-[14rem] sm:min-h-[16rem]",
    slotEnvVar: "NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_TOPIC_DIRECTORY_DISCOVERY",
    safePlacementNotes: "Between stats and the grouped topic listings.",
  },
  "topicDirectory.footerMultiplex": {
    placement: "topicDirectory.footerMultiplex",
    routeGroup: "topic-directory",
    unitType: "multiplex",
    label: "Topic directory footer recommendations",
    minHeightClassName: "min-h-[17rem] sm:min-h-[19rem]",
    slotEnvVar: "NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_TOPIC_DIRECTORY_FOOTER_MULTIPLEX",
    safePlacementNotes: "Lower-page recommendation zone only.",
  },
  "subjectDirectory.headerDisplay": {
    placement: "subjectDirectory.headerDisplay",
    routeGroup: "subject-directory",
    unitType: "display",
    label: "Subject directory entry separator",
    minHeightClassName: "min-h-[14rem] sm:min-h-[16rem]",
    slotEnvVar: "NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_SUBJECT_DIRECTORY_HEADER_DISPLAY",
    safePlacementNotes: "Between the directory stats and the subject cards.",
  },
  "topic.headerDisplay": {
    placement: "topic.headerDisplay",
    routeGroup: "topic-page",
    unitType: "display",
    label: "Topic page hero separator",
    minHeightClassName: "min-h-[14rem] sm:min-h-[16rem]",
    slotEnvVar: "NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_TOPIC_HEADER_DISPLAY",
    safePlacementNotes: "Below the top orientation band and before the deeper concept lists.",
  },
  "topic.footerMultiplex": {
    placement: "topic.footerMultiplex",
    routeGroup: "topic-page",
    unitType: "multiplex",
    label: "Topic page footer recommendations",
    minHeightClassName: "min-h-[17rem] sm:min-h-[19rem]",
    slotEnvVar: "NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_TOPIC_FOOTER_MULTIPLEX",
    safePlacementNotes: "After the grouped concept overview.",
  },
  "subject.headerDisplay": {
    placement: "subject.headerDisplay",
    routeGroup: "subject-page",
    unitType: "display",
    label: "Subject page hero separator",
    minHeightClassName: "min-h-[14rem] sm:min-h-[16rem]",
    slotEnvVar: "NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_SUBJECT_HEADER_DISPLAY",
    safePlacementNotes: "Below the subject hero and progress band, before tracks and topics.",
  },
  "subject.footerMultiplex": {
    placement: "subject.footerMultiplex",
    routeGroup: "subject-page",
    unitType: "multiplex",
    label: "Subject page footer recommendations",
    minHeightClassName: "min-h-[17rem] sm:min-h-[19rem]",
    slotEnvVar: "NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_SUBJECT_FOOTER_MULTIPLEX",
    safePlacementNotes: "Below the best-first concept area.",
  },
  "guided.headerDisplay": {
    placement: "guided.headerDisplay",
    routeGroup: "guided",
    unitType: "display",
    label: "Guided collection separator",
    minHeightClassName: "min-h-[14rem] sm:min-h-[16rem]",
    slotEnvVar: "NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_GUIDED_DIRECTORY_DISCOVERY",
    safePlacementNotes: "Between the goal-path intro and the collection grid.",
  },
  "guided.footerMultiplex": {
    placement: "guided.footerMultiplex",
    routeGroup: "guided",
    unitType: "multiplex",
    label: "Guided collection footer recommendations",
    minHeightClassName: "min-h-[17rem] sm:min-h-[19rem]",
    slotEnvVar: "NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_GUIDED_DIRECTORY_FOOTER_MULTIPLEX",
    safePlacementNotes: "Lower-page recommendation zone only.",
  },
  "search.resultsDisplay": {
    placement: "search.resultsDisplay",
    routeGroup: "search",
    unitType: "display",
    label: "Search result separator",
    minHeightClassName: "min-h-[14rem] sm:min-h-[16rem]",
    slotEnvVar: "NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_SEARCH_RESULTS_DISPLAY",
    safePlacementNotes: "Below the search summary and outside the filter controls.",
  },
  "concept.bodyInArticle": {
    placement: "concept.bodyInArticle",
    routeGroup: "concept-page",
    unitType: "in-article",
    label: "Concept page explanation placement",
    minHeightClassName: "min-h-[15rem] sm:min-h-[17rem]",
    slotEnvVar: "NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_CONCEPT_BODY_IN_ARTICLE",
    safePlacementNotes: "Inside explanatory prose only, never in the live bench or tool panels.",
  },
  "concept.postLabDisplay": {
    placement: "concept.postLabDisplay",
    routeGroup: "concept-page",
    unitType: "display",
    label: "Concept page post-lab separator",
    minHeightClassName: "min-h-[14rem] sm:min-h-[16rem]",
    slotEnvVar: "NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_CONCEPT_POST_LAB_DISPLAY",
    safePlacementNotes: "After the main interactive and explanation region.",
  },
  "concept.footerMultiplex": {
    placement: "concept.footerMultiplex",
    routeGroup: "concept-page",
    unitType: "multiplex",
    label: "Concept page footer recommendations",
    minHeightClassName: "min-h-[17rem] sm:min-h-[19rem]",
    slotEnvVar: "NEXT_PUBLIC_OPEN_MODEL_LAB_ADSENSE_SLOT_CONCEPT_FOOTER_MULTIPLEX",
    safePlacementNotes: "Below related concepts and resources, never in the live bench.",
  },
};

const routePolicies: AdRoutePolicy[] = [
  {
    group: "home",
    label: "Homepage / discovery",
    match: (pathname) => pathname === "/",
  },
  {
    group: "search",
    label: "Search",
    match: (pathname) => pathname === "/search",
  },
  {
    group: "guided",
    label: "Guided collections",
    match: (pathname) => pathname === "/guided",
  },
  {
    group: "library",
    label: "Concept library",
    match: (pathname) => pathname === "/concepts",
  },
  {
    group: "topic-directory",
    label: "Topic directory",
    match: (pathname) => pathname === "/concepts/topics",
  },
  {
    group: "topic-page",
    label: "Topic pages",
    match: (pathname) => pathname.startsWith("/concepts/topics/"),
  },
  {
    group: "subject-directory",
    label: "Subject directory",
    match: (pathname) => pathname === "/concepts/subjects",
  },
  {
    group: "subject-page",
    label: "Subject pages",
    match: (pathname) => pathname.startsWith("/concepts/subjects/"),
  },
  {
    group: "concept-page",
    label: "Concept pages",
    match: (pathname) =>
      pathname.startsWith("/concepts/") &&
      !pathname.startsWith("/concepts/topics/") &&
      !pathname.startsWith("/concepts/subjects/"),
  },
];

export function getAdPlacementDefinition(placement: AdPlacement) {
  return placementDefinitions[placement];
}

export function getAdPlacementsForRouteGroup(routeGroup: AdRouteGroup) {
  return adPlacements.filter(
    (placement) => placementDefinitions[placement].routeGroup === routeGroup,
  );
}

export function getAdRoutePolicies() {
  return routePolicies;
}

export function resolveAdRouteGroup(pathname: string | null | undefined): AdRouteGroup | null {
  if (!pathname) {
    return null;
  }

  return routePolicies.find((policy) => policy.match(pathname))?.group ?? null;
}

export function isAdRouteEligible(pathname: string | null | undefined) {
  return resolveAdRouteGroup(pathname) !== null;
}

export function isPlacementAllowedOnPath(
  placement: AdPlacement,
  pathname: string | null | undefined,
) {
  const routeGroup = resolveAdRouteGroup(pathname);

  if (!routeGroup) {
    return false;
  }

  return placementDefinitions[placement].routeGroup === routeGroup;
}
