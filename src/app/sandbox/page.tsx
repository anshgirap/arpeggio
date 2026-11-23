import type { Metadata } from "next";
import { Sandbox } from "./sandbox";

export const metadata: Metadata = { title: "ARPEGGIO Blocks", description: "Build music. Discover how it works." };

export default function SandboxPage() { return <Sandbox />; }
