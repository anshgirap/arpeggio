import { CHORD_DEFINITIONS, constructChord, constructScale, identifyChords, midiToNote, parseNote, SCALE_DEFINITIONS, transposeBySemitones, type Note } from "../music/index";
import type { SandboxBlock, SandboxBlockType, SandboxProject } from "./types";

export const TICKS_PER_BEAT = 12;
export const MAX_BLOCKS = 128;
export const MAX_NESTING = 4;
export const MAX_REPEAT = 16;
export const MAX_EVENTS = 512;

export type SandboxEvent = { blockId: string; startTick: number; durationTicks: number; midis: readonly number[]; label: string };
export type ProgramPlan = { events: readonly SandboxEvent[]; totalTicks: number; loop?: { events: readonly SandboxEvent[]; startTick: number; durationTicks: number } };
export type ProgramValidation = { valid: boolean; errors: string[] };

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const ALLOWED_SCALES = ["major", "naturalMinor", "majorPentatonic", "minorPentatonic", "blues"] as const;
const ALLOWED_QUALITIES = Object.keys(CHORD_DEFINITIONS);
const KNOWN_TYPES: readonly SandboxBlockType[] = ["play-note", "random-note", "change-octave", "note-duration", "wait", "play-chord", "custom-chord", "repeat", "forever", "stop", "sequence", "ascending", "descending", "scale"];

function hasTimedOperation(blocks: readonly SandboxBlock[]): boolean {
  return blocks.some((block) => ["play-note", "random-note", "play-chord", "custom-chord", "ascending", "descending", "scale", "wait"].includes(block.type) || hasTimedOperation(block.children ?? []));
}

export function durationToTicks(beats: number): number {
  if (!Number.isFinite(beats) || beats <= 0) throw new RangeError("Duration must be greater than zero.");
  const ticks = Math.round(beats * TICKS_PER_BEAT);
  if (Math.abs(ticks / TICKS_PER_BEAT - beats) > 1e-8) throw new RangeError("Choose a duration that fits a twelfth of a beat.");
  return ticks;
}

function flatten(blocks: readonly SandboxBlock[], depth = 0): SandboxBlock[] {
  return blocks.flatMap((block) => depth > MAX_NESTING ? [block] : [block, ...flatten(block.children ?? [], depth + 1)]);
}

