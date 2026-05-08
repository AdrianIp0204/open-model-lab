export type TrialQuestionKind = "prediction" | "graph-choice" | "misconception";

export type TrialGraphOption = {
  id: string;
  label: string;
  amplitude: number;
  frequency: number;
  phase?: number;
  accent?: "teal" | "amber" | "coral" | "sky";
};

export type TrialReveal = {
  title: string;
  caption: string;
  amplitude?: number;
  omega?: number;
  phase?: number;
  focus?: "amplitude" | "frequency" | "phase" | "turning-point" | "equilibrium";
};

export type TrialChoice = {
  id: string;
  label: string;
  misconception?: string;
};

export type TrialQuestion = {
  id: string;
  kind: TrialQuestionKind;
  prompt: string;
  eyebrow: string;
  setup?: string;
  choices: TrialChoice[];
  correctChoiceId: string;
  feedback: {
    correct: string;
    wrongByChoice: Record<string, string>;
  };
  reveal?: TrialReveal;
  graphOptions?: TrialGraphOption[];
};

export type TrialLevel = {
  level: 1 | 2 | 3 | 4;
  label: string;
  title: string;
  description: string;
  xpAward: number;
  passRule: {
    correctRequired: number;
    total: number;
  };
  questions: TrialQuestion[];
};

export type SkillTrial = {
  id: string;
  slug: string;
  conceptSlug: string;
  title: string;
  subtitle: string;
  description: string;
  estimatedSeconds: number;
  levels: TrialLevel[];
};
