import { resolveServerLocaleFallback } from "@/i18n/server";
import ChallengeHubPage, { buildChallengesMetadata } from "./ChallengesRoute";

type ChallengeHubPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata() {
  return buildChallengesMetadata(await resolveServerLocaleFallback());
}

export default async function ChallengesPage({ searchParams }: ChallengeHubPageProps) {
  return <ChallengeHubPage searchParams={searchParams} />;
}