function configErrors(block: SandboxBlock): string[] {
  const c = block.config;
  const errors: string[] = [];
  const noteRequired: SandboxBlockType[] = ["play-note", "play-chord", "custom-chord", "ascending", "descending", "scale"];
  if (noteRequired.includes(block.type)) {
    try {
      if (!c.note || !Number.isInteger(c.octave)) throw new Error();
      parseNote(`${c.note}${c.octave}`);
    } catch { errors.push(`${block.type}: choose a valid note and octave.`); }
  }
  if (["play-note", "play-chord", "custom-chord", "ascending", "descending", "scale", "random-note", "change-octave"].includes(block.type) && (!Number.isInteger(c.octave) || (c.octave ?? -2) < -1 || (c.octave ?? 10) > 8)) {
    errors.push(`${block.type}: octave must be between -1 and 8.`);
  }
  if (["wait", "note-duration"].includes(block.type)) {
    try { durationToTicks(c.beats ?? NaN); } catch { errors.push(`${block.type}: choose a valid duration.`); }
  }
  if (block.type === "repeat" && (!Number.isInteger(c.count) || (c.count ?? 0) < 1 || (c.count ?? MAX_REPEAT + 1) > MAX_REPEAT)) errors.push(`repeat: choose between 1 and ${MAX_REPEAT} repetitions.`);
  if (block.type === "play-chord") {
    if (!ALLOWED_QUALITIES.includes(c.quality ?? "")) errors.push("play-chord: choose a supported chord quality.");
    else { try { if (constructChord(parseNote(`${c.note}${c.octave}`), c.quality!).voicing.some((note) => (note.midi ?? -1) < 0 || (note.midi ?? 128) > 127)) errors.push("play-chord: this voicing is outside the playable range."); } catch { errors.push("play-chord: this voicing is outside the playable range."); } }
  }
  if (block.type === "custom-chord") {
    const intervals = c.customIntervals;
    if (!Array.isArray(intervals) || intervals.length !== 2 || intervals.some((interval) => !Number.isInteger(interval) || interval < 1 || interval > 24) || intervals[0] === intervals[1]) errors.push("custom-chord: choose two different note distances between 1 and 24 semitones.");
    else { try { const root = parseNote(`${c.note}${c.octave}`); if (intervals.some((interval) => (transposeBySemitones(root, interval).midi ?? 128) > 127)) errors.push("custom-chord: one of these notes is outside the playable range."); } catch { errors.push("custom-chord: one of these notes is outside the playable range."); } }
  }
  if (["ascending", "descending", "scale"].includes(block.type)) {
    if (!ALLOWED_SCALES.includes(c.scale as (typeof ALLOWED_SCALES)[number])) errors.push("melody: choose a supported scale.");
    else { try { const scale = constructScale(parseNote(`${c.note}${c.octave}`), SCALE_DEFINITIONS[c.scale as keyof typeof SCALE_DEFINITIONS]); if ((scale.notes.at(-1)?.midi ?? 127) > 126) errors.push("melody: this pattern reaches outside the playable range."); } catch { errors.push("melody: this pattern cannot be played in that register."); } }
  }
  if ((block.type === "repeat" || block.type === "forever" || block.type === "sequence") && !(block.children?.length)) errors.push(`${block.type}: add at least one block inside.`);
  if ((block.type === "repeat" || block.type === "forever" || block.type === "sequence") && block.children?.length && !hasTimedOperation(block.children)) errors.push(`${block.type}: add a note or a wait so the pattern has a duration.`);
  return errors;
}

export function validateProgram(blocks: readonly SandboxBlock[]): ProgramValidation {
  const errors: string[] = [];
  const all = flatten(blocks);
  if (all.length > MAX_BLOCKS) errors.push(`A composition can contain at most ${MAX_BLOCKS} blocks.`);
  if (all.some((block) => !block.id)) errors.push("Every block needs an id.");
  if (new Set(all.map((block) => block.id)).size !== all.length) errors.push("Block ids must be unique.");
  const visit = (items: readonly SandboxBlock[], depth: number, path: string) => {
    if (depth > MAX_NESTING) errors.push(`Keep repeat blocks within ${MAX_NESTING} nested levels.`);
    let foreverSeen = false;
    items.forEach((block, index) => {
      if (foreverSeen) errors.push("Repeat forever must be the last block in its sequence.");
      errors.push(...configErrors(block).map((error) => `${path}${index + 1}: ${error}`));
      if (block.type === "forever" && depth > 0) errors.push("Repeat forever can only be used in the main sequence.");
      if (block.type === "forever") foreverSeen = true;
      if ((block.type === "repeat" || block.type === "forever" || block.type === "sequence") && block.children) visit(block.children, depth + 1, `${path}${index + 1}.`);
    });
  };
  visit(blocks, 0, "Block ");
  if (blocks.length && !all.some((block) => ["play-note", "random-note", "play-chord", "custom-chord", "ascending", "descending", "scale"].includes(block.type))) errors.push("Add at least one note, chord or melody block so there is something to play.");
  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}

type InterpreterState = { octave: number | null; noteTicks: number };
type WalkResult = { cursor: number; stopped: boolean };

