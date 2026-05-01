import {
  learningToolsHubPath,
  learningToolsNavMatchPrefixes,
} from "@/lib/tools/learning-tools";

type PrimaryNavLabelKey =
  | "start"
  | "search"
  | "challenges"
  | "tests"
  | "explore"
  | "tools"
  | "guided";

type PrimaryNavItem = {
  href: string;
  labelKey: PrimaryNavLabelKey;
  matchPrefixes?: readonly string[];
};

export const primaryNavItems: readonly PrimaryNavItem[] = [
  { href: "/start", labelKey: "start" },
  { href: "/search", labelKey: "search" },
  { href: "/concepts", labelKey: "explore" },
  { href: "/guided", labelKey: "guided" },
  { href: "/challenges", labelKey: "challenges" },
  { href: "/tests", labelKey: "tests" },
  { href: learningToolsHubPath, labelKey: "tools", matchPrefixes: learningToolsNavMatchPrefixes },
];

export const footerTrustNavItems = [
  { href: "/privacy", labelKey: "privacy" },
  { href: "/terms", labelKey: "terms" },
  { href: "/billing", labelKey: "billing" },
  { href: "/ads", labelKey: "ads" },
] as const;

export const footerUtilityNavItems = [
  { href: "/about", labelKey: "about" },
  { href: "/pricing", labelKey: "pricing" },
] as const;
