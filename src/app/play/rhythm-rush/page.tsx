"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BEATS_PER_BAR,
  COUNT_IN_BEATS,
  EXERCISES,
  TICKS_PER_BEAT,
  TICKS_PER_BAR,
  beamGroups,
  createPlaybackTimeline,
  evaluateRhythm,
  tripletGroups,
  validateExercise,
  type RhythmExercise,
  type RhythmResult,
} from "@/modules/rhythm-rush/rhythm-rush";
import "./rhythm-rush.css";

type Mode = "practice" | "challenge";
type Phase = "ready" | "countin" | "playing" | "results";
const tempoPresets = [60, 80, 100, 120];

function Notation({ exercise, playheadTick }: { exercise: RhythmExercise; playheadTick: number }) {
  const positioned = validateExercise(exercise);
  const groupedBeams = beamGroups(exercise);
  const triplets = tripletGroups(exercise);
  const beamedIndexes = new Set(groupedBeams.flat());
  const x = (tick: number) => 125 + tick * 10;
  const staffY = 105;

  return (
    <svg
      className="rr-staff"
      viewBox="0 0 660 210"
      role="img"
      aria-label={`${exercise.title}, ${exercise.meter} rhythm in standard notation`}
    >
      <text x="18" y="105" className="rr-clef">𝄞</text>
      {[65, 85, 105, 125, 145].map((y) => (
        <line key={y} x1="55" x2="625" y1={y} y2={y} className="rr-staff-line" />
      ))}
      <text x="68" y="52" className="rr-time">4</text>
      <text x="68" y="75" className="rr-time">4</text>
      {Array.from({ length: BEATS_PER_BAR + 1 }, (_, beat) => (
        <line
          key={beat}
          x1={x(beat * TICKS_PER_BEAT)}
          x2={x(beat * TICKS_PER_BEAT)}
          y1="55"
          y2="150"
          className={`rr-beat ${Math.floor(playheadTick / TICKS_PER_BEAT) === beat ? "is-current" : ""}`}
        />
      ))}

      {groupedBeams.map((group) => {
        const first = positioned[group[0]];
        const last = positioned[group[group.length - 1]];
        const firstX = x(first.startTick) + 15;
        const lastX = x(last.startTick) + 15;
        return (
          <g key={`beam-${group[0]}`} className="rr-beam-group">
            <line x1={firstX} x2={lastX} y1={staffY - 43} y2={staffY - 43} />
            {group.some((index) => positioned[index].event.kind === "sixteenth") && (
              <line x1={firstX} x2={lastX} y1={staffY - 35} y2={staffY - 35} />
            )}
          </g>
        );
      })}

      {triplets.map((group) => {
        const firstX = x(group.startTick) + 8;
        const lastEvent = positioned[group.indexes[group.indexes.length - 1]];
        const lastX = x(lastEvent.startTick) + 8;
        const middleX = (firstX + lastX) / 2;
        return (
          <g key={`triplet-${group.indexes[0]}`} className="rr-triplet-mark">
            <path d={`M ${firstX} 57 v 5 H ${middleX - 10} M ${middleX + 10} 62 H ${lastX} v -5`} />
            <rect x={middleX - 8} y="47" width="16" height="14" rx="7" />
            <text x={middleX} y="58" textAnchor="middle">3</text>
          </g>
        );
      })}

      {positioned.map(({ event, index, startTick }) => {
        const centerX = x(startTick) + 8;
        const isActive = playheadTick >= startTick && playheadTick < startTick + event.ticks;
        if (!event.onset) {
          return (
            <g key={index} className="rr-rest" aria-label={event.label}>
              {event.kind === "rest-eighth" ? (
                <>
                  <ellipse cx={centerX} cy="92" rx="4" ry="5.5" transform={`rotate(-25 ${centerX} 92)`} />
                  <path d={`M ${centerX + 2} 95 C ${centerX + 11} 100, ${centerX - 2} 106, ${centerX + 5} 111`} />
                </>
              ) : (
                <>
                  <path d={`M ${centerX - 3} 80 l 8 6 -7 7 8 7 -8 8 7 7`} />
                  <ellipse cx={centerX + 8} cy="119" rx="3.5" ry="2.5" />
                </>
              )}
              <title>{event.label}</title>
            </g>
          );
        }

        const isWhole = event.kind === "whole";
        const isHalf = event.kind === "half";
        const flagCount = event.kind === "sixteenth" ? 2 : event.kind === "eighth" ? 1 : 0;
        return (
          <g key={index} className={`rr-note ${isActive ? "is-current" : ""}`}>
            <ellipse
              cx={centerX}
              cy={staffY}
              rx="8"
              ry="5.5"
              transform={`rotate(-22 ${centerX} ${staffY})`}
              fill={isWhole || isHalf ? "var(--color-ivory)" : "currentColor"}
              stroke="currentColor"
              strokeWidth="2.5"
            />
            <title>{event.label}</title>
            {!isWhole && <line x1={centerX + 7} x2={centerX + 7} y1={staffY} y2={staffY - 43} />}
            {flagCount > 0 && !beamedIndexes.has(index) && (
              <path
                d={flagCount === 2
                  ? `M ${centerX + 7} ${staffY - 43} q 15 7 6 18 M ${centerX + 7} ${staffY - 34} q 15 7 6 18`
                  : `M ${centerX + 7} ${staffY - 43} q 15 7 6 18`}
              />
            )}
          </g>
        );
      })}
      <line x1={x(TICKS_PER_BAR)} x2={x(TICKS_PER_BAR)} y1="55" y2="150" className="rr-barline" />
      <text x="595" y="183" className="rr-measure">1</text>
    </svg>
  );
}