/** Converts an editable block tree into beat-positioned events. All timing uses integer twelfth-beat ticks. */
export function interpretProgram(blocks: readonly SandboxBlock[], options: { random?: () => number } = {}): ProgramPlan {
  const validation = validateProgram(blocks);
  if (!validation.valid) throw new Error(validation.errors.join(" "));
  const state: InterpreterState = { octave: null, noteTicks: TICKS_PER_BEAT };
  const events: SandboxEvent[] = [];
  let totalEventCount = 0;
  let loop: ProgramPlan["loop"];
  const add = (destination: SandboxEvent[], block: SandboxBlock, cursor: number, midis: readonly number[], label: string, duration = state.noteTicks) => {
    if (!midis.length || midis.some((midi) => !Number.isInteger(midi) || midi < 0 || midi > 127)) throw new RangeError("A block created a note outside the playable MIDI range.");
    destination.push({ blockId: block.id, startTick: cursor, durationTicks: duration, midis, label });
    totalEventCount += 1;
    if (totalEventCount > MAX_EVENTS) throw new Error(`This composition creates more than ${MAX_EVENTS} note events.`);
  };
  const run = (items: readonly SandboxBlock[], start: number, into: SandboxEvent[], depth: number): WalkResult => {
    let cursor = start;
    for (const block of items) {
      if (block.type === "stop") return { cursor, stopped: true };
      if (block.type === "sequence") {
        const result = run(block.children ?? [], cursor, into, depth + 1);
        cursor = result.cursor;
        if (result.stopped) return result;
        continue;
      }
      if (block.type === "wait") { cursor += durationToTicks(block.config.beats ?? 1); continue; }
      if (block.type === "note-duration") { state.noteTicks = durationToTicks(block.config.beats ?? 1); continue; }
      if (block.type === "change-octave") { state.octave = block.config.octave ?? 4; continue; }
      if (block.type === "repeat") {
        for (let iteration = 0; iteration < (block.config.count ?? 1); iteration++) {
          const result = run(block.children ?? [], cursor, into, depth + 1);
          cursor = result.cursor;
          if (result.stopped) return result;
        }
        continue;
      }
      if (block.type === "forever") {
        const once: SandboxEvent[] = [];
        const result = run(block.children ?? [], cursor, once, depth + 1);
        const duration = result.cursor - cursor;
        if (duration <= 0) throw new Error("Repeat forever needs to take at least some time.");
        if (result.stopped) into.push(...once);
        else {
          loop = { events: once.map((event) => ({ ...event, startTick: event.startTick - cursor })), startTick: cursor, durationTicks: duration };
          return { cursor: cursor + duration, stopped: true };
        }
        continue;
      }
      const octave = state.octave ?? block.config.octave ?? 4;
      if (block.type === "play-note") {
        const note = parseNote(`${block.config.note ?? "C"}${octave}`);
        add(into, block, cursor, [note.midi!], note.spelling); cursor += state.noteTicks; continue;
      }
      if (block.type === "random-note") {
        // Randomness is injected so tests can stay deterministic.
        const randomValue = Math.min(0.999999, Math.max(0, options.random?.() ?? Math.random()));
        const noteName = NOTE_NAMES[Math.floor(randomValue * NOTE_NAMES.length)];
        const note = parseNote(`${noteName}${octave}`);
        add(into, block, cursor, [note.midi!], note.spelling); cursor += state.noteTicks; continue;
      }
      if (block.type === "play-chord") {
        const chord = constructChord(parseNote(`${block.config.note ?? "C"}${octave}`), block.config.quality ?? "major");
        add(into, block, cursor, chord.voicing.map((note) => note.midi!), chord.symbol); cursor += state.noteTicks; continue;
      }
      if (block.type === "custom-chord") {
        const root = parseNote(`${block.config.note ?? "C"}${octave}`);
        const intervals = block.config.customIntervals ?? [4, 7];
        const midis = [root.midi!, ...intervals.map((interval) => transposeBySemitones(root, interval).midi!)];
        add(into, block, cursor, midis, `Custom ${root.spelling} chord`); cursor += state.noteTicks; continue;
      }
      if (["ascending", "descending", "scale"].includes(block.type)) {
        const definition = SCALE_DEFINITIONS[block.config.scale as keyof typeof SCALE_DEFINITIONS];
        const scale = constructScale(parseNote(`${block.config.note ?? "C"}${octave}`), definition);
        const octaveRoot = midiToNote((scale.root.midi ?? 60) + 12);
        let notes: Note[] = [...scale.notes, octaveRoot];
        if (block.type === "descending") notes = notes.reverse();
        for (const note of notes) { add(into, block, cursor, [note.midi!], note.spelling); cursor += state.noteTicks; }
        continue;
      }
    }
    return { cursor, stopped: false };
  };
  const result = run(blocks, 0, events, 0);
  if (events.length > MAX_EVENTS) throw new Error(`This composition creates more than ${MAX_EVENTS} note events.`);
  return { events, totalTicks: result.cursor, ...(loop ? { loop } : {}) };
}

