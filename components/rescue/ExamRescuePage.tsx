"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ExamRescuePlan, ExamRescueProgress, RescuePhase, RescueQuestion } from "@/lib/rescue/exam-rescue-schema";
import {
  EXAM_RESCUE_PROGRESS_KEY,
  applyAttemptToProgress,
  createInitialExamRescueProgress,
  getRescueScore,
  getTopicState,
} from "@/lib/rescue/exam-rescue-schema";

type ExamRescuePageProps = {
  plan: ExamRescuePlan;
};

const phaseOrder: RescuePhase[] = ["goal", "diagnose", "rescue", "drill", "sync"];
const phaseLabels: Record<RescuePhase, string> = {
  goal: "Goal",
  diagnose: "Diagnose",
  rescue: "Rescue",
  drill: "Drill",
  sync: "Save",
};

function readStoredProgress(plan: ExamRescuePlan) {
  if (typeof window === "undefined") {
    return createInitialExamRescueProgress(plan);
  }

  try {
    const raw = window.localStorage.getItem(EXAM_RESCUE_PROGRESS_KEY);
    if (!raw) {
      return createInitialExamRescueProgress(plan);
    }

    const parsed = JSON.parse(raw) as Partial<ExamRescueProgress>;
    if (parsed.version !== 1 || parsed.planId !== plan.id || typeof parsed.topicStates !== "object") {
      return createInitialExamRescueProgress(plan);
    }

    return {
      ...createInitialExamRescueProgress(plan),
      ...parsed,
      topicStates: {
        ...createInitialExamRescueProgress(plan).topicStates,
        ...parsed.topicStates,
      },
    } satisfies ExamRescueProgress;
  } catch {
    return createInitialExamRescueProgress(plan);
  }
}

function writeStoredProgress(progress: ExamRescueProgress) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(EXAM_RESCUE_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Local rescue state is best-effort; the page should keep working without storage.
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "green":
      return "Ready";
    case "yellow":
      return "Needs drill";
    case "red":
      return "Rescue now";
    default:
      return "Untested";
  }
}

function statusClasses(status: string) {
  switch (status) {
    case "green":
      return "border-teal-500/40 bg-teal-500/12 text-teal-700";
    case "yellow":
      return "border-amber-500/40 bg-amber-500/12 text-amber-700";
    case "red":
      return "border-coral-500/40 bg-coral-500/12 text-coral-700";
    default:
      return "border-line bg-paper-strong text-ink-600";
  }
}

function getFeedback(question: RescueQuestion, selectedChoiceId: string) {
  if (selectedChoiceId === question.correctChoiceId) {
    return question.markSchemeNote;
  }

  return question.wrongFeedback[selectedChoiceId] ?? "Not quite. Check the mark-scheme note, then try the drill.";
}

function findFirstWeakTopic(progress: ExamRescueProgress, plan: ExamRescuePlan) {
  return (
    plan.topics.find((topic) => {
      const status = getTopicState(progress, topic.slug).status;
      return status === "red" || status === "yellow";
    }) ?? plan.topics[0]
  );
}

