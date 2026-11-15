import type { Metadata } from "next";
import { Playground } from "./playground";
import "./playground.css";

export const metadata: Metadata = { title: "Playground", description: "Explore notes, intervals, scales, chords and rhythm." };

export default function PlaygroundPage() { return <Playground />; }
