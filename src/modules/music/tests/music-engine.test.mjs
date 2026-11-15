import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const compiled = await import(pathToFileURL(join(process.env.ARPEGGIO_MUSIC_ENGINE_BUILD, "index.js")).href);
const {
  SCALE_DEFINITIONS, accidentalAlteration, beatsForRhythm, borrowedChordSources, circleOfFifths, compareScales, constructChord,
  constructInterval, constructScale, createKey, createRhythmicValue, createTempo, createTimeSignature,
  chordSymbol, diatonicSevenths, diatonicTriads, findPianoNote, frequencyToMidi, frequencyToNote,
  identifyChords, identifyInterval, invertInterval, midiToFrequency, midiToNote, noteFromPitch,
  parseNote, pianoNotes, relativeKey, relativeScaleNote, romanNumeralFor, secondaryDominantTargets,
  secondsForRhythm, semitoneDistance, spellInterval, subdivisionTimes, transposeBySemitones, transposeChord, transposeScale,
} = compiled.default ?? compiled;

test("notes preserve spelling while mapping enharmonic pitches and frequencies", () => {
  const cSharp = parseNote("C#4");
  const dFlat = parseNote("D♭4");
  assert.equal(cSharp.spelling, "C#4");
  assert.equal(dFlat.spelling, "Db4");
  assert.equal(cSharp.pitchClass, dFlat.pitchClass);
  assert.equal(cSharp.midi, 61);
  assert.equal(parseNote("B##3").pitchClass, parseNote("C#4").pitchClass);
  assert.equal(parseNote("A4").frequency, 440);
  const tunedA = parseNote("A4", { referenceFrequency: 432 });
  assert.equal(tunedA.frequency, 432);
  assert.ok(Math.abs(spellInterval(tunedA, 2, 4).frequency - 432 * 2 ** (4 / 12)) < 1e-10);
  assert.equal(transposeBySemitones(tunedA, 12).frequency, 864);
  assert.ok(Math.abs(constructChord(tunedA, "major", 1).voicing[2].frequency - 864) < 1e-10);
  assert.equal(frequencyToMidi(440), 69);
  assert.equal(frequencyToNote(440).spelling, "A4");
  assert.equal(semitoneDistance(parseNote("C4"), parseNote("G4")), 7);
  assert.equal(noteFromPitch({ letter: "F", alteration: 1 }, 4).spelling, "F#4");
  assert.throws(() => parseNote("H4"), RangeError);
  assert.throws(() => parseNote("C###4"), RangeError);
  assert.throws(() => accidentalAlteration("toString"), RangeError);
  for (let midi = 0; midi <= 127; midi += 1) assert.equal(midiToNote(midi).midi, midi);
  for (let midi = 0; midi <= 127; midi += 1) assert.equal(frequencyToMidi(midiToFrequency(midi)), midi);
});

test("interval identification and construction retain diatonic spelling", () => {
  const c = parseNote("C4");
  assert.equal(identifyInterval(c, parseNote("E4")).name, "major third");
  assert.equal(identifyInterval(c, parseNote("Eb4")).name, "minor third");
  assert.equal(identifyInterval(c, parseNote("G4")).name, "perfect fifth");
  assert.equal(identifyInterval(c, c).name, "perfect unison");
  assert.equal(identifyInterval(c, parseNote("Fb4")).name, "diminished fourth");
  assert.equal(identifyInterval(c, parseNote("C5")).abbreviation, "P8");
  assert.equal(identifyInterval(parseNote("G4"), parseNote("C4")).direction, "descending");
  assert.equal(identifyInterval(parseNote("C4"), parseNote("B3")).name, "minor second");
  assert.equal(identifyInterval(c, parseNote("D5")).name, "major ninth (9)");
  assert.equal(constructInterval(c, { number: 3, quality: "minor" }).spelling, "Eb4");
  assert.equal(constructInterval(c, { number: 5, quality: "diminished" }).spelling, "Gb4");
  assert.deepEqual(invertInterval(identifyInterval(c, parseNote("E4"))), { number: 6, quality: "minor", direction: "ascending" });
});

