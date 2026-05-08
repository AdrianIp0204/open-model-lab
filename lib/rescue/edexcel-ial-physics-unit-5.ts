import type { ExamRescuePlan } from "./exam-rescue-schema";

export const edexcelIalPhysicsUnit5RescuePlan: ExamRescuePlan = {
  id: "edexcel-ial-physics-unit-5-rescue-v0",
  title: "Unit 5 Physics Rescue",
  examBoard: "Pearson Edexcel",
  qualification: "International A Level Physics",
  unitCode: "WPH15/01",
  unitTitle: "Thermodynamics, Radiation, Oscillations and Cosmology",
  sourceLabel: "Pearson Edexcel IAL Physics specification",
  sourceUrl:
    "https://qualifications.pearson.com/content/dam/pdf/International%20Advanced%20Level/Physics/2018/Specification%20and%20Sample%20Assessment/9781446957783_IAL_Physics_Iss3.pdf",
  learnerPromise:
    "Find the weak topic, fix the model, then drill exam-style decisions until the next step is obvious.",
  defaultExamDate: "2026-06-01",
  topics: [
    {
      slug: "shm-core",
      title: "Simple harmonic motion",
      examSkill: "Recognise the SHM condition, read x/v/a graphs, and use the core equations without mixing amplitude with period.",
      commonFailure: "Treating amplitude, speed, acceleration, and period as one vague idea instead of four linked but separate quantities.",
      rescueMove: "Separate the model into: position from centre, restoring acceleration, time scale, and energy transfer.",
      equations: ["a = -ω²x", "T = 2π/ω", "vmax = Aω"],
    },
    {
      slug: "damping-resonance",
      title: "Damping and resonance",
      examSkill: "Explain forced oscillations, resonance peaks, phase change, and the effect of damping on amplitude and sharpness.",
      commonFailure: "Saying resonance is just 'large vibration' without linking it to driving frequency and energy transfer.",
      rescueMove: "Use the response curve: where the peak is, how tall it is, and how damping changes it.",
    },
    {
      slug: "thermal-models",
      title: "Thermal physics and gases",
      examSkill: "Connect temperature, internal energy, ideal gas assumptions, and pV/T calculations to particle motion.",
      commonFailure: "Using gas equations mechanically while forgetting what is held constant and what changes physically.",
      rescueMove: "Name the constant first, then predict particle-level change before calculating.",
      equations: ["pV = nRT", "Ek ∝ T"],
    },
    {
      slug: "radiation-decay",
      title: "Radiation and decay",
      examSkill: "Handle activity, half-life, attenuation, nuclear equations, and safety reasoning with clear units.",
      commonFailure: "Confusing number of nuclei, activity, count rate, and half-life.",
      rescueMove: "Track what is being measured, what is random, and what changes exponentially.",
      equations: ["A = λN", "N = N₀e^(-λt)"],
    },
    {
      slug: "cosmology-evidence",
      title: "Cosmology evidence",
      examSkill: "Use redshift, Hubble's law, CMB evidence, and expansion reasoning without overclaiming.",
      commonFailure: "Remembering keywords but not linking observation → inference → model limitation.",
      rescueMove: "Convert each observation into the inference it supports and the mark-scheme wording it needs.",
      equations: ["v = H₀d", "z = Δλ / λ"],
    },
  ],
  diagnostic: [
    {
      id: "diag-shm-acceleration",
      topicSlug: "shm-core",
      kind: "diagnostic",
      prompt: "A mass is at maximum positive displacement in SHM. What is true at that instant?",
      setup: "Think position, velocity, and acceleration separately.",
      choices: [
        { id: "a", label: "Velocity is zero and acceleration points back toward equilibrium." },
        {
          id: "b",
          label: "Velocity and acceleration are both maximum in the positive direction.",
          misconceptionTag: "turning-point-fastest",
        },
        {
          id: "c",
          label: "Acceleration is zero because the mass has stopped.",
          misconceptionTag: "velocity-acceleration-confusion",
        },
      ],
      correctChoiceId: "a",
      markSchemeNote:
        "At a turning point, velocity is instantaneously zero; restoring acceleration is maximum and directed toward equilibrium.",
      wrongFeedback: {
        b: "Maximum displacement is not maximum speed. The object reverses there, so speed is zero.",
        c: "Stopping for an instant does not mean zero acceleration. The restoring force is largest at maximum displacement.",
      },
    },
    {
      id: "diag-resonance-peak",
      topicSlug: "damping-resonance",
      kind: "diagnostic",
      prompt: "A system is driven near its natural frequency. What does heavier damping do to the resonance curve?",
      choices: [
        {
          id: "a",
          label: "It makes the peak lower and broader.",
        },
        {
          id: "b",
          label: "It makes the peak taller and sharper.",
          misconceptionTag: "damping-adds-energy",
        },
        {
          id: "c",
          label: "It moves the peak to infinite frequency.",
          misconceptionTag: "resonance-frequency-misread",
        },
      ],
      correctChoiceId: "a",
      markSchemeNote:
        "Damping dissipates energy, reducing maximum amplitude and broadening the frequency response.",
      wrongFeedback: {
        b: "Damping removes energy from the oscillator. It does not amplify the response.",
        c: "Damping changes the response shape; it does not make resonance occur at infinite frequency.",
      },
    },
    {
      id: "diag-gas-constant",
      topicSlug: "thermal-models",
      kind: "diagnostic",
      prompt: "For a fixed mass of ideal gas at constant volume, temperature increases. What happens to pressure?",
      choices: [
        { id: "a", label: "Pressure increases because particles collide with the walls more forcefully/frequently." },
        {
          id: "b",
          label: "Pressure decreases because particles have more room to move.",
          misconceptionTag: "ignored-constant-volume",
        },
        {
          id: "c",
          label: "Pressure is unchanged because volume is unchanged.",
          misconceptionTag: "constant-volume-means-constant-pressure",
        },
      ],
      correctChoiceId: "a",
      markSchemeNote:
        "At constant volume for fixed n, p/T is constant, so pressure increases with absolute temperature.",
      wrongFeedback: {
        b: "The volume is fixed: particles do not get more room. Their average kinetic energy increases.",
        c: "Fixed volume does not fix pressure. Temperature still changes collision force/rate.",
      },
    },
    {
      id: "diag-decay-half-life",
      topicSlug: "radiation-decay",
      kind: "diagnostic",
      prompt: "After two half-lives, what fraction of undecayed nuclei remains?",
      choices: [
        { id: "a", label: "One quarter remains." },
        {
          id: "b",
          label: "None remains because two half-lives complete the decay.",
          misconceptionTag: "half-life-linear-complete",
        },
        {
          id: "c",
          label: "One half remains because half-life is constant.",
          misconceptionTag: "single-half-life-only",
        },
      ],
      correctChoiceId: "a",
      markSchemeNote: "Each half-life halves the remaining nuclei: 1 → 1/2 → 1/4.",
      wrongFeedback: {
        b: "Half-life decay is exponential. It halves repeatedly; it does not finish after two half-lives.",
        c: "One half remains after one half-life. After two, half of a half remains.",
      },
    },
    {
      id: "diag-hubble-evidence",
      topicSlug: "cosmology-evidence",
      kind: "diagnostic",
      prompt: "A distant galaxy has a larger redshift than a nearby galaxy. What does this support?",
      choices: [
        { id: "a", label: "More distant galaxies tend to recede faster, supporting expansion of the universe." },
        {
          id: "b",
          label: "The galaxy is colder because red light is always lower temperature.",
          misconceptionTag: "redshift-colour-temperature",
        },
        {
          id: "c",
          label: "The galaxy is moving toward Earth faster.",
          misconceptionTag: "redshift-direction-reversed",
        },
      ],
      correctChoiceId: "a",
      markSchemeNote:
        "Redshift of distant galaxies supports recession and Hubble's law, evidence for expansion.",
      wrongFeedback: {
        b: "Cosmological redshift is wavelength stretching, not simply the visible colour/temperature of an object.",
        c: "Redshift means wavelength is increased; that is associated with recession, not approach.",
      },
    },
  ],
  drill: [
    {
      id: "drill-shm-period",
      topicSlug: "shm-core",
      kind: "drill",
      prompt: "An oscillator has ω = 4.0 rad s⁻¹. Which expression gives its period?",
      choices: [
        { id: "a", label: "T = 2π / 4.0" },
        { id: "b", label: "T = 4.0 / 2π", misconceptionTag: "omega-period-inverted" },
        { id: "c", label: "T = 4.0 × 2π", misconceptionTag: "omega-period-product" },
      ],
      correctChoiceId: "a",
      markSchemeNote: "Use T = 2π/ω. Substitute ω in rad s⁻¹.",
      wrongFeedback: {
        b: "The relation is inverse: larger angular frequency means shorter period.",
        c: "Multiplying would make faster angular frequency produce a longer period, which is backwards.",
      },
    },
    {
      id: "drill-resonance-damping",
      topicSlug: "damping-resonance",
      kind: "drill",
      prompt: "Why does damping reduce the maximum amplitude at resonance?",
      choices: [
        { id: "a", label: "Energy is dissipated each cycle, so less energy builds up in the oscillator." },
        { id: "b", label: "The driving frequency becomes zero.", misconceptionTag: "driver-frequency-lost" },
        { id: "c", label: "The natural frequency disappears completely.", misconceptionTag: "natural-frequency-disappears" },
      ],
      correctChoiceId: "a",
      markSchemeNote: "Damping dissipates energy, reducing the amplitude response especially at resonance.",
      wrongFeedback: {
        b: "The driver can still drive the system. Damping changes energy loss, not necessarily driving frequency.",
        c: "The system still has a natural response; damping reduces and broadens the peak.",
      },
    },
    {
      id: "drill-thermal-temperature",
      topicSlug: "thermal-models",
      kind: "drill",
      prompt: "Which temperature scale must be used in ideal gas calculations?",
      choices: [
        { id: "a", label: "Kelvin" },
        { id: "b", label: "Celsius", misconceptionTag: "celsius-in-gas-law" },
        { id: "c", label: "Any scale if the numbers are copied correctly", misconceptionTag: "temperature-scale-any" },
      ],
      correctChoiceId: "a",
      markSchemeNote: "Ideal gas equations require absolute temperature in kelvin.",
      wrongFeedback: {
        b: "Celsius has an arbitrary zero; gas laws need absolute temperature.",
        c: "Temperature ratios and proportionality only work on the absolute scale.",
      },
    },
  ],
};
