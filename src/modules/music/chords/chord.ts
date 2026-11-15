import type { Chord, ChordInversion, ChordQuality, ChordTone, Note } from "../shared/types";
import { noteFromPitch, pitchClassOf, referenceFrequencyOf, spellInterval, transposeBySemitones } from "../notes/note";
import { identifyInterval } from "../intervals/interval";

export interface ChordFormulaTone { readonly number: number; readonly semitones: number }
export interface ChordDefinition {
  readonly quality: ChordQuality;
  readonly suffix: string;
  readonly tones: readonly ChordFormulaTone[];
}

function pitchName(note: Note): string {
  return note.spelling.replace(/-?\d+$/, "");
}

export const CHORD_DEFINITIONS: Record<ChordQuality, ChordDefinition> = {
  major: { quality: "major", suffix: "", tones: [{ number: 1, semitones: 0 }, { number: 3, semitones: 4 }, { number: 5, semitones: 7 }] },
  minor: { quality: "minor", suffix: "m", tones: [{ number: 1, semitones: 0 }, { number: 3, semitones: 3 }, { number: 5, semitones: 7 }] },
  diminished: { quality: "diminished", suffix: "dim", tones: [{ number: 1, semitones: 0 }, { number: 3, semitones: 3 }, { number: 5, semitones: 6 }] },
  augmented: { quality: "augmented", suffix: "aug", tones: [{ number: 1, semitones: 0 }, { number: 3, semitones: 4 }, { number: 5, semitones: 8 }] },
  sus2: { quality: "sus2", suffix: "sus2", tones: [{ number: 1, semitones: 0 }, { number: 2, semitones: 2 }, { number: 5, semitones: 7 }] },
  sus4: { quality: "sus4", suffix: "sus4", tones: [{ number: 1, semitones: 0 }, { number: 4, semitones: 5 }, { number: 5, semitones: 7 }] },
  "major-seventh": { quality: "major-seventh", suffix: "maj7", tones: [{ number: 1, semitones: 0 }, { number: 3, semitones: 4 }, { number: 5, semitones: 7 }, { number: 7, semitones: 11 }] },
  "minor-seventh": { quality: "minor-seventh", suffix: "m7", tones: [{ number: 1, semitones: 0 }, { number: 3, semitones: 3 }, { number: 5, semitones: 7 }, { number: 7, semitones: 10 }] },
  "dominant-seventh": { quality: "dominant-seventh", suffix: "7", tones: [{ number: 1, semitones: 0 }, { number: 3, semitones: 4 }, { number: 5, semitones: 7 }, { number: 7, semitones: 10 }] },
  "diminished-seventh": { quality: "diminished-seventh", suffix: "dim7", tones: [{ number: 1, semitones: 0 }, { number: 3, semitones: 3 }, { number: 5, semitones: 6 }, { number: 7, semitones: 9 }] },
  "half-diminished-seventh": { quality: "half-diminished-seventh", suffix: "m7b5", tones: [{ number: 1, semitones: 0 }, { number: 3, semitones: 3 }, { number: 5, semitones: 6 }, { number: 7, semitones: 10 }] },
  "minor-major-seventh": { quality: "minor-major-seventh", suffix: "mMaj7", tones: [{ number: 1, semitones: 0 }, { number: 3, semitones: 3 }, { number: 5, semitones: 7 }, { number: 7, semitones: 11 }] },
  "augmented-major-seventh": { quality: "augmented-major-seventh", suffix: "augMaj7", tones: [{ number: 1, semitones: 0 }, { number: 3, semitones: 4 }, { number: 5, semitones: 8 }, { number: 7, semitones: 11 }] },
};

export function constructChord(root: Note, quality: ChordQuality, inversion: ChordInversion = 0): Chord {
  const definition = CHORD_DEFINITIONS[quality];
  if (!definition) throw new RangeError("Unsupported chord quality: " + quality);
  if (!Number.isInteger(inversion) || inversion < 0 || inversion >= definition.tones.length) {
    throw new RangeError("Inversion must refer to an existing chord tone.");
  }
  const octave = root.octave ?? 4;
  const spelledRoot = noteFromPitch(root, octave, referenceFrequencyOf(root));
  const tones: ChordTone[] = definition.tones.map((formula) => {
    const note = spellInterval(spelledRoot, formula.number - 1, formula.semitones);
    return { note, interval: identifyInterval(spelledRoot, note), degree: formula.number };
  });
  const voicing = tones.map((tone) => tone.note);
  for (let index = 0; index < inversion; index += 1) {
    const moved = voicing.shift();
    if (moved) voicing.push(noteFromPitch(moved, (moved.octave ?? octave) + 1, referenceFrequencyOf(moved)));
  }
  const symbol = pitchName(spelledRoot) + definition.suffix;
  return { root: spelledRoot, quality, symbol, tones, inversion, bass: voicing[0], voicing };
}

export function chordContains(chord: Chord, note: Note): boolean {
  return chord.tones.some((tone) => tone.note.pitchClass === note.pitchClass);
}

export function transposeChord(chord: Chord, semitones: number, spelling: "sharp" | "flat" = "sharp"): Chord {
  return constructChord(transposeBySemitones(chord.root, semitones, spelling), chord.quality, chord.inversion);
}

export function chordSymbol(chord: Chord, slashBass?: Note): string {
  const symbol = pitchName(chord.root) + CHORD_DEFINITIONS[chord.quality].suffix;
  const bass = slashBass ?? (chord.inversion === 0 ? undefined : chord.bass);
  if (!bass || pitchClassOf(bass) === pitchClassOf(chord.root)) return symbol;
  return symbol + "/" + pitchName(bass);
}

export interface ChordIdentification {
  readonly root: Note;
  readonly quality: ChordQuality;
  readonly symbol: string;
  readonly matchedNotes: readonly Note[];
}

export function identifyChords(notes: readonly Note[]): ChordIdentification[] {
  const unique = [...new Map(notes.map((note) => [note.pitchClass, note])).values()];
  if (unique.length < 3) return [];
  const pitchClasses = new Set(unique.map((note) => note.pitchClass));
  const candidates: ChordIdentification[] = [];
  for (const root of unique) {
    for (const quality of Object.keys(CHORD_DEFINITIONS) as ChordQuality[]) {
      const candidate = constructChord(root, quality);
      const expected = candidate.tones.map((tone) => tone.note.pitchClass);
      if (expected.length === pitchClasses.size && expected.every((pitch) => pitchClasses.has(pitch))) {
        candidates.push({ root: candidate.root, quality, symbol: candidate.symbol, matchedNotes: candidate.tones.map((tone) => tone.note) });
      }
    }
  }
  return candidates;
}

export function identifyChord(notes: readonly Note[]): ChordIdentification | null {
  const candidates = identifyChords(notes);
  return candidates.length === 1 ? candidates[0] : null;
}
