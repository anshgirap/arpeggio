import { LETTERS, type Chord, type Key, type KeyMode, type KeySignature, type Note, type RomanNumeral, type RomanNumeralQuality, type Scale } from "../shared/types";
import { mod } from "../shared/math";
import { noteFromPitch, parseNote, referenceFrequencyOf } from "../notes/note";
import { constructChord, identifyChords, type ChordIdentification } from "../chords/chord";
import { constructScale, SCALE_DEFINITIONS } from "../scales/scale";

const SHARP_ORDER = ["F", "C", "G", "D", "A", "E", "B"] as const;
const FLAT_ORDER = ["B", "E", "A", "D", "G", "C", "F"] as const;
const KEY_SIGNATURE_COUNTS: Readonly<Record<KeyMode, Readonly<Record<string, number>>>> = {
  major: { C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, "F#": 6, "C#": 7, F: -1, Bb: -2, Eb: -3, Ab: -4, Db: -5, Gb: -6, Cb: -7 },
  "natural-minor": { A: 0, E: 1, B: 2, "F#": 3, "C#": 4, "G#": 5, "D#": 6, "A#": 7, D: -1, G: -2, C: -3, F: -4, Bb: -5, Eb: -6, Ab: -7 },
};
const DEGREE_ROMANS = ["I", "II", "III", "IV", "V", "VI", "VII"] as const;
const FUNCTION_BY_DEGREE = {
  major: ["tonic", "predominant", "tonic", "predominant", "dominant", "tonic", "dominant"],
  "natural-minor": ["tonic", "predominant", "tonic", "predominant", "dominant", "predominant", "dominant"],
} as const;

export function keySignatureFor(tonic: Note, mode: KeyMode): KeySignature {
  if (mode !== "major" && mode !== "natural-minor") throw new RangeError("Supported key modes are major and natural minor.");
  const count = KEY_SIGNATURE_COUNTS[mode][tonic.spelling.replace(/-?\d+$/, "")];
  if (count === undefined) throw new RangeError("No conventional key signature is defined for " + tonic.spelling + " " + mode + ".");
  const accidentals = Object.fromEntries(LETTERS.map((letter) => [letter, 0])) as Record<(typeof LETTERS)[number], -2 | -1 | 0 | 1 | 2>;
  const order = count >= 0 ? SHARP_ORDER.slice(0, count) : FLAT_ORDER.slice(0, -count);
  for (const letter of order) accidentals[letter] = count >= 0 ? 1 : -1;
  return { accidentals, count, order };
}

export function createKey(tonic: Note, mode: KeyMode = "major"): Key {
  if (mode !== "major" && mode !== "natural-minor") throw new RangeError("Supported key modes are major and natural minor.");
  const root = noteFromPitch(tonic, tonic.octave ?? 4, referenceFrequencyOf(tonic));
  const signature = keySignatureFor(root, mode);
  const definition = mode === "major" ? SCALE_DEFINITIONS.major : SCALE_DEFINITIONS.naturalMinor;
  const scale = constructScale(root, definition);
  const relative = mode === "major" ? scale.notes[5] : scale.notes[2];
  const parallel = noteFromPitch(root, root.octave);
  return { tonic: root, mode, signature, scale, relative, parallel };
}

export function relativeKey(key: Key): Key {
  return createKey(key.relative, key.mode === "major" ? "natural-minor" : "major");
}

export function parallelKey(key: Key): Key {
  return createKey(key.parallel, key.mode);
}

export function circleOfFifths(mode: KeyMode = "major"): readonly Key[] {
  const majorTonics = ["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"];
  const minorTonics = ["A", "E", "B", "F#", "C#", "G#", "D#", "Bb", "F", "C", "G", "D"];
  return (mode === "major" ? majorTonics : minorTonics).map((spelling) => createKey(parseNote(spelling), mode));
}

function chordQualityFor(scale: Scale, degreeIndex: number, seventh: boolean): Chord["quality"] {
  const positions = seventh ? [0, 2, 4, 6] : [0, 2, 4];
  const intervals = positions.slice(1).map((advance) => mod(
    scale.notes[(degreeIndex + advance) % 7].pitchClass - scale.notes[degreeIndex].pitchClass,
    12,
  ));
  const key = intervals.join(",");
  const triads: Record<string, Chord["quality"]> = { "4,7": "major", "3,7": "minor", "3,6": "diminished", "4,8": "augmented" };
  const sevenths: Record<string, Chord["quality"]> = {
    "4,7,11": "major-seventh", "4,7,10": "dominant-seventh", "3,7,10": "minor-seventh",
    "3,6,9": "diminished-seventh", "3,6,10": "half-diminished-seventh", "3,7,11": "minor-major-seventh",
    "4,8,11": "augmented-major-seventh",
  };
  const quality = (seventh ? sevenths : triads)[key];
  if (!quality) throw new RangeError("Unsupported diatonic chord formula: " + key + ".");
  return quality;
}

export function diatonicChord(key: Key, degree: number, options: { readonly seventh?: boolean } = {}): Chord {
  if (!Number.isInteger(degree) || degree < 1 || degree > 7) throw new RangeError("Scale degree must be from 1 through 7.");
  const quality = chordQualityFor(key.scale, degree - 1, options.seventh ?? false);
  return constructChord(key.scale.notes[degree - 1], quality);
}

