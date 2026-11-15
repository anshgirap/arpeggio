export const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
export type NoteLetter = (typeof LETTERS)[number];
export type AccidentalAlteration = -2 | -1 | 0 | 1 | 2;
export type Accidental = "double-flat" | "flat" | "natural" | "sharp" | "double-sharp";

export interface Pitch {
  readonly letter: NoteLetter;
  /** Number of semitones from the natural letter; preserves theoretical spelling. */
  readonly alteration: AccidentalAlteration;
}

export interface Note extends Pitch {
  readonly octave?: number;
  readonly pitchClass: number;
  readonly midi?: number;
  readonly frequency?: number;
  /** A4 reference frequency used when deriving this note's equal-tempered frequency. */
  readonly referenceFrequency?: number;
  readonly spelling: string;
}

export type IntervalQuality = "perfect" | "major" | "minor" | "augmented" | "diminished" | "doubly-augmented" | "doubly-diminished";
export interface Interval {
  readonly number: number;
  readonly quality: IntervalQuality;
  readonly semitones: number;
  readonly direction: "ascending" | "descending";
  readonly simpleNumber: number;
  readonly compound: boolean;
  readonly name: string;
  readonly abbreviation: string;
}

export interface ScaleDegree {
  readonly degree: number;
  readonly name: string;
  readonly function: string;
  readonly interval: number;
  readonly note: Note;
}

export interface ScaleDefinition {
  readonly id: string;
  readonly name: string;
  /** Semitone distances between successive notes, including the octave closure. */
  readonly steps: readonly number[];
  /** Diatonic letter advances for each scale tone, when the scale omits/repeats degrees. */
  readonly degreeSteps?: readonly number[];
}

export interface Scale {
  readonly root: Note;
  readonly definition: ScaleDefinition;
  readonly notes: readonly Note[];
  readonly degrees: readonly ScaleDegree[];
  readonly semitonePattern: readonly number[];
}

export type ChordQuality =
  | "major" | "minor" | "diminished" | "augmented" | "sus2" | "sus4"
  | "major-seventh" | "minor-seventh" | "dominant-seventh" | "diminished-seventh"
  | "half-diminished-seventh" | "minor-major-seventh" | "augmented-major-seventh";
export type ChordInversion = 0 | 1 | 2 | 3;
export interface ChordTone {
  readonly note: Note;
  readonly interval: Interval;
  readonly degree: number;
}
export interface Chord {
  readonly root: Note;
  readonly quality: ChordQuality;
  readonly symbol: string;
  readonly tones: readonly ChordTone[];
  readonly inversion: ChordInversion;
  readonly bass: Note;
  readonly voicing: readonly Note[];
}

export type KeyMode = "major" | "natural-minor";
export interface KeySignature {
  readonly accidentals: Readonly<Record<NoteLetter, AccidentalAlteration>>;
  readonly count: number;
  readonly order: readonly NoteLetter[];
}
export interface Key {
  readonly tonic: Note;
  readonly mode: KeyMode;
  readonly signature: KeySignature;
  readonly scale: Scale;
  readonly relative: Note;
  readonly parallel: Note;
}
export type RomanNumeralQuality = "major" | "minor" | "diminished" | "augmented" | "half-diminished" | "dominant";
export interface RomanNumeral {
  readonly degree: number;
  readonly accidental: AccidentalAlteration;
  readonly quality: RomanNumeralQuality;
  readonly symbol: string;
}

export interface TimeSignature {
  readonly numerator: number;
  readonly denominator: 1 | 2 | 4 | 8 | 16 | 32;
  /** Number of denominator units that form one metrical beat (2 for 6/8). */
  readonly beatGrouping: number;
}
export interface Fraction {
  readonly numerator: number;
  readonly denominator: number;
}
export type RhythmicBase = "whole" | "half" | "quarter" | "eighth" | "sixteenth" | "thirty-second";
export type RhythmicValue = {
  readonly kind: "note" | "rest";
  readonly base: RhythmicBase;
  readonly dots: 0 | 1 | 2;
  readonly tuplet?: { readonly actual: number; readonly normal: number };
  readonly wholeNotes: Fraction;
};
export interface Tempo {
  readonly bpm: number;
  /** Duration of one metronome beat. Defaults to a quarter note. */
  readonly beatUnit: RhythmicBase;
}
