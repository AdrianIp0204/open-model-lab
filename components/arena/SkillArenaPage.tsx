"use client";

import { useMemo, useState } from "react";
import type {
  SkillTrial,
  TrialGraphOption,
  TrialLevel,
  TrialQuestion,
  TrialReveal,
} from "@/lib/arena/trial-schema";

const ARENA_PROGRESS_KEY = "oml-arena-progress.v1";

type SkillProgress = {
  highestLevel: number;
  xpEarned: number;
  bestScoreByLevel: Record<string, number>;
  completedAtByLevel: Record<string, string>;
  attemptsByLevel: Record<string, number>;
};

type ArenaProgress = {
  version: 1;
  totalXp: number;
  skills: Record<string, SkillProgress>;
};

type TrialResult = {
  level: TrialLevel;
  correctCount: number;
  passed: boolean;
  xpAwarded: number;
};

type SkillArenaPageProps = {
  trial: SkillTrial;
};

const emptyProgress: ArenaProgress = {
  version: 1,
  totalXp: 0,
  skills: {},
};

const graphAccentClasses: Record<NonNullable<TrialGraphOption["accent"]>, string> = {
  amber: "text-amber-500",
  coral: "text-coral-500",
  sky: "text-sky-500",
  teal: "text-teal-500",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeProgress(value: unknown): ArenaProgress {
  if (!isRecord(value) || value.version !== 1 || typeof value.totalXp !== "number") {
    return emptyProgress;
  }

  const rawSkills = isRecord(value.skills) ? value.skills : {};
  const skills: Record<string, SkillProgress> = {};

  for (const [skillId, rawSkill] of Object.entries(rawSkills)) {
    if (!isRecord(rawSkill)) {
      continue;
    }

    skills[skillId] = {
      highestLevel: typeof rawSkill.highestLevel === "number" ? rawSkill.highestLevel : 0,
      xpEarned: typeof rawSkill.xpEarned === "number" ? rawSkill.xpEarned : 0,
      bestScoreByLevel: isRecord(rawSkill.bestScoreByLevel)
        ? Object.fromEntries(
            Object.entries(rawSkill.bestScoreByLevel).filter(
              (entry): entry is [string, number] => typeof entry[1] === "number",
            ),
          )
        : {},
      completedAtByLevel: isRecord(rawSkill.completedAtByLevel)
        ? Object.fromEntries(
            Object.entries(rawSkill.completedAtByLevel).filter(
              (entry): entry is [string, string] => typeof entry[1] === "string",
            ),
          )
        : {},
      attemptsByLevel: isRecord(rawSkill.attemptsByLevel)
        ? Object.fromEntries(
            Object.entries(rawSkill.attemptsByLevel).filter(
              (entry): entry is [string, number] => typeof entry[1] === "number",
            ),
          )
        : {},
    };
  }

  return {
    version: 1,
    totalXp: Math.max(0, Math.floor(value.totalXp)),
    skills,
  };
}

function readProgress() {
  if (typeof window === "undefined") {
    return emptyProgress;
  }

  try {
    const raw = window.localStorage.getItem(ARENA_PROGRESS_KEY);
    return raw ? sanitizeProgress(JSON.parse(raw)) : emptyProgress;
  } catch {
    return emptyProgress;
  }
}

function writeProgress(progress: ArenaProgress) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(ARENA_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Local progress is best-effort. The trial should still work without storage.
  }
}

function getSkillProgress(progress: ArenaProgress, trialId: string): SkillProgress {
  return (
    progress.skills[trialId] ?? {
      highestLevel: 0,
      xpEarned: 0,
      bestScoreByLevel: {},
      completedAtByLevel: {},
      attemptsByLevel: {},
    }
  );
}

