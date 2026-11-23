export type RhythmKind =
  | "whole"
  | "half"
  | "quarter"
  | "eighth"
  | "sixteenth"
  | "triplet"
  | "rest-quarter"
  | "rest-eighth";

/** Integer subdivisions keep notation, playback and evaluation on one exact grid. */
export const TICKS_PER_BEAT = 12;
export const BEATS_PER_BAR = 4;
export const TICKS_PER_BAR = TICKS_PER_BEAT * BEATS_PER_BAR;
export const COUNT_IN_BEATS = 4;

export type RhythmEvent = {
  kind: RhythmKind;
  ticks: number;
  onset: boolean;
  label: string;
};

export type RhythmExercise = {
  id: string;
  level: number;
  title: string;
  meter: "4/4";
  events: readonly RhythmEvent[];
};

const note = (kind: RhythmKind, ticks: number, label: string): RhythmEvent => ({
  kind,
  ticks,
  label,
  onset: true,
});

const rest = (kind: "rest-quarter" | "rest-eighth", ticks: number): RhythmEvent => ({
  kind,
  ticks,
  label: "Rest",
  onset: false,
});

/** A small, deliberately validated set. Every representation derives from these events. */
export const EXERCISES: readonly RhythmExercise[] = [
  {
    id: "pulse-1",
    level: 1,
    title: "Steady steps",
    meter: "4/4",
    events: [note("quarter", 12, "Quarter note"), note("quarter", 12, "Quarter note"), note("half", 24, "Half note")],
  },
  {
    id: "pulse-2",
    level: 1,
    title: "One long sound",
    meter: "4/4",
    events: [note("whole", 48, "Whole note")],
  },
  {
    id: "double-1",
    level: 2,
    title: "Between the beats",
    meter: "4/4",
    events: [
      note("eighth", 6, "Eighth note"),
      note("eighth", 6, "Eighth note"),
      note("quarter", 12, "Quarter note"),
      rest("rest-quarter", 12),
      note("quarter", 12, "Quarter note"),
    ],
  },
  {
    id: "triple-1",
    level: 3,
    title: "Three in the space",
    meter: "4/4",
    events: [
      note("triplet", 4, "Eighth-note triplet"),
      note("triplet", 4, "Eighth-note triplet"),
      note("triplet", 4, "Eighth-note triplet"),
      note("quarter", 12, "Quarter note"),
      note("half", 24, "Half note"),
    ],
  },
  {
    id: "quad-1",
    level: 4,
    title: "Quick steps",
    meter: "4/4",
    events: [
      note("sixteenth", 3, "Sixteenth note"),
      note("sixteenth", 3, "Sixteenth note"),
      note("sixteenth", 3, "Sixteenth note"),
      note("sixteenth", 3, "Sixteenth note"),
      note("eighth", 6, "Eighth note"),
      note("eighth", 6, "Eighth note"),
      note("quarter", 12, "Quarter note"),
      note("quarter", 12, "Quarter note"),
    ],
  },
  {
    id: "variation-1",
    level: 5,
    title: "A little surprise",
    meter: "4/4",
    events: [
      note("eighth", 6, "Eighth note"),
      rest("rest-eighth", 6),
      note("triplet", 4, "Eighth-note triplet"),
      note("triplet", 4, "Eighth-note triplet"),
      note("triplet", 4, "Eighth-note triplet"),
      note("quarter", 12, "Quarter note"),
      note("eighth", 6, "Eighth note"),
      note("eighth", 6, "Eighth note"),
    ],
  },
];

export const PRECISION = { perfect: 40, great: 80, good: 120, needsWork: 180 } as const;
export type TapGrade = "perfect" | "great" | "good" | "needsWork" | "missed";
export type TapResult = { expected: number; actual: number | null; deviation: number | null; grade: TapGrade };
export type RhythmResult = {
  taps: TapResult[];
  extra: number[];
  accuracy: number;
  perfect: number;
  great: number;
  good: number;
  early: number;
  late: number;
  missed: number;
  averageDeviation: number;
  bias: number;
};
export type PositionedEvent = { event: RhythmEvent; startTick: number; index: number };
export type TripletGroup = { indexes: number[]; startTick: number; totalTicks: number };
export type MetronomeClick = { tick: number; accent: boolean; countIn: boolean };

