import type { Metadata } from "next";
import NotesLesson from "./notes-lesson";

export const metadata: Metadata = { title: "Understanding Musical Notes" };

export default function NotesPage() {
  return <NotesLesson />;
}