export function ExamRescuePage({ plan }: ExamRescuePageProps) {
  const [progress, setProgressState] = useState<ExamRescueProgress>(() => readStoredProgress(plan));
  const [activeDiagnosticIndex, setActiveDiagnosticIndex] = useState(0);
  const [selectedByQuestionId, setSelectedByQuestionId] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle");

  function setProgress(updater: (current: ExamRescueProgress) => ExamRescueProgress) {
    setProgressState((current) => {
      const next = updater(current);
      writeStoredProgress(next);
      return next;
    });
  }

  const score = useMemo(() => getRescueScore(progress), [progress]);
  const selectedTopic = plan.topics.find((topic) => topic.slug === progress.selectedTopicSlug) ?? plan.topics[0];
  const activeDiagnostic = plan.diagnostic[activeDiagnosticIndex] ?? plan.diagnostic[0];
  const activeDrill =
    plan.drill.find((question) => question.topicSlug === selectedTopic?.slug) ??
    plan.drill[0] ??
    plan.drill[0];
  const activeDiagnosticSelection = selectedByQuestionId[activeDiagnostic.id];
  const activeDrillSelection = activeDrill ? selectedByQuestionId[activeDrill.id] : undefined;

  function updatePhase(phase: RescuePhase) {
    setProgress((current) => ({ ...current, activePhase: phase, updatedAt: new Date().toISOString() }));
  }

  function answerQuestion(question: RescueQuestion, choiceId: string) {
    if (selectedByQuestionId[question.id]) {
      return;
    }

    setSelectedByQuestionId((current) => ({ ...current, [question.id]: choiceId }));
    setSaveState("idle");
    setProgress((current) => applyAttemptToProgress(current, question, choiceId));
  }

  function nextDiagnostic() {
    if (activeDiagnosticIndex >= plan.diagnostic.length - 1) {
      const weakTopic = findFirstWeakTopic(progress, plan);
      setProgress((current) => ({
        ...current,
        activePhase: "rescue",
        selectedTopicSlug: weakTopic.slug,
        updatedAt: new Date().toISOString(),
      }));
      return;
    }

    setActiveDiagnosticIndex((current) => current + 1);
  }

  function saveNow() {
    writeStoredProgress(progress);
    setSaveState("saved");
  }

  return (
    <main className="min-h-screen bg-transparent text-ink-950">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <header className="rounded-[2rem] border border-line bg-paper/82 p-4 shadow-surface backdrop-blur-xl sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral-500">Exam Rescue v0</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink-950 sm:text-5xl">
                {plan.title}
              </h1>
              <p className="mt-3 text-base leading-7 text-ink-700 sm:text-lg">{plan.learnerPromise}</p>
            </div>
            <div className="rounded-2xl border border-line bg-paper-strong p-4 text-sm text-ink-700">
              <p className="font-semibold text-ink-950">{plan.examBoard}</p>
              <p>{plan.qualification}</p>
              <p>{plan.unitCode} · {plan.unitTitle}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-5">
            {phaseOrder.map((phase, index) => {
              const active = progress.activePhase === phase;
              return (
                <button
                  key={phase}
                  type="button"
                  onClick={() => updatePhase(phase)}
                  className={[
                    "min-h-11 rounded-2xl border px-3 py-2 text-left text-sm font-semibold transition",
                    active
                      ? "border-coral-500/50 bg-coral-500/12 text-ink-950"
                      : "border-line bg-paper-strong text-ink-600 hover:border-coral-500/35",
                  ].join(" ")}
                >
                  <span className="mr-2 text-xs text-ink-500">{index + 1}</span>
                  {phaseLabels[phase]}
                </button>
              );
            })}
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <section className="space-y-5">
            {progress.activePhase === "goal" ? (
              <GoalStep plan={plan} progress={progress} setProgress={setProgress} onContinue={() => updatePhase("diagnose")} />
            ) : null}

            {progress.activePhase === "diagnose" && activeDiagnostic ? (
              <QuestionStep
                title="Rapid diagnosis"
                kicker={`Question ${activeDiagnosticIndex + 1}/${plan.diagnostic.length}`}
                question={activeDiagnostic}
                selectedChoiceId={activeDiagnosticSelection}
                onAnswer={(choiceId) => answerQuestion(activeDiagnostic, choiceId)}
                onNext={nextDiagnostic}
                nextLabel={activeDiagnosticIndex >= plan.diagnostic.length - 1 ? "Build rescue plan" : "Next diagnostic"}
              />
            ) : null}

            {progress.activePhase === "rescue" && selectedTopic ? (
              <RescueStep
                topic={selectedTopic}
                topicState={getTopicState(progress, selectedTopic.slug)}
                onContinue={() => updatePhase("drill")}
              />
            ) : null}

            {progress.activePhase === "drill" && activeDrill ? (
              <QuestionStep
                title="Exam-style drill"
                kicker={selectedTopic?.title ?? "Selected topic"}
                question={activeDrill}
                selectedChoiceId={activeDrillSelection}
                onAnswer={(choiceId) => answerQuestion(activeDrill, choiceId)}
                onNext={() => updatePhase("sync")}
                nextLabel="Save rescue state"
              />
            ) : null}

            {progress.activePhase === "sync" ? (
              <SyncStep progress={progress} saveState={saveState} onSave={saveNow} />
            ) : null}
          </section>

          <aside className="space-y-5 lg:sticky lg:top-6">
            <DashboardCard plan={plan} progress={progress} score={score} setProgress={setProgress} />
            <DatabaseCard />
          </aside>
        </div>
      </section>
    </main>
  );
}

