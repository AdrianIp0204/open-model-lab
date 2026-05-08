import type { Metadata } from "next";
import { ExamRescuePage } from "@/components/rescue/ExamRescuePage";
import { edexcelIalPhysicsUnit5RescuePlan } from "@/lib/rescue/edexcel-ial-physics-unit-5";

export const metadata: Metadata = {
  title: "Unit 5 Physics Exam Rescue | Open Model Lab",
  description:
    "A focused exam-rescue flow for Pearson Edexcel IAL Physics Unit 5: diagnose weak topics, rescue the model, drill exam-style, and save progress.",
  openGraph: {
    title: "Unit 5 Physics Exam Rescue | Open Model Lab",
    description:
      "Diagnose weak Unit 5 topics, fix the model, and drill exam-style decisions with a local-first rescue plan.",
    url: "/rescue/edexcel-ial-physics-unit-5",
  },
};

export default function EdexcelIalPhysicsUnit5RescuePage() {
  return <ExamRescuePage plan={edexcelIalPhysicsUnit5RescuePlan} />;
}