export function durationSeconds(ticks: number, bpm: number): number {
  if (!Number.isFinite(bpm) || bpm < 40 || bpm > 200) throw new RangeError("Tempo must be between 40 and 200 BPM.");
  return ticks / TICKS_PER_BEAT * 60 / bpm;
}

export function getMusicInsights(blocks: readonly SandboxBlock[], plan?: ProgramPlan): string[] {
  const insights: string[] = [];
  const events = plan?.events ?? (() => { try { return interpretProgram(blocks).events; } catch { return []; } })();
  for (const event of events) {
    if (event.midis.length >= 3) {
      const matches = identifyChords(event.midis.map((midi) => midiToNote(midi)));
      if (matches.length) insights.push(`Those notes make a ${matches[0].symbol} ${matches[0].quality} chord.`);
    }
  }
  const singles = events.filter((event) => event.midis.length === 1).map((event) => midiToNote(event.midis[0]!));
  const pitches = [...new Set(singles.map((note) => note.pitchClass))];
  if (singles.length >= 5 && singles.length <= 8) {
    const rootName = NOTE_NAMES[singles[0]!.pitchClass]!;
    const major = constructScale(parseNote(`${rootName}4`), SCALE_DEFINITIONS.major);
    const expected = [...major.notes.map((note) => note.pitchClass), major.root.pitchClass];
    const matchesMajor = singles.every((note, index) => note.pitchClass === expected[index]);
    if (matchesMajor) insights.push(`You’re exploring a ${rootName} major scale.`);
  }
  if (pitches.length >= 5) {
    for (const [root, pitchClass] of NOTE_NAMES.entries()) {
      const rootNote = parseNote(`${NOTE_NAMES[root]}4`);
      for (const scaleId of ["major", "naturalMinor", "majorPentatonic", "minorPentatonic"] as const) {
        const scale = constructScale(rootNote, SCALE_DEFINITIONS[scaleId]);
        const expected = [...new Set(scale.notes.map((note) => note.pitchClass))].sort((a, b) => a - b);
        if (expected.length === pitches.length && expected.every((value, index) => value === [...pitches].sort((a, b) => a - b)[index])) {
          const scaleName = scale.definition.name;
          insights.push(`Your notes fit a ${pitchClass} ${scaleName.toLowerCase()} pattern.`);
          return [...new Set(insights)];
        }
      }
    }
  }
  if (flatten(blocks).some((block) => block.type === "repeat" || block.type === "forever")) insights.push("You’ve built a repeating musical pattern.");
  return [...new Set(insights)].slice(0, 3);
}

export function isSandboxProject(value: unknown): value is SandboxProject {
  if (!value || typeof value !== "object") return false;
  const project = value as Partial<SandboxProject>;
  const isBlock = (block: unknown): block is SandboxBlock => Boolean(block && typeof block === "object" && typeof (block as SandboxBlock).id === "string" && KNOWN_TYPES.includes((block as SandboxBlock).type) && (block as SandboxBlock).config && typeof (block as SandboxBlock).config === "object" && (!("children" in block) || ((block as SandboxBlock).children === undefined || (Array.isArray((block as SandboxBlock).children) && (block as SandboxBlock).children!.every(isBlock)))));
  return project.version === 1 && typeof project.name === "string" && typeof project.bpm === "number" && Number.isInteger(project.bpm) && project.bpm >= 40 && project.bpm <= 200 && Array.isArray(project.blocks) && project.blocks.every(isBlock)
    && validateProgram(project.blocks).valid;
}

