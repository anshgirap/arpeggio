import { LETTERS, type AccidentalAlteration, type Note, type NoteLetter, type Pitch } from "../shared/types";
import { mod } from "../shared/math";

const NATURAL_PITCH_CLASS: Record<NoteLetter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const ACCIDENTAL_TEXT: Record<AccidentalAlteration, string> = { [-2]: "bb", [-1]: "b", [0]: "", [1]: "#", [2]: "##" };
const ACCIDENTAL_GLYPH: Record<AccidentalAlteration, string> = { [-2]: "𝄫", [-1]: "♭", [0]: "", [1]: "♯", [2]: "𝄪" };
const NOTE_PATTERN = /^([A-Ga-g])((?:[#♯b♭x𝄪𝄫]{0,2})?)(-?\d+)?$/;
const REFERENCE_MIDI = 69;
const REFERENCE_FREQUENCY = 440;

export interface NoteOptions { readonly referenceFrequency?: number }

export function accidentalAlteration(value: string): AccidentalAlteration {
  const normalized = value.replaceAll("♯", "#").replaceAll("♭", "b").replaceAll("𝄪", "##").replaceAll("𝄫", "bb").replaceAll("x", "##");
  const result: Record<string, AccidentalAlteration> = { "": 0, "#": 1, "##": 2, b: -1, bb: -2 };
  if (!Object.hasOwn(result, normalized)) throw new RangeError("Unsupported accidental: " + value);
  const alteration = result[normalized];
  if (alteration === undefined) throw new RangeError("Unsupported accidental: " + value);
  return alteration;
}

export function accidentalName(alteration: AccidentalAlteration): string {
  return ({ [-2]: "double-flat", [-1]: "flat", [0]: "natural", [1]: "sharp", [2]: "double-sharp" })[alteration];
}

export function pitchClassOf(pitch: Pitch): number {
  return mod(NATURAL_PITCH_CLASS[pitch.letter] + pitch.alteration, 12);
}

export function noteFromPitch(pitch: Pitch, octave?: number, referenceFrequency = REFERENCE_FREQUENCY): Note {
  if (!LETTERS.includes(pitch.letter) || ![-2, -1, 0, 1, 2].includes(pitch.alteration)) throw new RangeError("Invalid note spelling.");
  validateReferenceFrequency(referenceFrequency);
  const pitchClass = pitchClassOf(pitch);
  const accidental = ACCIDENTAL_TEXT[pitch.alteration];
  if (octave === undefined) return { ...pitch, pitchClass, referenceFrequency, spelling: pitch.letter + accidental };
  if (!Number.isSafeInteger(octave)) throw new RangeError("Octave must be a safe integer.");
  const midi = (octave + 1) * 12 + NATURAL_PITCH_CLASS[pitch.letter] + pitch.alteration;
  if (!Number.isSafeInteger(midi)) throw new RangeError("Note is outside the supported numeric range.");
  const frequency = midiToFrequency(midi, referenceFrequency);
  return { ...pitch, octave, pitchClass, midi, frequency, referenceFrequency, spelling: pitch.letter + accidental + octave };
}

export function referenceFrequencyOf(note: Note): number {
  return note.referenceFrequency ?? REFERENCE_FREQUENCY;
}

export function parseNote(input: string, options: NoteOptions = {}): Note {
  const match = NOTE_PATTERN.exec(input.trim());
  if (!match) throw new RangeError("Invalid note: " + input);
  const letter = match[1].toUpperCase() as NoteLetter;
  const accidental = match[2].replaceAll("♯", "#").replaceAll("♭", "b").replaceAll("𝄪", "##").replaceAll("𝄫", "bb").replaceAll("x", "##");
  const octave = match[3] === undefined ? undefined : Number(match[3]);
  return noteFromPitch({ letter, alteration: accidentalAlteration(accidental) }, octave, options.referenceFrequency);
}

function validateReferenceFrequency(value: number): void {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError("Reference frequency must be a positive finite number.");
}

export function midiToFrequency(midi: number, referenceFrequency = REFERENCE_FREQUENCY): number {
  if (!Number.isFinite(midi)) throw new RangeError("MIDI pitch must be finite.");
  validateReferenceFrequency(referenceFrequency);
  const frequency = referenceFrequency * 2 ** ((midi - REFERENCE_MIDI) / 12);
  if (!Number.isFinite(frequency) || frequency <= 0) throw new RangeError("Frequency is outside the representable range.");
  return frequency;
}

export function frequencyToMidi(frequency: number, referenceFrequency = REFERENCE_FREQUENCY): number {
  validateReferenceFrequency(referenceFrequency);
  if (!Number.isFinite(frequency) || frequency <= 0) throw new RangeError("Frequency must be positive and finite.");
  return Math.round(REFERENCE_MIDI + 12 * Math.log2(frequency / referenceFrequency));
}

export function midiToNote(midi: number, spelling: "sharp" | "flat" = "sharp", referenceFrequency = REFERENCE_FREQUENCY): Note {
  if (!Number.isSafeInteger(midi) || midi < 0 || midi > 127) throw new RangeError("MIDI note must be an integer from 0 through 127.");
  const pitchClass = mod(midi, 12);
  const names = spelling === "sharp"
    ? ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    : ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  return parseNote(names[pitchClass] + (Math.floor(midi / 12) - 1), { referenceFrequency });
}

export function frequencyToNote(frequency: number, options: NoteOptions & { readonly spelling?: "sharp" | "flat" } = {}): Note {
  return midiToNote(frequencyToMidi(frequency, options.referenceFrequency), options.spelling, options.referenceFrequency);
}

export function enharmonicallyEquivalent(a: Pitch, b: Pitch): boolean {
  return pitchClassOf(a) === pitchClassOf(b);
}

export function semitoneDistance(a: Note, b: Note): number {
  if (a.midi !== undefined && b.midi !== undefined) return b.midi - a.midi;
  return mod(b.pitchClass - a.pitchClass, 12);
}

/** Spell a target pitch by moving diatonically and chromatically from a written root. */
export function spellInterval(root: Note, diatonicSteps: number, semitones: number): Note {
  if (!Number.isSafeInteger(diatonicSteps) || !Number.isSafeInteger(semitones)) throw new RangeError("Interval steps must be safe integers.");
  const rootOctave = root.octave ?? 4;
  const targetIndex = rootOctave * 7 + LETTERS.indexOf(root.letter) + diatonicSteps;
  const targetOctave = Math.floor(targetIndex / 7);
  const letter = LETTERS[mod(targetIndex, 7)];
  const rootMidi = (rootOctave + 1) * 12 + NATURAL_PITCH_CLASS[root.letter] + root.alteration;
  const targetMidi = rootMidi + semitones;
  const alteration = targetMidi - ((targetOctave + 1) * 12 + NATURAL_PITCH_CLASS[letter]);
  if (alteration < -2 || alteration > 2) throw new RangeError("This interval cannot be spelled using accidentals up to double.");
  return noteFromPitch({ letter, alteration: alteration as AccidentalAlteration }, targetOctave, referenceFrequencyOf(root));
}

export function transposeBySemitones(note: Note, semitones: number, preference: "sharp" | "flat" = "sharp"): Note {
  if (!Number.isSafeInteger(semitones)) throw new RangeError("Transposition must be an integer number of semitones.");
  const midi = (note.midi ?? 60 + pitchClassOf(note)) + semitones;
  return midiToNote(midi, preference, referenceFrequencyOf(note));
}

export const naturalPitchClass = (letter: NoteLetter): number => NATURAL_PITCH_CLASS[letter];
export const accidentalText = (alteration: AccidentalAlteration): string => ACCIDENTAL_TEXT[alteration];
export const accidentalGlyph = (alteration: AccidentalAlteration): string => ACCIDENTAL_GLYPH[alteration];
