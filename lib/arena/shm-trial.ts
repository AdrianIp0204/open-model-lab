import type { SkillTrial } from "./trial-schema";

export const shmTrial: SkillTrial = {
  id: "shm-arena-trial",
  slug: "shm",
  conceptSlug: "simple-harmonic-motion",
  title: "SHM Arena",
  subtitle: "Beat the graph before it explains itself.",
  description:
    "A fast mastery trial for simple harmonic motion. Predict first, reveal the motion, and earn XP only when your skill level increases.",
  estimatedSeconds: 120,
  levels: [
    {
      level: 1,
      label: "Level 1",
      title: "Recognize the motion",
      description: "Prove you can read amplitude, timing, and turning points without a lecture.",
      xpAward: 10,
      passRule: { correctRequired: 4, total: 5 },
      questions: [
        {
          id: "l1-q1-frequency",
          kind: "prediction",
          eyebrow: "Prediction",
          prompt:
            "The amplitude stays fixed, but angular frequency increases. What changes first?",
          setup: "Same swing size. Faster omega.",
          choices: [
            {
              id: "a",
              label: "The object cycles faster while the turning points stay put.",
            },
            {
              id: "b",
              label: "The turning points move farther from equilibrium.",
              misconception: "confuses frequency with amplitude",
            },
            {
              id: "c",
              label: "The equilibrium line shifts sideways.",
              misconception: "confuses timing with equilibrium",
            },
          ],
          correctChoiceId: "a",
          feedback: {
            correct:
              "Yes. Angular frequency squeezes the time axis; amplitude controls the turning points.",
            wrongByChoice: {
              b: "Wider turning points require larger amplitude. Frequency changes how soon the next peak arrives.",
              c: "Equilibrium is the center reference. Changing frequency does not move the center line.",
            },
          },
          reveal: {
            title: "Fast cycle, same width",
            caption: "The peaks get closer together, but their height stays the same.",
            amplitude: 1.2,
            omega: 2.9,
            focus: "frequency",
          },
        },
        {
          id: "l1-q2-amplitude",
          kind: "prediction",
          eyebrow: "Prediction",
          prompt: "Amplitude doubles while omega stays the same. What should you expect?",
          setup: "Same timing. Bigger displacement.",
          choices: [
            {
              id: "a",
              label: "The mass reaches wider turning points, but the period stays the same.",
            },
            {
              id: "b",
              label: "The period doubles because the motion travels farther.",
              misconception: "thinks path length sets SHM period",
            },
            {
              id: "c",
              label: "The mass stops at equilibrium because amplitude cancels speed.",
              misconception: "treats amplitude as damping",
            },
          ],
          correctChoiceId: "a",
          feedback: {
            correct:
              "Right. In ideal SHM, amplitude changes the size of the motion, not the timing.",
            wrongByChoice: {
              b: "That feels intuitive, but ideal SHM separates size from timing. The period depends on omega.",
              c: "Amplitude sets the starting stretch/energy. It does not cancel the cycle by itself.",
            },
          },
          reveal: {
            title: "Bigger swing, same beat",
            caption: "The graph is taller, not slower.",
            amplitude: 2.1,
            omega: 1.8,
            focus: "amplitude",
          },
        },
        {
          id: "l1-q3-turning-point",
          kind: "misconception",
          eyebrow: "Spot the instant",
          prompt: "At a positive turning point, which statement is true?",
          setup: "The mass is at the far right edge of the motion.",
          choices: [
            {
              id: "a",
              label: "Displacement is maximum, velocity is zero, acceleration points inward.",
            },
            {
              id: "b",
              label: "Displacement is zero, velocity is maximum, acceleration is zero.",
              misconception: "mixes turning point with equilibrium",
            },
            {
              id: "c",
              label: "Displacement and velocity are both maximum there.",
              misconception: "assumes farthest point means fastest point",
            },
          ],
          correctChoiceId: "a",
          feedback: {
            correct:
              "Exactly. Turning point means the mass pauses before reversing, while the restoring acceleration is strongest.",
            wrongByChoice: {
              b: "That is the equilibrium crossing, not the turning point.",
              c: "At the far edge the mass has stopped for an instant, so velocity is zero.",
            },
          },
          reveal: {
            title: "Edge of the swing",
            caption: "Far from center: speed drops to zero, restoring acceleration is largest.",
            amplitude: 1.7,
            omega: 1.8,
            phase: 0,
            focus: "turning-point",
          },
        },
        {
          id: "l1-q4-equilibrium",
          kind: "misconception",
          eyebrow: "Spot the instant",
          prompt: "At the equilibrium crossing, what is true?",
          setup: "The mass passes through the center line.",
          choices: [
            {
              id: "a",
              label: "Displacement is zero, acceleration is zero, speed is maximum.",
            },
            {
              id: "b",
              label: "Displacement is maximum, speed is zero, acceleration is maximum.",
              misconception: "mixes equilibrium with turning point",
            },
            {
              id: "c",
              label: "Acceleration is maximum because the mass is moving fastest.",
              misconception: "ties acceleration to speed instead of displacement",
            },
          ],
          correctChoiceId: "a",
          feedback: {
            correct:
              "Yes. At center, there is no displacement to restore, but the mass has its highest speed.",
            wrongByChoice: {
              b: "That describes a turning point. Equilibrium is the center crossing.",
              c: "Acceleration in SHM follows displacement from center, not current speed.",
            },
          },
          reveal: {
            title: "Center crossing",
            caption: "Zero displacement does not mean zero motion. It means zero restoring acceleration.",
            amplitude: 1.5,
            omega: 1.8,
            focus: "equilibrium",
          },
        },
        {
          id: "l1-q5-graph",
          kind: "graph-choice",
          eyebrow: "Graph choice",
          prompt: "Which graph shows same amplitude but a faster cycle?",
          setup: "Pick the graph with tighter spacing, not taller peaks.",
          choices: [
            { id: "a", label: "Graph A" },
            { id: "b", label: "Graph B" },
            { id: "c", label: "Graph C" },
          ],
          correctChoiceId: "b",
          graphOptions: [
            { id: "a", label: "A", amplitude: 0.75, frequency: 1.1, accent: "amber" },
            { id: "b", label: "B", amplitude: 0.75, frequency: 2.2, accent: "teal" },
            { id: "c", label: "C", amplitude: 1.1, frequency: 1.1, accent: "coral" },
          ],
          feedback: {
            correct:
              "Graph B is tighter horizontally while keeping the same height. That means faster cycle, same amplitude.",
            wrongByChoice: {
              a: "Graph A keeps the same height but does not cycle faster.",
              c: "Graph C is taller. That is amplitude, not frequency.",
            },
          },
          reveal: {
            title: "Read height and spacing separately",
            caption: "Height tells amplitude. Horizontal spacing tells period/frequency.",
            amplitude: 1.2,
            omega: 2.8,
            focus: "frequency",
          },
        },
      ],
    },
    {
      level: 2,
      label: "Level 2",
      title: "Predict changes",
      description: "Handle changed conditions without falling back to formula memorization.",
      xpAward: 25,
      passRule: { correctRequired: 4, total: 5 },
      questions: [
        {
          id: "l2-q1-omega-period",
          kind: "prediction",
          eyebrow: "Transfer",
          prompt: "Omega changes from 1 rad/s to 2 rad/s. What happens to the period?",
          setup: "Remember: T = 2π / omega.",
          choices: [
            { id: "a", label: "The period halves." },
            {
              id: "b",
              label: "The period doubles.",
              misconception: "inverts the omega-period relation",
            },
            {
              id: "c",
              label: "The period stays the same because amplitude did not change.",
              misconception: "overgeneralizes amplitude independence",
            },
          ],
          correctChoiceId: "a",
          feedback: {
            correct: "Correct. Larger omega means less time per cycle.",
            wrongByChoice: {
              b: "T and omega move opposite ways: doubling omega halves the period.",
              c: "Amplitude does not set period here, but omega does.",
            },
          },
          reveal: {
            title: "Omega is timing control",
            caption: "Double omega compresses the wave horizontally by about half.",
            amplitude: 1.1,
            omega: 2.0,
            focus: "frequency",
          },
        },
        {
          id: "l2-q2-acceleration-direction",
          kind: "misconception",
          eyebrow: "Misconception trap",
          prompt:
            "The mass is right of equilibrium but still moving right. Which way is acceleration?",
          setup: "It is moving outward, but displacement is positive.",
          choices: [
            { id: "a", label: "Left, back toward equilibrium." },
            {
              id: "b",
              label: "Right, because the mass is moving right.",
              misconception: "acceleration follows velocity",
            },
            {
              id: "c",
              label: "Zero, because it has not reached the turning point yet.",
              misconception: "acceleration only at endpoints",
            },
          ],
          correctChoiceId: "a",
          feedback: {
            correct:
              "Yes. Restoring acceleration points toward equilibrium even before the mass turns around.",
            wrongByChoice: {
              b: "Velocity and acceleration can point opposite ways. That is how the mass slows before reversing.",
              c: "Acceleration exists whenever displacement is nonzero; it is zero only at equilibrium.",
            },
          },
          reveal: {
            title: "Moving out, pulled back",
            caption: "This is the core SHM feeling: motion and restoring pull can oppose each other.",
            amplitude: 1.6,
            omega: 1.8,
            phase: 0.35,
            focus: "turning-point",
          },
        },
        {
          id: "l2-q3-phase",
          kind: "prediction",
          eyebrow: "Control meaning",
          prompt: "Phase changes, but amplitude and omega stay fixed. What changes?",
          setup: "Same wave, different starting point.",
          choices: [
            { id: "a", label: "The cycle starts at a different point, but size and timing stay fixed." },
            {
              id: "b",
              label: "The amplitude gets larger because the graph shifts.",
              misconception: "confuses phase shift with amplitude",
            },
            {
              id: "c",
              label: "The period changes because the graph begins later.",
              misconception: "confuses starting point with cycle length",
            },
          ],
          correctChoiceId: "a",
          feedback: {
            correct: "Right. Phase slides the cycle; it does not stretch it taller or wider.",
            wrongByChoice: {
              b: "Amplitude is graph height. Phase moves the same pattern along the cycle.",
              c: "Starting later is not the same as taking longer per cycle.",
            },
          },
          reveal: {
            title: "Same curve, shifted start",
            caption: "Phase changes the initial snapshot, not the underlying motion rule.",
            amplitude: 1.4,
            omega: 1.8,
            phase: 1.1,
            focus: "phase",
          },
        },
        {
          id: "l2-q4-graph-transfer",
          kind: "graph-choice",
          eyebrow: "Graph transfer",
          prompt: "Which graph has the largest amplitude?",
          setup: "Ignore spacing. Compare height from center.",
          choices: [
            { id: "a", label: "Graph A" },
            { id: "b", label: "Graph B" },
            { id: "c", label: "Graph C" },
          ],
          correctChoiceId: "c",
          graphOptions: [
            { id: "a", label: "A", amplitude: 0.5, frequency: 2.0, accent: "sky" },
            { id: "b", label: "B", amplitude: 0.75, frequency: 0.9, accent: "amber" },
            { id: "c", label: "C", amplitude: 1.05, frequency: 1.4, accent: "teal" },
          ],
          feedback: {
            correct: "Graph C reaches farthest from the center line, so it has the largest amplitude.",
            wrongByChoice: {
              a: "Graph A is fast, but not tall. Frequency is not amplitude.",
              b: "Graph B is slower, but still not the tallest.",
            },
          },
          reveal: {
            title: "Amplitude is vertical reach",
            caption: "Do not let fast motion distract you from height.",
            amplitude: 2.0,
            omega: 1.6,
            focus: "amplitude",
          },
        },
        {
          id: "l2-q5-exam",
          kind: "misconception",
          eyebrow: "Exam-style check",
          prompt:
            "Which pair correctly matches displacement x and acceleration a in ideal SHM?",
          setup: "Use the restoring rule, not memory vibes.",
          choices: [
            { id: "a", label: "a is proportional to -x." },
            {
              id: "b",
              label: "a is proportional to velocity.",
              misconception: "confuses acceleration law with velocity",
            },
            {
              id: "c",
              label: "a is constant throughout the cycle.",
              misconception: "treats SHM like constant acceleration motion",
            },
          ],
          correctChoiceId: "a",
          feedback: {
            correct:
              "Yes. Acceleration points opposite displacement and grows with distance from equilibrium.",
            wrongByChoice: {
              b: "Velocity matters for motion, but the SHM acceleration law is tied to displacement.",
              c: "Acceleration changes continuously; it is zero at equilibrium and largest at the edges.",
            },
          },
          reveal: {
            title: "Restoring rule unlocked",
            caption: "The minus sign means acceleration points back toward center.",
            amplitude: 1.6,
            omega: 2.1,
            focus: "turning-point",
          },
        },
      ],
    },
    {
      level: 3,
      label: "Level 3",
      title: "Exam-ready transfer",
      description: "Prove you can separate similar-looking ideas under pressure.",
      xpAward: 40,
      passRule: { correctRequired: 4, total: 5 },
      questions: [
        {
          id: "l3-q1-compare-period",
          kind: "graph-choice",
          eyebrow: "Fast compare",
          prompt: "Which setup has the shortest period?",
          setup: "Shortest period means peaks repeat most often.",
          choices: [
            { id: "a", label: "Graph A" },
            { id: "b", label: "Graph B" },
            { id: "c", label: "Graph C" },
          ],
          correctChoiceId: "a",
          graphOptions: [
            { id: "a", label: "A", amplitude: 0.65, frequency: 2.6, accent: "teal" },
            { id: "b", label: "B", amplitude: 1.1, frequency: 1.4, accent: "coral" },
            { id: "c", label: "C", amplitude: 0.75, frequency: 0.8, accent: "amber" },
          ],
          feedback: {
            correct: "Graph A repeats fastest, so its period is shortest.",
            wrongByChoice: {
              b: "Graph B is taller, but height is amplitude. Its peaks are not closest together.",
              c: "Graph C repeats slowest, so it has the longest period.",
            },
          },
          reveal: {
            title: "Period is horizontal spacing",
            caption: "Read the time gap between repeated peaks.",
            amplitude: 1.0,
            omega: 3.1,
            focus: "frequency",
          },
        },
        {
          id: "l3-q2-energy-trap",
          kind: "prediction",
          eyebrow: "Harder prediction",
          prompt:
            "Amplitude increases while omega stays fixed. Which hidden quantity definitely increases?",
          setup: "Bigger swing in the same spring-like system.",
          choices: [
            { id: "a", label: "The oscillator's energy scale increases." },
            {
              id: "b",
              label: "The period must increase.",
              misconception: "assumes bigger motion always takes longer",
            },
            {
              id: "c",
              label: "The equilibrium point moves.",
              misconception: "confuses stretch size with center position",
            },
          ],
          correctChoiceId: "a",
          feedback: {
            correct:
              "Good. Larger amplitude means larger maximum displacement and more energy, even if timing stays fixed.",
            wrongByChoice: {
              b: "In ideal SHM, period is set by omega, not by amplitude.",
              c: "The center line stays the reference; the swing just reaches farther from it.",
            },
          },
          reveal: {
            title: "Bigger motion stores more energy",
            caption: "Amplitude affects size and energy, not the beat when omega is fixed.",
            amplitude: 2.4,
            omega: 1.8,
            focus: "amplitude",
          },
        },
        {
          id: "l3-q3-velocity-acceleration",
          kind: "misconception",
          eyebrow: "Most-missed idea",
          prompt: "Can velocity be zero while acceleration is not zero?",
          setup: "Think about the edge of the swing.",
          choices: [
            { id: "a", label: "Yes — at a turning point." },
            {
              id: "b",
              label: "No — zero velocity always means zero acceleration.",
              misconception: "connects zero speed with zero force",
            },
            {
              id: "c",
              label: "Only at equilibrium.",
              misconception: "places zero velocity at equilibrium",
            },
          ],
          correctChoiceId: "a",
          feedback: {
            correct:
              "Exactly. The mass pauses at the edge, but the restoring acceleration is strongest there.",
            wrongByChoice: {
              b: "A paused instant can still have acceleration. The acceleration is what makes the object turn around.",
              c: "At equilibrium, velocity is largest and acceleration is zero — the opposite pairing.",
            },
          },
          reveal: {
            title: "Pause does not mean no force",
            caption: "Turning point: v = 0, but a is maximum toward center.",
            amplitude: 1.8,
            omega: 2.0,
            focus: "turning-point",
          },
        },
        {
          id: "l3-q4-equation-transfer",
          kind: "prediction",
          eyebrow: "Equation meaning",
          prompt: "If x is negative, what direction is acceleration in ideal SHM?",
          setup: "Use a = -ω²x.",
          choices: [
            { id: "a", label: "Positive, back toward equilibrium." },
            {
              id: "b",
              label: "Negative, because x is negative.",
              misconception: "misses the minus sign",
            },
            {
              id: "c",
              label: "Zero, because only positive displacement accelerates.",
              misconception: "treats one side as inactive",
            },
          ],
          correctChoiceId: "a",
          feedback: {
            correct:
              "Right. The minus sign flips the direction, so acceleration points back toward center.",
            wrongByChoice: {
              b: "The minus sign matters: negative displacement gives positive acceleration.",
              c: "Both sides accelerate back toward equilibrium. The sign just tells direction.",
            },
          },
          reveal: {
            title: "Minus sign = restoring direction",
            caption: "Acceleration always pulls opposite the displacement sign.",
            amplitude: 1.5,
            omega: 2.2,
            phase: 3.14,
            focus: "turning-point",
          },
        },
        {
          id: "l3-q5-final",
          kind: "misconception",
          eyebrow: "Boss check",
          prompt: "Which claim would prove someone understands SHM best?",
          setup: "Pick the statement that separates size, timing, and restoring acceleration.",
          choices: [
            {
              id: "a",
              label:
                "Amplitude sets swing size; omega sets timing; acceleration points opposite displacement.",
            },
            {
              id: "b",
              label: "Amplitude sets timing; omega sets swing size; acceleration follows velocity.",
              misconception: "swaps every key role",
            },
            {
              id: "c",
              label: "The object accelerates only when it crosses equilibrium.",
              misconception: "misplaces restoring acceleration",
            },
          ],
          correctChoiceId: "a",
          feedback: {
            correct:
              "That is the whole trial in one sentence. You separated the three core ideas.",
            wrongByChoice: {
              b: "Those roles are swapped. Amplitude is size, omega is timing, acceleration follows displacement.",
              c: "At equilibrium acceleration is zero. It is largest at the turning points.",
            },
          },
          reveal: {
            title: "SHM pattern cleared",
            caption: "Size, timing, and restoring direction are now separate ideas.",
            amplitude: 1.7,
            omega: 2.4,
            focus: "equilibrium",
          },
        },
      ],
    },
  ],
};