const durationTicks: Record<RhythmKind, number> = {
  whole: 48,
  half: 24,
  quarter: 12,
  eighth: 6,
  sixteenth: 3,
  triplet: 4,
  "rest-quarter": 12,
  "rest-eighth": 6,
};

/** Validate before any pattern can reach notation, playback or gameplay. */
export function validateExercise(exercise: RhythmExercise): PositionedEvent[] {
  if (exercise.meter !== "4/4") throw new RangeError(`${exercise.id} uses an unsupported meter.`);
  if (!exercise.events.length) throw new RangeError("An exercise must contain events.");

  let tick = 0;
  let tripletRun: PositionedEvent[] = [];
  const positioned: PositionedEvent[] = [];
  const finishTriplet = () => {
    if (tripletRun.length > 0) {
      const total = tripletRun.reduce((sum, item) => sum + item.event.ticks, 0);
      if (tripletRun.length !== 3 || total !== TICKS_PER_BEAT || tripletRun[0].startTick % TICKS_PER_BEAT !== 0) {
        throw new RangeError(`${exercise.id} has an invalid triplet group.`);
      }
    }
    tripletRun = [];
  };

  exercise.events.forEach((event, index) => {
    if (!Number.isSafeInteger(event.ticks) || event.ticks !== durationTicks[event.kind]) {
      throw new RangeError(`${exercise.id} has a duration that does not match ${event.kind}.`);
    }
    if (event.onset !== !event.kind.startsWith("rest-")) {
      throw new RangeError(`${exercise.id} has inconsistent rest/onset data.`);
    }
    if (tick + event.ticks > TICKS_PER_BAR) throw new RangeError(`${exercise.id} crosses a bar boundary.`);

    const item = { event, startTick: tick, index };
    if (event.kind === "triplet") tripletRun.push(item);
    else finishTriplet();
    positioned.push(item);
    tick += event.ticks;
  });

  finishTriplet();
  if (tick !== TICKS_PER_BAR) throw new RangeError(`${exercise.id} has ${tick}/${TICKS_PER_BAR} ticks; expected a full 4/4 bar.`);
  if (!positioned.some(({ event }) => event.onset)) throw new RangeError("An exercise needs at least one note onset.");
  return positioned;
}

export function onsetTicks(exercise: RhythmExercise): number[] {
  return validateExercise(exercise).filter(({ event }) => event.onset).map(({ startTick }) => startTick);
}

export function onsetBeats(exercise: RhythmExercise): number[] {
  return onsetTicks(exercise).map((tick) => tick / TICKS_PER_BEAT);
}

/** Group notation only inside beat boundaries; triplets remain explicitly identifiable. */
export function beamGroups(exercise: RhythmExercise): number[][] {
  const events = validateExercise(exercise);
  const groups: number[][] = [];
  let run: PositionedEvent[] = [];
  const flush = () => {
    if (run.length > 1) groups.push(run.map(({ index }) => index));
    run = [];
  };

  for (const item of events) {
    const shortNote = item.event.onset && [3, 4, 6].includes(item.event.ticks);
    if (!shortNote) {
      flush();
      continue;
    }
    if (run.length && Math.floor(run[run.length - 1].startTick / TICKS_PER_BEAT) !== Math.floor(item.startTick / TICKS_PER_BEAT)) flush();
    run.push(item);
    if (item.event.kind === "triplet" && run.length === 3) flush();
  }
  flush();
  return groups;
}

export function tripletGroups(exercise: RhythmExercise): TripletGroup[] {
  const events = validateExercise(exercise);
  const groups: TripletGroup[] = [];
  let run: PositionedEvent[] = [];
  const flush = () => {
    if (run.length) groups.push({
      indexes: run.map(({ index }) => index),
      startTick: run[0].startTick,
      totalTicks: run.reduce((sum, item) => sum + item.event.ticks, 0),
    });
    run = [];
  };
  for (const item of events) {
    if (item.event.kind === "triplet") run.push(item);
    else flush();
  }
  flush();
  return groups;
}

