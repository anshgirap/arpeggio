import { LETTERS, type Note, type Scale, type ScaleDegree, type ScaleDefinition } from "../shared/types";
import { mod } from "../shared/math";
import { noteFromPitch, naturalPitchClass, referenceFrequencyOf, transposeBySemitones } from "../notes/note";

export const SCALE_DEFINITIONS = {
  major: { id: "major", name: "Major (Ionian)", steps: [2, 2, 1, 2, 2, 2, 1] },
  naturalMinor: { id: "natural-minor", name: "Natural minor (Aeolian)", steps: [2, 1, 2, 2, 1, 2, 2] },
  harmonicMinor: { id: "harmonic-minor", name: "Harmonic minor", steps: [2, 1, 2, 2, 1, 3, 1] },
  melodicMinor: { id: "melodic-minor", name: "Melodic minor", steps: [2, 1, 2, 2, 2, 2, 1] },
  majorPentatonic: { id: "major-pentatonic", name: "Major pentatonic", steps: [2, 2, 3, 2, 3], degreeSteps: [0, 1, 2, 4, 5] },
  minorPentatonic: { id: "minor-pentatonic", name: "Minor pentatonic", steps: [3, 2, 2, 3, 2], degreeSteps: [0, 2, 3, 4, 6] },
  blues: { id: "blues", name: "Blues", steps: [3, 2, 1, 1, 3, 2], degreeSteps: [0, 2, 3, 3, 4, 6] },
  ionian: { id: "ionian", name: "Ionian", steps: [2, 2, 1, 2, 2, 2, 1] },
  dorian: { id: "dorian", name: "Dorian", steps: [2, 1, 2, 2, 2, 1, 2] },
  phrygian: { id: "phrygian", name: "Phrygian", steps: [1, 2, 2, 2, 1, 2, 2] },
  lydian: { id: "lydian", name: "Lydian", steps: [2, 2, 2, 1, 2, 2, 1] },
  mixolydian: { id: "mixolydian", name: "Mixolydian", steps: [2, 2, 1, 2, 2, 1, 2] },
  aeolian: { id: "aeolian", name: "Aeolian", steps: [2, 1, 2, 2, 1, 2, 2] },
  locrian: { id: "locrian", name: "Locrian", steps: [1, 2, 2, 1, 2, 2, 2] },
} as const satisfies Record<string, ScaleDefinition>;

const DEGREE_NAMES = ["Tonic", "Supertonic", "Mediant", "Subdominant", "Dominant", "Submediant", "Leading tone"];
const NATURAL: Record<(typeof LETTERS)[number], number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function defineScale(definition: ScaleDefinition): ScaleDefinition {
  if (definition.steps.length < 2 || definition.steps.some((step) => !Number.isSafeInteger(step) || step <= 0)) {
    throw new RangeError("A scale needs positive integer steps.");
  }
  if (definition.steps.reduce((sum, step) => sum + step, 0) !== 12) throw new RangeError("Scale steps must span exactly one octave.");
  if (definition.degreeSteps && (definition.degreeSteps.length !== definition.steps.length || definition.degreeSteps[0] !== 0 || definition.degreeSteps.some((degree, index) => !Number.isSafeInteger(degree) || degree < 0 || degree > 6 || (index > 0 && degree < definition.degreeSteps![index - 1])))) {
    throw new RangeError("Diatonic degree steps must have one nondecreasing letter advance (0–6) for each scale tone.");
  }
  return {
    ...definition,
    steps: [...definition.steps],
    ...(definition.degreeSteps ? { degreeSteps: [...definition.degreeSteps] } : {}),
  };
}

export function constructScale(root: Note, definition: ScaleDefinition): Scale {
  const validated = defineScale(definition);
  const baseOctave = root.octave ?? 4;
  const referenceFrequency = referenceFrequencyOf(root);
  const startMidi = root.midi ?? (baseOctave + 1) * 12 + naturalPitchClass(root.letter) + root.alteration;
  const offsets: number[] = [];
  let offset = 0;
  for (const step of validated.steps) { offsets.push(offset); offset += step; }
  const notes = offsets.map((semitones, index) => {
    const diatonicSteps = validated.degreeSteps?.[index] ?? index;
    if (index === 0) return noteFromPitch(root, baseOctave, referenceFrequency);
    const sourceLetterIndex = LETTERS.indexOf(root.letter);
    const targetLetter = LETTERS[mod(sourceLetterIndex + diatonicSteps, 7)];
    const targetOctave = baseOctave + Math.floor((sourceLetterIndex + diatonicSteps) / 7);
    const targetMidi = startMidi + semitones;
    const alteration = targetMidi - ((targetOctave + 1) * 12 + NATURAL[targetLetter]);
    if (alteration < -2 || alteration > 2) {
      throw new RangeError("Scale " + validated.name + " from " + root.spelling + " requires an accidental beyond double.");
    }
    return noteFromPitch({ letter: targetLetter, alteration: alteration as -2 | -1 | 0 | 1 | 2 }, targetOctave, referenceFrequency);
  });
  const degrees: ScaleDegree[] = notes.map((note, index) => ({
    degree: (validated.degreeSteps?.[index] ?? index) + 1,
    name: DEGREE_NAMES[validated.degreeSteps?.[index] ?? index] ?? "Degree " + ((validated.degreeSteps?.[index] ?? index) + 1),
    function: DEGREE_NAMES[validated.degreeSteps?.[index] ?? index] ?? "Scale tone",
    interval: offsets[index],
    note,
  }));
  return { root: noteFromPitch(root, baseOctave, referenceFrequency), definition: validated, notes, degrees, semitonePattern: validated.steps };
}

export function scaleContains(scale: Scale, note: Note): boolean {
  return scale.notes.some((candidate) => candidate.pitchClass === note.pitchClass);
}

export function transposeScale(scale: Scale, semitones: number, definition = scale.definition): Scale {
  return constructScale(transposeBySemitones(scale.root, semitones), definition);
}

export function relativeScaleNote(scale: Scale): Note {
  if (scale.definition.id !== "major" && scale.definition.id !== "ionian" && scale.definition.id !== "natural-minor" && scale.definition.id !== "aeolian") {
    throw new RangeError("Relative major/minor applies to major and natural-minor scales.");
  }
  const minorFamily = scale.definition.id === "natural-minor" || scale.definition.id === "aeolian";
  return scale.notes[minorFamily ? 2 : 5];
}

export function parallelScaleNote(scale: Scale): Note { return scale.root; }

export function compareScales(a: Scale, b: Scale): { readonly commonPitchClasses: readonly number[]; readonly onlyInA: readonly number[]; readonly onlyInB: readonly number[] } {
  const aSet = new Set(a.notes.map((note) => note.pitchClass));
  const bSet = new Set(b.notes.map((note) => note.pitchClass));
  return {
    commonPitchClasses: [...aSet].filter((pitch) => bSet.has(pitch)),
    onlyInA: [...aSet].filter((pitch) => !bSet.has(pitch)),
    onlyInB: [...bSet].filter((pitch) => !aSet.has(pitch)),
  };
}

export function scaleFromId(root: Note, id: keyof typeof SCALE_DEFINITIONS): Scale {
  return constructScale(root, SCALE_DEFINITIONS[id]);
}
