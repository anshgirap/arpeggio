import type { Fraction, RhythmicBase, RhythmicValue, Tempo, TimeSignature } from "../shared/types";
import { addFractions, divideFractions, fraction, fractionNumber, multiplyFractions } from "../shared/math";

const BASE_WHOLE_NOTES: Readonly<Record<RhythmicBase, Fraction>> = {
  whole: fraction(1, 1),
  half: fraction(1, 2),
  quarter: fraction(1, 4),
  eighth: fraction(1, 8),
  sixteenth: fraction(1, 16),
  "thirty-second": fraction(1, 32),
};

export interface RhythmicValueOptions {
  readonly dots?: 0 | 1 | 2;
  readonly tuplet?: { readonly actual: number; readonly normal: number };
}
export function createRhythmicValue(kind: "note" | "rest", base: RhythmicBase, options: RhythmicValueOptions = {}): RhythmicValue {
  const dots = options.dots ?? 0;
  if (dots !== 0 && dots !== 1 && dots !== 2) throw new RangeError("Rhythmic values support zero, one or two dots.");
  let duration = BASE_WHOLE_NOTES[base];
  if (!duration) throw new RangeError("Unsupported rhythmic base: " + base + ".");
  if (dots === 1) duration = multiplyFractions(duration, fraction(3, 2));
  if (dots === 2) duration = multiplyFractions(duration, fraction(7, 4));

  let tuplet: RhythmicValue["tuplet"];
  if (options.tuplet) {
    const { actual, normal } = options.tuplet;
    if (!Number.isSafeInteger(actual) || actual < 2 || !Number.isSafeInteger(normal) || normal < 1) {
      throw new RangeError("Tuplet actual and normal counts must be positive integers (actual at least two).");
    }
    duration = multiplyFractions(duration, fraction(normal, actual));
    tuplet = { actual, normal };
  }

  return {
    kind,
    base,
    dots,
    ...(tuplet ? { tuplet } : {}),
    wholeNotes: duration,
  };
}

export function createTimeSignature(numerator: number, denominator: TimeSignature["denominator"], beatGrouping?: number): TimeSignature {
  if (!Number.isSafeInteger(numerator) || numerator < 1) throw new RangeError("Time-signature numerator must be a positive integer.");
  if (![1, 2, 4, 8, 16, 32].includes(denominator)) throw new RangeError("Unsupported time-signature denominator.");
  const grouping = beatGrouping ?? (denominator === 8 && numerator >= 6 && numerator % 3 === 0 ? 3 : 1);
  if (!Number.isSafeInteger(grouping) || grouping < 1 || grouping > numerator || numerator % grouping !== 0) {
    throw new RangeError("Beat grouping must divide the time-signature numerator.");
  }
  return { numerator, denominator, beatGrouping: grouping };
}

export function measureDuration(signature: TimeSignature): Fraction {
  return fraction(signature.numerator, signature.denominator);
}

/** Returns metrical beats, accounting for compound grouping such as the dotted-quarter pulse in 6/8. */
export function beatsForRhythm(value: RhythmicValue, signature: TimeSignature): number {
  const denominatorUnits = multiplyFractions(value.wholeNotes, fraction(signature.denominator, 1));
  return fractionNumber(divideFractions(denominatorUnits, fraction(signature.beatGrouping, 1)));
}

export function createTempo(bpm: number, beatUnit: RhythmicBase = "quarter"): Tempo {
  if (!Number.isFinite(bpm) || bpm <= 0) throw new RangeError("Tempo must be a positive finite number of beats per minute.");
  if (!BASE_WHOLE_NOTES[beatUnit]) throw new RangeError("Unsupported tempo beat unit.");
  return { bpm, beatUnit };
}

/** Duration in seconds; BPM refers to the configured beat unit, defaulting to quarter-note beats. */
export function secondsForRhythm(value: RhythmicValue, tempo: Tempo): number {
  return secondsForWholeNotes(value.wholeNotes, tempo);
}

function secondsForWholeNotes(duration: Fraction, tempo: Tempo): number {
  if (!Number.isFinite(tempo.bpm) || tempo.bpm <= 0) throw new RangeError("Tempo must be positive and finite.");
  const beatLength = BASE_WHOLE_NOTES[tempo.beatUnit];
  if (!beatLength) throw new RangeError("Unsupported tempo beat unit.");
  const beats = fractionNumber(divideFractions(duration, beatLength));
  return beats * 60 / tempo.bpm;
}

/** The exact whole-note duration represented by one time-signature denominator unit. */
export function denominatorUnitDuration(signature: TimeSignature): Fraction {
  return fraction(1, signature.denominator);
}

export function denominatorUnitsFor(value: RhythmicValue, signature: TimeSignature): Fraction {
  return multiplyFractions(value.wholeNotes, fraction(signature.denominator, 1));
}

export function rhythmicValueDuration(value: RhythmicValue): Fraction { return value.wholeNotes; }

export function sumRhythmicDurations(values: readonly RhythmicValue[]): Fraction {
  return values.reduce((total, value) => addFractions(total, value.wholeNotes), fraction(0, 1));
}

export function subdivisionTimes(values: readonly RhythmicValue[], tempo: Tempo): readonly number[] {
  const times: number[] = [];
  let elapsedWholeNotes = fraction(0, 1);
  for (const value of values) {
    times.push(secondsForWholeNotes(elapsedWholeNotes, tempo));
    elapsedWholeNotes = addFractions(elapsedWholeNotes, value.wholeNotes);
  }
  return times;
}
