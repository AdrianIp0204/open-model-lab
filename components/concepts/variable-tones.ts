import type { SimulationVariableTone } from "@/lib/physics";

export const variableToneMap: Record<
  SimulationVariableTone,
  {
    accent: string;
    badge: string;
    border: string;
    panel: string;
    ring: string;
    softText: string;
    strongText: string;
  }
> = {
  teal: {
    accent: "#1ea6a2",
    badge: "border-teal-500/30 bg-teal-500/10",
    border: "border-teal-500/40",
    panel: "bg-teal-500/10",
    ring: "focus-visible:ring-teal-500",
    softText: "text-teal-600",
    strongText: "text-teal-700",
  },
  amber: {
    accent: "#f0ab3c",
    badge: "border-amber-500/35 bg-amber-500/12",
    border: "border-amber-500/40",
    panel: "bg-amber-500/12",
    ring: "focus-visible:ring-amber-500",
    softText: "text-amber-600",
    strongText: "text-amber-700",
  },
  coral: {
    accent: "#f16659",
    badge: "border-coral-500/35 bg-coral-500/12",
    border: "border-coral-500/40",
    panel: "bg-coral-500/12",
    ring: "focus-visible:ring-coral-500",
    softText: "text-coral-600",
    strongText: "text-coral-700",
  },
  sky: {
    accent: "#4ea6df",
    badge: "border-sky-500/30 bg-sky-500/10",
    border: "border-sky-500/35",
    panel: "bg-sky-500/10",
    ring: "focus-visible:ring-sky-500",
    softText: "text-sky-600",
    strongText: "text-sky-700",
  },
  ink: {
    accent: "#315063",
    badge: "border-ink-700/20 bg-ink-700/6",
    border: "border-ink-700/25",
    panel: "bg-ink-700/6",
    ring: "focus-visible:ring-ink-700",
    softText: "text-ink-700",
    strongText: "text-ink-800",
  },
};

export function getVariableTone(tone: SimulationVariableTone) {
  return variableToneMap[tone];
}
