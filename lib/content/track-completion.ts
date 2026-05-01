import type { StarterTrackSummary } from "./starter-tracks";
import { getStarterTracks } from "./starter-tracks";
import { getTopicDiscoverySummaryForConceptSlug, getTopicPath } from "./topics";

export type StarterTrackCompletionRelatedTopic = {
  slug: string;
  title: string;
  path: string;
  sharedConceptCount: number;
};

export type StarterTrackCompletionContentContext = {
  relatedTopic: StarterTrackCompletionRelatedTopic | null;
  orderedNextTracks: StarterTrackSummary[];
};

function getTrackConceptSlugSet(track: StarterTrackSummary) {
  return new Set(track.concepts.map((concept) => concept.slug));
}

function getTrackTopicSlugSet(track: StarterTrackSummary) {
  const topicSlugs = new Set<string>();

  for (const concept of track.concepts) {
    try {
      topicSlugs.add(getTopicDiscoverySummaryForConceptSlug(concept.slug).slug);
    } catch {
      continue;
    }
  }

  return topicSlugs;
}

function buildOrderedNextTracks(
  currentTrack: StarterTrackSummary,
  orderedTracks: StarterTrackSummary[],
) {
  const currentIndex = orderedTracks.findIndex((track) => track.slug === currentTrack.slug);

  if (currentIndex < 0) {
    return orderedTracks.filter((track) => track.slug !== currentTrack.slug);
  }

  const orderedSuggestions = new Map<string, StarterTrackSummary>();
  const currentConceptSlugs = getTrackConceptSlugSet(currentTrack);
  const currentTopicSlugs = getTrackTopicSlugSet(currentTrack);

  for (const trackSlug of currentTrack.recommendedNextTrackSlugs ?? []) {
    const track = orderedTracks.find((candidate) => candidate.slug === trackSlug);

    if (track && track.slug !== currentTrack.slug) {
      orderedSuggestions.set(track.slug, track);
    }
  }

  for (const track of orderedTracks) {
    if (
      track.slug !== currentTrack.slug &&
      track.prerequisiteTrackSlugs?.includes(currentTrack.slug)
    ) {
      orderedSuggestions.set(track.slug, track);
    }
  }

  for (const track of orderedTracks.slice(currentIndex + 1)) {
    const sharesConcept = track.concepts.some((concept) => currentConceptSlugs.has(concept.slug));
    const sharesTopic = track.concepts.some((concept) => {
      try {
        return currentTopicSlugs.has(getTopicDiscoverySummaryForConceptSlug(concept.slug).slug);
      } catch {
        return false;
      }
    });

    if (
      track.slug !== currentTrack.slug &&
      track.concepts.length > 1 &&
      (sharesConcept || sharesTopic)
    ) {
      orderedSuggestions.set(track.slug, track);
    }
  }

  return Array.from(orderedSuggestions.values());
}

export function getStarterTrackCompletionContentContext(
  currentTrack: StarterTrackSummary,
): StarterTrackCompletionContentContext {
  const topicCounts = new Map<string, StarterTrackCompletionRelatedTopic>();

  for (const concept of currentTrack.concepts) {
    try {
      const topic = getTopicDiscoverySummaryForConceptSlug(concept.slug);
      const current = topicCounts.get(topic.slug);

      if (current) {
        current.sharedConceptCount += 1;
        continue;
      }

      topicCounts.set(topic.slug, {
        slug: topic.slug,
        title: topic.title,
        path: getTopicPath(topic.slug),
        sharedConceptCount: 1,
      });
    } catch {
      continue;
    }
  }

  const orderedTracks = getStarterTracks();

  return {
    relatedTopic:
      Array.from(topicCounts.values()).sort((left, right) => {
        if (left.sharedConceptCount !== right.sharedConceptCount) {
          return right.sharedConceptCount - left.sharedConceptCount;
        }

        return left.title.localeCompare(right.title);
      })[0] ?? null,
    orderedNextTracks: buildOrderedNextTracks(currentTrack, orderedTracks),
  };
}
