import type { Metadata } from "next";
import OctavesLesson from "./octaves-lesson";

export const metadata: Metadata = { title: "Understanding Octaves" };

export default function OctavesPage() {
  return <OctavesLesson />;
}
