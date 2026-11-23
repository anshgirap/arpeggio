import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const build = process.env.ARPEGGIO_SANDBOX_BUILD;
const { interpretProgram, validateProgram, getMusicInsights, durationSeconds, TICKS_PER_BEAT, readSavedProjects, writeSavedProjects, createStarterProjects } = require(`${build}/music-sandbox/index.js`);

const note = (id, name, octave = 4) => ({ id, type: "play-note", config: { note: name, octave } });
const wait = (id, beats) => ({ id, type: "wait", config: { beats } });
const chord = (id, quality = "major") => ({ id, type: "play-chord", config: { note: "C", octave: 4, quality } });

test("sequential notes use exact twelfth-beat positions", () => {
  const plan = interpretProgram([note("c", "C"), wait("w", 0.5), note("e", "E")]);
  assert.deepEqual(plan.events.map((event) => [event.startTick, event.midis[0]]), [[0, 60], [18, 64]]);
  assert.equal(plan.totalTicks, 30);
  assert.equal(durationSeconds(18, 120), 0.75);
});

test("quarter, eighth and sixteenth lengths map to integer beat ticks", () => {
  const plan = interpretProgram([wait("q", 1), note("a", "A"), wait("e", 0.5), note("b", "B"), wait("s", 0.25), note("c", "C")]);
  assert.deepEqual(plan.events.map((event) => event.startTick), [12, 30, 45]);
  assert.equal(TICKS_PER_BEAT, 12);
});

test("triplet waits retain exact positions without floating-point accumulation", () => {
  const plan = interpretProgram([note("first", "C"), wait("triplet-a", 1 / 3), note("second", "D"), wait("triplet-b", 1 / 3), note("third", "E")]);
  assert.deepEqual(plan.events.map((event) => event.startTick), [0, 16, 32]);
});

test("finite repeat executes nested blocks in sequence", () => {
  const plan = interpretProgram([{ id: "loop", type: "repeat", config: { count: 3 }, children: [note("inside", "C"), wait("space", 0.5)] }]);
  assert.deepEqual(plan.events.map((event) => event.startTick), [0, 18, 36]);
  assert.equal(plan.totalTicks, 54);
});

test("repeat forever compiles one reusable loop and rejects unsafe placement", () => {
  const loop = { id: "forever", type: "forever", config: {}, children: [note("loop-note", "G"), wait("loop-wait", 1)] };
  const plan = interpretProgram([note("intro", "C"), wait("space", 1), loop]);
  assert.equal(plan.events.length, 1);
  assert.equal(plan.loop.durationTicks, 24);
  assert.equal(plan.loop.events[0].startTick, 0);
  assert.equal(validateProgram([loop, note("after", "D")]).valid, false);
});

test("sequence containers and octave changes execute nested blocks", () => {
  const program = [{ id: "sequence", type: "sequence", config: {}, children: [
    { id: "octave", type: "change-octave", config: { octave: 5 } }, note("inside", "C"),
  ] }];
  const plan = interpretProgram(program);
  assert.deepEqual(plan.events.map((event) => event.midis[0]), [72]);
  assert.equal(validateProgram([{ id: "sequence", type: "sequence", config: {}, children: [] }]).valid, false);
});

test("random note selection can be reproduced by injecting a deterministic source", () => {
  const random = [{ id: "random", type: "random-note", config: { octave: 4 } }];
  assert.equal(interpretProgram(random, { random: () => 0 }).events[0].midis[0], 60);
  assert.equal(interpretProgram(random, { random: () => 0.99 }).events[0].midis[0], 71);
});

test("chord and melody blocks use the shared Music Engine", () => {
  const chordPlan = interpretProgram([chord("major")]);
  assert.deepEqual(chordPlan.events[0].midis, [60, 64, 67]);
  const scalePlan = interpretProgram([{ id: "scale", type: "scale", config: { note: "C", octave: 4, scale: "major" } }]);
  assert.deepEqual(scalePlan.events.slice(0, 5).map((event) => event.midis[0]), [60, 62, 64, 65, 67]);
  const custom = interpretProgram([{ id: "custom", type: "custom-chord", config: { note: "C", octave: 4, customIntervals: [3, 7] } }]);
  assert.deepEqual(custom.events[0].midis, [60, 63, 67]);
});

test("invalid connections/configuration cannot enter a playable plan", () => {
  const invalid = [note("bad", "H"), { id: "repeat", type: "repeat", config: { count: 100 }, children: [] }];
  assert.equal(validateProgram(invalid).valid, false);
  assert.throws(() => interpretProgram(invalid), /valid note/);
  assert.equal(validateProgram([wait("only-rest", 1)]).valid, false);
});

test("music insights identify a chord and a repeating pattern", () => {
  const blocks = [chord("c-major"), { id: "repeat", type: "repeat", config: { count: 2 }, children: [note("inside", "C"), wait("w", 1)] }];
  const insight = getMusicInsights(blocks, interpretProgram(blocks));
  assert.ok(insight.some((item) => item.includes("C major")));
  assert.ok(insight.some((item) => item.includes("repeating musical pattern")));
});

test("music insights recognize a played major-scale opening", () => {
  const blocks = ["C", "D", "E", "F", "G"].map((name, index) => note(`scale-${index}`, name));
  assert.ok(getMusicInsights(blocks, interpretProgram(blocks)).some((item) => item.includes("C major scale")));
});

test("starter projects are valid, playable programs", () => {
  let id = 0;
  const starters = createStarterProjects(() => `starter-${++id}`);
  assert.equal(starters.length, 3);
  for (const starter of starters) {
    assert.equal(validateProgram(starter.blocks).valid, true);
    assert.ok(interpretProgram(starter.blocks).events.length > 0);
  }
});

test("saved projects round-trip and malformed data is ignored", () => {
  const data = new Map();
  const storage = { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  const project = { version: 1, name: "One note", bpm: 100, blocks: [note("c", "C")] };
  assert.equal(writeSavedProjects([project], storage), true);
  assert.deepEqual(readSavedProjects(storage), [project]);
  data.set("arpeggio-music-sandbox-v1", JSON.stringify([{ version: 1, name: "bad", bpm: 999, blocks: [null] }]));
  assert.deepEqual(readSavedProjects(storage), []);
});