test("scale definitions spell diatonic, modal, pentatonic and blues scales correctly", () => {
  const cMajor = constructScale(parseNote("C4"), SCALE_DEFINITIONS.major);
  assert.deepEqual(cMajor.notes.map(({ spelling }) => spelling), ["C4", "D4", "E4", "F4", "G4", "A4", "B4"]);
  assert.deepEqual(cMajor.semitonePattern, [2, 2, 1, 2, 2, 2, 1]);
  assert.deepEqual(constructScale(parseNote("A3"), SCALE_DEFINITIONS.naturalMinor).notes.map(({ spelling }) => spelling), ["A3", "B3", "C4", "D4", "E4", "F4", "G4"]);
  assert.deepEqual(constructScale(parseNote("A3"), SCALE_DEFINITIONS.naturalMinor).semitonePattern, [2, 1, 2, 2, 1, 2, 2]);
  assert.deepEqual(constructScale(parseNote("C4"), SCALE_DEFINITIONS.majorPentatonic).notes.map(({ spelling }) => spelling), ["C4", "D4", "E4", "G4", "A4"]);
  assert.deepEqual(constructScale(parseNote("A3"), SCALE_DEFINITIONS.minorPentatonic).notes.map(({ spelling }) => spelling), ["A3", "C4", "D4", "E4", "G4"]);
  assert.deepEqual(constructScale(parseNote("C4"), SCALE_DEFINITIONS.blues).notes.map(({ spelling }) => spelling), ["C4", "Eb4", "F4", "F#4", "G4", "Bb4"]);
  assert.deepEqual(constructScale(parseNote("C4"), SCALE_DEFINITIONS.major).notes.slice(0, 7).map(({ pitchClass }) => pitchClass), [0, 2, 4, 5, 7, 9, 11]);
  assert.equal(relativeScaleNote(cMajor).spelling, "A4");
  assert.equal(relativeScaleNote(constructScale(parseNote("A3"), SCALE_DEFINITIONS.naturalMinor)).spelling, "C4");
  const modePatterns = {
    ionian: [0, 2, 4, 5, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10], lydian: [0, 2, 4, 6, 7, 9, 11],
    mixolydian: [0, 2, 4, 5, 7, 9, 10], aeolian: [0, 2, 3, 5, 7, 8, 10],
    locrian: [0, 1, 3, 5, 6, 8, 10],
  };
  for (const [mode, expected] of Object.entries(modePatterns)) {
    assert.deepEqual(constructScale(parseNote("C4"), SCALE_DEFINITIONS[mode]).notes.map(({ pitchClass }) => pitchClass), expected);
  }
  assert.deepEqual(constructScale(parseNote("A3"), SCALE_DEFINITIONS.harmonicMinor).notes.map(({ spelling }) => spelling), ["A3", "B3", "C4", "D4", "E4", "F4", "G#4"]);
  assert.deepEqual(constructScale(parseNote("A3"), SCALE_DEFINITIONS.melodicMinor).notes.map(({ spelling }) => spelling), ["A3", "B3", "C4", "D4", "E4", "F#4", "G#4"]);
  assert.equal(compareScales(cMajor, transposeScale(cMajor, 12)).onlyInA.length, 0);
  assert.throws(() => relativeScaleNote(constructScale(parseNote("D4"), SCALE_DEFINITIONS.dorian)), RangeError);
});

test("chords construct, invert, transpose and identify pitch-class sets", () => {
  const cMaj7 = constructChord(parseNote("C4"), "major-seventh");
  assert.deepEqual(constructChord(parseNote("C4"), "major").tones.map(({ note }) => note.spelling), ["C4", "E4", "G4"]);
  assert.deepEqual(constructChord(parseNote("C4"), "minor").tones.map(({ note }) => note.spelling), ["C4", "Eb4", "G4"]);
  assert.deepEqual(constructChord(parseNote("C4"), "diminished").tones.map(({ note }) => note.spelling), ["C4", "Eb4", "Gb4"]);
  assert.deepEqual(constructChord(parseNote("C4"), "augmented").tones.map(({ note }) => note.spelling), ["C4", "E4", "G#4"]);
  assert.deepEqual(cMaj7.tones.map(({ note }) => note.spelling), ["C4", "E4", "G4", "B4"]);
  assert.deepEqual(constructChord(parseNote("C4"), "dominant-seventh").tones.map(({ note }) => note.spelling), ["C4", "E4", "G4", "Bb4"]);
  assert.equal(constructChord(parseNote("C4"), "major", 1).bass.spelling, "E4");
  assert.equal(constructChord(parseNote("C4"), "major", 2).bass.spelling, "G4");
  assert.equal(constructChord(parseNote("C4"), "major").bass.spelling, "C4");
  assert.equal(chordSymbol(constructChord(parseNote("C4"), "major", 1)), "C/E");
  assert.equal(transposeChord(constructChord(parseNote("C4"), "minor"), 2).symbol, "Dm");
  assert.ok(identifyChords(cMaj7.tones.map(({ note }) => note)).some(({ symbol }) => symbol === "Cmaj7"));
  assert.equal(identifyChords([parseNote("C4"), parseNote("E4"), parseNote("G4")]).some(({ symbol }) => symbol === "C"), true);
});

