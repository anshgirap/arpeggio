import type { Interval, IntervalQuality, Note } from "../shared/types";
import { LETTERS } from "../shared/types";
import { mod } from "../shared/math";
import { spellInterval } from "../notes/note";

const BASE_SEMITONES = [0, 2, 4, 5, 7, 9, 11];
const ORDINALS = ["", "unison", "second", "third", "fourth", "fifth", "sixth", "seventh", "octave", "ninth", "tenth", "eleventh", "twelfth", "thirteenth", "fourteenth", "fifteenth"];
const PERFECT_CLASS = new Set([1, 4, 5]);

function classify(number: number, semitones: number): IntervalQuality {
  const simple = mod(number - 1, 7) + 1;
  const base = BASE_SEMITONES[simple - 1] + 12 * Math.floor((number - 1) / 7);
  const delta = semitones - base;
  if (PERFECT_CLASS.has(simple)) {
    if (delta === 0) return "perfect";
    if (delta > 0) return delta === 1 ? "augmented" : "doubly-augmented";
    return delta === -1 ? "diminished" : "doubly-diminished";
  }
  if (delta === 0) return "major";
  if (delta === -1) return "minor";
  if (delta > 0) return delta === 1 ? "augmented" : "doubly-augmented";
  return delta === -2 ? "diminished" : "doubly-diminished";
}

export function identifyInterval(from: Note, to: Note, direction?: "ascending" | "descending"): Interval {
  const hasOctaves = from.octave !== undefined && to.octave !== undefined;
  const signedSemitones = hasOctaves
    ? (to.midi ?? 0) - (from.midi ?? 0)
    : direction === "descending"
      ? -mod(from.pitchClass - to.pitchClass, 12)
      : mod(to.pitchClass - from.pitchClass, 12);
  const actualDirection = direction ?? (signedSemitones < 0 ? "descending" : "ascending");
  const signedDiatonic = hasOctaves
    ? (to.octave! * 7 + LETTERS.indexOf(to.letter)) - (from.octave! * 7 + LETTERS.indexOf(from.letter))
    : actualDirection === "ascending"
      ? mod(LETTERS.indexOf(to.letter) - LETTERS.indexOf(from.letter), 7)
      : -mod(LETTERS.indexOf(from.letter) - LETTERS.indexOf(to.letter), 7);
  const number = Math.abs(signedDiatonic) + 1;
  const semitones = Math.abs(signedSemitones);
  const simpleNumber = mod(number - 1, 7) + 1;
  const quality = classify(number, semitones);
  const compound = number > 8;
  const qualityLabel = quality === "perfect" ? "perfect" : quality.replaceAll("-", " ");
  const ordinal = ORDINALS[number] ?? ORDINALS[simpleNumber];
  const name = compound ? qualityLabel + " " + ordinal + " (" + number + ")" : qualityLabel + " " + ordinal;
  const qualityCode = quality === "major" ? "M" : quality === "minor" ? "m" : quality === "perfect" ? "P" : quality === "diminished" ? "d" : quality === "augmented" ? "A" : quality === "doubly-diminished" ? "dd" : "AA";
  const abbreviation = qualityCode + number;
  return { number, quality, semitones, direction: actualDirection, simpleNumber, compound, name, abbreviation };
}

export interface IntervalSpec {
  readonly number: number;
  readonly quality: IntervalQuality;
  readonly direction?: "ascending" | "descending";
}

export function intervalSemitones(spec: IntervalSpec): number {
  if (!Number.isSafeInteger(spec.number) || spec.number < 1) throw new RangeError("Interval number must be a positive integer.");
  const simple = mod(spec.number - 1, 7) + 1;
  const base = BASE_SEMITONES[simple - 1] + 12 * Math.floor((spec.number - 1) / 7);
  const offset: Record<IntervalQuality, number> = {
    perfect: 0, major: 0, minor: -1, augmented: 1, diminished: -1,
    "doubly-augmented": 2, "doubly-diminished": -2,
  };
  if ((spec.quality === "major" || spec.quality === "minor") && PERFECT_CLASS.has(simple)) {
    throw new RangeError("Unison, fourth, fifth and octave families do not have major or minor quality.");
  }
  if (spec.quality === "perfect" && !PERFECT_CLASS.has(simple)) {
    throw new RangeError("Second, third, sixth and seventh families do not have perfect quality.");
  }
  if (spec.quality === "diminished" && PERFECT_CLASS.has(simple)) return base - 1;
  if (spec.quality === "doubly-diminished" && PERFECT_CLASS.has(simple)) return base - 2;
  if (spec.quality === "diminished" && !PERFECT_CLASS.has(simple)) return base - 2;
  if (spec.quality === "doubly-diminished" && !PERFECT_CLASS.has(simple)) return base - 3;
  return base + offset[spec.quality];
}

export function constructInterval(root: Note, spec: IntervalSpec): Note {
  const sign = spec.direction === "descending" ? -1 : 1;
  return spellInterval(root, sign * (spec.number - 1), sign * intervalSemitones(spec));
}

export function invertInterval(interval: Interval): IntervalSpec {
  if (interval.number < 1) throw new RangeError("Invalid interval.");
  const simple = mod(interval.number - 1, 7) + 1;
  const number = 9 - simple;
  const inversionQuality: Record<IntervalQuality, IntervalQuality> = {
    perfect: "perfect", major: "minor", minor: "major", augmented: "diminished", diminished: "augmented",
    "doubly-augmented": "doubly-diminished", "doubly-diminished": "doubly-augmented",
  };
  return { number, quality: inversionQuality[interval.quality], direction: interval.direction };
}

export function compareIntervals(a: Interval, b: Interval): number {
  return Math.sign(a.semitones - b.semitones);
}

export function intervalsEqual(a: Interval, b: Interval): boolean {
  return a.number === b.number && a.quality === b.quality;
}
