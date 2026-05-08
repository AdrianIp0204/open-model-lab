import type { Metadata } from "next";
import { SkillArenaPage } from "@/components/arena/SkillArenaPage";
import { shmTrial } from "@/lib/arena/shm-trial";

export const metadata: Metadata = {
  title: "SHM Arena | Open Model Lab",
  description:
    "A fast gameful mastery trial for simple harmonic motion. Predict, reveal, level up, and share the challenge.",
  openGraph: {
    title: "SHM Arena | Open Model Lab",
    description:
      "Predict the graph, beat the misconception traps, and prove simple harmonic motion skill in two minutes.",
    url: "/arena/shm",
  },
};

export default function ShmArenaPage() {
  return <SkillArenaPage trial={shmTrial} />;
}