test("keys expose conventional signatures, related keys and diatonic harmony", () => {
  const cMajor = createKey(parseNote("C"), "major");
  assert.equal(cMajor.signature.count, 0);
  assert.equal(createKey(parseNote("D"), "major").signature.count, 2);
  assert.equal(createKey(parseNote("F"), "major").signature.count, -1);
  assert.equal(createKey(parseNote("C#"), "major").signature.count, 7);
  assert.equal(createKey(parseNote("Cb"), "major").signature.count, -7);
  assert.equal(relativeKey(cMajor).tonic.spelling, "A4");
  assert.equal(relativeKey(createKey(parseNote("A"), "natural-minor")).tonic.spelling, "C5");
  assert.deepEqual(diatonicTriads(cMajor).map(({ quality }) => quality), ["major", "minor", "minor", "major", "major", "minor", "diminished"]);
  assert.deepEqual(diatonicSevenths(cMajor).map(({ quality }) => quality), ["major-seventh", "minor-seventh", "minor-seventh", "major-seventh", "dominant-seventh", "minor-seventh", "half-diminished-seventh"]);
  assert.equal(romanNumeralFor(cMajor, 5, { seventh: true }).symbol, "V7");
  assert.equal(romanNumeralFor(cMajor, 7, { seventh: true }).symbol, "viiø7");
  assert.deepEqual(secondaryDominantTargets(cMajor, constructChord(parseNote("A4"), "dominant-seventh")), [{ degree: 2, roman: "ii", symbol: "V/ii" }]);
  assert.equal(circleOfFifths("major").length, 12);
  assert.ok(borrowedChordSources(cMajor, constructChord(parseNote("Eb4"), "major")).some(({ scaleId }) => scaleId === "natural-minor"));
});

test("the legacy piano model uses the shared equal-temperament pitch source", () => {
  assert.equal(pianoNotes.length, 13);
  assert.equal(pianoNotes[0].midi, 60);
  assert.equal(findPianoNote("A4").frequency, 440);
  for (const pianoNote of pianoNotes) assert.equal(pianoNote.frequency, midiToFrequency(pianoNote.midi));
});

test("rhythmic values use exact fractions for dots, tuplets, meter and tempo", () => {
  const quarter = createRhythmicValue("note", "quarter");
  const dottedQuarter = createRhythmicValue("note", "quarter", { dots: 1 });
  const doubleDottedQuarter = createRhythmicValue("rest", "quarter", { dots: 2 });
  const tripletEighth = createRhythmicValue("note", "eighth", { tuplet: { actual: 3, normal: 2 } });
  assert.deepEqual(quarter.wholeNotes, { numerator: 1, denominator: 4 });
  assert.deepEqual(dottedQuarter.wholeNotes, { numerator: 3, denominator: 8 });
  assert.deepEqual(doubleDottedQuarter.wholeNotes, { numerator: 7, denominator: 16 });
  assert.deepEqual(tripletEighth.wholeNotes, { numerator: 1, denominator: 12 });
  assert.equal(beatsForRhythm(dottedQuarter, createTimeSignature(6, 8)), 1);
  assert.equal(beatsForRhythm(quarter, createTimeSignature(4, 4)), 1);
  assert.equal(secondsForRhythm(quarter, createTempo(60)), 1);
  assert.equal(secondsForRhythm(createRhythmicValue("note", "eighth"), createTempo(60)), 0.5);
  assert.equal(secondsForRhythm(createRhythmicValue("note", "half"), createTempo(120)), 1);
  assert.equal(secondsForRhythm(quarter, createTempo(120)), 0.5);
  const triplet = createRhythmicValue("note", "eighth", { tuplet: { actual: 3, normal: 2 } });
  assert.deepEqual(subdivisionTimes([triplet, triplet, triplet], createTempo(120)), [0, 1 / 6, 1 / 3]);
  assert.throws(() => createTimeSignature(4, 4, 3), RangeError);
  assert.throws(() => createRhythmicValue("note", "eighth", { tuplet: { actual: 1, normal: 2 } }), RangeError);
});
