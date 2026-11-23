import type { ChordQuality } from "../music/shared/types";

export type SandboxBlockType =
  | "play-note" | "random-note" | "change-octave" | "note-duration"
  | "wait" | "play-chord" | "custom-chord" | "repeat" | "forever" | "stop" | "sequence"
  | "ascending" | "descending" | "scale";

export type SandboxBlockConfig = {
  note?: string;
  octave?: number;
  beats?: number;
  count?: number;
  quality?: ChordQuality;
  customIntervals?: number[];
  scale?: "major" | "naturalMinor" | "majorPentatonic" | "minorPentatonic" | "blues";
};

export type SandboxBlock = {
  id: string;
  type: SandboxBlockType;
  config: SandboxBlockConfig;
  children?: SandboxBlock[];
};

export type SandboxCategory = "Notes" | "Timing" | "Chords" | "Control" | "Melody";

export type BlockDefinition = {
  type: SandboxBlockType;
  category: SandboxCategory;
  label: string;
  color: "lavender" | "coral" | "lime" | "blue" | "orange";
  description: string;
  config: SandboxBlockConfig;
  hasChildren?: boolean;
};

export type SandboxProject = { version: 1; name: string; blocks: SandboxBlock[]; bpm: number };

export const BLOCK_DEFINITIONS: readonly BlockDefinition[] = [
  { type: "play-note", category: "Notes", label: "Play note", color: "lavender", description: "Play a note you choose", config: { note: "C", octave: 4 } },
  { type: "random-note", category: "Notes", label: "Play a random note", color: "lavender", description: "Pick a note from the middle octave", config: { octave: 4 } },
  { type: "change-octave", category: "Notes", label: "Set octave", color: "lavender", description: "Choose a register for later notes", config: { octave: 4 } },
  { type: "note-duration", category: "Notes", label: "Set note length", color: "lavender", description: "Choose how long notes ring", config: { beats: 1 } },
  { type: "wait", category: "Timing", label: "Wait", color: "coral", description: "Leave space in your music", config: { beats: 1 } },
  { type: "play-chord", category: "Chords", label: "Play chord", color: "lime", description: "Play a group of notes together", config: { note: "C", octave: 4, quality: "major" } },
  { type: "custom-chord", category: "Chords", label: "Play custom chord", color: "lime", description: "Shape a chord with two extra tones", config: { note: "C", octave: 4, customIntervals: [4, 7] } },
  { type: "repeat", category: "Control", label: "Repeat", color: "blue", description: "Repeat the blocks inside", config: { count: 2 }, hasChildren: true },
  { type: "forever", category: "Control", label: "Repeat forever", color: "blue", description: "Loop until you press Stop", config: {}, hasChildren: true },
  { type: "stop", category: "Control", label: "Stop sequence", color: "blue", description: "End the composition here", config: {} },
  { type: "sequence", category: "Control", label: "Play sequence", color: "blue", description: "Run the blocks inside this sequence", config: {}, hasChildren: true },
  { type: "ascending", category: "Melody", label: "Ascending notes", color: "orange", description: "Walk up a musical pattern", config: { note: "C", octave: 4, scale: "majorPentatonic" } },
  { type: "descending", category: "Melody", label: "Descending notes", color: "orange", description: "Walk down a musical pattern", config: { note: "C", octave: 4, scale: "majorPentatonic" } },
  { type: "scale", category: "Melody", label: "Play a scale", color: "orange", description: "Hear a pattern of notes", config: { note: "C", octave: 4, scale: "major" } },
];

export const CATEGORIES: readonly SandboxCategory[] = ["Notes", "Timing", "Chords", "Control", "Melody"];

export function createBlock(type: SandboxBlockType, id: string): SandboxBlock {
  const definition = BLOCK_DEFINITIONS.find((item) => item.type === type);
  if (!definition) throw new RangeError(`Unknown block type: ${type}`);
  return { id, type, config: { ...definition.config }, ...(definition.hasChildren ? { children: [] } : {}) };
}

export function createStarterProjects(id: (type: SandboxBlockType) => string): readonly SandboxProject[] {
  const block = (type: SandboxBlockType, config: SandboxBlockConfig = {}, children?: SandboxBlock[]): SandboxBlock => {
    const base = createBlock(type, id(type));
    return { ...base, config: { ...base.config, ...config }, ...(children ? { children } : {}) };
  };
  return [
    { version: 1, name: "My First Melody", bpm: 100, blocks: [block("play-note", { note: "C", octave: 4 }), block("wait", { beats: 0.5 }), block("play-note", { note: "E", octave: 4 }), block("wait", { beats: 0.5 }), block("play-note", { note: "G", octave: 4 })] },
    { version: 1, name: "The Chord Machine", bpm: 92, blocks: [block("play-chord", { note: "C", octave: 4, quality: "major" }), block("wait", { beats: 2 }), block("play-chord", { note: "A", octave: 3, quality: "minor" }), block("wait", { beats: 2 })] },
    { version: 1, name: "The Repeating Beat", bpm: 108, blocks: [block("repeat", { count: 4 }, [block("play-note", { note: "C", octave: 3 }), block("wait", { beats: 1 })])] },
  ];
}
