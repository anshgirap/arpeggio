/** Framework-independent notes for the one-octave ARPEGGIO piano. */
export type PianoNote = {
  key: string;
  displayName: string;
  midi: number;
  frequency: number;
  accidental: "natural" | "sharp";
  whiteKeyIndex?: number;
  afterWhiteKeyIndex?: number;
};

type NoteDefinition = Omit<PianoNote, "frequency">;

const definitions: NoteDefinition[] = [
  { key: "C4", displayName: "C", midi: 60, accidental: "natural", whiteKeyIndex: 0 },
  { key: "C#4", displayName: "C♯", midi: 61, accidental: "sharp", afterWhiteKeyIndex: 0 },
  { key: "D4", displayName: "D", midi: 62, accidental: "natural", whiteKeyIndex: 1 },
  { key: "D#4", displayName: "D♯", midi: 63, accidental: "sharp", afterWhiteKeyIndex: 1 },
  { key: "E4", displayName: "E", midi: 64, accidental: "natural", whiteKeyIndex: 2 },
  { key: "F4", displayName: "F", midi: 65, accidental: "natural", whiteKeyIndex: 3 },
  { key: "F#4", displayName: "F♯", midi: 66, accidental: "sharp", afterWhiteKeyIndex: 3 },
  { key: "G4", displayName: "G", midi: 67, accidental: "natural", whiteKeyIndex: 4 },
  { key: "G#4", displayName: "G♯", midi: 68, accidental: "sharp", afterWhiteKeyIndex: 4 },
  { key: "A4", displayName: "A", midi: 69, accidental: "natural", whiteKeyIndex: 5 },
  { key: "A#4", displayName: "A♯", midi: 70, accidental: "sharp", afterWhiteKeyIndex: 5 },
  { key: "B4", displayName: "B", midi: 71, accidental: "natural", whiteKeyIndex: 6 },
  { key: "C5", displayName: "C", midi: 72, accidental: "natural", whiteKeyIndex: 7 },
];

/** A4 is MIDI 69 at 440 Hz; all other pitches follow equal temperament. */
export const pianoNotes: readonly PianoNote[] = definitions.map((note) => ({
  ...note,
  frequency: 440 * 2 ** ((note.midi - 69) / 12),
}));

export const whitePianoKeys = pianoNotes.filter((note) => note.accidental === "natural");
export const blackPianoKeys = pianoNotes.filter((note) => note.accidental === "sharp");

export function findPianoNote(key: string): PianoNote | undefined {
  return pianoNotes.find((note) => note.key === key);
}