export function diatonicTriads(key: Key): readonly Chord[] {
  return Array.from({ length: 7 }, (_, index) => diatonicChord(key, index + 1));
}

export function diatonicSevenths(key: Key): readonly Chord[] {
  return Array.from({ length: 7 }, (_, index) => diatonicChord(key, index + 1, { seventh: true }));
}

function romanQuality(quality: Chord["quality"]): RomanNumeralQuality {
  if (quality === "diminished") return "diminished";
  if (quality === "augmented") return "augmented";
  if (quality === "dominant-seventh") return "dominant";
  if (quality === "half-diminished-seventh") return "half-diminished";
  return quality.startsWith("major") || quality === "augmented-major-seventh" ? "major" : "minor";
}

export function romanNumeralFor(key: Key, degree: number, options: { readonly seventh?: boolean } = {}): RomanNumeral {
  const chord = diatonicChord(key, degree, options);
  const quality = romanQuality(chord.quality);
  const uppercase = quality === "major" || quality === "augmented" || quality === "dominant";
  const numeral = uppercase ? DEGREE_ROMANS[degree - 1] : DEGREE_ROMANS[degree - 1].toLowerCase();
  let suffix = "";
  if (quality === "diminished") suffix = options.seventh ? "°7" : "°";
  else if (quality === "half-diminished") suffix = "ø7";
  else if (options.seventh && chord.quality === "major-seventh") suffix = "maj7";
  else if (options.seventh && chord.quality === "minor-major-seventh") suffix = "Maj7";
  else if (options.seventh && chord.quality === "dominant-seventh") suffix = "7";
  else if (options.seventh && chord.quality === "augmented-major-seventh") suffix = "maj7#5";
  else if (options.seventh) suffix = "7";
  else if (quality === "augmented") suffix = "+";
  return { degree, accidental: 0, quality, symbol: numeral + suffix };
}

export type HarmonicFunction = "tonic" | "predominant" | "dominant";

export function classifyHarmonicFunction(key: Key, degree: number): HarmonicFunction {
  if (!Number.isInteger(degree) || degree < 1 || degree > 7) throw new RangeError("Scale degree must be from 1 through 7.");
  return FUNCTION_BY_DEGREE[key.mode][degree - 1];
}

export interface SecondaryDominantTarget {
  readonly degree: number;
  readonly roman: string;
  readonly symbol: string;
}

/** Returns every plausible diatonic target; more than one result means the context is ambiguous. */
export function secondaryDominantTargets(key: Key, chord: Chord): readonly SecondaryDominantTarget[] {
  if (chord.quality !== "dominant-seventh" && chord.quality !== "major") return [];
  const targetPitchClass = mod(chord.root.pitchClass + 5, 12);
  return key.scale.notes.flatMap((note, index) => note.pitchClass === targetPitchClass && index !== 0
    ? [{ degree: index + 1, roman: romanNumeralFor(key, index + 1).symbol, symbol: "V/" + romanNumeralFor(key, index + 1).symbol }]
    : []);
}

export interface BorrowedChordSource {
  readonly scaleId: string;
  readonly scaleName: string;
  readonly degree: number;
}

function samePitchSet(a: Chord, b: Chord): boolean {
  const left = [...a.tones.map(({ note }) => note.pitchClass)].sort((x, y) => x - y);
  const right = [...b.tones.map(({ note }) => note.pitchClass)].sort((x, y) => x - y);
  return left.length === right.length && left.every((pitch, index) => pitch === right[index]);
}

/** Lists possible parallel-mode sources; this is descriptive and does not claim a unique analysis. */
export function borrowedChordSources(key: Key, chord: Chord): readonly BorrowedChordSource[] {
  const candidateModes = Object.values(SCALE_DEFINITIONS).filter((definition) => definition.id !== key.scale.definition.id);
  const matches: BorrowedChordSource[] = [];
  for (const definition of candidateModes) {
    let scale: Scale;
    try { scale = constructScale(key.tonic, definition); } catch { continue; }
    for (let degree = 1; degree <= 7; degree += 1) {
      try {
        const candidate = constructChord(scale.notes[degree - 1], chord.quality);
        if (samePitchSet(candidate, chord)) matches.push({ scaleId: definition.id, scaleName: definition.name, degree });
      } catch { /* A scale may omit a chord tone's theoretical spelling; keep other candidates. */ }
    }
  }
  return matches;
}

export function keyScaleNotes(key: Key): readonly Note[] { return key.scale.notes; }

export function identifyHarmonicOptions(key: Key, notes: readonly Note[]): readonly ChordIdentification[] {
  return identifyChords(notes).filter((identification) => key.scale.notes.some((note) => note.pitchClass === identification.root.pitchClass));
}

export function keyTonicPitchClass(key: Key): number { return mod(key.tonic.pitchClass, 12); }
export function keyTonicSpelling(key: Key): string { return key.tonic.spelling.replace(/-?\d+$/, ""); }
export function accidentalMapFromSignature(signature: KeySignature): Readonly<Record<string, number>> { return signature.accidentals; }

export const conventionalKeyTonic = (spelling: string, mode: KeyMode = "major"): Key => createKey(parseNote(spelling), mode);
