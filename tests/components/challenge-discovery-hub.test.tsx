import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ChallengeDiscoveryHub } from "@/components/challenges/ChallengeDiscoveryHub";
import {
  getChallengeDiscoveryIndex,
  resolveChallengeTrackCtaTargets,
} from "@/lib/content";
import { getLocalizedChallengeDiscoveryIndex } from "@/lib/i18n/challenge-discovery";
import { localConceptProgressStore, PROGRESS_STORAGE_KEY } from "@/lib/progress";

const challengeDiscoveryIndex = getChallengeDiscoveryIndex();
const zhhkChallengeDiscoveryIndex = getLocalizedChallengeDiscoveryIndex("zh-HK");

async function replaceChallengeSearch(
  user: ReturnType<typeof userEvent.setup>,
  value: string,
) {
  const input = screen.getByRole("searchbox", { name: /search/i });

  await user.click(input);

  if (input instanceof HTMLInputElement && input.value) {
    await user.clear(input);
  }

  await user.paste(value);
  return input;
}

function getChallengeResultsContainer(browserSection: HTMLElement) {
  return browserSection;
}

describe("ChallengeDiscoveryHub", () => {
  afterEach(() => {
    window.localStorage.clear();
    localConceptProgressStore.resetForTests();
    globalThis.__TEST_LOCALE__ = undefined;
  });

  it("renders zh-HK shared chrome without falling back to English section labels", { timeout: 20_000 }, () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    render(<ChallengeDiscoveryHub index={zhhkChallengeDiscoveryIndex} />);

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
    expect(screen.getAllByRole("link").length).toBeGreaterThan(0);
    expect(screen.getByTestId("challenge-primary-cta")).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/zh-HK\/concepts\/.+#challenge-mode$/),
    );
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("uses zh-HK fallback challenge copy instead of surfacing raw English challenge authoring", async () => {
    globalThis.__TEST_LOCALE__ = "zh-HK";

    render(
      <ChallengeDiscoveryHub
        index={zhhkChallengeDiscoveryIndex}
        initialFilters={{ track: "rotational-mechanics" }}
      />,
    );

    const browserSection = screen.getByRole("searchbox").closest("section");

    expect(browserSection).not.toBeNull();
    expect(
      await within(browserSection as HTMLElement).findAllByRole("heading", {
        name: /挑戰/i,
        level: 3,
      }),
    ).not.toHaveLength(0);
    expect(
      within(browserSection as HTMLElement).getAllByText(
        "打開這個挑戰以查看完整任務要求與目標。",
      ).length,
    ).toBeGreaterThan(0);
    expect(
      within(browserSection as HTMLElement).queryByText("Balance the heavy right load"),
    ).not.toBeInTheDocument();
  });

  it(
    "applies initial guided-path and topic filters to the challenge browser",
    async () => {
      render(
        <ChallengeDiscoveryHub
          index={challengeDiscoveryIndex}
          initialFilters={{ track: "motion-and-circular-motion" }}
        />,
      );
      const browserSection = screen.getByLabelText(/search/i).closest("section");

      expect(browserSection).not.toBeNull();

      const pathResults = getChallengeResultsContainer(browserSection as HTMLElement);

      expect(
        await within(pathResults).findByRole("heading", {
          name: /flat long shot/i,
        }),
      ).toBeInTheDocument();
      await waitFor(() => {
        expect(
          within(getChallengeResultsContainer(browserSection as HTMLElement)).queryByRole(
            "heading",
            {
              name: /real-image target/i,
            },
          ),
        ).not.toBeInTheDocument();
      });

      fireEvent.click(
        within(browserSection as HTMLElement).getByRole("button", { name: /^mechanics \(/i }),
      );

      const mechanicsResults = getChallengeResultsContainer(browserSection as HTMLElement);

      expect(
        await within(mechanicsResults).findByRole("heading", {
          name: /equal components/i,
        }),
      ).toBeInTheDocument();
      await waitFor(() => {
        expect(
          within(getChallengeResultsContainer(browserSection as HTMLElement)).queryByRole(
            "heading",
            {
              name: /short-period match/i,
            },
          ),
        ).not.toBeInTheDocument();
      });
    },
    10000,
  );

  it("surfaces solved and started challenge states from the existing local progress store", async () => {
    const user = userEvent.setup();

    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        concepts: {
          "projectile-motion": {
            conceptId: "concept-projectile-motion",
            slug: "projectile-motion",
            usedChallengeModeAt: "2026-03-27T10:00:00.000Z",
            completedChallenges: {
              "pm-ch-flat-far-shot": "2026-03-27T10:05:00.000Z",
            },
          },
        },
      }),
    );
    localConceptProgressStore.resetForTests();

    render(<ChallengeDiscoveryHub index={challengeDiscoveryIndex} />);
    const browserSection = screen.getByLabelText(/search/i).closest("section");

    expect(browserSection).not.toBeNull();

    await replaceChallengeSearch(user, "flat long shot");

    const solvedHeading = await within(browserSection as HTMLElement).findByRole("heading", {
      name: /flat long shot/i,
      level: 3,
    });
    const solvedCard = solvedHeading.closest("article");

    expect(solvedCard).not.toBeNull();
    expect(within(solvedCard as HTMLElement).getByText(/^Solved$/i)).toBeInTheDocument();
    expect(
      within(solvedCard as HTMLElement).getByRole("link", { name: /open challenge/i }),
    ).toHaveAttribute(
      "href",
      "/concepts/projectile-motion?challenge=pm-ch-flat-far-shot#challenge-mode",
    );

    await user.click(screen.getByRole("button", { name: /^Started \(/i }));
    await replaceChallengeSearch(user, "freeze the apex");

    const startedHeading = await within(browserSection as HTMLElement).findByRole("heading", {
      name: /freeze the apex/i,
      level: 3,
    });
    const startedCard = startedHeading.closest("article");

    expect(startedCard).not.toBeNull();
    expect(within(startedCard as HTMLElement).getByText(/^Started$/i)).toBeInTheDocument();
    expect(
      within(startedCard as HTMLElement).getByText(
        /challenge mode has already been opened for projectile motion/i,
      ),
    ).toBeInTheDocument();
  });

  it("uses exact started challenge ids when the browser has challenge-specific progress", async () => {
    const user = userEvent.setup();

    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        concepts: {
          "projectile-motion": {
            conceptId: "concept-projectile-motion",
            slug: "projectile-motion",
            usedChallengeModeAt: "2026-03-27T10:00:00.000Z",
            startedChallenges: {
              "pm-ch-apex-freeze": "2026-03-27T10:03:00.000Z",
            },
          },
        },
      }),
    );
    localConceptProgressStore.resetForTests();

    render(<ChallengeDiscoveryHub index={challengeDiscoveryIndex} />);
    const browserSection = screen.getByLabelText(/search/i).closest("section");

    expect(browserSection).not.toBeNull();

    await user.click(screen.getByRole("button", { name: /^Started \(/i }));

    expect(
      within(browserSection as HTMLElement).getByRole("heading", {
        name: /freeze the apex/i,
        level: 3,
      }),
    ).toBeInTheDocument();
    expect(
      within(browserSection as HTMLElement).queryByRole("heading", {
        name: /flat long shot/i,
        level: 3,
      }),
    ).not.toBeInTheDocument();
  });

  it("renders synced challenge history before this browser has local progress", async () => {
    const user = userEvent.setup();

    render(
      <ChallengeDiscoveryHub
        index={challengeDiscoveryIndex}
        initialSyncedSnapshot={{
          version: 1,
          concepts: {
            "projectile-motion": {
              conceptId: "concept-projectile-motion",
              slug: "projectile-motion",
              usedChallengeModeAt: "2026-03-27T10:00:00.000Z",
              completedChallenges: {
                "pm-ch-flat-far-shot": "2026-03-27T10:05:00.000Z",
              },
            },
          },
        }}
      />,
    );
    const browserSection = screen.getByLabelText(/search/i).closest("section");

    expect(browserSection).not.toBeNull();
    expect(screen.getByText(/synced across devices/i)).toBeInTheDocument();

    await replaceChallengeSearch(user, "flat long shot");

    const solvedHeading = await within(browserSection as HTMLElement).findByRole("heading", {
      name: /flat long shot/i,
      level: 3,
    });
    const solvedCard = solvedHeading.closest("article");

    expect(solvedCard).not.toBeNull();
    expect(
      within(solvedCard as HTMLElement).getByText(/solved in your synced account/i),
    ).toBeInTheDocument();
  });

  it("merges synced challenge history into the signed-in browser view when local progress already exists", async () => {
    const user = userEvent.setup();

    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        concepts: {
          "simple-harmonic-motion": {
            conceptId: "concept-shm",
            slug: "simple-harmonic-motion",
            firstVisitedAt: "2026-03-28T10:00:00.000Z",
          },
        },
      }),
    );
    localConceptProgressStore.resetForTests();

    render(
      <ChallengeDiscoveryHub
        index={challengeDiscoveryIndex}
        initialSyncedSnapshot={{
          version: 1,
          concepts: {
            "projectile-motion": {
              conceptId: "concept-projectile-motion",
              slug: "projectile-motion",
              usedChallengeModeAt: "2026-03-27T10:00:00.000Z",
              completedChallenges: {
                "pm-ch-flat-far-shot": "2026-03-27T10:05:00.000Z",
              },
            },
          },
        }}
      />,
    );
    const browserSection = screen.getByLabelText(/search/i).closest("section");

    expect(browserSection).not.toBeNull();

    await replaceChallengeSearch(user, "flat long shot");

    const solvedHeading = await within(browserSection as HTMLElement).findByRole("heading", {
      name: /flat long shot/i,
      level: 3,
    });
    const solvedCard = solvedHeading.closest("article");

    expect(solvedCard).not.toBeNull();
    expect(within(solvedCard as HTMLElement).getByText(/^Solved$/i)).toBeInTheDocument();
    expect(
      within(solvedCard as HTMLElement).getByText(/solved in your synced account/i),
    ).toBeInTheDocument();
  });

  it("finds the uniform circular motion challenge entries from a centripetal force search", async () => {
    const user = userEvent.setup();

    render(<ChallengeDiscoveryHub index={challengeDiscoveryIndex} />);
    const browserSection = screen.getByLabelText(/search/i).closest("section");

    expect(browserSection).not.toBeNull();

    await replaceChallengeSearch(user, "centripetal force");

    expect(
      await within(browserSection as HTMLElement).findByRole("heading", {
        name: /short-period force band/i,
        level: 3,
      }),
    ).toBeInTheDocument();
    expect(
      await within(browserSection as HTMLElement).findByRole("heading", {
        name: /same period, bigger inward pull/i,
        level: 3,
      }),
    ).toBeInTheDocument();
  });

  it("renders challenge cards with meaningful visuals and readable unit text", async () => {
    const user = userEvent.setup();

    render(<ChallengeDiscoveryHub index={challengeDiscoveryIndex} />);
    const browserSection = screen.getByLabelText(/search/i).closest("section");

    expect(browserSection).not.toBeNull();

    await replaceChallengeSearch(user, "short-period force band");

    const heading = await within(browserSection as HTMLElement).findByRole("heading", {
      name: /short-period force band/i,
      level: 3,
    });
    const card = heading.closest("article");

    expect(card).not.toBeNull();
    expect(card as HTMLElement).toHaveAttribute("data-card-visual-layout", "compact-side");
    expect(card as HTMLElement).toHaveTextContent(/2\.2 s/i);
    expect(card as HTMLElement).not.toHaveTextContent(/\\mathrm|\\,|\$/);

    const visual = within(card as HTMLElement).getByTestId("learning-visual");
    expect(visual).toHaveAttribute("data-visual-kind", "challenge");
    expect(visual).toHaveAttribute("data-visual-motif", "uniform-circular-motion");
    expect(visual).toHaveAttribute("data-visual-overlay", "challenge");
    expect(visual).toHaveAttribute("data-visual-fallback", "false");
  });

  it("accepts initial track and search filters for deep-linked follow-up flows", () => {
    render(
      <ChallengeDiscoveryHub
        index={challengeDiscoveryIndex}
        initialFilters={{
          track: "magnetic-fields",
          search: "flux",
        }}
      />,
    );

    const browserSection = screen.getByLabelText(/search/i).closest("section");

    expect(browserSection).not.toBeNull();
    expect(screen.getByDisplayValue("flux")).toBeInTheDocument();
    expect(
      within(browserSection as HTMLElement).getByRole("heading", {
        name: /high flux, zero emf/i,
        level: 3,
      }),
    ).toBeInTheDocument();
    expect(
      within(browserSection as HTMLElement).queryByRole("heading", {
        name: /flat long shot/i,
        level: 3,
      }),
    ).not.toBeInTheDocument();
  });

  it("renders guided-path CTAs as canonical links for the first challenge and browser view", () => {
    render(<ChallengeDiscoveryHub index={challengeDiscoveryIndex} />);
    const trackTargets = resolveChallengeTrackCtaTargets(
      challengeDiscoveryIndex,
      "motion-and-circular-motion",
    );

    expect(trackTargets).not.toBeNull();
    expect(
      screen
        .getAllByRole("link", { name: /open first challenge/i })
        .some((link) => link.getAttribute("href") === trackTargets?.firstChallengeHref),
    ).toBe(true);
    expect(
      screen.queryByRole("link", { name: /show path challenges/i }),
    ).not.toBeInTheDocument();
  });

  it("removes the legacy section nav and keeps one obvious next action above the fold", () => {
    render(<ChallengeDiscoveryHub index={challengeDiscoveryIndex} />);

    expect(screen.queryByRole("navigation", { name: /challenge sections/i })).not.toBeInTheDocument();
    expect(screen.getByTestId("challenge-primary-cta")).toHaveAttribute(
      "href",
      expect.stringContaining("/concepts/"),
    );
    expect(
      screen.getByRole("link", { name: /browse starter paths/i }),
    ).toHaveAttribute("href", "#challenge-guided-paths");
  });

  it("keeps filtered challenge rows to one primary CTA", async () => {
    const user = userEvent.setup();

    render(<ChallengeDiscoveryHub index={challengeDiscoveryIndex} />);
    const browserSection = screen.getByLabelText(/search/i).closest("section");

    expect(browserSection).not.toBeNull();

    await replaceChallengeSearch(user, "flat long shot");

    const challengeHeading = await within(browserSection as HTMLElement).findByRole("heading", {
      name: /flat long shot/i,
      level: 3,
    });
    const challengeCard = challengeHeading.closest("article");

    expect(challengeCard).not.toBeNull();
    expect(within(challengeCard as HTMLElement).getAllByRole("link")).toHaveLength(1);
    expect(
      within(challengeCard as HTMLElement).getByRole("link", { name: /open challenge/i }),
    ).toHaveAttribute("href", "/concepts/projectile-motion?challenge=pm-ch-flat-far-shot#challenge-mode");
  });
});
