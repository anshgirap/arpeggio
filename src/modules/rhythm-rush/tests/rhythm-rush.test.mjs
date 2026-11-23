import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  BEATS_PER_BAR,
  COUNT_IN_BEATS,
  EXERCISES,
  TICKS_PER_BEAT,
  TICKS_PER_BAR,
  beamGroups,
  createPlaybackTimeline,
  evaluateRhythm,
  expectedOnsetsMs,
  onsetTicks,
  tickToMilliseconds,
  tripletGroups,
  validateExercise,
} = require(`${process.env.ARPEGGIO_RHYTHM_BUILD}/rhythm-rush.js`);

const at120 = (ticks) => ticks * 60_000 / (120 * TICKS_PER_BEAT);

test("every shipped pattern validates as one exact 4/4 bar", () => {
  for (const exercise of EXERCISES) {
    const events = validateExercise(exercise);
    assert.equal(events.at(-1).startTick + events.at(-1).event.ticks, TICKS_PER_BAR);
  }
});

test("quarter, half and whole note onset ticks are exact", () => {
  assert.deepEqual(onsetTicks(EXERCISES[0]), [0, 12, 24]);
  assert.deepEqual(onsetTicks(EXERCISES[1]), [0]);
});

test("eighth, triplet and sixteenth subdivisions use exact integer positions", () => {
  assert.deepEqual(onsetTicks(EXERCISES[2]).slice(0, 3), [0, 6, 12]);
  assert.deepEqual(onsetTicks(EXERCISES[3]).slice(0, 3), [0, 4, 8]);
  assert.deepEqual(onsetTicks(EXERCISES[4]).slice(0, 4), [0, 3, 6, 9]);
  assert.deepEqual(expectedOnsetsMs(EXERCISES[3], 120).slice(0, 3), [0, at120(4), at120(8)]);
});

test("notation beam and triplet groupings align to beat boundaries", () => {
  assert.deepEqual(beamGroups(EXERCISES[3]), [[0, 1, 2]]);
  assert.deepEqual(tripletGroups(EXERCISES[3]), [{ indexes: [0, 1, 2], startTick: 0, totalTicks: 12 }]);
  assert.deepEqual(beamGroups(EXERCISES[4]).slice(0, 1), [[0, 1, 2, 3]]);
});

test("the playback timeline aligns count-in, metronome and exercise onset data", () => {
  const timeline = createPlaybackTimeline(EXERCISES[3], 120);
  assert.equal(timeline.countInTicks, COUNT_IN_BEATS * TICKS_PER_BEAT);
  assert.equal(timeline.barTicks, BEATS_PER_BAR * TICKS_PER_BEAT);
  assert.deepEqual(timeline.expectedOnsetsMs.slice(0, 3), [0, at120(4), at120(8)]);
  assert.deepEqual(timeline.metronome.map(({ tick }) => tick), [0, 12, 24, 36, 48, 60, 72, 84]);
  assert.deepEqual(timeline.metronome.map(({ countIn }) => countIn), [true, true, true, true, false, false, false, false]);
  assert.equal(tickToMilliseconds(60, 60), 5000);
});

test("known rhythm taps are scored correctly at deterministic millisecond positions", () => {
  const exercise = EXERCISES[0];
  const expected = [0, 500, 1000];
  assert.deepEqual(expectedOnsetsMs(exercise, 120), expected);
  assert.equal(evaluateRhythm(exercise, 120, expected).perfect, 3);
  assert.equal(evaluateRhythm(exercise, 120, expected.map((time) => time - 50)).early, 3);
  assert.equal(evaluateRhythm(exercise, 120, expected.map((time) => time + 50)).late, 3);
});

test("rests have no onset, and tempo changes event time without changing event ticks", () => {
  assert.deepEqual(onsetTicks(EXERCISES[2]), [0, 6, 12, 36]);
  assert.equal(expectedOnsetsMs(EXERCISES[0], 60)[1], 1000);
  assert.equal(expectedOnsetsMs(EXERCISES[0], 120)[1], 500);
  assert.deepEqual(onsetTicks(EXERCISES[0]), [0, 12, 24]);
});

test("misses, extra taps, incomplete triplets and invalid durations are rejected", () => {
  const exercise = EXERCISES[0];
  const expected = expectedOnsetsMs(exercise, 120);
  assert.equal(evaluateRhythm(exercise, 120, expected.slice(0, 2)).missed, 1);
  assert.equal(evaluateRhythm(exercise, 120, [...expected, 1500]).extra.length, 1);
  assert.throws(() => validateExercise({ ...exercise, events: [{ ...exercise.events[0], ticks: 49 }] }));
  assert.throws(() => validateExercise({ ...exercise, events: [{ ...exercise.events[0], onset: false }] }));
  assert.throws(() => validateExercise({ ...EXERCISES[3], events: EXERCISES[3].events.slice(1) }));
  assert.throws(() => validateExercise({ ...exercise, events: [{ ...exercise.events[0], ticks: 48 }, ...exercise.events] }));
});