function buildGraphPath(option: TrialGraphOption) {
  const points: string[] = [];
  const width = 176;
  const height = 72;
  const centerY = height / 2;
  const xStep = width / 40;
  const amplitudePx = option.amplitude * 24;
  const phase = option.phase ?? 0;

  for (let index = 0; index <= 40; index += 1) {
    const x = index * xStep;
    const theta = (index / 40) * Math.PI * 2 * option.frequency + phase;
    const y = centerY - Math.sin(theta) * amplitudePx;
    points.push(`${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
  }

  return points.join(" ");
}

function GraphThumbnail({ option }: { option: TrialGraphOption }) {
  const accentClass = option.accent ? graphAccentClasses[option.accent] : "text-teal-500";

  return (
    <div className="rounded-2xl border border-line bg-paper/70 p-2">
      <div className="mb-1 flex items-center justify-between text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-500">
        <span>Graph {option.label}</span>
        <span>{option.frequency > 1.8 ? "fast" : option.amplitude > 0.95 ? "wide" : "steady"}</span>
      </div>
      <svg viewBox="0 0 176 72" role="img" aria-label={`Graph ${option.label}`} className="h-20 w-full">
        <line x1="0" y1="36" x2="176" y2="36" stroke="currentColor" strokeOpacity="0.16" />
        <path d={buildGraphPath(option)} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className={accentClass} />
      </svg>
    </div>
  );
}

function MiniOscillator({ reveal }: { reveal?: TrialReveal }) {
  const amplitude = reveal?.amplitude ?? 1.4;
  const omega = reveal?.omega ?? 1.8;
  const focus = reveal?.focus ?? "frequency";
  const massX = focus === "equilibrium" ? 0 : focus === "turning-point" ? 78 : Math.min(78, amplitude * 34);
  const trailWidth = Math.max(62, amplitude * 78);
  const waveOption: TrialGraphOption = {
    id: "reveal",
    label: "Reveal",
    amplitude: Math.min(1.1, amplitude / 2.2),
    frequency: Math.min(2.8, Math.max(0.8, omega / 1.25)),
    accent: focus === "amplitude" ? "amber" : focus === "turning-point" ? "coral" : "teal",
  };

  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#07111a] p-4 shadow-2xl shadow-black/25">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-500">Live reveal</p>
          <h2 className="text-lg font-semibold text-white">{reveal?.title ?? "Predict first"}</h2>
        </div>
        <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-semibold text-white/76">
          {focus === "frequency" ? "timing" : focus === "amplitude" ? "size" : focus === "phase" ? "start" : "instant"}
        </span>
      </div>

      <svg viewBox="0 0 360 164" className="h-44 w-full" role="img" aria-label="Simple harmonic motion reveal diagram">
        <defs>
          <linearGradient id="arenaTrail" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#60a5fa" stopOpacity="0.15" />
            <stop offset="0.5" stopColor="#2dd4bf" stopOpacity="0.35" />
            <stop offset="1" stopColor="#fbbf24" stopOpacity="0.18" />
          </linearGradient>
        </defs>
        <rect x="16" y="18" width="328" height="128" rx="24" fill="#0d1d2a" stroke="rgba(255,255,255,0.1)" />
        <line x1="180" y1="38" x2="180" y2="126" stroke="#f8fafc" strokeOpacity="0.22" strokeDasharray="6 7" />
        <line x1="74" y1="98" x2="286" y2="98" stroke="#f8fafc" strokeOpacity="0.18" />
        <rect x={180 - trailWidth / 2} y="89" width={trailWidth} height="18" rx="9" fill="url(#arenaTrail)" />
        <g transform={`translate(${180 + massX} 98)`}>
          <circle r="23" fill="#2dd4bf" opacity="0.18" />
          <circle r="15" fill="#2dd4bf" />
          <circle r="6" fill="#f8fafc" opacity="0.72" />
        </g>
        {focus === "turning-point" ? (
          <g transform={`translate(${180 + massX - 58} 62)`}>
            <path d="M50 0 L4 0" stroke="#fb7185" strokeWidth="5" strokeLinecap="round" />
            <path d="M4 0 L18 -9 M4 0 L18 9" stroke="#fb7185" strokeWidth="5" strokeLinecap="round" />
            <text x="-2" y="-18" fill="#fda4af" fontSize="13" fontWeight="700">acceleration inward</text>
          </g>
        ) : null}
        {focus === "equilibrium" ? (
          <text x="192" y="58" fill="#5eead4" fontSize="14" fontWeight="700">center crossing: speed is high</text>
        ) : null}
      </svg>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_12rem] lg:items-center">
        <p className="text-sm leading-6 text-white/74">{reveal?.caption ?? "Choose an answer to reveal the physics."}</p>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-2 text-white">
          <svg viewBox="0 0 176 72" aria-hidden="true" className="h-16 w-full">
            <line x1="0" y1="36" x2="176" y2="36" stroke="currentColor" strokeOpacity="0.16" />
            <path d={buildGraphPath(waveOption)} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-teal-500" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function scoreLevel(level: TrialLevel, answers: Record<string, string>) {
  return level.questions.reduce(
    (total, question) => total + (answers[question.id] === question.correctChoiceId ? 1 : 0),
    0,
  );
}

function buildShareText(result: TrialResult, trial: SkillTrial) {
  const status = result.passed ? "cleared" : "tried";
  return `I ${status} ${trial.title} ${result.level.label}: ${result.correctCount}/${result.level.passRule.total}. Can you beat it?`;
}

export function SkillArenaPage({ trial }: SkillArenaPageProps) {
  const [progress, setProgressState] = useState<ArenaProgress>(() => readProgress());
  const [activeLevelIndex, setActiveLevelIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<TrialResult | null>(null);
  const [shareState, setShareState] = useState<"idle" | "copied" | "failed">("idle");

  function setProgress(updater: (current: ArenaProgress) => ArenaProgress) {
    setProgressState((current) => {
      const next = updater(current);
      writeProgress(next);
      return next;
    });
  }

  const skillProgress = useMemo(
    () => getSkillProgress(progress, trial.id),
    [progress, trial.id],
  );
  const activeLevel = trial.levels[activeLevelIndex] ?? trial.levels[0];
  const activeQuestion = activeLevel.questions[questionIndex] ?? activeLevel.questions[0];
  const selectedChoiceId = answers[activeQuestion.id] ?? null;
  const selectedChoice = activeQuestion.choices.find((choice) => choice.id === selectedChoiceId) ?? null;
  const answered = Boolean(selectedChoiceId);
  const isCorrect = selectedChoiceId === activeQuestion.correctChoiceId;
  const levelScore = scoreLevel(activeLevel, answers);
  const questionProgress = `${questionIndex + 1}/${activeLevel.questions.length}`;

  function isLevelUnlocked(level: TrialLevel) {
    return level.level <= Math.max(1, skillProgress.highestLevel + 1);
  }

  function resetLevel(index: number) {
    setActiveLevelIndex(index);
    setQuestionIndex(0);
    setAnswers({});
    setResult(null);
    setShareState("idle");
  }

  function selectAnswer(choiceId: string) {
    if (answered || result) {
      return;
    }

    setAnswers((current) => ({ ...current, [activeQuestion.id]: choiceId }));
  }

  function finishLevel() {
    const correctCount = scoreLevel(activeLevel, answers);
    const passed = correctCount >= activeLevel.passRule.correctRequired;
    const levelKey = String(activeLevel.level);
    let xpAwarded = 0;

    setProgress((current) => {
      const currentSkill = getSkillProgress(current, trial.id);
      const previousBest = currentSkill.bestScoreByLevel[levelKey] ?? 0;
      const previousAttempts = currentSkill.attemptsByLevel[levelKey] ?? 0;
      const shouldAwardXp = passed && currentSkill.highestLevel < activeLevel.level;
      xpAwarded = shouldAwardXp ? activeLevel.xpAward : 0;

      return {
        version: 1,
        totalXp: current.totalXp + xpAwarded,
        skills: {
          ...current.skills,
          [trial.id]: {
            highestLevel: passed
              ? Math.max(currentSkill.highestLevel, activeLevel.level)
              : currentSkill.highestLevel,
            xpEarned: currentSkill.xpEarned + xpAwarded,
            bestScoreByLevel: {
              ...currentSkill.bestScoreByLevel,
              [levelKey]: Math.max(previousBest, correctCount),
            },
            completedAtByLevel: passed
              ? {
                  ...currentSkill.completedAtByLevel,
                  [levelKey]: new Date().toISOString(),
                }
              : currentSkill.completedAtByLevel,
            attemptsByLevel: {
              ...currentSkill.attemptsByLevel,
              [levelKey]: previousAttempts + 1,
            },
          },
        },
      };
    });

    setResult({ level: activeLevel, correctCount, passed, xpAwarded });
  }

  function goNext() {
    if (questionIndex >= activeLevel.questions.length - 1) {
      finishLevel();
      return;
    }

    setQuestionIndex((current) => current + 1);
    setShareState("idle");
  }

  async function shareResult() {
    const shareResultData = result ?? {
      level: activeLevel,
      correctCount: levelScore,
      passed: false,
      xpAwarded: 0,
    };
    const url = new URL(typeof window === "undefined" ? "https://openmodellab.com/arena/shm" : window.location.href);
    url.searchParams.set("challenge", `${trial.slug}-level-${shareResultData.level.level}`);
    const text = buildShareText(shareResultData, trial);
    const browserNavigator = typeof window === "undefined" ? null : window.navigator;
    const shareNavigator = browserNavigator as (Navigator & {
      share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
    }) | null;

    try {
      if (typeof shareNavigator?.share === "function") {
        await shareNavigator.share({ title: trial.title, text, url: url.toString() });
      } else if (browserNavigator?.clipboard) {
        await browserNavigator.clipboard.writeText(`${text}\n${url.toString()}`);
      }
      setShareState("copied");
    } catch {
      try {
        if (browserNavigator?.clipboard) {
          await browserNavigator.clipboard.writeText(`${text}\n${url.toString()}`);
          setShareState("copied");
          return;
        }
      } catch {
        setShareState("failed");
        return;
      }
      setShareState("failed");
    }
  }

  function answerFeedback(question: TrialQuestion) {
    if (!selectedChoiceId) {
      return null;
    }

    return isCorrect
      ? question.feedback.correct
      : question.feedback.wrongByChoice[selectedChoiceId] ?? "Not quite. Try reading the reveal and replay the pattern.";
  }

  return (
    <main className="min-h-screen overflow-hidden bg-transparent text-ink-950">
      <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-3 px-3 py-3 sm:gap-5 sm:px-6 sm:py-5 lg:min-h-screen lg:px-8 lg:py-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(circle_at_30%_10%,rgba(45,212,191,0.22),transparent_34%),radial-gradient(circle_at_80%_5%,rgba(251,191,36,0.14),transparent_30%)]" />

        <header className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-line bg-paper/72 p-2.5 shadow-surface backdrop-blur-xl sm:rounded-[2rem] sm:p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-teal-500/30 bg-teal-500/12 text-lg font-black text-teal-500 sm:h-12 sm:w-12 sm:text-xl">
              Ω
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-500">Concept Arena</p>
              <h1 className="truncate text-lg font-semibold tracking-tight text-ink-950 sm:text-2xl">
                {trial.title}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            <span suppressHydrationWarning className="rounded-full border border-line bg-paper-strong px-2.5 py-1.5 text-ink-700 sm:px-3 sm:py-2">
              {progress.totalXp} XP
            </span>
            <span suppressHydrationWarning className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-amber-500 sm:px-3 sm:py-2">
              Best Lv. {skillProgress.highestLevel}
            </span>
          </div>
        </header>

        <div className="grid flex-1 gap-5 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
          <aside className="order-2 space-y-4 rounded-[2rem] border border-line bg-paper/70 p-4 shadow-surface backdrop-blur-xl lg:order-1 lg:sticky lg:top-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">Trial route</p>
              <h2 className="mt-1 text-2xl font-semibold leading-tight text-ink-950">{trial.subtitle}</h2>
              <p className="mt-2 text-sm leading-6 text-ink-700">{trial.description}</p>
            </div>

            <div className="space-y-2">
              {trial.levels.map((level, index) => {
                const unlocked = isLevelUnlocked(level);
                const active = activeLevel.level === level.level;
                const bestScore = skillProgress.bestScoreByLevel[String(level.level)];
                return (
                  <button
                    key={level.level}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => resetLevel(index)}
                    className={[
                      "w-full rounded-2xl border p-3 text-left transition",
                      active
                        ? "border-teal-500/50 bg-teal-500/12 shadow-lg shadow-teal-950/20"
                        : "border-line bg-paper-strong/76 hover:border-teal-500/35",
                      unlocked ? "text-ink-950" : "cursor-not-allowed opacity-50",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">{level.label}</span>
                      <span className="rounded-full bg-paper px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-ink-600">
                        +{level.xpAward} XP
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-ink-950">{level.title}</p>
                    <p className="mt-1 text-xs leading-5 text-ink-600">
                      {bestScore === undefined
                        ? `${level.passRule.correctRequired}/${level.passRule.total} to pass`
                        : `Best: ${bestScore}/${level.passRule.total}`}
                    </p>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => void shareResult()}
              className="w-full rounded-2xl border border-line bg-paper-strong px-4 py-3 text-sm font-semibold text-ink-950 transition hover:border-teal-500/40"
            >
              {shareState === "copied" ? "Challenge link copied" : "Share challenge link"}
            </button>
          </aside>

          <section className="order-1 grid gap-5 xl:grid-cols-[minmax(0,1fr)_25rem] xl:items-start lg:order-2">
            <div className="space-y-5">
              <div className="rounded-[1.5rem] border border-line bg-paper/82 p-3 shadow-surface backdrop-blur-xl sm:rounded-[2rem] sm:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-500">
                      {activeLevel.label} · Question {questionProgress} · Score {levelScore}/{activeLevel.questions.length}
                    </p>
                    <h2 className="mt-1 hidden text-xl font-semibold tracking-tight text-ink-950 sm:block sm:text-3xl">
                      {activeLevel.title}
                    </h2>
                  </div>
                  <div className="hidden rounded-2xl border border-line bg-paper-strong px-4 py-3 text-right sm:block">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-500">Current score</p>
                    <p className="text-xl font-semibold text-ink-950">
                      {levelScore}/{activeLevel.questions.length}
                    </p>
                  </div>
                </div>

                {result ? (
                  <ResultPanel
                    result={result}
                    totalLevels={trial.levels.length}
                    onRetry={() => resetLevel(activeLevelIndex)}
                    onNextLevel={() => {
                      const nextIndex = Math.min(activeLevelIndex + 1, trial.levels.length - 1);
                      resetLevel(nextIndex);
                    }}
                    onShare={() => void shareResult()}
                    shareState={shareState}
                  />
                ) : (
                  <article className="space-y-5">
                    <div className="rounded-[1.25rem] border border-line bg-paper-strong/80 p-3 sm:rounded-[1.5rem] sm:p-5">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-teal-500">
                          {activeQuestion.eyebrow}
                        </span>
                        <span className="rounded-full border border-line bg-paper px-3 py-1 text-xs font-semibold text-ink-600">
                          Tap an answer. No typing.
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold leading-tight text-ink-950 sm:text-3xl">
                        {activeQuestion.prompt}
                      </h3>
                      {activeQuestion.setup ? (
                        <p className="mt-3 text-base leading-7 text-ink-700">{activeQuestion.setup}</p>
                      ) : null}
                    </div>

                    {activeQuestion.graphOptions ? (
                      <div className="grid gap-3 sm:grid-cols-3">
                        {activeQuestion.graphOptions.map((option) => (
                          <GraphThumbnail key={option.id} option={option} />
                        ))}
                      </div>
                    ) : null}

                    <div className="grid gap-2.5 sm:gap-3">
                      {activeQuestion.choices.map((choice) => {
                        const selected = selectedChoiceId === choice.id;
                        const correctChoice = activeQuestion.correctChoiceId === choice.id;
                        const showState = answered && (selected || correctChoice);
                        return (
                          <button
                            key={choice.id}
                            type="button"
                            onClick={() => selectAnswer(choice.id)}
                            className={[
                              "min-h-12 rounded-2xl border px-3.5 py-2.5 text-left text-sm font-semibold transition sm:min-h-16 sm:px-4 sm:py-3 sm:text-lg",
                              showState && correctChoice
                                ? "border-teal-500/60 bg-teal-500/14 text-ink-950"
                                : showState && selected
                                  ? "border-coral-500/60 bg-coral-500/12 text-ink-950"
                                  : "border-line bg-paper-strong/86 text-ink-950 hover:border-teal-500/40 hover:bg-paper-strong",
                            ].join(" ")}
                          >
                            <span className="mr-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-paper text-sm font-black uppercase text-ink-700">
                              {choice.id}
                            </span>
                            {choice.label}
                          </button>
                        );
                      })}
                    </div>

                    {answered ? (
                      <div className="space-y-3">
                        <div className="rounded-[1.5rem] border border-line bg-paper-strong p-4">
                          <p className={isCorrect ? "font-semibold text-teal-500" : "font-semibold text-coral-500"}>
                            {isCorrect ? "Correct" : "Not quite"}
                          </p>
                          <p className="mt-2 text-base leading-7 text-ink-700">{answerFeedback(activeQuestion)}</p>
                          {!isCorrect && selectedChoice?.misconception ? (
                            <p className="mt-2 text-sm leading-6 text-ink-600">
                              Misconception caught: {selectedChoice.misconception}.
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-line bg-paper/78 p-3">
                      <p className="text-sm font-semibold text-ink-600">
                        Pass this level with {activeLevel.passRule.correctRequired}/{activeLevel.passRule.total}.
                      </p>
                      <button
                        type="button"
                        disabled={!answered}
                        onClick={goNext}
                        className={[
                          "rounded-full px-6 py-3 text-sm font-black shadow-lg transition",
                          answered
                            ? "bg-teal-500 text-[#041014] shadow-teal-950/20 hover:bg-teal-600"
                            : "cursor-not-allowed border border-line bg-paper-strong text-ink-500 shadow-none",
                        ].join(" ")}
                      >
                        {!answered
                          ? "Choose an answer"
                          : questionIndex >= activeLevel.questions.length - 1
                            ? "Finish level"
                            : "Next card"}
                      </button>
                    </div>

                    {answered ? (
                      <div className="xl:hidden">
                        <MiniOscillator reveal={activeQuestion.reveal} />
                      </div>
                    ) : null}
                  </article>
                )}
              </div>
            </div>

            <div className="space-y-5 xl:sticky xl:top-6">
              <div className="hidden xl:block">
                <MiniOscillator reveal={answered ? activeQuestion.reveal : undefined} />
              </div>
              <div className="rounded-[2rem] border border-line bg-paper/76 p-4 shadow-surface backdrop-blur-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-500">How to win</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-ink-700">
                  <li>• Pass a level with 4/5 correct answers.</li>
                  <li>• XP is awarded only when your skill level increases.</li>
                  <li>• Wrong answers show the exact misconception to fix.</li>
                  <li>• Copy a challenge link and see who can beat your score.</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function ResultPanel({
  result,
  totalLevels,
  onRetry,
  onNextLevel,
  onShare,
  shareState,
}: {
  result: TrialResult;
  totalLevels: number;
  onRetry: () => void;
  onNextLevel: () => void;
  onShare: () => void;
  shareState: "idle" | "copied" | "failed";
}) {
  const canContinue = result.passed && result.level.level < totalLevels;

  return (
    <div className="rounded-[2rem] border border-line bg-paper-strong p-5 sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-500">Level result</p>
      <h3 className="mt-2 text-3xl font-semibold tracking-tight text-ink-950 sm:text-5xl">
        {result.passed ? `${result.level.label} cleared` : "Not cleared yet"}
      </h3>
      <p className="mt-3 text-lg leading-8 text-ink-700">
        You scored {result.correctCount}/{result.level.passRule.total}. Required: {result.level.passRule.correctRequired}/{result.level.passRule.total}.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-paper p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">XP awarded</p>
          <p className="mt-1 text-2xl font-black text-amber-500">+{result.xpAwarded}</p>
        </div>
        <div className="rounded-2xl border border-line bg-paper p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">Skill proof</p>
          <p className="mt-1 text-2xl font-black text-teal-500">{result.passed ? "valid" : "retry"}</p>
        </div>
        <div className="rounded-2xl border border-line bg-paper p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">Mode</p>
          <p className="mt-1 text-2xl font-black text-sky-500">arena</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {canContinue ? (
          <button type="button" onClick={onNextLevel} className="rounded-full bg-teal-500 px-6 py-3 text-sm font-black text-[#041014] transition hover:bg-teal-600">
            Unlock next level
          </button>
        ) : null}
        <button type="button" onClick={onRetry} className="rounded-full border border-line bg-paper px-6 py-3 text-sm font-bold text-ink-950 transition hover:border-teal-500/40">
          Retry level
        </button>
        <button type="button" onClick={onShare} className="rounded-full border border-line bg-paper px-6 py-3 text-sm font-bold text-ink-950 transition hover:border-amber-500/40">
          {shareState === "copied" ? "Copied" : shareState === "failed" ? "Copy failed" : "Share result"}
        </button>
      </div>
    </div>
  );
}