export function tickToMilliseconds(tick: number, bpm: number): number {
  if (!Number.isFinite(bpm) || bpm < 30 || bpm > 240) throw new RangeError("BPM must be between 30 and 240.");
  if (!Number.isSafeInteger(tick) || tick < 0) throw new RangeError("Tick must be a non-negative integer.");
  return tick * 60_000 / (bpm * TICKS_PER_BEAT);
}

export function expectedOnsetsMs(exercise: RhythmExercise, bpm: number): number[] {
  return onsetTicks(exercise).map((tick) => tickToMilliseconds(tick, bpm));
}

/** All audio and visual beats share this exact integer-tick timeline. */
export function createPlaybackTimeline(exercise: RhythmExercise, bpm: number): {
  expectedOnsetsMs: number[];
  metronome: MetronomeClick[];
  countInTicks: number;
  barTicks: number;
} {
  validateExercise(exercise);
  if (!Number.isFinite(bpm) || bpm < 30 || bpm > 240) throw new RangeError("BPM must be between 30 and 240.");
  const countInTicks = COUNT_IN_BEATS * TICKS_PER_BEAT;
  return {
    expectedOnsetsMs: onsetTicks(exercise).map((tick) => tickToMilliseconds(tick, bpm)),
    countInTicks,
    barTicks: TICKS_PER_BAR,
    metronome: Array.from({ length: COUNT_IN_BEATS + BEATS_PER_BAR }, (_, beat) => ({
      tick: beat * TICKS_PER_BEAT,
      accent: beat % BEATS_PER_BAR === 0,
      countIn: beat < COUNT_IN_BEATS,
    })),
  };
}

export function evaluateRhythm(exercise: RhythmExercise, bpm: number, taps: readonly number[]): RhythmResult {
  const expected = expectedOnsetsMs(exercise, bpm);
  const used = new Set<number>();
  const results: TapResult[] = [];

  expected.forEach((time) => {
    let best = -1;
    let bestAbs = Number.POSITIVE_INFINITY;
    taps.forEach((tap, index) => {
      if (used.has(index)) return;
      const distance = Math.abs(tap - time);
      if (distance < bestAbs) {
        best = index;
        bestAbs = distance;
      }
    });
    if (best < 0 || bestAbs > PRECISION.needsWork) {
      results.push({ expected: time, actual: null, deviation: null, grade: "missed" });
      return;
    }
    used.add(best);
    const actual = taps[best];
    const deviation = actual - time;
    const absolute = Math.abs(deviation);
    const grade: TapGrade = absolute <= PRECISION.perfect ? "perfect"
      : absolute <= PRECISION.great ? "great"
        : absolute <= PRECISION.good ? "good" : "needsWork";
    results.push({ expected: time, actual, deviation, grade });
  });

  const extra = taps.filter((_, index) => !used.has(index));
  const valid = results.filter((result) => result.deviation !== null);
  const deviations = valid.map((result) => Math.abs(result.deviation!));
  const scored = results.filter((result) => ["perfect", "great", "good"].includes(result.grade)).length;
  return {
    taps: results,
    extra,
    accuracy: Math.max(0, Math.round((scored - extra.length) / Math.max(1, expected.length) * 100)),
    perfect: results.filter((result) => result.grade === "perfect").length,
    great: results.filter((result) => result.grade === "great").length,
    good: results.filter((result) => result.grade === "good").length,
    early: valid.filter((result) => result.deviation! < 0).length,
    late: valid.filter((result) => result.deviation! > 0).length,
    missed: results.filter((result) => result.grade === "missed").length,
    averageDeviation: deviations.length ? Math.round(deviations.reduce((sum, value) => sum + value, 0) / deviations.length) : 0,
    bias: valid.length ? Math.round(valid.reduce((sum, result) => sum + result.deviation!, 0) / valid.length) : 0,
  };
}
