import { midiToFrequency, midiToNote } from "./notes/note";
import type { Note } from "./shared/types";

/** Domain note enriched with the keyboard layout details needed by the piano UI. */
export type PianoNote = Omit<Note, "midi" | "frequency"> & {
  key: string;
  displayName: string;
  midi: number;
  frequency: number;
  accidental: "natural" | "sharp";
  whiteKeyIndex?: number;
  afterWhiteKeyIndex?: number;
};

const keyLayout = [
  { midi: 60, accidental: "natural", whiteKeyIndex: 0 },
  { midi: 61, accidental: "sharp", afterWhiteKeyIndex: 0 },
  { midi: 62, accidental: "natural", whiteKeyIndex: 1 },
  { midi: 63, accidental: "sharp", afterWhiteKeyIndex: 1 },
  { midi: 64, accidental: "natural", whiteKeyIndex: 2 },
  { midi: 65, accidental: "natural", whiteKeyIndex: 3 },
  { midi: 66, accidental: "sharp", afterWhiteKeyIndex: 3 },
  { midi: 67, accidental: "natural", whiteKeyIndex: 4 },
  { midi: 68, accidental: "sharp", afterWhiteKeyIndex: 4 },
  { midi: 69, accidental: "natural", whiteKeyIndex: 5 },
  { midi: 70, accidental: "sharp", afterWhiteKeyIndex: 5 },
  { midi: 71, accidental: "natural", whiteKeyIndex: 6 },
  { midi: 72, accidental: "natural", whiteKeyIndex: 7 },
] as const;

/** A4 is MIDI 69 at 440 Hz; all other pitches follow equal temperament. */
export const pianoNotes: readonly PianoNote[] = keyLayout.map((layout) => {
  const note = midiToNote(layout.midi);
  return {
    ...note,
    midi: layout.midi,
    frequency: midiToFrequency(layout.midi),
    key: note.spelling,
    displayName: note.spelling.replace(/\d+$/, "").replace("#", "♯"),
    accidental: layout.accidental,
    ...( "whiteKeyIndex" in layout ? { whiteKeyIndex: layout.whiteKeyIndex } : {}),
    ...( "afterWhiteKeyIndex" in layout ? { afterWhiteKeyIndex: layout.afterWhiteKeyIndex } : {}),
  };
});

export const whitePianoKeys = pianoNotes.filter((note) => note.accidental === "natural");
export const blackPianoKeys = pianoNotes.filter((note) => note.accidental === "sharp");

export function findPianoNote(key: string): PianoNote | undefined {
  return pianoNotes.find((note) => note.key === key);
}
