import type { Metadata } from "next";
import PitchLesson from "./pitch-lesson";

export const metadata: Metadata = {
  title: "Understanding Pitch",
  description: "Discover how high and low sounds relate through listening and play.",
};

export default function PitchLessonPage() {
  return <PitchLesson />;
}