function getPerformanceTimeForAudioTime(context: AudioContext, audioTime: number): number {
  const output = context.getOutputTimestamp?.();
  const performanceTime = output?.performanceTime;
  const contextTime = output?.contextTime;
  if (typeof performanceTime === "number" && typeof contextTime === "number" && Number.isFinite(performanceTime) && Number.isFinite(contextTime) && performanceTime > 0) {
    return performanceTime + (audioTime - contextTime) * 1000;
  }
  return performance.now() + (audioTime - context.currentTime) * 1000;
}

export default function RhythmRushPage() {
  const [phase, setPhase] = useState<Phase>("ready");
  const [bpm, setBpm] = useState(80);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [mode, setMode] = useState<Mode>("practice");
  const [count, setCount] = useState(COUNT_IN_BEATS);
  const [beat, setBeat] = useState(-1);
  const [playheadTick, setPlayheadTick] = useState(-1);
  const [result, setResult] = useState<RhythmResult | null>(null);
  const [taps, setTaps] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [best, setBest] = useState(0);

  const audioContext = useRef<AudioContext | null>(null);
  const scheduledClicks = useRef<Set<OscillatorNode>>(new Set());
  const animationFrame = useRef<number | null>(null);
  const phaseRef = useRef<Phase>(phase);
  const starting = useRef(false);
  const tapsRef = useRef<number[]>([]);
  const exerciseStartAt = useRef(0);
  const roundBpm = useRef(bpm);
  const roundExercise = useRef(EXERCISES[exerciseIndex]);
  phaseRef.current = phase;
  const exercise = EXERCISES[exerciseIndex];

  const cancelVisualClock = useCallback(() => {
    if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
    animationFrame.current = null;
  }, []);

  const stopScheduledClicks = useCallback(() => {
    for (const oscillator of scheduledClicks.current) {
      try {
        oscillator.stop();
      } catch {
        // An oscillator that has already ended cannot be stopped again.
      }
      oscillator.disconnect();
    }
    scheduledClicks.current.clear();
  }, []);

  useEffect(() => {
    try {
      setBest(Number(sessionStorage.getItem("arpeggio-rhythm-best") || 0));
    } catch {
      setBest(0);
    }
    return () => {
      cancelVisualClock();
      stopScheduledClicks();
      void audioContext.current?.close();
    };
  }, [cancelVisualClock, stopScheduledClicks]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden && (phaseRef.current === "countin" || phaseRef.current === "playing")) {
        cancelVisualClock();
        stopScheduledClicks();
        starting.current = false;
        phaseRef.current = "ready";
        setPhase("ready");
        setBeat(-1);
        setPlayheadTick(-1);
        setMessage("This round paused when the tab became hidden. Start again to keep the timing fair.");
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [cancelVisualClock, stopScheduledClicks]);

  const clickSound = useCallback((context: AudioContext, when: number, accent: boolean) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(accent ? 1100 : 780, when);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(accent ? 0.18 : 0.12, when + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.055);
    oscillator.connect(gain).connect(context.destination);
    scheduledClicks.current.add(oscillator);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      scheduledClicks.current.delete(oscillator);
    };
    oscillator.start(when);
    oscillator.stop(when + 0.06);
  }, []);

  async function startRound() {
    if (starting.current || (phaseRef.current !== "ready" && phaseRef.current !== "results")) return;
    starting.current = true;
    cancelVisualClock();
    stopScheduledClicks();
    tapsRef.current = [];
    setTaps([]);
    setResult(null);
    setMessage("");
    setCount(COUNT_IN_BEATS);
    setBeat(0);
    setPlayheadTick(-1);
    setAttempts((current) => current + 1);
    roundBpm.current = bpm;
    roundExercise.current = exercise;
    const timeline = createPlaybackTimeline(exercise, bpm);
    const Context = window.AudioContext;

    if (Context) {
      try {
        audioContext.current ??= new Context({ latencyHint: "interactive" });
        const context = audioContext.current;
        await context.resume();
        if (!starting.current) {
          starting.current = false;
          return;
        }
        const countInAudioStart = context.currentTime + 0.15;
        const beatSeconds = 60 / bpm;
        exerciseStartAt.current = getPerformanceTimeForAudioTime(context, countInAudioStart + beatSeconds * COUNT_IN_BEATS);
        for (const click of timeline.metronome) {
          const audioTime = countInAudioStart + (click.tick / TICKS_PER_BEAT) * beatSeconds;
          clickSound(context, audioTime, click.accent);
        }
      } catch {
        stopScheduledClicks();
        phaseRef.current = "ready";
        setPhase("ready");
        setMessage("Audio could not start. Check your sound settings, then try again.");
        starting.current = false;
        return;
      }
    } else {
      setMessage("This browser does not support audio. You can still follow the visual rhythm.");
      exerciseStartAt.current = performance.now() + (COUNT_IN_BEATS * 60_000) / bpm;
    }

    phaseRef.current = "countin";
    setPhase("countin");
    starting.current = false;
  }

  const tap = useCallback((eventTime: number) => {
    if (phaseRef.current !== "playing") return;
    const stamp = eventTime - exerciseStartAt.current;
    const barDuration = (BEATS_PER_BAR * 60_000) / roundBpm.current;
    if (stamp < 0 || stamp > barDuration) return;
    const nextTaps = [...tapsRef.current, stamp];
    tapsRef.current = nextTaps;
    setTaps(nextTaps);
    const context = audioContext.current;
    if (context?.state === "running") clickSound(context, context.currentTime + 0.005, false);
  }, [clickSound]);

  useEffect(() => {
    if (phase !== "countin" && phase !== "playing") return;
    const beatDuration = 60_000 / roundBpm.current;
    const countInStartAt = exerciseStartAt.current - beatDuration * COUNT_IN_BEATS;
    const finishAt = exerciseStartAt.current + beatDuration * BEATS_PER_BAR;
    const frame = () => {
      const now = performance.now();
      const countInElapsed = now - countInStartAt;
      if (countInElapsed < 0) {
        animationFrame.current = requestAnimationFrame(frame);
        return;
      }
      if (countInElapsed < beatDuration * COUNT_IN_BEATS) {
        const countInBeat = Math.min(COUNT_IN_BEATS - 1, Math.floor(countInElapsed / beatDuration));
        setCount(COUNT_IN_BEATS - countInBeat);
        setBeat(countInBeat);
        setPlayheadTick(-1);
      } else {
        if (phaseRef.current === "countin") {
          phaseRef.current = "playing";
          setPhase("playing");
        }
        const elapsed = now - exerciseStartAt.current;
        if (elapsed >= beatDuration * BEATS_PER_BAR || now >= finishAt) {
          phaseRef.current = "results";
          setPhase("results");
          setBeat(-1);
          setPlayheadTick(-1);
          setResult(evaluateRhythm(roundExercise.current, roundBpm.current, tapsRef.current));
          return;
        }
        setPlayheadTick(Math.min(TICKS_PER_BAR - 1, Math.max(0, Math.floor(elapsed / (beatDuration / TICKS_PER_BEAT)))));
        setBeat(Math.min(BEATS_PER_BAR - 1, Math.max(0, Math.floor(elapsed / beatDuration))));
      }
      animationFrame.current = requestAnimationFrame(frame);
    };
    animationFrame.current = requestAnimationFrame(frame);
    return cancelVisualClock;
  }, [phase, cancelVisualClock]);

  useEffect(() => {
    const context = audioContext.current;
    if (!context) return;
    const onStateChange = () => {
      if (context.state !== "running" && (phaseRef.current === "countin" || phaseRef.current === "playing")) {
        cancelVisualClock();
        stopScheduledClicks();
        starting.current = false;
        phaseRef.current = "ready";
        setPhase("ready");
        setBeat(-1);
        setPlayheadTick(-1);
        setMessage("Audio paused, so this round was stopped to keep the timing accurate.");
      }
    };
    context.addEventListener("statechange", onStateChange);
    return () => context.removeEventListener("statechange", onStateChange);
  }, [phase, cancelVisualClock, stopScheduledClicks]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || phaseRef.current !== "playing") return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest("input,select,textarea,button,[contenteditable=true],[role=button],[role=slider],[role=combobox]") || target?.isContentEditable) return;
      event.preventDefault();
      if (event.repeat) return;
      tap(event.timeStamp);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [tap]);

  useEffect(() => {
    if (!result) return;
    setBest((current) => Math.max(current, result.accuracy));
    try {
      const saved = Number(sessionStorage.getItem("arpeggio-rhythm-best") || 0);
      const nextBest = Math.max(saved, result.accuracy);
      sessionStorage.setItem("arpeggio-rhythm-best", String(nextBest));
      setBest(nextBest);
    } catch {
      // The result remains usable when session storage is unavailable.
    }
  }, [result]);

  function setTempo(value: number) {
    if (mode === "challenge" || phase === "countin" || phase === "playing") return;
    setBpm(Math.min(160, Math.max(40, value)));
  }

  function selectMode(nextMode: Mode) {
    if (phase === "countin" || phase === "playing") return;
    setMode(nextMode);
    setAttempts(0);
    if (nextMode === "challenge") setBpm(100);
  }

  function nextRhythm() {
    cancelVisualClock();
    stopScheduledClicks();
    setExerciseIndex((current) => (current + 1) % EXERCISES.length);
    setPhase("ready");
    phaseRef.current = "ready";
    setResult(null);
    tapsRef.current = [];
    setTaps([]);
    setBeat(-1);
    setPlayheadTick(-1);
    setMessage("");
    if (mode === "challenge") setAttempts(0);
  }

  const activeBeat = phase === "countin" || phase === "playing" ? beat : -1;
  const canRetry = mode !== "challenge" || attempts < 2;
  const canChangeTempo = mode !== "challenge" && phase !== "countin" && phase !== "playing";

  return (
    <main className="rr-page">
      <header className="rr-header">
        <Link href="/" aria-label="ARPEGGIO home">
          <Image src="/brand/arpeggio-logo.png" alt="ARPEGGIO" width={204} height={68} priority />
        </Link>
        <Link href="/play">All games ↗</Link>
      </header>

      <div className="rr-topline">
        <div>
          <p className="rr-eyebrow">ARPEGGIO PLAY · RHYTHM RUSH</p>
          <h1>Read it. <em>Feel it.</em></h1>
        </div>
        <div className="rr-modes" role="group" aria-label="Game mode">
          <button disabled={phase === "countin" || phase === "playing"} className={mode === "practice" ? "active" : ""} onClick={() => selectMode("practice")}>Practice</button>
          <button disabled={phase === "countin" || phase === "playing"} className={mode === "challenge" ? "active" : ""} onClick={() => selectMode("challenge")}>Challenge</button>
        </div>
      </div>

      <section className="rr-game">
        <div className="rr-toolbar">
          <div>
            <span className="rr-eyebrow">LEVEL {exercise.level} · {exercise.title}</span>
            <label htmlFor="rr-tempo">Tempo</label>
            <strong>{bpm} <small>BPM</small></strong>
            <input id="rr-tempo" type="range" min="40" max="160" step="1" value={bpm} disabled={!canChangeTempo} onChange={(event) => setTempo(Number(event.target.value))} aria-label="Tempo in beats per minute" />
            <div className="rr-presets">
              {tempoPresets.map((value) => <button key={value} disabled={!canChangeTempo} className={bpm === value ? "active" : ""} onClick={() => setTempo(value)}>{value}</button>)}
            </div>
            <p>{mode === "challenge" ? "Challenge tempo is fixed at 100 BPM" : phase === "playing" || phase === "countin" ? "Tempo stays steady for each round" : "Beats per minute"}</p>
          </div>
          <div className="rr-meter">
            <span className="rr-eyebrow">METER</span>
            <strong>4 / 4</strong>
            <span>Four steady beats in each bar</span>
          </div>
        </div>

        <div className="rr-score">
          <span>{mode === "challenge" ? `Challenge · attempt ${Math.min(attempts + (phase === "results" ? 0 : 1), 2)} of 2` : `Practice · ${exerciseIndex + 1} / ${EXERCISES.length} patterns`}</span>
          <span className="rr-best">Best {best}%</span>
          <div aria-label={`Pattern ${exerciseIndex + 1} of ${EXERCISES.length}`}>
            {EXERCISES.map((item, index) => <i key={item.id} className={index === exerciseIndex ? "current" : index < exerciseIndex ? "done" : ""} />)}
          </div>
        </div>

        <div className="rr-notation-wrap">
          <div className="rr-notation-head"><span>Read the rhythm</span><span>Treble clef · 4/4</span></div>
          <Notation exercise={exercise} playheadTick={phase === "countin" ? beat * TICKS_PER_BEAT : playheadTick} />
        </div>

        <div className="rr-beatrow" aria-label="Beat indicator" aria-live="off">
          {Array.from({ length: BEATS_PER_BAR }, (_, index) => <span key={index} className={activeBeat === index ? "active" : ""}>{index + 1}</span>)}
        </div>

        {phase === "ready" && (
          <div className="rr-action">
            <p>Listen to four steady clicks, then tap each note you see. Rests are silent.</p>
            <button className="rr-primary" onClick={startRound}>Start with a count-in <span>↗</span></button>
            <small>Press SPACEBAR to play · Tap the large button on mobile</small>
          </div>
        )}
        {phase === "countin" && (
          <div className="rr-action rr-count" aria-live="polite">
            <span>GET READY</span><strong>{count}</strong><p>Follow the pulse</p>
          </div>
        )}
        {phase === "playing" && (
          <div className="rr-action rr-playing">
            <p>Tap each note onset in the rhythm.</p>
            <button className="rr-tap" onClick={(event) => tap(event.timeStamp)}>TAP<span>SPACEBAR</span></button>
            <small>{taps.length} taps · Keep the pulse</small>
          </div>
        )}
        {phase === "results" && result && (
          <section className="rr-results" aria-live="polite">
            <div className="rr-result-heading">
              <div><span className="rr-eyebrow">ROUND COMPLETE</span><h2>{result.accuracy}% <small>on time</small></h2></div>
              <p>{result.bias < -12 ? "You tended to play ahead of the beat." : result.bias > 12 ? "You tended to play behind the beat." : "Your taps stayed close to the pulse."}</p>
            </div>
            <div className="rr-metrics">
              {[["Perfect", result.perfect], ["Great", result.great], ["Good", result.good], ["Early", result.early], ["Late", result.late], ["Missed", result.missed], ["Extra", result.extra.length], ["Avg. timing", `${result.averageDeviation} ms`]].map(([label, value]) => (
                <div key={String(label)}><strong>{value}</strong><span>{label}</span></div>
              ))}
            </div>
            <div className="rr-analysis">
              <span>Early</span>
              <div>{result.taps.map((tapResult, index) => <i key={index} className={tapResult.grade} style={{ left: `${Math.min(100, Math.max(0, 50 + (tapResult.deviation ?? 0) / 4))}%` }} />)}<b /></div>
              <span>Late</span>
              <p>{result.bias < 0 ? `${Math.abs(result.bias)} ms early on average` : result.bias > 0 ? `${result.bias} ms late on average` : "Right on the pulse"}</p>
            </div>
            <div className="rr-result-actions">
              <button onClick={startRound} disabled={!canRetry}>Try again</button>
              <button className="rr-primary" onClick={nextRhythm}>Next rhythm ↗</button>
            </div>
          </section>
        )}
        {message && <p role="status" className="rr-message">{message}</p>}
      </section>
      <p className="rr-hint">Timing is compared with each written note onset. Extra taps don’t improve your score.</p>
    </main>
  );
}