function GoalStep({
  plan,
  progress,
  setProgress,
  onContinue,
}: {
  plan: ExamRescuePlan;
  progress: ExamRescueProgress;
  setProgress: (updater: (current: ExamRescueProgress) => ExamRescueProgress) => void;
  onContinue: () => void;
}) {
  return (
    <article className="rounded-[2rem] border border-line bg-paper/82 p-5 shadow-surface backdrop-blur-xl sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-500">Start with a real exam goal</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink-950 sm:text-4xl">
        Pick the target, then diagnose before teaching.
      </h2>
      <p className="mt-3 max-w-3xl text-base leading-7 text-ink-700">
        This is not a generic course homepage. The first task is to turn a unit into a rescue plan: weak topics, next action, and evidence that the learner can answer exam-style prompts.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="rounded-2xl border border-line bg-paper-strong p-4">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">Exam date</span>
          <input
            type="date"
            value={progress.examDate}
            onChange={(event) =>
              setProgress((current) => ({ ...current, examDate: event.target.value, updatedAt: new Date().toISOString() }))
            }
            className="mt-2 min-h-11 w-full rounded-xl border border-line bg-paper px-3 text-base font-semibold text-ink-950"
          />
        </label>
        <label className="rounded-2xl border border-line bg-paper-strong p-4">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">Target grade</span>
          <select
            value={progress.targetGrade}
            onChange={(event) =>
              setProgress((current) => ({ ...current, targetGrade: event.target.value, updatedAt: new Date().toISOString() }))
            }
            className="mt-2 min-h-11 w-full rounded-xl border border-line bg-paper px-3 text-base font-semibold text-ink-950"
          >
            {['A*', 'A', 'B', 'C', 'Pass rescue'].map((grade) => (
              <option key={grade}>{grade}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 rounded-2xl border border-line bg-paper-strong p-4 text-sm leading-6 text-ink-700">
        <p className="font-semibold text-ink-950">Syllabus anchor</p>
        <p>{plan.unitCode}: {plan.unitTitle}</p>
        <a href={plan.sourceUrl} className="mt-2 inline-flex font-semibold text-teal-600 hover:text-teal-700" target="_blank" rel="noreferrer">
          Check Pearson specification
        </a>
      </div>

      <button type="button" onClick={onContinue} className="mt-5 rounded-full bg-coral-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-coral-950/20 transition hover:bg-coral-600">
        Start diagnostic
      </button>
    </article>
  );
}

function QuestionStep({
  title,
  kicker,
  question,
  selectedChoiceId,
  onAnswer,
  onNext,
  nextLabel,
}: {
  title: string;
  kicker: string;
  question: RescueQuestion;
  selectedChoiceId?: string;
  onAnswer: (choiceId: string) => void;
  onNext: () => void;
  nextLabel: string;
}) {
  const answered = Boolean(selectedChoiceId);
  const correct = selectedChoiceId === question.correctChoiceId;

  return (
    <article className="rounded-[2rem] border border-line bg-paper/86 p-4 shadow-surface backdrop-blur-xl sm:p-6">
      <div className="rounded-[1.5rem] border border-line bg-paper-strong p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral-500">{kicker}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink-950 sm:text-4xl">{title}</h2>
        <h3 className="mt-4 text-xl font-semibold leading-tight text-ink-950 sm:text-2xl">{question.prompt}</h3>
        {question.setup ? <p className="mt-2 text-base leading-7 text-ink-700">{question.setup}</p> : null}
      </div>

      <div className="mt-4 grid gap-3">
        {question.choices.map((choice) => {
          const selected = selectedChoiceId === choice.id;
          const isCorrectChoice = question.correctChoiceId === choice.id;
          const reveal = answered && (selected || isCorrectChoice);
          return (
            <button
              key={choice.id}
              type="button"
              disabled={answered}
              onClick={() => onAnswer(choice.id)}
              className={[
                "min-h-14 rounded-2xl border px-4 py-3 text-left text-base font-semibold transition",
                reveal && isCorrectChoice
                  ? "border-teal-500/60 bg-teal-500/14 text-ink-950"
                  : reveal && selected
                    ? "border-coral-500/60 bg-coral-500/12 text-ink-950"
                    : "border-line bg-paper-strong text-ink-950 hover:border-coral-500/40",
                answered ? "cursor-default" : "",
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
        <div className="mt-4 rounded-[1.5rem] border border-line bg-paper-strong p-4">
          <p className={correct ? "font-semibold text-teal-600" : "font-semibold text-coral-600"}>
            {correct ? "Correct" : "Rescue point found"}
          </p>
          <p className="mt-2 text-base leading-7 text-ink-700">{getFeedback(question, selectedChoiceId ?? "")}</p>
        </div>
      ) : null}

      <button
        type="button"
        disabled={!answered}
        onClick={onNext}
        className="mt-5 rounded-full bg-coral-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-coral-950/20 transition hover:bg-coral-600 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {answered ? nextLabel : "Choose an answer"}
      </button>
    </article>
  );
}

function RescueStep({
  topic,
  topicState,
  onContinue,
}: {
  topic: ExamRescuePlan["topics"][number];
  topicState: ReturnType<typeof getTopicState>;
  onContinue: () => void;
}) {
  return (
    <article className="rounded-[2rem] border border-line bg-paper/86 p-5 shadow-surface backdrop-blur-xl sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-500">Micro rescue lesson</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink-950 sm:text-5xl">{topic.title}</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-line bg-paper-strong p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">Exam skill</p>
          <p className="mt-2 text-sm leading-6 text-ink-700">{topic.examSkill}</p>
        </div>
        <div className="rounded-2xl border border-coral-500/30 bg-coral-500/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-coral-600">Common failure</p>
          <p className="mt-2 text-sm leading-6 text-ink-700">{topic.commonFailure}</p>
        </div>
        <div className="rounded-2xl border border-teal-500/30 bg-teal-500/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-600">Rescue move</p>
          <p className="mt-2 text-sm leading-6 text-ink-700">{topic.rescueMove}</p>
        </div>
      </div>

      {topic.equations?.length ? (
        <div className="mt-4 rounded-[1.5rem] border border-line bg-[#07111a] p-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">Formula memory is not enough</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {topic.equations.map((equation) => (
              <span key={equation} className="rounded-full border border-white/10 bg-white/8 px-3 py-2 font-mono text-sm">
                {equation}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <p className="mt-4 text-sm leading-6 text-ink-600">
        Current evidence: {topicState.diagnosticCorrect}/{topicState.diagnosticTotal} diagnostic, {topicState.drillCorrect}/{topicState.drillTotal} drill.
      </p>
      <button type="button" onClick={onContinue} className="mt-5 rounded-full bg-coral-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-coral-950/20 transition hover:bg-coral-600">
        Drill this topic
      </button>
    </article>
  );
}

function SyncStep({ progress, saveState, onSave }: { progress: ExamRescueProgress; saveState: "idle" | "saved"; onSave: () => void }) {
  return (
    <article className="rounded-[2rem] border border-line bg-paper/86 p-5 shadow-surface backdrop-blur-xl sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-500">Save and sync</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink-950 sm:text-5xl">Keep the rescue plan.</h2>
      <p className="mt-3 max-w-3xl text-base leading-7 text-ink-700">
        V0 saves locally now. The database contract is ready as a migration file, but production sync should wait until the schema is reviewed and applied deliberately.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={onSave} className="rounded-full bg-teal-500 px-6 py-3 text-sm font-black text-[#041014] shadow-lg shadow-teal-950/20 transition hover:bg-teal-600">
          {saveState === "saved" ? "Saved locally" : "Save locally"}
        </button>
        <Link href="/account" className="rounded-full border border-line bg-paper-strong px-6 py-3 text-sm font-bold text-ink-950 transition hover:border-teal-500/40">
          Sign in page
        </Link>
      </div>
      <pre className="mt-5 overflow-auto rounded-2xl border border-line bg-paper-strong p-4 text-xs leading-5 text-ink-700">
        {JSON.stringify(
          {
            planId: progress.planId,
            examDate: progress.examDate,
            targetGrade: progress.targetGrade,
            attempts: progress.attempts.length,
            updatedAt: progress.updatedAt,
          },
          null,
          2,
        )}
      </pre>
    </article>
  );
}

function DashboardCard({
  plan,
  progress,
  score,
  setProgress,
}: {
  plan: ExamRescuePlan;
  progress: ExamRescueProgress;
  score: ReturnType<typeof getRescueScore>;
  setProgress: (updater: (current: ExamRescueProgress) => ExamRescueProgress) => void;
}) {
  return (
    <div className="rounded-[2rem] border border-line bg-paper/82 p-4 shadow-surface backdrop-blur-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral-500">Rescue dashboard</p>
      <h2 className="mt-1 text-2xl font-semibold text-ink-950">{score.green}/{score.total} ready</h2>
      <p className="mt-2 text-sm leading-6 text-ink-600">
        Red topics become the next rescue lesson. Yellow topics need drill. Green topics are ready for timed practice.
      </p>
      <div className="mt-4 space-y-2">
        {plan.topics.map((topic) => {
          const topicState = getTopicState(progress, topic.slug);
          return (
            <button
              key={topic.slug}
              type="button"
              onClick={() =>
                setProgress((current) => ({
                  ...current,
                  selectedTopicSlug: topic.slug,
                  activePhase: "rescue",
                  updatedAt: new Date().toISOString(),
                }))
              }
              className="w-full rounded-2xl border border-line bg-paper-strong p-3 text-left transition hover:border-coral-500/35"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-ink-950">{topic.title}</span>
                <span className={["rounded-full border px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em]", statusClasses(topicState.status)].join(" ")}>{statusLabel(topicState.status)}</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-ink-600">{topic.examSkill}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DatabaseCard() {
  return (
    <div className="rounded-[2rem] border border-line bg-paper/82 p-4 shadow-surface backdrop-blur-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-500">Database shape</p>
      <h2 className="mt-1 text-xl font-semibold text-ink-950">Ready for real sync</h2>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-ink-700">
        <li>• profile</li>
        <li>• exam goal</li>
        <li>• topic state</li>
        <li>• question attempts</li>
        <li>• rescue sessions</li>
      </ul>
      <p className="mt-3 text-xs leading-5 text-ink-500">
        Migration file is included for review; it is not applied to production automatically.
      </p>
    </div>
  );
}
